import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";

type ReflectionDoc = Doc<"reflectionJournals">;

type RelatedType = "general" | "coaching" | "mentor_coaching" | "education";
type Mood = "great" | "good" | "neutral" | "difficult" | "challenging";

const RELATED_TYPE_OPTIONS: { value: RelatedType; label: string }[] = [
  { value: "general", label: "일반 성찰" },
  { value: "coaching", label: "코칭 실습" },
  { value: "mentor_coaching", label: "멘토코칭/코더코" },
  { value: "education", label: "교육 이수" },
];

const MOOD_OPTIONS: { value: Mood; label: string; emoji: string }[] = [
  { value: "great", label: "매우 좋음", emoji: "😊" },
  { value: "good", label: "좋음", emoji: "🙂" },
  { value: "neutral", label: "보통", emoji: "😐" },
  { value: "difficult", label: "어려움", emoji: "😔" },
  { value: "challenging", label: "도전적", emoji: "💪" },
];

interface ReflectionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editEntry?: ReflectionDoc | null;
}

export default function ReflectionForm({ open, onOpenChange, editEntry }: ReflectionFormProps) {
  const createJournal = useMutation(api.reflections.create);
  const updateJournal = useMutation(api.reflections.update);

  const [entryDate, setEntryDate] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [relatedType, setRelatedType] = useState<RelatedType | "">("");
  const [mood, setMood] = useState<Mood | "">("");
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const isEdit = !!editEntry;

  useEffect(() => {
    if (open) {
      setSubmitted(false);
      if (editEntry) {
        setEntryDate(editEntry.entryDate);
        setTitle(editEntry.title);
        setContent(editEntry.content);
        setRelatedType(editEntry.relatedType ?? "");
        setMood(editEntry.mood ?? "");
      } else {
        setEntryDate(new Date().toISOString().slice(0, 10));
        setTitle("");
        setContent("");
        setRelatedType("general");
        setMood("");
      }
    }
  }, [open, editEntry]);

  const errors = {
    entryDate: submitted && !entryDate ? "날짜를 선택해 주세요." : null,
    title: submitted && !title.trim() ? "제목을 입력해 주세요." : null,
    content: submitted && !content.trim() ? "내용을 입력해 주세요." : null,
  };

  const handleSubmit = async () => {
    setSubmitted(true);
    if (!entryDate || !title.trim() || !content.trim()) {
      return;
    }
    setSaving(true);
    try {
      if (isEdit && editEntry) {
        await updateJournal({
          journalId: editEntry._id,
          entryDate,
          title: title.trim(),
          content: content.trim(),
          relatedType: (relatedType as RelatedType) || undefined,
          mood: (mood as Mood) || undefined,
        });
        toast.success("일지가 수정되었습니다.");
      } else {
        await createJournal({
          entryDate,
          title: title.trim(),
          content: content.trim(),
          relatedType: (relatedType as RelatedType) || undefined,
          mood: (mood as Mood) || undefined,
        });
        toast.success("성찰 일지가 저장되었습니다.");
      }
      onOpenChange(false);
    } catch {
      toast.error("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "성찰 일지 수정" : "성찰 일지 작성"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="entryDate">날짜 <span className="text-destructive">*</span></Label>
              <Input
                id="entryDate"
                type="date"
                value={entryDate}
                onChange={(e) => { setEntryDate(e.target.value); }}
                className={errors.entryDate ? "border-destructive" : ""}
              />
              {errors.entryDate && (
                <p className="text-xs text-destructive">{errors.entryDate}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="relatedType">유형</Label>
              <Select value={relatedType} onValueChange={(v) => setRelatedType(v as RelatedType)}>
                <SelectTrigger id="relatedType">
                  <SelectValue placeholder="선택 안함" />
                </SelectTrigger>
                <SelectContent>
                  {RELATED_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">제목 <span className="text-destructive">*</span></Label>
            <Input
              id="title"
              placeholder="오늘의 성찰 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="content">내용 <span className="text-destructive">*</span></Label>
            <Textarea
              id="content"
              placeholder="오늘의 코칭 경험, 배운 점, 느낀 점 등을 자유롭게 작성해 보세요..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              className={`resize-none ${errors.content ? "border-destructive" : ""}`}
            />
            {errors.content && (
              <p className="text-xs text-destructive">{errors.content}</p>
            )}
            <p className="text-xs text-muted-foreground text-right">{content.length}자</p>
          </div>

          <div className="space-y-1.5">
            <Label>오늘의 감정</Label>
            <div className="flex gap-2 flex-wrap">
              {MOOD_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setMood(mood === opt.value ? "" : opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    mood === opt.value
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background text-foreground border-border hover:bg-muted"
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? "저장 중..." : isEdit ? "수정 완료" : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
