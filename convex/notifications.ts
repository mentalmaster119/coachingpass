import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Notification type ────────────────────────────────────────────────────────

type NotificationType =
  | "education_approved"
  | "education_rejected"
  | "coaching_approved"
  | "coaching_rejected"
  | "mentor_coaching_approved"
  | "mentor_coaching_rejected"
  | "account_approved"
  | "account_rejected"
  | "account_pending"
  | "certification_approved"
  | "certification_rejected"
  | "feedback_received"
  | "profile_incomplete"
  | "announcement"
  | "bcp_approved"
  | "bcp_rejected"
  | "coaching_log_submitted"
  | "reflection_submitted"
  | "trainee_progress_alert";

// ── Queries ──────────────────────────────────────────────────────────────────

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(50);
    return notifications;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false),
      )
      .collect();
    return unread.length;
  },
});

// ── Mutations ────────────────────────────────────────────────────────────────

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new ConvexError({ message: "Notification not found", code: "NOT_FOUND" });
    }
    if (notification.userId !== user._id) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.notificationId, { isRead: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_user_and_read", (q) =>
        q.eq("userId", user._id).eq("isRead", false),
      )
      .collect();

    await Promise.all(unread.map((n) => ctx.db.patch(n._id, { isRead: true })));
  },
});

// ── Internal helper (called from other mutations) ─────────────────────────────

export async function insertNotification(
  ctx: {
    db: {
      insert: (
        table: "notifications",
        doc: {
          userId: Id<"users">;
          type: NotificationType;
          title: string;
          message: string;
          isRead: boolean;
          relatedId?: string;
        },
      ) => Promise<Id<"notifications">>;
    };
  },
  params: {
    userId: Id<"users">;
    type: NotificationType;
    title: string;
    message: string;
    relatedId?: string;
  },
) {
  await ctx.db.insert("notifications", {
    ...params,
    isRead: false,
  });
}
