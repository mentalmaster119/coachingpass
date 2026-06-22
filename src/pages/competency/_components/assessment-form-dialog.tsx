import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import {
  getItemsForGoal,
  groupByArea,
  COMPETENCY_AREAS,
  AREA_COLORS,
  SCORE_LABELS,
  type CompetencyArea,
} from "@/lib/kca-competencies.ts";

type Props = {
  open: boolean;
  onClose: () => void;
  certificationGoal: "KAC" | "KPC" | "SMPCC";
};

export default function AssessmentFormDialog({ open, onClose, certificationGoal }: Props) {
  const submit = useMutation(api.competencyAssessments.submitAssessment);

  const items = getItemsForGoal(certificationGoal);
  const grouped = groupByArea(items);

  const [scores, setScores] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const setScore = (itemId: string, score: number) => {
    setScores((prev) => ({ ...prev, [itemId]: score }));
  };

  const completedCount = Object.keys(scores).length;
  const totalCount = items.length;
  const isComplete = completedCount === totalCount;

  const handleSubmit = async () => {
    if (!isComplete) {
      toast.error(`모든 항목을 평가해 주세요 (${completedCount}/${totalCount})`);
      return;
    }
    setLoading(true);
    try {
      const scoreArray = Object.entries(scores).map(([itemId, score]) => ({ itemId, score }));
      await submit({
        certificationGoal: certificationGoal === "SMPCC" ? "SMPCC" as const : undefined,
        scores: scoreArray,
        overallNotes: notes.trim() || undefined,
      });
      toast.success("자가 평가가 저장되었습니다");
      onClose();
      setScores({});
      setNotes("");
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "저장 실패");
      } else {
        toast.error("오류가 발생했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  const SCORE_COLORS: Record<number, string> = {
    1: "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25",
    2: "bg-orange-500/10 text-orange-600 border-orange-500/30 hover:bg-orange-500/20",
    3: "bg-yellow-500/10 text-yellow-700 border-yellow-500/30 hover:bg-yellow-500/20",
    4: "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20",
    5: "bg-green-500/15 text-green-700 border-green-500/30 hover:bg-green-500/25",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            KCA 핵심역량 자가 평가
            <Badge variant="outline" className="text-[11px] font-normal">
              {certificationGoal} 기준
            </Badge>
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            각 역량 항목을 솔직하게 평가해 주세요. 1점(매우 부족) ~ 5점(매우 우수)
          </p>
          {/* Progress */}
          <div className="flex items-center gap-2 pt-1">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {completedCount} / {totalCount}
            </span>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-6 pr-1">
          {COMPETENCY_AREAS.map((area) => {
            const areaItems = grouped[area as CompetencyArea];
            if (!areaItems || areaItems.length === 0) return null;
            return (
              <div key={area}>
                {/* Area header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: AREA_COLORS[area as CompetencyArea] }}
                  />
                  <h3 className="font-semibold text-sm">{area}</h3>
                  <span className="text-xs text-muted-foreground">
                    ({areaItems.filter((i) => scores[i.id] !== undefined).length}/{areaItems.length})
                  </span>
                </div>

                {/* Items */}
                <div className="space-y-3 ml-5">
                  {areaItems.map((item) => {
                    const current = scores[item.id];
                    return (
                      <div key={item.id} className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">{item.label}</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {[1, 2, 3, 4, 5].map((score) => (
                            <button
                              key={score}
                              onClick={() => setScore(item.id, score)}
                              className={cn(
                                "flex flex-col items-center px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
                                current === score
                                  ? SCORE_COLORS[score] + " ring-2 ring-offset-1 ring-primary/40"
                                  : "border-border text-muted-foreground hover:bg-accent",
                              )}
                            >
                              <span className="text-sm font-bold">{score}</span>
                              <span className="text-[10px] hidden sm:block">{SCORE_LABELS[score]}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {/* Overall notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">전체 소감 및 메모 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="이번 자가 평가에 대한 소감, 향후 개선 목표 등을 자유롭게 작성하세요"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="border-t pt-3">
          <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading || !isComplete}>
            {loading ? "저장 중..." : `평가 완료 (${completedCount}/${totalCount})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
