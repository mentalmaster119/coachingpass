import { ConvexError } from "convex/values";
import type { MutationCtx, QueryCtx } from "./mockAuth";

type UserRole = "trainee" | "senior_coach" | "admin";

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

  return user;
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
