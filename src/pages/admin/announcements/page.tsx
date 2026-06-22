import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Megaphone,
  Plus,
  Pencil,
  Trash2,
  Pin,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import AnnouncementFormDialog from "../../announcements/_components/announcement-form-dialog.tsx";

type Category = "general" | "important" | "event";

const CATEGORY_CONFIG: Record<Category, { label: string; className: string }> = {
  general: { label: "일반", className: "bg-secondary text-secondary-foreground" },
  important: { label: "중요", className: "bg-destructive/10 text-destructive border-destructive/20" },
  event: { label: "행사", className: "bg-primary/10 text-primary border-primary/20" },
};

export default function AdminAnnouncementsPage() {
  const announcements = useQuery(api.announcements.listAll, {});
  const removeAnn = useMutation(api.announcements.remove);
  const togglePin = useMutation(api.announcements.togglePin);
  const togglePublish = useMutation(api.announcements.togglePublish);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Doc<"announcements"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doc<"announcements"> | null>(null);

  const handleEdit = (ann: Doc<"announcements">) => {
    setEditing(ann);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditing(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeAnn({ id: deleteTarget._id });
      toast.success("공지사항이 삭제되었습니다");
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "삭제 실패");
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleTogglePin = async (ann: Doc<"announcements">) => {
    try {
      await togglePin({ id: ann._id, isPinned: !ann.isPinned });
      toast.success(ann.isPinned ? "고정이 해제되었습니다" : "상단에 고정되었습니다");
    } catch {
      toast.error("오류가 발생했습니다");
    }
  };

  const handleTogglePublish = async (ann: Doc<"announcements">) => {
    try {
      await togglePublish({ id: ann._id, isPublished: !ann.isPublished });
      toast.success(ann.isPublished ? "게시가 취소되었습니다" : "게시되었습니다");
    } catch {
      toast.error("오류가 발생했습니다");
    }
  };

  const isLoading = announcements === undefined;

  const stats = {
    total: announcements?.length ?? 0,
    published: announcements?.filter((a) => a.isPublished).length ?? 0,
    pinned: announcements?.filter((a) => a.isPinned).length ?? 0,
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">공지사항 관리</h1>
            <p className="text-sm text-muted-foreground">공지사항을 등록·수정·삭제합니다</p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          새 공지
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "전체 공지", value: stats.total, color: "text-foreground" },
          { label: "게시 중", value: stats.published, color: "text-primary" },
          { label: "상단 고정", value: stats.pinned, color: "text-amber-600" },
        ].map((s) => (
          <div key={s.label} className="bg-card border rounded-lg p-4 text-center">
            <p className={cn("text-2xl font-bold", s.color)}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !announcements || announcements.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone />
            </EmptyMedia>
            <EmptyTitle>등록된 공지사항이 없습니다</EmptyTitle>
            <EmptyDescription>새 공지사항을 등록해 보세요</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              첫 공지 등록
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-2">
          {announcements.map((ann) => {
            const cat = CATEGORY_CONFIG[ann.category];
            return (
              <div
                key={ann._id}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-lg border bg-card",
                  ann.isPinned && "border-primary/20 bg-primary/5",
                  !ann.isPublished && "opacity-60",
                )}
              >
                {/* Left */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge variant="outline" className={cn("text-[11px] h-5", cat.className)}>
                      {cat.label}
                    </Badge>
                    {ann.isPinned && (
                      <Badge variant="outline" className="text-[11px] h-5 bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                        <Pin className="w-3 h-3" />
                        고정
                      </Badge>
                    )}
                    {!ann.isPublished && (
                      <Badge variant="outline" className="text-[11px] h-5 text-muted-foreground">
                        임시저장
                      </Badge>
                    )}
                  </div>
                  <p className="font-medium text-sm leading-snug line-clamp-1">{ann.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-muted-foreground">
                    <span>{format(new Date(ann._creationTime), "yyyy.MM.dd", { locale: ko })}</span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {ann.viewCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={ann.isPinned ? "고정 해제" : "상단 고정"}
                    onClick={() => handleTogglePin(ann)}
                  >
                    <Pin className={cn("w-3.5 h-3.5", ann.isPinned ? "text-amber-500 rotate-45" : "text-muted-foreground")} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={ann.isPublished ? "게시 취소" : "게시"}
                    onClick={() => handleTogglePublish(ann)}
                  >
                    {ann.isPublished
                      ? <Eye className="w-3.5 h-3.5 text-primary" />
                      : <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                    }
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="수정"
                    onClick={() => handleEdit(ann)}
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="삭제"
                    onClick={() => setDeleteTarget(ann)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <AnnouncementFormDialog
        open={formOpen}
        onClose={handleFormClose}
        editing={editing}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>공지사항 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.title} 공지사항을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
