import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";
import type { MutationCtx } from "./mockAuth";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Helper: notify assigned coach and admins when a pending coaching log is submitted ────
async function notifyCoachOfSubmission(
  ctx: MutationCtx,
  traineeName: string,
  traineeId: Id<"users">,
  topic: string,
) {
  const trainee = await ctx.db.get(traineeId);
  
  // 1. Notify the assigned coach if exists
  if (trainee?.assignedCoachId) {
    await insertNotification(ctx, {
      userId: trainee.assignedCoachId,
      type: "coaching_log_submitted",
      title: "코칭 로그 제출",
      message: `${traineeName}님이 코칭 로그를 제출했습니다: "${topic}"`,
      relatedId: traineeId,
    });
  }

  // 2. Notify all administrators
  const admins = await ctx.db
    .query("users")
    .withIndex("by_role", (q) => q.eq("role", "admin"))
    .collect();
  
  for (const admin of admins) {
    // Avoid duplicate notification if the admin is also the assigned coach
    if (trainee?.assignedCoachId === admin._id) continue;
    
    await insertNotification(ctx, {
      userId: admin._id,
      type: "coaching_log_submitted",
      title: "코칭 로그 승인 요청",
      message: `${traineeName}님이 코칭 로그 승인을 요청했습니다: "${topic}"`,
      relatedId: traineeId,
    });
  }
}

// ── File storage ────────────────────────────────────────────────────────────

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Trainee: create / update / delete ───────────────────────────────────────

const coachingLogFields = {
  coachingDate: v.string(),
  coachingStartTime: v.optional(v.string()),
  coachingEndTime: v.optional(v.string()),
  durationMinutes: v.number(),
  coachingType: v.union(
    v.literal("individual"),
    v.literal("group"),
    v.literal("team"),
    v.literal("buddy"),
    v.literal("mentor"),
    v.literal("sv")
  ),
  coachingPlace: v.optional(v.union(
    v.literal("zoom"), v.literal("study_room"), v.literal("center"),
    v.literal("home"), v.literal("other"), v.literal("hanyang")
  )),
  coachingPlaceOther: v.optional(v.string()),
  sessionNumber: v.optional(v.string()),
  coacheeInfo: v.string(),
  coacheeGender: v.optional(v.union(v.literal("male"), v.literal("female"))),
  coacheeAge: v.optional(v.number()),
  coacheePersonality: v.optional(v.string()),
  coacheeType: v.optional(v.array(v.string())),
  ncpClientCategory: v.optional(v.union(v.literal("athlete"), v.literal("general"))),
  coacheeField: v.optional(v.string()),
  topic: v.string(),
  coreIssues: v.optional(v.array(v.string())),
  preCoachingState: v.optional(v.object({
    motivation: v.union(v.number(), v.null()), confidence: v.union(v.number(), v.null()), focus: v.union(v.number(), v.null()),
    calmness: v.union(v.number(), v.null()), actionWill: v.union(v.number(), v.null()),
  })),
  postCoachingState: v.optional(v.object({
    motivation: v.union(v.number(), v.null()), confidence: v.union(v.number(), v.null()), focus: v.union(v.number(), v.null()),
    calmness: v.union(v.number(), v.null()), actionWill: v.union(v.number(), v.null()),
  })),
  techniquesUsed: v.optional(v.array(v.string())),
  techniqueOther: v.optional(v.string()),
  clientInsight: v.optional(v.string()),
  coachPattern: v.optional(v.string()),
  goals: v.string(),
  actionPlan: v.optional(v.string()),
  nextSessionPractice: v.optional(v.string()),
  summary: v.string(),
  reflection: v.optional(v.string()),
  bestOfSession: v.optional(v.string()),
  improvementForNext: v.optional(v.string()),
  changeKeywords: v.optional(v.array(v.string())),
  mostEffectiveTechnique: v.optional(v.string()),
  clientQuote: v.optional(v.string()),
  coachOverallFeedback: v.optional(v.string()),
  mcciDomain: v.optional(v.union(
    v.literal("motivation"), v.literal("skill"),
    v.literal("performance"), v.literal("relationship")
  )),
  evidenceStorageId: v.optional(v.id("_storage")),
};

// Draft fields – all required fields become optional for saving mid-progress
const coachingDraftFields = {
  coachingDate: v.optional(v.string()),
  coachingStartTime: v.optional(v.string()),
  coachingEndTime: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  coachingType: v.optional(v.union(
    v.literal("individual"),
    v.literal("group"),
    v.literal("team"),
    v.literal("buddy"),
    v.literal("mentor"),
    v.literal("sv")
  )),
  coachingPlace: v.optional(v.union(
    v.literal("zoom"), v.literal("study_room"), v.literal("center"),
    v.literal("home"), v.literal("other"), v.literal("hanyang")
  )),
  coachingPlaceOther: v.optional(v.string()),
  sessionNumber: v.optional(v.string()),
  coacheeInfo: v.optional(v.string()),
  coacheeGender: v.optional(v.union(v.literal("male"), v.literal("female"))),
  coacheeAge: v.optional(v.number()),
  coacheePersonality: v.optional(v.string()),
  coacheeType: v.optional(v.array(v.string())),
  ncpClientCategory: v.optional(v.union(v.literal("athlete"), v.literal("general"))),
  coacheeField: v.optional(v.string()),
  topic: v.optional(v.string()),
  coreIssues: v.optional(v.array(v.string())),
  preCoachingState: v.optional(v.object({
    motivation: v.union(v.number(), v.null()), confidence: v.union(v.number(), v.null()), focus: v.union(v.number(), v.null()),
    calmness: v.union(v.number(), v.null()), actionWill: v.union(v.number(), v.null()),
  })),
  postCoachingState: v.optional(v.object({
    motivation: v.union(v.number(), v.null()), confidence: v.union(v.number(), v.null()), focus: v.union(v.number(), v.null()),
    calmness: v.union(v.number(), v.null()), actionWill: v.union(v.number(), v.null()),
  })),
  techniquesUsed: v.optional(v.array(v.string())),
  techniqueOther: v.optional(v.string()),
  clientInsight: v.optional(v.string()),
  coachPattern: v.optional(v.string()),
  goals: v.optional(v.string()),
  actionPlan: v.optional(v.string()),
  nextSessionPractice: v.optional(v.string()),
  summary: v.optional(v.string()),
  reflection: v.optional(v.string()),
  bestOfSession: v.optional(v.string()),
  improvementForNext: v.optional(v.string()),
  changeKeywords: v.optional(v.array(v.string())),
  mostEffectiveTechnique: v.optional(v.string()),
  clientQuote: v.optional(v.string()),
  coachOverallFeedback: v.optional(v.string()),
  mcciDomain: v.optional(v.union(
    v.literal("motivation"), v.literal("skill"),
    v.literal("performance"), v.literal("relationship")
  )),
  evidenceStorageId: v.optional(v.id("_storage")),
};

export const saveDraft = mutation({
  args: {
    logId: v.optional(v.id("coachingLogs")),
    ...coachingDraftFields,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const { logId, ...fields } = args;

    if (logId) {
      // Update existing draft
      const log = await ctx.db.get(logId);
      if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
      if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
      if (log.approvalStatus !== "draft") throw new ConvexError({ message: "임시저장 상태의 기록만 수정할 수 있습니다", code: "BAD_REQUEST" });
      await ctx.db.patch(logId, fields);
      return logId;
    } else {
      // Create new draft with minimal required fields
      return await ctx.db.insert("coachingLogs", {
        ...fields,
        coachingDate: fields.coachingDate ?? new Date().toISOString().slice(0, 10),
        durationMinutes: fields.durationMinutes ?? 0,
        coachingType: fields.coachingType ?? "individual",
        coacheeInfo: fields.coacheeInfo ?? "",
        topic: fields.topic ?? "",
        goals: fields.goals ?? "",
        summary: fields.summary ?? "",
        userId: user._id,
        approvalStatus: "draft",
      });
    }
  },
});

export const submitDraft = mutation({
  args: { logId: v.id("coachingLogs"), ...coachingLogFields },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    if (log.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (log.approvalStatus !== "draft") throw new ConvexError({ message: "임시저장 상태의 기록만 제출할 수 있습니다", code: "BAD_REQUEST" });
    const { logId, ...fields } = args;
    await ctx.db.patch(logId, { ...fields, approvalStatus: "pending" });
    // Notify assigned coach
    await notifyCoachOfSubmission(ctx, user.name ?? "교육생", user._id, args.topic);
  },
});

export const create = mutation({
  args: coachingLogFields,
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const id = await ctx.db.insert("coachingLogs", {
      ...args,
      userId: user._id,
      approvalStatus: "pending",
    });
    // Notify assigned coach
    await notifyCoachOfSubmission(ctx, user.name ?? "교육생", user._id, args.topic);
    return id;
  },
});

export const update = mutation({
  args: {
    logId: v.id("coachingLogs"),
    ...coachingLogFields,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    if (log.userId !== user._id) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    if (log.approvalStatus === "approved") {
      throw new ConvexError({
        message: "승인된 기록은 수정할 수 없습니다",
        code: "BAD_REQUEST",
      });
    }
    const { logId, ...fields } = args;
    // If re-submitting a rejected record, reset to pending
    const newStatus = log.approvalStatus === "draft" ? "pending" : log.approvalStatus === "rejected" ? "pending" : "pending";
    await ctx.db.patch(logId, { ...fields, approvalStatus: newStatus });
    // Notify coach when submitting / re-submitting (not draft saves)
    if (log.approvalStatus !== "pending") {
      await notifyCoachOfSubmission(ctx, user.name ?? "교육생", user._id, args.topic);
    }
  },
});

export const remove = mutation({
  args: { logId: v.id("coachingLogs") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    if (log.userId !== user._id) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    if (log.approvalStatus === "approved") {
      throw new ConvexError({
        message: "승인된 기록은 삭제할 수 없습니다",
        code: "BAD_REQUEST",
      });
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
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      logs.map(async (log) => {
        let reviewerName = null;
        if (log.reviewedBy) {
          const reviewer = await ctx.db.get(log.reviewedBy);
          reviewerName = reviewer?.name ?? null;
        }
        return {
          ...log,
          reviewerName,
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
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approvedLogs = logs.filter((l) => l.approvalStatus === "approved");
    const approvedMinutes = approvedLogs.reduce((sum, l) => sum + l.durationMinutes, 0);
    const approvedHours = approvedMinutes / 60;
    const individualHours =
      approvedLogs
        .filter((l) => l.coachingType === "individual")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const groupHours =
      approvedLogs
        .filter((l) => l.coachingType === "group")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const teamHours =
      approvedLogs
        .filter((l) => l.coachingType === "team")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const buddyHours =
      approvedLogs
        .filter((l) => l.coachingType === "buddy")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const mentorHours =
      approvedLogs
        .filter((l) => l.coachingType === "mentor")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const svHours =
      approvedLogs
        .filter((l) => l.coachingType === "sv")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
    const pendingCount = logs.filter((l) => l.approvalStatus === "pending").length;
    const rejectedCount = logs.filter((l) => l.approvalStatus === "rejected").length;

    // NCP: count unique athlete clients (스포츠선수 고객 수)
    const athleteClientNames = new Set<string>();
    for (const log of approvedLogs) {
      if (log.ncpClientCategory === "athlete" && log.coacheeInfo) {
        athleteClientNames.add(log.coacheeInfo.trim());
      }
    }
    const athleteClientCount = athleteClientNames.size;
    // NCP: total approved session count (목표: 15회)
    const approvedSessionCount = approvedLogs.length;

    return {
      approvedHours,
      individualHours,
      groupHours,
      teamHours,
      buddyHours,
      mentorHours,
      svHours,
      pendingCount,
      rejectedCount,
      totalCount: logs.length,
      athleteClientCount,
      approvedSessionCount,
    };
  },
});

// ── Admin / Senior coach: review ──────────────────────────────────────────────

export const getPendingLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const logs = await ctx.db
      .query("coachingLogs")
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

// Admin: get all coaching logs with optional status filter
export const getAllLogs = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"), v.literal("approved"), v.literal("rejected")
    )),
    coachingType: v.optional(v.union(
      v.literal("individual"),
      v.literal("group"),
      v.literal("team"),
      v.literal("buddy"),
      v.literal("mentor"),
      v.literal("sv")
    )),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    let logs;
    if (args.status) {
      logs = await ctx.db
        .query("coachingLogs")
        .withIndex("by_approval_status", (q) => q.eq("approvalStatus", args.status!))
        .order("desc")
        .collect();
    } else {
      logs = await ctx.db.query("coachingLogs").order("desc").collect();
      // Exclude draft records from admin view — drafts are only visible to the trainee
      logs = logs.filter((l) => l.approvalStatus !== "draft");
    }

    if (args.coachingType) {
      logs = logs.filter((l) => l.coachingType === args.coachingType);
    }

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
      .query("coachingLogs")
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

// ── Trainee: statistics & insights ──────────────────────────────────────────

export const getMyStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approved = logs.filter((l) => l.approvalStatus === "approved");

    // ── Monthly coaching hours (last 12 months) ──
    const now = new Date();
    const monthlyMap: Record<string, { label: string; minutes: number; count: number }> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      monthlyMap[key] = { label, minutes: 0, count: 0 };
    }
    for (const log of approved) {
      const key = log.coachingDate.slice(0, 7);
      if (monthlyMap[key]) {
        monthlyMap[key].minutes += log.durationMinutes;
        monthlyMap[key].count += 1;
      }
    }
    const monthlyData = Object.values(monthlyMap).map((m) => ({
      ...m,
      hours: Math.round((m.minutes / 60) * 10) / 10,
    }));

    // ── Coaching type ratio ──
    const individualCount = approved.filter((l) => l.coachingType === "individual").length;
    const groupCount = approved.filter((l) => l.coachingType === "group").length;
    const teamCount = approved.filter((l) => l.coachingType === "team").length;
    const buddyCount = approved.filter((l) => l.coachingType === "buddy").length;
    const mentorCount = approved.filter((l) => l.coachingType === "mentor").length;
    const svCount = approved.filter((l) => l.coachingType === "sv").length;

    // ── Top 5 techniques ──
    const techniqueCount: Record<string, number> = {};
    for (const log of approved) {
      for (const t of log.techniquesUsed ?? []) {
        techniqueCount[t] = (techniqueCount[t] ?? 0) + 1;
      }
    }
    const topTechniques = Object.entries(techniqueCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // ── MCCI domain distribution ──
    const domainCount: Record<string, number> = { motivation: 0, skill: 0, performance: 0, relationship: 0 };
    for (const log of approved) {
      if (log.mcciDomain) domainCount[log.mcciDomain] = (domainCount[log.mcciDomain] ?? 0) + 1;
    }

    // ── Pre/Post state averages (only non-null values) ──
    type StateKey = "motivation" | "confidence" | "focus" | "calmness" | "actionWill";
    const stateKeys: StateKey[] = ["motivation", "confidence", "focus", "calmness", "actionWill"];
    const stateLabels: Record<StateKey, string> = {
      motivation: "의욕",
      confidence: "자신감",
      focus: "집중력",
      calmness: "평온함",
      actionWill: "실행의지",
    };

    const stateData = stateKeys.map((key) => {
      const preVals = approved
        .map((l) => l.preCoachingState?.[key])
        .filter((v): v is number => typeof v === "number");
      const postVals = approved
        .map((l) => l.postCoachingState?.[key])
        .filter((v): v is number => typeof v === "number");
      const preAvg = preVals.length ? Math.round((preVals.reduce((a, b) => a + b, 0) / preVals.length) * 10) / 10 : null;
      const postAvg = postVals.length ? Math.round((postVals.reduce((a, b) => a + b, 0) / postVals.length) * 10) / 10 : null;
      return { key, label: stateLabels[key], preAvg, postAvg };
    });

    // ── Total counts ──
    const totalApprovedMinutes = approved.reduce((s, l) => s + l.durationMinutes, 0);

    return {
      monthlyData,
      individualCount,
      groupCount,
      teamCount,
      buddyCount,
      mentorCount,
      svCount,
      topTechniques,
      domainCount,
      stateData,
      totalApprovedHours: Math.round((totalApprovedMinutes / 60) * 10) / 10,
      totalApprovedCount: approved.length,
    };
  },
});

export const approve = mutation({
  args: { logId: v.id("coachingLogs") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.logId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
      reviewedBy: reviewer._id,
    });
    // Create notification for the trainee
    await insertNotification(ctx, {
      userId: log.userId,
      type: "coaching_approved",
      title: "코칭 기록 승인",
      message: `"${log.topic}" 코칭 기록(${Math.round(log.durationMinutes / 60 * 10) / 10}시간)이 승인되었습니다.`,
      relatedId: args.logId,
    });
  },
});

export const reject = mutation({
  args: {
    logId: v.id("coachingLogs"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const log = await ctx.db.get(args.logId);
    if (!log) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.logId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: reviewer._id,
    });
    // Create notification for the trainee
    await insertNotification(ctx, {
      userId: log.userId,
      type: "coaching_rejected",
      title: "코칭 기록 반려",
      message: `"${log.topic}" 코칭 기록이 반려되었습니다. 사유: ${args.reason}`,
      relatedId: args.logId,
    });
  },
});
