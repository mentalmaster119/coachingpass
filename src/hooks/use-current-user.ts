import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";
import { useEffect } from "react";

export function useCurrentUser() {
  const { user: authUser } = useAuth();
  
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  const previewRole = (localStorage.getItem("preview_role") as "trainee" | "senior_coach") || "trainee";

  const normalUser = useQuery(api.users.getRealUser, authUser ? {} : "skip");
  const previewUser = useQuery(api.users.getMockUserByRole, isPreviewMode && authUser ? { role: previewRole } : "skip");

  const user = isPreviewMode ? previewUser : normalUser;

  useEffect(() => {
    if (normalUser) {
      if (!localStorage.getItem("real_role")) {
        localStorage.setItem("real_role", normalUser.role);
      }

      if (normalUser.role === "admin") {
        if (normalUser.activeMockRole) {
          if (localStorage.getItem("admin_preview_mode") !== "true" || localStorage.getItem("preview_role") !== normalUser.activeMockRole) {
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
      }
    }
  }, [normalUser]);

  return {
    user,
    realUser: normalUser,
    isLoading: authUser !== undefined && (
      normalUser === undefined || (isPreviewMode && previewUser === undefined)
    ),
    isAdmin: user?.role === "admin",
    isSeniorCoach: user?.role === "senior_coach",
    isTrainee: user?.role === "trainee",
    isPending: user?.approvalStatus === "pending",
    isApproved: user?.approvalStatus === "approved",
    isRejected: user?.approvalStatus === "rejected",
  };
}
