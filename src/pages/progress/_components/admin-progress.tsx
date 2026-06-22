import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";

export default function AdminProgressPage() {
  const navigate = useNavigate();
  const trainees = useQuery(api.progress.getAllTraineesProgress);
  const pendingCounts = useQuery(api.progress.getPendingReviewCounts);

  const isLoading = trainees === undefined || pendingCounts === undefined;

  // Summary stats
  const smpccCount = trainees?.length ?? 0;
  const avgProgress =
    trainees && trainees.length > 0
      ? Math.round(trainees.reduce((sum, t) => sum + t.overallPct, 0) / trainees.length)
      : 0;

  // Chart data: distribution of progress
  const progressBuckets = [
    { range: "0-20%", count: 0 },
    { range: "21-40%", count: 0 },
    { range: "41-60%", count: 0 },
    { range: "61-80%", count: 0 },
    { range: "81-100%", count: 0 },
  ];
  trainees?.forEach((t) => {
    const idx = Math.min(Math.floor(t.overallPct / 20), 4);
    progressBuckets[idx].count++;
  });

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">수강생 진행 현황</h1>
          <p className="text-muted-foreground text-sm mt-1">
            모든 수강생의 자격증 취득 진행 상황을 한눈에 확인하세요.
          </p>
        </div>
        {pendingCounts && pendingCounts.total > 0 && (
          <Badge
            variant="destructive"
            className="self-start sm:self-center text-sm px-3 py-1.5 animate-pulse"
          >
            <AlertTriangle className="w-3.5 h-3.5 mr-1.5" />
            검토 대기 {pendingCounts.total}건
          </Badge>
        )}
      </motion.div>

      {/* Summary stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))
          : [
              {
                label: "전체 수강생",
                value: trainees?.length ?? 0,
                icon: <Users className="w-5 h-5" />,
                color: "text-primary",
                bg: "bg-primary/10",
              },
              {
                label: "SMPCC 준비",
                value: smpccCount,
                icon: <GraduationCap className="w-5 h-5" />,
                color: "text-chart-3",
                bg: "bg-chart-3/10",
              },
              {
                label: "평균 진행률",
                value: `${avgProgress}%`,
                icon: <TrendingUp className="w-5 h-5" />,
                color: "text-chart-4",
                bg: "bg-chart-4/10",
              },
            ].map((stat) => (
              <Card key={stat.label} className="shadow-sm">
                <CardContent className="pt-5">
                  <div className={`w-9 h-9 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-3`}>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
      </motion.div>

      {/* Pending review alerts */}
      {pendingCounts && pendingCounts.total > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        >
          {pendingCounts.educationPending > 0 && (
            <Card className="border-chart-2/40 bg-chart-2/5 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-chart-2 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">교육 기록 검토</p>
                      <p className="text-xs text-muted-foreground">
                        {pendingCounts.educationPending}건 대기 중
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate("/admin/education")}
                  >
                    검토하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
          {pendingCounts.coachingPending > 0 && (
            <Card className="border-chart-2/40 bg-chart-2/5 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <ClipboardList className="w-5 h-5 text-chart-2 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">코칭 기록 검토</p>
                      <p className="text-xs text-muted-foreground">
                        {pendingCounts.coachingPending}건 대기 중
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="flex-shrink-0"
                    onClick={() => navigate("/admin/coaching")}
                  >
                    검토하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Progress distribution chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">진행률 분포</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : trainees.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">수강생 데이터가 없습니다.</p>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={progressBuckets} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="range"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [`${value}명`, "수강생 수"]}
                  />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Trainees list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-foreground">수강생 별 진행 현황</h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")}>
            사용자 관리 <ArrowRight className="w-3 h-3 ml-1" />
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : trainees.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Users />
              </EmptyMedia>
              <EmptyTitle>수강생가 없습니다</EmptyTitle>
              <EmptyDescription>승인된 수강생가 있으면 이곳에 표시됩니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {trainees
              .sort((a, b) => b.overallPct - a.overallPct)
              .map((trainee) => (
                <Card
                    key={trainee._id}
                    className="shadow-sm cursor-pointer hover:shadow-md hover:border-primary/30 transition-all"
                    onClick={() => navigate(`/progress/trainee/${trainee._id}`)}
                  >
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* Avatar + name */}
                      <div className="flex items-center gap-3 flex-shrink-0 min-w-0 sm:w-48">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm flex-shrink-0">
                          {(trainee.name[0] ?? "?").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm text-foreground truncate">
                            {trainee.name}
                          </p>
                          <Badge
                            variant="secondary"
                            className="text-[10px] px-1.5 py-0 mt-0.5"
                          >
                            {trainee.certificationGoal}
                          </Badge>
                        </div>
                      </div>

                      {/* Progress details */}
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />교육
                              </span>
                              <span className="text-[11px] text-foreground font-medium">
                                {trainee.approvedEducationHours}/{trainee.educationTarget}시간
                              </span>
                            </div>
                            <Progress
                              value={Math.min(
                                (trainee.approvedEducationHours / trainee.educationTarget) * 100,
                                100,
                              )}
                              className="h-1.5"
                            />
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <ClipboardList className="w-3 h-3" />코칭
                              </span>
                              <span className="text-[11px] text-foreground font-medium">
                                {trainee.approvedCoachingHours}/{trainee.coachingTarget}시간
                              </span>
                            </div>
                            <Progress
                              value={Math.min(
                                (trainee.approvedCoachingHours / trainee.coachingTarget) * 100,
                                100,
                              )}
                              className="h-1.5"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Overall % */}
                      <div className="flex-shrink-0 text-right sm:w-20">
                        <p className="text-xl font-bold text-foreground">
                          {trainee.overallPct}%
                        </p>
                        <p className="text-[10px] text-muted-foreground">종합 진행률</p>
                        {(trainee.educationPendingCount + trainee.coachingPendingCount) > 0 && (
                          <p className="text-[10px] text-chart-2 mt-0.5">
                            검토대기 {trainee.educationPendingCount + trainee.coachingPendingCount}건
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
