import { v } from "convex/values";
import { query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";
import { calculateCoachingProgress } from "./completion";
import { calculateUserEducation } from "./educationCalculator";

// ── Trainee: full progress overview ─────────────────────────────────────────

export const getMyProgress = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const eduCalc = await calculateUserEducation(ctx, user._id);
    const { educationRecords, coachingLogs } = eduCalc;

    const approvedCoachingMinutes = coachingLogs
      .filter((l) => l.approvalStatus === "approved")
      .reduce((sum, l) => sum + l.durationMinutes, 0);
    const approvedCoachingHours = approvedCoachingMinutes / 60;

    // Monthly activity for the last 12 months
    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      months.push({ key, label });
    }

    const monthlyActivity = months.map(({ key, label }) => {
      let eduHours = 0;
      for (const [date, hrs] of eduCalc.byDate.entries()) {
        if (date.startsWith(key)) {
          eduHours += hrs;
        }
      }

      const coachingHours =
        coachingLogs
          .filter((l) => l.approvalStatus === "approved" && l.coachingDate.startsWith(key))
          .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
      return {
        month: label,
        educationHours: Math.round(eduHours * 10) / 10,
        coachingHours: Math.round(coachingHours * 10) / 10,
      };
    });

    // Recent activity (combined, sorted by date desc)
    type ActivityItem = {
      type: "education" | "coaching";
      date: string;
      title: string;
      hours: number;
      status: "pending" | "approved" | "rejected" | "draft";
    };

    const recentActivity: ActivityItem[] = [
      ...educationRecords.map((r) => ({
        type: "education" as const,
        date: r.educationDate,
        title: r.educationName,
        hours: r.hours,
        status: r.approvalStatus,
      })),
      ...eduCalc.attendanceActivityItems,
      ...coachingLogs.map((l) => ({
        type: "coaching" as const,
        date: l.coachingDate,
        title: l.topic,
        hours: Math.round((l.durationMinutes / 60) * 10) / 10,
        status: l.approvalStatus,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 10);

    const coachingProgress = await calculateCoachingProgress(ctx, user._id);

    const bookReports = await ctx.db
      .query("bookReports")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const essays = await ctx.db
      .query("coachingEssays")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const approvedBookReportCount = bookReports.filter((r) => r.approvalStatus === "approved").length;
    const approvedEssayCount = essays.filter((e) => e.approvalStatus === "approved").length;

    return {
      approvedEducationHours: eduCalc.approvedEducationHours,
      approvedCoachingHours,
      educationPendingCount: eduCalc.educationPendingCount,
      coachingPendingCount: coachingLogs.filter((l) => l.approvalStatus === "pending").length,
      monthlyActivity,
      recentActivity,
      
      buddyCount: coachingProgress.buddyCount,
      mentorCount: coachingProgress.mentorCount,
      svCount: coachingProgress.svCount,
      sportsCount: coachingProgress.sportsCount,
      generalCount: coachingProgress.generalCount,
      totalCoachingCount: coachingProgress.totalCount,
      approvedBookReportCount,
      approvedEssayCount,
    };
  },
});

// ── Admin / Senior coach: all trainees progress summary ─────────────────────

export const getAllTraineesProgress = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .filter((q) => q.eq(q.field("approvalStatus"), "approved"))
      .collect();

    return await Promise.all(
      trainees.map(async (trainee) => {
        const eduCalc = await calculateUserEducation(ctx, trainee._id);
        const { coachingLogs } = eduCalc;

        const approvedCoachingHours =
          coachingLogs
            .filter((l) => l.approvalStatus === "approved")
            .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;

        const educationTarget = 60;
        const coachingTarget = 100;

        const educationPct = Math.min((eduCalc.approvedEducationHours / educationTarget) * 100, 100);
        const coachingPct = Math.min((approvedCoachingHours / coachingTarget) * 100, 100);
        const overallPct = Math.round((educationPct + coachingPct) / 2);

        return {
          _id: trainee._id,
          name: trainee.name ?? "이름 미설정",
          email: trainee.email ?? "",
          certificationGoal: "SMPCC" as const,
          approvedEducationHours: eduCalc.approvedEducationHours,
          approvedCoachingHours: Math.round(approvedCoachingHours * 10) / 10,
          educationTarget,
          coachingTarget,
          overallPct,
          educationPendingCount: eduCalc.educationPendingCount,
          coachingPendingCount: coachingLogs.filter((l) => l.approvalStatus === "pending").length,
        };
      }),
    );
  },
});

// ── Admin: pending review counts ────────────────────────────────────────────

export const getPendingReviewCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const pendingEducation = await ctx.db
      .query("educationRecords")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .collect();

    const pendingCoaching = await ctx.db
      .query("coachingLogs")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .collect();

    return {
      educationPending: pendingEducation.length,
      coachingPending: pendingCoaching.length,
      total: pendingEducation.length + pendingCoaching.length,
    };
  },
});

// ── Admin: get specific trainee full detail ──────────────────────────────────

export const getTraineeDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{
    user: { _id: Id<"users">; name: string; email: string; certificationGoal: string };
    approvedEducationHours: number;
    approvedCoachingHours: number;
    educationTarget: number;
    coachingTarget: number;
    educationRecords: { _id: Id<"educationRecords">; educationName: string; institution: string; educationDate: string; hours: number; approvalStatus: string }[];
    coachingLogs: { _id: Id<"coachingLogs">; topic: string; coachingDate: string; durationMinutes: number; approvalStatus: string; coachingType: string }[];
    monthlyActivity: { month: string; educationHours: number; coachingHours: number }[];
  } | null> => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const trainee = await ctx.db.get(args.userId);
    if (!trainee) return null;

    const eduCalc = await calculateUserEducation(ctx, args.userId);
    const { educationRecords, coachingLogs } = eduCalc;

    const approvedCoachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;

    const educationTarget = 60;
    const coachingTarget = 100;

    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      months.push({ key, label });
    }

    const monthlyActivity = months.map(({ key, label }) => {
      let eduHours = 0;
      for (const [date, hrs] of eduCalc.byDate.entries()) {
        if (date.startsWith(key)) {
          eduHours += hrs;
        }
      }

      const coHours =
        coachingLogs
          .filter((l) => l.approvalStatus === "approved" && l.coachingDate.startsWith(key))
          .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
      return {
        month: label,
        educationHours: Math.round(eduHours * 10) / 10,
        coachingHours: Math.round(coHours * 10) / 10,
      };
    });

    return {
      user: {
        _id: trainee._id,
        name: trainee.name ?? "이름 미설정",
        email: trainee.email ?? "",
        certificationGoal: "SMPCC" as const,
      },
      approvedEducationHours: eduCalc.approvedEducationHours,
      approvedCoachingHours: Math.round(approvedCoachingHours * 10) / 10,
      educationTarget,
      coachingTarget,
      educationRecords: educationRecords
        .sort((a, b) => b.educationDate.localeCompare(a.educationDate))
        .map((r) => ({
          _id: r._id,
          educationName: r.educationName,
          institution: r.institution,
          educationDate: r.educationDate,
          hours: r.hours,
          approvalStatus: r.approvalStatus,
        })),
      coachingLogs: coachingLogs
        .sort((a, b) => b.coachingDate.localeCompare(a.coachingDate))
        .map((l) => ({
          _id: l._id,
          topic: l.topic,
          coachingDate: l.coachingDate,
          durationMinutes: l.durationMinutes,
          approvalStatus: l.approvalStatus,
          coachingType: l.coachingType,
        })),
      monthlyActivity,
    };
  },
});

// ── Admin: get specific trainee progress ────────────────────────────────────

export const getTraineeProgress = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{
    approvedEducationHours: number;
    approvedCoachingHours: number;
    monthlyActivity: { month: string; educationHours: number; coachingHours: number }[];
  }> => {
    await requireRole(ctx, ["admin", "senior_coach"]);

    const eduCalc = await calculateUserEducation(ctx, args.userId);
    const { coachingLogs } = eduCalc;

    const approvedCoachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;

    const now = new Date();
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      months.push({ key, label });
    }

    const monthlyActivity = months.map(({ key, label }) => {
      let eduHours = 0;
      for (const [date, hrs] of eduCalc.byDate.entries()) {
        if (date.startsWith(key)) {
          eduHours += hrs;
        }
      }

      const coachingHours =
        coachingLogs
          .filter((l) => l.approvalStatus === "approved" && l.coachingDate.startsWith(key))
          .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
      return {
        month: label,
        educationHours: Math.round(eduHours * 10) / 10,
        coachingHours: Math.round(coachingHours * 10) / 10,
      };
    });

    return {
      approvedEducationHours: eduCalc.approvedEducationHours,
      approvedCoachingHours: Math.round(approvedCoachingHours * 10) / 10,
      monthlyActivity,
    };
  },
});
