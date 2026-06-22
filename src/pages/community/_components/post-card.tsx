import { Eye, Heart, MessageSquare, Pin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";

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

interface PostCardProps {
  post: {
    _id: string;
    _creationTime: number;
    title: string;
    content: string;
    category: Category;
    isPinned: boolean;
    viewCount: number;
    likeCount: number;
    commentCount: number;
    authorName: string;
    authorRole: string;
  };
  onClick: () => void;
}

export default function PostCard({ post, onClick }: PostCardProps) {
  const cfg = CATEGORY_CONFIG[post.category];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 hover:shadow-md transition-all duration-150 cursor-pointer",
        post.isPinned && "border-primary/30 bg-primary/3",
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Top row: category + pinned */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[11px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
            {post.isPinned && (
              <span className="flex items-center gap-1 text-[11px] text-primary font-medium">
                <Pin className="w-3 h-3" />
                고정
              </span>
            )}
          </div>

          {/* Title */}
          <p className="font-semibold text-foreground text-sm line-clamp-2 leading-snug">
            {post.title}
          </p>

          {/* Content preview */}
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
            {post.content}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{post.authorName}</span>
              <span>·</span>
              <span className="text-[10px] px-1 py-0.5 rounded bg-muted">{ROLE_LABEL[post.authorRole] ?? post.authorRole}</span>
              <span>·</span>
              <span>{formatDistanceToNow(new Date(post._creationTime), { addSuffix: true, locale: ko })}</span>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-shrink-0">
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {post.viewCount}
              </span>
              <span className="flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" />
                {post.likeCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5" />
                {post.commentCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}
