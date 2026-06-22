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
    educationName: v.string(),
    institution: v.string(),
    educationDate: v.string(),
    hours: v.number(),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db.insert("educationRecords", {
      ...args,
      userId: user._id,
      approvalStatus: "pending",
    });
  },
});

export const update = mutation({
  args: {
    recordId: v.id("educationRecords"),
    educationName: v.string(),
    institution: v.string(),
    educationDate: v.string(),
    hours: v.number(),
    certificateStorageId: v.optional(v.id("_storage")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    if (record.userId !== user._id) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    if (record.approvalStatus !== "pending") {
      throw new ConvexError({
        message: "승인된 기록은 수정할 수 없습니다",
        code: "BAD_REQUEST",
      });
    }
    const { recordId, ...fields } = args;
    await ctx.db.patch(recordId, { ...fields, approvalStatus: "pending" });
  },
});

export const remove = mutation({
  args: { recordId: v.id("educationRecords") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    if (record.userId !== user._id) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    if (record.approvalStatus === "approved") {
      throw new ConvexError({
        message: "승인된 기록은 삭제할 수 없습니다",
        code: "BAD_REQUEST",
      });
    }
    await ctx.db.delete(args.recordId);
  },
});

// ── Trainee: queries ─────────────────────────────────────────────────────────

export const getMyRecords = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const records = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      records.map(async (record) => ({
        ...record,
        certificateUrl: record.certificateStorageId
          ? await ctx.storage.getUrl(record.certificateStorageId)
          : null,
      })),
    );
  },
});

export const getMyApprovedHours = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const approved = await ctx.db
      .query("educationRecords")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("approvalStatus", "approved"),
      )
      .collect();
    return approved.reduce((sum, r) => sum + r.hours, 0);
  },
});

export const getMySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const records = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approvedHours = records
      .filter((r) => r.approvalStatus === "approved")
      .reduce((sum, r) => sum + r.hours, 0);
    const pendingCount = records.filter((r) => r.approvalStatus === "pending").length;
    const rejectedCount = records.filter((r) => r.approvalStatus === "rejected").length;

    return { approvedHours, pendingCount, rejectedCount, totalCount: records.length };
  },
});

// ── Admin / Senior coach: review ──────────────────────────────────────────────

export const getPendingRecords = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const records = await ctx.db
      .query("educationRecords")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .order("desc")
      .collect();

    return await Promise.all(
      records.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          certificateUrl: record.certificateStorageId
            ? await ctx.storage.getUrl(record.certificateStorageId)
            : null,
        };
      }),
    );
  },
});

export const getAllRecordsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const records = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    return await Promise.all(
      records.map(async (record) => ({
        ...record,
        certificateUrl: record.certificateStorageId
          ? await ctx.storage.getUrl(record.certificateStorageId)
          : null,
      })),
    );
  },
});

export const approve = mutation({
  args: { recordId: v.id("educationRecords") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.recordId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
      reviewedBy: reviewer._id,
    });
    // Create notification for the trainee
    await insertNotification(ctx, {
      userId: record.userId,
      type: "education_approved",
      title: "교육 기록 승인",
      message: `"${record.educationName}" 교육 기록(${record.hours}시간)이 승인되었습니다.`,
      relatedId: args.recordId,
    });
  },
});

export const reject = mutation({
  args: {
    recordId: v.id("educationRecords"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const record = await ctx.db.get(args.recordId);
    if (!record) {
      throw new ConvexError({ message: "Record not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.recordId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
      reviewedBy: reviewer._id,
    });
    // Create notification for the trainee
    await insertNotification(ctx, {
      userId: record.userId,
      type: "education_rejected",
      title: "교육 기록 반려",
      message: `"${record.educationName}" 교육 기록이 반려되었습니다. 사유: ${args.reason}`,
      relatedId: args.recordId,
    });
  },
});
