import {
  query as convexQuery,
  mutation as convexMutation,
  action as convexAction,
  internalQuery,
  internalMutation,
  internalAction
} from "./_generated/server";

export { internalQuery, internalMutation, internalAction };
export type { QueryCtx, MutationCtx, ActionCtx, DatabaseReader, DatabaseWriter } from "./_generated/server";

async function getMockIdentity(ctx: any, originalGetUserIdentity: any) {
  const identity = await originalGetUserIdentity.call(ctx.auth);
  if (!identity) return null;

  if (ctx.skipMockAuth) {
    return identity;
  }

  if (ctx.db) {
    // 1. Find the REAL user in the database using the original identity
    const realUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q: any) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .first();

    // 2. Only intercept and substitute if the real logged-in user is an admin!
    if (realUser && realUser.role === "admin") {
      const activeMockUser = await ctx.db
        .query("users")
        .filter((q: any) => q.eq(q.field("isMockActive"), true))
        .first();

      if (activeMockUser) {
        return {
          ...identity,
          tokenIdentifier: activeMockUser.tokenIdentifier,
          email: activeMockUser.email ?? identity.email,
          name: activeMockUser.name ?? identity.name,
        };
      }
    }
  }

  return identity;
}

export const query: typeof convexQuery = (options: any) => {
  const originalHandler = options.handler;
  options.handler = async (ctx: any, args: any) => {
    const originalGetUserIdentity = ctx.auth.getUserIdentity;
    ctx.auth.getUserIdentity = () => getMockIdentity(ctx, originalGetUserIdentity);
    return originalHandler(ctx, args);
  };
  return convexQuery(options);
};

export const mutation: typeof convexMutation = (options: any) => {
  const originalHandler = options.handler;
  options.handler = async (ctx: any, args: any) => {
    const originalGetUserIdentity = ctx.auth.getUserIdentity;
    ctx.auth.getUserIdentity = () => getMockIdentity(ctx, originalGetUserIdentity);
    return originalHandler(ctx, args);
  };
  return convexMutation(options);
};

export const action: typeof convexAction = (options: any) => {
  const originalHandler = options.handler;
  options.handler = async (ctx: any, args: any) => {
    const originalGetUserIdentity = ctx.auth.getUserIdentity;
    ctx.auth.getUserIdentity = () => getMockIdentity(ctx, originalGetUserIdentity);
    return originalHandler(ctx, args);
  };
  return convexAction(options);
};
