import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./mockAuth";

type UserRole = "trainee" | "senior_coach" | "admin" | "admin3";

export async function getAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new ConvexError({ message: "User not logged in", code: "UNAUTHENTICATED" });
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();

  if (!user) {
    throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
  }

  if (user.approvalStatus !== "approved") {
    throw new ConvexError({ message: "User is pending approval or access is restricted", code: "PENDING_APPROVAL" });
  }

  // 멘토코치로 지정(isMentorCoach: true)된 경우 기본적으로 멘토코치(senior_coach) 역할을 부여
  const baseRole: UserRole =
    user.role === "trainee" && user.isMentorCoach ? "senior_coach" : user.role;

  // 멘토코치(senior_coach)가 '코치 화면으로 보기'(activeMockRole === "trainee")로 전환한 경우 본인 계정 그대로 role만 trainee로 동작
  const effectiveRole: UserRole =
    !(ctx as any).skipMockAuth && baseRole === "senior_coach" && user.activeMockRole === "trainee"
      ? "trainee"
      : baseRole;

  return { ...user, role: effectiveRole };
}

export async function requireRole(
  ctx: QueryCtx | MutationCtx,
  allowedRoles: UserRole[],
) {
  const user = await getAuthenticatedUser(ctx);
  if (!allowedRoles.includes(user.role)) {
    throw new ConvexError({ message: "Insufficient permissions", code: "FORBIDDEN" });
  }
  return user;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  return requireRole(ctx, ["admin"]);
}
