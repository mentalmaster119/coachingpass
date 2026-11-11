import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { useEffect } from "react";

export function useCurrentUser() {
  const { user: authUser } = useAuth();
  
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  const previewRole = (localStorage.getItem("preview_role") as "trainee" | "senior_coach") || "trainee";

  const normalUser = useQuery(api.users.getRealUser, authUser ? {} : "skip");
  const isAdminPreview =
    isPreviewMode &&
    Boolean(
      authUser &&
        (normalUser
          ? normalUser.role === "admin" || normalUser.role === "admin3"
          : localStorage.getItem("real_role") === "admin" ||
            localStorage.getItem("real_role") === "admin3"),
    );
  const previewUser = useQuery(
    api.users.getMockUserByRole,
    isAdminPreview ? { role: previewRole } : "skip",
  );

  // 관리자(admin/admin3)는 미리보기 시 가상(Mock) 테스터 계정을 사용하고,
  // 멘토코치(senior_coach)가 코치(교육생) 모드로 전환한 경우에는 본인 실제 계정 데이터를 그대로 유지한 채 role만 trainee로 전환
  const user =
    isPreviewMode && normalUser?.role === "senior_coach"
      ? { ...normalUser, role: "trainee" as const }
      : isAdminPreview
        ? previewUser
        : normalUser;

  useEffect(() => {
    if (authUser === null) {
      if (localStorage.getItem("admin_preview_mode") === "true") {
        localStorage.removeItem("admin_preview_mode");
        localStorage.removeItem("preview_role");
        window.location.reload();
      }
    }
  }, [authUser]);

  useEffect(() => {
    if (normalUser) {
      if (localStorage.getItem("real_role") !== normalUser.role) {
        localStorage.setItem("real_role", normalUser.role);
      }

      if (
        normalUser.role === "admin" ||
        normalUser.role === "admin3" ||
        normalUser.role === "senior_coach"
      ) {
        if (normalUser.activeMockRole) {
          if (
            localStorage.getItem("admin_preview_mode") !== "true" ||
            localStorage.getItem("preview_role") !== normalUser.activeMockRole
          ) {
            localStorage.setItem("admin_preview_mode", "true");
            localStorage.setItem("preview_role", normalUser.activeMockRole);
            window.location.reload();
          }
        } else {
          if (localStorage.getItem("admin_preview_mode") === "true") {
            localStorage.removeItem("admin_preview_mode");
            localStorage.removeItem("preview_role");
            window.location.reload();
          }
        }
      } else {
        if (localStorage.getItem("admin_preview_mode") === "true") {
          localStorage.removeItem("admin_preview_mode");
          localStorage.removeItem("preview_role");
          window.location.reload();
        }
      }
    }
  }, [normalUser]);

  return {
    user,
    realUser: normalUser,
    isLoading: authUser !== undefined && (
      normalUser === undefined || (isAdminPreview && previewUser === undefined)
    ),
    isAdmin: user?.role === "admin" || user?.role === "admin3",
    isSeniorCoach: user?.role === "senior_coach",
    isTrainee: user?.role === "trainee",
    isPending: user?.approvalStatus === "pending",
    isApproved: user?.approvalStatus === "approved",
    isRejected: user?.approvalStatus === "rejected",
  };
}
