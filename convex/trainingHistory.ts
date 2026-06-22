import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import { getAuthenticatedUser, requireRole } from "./helpers";

const CENTER_COURSE_NAMES = [
  "KAC기본과정",
  "KPC심화과정",
  "MSPE기본과정",
  "SuperVision과정",
  "스포츠멘탈코칭강독기본과정",
  "스포츠멘탈코칭강독심화과정",
] as const;

type CenterCourseName = (typeof CENTER_COURSE_NAMES)[number];

const centerCourseValidator = v.union(
  v.literal("KAC기본과정"),
  v.literal("KPC심화과정"),
  v.literal("MSPE기본과정"),
  v.literal("SuperVision과정"),
  v.literal("스포츠멘탈코칭강독기본과정"),
  v.literal("스포츠멘탈코칭강독심화과정"),
);

const licenseTypeValidator = v.union(
  v.literal("KAC"),
  v.literal("KPC"),
  v.literal("KSC"),
  v.literal("ACC"),
  v.literal("PCC"),
  v.literal("MCC"),
  v.literal("other"),
);

// ── Training History ──────────────────────────────────────────────────────────

export const getMyTrainingHistory = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("trainingHistory")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getTrainingHistoryForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    return await ctx.db
      .query("trainingHistory")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addTrainingHistory = mutation({
  args: {
    courseType: v.union(v.literal("center"), v.literal("external")),
    centerCourseName: v.optional(centerCourseValidator),
    externalCourseName: v.optional(v.string()),
    organizer: v.optional(v.string()),
    completionDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (args.courseType === "center" && !args.centerCourseName) {
      throw new ConvexError({ message: "센터 과정명을 선택해주세요", code: "BAD_REQUEST" });
    }
    if (args.courseType === "external" && !args.externalCourseName) {
      throw new ConvexError({ message: "외부 과정명을 입력해주세요", code: "BAD_REQUEST" });
    }
    return await ctx.db.insert("trainingHistory", {
      userId: user._id,
      courseType: args.courseType,
      centerCourseName: args.centerCourseName,
      externalCourseName: args.externalCourseName,
      organizer: args.organizer,
      completionDate: args.completionDate,
      notes: args.notes,
    });
  },
});

// Admin can add training history for a specific user
export const addTrainingHistoryForUser = mutation({
  args: {
    userId: v.id("users"),
    courseType: v.union(v.literal("center"), v.literal("external")),
    centerCourseName: v.optional(centerCourseValidator),
    externalCourseName: v.optional(v.string()),
    organizer: v.optional(v.string()),
    completionDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.courseType === "center" && !args.centerCourseName) {
      throw new ConvexError({ message: "센터 과정명을 선택해주세요", code: "BAD_REQUEST" });
    }
    if (args.courseType === "external" && !args.externalCourseName) {
      throw new ConvexError({ message: "외부 과정명을 입력해주세요", code: "BAD_REQUEST" });
    }
    const { userId, ...rest } = args;
    return await ctx.db.insert("trainingHistory", { userId, ...rest });
  },
});

export const updateTrainingHistory = mutation({
  args: {
    id: v.id("trainingHistory"),
    courseType: v.union(v.literal("center"), v.literal("external")),
    centerCourseName: v.optional(centerCourseValidator),
    externalCourseName: v.optional(v.string()),
    organizer: v.optional(v.string()),
    completionDate: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new ConvexError({ message: "기록을 찾을 수 없습니다", code: "NOT_FOUND" });
    // Admin or owner
    if (record.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteTrainingHistory = mutation({
  args: { id: v.id("trainingHistory") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new ConvexError({ message: "기록을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (record.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.id);
  },
});

// ── Coach Licenses ─────────────────────────────────────────────────────────────

export const getMyLicenses = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("coachLicenses")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

export const getLicensesForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    return await ctx.db
      .query("coachLicenses")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const addLicense = mutation({
  args: {
    licenseType: licenseTypeValidator,
    otherLicenseName: v.optional(v.string()),
    issuedBy: v.optional(v.string()),
    acquiredDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (args.licenseType === "other" && !args.otherLicenseName) {
      throw new ConvexError({ message: "자격증명을 입력해주세요", code: "BAD_REQUEST" });
    }
    return await ctx.db.insert("coachLicenses", { userId: user._id, ...args });
  },
});

// Admin can add license for a user
export const addLicenseForUser = mutation({
  args: {
    userId: v.id("users"),
    licenseType: licenseTypeValidator,
    otherLicenseName: v.optional(v.string()),
    issuedBy: v.optional(v.string()),
    acquiredDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    if (args.licenseType === "other" && !args.otherLicenseName) {
      throw new ConvexError({ message: "자격증명을 입력해주세요", code: "BAD_REQUEST" });
    }
    const { userId, ...rest } = args;
    return await ctx.db.insert("coachLicenses", { userId, ...rest });
  },
});

export const updateLicense = mutation({
  args: {
    id: v.id("coachLicenses"),
    licenseType: licenseTypeValidator,
    otherLicenseName: v.optional(v.string()),
    issuedBy: v.optional(v.string()),
    acquiredDate: v.optional(v.string()),
    expiryDate: v.optional(v.string()),
    isActive: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new ConvexError({ message: "자격증을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (record.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const { id, ...fields } = args;
    await ctx.db.patch(id, fields);
  },
});

export const deleteLicense = mutation({
  args: { id: v.id("coachLicenses") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const record = await ctx.db.get(args.id);
    if (!record) throw new ConvexError({ message: "자격증을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (record.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.id);
  },
});

export { CENTER_COURSE_NAMES };
export type { CenterCourseName };
