import React, { useState, useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  LineChart,
  Line,
  Bar,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from "recharts";
import {
  TrendingUp,
  Sparkles,
  Award,
  Layers,
  BarChart3,
  Calendar,
  CheckCircle2,
  Target,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";

interface EvaluatedLogItem {
  index: number;
  log: {
    id?: string;
    sourceType?: string;
    typeLabel: string;
    date: string;
    topic: string;
    partner?: string;
    durationMinutes?: number;
    coachingGoal?: string;
    coachingContent?: string;
    clientInsight?: string;
    coachReflection?: string;
    actionPlan?: string;
  };
  score: {
    completeness: number;
    specificity: number;
    processTracking: number;
    selfReflection: number;
    learningTransfer: number;
    total: number;
  };
  cumulativeScore: {
    completeness: number;
    specificity: number;
    processTracking: number;
    selfReflection: number;
    learningTransfer: number;
    total: number;
  };
  group: {
    groupNumber: number;
    name: string;
    badgeColor?: string;
  };
}

interface ScoreTrendCardProps {
  chronologicalLogs: EvaluatedLogItem[];
  milestones: any[];
  totalLogs: number;
  selectedMilestoneKey?: string;
  onSelectMilestone?: (key: string) => void;
}

export default function ScoreTrendCard({
  chronologicalLogs,
  milestones,
  totalLogs,
  selectedMilestoneKey = "overall",
  onSelectMilestone,
}: ScoreTrendCardProps) {
  // Chart View Mode: "overall" (총점 & 누적평균) | "dimensions" (5대 항목별 추세) | "milestones" (5회 단위 구간별 비교)
  const [chartMode, setChartMode] = useState<"overall" | "dimensions" | "milestones">("overall");

  // Chart data for all sessions
  const chartData = useMemo(() => {
    return chronologicalLogs.map((item) => {
      const rawDate = item.log.date || "";
      const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
      return {
        index: item.index,
        sessionLabel: `${item.index}회`,
        date: shortDate,
        topic: item.log.topic || `${item.index}회차 코칭 실습`,
        typeLabel: item.log.typeLabel,
        // Scores
        sessionScore: item.score.total,
        cumulativeScore: item.cumulativeScore.total,
        completeness: item.score.completeness,
        specificity: item.score.specificity,
        processTracking: item.score.processTracking,
        selfReflection: item.score.selfReflection,
        learningTransfer: item.score.learningTransfer,
        groupName: item.group.name,
      };
    });
  }, [chronologicalLogs]);

  // Milestone comparison data
  const milestoneData = useMemo(() => {
    if (!milestones) return [];
    return milestones
      .filter((m: any) => !m.isLocked && m.actualCount > 0)
      .map((m: any) => ({
        key: m.key,
        name: m.title.replace(" 구간", ""),
        stageName: m.stageName,
        total: m.scores.total,
        completeness: m.scores.completeness,
        specificity: m.scores.specificity,
        processTracking: m.scores.processTracking,
        selfReflection: m.scores.selfReflection,
        learningTransfer: m.scores.learningTransfer,
        count: m.actualCount,
        isCompleted: m.isCompleted,
      }));
  }, [milestones]);

  // Growth statistics
  const stats = useMemo(() => {
    if (chartData.length === 0) {
      return { firstScore: 0, latestScore: 0, diff: 0, highestScore: 0, highestIndex: 0 };
    }
    const firstScore = chartData[0].sessionScore;
    const latestScore = chartData[chartData.length - 1].cumulativeScore;
    const diff = latestScore - firstScore;

    let highestScore = 0;
    let highestIndex = 1;
    chartData.forEach((d) => {
      if (d.sessionScore > highestScore) {
        highestScore = d.sessionScore;
        highestIndex = d.index;
      }
    });

    return { firstScore, latestScore, diff, highestScore, highestIndex };
  }, [chartData]);

  if (totalLogs === 0) {
    return (
      <Card className="border border-purple-200 dark:border-purple-800 shadow-sm bg-card">
        <CardContent className="py-8 text-center space-y-2">
          <TrendingUp className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-semibold text-foreground">점수 변화 추세선 데이터 준비 중</p>
          <p className="text-xs text-muted-foreground">
            첫 번째 코칭 실습일지를 작성하시면 회차별 품질 점수와 누적 성장 추세선 그래프가 활성화됩니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 shadow-sm bg-card overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-purple-50/60 via-card to-indigo-50/40 dark:from-purple-950/20 dark:via-card dark:to-indigo-950/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded bg-purple-100 dark:bg-purple-950/60 text-purple-600">
                <TrendingUp className="w-4 h-4" />
              </span>
              <CardTitle className="text-base font-bold text-foreground">
                실습 회차별 품질 점수 변화 및 성장 추세선
              </CardTitle>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                누적 {totalLogs}회차 데이터
              </Badge>
            </div>
            <CardDescription className="text-xs mt-1">
              회차별 실습 품질 점수와 누적 성장 추세를 분석하고, 1그룹(80점) 우수 표준 도달 궤적을 확인합니다.
            </CardDescription>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg self-start sm:self-auto">
            <Button
              size="sm"
              variant={chartMode === "overall" ? "default" : "ghost"}
              className={`h-7 text-xs px-2.5 ${chartMode === "overall" ? "bg-purple-600 hover:bg-purple-700 text-white font-bold" : "text-muted-foreground"}`}
              onClick={() => setChartMode("overall")}
            >
              <span>종합 성장 추세</span>
            </Button>
            <Button
              size="sm"
              variant={chartMode === "milestones" ? "default" : "ghost"}
              className={`h-7 text-xs px-2.5 ${chartMode === "milestones" ? "bg-purple-600 hover:bg-purple-700 text-white font-bold" : "text-muted-foreground"}`}
              onClick={() => setChartMode("milestones")}
            >
              <span>5회 구간별 평점</span>
            </Button>
            <Button
              size="sm"
              variant={chartMode === "dimensions" ? "default" : "ghost"}
              className={`h-7 text-xs px-2.5 ${chartMode === "dimensions" ? "bg-purple-600 hover:bg-purple-700 text-white font-bold" : "text-muted-foreground"}`}
              onClick={() => setChartMode("dimensions")}
            >
              <span>5대 항목별 추세</span>
            </Button>
          </div>
        </div>

        {/* Growth Key Indicators */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="bg-card/80 border rounded-lg p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">시작 점수 (1회차)</span>
              <span className="text-sm font-bold text-foreground">{stats.firstScore}점</span>
            </div>
            <Calendar className="w-3.5 h-3.5 text-muted-foreground/60" />
          </div>

          <div className="bg-card/80 border rounded-lg p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">현재 누적 평점</span>
              <span className="text-sm font-bold text-purple-700 dark:text-purple-400">
                {stats.latestScore}점
              </span>
            </div>
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
          </div>

          <div className="bg-card/80 border rounded-lg p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">성장폭 (변화량)</span>
              <span
                className={`text-sm font-bold flex items-center gap-0.5 ${stats.diff >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600"}`}
              >
                {stats.diff >= 0 ? `+${stats.diff}점` : `${stats.diff}점`}
                {stats.diff > 0 && <ArrowUpRight className="w-3 h-3" />}
              </span>
            </div>
            <Award className="w-3.5 h-3.5 text-emerald-600" />
          </div>

          <div className="bg-card/80 border rounded-lg p-2 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-muted-foreground block">최고 기록 회차</span>
              <span className="text-sm font-bold text-foreground">
                {stats.highestScore}점 ({stats.highestIndex}회차)
              </span>
            </div>
            <Target className="w-3.5 h-3.5 text-amber-600" />
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4 pb-4">
        {/* MODE 1: 종합 성장 추세 (회차별 점수 & 누적 평점 추세선) */}
        {chartMode === "overall" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1.5 rounded-sm bg-purple-500 inline-block" />
                  <span className="text-[11px] font-medium text-foreground">회차별 실습 점수</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-indigo-600 inline-block" />
                  <span className="text-[11px] font-medium text-foreground">누적 평균 성장 추세선</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 border-b-2 border-dashed border-emerald-500 inline-block" />
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold">
                    1그룹 우수 기준 (80점)
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 border-b-2 border-dashed border-amber-500 inline-block" />
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                    2그룹 기준 (65점)
                  </span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground hidden sm:inline">
                마우스 호버 시 회차별 세부 내용 확인 가능
              </span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <defs>
                    <linearGradient id="scoreAreaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="sessionLabel"
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    domain={[30, 100]}
                    ticks={[40, 50, 60, 65, 70, 80, 90, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  {/* Reference line: 80점 (1그룹) */}
                  <ReferenceLine
                    y={80}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "1그룹(80점)",
                      position: "insideTopRight",
                      fill: "#10b981",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />
                  {/* Reference line: 65점 (2그룹) */}
                  <ReferenceLine
                    y={65}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "2그룹(65점)",
                      position: "insideTopRight",
                      fill: "#f59e0b",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />

                  {/* Area fill under cumulative trend */}
                  <Area
                    type="monotone"
                    dataKey="cumulativeScore"
                    fill="url(#scoreAreaGradient)"
                    stroke="none"
                  />

                  {/* Individual session score line */}
                  <Line
                    type="monotone"
                    dataKey="sessionScore"
                    name="회차별 점수"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={{ r: 3.5, fill: "#a855f7", strokeWidth: 1, stroke: "#fff" }}
                    activeDot={{ r: 6, fill: "#a855f7" }}
                  />

                  {/* Cumulative average trendline */}
                  <Line
                    type="monotone"
                    dataKey="cumulativeScore"
                    name="누적 평균 추세"
                    stroke="#4f46e5"
                    strokeWidth={3}
                    dot={{ r: 3, fill: "#4f46e5" }}
                    activeDot={{ r: 6, fill: "#4f46e5" }}
                  />

                  <Tooltip content={<CustomTooltip />} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* MODE 2: 5회 단위 구간별 평점 비교 (1~5회 ➔ 6~10회 ➔ 11~15회 ➔ 16~20회) */}
        {chartMode === "milestones" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
              <span className="text-[11px] font-medium text-foreground">
                5회 단위 마일스톤 구간별 평균 품질 점수 추세
              </span>
              <span className="text-[10px] text-muted-foreground">
                단계가 올라갈수록 리포트 구조화 수준이 향상됩니다
              </span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={milestoneData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="name"
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    domain={[40, 100]}
                    ticks={[40, 50, 60, 65, 70, 80, 90, 100]}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ReferenceLine
                    y={80}
                    stroke="#10b981"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "1그룹(80점)",
                      position: "insideTopRight",
                      fill: "#10b981",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />
                  <ReferenceLine
                    y={65}
                    stroke="#f59e0b"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    label={{
                      value: "2그룹(65점)",
                      position: "insideTopRight",
                      fill: "#f59e0b",
                      fontSize: 10,
                      fontWeight: "bold",
                    }}
                  />

                  {/* Bar for segment average */}
                  <Bar
                    dataKey="total"
                    name="구간 평균 평점"
                    fill="#8b5cf6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={48}
                  />

                  {/* Trendline connecting milestone averages */}
                  <Line
                    type="monotone"
                    dataKey="total"
                    name="구간 성장 추세"
                    stroke="#4338ca"
                    strokeWidth={3}
                    dot={{ r: 5, fill: "#4338ca" }}
                  />

                  <Tooltip content={<MilestoneTooltip />} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* MODE 3: 5대 핵심 항목별 추세 (완결성, 구체성, 과정추적, 자기성찰, 학습전이) */}
        {chartMode === "dimensions" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground px-1 flex-wrap gap-2">
              <div className="flex items-center gap-3 flex-wrap text-[11px]">
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                  <span>1. 완결성</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                  <span>2. 구체성</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-teal-500 inline-block" />
                  <span>3. 과정추적</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                  <span>4. 자기성찰</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                  <span>5. 학습전이</span>
                </div>
              </div>
              <span className="text-[10px] text-muted-foreground">각 항목 20점 만점 기준</span>
            </div>

            <div className="w-full h-64 sm:h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 15, right: 15, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
                  <XAxis
                    dataKey="sessionLabel"
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    domain={[0, 20]}
                    ticks={[5, 10, 15, 20]}
                    tickLine={false}
                    axisLine={{ stroke: "hsl(var(--border))" }}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ReferenceLine
                    y={16}
                    stroke="#10b981"
                    strokeDasharray="3 3"
                    label={{
                      value: "우수 기준 (16점)",
                      position: "insideTopRight",
                      fill: "#10b981",
                      fontSize: 9,
                    }}
                  />

                  <Line type="monotone" dataKey="completeness" name="완결성" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="specificity" name="구체성" stroke="#a855f7" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="processTracking" name="과정추적" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="selfReflection" name="자기성찰" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2.5 }} />
                  <Line type="monotone" dataKey="learningTransfer" name="학습전이" stroke="#10b981" strokeWidth={2} dot={{ r: 2.5 }} />

                  <Tooltip content={<CustomTooltip />} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Custom Tooltip for Session Data ───────────────────
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-3 text-xs space-y-2 max-w-xs z-50">
      <div className="flex items-center justify-between border-b pb-1.5 gap-2">
        <div className="flex items-center gap-1.5">
          <Badge className="bg-purple-600 text-white text-[10px] px-1.5 py-0 font-bold">
            {data.sessionLabel}
          </Badge>
          <span className="font-bold text-foreground truncate max-w-[140px]">{data.topic}</span>
        </div>
        <span className="text-[10px] text-muted-foreground">{data.date}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 bg-muted/40 p-2 rounded-lg">
        <div>
          <span className="text-[10px] text-muted-foreground block">단일 실습 점수</span>
          <span className="text-base font-black text-purple-700 dark:text-purple-400">
            {data.sessionScore}점
          </span>
        </div>
        <div>
          <span className="text-[10px] text-muted-foreground block">누적 평균 평점</span>
          <span className="text-base font-black text-indigo-700 dark:text-indigo-400">
            {data.cumulativeScore}점
          </span>
        </div>
      </div>

      {/* 5 Dimensions breakdown */}
      <div className="space-y-1 pt-1 border-t text-[11px]">
        <div className="flex justify-between text-muted-foreground">
          <span>1. 완결성:</span>
          <span className="font-semibold text-foreground">{data.completeness} / 20</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>2. 구체성:</span>
          <span className="font-semibold text-foreground">{data.specificity} / 20</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>3. 과정추적:</span>
          <span className="font-semibold text-foreground">{data.processTracking} / 20</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>4. 자기성찰:</span>
          <span className="font-semibold text-foreground">{data.selfReflection} / 20</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>5. 학습전이:</span>
          <span className="font-semibold text-foreground">{data.learningTransfer} / 20</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-1 border-t">
        <span>실습 유형: {data.typeLabel}</span>
        <span className="font-bold text-purple-600">{data.groupName}</span>
      </div>
    </div>
  );
}

// ── Milestone Tooltip ─────────────────────────────────
function MilestoneTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload;

  return (
    <div className="bg-popover/95 backdrop-blur-sm border border-border shadow-xl rounded-xl p-3 text-xs space-y-2 max-w-xs z-50">
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="font-bold text-foreground text-sm">{data.name} 실습 품질</span>
        <Badge variant="outline" className="text-[10px]">
          작성 {data.count}건
        </Badge>
      </div>
      <p className="text-[11px] text-muted-foreground">{data.stageName}</p>

      <div className="bg-purple-50 dark:bg-purple-950/40 p-2 rounded-lg flex items-baseline justify-between border border-purple-200">
        <span className="text-xs text-muted-foreground">구간 평균 평점:</span>
        <span className="text-lg font-black text-purple-700 dark:text-purple-300">
          {data.total}점 / 100점
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[11px]">
        <div className="flex justify-between">
          <span className="text-muted-foreground">완결성:</span>
          <span className="font-semibold">{data.completeness}점</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">구체성:</span>
          <span className="font-semibold">{data.specificity}점</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">과정추적:</span>
          <span className="font-semibold">{data.processTracking}점</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">자기성찰:</span>
          <span className="font-semibold">{data.selfReflection}점</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-muted-foreground">학습전이:</span>
          <span className="font-semibold">{data.learningTransfer}점</span>
        </div>
      </div>
    </div>
  );
}

// ── Compact Mini Trend for Individual Milestone Card ──
export function MilestoneMiniTrend({
  logs,
  milestoneTitle,
}: {
  logs: EvaluatedLogItem[];
  milestoneTitle: string;
}) {
  if (!logs || logs.length === 0) return null;

  const data = logs.map((item) => {
    const rawDate = item.log.date || "";
    const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
    return {
      index: item.index,
      sessionLabel: `${item.index}회`,
      date: shortDate,
      topic: item.log.topic || `${item.index}회차 코칭`,
      typeLabel: item.log.typeLabel,
      sessionScore: item.score.total,
      cumulativeScore: item.cumulativeScore.total,
      completeness: item.score.completeness,
      specificity: item.score.specificity,
      processTracking: item.score.processTracking,
      selfReflection: item.score.selfReflection,
      learningTransfer: item.score.learningTransfer,
      groupName: item.group.name,
    };
  });

  return (
    <div className="bg-gradient-to-r from-purple-50/50 via-card to-indigo-50/30 dark:from-purple-950/20 dark:via-card dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <TrendingUp className="w-3.5 h-3.5 text-purple-600" />
          {milestoneTitle} 회차별 품질 점수 추세 ({logs[0]?.index}회 ~ {logs[logs.length - 1]?.index}회)
        </span>
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>
            {logs.length}건 작성 · 구간 내 최고:{" "}
            <strong className="text-purple-700 dark:text-purple-300">
              {Math.max(...logs.map((l) => l.score.total))}점
            </strong>
          </span>
        </div>
      </div>

      <div className="w-full h-36">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 15, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.6} />
            <XAxis
              dataKey="sessionLabel"
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              domain={[30, 100]}
              ticks={[40, 50, 60, 65, 70, 80, 90, 100]}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
              tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
            />
            <ReferenceLine y={80} stroke="#10b981" strokeDasharray="3 3" />
            <ReferenceLine y={65} stroke="#f59e0b" strokeDasharray="3 3" />
            <Line
              type="monotone"
              dataKey="sessionScore"
              name="회차 점수"
              stroke="#8b5cf6"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#8b5cf6", strokeWidth: 1, stroke: "#fff" }}
              activeDot={{ r: 6 }}
            />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
