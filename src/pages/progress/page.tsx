import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { useViewMode } from "@/components/layout/app-layout.tsx";
import TraineeProgressPage from "./_components/trainee-progress.tsx";
import AdminProgressPage from "./_components/admin-progress.tsx";

export default function ProgressPage() {
  const { user, isLoading } = useCurrentUser();
  const { isPreviewMode } = useViewMode();

  if (isLoading || !user) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="flex justify-around gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-32 rounded-full" />
          ))}
        </div>
        <Skeleton className="h-52 w-full rounded-xl" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  // Admin/senior_coach sees trainee view when in preview mode
  if ((user.role === "admin" || user.role === "senior_coach") && isPreviewMode) {
    return <TraineeProgressPage user={user} />;
  }

  if (user.role === "admin" || user.role === "senior_coach") {
    return <AdminProgressPage />;
  }

  return <TraineeProgressPage user={user} />;
}
