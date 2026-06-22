import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  BookOpen,
  ClipboardList,
  NotebookPen,
  Calendar,
  TrendingUp,
  Target,
  Award,
  ChevronRight,
  Flame,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import { useNavigate } from "react-router-dom";

type SummaryUser = {
  certificationGoal?: string | null;
};

const KAC_REQUIREMENTS = {
  education: { label: "교육 이수", target: 60, unit: "시간", href: "/education" },
  coaching: { label: "코칭 실습", target: 100, unit: "시간", href: "/coaching-log" },
};

const KPC_REQUIREMENTS = {
  education: { label: "교육 이수", target: 125, unit: "시간", href: "/education" },
  coaching: { label: "코칭 실습", target: 500, unit: "시간", href: "/coaching-log" },
};

function MiniCircle({
  pct,
  color,
  size = 52,
}: {
  pct: number;
  color: string;
  size?: number;
}) {
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(pct / 100, 1) * circ;
  const cx = size / 2;
  const cy = size / 2;
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="hsl(var(--border))" strokeWidth={5} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

export default function ProgressSummaryCard({ user }: { user: SummaryUser }) {
  const navigate = useNavigate();
  const progressData = useQuery(api.progress.getMyProgress);
  const monthlyStats = useQuery(api.dashboard.getTraineeThisMonthStats);
  const attendanceStats = useQuery(api.dashboard.getMyAttendanceStats);
  const mentorSummary = useQuery(api.mentorCoaching.getMySummary);

  const requirements =
    user.certificationGoal === "KPC" ? KPC_REQUIREMENTS : KAC_REQUIREMENTS;

  const isLoading =
    progressData === undefined ||
    monthlyStats === undefined ||
    attendanceStats === undefined ||
    mentorSummary === undefined;

  const currentValues = {
    education: progressData?.approvedEducationHours ?? 0,
    coaching: progressData?.approvedCoachingHours ?? 0,
  };

  const eduPct = progressData
    ? Math.min((currentValues.education / requirements.education.target) * 100, 100)
    : 0;
  const coachPct = progressData
    ? Math.min((currentValues.coaching / requirements.coaching.target) * 100, 100)
    : 0;
  const overallPct = Math.round((eduPct + coachPct) / 2);

  // Activity streak: consecutive days with at least one log
  const streakDays = (() => {
    if (!progressData) return 0;
    // Use monthly activity — count months with activity as a rough streak indicator
    const activeMonths = progressData.monthlyActivity.filter(
      (m) => m.educationHours > 0 || m.coachingHours > 0,
    );
    return activeMonths.length;
  })();

  const goalLabel =
    user.certificationGoal === "KPC" ? "멘탈코칭전문가 2급" : "멘탈코칭전문가 1급";

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
      <Card className="overflow-hidden border-primary/20">
        {/* Header band */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-5 py-3 flex items-center justify-between border-b border-primary/10">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">진행 요약</span>
          </div>
          <Badge variant="secondary" className="text-xs px-2 py-0.5">
            <Target className="w-3 h-3 mr-1" />
            {goalLabel}
          </Badge>
        </div>

        <CardContent className="p-4 md:p-5 space-y-5">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : (
            <>
              {/* ── Top row: overall pct + key gauges ── */}
              <div className="flex items-center gap-4">
                {/* Big overall pct */}
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <div className="relative" style={{ width: 72, height: 72 }}>
                    <MiniCircle pct={overallPct} color="hsl(var(--primary))" size={72} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-extrabold leading-tight">{overallPct}%</span>
                    </div>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">종합 달성률</span>
                </div>

                {/* Mini gauges + text */}
                <div className="flex-1 space-y-2.5">
                  {Object.entries(requirements).map(([key, req]) => {
                    const current = currentValues[key as keyof typeof currentValues];
                    const pct = Math.min((current / req.target) * 100, 100);
                    const done = current >= req.target;
                    return (
                      <button
                        key={key}
                        onClick={() => navigate(req.href)}
                        className="w-full text-left group"
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs font-medium text-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                            {key === "education" ? (
                              <BookOpen className="w-3 h-3 text-blue-500" />
                            ) : (
                              <ClipboardList className="w-3 h-3 text-green-500" />
                            )}
                            {req.label}
                          </span>
                          <span
                            className={cn(
                              "text-xs font-bold",
                              done ? "text-green-600 dark:text-green-400" : "text-foreground",
                            )}
                          >
                            {Math.round(current * 10) / 10}
                            <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                              / {req.target}{req.unit}
                            </span>
                          </span>
                        </div>
                        <Progress
                          value={pct}
                          className={cn("h-1.5", done ? "[&>div]:bg-green-500" : "")}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ── This month stats row ── */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  {
                    label: "이번달 교육",
                    value: `${monthlyStats.thisMonthEduHours}h`,
                    icon: <BookOpen className="w-3.5 h-3.5" />,
                    color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
                  },
                  {
                    label: "이번달 코칭",
                    value: `${monthlyStats.thisMonthCoachHours}h`,
                    icon: <ClipboardList className="w-3.5 h-3.5" />,
                    color: "text-green-600 bg-green-50 dark:bg-green-900/20",
                  },
                  {
                    label: "이번달 성찰",
                    value: `${monthlyStats.thisMonthReflections}건`,
                    icon: <NotebookPen className="w-3.5 h-3.5" />,
                    color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
                  },
                  {
                    label: "출석률",
                    value: `${attendanceStats.attendanceRate}%`,
                    icon: <Calendar className="w-3.5 h-3.5" />,
                    color:
                      attendanceStats.attendanceRate >= 80
                        ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20"
                        : "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex flex-col items-center gap-1 p-2.5 rounded-xl bg-muted/40"
                  >
                    <div
                      className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center",
                        stat.color,
                      )}
                    >
                      {stat.icon}
                    </div>
                    <span className="text-sm font-bold leading-tight">{stat.value}</span>
                    <span className="text-[9px] text-muted-foreground leading-tight text-center">
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* ── Mentor coaching + activity streak row ── */}
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                    <Award className="w-4 h-4 text-orange-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">멘토코칭</p>
                    <p className="text-sm font-bold">
                      {mentorSummary.mentorCoachingCount}
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                        회
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex-1 flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border">
                  <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                    <Flame className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">활동 월수</p>
                    <p className="text-sm font-bold">
                      {streakDays}
                      <span className="text-[10px] font-normal text-muted-foreground ml-0.5">
                        개월
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/progress")}
                  className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl bg-primary/10 hover:bg-primary/20 transition-colors text-primary text-xs font-medium cursor-pointer flex-shrink-0"
                >
                  상세보기
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
