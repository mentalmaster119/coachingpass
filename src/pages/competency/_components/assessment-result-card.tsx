import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import {
  COMPETENCY_AREAS,
  AREA_COLORS,
  ALL_COMPETENCY_ITEMS,
  getItemsForGoal,
  type CompetencyArea,
} from "@/lib/kca-competencies.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  assessment: Doc<"competencyAssessments">;
  isLatest?: boolean;
};

type ScoreMap = Record<string, number>;

function buildScoreMap(assessment: Doc<"competencyAssessments">): ScoreMap {
  const map: ScoreMap = {};
  for (const s of assessment.scores) {
    map[s.itemId] = s.score;
  }
  return map;
}

function getAreaAverage(scoreMap: ScoreMap, area: CompetencyArea, goal: "KAC" | "KPC" | "SMPCC"): number {
  const items = getItemsForGoal(goal).filter((i) => i.area === area);
  if (items.length === 0) return 0;
  const scores = items.map((i) => scoreMap[i.id] ?? 0).filter((s) => s > 0);
  if (scores.length === 0) return 0;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

const SCORE_COLOR = (score: number) => {
  if (score >= 4.5) return "text-green-600";
  if (score >= 3.5) return "text-primary";
  if (score >= 2.5) return "text-yellow-600";
  return "text-destructive";
};

export default function AssessmentResultCard({ assessment, isLatest }: Props) {
  const scoreMap = buildScoreMap(assessment);
  const goal = assessment.certificationGoal ?? "SMPCC";

  const radarData = COMPETENCY_AREAS.map((area) => ({
    area,
    value: parseFloat(getAreaAverage(scoreMap, area, goal).toFixed(2)),
    fullMark: 5,
  }));

  const overallAvg =
    radarData.reduce((sum, d) => sum + d.value, 0) / radarData.filter((d) => d.value > 0).length;

  const items = getItemsForGoal(goal);

  return (
    <div className="bg-card border rounded-xl p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">
              {format(new Date(assessment.assessedAt), "yyyy년 M월 d일", { locale: ko })}
            </p>
            {isLatest && (
              <Badge className="text-[10px] h-4 px-1.5 bg-primary/15 text-primary border-primary/20">
                최신
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {goal} 기준 · 총 {items.length}개 항목
          </p>
        </div>
        <div className="text-right">
          <p className={cn("text-2xl font-bold", SCORE_COLOR(overallAvg))}>
            {isNaN(overallAvg) ? "-" : overallAvg.toFixed(1)}
          </p>
          <p className="text-xs text-muted-foreground">평균 점수</p>
        </div>
      </div>

      {/* Radar chart */}
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData}>
            <PolarGrid />
            <PolarAngleAxis
              dataKey="area"
              tick={{ fontSize: 11 }}
            />
            <Radar
              name="점수"
              dataKey="value"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              formatter={(value: number) => [`${value.toFixed(1)}점`, "점수"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Per-area scores */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {COMPETENCY_AREAS.map((area) => {
          const avg = getAreaAverage(scoreMap, area, goal);
          const areaItems = items.filter((i) => i.area === area);
          if (areaItems.length === 0) return null;
          return (
            <div
              key={area}
              className="rounded-lg border p-2.5 text-center space-y-0.5"
              style={{ borderColor: AREA_COLORS[area] + "40" }}
            >
              <div
                className="w-2 h-2 rounded-full mx-auto"
                style={{ backgroundColor: AREA_COLORS[area] }}
              />
              <p className="text-[11px] font-medium">{area}</p>
              <p className={cn("text-lg font-bold", SCORE_COLOR(avg))}>
                {avg > 0 ? avg.toFixed(1) : "-"}
              </p>
            </div>
          );
        })}
      </div>

      {/* Item breakdown */}
      <div className="space-y-1.5">
        {COMPETENCY_AREAS.map((area) => {
          const areaItems = items.filter((i) => i.area === area);
          if (areaItems.length === 0) return null;
          return (
            <div key={area}>
              <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: AREA_COLORS[area] }}
                />
                {area}
              </p>
              <div className="space-y-1 ml-3.5">
                {areaItems.map((item) => {
                  const score = scoreMap[item.id] ?? 0;
                  return (
                    <div key={item.id} className="flex items-center gap-2">
                      <span className="text-xs text-foreground/80 flex-1">{item.label}</span>
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <div
                            key={s}
                            className={cn(
                              "w-3 h-3 rounded-sm",
                              s <= score ? "opacity-100" : "opacity-15",
                            )}
                            style={{
                              backgroundColor: s <= score ? AREA_COLORS[area] : "hsl(var(--muted))",
                            }}
                          />
                        ))}
                      </div>
                      <span className={cn("text-xs font-bold w-4 text-right", SCORE_COLOR(score))}>
                        {score || "-"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Notes */}
      {assessment.overallNotes && (
        <div className="bg-muted/50 rounded-lg p-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">소감 메모</p>
          <p className="text-xs text-foreground whitespace-pre-wrap">{assessment.overallNotes}</p>
        </div>
      )}
    </div>
  );
}
