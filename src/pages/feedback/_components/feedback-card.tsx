import { useState } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Star, ThumbsUp, TrendingUp, MessageCircle, Trash2, Pencil } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "./feedback-constants.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

export type FeedbackItem = {
  _id: Id<"coachFeedbacks">;
  _creationTime: number;
  traineeId: Id<"users">;
  coachId: Id<"users">;
  feedbackDate: string;
  rating: number;
  strengths: string;
  improvements: string;
  content?: string;
  category: "coaching_skills" | "communication" | "self_development" | "overall";
  isRead: boolean;
  traineeName: string;
  coachName: string;
};

type Props = {
  feedback: FeedbackItem;
  showTraineeName?: boolean;  // admin/coach view: show who received
  showCoachName?: boolean;    // trainee view: show who wrote
  canEdit?: boolean;
  canDelete?: boolean;
  onEdit?: (feedback: FeedbackItem) => void;
  onDelete?: (id: Id<"coachFeedbacks">) => void;
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i < rating
              ? "fill-amber-400 text-amber-400"
              : "fill-muted text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function FeedbackCard({
  feedback,
  showTraineeName = false,
  showCoachName = false,
  canEdit = false,
  canDelete = false,
  onEdit,
  onDelete,
}: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const formattedDate = (() => {
    try {
      return format(new Date(feedback.feedbackDate), "yyyy년 M월 d일", { locale: ko });
    } catch {
      return feedback.feedbackDate;
    }
  })();

  return (
    <>
      <Card className={`transition-shadow hover:shadow-md ${!feedback.isRead ? "border-primary/40 bg-primary/5" : ""}`}>
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StarRating rating={feedback.rating} />
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[feedback.category]}`}
                >
                  {CATEGORY_LABELS[feedback.category]}
                </span>
                {!feedback.isRead && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-primary text-primary-foreground">
                    새 피드백
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{formattedDate}</span>
                {showCoachName && <><span>·</span><span>{feedback.coachName}</span></>}
                {showTraineeName && <><span>·</span><span>{feedback.traineeName}</span></>}
              </div>
            </div>
            {(canEdit || canDelete) && (
              <div className="flex gap-1 flex-shrink-0">
                {canEdit && onEdit && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onEdit(feedback)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}
                {canDelete && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-4 space-y-3">
          {/* Strengths */}
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-green-700 dark:text-green-400">
              <ThumbsUp className="w-3.5 h-3.5" />
              잘한 점
            </div>
            <p className="text-sm text-foreground leading-relaxed">{feedback.strengths}</p>
          </div>

          {/* Improvements */}
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 dark:text-blue-400">
              <TrendingUp className="w-3.5 h-3.5" />
              개선할 점
            </div>
            <p className="text-sm text-foreground leading-relaxed">{feedback.improvements}</p>
          </div>

          {/* Extra comment */}
          {feedback.content && (
            <div className="rounded-lg bg-muted/50 p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MessageCircle className="w-3.5 h-3.5" />
                추가 코멘트
              </div>
              <p className="text-sm text-foreground leading-relaxed">{feedback.content}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete confirm */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>피드백 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 피드백을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                onDelete?.(feedback._id);
                setShowDeleteConfirm(false);
              }}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
