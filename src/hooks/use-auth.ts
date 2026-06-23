import { useMemo } from "react";
import { useAuth as useHerculesAuth, useUser as useHerculesUser } from "@usehercules/auth/react";

export function useAuth() {
  const herculesAuth = useHerculesAuth();
  const herculesUser = useHerculesUser();

  const signin = async () => {
    await herculesAuth.signin();
  };

  const signout = async () => {
    localStorage.removeItem("real_role");
    localStorage.removeItem("admin_preview_mode");
    localStorage.removeItem("preview_role");
    await herculesAuth.signout();
  };

  const signinRedirect = async () => {
    await herculesAuth.signin();
  };

  const user = herculesAuth.isAuthenticated ? {
    id: herculesUser.id ?? "",
    name: herculesUser.name ?? "User",
    email: herculesUser.email ?? "",
  } : null;

  return useMemo(() => ({
    isAuthenticated: herculesAuth.isAuthenticated,
    isLoading: herculesAuth.isLoading,
    signin,
    signinRedirect,
    signout,
    error: (herculesAuth.error as Error | null) || null,
    user
  }), [herculesAuth.isAuthenticated, herculesAuth.isLoading, herculesAuth.error, user]);
}

export function useUser() {
  const { isAuthenticated, user, isLoading } = useAuth();
  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    id: user?.id ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
  }), [isAuthenticated, user, isLoading]);
}
