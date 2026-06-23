import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel.d.ts";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";

type UserInfo = {
  _id: Id<"users">;
  name?: string;
  email?: string;
  certificationGoal: "SMPCC";
  role: string;
};

type MemberWithUser = Doc<"cohortMembers"> & { user: UserInfo | null };

// Helper: require admin
async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin") throw new ConvexError({ message: "관리자 권한이 필요합니다", code: "FORBIDDEN" });
  return user;
}

// List all cohorts
export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const cohorts = await ctx.db.query("cohorts").collect();
    // Sort: active first, then upcoming, then completed (by number desc)
    const statusOrder: Record<string, number> = { active: 0, upcoming: 1, completed: 2 };
    return cohorts.sort((a, b) => {
      const statusDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (statusDiff !== 0) return statusDiff;
      // Within completed, sort by number descending (latest first)
      return b.number - a.number;
    });
  },
});

// Get a single cohort with member count
export const getWithStats = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new ConvexError({ message: "기수를 찾을 수 없습니다", code: "NOT_FOUND" });
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const activeCount = members.filter((m) => m.status === "active").length;
    const completedCount = members.filter((m) => m.status === "completed").length;
    const withdrawnCount = members.filter((m) => m.status === "withdrawn").length;
    return { ...cohort, activeCount, completedCount, withdrawnCount, totalCount: members.length };
  },
});

// Get members of a cohort with user info (or all unique members if cohortId is omitted)
export const getMembers = query({
  args: { cohortId: v.optional(v.id("cohorts")) },
  handler: async (ctx, args): Promise<MemberWithUser[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    
    let members;
    if (args.cohortId) {
      members = await ctx.db
        .query("cohortMembers")
        .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId!))
        .collect();
    } else {
      const allMembers = await ctx.db.query("cohortMembers").collect();
      const uniqueUserIds = new Set<string>();
      members = [];
      for (const m of allMembers) {
        if (!uniqueUserIds.has(m.userId)) {
          uniqueUserIds.add(m.userId);
          members.push(m);
        }
      }
    }

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        return {
          ...m,
          user: user ? { _id: user._id, name: user.name, email: user.email, certificationGoal: "SMPCC" as const, role: user.role } : null,
        };
      })
    );
  },
});

// Get cohort(s) for a user
export const getForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return await Promise.all(
      memberships.map(async (m) => {
        const cohort = await ctx.db.get(m.cohortId);
        return { membership: m, cohort };
      })
    );
  },
});

// Create a cohort (admin only)
export const create = mutation({
  args: {
    name: v.string(),
    number: v.number(),
    term: v.union(v.literal("first"), v.literal("second")),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed")),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const id = await ctx.db.insert("cohorts", {
      ...args,
      createdBy: admin._id,
    });
    return id;
  },
});

// Update cohort (admin only)
export const update = mutation({
  args: {
    cohortId: v.id("cohorts"),
    name: v.optional(v.string()),
    number: v.optional(v.number()),
    term: v.optional(v.union(v.literal("first"), v.literal("second"))),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(v.union(v.literal("upcoming"), v.literal("active"), v.literal("completed"))),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { cohortId, ...fields } = args;
    await ctx.db.patch(cohortId, fields);
  },
});

// Delete cohort (admin only)
export const remove = mutation({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Delete all members first
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    for (const m of members) {
      await ctx.db.delete(m._id);
    }
    await ctx.db.delete(args.cohortId);
  },
});

// Add member to cohort (admin only)
export const addMember = mutation({
  args: {
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    // Check if already a member
    const existing = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort_and_user", (q) =>
        q.eq("cohortId", args.cohortId).eq("userId", args.userId)
      )
      .unique();
    if (existing) throw new ConvexError({ message: "이미 이 기수에 등록된 교육생입니다", code: "CONFLICT" });
    await ctx.db.insert("cohortMembers", {
      cohortId: args.cohortId,
      userId: args.userId,
      joinedAt: new Date().toISOString(),
      status: "active",
    });
  },
});

// Remove member from cohort (admin only)
export const removeMember = mutation({
  args: { memberId: v.id("cohortMembers") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.memberId);
  },
});

// Update member status (admin only)
export const updateMemberStatus = mutation({
  args: {
    memberId: v.id("cohortMembers"),
    status: v.union(v.literal("active"), v.literal("completed"), v.literal("withdrawn")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.memberId, { status: args.status });
  },
});

// Get current user's cohort membership
export const getMyMembership = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    const membership = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (!membership) return null;
    const cohort = await ctx.db.get(membership.cohortId);
    return { membership, cohort };
  },
});

// Trainee requests to join a cohort (self-registration)
export const requestJoinCohort = mutation({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });
    // Check if already in a cohort
    const existing = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    if (existing) throw new ConvexError({ message: "이미 기수에 배정되어 있습니다", code: "CONFLICT" });
    const cohort = await ctx.db.get(args.cohortId);
    if (!cohort) throw new ConvexError({ message: "기수를 찾을 수 없습니다", code: "NOT_FOUND" });
    await ctx.db.insert("cohortMembers", {
      cohortId: args.cohortId,
      userId: user._id,
      joinedAt: new Date().toISOString(),
      status: "active",
    });
  },
});
