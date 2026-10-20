import { useState, useMemo } from "react";
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
  GraduationCap,
  CalendarDays,
  Sparkles,
  Search,
  ExternalLink,
  Layers,
  ChevronRight,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.tsx";
import { Input } from "@/components/ui/input.tsx";
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
  accent?: "warning" | "success" | "default" | "primary";
  delay?: number;
}) {
  const accentClass =
    accent === "warning"
      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
      : accent === "success"
        ? "bg-chart-4/10 text-chart-4"
        : accent === "primary"
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "bg-primary/10 text-primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: delay ?? 0 }}
    >
      <Card className="shadow-xs border border-border/80 hover:shadow-sm transition-shadow">
        <CardContent className="pt-5 pb-5">
          <div className="flex items-start gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${accentClass}`}>
              {icon}
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground font-medium">{label}</p>
              <p className="text-2xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
              {sub && <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>}
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
  badgeText,
  href,
  delay,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: number;
  badgeText?: string;
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
        className="shadow-xs hover:shadow-md hover:border-primary/40 transition-all cursor-pointer group"
        onClick={() => navigate(href)}
      >
        <CardContent className="pt-4 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                {icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground">{title}</p>
                  {badge !== undefined && badge > 0 && (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs px-1.5 py-0">
                      {badge}건 대기
                    </Badge>
                  )}
                  {badgeText && (
                    <Badge variant="outline" className="text-xs px-1.5 py-0 border-primary/30 text-primary">
                      {badgeText}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{description}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Trainee Progress Row ─────────────────────────────────────────────────────
type TraineeProgressItem = {
  _id: Id<"users">;
  name: string;
  email: string;
  avatarUrl: string | null;
  cohortName: string;
  cohortId: Id<"cohorts"> | null;
  certificationGoal: string;
  approvedEducationHours: number;
  approvedCoachingHours: number;
  educationTarget: number;
  coachingTarget: number;
  overallPct: number;
  educationPendingCount: number;
  coachingPendingCount: number;
  attendanceRate: number;
  coachName: string | null;
};

function TraineeRow({
  trainee,
  index,
  onAnalyze,
}: {
  trainee: TraineeProgressItem;
  index: number;
  onAnalyze: (userId: string) => void;
}) {
  const educationPct = Math.min(
    Math.round((trainee.approvedEducationHours / trainee.educationTarget) * 100),
    100,
  );
  const coachingPct = Math.min(
    Math.round((trainee.approvedCoachingHours / trainee.coachingTarget) * 100),
    100,
  );
  const hasPending = trainee.educationPendingCount + trainee.coachingPendingCount > 0;
  const initial = trainee.name[0]?.toUpperCase() ?? "?";

  return (
    <motion.tr
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.03 * Math.min(index, 15) }}
      className="border-b border-border/60 last:border-0 hover:bg-muted/40 transition-colors"
    >
      {/* Name + avatar + email */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar className="w-8 h-8 rounded-full border border-border">
            {trainee.avatarUrl && <AvatarImage src={trainee.avatarUrl} alt={trainee.name} />}
            <AvatarFallback className="bg-primary/10 text-primary font-bold text-xs">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-foreground truncate">{trainee.name}</span>
              {hasPending && (
                <span
                  title={`검토 대기: 교육 ${trainee.educationPendingCount}건, 코칭 ${trainee.coachingPendingCount}건`}
                  className="inline-flex"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground truncate hidden sm:block">{trainee.email}</p>
          </div>
        </div>
      </td>

      {/* Supervisor Coach */}
      <td className="px-4 py-3 hidden md:table-cell">
        {trainee.coachName ? (
          <Badge variant="outline" className="text-xs font-normal bg-muted/40">
            {trainee.coachName} 코치
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">미배정</span>
        )}
      </td>

      {/* Goal */}
      <td className="px-4 py-3">
        <Badge
          variant={trainee.certificationGoal === "KPC" ? "secondary" : "default"}
          className="text-xs font-medium"
        >
          {trainee.certificationGoal}
        </Badge>
      </td>

      {/* Attendance */}
      <td className="px-4 py-3 hidden lg:table-cell">
        <div className="space-y-1 w-24">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground font-medium">출석률</span>
            <span
              className={`font-semibold ${
                trainee.attendanceRate >= 80
                  ? "text-chart-4"
                  : trainee.attendanceRate > 0
                    ? "text-primary"
                    : "text-muted-foreground"
              }`}
            >
              {trainee.attendanceRate}%
            </span>
          </div>
          <Progress value={trainee.attendanceRate} className="h-1.5" />
        </div>
      </td>

      {/* Education progress */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="space-y-1 w-28">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">
              {trainee.approvedEducationHours}h
            </span>
            <span className="text-muted-foreground">/{trainee.educationTarget}h</span>
          </div>
          <Progress value={educationPct} className="h-1.5" />
        </div>
      </td>

      {/* Coaching progress */}
      <td className="px-4 py-3 hidden sm:table-cell">
        <div className="space-y-1 w-28">
          <div className="flex justify-between text-xs">
            <span className="text-foreground font-medium">
              {trainee.approvedCoachingHours}h
            </span>
            <span className="text-muted-foreground">/{trainee.coachingTarget}h</span>
          </div>
          <Progress value={coachingPct} className="h-1.5" />
        </div>
      </td>

      {/* Overall % */}
      <td className="px-4 py-3">
        <span
          className={`text-sm font-bold ${
            trainee.overallPct >= 100
              ? "text-chart-4"
              : trainee.overallPct >= 50
                ? "text-primary"
                : "text-muted-foreground"
          }`}
        >
          {trainee.overallPct}%
        </span>
      </td>

      {/* Action / AI Quality Analysis Button */}
      <td className="px-4 py-3 text-right">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-2 gap-1 text-primary hover:text-primary hover:bg-primary/5"
          onClick={() => onAnalyze(trainee._id)}
        >
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="hidden sm:inline">실습 분석</span>
        </Button>
      </td>
    </motion.tr>
  );
}

// ── Main Admin Dashboard Page ────────────────────────────────────────────────
const PIE_COLORS = ["#2563eb", "#7c3aed", "#10b981", "#f59e0b"];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  // Selected cohort state: "active" (default 18기), specific cohortId, or "all"
  const [selectedCohortId, setSelectedCohortId] = useState<string>("active");
  const [searchTerm, setSearchTerm] = useState("");
  const [goalFilter, setGoalFilter] = useState<"all" | "SMPCC" | "KPC">("all");

  // Query cohort-centric dashboard data
  const cohortQueryArg =
    selectedCohortId === "all"
      ? "all"
      : selectedCohortId === "active"
        ? undefined
        : (selectedCohortId as Id<"cohorts">);

  const dashboardData = useQuery(api.admin.getCohortDashboardData, {
    cohortId: cohortQueryArg,
  });

  const resetAllData = useMutation(api.admin.resetData.resetAllData);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const isLoading = dashboardData === undefined;
  const activeCohort = dashboardData?.currentActiveCohort;
  const currentCohort = dashboardData?.selectedCohort;
  const kpis = dashboardData?.kpis;
  const trainees = dashboardData?.trainees ?? [];
  const seminars = dashboardData?.seminars ?? [];
  const coachingGroups = dashboardData?.coachingGroups ?? [];

  // Filter trainees based on search and goal
  const filteredTrainees = useMemo(() => {
    return trainees.filter((t) => {
      const matchSearch =
        searchTerm.trim() === "" ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.coachName && t.coachName.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchGoal = goalFilter === "all" || t.certificationGoal === goalFilter;

      return matchSearch && matchGoal;
    });
  }, [trainees, searchTerm, goalFilter]);

  // Pie chart data for certification goals
  const pieData = useMemo(() => {
    if (!trainees.length) return [];
    const counts: Record<string, number> = {};
    for (const t of trainees) {
      const goal = t.certificationGoal || "SMPCC";
      counts[goal] = (counts[goal] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [trainees]);

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

  const handleAnalyzeTrainee = (userId: string) => {
    navigate(`/admin/coaching-analysis/${userId}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-7">
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

      {/* ── Page Header with Cohort Selector ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-5"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">관리자 대시보드</h1>
            {currentCohort && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5">
                {currentCohort.status === "active" ? "🟢 진행중" : currentCohort.status}
              </Badge>
            )}
          </div>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            {currentCohort ? (
              <>
                <span className="font-semibold text-foreground">{currentCohort.name}</span> 중심의 실시간 교육생 이수 현황 및 품질 지표입니다.
              </>
            ) : (
              "전체 기수 종합 현황과 검토 대기 항목을 확인하세요."
            )}
          </p>
        </div>

        {/* Cohort Selector */}
        <div className="flex items-center gap-2.5">
          <Select
            value={selectedCohortId}
            onValueChange={(val) => {
              setSelectedCohortId(val);
            }}
          >
            <SelectTrigger className="w-[210px] h-9 text-xs font-medium bg-card shadow-xs">
              <GraduationCap className="w-4 h-4 mr-1 text-primary shrink-0" />
              <SelectValue placeholder="기수 선택" />
            </SelectTrigger>
            <SelectContent>
              {activeCohort && (
                <SelectItem value="active" className="font-semibold text-primary">
                  🟢 {activeCohort.name} (현재 진행중)
                </SelectItem>
              )}
              {dashboardData?.cohorts
                ?.filter((c) => c._id !== activeCohort?._id)
                .map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    {c.name} {c.status === "completed" ? "(수료)" : `(${c.status})`}
                  </SelectItem>
                ))}
              <SelectItem value="all" className="text-muted-foreground font-medium">
                🌐 전체 기수 종합 현황
              </SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs gap-1.5 hidden sm:flex shrink-0"
            onClick={() => navigate("/admin/cohorts")}
          >
            <Layers className="w-3.5 h-3.5" />
            기수 관리
          </Button>
        </div>
      </motion.div>

      {/* ── Active Cohort Hero Spotlight Banner ── */}
      {currentCohort && (
        <motion.div
          initial={{ opacity: 0, scale: 0.99 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-card border border-primary/20 p-5 md:p-6 shadow-xs"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                  {currentCohort.status === "active" ? "현재 진행 기수" : currentCohort.status}
                </span>
                <span className="text-xs text-muted-foreground font-medium">
                  {currentCohort.startDate} ~ {currentCohort.endDate}
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                {currentCohort.name} 코칭 전문가 과정
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground max-w-2xl">
                {currentCohort.description || "SMPCC 및 KPC 자격 취득을 위한 정규 실습 및 세미나 집중 코스"}
              </p>
            </div>

            {/* Quick Cohort Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-xs gap-1.5 shadow-xs hover:bg-primary/5"
                onClick={() => navigate("/admin/attendance")}
              >
                <Users className="w-3.5 h-3.5 text-primary" />
                출석부 관리
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="bg-card text-xs gap-1.5 shadow-xs hover:bg-primary/5"
                onClick={() => navigate("/admin/seminars")}
              >
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                세미나 일정
              </Button>
              <Button
                variant="default"
                size="sm"
                className="text-xs gap-1.5 shadow-xs"
                onClick={() => navigate("/admin/coaching-analysis")}
              >
                <Sparkles className="w-3.5 h-3.5" />
                AI 품질분석 현황
              </Button>
            </div>
          </div>

          {/* Quick Metrics Bar in Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-4 border-t border-primary/10">
            <div>
              <p className="text-xs text-muted-foreground">재적 교육생</p>
              <p className="text-lg md:text-xl font-bold text-foreground mt-0.5">
                {kpis?.approvedTrainees ?? 0}명
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">세미나 회차</p>
              <p className="text-lg md:text-xl font-bold text-foreground mt-0.5">
                {kpis?.seminarCount ?? 0}회차
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">코칭 실습 조</p>
              <p className="text-lg md:text-xl font-bold text-foreground mt-0.5">
                {coachingGroups.length}개 조
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">평균 출석률</p>
              <p className="text-lg md:text-xl font-bold text-chart-4 mt-0.5">
                {kpis?.averageAttendanceRate ?? 0}%
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* ── 4 KPI Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Users className="w-5 h-5" />}
              label={currentCohort ? `${currentCohort.name} 재적 교육생` : "전체 재적 교육생"}
              value={`${kpis?.approvedTrainees ?? 0}명`}
              sub={`전체 회원 ${kpis?.totalUsers ?? 0}명 (가입대기 ${kpis?.pendingUsers ?? 0}명)`}
              delay={0.05}
            />
            <StatCard
              icon={<Clock className="w-5 h-5" />}
              label="코칭 실습 누적"
              value={`${kpis?.totalCoachingHours ?? 0}시간`}
              sub={`교육생 1인당 평균 ${kpis?.averageCoachingHours ?? 0}시간`}
              accent="primary"
              delay={0.1}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="세미나 평균 출석률"
              value={`${kpis?.averageAttendanceRate ?? 0}%`}
              sub={`총 ${kpis?.seminarCount ?? 0}회차 세미나 기준`}
              accent={(kpis?.averageAttendanceRate ?? 0) >= 80 ? "success" : "default"}
              delay={0.15}
            />
            <StatCard
              icon={<ClipboardList className="w-5 h-5" />}
              label="검토 대기 항목"
              value={`${kpis?.totalPending ?? 0}건`}
              sub={`교육 ${kpis?.pendingEducation ?? 0}건 · 코칭 ${kpis?.pendingCoaching ?? 0}건`}
              accent={(kpis?.totalPending ?? 0) > 0 ? "warning" : "success"}
              delay={0.2}
            />
          </>
        )}
      </div>

      {/* ── Quick review actions + Cohort Groups / Seminars ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick actions (2 cols) */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <span>빠른 검토 및 현황 바로가기</span>
            </h2>
            <span className="text-xs text-muted-foreground">승인 및 심사 관리</span>
          </div>

          <QuickActionCard
            icon={<BookOpen className="w-4 h-4" />}
            title="교육 기록 검토"
            description="교육 이수 및 특강 출석 기록 승인/반려"
            badge={isLoading ? undefined : kpis?.pendingEducation}
            href="/admin/education"
            delay={0.24}
          />
          <QuickActionCard
            icon={<ClipboardList className="w-4 h-4" />}
            title="코칭 실습 기록 검토"
            description="1:1 코칭, 그룹 코칭 실습일지 승인/반려"
            badge={isLoading ? undefined : kpis?.pendingCoaching}
            href="/admin/coaching"
            delay={0.28}
          />
          <QuickActionCard
            icon={<Sparkles className="w-4 h-4" />}
            title="교육생 코칭 실습 AI 품질 분석"
            description="KAC/KPC 8대 핵심역량 기준 AI 자동 채점 및 성장 추세선 분석"
            badgeText="AI 분석"
            href="/admin/coaching-analysis"
            delay={0.32}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickActionCard
              icon={<Users className="w-4 h-4" />}
              title="사용자 관리"
              description="가입 승인 및 기수/역할 부여"
              badge={isLoading ? undefined : kpis?.pendingUsers}
              href="/admin/users"
              delay={0.36}
            />
            <QuickActionCard
              icon={<UserCheck className="w-4 h-4" />}
              title="수퍼바이저 매칭 관리"
              description="수강생별 담당 코치 배정 현황"
              href="/admin/assignments"
              delay={0.4}
            />
          </div>
        </div>

        {/* Right side: Cohort Groups & Seminars (1 col) */}
        <div>
          <Card className="shadow-xs h-full border border-border/80">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                {currentCohort ? `${currentCohort.name} 스터디 & 세미나` : "인증 과정 현황"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {currentCohort ? (
                <Tabs defaultValue="groups" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-3 h-8">
                    <TabsTrigger value="groups" className="text-xs">
                      조 편성 ({coachingGroups.length})
                    </TabsTrigger>
                    <TabsTrigger value="seminars" className="text-xs">
                      세미나 ({seminars.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Groups tab */}
                  <TabsContent value="groups" className="space-y-2 mt-0 max-h-[260px] overflow-y-auto pr-1">
                    {coachingGroups.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        등록된 조 편성 정보가 없습니다.
                      </div>
                    ) : (
                      coachingGroups.map((group) => (
                        <div
                          key={group._id}
                          className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1.5"
                        >
                          <div className="flex items-center justify-between font-semibold text-foreground">
                            <span>{group.groupName}</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              {group.memberCount}명
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {group.memberNames.map((name, i) => (
                              <span
                                key={i}
                                className="inline-block px-1.5 py-0.5 rounded bg-background border border-border text-[11px] text-muted-foreground"
                              >
                                {name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Seminars tab */}
                  <TabsContent value="seminars" className="space-y-2 mt-0 max-h-[260px] overflow-y-auto pr-1">
                    {seminars.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-xs">
                        등록된 세미나 일정이 없습니다.
                      </div>
                    ) : (
                      seminars.map((seminar) => (
                        <div
                          key={seminar._id}
                          className="p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs space-y-1"
                        >
                          <div className="flex items-center justify-between font-medium text-foreground">
                            <span className="truncate pr-2">
                              {seminar.sessionNumber ? `${seminar.sessionNumber}회차 ` : ""}
                              {seminar.title}
                            </span>
                            <Badge
                              variant={seminar.isOnline ? "outline" : "secondary"}
                              className="text-[10px] px-1 py-0 shrink-0"
                            >
                              {seminar.isOnline ? "온라인" : "오프라인"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {seminar.startDate}
                            {seminar.location ? ` · ${seminar.location}` : ""}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              ) : (
                /* Pie Chart in ALL mode */
                <div className="flex flex-col items-center justify-center">
                  {pieData.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-xs">
                      교육생 데이터 없음
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {pieData.map((_, idx) => (
                            <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value}명`, name]} />
                        <Legend
                          formatter={(value: string) => (
                            <span className="text-xs text-foreground">{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Main Trainee Progress Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.35 }}
      >
        <Card className="shadow-xs overflow-hidden border border-border/80">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  {currentCohort ? `${currentCohort.name} 교육생 진행 현황` : "전체 교육생 진행 현황"}
                </CardTitle>
                <Badge variant="secondary" className="text-xs px-2 py-0">
                  {filteredTrainees.length}명
                </Badge>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="이름, 이메일, 코치 검색..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-8 pl-8 text-xs bg-muted/30"
                  />
                </div>
                <Select
                  value={goalFilter}
                  onValueChange={(val) => setGoalFilter(val as typeof goalFilter)}
                >
                  <SelectTrigger className="w-24 h-8 text-xs">
                    <SelectValue placeholder="과정" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 과정</SelectItem>
                    <SelectItem value="SMPCC">SMPCC</SelectItem>
                    <SelectItem value="KPC">KPC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : filteredTrainees.length === 0 ? (
            <div className="p-8">
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>조건에 맞는 교육생이 없습니다</EmptyTitle>
                  <EmptyDescription>
                    {searchTerm
                      ? "검색어를 확인하거나 필터를 변경해 보세요."
                      : `${currentCohort?.name ?? "선택된 기수"}에 배정된 승인 교육생이 없습니다.`}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30">
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      수강생
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden md:table-cell">
                      수퍼바이저
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      목표 과정
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden lg:table-cell">
                      출석률
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      교육 이수
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                      코칭 실습
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                      종합
                    </th>
                    <th className="px-4 py-2.5 text-xs font-semibold text-muted-foreground text-right">
                      품질 분석
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTrainees.map((trainee, idx) => (
                    <TraineeRow
                      key={trainee._id}
                      trainee={trainee}
                      index={idx}
                      onAnalyze={handleAnalyzeTrainee}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Legend */}
        {!isLoading && filteredTrainees.some((t) => t.educationPendingCount + t.coachingPendingCount > 0) && (
          <div className="mt-2.5 flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              노란색 아이콘은 검토 대기 중인 교육 기록 또는 코칭 실습일지가 있음을 의미합니다.
            </span>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-primary hover:text-primary"
                onClick={() => navigate("/admin/coaching")}
              >
                코칭 검토 바로가기 →
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Clean status notice ── */}
      {!isLoading && (kpis?.totalPending ?? 0) === 0 && (kpis?.pendingUsers ?? 0) === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex items-center gap-3 px-4 py-3 rounded-xl bg-chart-4/8 border border-chart-4/20"
        >
          <CheckCircle2 className="w-5 h-5 text-chart-4 flex-shrink-0" />
          <p className="text-sm text-foreground">
            <span className="font-semibold">모든 검토 및 가입 요청이 처리되었습니다.</span>{" "}
            <span className="text-muted-foreground">현재 대기 중인 항목이 없습니다.</span>
          </p>
        </motion.div>
      )}
    </div>
  );
}
