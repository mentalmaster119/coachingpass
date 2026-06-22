import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useViewMode } from "@/components/layout/app-layout.tsx";
import TraineeDashboard from "./_components/trainee-dashboard.tsx";
import SeniorCoachDashboard from "./_components/senior-coach-dashboard.tsx";
import AdminOverview from "./_components/admin-overview.tsx";

export default function DashboardPage() {
  const { user, isLoading } = useCurrentUser();
  const { isPreviewMode } = useViewMode();

  if (isLoading || !user) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Show trainee view when in preview mode (admin or senior_coach)
  if (isPreviewMode) {
    return <TraineeDashboard user={user} />;
  }

  if (user.role === "admin") {
    return <AdminOverview user={user} />;
  }

  if (user.role === "senior_coach") {
    return <SeniorCoachDashboard user={user} />;
  }

  return <TraineeDashboard user={user} />;
}
