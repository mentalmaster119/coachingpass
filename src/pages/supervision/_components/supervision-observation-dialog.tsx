import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Copy, Save, Check, CheckCircle2, User, Award } from "lucide-react";

const MENTAL_TOOLS = [
  "히어로 인터뷰",
  "시간선",
  "포스트잇",
  "9 Factors",
  "HPPC",
  "VAK",
  "의자기법",
  "3F",
  "기타",
] as const;

type CompetencyKey =
  | "topicClarity"
  | "goalQuantification"
  | "toolSelection"
  | "toolProficiency"
  | "toolStandardAdherence"
  | "selfTalkQuality"
  | "questionAppropriateness"
  | "activeListening"
  | "praiseEnergy";

const COMPETENCIES: { key: CompetencyKey; title: string; desc: string }[] = [
  { key: "topicClarity", title: "1. 주제 명료화", desc: "고객과 코칭 주제를 구체적으로 합의했는가?" },
  { key: "goalQuantification", title: "2. 목표 수치화", desc: "현재와 목표 상태를 수치화하고 변화 기준을 정했는가?" },
  { key: "toolSelection", title: "3. 툴 선정 적합성", desc: "고객의 주제와 목표에 적합한 툴을 선택했는가?" },
  { key: "toolProficiency", title: "4. 툴 활용 숙련도", desc: "툴을 자연스럽고 능숙하게 진행했는가?" },
  { key: "toolStandardAdherence", title: "5. 툴 활용 기준 준수", desc: "툴의 핵심 절차와 안전 기준을 준수했는가?" },
  { key: "selfTalkQuality", title: "6. 셀프토킹의 질 향상 촉진", desc: "고객의 내면 대화 인식과 유용한 변화가 촉진되었는가?" },
  { key: "questionAppropriateness", title: "7. 질문의 적절성", desc: "고객의 인식·판단·선택을 촉진했는가?" },
  { key: "activeListening", title: "8. 경청과 반응", desc: "고객의 말·감정·비언어적 반응에 적절히 반응했는가?" },
  { key: "praiseEnergy", title: "9. 칭찬·인정·에너지 촉진", desc: "구체적이고 진정성 있는 인정으로 고객을 지지했는가?" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTraineeName?: string;
};

export default function SupervisionObservationDialog({
  open,
  onOpenChange,
  defaultTraineeName = "",
}: Props) {
  const createJournal = useMutation((api as any).supervisionJournals.createJournal);

  const [traineeName, setTraineeName] = useState(defaultTraineeName);
  const [topic, setTopic] = useState("");
  const [currentScore, setCurrentScore] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolOther, setToolOther] = useState("");

  const [scores, setScores] = useState<Record<CompetencyKey, string>>({
    topicClarity: "3",
    goalQuantification: "3",
    toolSelection: "3",
    toolProficiency: "3",
    toolStandardAdherence: "3",
    selfTalkQuality: "3",
    questionAppropriateness: "3",
    activeListening: "3",
    praiseEnergy: "3",
  });

  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [nextActionPlan, setNextActionPlan] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Compute average score (excluding N/O)
  const numericScores = Object.values(scores)
    .filter((s) => s !== "NO" && !isNaN(Number(s)))
    .map((s) => Number(s));
  const avgScore =
    numericScores.length > 0
      ? (numericScores.reduce((a, b) => a + b, 0) / numericScores.length).toFixed(1)
      : null;

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  const handleScoreChange = (key: CompetencyKey, val: string) => {
    setScores((prev) => ({ ...prev, [key]: val }));
  };

  // 텍스트 복사 포맷팅
  const handleCopy = () => {
    const lines = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "📋 멘탈코칭 수퍼바이징 일지 (V3.0 - 현장 관찰형)",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      `• 교육생(수퍼바이지): ${traineeName || "미입력"}`,
      `• 코칭 주제: ${topic || "미입력"}`,
      `• 현재 상태 점수: ${currentScore || "미입력"} | 목표 상태 점수: ${targetScore || "미입력"}`,
      `• 활용한 멘탈코칭 툴: ${selectedTools.join(", ") || "선택 없음"}${toolOther ? ` (${toolOther})` : ""}`,
      "",
      `[9개 역량 관찰평가] (평균: ${avgScore ? `${avgScore} / 4.0` : "-"})`,
      ...COMPETENCIES.map((c) => `• ${c.title}: ${scores[c.key] === "NO" ? "N/O" : `${scores[c.key]}점`}`),
      "",
      `[가장 잘한 점 (관찰된 강점)]\n${strengths || "미입력"}`,
      "",
      `[가장 개선이 필요한 점 (우선 개선점)]\n${improvements || "미입력"}`,
      "",
      `[다음 코칭에서 연습할 과제 (구체적 실행 행동)]\n${nextActionPlan || "미입력"}`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("수퍼바이징 일지 내용이 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!traineeName.trim()) {
      toast.error("교육생(수퍼바이지) 이름을 입력해 주세요.");
      return;
    }
    if (!topic.trim()) {
      toast.error("코칭 주제를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await createJournal({
        traineeName: traineeName.trim(),
        coachingDate: new Date().toISOString().slice(0, 10),
        topic: topic.trim(),
        currentScore: currentScore.trim() || undefined,
        targetScore: targetScore.trim() || undefined,
        toolsUsed: selectedTools,
        toolOther: toolOther.trim() || undefined,
        competencies: scores,
        averageScore: avgScore ? Number(avgScore) : undefined,
        strengths: strengths.trim(),
        improvements: improvements.trim(),
        nextActionPlan: nextActionPlan.trim(),
      });
      toast.success("수퍼바이징 일지가 저장되었습니다!");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-purple-50/30 dark:bg-purple-950/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  멘탈코칭 수퍼바이징 일지
                </DialogTitle>
                <Badge className="bg-purple-600 text-white text-[11px]">
                  V3.0 · 현장 관찰형
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                수퍼바이저(멘토코치)가 현장에서 수퍼바이지 교육생의 코칭 실습을 관찰하고 평가 및 피드백을 기록합니다.
              </p>
            </div>
            <Badge variant="outline" className="text-[11px] hidden sm:inline-flex">
              수퍼바이저 입력 양식
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Supervisee & Topic */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                교육생 (수퍼바이지) <span className="text-destructive">*</span>
              </Label>
              <Input
                value={traineeName}
                onChange={(e) => setTraineeName(e.target.value)}
                placeholder="이름"
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                코칭 주제 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="예: 경기 중 실수 후 자신감 회복"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">현재 상태 점수</Label>
                <Input
                  value={currentScore}
                  onChange={(e) => setCurrentScore(e.target.value)}
                  placeholder="예: 3/10"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">목표 상태 점수</Label>
                <Input
                  value={targetScore}
                  onChange={(e) => setTargetScore(e.target.value)}
                  placeholder="예: 8/10"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            {/* Tools Used */}
            <div className="space-y-2 pt-2">
              <Label className="text-xs font-semibold">활용한 멘탈코칭 툴 (복수 선택)</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {MENTAL_TOOLS.map((t) => {
                  const selected = selectedTools.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTool(t)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-xs text-left transition-all ${
                        selected
                          ? "bg-purple-100 border-purple-400 text-purple-900 font-semibold dark:bg-purple-950/40 dark:text-purple-300"
                          : "bg-background border-border hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          selected ? "border-purple-600 bg-purple-600 text-white" : "border-muted-foreground/40"
                        }`}
                      >
                        {selected && <Check className="w-2.5 h-2.5" />}
                      </div>
                      <span>{t}</span>
                    </button>
                  );
                })}
              </div>
              {selectedTools.includes("기타") && (
                <Input
                  value={toolOther}
                  onChange={(e) => setToolOther(e.target.value)}
                  placeholder="기타 사용 툴 이름을 직접 입력해 주세요"
                  className="h-8 text-xs mt-1.5"
                />
              )}
            </div>
          </div>

          {/* 9개 역량 관찰평가 */}
          <div className="space-y-4 p-4 rounded-xl bg-purple-50/20 border border-purple-100 dark:border-purple-900/30">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300">
                  9개 역량 관찰평가
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  1 미흡 · 2 부분적 수행 · 3 적절한 수행 · 4 능숙하고 일관된 수행 · N/O 관찰 기회 없음
                </p>
              </div>
              <Badge className="bg-purple-700 text-white text-xs px-2.5 py-1">
                평균 {avgScore ? `${avgScore} / 4.0` : "- / 4"}
              </Badge>
            </div>

            <div className="divide-y divide-border/60">
              {COMPETENCIES.map((c) => (
                <div key={c.key} className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-xs font-semibold text-foreground">{c.title}</p>
                    <p className="text-[11px] text-muted-foreground">{c.desc}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 self-end sm:self-center">
                    {(["1", "2", "3", "4", "NO"] as const).map((scoreVal) => {
                      const isSelected = scores[c.key] === scoreVal;
                      return (
                        <button
                          key={scoreVal}
                          type="button"
                          onClick={() => handleScoreChange(c.key, scoreVal)}
                          className={`w-8 h-7 text-xs rounded border font-medium transition-all ${
                            isSelected
                              ? scoreVal === "NO"
                                ? "bg-muted-foreground text-background border-muted-foreground font-bold"
                                : "bg-purple-600 text-white border-purple-600 font-bold"
                              : "bg-background border-border hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {scoreVal === "NO" ? "N/O" : scoreVal}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Qualitative Feedback */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">가장 잘한 점</Label>
              <Textarea
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                placeholder="관찰된 강점 한 가지"
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">가장 개선이 필요한 점</Label>
              <Textarea
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                placeholder="우선 개선점 한 가지"
                rows={2}
                className="text-xs resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">다음 코칭에서 연습할 과제</Label>
              <Textarea
                value={nextActionPlan}
                onChange={(e) => setNextActionPlan(e.target.value)}
                placeholder="구체적인 실행 행동"
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-3 border-t border-border bg-background flex-row sm:justify-between items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="text-xs gap-1.5 border-dashed"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "복사 완료!" : "기록 내용 복사"}
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={saving}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? "저장 중..." : "일지 저장하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
