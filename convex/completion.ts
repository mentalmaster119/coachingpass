import { v } from "convex/values";
import { query } from "./mockAuth";
import { ConvexError } from "convex/values";
import { calculateUserCohortAttendance } from "./attendance";
import type { QueryCtx } from "./_generated/server.d.ts";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Completion criteria ─────────────────────────────────────────────────────
// 수료 기준:
//  1. 코칭 실습 리포트 승인 10건 이상
//  2. 전체 출석 80% 이상 (세미나 세션별 출석/지각/공결 합산)
//     단, 2차~6차 세션 중 한 세션을 완전히(2일 모두) 빠지면 미수료
//     토/일 하루만 빠지는 경우는 전체 80%로 판단
//
// 인증 기준 (인증시험 응시 자격):
//  1. 코칭 실습 보고서 승인 20건 이상
//  2. 그 중 스포츠 선수 대상 8건 이상
//  3. 동일인에 대한 보고서는 최대 2건까지만 인정
//  4. 독후감 승인 2건 이상
//  5. 멘탈코칭 에세이 승인 1건 이상
//  6. 슈퍼비전/멘토링 승인 1건 이상 (mentorCoachingLogs)

async function requireAuth(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  return identity;
}

export async function calculateCoachingProgress(ctx: QueryCtx, userId: Id<"users">) {
  // Fetch new coaching logs
  const coachingLogs = await ctx.db
    .query("coachingLogs")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("approvalStatus", "approved")
    )
    .collect();

  // Fetch legacy BCP logs
  const bcpLogs = await ctx.db
    .query("bcpLogs")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("approvalStatus", "approved")
    )
    .collect();

  // Fetch legacy mentor coaching logs
  const mentorLogs = await ctx.db
    .query("mentorCoachingLogs")
    .withIndex("by_user_and_status", (q) =>
      q.eq("userId", userId).eq("approvalStatus", "approved")
    )
    .collect();

  // 1. Buddy coaching count
  const newBuddyCount = coachingLogs.filter((l) => l.coachingType === "buddy").length;
  const legacyBuddyCount = bcpLogs.length;
  const buddyCount = newBuddyCount + legacyBuddyCount;

  // 2. Mentor coaching count
  const newMentorCount = coachingLogs.filter((l) => l.coachingType === "mentor").length;
  const legacyMentorCount = mentorLogs.filter((l) => l.sessionType === "mentor_coaching").length;
  const mentorCount = newMentorCount + legacyMentorCount;

  // 3. SV coaching count
  const newSvCount = coachingLogs.filter((l) => l.coachingType === "sv").length;
  const legacySvCount = mentorLogs.filter((l) => l.sessionType === "coder_co").length;
  const svCount = newSvCount + legacySvCount;

  // 4. Sports Athlete coaching count (ncpClientCategory === "athlete" & not buddy/mentor/sv)
  const sportsLogs = coachingLogs.filter(
    (l) => l.ncpClientCategory === "athlete" && !["buddy", "mentor", "sv"].includes(l.coachingType)
  );
  // Group by coachee and cap at 2 each
  const sportsCoacheeCounts: Record<string, number> = {};
  for (const log of sportsLogs) {
    const key = log.coacheeInfo.trim();
    sportsCoacheeCounts[key] = (sportsCoacheeCounts[key] ?? 0) + 1;
  }
  const sportsCount = Object.values(sportsCoacheeCounts)
    .reduce((sum, count) => sum + Math.min(count, 2), 0);

  // 5. General coaching count (ncpClientCategory === "general" & not buddy/mentor/sv)
  const generalLogs = coachingLogs.filter(
    (l) => l.ncpClientCategory === "general" && !["buddy", "mentor", "sv"].includes(l.coachingType)
  );
  // Group by coachee and cap at 2 each
  const generalCoacheeCounts: Record<string, number> = {};
  for (const log of generalLogs) {
    const key = log.coacheeInfo.trim();
    generalCoacheeCounts[key] = (generalCoacheeCounts[key] ?? 0) + 1;
  }
  const generalCount = Object.values(generalCoacheeCounts)
    .reduce((sum, count) => sum + Math.min(count, 2), 0);

  // Raw counts
  const rawSportsCount = sportsLogs.length;
  const rawGeneralCount = generalLogs.length;

  return {
    buddyCount,
    mentorCount,
    svCount,
    sportsCount,
    generalCount,
    rawSportsCount,
    rawGeneralCount,
    totalCount: buddyCount + mentorCount + svCount + sportsCount + generalCount,
  };
}

// Evaluate completion status for a single user in a cohort
export const evaluateCompletion = query({
  args: {
    userId: v.id("users"),
    cohortId: v.id("cohorts"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const progress = await calculateCoachingProgress(ctx, args.userId);

    // Completion: 15건
    const coachingForCompletion =
      progress.buddyCount >= 2 &&
      progress.mentorCount >= 2 &&
      progress.svCount >= 1 &&
      progress.sportsCount >= 8 &&
      progress.generalCount >= 2 &&
      progress.totalCount >= 15;

    // ── 2. Attendance ────────────────────────────────────────────────────────
    const stats = await calculateUserCohortAttendance(ctx, args.cohortId, args.userId, true);
    const {
      attendanceRate,
      total: totalSlots,
      attendedSlots,
      sessionAbsenceViolation
    } = stats;
    const attendanceForCompletion = attendanceRate >= 80 && !sessionAbsenceViolation;

    // Overall completion
    const isCompleted = coachingForCompletion && attendanceForCompletion;

    // ── 3. Certification criteria ────────────────────────────────────────────
    const coachingForCert =
      progress.buddyCount >= 2 &&
      progress.mentorCount >= 2 &&
      progress.svCount >= 1 &&
      progress.sportsCount >= 8 &&
      progress.generalCount >= 7 &&
      progress.totalCount >= 20;

    // Book reports
    const bookReports = await ctx.db
      .query("bookReports")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("approvalStatus", "approved")
      )
      .collect();
    const bookReportCount = bookReports.length;
    const bookReportsForCert = bookReportCount >= 2;

    // Essays
    const essays = await ctx.db
      .query("coachingEssays")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("approvalStatus", "approved")
      )
      .collect();
    const essayCount = essays.length;
    const essayForCert = essayCount >= 1;

    const isCertEligible =
      isCompleted &&
      coachingForCert &&
      bookReportsForCert &&
      essayForCert;

    return {
      isCompleted,
      completion: {
        coaching: { count: progress.totalCount, required: 15, met: coachingForCompletion },
        buddy: { count: progress.buddyCount, required: 2, met: progress.buddyCount >= 2 },
        mentor: { count: progress.mentorCount, required: 2, met: progress.mentorCount >= 2 },
        sv: { count: progress.svCount, required: 1, met: progress.svCount >= 1 },
        sports: { count: progress.sportsCount, required: 8, met: progress.sportsCount >= 8 },
        general: { count: progress.generalCount, required: 2, met: progress.generalCount >= 2 },
        attendance: {
          rate: attendanceRate,
          totalSlots,
          attendedSlots,
          sessionAbsenceViolation,
          met: attendanceForCompletion,
        },
      },
      isCertEligible,
      certification: {
        coaching: { eligible: progress.totalCount, total: progress.totalCount, required: 20, met: coachingForCert },
        buddy: { count: progress.buddyCount, required: 2, met: progress.buddyCount >= 2 },
        mentor: { count: progress.mentorCount, required: 2, met: progress.mentorCount >= 2 },
        sv: { count: progress.svCount, required: 1, met: progress.svCount >= 1 },
        sports: { count: progress.sportsCount, required: 8, met: progress.sportsCount >= 8 },
        general: { count: progress.generalCount, required: 7, met: progress.generalCount >= 7 },
        bookReports: { count: bookReportCount, required: 2, met: bookReportsForCert },
        essay: { count: essayCount, required: 1, met: essayForCert },
      },
    };
  },
});

// Evaluate all members of a cohort at once
export const evaluateCohort = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    const seminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    seminars.sort((a, b) => a.sessionNumber - b.sessionNumber);
    const twoDay = seminars.filter((s) => s.seminarType === "two_day");
    const totalSlots = twoDay.length * 2;

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);

        // Coaching progress using helper
        const progress = await calculateCoachingProgress(ctx, m.userId);

        const coachingOk =
          progress.buddyCount >= 2 &&
          progress.mentorCount >= 2 &&
          progress.svCount >= 1 &&
          progress.sportsCount >= 8 &&
          progress.generalCount >= 2 &&
          progress.totalCount >= 15;

        // Attendance
        const attendanceRecords = await ctx.db
          .query("attendances")
          .withIndex("by_cohort_and_user", (q) =>
            q.eq("cohortId", args.cohortId).eq("userId", m.userId)
          )
          .collect();

        let attendedSlots = 0;
        let sessionAbsenceViolation = false;

        const otherMemberships = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", m.userId))
          .collect();
        const otherCohortIds = otherMemberships
          .map((mb) => mb.cohortId)
          .filter((id) => id !== args.cohortId);

        const makeupAttendedSessions = new Set<number>();
        for (const otherId of otherCohortIds) {
          const otherSeminars = await ctx.db
            .query("seminars")
            .withIndex("by_cohort", (q) => q.eq("cohortId", otherId))
            .collect();
          const otherTwoDay = otherSeminars.filter((s) => s.seminarType === "two_day");
          for (const s of otherTwoDay) {
            const rec = await ctx.db
              .query("attendances")
              .withIndex("by_seminar_and_user", (q) => q.eq("seminarId", s._id).eq("userId", m.userId))
              .unique();
            if (rec && rec.status !== "absent") {
              makeupAttendedSessions.add(s.sessionNumber);
            }
          }
        }

        for (const seminar of twoDay) {
          const rec = attendanceRecords.find((r) => r.seminarId === seminar._id);
          const status = rec?.status ?? "absent";
          const hasMakeup = makeupAttendedSessions.has(seminar.sessionNumber);
          if (status !== "absent") {
            attendedSlots += 2;
          } else if (hasMakeup) {
            attendedSlots += 2;
          } else if (seminar.sessionNumber >= 2 && seminar.sessionNumber <= 6) {
            sessionAbsenceViolation = true;
          }
        }

        const attendanceRate = totalSlots > 0
          ? Math.round((attendedSlots / totalSlots) * 100)
          : 0;

        const attendanceOk = attendanceRate >= 80 && !sessionAbsenceViolation;
        const isCompleted = coachingOk && attendanceOk;

        // Docs
        const bookReports = await ctx.db
          .query("bookReports")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userId", m.userId).eq("approvalStatus", "approved")
          )
          .collect();
        const essays = await ctx.db
          .query("coachingEssays")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userId", m.userId).eq("approvalStatus", "approved")
          )
          .collect();

        const coachingForCert =
          progress.buddyCount >= 2 &&
          progress.mentorCount >= 2 &&
          progress.svCount >= 1 &&
          progress.sportsCount >= 8 &&
          progress.generalCount >= 7 &&
          progress.totalCount >= 20;

        const isCertEligible =
          isCompleted &&
          coachingForCert &&
          bookReports.length >= 2 &&
          essays.length >= 1;

        return {
          userId: m.userId,
          name: user?.name,
          email: user?.email,
          certificationGoal: "SMPCC",
          memberStatus: m.status,
          isCompleted,
          isCertEligible,
          attendanceRate,
          sessionAbsenceViolation,
          
          approvedCoachingCount: progress.totalCount,
          eligibleCoachingCount: progress.totalCount,
          buddyCount: progress.buddyCount,
          mentorCount: progress.mentorCount,
          svCount: progress.svCount,
          sportsCount: progress.sportsCount,
          generalCount: progress.generalCount,
          
          bookReportCount: bookReports.length,
          essayCount: essays.length,
        };
      })
    );
  },
});

// Get book reports + essays for a user (for admin review)
export const getSubmissions = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const bookReports = await ctx.db
      .query("bookReports")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    const essays = await ctx.db
      .query("coachingEssays")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return { bookReports, essays };
  },
});
