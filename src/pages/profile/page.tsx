import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { UserCircle, BarChart2 } from "lucide-react";
import ProfileCard from "./_components/profile-card.tsx";
import ProfileEditForm from "./_components/profile-edit-form.tsx";
import PortfolioView from "./_components/portfolio-view.tsx";
import ProgressSummaryCard from "@/pages/progress/_components/progress-summary-card.tsx";

export default function ProfilePage() {
  const data = useQuery(api.users.getMyPortfolio, {});
  const [activeTab, setActiveTab] = useState("profile");

  if (data === undefined) {
    return (
      <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-52 w-full rounded-xl" />
      </div>
    );
  }

  const { user, stats, recentActivity, educationTarget, coachingTarget } = data;

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCircle className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">내 프로필</h1>
          <p className="text-sm text-muted-foreground">프로필과 코칭 포트폴리오를 관리합니다.</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-1.5">
            <UserCircle className="w-4 h-4" />
            프로필
          </TabsTrigger>
          <TabsTrigger value="portfolio" className="flex items-center gap-1.5">
            <BarChart2 className="w-4 h-4" />
            포트폴리오
          </TabsTrigger>
        </TabsList>

        {/* Profile tab */}
        <TabsContent value="profile" className="space-y-5 mt-5">
          {/* Show progress summary card only for trainees */}
          {(user.role === "trainee" || !user.role) && (
            <ProgressSummaryCard user={user} />
          )}
          <ProfileCard
            name={user.name}
            email={user.email}
            role={user.role}
            certificationGoal={user.certificationGoal}
            bio={user.bio}
            phone={user.phone}
            specializations={user.specializations}
            coachingStyle={user.coachingStyle}
            avatarUrl={user.avatarUrl}
            mbti={user.mbti ?? null}
          />
          <ProfileEditForm
            profile={{
              name: user.name,
              email: user.email,
              bio: user.bio,
              phone: user.phone,
              specializations: user.specializations,
              coachingStyle: user.coachingStyle,
              avatarUrl: user.avatarUrl,
              mbti: user.mbti ?? null,
              motivationalMessage: user.motivationalMessage ?? null,
            }}
          />
        </TabsContent>

        {/* Portfolio tab */}
        <TabsContent value="portfolio" className="mt-5">
          <PortfolioView
            stats={stats}
            recentActivity={recentActivity}
            educationTarget={educationTarget}
            coachingTarget={coachingTarget}
            certificationGoal={user.certificationGoal}
            role={user.role}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
