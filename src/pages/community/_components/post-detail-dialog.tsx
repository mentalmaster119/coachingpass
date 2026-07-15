import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { formatDistanceToNow, format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Eye, Heart, MessageSquare, Pin, Trash2, Pencil, CornerDownRight, Send, Bookmark,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import PostFormDialog from "./post-form-dialog.tsx";

type Category = "general" | "question" | "sharing" | "resource";

const CATEGORY_CONFIG: Record<Category, { label: string; color: string }> = {
  general:  { label: "자유게시판", color: "bg-muted text-muted-foreground" },
  question: { label: "질문/답변",  color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  sharing:  { label: "경험 나눔",  color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  resource: { label: "자료 공유",  color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
};

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  senior_coach: "슈퍼바이저",
  trainee: "교육생",
};

interface Props {
  postId: Id<"communityPosts"> | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}

function CommentItem({
  comment,
  myId,
  myRole,
  onDelete,
  onReply,
  depth,
}: {
  comment: {
    _id: Id<"communityComments">;
    _creationTime: number;
    authorId: Id<"users">;
    content: string;
    isDeleted: boolean;
    parentCommentId?: Id<"communityComments">;
    authorName: string;
    authorRole: string;
  };
  myId: Id<"users"> | undefined;
  myRole: string;
  onDelete: (id: Id<"communityComments">) => void;
  onReply: (id: Id<"communityComments">, name: string) => void;
  depth: number;
}) {
  const canDelete = myId && (comment.authorId === myId || myRole === "admin");
  return (
    <div className={cn("flex gap-2.5", depth > 0 && "ml-6 pl-3 border-l border-border")}>
      {depth > 0 && <CornerDownRight className="w-3.5 h-3.5 text-muted-foreground mt-1 flex-shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={cn("text-xs font-semibold", comment.isDeleted && "text-muted-foreground")}>
            {comment.isDeleted ? "삭제된 댓글" : comment.authorName}
          </span>
          {!comment.isDeleted && (
            <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
              {ROLE_LABEL[comment.authorRole] ?? comment.authorRole}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(comment._creationTime), { addSuffix: true, locale: ko })}
          </span>
        </div>
        <p className={cn("text-sm mt-1 leading-relaxed", comment.isDeleted && "text-muted-foreground italic")}>
          {comment.content}
        </p>
        {!comment.isDeleted && (
          <div className="flex items-center gap-2 mt-1.5">
            {depth === 0 && (
              <button
                onClick={() => onReply(comment._id, comment.authorName)}
                className="text-[11px] text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                답글
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment._id)}
                className="text-[11px] text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
              >
                삭제
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostDetailDialog({ postId, open, onOpenChange, onDeleted }: Props) {
  const { user: me } = useCurrentUser();
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState<{ id: Id<"communityComments">; name: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const post = useQuery(api.community.getPost, postId ? { postId } : "skip");
  const comments = useQuery(api.community.getComments, postId ? { postId } : "skip");

  const incrementView = useMutation(api.community.incrementViewCount);
  const toggleLike = useMutation(api.community.toggleLike);
  const toggleBookmark = useMutation(api.community.toggleBookmark);
  const addComment = useMutation(api.community.addComment);
  const deleteComment = useMutation(api.community.deleteComment);
  const deletePost = useMutation(api.community.deletePost);
  const togglePin = useMutation(api.community.togglePin);

  // Increment view count when opened
  useEffect(() => {
    if (open && postId) {
      incrementView({ postId }).catch(() => {});
    }
  }, [open, postId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleLike = async () => {
    if (!postId) return;
    try {
      await toggleLike({ postId });
    } catch {
      toast.error("좋아요 처리에 실패했습니다.");
    }
  };

  const handleBookmark = async () => {
    if (!postId) return;
    try {
      const added = await toggleBookmark({ postId });
      toast.success(added ? "북마크에 추가되었습니다." : "북마크가 해제되었습니다.");
    } catch {
      toast.error("북마크 처리에 실패했습니다.");
    }
  };

  const handleComment = async () => {
    if (!postId || !commentText.trim()) return;
    setSubmitting(true);
    try {
      await addComment({
        postId,
        content: commentText.trim(),
        parentCommentId: replyTo?.id,
      });
      setCommentText("");
      setReplyTo(null);
    } catch {
      toast.error("댓글 작성에 실패했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: Id<"communityComments">) => {
    try {
      await deleteComment({ commentId });
      toast.success("댓글이 삭제되었습니다.");
    } catch {
      toast.error("댓글 삭제에 실패했습니다.");
    }
  };

  const handleDeletePost = async () => {
    if (!postId) return;
    try {
      await deletePost({ postId });
      toast.success("게시글이 삭제되었습니다.");
      onOpenChange(false);
      onDeleted();
    } catch {
      toast.error("게시글 삭제에 실패했습니다.");
    }
  };

  const handleTogglePin = async () => {
    if (!postId) return;
    try {
      await togglePin({ postId });
      toast.success(post?.isPinned ? "고정이 해제되었습니다." : "게시글이 고정되었습니다.");
    } catch {
      toast.error("고정 처리에 실패했습니다.");
    }
  };

  const isAuthor = me && post && me._id === post.authorId;
  const isAdmin = me?.role === "admin" || me?.role === "admin3" || me?.role === "senior_coach";
  const cfg = post ? CATEGORY_CONFIG[post.category] : null;

  // Organise comments: top-level + replies
  const topLevel = comments?.filter((c) => !c.parentCommentId) ?? [];
  const replies = comments?.filter((c) => !!c.parentCommentId) ?? [];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col gap-0 p-0">
          {/* Header */}
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            {post === undefined ? (
              <Skeleton className="h-6 w-2/3" />
            ) : post === null ? (
              <DialogTitle>게시글을 찾을 수 없습니다.</DialogTitle>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {cfg && <Badge className={`text-[11px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>}
                      {post.isPinned && (
                        <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                          <Pin className="w-3 h-3" />고정
                        </span>
                      )}
                    </div>
                    <DialogTitle className="text-lg leading-snug">{post.title}</DialogTitle>
                    <DialogDescription asChild>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">{post.authorName}</span>
                        <span>·</span>
                        <span className="px-1 py-0.5 rounded bg-muted text-[10px]">{ROLE_LABEL[post.authorRole] ?? post.authorRole}</span>
                        <span>·</span>
                        <span>{format(new Date(post._creationTime), "yyyy.MM.dd HH:mm", { locale: ko })}</span>
                      </div>
                    </DialogDescription>
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isAdmin && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleTogglePin} title="고정/해제">
                        <Pin className="w-4 h-4" />
                      </Button>
                    )}
                    {isAuthor && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditOpen(true)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {(isAuthor || isAdmin) && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={handleDeletePost}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogHeader>

          {/* Body scrollable */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
            {post === undefined ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-4/5" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ) : post !== null && (
              <>
                {/* Content */}
                <div className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                  {post.content}
                </div>

                {/* Stats + like + bookmark */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground border-t pt-4">
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{post.viewCount}</span>
                  <button
                    onClick={handleLike}
                    className={cn(
                      "flex items-center gap-1 transition-colors cursor-pointer",
                      post.isLikedByMe ? "text-red-500 font-medium" : "hover:text-red-400",
                    )}
                  >
                    <Heart className={cn("w-3.5 h-3.5", post.isLikedByMe && "fill-current")} />
                    {post.likeCount}
                  </button>
                  <span className="flex items-center gap-1"><MessageSquare className="w-3.5 h-3.5" />{post.commentCount}</span>
                  <button
                    onClick={handleBookmark}
                    className={cn(
                      "flex items-center gap-1.5 ml-auto transition-colors cursor-pointer",
                      post.isBookmarkedByMe ? "text-primary font-medium" : "hover:text-primary",
                    )}
                  >
                    <Bookmark className={cn("w-3.5 h-3.5", post.isBookmarkedByMe && "fill-current")} />
                    {post.isBookmarkedByMe ? "북마크됨" : "북마크"}
                  </button>
                </div>

                {/* Comments */}
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-foreground">
                    댓글 {post.commentCount}개
                  </h3>

                  {comments === undefined ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topLevel.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          첫 댓글을 남겨보세요.
                        </p>
                      )}
                      {topLevel.map((c) => (
                        <div key={c._id} className="space-y-3">
                          <CommentItem
                            comment={c}
                            myId={me?._id}
                            myRole={me?.role ?? "trainee"}
                            onDelete={handleDeleteComment}
                            onReply={(id, name) => setReplyTo({ id, name })}
                            depth={0}
                          />
                          {replies
                            .filter((r) => r.parentCommentId === c._id)
                            .map((r) => (
                              <CommentItem
                                key={r._id}
                                comment={r}
                                myId={me?._id}
                                myRole={me?.role ?? "trainee"}
                                onDelete={handleDeleteComment}
                                onReply={(id, name) => setReplyTo({ id, name })}
                                depth={1}
                              />
                            ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Comment input */}
          {post && (
            <div className="px-6 py-4 border-t flex-shrink-0 space-y-2">
              {replyTo && (
                <div className="flex items-center justify-between text-xs bg-muted rounded-md px-3 py-1.5">
                  <span className="text-muted-foreground">
                    <span className="font-medium text-foreground">{replyTo.name}</span>님에게 답글 작성 중
                  </span>
                  <button onClick={() => setReplyTo(null)} className="text-muted-foreground hover:text-foreground cursor-pointer">✕</button>
                </div>
              )}
              <div className="flex gap-2">
                <Textarea
                  placeholder="댓글을 입력하세요..."
                  className="flex-1 min-h-[40px] max-h-[120px] resize-none text-sm"
                  rows={1}
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleComment();
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  disabled={!commentText.trim() || submitting}
                  onClick={handleComment}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      {post && (
        <PostFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          editPost={{
            _id: post._id,
            title: post.title,
            content: post.content,
            category: post.category,
          }}
        />
      )}
    </>
  );
}
