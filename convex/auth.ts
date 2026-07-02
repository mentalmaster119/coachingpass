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
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), emailNormalized))
      .first();

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



