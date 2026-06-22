import { v } from "convex/values";
import { internalQuery, internalMutation } from "./mockAuth";

// Default reminder hour in UTC (9 AM KST = midnight UTC)
const DEFAULT_REMINDER_HOUR_UTC = 0;

/**
 * Returns the visitorIds of approved trainees who:
 * 1. Have check-in reminders enabled
 * 2. Their preferred UTC hour matches currentHourUTC
 * 3. Have NOT completed today's check-in (todayKST)
 */
export const getUsersForCheckInReminder = internalQuery({
  args: {
    currentHourUTC: v.number(),
    todayKST: v.string(),
  },
  handler: async (ctx, args): Promise<string[]> => {
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const visitorIds: string[] = [];

    for (const user of trainees) {
      if (user.approvalStatus !== "approved") continue;

      const reminderEnabled = user.checkInReminderEnabled !== false;
      if (!reminderEnabled) continue;

      const reminderHour = user.checkInReminderHourUTC ?? DEFAULT_REMINDER_HOUR_UTC;
      if (reminderHour !== args.currentHourUTC) continue;

      const todayCheckIn = await ctx.db
        .query("dailyCheckIns")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", user._id).eq("checkInDate", args.todayKST),
        )
        .first();

      if (todayCheckIn) continue;

      const visitorId = user.tokenIdentifier.split("|")[1];
      if (visitorId) visitorIds.push(visitorId);
    }

    return visitorIds;
  },
});

/**
 * Returns visitorIds of approved trainees who:
 * 1. Have reflection reminders enabled
 * 2. Have NOT written a reflection journal this week (weekStartKST..weekEndKST)
 */
export const getUsersForReflectionReminder = internalQuery({
  args: {
    weekStartKST: v.string(), // YYYY-MM-DD (Monday)
    weekEndKST: v.string(),   // YYYY-MM-DD (Sunday)
  },
  handler: async (ctx, args): Promise<string[]> => {
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const visitorIds: string[] = [];

    for (const user of trainees) {
      if (user.approvalStatus !== "approved") continue;

      // Default enabled
      const reminderEnabled = user.reflectionReminderEnabled !== false;
      if (!reminderEnabled) continue;

      // Check for any reflection this week
      const reflections = await ctx.db
        .query("reflectionJournals")
        .withIndex("by_user_and_date", (q) =>
          q
            .eq("userId", user._id)
            .gte("entryDate", args.weekStartKST)
        )
        .filter((q) => q.lte(q.field("entryDate"), args.weekEndKST))
        .first();

      if (reflections) continue; // Already wrote one this week

      const visitorId = user.tokenIdentifier.split("|")[1];
      if (visitorId) visitorIds.push(visitorId);
    }

    return visitorIds;
  },
});

/**
 * Returns visitorIds of approved trainees who:
 * 1. Have coaching log reminders enabled
 * 2. Have at least one coaching log in "draft" status (saved but never submitted)
 */
export const getUsersWithDraftCoachingLogs = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const visitorIds: string[] = [];

    for (const user of trainees) {
      if (user.approvalStatus !== "approved") continue;

      const reminderEnabled = user.coachingLogReminderEnabled !== false;
      if (!reminderEnabled) continue;

      const draft = await ctx.db
        .query("coachingLogs")
        .withIndex("by_user_and_status", (q) =>
          q.eq("userId", user._id).eq("approvalStatus", "draft"),
        )
        .first();

      if (!draft) continue;

      const visitorId = user.tokenIdentifier.split("|")[1];
      if (visitorId) visitorIds.push(visitorId);
    }

    return visitorIds;
  },
});

/**
 * Returns trainees who have had no activity (check-in, coaching log, reflection)
 * since `sinceKST` date (YYYY-MM-DD).
 */
export const getInactiveTrainees = internalQuery({
  args: { sinceKST: v.string() },
  handler: async (ctx, args): Promise<Array<{ name: string }>> => {
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const inactive: Array<{ name: string }> = [];

    for (const user of trainees) {
      if (user.approvalStatus !== "approved") continue;

      const recentCheckIn = await ctx.db
        .query("dailyCheckIns")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", user._id).gte("checkInDate", args.sinceKST),
        )
        .first();
      if (recentCheckIn) continue;

      const recentLog = await ctx.db
        .query("coachingLogs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .filter((q) => q.gte(q.field("coachingDate"), args.sinceKST))
        .first();
      if (recentLog) continue;

      const recentReflection = await ctx.db
        .query("reflectionJournals")
        .withIndex("by_user_and_date", (q) =>
          q.eq("userId", user._id).gte("entryDate", args.sinceKST),
        )
        .first();
      if (recentReflection) continue;

      inactive.push({ name: user.name ?? "이름 없음" });
    }

    return inactive;
  },
});

/**
 * Returns visitorIds for all admin users (for push notifications).
 */
export const getAdminVisitorIds = internalQuery({
  args: {},
  handler: async (ctx): Promise<string[]> => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    return admins
      .map((a) => a.tokenIdentifier.split("|")[1])
      .filter((id): id is string => Boolean(id));
  },
});

/**
 * Insert in-app progress alert notifications for all admins.
 */
export const insertAdminProgressAlerts = internalMutation({
  args: {
    inactiveCount: v.number(),
    inactiveNames: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    const admins = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    const nameList = args.inactiveNames.join(", ");
    const suffix = args.inactiveCount > 5 ? ` 외 ${args.inactiveCount - 5}명` : "";
    const message = `최근 2주간 활동이 없는 교육생 ${args.inactiveCount}명: ${nameList}${suffix}`;

    for (const admin of admins) {
      await ctx.db.insert("notifications", {
        userId: admin._id,
        type: "trainee_progress_alert",
        title: "비활동 교육생 알림",
        message,
        isRead: false,
      });
    }
  },
});
