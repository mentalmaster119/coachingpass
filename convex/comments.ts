import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser } from "./helpers";
import { insertNotification } from "./notifications";

export const list = query({
  args: {
    coachingLogId: v.id("coachingLogs"),
  },
  handler: async (ctx, args) => {
    // Check if user is authenticated
    const user = await getAuthenticatedUser(ctx);
    
    // Check if the log exists
    const log = await ctx.db.get(args.coachingLogId);
    if (!log) {
      throw new ConvexError({ message: "존재하지 않는 코칭 로그입니다.", code: "NOT_FOUND" });
    }

    // Trainees can only view comments on their own logs
    if (user.role === "trainee" && log.userId !== user._id) {
      throw new ConvexError({ message: "권한이 없습니다.", code: "FORBIDDEN" });
    }

    // Fetch comments sorted by creation date
    return await ctx.db
      .query("coachingLogComments")
      .withIndex("by_log", (q) => q.eq("coachingLogId", args.coachingLogId))
      .collect();
  },
});

export const add = mutation({
  args: {
    coachingLogId: v.id("coachingLogs"),
    content: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const content = args.content.trim();
    if (!content) {
      throw new ConvexError({ message: "댓글 내용을 입력해주세요.", code: "BAD_REQUEST" });
    }

    const log = await ctx.db.get(args.coachingLogId);
    if (!log) {
      throw new ConvexError({ message: "존재하지 않는 코칭 로그입니다.", code: "NOT_FOUND" });
    }

    // Trainees can only comment on their own logs
    if (user.role === "trainee" && log.userId !== user._id) {
      throw new ConvexError({ message: "권한이 없습니다.", code: "FORBIDDEN" });
    }

    // Insert comment
    const commentId = await ctx.db.insert("coachingLogComments", {
      coachingLogId: args.coachingLogId,
      userId: user._id,
      userName: user.name || "사용자",
      role: user.role,
      content,
      createdAt: Date.now(),
    });

    // Notify:
    // If trainee commented, notify assigned coach and admins
    // If admin or coach commented, notify the trainee
    if (user.role === "trainee") {
      const trainee = await ctx.db.get(log.userId);
      if (trainee?.assignedCoachId) {
        await insertNotification(ctx, {
          userId: trainee.assignedCoachId,
          type: "coaching_log_commented",
          title: "코칭 로그 새 댓글",
          message: `${user.name}님이 코칭 로그에 새 댓글을 남겼습니다: "${content.substring(0, 20)}..."`,
          relatedId: log._id,
        });
      }
      
      // Notify admins
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();
      for (const admin of admins) {
        if (trainee?.assignedCoachId === admin._id) continue;
        await insertNotification(ctx, {
          userId: admin._id,
          type: "coaching_log_commented",
          title: "코칭 로그 새 댓글",
          message: `${user.name}님이 코칭 로그에 새 댓글을 남겼습니다: "${content.substring(0, 20)}..."`,
          relatedId: log._id,
        });
      }
    } else {
      // Admin/Coach commented -> Notify trainee
      await insertNotification(ctx, {
        userId: log.userId,
        type: "coaching_log_commented",
        title: "코칭 로그 피드백 댓글",
        message: `${user.name} 코치님이 피드백 댓글을 남겼습니다: "${content.substring(0, 20)}..."`,
        relatedId: log._id,
      });
    }

    return commentId;
  },
});

export const remove = mutation({
  args: {
    commentId: v.id("coachingLogComments"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const comment = await ctx.db.get(args.commentId);
    if (!comment) {
      throw new ConvexError({ message: "존재하지 않는 댓글입니다.", code: "NOT_FOUND" });
    }

    // Only comment owner or admin can delete the comment
    if (comment.userId !== user._id && user.role !== "admin") {
      throw new ConvexError({ message: "삭제 권한이 없습니다.", code: "FORBIDDEN" });
    }

    await ctx.db.delete(args.commentId);
    return { success: true };
  },
});
