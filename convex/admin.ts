import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import type { Doc } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./helpers";

// ── Dashboard stats ──────────────────────────────────────────────────────────

export const getAdminStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allUsers = await ctx.db.query("users").collect();
    const approvedTrainees = allUsers.filter(
      (u) => u.role === "trainee" && u.approvalStatus === "approved",
    );
    const pendingUsers = allUsers.filter((u) => u.approvalStatus === "pending").length;

    const pendingEducation = await ctx.db
      .query("educationRecords")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .collect();
    const pendingCoaching = await ctx.db
      .query("coachingLogs")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .collect();

    return {
      totalUsers: allUsers.length,
      pendingUsers,
      approvedTrainees: approvedTrainees.length,
      smpccTrainees: approvedTrainees.length,
      pendingEducationReviews: pendingEducation.length,
      pendingCoachingReviews: pendingCoaching.length,
      totalPendingReviews: pendingEducation.length + pendingCoaching.length,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx): Promise<(Doc<"users"> & { cohortName: string | null; cohortNumber: number | null })[]> => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return await Promise.all(
      users.map(async (u) => {
        const member = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
        if (!member) return { ...u, cohortName: null, cohortNumber: null };
        const cohort = await ctx.db.get(member.cohortId);
        return { ...u, cohortName: cohort?.name ?? null, cohortNumber: cohort?.number ?? null };
      }),
    );
  },
});

export const getPendingUsers = query({
  args: {},
  handler: async (ctx): Promise<(Doc<"users"> & { cohortName: string | null })[]> => {
    await requireAdmin(ctx);
    const users = await ctx.db
      .query("users")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
      .collect();
    return await Promise.all(
      users.map(async (u) => {
        const member = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
        if (!member) return { ...u, cohortName: null };
        const cohort = await ctx.db.get(member.cohortId);
        return { ...u, cohortName: cohort?.name ?? null };
      }),
    );
  },
});

export const approveUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.userId, {
      approvalStatus: "approved",
      rejectionReason: undefined,
    });
  },
});

export const rejectUser = mutation({
  args: {
    userId: v.id("users"),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    }
    await ctx.db.patch(args.userId, {
      approvalStatus: "rejected",
      rejectionReason: args.reason,
    });
  },
});

export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("trainee"),
      v.literal("senior_coach"),
      v.literal("admin"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

// 사용자 계정 삭제 (관련 데이터 포함)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const identity = await ctx.auth.getUserIdentity();
    const self = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity!.tokenIdentifier))
      .unique();

    if (self?._id === args.userId) {
      throw new ConvexError({ message: "자기 자신은 삭제할 수 없습니다.", code: "FORBIDDEN" });
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new ConvexError({ message: "사용자를 찾을 수 없습니다.", code: "NOT_FOUND" });
    }

    // 관련 데이터 삭제
    const coachingLogs = await ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const log of coachingLogs) await ctx.db.delete(log._id);

    const educationRecords = await ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const rec of educationRecords) await ctx.db.delete(rec._id);

    const mentorLogs = await ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const log of mentorLogs) await ctx.db.delete(log._id);

    const notifications = await ctx.db.query("notifications").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const n of notifications) await ctx.db.delete(n._id);

    const cohortMembers = await ctx.db.query("cohortMembers").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const m of cohortMembers) await ctx.db.delete(m._id);

    const reflections = await ctx.db.query("reflectionJournals").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect();
    for (const r of reflections) await ctx.db.delete(r._id);

    // 사용자 계정 삭제
    await ctx.db.delete(args.userId);
  },
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    // Get assigned coach name
    const coach = user.assignedCoachId ? await ctx.db.get(user.assignedCoachId) : null;

    // Get stats
    const [coachingLogs, mentorLogs, educationRecords, bookReports, essays, attendances] =
      await Promise.all([
        ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("bookReports").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("coachingEssays").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("attendances").filter((q) => q.eq(q.field("userId"), user._id)).collect(),
      ]);

    return {
      ...user,
      coachName: coach?.name ?? null,
      stats: {
        totalCoachingLogs: coachingLogs.length,
        approvedCoachingLogs: coachingLogs.filter((l) => l.approvalStatus === "approved").length,
        totalMentorLogs: mentorLogs.length,
        approvedMentorLogs: mentorLogs.filter((l) => l.approvalStatus === "approved").length,
        totalEducationRecords: educationRecords.length,
        bookReports: bookReports.length,
        approvedBookReports: bookReports.filter((r) => r.approvalStatus === "approved").length,
        essays: essays.length,
        approvedEssays: essays.filter((e) => e.approvalStatus === "approved").length,
        attendanceCount: attendances.filter((a) => a.status === "present" || a.status === "late").length,
      },
    };
  },
});

// ── Photo upload for admin ──────────────────────────────────────────────────────

export const generateUserAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateUserAvatar = mutation({
  args: { userId: v.id("users"), storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    await ctx.db.patch(args.userId, { avatarStorageId: args.storageId });
  },
});

export const getUserAvatarUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.storage.getUrl(args.storageId);
  },
});

// ── Coach assignment ──────────────────────────────────────────────────────────

export const getAllSeniorCoaches = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "senior_coach"))
      .collect();
  },
});

export const getApprovedTrainees = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const approvedTrainees = trainees.filter((t) => t.approvalStatus === "approved");

    return await Promise.all(
      approvedTrainees.map(async (trainee) => {
        const coach = trainee.assignedCoachId
          ? await ctx.db.get(trainee.assignedCoachId)
          : null;
        return {
          ...trainee,
          coachName: coach?.name ?? null,
          coachEmail: coach?.email ?? null,
        };
      }),
    );
  },
});

export const assignCoach = mutation({
  args: {
    traineeId: v.id("users"),
    coachId: v.optional(v.id("users")), // undefined = unassign
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee) throw new ConvexError({ message: "교육생을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (trainee.role !== "trainee") {
      throw new ConvexError({ message: "교육생만 슈퍼바이저를 배정할 수 있습니다.", code: "BAD_REQUEST" });
    }

    if (args.coachId) {
      const coach = await ctx.db.get(args.coachId);
      if (!coach || coach.role !== "senior_coach") {
        throw new ConvexError({ message: "유효한 슈퍼바이저를 선택해 주세요.", code: "BAD_REQUEST" });
      }
    }

    await ctx.db.patch(args.traineeId, { assignedCoachId: args.coachId });
  },
});

// ── Trainee full profile (admin view) ────────────────────────────────────────

export const getTraineeFullProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args): Promise<{
    user: {
      _id: string;
      name: string;
      email: string;
      phone: string | null;
      role: string;
      approvalStatus: string;
      avatarUrl: string | null;
      bio: string | null;
      specializations: string[];
      coachingStyle: string | null;
      mbti: string | null;
      joinedAt: string | null;
      coachName: string | null;
      certificationGoal: string | null;
      onboardingCompleted: boolean;
      cohortName: string | null;
    };
    stats: {
      totalCoachingLogs: number;
      approvedCoachingLogs: number;
      approvedCoachingMinutes: number;
      totalMentorLogs: number;
      approvedMentorLogs: number;
      approvedMentorMinutes: number;
      totalEducationRecords: number;
      approvedEducationHours: number;
      bookReports: number;
      approvedBookReports: number;
      essays: number;
      approvedEssays: number;
      attendanceCount: number;
      totalCheckIns: number;
      totalReflections: number;
    };
    recentCoachingLogs: {
      _id: string;
      coachingDate: string;
      topic: string;
      durationMinutes: number;
      approvalStatus: string;
      coacheeInfo: string;
    }[];
    recentEducation: {
      _id: string;
      educationName: string;
      institution: string;
      educationDate: string;
      hours: number;
      approvalStatus: string;
    }[];
    licenses: {
      _id: string;
      licenseType: string;
      otherLicenseName: string | null;
      issuedBy: string | null;
      acquiredDate: string | null;
      isActive: boolean;
    }[];
    certificationApplication: {
      _id: string;
      status: string;
      submittedAt: string;
    } | null;
  }> => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다.", code: "NOT_FOUND" });

    const coach = user.assignedCoachId ? await ctx.db.get(user.assignedCoachId) : null;
    const avatarUrl = user.avatarStorageId ? await ctx.storage.getUrl(user.avatarStorageId) : null;

    // Get cohort membership
    const cohortMember = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .first();
    const cohort = cohortMember ? await ctx.db.get(cohortMember.cohortId) : null;

    const [coachingLogs, mentorLogs, educationRecords, bookReports, essays, attendances, checkIns, reflections, licenses, certApps] =
      await Promise.all([
        ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("bookReports").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("coachingEssays").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("attendances").filter((q) => q.eq(q.field("userId"), user._id)).collect(),
        ctx.db.query("dailyCheckIns").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("reflectionJournals").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("coachLicenses").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
        ctx.db.query("certificationApplications").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ]);

    const approvedCoaching = coachingLogs.filter((l) => l.approvalStatus === "approved");
    const approvedMentor = mentorLogs.filter((l) => l.approvalStatus === "approved");
    const approvedEdu = educationRecords.filter((r) => r.approvalStatus === "approved");

    const recentCoachingLogs = [...coachingLogs]
      .sort((a, b) => b.coachingDate.localeCompare(a.coachingDate))
      .slice(0, 10)
      .map((l) => ({
        _id: l._id,
        coachingDate: l.coachingDate,
        topic: l.topic,
        durationMinutes: l.durationMinutes,
        approvalStatus: l.approvalStatus,
        coacheeInfo: l.coacheeInfo,
      }));

    const recentEducation = [...educationRecords]
      .sort((a, b) => b.educationDate.localeCompare(a.educationDate))
      .slice(0, 10)
      .map((r) => ({
        _id: r._id,
        educationName: r.educationName,
        institution: r.institution,
        educationDate: r.educationDate,
        hours: r.hours,
        approvalStatus: r.approvalStatus,
      }));

    const latestCertApp = certApps.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))[0] ?? null;

    return {
      user: {
        _id: user._id,
        name: user.name ?? "이름 미설정",
        email: user.email ?? "",
        phone: user.phone ?? null,
        role: user.role,
        approvalStatus: user.approvalStatus,
        avatarUrl,
        bio: user.bio ?? null,
        specializations: user.specializations ?? [],
        coachingStyle: user.coachingStyle ?? null,
        mbti: user.mbti ?? null,
        joinedAt: user.joinedAt ?? null,
        coachName: coach?.name ?? null,
        certificationGoal: user.certificationGoal ?? null,
        onboardingCompleted: user.onboardingCompleted,
        cohortName: cohort?.name ?? null,
      },
      stats: {
        totalCoachingLogs: coachingLogs.length,
        approvedCoachingLogs: approvedCoaching.length,
        approvedCoachingMinutes: approvedCoaching.reduce((s, l) => s + l.durationMinutes, 0),
        totalMentorLogs: mentorLogs.length,
        approvedMentorLogs: approvedMentor.length,
        approvedMentorMinutes: approvedMentor.reduce((s, l) => s + l.durationMinutes, 0),
        totalEducationRecords: educationRecords.length,
        approvedEducationHours: approvedEdu.reduce((s, r) => s + r.hours, 0),
        bookReports: bookReports.length,
        approvedBookReports: bookReports.filter((r) => r.approvalStatus === "approved").length,
        essays: essays.length,
        approvedEssays: essays.filter((e) => e.approvalStatus === "approved").length,
        attendanceCount: attendances.filter((a) => a.status === "present" || a.status === "late").length,
        totalCheckIns: checkIns.length,
        totalReflections: reflections.length,
      },
      recentCoachingLogs,
      recentEducation,
      licenses: licenses.map((l) => ({
        _id: l._id,
        licenseType: l.licenseType,
        otherLicenseName: l.otherLicenseName ?? null,
        issuedBy: l.issuedBy ?? null,
        acquiredDate: l.acquiredDate ?? null,
        isActive: l.isActive,
      })),
      certificationApplication: latestCertApp
        ? { _id: latestCertApp._id, status: latestCertApp.status, submittedAt: latestCertApp.submittedAt }
        : null,
    };
  },
});

// ── Senior coach: view assigned trainees ──────────────────────────────────────

export const getMyAssignedTrainees = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    if (me.role !== "senior_coach" && me.role !== "admin") {
      throw new ConvexError({ message: "슈퍼바이저 권한이 필요합니다.", code: "FORBIDDEN" });
    }

    const allUsers = await ctx.db.query("users").collect();
    const trainees = allUsers.filter(
      (u) => u.role === "trainee" && u.approvalStatus === "approved" && u.assignedCoachId === me._id,
    );

    // Attach counts of pending records for quick overview
    return await Promise.all(
      trainees.map(async (trainee) => {
        const [eduPending, coachPending, mentorPending] = await Promise.all([
          ctx.db
            .query("educationRecords")
            .withIndex("by_user_and_status", (q) =>
              q.eq("userId", trainee._id).eq("approvalStatus", "pending"),
            )
            .collect(),
          ctx.db
            .query("coachingLogs")
            .withIndex("by_user_and_status", (q) =>
              q.eq("userId", trainee._id).eq("approvalStatus", "pending"),
            )
            .collect(),
          ctx.db
            .query("mentorCoachingLogs")
            .withIndex("by_user_and_status", (q) =>
              q.eq("userId", trainee._id).eq("approvalStatus", "pending"),
            )
            .collect(),
        ]);
        return {
          ...trainee,
          pendingReviewCount: eduPending.length + coachPending.length + mentorPending.length,
        };
      }),
    );
  },
});

// ── Cohort-based user management ────────────────────────────────────────────

export const getCohortMembersWithStats = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args): Promise<{
    _id: string;
    memberId: string;
    memberStatus: string;
    joinedAt: string;
    name: string;
    email: string;
    phone: string | null;
    approvalStatus: string;
    userId: string;
    coachingHours: number;
    approvedCoachingLogs: number;
    totalCoachingLogs: number;
    supervisorName: string | null;
  }[]> => {
    await requireAdmin(ctx);
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const coachingLogs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", m.userId))
          .collect();
        const approved = coachingLogs.filter((l) => l.approvalStatus === "approved");
        const approvedMinutes = approved.reduce((s, l) => s + l.durationMinutes, 0);

        const supervisor = user?.assignedCoachId ? await ctx.db.get(user.assignedCoachId) : null;

        return {
          _id: m._id,
          memberId: m._id,
          memberStatus: m.status,
          joinedAt: m.joinedAt,
          name: user?.name ?? "이름 미설정",
          email: user?.email ?? "",
          phone: user?.phone ?? null,
          approvalStatus: user?.approvalStatus ?? "pending",
          userId: m.userId,
          coachingHours: Math.round((approvedMinutes / 60) * 10) / 10,
          approvedCoachingLogs: approved.length,
          totalCoachingLogs: coachingLogs.length,
          supervisorName: supervisor?.name ?? null,
        };
      })
    );
  },
});

// ── 프로필 미완성 사용자 조회 ──────────────────────────────────────────────────

export const getIncompleteProfileUsers = query({
  args: {},
  handler: async (ctx): Promise<{ _id: string; name: string | null; email: string | null; missingFields: string[] }[]> => {
    await requireAdmin(ctx);
    const users = await ctx.db
      .query("users")
      .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "approved"))
      .collect();

    return users
      .filter((u) => u.role === "trainee")
      .map((u) => {
        const missingFields: string[] = [];
        if (!u.phone) missingFields.push("전화번호");
        if (!u.avatarStorageId) missingFields.push("프로필 사진");
        return { _id: u._id, name: u.name ?? null, email: u.email ?? null, missingFields };
      })
      .filter((u) => u.missingFields.length > 0);
  },
});

// ── 프로필 완성 독려 알림 발송 ──────────────────────────────────────────────────

export const sendProfileIncompleteNotification = mutation({
  args: {
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args): Promise<{ sent: number }> => {
    await requireAdmin(ctx);

    let sent = 0;
    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user) continue;

      // 미완성 항목 확인
      const missingFields: string[] = [];
      if (!user.phone) missingFields.push("전화번호");
      if (!user.avatarStorageId) missingFields.push("프로필 사진");
      if (missingFields.length === 0) continue;

      // 중복 알림 방지: 최근 24시간 이내 같은 타입 알림이 있으면 건너뜀
      const recentNotification = await ctx.db
        .query("notifications")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .order("desc")
        .first();

      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      if (
        recentNotification &&
        recentNotification.type === "profile_incomplete" &&
        recentNotification._creationTime > oneDayAgo
      ) {
        continue;
      }

      await ctx.db.insert("notifications", {
        userId,
        type: "profile_incomplete",
        title: "프로필을 완성해 주세요",
        message: `${missingFields.join(", ")}이(가) 아직 입력되지 않았습니다. 프로필을 완성하면 코칭 활동이 더욱 원활해집니다.`,
        isRead: false,
        relatedId: userId,
      });
      sent++;
    }

    return { sent };
  },
});
