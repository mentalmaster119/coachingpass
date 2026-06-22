import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";
import type { MutationCtx } from "./mockAuth";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Helper: notify assigned coach of new reflection ────────────────────────
async function notifyCoachOfReflection(
  ctx: MutationCtx,
  traineeName: string,
  traineeId: Id<"users">,
  title: string,
) {
  const trainee = await ctx.db.get(traineeId);
  if (!trainee?.assignedCoachId) return;
  await insertNotification(ctx, {
    userId: trainee.assignedCoachId,
    type: "reflection_submitted",
    title: "성찰 일지 작성",
    message: `${traineeName}님이 성찰 일지를 작성했습니다: "${title}"`,
    relatedId: traineeId,
  });
}

// ── Validators ────────────────────────────────────────────────────────────────

const relatedTypeValidator = v.optional(
  v.union(
    v.literal("general"),
    v.literal("coaching"),
    v.literal("mentor_coaching"),
    v.literal("education"),
  ),
);

const moodValidator = v.optional(
  v.union(
    v.literal("great"),
    v.literal("good"),
    v.literal("neutral"),
    v.literal("difficult"),
    v.literal("challenging"),
  ),
);

// ── Trainee: CRUD ─────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    entryDate: v.string(),
    title: v.string(),
    content: v.string(),
    relatedType: relatedTypeValidator,
    mood: moodValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "수강생만 일지를 작성할 수 있습니다.", code: "FORBIDDEN" });
    }
    const id = await ctx.db.insert("reflectionJournals", {
      ...args,
      userId: user._id,
    });
    // Notify assigned coach
    await notifyCoachOfReflection(ctx, user.name ?? "교육생", user._id, args.title);
    return id;
  },
});

export const update = mutation({
  args: {
    journalId: v.id("reflectionJournals"),
    entryDate: v.string(),
    title: v.string(),
    content: v.string(),
    relatedType: relatedTypeValidator,
    mood: moodValidator,
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const journal = await ctx.db.get(args.journalId);
    if (!journal) throw new ConvexError({ message: "일지를 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (journal.userId !== user._id) {
      throw new ConvexError({ message: "자신의 일지만 수정할 수 있습니다.", code: "FORBIDDEN" });
    }
    const { journalId, ...fields } = args;
    await ctx.db.patch(journalId, fields);
  },
});

export const remove = mutation({
  args: { journalId: v.id("reflectionJournals") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const journal = await ctx.db.get(args.journalId);
    if (!journal) throw new ConvexError({ message: "일지를 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (journal.userId !== user._id) {
      throw new ConvexError({ message: "자신의 일지만 삭제할 수 있습니다.", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.journalId);
  },
});

// ── Trainee: queries ──────────────────────────────────────────────────────────

export const getMyJournals = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    return await ctx.db
      .query("reflectionJournals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

export const getMySummary = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const journals = await ctx.db
      .query("reflectionJournals")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const total = journals.length;
    const byType: Record<string, number> = {};
    const byMood: Record<string, number> = {};

    for (const j of journals) {
      const t = j.relatedType ?? "general";
      byType[t] = (byType[t] ?? 0) + 1;
      if (j.mood) {
        byMood[j.mood] = (byMood[j.mood] ?? 0) + 1;
      }
    }

    // Most recent month count
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const thisMonthCount = journals.filter((j) => j.entryDate >= startOfMonth).length;

    return { total, byType, byMood, thisMonthCount };
  },
});

// ── Admin / Senior coach: read trainee journals ───────────────────────────────

export const getJournalsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    return await ctx.db
      .query("reflectionJournals")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});
