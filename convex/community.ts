import { v } from "convex/values";
import { query, mutation } from "./mockAuth";
import { ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { Id } from "./_generated/dataModel.d.ts";
import type { MutationCtx, QueryCtx } from "./mockAuth";

async function requireApprovedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다.", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.approvalStatus !== "approved") {
    throw new ConvexError({ message: "승인된 사용자만 이용할 수 있습니다.", code: "FORBIDDEN" });
  }
  return user;
}

type PostRow = {
  _id: Id<"communityPosts">;
  _creationTime: number;
  title: string;
  content: string;
  category: "general" | "question" | "sharing" | "resource";
  isPinned: boolean;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  authorId: Id<"users">;
  authorName: string;
  authorRole: string;
};

// ─── Queries ───────────────────────────────────────────────

export const listPosts = query({
  args: {
    paginationOpts: paginationOptsValidator,
    category: v.optional(
      v.union(
        v.literal("general"),
        v.literal("question"),
        v.literal("sharing"),
        v.literal("resource"),
      ),
    ),
    sortBy: v.optional(v.union(v.literal("recent"), v.literal("popular"))),
  },
  handler: async (ctx, args): Promise<{
    page: PostRow[];
    isDone: boolean;
    continueCursor: string;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다.", code: "UNAUTHENTICATED" });

    let postsQuery;
    if (args.category) {
      postsQuery = ctx.db
        .query("communityPosts")
        .withIndex("by_category", (q) => q.eq("category", args.category!))
        .order("desc");
    } else {
      postsQuery = ctx.db.query("communityPosts").order("desc");
    }

    const result = await postsQuery
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .paginate(args.paginationOpts);

    const page: PostRow[] = await Promise.all(
      result.page.map(async (post) => {
        const author = await ctx.db.get(post.authorId);
        return {
          _id: post._id,
          _creationTime: post._creationTime,
          title: post.title,
          content: post.content,
          category: post.category,
          isPinned: post.isPinned,
          viewCount: post.viewCount,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          authorId: post.authorId,
          authorName: author?.name ?? "알 수 없음",
          authorRole: author?.role ?? "trainee",
        };
      }),
    );

    // Sort by popular if requested
    const sorted = args.sortBy === "popular"
      ? [...page].sort((a, b) => b.likeCount - a.likeCount || b.viewCount - a.viewCount)
      : page;

    // Pinned posts first
    const pinned = sorted.filter((p) => p.isPinned);
    const normal = sorted.filter((p) => !p.isPinned);

    return { ...result, page: [...pinned, ...normal] };
  },
});

export const getMyPosts = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<{
    page: PostRow[];
    isDone: boolean;
    continueCursor: string;
  }> => {
    const me = await requireApprovedUser(ctx);

    const result = await ctx.db
      .query("communityPosts")
      .withIndex("by_author", (q) => q.eq("authorId", me._id))
      .order("desc")
      .filter((q) => q.eq(q.field("isDeleted"), false))
      .paginate(args.paginationOpts);

    const page: PostRow[] = result.page.map((post) => ({
      _id: post._id,
      _creationTime: post._creationTime,
      title: post.title,
      content: post.content,
      category: post.category,
      isPinned: post.isPinned,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      authorId: post.authorId,
      authorName: me.name ?? "알 수 없음",
      authorRole: me.role,
    }));

    return { ...result, page };
  },
});

export const getMyBookmarks = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args): Promise<{
    page: PostRow[];
    isDone: boolean;
    continueCursor: string;
  }> => {
    const me = await requireApprovedUser(ctx);

    const bmResult = await ctx.db
      .query("communityBookmarks")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .order("desc")
      .paginate(args.paginationOpts);

    const resolved = await Promise.all(
      bmResult.page.map(async (bm) => {
        const post = await ctx.db.get(bm.postId);
        if (!post || post.isDeleted) return null;
        const author = await ctx.db.get(post.authorId);
        const row: PostRow = {
          _id: post._id,
          _creationTime: post._creationTime,
          title: post.title,
          content: post.content,
          category: post.category,
          isPinned: post.isPinned,
          viewCount: post.viewCount,
          likeCount: post.likeCount,
          commentCount: post.commentCount,
          authorId: post.authorId,
          authorName: author?.name ?? "알 수 없음",
          authorRole: author?.role ?? "trainee",
        };
        return row;
      }),
    );

    const page = resolved.filter((p): p is PostRow => p !== null);
    return { ...bmResult, page };
  },
});

export const getPost = query({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args): Promise<{
    _id: Id<"communityPosts">;
    _creationTime: number;
    title: string;
    content: string;
    category: "general" | "question" | "sharing" | "resource";
    isPinned: boolean;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    authorId: Id<"users">;
    authorName: string;
    authorRole: string;
    isLikedByMe: boolean;
    isBookmarkedByMe: boolean;
  } | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return null;

    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) return null;

    const author = await ctx.db.get(post.authorId);
    const like = await ctx.db
      .query("communityLikes")
      .withIndex("by_post_and_user", (q) => q.eq("postId", args.postId).eq("userId", me._id))
      .unique();
    const bookmark = await ctx.db
      .query("communityBookmarks")
      .withIndex("by_post_and_user", (q) => q.eq("postId", args.postId).eq("userId", me._id))
      .unique();

    return {
      _id: post._id,
      _creationTime: post._creationTime,
      title: post.title,
      content: post.content,
      category: post.category,
      isPinned: post.isPinned,
      viewCount: post.viewCount,
      likeCount: post.likeCount,
      commentCount: post.commentCount,
      authorId: post.authorId,
      authorName: author?.name ?? "알 수 없음",
      authorRole: author?.role ?? "trainee",
      isLikedByMe: !!like,
      isBookmarkedByMe: !!bookmark,
    };
  },
});

export const getComments = query({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args): Promise<Array<{
    _id: Id<"communityComments">;
    _creationTime: number;
    postId: Id<"communityPosts">;
    authorId: Id<"users">;
    content: string;
    isDeleted: boolean;
    parentCommentId: Id<"communityComments"> | undefined;
    authorName: string;
    authorRole: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다.", code: "UNAUTHENTICATED" });

    const comments = await ctx.db
      .query("communityComments")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("asc")
      .collect();

    return await Promise.all(
      comments.map(async (c) => {
        const author = await ctx.db.get(c.authorId);
        return {
          _id: c._id,
          _creationTime: c._creationTime,
          postId: c.postId,
          authorId: c.authorId,
          content: c.isDeleted ? "삭제된 댓글입니다." : c.content,
          isDeleted: c.isDeleted,
          parentCommentId: c.parentCommentId,
          authorName: c.isDeleted ? "알 수 없음" : (author?.name ?? "알 수 없음"),
          authorRole: c.isDeleted ? "trainee" : (author?.role ?? "trainee"),
        };
      }),
    );
  },
});

// ─── Mutations ─────────────────────────────────────────────

export const createPost = mutation({
  args: {
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("general"),
      v.literal("question"),
      v.literal("sharing"),
      v.literal("resource"),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    if (!args.title.trim()) throw new ConvexError({ message: "제목을 입력해 주세요.", code: "BAD_REQUEST" });
    if (!args.content.trim()) throw new ConvexError({ message: "내용을 입력해 주세요.", code: "BAD_REQUEST" });

    return await ctx.db.insert("communityPosts", {
      authorId: me._id,
      title: args.title.trim(),
      content: args.content.trim(),
      category: args.category,
      isPinned: false,
      viewCount: 0,
      likeCount: 0,
      commentCount: 0,
      isDeleted: false,
    });
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("communityPosts"),
    title: v.string(),
    content: v.string(),
    category: v.union(
      v.literal("general"),
      v.literal("question"),
      v.literal("sharing"),
      v.literal("resource"),
    ),
  },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) throw new ConvexError({ message: "게시글을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (post.authorId !== me._id && me.role !== "admin") {
      throw new ConvexError({ message: "수정 권한이 없습니다.", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.postId, {
      title: args.title.trim(),
      content: args.content.trim(),
      category: args.category,
    });
  },
});

export const deletePost = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    const post = await ctx.db.get(args.postId);
    if (!post) throw new ConvexError({ message: "게시글을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (post.authorId !== me._id && me.role !== "admin") {
      throw new ConvexError({ message: "삭제 권한이 없습니다.", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.postId, { isDeleted: true });
  },
});

export const incrementViewCount = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) return;
    await ctx.db.patch(args.postId, { viewCount: post.viewCount + 1 });
  },
});

export const toggleLike = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    const existing = await ctx.db
      .query("communityLikes")
      .withIndex("by_post_and_user", (q) => q.eq("postId", args.postId).eq("userId", me._id))
      .unique();

    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) throw new ConvexError({ message: "게시글을 찾을 수 없습니다.", code: "NOT_FOUND" });

    if (existing) {
      await ctx.db.delete(existing._id);
      await ctx.db.patch(args.postId, { likeCount: Math.max(0, post.likeCount - 1) });
      return false;
    } else {
      await ctx.db.insert("communityLikes", { postId: args.postId, userId: me._id });
      await ctx.db.patch(args.postId, { likeCount: post.likeCount + 1 });
      return true;
    }
  },
});

export const toggleBookmark = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    const existing = await ctx.db
      .query("communityBookmarks")
      .withIndex("by_post_and_user", (q) => q.eq("postId", args.postId).eq("userId", me._id))
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("communityBookmarks", { postId: args.postId, userId: me._id });
      return true;
    }
  },
});

export const addComment = mutation({
  args: {
    postId: v.id("communityPosts"),
    content: v.string(),
    parentCommentId: v.optional(v.id("communityComments")),
  },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    if (!args.content.trim()) throw new ConvexError({ message: "댓글 내용을 입력해 주세요.", code: "BAD_REQUEST" });
    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) throw new ConvexError({ message: "게시글을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.insert("communityComments", {
      postId: args.postId,
      authorId: me._id,
      content: args.content.trim(),
      isDeleted: false,
      parentCommentId: args.parentCommentId,
    });
    await ctx.db.patch(args.postId, { commentCount: post.commentCount + 1 });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("communityComments") },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError({ message: "댓글을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (comment.authorId !== me._id && me.role !== "admin") {
      throw new ConvexError({ message: "삭제 권한이 없습니다.", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.commentId, { isDeleted: true });
    const post = await ctx.db.get(comment.postId);
    if (post) {
      await ctx.db.patch(comment.postId, { commentCount: Math.max(0, post.commentCount - 1) });
    }
  },
});

export const togglePin = mutation({
  args: { postId: v.id("communityPosts") },
  handler: async (ctx, args) => {
    const me = await requireApprovedUser(ctx);
    if (me.role !== "admin" && me.role !== "senior_coach") {
      throw new ConvexError({ message: "고정 권한이 없습니다.", code: "FORBIDDEN" });
    }
    const post = await ctx.db.get(args.postId);
    if (!post || post.isDeleted) throw new ConvexError({ message: "게시글을 찾을 수 없습니다.", code: "NOT_FOUND" });
    await ctx.db.patch(args.postId, { isPinned: !post.isPinned });
  },
});
