import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { getAuthenticatedUser } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";

// Update daily check-in reminder preferences
export const updateReminderSettings = mutation({
  args: {
    checkInReminderEnabled: v.boolean(),
    checkInReminderHourUTC: v.number(),
    reflectionReminderEnabled: v.boolean(),
    coachingLogReminderEnabled: v.boolean(),
  },
  handler: async (ctx, args): Promise<void> => {
    const user = await getAuthenticatedUser(ctx);
    await ctx.db.patch(user._id, {
      checkInReminderEnabled: args.checkInReminderEnabled,
      checkInReminderHourUTC: args.checkInReminderHourUTC,
      reflectionReminderEnabled: args.reflectionReminderEnabled,
      coachingLogReminderEnabled: args.coachingLogReminderEnabled,
    });
  },
});

// Called automatically by UpdateCurrentUserProvider on every login
export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "User not logged in",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();

    if (user !== null) {
      // Update name/email in case they changed.
      // Prioritize the existing database name/email if set, to prevent OAuth name from overriding custom name updates.
      await ctx.db.patch(user._id, {
        name: user.name || identity.name?.trim(),
        email: user.email || identity.email?.trim(),
      });

      // Clean up any test records mentioning "홍길동" for Sunju Park
      if (user.name?.includes("선주") || user.name?.includes("Sunju")) {
        const cLogs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const log of cLogs) {
          if (
            log.coacheeInfo?.includes("홍길동") ||
            log.topic?.includes("홍길동") ||
            log.summary?.includes("홍길동")
          ) {
            await ctx.db.delete(log._id);
          }
        }

        const bLogs = await ctx.db
          .query("bcpLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const log of bLogs) {
          if (
            log.topic?.includes("홍길동") ||
            log.content?.includes("홍길동")
          ) {
            await ctx.db.delete(log._id);
          }
        }

        const mLogs = await ctx.db
          .query("mentorCoachingLogs")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        for (const log of mLogs) {
          if (
            log.topic?.includes("홍길동") ||
            log.content?.includes("홍길동")
          ) {
            await ctx.db.delete(log._id);
          }
        }
      }

      return user._id;
    }

    // New user: first user in system becomes admin, others become trainees
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    const isFirstUser = existingAdmin === null;

    const newUserId = await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      tokenIdentifier: identity.tokenIdentifier,
      role: isFirstUser ? "admin" : "trainee",
      approvalStatus: isFirstUser ? "approved" : "pending",
      onboardingCompleted: isFirstUser,
    });

    if (!isFirstUser) {
      // Find all admins
      const admins = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", "admin"))
        .collect();

      const userName = identity.name || identity.email || "새로운 교육생";

      for (const admin of admins) {
        await ctx.db.insert("notifications", {
          userId: admin._id,
          type: "account_pending",
          title: "가입 승인 대기",
          message: `${userName}님이 가입 승인을 요청했습니다.`,
          isRead: false,
          relatedId: newUserId,
        });
      }
    }

    return newUserId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export const setCertificationGoal = mutation({
  args: {},
  handler: async (ctx) => {
    const user = await getAuthenticatedUser(ctx);
    await ctx.db.patch(user._id, {
      onboardingCompleted: true,
    });
  },
});

export const updateProfile = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await ctx.db.patch(user._id, { name: args.name });
  },
});

// ── Profile & Portfolio ────────────────────────────────────────────────────

export const updateDetailedProfile = mutation({
  args: {
    name: v.string(),
    bio: v.optional(v.string()),
    phone: v.optional(v.string()),
    specializations: v.optional(v.array(v.string())),
    coachingStyle: v.optional(v.string()),
    mbti: v.optional(v.string()),
    motivationalMessage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await ctx.db.patch(user._id, {
      name: args.name,
      bio: args.bio,
      phone: args.phone,
      specializations: args.specializations,
      coachingStyle: args.coachingStyle,
      mbti: args.mbti,
      motivationalMessage: args.motivationalMessage,
    });
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    await getAuthenticatedUser(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateAvatar = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);
    await ctx.db.patch(user._id, { avatarStorageId: args.storageId });
  },
});

export const getMyPortfolio = query({
  args: {},
  handler: async (ctx): Promise<{
    user: {
      _id: Id<"users">;
      name: string;
      email: string;
      role: string;
      certificationGoal: string | null;
      bio: string | null;
      phone: string | null;
      specializations: string[];
      coachingStyle: string | null;
      avatarUrl: string | null;
      joinedAt: string | null;
      mbti: string | null;
      motivationalMessage: string | null;
    };
    stats: {
      approvedEducationHours: number;
      approvedCoachingHours: number;
      approvedMentorCoachingHours: number;
      totalReflections: number;
      totalCoachingLogs: number;
      totalEducationRecords: number;
    };
    recentActivity: {
      type: string;
      date: string;
      title: string;
      hours: number;
      status: string;
    }[];
    educationTarget: number;
    coachingTarget: number;
  }> => {
    const user = await getAuthenticatedUser(ctx);

    const [educationRecords, coachingLogs, mentorLogs, reflections] = await Promise.all([
      ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
      ctx.db.query("reflectionJournals").withIndex("by_user", (q) => q.eq("userId", user._id)).collect(),
    ]);

    const approvedEducationHours = educationRecords
      .filter((r) => r.approvalStatus === "approved")
      .reduce((sum, r) => sum + r.hours, 0);

    const approvedCoachingHours =
      coachingLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;

    const approvedMentorCoachingHours =
      mentorLogs
        .filter((l) => l.approvalStatus === "approved")
        .reduce((sum, l) => sum + l.durationMinutes, 0) / 60;

    const educationTarget = 60;
    const coachingTarget = 100;

    // Avatar URL
    const avatarUrl = user.avatarStorageId
      ? await ctx.storage.getUrl(user.avatarStorageId)
      : null;

    // Recent combined activity
    const recentActivity = [
      ...educationRecords.map((r) => ({
        type: "education",
        date: r.educationDate,
        title: r.educationName,
        hours: r.hours,
        status: r.approvalStatus,
      })),
      ...coachingLogs.map((l) => ({
        type: "coaching",
        date: l.coachingDate,
        title: l.topic,
        hours: Math.round((l.durationMinutes / 60) * 10) / 10,
        status: l.approvalStatus,
      })),
      ...mentorLogs.map((l) => ({
        type: "mentor_coaching",
        date: l.sessionDate,
        title: l.topic,
        hours: Math.round((l.durationMinutes / 60) * 10) / 10,
        status: l.approvalStatus,
      })),
    ]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 15);

    return {
      user: {
        _id: user._id,
        name: user.name ?? "이름 미설정",
        email: user.email ?? "",
        role: user.role,
        certificationGoal: "SMPCC",
        bio: user.bio ?? null,
        phone: user.phone ?? null,
        specializations: user.specializations ?? [],
        coachingStyle: user.coachingStyle ?? null,
        avatarUrl,
        joinedAt: user.joinedAt ?? null,
        mbti: user.mbti ?? null,
        motivationalMessage: user.motivationalMessage ?? null,
      },
      stats: {
        approvedEducationHours: Math.round(approvedEducationHours * 10) / 10,
        approvedCoachingHours: Math.round(approvedCoachingHours * 10) / 10,
        approvedMentorCoachingHours: Math.round(approvedMentorCoachingHours * 10) / 10,
        totalReflections: reflections.length,
        totalCoachingLogs: coachingLogs.length,
        totalEducationRecords: educationRecords.length,
      },
      recentActivity,
      educationTarget,
      coachingTarget,
    };
  },
});

export const getRealUser = query({
  args: {},
  handler: async (ctx) => {
    const anyCtx = ctx as any;
    anyCtx.skipMockAuth = true;
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier),
      )
      .unique();
  },
});

export const getMockUserByRole = query({
  args: { role: v.union(v.literal("trainee"), v.literal("senior_coach"), v.literal("admin")) },
  handler: async (ctx, args) => {
    if (args.role === "trainee") {
      const u = await ctx.db
        .query("users")
        .collect()
        .then((users) =>
          users.find(
            (user) =>
              user.role === "trainee" &&
              (user.email === "mentalcoach119@naver.com" ||
                user.name?.toLowerCase().includes("chul") ||
                user.name?.toLowerCase().includes("park") ||
                user.name?.includes("철수"))
          )
        );
      if (u) return u;
    } else    if (args.role === "senior_coach") {
      const u = await ctx.db
        .query("users")
        .collect()
        .then((users) =>
          users.find(
            (user) =>
              user.role === "senior_coach" &&
              (user.email === "preview_coach@mcci.com" ||
                user.email?.toLowerCase().includes("mentalcoach119"))
          )
        );
      if (u) return u;
    }
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .first();
  },
});

export const setActiveMockUser = mutation({
  args: { role: v.union(v.literal("admin"), v.literal("admin3"), v.literal("senior_coach"), v.literal("trainee")) },
  handler: async (ctx, args) => {
    (ctx as any).skipMockAuth = true;
    const realUser = await getAuthenticatedUser(ctx);

    if (realUser.role !== "admin" && realUser.role !== "admin3") {
      throw new ConvexError({ message: "Only admins can change preview role", code: "FORBIDDEN" });
    }

    if (args.role === "admin" || args.role === "admin3") {
      await ctx.db.patch(realUser._id, { activeMockRole: undefined, activeMockTraineeId: undefined });
    } else {
      let activeMockTraineeId: any = undefined;
      if (args.role === "trainee") {
        // Find or create virtual preview trainee
        let virtualTrainee = await ctx.db
          .query("users")
          .collect()
          .then((users) => users.find((u) => u.email === "mentalcoach119@naver.com"));

        if (!virtualTrainee) {
          const traineeId = await ctx.db.insert("users", {
            tokenIdentifier: "mentalcoach119-naver-token",
            name: "교육생 테스터",
            email: "mentalcoach119@naver.com",
            role: "trainee",
            approvalStatus: "approved",
            onboardingCompleted: true,
            phone: "010-0000-0000",
            bio: "교육생 모드 미리보기용 테스터 계정입니다.",
            isMockActive: true,
          });

          // Find another trainee to act as buddyId1 fallback
          const otherTrainees = await ctx.db
            .query("users")
            .withIndex("by_role", (q) => q.eq("role", "trainee"))
            .collect();
          const otherTraine = otherTrainees.find((u) => u._id !== traineeId);
          const partnerId = otherTraine ? otherTraine._id : realUser._id;

          // Seed coaching logs
          await ctx.db.insert("coachingLogs", {
            userId: traineeId,
            coachingDate: "2026-07-10",
            coachingStartTime: "10:00",
            coachingEndTime: "11:00",
            durationMinutes: 60,
            coachingType: "individual",
            coacheeInfo: "이철수 선수",
            topic: "경기 불안감 극복 및 마인드셋 셋업",
            goals: "경기 전 불안감 조절 기법 습득",
            summary: "경기 전 루틴을 수립하여 불안감을 조절하는 방법을 훈련하고 명료화함.",
            techniquesUsed: ["경청", "강점 피드백", "목표 설정"],
            clientInsight: "경기 전 루틴을 수립하여 불안감을 조절하는 방법을 깨달음",
            actionPlan: "경기 전 15분 루틴 실행 및 셀프 토크 일지 작성",
            approvalStatus: "approved",
          });

          await ctx.db.insert("coachingLogs", {
            userId: traineeId,
            coachingDate: "2026-07-12",
            coachingStartTime: "14:00",
            coachingEndTime: "15:00",
            durationMinutes: 60,
            coachingType: "sv",
            coacheeInfo: "김민재 선수",
            topic: "슈퍼비전 코칭 실습: 목표 설정 단계 피드백",
            goals: "GROW 모델을 적용한 코칭 프로세스 확립",
            summary: "GROW 모델에 기반하여 고객의 강점을 탐색하고 현실 파악을 구체화하는 훈련을 시행함.",
            techniquesUsed: ["GROW 모델", "인지 재구성"],
            clientInsight: "GROW 모델 중 '현실(Reality)' 파악 단계에서 강점 기반의 탐색이 부족했음을 성찰함",
            actionPlan: "다음 코칭 시 고객의 성공 경험을 먼저 탐색하여 현실 파악을 공고히 할 것",
            svSupervisorFeedback: "GROW 모델의 흐름이 매끄럽습니다. 현실 탐색 시 질문의 개방성을 더 넓혀보세요.",
            svPeerFeedback: "경청 태도가 훌륭하여 편안하게 대화할 수 있었습니다.",
            svReflectionLearning: "질문을 미리 준비해 가기보다는 고객의 대답에서 키워드를 찾아 질문하는 노력이 필요합니다.",
            approvalStatus: "approved",
          });

          await ctx.db.insert("bcpLogs", {
            userId: traineeId,
            buddyId1: partnerId,
            myRole: "coach",
            sessionDate: "2026-07-11",
            sessionStartTime: "16:00",
            sessionEndTime: "17:00",
            durationMinutes: 60,
            topic: "코칭 대화 모델 훈련 및 경청 실습",
            content: "경청 중심의 코칭 훈련 진행",
            techniquesUsed: ["적극적 경청", "요약 및 명료화"],
            clientInsight: "질문을 쏟아내기보다 적절한 멈춤(Silence)을 활용하는 법을 배움",
            actionPlan: "버디 코칭 시 1회 이상 의도적 침묵을 유지해 보기",
            approvalStatus: "approved",
          });

          virtualTrainee = (await ctx.db.get(traineeId)) || undefined;
        }

        if (virtualTrainee) {
          activeMockTraineeId = virtualTrainee._id;

          // Ensure they are in the 17th cohort
          const cohort17 = await ctx.db
            .query("cohorts")
            .collect()
            .then((list) => list.find((c) => c.number === 17 || c.name.includes("17")));

          if (cohort17) {
            // Check existing membership
            const existingMember = await ctx.db
              .query("cohortMembers")
              .withIndex("by_user", (q) => q.eq("userId", virtualTrainee._id))
              .first();

            if (!existingMember || existingMember.cohortId !== cohort17._id) {
              if (existingMember) {
                await ctx.db.delete(existingMember._id);
              }
              await ctx.db.insert("cohortMembers", {
                cohortId: cohort17._id,
                userId: virtualTrainee._id,
                joinedAt: new Date().toISOString(),
                status: "active",
              });
            }
          }
        }
      } else if (args.role === "senior_coach") {
        // Find or create virtual preview coach
        let virtualCoach = await ctx.db
          .query("users")
          .collect()
          .then((users) => users.find((u) => u.email === "preview_coach@mcci.com"));

        if (!virtualCoach) {
          await ctx.db.insert("users", {
            tokenIdentifier: "preview-coach-token",
            name: "김동식(미리보기)",
            email: "preview_coach@mcci.com",
            role: "senior_coach",
            approvalStatus: "approved",
            onboardingCompleted: true,
            phone: "010-1111-1111",
            bio: "관리자 화면 미리보기용 가상 멘토코치 계정입니다.",
            isMockActive: true,
          });
        }
      }
      await ctx.db.patch(realUser._id, { activeMockRole: args.role, activeMockTraineeId });
    }
    return realUser._id;
  },
});

export const forceClearMockRoles = mutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    for (const u of users) {
      if (u.role === "admin" || u.role === "admin3") {
        await ctx.db.patch(u._id, { activeMockRole: undefined, activeMockTraineeId: undefined });
      }
    }
  },
});
