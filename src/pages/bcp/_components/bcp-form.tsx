import { useState, useRef } from "react";
import { useMutation, useQuery } from "convex/react";
import { Paperclip, X } from "lucide-react";
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
import { cn } from "@/lib/utils.ts";

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
  sessionStartTime: string;
  sessionEndTime: string;
  buddyId1: string;
  myRole: "coach" | "coachee";
  durationMinutes: string;
  location: string;
  topic: string;
  content: string;
  reflection: string;
  techniquesUsed: string[];
  techniqueOther: string;
  clientInsight: string;
  coachPattern: string;
  actionPlan: string;
  bestOfSession: string;
  improvementForNext: string;
}

// Checkbox selection group component
function CheckboxGroup({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onToggle(opt)}
          className={cn(
            "px-3 py-1.5 rounded-full text-xs border transition-colors cursor-pointer",
            selected.includes(opt)
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:border-primary/50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

// Techniques list
const TECHNIQUES = [
  "히어로인터뷰",
  "포스트잇",
  "타임라인",
  "HPPC",
  "VAK",
  "루틴",
  "의자기법",
  "3F",
  "3x5 질문법",
];

// Generate time options with 10-minute intervals (00:00 to 23:50)
const TIME_OPTIONS: string[] = [];
for (let hour = 0; hour < 24; hour++) {
  for (let min = 0; min < 60; min += 10) {
    const hStr = String(hour).padStart(2, "0");
    const mStr = String(min).padStart(2, "0");
    TIME_OPTIONS.push(`${hStr}:${mStr}`);
  }
}

// Helper to calculate duration in minutes between start and end times
function calculateMinutes(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const startTotal = sh * 60 + sm;
  let endTotal = eh * 60 + em;
  if (endTotal < startTotal) {
    endTotal += 24 * 60; // Wrap around to next day
  }
  return endTotal - startTotal;
}

function getDefaultValues(editLog?: BcpLog): FormState {
  return {
    sessionDate: editLog?.sessionDate ?? new Date().toISOString().slice(0, 10),
    sessionStartTime: editLog?.sessionStartTime ?? "09:00",
    sessionEndTime: editLog?.sessionEndTime ?? "10:00",
    buddyId1: editLog?.buddyId1 ?? "",
    myRole: "coach",
    durationMinutes: String(editLog?.durationMinutes ?? 60),
    location: editLog?.location ?? "",
    topic: editLog?.topic ?? "",
    content: editLog?.content ?? "",
    reflection: editLog?.reflection ?? "",
    techniquesUsed: editLog?.techniquesUsed ?? [],
    techniqueOther: editLog?.techniqueOther ?? "",
    clientInsight: editLog?.clientInsight ?? "",
    coachPattern: editLog?.coachPattern ?? "",
    actionPlan: editLog?.actionPlan ?? "",
    bestOfSession: editLog?.bestOfSession ?? "",
    improvementForNext: editLog?.improvementForNext ?? "",
  };
}

export default function BcpForm({ open, onOpenChange, editLog }: Props) {
  const [values, setValues] = useState<FormState>(() => getDefaultValues(editLog));
  const [loading, setLoading] = useState(false);

  const buddies = useQuery(api.bcp.getCohortBuddies);
  const createLog = useMutation(api.bcp.create);
  const updateLog = useMutation(api.bcp.update);
  const saveDraft = useMutation(api.bcp.saveDraft);
  const submitDraft = useMutation(api.bcp.submitDraft);

  const isEdit = !!editLog;

  const [file, setFile] = useState<File | null>(null);
  const [existingEvidenceId, setExistingEvidenceId] = useState<Id<"_storage"> | undefined>(
    editLog?.evidenceStorageId
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.bcp.generateUploadUrl);

  const set = <K extends keyof FormState>(key: K) =>
    (val: FormState[K]) => setValues((prev) => ({ ...prev, [key]: val }));

  const handleStartTimeChange = (start: string) => {
    const dur = calculateMinutes(start, values.sessionEndTime);
    setValues((prev) => ({
      ...prev,
      sessionStartTime: start,
      durationMinutes: String(dur),
    }));
  };

  const handleEndTimeChange = (end: string) => {
    const dur = calculateMinutes(values.sessionStartTime, end);
    setValues((prev) => ({
      ...prev,
      sessionEndTime: end,
      durationMinutes: String(dur),
    }));
  };

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      setValues(getDefaultValues(editLog));
      setFile(null);
      setExistingEvidenceId(editLog?.evidenceStorageId);
    }
    onOpenChange(v);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (selected.size > 10 * 1024 * 1024) {
        toast.error("파일 크기는 10MB 이하만 가능합니다.");
        return;
      }
      setFile(selected);
    }
  };

  const removeFile = () => {
    setFile(null);
    setExistingEvidenceId(undefined);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadFileIfNeeded = async (): Promise<Id<"_storage"> | undefined> => {
    if (file) {
      const postUrl = await generateUploadUrl();
      const resp = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!resp.ok) throw new Error("파일 업로드에 실패했습니다.");
      const { storageId } = (await resp.json()) as { storageId: string };
      return storageId as Id<"_storage">;
    }
    return existingEvidenceId;
  };

  const handleSaveDraft = async () => {
    const buddyId1 = values.buddyId1 ? (values.buddyId1 as Id<"users">) : undefined;
    const dur = calculateMinutes(values.sessionStartTime, values.sessionEndTime);

    setLoading(true);
    try {
      const evidenceStorageId = await uploadFileIfNeeded();
      const payload = {
        sessionDate: values.sessionDate || undefined,
        sessionStartTime: values.sessionStartTime || undefined,
        sessionEndTime: values.sessionEndTime || undefined,
        buddyId1,
        myRole: "coach" as const,
        durationMinutes: isNaN(dur) ? undefined : dur,
        location: values.location.trim() || undefined,
        topic: values.topic.trim() || undefined,
        content: values.content.trim() || undefined,
        reflection: values.reflection.trim() || undefined,
        techniquesUsed: values.techniquesUsed.length > 0 ? values.techniquesUsed : undefined,
        techniqueOther: values.techniqueOther.trim() || undefined,
        clientInsight: values.clientInsight.trim() || undefined,
        coachPattern: values.coachPattern.trim() || undefined,
        actionPlan: values.actionPlan.trim() || undefined,
        bestOfSession: values.bestOfSession.trim() || undefined,
        improvementForNext: values.improvementForNext.trim() || undefined,
        evidenceStorageId,
      };

      if (isEdit && editLog) {
        await saveDraft({ logId: editLog._id, ...payload });
      } else {
        await saveDraft(payload);
      }
      toast.success("임시저장되었습니다.");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "임시저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const buddyId1 = values.buddyId1 as Id<"users">;

    if (!values.sessionDate) return toast.error("날짜를 선택하세요.");
    if (!values.sessionStartTime) return toast.error("시작 시간을 선택하세요.");
    if (!values.sessionEndTime) return toast.error("종료 시간을 선택하세요.");
    if (!values.buddyId1) return toast.error("버디 파트너를 선택하세요.");
    
    const dur = calculateMinutes(values.sessionStartTime, values.sessionEndTime);
    if (isNaN(dur) || dur < 30) return toast.error("세션 시간은 최소 30분이어야 합니다.");
    if (!values.topic.trim()) return toast.error("코칭 주제를 입력하세요.");
    if (values.content.trim().length < 10) return toast.error("세션 내용을 더 자세히 입력하세요.");

    setLoading(true);
    try {
      const evidenceStorageId = await uploadFileIfNeeded();
      const payload = {
        sessionDate: values.sessionDate,
        sessionStartTime: values.sessionStartTime,
        sessionEndTime: values.sessionEndTime,
        buddyId1,
        myRole: "coach" as const,
        durationMinutes: dur,
        location: values.location.trim() || undefined,
        topic: values.topic.trim(),
        content: values.content.trim(),
        reflection: values.reflection.trim() || undefined,
        techniquesUsed: values.techniquesUsed.length > 0 ? values.techniquesUsed : undefined,
        techniqueOther: values.techniqueOther.trim() || undefined,
        clientInsight: values.clientInsight.trim() || undefined,
        coachPattern: values.coachPattern.trim() || undefined,
        actionPlan: values.actionPlan.trim() || undefined,
        bestOfSession: values.bestOfSession.trim() || undefined,
        improvementForNext: values.improvementForNext.trim() || undefined,
        evidenceStorageId,
      };

      if (isEdit && editLog) {
        if (editLog.approvalStatus === "draft") {
          await submitDraft({ logId: editLog._id, ...payload });
          toast.success("버디코칭 기록이 제출되었습니다. 검토 후 승인됩니다.");
        } else {
          await updateLog({ logId: editLog._id, ...payload });
          toast.success("기록이 수정되었습니다.");
        }
      } else {
        await createLog(payload);
        toast.success("버디코칭 기록이 추가되었습니다. 검토 후 승인됩니다.");
      }
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "버디코칭 실습 기록 수정" : "버디코칭 실습 기록 추가"}</DialogTitle>
          <DialogDescription>
            버디코칭 실습 정보를 입력하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Date */}
          <div className="space-y-1.5">
            <Label>실습 날짜 *</Label>
            <Input
              type="date"
              value={values.sessionDate}
              onChange={(e) => set("sessionDate")(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
            />
          </div>

          {/* Time Picker */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>시작 시간 *</Label>
              <Select value={values.sessionStartTime} onValueChange={handleStartTimeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>종료 시간 *</Label>
              <Select value={values.sessionEndTime} onValueChange={handleEndTimeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-[200px] overflow-y-auto">
                  {TIME_OPTIONS.map((time) => (
                    <SelectItem key={time} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Buddy Partner */}
          <div className="space-y-1.5">
            <Label>버디 파트너 *</Label>
            {buddies === undefined ? (
              <div className="h-9 bg-muted rounded-md animate-pulse" />
            ) : buddies.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                같은 기수의 동기가 없습니다. 관리자에게 문의하세요.
              </p>
            ) : (
              <Select value={values.buddyId1} onValueChange={set("buddyId1")}>
                <SelectTrigger>
                  <SelectValue placeholder="버디 파트너 선택" />
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

          {/* Duration + Location */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>세션 시간 (자동 계산)</Label>
              <Input
                type="text"
                readOnly
                disabled
                value={`${values.durationMinutes}분`}
                className="bg-muted cursor-not-allowed text-muted-foreground font-medium"
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
              placeholder="버디코칭에서 다룬 내용, 진행 방식 등을 기록하세요"
              rows={4}
              value={values.content}
              onChange={(e) => set("content")(e.target.value)}
            />
          </div>

          {/* ── 사용 기법 ── */}
          <div className="space-y-2.5 pt-3 border-t border-border">
            <Label className="text-sm font-semibold text-foreground">사용 기법 (선택)</Label>
            <CheckboxGroup
              options={TECHNIQUES}
              selected={values.techniquesUsed}
              onToggle={(opt) => {
                const isSel = values.techniquesUsed.includes(opt);
                const next = isSel
                  ? values.techniquesUsed.filter((x) => x !== opt)
                  : [...values.techniquesUsed, opt];
                set("techniquesUsed")(next);
              }}
            />
            <div className="space-y-1.5 mt-1.5">
              <Label className="text-xs text-muted-foreground">기타 기법 (직접 입력)</Label>
              <Input
                placeholder="예: 경청, 질문 기법 등 기타 기법 입력"
                value={values.techniqueOther}
                onChange={(e) => set("techniqueOther")(e.target.value)}
              />
            </div>
          </div>

          {/* ── 핵심 발견 ── */}
          <div className="space-y-3 pt-3 border-t border-border">
            <Label className="text-sm font-semibold text-foreground">핵심 발견</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">고객의 핵심 통찰 (선택)</Label>
              <Textarea
                placeholder="고객이 새롭게 깨닫거나 알게 된 통찰을 기록하세요"
                rows={2}
                value={values.clientInsight}
                onChange={(e) => set("clientInsight")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">코치가 발견한 핵심 패턴 (선택)</Label>
              <Textarea
                placeholder="코치로서 대화 과정 중 발견한 고객의 행동/언어적 패턴을 기록하세요"
                rows={2}
                value={values.coachPattern}
                onChange={(e) => set("coachPattern")(e.target.value)}
              />
            </div>
          </div>

          {/* ── 실행 및 성장 ── */}
          <div className="space-y-3 pt-3 border-t border-border">
            <Label className="text-sm font-semibold text-foreground">실행 및 성장</Label>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">고객의 실행계획 (선택)</Label>
              <Textarea
                placeholder="세션 종료 후 고객이 실천하기로 약속한 실행계획을 기록하세요"
                rows={2}
                value={values.actionPlan}
                onChange={(e) => set("actionPlan")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">이번 세션에서 가장 잘한 점 (선택)</Label>
              <Textarea
                placeholder="코치로서 스스로 만족스러웠던 경청이나 질문 등 잘한 점을 적어보세요"
                rows={2}
                value={values.bestOfSession}
                onChange={(e) => set("bestOfSession")(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">다음 세션에서 개선할 점 (선택)</Label>
              <Textarea
                placeholder="다음 코칭 실습 시 더 보완하고 싶은 아쉬웠던 점을 성찰해보세요"
                rows={2}
                value={values.improvementForNext}
                onChange={(e) => set("improvementForNext")(e.target.value)}
              />
            </div>
          </div>

          {/* Reflection */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <Label>종합 성찰 (선택)</Label>
            <Textarea
              placeholder="세션 후 느낀 점, 배운 점 등 종합적인 성찰 요약"
              rows={3}
              value={values.reflection}
              onChange={(e) => set("reflection")(e.target.value)}
            />
          </div>

          {/* 증빙 자료 첨부 */}
          <div className="space-y-1.5 pt-3 border-t border-border">
            <Label>증빙 자료 <span className="text-xs text-muted-foreground font-normal">(사진, PDF 등 선택)</span></Label>
            {file ?? existingEvidenceId ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-secondary text-sm">
                <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="flex-1 truncate text-muted-foreground">
                  {file ? file.name : "기존 첨부 파일"}
                </span>
                <button type="button" onClick={removeFile} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bcp-evidence-file"
                />
                <label
                  htmlFor="bcp-evidence-file"
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-dashed border-border text-sm text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors"
                >
                  <Paperclip className="w-4 h-4" />
                  PDF, JPG, PNG 파일 첨부
                </label>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>
              취소
            </Button>
            {(!isEdit || editLog?.approvalStatus === "draft") && (
              <Button type="button" variant="secondary" onClick={handleSaveDraft} disabled={loading}>
                임시저장
              </Button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : isEdit && editLog?.approvalStatus !== "draft" ? "수정하기" : "제출하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
