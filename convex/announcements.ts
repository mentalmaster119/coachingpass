import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import { insertNotification } from "./notifications";

// ── Queries ────────────────────────────────────────────────────────────────

/** Public: list published announcements (all authenticated users) */
export const listPublished = query({
  args: {
    category: v.optional(
      v.union(v.literal("general"), v.literal("important"), v.literal("event")),
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    let announcements;
    if (args.category) {
      const all = await ctx.db
        .query("announcements")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc")
        .collect();
      announcements = all.filter((a) => a.isPublished);
    } else {
      announcements = await ctx.db
        .query("announcements")
        .withIndex("by_published", (q) => q.eq("isPublished", true))
        .order("desc")
        .collect();
    }

    // Sort: pinned first, then by creation time descending
    const pinned = announcements.filter((a) => a.isPinned);
    const rest = announcements.filter((a) => !a.isPinned);
    return [...pinned, ...rest];
  },
});

/** Admin: list all announcements (including drafts) */
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    return await ctx.db.query("announcements").order("desc").collect();
  },
});

/** Get single announcement detail */
export const getById = query({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new ConvexError({ message: "공지사항을 찾을 수 없습니다", code: "NOT_FOUND" });
    return announcement;
  },
});

// ── Mutations ──────────────────────────────────────────────────────────────

/** Admin: create announcement */
export const create = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.union(v.literal("general"), v.literal("important"), v.literal("event")),
    isPinned: v.boolean(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role !== "admin" && user.role !== "senior_coach")
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    const announcementId = await ctx.db.insert("announcements", {
      ...args,
      authorId: user._id,
      viewCount: 0,
    });

    // 바로 발행하는 경우 전체 알림 전송
    if (args.isPublished) {
      const allUsers = await ctx.db.query("users").collect();
      await Promise.all(
        allUsers
          .filter((u) => u._id !== user._id)
          .map((u) =>
            insertNotification(ctx, {
              userId: u._id,
              type: "announcement",
              title: `📢 공지사항: ${args.title}`,
              message: args.content.length > 80
                ? args.content.slice(0, 80) + "…"
                : args.content,
              relatedId: announcementId,
            }),
          ),
      );
    }

    return announcementId;
  },
});

/** Admin: update announcement */
export const update = mutation({
  args: {
    id: v.id("announcements"),
    title: v.string(),
    content: v.string(),
    category: v.union(v.literal("general"), v.literal("important"), v.literal("event")),
    isPinned: v.boolean(),
    isPublished: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError({ message: "공지사항을 찾을 수 없습니다", code: "NOT_FOUND" });

    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

/** Admin: delete announcement */
export const remove = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError({ message: "공지사항을 찾을 수 없습니다", code: "NOT_FOUND" });
    await ctx.db.delete(args.id);
  },
});

/** Admin: toggle pinned status */
export const togglePin = mutation({
  args: { id: v.id("announcements"), isPinned: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    await ctx.db.patch(args.id, { isPinned: args.isPinned });
  },
});

/** Admin: toggle published status */
export const togglePublish = mutation({
  args: { id: v.id("announcements"), isPublished: v.boolean() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    const announcement = await ctx.db.get(args.id);
    if (!announcement) throw new ConvexError({ message: "공지사항을 찾을 수 없습니다", code: "NOT_FOUND" });

    // 처음 발행할 때(draft→published) 전체 사용자에게 알림 전송
    const wasPublished = announcement.isPublished;
    await ctx.db.patch(args.id, { isPublished: args.isPublished });

    if (!wasPublished && args.isPublished) {
      const allUsers = await ctx.db.query("users").collect();
      await Promise.all(
        allUsers
          .filter((u) => u._id !== user._id)
          .map((u) =>
            insertNotification(ctx, {
              userId: u._id,
              type: "announcement",
              title: `📢 공지사항: ${announcement.title}`,
              message: announcement.content.length > 80
                ? announcement.content.slice(0, 80) + "…"
                : announcement.content,
              relatedId: args.id,
            }),
          ),
      );
    }
  },
});

/** Increment view count when user reads an announcement */
export const incrementViewCount = mutation({
  args: { id: v.id("announcements") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return;
    const existing = await ctx.db.get(args.id);
    if (!existing) return;
    await ctx.db.patch(args.id, { viewCount: existing.viewCount + 1 });
  },
});
