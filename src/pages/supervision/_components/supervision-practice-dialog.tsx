import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
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
import { Copy, Save, Send, Check, Calendar as CalendarIcon, Clock, MapPin, User, CheckCircle2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingLog?: any | null;
  onSuccess?: () => void;
};

export default function SupervisionPracticeDialog({
  open,
  onOpenChange,
  editingLog,
  onSuccess,
}: Props) {
  const { user: currentUser } = useCurrentUser();
  const createLog = useMutation(api.coaching.create);
  const updateLog = useMutation(api.coaching.update);
  const saveDraft = useMutation(api.coaching.saveDraft);

  // A. 기본 정보
  const [coachName, setCoachName] = useState("");
  const [coacheeInfo, setCoacheeInfo] = useState("");
  const [coachingDate, setCoachingDate] = useState(new Date().toISOString().slice(0, 10));
  const [location, setLocation] = useState("국제멘탈코칭센터");
  const [durationMinutes, setDurationMinutes] = useState(30);

  // B. 코칭 진행 내용
  const [topic, setTopic] = useState("");
  const [goals, setGoals] = useState("");
  const [coachingProcess, setCoachingProcess] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [toolOther, setToolOther] = useState("");
  const [toolUsageDetail, setToolUsageDetail] = useState("");

  // C. 동료 및 수퍼바이저 피드백
  const [peerStrengths, setPeerStrengths] = useState("");
  const [peerImprovements, setPeerImprovements] = useState("");
  const [supervisorStrengths, setSupervisorStrengths] = useState("");
  const [supervisorImprovements, setSupervisorImprovements] = useState("");

  // D. 나의 자기성찰
  const [reflectionLearning, setReflectionLearning] = useState("");

  // E. 다음 코칭 적용 및 소감
  const [nextCoachingIdeas, setNextCoachingIdeas] = useState("");
  const [overallImpression, setOverallImpression] = useState("");

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (editingLog) {
      setCoachName(currentUser?.name ?? "");
      setCoacheeInfo(editingLog.coacheeInfo ?? "");
      setCoachingDate(editingLog.coachingDate ?? new Date().toISOString().slice(0, 10));
      setLocation(editingLog.coachingPlaceOther ?? "국제멘탈코칭센터");
      setDurationMinutes(editingLog.durationMinutes ?? 30);

      setTopic(editingLog.topic ?? "");
      setGoals(editingLog.goals ?? "");
      setCoachingProcess(editingLog.coachingProcess ?? editingLog.summary ?? "");
      setSelectedTools(editingLog.techniquesUsed ?? []);
      setToolOther(editingLog.techniqueOther ?? "");
      setToolUsageDetail(editingLog.toolUsageDetail ?? editingLog.mostEffectiveTechnique ?? "");

      setPeerStrengths(editingLog.peerStrengths ?? "");
      setPeerImprovements(editingLog.peerImprovements ?? "");
      setSupervisorStrengths(editingLog.supervisorStrengths ?? "");
      setSupervisorImprovements(editingLog.supervisorImprovements ?? "");

      setReflectionLearning(editingLog.svReflectionLearning ?? editingLog.reflection ?? "");
      setNextCoachingIdeas(editingLog.actionPlan ?? "");
      setOverallImpression(editingLog.coachOverallFeedback ?? "");
    } else {
      setCoachName(currentUser?.name ?? "");
      setCoacheeInfo("");
      setCoachingDate(new Date().toISOString().slice(0, 10));
      setLocation("국제멘탈코칭센터");
      setDurationMinutes(30);

      setTopic("");
      setGoals("");
      setCoachingProcess("");
      setSelectedTools([]);
      setToolOther("");
      setToolUsageDetail("");

      setPeerStrengths("");
      setPeerImprovements("");
      setSupervisorStrengths("");
      setSupervisorImprovements("");

      setReflectionLearning("");
      setNextCoachingIdeas("");
      setOverallImpression("");
    }
  }, [editingLog, currentUser, open]);

  const toggleTool = (tool: string) => {
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    );
  };

  // Helper to compile structured texts
  const compilePayload = () => {
    const formattedSupervisorFeedback = [
      supervisorStrengths ? `[수퍼바이저가 알려준 잘한 점]\n${supervisorStrengths}` : "",
      supervisorImprovements ? `[수퍼바이저가 알려준 개선할 점]\n${supervisorImprovements}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const formattedPeerFeedback = [
      peerStrengths ? `[동료가 알려준 잘한 점]\n${peerStrengths}` : "",
      peerImprovements ? `[동료가 알려준 개선할 점]\n${peerImprovements}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    return {
      coachingDate,
      durationMinutes: Number(durationMinutes) || 30,
      coachingType: "sv" as const,
      coachingPlace: "center" as const,
      coachingPlaceOther: location,
      coacheeInfo: coacheeInfo.trim() || "동료",
      topic: topic.trim() || "수퍼비전 코칭 실습",
      goals: goals.trim() || "코칭 목표 수립 및 역량 점검",
      summary: coachingProcess.trim() || "수퍼비전 실습 진행",
      techniquesUsed: selectedTools,
      techniqueOther: toolOther.trim() || undefined,
      mostEffectiveTechnique: toolUsageDetail.trim() || undefined,
      svSupervisorFeedback: formattedSupervisorFeedback || undefined,
      svPeerFeedback: formattedPeerFeedback || undefined,
      svReflectionLearning: reflectionLearning.trim() || undefined,
      reflection: reflectionLearning.trim() || undefined,
      actionPlan: nextCoachingIdeas.trim() || undefined,
      coachOverallFeedback: overallImpression.trim() || undefined,
      bestOfSession: supervisorStrengths || peerStrengths || undefined,
      improvementForNext: supervisorImprovements || peerImprovements || undefined,
      // Extended fields
      coachingProcess: coachingProcess.trim() || undefined,
      toolUsageDetail: toolUsageDetail.trim() || undefined,
      peerStrengths: peerStrengths.trim() || undefined,
      peerImprovements: peerImprovements.trim() || undefined,
      supervisorStrengths: supervisorStrengths.trim() || undefined,
      supervisorImprovements: supervisorImprovements.trim() || undefined,
    };
  };

  // 텍스트 클립보드 복사 포맷팅
  const handleCopyText = () => {
    const lines = [
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "📝 멘탈코칭 실습 기록지 (멘탈코치 역할 교육생 작성)",
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      "",
      "A. 실습 기본정보",
      `• 멘탈코치(작성자): ${coachName || currentUser?.name || "미입력"}`,
      `• 고객 역할 동료: ${coacheeInfo || "미입력"}`,
      `• 실습 일자: ${coachingDate}`,
      `• 장소: ${location}`,
      `• 코칭 시간: ${durationMinutes}분`,
      "",
      "B. 코칭 진행 내용",
      `1. 고객이 가져온 코칭 주제:\n${topic || "미입력"}`,
      "",
      `2. 합의한 코칭 목표:\n${goals || "미입력"}`,
      "",
      `3. 코칭 프로세스:\n${coachingProcess || "미입력"}`,
      "",
      `4. 사용한 멘탈코칭 툴:\n${selectedTools.join(", ") || "선택 없음"}${toolOther ? ` (${toolOther})` : ""}`,
      "",
      `5. 코칭 툴을 어떻게 활용했는가?:\n${toolUsageDetail || "미입력"}`,
      "",
      "C. 동료 및 수퍼바이저 피드백",
      `6. 동료가 알려준 잘한 점:\n${peerStrengths || "미입력"}`,
      "",
      `7. 동료가 알려준 개선할 점:\n${peerImprovements || "미입력"}`,
      "",
      `8. 수퍼바이저가 알려준 잘한 점:\n${supervisorStrengths || "미입력"}`,
      "",
      `9. 수퍼바이저가 알려준 개선할 점:\n${supervisorImprovements || "미입력"}`,
      "",
      "D. 나의 자기성찰",
      `10. 이번 실습을 통해 새롭게 깨달은 점:\n${reflectionLearning || "미입력"}`,
      "",
      "E. 다음 코칭 적용 및 소감",
      `11. 다음 코칭에 적용할 아이디어:\n${nextCoachingIdeas || "미입력"}`,
      "",
      `12. 실습 소감:\n${overallImpression || "미입력"}`,
      "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    ];

    navigator.clipboard.writeText(lines.join("\n"));
    setCopied(true);
    toast.success("작성된 실습 기록이 클립보드에 복사되었습니다!");
    setTimeout(() => setCopied(false), 2000);
  };

  // 임시저장
  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const payload = compilePayload();
      await saveDraft({
        logId: editingLog?._id,
        ...payload,
      });
      toast.success("실습 기록이 임시저장되었습니다.");
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "임시저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  // 최종 제출 (승인 요청)
  const handleSubmit = async () => {
    if (!coacheeInfo.trim()) {
      toast.error("고객 역할 동료 이름을 입력해 주세요.");
      return;
    }
    if (!topic.trim()) {
      toast.error("고객이 가져온 코칭 주제를 입력해 주세요.");
      return;
    }
    if (!goals.trim()) {
      toast.error("합의한 코칭 목표를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      const payload = compilePayload();
      if (editingLog && editingLog.approvalStatus !== "draft") {
        await updateLog({
          logId: editingLog._id,
          ...payload,
        });
        toast.success("수퍼비전 실습 기록이 수정되었습니다.");
      } else {
        await createLog(payload);
        toast.success("수퍼비전 실습 기록이 제출되었습니다!");
      }
      onOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      toast.error(err?.message || "기록 등록에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full max-h-[92dvh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  멘탈코칭 실습 기록지
                </DialogTitle>
                <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                  멘탈코치 역할 교육생 작성
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                수퍼비전 코칭에서 멘탈코치 역할로 참가한 코칭실습을 작성하고 수퍼비전 받은 피드백 내용을 기록합니다.
              </p>
            </div>
            <Badge variant="secondary" className="text-[11px] font-normal hidden sm:inline-flex">
              웹 입력 양식
            </Badge>
          </div>
        </DialogHeader>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* A. 실습 기본정보 */}
          <div className="space-y-3 p-4 rounded-xl bg-purple-50/20 border border-purple-100 dark:border-purple-900/30">
            <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
              <User className="w-4 h-4 text-purple-600" />
              A. 실습 기본정보
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">멘탈코치(작성자)</Label>
                <Input
                  value={coachName || currentUser?.name || ""}
                  onChange={(e) => setCoachName(e.target.value)}
                  placeholder="멘탈코치 이름"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">
                  고객 역할 동료 <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={coacheeInfo}
                  onChange={(e) => setCoacheeInfo(e.target.value)}
                  placeholder="이름"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs flex items-center gap-1">
                  <CalendarIcon className="w-3.5 h-3.5" /> 실습 일자 <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="date"
                  value={coachingDate}
                  onChange={(e) => setCoachingDate(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" /> 장소
                  </Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="국제멘탈코칭센터"
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 시간(분)
                  </Label>
                  <Input
                    type="number"
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value))}
                    min={10}
                    step={5}
                    className="h-9 text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* B. 코칭 진행 내용 */}
          <div className="space-y-4 p-4 rounded-xl bg-muted/20 border border-border">
            <h3 className="text-sm font-bold text-foreground">B. 코칭 진행 내용</h3>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                1. 고객이 가져온 코칭 주제 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="고객이 다루고 싶어 한 핵심 주제"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">
                2. 합의한 코칭 목표 <span className="text-destructive">*</span>
              </Label>
              <Input
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                placeholder="예: 경기 중 불안 정도 8점 → 4점"
                className="text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">3. 코칭 프로세스</Label>
              <Textarea
                value={coachingProcess}
                onChange={(e) => setCoachingProcess(e.target.value)}
                placeholder="주제 명료화 → 목표 설정 → 상태 탐색 → 툴 활용 → 변화 확인 → 마무리"
                rows={3}
                className="text-xs resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold">4. 사용한 멘탈코칭 툴 (복수 선택)</Label>
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

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">5. 코칭 툴을 어떻게 활용했는가?</Label>
              <Textarea
                value={toolUsageDetail}
                onChange={(e) => setToolUsageDetail(e.target.value)}
                placeholder="선택 이유, 진행 방식, 고객 반응"
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* C. 동료 및 수퍼바이저 피드백 */}
          <div className="space-y-4 p-4 rounded-xl bg-purple-50/20 border border-purple-100 dark:border-purple-900/30">
            <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300">
              C. 동료 및 수퍼바이저 피드백
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">6. 동료가 알려준 잘한 점</Label>
                <Textarea
                  value={peerStrengths}
                  onChange={(e) => setPeerStrengths(e.target.value)}
                  placeholder="고객 역할 동료의 피드백"
                  rows={3}
                  className="text-xs resize-none bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">7. 동료가 알려준 개선할 점</Label>
                <Textarea
                  value={peerImprovements}
                  onChange={(e) => setPeerImprovements(e.target.value)}
                  placeholder="동료가 제안한 개선점"
                  rows={3}
                  className="text-xs resize-none bg-background"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-900 dark:text-purple-300 font-semibold">
                  8. 수퍼바이저가 알려준 잘한 점
                </Label>
                <Textarea
                  value={supervisorStrengths}
                  onChange={(e) => setSupervisorStrengths(e.target.value)}
                  placeholder="수퍼바이저 코치님의 피드백 (강점)"
                  rows={3}
                  className="text-xs resize-none bg-background border-purple-200"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-purple-900 dark:text-purple-300 font-semibold">
                  9. 수퍼바이저가 알려준 개선할 점
                </Label>
                <Textarea
                  value={supervisorImprovements}
                  onChange={(e) => setSupervisorImprovements(e.target.value)}
                  placeholder="수퍼바이저 코치님의 피드백 (개선 방향)"
                  rows={3}
                  className="text-xs resize-none bg-background border-purple-200"
                />
              </div>
            </div>
          </div>

          {/* D. 나의 자기성찰 */}
          <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border">
            <h3 className="text-sm font-bold text-foreground">D. 나의 자기성찰</h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">10. 이번 실습을 통해 새롭게 깨달은 점</Label>
              <Textarea
                value={reflectionLearning}
                onChange={(e) => setReflectionLearning(e.target.value)}
                placeholder="코칭 기술, 툴 활용, 나의 반응, 고객의 변화 등에 대한 발견"
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* E. 다음 코칭 적용 및 소감 */}
          <div className="space-y-4 p-4 rounded-xl bg-purple-50/20 border border-purple-100 dark:border-purple-900/30">
            <h3 className="text-sm font-bold text-purple-950 dark:text-purple-300">
              E. 다음 코칭 적용 및 소감
            </h3>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">11. 다음 코칭에 적용할 아이디어</Label>
              <Textarea
                value={nextCoachingIdeas}
                onChange={(e) => setNextCoachingIdeas(e.target.value)}
                placeholder="다음 코칭에서 구체적으로 다르게 시도할 행동"
                rows={3}
                className="text-xs resize-none bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">12. 실습 소감</Label>
              <Textarea
                value={overallImpression}
                onChange={(e) => setOverallImpression(e.target.value)}
                placeholder="실습을 마치며 느낀 점"
                rows={3}
                className="text-xs resize-none bg-background"
              />
            </div>
          </div>
        </div>

        {/* Footer Toolbar */}
        <DialogFooter className="px-6 py-3 border-t border-border bg-background flex-row sm:justify-between items-center gap-2 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyText}
            className="text-xs gap-1.5 border-dashed"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "복사 완료!" : "작성된 실습 기록 복사"}
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSaveDraft}
              disabled={saving}
              className="text-xs gap-1"
            >
              <Save className="w-3.5 h-3.5" />
              임시저장
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1"
            >
              <Send className="w-3.5 h-3.5" />
              {saving ? "저장 중..." : "최종 제출하기"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
