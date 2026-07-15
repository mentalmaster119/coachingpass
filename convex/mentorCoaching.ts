import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";

// ── File storage ────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Trainee: create / update / delete ───────────────────────────────────────

export const create = mutation({
  args: {
    sessionDate: v.string(),
    sessionType: v.union(v.literal("mentor_coaching"), v.literal("coder_co")),
    coachName: v.string(),
    durationMinutes: v.number(),
    location: v.optional(v.string()),
    topic: v.string(),
    content: v.string(),
    reflection: v.optional(v.string()),
    coacheeGoal: v.optional(v.string()),
    coachingTool: v.optional(v.string()),
    powerfulQuestion: v.optional(v.string()),
    learnedAsCoach: v.optional(v.string()),
    actionPlan: v.optional(v.string()),
    evidenceStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "교육생만 기록을 추가할 수 있습니다.", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("mentorCoachingLogs", {
      ...args,
      userId: user._id,
      approvalStatus: "pending",
    });
  },
});

export const update = mutation({
  args: {
    logId: v.id("mentorCoachingLogs"),
    sessionDate: v.string(),
    sessionType: v.union(v.literal("mentor_coaching"), v.literal("coder_co")),
    coachName: v.string(),
    durationMinutes: v.number(),
    location: v.optional(v.string()),
    topic: v.string(),
    content: v.string(),
    reflection: v.optional(v.string()),
    coacheeGoal: v.optional(v.string()),
    coachingTool: v.optional(v.string()),
    powerfulQuestion: v.optional(v.string()),
    learnedAsCoach: v.optional(v.string()),
    actionPlan: v.optional(v.string()),
    evidenceStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (log.approvalStatus === "approved") {
      throw new ConvexError({ message: "승인된 기록은 수정할 수 없습니다.", code: "BAD_REQUEST" });
    }
    const { logId, ...fields } = args;
    await ctx.db.patch(logId, { ...fields, approvalStatus: "pending" });
  },
});

export const remove = mutation({
  args: { logId: v.id("mentorCoachingLogs") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (log.approvalStatus === "approved") {
      throw new ConvexError({ message: "승인된 기록은 삭제할 수 없습니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.delete(args.logId);
  },
});

// ── Trainee: queries ─────────────────────────────────────────────────────────

export const getMyLogs = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => ({
        ...log,
        evidenceUrl: log.evidenceStorageId
          ? await ctx.storage.getUrl(log.evidenceStorageId)
          : null,
      })),
    );
  },
});

export const getMySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approved = logs.filter((l) => l.approvalStatus === "approved");
    const mentorCoachingCount = approved.filter((l) => l.sessionType === "mentor_coaching").length;
    const coderCoCount = approved.filter((l) => l.sessionType === "coder_co").length;
    const pendingCount = logs.filter((l) => l.approvalStatus === "pending").length;
    const rejectedCount = logs.filter((l) => l.approvalStatus === "rejected").length;
    const totalApprovedMinutes = approved.reduce((s, l) => s + l.durationMinutes, 0);

    return {
      approvedCount: approved.length,
      mentorCoachingCount,
      coderCoCount,
      pendingCount,
      rejectedCount,
      totalCount: logs.length,
      totalApprovedHours: totalApprovedMinutes / 60,
    };
  },
});

// ── Admin / Senior coach: review ──────────────────────────────────────────────

export const getPendingLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        return {
          ...log,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          evidenceUrl: log.evidenceStorageId
            ? await ctx.storage.getUrl(log.evidenceStorageId)
            : null,
        };
      }),
    );
  },
});

export const getAllLogsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => ({
        ...log,
        evidenceUrl: log.evidenceStorageId
          ? await ctx.storage.getUrl(log.evidenceStorageId)
          : null,
      })),
    );
  },
});

export const approve = mutation({
  args: { logId: v.id("mentorCoachingLogs") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.logId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
      reviewedBy: reviewer._id,
    });

    const typeLabel = log.sessionType === "mentor_coaching" ? "개인 슈퍼비전" : "그룹 슈퍼비전";
    await insertNotification(ctx, {
      userId: log.userId,
      type: "mentor_coaching_approved",
      title: `${typeLabel} 기록 승인`,
      message: `"${log.topic}" ${typeLabel} 기록이 승인되었습니다.`,
      relatedId: args.logId,
    });
  },
});

export const reject = mutation({
  args: {
    logId: v.id("mentorCoachingLogs"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.logId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: reviewer._id,
    });

    const typeLabel = log.sessionType === "mentor_coaching" ? "개인 슈퍼비전" : "그룹 슈퍼비전";
    await insertNotification(ctx, {
      userId: log.userId,
      type: "mentor_coaching_rejected",
      title: `${typeLabel} 기록 반려`,
      message: `"${log.topic}" ${typeLabel} 기록이 반려되었습니다. 사유: ${args.reason}`,
      relatedId: args.logId,
    });
  },
});
