import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";

async function requireAdminOrCoach(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || (user.role !== "admin" && user.role !== "senior_coach")) {
    throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
  }
  return user;
}

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin") {
    throw new ConvexError({ message: "관리자 권한이 필요합니다", code: "FORBIDDEN" });
  }
  return user;
}

// List seminars for a cohort
export const listByCohort = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const seminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    return seminars.sort((a, b) => a.sessionNumber - b.sessionNumber);
  },
});

// List all seminars (for calendar view)
export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    return await ctx.db.query("seminars").collect();
  },
});

// Create seminar
export const create = mutation({
  args: {
    cohortId: v.id("cohorts"),
    title: v.string(),
    sessionNumber: v.number(),
    seminarType: v.union(
      v.literal("two_day"),
      v.literal("one_day"),
      v.literal("group_coaching"),
    ),
    startDate: v.string(),
    endDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    return await ctx.db.insert("seminars", { ...args, createdBy: admin._id });
  },
});

// Update seminar
export const update = mutation({
  args: {
    seminarId: v.id("seminars"),
    title: v.optional(v.string()),
    sessionNumber: v.optional(v.number()),
    seminarType: v.optional(v.union(
      v.literal("two_day"),
      v.literal("one_day"),
      v.literal("group_coaching"),
    )),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    isOnline: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { seminarId, ...fields } = args;
    await ctx.db.patch(seminarId, fields);
  },
});

// Delete seminar
export const remove = mutation({
  args: { seminarId: v.id("seminars") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.seminarId);
  },
});

// List seminars for a given month (for calendar integration)
export const listForMonth = query({
  args: { year: v.number(), month: v.number() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    const paddedMonth = String(args.month).padStart(2, "0");
    const startDate = `${args.year}-${paddedMonth}-01`;
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

    const all = await ctx.db.query("seminars").collect();
    return all.filter(
      (s) =>
        (s.startDate >= startDate && s.startDate <= endDate) ||
        (s.endDate >= startDate && s.endDate <= endDate) ||
        (s.startDate <= startDate && s.endDate >= endDate),
    );
  },
});

// Bulk create seminars (auto-generate schedule for a cohort)
export const bulkCreate = mutation({
  args: {
    cohortId: v.id("cohorts"),
    seminars: v.array(v.object({
      title: v.string(),
      sessionNumber: v.number(),
      seminarType: v.union(
        v.literal("two_day"),
        v.literal("one_day"),
        v.literal("group_coaching"),
      ),
      startDate: v.string(),
      endDate: v.string(),
      startTime: v.optional(v.string()),
      endTime: v.optional(v.string()),
      location: v.optional(v.string()),
      description: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    for (const s of args.seminars) {
      await ctx.db.insert("seminars", { ...s, cohortId: args.cohortId, createdBy: admin._id });
    }
  },
});

// Copy seminars from one cohort to another with a date offset (days)
// Optionally filter by seminar type(s). If omitted, all types are copied.
export const copySeminarsFromCohort = mutation({
  args: {
    sourceCohortId: v.id("cohorts"),
    targetCohortId: v.id("cohorts"),
    dayOffset: v.number(),
    seminarTypes: v.optional(v.array(v.union(
      v.literal("two_day"),
      v.literal("one_day"),
      v.literal("group_coaching"),
    ))),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const sourceSeminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", args.sourceCohortId))
      .collect();
    if (sourceSeminars.length === 0) {
      throw new ConvexError({ message: "복사할 세미나가 없습니다", code: "NOT_FOUND" });
    }
    const filtered = args.seminarTypes && args.seminarTypes.length > 0
      ? sourceSeminars.filter((s) => args.seminarTypes!.includes(s.seminarType))
      : sourceSeminars;
    if (filtered.length === 0) {
      throw new ConvexError({ message: "선택한 유형의 세미나가 없습니다", code: "NOT_FOUND" });
    }
    const shiftDate = (dateStr: string) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + args.dayOffset);
      return d.toISOString().slice(0, 10);
    };

    // For two_day seminars, snap startDate to Saturday and endDate to Sunday
    // so the weekend schedule is always preserved regardless of offset.
    const snapToSaturday = (dateStr: string): string => {
      const d = new Date(dateStr);
      const day = d.getDay(); // 0=Sun, 6=Sat
      if (day !== 6) {
        const daysUntilSat = (6 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + daysUntilSat);
      }
      return d.toISOString().slice(0, 10);
    };

    const snapToSunday = (satStr: string): string => {
      const d = new Date(satStr);
      d.setDate(d.getDate() + 1);
      return d.toISOString().slice(0, 10);
    };

    for (const s of filtered) {
      const { _id, _creationTime, cohortId: _cohortId, createdBy: _createdBy, ...rest } = s;
      void _id; void _creationTime; void _cohortId; void _createdBy;

      let newStartDate = shiftDate(s.startDate);
      let newEndDate = shiftDate(s.endDate);

      // 2일 세미나는 항상 토요일 시작, 일요일 종료로 보정
      if (s.seminarType === "two_day") {
        newStartDate = snapToSaturday(newStartDate);
        newEndDate = snapToSunday(newStartDate);
      }

      await ctx.db.insert("seminars", {
        ...rest,
        cohortId: args.targetCohortId,
        startDate: newStartDate,
        endDate: newEndDate,
        createdBy: admin._id,
      });
    }
    return filtered.length;
  },
});
