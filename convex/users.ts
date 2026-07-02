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
      // Use || instead of ?? to avoid overwriting with empty string from some OAuth providers.
      await ctx.db.patch(user._id, {
        name: identity.name?.trim() || user.name,
        email: identity.email?.trim() || user.email,
      });
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
              (user.name?.toLowerCase().includes("chul") ||
                user.name?.toLowerCase().includes("park") ||
                user.name?.includes("철수"))
          )
        );
      if (u) return u;
    } else if (args.role === "senior_coach") {
      const u = await ctx.db
        .query("users")
        .collect()
        .then((users) =>
          users.find(
            (user) =>
              user.role === "senior_coach" &&
              user.email?.toLowerCase().includes("mentalcoach119")
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
  args: { role: v.union(v.literal("admin"), v.literal("senior_coach"), v.literal("trainee")) },
  handler: async (ctx, args) => {
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      if (u.isMockActive) {
        await ctx.db.patch(u._id, { isMockActive: false });
      }
    }
    let targetUser = null;
    if (args.role === "trainee") {
      targetUser = allUsers.find(
        (user) =>
          user.role === "trainee" &&
          (user.name?.toLowerCase().includes("chul") ||
            user.name?.toLowerCase().includes("park") ||
            user.name?.includes("철수"))
      );
    } else if (args.role === "senior_coach") {
      targetUser = allUsers.find(
        (user) =>
          user.role === "senior_coach" &&
          user.email?.toLowerCase().includes("mentalcoach119")
      );
    }
    if (!targetUser) {
      targetUser = allUsers.find((user) => user.role === args.role);
    }
    if (targetUser) {
      await ctx.db.patch(targetUser._id, { isMockActive: true });
      return targetUser._id;
    }
    throw new ConvexError({ message: "Mock user for role not found", code: "NOT_FOUND" });
  },
});
