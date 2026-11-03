import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { requireAdmin, requireRole } from "./helpers";
import type { Doc, Id } from "./_generated/dataModel.d.ts";

/** 클라이언트 런타임 에러 수집 (익명/인증 모두 수용) */
export const logError = mutation({
  args: {
    message: v.string(),
    stack: v.optional(v.string()),
    componentStack: v.optional(v.string()),
    url: v.string(),
    userAgent: v.string(),
    severity: v.optional(v.union(v.literal("error"), v.literal("fatal"), v.literal("warning"))),
  },
  handler: async (ctx, args) => {
    let userId: Id<"users"> | undefined;
    let userEmail: string | undefined;
    let userName: string | undefined;

    try {
      const identity = await ctx.auth.getUserIdentity();
      if (identity) {
        const user = await ctx.db
          .query("users")
          .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
          .unique();
        if (user) {
          userId = user._id;
          userEmail = user.email;
          userName = user.name;
        }
      }
    } catch {
      // Ignore auth failure during error reporting
    }

    const timestamp = new Date().toISOString();

    return await ctx.db.insert("clientErrors", {
      message: args.message.slice(0, 1000), // Cap length
      stack: args.stack ? args.stack.slice(0, 4000) : undefined,
      componentStack: args.componentStack ? args.componentStack.slice(0, 2000) : undefined,
      url: args.url.slice(0, 500),
      userAgent: args.userAgent.slice(0, 500),
      userId,
      userEmail,
      userName,
      timestamp,
      status: "open",
      severity: args.severity ?? "error",
    });
  },
});

/** 관리자: 에러 목록 조회 */
export const listErrors = query({
  args: {
    status: v.optional(v.union(v.literal("all"), v.literal("open"), v.literal("resolved"), v.literal("ignored"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const limit = args.limit ?? 100;
    let errors: Doc<"clientErrors">[];

    if (args.status && args.status !== "all") {
      errors = await ctx.db
        .query("clientErrors")
        .withIndex("by_status", (q) => q.eq("status", args.status as "open" | "resolved" | "ignored"))
        .order("desc")
        .take(limit);
    } else {
      errors = await ctx.db
        .query("clientErrors")
        .order("desc")
        .take(limit);
    }

    return errors;
  },
});

/** 관리자: 에러 통계 요약 */
export const getErrorStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const allErrors = await ctx.db.query("clientErrors").order("desc").take(200);

    const openCount = allErrors.filter((e) => e.status === "open").length;
    const resolvedCount = allErrors.filter((e) => e.status === "resolved").length;

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const last24hCount = allErrors.filter((e) => e.timestamp >= oneDayAgo).length;

    // Device breakdown
    const devices: Record<string, number> = { iOS: 0, Android: 0, Mac: 0, Windows: 0, Other: 0 };
    for (const e of allErrors) {
      const ua = e.userAgent.toLowerCase();
      if (ua.includes("iphone") || ua.includes("ipad")) devices.iOS++;
      else if (ua.includes("android")) devices.Android++;
      else if (ua.includes("macintosh") || ua.includes("mac os")) devices.Mac++;
      else if (ua.includes("windows")) devices.Windows++;
      else devices.Other++;
    }

    return {
      total: allErrors.length,
      openCount,
      resolvedCount,
      last24hCount,
      devices,
    };
  },
});

/** 관리자: 특정 에러 상태 변경 */
export const updateErrorStatus = mutation({
  args: {
    errorId: v.id("clientErrors"),
    status: v.union(v.literal("open"), v.literal("resolved"), v.literal("ignored")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.errorId, { status: args.status });
  },
});

/** 관리자: 모든 미해결 에러 일괄 해결 처리 */
export const resolveAllOpen = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const openErrors = await ctx.db
      .query("clientErrors")
      .withIndex("by_status", (q) => q.eq("status", "open"))
      .collect();

    for (const err of openErrors) {
      await ctx.db.patch(err._id, { status: "resolved" });
    }

    return openErrors.length;
  },
});

/** 관리자: 특정 에러 영구 삭제 */
export const deleteError = mutation({
  args: { errorId: v.id("clientErrors") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.errorId);
  },
});
