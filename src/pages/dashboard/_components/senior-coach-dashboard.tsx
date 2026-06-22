import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Users, MessageSquareDot, TrendingUp, AlertCircle,
  BookOpen, ClipboardList, Star, Plus, UserCheck,
} from "lucide-react";
import SetNameBanner from "./set-name-banner.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type User = Doc<"users">;

const CERT_COLORS: Record<string, string> = {
  KAC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  KPC: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function SeniorCoachDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const dashData = useQuery(api.dashboard.getCoachDashboardData);
  const pendingReviews = useQuery(api.progress.getPendingReviewCounts);

  const isLoading = dashData === undefined;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* 이름 미설정 배너 */}
      {!user.name && <SetNameBanner />}

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">안녕하세요, {user.name || "상위코치"}님!</h1>
          <p className="text-muted-foreground text-sm mt-1">
            담당 수강생들의 성장을 함께 이끌어 주세요.
          </p>
        </div>
        <Button onClick={() => { navigate("/coach/feedback"); }}>
          <Plus className="w-4 h-4 mr-2" />
          피드백 작성
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "담당 수강생",
            value: isLoading ? "..." : dashData.traineeCount,
            icon: <Users className="w-4 h-4" />,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "검토 대기",
            value: pendingReviews === undefined ? "..." : pendingReviews.total,
            icon: <AlertCircle className="w-4 h-4" />,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            urgent: (pendingReviews?.total ?? 0) > 0,
          },
          {
            label: "작성한 피드백",
            value: isLoading ? "..." : dashData.totalFeedbackGiven,
            icon: <MessageSquareDot className="w-4 h-4" />,
            color: "text-blue-600",
            bg: "bg-blue-50 dark:bg-blue-900/20",
          },
          {
            label: "평균 평점",
            value: isLoading || dashData.totalFeedbackGiven === 0 ? "-" : `${dashData.avgFeedbackRating}점`,
            icon: <Star className="w-4 h-4" />,
            color: "text-amber-500",
            bg: "bg-amber-50 dark:bg-amber-900/20",
          },
        ].map((stat) => (
          <Card key={stat.label} className={stat.urgent ? "border-amber-300 dark:border-amber-700" : ""}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}>
                {stat.icon}
              </div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Pending review alert */}
      {(pendingReviews?.total ?? 0) > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2.5 flex-1">
                  <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    <strong>{pendingReviews!.total}건</strong>의 기록이 검토 대기 중입니다.
                  </p>
                </div>
                <div className="flex gap-2">
                  {(pendingReviews?.educationPending ?? 0) > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/admin/education")}>
                      <BookOpen className="w-3.5 h-3.5 mr-1" />
                      교육 ({pendingReviews!.educationPending})
                    </Button>
                  )}
                  {(pendingReviews?.coachingPending ?? 0) > 0 && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/admin/coaching")}>
                      <ClipboardList className="w-3.5 h-3.5 mr-1" />
                      코칭 ({pendingReviews!.coachingPending})
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Trainee progress cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-muted-foreground" />
            담당 수강생 진행 현황
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/coach/trainees")}>
            전체 보기 <TrendingUp className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
          </div>
        ) : dashData.traineeProgress.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>담당 수강생이 없습니다</EmptyTitle>
              <EmptyDescription>관리자가 수강생을 배정하면 이곳에 표시됩니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {dashData.traineeProgress.map((trainee) => (
              <Card key={trainee._id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <p className="font-medium text-sm">{trainee.name}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CERT_COLORS[trainee.certificationGoal] ?? ""}`}>
                          {trainee.certificationGoal}
                        </span>
                        {trainee.pendingCount > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            검토대기 {trainee.pendingCount}건
                          </Badge>
                        )}
                        {trainee.feedbackCount > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            피드백 {trainee.feedbackCount}건
                          </Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">교육</span>
                            <span className="font-medium">{trainee.approvedEduHours}/{trainee.eduTarget}h</span>
                          </div>
                          <Progress
                            value={Math.min((trainee.approvedEduHours / trainee.eduTarget) * 100, 100)}
                            className="h-1.5"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">코칭</span>
                            <span className="font-medium">{trainee.approvedCoachHours}/{trainee.coachTarget}h</span>
                          </div>
                          <Progress
                            value={Math.min((trainee.approvedCoachHours / trainee.coachTarget) * 100, 100)}
                            className="h-1.5"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-center">
                        <p className="text-lg font-bold text-primary">{trainee.overallPct}%</p>
                        <p className="text-[10px] text-muted-foreground">달성률</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/progress/trainee/${trainee._id}`)}
                      >
                        <TrendingUp className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* Quick actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2 className="text-base font-semibold mb-3">바로가기</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "피드백 관리", href: "/coach/feedback", icon: <MessageSquareDot className="w-4 h-4" />, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
            { label: "교육 검토", href: "/admin/education", icon: <BookOpen className="w-4 h-4" />, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
            { label: "코칭 검토", href: "/admin/coaching", icon: <ClipboardList className="w-4 h-4" />, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
            { label: "담당 수강생", href: "/coach/trainees", icon: <UserCheck className="w-4 h-4" />, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
          ].map((item) => (
            <button
              key={item.href}
              onClick={() => navigate(item.href)}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left"
            >
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center flex-shrink-0`}>
                {item.icon}
              </div>
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
