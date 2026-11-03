import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser, requireRole } from "./helpers";
import { insertNotification } from "./notifications";
import { calculateCoachingProgress } from "./completion";
import { calculateUserCohortAttendance } from "./attendance";

// ── Shared requirement thresholds ─────────────────────────────────────────────

const REQUIREMENTS = {
  SMPCC: { education: 60, coaching: 100 },
};

// ── Trainee: submit application ───────────────────────────────────────────────

export const submit = mutation({
  args: {
    personalStatement: v.string(),
    examTitle: v.optional(v.string()),
    examDate: v.optional(v.string()),
    targetCohort: v.optional(v.string()),
    examType: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    if (user.role !== "trainee") {
      throw new ConvexError({ message: "코치만 자격증을 신청할 수 있습니다.", code: "FORBIDDEN" });
    }

    const goal = "SMPCC" as const;

    // Check for existing active application
    const existing = await ctx.db
      .query("certificationApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const active = existing.find((a) => a.status === "submitted" || a.status === "under_review");
    if (active) {
      throw new ConvexError({
        message: "이미 진행 중인 인증시험/자격증 신청이 있습니다. 검토 결과를 기다려 주세요.",
        code: "CONFLICT",
      });
    }

    // Collect progress snapshot
    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const educationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const coachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    // Check if requirements are incomplete (deficiency)
    // Note: As per policy, deficiency does NOT block application; it is flagged for final review upon granting.
    const req = REQUIREMENTS[goal];
    const hasDeficiency = educationHours < req.education || coachingHours < req.coaching;

    // Resolve target cohort
    let targetCohort = args.targetCohort;
    if (!targetCohort) {
      const membership = await ctx.db
        .query("cohortMembers")
        .withIndex("by_user", (q) => q.eq("userId", user._id))
        .first();
      if (membership) {
        const c = await ctx.db.get(membership.cohortId);
        if (c) targetCohort = c.name;
      }
    }

    // If phone is provided, update user profile if not set
    if (args.phone && !user.phone) {
      await ctx.db.patch(user._id, { phone: args.phone });
    }

    return await ctx.db.insert("certificationApplications", {
      userId: user._id,
      certificationGoal: goal,
      submittedAt: new Date().toISOString(),
      status: "submitted",
      personalStatement: args.personalStatement,
      educationHoursAtSubmission: Math.round(educationHours * 10) / 10,
      coachingHoursAtSubmission: Math.round(coachingHours * 10) / 10,
      examTitle: args.examTitle || "2026년 하반기 SMPCC 멘탈코칭 전문가 인증시험",
      examDate: args.examDate || "2026-11-28",
      targetCohort: targetCohort || "17기",
      examType: args.examType || "comprehensive",
      phone: args.phone || user.phone,
      hasPrerequisiteDeficiency: hasDeficiency,
    });
  },
});

// ── Exam Schedule Queries & Event Sync ─────────────────────────────────────────

export const getUpcomingExamSchedule = query({
  args: {},
  handler: async (ctx) => {
    // 1. Check custom configured examSchedules in DB
    const dbSchedules = await ctx.db.query("examSchedules").collect();
    if (dbSchedules.length > 0) {
      // Sort open ones first, then by examDate descending
      const sorted = [...dbSchedules].sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return b.examDate.localeCompare(a.examDate);
      });
      const top = sorted[0];
      return {
        _id: top._id,
        id: top._id,
        title: top.title,
        shortTitle: top.title.length > 25 ? top.title.slice(0, 25) + "..." : top.title,
        targetCohorts: [top.targetCohorts],
        targetCohortDisplay: top.targetCohorts,
        applicationPeriod: top.applicationPeriod || `${top.applicationStartDate} ~ ${top.applicationEndDate}`,
        applicationStartDate: top.applicationStartDate,
        applicationEndDate: top.applicationEndDate,
        examDate: top.examDate,
        examTimeDisplay: top.examTimeDisplay,
        location: top.location,
        subjects: top.subjects,
        isOpen: top.isOpen,
        description: top.description || "",
      };
    }

    // 2. Default 2026 하반기 SMPCC 인증시험 schedule if not yet configured
    const defaultExam = {
      _id: undefined,
      id: "smpcc_2026_second_half",
      title: "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험",
      shortTitle: "2026년 하반기 SMPCC 인증시험",
      targetCohorts: ["16기", "17기"],
      targetCohortDisplay: "16기, 17기 (및 이전 기수 동문/재응시자)",
      applicationPeriod: "2026. 10. 20 (월) ~ 2026. 11. 15 (일)",
      applicationStartDate: "2026-10-20",
      applicationEndDate: "2026-11-15",
      examDate: "2026-11-28",
      examTimeDisplay: "2026년 11월 28일 (토) 10:00 ~ 17:00",
      location: "MCCI 본원 대강당 (서울 강남) 및 비대면 화상 심사 병행",
      subjects: "1차 필기 (코칭 이론 및 윤리 규정) + 2차 실기 (코칭 시연 및 구술 면접)",
      isOpen: true,
      description: "16기, 17기 코치 및 수료생을 위한 2026년 하반기 공식 인증시험입니다. 과제 제출 또는 실습 시간 일부 미달 항목이 있더라도 응시 신청이 가능하며, 최종 자격증 발급 시 심사위원회에서 이수 기준을 최종 검토합니다.",
    };

    return defaultExam;
  },
});

// Admin: list all exam schedules
export const getAllExamSchedules = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    return await ctx.db.query("examSchedules").order("desc").collect();
  },
});

// Admin: create or update exam schedule & sync to calendar
export const upsertExamSchedule = mutation({
  args: {
    scheduleId: v.optional(v.id("examSchedules")),
    title: v.string(),
    targetCohorts: v.string(),
    applicationStartDate: v.string(),
    applicationEndDate: v.string(),
    applicationPeriod: v.optional(v.string()),
    examDate: v.string(),
    examTimeDisplay: v.string(),
    location: v.string(),
    subjects: v.string(),
    isOpen: v.boolean(),
    description: v.optional(v.string()),
    syncToCalendar: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, ["admin"]);

    const applicationPeriod =
      args.applicationPeriod?.trim() || `${args.applicationStartDate} ~ ${args.applicationEndDate}`;

    let scheduleId = args.scheduleId;
    if (scheduleId) {
      await ctx.db.patch(scheduleId, {
        title: args.title.trim(),
        targetCohorts: args.targetCohorts.trim(),
        applicationStartDate: args.applicationStartDate.trim(),
        applicationEndDate: args.applicationEndDate.trim(),
        applicationPeriod,
        examDate: args.examDate.trim(),
        examTimeDisplay: args.examTimeDisplay.trim(),
        location: args.location.trim(),
        subjects: args.subjects.trim(),
        isOpen: args.isOpen,
        description: args.description?.trim() || undefined,
        updatedBy: admin._id,
        updatedAt: new Date().toISOString(),
      });
    } else {
      scheduleId = await ctx.db.insert("examSchedules", {
        title: args.title.trim(),
        targetCohorts: args.targetCohorts.trim(),
        applicationStartDate: args.applicationStartDate.trim(),
        applicationEndDate: args.applicationEndDate.trim(),
        applicationPeriod,
        examDate: args.examDate.trim(),
        examTimeDisplay: args.examTimeDisplay.trim(),
        location: args.location.trim(),
        subjects: args.subjects.trim(),
        isOpen: args.isOpen,
        description: args.description?.trim() || undefined,
        updatedBy: admin._id,
        updatedAt: new Date().toISOString(),
      });
    }

    // Sync to calendarEvents (enabled by default)
    if (args.syncToCalendar !== false) {
      const sharedEvents = await ctx.db
        .query("calendarEvents")
        .withIndex("by_shared", (q) => q.eq("isShared", true))
        .collect();

      const existingMatch = sharedEvents.find(
        (e) =>
          e.title.includes(args.title) ||
          (e.title.includes("인증시험") && e.eventDate === args.examDate),
      );

      const eventDesc =
        args.description?.trim() ||
        `${args.title.trim()}\n일시: ${args.examTimeDisplay}\n장소: ${args.location}\n원서 접수: ${applicationPeriod}\n대상: ${args.targetCohorts}`;

      if (existingMatch) {
        await ctx.db.patch(existingMatch._id, {
          title: args.title.trim(),
          description: eventDesc,
          eventDate: args.examDate.trim(),
          color: "#059669",
        });
      } else {
        await ctx.db.insert("calendarEvents", {
          userId: admin._id,
          title: args.title.trim(),
          description: eventDesc,
          eventDate: args.examDate.trim(),
          startTime: "10:00",
          endTime: "17:00",
          eventType: "shared",
          isShared: true,
          color: "#059669",
        });
      }
    }

    return scheduleId;
  },
});

// Admin: delete exam schedule
export const deleteExamSchedule = mutation({
  args: { scheduleId: v.id("examSchedules") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin"]);
    await ctx.db.delete(args.scheduleId);
  },
});

// Ensure the exam is registered as a shared calendar event
export const ensureExamCalendarEvent = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.auth.getUserIdentity();
    if (!user) return null;

    const existing = await ctx.db
      .query("calendarEvents")
      .withIndex("by_shared", (q) => q.eq("isShared", true))
      .collect();

    const alreadyExists = existing.some(
      (e) => e.title.includes("2026년 하반기 SMPCC") || (e.title.includes("인증시험") && e.eventDate === "2026-11-28"),
    );

    if (alreadyExists) return null;

    // Find admin user to assign creation
    const admin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    if (!admin) return null;

    return await ctx.db.insert("calendarEvents", {
      userId: admin._id,
      title: "2026년 하반기 SMPCC 인증시험 (16기, 17기 대상)",
      description: "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험\n일시: 2026년 11월 28일 (토) 10:00~17:00\n장소: MCCI 본원 대강당 및 비대면 화상 심사 병행\n원서 접수 기간: 10월 20일 ~ 11월 15일",
      eventDate: "2026-11-28",
      startTime: "10:00",
      endTime: "17:00",
      eventType: "shared",
      isShared: true,
      color: "#059669",
    });
  },
});

// Get trainee's active cohort name
export const getMyCohort = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (memberships.length === 0) return null;

    // Get latest cohort
    const latest = memberships[memberships.length - 1];
    const cohort = await ctx.db.get(latest.cohortId);
    return cohort ? { _id: cohort._id, name: cohort.name, number: cohort.number } : null;
  },
});

export const cancelApplication = mutation({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (app.userId !== user._id) throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    if (app.status !== "submitted") {
      throw new ConvexError({ message: "검토가 시작된 신청은 취소할 수 없습니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.delete(args.applicationId);
  },
});

// ── Trainee: queries ──────────────────────────────────────────────────────────

export const getMyApplications = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const apps = await ctx.db
      .query("certificationApplications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    return await Promise.all(
      apps.map(async (app) => {
        const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;
        return { ...app, reviewerName: reviewer?.name ?? null };
      }),
    );
  },
});

export const getMyRequirementStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    const goal = "SMPCC" as const;
    const req = REQUIREMENTS[goal];

    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const educationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const coachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    const progress = await calculateCoachingProgress(ctx, user._id);

    // Attendance from cohort
    const membership = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();

    let attendanceRate = 0;
    let attendedSlots = 0;
    let totalSlots = 0;
    let sessionAbsenceViolation = false;

    if (membership) {
      const stats = await calculateUserCohortAttendance(ctx, membership.cohortId, user._id, true);
      attendanceRate = stats.attendanceRate;
      attendedSlots = stats.attendedSlots;
      totalSlots = stats.total;
      sessionAbsenceViolation = stats.sessionAbsenceViolation;
    }

    const attendanceMet = attendanceRate >= 80 && !sessionAbsenceViolation;

    const bookReports = await ctx.db
      .query("bookReports")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("approvalStatus", "approved")
      )
      .collect();

    const essays = await ctx.db
      .query("coachingEssays")
      .withIndex("by_user_and_status", (q) =>
        q.eq("userId", user._id).eq("approvalStatus", "approved")
      )
      .collect();

    const bookReportCount = bookReports.length;
    const essayCount = essays.length;

    // Check official certification record
    const userCert = await ctx.db
      .query("smpccCertifications")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const hasActiveCert = Boolean(
      userCert &&
        userCert.status === "active" &&
        (!userCert.expiresAt || new Date(userCert.expiresAt) >= new Date())
    );

    // Stage 1: 수료 요건 (Completion: 출석 80% + 결석위반 없음 + 총 실습 15회 및 세부 쿼터)
    const isCompletionMet =
      attendanceMet &&
      progress.totalCount >= 15 &&
      progress.sportsCount >= 8 &&
      progress.generalCount >= 2 &&
      progress.buddyCount >= 2 &&
      progress.mentorCount >= 2 &&
      progress.svCount >= 1;

    // Stage 2: 인증 요건 (Certification: 수료 + 총 실습 20회 + 일반 7회 + 독후감 2편 + 에세이 1편)
    const isCertEligible =
      isCompletionMet &&
      progress.totalCount >= 20 &&
      progress.generalCount >= 7 &&
      bookReportCount >= 2 &&
      essayCount >= 1;

    const criteria = [
      {
        key: "attendance",
        category: "completion" as const,
        label: "세미나 출석률 (80% 이상)",
        current: attendanceRate,
        required: 80,
        unit: "%",
        met: attendanceMet,
        weight: 15,
        subLabel: sessionAbsenceViolation ? "단일 세션 전일 결석 위반" : `${attendedSlots}/${totalSlots}회차 출석`,
        href: "/attendance",
      },
      {
        key: "education",
        category: "completion" as const,
        label: "정규 교육 이수 시간",
        current: Math.round(educationHours * 10) / 10,
        required: req.education,
        unit: "시간",
        met: educationHours >= req.education,
        weight: 15,
        subLabel: `인정 누적: ${Math.round(educationHours * 10) / 10}h`,
        href: "/training-history",
      },
      {
        key: "totalCoaching",
        category: "completion" as const,
        label: "코칭 실습 건수",
        current: progress.totalCount,
        required: 20,
        unit: "회",
        met: progress.totalCount >= 20,
        weight: 15,
        subLabel: `수료 15회 (${progress.totalCount >= 15 ? "달성" : "진행중"}) · 인증 20회`,
        href: "/coaching-log",
      },
      {
        key: "sportsCoaching",
        category: "coaching" as const,
        label: "스포츠선수 코칭",
        current: progress.sportsCount,
        required: 8,
        unit: "회",
        met: progress.sportsCount >= 8,
        weight: 15,
        subLabel: "선수 대상 1:1 실습 8회 필수",
        href: "/coaching-log",
      },
      {
        key: "generalCoaching",
        category: "coaching" as const,
        label: "일반인 코칭",
        current: progress.generalCount,
        required: 7,
        unit: "회",
        met: progress.generalCount >= 7,
        weight: 10,
        subLabel: `수료 기준 2회 / 인증 기준 7회`,
        href: "/coaching-log",
      },
      {
        key: "buddyCoaching",
        category: "coaching" as const,
        label: "버디코칭 (BCP)",
        current: progress.buddyCount,
        required: 2,
        unit: "회",
        met: progress.buddyCount >= 2,
        weight: 10,
        subLabel: "동료 코치 상호 실습 2회",
        href: "/bcp",
      },
      {
        key: "mentorCoaching",
        category: "coaching" as const,
        label: "멘토코칭 (MCP)",
        current: progress.mentorCount,
        required: 2,
        unit: "회",
        met: progress.mentorCount >= 2,
        weight: 10,
        subLabel: "멘토코치 1:1 지도 2회",
        href: "/mentor-coaching",
      },
      {
        key: "supervision",
        category: "coaching" as const,
        label: "수퍼비전 (SVP)",
        current: progress.svCount,
        required: 1,
        unit: "회",
        met: progress.svCount >= 1,
        weight: 5,
        subLabel: "수퍼바이저 코칭 참관 1회",
        href: "/supervision",
      },
      {
        key: "bookReports",
        category: "assignment" as const,
        label: "도서 독후감 제출",
        current: bookReportCount,
        required: 2,
        unit: "편",
        met: bookReportCount >= 2,
        weight: 3,
        subLabel: "지정도서 독후감 2편 승인",
        href: "/submissions",
      },
      {
        key: "coachingEssay",
        category: "assignment" as const,
        label: "멘탈코칭 에세이",
        current: essayCount,
        required: 1,
        unit: "편",
        met: essayCount >= 1,
        weight: 2,
        subLabel: "코칭 성찰 에세이 1편 승인",
        href: "/submissions",
      },
    ];

    const metCount = criteria.filter((c) => c.met).length;
    const readinessPercentage = Math.round(
      criteria.reduce(
        (acc, c) => acc + Math.min(c.current / c.required, 1) * c.weight,
        0
      )
    );

    return {
      goal: "SMPCC" as const,
      educationHours: Math.round(educationHours * 10) / 10,
      coachingHours: Math.round(coachingHours * 10) / 10,
      educationRequired: req.education,
      coachingRequired: req.coaching,
      educationMet: educationHours >= req.education,
      coachingMet: coachingHours >= req.coaching,
      attendanceRate,
      attendanceMet,
      isCompletionMet,
      isCertEligible,
      hasActiveCert,
      certId: userCert?._id,
      certIssuedAt: userCert?.issuedAt,
      certExpiresAt: userCert?.expiresAt,
      allMet: metCount === criteria.length,
      criteria,
      metCount,
      totalCriteriaCount: criteria.length,
      readinessPercentage,
      stages: [
        {
          stageNumber: 1,
          name: "수료",
          status: isCompletionMet ? "completed" : "in_progress",
          label: "정규 교육 & 세미나 출석 80% 및 기본 실습 15회 충족",
        },
        {
          stageNumber: 2,
          name: "인증",
          status: isCertEligible
            ? "completed"
            : isCompletionMet
              ? "in_progress"
              : "locked",
          label: "심화 실습 20회, 독후감 2편, 에세이 1편 및 인증 기준 충족",
        },
        {
          stageNumber: 3,
          name: "SMPCC 레벨 부여",
          status: hasActiveCert
            ? "completed"
            : isCertEligible
              ? "in_progress"
              : "locked",
          label: "공인 인증시험 통과 및 MCCI-SMPCC 공식 자격증 발급",
        },
      ],
    };
  },
});

// ── Admin: queries ────────────────────────────────────────────────────────────

export const getAllApplications = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const apps = await ctx.db.query("certificationApplications").order("desc").collect();

    return await Promise.all(
      apps.map(async (app) => {
        const user = await ctx.db.get(app.userId);
        const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;
        return {
          ...app,
          userName: user?.name ?? "이름 미설정",
          userEmail: user?.email ?? "",
          reviewerName: reviewer?.name ?? null,
        };
      }),
    );
  },
});

export const getApplicationDetail = query({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) return null;

    const user = await ctx.db.get(app.userId);
    const reviewer = app.reviewedBy ? await ctx.db.get(app.reviewedBy) : null;

    // Fetch current progress for context
    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const coachingLogs = await ctx.db
      .query("coachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const mentorLogs = await ctx.db
      .query("mentorCoachingLogs")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .collect();

    const currentEducationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((s, r) => s + r.hours, 0);

    const currentCoachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((s, l) => s + l.durationMinutes, 0) / 60;

    const approvedMentorLogs = mentorLogs.filter((l) => l.approvalStatus === "approved");

    return {
      ...app,
      userName: user?.name ?? "이름 미설정",
      userEmail: user?.email ?? "",
      reviewerName: reviewer?.name ?? null,
      currentEducationHours: Math.round(currentEducationHours * 10) / 10,
      currentCoachingHours: Math.round(currentCoachingHours * 10) / 10,
      totalMentorSessions: approvedMentorLogs.length,
    };
  },
});

// ── Admin: mutations ──────────────────────────────────────────────────────────

export const setUnderReview = mutation({
  args: { applicationId: v.id("certificationApplications") },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (app.status !== "submitted") {
      throw new ConvexError({ message: "이미 검토 중이거나 처리된 신청입니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.patch(args.applicationId, {
      status: "under_review",
      reviewedBy: reviewer._id,
    });
  },
});

export const approve = mutation({
  args: {
    applicationId: v.id("certificationApplications"),
    reviewComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.patch(args.applicationId, {
      status: "approved",
      reviewedBy: reviewer._id,
      reviewedAt: new Date().toISOString(),
      reviewComment: args.reviewComment,
    });

    // Automatically create or activate official SMPCC certification record
    const existingCert = await ctx.db
      .query("smpccCertifications")
      .withIndex("by_user", (q) => q.eq("userId", app.userId))
      .first();

    const now = new Date();
    const issuedAt = now.toISOString().slice(0, 10);
    const exp = new Date(now);
    exp.setFullYear(exp.getFullYear() + 3);
    const expiresAt = exp.toISOString().slice(0, 10);

    if (!existingCert) {
      await ctx.db.insert("smpccCertifications", {
        userId: app.userId,
        issuedAt,
        expiresAt,
        status: "active",
        issuedBy: reviewer._id,
        notes: args.reviewComment || "인증시험 합격 및 자격 심사 승인",
      });
    } else if (existingCert.status !== "active") {
      await ctx.db.patch(existingCert._id, {
        status: "active",
        issuedAt,
        expiresAt,
        issuedBy: reviewer._id,
        notes: args.reviewComment || "자격 재인증 심사 승인",
      });
    }

    await insertNotification(ctx, {
      userId: app.userId,
      type: "certification_approved",
      title: `${app.certificationGoal} 자격증 신청 승인`,
      message: `${app.certificationGoal} 자격증 신청이 승인되었습니다. 축하합니다!${args.reviewComment ? ` 코멘트: ${args.reviewComment}` : ""}`,
      relatedId: args.applicationId,
    });
  },
});

export const reject = mutation({
  args: {
    applicationId: v.id("certificationApplications"),
    reviewComment: v.string(),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin", "senior_coach"]);
    const app = await ctx.db.get(args.applicationId);
    if (!app) throw new ConvexError({ message: "신청을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.patch(args.applicationId, {
      status: "rejected",
      reviewedBy: reviewer._id,
      reviewedAt: new Date().toISOString(),
      reviewComment: args.reviewComment,
    });

    await insertNotification(ctx, {
      userId: app.userId,
      type: "certification_rejected",
      title: `${app.certificationGoal} 자격증 신청 반려`,
      message: `${app.certificationGoal} 자격증 신청이 반려되었습니다. 사유: ${args.reviewComment}`,
      relatedId: args.applicationId,
    });
  },
});

// ── Admin: bulk status change ─────────────────────────────────────────────────

export const bulkUpdateStatus = mutation({
  args: {
    applicationIds: v.array(v.id("certificationApplications")),
    status: v.union(
      v.literal("under_review"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    reviewComment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requireRole(ctx, ["admin"]);
    for (const applicationId of args.applicationIds) {
      const app = await ctx.db.get(applicationId);
      if (!app) continue;
      await ctx.db.patch(applicationId, {
        status: args.status,
        reviewedBy: reviewer._id,
        reviewedAt: new Date().toISOString(),
        reviewComment: args.reviewComment,
      });
      if (args.status === "approved") {
        await insertNotification(ctx, {
          userId: app.userId,
          type: "certification_approved",
          title: `${app.certificationGoal ?? "SMPCC"} 자격증 신청 승인`,
          message: `${app.certificationGoal ?? "SMPCC"} 자격증 신청이 승인되었습니다.`,
          relatedId: applicationId,
        });
      } else if (args.status === "rejected") {
        await insertNotification(ctx, {
          userId: app.userId,
          type: "certification_rejected",
          title: `${app.certificationGoal ?? "SMPCC"} 자격증 신청 반려`,
          message: `${app.certificationGoal ?? "SMPCC"} 자격증 신청이 반려되었습니다.${args.reviewComment ? ` 사유: ${args.reviewComment}` : ""}`,
          relatedId: applicationId,
        });
      }
    }
  },
});
