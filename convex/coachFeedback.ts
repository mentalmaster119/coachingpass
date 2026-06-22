import { v, ConvexError } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Types ─────────────────────────────────────────────────────────────────

type FeedbackCategory = "coaching_skills" | "communication" | "self_development" | "overall";

// ── Mutations ─────────────────────────────────────────────────────────────

export const create = mutation({
  args: {
    traineeId: v.id("users"),
    feedbackDate: v.string(),
    rating: v.number(),
    strengths: v.string(),
    improvements: v.string(),
    content: v.optional(v.string()),
    category: v.union(
      v.literal("coaching_skills"),
      v.literal("communication"),
      v.literal("self_development"),
      v.literal("overall"),
    ),
  },
  handler: async (ctx, args) => {
    const coach = await requireRole(ctx, ["senior_coach", "admin"]);

    // Verify the trainee exists and is assigned to this coach (or user is admin)
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee) throw new ConvexError({ message: "수강생를 찾을 수 없습니다", code: "NOT_FOUND" });
    if (trainee.role !== "trainee") {
      throw new ConvexError({ message: "수강생만 피드백을 받을 수 있습니다", code: "BAD_REQUEST" });
    }
    if (
      coach.role === "senior_coach" &&
      trainee.assignedCoachId?.toString() !== coach._id.toString()
    ) {
      throw new ConvexError({
        message: "담당 수강생에게만 피드백을 작성할 수 있습니다",
        code: "FORBIDDEN",
      });
    }

    const feedbackId = await ctx.db.insert("coachFeedbacks", {
      ...args,
      coachId: coach._id,
      isRead: false,
    });

    // Send notification to trainee
    await insertNotification(ctx, {
      userId: args.traineeId,
      type: "feedback_received",
      title: "새 피드백이 도착했습니다",
      message: `${coach.name ?? "코치"}님이 피드백을 작성했습니다.`,
      relatedId: feedbackId,
    });

    return feedbackId;
  },
});

export const update = mutation({
  args: {
    feedbackId: v.id("coachFeedbacks"),
    rating: v.optional(v.number()),
    strengths: v.optional(v.string()),
    improvements: v.optional(v.string()),
    content: v.optional(v.string()),
    category: v.optional(
      v.union(
        v.literal("coaching_skills"),
        v.literal("communication"),
        v.literal("self_development"),
        v.literal("overall"),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["senior_coach", "admin"]);
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) throw new ConvexError({ message: "피드백을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role === "senior_coach" && feedback.coachId.toString() !== user._id.toString()) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    const { feedbackId, ...fields } = args;
    const patch: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value !== undefined) patch[key] = value;
    }
    await ctx.db.patch(feedbackId, patch);
  },
});

export const remove = mutation({
  args: { feedbackId: v.id("coachFeedbacks") },
  handler: async (ctx, args) => {
    const user = await requireRole(ctx, ["senior_coach", "admin"]);
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) throw new ConvexError({ message: "피드백을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (user.role === "senior_coach" && feedback.coachId.toString() !== user._id.toString()) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.delete(args.feedbackId);
  },
});

export const markAsRead = mutation({
  args: { feedbackId: v.id("coachFeedbacks") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const feedback = await ctx.db.get(args.feedbackId);
    if (!feedback) throw new ConvexError({ message: "피드백을 찾을 수 없습니다", code: "NOT_FOUND" });
    if (feedback.traineeId.toString() !== user._id.toString()) {
      throw new ConvexError({ message: "권한이 없습니다", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.feedbackId, { isRead: true });
  },
});

// ── Queries ────────────────────────────────────────────────────────────────

type FeedbackWithUsers = {
  _id: Id<"coachFeedbacks">;
  _creationTime: number;
  traineeId: Id<"users">;
  coachId: Id<"users">;
  feedbackDate: string;
  rating: number;
  strengths: string;
  improvements: string;
  content?: string;
  category: FeedbackCategory;
  isRead: boolean;
  traineeName: string;
  coachName: string;
};

/** Trainee: get all feedback received */
export const listMyFeedbacks = query({
  args: {},
  handler: async (ctx): Promise<FeedbackWithUsers[]> => {
    const user = await getAuthenticatedUser(ctx);
    const feedbacks = await ctx.db
      .query("coachFeedbacks")
      .withIndex("by_trainee", (q) => q.eq("traineeId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      feedbacks.map(async (fb) => {
        const coach = await ctx.db.get(fb.coachId);
        const trainee = await ctx.db.get(fb.traineeId);
        return {
          ...fb,
          traineeName: trainee?.name ?? "수강생",
          coachName: coach?.name ?? "코치",
        };
      }),
    );
  },
});

/** Coach: get feedback written for a specific trainee */
export const listFeedbackForTrainee = query({
  args: { traineeId: v.id("users") },
  handler: async (ctx, args): Promise<FeedbackWithUsers[]> => {
    await requireRole(ctx, ["senior_coach", "admin"]);
    const feedbacks = await ctx.db
      .query("coachFeedbacks")
      .withIndex("by_trainee", (q) => q.eq("traineeId", args.traineeId))
      .order("desc")
      .collect();

    return await Promise.all(
      feedbacks.map(async (fb) => {
        const coach = await ctx.db.get(fb.coachId);
        const trainee = await ctx.db.get(fb.traineeId);
        return {
          ...fb,
          traineeName: trainee?.name ?? "수강생",
          coachName: coach?.name ?? "코치",
        };
      }),
    );
  },
});

/** Coach: get all feedback written by this coach */
export const listMyWrittenFeedbacks = query({
  args: {},
  handler: async (ctx): Promise<FeedbackWithUsers[]> => {
    const user = await requireRole(ctx, ["senior_coach", "admin"]);
    const feedbacks = await ctx.db
      .query("coachFeedbacks")
      .withIndex("by_coach", (q) => q.eq("coachId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      feedbacks.map(async (fb) => {
        const coach = await ctx.db.get(fb.coachId);
        const trainee = await ctx.db.get(fb.traineeId);
        return {
          ...fb,
          traineeName: trainee?.name ?? "수강생",
          coachName: coach?.name ?? "코치",
        };
      }),
    );
  },
});

/** Admin: get all feedbacks */
export const listAll = query({
  args: {},
  handler: async (ctx): Promise<FeedbackWithUsers[]> => {
    await requireRole(ctx, ["admin"]);
    const feedbacks = await ctx.db.query("coachFeedbacks").order("desc").collect();
    return await Promise.all(
      feedbacks.map(async (fb) => {
        const coach = await ctx.db.get(fb.coachId);
        const trainee = await ctx.db.get(fb.traineeId);
        return {
          ...fb,
          traineeName: trainee?.name ?? "수강생",
          coachName: coach?.name ?? "코치",
        };
      }),
    );
  },
});

/** Unread count for notification badge */
export const getUnreadCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const user = await getAuthenticatedUser(ctx);
    const unread = await ctx.db
      .query("coachFeedbacks")
      .withIndex("by_trainee_and_read", (q) =>
        q.eq("traineeId", user._id).eq("isRead", false),
      )
      .collect();
    return unread.length;
  },
});
