import { ConvexProviderWithAuth } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const convex = new ConvexReactClient(convexUrl);

// Intercept mutations/actions in preview mode to make it Read-Only
const originalMutation = convex.mutation;
(convex as any).mutation = function (mutation: any, ...args: any[]) {
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  if (isPreviewMode) {
    toast.error("미리보기 모드(Read-only)에서는 데이터를 수정할 수 없습니다.", {
      description: "관리자 모드로 복귀하거나 미리보기를 종료해 주세요.",
    });
    return Promise.reject(new Error("Read-only mode restriction"));
  }
  return (originalMutation as any).call(convex, mutation, ...args);
};

const originalAction = convex.action;
(convex as any).action = function (action: any, ...args: any[]) {
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  if (isPreviewMode) {
    toast.error("미리보기 모드(Read-only)에서는 액션을 실행할 수 없습니다.", {
      description: "관리자 모드로 복귀하거나 미리보기를 종료해 주세요.",
    });
    return Promise.reject(new Error("Read-only mode restriction"));
  }
  return (originalAction as any).call(convex, action, ...args);
};

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth();

  const useConvexAuth = () => {
    return useMemo(() => ({
      isLoading: auth.isLoading,
      isAuthenticated: auth.isAuthenticated,
      fetchAccessToken: auth.fetchAccessToken,
    }), [auth.isLoading, auth.isAuthenticated, auth.fetchAccessToken]);
  };

  return (
    <ConvexProviderWithAuth client={convex} useAuth={useConvexAuth}>
      {children}
    </ConvexProviderWithAuth>
  );
}

// Global mock wrappers for authentication components
export function Authenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <>{children}</>;
  }
  return null;
}

export function Unauthenticated({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <>{children}</>;
  }
  return null;
}

export function AuthLoading({ children }: { children: React.ReactNode }) {
  const { isLoading } = useAuth();
  if (isLoading) {
    return <>{children}</>;
  }
  return null;
}
