import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { Send, Trash2, MessageSquare, X } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  coachingLogId: Id<"coachingLogs">;
};

export default function CoachingLogCommentsDrawer({
  open,
  onOpenChange,
  coachingLogId,
}: Props) {
  const { user } = useCurrentUser();
  const comments = useQuery(api.comments.list, { coachingLogId });
  const addComment = useMutation(api.comments.add);
  const removeComment = useMutation(api.comments.remove);

  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new comments arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [comments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newComment.trim();
    if (!content) return;

    setSubmitting(true);
    try {
      await addComment({ coachingLogId, content });
      setNewComment("");
    } catch (err) {
      toast.error("댓글 작성에 실패했습니다.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: Id<"coachingLogComments">) => {
    if (!confirm("댓글을 삭제하시겠습니까?")) return;

    try {
      await removeComment({ commentId });
      toast.success("댓글이 삭제되었습니다.");
    } catch (err) {
      toast.error("댓글 삭제에 실패했습니다.");
      console.error(err);
    }
  };

  const formatCommentDate = (timestamp: number) => {
    return format(new Date(timestamp), "MM.dd HH:mm", { locale: ko });
  };

  const isLoading = comments === undefined;

  const roleMap: Record<string, string> = {
    admin: "관리자",
    senior_coach: "멘토코치",
    trainee: "교육생",
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col h-full border-l border-border bg-background">
        <SheetHeader className="px-4 py-3 border-b flex flex-row items-center justify-between flex-shrink-0">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            <MessageSquare className="w-4.5 h-4.5 text-primary" />
            피드백 댓글 스레드
          </SheetTitle>
        </SheetHeader>

        {/* Comments Feed */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3 bg-muted/20"
        >
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-2.5 max-w-[80%]">
                  <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-10 w-48 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          ) : comments.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-8">
              <MessageSquare className="w-8 h-8 mb-2 stroke-[1.5] text-muted-foreground/50" />
              <p className="text-xs font-medium">아직 등록된 댓글이 없습니다.</p>
              <p className="text-[11px] mt-0.5 text-muted-foreground/60">
                실습 기록에 관한 질문이나 피드백을 적어보세요.
              </p>
            </div>
          ) : (
            comments.map((comment: any) => {
              const isMe = user && comment.userId === user._id;
              const isAdminOrCoach = comment.role === "admin" || comment.role === "admin3" || comment.role === "senior_coach";

              return (
                <div
                  key={comment._id}
                  className={cn(
                    "flex flex-col max-w-[85%] rounded-lg px-3 py-2 text-xs relative group shadow-sm transition-all",
                    isMe
                      ? "ml-auto bg-primary text-primary-foreground rounded-tr-none"
                      : cn(
                          "mr-auto rounded-tl-none",
                          isAdminOrCoach
                            ? "bg-amber-50 dark:bg-amber-950/20 text-foreground border border-amber-200/50 dark:border-amber-800/30"
                            : "bg-card text-foreground border border-border"
                        )
                  )}
                >
                  {/* Sender details (Only for others) */}
                  {!isMe && (
                    <div className="flex items-center gap-1 mb-1 text-[10px] font-semibold text-muted-foreground">
                      <span>{comment.userName}</span>
                      <span className="text-[8px] px-1 py-0.1 rounded-full bg-muted-foreground/15">
                        {roleMap[comment.role] || comment.role}
                      </span>
                    </div>
                  )}

                  {/* Comment content */}
                  <p className="leading-normal whitespace-pre-wrap">{comment.content}</p>

                  {/* Footer (Time + Delete action) */}
                  <div
                    className={cn(
                      "flex items-center gap-1.5 mt-1 text-[8px] opacity-70",
                      isMe ? "justify-end text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    <span>{formatCommentDate(comment.createdAt)}</span>
                    {(isMe || (user && user.role === "admin")) && (
                      <button
                        onClick={() => handleDelete(comment._id)}
                        className={cn(
                          "cursor-pointer hover:underline flex items-center gap-0.5",
                          isMe ? "hover:text-red-300 text-primary-foreground/60" : "hover:text-destructive text-muted-foreground/60"
                        )}
                        title="삭제"
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Input area */}
        <form
          onSubmit={handleSubmit}
          className="p-3 border-t bg-card flex items-center gap-2 flex-shrink-0"
        >
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="메모나 피드백을 입력하세요..."
            disabled={submitting}
            className="flex-1 text-xs h-9 bg-background focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
          />
          <Button
            type="submit"
            size="icon"
            disabled={submitting || !newComment.trim()}
            className="w-9 h-9 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
