import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Badge } from "@/components/ui/badge.tsx";
import { Pin, Eye, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils.ts";

type Category = "general" | "important" | "event";

const CATEGORY_CONFIG: Record<Category, { label: string; className: string }> = {
  general: { label: "일반", className: "bg-secondary text-secondary-foreground" },
  important: { label: "중요", className: "bg-destructive/10 text-destructive border-destructive/20" },
  event: { label: "행사", className: "bg-primary/10 text-primary border-primary/20" },
};

type Props = {
  announcement: Doc<"announcements">;
  onClick: () => void;
};

export default function AnnouncementCard({ announcement, onClick }: Props) {
  const cat = CATEGORY_CONFIG[announcement.category];
  const createdDate = new Date(announcement._creationTime);

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left p-4 rounded-lg border transition-all hover:shadow-sm hover:border-primary/30 group",
        announcement.isPinned ? "bg-primary/5 border-primary/20" : "bg-card border-border",
      )}
    >
      <div className="flex items-start gap-3">
        {announcement.isPinned && (
          <Pin className="w-3.5 h-3.5 text-primary mt-1 flex-shrink-0 rotate-45" />
        )}
        <div className="flex-1 min-w-0">
          {/* Top row: badges + date */}
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <Badge variant="outline" className={cn("text-[11px] h-5", cat.className)}>
              {cat.label}
            </Badge>
            {announcement.isPinned && (
              <Badge variant="outline" className="text-[11px] h-5 bg-primary/10 text-primary border-primary/20">
                고정
              </Badge>
            )}
          </div>

          {/* Title */}
          <p className="font-medium text-sm leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
            {announcement.title}
          </p>

          {/* Preview */}
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
            {announcement.content}
          </p>

          {/* Footer */}
          <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {format(createdDate, "yyyy.MM.dd", { locale: ko })}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              조회 {announcement.viewCount}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}
