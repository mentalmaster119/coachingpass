import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// ── File upload URL ────────────────────────────────────────────────────────

export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role !== "admin" && user.role !== "senior_coach" && user.role !== "admin3") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    return await ctx.storage.generateUploadUrl();
  },
});

// ── Mutations ─────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    category: v.union(
      v.literal("education"),
      v.literal("form"),
      v.literal("guideline"),
      v.literal("reference"),
      v.literal("other"),
    ),
    fileStorageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    isPublished: v.boolean(),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role !== "admin" && user.role !== "senior_coach" && user.role !== "admin3") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("resources", {
      ...args,
      uploadedBy: user._id,
      downloadCount: 0,
    });
  },
});

export const update = mutation({
  args: {
    resourceId: v.id("resources"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("education"),
        v.literal("form"),
        v.literal("guideline"),
        v.literal("reference"),
        v.literal("other"),
      ),
    ),
    isPublished: v.optional(v.boolean()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach" && user.role !== "admin3")) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const { resourceId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(resourceId, patch);
  },
});

export const remove = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "admin3")) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new ConvexError({ message: "자료를 찾을 수 없습니다", code: "NOT_FOUND" });
    const comments = await ctx.db
      .query("resourceComments")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .collect();
    for (const comment of comments) {
      await ctx.db.delete(comment._id);
    }
    await ctx.storage.delete(resource.fileStorageId);
    await ctx.db.delete(args.resourceId);
  },
});

export const togglePublish = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach" && user.role !== "admin3")) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new ConvexError({ message: "자료를 찾을 수 없습니다", code: "NOT_FOUND" });
    await ctx.db.patch(args.resourceId, { isPublished: !resource.isPublished });
  },
});

export const incrementDownloadCount = mutation({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) throw new ConvexError({ message: "자료를 찾을 수 없습니다", code: "NOT_FOUND" });
    await ctx.db.patch(args.resourceId, { downloadCount: resource.downloadCount + 1 });
  },
});

// ── Queries ────────────────────────────────────────────────────────────────

type ResourceWithUrl = {
  _id: Id<"resources">;
  _creationTime: number;
  title: string;
  description?: string;
  category: "education" | "form" | "guideline" | "reference" | "other";
  fileName: string;
  fileSize: number;
  mimeType: string;
  isPublished: boolean;
  downloadCount: number;
  tags?: string[];
  uploadedBy: Id<"users">;
  fileStorageId: Id<"_storage">;
  fileUrl: string | null;
  uploaderName: string;
  commentCount: number;
};

export const listPublished = query({
  args: {
    category: v.optional(
      v.union(
        v.literal("education"),
        v.literal("form"),
        v.literal("guideline"),
        v.literal("reference"),
        v.literal("other"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<ResourceWithUrl[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    const resources = await ctx.db
      .query("resources")
      .withIndex("by_published", (q) => q.eq("isPublished", true))
      .order("desc")
      .collect();

    const filtered = (args.category
      ? resources.filter((r) => r.category === args.category)
      : resources
    ).sort((a, b) => b._creationTime - a._creationTime);

    return await Promise.all(
      filtered.map(async (resource) => {
        const fileUrl = await ctx.storage.getUrl(resource.fileStorageId);
        const uploader = await ctx.db.get(resource.uploadedBy);
        const comments = await ctx.db
          .query("resourceComments")
          .withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
          .collect();
        return {
          ...resource,
          fileUrl,
          uploaderName: uploader?.name ?? "관리자",
          commentCount: comments.length,
        };
      }),
    );
  },
});

export const listAll = query({
  args: {},
  handler: async (ctx): Promise<ResourceWithUrl[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "senior_coach" && user.role !== "admin3")) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const resources = (await ctx.db.query("resources").order("desc").collect()).sort(
      (a, b) => b._creationTime - a._creationTime,
    );
    return await Promise.all(
      resources.map(async (resource) => {
        const fileUrl = await ctx.storage.getUrl(resource.fileStorageId);
        const uploader = await ctx.db.get(resource.uploadedBy);
        const comments = await ctx.db
          .query("resourceComments")
          .withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
          .collect();
        return {
          ...resource,
          fileUrl,
          uploaderName: uploader?.name ?? "관리자",
          commentCount: comments.length,
        };
      }),
    );
  },
});

export const getById = query({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args): Promise<ResourceWithUrl | null> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) return null;
    const fileUrl = await ctx.storage.getUrl(resource.fileStorageId);
    const uploader = await ctx.db.get(resource.uploadedBy);
    const comments = await ctx.db
      .query("resourceComments")
      .withIndex("by_resource", (q) => q.eq("resourceId", resource._id))
      .collect();
    return {
      ...resource,
      fileUrl,
      uploaderName: uploader?.name ?? "관리자",
      commentCount: comments.length,
    };
  },
});

// ── Resource Comments (소감 / 댓글) ─────────────────────────────────────────

export const listComments = query({
  args: { resourceId: v.id("resources") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    const comments = await ctx.db
      .query("resourceComments")
      .withIndex("by_resource", (q) => q.eq("resourceId", args.resourceId))
      .order("desc")
      .collect();

    return await Promise.all(
      comments.map(async (comment) => {
        const author = await ctx.db.get(comment.authorId);
        return {
          ...comment,
          authorName: author?.name ?? "알 수 없음",
          authorRole: author?.role ?? "trainee",
        };
      }),
    );
  },
});

export const addComment = mutation({
  args: {
    resourceId: v.id("resources"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role === "admin3") {
      throw new ConvexError({ message: "열람 전용 계정은 댓글을 작성할 수 없습니다", code: "FORBIDDEN" });
    }
    const trimmed = args.content.trim();
    if (!trimmed) {
      throw new ConvexError({ message: "내용을 입력해 주세요", code: "BAD_REQUEST" });
    }
    const resource = await ctx.db.get(args.resourceId);
    if (!resource) {
      throw new ConvexError({ message: "자료를 찾을 수 없습니다", code: "NOT_FOUND" });
    }
    return await ctx.db.insert("resourceComments", {
      resourceId: args.resourceId,
      authorId: user._id,
      content: trimmed,
    });
  },
});

export const deleteComment = mutation({
  args: { commentId: v.id("resourceComments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    const comment = await ctx.db.get(args.commentId);
    if (!comment) throw new ConvexError({ message: "댓글을 찾을 수 없습니다", code: "NOT_FOUND" });
    const isAdmin = user.role === "admin" || user.role === "senior_coach";
    if (comment.authorId !== user._id && !isAdmin) {
      throw new ConvexError({ message: "삭제 권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.commentId);
  },
});
