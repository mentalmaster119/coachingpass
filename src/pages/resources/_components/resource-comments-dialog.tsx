import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Download, MessageSquare, Send, Sparkles, Trash2 } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  isNewResource,
  formatResourceDate,
} from "./resource-constants.ts";

export type ResourceItem = {
  _id: Id<"resources">;
  _creationTime: number;
  title: string;
  description?: string;
  category: "education" | "form" | "guideline" | "reference" | "other";
  fileName: string;
  fileUrl: string | null;
  uploaderName: string;
};

type Props = {
  resource: ResourceItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ROLE_LABELS: Record<string, string> = {
  admin: "관리자",
  senior_coach: "멘토코치",
  trainee: "코치",
  admin3: "열람",
};

export default function ResourceCommentsDialog({ resource, open, onOpenChange }: Props) {
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { user } = useCurrentUser();

  const comments = useQuery(
    api.resources.listComments,
    resource && open ? { resourceId: resource._id } : "skip",
  );
  const addComment = useMutation(api.resources.addComment);
  const deleteComment = useMutation(api.resources.deleteComment);
  const incrementDownload = useMutation(api.resources.incrementDownloadCount);

  if (!resource) return null;

  const isAdmin = user?.role === "admin" || user?.role === "senior_coach";
  const isNew = isNewResource(resource._creationTime);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      toast.error("소감 또는 댓글 내용을 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await addComment({ resourceId: resource._id, content: trimmed });
      setContent("");
      toast.success("소감이 등록되었습니다.");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("댓글 등록에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: Id<"resourceComments">) => {
    try {
      await deleteComment({ commentId });
      toast.success("댓글이 삭제되었습니다.");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("댓글 삭제에 실패했습니다.");
      }
    }
  };

  const handleDownload = async () => {
    if (!resource.fileUrl) return;
    try {
      await incrementDownload({ resourceId: resource._id });
      window.open(resource.fileUrl, "_blank");
    } catch {
      toast.error("다운로드에 실패했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl w-full max-h-[88dvh] flex flex-col">
        <DialogHeader className="flex-shrink-0 space-y-2 pr-6">
          <div className="flex items-center gap-2 flex-wrap">
            {isNew && (
              <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0 gap-1">
                <Sparkles className="w-2.5 h-2.5" />
                최신자료
              </Badge>
            )}
            <span
              className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[resource.category]}`}
            >
              {CATEGORY_LABELS[resource.category]}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatResourceDate(resource._creationTime)} · {resource.uploaderName}
            </span>
          </div>
          <DialogTitle className="text-base leading-snug">{resource.title}</DialogTitle>
          {resource.description && (
            <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
              {resource.description}
            </p>
          )}
          {resource.fileUrl && (
            <div className="pt-1">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleDownload}
                className="h-8 text-xs gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{resource.fileName} 다운로드</span>
              </Button>
            </div>
          )}
        </DialogHeader>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto border-t border-b py-3 space-y-3 min-h-[160px]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <MessageSquare className="w-3.5 h-3.5 text-primary" />
            <span>소감 및 댓글 ({comments?.length ?? 0})</span>
          </div>

          {comments === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full rounded-lg" />
              <Skeleton className="h-14 w-full rounded-lg" />
            </div>
          ) : comments.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              아직 남겨진 소감이나 댓글이 없습니다. 자료를 읽고 첫 소감을 남겨보세요!
            </div>
          ) : (
            <div className="space-y-2.5">
              {comments.map((c) => {
                const canDelete = user?._id === c.authorId || isAdmin;
                return (
                  <div
                    key={c._id}
                    className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-semibold text-foreground">
                          {c.authorName}
                        </span>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          {ROLE_LABELS[c.authorRole] ?? "코치"}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {formatResourceDate(c._creationTime)}
                        </span>
                      </div>
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(c._id)}
                          className="text-muted-foreground hover:text-destructive transition-colors p-1 cursor-pointer"
                          title="댓글 삭제"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Add comment form */}
        <form onSubmit={handleAdd} className="flex-shrink-0 space-y-2 pt-1">
          <Textarea
            rows={2}
            placeholder="자료를 읽고 느낀 점이나 질문, 소감을 자유롭게 남겨주세요..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={submitting}
            className="text-xs resize-none"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              size="sm"
              disabled={submitting || !content.trim()}
              className="h-8 text-xs gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? "등록 중..." : "소감 등록"}</span>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
