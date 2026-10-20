import { v } from "convex/values";
import { mutation, query } from "./mockAuth.ts";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";

async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
  return user;
}

export const createJournal = mutation({
  args: {
    traineeName: v.string(),
    traineeId: v.optional(v.id("users")),
    coachingDate: v.string(),
    topic: v.string(),
    currentScore: v.optional(v.string()),
    targetScore: v.optional(v.string()),
    toolsUsed: v.array(v.string()),
    toolOther: v.optional(v.string()),
    competencies: v.object({
      topicClarity: v.string(),
      goalQuantification: v.string(),
      toolSelection: v.string(),
      toolProficiency: v.string(),
      toolStandardAdherence: v.string(),
      selfTalkQuality: v.string(),
      questionAppropriateness: v.string(),
      activeListening: v.string(),
      praiseEnergy: v.string(),
    }),
    averageScore: v.optional(v.number()),
    strengths: v.string(),
    improvements: v.string(),
    nextActionPlan: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db.insert("supervisionJournals", {
      ...args,
      coachId: user._id,
      createdAt: Date.now(),
    });
  },
});

export const listMyJournals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role === "admin" || user.role === "admin3") {
      return await ctx.db.query("supervisionJournals").order("desc").collect();
    }
    return await ctx.db
      .query("supervisionJournals")
      .withIndex("by_coach", (q) => q.eq("coachId", user._id))
      .order("desc")
      .collect();
  },
});

export const removeJournal = mutation({
  args: { journalId: v.id("supervisionJournals") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const journal = await ctx.db.get(args.journalId);
    if (!journal) throw new ConvexError({ message: "일지를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (journal.coachId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.journalId);
  },
});
