import { query } from "./mockAuth";
import { requireRole, getAuthenticatedUser } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";

// ── Admin: comprehensive dashboard stats ─────────────────────────────────────

export const getAdminDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin"]);

    const [allUsers, certApplications, feedbacks, announcements] = await Promise.all([
      ctx.db.query("users").collect(),
      ctx.db.query("certificationApplications").collect(),
      ctx.db.query("coachFeedbacks").collect(),
      ctx.db.query("announcements").withIndex("by_published", (q) => q.eq("isPublished", true)).collect(),
    ]);

    const trainees = allUsers.filter((u) => u.role === "trainee" && u.approvalStatus === "approved");
    const coaches = allUsers.filter((u) => u.role === "senior_coach" && u.approvalStatus === "approved");

    // Certification application breakdown
    const certSubmitted = certApplications.filter((a) => a.status === "submitted").length;
    const certUnderReview = certApplications.filter((a) => a.status === "under_review").length;
    const certApproved = certApplications.filter((a) => a.status === "approved").length;
    const certRejected = certApplications.filter((a) => a.status === "rejected").length;

    // Monthly trainee registrations (last 6 months)
    const now = new Date();
    const recentMonths: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = `${d.getMonth() + 1}월`;
      recentMonths.push({ key, label });
    }

    const monthlyRegistrations = recentMonths.map(({ label, key }) => {
      const count = allUsers.filter((u) => {
        const createdAt = new Date(u._creationTime);
        const monthKey = `${createdAt.getFullYear()}-${String(createdAt.getMonth() + 1).padStart(2, "0")}`;
        return monthKey === key;
      }).length;
      return { month: label, count };
    });

    // Unassigned trainees
    const unassignedCount = trainees.filter((t) => !t.assignedCoachId).length;

    return {
      totalUsers: allUsers.length,
      traineeCount: trainees.length,
      coachCount: coaches.length,
      pendingUsers: allUsers.filter((u) => u.approvalStatus === "pending").length,
      certSubmitted,
      certUnderReview,
      certApproved,
      certTotal: certApplications.length,
      feedbackTotal: feedbacks.length,
      announcementCount: announcements.length,
      unassignedTrainees: unassignedCount,
      monthlyRegistrations,
      certDistribution: [
        { name: "SMPCC", value: trainees.length },
      ],
    };
  },
});

// ── Coach: dashboard with trainee progress overview ───────────────────────────

export const getCoachDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const me = await requireRole(ctx, ["senior_coach"]);

    // Get assigned trainees
    const allUsers = await ctx.db.query("users").collect();
    const myTrainees = allUsers.filter(
      (u) =>
        u.role === "trainee" &&
        u.approvalStatus === "approved" &&
        u.assignedCoachId?.toString() === me._id.toString(),
    );

    // For each trainee, fetch progress
    const traineeProgress = await Promise.all(
      myTrainees.map(async (trainee) => {
        const [eduRecords, coachLogs, feedbacksGiven] = await Promise.all([
          ctx.db
            .query("educationRecords")
            .withIndex("by_user", (q) => q.eq("userId", trainee._id))
            .collect(),
          ctx.db
            .query("coachingLogs")
            .withIndex("by_user", (q) => q.eq("userId", trainee._id))
            .collect(),
          ctx.db
            .query("coachFeedbacks")
            .withIndex("by_trainee", (q) => q.eq("traineeId", trainee._id))
            .collect(),
        ]);

        const eduTarget = 60;
        const coachTarget = 100;

        const approvedEduHours = eduRecords
          .filter((r) => r.approvalStatus === "approved")
          .reduce((s, r) => s + r.hours, 0);

        const approvedCoachHours =
          coachLogs
            .filter((l) => l.approvalStatus === "approved")
            .reduce((s, l) => s + l.durationMinutes, 0) / 60;

        const eduPct = Math.min((approvedEduHours / eduTarget) * 100, 100);
        const coachPct = Math.min((approvedCoachHours / coachTarget) * 100, 100);
        const overallPct = Math.round((eduPct + coachPct) / 2);

        const pendingCount =
          eduRecords.filter((r) => r.approvalStatus === "pending").length +
          coachLogs.filter((l) => l.approvalStatus === "pending").length;

        return {
          _id: trainee._id,
          name: trainee.name ?? "이름 미설정",
          email: trainee.email ?? "",
          certificationGoal: "SMPCC",
          approvedEduHours: Math.round(approvedEduHours * 10) / 10,
          approvedCoachHours: Math.round(approvedCoachHours * 10) / 10,
          eduTarget,
          coachTarget,
          overallPct,
          pendingCount,
          feedbackCount: feedbacksGiven.length,
        };
      }),
    );

    // My feedbacks stats
    const myFeedbacks = await ctx.db
      .query("coachFeedbacks")
      .withIndex("by_coach", (q) => q.eq("coachId", me._id))
      .collect();

    const avgRating =
      myFeedbacks.length > 0
        ? myFeedbacks.reduce((s, f) => s + f.rating, 0) / myFeedbacks.length
        : 0;

    return {
      traineeCount: myTrainees.length,
      traineeProgress,
      totalFeedbackGiven: myFeedbacks.length,
      avgFeedbackRating: Math.round(avgRating * 10) / 10,
      totalPendingReviews: traineeProgress.reduce((s, t) => s + t.pendingCount, 0),
    };
  },
});

// ── Trainee: this month's quick stats ─────────────────────────────────────────

export const getTraineeThisMonthStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const [eduRecords, coachLogs, reflections, unreadFeedbacks] = await Promise.all([
      ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("reflectionJournals").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db
        .query("coachFeedbacks")
        .withIndex("by_trainee_and_read", (q) => q.eq("traineeId", user._id).eq("isRead", false))
        .collect(),
    ]);

    const thisMonthEduHours = eduRecords
      .filter((r) => r.approvalStatus === "approved" && r.educationDate.startsWith(monthKey))
      .reduce((s, r) => s + r.hours, 0);

    const thisMonthCoachHours =
      coachLogs
        .filter((l) => l.approvalStatus === "approved" && l.coachingDate.startsWith(monthKey))
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    const thisMonthReflections = reflections.filter((r) => r.entryDate.startsWith(monthKey)).length;

    return {
      thisMonthEduHours: Math.round(thisMonthEduHours * 10) / 10,
      thisMonthCoachHours: Math.round(thisMonthCoachHours * 10) / 10,
      thisMonthReflections,
      unreadFeedbackCount: unreadFeedbacks.length,
      totalEduRecords: eduRecords.length,
      totalCoachLogs: coachLogs.length,
    };
  },
});

// ── Trainee: recent activity feed ─────────────────────────────────────────────

export const getTraineeRecentActivity = query({
  args: {},
  handler: async (ctx): Promise<{
    type: "education" | "coaching" | "reflection" | "mentor_coaching";
    date: string;
    title: string;
    subtitle: string;
    status: "pending" | "approved" | "rejected" | "draft" | "done";
  }[]> => {
    const user = await getAuthenticatedUser(ctx);

    const [eduRecords, coachLogs, reflections, mentorLogs] = await Promise.all([
      ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("reflectionJournals").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    const activities = [
      ...eduRecords.map((r) => ({
        type: "education" as const,
        date: r.educationDate,
        title: r.educationName,
        subtitle: `${r.institution} · ${r.hours}시간`,
        status: r.approvalStatus,
      })),
      ...coachLogs.map((l) => ({
        type: "coaching" as const,
        date: l.coachingDate,
        title: l.topic,
        subtitle: `${l.coacheeInfo} · ${Math.round(l.durationMinutes / 60 * 10) / 10}시간`,
        status: l.approvalStatus,
      })),
      ...reflections.map((r) => ({
        type: "reflection" as const,
        date: r.entryDate,
        title: r.title,
        subtitle: r.content.slice(0, 40) + (r.content.length > 40 ? "..." : ""),
        status: "done" as const,
      })),
      ...mentorLogs.map((l) => ({
        type: "mentor_coaching" as const,
        date: l.sessionDate,
        title: l.topic,
        subtitle: `${l.coachName} · ${l.sessionType === "mentor_coaching" ? "멘토코칭" : "코더코"}`,
        status: l.approvalStatus,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);

    return activities;
  },
});

// ── Trainee: MCCI domain distribution ────────────────────────────────────────

export const getMyMcciDomainStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const logs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const domainLabels: Record<string, string> = {
      motivation: "동기부여",
      skill: "기술",
      performance: "수행",
      relationship: "관계",
    };

    const counts: Record<string, number> = {
      motivation: 0,
      skill: 0,
      performance: 0,
      relationship: 0,
    };
    let untagged = 0;

    for (const log of logs) {
      if (log.mcciDomain && counts[log.mcciDomain] !== undefined) {
        counts[log.mcciDomain]++;
      } else {
        untagged++;
      }
    }

    const distribution = Object.entries(counts)
      .map(([domain, count]) => ({ domain, label: domainLabels[domain] ?? domain, count }))
      .filter((d) => d.count > 0);

    return {
      distribution,
      total: logs.length,
      untagged,
    };
  },
});

// ── Trainee: attendance rate summary ─────────────────────────────────────────

export const getMyAttendanceStats = query({
  args: {},
  handler: async (ctx): Promise<{
    totalSeminars: number;
    attendedSeminars: number;
    attendanceRate: number;
    thisMonthAttended: number;
  }> => {
    const user = await getAuthenticatedUser(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    let totalSeminars = 0; // Total day-slots
    let attendedSeminars = 0; // Attended day-slots
    let thisMonthAttended = 0;

    for (const m of memberships) {
      const seminars = await ctx.db
        .query("seminars")
        .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", m.cohortId))
        .collect();

      const pastSeminars = seminars.filter((s) => s.endDate <= today && s.seminarType === "two_day");

      for (const s of pastSeminars) {
        const dates = s.startDate === s.endDate ? [s.startDate] : [s.startDate, s.endDate];
        
        for (const date of dates) {
          totalSeminars++;
          
          const record = await ctx.db
            .query("attendances")
            .withIndex("by_seminar_and_user_and_date", (q) =>
              q.eq("seminarId", s._id).eq("userId", user._id).eq("date", date)
            )
            .unique();
            
          if (record && (record.status === "present" || record.status === "late" || record.status === "excused")) {
            attendedSeminars++;
            if (date.startsWith(monthKey)) thisMonthAttended++;
          }
        }
      }
    }

    const attendanceRate = totalSeminars > 0
      ? Math.round((attendedSeminars / totalSeminars) * 100)
      : 0;

    return { totalSeminars, attendedSeminars, attendanceRate, thisMonthAttended };
  },
});

// ── Admin: cohort activity stats ──────────────────────────────────────────────

export const getCohortActivityStats = query({
  args: {},
  handler: async (ctx): Promise<{
    cohortName: string;
    memberCount: number;
    totalLogs: number;
    approvedLogs: number;
    totalHours: number;
  }[]> => {
    await requireRole(ctx, ["admin"]);

    const cohorts = await ctx.db.query("cohorts").collect();
    const activeCohorts = cohorts
      .filter((c) => c.status === "active" || c.status === "upcoming")
      .sort((a, b) => b.number - a.number)
      .slice(0, 6); // last 6 cohorts max

    const results = await Promise.all(
      activeCohorts.map(async (cohort) => {
        const members = await ctx.db
          .query("cohortMembers")
          .withIndex("by_cohort", (q) => q.eq("cohortId", cohort._id))
          .collect();

        const activeMemberIds = members
          .filter((m) => m.status === "active")
          .map((m) => m.userId);

        let totalLogs = 0;
        let approvedLogs = 0;
        let totalMinutes = 0;

        for (const userId of activeMemberIds) {
          const logs = await ctx.db
            .query("coachingLogs")
            .withIndex("by_user", (q) => q.eq("userId", userId))
            .collect();
          totalLogs += logs.length;
          const approved = logs.filter((l) => l.approvalStatus === "approved");
          approvedLogs += approved.length;
          totalMinutes += approved.reduce((s, l) => s + l.durationMinutes, 0);
        }

        return {
          cohortName: cohort.name,
          memberCount: activeMemberIds.length,
          totalLogs,
          approvedLogs,
          totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        };
      }),
    );

    return results;
  },
});

// ── Admin: recent certification applications ──────────────────────────────────

export const getRecentCertApplications = query({
  args: {},
  handler: async (ctx): Promise<{
    _id: Id<"certificationApplications">;
    userName: string;
    certificationGoal: string;
    submittedAt: string;
    status: "submitted" | "under_review" | "approved" | "rejected";
  }[]> => {
    await requireRole(ctx, ["admin"]);
    const apps = await ctx.db.query("certificationApplications").order("desc").take(5);
    return await Promise.all(
      apps.map(async (app) => {
        const user = await ctx.db.get(app.userId);
        return {
          _id: app._id,
          userName: user?.name ?? "이름 미설정",
          certificationGoal: app.certificationGoal ?? "SMPCC",
          submittedAt: app.submittedAt,
          status: app.status,
        };
      }),
    );
  },
});

// ── Trainee: today's todo checklist + next event D-day + recent feedback ──────

export const getTraineeTodayOverview = query({
  args: {},
  handler: async (ctx): Promise<{
    pendingCoachingLogs: number;
    rejectedCoachingLogs: number;
    draftCoachingLogs: number;
    pendingEducationRecords: number;
    nextEvent: { title: string; eventDate: string; daysLeft: number } | null;
    recentFeedback: {
      _id: string;
      coachName: string;
      rating: number;
      strengths: string;
      improvements: string;
      feedbackDate: string;
      isRead: boolean;
    } | null;
  }> => {
    const user = await getAuthenticatedUser(ctx);
    const today = new Date().toISOString().slice(0, 10);

    const [coachingLogs, eduRecords, upcomingEvents, feedbacks] = await Promise.all([
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("calendarEvents").collect(),
      ctx.db.query("coachFeedbacks").withIndex("by_trainee", (q) => q.eq("traineeId", user._id)).order("desc").take(1),
    ]);

    const pendingCoachingLogs = coachingLogs.filter((l) => l.approvalStatus === "pending").length;
    const rejectedCoachingLogs = coachingLogs.filter((l) => l.approvalStatus === "rejected").length;
    const draftCoachingLogs = coachingLogs.filter((l) => l.approvalStatus === "draft").length;
    const pendingEducationRecords = eduRecords.filter((r) => r.approvalStatus === "pending").length;

    const future = upcomingEvents
      .filter((e) => (e.isShared || e.userId === user._id) && e.eventDate >= today)
      .sort((a, b) => a.eventDate.localeCompare(b.eventDate));

    let nextEvent = null;
    if (future.length > 0) {
      const ev = future[0];
      const evDate = new Date(ev.eventDate);
      const todayDate = new Date(today);
      const daysLeft = Math.round((evDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
      nextEvent = { title: ev.title, eventDate: ev.eventDate, daysLeft };
    }

    let recentFeedback = null;
    if (feedbacks.length > 0) {
      const fb = feedbacks[0];
      const coach = await ctx.db.get(fb.coachId);
      recentFeedback = {
        _id: fb._id,
        coachName: coach?.name ?? "코치",
        rating: fb.rating,
        strengths: fb.strengths,
        improvements: fb.improvements,
        feedbackDate: fb.feedbackDate,
        isRead: fb.isRead,
      };
    }

    return {
      pendingCoachingLogs,
      rejectedCoachingLogs,
      draftCoachingLogs,
      pendingEducationRecords,
      nextEvent,
      recentFeedback,
    };
  },
});

// Quick action widget: today's task completion status for the trainee
export const getQuickActionStatus = query({
  args: {},
  handler: async (ctx): Promise<{
    checkedInToday: boolean;
    coachingLogThisWeek: boolean;
    reflectionThisWeek: boolean;
    draftCoachingLogs: number;
  }> => {
    const user = await getAuthenticatedUser(ctx);
    const today = new Date().toISOString().slice(0, 10);

    // Calculate start of this week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const weekStart = monday.toISOString().slice(0, 10);

    const [checkIn, coachingLogs, reflections] = await Promise.all([
      ctx.db
        .query("dailyCheckIns")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).eq("checkInDate", today))
        .unique(),
      ctx.db
        .query("coachingLogs")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .collect(),
      ctx.db
        .query("reflectionJournals")
        .withIndex("by_user_and_date", (q) => q.eq("userId", user._id).gte("entryDate", weekStart))
        .collect(),
    ]);

    const coachingLogThisWeek = coachingLogs.some(
      (l) => l.coachingDate >= weekStart && l.approvalStatus !== "draft",
    );
    const draftCoachingLogs = coachingLogs.filter((l) => l.approvalStatus === "draft").length;

    return {
      checkedInToday: checkIn !== null,
      coachingLogThisWeek,
      reflectionThisWeek: reflections.length > 0,
      draftCoachingLogs,
    };
  },
});
