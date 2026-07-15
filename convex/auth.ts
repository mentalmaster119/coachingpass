import { ConvexError, v } from "convex/values";
import { mutation } from "./_generated/server";
import { hashPassword, verifyPassword, signToken } from "./authUtils";

const DEFAULT_ISSUER = "https://peaceful-wolverine-673.convex.site";

/**
 * Sign Up a new user with email, name and password
 */
export const signUp = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNormalized = args.email.trim().toLowerCase();
    
    // Check if email already exists
    const existingUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), emailNormalized))
      .first();

    if (existingUser !== null) {
      throw new ConvexError({
        code: "EMAIL_ALREADY_EXISTS",
        message: "이미 등록된 이메일 주소입니다.",
      });
    }

    // Determine role/approval (first user is admin/approved, others are trainee/pending)
    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .first();

    const isFirstUser = existingAdmin === null;
    const role = isFirstUser ? "admin" : "trainee";
    const approvalStatus = isFirstUser ? "approved" : "pending";
    const onboardingCompleted = isFirstUser;

    const passwordHash = await hashPassword(args.password);

    // Insert user first to get ID
    const userId = await ctx.db.insert("users", {
      name: args.name.trim(),
      email: emailNormalized,
      role,
      approvalStatus,
      onboardingCompleted,
      passwordHash,
      tokenIdentifier: "temporary-token-id", // will patch in next step
    });

    // Generate standard tokenIdentifier based on Convex Site issuer domain
    const issuer = process.env.CONVEX_SITE_URL || DEFAULT_ISSUER;
    const tokenIdentifier = `${issuer}|${userId}`;

    // Update with correct tokenIdentifier
    await ctx.db.patch(userId, { tokenIdentifier });

    // Generate custom RS256 JWT token matching issuer domain
    const token = await signToken(
      {
        id: userId,
        email: emailNormalized,
        name: args.name.trim(),
      },
      issuer
    );

    return {
      success: true,
      userId,
      token,
      isPending: approvalStatus === "pending",
    };
  },
});

/**
 * Sign In with email and password
 * Returns RS256 JWT token if successful
 */
export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const emailNormalized = args.email.trim().toLowerCase();

    // Query user by email
    let user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), emailNormalized))
      .first();

    if (emailNormalized === "preview_trainee@mcci.com") {
      const targetHash = await hashPassword("M12345");
      if (user === null) {
        const userId = await ctx.db.insert("users", {
          name: "홍길동(미리보기)",
          email: "preview_trainee@mcci.com",
          role: "trainee",
          approvalStatus: "approved",
          onboardingCompleted: true,
          passwordHash: targetHash,
          tokenIdentifier: "temporary-token-id",
        });
        const issuer = process.env.CONVEX_SITE_URL || DEFAULT_ISSUER;
        const tokenIdentifier = `${issuer}|${userId}`;
        await ctx.db.patch(userId, { tokenIdentifier });

        // Ensure assigned to the 17th cohort
        const cohort17 = await ctx.db
          .query("cohorts")
          .collect()
          .then((list) => list.find((c) => c.number === 17 || c.name.includes("17")));

        if (cohort17) {
          await ctx.db.insert("cohortMembers", {
            cohortId: cohort17._id,
            userId: userId,
            joinedAt: new Date().toISOString(),
            status: "active",
          });
        }

        // Seed some sample logs for the preview trainee
        const otherTrainees = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "trainee"))
          .collect();
        const otherTraine = otherTrainees.find((u) => u._id !== userId);
        const partnerId = otherTraine ? otherTraine._id : userId;

        // Seed coaching log (Buddy)
        await ctx.db.insert("coachingLogs", {
          userId,
          sessionNumber: 1,
          clientName: "이몽룡",
          sessionDate: "2026-07-12",
          sessionStartTime: "14:00",
          sessionEndTime: "15:00",
          durationMinutes: 60,
          coachingType: "buddy",
          topic: "경청 및 질문 훈련",
          content: "경청 훈련을 토대로 고객의 숨은 의도를 파악하는 코칭 진행",
          techniquesUsed: ["적극적 경청", "열린 질문"],
          clientInsight: "스스로가 가진 장점과 해결책을 구체화함",
          actionPlan: "행동 계획 수립 및 실천 확인 피드백",
          approvalStatus: "approved",
        });

        // Seed coaching log (Supervision)
        await ctx.db.insert("coachingLogs", {
          userId,
          sessionNumber: 1,
          clientName: "성춘향",
          sessionDate: "2026-07-13",
          sessionStartTime: "10:00",
          sessionEndTime: "11:30",
          durationMinutes: 90,
          coachingType: "sv",
          topic: "GROW 모델 적용 실습",
          content: "GROW 모델을 사용한 경력 목표 설정 및 현실 파악 훈련",
          techniquesUsed: ["GROW 모델", "경청"],
          clientInsight: "현실 상황의 장애물과 자원을 객관적으로 인지함",
          actionPlan: "다음 코칭까지 장애물 제거를 위한 구체적 행동 실행",
          svSupervisorFeedback: "모델의 흐름이 아주 자연스럽고 질문의 타이밍이 훌륭했습니다.",
          svPeerFeedback: "피코치자가 편안하게 이야기할 수 있는 분위기를 만들어주셨습니다.",
          svReflectionLearning: "질문을 이어나갈 때 피코치자의 키워드를 적극적으로 활용하는 법을 배움",
          approvalStatus: "approved",
        });

        // Seed BCP log
        await ctx.db.insert("bcpLogs", {
          userId,
          buddyId1: partnerId,
          myRole: "coach",
          sessionDate: "2026-07-14",
          sessionStartTime: "13:00",
          sessionEndTime: "14:00",
          durationMinutes: 60,
          topic: "목표 설정 및 실천 계획 훈련",
          content: "코칭 기본 대화 모델 훈련 진행",
          techniquesUsed: ["적극적 경청", "요약 및 명료화"],
          clientInsight: "명확한 목표가 있을 때 실천력이 크게 향상됨을 느낌",
          actionPlan: "계획된 행동 사항을 플래너에 기록하고 매일 점검하기",
          approvalStatus: "approved",
        });

        user = await ctx.db.get(userId);
      } else {
        // Ensure name, role, approval, and password are correct
        const isPasswordValid = await verifyPassword("M12345", user.passwordHash || "");
        if (!isPasswordValid || user.name !== "홍길동(미리보기)" || user.role !== "trainee" || user.approvalStatus !== "approved") {
          await ctx.db.patch(user._id, {
            name: "홍길동(미리보기)",
            role: "trainee",
            approvalStatus: "approved",
            onboardingCompleted: true,
            passwordHash: targetHash,
          });

          // Ensure assigned to the 17th cohort
          const cohort17 = await ctx.db
            .query("cohorts")
            .collect()
            .then((list) => list.find((c) => c.number === 17 || c.name.includes("17")));

          if (cohort17) {
            const existingMember = await ctx.db
              .query("cohortMembers")
              .withIndex("by_user", (q) => q.eq("userId", user._id))
              .first();

            if (!existingMember || existingMember.cohortId !== cohort17._id) {
              if (existingMember) {
                await ctx.db.delete(existingMember._id);
              }
              await ctx.db.insert("cohortMembers", {
                cohortId: cohort17._id,
                userId: user._id,
                joinedAt: new Date().toISOString(),
                status: "active",
              });
            }
          }
          user = await ctx.db.get(user._id);
        }
      }
    }

    if (user === null) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "이메일 혹은 비밀번호를 확인해 주세요.",
      });
    }

    if (!user.passwordHash) {
      throw new ConvexError({
        code: "LEGACY_USER_NO_PASSWORD",
        message: "비밀번호 설정이 완료되지 않은 계정입니다. 관리자에게 문의하세요.",
      });
    }

    // Verify Password
    const isPasswordValid = await verifyPassword(args.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new ConvexError({
        code: "INVALID_CREDENTIALS",
        message: "이메일 혹은 비밀번호를 확인해 주세요.",
      });
    }

    // Issue custom RS256 JWT token matching issuer domain
    const issuer = process.env.CONVEX_SITE_URL || DEFAULT_ISSUER;
    const token = await signToken(
      {
        id: user._id,
        email: user.email || "",
        name: user.name || "User",
      },
      issuer
    );

    return {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      }
    };
  },
});

/**
 * Temporary migration to set default password for legacy users
 * sets passwordHash to "123456" (or provided password) and updates tokenIdentifier
 */
export const migrateLegacyUsers = mutation({
  args: {
    defaultPassword: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const password = args.defaultPassword || "123456";
    const passwordHash = await hashPassword(password);
    const issuer = process.env.CONVEX_SITE_URL || DEFAULT_ISSUER;

    const users = await ctx.db.query("users").collect();
    let updatedCount = 0;

    for (const user of users) {
      let needsUpdate = false;
      const patchData: any = {};

      if (!user.passwordHash) {
        patchData.passwordHash = passwordHash;
        needsUpdate = true;
      }

      // Ensure tokenIdentifier matches the custom OIDC format (issuer|userId)
      const expectedTokenIdentifier = `${issuer}|${user._id}`;
      if (user.tokenIdentifier !== expectedTokenIdentifier) {
        patchData.tokenIdentifier = expectedTokenIdentifier;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await ctx.db.patch(user._id, patchData);
        updatedCount++;
      }
    }

    return {
      success: true,
      updatedCount,
    };
  },
});

/**
 * Change user password
 */
export const changePassword = mutation({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHORIZED",
        message: "로그인이 필요합니다.",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    if (!user) {
      throw new ConvexError({
        code: "USER_NOT_FOUND",
        message: "사용자를 찾을 수 없습니다.",
      });
    }

    if (user.passwordHash) {
      const isPasswordValid = await verifyPassword(args.currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        throw new ConvexError({
          code: "INVALID_CURRENT_PASSWORD",
          message: "현재 비밀번호가 일치하지 않습니다.",
        });
      }
    }

    const newHash = await hashPassword(args.newPassword);
    await ctx.db.patch(user._id, {
      passwordHash: newHash,
    });

    return { success: true };
  },
});



