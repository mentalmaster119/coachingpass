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
  topic: string;
  content: string;
  reflection: string;
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
    topic: editLog?.topic ?? "",
    content: editLog?.content ?? "",
    reflection: editLog?.reflection ?? "",
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
      topic: values.topic.trim(),
      content: values.content.trim(),
      reflection: values.reflection.trim() || undefined,
    };

    if (!trimmed.sessionDate) return toast.error("날짜를 선택하세요.");
    if (!trimmed.coachName) return toast.error("코치명을 입력하세요.");
    if (isNaN(trimmed.durationMinutes) || trimmed.durationMinutes < 30)
      return toast.error("세션 시간은 최소 30분이어야 합니다.");
    if (!trimmed.topic) return toast.error("주제를 입력하세요.");
    if (trimmed.content.length < 10) return toast.error("세션 내용을 더 자세히 입력하세요.");

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
            <Label>세션 주제 *</Label>
            <Input
              placeholder="예: ICF 핵심역량 피드백, 코칭 스킬 심화"
              value={values.topic}
              onChange={(e) => set("topic")(e.target.value)}
            />
          </div>

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
