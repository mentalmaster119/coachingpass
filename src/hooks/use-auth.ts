import { useState, useMemo, useCallback } from "react";

// Client-side lightweight JWT parser
function parseJwt(token: string) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem("auth_token");
    if (!stored) return null;

    // Check expiry on mount
    const payload = parseJwt(stored);
    if (!payload || !payload.exp) {
      localStorage.removeItem("auth_token");
      return null;
    }

    const currentTimestamp = Math.floor(Date.now() / 1000);
    if (currentTimestamp > payload.exp) {
      localStorage.removeItem("auth_token");
      return null; // Expired
    }

    return stored;
  });

  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = !!token;

  const user = useMemo(() => {
    if (!token) return null;
    const payload = parseJwt(token);
    if (!payload) return null;
    return {
      id: payload.sub ?? "",
      name: payload.name ?? "",
      email: payload.email ?? "",
    };
  }, [token]);

  const signin = useCallback(async (tokenStr: string) => {
    localStorage.setItem("auth_token", tokenStr);
    setToken(tokenStr);
  }, []);

  const signout = useCallback(async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("real_role");
    localStorage.removeItem("admin_preview_mode");
    localStorage.removeItem("preview_role");
    setToken(null);
    window.location.href = "/";
  }, []);

  const fetchAccessToken = useCallback(async () => {
    if (!token) return null;

    // Verify expiry before returning token
    const payload = parseJwt(token);
    if (payload && payload.exp) {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (currentTimestamp > payload.exp) {
        // Token has expired
        localStorage.removeItem("auth_token");
        setToken(null);
        window.location.href = "/";
        return null;
      }
    }

    return token;
  }, [token]);

  return useMemo(() => ({
    isAuthenticated,
    isLoading,
    signin,
    signinRedirect: async () => {}, // unused fallback
    signout,
    fetchAccessToken,
    error: null as Error | null,
    user
  }), [isAuthenticated, isLoading, signin, signout, fetchAccessToken, user]);
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
