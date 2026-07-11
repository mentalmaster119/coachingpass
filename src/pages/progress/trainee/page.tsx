import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
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
  ArrowLeft,
  BookOpen,
  ClipboardList,
  CheckCircle,
  Circle,
  AlertCircle,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { COACHING_TYPE_MAP } from "@/pages/coaching-log/_components/coaching-log-card.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

function StatusBadge({ status }: { status: string }) {
  if (status === "approved")
    return (
      <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 text-[10px] px-2 py-0">
        <CheckCircle className="w-3 h-3 mr-1" />
        승인
      </Badge>
    );
  if (status === "pending")
    return (
      <Badge variant="secondary" className="text-[10px] px-2 py-0 bg-amber-50 text-amber-700 border-amber-200">
        <Circle className="w-3 h-3 mr-1" />
        대기
      </Badge>
    );
  if (status === "draft")
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-0 bg-muted text-muted-foreground border-border">
        <Circle className="w-3 h-3 mr-1" />
        임시저장
      </Badge>
    );
  return (
    <Badge variant="destructive" className="text-[10px] px-2 py-0">
      <AlertCircle className="w-3 h-3 mr-1" />
      반려
    </Badge>
  );
}

function RadialProgressRing({
  value,
  label,
  color,
  size = 110,
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
            cx="50" cy="50" r={radius} fill="none"
            stroke="currentColor" strokeWidth="8"
            className="text-muted/20"
          />
          <circle
            cx="50" cy="50" r={radius} fill="none"
            stroke={color} strokeWidth="8" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
          <text
            x="50" y="50" textAnchor="middle" dominantBaseline="middle"
            fontSize="18" fontWeight="700" fill="currentColor"
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

export default function TraineeDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useCurrentUser();

  const detail = useQuery(
    api.progress.getTraineeDetail,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  // Only admin and senior_coach can view other users' detail pages
  if (currentUser && currentUser.role !== "admin" && currentUser.role !== "senior_coach") {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/progress")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
        </Button>
        <p className="text-muted-foreground">접근 권한이 없습니다.</p>
      </div>
    );
  }

  const isLoading = detail === undefined;

  if (!isLoading && detail === null) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => navigate("/progress")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로
        </Button>
        <p className="text-muted-foreground">해당 교육생을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const educationPct = detail
    ? Math.min((detail.approvedEducationHours / detail.educationTarget) * 100, 100)
    : 0;
  const coachingPct = detail
    ? Math.min((detail.approvedCoachingHours / detail.coachingTarget) * 100, 100)
    : 0;
  const overallPct = Math.round((educationPct + coachingPct) / 2);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Back + header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/progress")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로
        </Button>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
                {(detail!.user.name[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{detail!.user.name}</h1>
                <p className="text-muted-foreground text-sm">{detail!.user.email}</p>
              </div>
            </div>
            <Badge variant="secondary" className="self-start sm:self-center text-sm px-3 py-1.5">
              <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
              {detail!.user.certificationGoal} 준비중
            </Badge>
          </div>
        )}
      </motion.div>

      {/* Progress rings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="shadow-sm">
          <CardContent className="pt-6 pb-6">
            {isLoading ? (
              <div className="flex justify-around">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-28 w-28 rounded-full" />
                ))}
              </div>
            ) : (
              <div className="flex flex-wrap justify-around gap-6">
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">전체 달성률</p>
                  <RadialProgressRing value={overallPct} label="종합 진행률" color="hsl(var(--primary))" size={120} />
                </div>
                <div className="w-px bg-border hidden sm:block" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">교육 이수</p>
                  <RadialProgressRing
                    value={educationPct}
                    label={`${detail!.approvedEducationHours} / ${detail!.educationTarget}시간`}
                    color="hsl(var(--chart-3))"
                    size={120}
                  />
                </div>
                <div className="w-px bg-border hidden sm:block" />
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">코칭 실습</p>
                  <RadialProgressRing
                    value={coachingPct}
                    label={`${detail!.approvedCoachingHours} / ${detail!.coachingTarget}시간`}
                    color="hsl(var(--chart-1))"
                    size={120}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Requirements checklist */}
      {!isLoading && detail && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-4"
        >
          {[
            {
              key: "education",
              label: "교육 이수 시간",
              icon: <BookOpen className="w-5 h-5" />,
              current: detail.approvedEducationHours,
              target: detail.educationTarget,
              color: "text-chart-3",
              bg: "bg-chart-3/10",
            },
            {
              key: "coaching",
              label: "코칭 실습 시간",
              icon: <ClipboardList className="w-5 h-5" />,
              current: detail.approvedCoachingHours,
              target: detail.coachingTarget,
              color: "text-chart-1",
              bg: "bg-chart-1/10",
            },
          ].map((req) => {
            const pct = Math.min((req.current / req.target) * 100, 100);
            const done = req.current >= req.target;
            return (
              <Card key={req.key} className={`shadow-sm ${done ? "border-chart-4/30" : ""}`}>
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-lg ${req.bg} ${req.color} flex items-center justify-center`}>
                        {req.icon}
                      </div>
                      <p className="font-semibold text-sm text-foreground">{req.label}</p>
                    </div>
                    {done ? (
                      <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 text-xs">완료</Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        <span className="font-bold text-foreground text-sm">{req.current}</span>/{req.target}시간
                      </span>
                    )}
                  </div>
                  <Progress value={pct} className="h-2.5" />
                  <p className="text-xs text-muted-foreground mt-2">
                    {done ? "목표 달성 완료!" : `${Math.round((req.target - req.current) * 10) / 10}시간 더 필요`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </motion.div>
      )}

      {/* Monthly chart */}
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
              <Skeleton className="h-48 w-full" />
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={detail!.monthlyActivity.slice(-6)}
                  margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barGap={3}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [`${value}시간`, name === "educationHours" ? "교육 이수" : "코칭 실습"]}
                  />
                  <Bar dataKey="educationHours" name="교육 이수" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="coachingHours" name="코칭 실습" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Records tabs */}
      {!isLoading && detail && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
        >
          <Tabs defaultValue="education">
            <TabsList className="mb-4">
              <TabsTrigger value="education">
                <BookOpen className="w-3.5 h-3.5 mr-1.5" />
                교육 기록 ({detail.educationRecords.length})
              </TabsTrigger>
              <TabsTrigger value="coaching">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
                코칭 기록 ({detail.coachingLogs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="education">
              {detail.educationRecords.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">교육 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {detail.educationRecords.map((rec) => (
                    <Card key={rec._id} className="shadow-sm">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-chart-3/10 text-chart-3 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{rec.educationName}</p>
                            <p className="text-xs text-muted-foreground">
                              {rec.institution} · {format(new Date(rec.educationDate), "yyyy.MM.dd (EEE)", { locale: ko })} · {rec.hours}시간
                            </p>
                          </div>
                          <StatusBadge status={rec.approvalStatus} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="coaching">
              {detail.coachingLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">코칭 기록이 없습니다.</p>
              ) : (
                <div className="space-y-2">
                  {detail.coachingLogs.map((log) => (
                    <Card key={log._id} className="shadow-sm">
                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-chart-1/10 text-chart-1 flex items-center justify-center flex-shrink-0">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{log.topic}</p>
                            <p className="text-xs text-muted-foreground">
                              {COACHING_TYPE_MAP[log.coachingType] ?? log.coachingType} ·{" "}
                              {format(new Date(log.coachingDate), "yyyy.MM.dd (EEE)", { locale: ko })} ·{" "}
                              {Math.round((log.durationMinutes / 60) * 10) / 10}시간
                            </p>
                          </div>
                          <StatusBadge status={log.approvalStatus} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      )}
    </div>
  );
}
