import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  BookOpen, ClipboardList, MessageSquare, NotebookPen,
  Target, ArrowRight, Plus, TrendingUp, BarChart2,
  MessageSquareDot, Award, Calendar, CheckCircle2,
  AlertCircle, Clock, Star, ChevronRight, FileEdit,
  Quote, PenLine, CalendarDays, TrendingDown,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils.ts";
import SetNameBanner from "./set-name-banner.tsx";
import ProfileIncompleteBanner from "./profile-incomplete-banner.tsx";
import WelcomeGuideBanner from "./welcome-guide-banner.tsx";
import QuickActionWidget from "./quick-action-widget.tsx";
import ProgressSummaryCard from "@/pages/progress/_components/progress-summary-card.tsx";

type User = Doc<"users">;

const KAC_REQUIREMENTS = {
  education: { label: "교육 이수", target: 60, unit: "시간", href: "/education" },
  coaching: { label: "코칭 실습", target: 100, unit: "시간", href: "/coaching-log" },
  mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
  coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
};

const KPC_REQUIREMENTS = {
  education: { label: "교육 이수", target: 125, unit: "시간", href: "/education" },
  coaching: { label: "코칭 실습", target: 500, unit: "시간", href: "/coaching-log" },
  mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
  coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
};

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  draft: { label: "임시저장", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300" },
  pending: { label: "검토중", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "승인", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { label: "반려", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
  done: { label: "작성", color: "bg-muted text-muted-foreground" },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  education: <BookOpen className="w-3.5 h-3.5 text-blue-500" />,
  coaching: <ClipboardList className="w-3.5 h-3.5 text-green-500" />,
  reflection: <NotebookPen className="w-3.5 h-3.5 text-purple-500" />,
  mentor_coaching: <MessageSquare className="w-3.5 h-3.5 text-orange-500" />,
};

// Circular gauge using SVG
function CircularGauge({
  value,
  max = 100,
  size = 96,
  strokeWidth = 9,
  color = "hsl(var(--primary))",
  label,
  sublabel,
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label: string;
  sublabel?: string;
}) {
  const pct = Math.min(value / max, 1);
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const dash = pct * circumference;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={strokeWidth} />
          <circle
            cx={cx} cy={cy} r={r} fill="none"
            stroke={color} strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 0.6s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold leading-tight">{label}</span>
          {sublabel && <span className="text-[10px] text-muted-foreground leading-tight">{sublabel}</span>}
        </div>
      </div>
    </div>
  );
}

export default function TraineeDashboard({ user }: { user: User }) {
  const navigate = useNavigate();
  const requirements = user.certificationGoal === "KPC" ? KPC_REQUIREMENTS : KAC_REQUIREMENTS;
  const isNewUser = user._creationTime > Date.now() - 7 * 24 * 60 * 60 * 1000;

  const progressData = useQuery(api.progress.getMyProgress);
  const monthlyStats = useQuery(api.dashboard.getTraineeThisMonthStats);
  const recentActivity = useQuery(api.dashboard.getTraineeRecentActivity);
  const mentorSummary = useQuery(api.mentorCoaching.getMySummary);
  const mcciStats = useQuery(api.dashboard.getMyMcciDomainStats);
  const todayOverview = useQuery(api.dashboard.getTraineeTodayOverview);
  const attendanceStats = useQuery(api.dashboard.getMyAttendanceStats);

  const MCCI_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  const currentValues = {
    education: progressData?.approvedEducationHours ?? 0,
    coaching: progressData?.approvedCoachingHours ?? 0,
    mentoring: mentorSummary?.mentorCoachingCount ?? 0,
    coderc: mentorSummary?.coderCoCount ?? 0,
  };

  const totalRequirements = Object.values(requirements).length;
  const fulfilledRequirements = Object.entries(requirements).filter(
    ([key, req]) => currentValues[key as keyof typeof currentValues] >= req.target,
  ).length;
  const overallPct = Math.round((fulfilledRequirements / totalRequirements) * 100);

  // Last 6 months of chart data
  const chartData = progressData?.monthlyActivity?.slice(-6) ?? [];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* ── 이름 미설정 배너 ── */}
      {!user.name && <SetNameBanner />}

      {/* ── 신규 사용자 환영 가이드 배너 (가입 후 7일 이내) ── */}
      {user.name && isNewUser && <WelcomeGuideBanner name={user.name} />}

      {/* ── 프로필 미완성 배너 ── */}
      {user.name && <ProfileIncompleteBanner user={user} />}

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-start justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold">안녕하세요, {user.name || "수강생"}님!</h1>
          <p className="text-muted-foreground text-sm mt-1">오늘도 코치로의 여정을 함께합니다.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-sm px-3 py-1.5">
            <Target className="w-3.5 h-3.5 mr-1.5" />
            {user.certificationGoal ?? "목표 미설정"} 준비중
          </Badge>
          {(monthlyStats?.unreadFeedbackCount ?? 0) > 0 && (
            <button onClick={() => navigate("/feedback")}>
              <Badge className="text-sm px-3 py-1.5 bg-primary text-primary-foreground gap-1.5 cursor-pointer">
                <MessageSquareDot className="w-3.5 h-3.5" />
                새 피드백 {monthlyStats!.unreadFeedbackCount}건
              </Badge>
            </button>
          )}
        </div>
      </motion.div>

      {/* ── Motivational message ── */}
      {user.motivationalMessage ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 px-5 py-4">
            <Quote className="absolute top-3 right-4 w-10 h-10 text-primary/10" />
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Quote className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground leading-relaxed italic">"{user.motivationalMessage}"</p>
                <button onClick={() => navigate("/profile")} className="text-[11px] text-muted-foreground hover:text-primary transition-colors mt-1.5 flex items-center gap-1">
                  <PenLine className="w-3 h-3" />메시지 수정
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.03 }}>
          <button onClick={() => navigate("/profile")} className="w-full rounded-2xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors px-5 py-3.5 flex items-center gap-3 cursor-pointer">
            <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
              <Quote className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-primary">나에게 힘을 주는 메시지를 추가해보세요</p>
              <p className="text-xs text-muted-foreground">프로필에서 나만의 동기부여 메시지를 입력할 수 있습니다</p>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
          </button>
        </motion.div>
      )}

      {/* ── Quick Action Widget ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
      >
        <QuickActionWidget />
      </motion.div>

      {/* ── Progress Summary Card ── */}
      <ProgressSummaryCard user={user} />

      {/* ── KPI Summary Row: Certification + Attendance gauges + quick stats ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
      >
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              {/* Certification gauge */}
              <div className="flex flex-col items-center gap-2 text-center">
                {progressData === undefined ? (
                  <Skeleton className="w-24 h-24 rounded-full" />
                ) : (
                  <CircularGauge
                    value={overallPct}
                    max={100}
                    size={100}
                    strokeWidth={10}
                    color="hsl(var(--primary))"
                    label={`${overallPct}%`}
                    sublabel="인증 달성"
                  />
                )}
                <p className="text-xs font-medium text-muted-foreground">{user.certificationGoal ?? "SMPCC"} 요건</p>
              </div>

              <div className="w-px h-16 bg-border hidden sm:block" />

              {/* Attendance gauge */}
              <div className="flex flex-col items-center gap-2 text-center">
                {attendanceStats === undefined ? (
                  <Skeleton className="w-24 h-24 rounded-full" />
                ) : (
                  <CircularGauge
                    value={attendanceStats.attendanceRate}
                    max={100}
                    size={100}
                    strokeWidth={10}
                    color={attendanceStats.attendanceRate >= 80 ? "hsl(var(--chart-2))" : attendanceStats.attendanceRate >= 60 ? "hsl(var(--chart-3))" : "hsl(var(--destructive))"}
                    label={`${attendanceStats.attendanceRate}%`}
                    sublabel="출석률"
                  />
                )}
                <p className="text-xs font-medium text-muted-foreground">
                  {attendanceStats === undefined ? "..." : `${attendanceStats.attendedSeminars}/${attendanceStats.totalSeminars} 세미나`}
                </p>
              </div>

              <div className="w-px h-16 bg-border hidden sm:block" />

              {/* Quick stats grid */}
              <div className="flex-1 grid grid-cols-2 gap-3 w-full">
                {[
                  {
                    label: "이번달 교육",
                    value: monthlyStats === undefined ? "..." : `${monthlyStats.thisMonthEduHours}h`,
                    icon: <BookOpen className="w-3.5 h-3.5" />,
                    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
                  },
                  {
                    label: "이번달 코칭",
                    value: monthlyStats === undefined ? "..." : `${monthlyStats.thisMonthCoachHours}h`,
                    icon: <ClipboardList className="w-3.5 h-3.5" />,
                    color: "text-green-600 bg-green-50 dark:bg-green-900/20",
                  },
                  {
                    label: "이번달 성찰",
                    value: monthlyStats === undefined ? "..." : `${monthlyStats.thisMonthReflections}건`,
                    icon: <NotebookPen className="w-3.5 h-3.5" />,
                    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
                  },
                  {
                    label: "누적 코칭",
                    value: progressData === undefined ? "..." : `${Math.round(progressData.approvedCoachingHours * 10) / 10}h`,
                    icon: <Award className="w-3.5 h-3.5" />,
                    color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
                  },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", stat.color)}>
                      {stat.icon}
                    </div>
                    <div>
                      <p className="text-sm font-bold leading-tight">{stat.value}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Today overview row ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* 오늘의 할 일 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" />오늘의 할 일
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {todayOverview === undefined ? (
              <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>
            ) : (
              <div className="space-y-2">
                {[
                  { label: "코칭 로그 검토중", count: todayOverview.pendingCoachingLogs, icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, color: "text-amber-600", href: "/coaching-log" },
                  { label: "코칭 로그 반려됨", count: todayOverview.rejectedCoachingLogs, icon: <AlertCircle className="w-3.5 h-3.5 text-red-500" />, color: "text-red-600", href: "/coaching-log" },
                  { label: "임시저장 코칭 로그", count: todayOverview.draftCoachingLogs, icon: <FileEdit className="w-3.5 h-3.5 text-blue-500" />, color: "text-blue-600", href: "/coaching-log" },
                  { label: "교육 기록 검토중", count: todayOverview.pendingEducationRecords, icon: <Clock className="w-3.5 h-3.5 text-amber-500" />, color: "text-amber-600", href: "/education" },
                ]
                  .filter((item) => item.count > 0)
                  .map((item) => (
                    <button key={item.label} onClick={() => navigate(item.href)} className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">{item.icon}<span className="text-xs text-foreground">{item.label}</span></div>
                      <div className="flex items-center gap-1.5"><span className={`text-xs font-bold ${item.color}`}>{item.count}건</span><ChevronRight className="w-3 h-3 text-muted-foreground" /></div>
                    </button>
                  ))}
                {todayOverview.pendingCoachingLogs === 0 && todayOverview.rejectedCoachingLogs === 0 && todayOverview.draftCoachingLogs === 0 && todayOverview.pendingEducationRecords === 0 && (
                  <div className="flex flex-col items-center justify-center py-3 text-center">
                    <CheckCircle2 className="w-7 h-7 text-green-500 mb-1" />
                    <p className="text-xs text-muted-foreground">처리할 항목이 없어요!</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* D-day */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />다음 일정
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {todayOverview === undefined ? (
              <Skeleton className="h-16 w-full" />
            ) : todayOverview.nextEvent === null ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <Calendar className="w-7 h-7 text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">예정된 일정이 없습니다</p>
                <button onClick={() => navigate("/calendar")} className="text-xs text-primary hover:underline mt-1">일정 추가하기</button>
              </div>
            ) : (
              <button onClick={() => navigate("/calendar")} className="w-full text-left">
                <div className="flex items-center gap-3">
                  <div className={cn("flex-shrink-0 w-14 h-14 rounded-xl flex flex-col items-center justify-center font-bold",
                    todayOverview.nextEvent.daysLeft === 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30" :
                    todayOverview.nextEvent.daysLeft <= 3 ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30" :
                    "bg-primary/10 text-primary"
                  )}>
                    <span className="text-xs leading-tight">{todayOverview.nextEvent.daysLeft === 0 ? "오늘" : "D-"}</span>
                    {todayOverview.nextEvent.daysLeft > 0 && <span className="text-xl leading-tight">{todayOverview.nextEvent.daysLeft}</span>}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{todayOverview.nextEvent.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{format(parseISO(todayOverview.nextEvent.eventDate), "M월 d일 (E)", { locale: ko })}</p>
                  </div>
                </div>
              </button>
            )}
          </CardContent>
        </Card>

        {/* 최근 피드백 */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm flex items-center gap-2">
              <MessageSquareDot className="w-4 h-4 text-primary" />최근 피드백
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {todayOverview === undefined ? (
              <Skeleton className="h-16 w-full" />
            ) : todayOverview.recentFeedback === null ? (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <MessageSquare className="w-7 h-7 text-muted-foreground/40 mb-1" />
                <p className="text-xs text-muted-foreground">아직 받은 피드백이 없습니다</p>
              </div>
            ) : (
              <button onClick={() => navigate("/feedback")} className="w-full text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{todayOverview.recentFeedback.coachName} 슈퍼바이저</span>
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={cn("w-3 h-3", i < todayOverview.recentFeedback!.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/30")} />
                    ))}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{todayOverview.recentFeedback.strengths}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground/60">{format(parseISO(todayOverview.recentFeedback.feedbackDate), "M월 d일", { locale: ko })}</span>
                  {!todayOverview.recentFeedback.isRead && <Badge className="text-[10px] px-1.5 py-0 h-4 bg-primary">새 피드백</Badge>}
                </div>
              </button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Certification requirements — enhanced progress cards ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            {user.certificationGoal ?? "KAC"} 요건 달성 현황
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate("/progress")} className="cursor-pointer">
            상세보기 <TrendingUp className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(requirements).map(([key, req]) => {
            const current = currentValues[key as keyof typeof currentValues];
            const pct = Math.min((current / req.target) * 100, 100);
            const done = current >= req.target;
            const remaining = Math.max(req.target - current, 0);
            return (
              <button
                key={key}
                onClick={() => navigate(req.href)}
                className={cn(
                  "relative flex flex-col p-4 rounded-2xl border text-left transition-all hover:shadow-sm cursor-pointer",
                  done ? "border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10" : "border-border bg-card hover:border-primary/30"
                )}
              >
                {done && (
                  <CheckCircle2 className="absolute top-3 right-3 w-4 h-4 text-green-500" />
                )}
                <p className="text-xs font-medium text-muted-foreground mb-2">{req.label}</p>
                {progressData === undefined ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <>
                    <p className="text-lg font-bold leading-tight">
                      {Math.round(current * 10) / 10}
                      <span className="text-xs font-normal text-muted-foreground ml-0.5">{req.unit}</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground mb-2">/ {req.target}{req.unit}</p>
                    <div className="w-full bg-border rounded-full h-1.5 overflow-hidden">
                      <div
                        className={cn("h-full rounded-full transition-all", done ? "bg-green-500" : "bg-primary")}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className={cn("text-[10px] mt-1.5 font-medium", done ? "text-green-600" : "text-muted-foreground")}>
                      {done ? "달성 완료!" : `${Math.round(remaining * 10) / 10}${req.unit} 남음`}
                    </p>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── Monthly activity chart + MCCI pie ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14 }}
        className="grid grid-cols-1 lg:grid-cols-5 gap-4"
      >
        {/* Bar chart — spans 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              월별 활동 현황 (최근 6개월)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {progressData === undefined ? (
              <Skeleton className="h-48 w-full" />
            ) : chartData.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
                <BarChart2 className="w-8 h-8 opacity-20" />
                <p>기록이 쌓이면 차트가 표시됩니다</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}시간`, name === "educationHours" ? "교육" : "코칭"]}
                    contentStyle={{ fontSize: 12 }}
                  />
                  <Legend formatter={(value) => (value === "educationHours" ? "교육" : "코칭")} wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="educationHours" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="coachingHours" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* MCCI Pie — spans 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              MCCI 영역별 코칭
            </CardTitle>
          </CardHeader>
          <CardContent>
            {mcciStats === undefined ? (
              <Skeleton className="h-40 w-full" />
            ) : mcciStats.total === 0 || mcciStats.distribution.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2 text-center">
                <Target className="w-8 h-8 opacity-20" />
                <p className="text-xs">코칭 기록에 MCCI 영역을 입력하면 차트가 표시됩니다</p>
              </div>
            ) : (
              <div className="space-y-3">
                <ResponsiveContainer width="100%" height={140}>
                  <PieChart>
                    <Pie data={mcciStats.distribution} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3} dataKey="count" nameKey="label">
                      {mcciStats.distribution.map((_, idx) => (
                        <Cell key={idx} fill={MCCI_COLORS[idx % MCCI_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number, name: string) => [`${value}회`, name]} contentStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-1.5">
                  {mcciStats.distribution.map((d, idx) => (
                    <div key={d.domain} className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: MCCI_COLORS[idx % MCCI_COLORS.length] }} />
                        <span className="text-xs text-foreground">{d.label}</span>
                      </div>
                      <span className="text-xs font-semibold">{d.count}회</span>
                    </div>
                  ))}
                  {mcciStats.untagged > 0 && (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0 bg-muted-foreground/30" />
                        <span className="text-xs text-muted-foreground">미분류</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{mcciStats.untagged}회</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── Quick actions + recent activity ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        {/* Quick actions */}
        <div>
          <h2 className="text-base font-semibold mb-3">바로가기</h2>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { icon: <BookOpen className="w-4 h-4" />, label: "교육 기록", sub: "이수 기록 추가", href: "/education", color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
              { icon: <ClipboardList className="w-4 h-4" />, label: "코칭 기록", sub: "실습 기록 추가", href: "/coaching-log", color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
              { icon: <MessageSquare className="w-4 h-4" />, label: "멘토코칭", sub: "세션 기록", href: "/mentor-coaching", color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
              { icon: <NotebookPen className="w-4 h-4" />, label: "성찰 일지", sub: "일지 작성", href: "/reflection", color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
              { icon: <BarChart2 className="w-4 h-4" />, label: "역량 평가", sub: "자가 평가", href: "/competency-assessment", color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20" },
              { icon: <Award className="w-4 h-4" />, label: "자격증 신청", sub: "신청 현황", href: "/certification", color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20" },
              { icon: <Target className="w-4 h-4" />, label: "인정 기준 현황", sub: "NCP·BCP·MCP", href: "/recognition-status", color: "text-primary bg-primary/10" },
            ].map((item) => (
              <button
                key={item.href}
                onClick={() => navigate(item.href)}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all text-left cursor-pointer"
              >
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", item.color)}>
                  {item.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight truncate">{item.label}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{item.sub}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold">최근 활동</h2>
          </div>
          {recentActivity === undefined ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : recentActivity.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">아직 기록된 활동이 없습니다</CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {recentActivity.map((activity, i) => {
                    const st = STATUS_LABEL[activity.status] || { label: activity.status || "미정", color: "bg-muted text-muted-foreground" };
                    let dateStr = activity.date;
                    try { dateStr = format(new Date(activity.date), "M/d", { locale: ko }); } catch { /* ignore */ }
                    return (
                      <div key={i} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                          {ACTIVITY_ICONS[activity.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{activity.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{activity.subtitle}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-[11px] text-muted-foreground">{dateStr}</span>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", st.color)}>{st.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.div>

      {/* ── Bottom CTA ── */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}>
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-sm">오늘 날짜</p>
                  <p className="text-xs text-muted-foreground">{format(new Date(), "yyyy년 M월 d일 (EEEE)", { locale: ko })}</p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate("/progress")} className="cursor-pointer">
                <TrendingUp className="w-4 h-4 mr-1.5" />진행 현황 보기
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
