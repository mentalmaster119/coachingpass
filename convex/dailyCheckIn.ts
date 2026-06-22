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

// 오늘 체크인 여부 확인
export const getTodayCheckIn = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireAuth(ctx);
    const today = new Date().toISOString().slice(0, 10);
    return await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("checkInDate", today))
      .unique();
  },
});

// 내 체크인 기록 (최근 N일)
export const getMyHistory = query({
  args: { days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const records = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(args.days ?? 30);
    return records.sort((a, b) => a.checkInDate.localeCompare(b.checkInDate));
  },
});

// 체크인 제출 (오늘 이미 있으면 업데이트)
export const submitCheckIn = mutation({
  args: {
    bodyScore: v.number(),
    mindScore: v.number(),
    passionScore: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    if (args.bodyScore < 1 || args.bodyScore > 10 ||
        args.mindScore < 1 || args.mindScore > 10 ||
        args.passionScore < 1 || args.passionScore > 10) {
      throw new ConvexError({ message: "점수는 1~10 사이여야 합니다", code: "BAD_REQUEST" });
    }
    const today = new Date().toISOString().slice(0, 10);
    const existing = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("checkInDate", today))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        bodyScore: args.bodyScore,
        mindScore: args.mindScore,
        passionScore: args.passionScore,
        message: args.message,
      });
      return existing._id;
    }
    return await ctx.db.insert("dailyCheckIns", {
      userId: user._id,
      checkInDate: today,
      bodyScore: args.bodyScore,
      mindScore: args.mindScore,
      passionScore: args.passionScore,
      message: args.message,
    });
  },
});

// 관리자: 기수별 평균 추세 (최근 N일)
export const getCohortTrend = query({
  args: { cohortId: v.id("cohorts"), days: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const days = args.days ?? 30;
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);

    // Get cohort members
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();
    const activeMemberIds = new Set(
      members.filter((m) => m.status === "active").map((m) => m.userId)
    );

    // Get all check-ins for these members since sinceStr
    const allCheckIns = await ctx.db.query("dailyCheckIns").collect();
    const relevant = allCheckIns.filter(
      (c) => activeMemberIds.has(c.userId) && c.checkInDate >= sinceStr
    );

    // Group by date and compute averages
    const byDate: Record<string, { body: number[]; mind: number[]; passion: number[] }> = {};
    for (const c of relevant) {
      if (!byDate[c.checkInDate]) byDate[c.checkInDate] = { body: [], mind: [], passion: [] };
      byDate[c.checkInDate].body.push(c.bodyScore);
      byDate[c.checkInDate].mind.push(c.mindScore);
      byDate[c.checkInDate].passion.push(c.passionScore);
    }
    const avg = (arr: number[]) => arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length;
    return Object.entries(byDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, scores]) => ({
        date,
        avgBody: Math.round(avg(scores.body) * 10) / 10,
        avgMind: Math.round(avg(scores.mind) * 10) / 10,
        avgPassion: Math.round(avg(scores.passion) * 10) / 10,
        count: scores.body.length,
      }));
  },
});

// 관리자: 오늘 위험 알람 대상자 (몸 또는 마음이 4점 이하, 또는 어느 하나라도 2점 이하)
export const getAlertUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckIns = await ctx.db
      .query("dailyCheckIns")
      .withIndex("by_date", (q) => q.eq("checkInDate", today))
      .collect();

    const alertEntries = todayCheckIns.filter(
      (c) => c.bodyScore <= 4 || c.mindScore <= 4 || c.bodyScore <= 2 || c.mindScore <= 2
    );

    const results = await Promise.all(
      alertEntries.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        const isCritical = c.bodyScore <= 2 || c.mindScore <= 2;
        return {
          userId: c.userId,
          name: user?.name ?? "이름 없음",
          email: user?.email,
          bodyScore: c.bodyScore,
          mindScore: c.mindScore,
          passionScore: c.passionScore,
          message: c.message,
          isCritical, // 2점 이하
        };
      })
    );
    return results.sort((a, b) => (a.isCritical ? -1 : 1) - (b.isCritical ? -1 : 1));
  },
});
