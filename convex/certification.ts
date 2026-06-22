import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";

// ── Shared requirement thresholds ─────────────────────────────────────────────

const REQUIREMENTS = {
  SMPCC: { education: 60, coaching: 100 },
};

// ── Trainee: submit application ───────────────────────────────────────────────

export const submit = mutation({
  args: {
    personalStatement: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "수강생만 자격증을 신청할 수 있습니다.", code: "FORBIDDEN" });
    }

    const goal = "SMPCC" as const;

    // Check for existing active application
    const existing = await ctx.db
      .query("certificationApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const active = existing.find((a) => a.status === "submitted" || a.status === "under_review");
    if (active) {
      throw new ConvexError({
        message: "이미 진행 중인 신청이 있습니다. 검토 결과를 기다려 주세요.",
        code: "CONFLICT",
      });
    }

    // Collect progress snapshot
    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const educationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const coachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    // Validate minimum requirements
    const req = REQUIREMENTS[goal];
    if (educationHours < req.education || coachingHours < req.coaching) {
      throw new ConvexError({
        message: `아직 필수 요건을 충족하지 못했습니다. (교육 ${Math.round(educationHours * 10) / 10}/${req.education}h, 코칭 ${Math.round(coachingHours * 10) / 10}/${req.coaching}h)`,
        code: "BAD_REQUEST",
      });
    }

    return await ctx.db.insert("certificationApplications", {
      userId: user._id,
      certificationGoal: goal,
      submittedAt: new Date().toISOString(),
      status: "submitted",
      personalStatement: args.personalStatement,
      educationHoursAtSubmission: Math.round(educationHours * 10) / 10,
      coachingHoursAtSubmission: Math.round(coachingHours * 10) / 10,
    });
  },
});

export const cancelApplication = mutation({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (app.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (app.status !== "submitted") {
      throw new ConvexError({ message: "검토가 시작된 신청은 취소할 수 없습니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.delete(args.applicationId);
  },
});

// ── Trainee: queries ──────────────────────────────────────────────────────────

export const getMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const apps = await ctx.db
      .query("certificationApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      apps.map(async (app) => {
        const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;
        return { ...app, reviewerName: reviewer?.name ?? null };
      }),
    );
  },
});

export const getMyRequirementStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const goal = "SMPCC" as const;
    const req = REQUIREMENTS[goal];

    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const educationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const coachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    return {
      goal: "SMPCC" as const,
      educationHours: Math.round(educationHours * 10) / 10,
      coachingHours: Math.round(coachingHours * 10) / 10,
      educationRequired: req.education,
      coachingRequired: req.coaching,
      educationMet: educationHours >= req.education,
      coachingMet: coachingHours >= req.coaching,
      allMet: educationHours >= req.education && coachingHours >= req.coaching,
    };
  },
});

// ── Admin: queries ────────────────────────────────────────────────────────────

export const getAllApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const apps = await ctx.db.query("certificationApplications").order("desc").collect();

    return await Promise.all(
      apps.map(async (app) => {
        const user = await ctx.db.get(app.userId);
        const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;
        return {
          ...app,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          reviewerName: reviewer?.name ?? null,
        };
      }),
    );
  },
});

export const getApplicationDetail = query({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) return null;

    const user = await ctx.db.get(app.userId);
    const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;

    // Fetch current progress for context
    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const mentorLogs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const currentEducationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const currentCoachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    const approvedMentorLogs = mentorLogs.filter((l) => l.approvalStatus === "approved");

    return {
      ...app,
      userName: user?.name ?? "이름 미설정",
      userEmail: user?.email ?? "",
      reviewerName: reviewer?.name ?? null,
      currentEducationHours: Math.round(currentEducationHours * 10) / 10,
      currentCoachingHours: Math.round(currentCoachingHours * 10) / 10,
      totalMentorSessions: approvedMentorLogs.length,
    };
  },
});

// ── Admin: mutations ──────────────────────────────────────────────────────────

export const setUnderReview = mutation({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (app.status !== "submitted") {
      throw new ConvexError({ message: "이미 검토 중이거나 처리된 신청입니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.patch(args.applicationId, {
      status: "under_review",
      reviewedBy: reviewer._id,
    });
  },
});

export const approve = mutation({
  args: {
    applicationId: v.id("certificationApplications"),
    reviewComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.patch(args.applicationId, {
      status: "approved",
      reviewedBy: reviewer._id,
      reviewedAt: new Date().toISOString(),
      reviewComment: args.reviewComment,
    });

    await insertNotification(ctx, {
      userId: app.userId,
      type: "certification_approved",
      title: `${app.certificationGoal} 자격증 신청 승인`,
      message: `${app.certificationGoal} 자격증 신청이 승인되었습니다. 축하합니다!${args.reviewComment ? ` 코멘트: ${args.reviewComment}` : ""}`,
      relatedId: args.applicationId,
    });
  },
});

export const reject = mutation({
  args: {
    applicationId: v.id("certificationApplications"),
    reviewComment: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.patch(args.applicationId, {
      status: "rejected",
      reviewedBy: reviewer._id,
      reviewedAt: new Date().toISOString(),
      reviewComment: args.reviewComment,
    });

    await insertNotification(ctx, {
      userId: app.userId,
      type: "certification_rejected",
      title: `${app.certificationGoal} 자격증 신청 반려`,
      message: `${app.certificationGoal} 자격증 신청이 반려되었습니다. 사유: ${args.reviewComment}`,
      relatedId: args.applicationId,
    });
  },
});

// ── Admin: bulk status change ─────────────────────────────────────────────────

export const bulkUpdateStatus = mutation({
  args: {
    applicationIds: v.array(v.id("certificationApplications")),
    status: v.union(
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin"]);
    for (const applicationId of args.applicationIds) {
      const app = await ctx.db.get(applicationId);
      if (!app) continue;
      await ctx.db.patch(applicationId, {
        status: args.status,
        reviewedBy: reviewer._id,
        reviewedAt: new Date().toISOString(),
        reviewComment: args.reviewComment,
      });
      if (args.status === "approved") {
        await insertNotification(ctx, {
          userId: app.userId,
          type: "certification_approved",
          title: `${app.certificationGoal ?? "SMPCC"} 자격증 신청 승인`,
          message: `${app.certificationGoal ?? "SMPCC"} 자격증 신청이 승인되었습니다.`,
          relatedId: applicationId,
        });
      } else if (args.status === "rejected") {
        await insertNotification(ctx, {
          userId: app.userId,
          type: "certification_rejected",
          title: `${app.certificationGoal ?? "SMPCC"} 자격증 신청 반려`,
          message: `${app.certificationGoal ?? "SMPCC"} 자격증 신청이 반려되었습니다.${args.reviewComment ? ` 사유: ${args.reviewComment}` : ""}`,
          relatedId: applicationId,
        });
      }
    }
  },
});
