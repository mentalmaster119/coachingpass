import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  Legend,
} from "recharts";
import {
  TrendingUp,
  Users,
  User,
  Lightbulb,
  BarChart2,
  Activity,
} from "lucide-react";

const DOMAIN_LABELS: Record<string, string> = {
  motivation: "동기",
  skill: "기술",
  performance: "성과",
  relationship: "관계",
};

const DOMAIN_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))"];
const PIE_COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))"];

export default function CoachingStats() {
  const stats = useQuery(api.coaching.getMyStats);

  if (stats === undefined) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const hasAnyData = stats.totalApprovedCount > 0;

  const domainData = Object.entries(stats.domainCount)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: DOMAIN_LABELS[key] ?? key, value }));

  const typeData = [
    { name: "개인", value: stats.individualCount },
    { name: "그룹", value: stats.groupCount },
  ].filter((d) => d.value > 0);

  const radarData = stats.stateData
    .filter((s) => s.preAvg !== null || s.postAvg !== null)
    .map((s) => ({
      label: s.label,
      코칭전: s.preAvg ?? 0,
      코칭후: s.postAvg ?? 0,
    }));

  const maxTechCount = stats.topTechniques[0]?.count ?? 1;

  return (
    <div className="space-y-6">
      {/* Summary row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          icon={<TrendingUp className="w-4 h-4" />}
          label="승인된 총 시간"
          value={`${stats.totalApprovedHours}시간`}
        />
        <SummaryCard
          icon={<BarChart2 className="w-4 h-4" />}
          label="승인된 세션"
          value={`${stats.totalApprovedCount}건`}
        />
        <SummaryCard
          icon={<User className="w-4 h-4" />}
          label="개인 코칭"
          value={`${stats.individualCount}건`}
        />
        <SummaryCard
          icon={<Users className="w-4 h-4" />}
          label="그룹 코칭"
          value={`${stats.groupCount}건`}
        />
      </div>

      {!hasAnyData && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          승인된 코칭 기록이 없습니다. 기록을 제출하고 승인을 받으면 통계가 표시됩니다.
        </div>
      )}

      {hasAnyData && (
        <>
          {/* Monthly bar chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                월별 코칭 시간 추이 (최근 12개월)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={stats.monthlyData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value: number) => [`${value}시간`, "코칭 시간"]}
                    contentStyle={{ fontSize: 12, borderRadius: 8 }}
                  />
                  <Bar dataKey="hours" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Pie charts row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {typeData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Users className="w-4 h-4 text-primary" />
                    코칭 유형 비율
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={typeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {typeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}건`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </CardContent>
              </Card>
            )}

            {domainData.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    MCCI 도메인 분포
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <PieChart width={180} height={180}>
                    <Pie
                      data={domainData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }: { name: string; percent: number }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {domainData.map((_, i) => (
                        <Cell key={i} fill={DOMAIN_COLORS[i % DOMAIN_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v: number) => [`${v}건`]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </PieChart>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Top techniques */}
          {stats.topTechniques.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  자주 사용한 기법 TOP {stats.topTechniques.length}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {stats.topTechniques.map((t, i) => (
                  <div key={t.name} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium truncate">{t.name}</span>
                        <span className="text-xs text-muted-foreground ml-2 shrink-0">{t.count}회</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{ width: `${(t.count / maxTechCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Pre/Post state radar */}
          {radarData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  코칭 전·후 상태 평균 변화
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 12 }} />
                    <Radar name="코칭 전" dataKey="코칭전" stroke="hsl(var(--chart-2))" fill="hsl(var(--chart-2))" fillOpacity={0.25} />
                    <Radar name="코칭 후" dataKey="코칭후" stroke="hsl(var(--chart-1))" fill="hsl(var(--chart-1))" fillOpacity={0.35} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-lg font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
