import { query } from "./mockAuth";
import { v, ConvexError } from "convex/values";
import type { GenericQueryCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel.d.ts";

// Helper: verify the caller is admin or senior_coach
async function requireAdminOrCoach(ctx: GenericQueryCtx<DataModel>) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || (user.role !== "admin" && user.role !== "senior_coach")) {
    throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
  }
  return user;
}

// Helper: get userIds belonging to a cohort
async function getCohortUserIds(ctx: GenericQueryCtx<DataModel>, cohortId: Id<"cohorts">): Promise<Set<Id<"users">>> {
  const members = await ctx.db
    .query("cohortMembers")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  return new Set(members.map((m) => m.userId));
}

/** Export: trainees in a cohort */
export const exportTrainees = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const users = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();
    return users
      .filter((u) => userIds.has(u._id))
      .map((u) => ({
        name: u.name ?? "",
        email: u.email ?? "",
        certGoal: "SMPCC",
        approvalStatus:
          u.approvalStatus === "approved"
            ? "승인됨"
            : u.approvalStatus === "pending"
              ? "대기중"
              : "거부됨",
        joinedAt: u.joinedAt ? u.joinedAt.slice(0, 10) : "",
        onboardingDone: u.onboardingCompleted ? "완료" : "미완료",
      }));
  },
});

/** Export: education records for a cohort */
export const exportEducationRecords = query({
  args: {
    cohortId: v.id("cohorts"),
    status: v.optional(v.union(v.literal("all"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const records =
      args.status && args.status !== "all"
        ? await ctx.db
            .query("educationRecords")
            .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status as "pending" | "approved" | "rejected"))
            .collect()
        : await ctx.db.query("educationRecords").collect();

    const filtered = records.filter((r) => userIds.has(r.userId));
    const userCache: Record<string, string> = {};
    return await Promise.all(
      filtered.map(async (r) => {
        if (!userCache[r.userId]) {
          const user = await ctx.db.get(r.userId);
          userCache[r.userId] = user?.name ?? "알 수 없음";
        }
        return {
          traineeName: userCache[r.userId],
          educationName: r.educationName,
          institution: r.institution,
          educationDate: r.educationDate.slice(0, 10),
          hours: r.hours,
          approvalStatus:
            r.approvalStatus === "approved"
              ? "승인됨"
              : r.approvalStatus === "pending"
                ? "대기중"
                : "거부됨",
          notes: r.notes ?? "",
        };
      }),
    );
  },
});

/** Export: coaching logs for a cohort */
export const exportCoachingLogs = query({
  args: {
    cohortId: v.id("cohorts"),
    status: v.optional(v.union(v.literal("all"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const records =
      args.status && args.status !== "all"
        ? await ctx.db
            .query("coachingLogs")
            .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status as "pending" | "approved" | "rejected"))
            .collect()
        : await ctx.db.query("coachingLogs").collect();

    const filtered = records.filter((r) => userIds.has(r.userId));
    const userCache: Record<string, string> = {};
    return await Promise.all(
      filtered.map(async (r) => {
        if (!userCache[r.userId]) {
          const user = await ctx.db.get(r.userId);
          userCache[r.userId] = user?.name ?? "알 수 없음";
        }
        return {
          traineeName: userCache[r.userId],
          coachingDate: r.coachingDate.slice(0, 10),
          coachee: r.coacheeInfo,
          type: r.coachingType === "individual" ? "개인" : "그룹",
          durationMin: r.durationMinutes,
          topic: r.topic,
          goals: r.goals,
          approvalStatus:
            r.approvalStatus === "approved"
              ? "승인됨"
              : r.approvalStatus === "pending"
                ? "대기중"
                : "거부됨",
        };
      }),
    );
  },
});

/** Export: mentor coaching logs for a cohort */
export const exportMentorCoachingLogs = query({
  args: {
    cohortId: v.id("cohorts"),
    status: v.optional(v.union(v.literal("all"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
  },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const records =
      args.status && args.status !== "all"
        ? await ctx.db
            .query("mentorCoachingLogs")
            .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status as "pending" | "approved" | "rejected"))
            .collect()
        : await ctx.db.query("mentorCoachingLogs").collect();

    const filtered = records.filter((r) => userIds.has(r.userId));
    const userCache: Record<string, string> = {};
    return await Promise.all(
      filtered.map(async (r) => {
        if (!userCache[r.userId]) {
          const user = await ctx.db.get(r.userId);
          userCache[r.userId] = user?.name ?? "알 수 없음";
        }
        return {
          traineeName: userCache[r.userId],
          sessionDate: r.sessionDate.slice(0, 10),
          sessionType: r.sessionType === "mentor_coaching" ? "멘토코칭" : "코더코",
          coachName: r.coachName,
          durationMin: r.durationMinutes,
          topic: r.topic,
          approvalStatus:
            r.approvalStatus === "approved"
              ? "승인됨"
              : r.approvalStatus === "pending"
                ? "대기중"
                : "거부됨",
        };
      }),
    );
  },
});

/** Export: coaching logs with optional date range, filtered by cohort */
export const exportCoachingLogsFiltered = query({
  args: {
    cohortId: v.id("cohorts"),
    status: v.optional(v.union(v.literal("all"), v.literal("pending"), v.literal("approved"), v.literal("rejected"))),
    dateFrom: v.optional(v.string()),
    dateTo: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    let records =
      args.status && args.status !== "all"
        ? await ctx.db
            .query("coachingLogs")
            .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status as "pending" | "approved" | "rejected"))
            .collect()
        : await ctx.db.query("coachingLogs").collect();

    records = records.filter((r) => userIds.has(r.userId) && r.approvalStatus !== "draft");

    if (args.dateFrom) {
      records = records.filter((r) => r.coachingDate >= args.dateFrom!);
    }
    if (args.dateTo) {
      records = records.filter((r) => r.coachingDate <= args.dateTo!);
    }

    const userCache: Record<string, string> = {};
    return await Promise.all(
      records.map(async (r) => {
        if (!userCache[r.userId]) {
          const user = await ctx.db.get(r.userId);
          userCache[r.userId] = user?.name ?? "알 수 없음";
        }
        return {
          traineeName: userCache[r.userId],
          coachingDate: r.coachingDate.slice(0, 10),
          coachee: r.coacheeInfo,
          type: r.coachingType === "individual" ? "개인" : "그룹",
          durationMin: r.durationMinutes,
          topic: r.topic,
          goals: r.goals,
          mcciDomain: r.mcciDomain ?? "",
          techniques: (r.techniquesUsed ?? []).join(", "),
          approvalStatus:
            r.approvalStatus === "approved"
              ? "승인됨"
              : r.approvalStatus === "pending"
                ? "대기중"
                : "거부됨",
        };
      }),
    );
  },
});

/** Export: trainee progress summary for a cohort */
export const exportTraineeProgress = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const cohortTrainees = trainees.filter((u) => userIds.has(u._id));

    return await Promise.all(
      cohortTrainees.map(async (u) => {
        const eduRecords = await ctx.db
          .query("educationRecords")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect();
        const approvedEduHours = eduRecords
          .filter((r) => r.approvalStatus === "approved")
          .reduce((s, r) => s + r.hours, 0);

        const coachingLogs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect();
        const approvedCoachingMins = coachingLogs
          .filter((l) => l.approvalStatus === "approved")
          .reduce((s, l) => s + l.durationMinutes, 0);
        const approvedCoachingHours = Math.round((approvedCoachingMins / 60) * 10) / 10;
        const individualCoachingHours = Math.round(
          (coachingLogs
            .filter((l) => l.approvalStatus === "approved" && l.coachingType === "individual")
            .reduce((s, l) => s + l.durationMinutes, 0) / 60) * 10
        ) / 10;
        const groupCoachingHours = Math.round(
          (coachingLogs
            .filter((l) => l.approvalStatus === "approved" && l.coachingType === "group")
            .reduce((s, l) => s + l.durationMinutes, 0) / 60) * 10
        ) / 10;

        const mentorLogs = await ctx.db
          .query("mentorCoachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .collect();
        const approvedMentorCount = mentorLogs.filter((l) => l.approvalStatus === "approved").length;

        return {
          name: u.name ?? "",
          email: u.email ?? "",
          approvedEduHours,
          approvedCoachingHours,
          individualCoachingHours,
          groupCoachingHours,
          mentorCount: approvedMentorCount,
          totalCoachingLogs: coachingLogs.filter((l) => l.approvalStatus !== "draft").length,
          approvalStatus: u.approvalStatus === "approved" ? "승인됨" : u.approvalStatus === "pending" ? "대기중" : "거부됨",
        };
      }),
    );
  },
});

/** Export: attendance by cohort */
export const exportAttendanceByCohort = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);

    const seminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    const rows: Record<string, string>[] = [];

    for (const member of members) {
      const user = await ctx.db.get(member.userId);
      if (!user) continue;

      const row: Record<string, string> = { name: user.name ?? "", email: user.email ?? "" };

      for (const seminar of seminars) {
        const att = await ctx.db
          .query("attendances")
          .withIndex("by_seminar_and_user", (q) =>
            q.eq("seminarId", seminar._id).eq("userId", member.userId)
          )
          .unique();
        const statusLabel =
          att?.status === "present"
            ? "출석"
            : att?.status === "late"
              ? "지각"
              : att?.status === "absent"
                ? "결석"
                : att?.status === "excused"
                  ? "공결"
                  : "미기록";
        row[`session_${seminar.sessionNumber}`] = statusLabel;
      }

      rows.push(row);
    }

    return rows;
  },
});

export const exportCertificationApplications = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAdminOrCoach(ctx);
    const userIds = await getCohortUserIds(ctx, args.cohortId);
    const apps = await ctx.db.query("certificationApplications").collect();
    const filtered = apps.filter((a) => userIds.has(a.userId));
    const userCache: Record<string, string> = {};
    return await Promise.all(
      filtered.map(async (a) => {
        if (!userCache[a.userId]) {
          const user = await ctx.db.get(a.userId);
          userCache[a.userId] = user?.name ?? "알 수 없음";
        }
        return {
          traineeName: userCache[a.userId],
          certGoal: a.certificationGoal,
          submittedAt: a.submittedAt.slice(0, 10),
          status:
            a.status === "submitted"
              ? "신청완료"
              : a.status === "under_review"
                ? "검토중"
                : a.status === "approved"
                  ? "승인됨"
                  : "거부됨",
          eduHoursAtSubmission: a.educationHoursAtSubmission,
          coachingHoursAtSubmission: a.coachingHoursAtSubmission,
          reviewedAt: a.reviewedAt ? a.reviewedAt.slice(0, 10) : "",
          reviewComment: a.reviewComment ?? "",
        };
      }),
    );
  },
});
