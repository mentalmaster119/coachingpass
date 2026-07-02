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

  if (ctx.db) {
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
