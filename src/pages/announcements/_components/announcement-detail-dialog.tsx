import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Pin, Eye, Calendar, X } from "lucide-react";
import { cn } from "@/lib/utils.ts";

type Category = "general" | "important" | "event";

const CATEGORY_CONFIG: Record<Category, { label: string; className: string }> = {
  general: { label: "일반", className: "bg-secondary text-secondary-foreground" },
  important: { label: "중요", className: "bg-destructive/10 text-destructive border-destructive/20" },
  event: { label: "행사", className: "bg-primary/10 text-primary border-primary/20" },
};

type Props = {
  announcement: Doc<"announcements"> | null;
  open: boolean;
  onClose: () => void;
};

export default function AnnouncementDetailDialog({ announcement, open, onClose }: Props) {
  const incrementViewCount = useMutation(api.announcements.incrementViewCount);
  const [counted, setCounted] = useState(false);

  const handleOpenChange = (v: boolean) => {
    if (!v) {
      onClose();
      setCounted(false);
    } else if (announcement && !counted) {
      incrementViewCount({ id: announcement._id }).catch(() => {});
      setCounted(true);
    }
  };

  if (!announcement) return null;

  const cat = CATEGORY_CONFIG[announcement.category];
  const createdDate = new Date(announcement._creationTime);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={cn("text-[11px] h-5", cat.className)}>
                  {cat.label}
                </Badge>
                {announcement.isPinned && (
                  <Badge variant="outline" className="text-[11px] h-5 bg-primary/10 text-primary border-primary/20 gap-1">
                    <Pin className="w-3 h-3 rotate-45" />
                    고정
                  </Badge>
                )}
              </div>
              <DialogTitle className="text-base font-semibold leading-snug">
                {announcement.title}
              </DialogTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(createdDate, "yyyy년 M월 d일 (EEE)", { locale: ko })}
                </span>
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  조회 {announcement.viewCount}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border-t pt-4">
          <div className="prose prose-sm max-w-none">
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {announcement.content}
            </p>
          </div>
        </div>

        <div className="border-t pt-3 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4 mr-1" />
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
