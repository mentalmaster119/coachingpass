import { Settings } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import ProfileForm from "./_components/profile-form.tsx";
import CertificationGoalCard from "./_components/certification-goal-card.tsx";
import AccountInfoCard from "./_components/account-info-card.tsx";
import NotificationSettingsCard from "./_components/notification-settings-card.tsx";

export default function SettingsPage() {
  const { user, isLoading } = useCurrentUser();

  if (isLoading || !user) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-44 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">설정</h1>
          <p className="text-sm text-muted-foreground">프로필 및 계정 설정을 관리합니다.</p>
        </div>
      </div>

      {/* Profile */}
      <ProfileForm user={user} />

      {/* Certification goal — trainee only */}
      {user.role === "trainee" && (
        <CertificationGoalCard user={user} />
      )}

      {/* Notification settings */}
      <NotificationSettingsCard />

      {/* Account info */}
      <AccountInfoCard user={user} />
    </div>
  );
}
