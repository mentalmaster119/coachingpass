import { useMemo } from "react";
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

const GOAL_REQUIREMENTS: Record<string, {
  education: { label: string; target: number; unit: string; href: string };
  coaching: { label: string; target: number; unit: string; href: string };
  mentoring: { label: string; target: number; unit: string; href: string };
  coderc: { label: string; target: number; unit: string; href: string };
}> = {
  KAC: {
    education: { label: "교육 이수", target: 20, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 50, unit: "시간", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
  },
  KPC: {
    education: { label: "교육 이수", target: 60, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 300, unit: "시간", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
  },
  KSC: {
    education: { label: "교육 이수", target: 150, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 1000, unit: "시간", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
  },
  ACC: {
    education: { label: "교육 이수", target: 60, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 100, unit: "시간", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
  },
  MCC: {
    education: { label: "교육 이수", target: 200, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 2500, unit: "시간", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 10, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "코더코", target: 3, unit: "회", href: "/mentor-coaching" },
  },
  SMPCC: {
    education: { label: "교육 이수", target: 60, unit: "시간", href: "/training-history?tab=current-education" },
    coaching: { label: "코칭 실습", target: 20, unit: "건", href: "/coaching-log" },
    mentoring: { label: "멘토코칭", target: 2, unit: "회", href: "/mentor-coaching" },
    coderc: { label: "버디코칭", target: 2, unit: "회", href: "/bcp" },
  },
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
  const goal = user.certificationGoal || "KAC";
  const requirements = GOAL_REQUIREMENTS[goal] || GOAL_REQUIREMENTS.KAC;
  const isNewUser = user._creationTime > Date.now() - 7 * 24 * 60 * 60 * 1000;

  const randomMessage = useMemo(() => {
    const messages = [
      // 따뜻한 톤
      "오늘도 당신의 기록과 성찰이 더 단단한 코치로 자라나는 하루가 되길 바랍니다.",
      "하루를 천천히 돌아보는 이 시간이, 코치로서의 깊이와 따뜻함을 조금씩 키워줄 것입니다.",
      "오늘의 작은 배움과 진심 어린 돌아봄이, 결국 누군가를 살리는 코칭의 힘이 됩니다.",
      "지금 남기는 한 줄의 기록이 내일의 더 좋은 질문과 더 깊은 경청으로 이어질 수 있습니다.",
      "오늘도 서두르지 말고, 당신만의 속도로 코치로서의 성장을 차분히 쌓아가 보세요.",
      "하루의 경험을 따뜻하게 정리하는 시간 속에서, 코치로서의 시야와 마음도 함께 자랍니다.",
      "오늘의 성찰은 자신을 다그치는 시간이 아니라, 더 나은 코치로 다듬어 가는 소중한 시간입니다.",
      "작은 실천 하나, 진솔한 돌아봄 하나가 모여 당신의 코칭을 더 깊고 단단하게 만듭니다.",
      "오늘도 당신의 배움과 변화가 누군가에게 힘이 되는 코치의 자산으로 차곡차곡 쌓여가길 바랍니다.",
      "이곳에서의 기록이 오늘을 정리하는 데 그치지 않고, 내일의 더 성숙한 코칭으로 이어지길 바랍니다.",

      // 전문적인 톤
      "오늘의 경험을 구조화해 기록하고 성찰할수록, 코치로서의 판단력과 개입의 정교함은 더 높아집니다.",
      "성장은 경험 자체보다 경험을 어떻게 해석하고 다음 행동으로 연결하느냐에 달려 있습니다.",
      "오늘의 코칭 경험을 점검하며, 질문·경청·개입의 질을 한 단계 더 정교하게 다듬어 보세요.",
      "성찰은 하루를 돌아보는 일이 아니라, 코치로서의 역량을 의식적으로 훈련하는 과정입니다.",
      "기록된 경험은 단순한 메모가 아니라, 더 나은 코칭 판단 and 실천을 위한 중요한 학습 데이터가 됩니다.",
      "오늘의 관찰과 성찰을 통해 자신의 코칭 패턴을 이해하고, 더 효과적인 개입 방향을 설계해 보세요.",
      "좋은 코치는 경험을 반복하는 사람이 아니라, 경험에서 원리를 추출하고 다음 행동을 설계하는 사람입니다.",
      "하루를 기록하는 습관은 코치의 감각을 훈련하고, 현장의 배움을 전문성으로 전환시키는 힘이 됩니다.",
      "오늘의 성찰을 통해 자기이해를 높이고, 더 전략적이고 일관된 코칭 역량을 만들어 가보세요.",
      "코칭의 깊이는 시간보다 돌아봄의 질에서 나옵니다. 오늘의 기록으로 그 깊이를 더해 보세요.",

      // 감동적인 톤
      "오늘 당신이 남기는 기록 하나가, 언젠가 누군가의 삶을 바꾸는 코칭의 시작이 될 수 있습니다.",
      "더 좋은 코치는 하루아침에 만들어지지 않지만, 진심 어린 성찰은 분명 사람을 바꾸고 성장시킵니다.",
      "오늘의 배움과 흔들림까지도 놓치지 않고 돌아볼 때, 당신의 코칭은 더 깊은 울림을 갖게 됩니다.",
      "당신의 오늘이 쌓여 누군가에게는 다시 일어설 힘이 되고, 다시 도전할 용기가 될 것입니다.",
      "지금의 작은 성찰이 미래의 누군가에게는 큰 위로와 변화의 문이 될 수 있습니다.",
      "코치의 성장은 자신의 하루를 진실하게 마주하는 데서 시작되고, 그 진실함이 결국 사람의 마음에 닿습니다.",
      "오늘도 당신의 성찰이 당신을 더 깊은 사람으로 만들고, 더 깊은 코치로 이끌어 줄 것입니다.",
      "하루의 경험을 의미 있게 붙잡는 사람만이, 타인의 성장도 끝까지 따뜻하게 동행할 수 있습니다.",
      "당신이 오늘 자신을 돌아보는 이 시간이, 결국 더 많은 사람을 살리고 세우는 힘으로 이어질 것입니다.",
      "좋은 코치는 완벽한 사람이 아니라, 매일 자신을 돌아보며 더 나은 마음으로 다시 서는 사람입니다."
    ];
    const randomIndex = Math.floor(Math.random() * messages.length);
    return messages[randomIndex];
  }, []);

  const progressData = useQuery(api.progress.getMyProgress);
  const monthlyStats = useQuery(api.dashboard.getTraineeThisMonthStats);
  const recentActivity = useQuery(api.dashboard.getTraineeRecentActivity);
  const mentorSummary = useQuery(api.mentorCoaching.getMySummary);
  const mcciStats = useQuery(api.dashboard.getMyMcciDomainStats);
  const todayOverview = useQuery(api.dashboard.getTraineeTodayOverview);
  const attendanceStats = useQuery(api.dashboard.getMyAttendanceStats);
  const myLogs = useQuery(api.coaching.getMyLogs);

  const MCCI_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
  ];

  const currentValues = {
    education: progressData?.approvedEducationHours ?? 0,
    coaching: goal === "SMPCC"
      ? (progressData?.sportsCount ?? 0) + Math.min(progressData?.generalCount ?? 0, 15)
      : (progressData?.approvedCoachingHours ?? 0),
    mentoring: progressData?.mentorCount ?? 0,
    coderc: goal === "SMPCC"
      ? (progressData?.buddyCount ?? 0)
      : (progressData?.svCount ?? 0),
  };

  const totalRequirements = Object.values(requirements).length;
  const fulfilledRequirements = Object.entries(requirements).filter(
    ([key, req]) => currentValues[key as keyof typeof currentValues] >= req.target,
  ).length;
  const overallPct = Math.round((fulfilledRequirements / totalRequirements) * 100);

  // Last 6 months of chart data
  const chartData = progressData?.monthlyActivity?.slice(-6) ?? [];

  // Group logs by date (excluding drafts)
  const submissionCounts: Record<string, number> = {};
  if (myLogs) {
    for (const log of myLogs) {
      if (log.approvalStatus !== "draft") {
        try {
          const dateStr = format(new Date(log.coachingDate), "yyyy-MM-dd");
          submissionCounts[dateStr] = (submissionCounts[dateStr] ?? 0) + 1;
        } catch {
          // skip
        }
      }
    }
  }

  // Generate date array for the last 18 weeks (126 days), aligned to start on a Sunday or Monday
  const daysToRender: Date[] = [];
  const today = new Date();
  const startDay = new Date();
  startDay.setDate(today.getDate() - 18 * 7);
  const startDaySunday = new Date(startDay);
  startDaySunday.setDate(startDay.getDate() - startDay.getDay());

  const current = new Date(startDaySunday);
  while (daysToRender.length < 18 * 7) {
    daysToRender.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < daysToRender.length; i += 7) {
    weeks.push(daysToRender.slice(i, i + 7));
  }

  const getMonthLabel = (week: Date[]) => {
    const firstDayOfWeek = week[0];
    const dayOfMonth = firstDayOfWeek.getDate();
    if (dayOfMonth <= 7) {
      return format(firstDayOfWeek, "M월", { locale: ko });
    }
    return null;
  };

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
          <h1 className="text-2xl font-bold">안녕하세요, {user.name || "수강생"}멘탈코치님!</h1>
          <p className="text-muted-foreground text-sm mt-1">{randomMessage}</p>
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
            {user.certificationGoal ?? "KAC"} 목표 달성 현황
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

      {/* ── 코칭 실습 활성도 잔디 차트 ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16 }}
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-muted-foreground" />
                코칭 실습 기록 제출 활성도 (최근 18주)
              </span>
              <span className="text-[10px] font-normal text-muted-foreground">
                제출 완료 및 승인된 기록 기준 일별 빈도
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-2">
            {myLogs === undefined ? (
              <Skeleton className="h-28 w-full" />
            ) : (
              <div className="flex flex-col">
                {/* Month labels */}
                <div className="flex gap-1 text-[9px] pl-6 mb-1 h-4">
                  {weeks.map((week, wIdx) => {
                    const label = getMonthLabel(week);
                    return (
                      <div key={wIdx} className="w-2.5 relative flex-shrink-0">
                        {label && (
                          <span className="absolute left-0 bottom-0 whitespace-nowrap text-muted-foreground/75 font-semibold">
                            {label}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2 items-start">
                  {/* Day-of-week labels */}
                  <div className="flex flex-col justify-between text-[9px] text-muted-foreground/70 h-[86px] pt-0.5 select-none w-4 flex-shrink-0 text-right leading-[10px]">
                    <span>일</span>
                    <span>화</span>
                    <span>목</span>
                    <span>토</span>
                  </div>

                  {/* Heatmap Grid */}
                  <div className="flex gap-1 overflow-x-auto pb-2 scrollbar-none flex-1">
                    {weeks.map((week, wIdx) => (
                      <div key={wIdx} className="grid grid-rows-7 gap-1 flex-shrink-0">
                        {week.map((day) => {
                          const dateStr = format(day, "yyyy-MM-dd");
                          const count = submissionCounts[dateStr] ?? 0;

                          let colorClass = "bg-muted/40 dark:bg-muted/10";
                          if (count === 1) colorClass = "bg-emerald-100 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400";
                          else if (count === 2) colorClass = "bg-emerald-300 dark:bg-emerald-700 text-emerald-900 dark:text-emerald-300";
                          else if (count >= 3) colorClass = "bg-emerald-500 text-primary-foreground";

                          const formattedDate = format(day, "yyyy년 M월 d일 (E)", { locale: ko });
                          const tooltipText = `${formattedDate}: ${count}회 제출`;

                          return (
                            <div
                              key={dateStr}
                              className={cn(
                                "w-2.5 h-2.5 rounded-[1.5px] cursor-pointer transition-all hover:scale-125 hover:ring-1 hover:ring-emerald-400/50",
                                colorClass
                              )}
                              title={tooltipText}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-muted-foreground/80 pr-1">
                  <span>덜 제출함</span>
                  <div className="w-2.5 h-2.5 rounded-[1.5px] bg-muted/40 dark:bg-muted/10" />
                  <div className="w-2.5 h-2.5 rounded-[1.5px] bg-emerald-100 dark:bg-emerald-950/30" />
                  <div className="w-2.5 h-2.5 rounded-[1.5px] bg-emerald-300 dark:bg-emerald-700" />
                  <div className="w-2.5 h-2.5 rounded-[1.5px] bg-emerald-500" />
                  <span>더 제출함</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
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
