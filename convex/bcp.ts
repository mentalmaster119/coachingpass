import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";

// ── File storage ──────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Trainee: create / update / delete ─────────────────────────────────────────

const bcpFields = {
  sessionDate: v.string(),
  sessionStartTime: v.optional(v.string()),
  sessionEndTime: v.optional(v.string()),
  buddyId1: v.id("users"),
  buddyId2: v.optional(v.id("users")),
  myRole: v.union(v.literal("coach"), v.literal("coachee")),
  durationMinutes: v.number(),
  location: v.optional(v.string()),
  topic: v.string(),
  content: v.string(),
  reflection: v.optional(v.string()),
  techniquesUsed: v.optional(v.array(v.string())),
  techniqueOther: v.optional(v.string()),
  clientInsight: v.optional(v.string()),
  coachPattern: v.optional(v.string()),
  actionPlan: v.optional(v.string()),
  bestOfSession: v.optional(v.string()),
  improvementForNext: v.optional(v.string()),
  evidenceStorageId: v.optional(v.id("_storage")),
};

export const create = mutation({
  args: bcpFields,
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "교육생만 기록을 추가할 수 있습니다.", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("bcpLogs", {
      ...args,
      userId: user._id,
      approvalStatus: "pending",
    });
  },
});

export const update = mutation({
  args: {
    logId: v.id("bcpLogs"),
    ...bcpFields,
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
  args: { logId: v.id("bcpLogs") },
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

// ── Trainee: queries ──────────────────────────────────────────────────────────

export const getMyLogs = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("bcpLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        const buddy1 = await ctx.db.get(log.buddyId1);
        const buddy2 = log.buddyId2 ? await ctx.db.get(log.buddyId2) : null;
        return {
          ...log,
          buddy1Name: buddy1?.name ?? "알 수 없음",
          buddy2Name: buddy2?.name ?? null,
          evidenceUrl: log.evidenceStorageId
            ? await ctx.storage.getUrl(log.evidenceStorageId)
            : null,
        };
      }),
    );
  },
});

export const getMySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("bcpLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approved = logs.filter((l) => l.approvalStatus === "approved");
    const pending = logs.filter((l) => l.approvalStatus === "pending");
    const rejected = logs.filter((l) => l.approvalStatus === "rejected");

    // BCP 규칙: 동일한 버디 2명과의 실습은 총 1건으로 인정
    // => 각 버디 쌍별로 인정 건수 계산
    const buddyPairSet = new Set<string>();
    let recognizedCount = 0;
    for (const log of approved) {
      // Sort buddy IDs to normalize the pair key
      const buddyIds = [log.buddyId1.toString(), log.buddyId2?.toString() ?? ""].sort();
      const pairKey = buddyIds.join("|");
      if (!buddyPairSet.has(pairKey)) {
        buddyPairSet.add(pairKey);
        recognizedCount += 1;
      }
    }

    const coachSessions = approved.filter((l) => l.myRole === "coach").length;
    const coacheeSessions = approved.filter((l) => l.myRole === "coachee").length;
    const totalMinutes = approved.reduce((sum, l) => sum + l.durationMinutes, 0);

    return {
      totalCount: logs.length,
      approvedCount: approved.length,
      recognizedCount,
      pendingCount: pending.length,
      rejectedCount: rejected.length,
      coachSessions,
      coacheeSessions,
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    };
  },
});

// ── Admin: queries ────────────────────────────────────────────────────────────

export const getPendingLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const logs = await ctx.db
      .query("bcpLogs")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const buddy1 = await ctx.db.get(log.buddyId1);
        const buddy2 = log.buddyId2 ? await ctx.db.get(log.buddyId2) : null;
        return {
          ...log,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          buddy1Name: buddy1?.name ?? "알 수 없음",
          buddy2Name: buddy2?.name ?? null,
          evidenceUrl: log.evidenceStorageId
            ? await ctx.storage.getUrl(log.evidenceStorageId)
            : null,
        };
      }),
    );
  },
});

export const getAllLogs = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    let logs;
    if (args.status) {
      logs = await ctx.db
        .query("bcpLogs")
        .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status!))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db.query("bcpLogs").order("desc").collect();
      logs = logs.filter((log) => log.approvalStatus !== "draft");
    }

    return await Promise.all(
      logs.map(async (log) => {
        const user = await ctx.db.get(log.userId);
        const buddy1 = await ctx.db.get(log.buddyId1);
        const buddy2 = log.buddyId2 ? await ctx.db.get(log.buddyId2) : null;
        return {
          ...log,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          buddy1Name: buddy1?.name ?? "알 수 없음",
          buddy2Name: buddy2?.name ?? null,
          evidenceUrl: log.evidenceStorageId
            ? await ctx.storage.getUrl(log.evidenceStorageId)
            : null,
        };
      }),
    );
  },
});

// ── Admin: approve / reject ───────────────────────────────────────────────────

export const approve = mutation({
  args: { logId: v.id("bcpLogs") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.logId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
      reviewedBy: reviewer._id,
    });
    await insertNotification(ctx, {
      userId: log.userId,
      type: "bcp_approved",
      title: "BCP 버디코칭 기록 승인",
      message: `"${log.topic}" BCP 기록이 승인되었습니다.`,
      relatedId: args.logId,
    });
  },
});

export const reject = mutation({
  args: {
    logId: v.id("bcpLogs"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.logId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: reviewer._id,
    });
    await insertNotification(ctx, {
      userId: log.userId,
      type: "bcp_rejected",
      title: "BCP 버디코칭 기록 반려",
      message: `"${log.topic}" BCP 기록이 반려되었습니다. 사유: ${args.reason}`,
      relatedId: args.logId,
    });
  },
});

// ── Get trainees in same cohort (for buddy selection) ────────────────────────

export const getCohortBuddies = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") return [];

    // Find all active cohort memberships for this user
    const myMemberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const activeMembership = myMemberships.find((m) => m.status === "active");
    if (!activeMembership) return [];

    // Get all members of the same cohort
    const allMembers = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", activeMembership.cohortId))
      .collect();

    // Exclude current user
    const otherMembers = allMembers.filter((m) => m.userId !== user._id && m.status === "active");

    // Get user info for each member
    const buddies = await Promise.all(
      otherMembers.map(async (m) => {
        const u = await ctx.db.get(m.userId);
        return u ? { _id: u._id, name: u.name ?? "이름 미설정", email: u.email ?? "" } : null;
      }),
    );

    return buddies.filter((b): b is { _id: typeof user._id; name: string; email: string } => b !== null);
  },
});

const bcpDraftFields = {
  sessionDate: v.optional(v.string()),
  sessionStartTime: v.optional(v.string()),
  sessionEndTime: v.optional(v.string()),
  buddyId1: v.optional(v.id("users")),
  buddyId2: v.optional(v.id("users")),
  myRole: v.optional(v.union(v.literal("coach"), v.literal("coachee"))),
  durationMinutes: v.optional(v.number()),
  location: v.optional(v.string()),
  topic: v.optional(v.string()),
  content: v.optional(v.string()),
  reflection: v.optional(v.string()),
  techniquesUsed: v.optional(v.array(v.string())),
  techniqueOther: v.optional(v.string()),
  clientInsight: v.optional(v.string()),
  coachPattern: v.optional(v.string()),
  actionPlan: v.optional(v.string()),
  bestOfSession: v.optional(v.string()),
  improvementForNext: v.optional(v.string()),
  evidenceStorageId: v.optional(v.id("_storage")),
};

export const saveDraft = mutation({
  args: {
    logId: v.optional(v.id("bcpLogs")),
    ...bcpDraftFields,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "교육생만 임시저장할 수 있습니다.", code: "FORBIDDEN" });
    }
    const { logId, ...fields } = args;

    if (logId) {
      const log = await ctx.db.get(logId);
      if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
      if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
      if (log.approvalStatus !== "draft") {
        throw new ConvexError({ message: "임시저장 상태의 기록만 수정할 수 있습니다", code: "BAD_REQUEST" });
      }
      await ctx.db.patch(logId, fields);
      return logId;
    } else {
      return await ctx.db.insert("bcpLogs", {
        ...fields,
        sessionDate: fields.sessionDate ?? new Date().toISOString().slice(0, 10),
        durationMinutes: fields.durationMinutes ?? 0,
        myRole: fields.myRole ?? "coach",
        buddyId1: fields.buddyId1 ?? user._id,
        topic: fields.topic ?? "",
        content: fields.content ?? "",
        userId: user._id,
        approvalStatus: "draft",
      });
    }
  },
});

export const submitDraft = mutation({
  args: {
    logId: v.id("bcpLogs"),
    ...bcpFields,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (log.approvalStatus !== "draft") {
      throw new ConvexError({ message: "임시저장 상태의 기록만 제출할 수 있습니다", code: "BAD_REQUEST" });
    }
    const { logId, ...fields } = args;
    await ctx.db.patch(logId, { ...fields, approvalStatus: "pending" });
  },
});
