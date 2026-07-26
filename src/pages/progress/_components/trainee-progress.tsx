import { useNavigate } from "react-router-dom";
import { useState } from "react";
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
  BookOpen,
  ClipboardList,
  TrendingUp,
  Clock,
  CheckCircle,
  Circle,
  AlertCircle,
  ArrowRight,
  FileDown,
  GraduationCap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import CertificationChecklist from "./certification-checklist.tsx";
import ProgressReportDialog from "./progress-report-dialog.tsx";

type User = Doc<"users">;

const KAC = { education: 60, coaching: 100 };
const KPC = { education: 125, coaching: 500 };

function RadialProgressRing({
  value,
  label,
  color,
  size = 100,
}: {
  value: number;
  label: string;
  color: string;
  size?: number;
}) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted/20"
          />
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="18"
            fontWeight="700"
            fill="currentColor"
            className="text-foreground"
          >
            {Math.round(value)}%
          </text>
        </svg>
      </div>
      <p className="text-xs text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
}

function ActivityStatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <span className="flex items-center gap-1 text-[10px] text-chart-4 font-medium">
        <CheckCircle className="w-3 h-3" />
        승인
      </span>
    );
  if (status === "pending")
    return (
      <span className="flex items-center gap-1 text-[10px] text-amber-600 font-medium">
        <Circle className="w-3 h-3" />
        대기
      </span>
    );
  if (status === "draft")
    return (
      <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-medium">
        <Circle className="w-3 h-3" />
        임시저장
      </span>
    );
  return (
    <span className="flex items-center gap-1 text-[10px] text-destructive font-medium">
      <AlertCircle className="w-3 h-3" />
      반려
    </span>
  );
}

export default function TraineeProgressPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const progress = useQuery(api.progress.getMyProgress);

  const getTargets = (goal: string | undefined) => {
    switch (goal) {
      case "KAC": return { education: 20, coaching: 50 };
      case "KPC": return { education: 60, coaching: 300 };
      case "KSC": return { education: 150, coaching: 1000 };
      case "ACC": return { education: 60, coaching: 100 };
      case "PCC": return { education: 125, coaching: 500 };
      case "MCC": return { education: 200, coaching: 2500 };
      default: return { education: 20, coaching: 50 };
    }
  };
  const targets = getTargets(user.certificationGoal);

  const educationPct =
    progress ? Math.min((progress.approvedEducationHours / targets.education) * 100, 100) : 0;
  const coachingPct =
    progress ? Math.min((progress.approvedCoachingHours / targets.coaching) * 100, 100) : 0;
  const overallPct = Math.round((educationPct + coachingPct) / 2);

  const isLoading = progress === undefined;

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
          <h1 className="text-2xl font-bold text-foreground">진행 현황</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user.certificationGoal === "KPC" ? "멘탈코칭전문가 2급" : "멘탈코칭전문가 1급"} 인증까지의 여정을 한눈에 확인하세요.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            disabled={!progress}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            보고서 PDF
          </Button>
          <Badge variant="secondary" className="text-sm px-3 py-1.5">
            <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
            {user.certificationGoal === "KPC" ? "멘탈코칭전문가 2급" : "멘탈코칭전문가 1급"} 준비중
          </Badge>
        </div>
      </motion.div>

      {/* Overall progress rings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-semibold">멘탈코칭전문가자격 취득 요건</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0 pb-6">
            {isLoading ? (
              <div className="flex justify-around">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-28 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-around gap-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    전체 달성률
                  </p>
                  <RadialProgressRing
                    value={overallPct}
                    label="종합 진행률"
                    color="hsl(var(--primary))"
                    size={120}
                  />
                </div>
                <div className="w-px bg-border hidden sm:block" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    교육 이수
                  </p>
                  <RadialProgressRing
                    value={educationPct}
                    label={`${Math.round(progress.approvedEducationHours * 10) / 10} / ${targets.education}시간`}
                    color="hsl(var(--chart-3))"
                    size={120}
                  />
                  {progress.educationPendingCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      검토중 {progress.educationPendingCount}건
                    </Badge>
                  )}
                </div>
                <div className="w-px bg-border hidden sm:block" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    코칭 실습
                  </p>
                  <RadialProgressRing
                    value={coachingPct}
                    label={`${Math.round(progress.approvedCoachingHours * 10) / 10} / ${targets.coaching}시간`}
                    color="hsl(var(--chart-1))"
                    size={120}
                  />
                  {progress.coachingPendingCount > 0 && (
                    <Badge variant="secondary" className="text-[10px] px-2 py-0">
                      검토중 {progress.coachingPendingCount}건
                    </Badge>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Certification checklist + goal change */}
      {!isLoading && progress && (
        <CertificationChecklist user={user} progress={progress} />
      )}

      {/* Monthly activity chart */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">월별 활동 시간</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={progress.monthlyActivity.slice(-6)}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number, name: string) => [
                      `${value}시간`,
                      name,
                    ]}
                  />
                  <Bar
                    dataKey="educationHours"
                    name="교육 이수"
                    fill="hsl(var(--chart-3))"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="coachingHours"
                    name="코칭 실습"
                    fill="hsl(var(--chart-1))"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
            <div className="flex items-center gap-4 mt-2 justify-center">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-chart-3" />
                <span className="text-xs text-muted-foreground">교육 이수</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm bg-chart-1" />
                <span className="text-xs text-muted-foreground">코칭 실습</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent activity */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold">최근 활동</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate("/education")}
                >
                  교육 기록 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => navigate("/coaching-log")}
                >
                  코칭 기록 <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : progress.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                아직 활동 기록이 없습니다.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {progress.recentActivity.map((item, idx) => (
                  <div key={idx} className="py-3 flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        item.type === "education"
                          ? "bg-chart-3/10 text-chart-3"
                          : "bg-chart-1/10 text-chart-1"
                      }`}
                    >
                      {item.type === "education" ? (
                        <BookOpen className="w-4 h-4" />
                      ) : (
                        <ClipboardList className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(item.date), "yyyy.MM.dd (EEE)", { locale: ko })} ·{" "}
                        <Clock className="w-3 h-3 inline" /> {item.hours}시간
                      </p>
                    </div>
                    <ActivityStatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {progress && (
        <ProgressReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          user={user}
          progress={progress}
        />
      )}
    </div>
  );
}
