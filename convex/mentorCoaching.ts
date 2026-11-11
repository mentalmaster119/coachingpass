import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";

// ── Coach name normalization helper ─────────────────────────────────────────

export function normalizeCoachName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/(멘토코치님|멘토코치|수퍼바이저님|수퍼바이저|수퍼바이져|선임코치님|선임코치|코치님|코치|멘토님|멘토|선생님|교수님|박사님|대표님|님)$/g, "");
}

export function isSameCoachName(
  logCoachName?: string | null,
  targetCoachName?: string | null,
): boolean {
  const a = normalizeCoachName(logCoachName);
  const b = normalizeCoachName(targetCoachName);
  if (!a || !b) return false;
  return a === b || a.includes(b) || b.includes(a);
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
      throw new ConvexError({ message: "코치만 기록을 추가할 수 있습니다.", code: "FORBIDDEN" });
    }

    // 동일 멘토코치에 대해 이미 임시저장(draft) 또는 대기(pending) 중인 기록이 있다면 중복 생성 방지 후 덮어쓰기
    const existingLogs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const duplicateTarget = existingLogs.find(
      (l) =>
        (l.approvalStatus === "draft" || l.approvalStatus === "pending") &&
        l.sessionType === args.sessionType &&
        isSameCoachName(l.coachName, args.coachName)
    );

    if (duplicateTarget) {
      await ctx.db.patch(duplicateTarget._id, {
        ...args,
        approvalStatus: "pending",
      });
      return duplicateTarget._id;
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

    const rawSubmitted = logs.filter((l) => l.approvalStatus !== "draft");

    // 동일 멘토코치에 대해 중복 제출된 mentor_coaching 기록은 상태 우선순위(approved > pending > rejected)로 1건만 집계
    const statusPriority: Record<string, number> = {
      approved: 3,
      pending: 2,
      rejected: 1,
    };
    const dedupMap = new Map<string, (typeof rawSubmitted)[number]>();
    for (const log of rawSubmitted) {
      const normalizedCoach = normalizeCoachName(log.coachName);
      const key =
        log.sessionType === "mentor_coaching" && normalizedCoach
          ? `mentor_coaching:${normalizedCoach}`
          : `${log.sessionType}:${normalizedCoach || log._id}:${log.sessionDate}`;
      const prev = dedupMap.get(key);
      if (
        !prev ||
        (statusPriority[log.approvalStatus] ?? 0) >
          (statusPriority[prev.approvalStatus] ?? 0)
      ) {
        dedupMap.set(key, log);
      }
    }
    const submitted = Array.from(dedupMap.values());

    const approved = submitted.filter((l) => l.approvalStatus === "approved");
    const mentorCoachingCount = approved.filter((l) => l.sessionType === "mentor_coaching").length;
    const coderCoCount = approved.filter((l) => l.sessionType === "coder_co").length;
    const pendingMentorCoachingCount = submitted.filter(
      (l) => l.sessionType === "mentor_coaching" && l.approvalStatus === "pending"
    ).length;
    const pendingCoderCoCount = submitted.filter(
      (l) => l.sessionType === "coder_co" && l.approvalStatus === "pending"
    ).length;
    const submittedMentorCoachingCount = mentorCoachingCount + pendingMentorCoachingCount;
    const submittedCoderCoCount = coderCoCount + pendingCoderCoCount;
    const pendingCount = submitted.filter((l) => l.approvalStatus === "pending").length;
    const rejectedCount = submitted.filter((l) => l.approvalStatus === "rejected").length;
    const totalApprovedMinutes = approved.reduce((s, l) => s + l.durationMinutes, 0);

    return {
      approvedCount: approved.length,
      mentorCoachingCount,
      coderCoCount,
      pendingMentorCoachingCount,
      pendingCoderCoCount,
      submittedMentorCoachingCount,
      submittedCoderCoCount,
      pendingCount,
      rejectedCount,
      totalCount: submitted.length,
      totalApprovedHours: totalApprovedMinutes / 60,
    };
  },
});

// ── Admin / Senior coach: review ──────────────────────────────────────────────

export const getPendingLogs = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .collect();

    let filteredLogs = logs;
    if (viewer.role === "senior_coach") {
      const assignedTrainees = await ctx.db
        .query("users")
        .filter((q) =>
          q.or(
            q.eq(q.field("assignedCoachId"), viewer._id),
            q.eq(q.field("assignedCoachId2"), viewer._id),
            q.eq(q.field("assignedCoachId3"), viewer._id),
            q.eq(q.field("assignedCoachId4"), viewer._id),
            q.eq(q.field("assignedCoachId5"), viewer._id)
          )
        )
        .collect();
      const assignedTraineeIds = new Set(assignedTrainees.map((t) => t._id));

      filteredLogs = logs.filter((log) => {
        const hasCoachName = normalizeCoachName(log.coachName).length > 0;
        if (hasCoachName) {
          return isSameCoachName(log.coachName, viewer.name);
        }
        return assignedTraineeIds.has(log.userId);
      });
    }

    // 동일 교육생·동일 멘토코치에 대한 중복 대기 건 제거 (1건당 1개만 표시)
    const seenKeys = new Set<string>();
    const dedupedLogs = filteredLogs.filter((log) => {
      const coachKey = normalizeCoachName(log.coachName) || log.sessionDate;
      const key = `${log.userId}:${log.sessionType}:${coachKey}`;
      if (seenKeys.has(key)) return false;
      seenKeys.add(key);
      return true;
    });

    return await Promise.all(
      dedupedLogs.map(async (log) => {
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
    await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const logs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    const filteredLogs = logs.filter((log) => log.approvalStatus !== "draft");

    return await Promise.all(
      filteredLogs.map(async (log) => ({
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
    const reviewer = await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.logId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
      reviewedBy: reviewer._id,
    });

    const typeLabel = log.sessionType === "mentor_coaching" ? "개인 수퍼비전" : "그룹 수퍼비전";
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
    const reviewer = await requireRole(ctx, ["admin", "senior_coach", "admin3"]);
    const log = await ctx.db.get(args.logId);
    if (!log) throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });

    await ctx.db.patch(args.logId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: reviewer._id,
    });

    const typeLabel = log.sessionType === "mentor_coaching" ? "개인 수퍼비전" : "그룹 수퍼비전";
    await insertNotification(ctx, {
      userId: log.userId,
      type: "mentor_coaching_rejected",
      title: `${typeLabel} 기록 반려`,
      message: `"${log.topic}" ${typeLabel} 기록이 반려되었습니다. 사유: ${args.reason}`,
      relatedId: args.logId,
    });
  },
});

const mentorCoachingDraftFields = {
  sessionDate: v.optional(v.string()),
  sessionType: v.optional(v.union(v.literal("mentor_coaching"), v.literal("coder_co"))),
  coachName: v.optional(v.string()),
  durationMinutes: v.optional(v.number()),
  location: v.optional(v.string()),
  topic: v.optional(v.string()),
  content: v.optional(v.string()),
  reflection: v.optional(v.string()),
  coacheeGoal: v.optional(v.string()),
  coachingTool: v.optional(v.string()),
  powerfulQuestion: v.optional(v.string()),
  learnedAsCoach: v.optional(v.string()),
  actionPlan: v.optional(v.string()),
  evidenceStorageId: v.optional(v.id("_storage")),
};

export const saveDraft = mutation({
  args: {
    logId: v.optional(v.id("mentorCoachingLogs")),
    ...mentorCoachingDraftFields,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "코치만 임시저장할 수 있습니다.", code: "FORBIDDEN" });
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
      return await ctx.db.insert("mentorCoachingLogs", {
        ...fields,
        sessionDate: fields.sessionDate ?? new Date().toISOString().slice(0, 10),
        sessionType: fields.sessionType ?? "mentor_coaching",
        coachName: fields.coachName ?? "",
        durationMinutes: fields.durationMinutes ?? 0,
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
    if (log.approvalStatus !== "draft") {
      throw new ConvexError({ message: "임시저장 상태의 기록만 제출할 수 있습니다", code: "BAD_REQUEST" });
    }
    const { logId, ...fields } = args;
    await ctx.db.patch(logId, { ...fields, approvalStatus: "pending" });
  },
});

export const getCoachMentoringHistory = query({
  args: {},
  handler: async (ctx) => {
    const coach = await getAuthenticatedUser(ctx);
    if (coach.role !== "senior_coach" && coach.role !== "admin" && coach.role !== "admin3") {
      throw new ConvexError({ message: "수퍼바이저 또는 관리자만 조회할 수 있습니다.", code: "FORBIDDEN" });
    }

    const allLogs = await ctx.db
      .query("mentorCoachingLogs")
      .collect();

    // Fetch all trainees assigned to this coach to check matching
    const assignedTrainees = await ctx.db
      .query("users")
      .filter((q) =>
        q.or(
          q.eq(q.field("assignedCoachId"), coach._id),
          q.eq(q.field("assignedCoachId2"), coach._id),
          q.eq(q.field("assignedCoachId3"), coach._id),
          q.eq(q.field("assignedCoachId4"), coach._id),
          q.eq(q.field("assignedCoachId5"), coach._id)
        )
      )
      .collect();
    const assignedTraineeIds = new Set(assignedTrainees.map((t) => t._id));

    type CandidateLog = {
      _id: string;
      _creationTime: number;
      userId: typeof allLogs[number]["userId"];
      sessionDate: string;
      sessionType: "mentor_coaching" | "coder_co";
      coachName: string;
      durationMinutes: number;
      location?: string;
      topic: string;
      content: string;
      reflection?: string;
      coacheeGoal?: string;
      coachingTool?: string;
      powerfulQuestion?: string;
      learnedAsCoach?: string;
      actionPlan?: string;
      approvalStatus: "draft" | "pending" | "approved" | "rejected";
      rejectionReason?: string;
      source: "mentorCoachingLogs" | "coachingLogs";
    };

    const candidateLogs: CandidateLog[] = [];

    for (const log of allLogs) {
      // 임시저장(draft) 기록은 멘토코치 실적 및 목록에서 제외
      if (log.approvalStatus === "draft") continue;

      const hasCoachName = normalizeCoachName(log.coachName).length > 0;
      const isNameMatch = hasCoachName && isSameCoachName(log.coachName, coach.name);
      // 코치명이 비어있는 개인 멘토코칭 기록에 한해서만 배정 여부로 매칭 (다른 멘토코치나 코더코 기록이 섞이는 현상 방지)
      const isUnnamedAssignedMatch =
        !hasCoachName &&
        log.sessionType === "mentor_coaching" &&
        assignedTraineeIds.has(log.userId);

      if (isNameMatch || isUnnamedAssignedMatch) {
        candidateLogs.push({
          ...log,
          source: "mentorCoachingLogs",
        });
      }
    }

    // 교육생이 일반 코칭실습 기록(coachingLogs)에서 '멘토코칭(mentor)' 유형으로 작성한 경우도 확인
    const generalMentorLogs = await ctx.db
      .query("coachingLogs")
      .filter((q) => q.eq(q.field("coachingType"), "mentor"))
      .collect();

    for (const cLog of generalMentorLogs) {
      if (cLog.approvalStatus === "draft") continue;

      const hasCoachName = normalizeCoachName(cLog.coacheeInfo).length > 0;
      const isNameMatch = hasCoachName && isSameCoachName(cLog.coacheeInfo, coach.name);
      const isUnnamedAssignedMatch =
        !hasCoachName && assignedTraineeIds.has(cLog.userId);

      if (isNameMatch || isUnnamedAssignedMatch) {
        candidateLogs.push({
          _id: cLog._id,
          _creationTime: cLog._creationTime,
          userId: cLog.userId,
          sessionDate: cLog.coachingDate,
          sessionType: "mentor_coaching",
          coachName: cLog.coacheeInfo || coach.name || "",
          durationMinutes: cLog.durationMinutes,
          topic: cLog.topic || "멘토코칭 세션",
          content: cLog.summary || cLog.coachOverallFeedback || "",
          reflection: cLog.reflection,
          coacheeGoal: cLog.goals,
          coachingTool: cLog.mostEffectiveTechnique,
          powerfulQuestion: cLog.clientQuote,
          learnedAsCoach: cLog.clientInsight,
          actionPlan: cLog.actionPlan,
          approvalStatus: cLog.approvalStatus,
          rejectionReason: cLog.rejectionReason,
          source: "coachingLogs",
        });
      }
    }

    // 동일 교육생이 이 멘토코치에게 올린 개인 멘토코칭(mentor_coaching) 기록은 교육생당 1건만 집계 (중복 등록 및 2건 집계 방지)
    const statusPriority: Record<string, number> = {
      approved: 3,
      pending: 2,
      rejected: 1,
    };
    const dedupedByTrainee = new Map<string, CandidateLog>();

    for (const item of candidateLogs) {
      const key =
        item.sessionType === "mentor_coaching"
          ? `mentor_coaching:${item.userId}`
          : `coder_co:${item.userId}:${item.sessionDate}`;
      const existing = dedupedByTrainee.get(key);
      if (!existing) {
        dedupedByTrainee.set(key, item);
        continue;
      }

      const itemPriority = statusPriority[item.approvalStatus] ?? 0;
      const existingPriority = statusPriority[existing.approvalStatus] ?? 0;

      if (
        itemPriority > existingPriority ||
        (itemPriority === existingPriority &&
          item.source === "mentorCoachingLogs" &&
          existing.source === "coachingLogs") ||
        (itemPriority === existingPriority &&
          item.source === existing.source &&
          item.sessionDate > existing.sessionDate)
      ) {
        dedupedByTrainee.set(key, item);
      }
    }

    const coachLogs = [];
    for (const log of dedupedByTrainee.values()) {
      const trainee = await ctx.db.get(log.userId);
      coachLogs.push({
        ...log,
        traineeName: trainee?.name ?? "알 수 없음",
        traineeEmail: trainee?.email ?? "",
      });
    }

    // Sort by sessionDate desc
    coachLogs.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));

    // 건당(1회 = 1건) 기준 누적 실적 집계 (작성 시간과 무관하게 1건당 1로 카운트)
    const approved = coachLogs.filter((l) => l.approvalStatus === "approved");
    const pending = coachLogs.filter((l) => l.approvalStatus === "pending");
    const totalMinutes = approved.reduce((sum, l) => sum + l.durationMinutes, 0);

    return {
      logs: coachLogs,
      summary: {
        allocatedCount: 4,
        assignedTraineeCount: assignedTrainees.length,
        activeCount: approved.length + pending.length,
        totalCount: approved.length,
        pendingCount: pending.length,
        totalHours: totalMinutes / 60,
      },
    };
  },
});
