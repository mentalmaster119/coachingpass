import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@/hooks/use-auth.ts";

export function useCurrentUser() {
  const { user: authUser } = useAuth();
  
  const isPreviewMode = localStorage.getItem("admin_preview_mode") === "true";
  const previewRole = (localStorage.getItem("preview_role") as "trainee" | "senior_coach") || "trainee";

  const normalUser = useQuery(api.users.getCurrentUser, !isPreviewMode && authUser ? {} : "skip");
  const previewUser = useQuery(api.users.getMockUserByRole, isPreviewMode && authUser ? { role: previewRole } : "skip");

  const user = isPreviewMode ? previewUser : normalUser;

  return {
    user,
    isLoading: authUser !== undefined && user === undefined,
    isAdmin: user?.role === "admin",
    isSeniorCoach: user?.role === "senior_coach",
    isTrainee: user?.role === "trainee",
    isPending: user?.approvalStatus === "pending",
    isApproved: user?.approvalStatus === "approved",
    isRejected: user?.approvalStatus === "rejected",
  };
}
