import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Heart, Brain, Flame, AlertTriangle, TrendingUp, GraduationCap, Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils.ts";

export default function AdminCheckInPage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | "">("");
  const [trendDays, setTrendDays] = useState(30);

  const trend = useQuery(
    api.dailyCheckIn.getCohortTrend,
    selectedCohortId ? { cohortId: selectedCohortId, days: trendDays } : "skip"
  );
  const alertUsers = useQuery(api.dailyCheckIn.getAlertUsers);

  const chartData = (trend ?? []).map((r) => ({
    date: format(parseISO(r.date), "M/d", { locale: ko }),
    몸평균: r.avgBody,
    마음평균: r.avgMind,
    열정평균: r.avgPassion,
    "참여인원": r.count,
  }));

  const criticalUsers = (alertUsers ?? []).filter((u) => u.isCritical);
  const warnUsers = (alertUsers ?? []).filter((u) => !u.isCritical);

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500" />
          자기 체크인 현황
        </h1>
        <p className="text-muted-foreground text-sm mt-1">교육생들의 일일 몸·마음·열정 상태를 모니터링합니다</p>
      </div>

      {/* 알람 패널 */}
      <div className="space-y-3">
        {alertUsers === undefined ? (
          <Skeleton className="h-24 w-full" />
        ) : alertUsers.length === 0 ? (
          <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
            <CardContent className="pt-4 pb-4 flex items-center gap-3 text-green-700 dark:text-green-400">
              <Heart className="w-5 h-5" />
              <span className="text-sm font-medium">오늘 주의가 필요한 교육생이 없습니다</span>
            </CardContent>
          </Card>
        ) : (
          <>
            {criticalUsers.length > 0 && (
              <Card className="border-red-400 bg-red-50 dark:bg-red-900/20">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    즉시 확인 필요 — 몸 또는 마음 2점 이하 ({criticalUsers.length}명)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {criticalUsers.map((u) => (
                    <AlertUserRow key={String(u.userId)} user={u} level="critical" />
                  ))}
                </CardContent>
              </Card>
            )}
            {warnUsers.length > 0 && (
              <Card className="border-amber-400 bg-amber-50 dark:bg-amber-900/20">
                <CardHeader className="pb-2 pt-4">
                  <CardTitle className="text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    주의 — 몸 또는 마음 4점 이하 ({warnUsers.length}명)
                  </CardTitle>
                </CardHeader>
                <CardContent className="pb-4 space-y-2">
                  {warnUsers.map((u) => (
                    <AlertUserRow key={String(u.userId)} user={u} level="warn" />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* 기수별 추세 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              기수별 평균 추세
            </CardTitle>
            <div className="flex gap-2">
              <Select
                value={selectedCohortId}
                onValueChange={(v) => setSelectedCohortId(v as Id<"cohorts">)}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="기수 선택" />
                </SelectTrigger>
                <SelectContent>
                  {cohorts?.map((c) => (
                    <SelectItem key={c._id} value={c._id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={String(trendDays)} onValueChange={(v) => setTrendDays(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="14">최근 14일</SelectItem>
                  <SelectItem value="30">최근 30일</SelectItem>
                  <SelectItem value="60">최근 60일</SelectItem>
                  <SelectItem value="90">최근 90일</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedCohortId ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <GraduationCap className="w-8 h-8 opacity-40" />
              <p className="text-sm">기수를 선택하면 추세 차트가 표시됩니다</p>
            </div>
          ) : trend === undefined ? (
            <Skeleton className="h-56 w-full" />
          ) : trend.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Users className="w-8 h-8 opacity-40" />
              <p className="text-sm">아직 데이터가 부족합니다 (최소 2일 필요)</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value}점`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="몸평균" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="마음평균" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="열정평균" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

type AlertUser = {
  userId: unknown;
  name: string;
  email?: string;
  bodyScore: number;
  mindScore: number;
  passionScore: number;
  message?: string;
  isCritical: boolean;
};

function AlertUserRow({ user, level }: { user: AlertUser; level: "critical" | "warn" }) {
  const base = level === "critical"
    ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
    : "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800";
  return (
    <div className={cn("rounded-lg border px-3 py-2.5 flex flex-wrap items-center gap-3", base)}>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{user.name}</p>
        {user.email && <p className="text-xs text-muted-foreground">{user.email}</p>}
        {user.message && <p className="text-xs italic mt-0.5 text-muted-foreground">"{user.message}"</p>}
      </div>
      <div className="flex gap-2 flex-shrink-0">
        <ScoreBadge icon={<Heart className="w-3 h-3" />} label="몸" score={user.bodyScore} />
        <ScoreBadge icon={<Brain className="w-3 h-3" />} label="마음" score={user.mindScore} />
        <ScoreBadge icon={<Flame className="w-3 h-3" />} label="열정" score={user.passionScore} />
      </div>
    </div>
  );
}

function ScoreBadge({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  const isLow = score <= 2;
  const isWarn = score <= 4 && score > 2;
  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 text-xs",
        isLow && "bg-red-200 text-red-800 dark:bg-red-900 dark:text-red-200",
        isWarn && "bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
      )}
    >
      {icon}{label} {score}
    </Badge>
  );
}
