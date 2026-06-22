import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";

// ── Queries ────────────────────────────────────────────────────────────────

/** Trainee: list own assessments (newest first) */
export const listMyAssessments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });

    return await ctx.db
      .query("competencyAssessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

/** Trainee: get the latest assessment */
export const getLatestAssessment = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("competencyAssessments")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .first();
  },
});

/** Admin/Senior Coach: view all assessments for a specific user */
export const getAssessmentsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer || (viewer.role !== "admin" && viewer.role !== "senior_coach"))
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    return await ctx.db
      .query("competencyAssessments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

// ── Mutations ──────────────────────────────────────────────────────────────

/** Trainee: submit a new self-assessment */
export const submitAssessment = mutation({
  args: {
    certificationGoal: v.optional(v.literal("SMPCC")),
    scores: v.array(
      v.object({
        itemId: v.string(),
        score: v.number(),
      }),
    ),
    overallNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });

    // Validate scores are 1-5
    for (const s of args.scores) {
      if (s.score < 1 || s.score > 5) {
        throw new ConvexError({ message: "점수는 1~5 사이여야 합니다", code: "BAD_REQUEST" });
      }
    }

    const assessedAt = new Date().toISOString();
    return await ctx.db.insert("competencyAssessments", {
      userId: user._id,
      assessedAt,
      certificationGoal: args.certificationGoal,
      scores: args.scores,
      overallNotes: args.overallNotes,
    });
  },
});

/** Trainee: delete own assessment */
export const deleteAssessment = mutation({
  args: { id: v.id("competencyAssessments") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });

    const existing = await ctx.db.get(args.id);
    if (!existing) throw new ConvexError({ message: "평가 기록을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (existing.userId !== user._id)
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });

    await ctx.db.delete(args.id);
  },
});
