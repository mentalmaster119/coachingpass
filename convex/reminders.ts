"use node";

import { internalAction } from "./mockAuth";
import { internal } from "./_generated/api";

/**
 * Hourly cron: send daily check-in reminder to users who haven't checked in
 */
export const sendCheckInReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const nowUTC = new Date();
    const currentHourUTC = nowUTC.getUTCHours();

    // Today in KST (UTC+9)
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(nowUTC.getTime() + kstOffset);
    const todayKST = kstNow.toISOString().split("T")[0];

    const usersToRemind: string[] = await ctx.runQuery(
      internal.reminderQueries.getUsersForCheckInReminder,
      { currentHourUTC, todayKST },
    );

    if (usersToRemind.length === 0) return;

    await ctx.runAction(internal.pushNotifications.sendNotification, {
      visitorIds: usersToRemind,
      title: "오늘의 체크인을 완료하세요! 💪",
      body: "몸 상태, 마음 상태, 열정을 기록해보세요. 꾸준한 기록이 성장의 시작입니다.",
    });
  },
});

/**
 * Weekly cron (Sunday 9 AM KST = Sunday midnight UTC):
 * Remind trainees who haven't written a reflection journal this week.
 */
export const sendReflectionReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const nowUTC = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(nowUTC.getTime() + kstOffset);

    // Compute Monday and Sunday of this KST week
    const dayOfWeek = kstNow.getUTCDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(kstNow);
    monday.setUTCDate(kstNow.getUTCDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setUTCDate(monday.getUTCDate() + 6);

    const weekStartKST = monday.toISOString().split("T")[0];
    const weekEndKST = sunday.toISOString().split("T")[0];

    const usersToRemind: string[] = await ctx.runQuery(
      internal.reminderQueries.getUsersForReflectionReminder,
      { weekStartKST, weekEndKST },
    );

    if (usersToRemind.length === 0) return;

    await ctx.runAction(internal.pushNotifications.sendNotification, {
      visitorIds: usersToRemind,
      title: "이번 주 성찰 일지를 작성해보세요 📔",
      body: "한 주를 돌아보며 성찰 일지를 작성하면 코칭 역량이 더욱 성장합니다.",
    });
  },
});

/**
 * Weekly cron (Monday 9 AM KST = Sunday midnight UTC):
 * Remind trainees who have coaching logs sitting in draft status.
 */
export const sendCoachingLogDraftReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const usersToRemind: string[] = await ctx.runQuery(
      internal.reminderQueries.getUsersWithDraftCoachingLogs,
      {},
    );

    if (usersToRemind.length === 0) return;

    await ctx.runAction(internal.pushNotifications.sendNotification, {
      visitorIds: usersToRemind,
      title: "미제출 코칭 기록이 있습니다 📋",
      body: "임시 저장된 코칭 로그가 있습니다. 검토 후 제출하면 승인 절차가 시작됩니다.",
    });
  },
});

/**
 * Weekly cron (Monday 9 AM KST):
 * Alert admins about trainees who have had no activity in the past 2 weeks.
 */
export const sendAdminProgressAlerts = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const nowUTC = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(nowUTC.getTime() + kstOffset);

    // Two weeks ago in KST
    const twoWeeksAgo = new Date(kstNow);
    twoWeeksAgo.setUTCDate(kstNow.getUTCDate() - 14);
    const twoWeeksAgoKST = twoWeeksAgo.toISOString().split("T")[0];

    const inactiveTrainees: Array<{ name: string }> = await ctx.runQuery(
      internal.reminderQueries.getInactiveTrainees,
      { sinceKST: twoWeeksAgoKST },
    );

    if (inactiveTrainees.length === 0) return;

    // Get all admin visitorIds to push-notify
    const adminVisitorIds: string[] = await ctx.runQuery(
      internal.reminderQueries.getAdminVisitorIds,
      {},
    );

    // Send push notification to admins
    if (adminVisitorIds.length > 0) {
      await ctx.runAction(internal.pushNotifications.sendNotification, {
        visitorIds: adminVisitorIds,
        title: "비활동 교육생 알림 👀",
        body: `최근 2주간 활동이 없는 교육생이 ${inactiveTrainees.length}명 있습니다.`,
      });
    }

    // Also send in-app notification to all admins
    await ctx.runMutation(internal.reminderQueries.insertAdminProgressAlerts, {
      inactiveCount: inactiveTrainees.length,
      inactiveNames: inactiveTrainees.map((t) => t.name).slice(0, 5),
    });
  },
});
