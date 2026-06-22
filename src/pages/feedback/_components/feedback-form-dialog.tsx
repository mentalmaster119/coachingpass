import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
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
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Star } from "lucide-react";
import { Spinner } from "@/components/ui/spinner.tsx";
import { CATEGORY_LABELS, type FeedbackCategory } from "./feedback-constants.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import type { FeedbackItem } from "./feedback-card.tsx";

type Props = {
  open: boolean;
  onClose: () => void;
  traineeId?: Id<"users">;   // when creating for a specific trainee
  editing?: FeedbackItem | null;
};

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < (hover || value);
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            className="focus:outline-none"
          >
            <Star
              className={`w-6 h-6 transition-colors ${
                filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
              }`}
            />
          </button>
        );
      })}
      <span className="text-sm text-muted-foreground ml-1">
        {value > 0 ? `${value}점` : "평점 선택"}
      </span>
    </div>
  );
}

export default function FeedbackFormDialog({ open, onClose, traineeId, editing }: Props) {
  const [selectedTraineeId, setSelectedTraineeId] = useState<Id<"users"> | "">(traineeId ?? "");
  const [feedbackDate, setFeedbackDate] = useState(new Date().toISOString().split("T")[0]);
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState<FeedbackCategory>("overall");
  const [strengths, setStrengths] = useState("");
  const [improvements, setImprovements] = useState("");
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createFeedback = useMutation(api.coachFeedback.create);
  const updateFeedback = useMutation(api.coachFeedback.update);
  // Get list of assigned trainees for the dropdown
  const trainees = useQuery(api.admin.getMyAssignedTrainees);

  const isEditing = !!editing;

  useEffect(() => {
    if (editing) {
      setSelectedTraineeId(editing.traineeId);
      setFeedbackDate(editing.feedbackDate.split("T")[0]);
      setRating(editing.rating);
      setCategory(editing.category);
      setStrengths(editing.strengths);
      setImprovements(editing.improvements);
      setContent(editing.content ?? "");
    } else {
      setSelectedTraineeId(traineeId ?? "");
      setFeedbackDate(new Date().toISOString().split("T")[0]);
      setRating(0);
      setCategory("overall");
      setStrengths("");
      setImprovements("");
      setContent("");
    }
  }, [editing, traineeId, open]);

  const handleClose = () => {
    setRating(0);
    setStrengths("");
    setImprovements("");
    setContent("");
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTraineeId) { toast.error("수강생를 선택해주세요"); return; }
    if (rating === 0) { toast.error("평점을 선택해주세요"); return; }
    if (!strengths.trim()) { toast.error("잘한 점을 입력해주세요"); return; }
    if (!improvements.trim()) { toast.error("개선할 점을 입력해주세요"); return; }

    setIsLoading(true);
    try {
      if (isEditing && editing) {
        await updateFeedback({
          feedbackId: editing._id,
          rating,
          strengths: strengths.trim(),
          improvements: improvements.trim(),
          content: content.trim() || undefined,
          category,
        });
        toast.success("피드백이 수정되었습니다");
      } else {
        await createFeedback({
          traineeId: selectedTraineeId,
          feedbackDate,
          rating,
          strengths: strengths.trim(),
          improvements: improvements.trim(),
          content: content.trim() || undefined,
          category,
        });
        toast.success("피드백이 작성되었습니다");
      }
      handleClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "피드백 수정" : "피드백 작성"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Trainee selector (only when creating and no pre-selected trainee) */}
          {!isEditing && !traineeId && (
            <div>
              <Label>수강생 *</Label>
              <Select
                value={selectedTraineeId}
                onValueChange={(v) => setSelectedTraineeId(v as Id<"users">)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue placeholder="수강생 선택" />
                </SelectTrigger>
                <SelectContent>
                  {(trainees ?? []).map((t) => (
                    <SelectItem key={t._id} value={t._id}>
                      {t.name ?? "이름 미설정"} ({t.certificationGoal ?? "-"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Date */}
          <div>
            <Label htmlFor="fb-date">피드백 날짜 *</Label>
            <input
              id="fb-date"
              type="date"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={feedbackDate}
              onChange={(e) => setFeedbackDate(e.target.value)}
              max={new Date().toISOString().split("T")[0]}
              required
              disabled={isEditing}
            />
          </div>

          {/* Rating */}
          <div>
            <Label>종합 평점 *</Label>
            <div className="mt-2">
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>

          {/* Category */}
          <div>
            <Label>평가 유형 *</Label>
            <Select
              value={category}
              onValueChange={(v) => setCategory(v as FeedbackCategory)}
            >
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Strengths */}
          <div>
            <Label htmlFor="fb-strengths">잘한 점 *</Label>
            <Textarea
              id="fb-strengths"
              className="mt-1.5"
              rows={3}
              placeholder="수강생가 잘 수행한 점을 구체적으로 작성해주세요"
              value={strengths}
              onChange={(e) => setStrengths(e.target.value)}
              required
            />
          </div>

          {/* Improvements */}
          <div>
            <Label htmlFor="fb-improvements">개선할 점 *</Label>
            <Textarea
              id="fb-improvements"
              className="mt-1.5"
              rows={3}
              placeholder="앞으로 개선이 필요한 점을 구체적으로 작성해주세요"
              value={improvements}
              onChange={(e) => setImprovements(e.target.value)}
              required
            />
          </div>

          {/* Extra comment */}
          <div>
            <Label htmlFor="fb-content">추가 코멘트</Label>
            <Textarea
              id="fb-content"
              className="mt-1.5"
              rows={2}
              placeholder="기타 전달 사항이 있으면 작성해주세요 (선택)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={handleClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? <><Spinner className="mr-2" />저장 중...</> : isEditing ? "수정 완료" : "피드백 작성"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
