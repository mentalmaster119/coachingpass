import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every hour: send daily check-in reminder to users who haven't checked in
crons.hourly(
  "daily check-in reminder",
  { minuteUTC: 0 },
  internal.reminders.sendCheckInReminders,
);

// Every Sunday at midnight UTC (= 9 AM KST Sunday):
// Remind trainees who haven't written a reflection journal this week
crons.weekly(
  "weekly reflection reminder",
  { dayOfWeek: "sunday", hourUTC: 0, minuteUTC: 0 },
  internal.reminders.sendReflectionReminders,
);

// Every Monday at midnight UTC (= 9 AM KST Monday):
// Remind trainees who have draft coaching logs not yet submitted
crons.weekly(
  "coaching log draft reminder",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 0 },
  internal.reminders.sendCoachingLogDraftReminders,
);

// Every Monday at midnight UTC (= 9 AM KST Monday):
// Alert admins about trainees with no activity in the past 2 weeks
crons.weekly(
  "admin trainee progress alert",
  { dayOfWeek: "monday", hourUTC: 0, minuteUTC: 5 },
  internal.reminders.sendAdminProgressAlerts,
);

export default crons;
