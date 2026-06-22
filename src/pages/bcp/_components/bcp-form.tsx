import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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

type BcpLog = Doc<"bcpLogs"> & {
  buddy1Name: string;
  buddy2Name: string | null;
  evidenceUrl?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editLog?: BcpLog;
}

interface FormState {
  sessionDate: string;
  buddyId1: string;
  buddyId2: string;
  myRole: "coach" | "coachee";
  durationMinutes: string;
  location: string;
  topic: string;
  content: string;
  reflection: string;
}

function getDefaultValues(editLog?: BcpLog): FormState {
  return {
    sessionDate: editLog?.sessionDate ?? new Date().toISOString().slice(0, 10),
    buddyId1: editLog?.buddyId1 ?? "",
    buddyId2: editLog?.buddyId2 ?? "",
    myRole: editLog?.myRole ?? "coach",
    durationMinutes: String(editLog?.durationMinutes ?? 60),
    location: editLog?.location ?? "",
    topic: editLog?.topic ?? "",
    content: editLog?.content ?? "",
    reflection: editLog?.reflection ?? "",
  };
}

export default function BcpForm({ open, onOpenChange, editLog }: Props) {
  const [values, setValues] = useState<FormState>(() => getDefaultValues(editLog));
  const [loading, setLoading] = useState(false);

  const buddies = useQuery(api.bcp.getCohortBuddies);
  const createLog = useMutation(api.bcp.create);
  const updateLog = useMutation(api.bcp.update);

  const isEdit = !!editLog;

  const set = <K extends keyof FormState>(key: K) =>
    (val: FormState[K]) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleOpenChange = (v: boolean) => {
    if (!v) setValues(getDefaultValues(editLog));
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const buddyId1 = values.buddyId1 as Id<"users">;
    const buddyId2 = values.buddyId2 ? (values.buddyId2 as Id<"users">) : undefined;

    if (!values.sessionDate) return toast.error("날짜를 선택하세요.");
    if (!values.buddyId1) return toast.error("버디 파트너 1을 선택하세요.");
    if (buddyId2 && buddyId2 === buddyId1) return toast.error("버디 파트너 1과 2는 달라야 합니다.");
    const dur = parseInt(values.durationMinutes, 10);
    if (isNaN(dur) || dur < 30) return toast.error("세션 시간은 최소 30분이어야 합니다.");
    if (!values.topic.trim()) return toast.error("코칭 주제를 입력하세요.");
    if (values.content.trim().length < 10) return toast.error("세션 내용을 더 자세히 입력하세요.");

    const payload = {
      sessionDate: values.sessionDate,
      buddyId1,
      buddyId2,
      myRole: values.myRole,
      durationMinutes: dur,
      location: values.location.trim() || undefined,
      topic: values.topic.trim(),
      content: values.content.trim(),
      reflection: values.reflection.trim() || undefined,
    };

    setLoading(true);
    try {
      if (isEdit && editLog) {
        await updateLog({ logId: editLog._id, ...payload });
        toast.success("기록이 수정되었습니다.");
      } else {
        await createLog(payload);
        toast.success("BCP 기록이 추가되었습니다. 검토 후 승인됩니다.");
      }
      handleOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  // Filter buddy list to exclude already selected buddy
  const availableBuddy2 = buddies?.filter((b) => b._id !== values.buddyId1) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "BCP 기록 수정" : "BCP 버디코칭 기록 추가"}</DialogTitle>
          <DialogDescription>
            버디코칭 실습(BCP) 정보를 입력하세요. 동일 버디 2명과의 실습은 총 1건으로 인정됩니다.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date + Role */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>실습 날짜 *</Label>
              <Input
                type="date"
                value={values.sessionDate}
                onChange={(e) => set("sessionDate")(e.target.value)}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>나의 역할 *</Label>
              <Select
                value={values.myRole}
                onValueChange={(v) => set("myRole")(v as "coach" | "coachee")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="coach">코치 역할</SelectItem>
                  <SelectItem value="coachee">고객(코치이) 역할</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buddy 1 */}
          <div className="space-y-1.5">
            <Label>버디 파트너 1 *</Label>
            {buddies === undefined ? (
              <div className="h-9 bg-muted rounded-md animate-pulse" />
            ) : buddies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                같은 기수의 동기가 없습니다. 관리자에게 문의하세요.
              </p>
            ) : (
              <Select value={values.buddyId1} onValueChange={set("buddyId1")}>
                <SelectTrigger>
                  <SelectValue placeholder="동기생 선택" />
                </SelectTrigger>
                <SelectContent>
                  {buddies.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Buddy 2 (optional) */}
          <div className="space-y-1.5">
            <Label>버디 파트너 2 (선택)</Label>
            <Select
              value={values.buddyId2 || "none"}
              onValueChange={(v) => set("buddyId2")(v === "none" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="두 번째 버디 (선택)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">선택 안 함</SelectItem>
                {availableBuddy2.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              * 동일 버디 조합(2명)의 실습은 총 1건만 인정됩니다.
            </p>
          </div>

          {/* Duration + Location */}
          <div className="grid grid-cols-2 gap-3">
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
            <div className="space-y-1.5">
              <Label>장소 (선택)</Label>
              <Input
                placeholder="예: 양재센터, Zoom"
                value={values.location}
                onChange={(e) => set("location")(e.target.value)}
              />
            </div>
          </div>

          {/* Topic */}
          <div className="space-y-1.5">
            <Label>코칭 주제 *</Label>
            <Input
              placeholder="예: 목표 설정, 자기 인식 향상"
              value={values.topic}
              onChange={(e) => set("topic")(e.target.value)}
            />
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label>세션 내용 요약 *</Label>
            <Textarea
              placeholder="버디코칭에서 다룬 내용, 서로의 역할, 진행 방식 등을 기록하세요"
              rows={4}
              value={values.content}
              onChange={(e) => set("content")(e.target.value)}
            />
          </div>

          {/* Reflection */}
          <div className="space-y-1.5">
            <Label>성찰 (선택)</Label>
            <Textarea
              placeholder="세션 후 느낀 점, 배운 점, 개선할 점 등"
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
