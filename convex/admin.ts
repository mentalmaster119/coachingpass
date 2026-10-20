import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import type { Doc, Id } from "./_generated/dataModel.d.ts";
import { requireAdmin } from "./helpers";
import { hashPassword } from "./authUtils";
import { calculateUserEducation } from "./educationCalculator";
import { calculateCoachingProgress } from "./completion";
import { calculateUserCohortAttendance } from "./attendance";

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

// ── Cohort-Centric Admin Dashboard Data ───────────────────────────────────────
export const getCohortDashboardData = query({
  args: {
    cohortId: v.optional(v.union(v.id("cohorts"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    // 1. Fetch all cohorts
    const allCohorts = await ctx.db.query("cohorts").collect();

    // Enrich cohorts with member counts
    const cohortsWithCounts = await Promise.all(
      allCohorts.map(async (c) => {
        const members = await ctx.db
          .query("cohortMembers")
          .withIndex("by_cohort", (q) => q.eq("cohortId", c._id))
          .collect();
        return {
          _id: c._id,
          name: c.name,
          number: c.number,
          term: c.term,
          startDate: c.startDate,
          endDate: c.endDate,
          status: c.status,
          description: c.description ?? "",
          memberCount: members.length,
          activeMemberCount: members.filter((m) => m.status === "active").length,
        };
      }),
    );

    // Sort: active first (number desc), then upcoming, then completed
    const statusOrder: Record<string, number> = { active: 0, upcoming: 1, completed: 2 };
    cohortsWithCounts.sort((a, b) => {
      const sDiff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (sDiff !== 0) return sDiff;
      return b.number - a.number;
    });

    // 2. Identify the active in-progress cohort (e.g., 18기)
    const currentActiveCohort =
      cohortsWithCounts.find((c) => c.status === "active") ||
      cohortsWithCounts[0] ||
      null;

    // 3. Resolve target cohort
    const isAllMode = args.cohortId === "all";
    let targetCohort = currentActiveCohort;
    if (args.cohortId && args.cohortId !== "all") {
      const found = cohortsWithCounts.find((c) => c._id === args.cohortId);
      if (found) targetCohort = found;
    }

    // 4. Global system users
    const allUsers = await ctx.db.query("users").collect();
    const allApprovedTrainees = allUsers.filter(
      (u) => u.role === "trainee" && u.approvalStatus === "approved",
    );
    const globalPendingUsers = allUsers.filter((u) => u.approvalStatus === "pending").length;

    // If 'ALL' mode or no cohorts found:
    if (isAllMode || !targetCohort) {
      const pendingEducation = await ctx.db
        .query("educationRecords")
        .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
        .collect();
      const pendingCoaching = await ctx.db
        .query("coachingLogs")
        .withIndex("by_approval_status", (q) => q.eq("approvalStatus", "pending"))
        .collect();

      const allTraineesProgress = await Promise.all(
        allApprovedTrainees.map(async (trainee) => {
          const eduCalc = await calculateUserEducation(ctx, trainee._id);
          const coachingProgress = await calculateCoachingProgress(ctx, trainee._id);
          const educationTarget = 60;
          const coachingTarget = 100;
          const educationPct = Math.min((eduCalc.approvedEducationHours / educationTarget) * 100, 100);
          const coachingPct = Math.min((coachingProgress.coachingHours / coachingTarget) * 100, 100);
          const overallPct = Math.round((educationPct + coachingPct) / 2);

          const member = await ctx.db
            .query("cohortMembers")
            .withIndex("by_user", (q) => q.eq("userId", trainee._id))
            .first();
          const cohort = member ? await ctx.db.get(member.cohortId) : null;

          return {
            _id: trainee._id,
            name: trainee.name ?? "이름 미설정",
            email: trainee.email ?? "",
            avatarUrl: trainee.avatarStorageId
              ? await ctx.storage.getUrl(trainee.avatarStorageId)
              : null,
            cohortName: cohort?.name ?? "기수 미정",
            cohortId: cohort?._id ?? null,
            certificationGoal: (trainee.certificationGoal || "SMPCC") as string,
            approvedEducationHours: eduCalc.approvedEducationHours,
            approvedCoachingHours: Math.round(coachingProgress.coachingHours * 10) / 10,
            educationTarget,
            coachingTarget,
            overallPct,
            educationPendingCount: eduCalc.educationPendingCount,
            coachingPendingCount: coachingProgress.totalCount ?? 0,
            attendanceRate: 0,
            coachName: trainee.assignedCoachId
              ? (await ctx.db.get(trainee.assignedCoachId))?.name ?? null
              : null,
          };
        }),
      );

      const totalCoachingHours = allTraineesProgress.reduce((s, t) => s + t.approvedCoachingHours, 0);

      return {
        cohorts: cohortsWithCounts,
        currentActiveCohort,
        selectedCohort: null,
        isAllMode: true,
        kpis: {
          totalUsers: allUsers.length,
          approvedTrainees: allApprovedTrainees.length,
          pendingUsers: globalPendingUsers,
          pendingEducation: pendingEducation.length,
          pendingCoaching: pendingCoaching.length,
          totalPending: pendingEducation.length + pendingCoaching.length,
          totalCoachingHours: Math.round(totalCoachingHours * 10) / 10,
          averageCoachingHours:
            allTraineesProgress.length > 0
              ? Math.round((totalCoachingHours / allTraineesProgress.length) * 10) / 10
              : 0,
          totalCoachingLogs: 0,
          seminarCount: 0,
          averageAttendanceRate: 0,
        },
        trainees: allTraineesProgress.sort((a, b) => b.overallPct - a.overallPct),
        seminars: [],
        coachingGroups: [],
      };
    }

    // 5. CURRENT IN-PROGRESS COHORT (e.g. 18기) CENTRIC DATA
    const cohortMembers = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", targetCohort._id))
      .collect();

    const memberUserIds = cohortMembers.map((m) => m.userId);

    // Get trainee users in this cohort
    const cohortTrainees: Doc<"users">[] = [];
    for (const userId of memberUserIds) {
      const u = await ctx.db.get(userId);
      if (u && u.role === "trainee" && u.approvalStatus === "approved") {
        cohortTrainees.push(u);
      }
    }

    // Seminars for this cohort
    const seminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort", (q) => q.eq("cohortId", targetCohort._id))
      .collect();
    seminars.sort((a, b) => (a.sessionNumber ?? 0) - (b.sessionNumber ?? 0));

    // Coaching groups for this cohort (조 편성)
    const groups = await ctx.db
      .query("coachingGroups")
      .withIndex("by_cohort", (q) => q.eq("cohortId", targetCohort._id))
      .collect();

    // Group info with member names
    const enrichedGroups = await Promise.all(
      groups.map(async (g) => {
        const memberUsers = await Promise.all(g.memberIds.map((id) => ctx.db.get(id)));
        return {
          _id: g._id,
          groupName: g.groupName,
          groupNumber: g.groupNumber,
          memberCount: g.memberIds.length,
          memberNames: memberUsers.map((u) => u?.name ?? "미설정"),
        };
      }),
    );

    // Calculate progress for each trainee in this cohort
    let cohortApprovedCoachingMinutes = 0;
    let cohortTotalCoachingLogs = 0;
    let cohortPendingEducation = 0;
    let cohortPendingCoaching = 0;
    let totalAttendanceSum = 0;
    let traineesWithAttendanceCount = 0;

    const traineesProgress = await Promise.all(
      cohortTrainees.map(async (trainee) => {
        const eduCalc = await calculateUserEducation(ctx, trainee._id);
        const coachingProgress = await calculateCoachingProgress(ctx, trainee._id);

        let attendanceRate = 0;
        try {
          const attendanceStats = await calculateUserCohortAttendance(
            ctx,
            targetCohort._id,
            trainee._id,
          );
          if (attendanceStats && typeof attendanceStats.attendanceRate === "number") {
            attendanceRate = attendanceStats.attendanceRate;
            totalAttendanceSum += attendanceRate;
            traineesWithAttendanceCount++;
          }
        } catch {
          attendanceRate = 0;
        }

        // Pending counts for this user
        const userCoachingLogs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", trainee._id))
          .collect();
        const pendingCoachLogs = userCoachingLogs.filter(
          (l) => l.approvalStatus === "pending",
        ).length;

        cohortApprovedCoachingMinutes += coachingProgress.approvedCoachingMinutes;
        cohortTotalCoachingLogs += userCoachingLogs.length;
        cohortPendingEducation += eduCalc.educationPendingCount;
        cohortPendingCoaching += pendingCoachLogs;

        const educationTarget = 60;
        const coachingTarget = 100;
        const educationPct = Math.min(
          (eduCalc.approvedEducationHours / educationTarget) * 100,
          100,
        );
        const coachingPct = Math.min(
          (coachingProgress.coachingHours / coachingTarget) * 100,
          100,
        );
        const overallPct = Math.round((educationPct + coachingPct) / 2);

        return {
          _id: trainee._id,
          name: trainee.name ?? "이름 미설정",
          email: trainee.email ?? "",
          avatarUrl: trainee.avatarStorageId
            ? await ctx.storage.getUrl(trainee.avatarStorageId)
            : null,
          cohortName: targetCohort.name,
          cohortId: targetCohort._id,
          certificationGoal: (trainee.certificationGoal || "SMPCC") as string,
          approvedEducationHours: eduCalc.approvedEducationHours,
          approvedCoachingHours: Math.round(coachingProgress.coachingHours * 10) / 10,
          educationTarget,
          coachingTarget,
          overallPct,
          educationPendingCount: eduCalc.educationPendingCount,
          coachingPendingCount: pendingCoachLogs,
          attendanceRate,
          coachName: trainee.assignedCoachId
            ? (await ctx.db.get(trainee.assignedCoachId))?.name ?? null
            : null,
        };
      }),
    );

    const totalCoachingHours =
      Math.round((cohortApprovedCoachingMinutes / 60) * 10) / 10;
    const averageCoachingHours =
      cohortTrainees.length > 0
        ? Math.round((totalCoachingHours / cohortTrainees.length) * 10) / 10
        : 0;
    const averageAttendanceRate =
      traineesWithAttendanceCount > 0
        ? Math.round(totalAttendanceSum / traineesWithAttendanceCount)
        : 0;

    return {
      cohorts: cohortsWithCounts,
      currentActiveCohort,
      selectedCohort: targetCohort,
      isAllMode: false,
      kpis: {
        totalUsers: allUsers.length,
        approvedTrainees: cohortTrainees.length, // Trainees in this cohort!
        pendingUsers: globalPendingUsers,
        pendingEducation: cohortPendingEducation,
        pendingCoaching: cohortPendingCoaching,
        totalPending: cohortPendingEducation + cohortPendingCoaching,
        totalCoachingHours,
        averageCoachingHours,
        totalCoachingLogs: cohortTotalCoachingLogs,
        seminarCount: seminars.length,
        averageAttendanceRate,
      },
      trainees: traineesProgress.sort((a, b) => b.overallPct - a.overallPct),
      seminars: seminars.map((s) => ({
        _id: s._id,
        sessionNumber: s.sessionNumber,
        title: s.title,
        seminarType: s.seminarType,
        startDate: s.startDate,
        endDate: s.endDate,
        location: s.location ?? null,
        isOnline: s.isOnline ?? false,
      })),
      coachingGroups: enrichedGroups,
    };
  },
});

export const getAllUsers = query({
  args: {},
  handler: async (ctx): Promise<(Doc<"users"> & { cohortId: Id<"cohorts"> | null; cohortName: string | null; cohortNumber: number | null })[]> => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return await Promise.all(
      users.map(async (u) => {
        const member = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
        if (!member) return { ...u, cohortId: null, cohortName: null, cohortNumber: null };
        const cohort = await ctx.db.get(member.cohortId);
        return { ...u, cohortId: member.cohortId, cohortName: cohort?.name ?? null, cohortNumber: cohort?.number ?? null };
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
      v.literal("admin3"),
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { role: args.role });
  },
});

export const toggleMentorCoach = mutation({
  args: {
    userId: v.id("users"),
    isMentorCoach: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.userId, { isMentorCoach: args.isMentorCoach });
  },
});

// 사용자 비밀번호 초기화
export const resetUserPassword = mutation({
  args: {
    userId: v.id("users"),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.newPassword.length < 4) {
      throw new ConvexError({
        message: "비밀번호는 최소 4자리 이상이어야 합니다.",
        code: "BAD_REQUEST",
      });
    }
    const passwordHash = await hashPassword(args.newPassword);
    await ctx.db.patch(args.userId, { passwordHash });
  },
});

// 관리자: 사용자 이름 변경
export const updateUserName = mutation({
  args: {
    userId: v.id("users"),
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const trimmed = args.name.trim();
    if (!trimmed) {
      throw new ConvexError({
        message: "이름을 입력해 주세요.",
        code: "BAD_REQUEST",
      });
    }
    await ctx.db.patch(args.userId, { name: trimmed });
    return { success: true };
  },
});

// 관리자: joosksoon@daum.net 사용자 이름을 '주승규'로 변경 (일회성 마이그레이션)
export const updateJoosksoonToJuSeungGyu = mutation({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    const matched = allUsers.filter(
      (u) =>
        u.email?.toLowerCase().trim() === "joosksoon@daum.net".toLowerCase() ||
        (u.name === "User" && u.email?.toLowerCase().includes("joosksoon")),
    );

    if (matched.length === 0) {
      return {
        success: false,
        message: "joosksoon@daum.net 사용자를 찾을 수 없습니다.",
      };
    }

    const updated = [];
    for (const u of matched) {
      await ctx.db.patch(u._id, { name: "주승규" });
      updated.push({
        id: u._id,
        email: u.email,
        oldName: u.name,
        newName: "주승규",
      });
    }

    return {
      success: true,
      updatedCount: updated.length,
      users: updated,
    };
  },
});

export const getJoosksoonInfo = query({
  args: {},
  handler: async (ctx) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), "joosksoon@daum.net"))
      .first();
    if (!user) return null;
    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const cohorts = await Promise.all(memberships.map((m) => ctx.db.get(m.cohortId)));
    return {
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        approvalStatus: user.approvalStatus,
        cohorts: cohorts.map((c) => ({ id: c?._id, name: c?.name })),
      },
    };
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

    // Get assigned coach names
    const coachIds = [
      user.assignedCoachId,
      user.assignedCoachId2,
      user.assignedCoachId3,
      user.assignedCoachId4,
      user.assignedCoachId5
    ];
    const coaches = await Promise.all(
      coachIds.map(async (id) => id ? await ctx.db.get(id) : null)
    );

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
      coachName: coaches[0]?.name ?? null,
      coachName2: coaches[1]?.name ?? null,
      coachNames: coaches.map((c) => c?.name ?? null),
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
        const coachIds = [
          trainee.assignedCoachId,
          trainee.assignedCoachId2,
          trainee.assignedCoachId3,
          trainee.assignedCoachId4,
          trainee.assignedCoachId5
        ];
        const coaches = await Promise.all(
          coachIds.map(async (id) => id ? await ctx.db.get(id) : null)
        );
        let maxMentorsLimit = 4;
        const membership = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", trainee._id))
          .first();
        if (membership) {
          const cohort = await ctx.db.get(membership.cohortId);
          if (cohort && cohort.maxMentors !== undefined && cohort.maxMentors !== 2) {
            maxMentorsLimit = Math.max(1, Math.min(5, cohort.maxMentors));
          } else {
            maxMentorsLimit = 4;
          }
        }

        return {
          ...trainee,
          coachName: coaches[0]?.name ?? null,
          coachEmail: coaches[0]?.email ?? null,
          coachName2: coaches[1]?.name ?? null,
          coachEmail2: coaches[1]?.email ?? null,
          coachNames: coaches.map((c) => c?.name ?? null),
          coachEmails: coaches.map((c) => c?.email ?? null),
          maxMentorsLimit,
        };
      }),
    );
  },
});

export const assignCoach = mutation({
  args: {
    traineeId: v.id("users"),
    coachId: v.optional(v.id("users")), // undefined = unassign
    slot: v.optional(v.union(
      v.literal("first"),
      v.literal("second"),
      v.literal("third"),
      v.literal("fourth"),
      v.literal("fifth")
    )), // "first" to "fifth"
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const trainee = await ctx.db.get(args.traineeId);
    if (!trainee) throw new ConvexError({ message: "교육생을 찾을 수 없습니다.", code: "NOT_FOUND" });
    if (trainee.role !== "trainee") {
      throw new ConvexError({ message: "교육생만 수퍼바이저를 배정할 수 있습니다.", code: "BAD_REQUEST" });
    }

    if (args.coachId) {
      const coach = await ctx.db.get(args.coachId);
      if (!coach || coach.role !== "senior_coach") {
        throw new ConvexError({ message: "유효한 수퍼바이저를 선택해 주세요.", code: "BAD_REQUEST" });
      }
    }

    const fieldMap = {
      first: "assignedCoachId",
      second: "assignedCoachId2",
      third: "assignedCoachId3",
      fourth: "assignedCoachId4",
      fifth: "assignedCoachId5",
    } as const;
    const field = fieldMap[args.slot ?? "first"];
    await ctx.db.patch(args.traineeId, { [field]: args.coachId });
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
      hasMentalCoachLicense: boolean | null;
      isMentorCoach: boolean | null;
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

    const [coachingLogs, mentorLogs, educationRecords, bookReports, essays, attendances, checkIns, reflections, licenses, certApps, bcpLogs] =
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
        ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ]);

    const coachingProgress = await calculateCoachingProgress(ctx, user._id);
    const approvedMentor = mentorLogs.filter((l) => l.approvalStatus === "approved");
    const eduCalc = await calculateUserEducation(ctx, user._id);
    const approvedEducationHours = eduCalc.approvedEducationHours;

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
        hasMentalCoachLicense: user.hasMentalCoachLicense ?? null,
        isMentorCoach: user.isMentorCoach ?? null,
      },
      stats: {
        totalCoachingLogs: coachingLogs.length + bcpLogs.length + mentorLogs.length,
        approvedCoachingLogs: coachingProgress.totalCount,
        approvedCoachingMinutes: coachingProgress.approvedCoachingMinutes,
        totalMentorLogs: mentorLogs.length,
        approvedMentorLogs: approvedMentor.length,
        approvedMentorMinutes: approvedMentor.reduce((s, l) => s + l.durationMinutes, 0),
        totalEducationRecords: educationRecords.length,
        approvedEducationHours: approvedEducationHours,
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
      throw new ConvexError({ message: "수퍼바이저 권한이 필요합니다.", code: "FORBIDDEN" });
    }

    const allUsers = await ctx.db.query("users").collect();
    const trainees = allUsers.filter(
      (u) =>
        u.role === "trainee" &&
        u.approvalStatus === "approved" &&
        (u.assignedCoachId === me._id || u.assignedCoachId2 === me._id),
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
    isCompleted?: boolean;
    attendanceRate?: number;
  }[]> => {
    await requireAdmin(ctx);
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    return await Promise.all(
      members.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const [coachingLogs, bcpLogs, mentorLogs] = await Promise.all([
          ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", m.userId)).collect(),
          ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", m.userId)).collect(),
          ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", m.userId)).collect(),
        ]);
        const totalCoachingLogs = coachingLogs.length + bcpLogs.length + mentorLogs.length;

        const progress = await calculateCoachingProgress(ctx, m.userId);

        const supervisor = user?.assignedCoachId ? await ctx.db.get(user.assignedCoachId) : null;

        // Calculate attendance & completion for consistency with completion management
        const attendanceStats = await calculateUserCohortAttendance(ctx, args.cohortId, m.userId, true);
        const attendanceOk = attendanceStats.attendanceRate >= 80 && !attendanceStats.sessionAbsenceViolation;
        const coachingOk =
          progress.buddyCount >= 2 &&
          progress.mentorCount >= 2 &&
          progress.svCount >= 1 &&
          progress.sportsCount >= 8 &&
          progress.generalCount >= 2 &&
          progress.totalCount >= 15;
        const isCompleted = coachingOk && attendanceOk;

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
          coachingHours: progress.coachingHours,
          approvedCoachingLogs: progress.totalCount,
          totalCoachingLogs,
          supervisorName: supervisor?.name ?? null,
          isCompleted,
          attendanceRate: attendanceStats.attendanceRate,
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
