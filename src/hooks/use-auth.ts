import { useState, useMemo } from "react";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("mock_authenticated") === "true";
  });

  const signin = async () => {
    localStorage.setItem("mock_authenticated", "true");
    setIsAuthenticated(true);
    window.location.href = "/dashboard";
  };

  const signinRedirect = async () => {
    await signin();
  };

  const signout = async () => {
    localStorage.removeItem("mock_authenticated");
    setIsAuthenticated(false);
    window.location.href = "/";
  };

  const user = isAuthenticated ? {
    id: "mock-user-id",
    name: "테스트 코치",
    email: "coach@test.com",
  } : null;

  return useMemo(() => ({
    isAuthenticated,
    isLoading: false,
    signin,
    signinRedirect,
    signout,
    error: null as Error | null,
    user
  }), [isAuthenticated]);
}

export function useUser() {
  const { isAuthenticated, user } = useAuth();
  return useMemo(() => ({
    isAuthenticated,
    isLoading: false,
    id: user?.id ?? "",
    name: user?.name ?? "",
    email: user?.email ?? "",
  }), [isAuthenticated, user]);
}
