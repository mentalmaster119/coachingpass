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
