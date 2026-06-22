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

// Evaluate completion status for a single user in a cohort
export const evaluateCompletion = query({
  args: {
    userId: v.id("users"),
    cohortId: v.id("cohorts"),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // ── 1. Coaching logs (approved) ─────────────────────────────────────────
    const allLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("approvalStatus", "approved")
      )
      .collect();

    const approvedCoachingCount = allLogs.length;

    // Completion: 10건
    const coachingForCompletion = approvedCoachingCount >= 10;

    // ── 2. Attendance ────────────────────────────────────────────────────────
    // 수료 기준 출석: 2일 세미나(two_day)만 해당
    // 교재학습(one_day), 그룹코칭(group_coaching)은 출석체크는 하되 수료 판단에 미포함
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
    // 20건 total, 8건 sports, max 2 per coachee
    const sportsCount = allLogs.filter((l) => l.coacheeType?.includes("선수") === true).length;

    // Count per coachee identifier (cap at 2 each)
    const coacheeCounts: Record<string, number> = {};
    for (const log of allLogs) {
      const key = log.coacheeInfo;
      coacheeCounts[key] = (coacheeCounts[key] ?? 0) + 1;
    }
    const eligibleCoachingCount = Object.values(coacheeCounts)
      .reduce((sum, count) => sum + Math.min(count, 2), 0);

    const coachingForCert = eligibleCoachingCount >= 20;
    const sportsForCert = sportsCount >= 8;

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

    // Supervision/mentoring
    const mentorLogs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", args.userId).eq("approvalStatus", "approved")
      )
      .collect();
    const mentorCount = mentorLogs.length;
    const mentorForCert = mentorCount >= 1;

    const isCertEligible =
      isCompleted &&
      coachingForCert &&
      sportsForCert &&
      bookReportsForCert &&
      essayForCert &&
      mentorForCert;

    return {
      // Completion
      isCompleted,
      completion: {
        coaching: { count: approvedCoachingCount, required: 10, met: coachingForCompletion },
        attendance: {
          rate: attendanceRate,
          totalSlots,
          attendedSlots,
          sessionAbsenceViolation,
          met: attendanceForCompletion,
        },
      },
      // Certification eligibility
      isCertEligible,
      certification: {
        coaching: { eligible: eligibleCoachingCount, total: approvedCoachingCount, required: 20, met: coachingForCert },
        sports: { count: sportsCount, required: 8, met: sportsForCert },
        bookReports: { count: bookReportCount, required: 2, met: bookReportsForCert },
        essay: { count: essayCount, required: 1, met: essayForCert },
        mentor: { count: mentorCount, required: 1, met: mentorForCert },
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
    // 수료 출석 기준: 2일 세미나만 해당
    const twoDay = seminars.filter((s) => s.seminarType === "two_day");
    const totalSlots = twoDay.length * 2;

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);

        // Coaching logs
        const logs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userId", m.userId).eq("approvalStatus", "approved")
          )
          .collect();
        const approvedCoachingCount = logs.length;
        const sportsCount = logs.filter((l) => l.coacheeType?.includes("선수") === true).length;
        const coacheeCounts: Record<string, number> = {};
        for (const log of logs) {
          const key = log.coacheeInfo;
          coacheeCounts[key] = (coacheeCounts[key] ?? 0) + 1;
        }
        const eligibleCoachingCount = Object.values(coacheeCounts)
          .reduce((sum, count) => sum + Math.min(count, 2), 0);

        // Attendance
        const attendanceRecords = await ctx.db
          .query("attendances")
          .withIndex("by_cohort_and_user", (q) =>
            q.eq("cohortId", args.cohortId).eq("userId", m.userId)
          )
          .collect();

        let attendedSlots = 0;
        let sessionAbsenceViolation = false;

        // Cross-cohort makeup check
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
        const mentorLogs = await ctx.db
          .query("mentorCoachingLogs")
          .withIndex("by_user_and_status", (q) =>
            q.eq("userId", m.userId).eq("approvalStatus", "approved")
          )
          .collect();

        const coachingOk = approvedCoachingCount >= 10;
        const attendanceOk = attendanceRate >= 80 && !sessionAbsenceViolation;
        const isCompleted = coachingOk && attendanceOk;

        const isCertEligible =
          isCompleted &&
          eligibleCoachingCount >= 20 &&
          sportsCount >= 8 &&
          bookReports.length >= 2 &&
          essays.length >= 1 &&
          mentorLogs.length >= 1;

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
          approvedCoachingCount,
          eligibleCoachingCount,
          sportsCount,
          bookReportCount: bookReports.length,
          essayCount: essays.length,
          mentorCount: mentorLogs.length,
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
