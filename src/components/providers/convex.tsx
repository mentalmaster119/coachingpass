import { ConvexProviderWithAuth } from "convex/react";
import { ConvexReactClient } from "convex/react";
import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth.ts";
import { toast } from "sonner";

const convexUrl = import.meta.env.VITE_CONVEX_URL ?? "http://localhost:3000";
const convex = new ConvexReactClient(convexUrl);

// Helper to extract Convex function name safely from FunctionReference Proxy
function getConvexFunctionName(fnRef: any): string {
  if (!fnRef) return "";
  if (typeof fnRef === "string") return fnRef;
  try {
    const symName = fnRef[Symbol.for("functionName")];
    if (typeof symName === "string") return symName;
  } catch {
    // ignore
  }
  if (typeof fnRef._path === "string") return fnRef._path;
  if (typeof fnRef.name === "string") return fnRef.name;
  return "";
}

function isReadOnlyAdminPreview(): boolean {
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  if (!isPreviewMode) return false;
  const hasToken = Boolean(localStorage.getItem("auth_token"));
  if (!hasToken) {
    localStorage.removeItem("admin_preview_mode");
    localStorage.removeItem("preview_role");
    return false;
  }
  const realRole = localStorage.getItem("real_role");
  // 멘토코치(senior_coach)가 본인 계정으로 코치(교육생) 모드로 전환한 경우는 실제 활동 모드이므로 읽기 전용 제한을 걸지 않음
  if (realRole === "senior_coach") {
    return false;
  }
  return realRole === "admin" || realRole === "admin3";
}

// Intercept mutations/actions in preview mode to make it Read-Only
const originalMutation = convex.mutation;
(convex as any).mutation = function (mutation: any, ...args: any[]) {
  const path = getConvexFunctionName(mutation);
  const firstArg = args && args[0] && typeof args[0] === "object" ? args[0] : null;

  const isAuthCall =
    path.startsWith("auth:") ||
    (firstArg !== null && "email" in firstArg && "password" in firstArg);
  const isSetActiveMockUser =
    firstArg !== null && "role" in firstArg && Object.keys(firstArg).length <= 2;
  const isBypass =
    isAuthCall ||
    path.includes("updateCurrentUser") ||
    path.includes("setActiveMockUser") ||
    path.includes("acceptInvitation") ||
    isSetActiveMockUser;

  if (isReadOnlyAdminPreview() && !isBypass) {
    toast.error("미리보기 모드(Read-only)에서는 데이터를 수정할 수 없습니다.", {
      description: "관리자 모드로 복귀하거나 미리보기를 종료해 주세요.",
    });
    return Promise.reject(new Error("Read-only mode restriction"));
  }
  return (originalMutation as any).call(convex, mutation, ...args);
};

const originalAction = convex.action;
(convex as any).action = function (action: any, ...args: any[]) {
  const path = getConvexFunctionName(action);
  const isBypass =
    path.startsWith("auth:") ||
    path.includes("updateCurrentUser") ||
    path.includes("setActiveMockUser");

  if (isReadOnlyAdminPreview() && !isBypass) {
    toast.error("미리보기 모드(Read-only)에서는 액션을 실행할 수 없습니다.", {
      description: "관리자 모드로 복귀하거나 미리보기를 종료해 주세요.",
    });
    return Promise.reject(new Error("Read-only mode restriction"));
  }
  return (originalAction as any).call(convex, action, ...args);
};

export function ConvexProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
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
