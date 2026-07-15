import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type MentorLog = Doc<"mentorCoachingLogs"> & { evidenceUrl?: string | null };

type SessionType = "mentor_coaching" | "coder_co";

interface FormState {
  sessionDate: string;
  sessionType: SessionType;
  coachName: string;
  durationMinutes: string;
  location: string;
  topic: string;
  content: string;
  reflection: string;
  coacheeGoal: string;
  coachingTool: string;
  powerfulQuestion: string;
  learnedAsCoach: string;
  actionPlan: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editLog?: MentorLog;
}

function getDefaultValues(editLog?: MentorLog): FormState {
  return {
    sessionDate: editLog?.sessionDate ?? new Date().toISOString().slice(0, 10),
    sessionType: editLog?.sessionType ?? "mentor_coaching",
    coachName: editLog?.coachName ?? "",
    durationMinutes: String(editLog?.durationMinutes ?? 60),
    location: editLog?.location ?? "",
    topic: editLog?.topic ?? "",
    content: editLog?.content ?? "",
    reflection: editLog?.reflection ?? "",
    coacheeGoal: editLog?.coacheeGoal ?? "",
    coachingTool: editLog?.coachingTool ?? "",
    powerfulQuestion: editLog?.powerfulQuestion ?? "",
    learnedAsCoach: editLog?.learnedAsCoach ?? "",
    actionPlan: editLog?.actionPlan ?? "",
  };
}

export default function MentorCoachingForm({ open, onOpenChange, editLog }: Props) {
  const [values, setValues] = useState<FormState>(() => getDefaultValues(editLog));
  const [loading, setLoading] = useState(false);
  const createLog = useMutation(api.mentorCoaching.create);
  const updateLog = useMutation(api.mentorCoaching.update);

  const isEdit = !!editLog;

  const set = (key: keyof FormState) => (val: string) =>
    setValues((prev) => ({ ...prev, [key]: val }));

  const handleOpenChange = (v: boolean) => {
    if (!v) setValues(getDefaultValues(editLog));
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = {
      sessionDate: values.sessionDate.trim(),
      sessionType: values.sessionType,
      coachName: values.coachName.trim(),
      durationMinutes: parseInt(values.durationMinutes, 10),
      location: values.sessionType === "mentor_coaching" ? values.location.trim() : undefined,
      topic: values.topic.trim(),
      content: values.content.trim(),
      reflection: values.sessionType === "coder_co" ? (values.reflection.trim() || undefined) : undefined,
      coacheeGoal: values.sessionType === "mentor_coaching" ? values.coacheeGoal.trim() : undefined,
      coachingTool: values.sessionType === "mentor_coaching" ? values.coachingTool.trim() : undefined,
      powerfulQuestion: values.sessionType === "mentor_coaching" ? values.powerfulQuestion.trim() : undefined,
      learnedAsCoach: values.sessionType === "mentor_coaching" ? values.learnedAsCoach.trim() : undefined,
      actionPlan: values.sessionType === "mentor_coaching" ? values.actionPlan.trim() : undefined,
    };

    if (!trimmed.sessionDate) return toast.error("날짜를 선택하세요.");
    if (!trimmed.coachName) return toast.error("코치명을 입력하세요.");
    if (isNaN(trimmed.durationMinutes) || trimmed.durationMinutes < 30)
      return toast.error("세션 시간은 최소 30분이어야 합니다.");
    if (!trimmed.topic) return toast.error("주제를 입력하세요.");

    if (values.sessionType === "mentor_coaching") {
      if (!trimmed.location) return toast.error("장소를 입력하세요.");
      if (!trimmed.coacheeGoal) return toast.error("기대 결과를 입력하세요.");
      if (!trimmed.coachingTool) return toast.error("대표적인 코칭 도구를 입력하세요.");
      if (!trimmed.powerfulQuestion) return toast.error("가장 강력했던 질문을 입력하세요.");
      if (!trimmed.learnedAsCoach) return toast.error("코치로서 배운 점을 입력하세요.");
      if (!trimmed.actionPlan) return toast.error("실행 과제를 입력하세요.");
      if (trimmed.content.length < 5) return toast.error("피코칭 소감을 입력하세요.");
    } else {
      if (trimmed.content.length < 10) return toast.error("세션 내용을 더 자세히 입력하세요.");
    }

    setLoading(true);
    try {
      if (isEdit && editLog) {
        await updateLog({ logId: editLog._id, ...trimmed });
        toast.success("기록이 수정되었습니다.");
      } else {
        await createLog(trimmed);
        toast.success("기록이 추가되었습니다. 검토 후 승인됩니다.");
      }
      handleOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "슈퍼비전 기록 수정" : "슈퍼비전 기록 추가"}</DialogTitle>
          <DialogDescription>슈퍼비전 세션 정보를 입력하세요.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Session type + date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>세션 유형 *</Label>
              <Select value={values.sessionType} onValueChange={set("sessionType")}>
                <SelectTrigger>
                  <SelectValue placeholder="유형 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mentor_coaching">개인 슈퍼비전</SelectItem>
                  <SelectItem value="coder_co">그룹 슈퍼비전</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>세션 날짜 *</Label>
              <Input
                type="date"
                value={values.sessionDate}
                onChange={(e) => set("sessionDate")(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          {/* Coach + duration */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>담당 슈퍼바이저명 *</Label>
              <Input
                placeholder="예: 홍길동 코치"
                value={values.coachName}
                onChange={(e) => set("coachName")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>세션 시간 (분) *</Label>
              <Input
                type="number"
                min={30}
                step={30}
                placeholder="60"
                value={values.durationMinutes}
                onChange={(e) => set("durationMinutes")(e.target.value)}
              />
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label>{values.sessionType === "mentor_coaching" ? "피코칭 주제 (이슈) *" : "세션 주제 *"}</Label>
            <Input
              placeholder={values.sessionType === "mentor_coaching" ? "예: 대화 집중도 저하 및 진로 고민 코칭" : "예: ICF 핵심역량 피드백, 코칭 스킬 심화"}
              value={values.topic}
              onChange={(e) => set("topic")(e.target.value)}
            />
          </div>

          {values.sessionType === "mentor_coaching" ? (
            <>
              {/* Place (Location) */}
              <div className="space-y-1.5">
                <Label>코칭 장소 *</Label>
                <Input
                  placeholder="예: Zoom, 대면, 오프라인 카페 등"
                  value={values.location}
                  onChange={(e) => set("location")(e.target.value)}
                />
              </div>

              {/* Goal */}
              <div className="space-y-1.5">
                <Label>기대 결과 (목표) *</Label>
                <Textarea
                  placeholder="이번 세션을 통해 어떤 해결책이나 목표를 얻고 싶었나요?"
                  rows={2}
                  value={values.coacheeGoal}
                  onChange={(e) => set("coacheeGoal")(e.target.value)}
                />
              </div>

              {/* Coaching Tools */}
              <div className="space-y-1.5">
                <Label>대표적인 코칭 도구 (TL, HI, HPPC, 9F, PI, VAK, CT 등) *</Label>
                <Input
                  placeholder="예: TL, HI, HPPC, 9F, PI, VAK, CT 등 사용된 도구 입력"
                  value={values.coachingTool}
                  onChange={(e) => set("coachingTool")(e.target.value)}
                />
              </div>

              {/* Powerful Question */}
              <div className="space-y-1.5">
                <Label>가장 강력했던 질문 *</Label>
                <Textarea
                  placeholder="멘토코치가 던진 질문 중 나를 가장 성찰하게 만든 질문과 그 이유는 무엇인가요?"
                  rows={3}
                  value={values.powerfulQuestion}
                  onChange={(e) => set("powerfulQuestion")(e.target.value)}
                />
              </div>

              {/* Learned As Coach */}
              <div className="space-y-1.5">
                <Label>코치로서 배운 점 *</Label>
                <Textarea
                  placeholder="피코칭 경험을 통해 나의 향후 코칭에 적용하고 싶은 멘토코치의 스킬이나 태도는 무엇인가요?"
                  rows={3}
                  value={values.learnedAsCoach}
                  onChange={(e) => set("learnedAsCoach")(e.target.value)}
                />
              </div>

              {/* Action Plan */}
              <div className="space-y-1.5">
                <Label>향후 실행 과제 (Action Item) *</Label>
                <Textarea
                  placeholder="세션을 마친 후 멘토코치와 약속한 나의 구체적인 실천 계획은 무엇인가요?"
                  rows={2}
                  value={values.actionPlan}
                  onChange={(e) => set("actionPlan")(e.target.value)}
                />
              </div>

              {/* Content (mapped to 소감) */}
              <div className="space-y-1.5">
                <Label>피코칭 소감 *</Label>
                <Textarea
                  placeholder="멘토코칭을 받고 난 최종 소감 및 깨달음을 남겨주세요"
                  rows={3}
                  value={values.content}
                  onChange={(e) => set("content")(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              {/* Content */}
              <div className="space-y-1.5">
                <Label>세션 내용 요약 *</Label>
                <Textarea
                  placeholder="세션에서 다룬 내용, 피드백, 개선점 등을 기록하세요"
                  rows={4}
                  value={values.content}
                  onChange={(e) => set("content")(e.target.value)}
                />
              </div>

              {/* Reflection */}
              <div className="space-y-1.5">
                <Label>성찰 (선택)</Label>
                <Textarea
                  placeholder="세션 후 느낀 점, 앞으로의 개선 방향 등"
                  rows={3}
                  value={values.reflection}
                  onChange={(e) => set("reflection")(e.target.value)}
                />
              </div>
            </>
          )}

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : isEdit ? "수정하기" : "추가하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
