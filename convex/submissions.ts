import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";

async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
  return user;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "admin") throw new ConvexError({ message: "관리자 권한이 필요합니다", code: "FORBIDDEN" });
  return user;
}

// ── Book Reports ─────────────────────────────────────────────────────────────

export const listBookReports = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const me = await requireAuth(ctx);
    const targetId = args.userId ?? me._id;
    return await ctx.db
      .query("bookReports")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect();
  },
});

export const submitBookReport = mutation({
  args: {
    bookTitle: v.string(),
    author: v.optional(v.string()),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await ctx.db.insert("bookReports", {
      userId: user._id,
      bookTitle: args.bookTitle,
      author: args.author,
      submittedAt: new Date().toISOString(),
      fileStorageId: args.fileStorageId,
      fileName: args.fileName,
      approvalStatus: "pending",
    });
  },
});

export const reviewBookReport = mutation({
  args: {
    reportId: v.id("bookReports"),
    approvalStatus: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(args.reportId, {
      approvalStatus: args.approvalStatus,
      rejectionReason: args.rejectionReason,
      reviewedBy: admin._id,
    });
  },
});

export const deleteBookReport = mutation({
  args: { reportId: v.id("bookReports") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const report = await ctx.db.get(args.reportId);
    if (!report) throw new ConvexError({ message: "찾을 수 없습니다", code: "NOT_FOUND" });
    if (report.userId !== user._id && user.role !== "admin")
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    await ctx.db.delete(args.reportId);
  },
});

// ── Coaching Essays ──────────────────────────────────────────────────────────

export const listEssays = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const me = await requireAuth(ctx);
    const targetId = args.userId ?? me._id;
    return await ctx.db
      .query("coachingEssays")
      .withIndex("by_user", (q) => q.eq("userId", targetId))
      .collect();
  },
});

export const submitEssay = mutation({
  args: {
    title: v.string(),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    await ctx.db.insert("coachingEssays", {
      userId: user._id,
      title: args.title,
      submittedAt: new Date().toISOString(),
      fileStorageId: args.fileStorageId,
      fileName: args.fileName,
      approvalStatus: "pending",
    });
  },
});

export const reviewEssay = mutation({
  args: {
    essayId: v.id("coachingEssays"),
    approvalStatus: v.union(v.literal("approved"), v.literal("rejected")),
    rejectionReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    await ctx.db.patch(args.essayId, {
      approvalStatus: args.approvalStatus,
      rejectionReason: args.rejectionReason,
      reviewedBy: admin._id,
    });
  },
});

export const deleteEssay = mutation({
  args: { essayId: v.id("coachingEssays") },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const essay = await ctx.db.get(args.essayId);
    if (!essay) throw new ConvexError({ message: "찾을 수 없습니다", code: "NOT_FOUND" });
    if (essay.userId !== user._id && user.role !== "admin")
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    await ctx.db.delete(args.essayId);
  },
});

// ── Admin: list all pending submissions ──────────────────────────────────────

export const listPendingSubmissions = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allBookReports = await ctx.db.query("bookReports").collect();
    const pendingBookReports = allBookReports.filter((r) => r.approvalStatus === "pending");

    const allEssays = await ctx.db.query("coachingEssays").collect();
    const pendingEssays = allEssays.filter((e) => e.approvalStatus === "pending");

    const bookReportsWithUser = await Promise.all(
      pendingBookReports.map(async (item) => {
        const user = await ctx.db.get(item.userId);
        return { ...item, userName: user?.name, userEmail: user?.email };
      })
    );
    const essaysWithUser = await Promise.all(
      pendingEssays.map(async (item) => {
        const user = await ctx.db.get(item.userId);
        return { ...item, userName: user?.name, userEmail: user?.email };
      })
    );

    return { bookReports: bookReportsWithUser, essays: essaysWithUser };
  },
});
