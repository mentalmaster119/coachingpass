import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";
import type { Id } from "./_generated/dataModel.d.ts";

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin")
    throw new ConvexError({ message: "관리자 권한이 필요합니다", code: "FORBIDDEN" });
  return user;
}

// Get groups for a seminar (with member info)
export const getBySeminar = query({
  args: { seminarId: v.id("seminars") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const groups = await ctx.db
      .query("coachingGroups")
      .withIndex("by_seminar", (q) => q.eq("seminarId", args.seminarId))
      .collect();
    return await Promise.all(
      groups.map(async (g) => {
        const members = await Promise.all(
          g.memberIds.map((id) => ctx.db.get(id))
        );
        return {
          ...g,
          members: members.map((m) =>
            m ? { _id: m._id, name: m.name, email: m.email, certificationGoal: "SMPCC" as const } : null
          ),
        };
      })
    );
  },
});

// Save all groups for a seminar (replace all)
export const saveGroups = mutation({
  args: {
    seminarId: v.id("seminars"),
    cohortId: v.id("cohorts"),
    groups: v.array(v.object({
      groupNumber: v.number(),
      groupName: v.string(),
      memberIds: v.array(v.id("users")),
      date: v.optional(v.string()),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      location: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    // Delete existing groups for this seminar
    const existing = await ctx.db
      .query("coachingGroups")
      .withIndex("by_seminar", (q) => q.eq("seminarId", args.seminarId))
      .collect();
    for (const g of existing) {
      await ctx.db.delete(g._id);
    }
    // Insert new groups
    for (const g of args.groups) {
      await ctx.db.insert("coachingGroups", {
        seminarId: args.seminarId,
        cohortId: args.cohortId,
        groupNumber: g.groupNumber,
        groupName: g.groupName,
        memberIds: g.memberIds,
        date: g.date,
        startTime: g.startTime,
        endTime: g.endTime,
        location: g.location,
        createdBy: admin._id,
      });
    }
  },
});
