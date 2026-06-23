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

    return {
      success: true,
      userId,
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

    // Check approval status
    if (user.approvalStatus !== "approved") {
      throw new ConvexError({
        code: "PENDING_APPROVAL",
        message: user.approvalStatus === "pending"
          ? "가입 승인 대기 중입니다. 관리자 승인 완료 후 이용 가능합니다."
          : `가입이 거부된 계정입니다. 사유: ${user.rejectionReason || "없음"}`,
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
