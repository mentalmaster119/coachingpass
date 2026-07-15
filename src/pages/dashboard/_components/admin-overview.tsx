import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Users, Clock, CheckCircle2, AlertTriangle, ArrowRight,
  BookOpen, ClipboardList, Award, MessageSquareDot, UserCheck, TrendingUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import SetNameBanner from "./set-name-banner.tsx";

type User = Doc<"users">;

const CERT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  submitted: { label: "신청", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  under_review: { label: "검토중", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "승인", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { label: "반려", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];

export default function AdminOverview({ user }: { user: User }) {
  const navigate = useNavigate();
  const stats = useQuery(api.dashboard.getAdminDashboardStats);
  const pendingReviews = useQuery(api.progress.getPendingReviewCounts);
  const recentApps = useQuery(api.dashboard.getRecentCertApplications);
  const allUsers = useQuery(api.admin.getAllUsers);
  const pendingUsers = useQuery(api.admin.getPendingUsers);
  const cohortStats = useQuery(api.dashboard.getCohortActivityStats);

  const isLoading = stats === undefined || allUsers === undefined;
  const pendingCount = pendingUsers?.length ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* 이름 미설정 배너 */}
      {!user?.name && <SetNameBanner />}

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold">관리자 대시보드</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })} 기준
          </p>
        </div>
        <Button onClick={() => navigate("/admin/users")}>
          사용자 관리 <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </motion.div>

      {/* ── Key metrics ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "전체 사용자",
            value: stats?.totalUsers,
            icon: <Users className="w-4 h-4" />,
            color: "text-primary",
            bg: "bg-primary/10",
          },
          {
            label: "승인 대기",
            value: pendingCount,
            icon: <Clock className="w-4 h-4" />,
            color: "text-amber-600",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            urgent: pendingCount > 0,
          },
          {
            label: "수강생",
            value: stats?.traineeCount,
            icon: <CheckCircle2 className="w-4 h-4" />,
            color: "text-green-600",
            bg: "bg-green-50 dark:bg-green-900/20",
          },
          {
            label: "배정 없는 수강생",
            value: stats?.unassignedTrainees,
            icon: <UserCheck className="w-4 h-4" />,
            color: "text-orange-600",
            bg: "bg-orange-50 dark:bg-orange-900/20",
            urgent: (stats?.unassignedTrainees ?? 0) > 0,
          },
        ].map((stat) => (
          <Card key={stat.label} className={stat.urgent ? "border-amber-300 dark:border-amber-700" : ""}>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                <>
                  <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color} mb-2`}>
                    {stat.icon}
                  </div>
                  <p className="text-2xl font-bold">{stat.value ?? 0}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Secondary stats row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 sm:grid-cols-4 gap-4"
      >
        {[
          {
            label: "자격증 신청(대기)",
            value: stats === undefined ? "..." : `${stats.certSubmitted + stats.certUnderReview}건`,
            icon: <Award className="w-4 h-4 text-blue-600" />,
            href: "/admin/certification",
          },
          {
            label: "피드백 누적",
            value: stats === undefined ? "..." : `${stats.feedbackTotal}건`,
            icon: <MessageSquareDot className="w-4 h-4 text-purple-600" />,
            href: "/admin/feedback",
          },
          {
            label: "검토 대기(기록)",
            value: pendingReviews === undefined ? "..." : `${pendingReviews.total}건`,
            icon: <ClipboardList className="w-4 h-4 text-orange-600" />,
            href: "/admin/coaching",
          },
          {
            label: "자격증 승인 완료",
            value: stats === undefined ? "..." : `${stats.certApproved}건`,
            icon: <CheckCircle2 className="w-4 h-4 text-green-600" />,
            href: "/admin/certification",
          },
        ].map((item) => (
          <Card key={item.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(item.href)}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                {item.icon}
              </div>
              <div>
                <p className="text-lg font-bold">{item.value}</p>
                <p className="text-xs text-muted-foreground">{item.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* ── Alerts ── */}
      {(pendingCount > 0 || (pendingReviews?.total ?? 0) > 0 || (stats?.unassignedTrainees ?? 0) > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="space-y-3"
        >
          {pendingCount > 0 && (
            <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
              <CardContent className="pt-4 pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <p className="text-sm text-amber-700 dark:text-amber-400">
                      가입 승인 대기 <strong>{pendingCount}건</strong>
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate("/admin/users")}>검토하기</Button>
                </div>
              </CardContent>
            </Card>
          )}
          {(pendingReviews?.total ?? 0) > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {(pendingReviews?.educationPending ?? 0) > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">교육 기록 검토</p>
                          <p className="text-xs text-muted-foreground">{pendingReviews!.educationPending}건 대기</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => navigate("/admin/education")}>검토하기</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {(pendingReviews?.coachingPending ?? 0) > 0 && (
                <Card className="border-primary/20 bg-primary/5">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <ClipboardList className="w-4 h-4 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-sm">코칭 기록 검토</p>
                          <p className="text-xs text-muted-foreground">{pendingReviews!.coachingPending}건 대기</p>
                        </div>
                      </div>
                      <Button size="sm" onClick={() => navigate("/admin/coaching")}>검토하기</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </motion.div>
      )}

      {/* ── Charts row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Monthly registrations bar chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              월별 신규 가입 현황 (최근 6개월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats === undefined ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={stats.monthlyRegistrations} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number) => [`${value}명`, "가입자"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="count" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* KAC/KPC distribution pie chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              수강생 자격증 목표 분포
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats === undefined ? (
              <Skeleton className="h-40 w-full" />
            ) : stats.traineeCount === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                수강생 데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={stats.certDistribution.filter((d) => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                    labelLine={false}
                  >
                    {stats.certDistribution.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value}명`]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Cohort activity chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              기수별 코칭 활동 현황
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cohortStats === undefined ? (
              <Skeleton className="h-48 w-full" />
            ) : cohortStats.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                활성 기수 데이터 없음
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={cohortStats} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="cohortName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "totalLogs") return [`${value}건`, "전체 기록"];
                      if (name === "approvedLogs") return [`${value}건`, "승인 기록"];
                      if (name === "totalHours") return [`${value}시간`, "누적 코칭"];
                      return [value, name];
                    }}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend
                    formatter={(value: string) => {
                      if (value === "totalLogs") return "전체 기록";
                      if (value === "approvedLogs") return "승인 기록";
                      if (value === "totalHours") return "누적 코칭(시간)";
                      return value;
                    }}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="totalLogs" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="approvedLogs" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="totalHours" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Recent cert applications + recent users ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Recent certification applications */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-muted-foreground" />
              최근 자격증 신청
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/admin/certification")}>
              전체 보기 <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentApps === undefined ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentApps.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">신청 내역이 없습니다</p>
            ) : (
              <div className="divide-y divide-border">
                {recentApps.map((app) => {
                  const s = CERT_STATUS_LABELS[app.status];
                  let dateStr = "";
                  try {
                    dateStr = format(new Date(app.submittedAt), "M/d", { locale: ko });
                  } catch { /* ignore */ }
                  return (
                    <div key={app._id} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{app.userName}</p>
                        <p className="text-xs text-muted-foreground">{app.certificationGoal} · {dateStr}</p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${s.color}`}>
                        {s.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent users */}
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              최근 가입자
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate("/admin/users")}>
              전체 보기 <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : allUsers && allUsers.length > 0 ? (
              <div className="divide-y divide-border">
                {allUsers.slice(0, 5).map((u) => (
                  <div key={u._id} className="flex items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{u.name ?? "이름 미설정"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <Badge
                      variant={u.approvalStatus === "approved" ? "default" : u.approvalStatus === "rejected" ? "destructive" : "secondary"}
                      className="text-[10px] flex-shrink-0"
                    >
                      {u.approvalStatus === "approved" ? "승인" : u.approvalStatus === "rejected" ? "거절" : "대기"}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">가입한 사용자가 없습니다</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
