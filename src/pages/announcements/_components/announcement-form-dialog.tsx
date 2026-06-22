import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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
import { Switch } from "@/components/ui/switch.tsx";

type Category = "general" | "important" | "event";

type Props = {
  open: boolean;
  onClose: () => void;
  editing?: Doc<"announcements"> | null;
};

export default function AnnouncementFormDialog({ open, onClose, editing }: Props) {
  const create = useMutation(api.announcements.create);
  const update = useMutation(api.announcements.update);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [isPinned, setIsPinned] = useState(false);
  const [isPublished, setIsPublished] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editing) {
      setTitle(editing.title);
      setContent(editing.content);
      setCategory(editing.category);
      setIsPinned(editing.isPinned);
      setIsPublished(editing.isPublished);
    } else {
      setTitle("");
      setContent("");
      setCategory("general");
      setIsPinned(false);
      setIsPublished(true);
    }
  }, [editing, open]);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("제목과 내용을 입력해 주세요");
      return;
    }
    setLoading(true);
    try {
      if (editing) {
        await update({ id: editing._id, title, content, category, isPinned, isPublished });
        toast.success("공지사항이 수정되었습니다");
      } else {
        await create({ title, content, category, isPinned, isPublished });
        toast.success("공지사항이 등록되었습니다");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "오류가 발생했습니다");
      } else {
        toast.error("오류가 발생했습니다");
      }
    } finally {
      setLoading(false);
    }
  };

  const categoryLabels: Record<Category, string> = {
    general: "일반",
    important: "중요",
    event: "행사/이벤트",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "공지사항 수정" : "공지사항 등록"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-title">제목 <span className="text-destructive">*</span></Label>
            <Input
              id="ann-title"
              placeholder="공지사항 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>카테고리</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryLabels) as Category[]).map((k) => (
                  <SelectItem key={k} value={k}>{categoryLabels[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          <div className="space-y-1.5">
            <Label htmlFor="ann-content">내용 <span className="text-destructive">*</span></Label>
            <Textarea
              id="ann-content"
              placeholder="공지사항 내용을 입력하세요"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          {/* Toggles */}
          <div className="flex items-center gap-8 pt-1">
            <div className="flex items-center gap-2">
              <Switch id="pinned" checked={isPinned} onCheckedChange={setIsPinned} />
              <Label htmlFor="pinned" className="cursor-pointer">상단 고정</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
              <Label htmlFor="published" className="cursor-pointer">즉시 게시</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "저장 중..." : editing ? "수정 완료" : "등록하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
