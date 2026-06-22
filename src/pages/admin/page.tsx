import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import {
  Users,
  BookOpen,
  ClipboardList,
  Clock,
  TrendingUp,
  CheckCircle2,
  ArrowRight,
  Target,
  Award,
  AlertTriangle,
  UserCheck,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  accent,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  accent?: "warning" | "success" | "default";
  delay?: number;
}) {
  const accentClass =
    accent === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : accent === "success"
        ? "bg-chart-4/10 text-chart-4"
        : "bg-primary/10 text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay ?? 0 }}
    >
      <Card className="shadow-sm">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Quick action card ────────────────────────────────────────────────────────
function QuickActionCard({
  icon,
  title,
  description,
  badge,
  href,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: number;
  href: string;
  delay?: number;
}) {
  const navigate = useNavigate();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay ?? 0 }}
    >
      <Card
        className="shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => navigate(href)}
      >
        <CardContent className="pt-5 pb-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground">{title}</p>
                  {badge !== undefined && badge > 0 && (
                    <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/20 hover:bg-amber-500/15 text-xs px-1.5 py-0">
                      {badge}건
                    </Badge>
                  )}
                  {badge === 0 && (
                    <Badge
                      variant="secondary"
                      className="text-xs px-1.5 py-0 text-muted-foreground"
                    >
                      없음
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Trainee row ──────────────────────────────────────────────────────────────
type TraineeSummary = {
  _id: string;
  name: string;
  email: string;
  certificationGoal: string;
  approvedEducationHours: number;
  approvedCoachingHours: number;
  educationTarget: number;
  coachingTarget: number;
  overallPct: number;
  educationPendingCount: number;
  coachingPendingCount: number;
};

function TraineeRow({ trainee, index }: { trainee: TraineeSummary; index: number }) {
  const educationPct = Math.min(
    Math.round((trainee.approvedEducationHours / trainee.educationTarget) * 100),
    100,
  );
  const coachingPct = Math.min(
    Math.round((trainee.approvedCoachingHours / trainee.coachingTarget) * 100),
    100,
  );
  const hasPending = trainee.educationPendingCount + trainee.coachingPendingCount > 0;

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.05 * index }}
      className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
    >
      {/* Name + email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
            {trainee.name[0]?.toUpperCase() ?? "?"}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{trainee.name}</p>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{trainee.email}</p>
          </div>
        </div>
      </td>

      {/* Goal */}
      <td className="px-4 py-3">
        <Badge
          variant={trainee.certificationGoal === "KPC" ? "default" : "secondary"}
          className="text-xs"
        >
          {trainee.certificationGoal}
        </Badge>
      </td>

      {/* Education progress */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">
              {trainee.approvedEducationHours}시간
            </span>
            <span className="text-muted-foreground">/{trainee.educationTarget}시간</span>
          </div>
          <Progress value={educationPct} className="h-1.5" />
        </div>
      </td>

      {/* Coaching progress */}
      <td className="px-4 py-3 hidden md:table-cell">
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">
              {trainee.approvedCoachingHours}시간
            </span>
            <span className="text-muted-foreground">/{trainee.coachingTarget}시간</span>
          </div>
          <Progress value={coachingPct} className="h-1.5" />
        </div>
      </td>

      {/* Overall */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm font-bold ${trainee.overallPct >= 100 ? "text-chart-4" : trainee.overallPct >= 50 ? "text-primary" : "text-muted-foreground"}`}
          >
            {trainee.overallPct}%
          </span>
          {hasPending && (
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          )}
        </div>
      </td>
    </motion.tr>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
const PIE_COLORS = ["#2563eb", "#7c3aed"];

export default function AdminDashboardPage() {
  const stats = useQuery(api.admin.getAdminStats);
  const trainees = useQuery(api.progress.getAllTraineesProgress);
  const resetAllData = useMutation(api.admin.resetData.resetAllData);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isLoadingStats = stats === undefined;
  const isLoadingTrainees = trainees === undefined;

  const pieData =
    stats && stats.smpccTrainees > 0
      ? [{ name: "SMPCC", value: stats.smpccTrainees }]
      : [];

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await resetAllData({});
      toast.success("모든 테스트 데이터가 삭제되었습니다.");
      setShowResetDialog(false);
    } catch {
      toast.error("데이터 삭제에 실패했습니다.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      {/* ── Reset confirm dialog ── */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              테스트 데이터 초기화
            </DialogTitle>
            <DialogDescription className="pt-2 space-y-2">
              <span className="block font-medium text-foreground">정말 모든 데이터를 삭제할까요?</span>
              <span className="block text-sm">
                기수, 세미나, 출석, 교육 기록, 코칭 기록 등 모든 테스트 데이터가 영구 삭제됩니다.
                관리자 계정은 유지됩니다. 이 작업은 되돌릴 수 없습니다.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setShowResetDialog(false)} disabled={isResetting}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleReset} disabled={isResetting}>
              {isResetting ? "삭제 중..." : "전체 삭제 확인"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Page header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">관리자 대시보드</h1>
          <p className="text-sm text-muted-foreground mt-1">
            전체 교육생 현황과 검토 대기 항목을 한눈에 확인하세요.
          </p>
        </div>
        <Button
          variant="destructive"
          size="sm"
          className="flex-shrink-0 gap-1.5"
          onClick={() => setShowResetDialog(true)}
          disabled
        >
          <Trash2 className="w-4 h-4" />
          데이터 초기화
        </Button>
      </motion.div>

      {/* ── KPI stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingStats ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label="전체 사용자"
              value={stats.totalUsers}
              sub={`교육생 ${stats.approvedTrainees}명 활성`}
              delay={0.05}
            />
            <StatCard
              icon={<UserCheck className="w-5 h-5" />}
              label="가입 승인 대기"
              value={stats.pendingUsers}
              sub="신규 가입 신청"
              accent={stats.pendingUsers > 0 ? "warning" : "success"}
              delay={0.1}
            />
            <StatCard
              icon={<BookOpen className="w-5 h-5" />}
              label="교육 기록 검토"
              value={stats.pendingEducationReviews}
              sub="승인 대기중"
              accent={stats.pendingEducationReviews > 0 ? "warning" : "success"}
              delay={0.15}
            />
            <StatCard
              icon={<ClipboardList className="w-5 h-5" />}
              label="코칭 기록 검토"
              value={stats.pendingCoachingReviews}
              sub="승인 대기중"
              accent={stats.pendingCoachingReviews > 0 ? "warning" : "success"}
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* ── Quick actions + pie chart ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions */}
        <div className="lg:col-span-2 space-y-3">
          <motion.h2
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="text-sm font-semibold text-foreground"
          >
            빠른 검토 메뉴
          </motion.h2>
          <QuickActionCard
            icon={<Users className="w-4 h-4" />}
            title="사용자 관리"
            description="가입 승인 및 역할 관리"
            badge={isLoadingStats ? undefined : stats.pendingUsers}
            href="/admin/users"
            delay={0.28}
          />
          <QuickActionCard
            icon={<BookOpen className="w-4 h-4" />}
            title="교육 기록 검토"
            description="교육 이수 기록 승인/반려"
            badge={isLoadingStats ? undefined : stats.pendingEducationReviews}
            href="/admin/education"
            delay={0.32}
          />
          <QuickActionCard
            icon={<ClipboardList className="w-4 h-4" />}
            title="코칭 기록 검토"
            description="코칭 실습 기록 승인/반려"
            badge={isLoadingStats ? undefined : stats.pendingCoachingReviews}
            href="/admin/coaching"
            delay={0.36}
          />
        </div>

        {/* Pie chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="shadow-sm h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                교육생 인증 과정 분포
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center pb-4">
              {isLoadingStats ? (
                <Skeleton className="w-36 h-36 rounded-full" />
              ) : pieData.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <Target className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p>교육생 데이터 없음</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((_, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [`${value}명`, name]}
                    />
                    <Legend
                      formatter={(value: string) => (
                        <span className="text-xs text-foreground">{value}</span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
              {!isLoadingStats && stats.approvedTrainees > 0 && (
                <p className="text-xs text-muted-foreground text-center mt-1">
                  총 {stats.approvedTrainees}명 활성 교육생
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── Trainee progress table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
      >
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                교육생 진행 현황
                {!isLoadingTrainees && (
                  <span className="text-muted-foreground font-normal text-xs">
                    ({trainees.length}명)
                  </span>
                )}
              </CardTitle>
              {!isLoadingTrainees && trainees.some((t) => t.overallPct >= 100) && (
                <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15 text-xs">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  목표 달성자 있음
                </Badge>
              )}
            </div>
          </CardHeader>

          {isLoadingTrainees ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : trainees.length === 0 ? (
            <div className="p-4">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>활성 교육생이 없습니다</EmptyTitle>
                  <EmptyDescription>
                    가입 신청을 승인하면 수강생 현황이 여기에 표시됩니다.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      수강생
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      목표
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">
                      교육 이수
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground hidden md:table-cell">
                      코칭 실습
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">
                      전체
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {trainees
                    .sort((a, b) => b.overallPct - a.overallPct)
                    .map((trainee, idx) => (
                      <TraineeRow key={trainee._id} trainee={trainee} index={idx} />
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Legend */}
        {!isLoadingTrainees && trainees.some((t) => t.educationPendingCount + t.coachingPendingCount > 0) && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            검토 대기 항목이 있는 수강생가 있습니다
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 py-0 text-xs text-primary hover:text-primary"
              onClick={() => {}}
            >
              교육 검토 →
            </Button>
          </p>
        )}
      </motion.div>

      {/* ── Total pending notice ── */}
      {!isLoadingStats && stats.totalPendingReviews === 0 && stats.pendingUsers === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-chart-4/8 border border-chart-4/20"
        >
          <CheckCircle2 className="w-5 h-5 text-chart-4 flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-medium">모든 항목이 처리되었습니다.</span>{" "}
            <span className="text-muted-foreground">검토 대기 기록과 가입 신청이 없습니다.</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
