import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";

type Category = "general" | "question" | "sharing" | "resource";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editPost?: {
    _id: Id<"communityPosts">;
    title: string;
    content: string;
    category: Category;
  };
}

const CATEGORIES: { value: Category; label: string }[] = [
  { value: "general", label: "자유게시판" },
  { value: "question", label: "질문/답변" },
  { value: "sharing", label: "경험 나눔" },
  { value: "resource", label: "자료 공유" },
];

export default function PostFormDialog({ open, onOpenChange, editPost }: Props) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState<Category>("general");
  const [loading, setLoading] = useState(false);

  const createPost = useMutation(api.community.createPost);
  const updatePost = useMutation(api.community.updatePost);

  useEffect(() => {
    if (editPost) {
      setTitle(editPost.title);
      setContent(editPost.content);
      setCategory(editPost.category);
    } else {
      setTitle("");
      setContent("");
      setCategory("general");
    }
  }, [editPost, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("제목을 입력해 주세요.");
    if (!content.trim()) return toast.error("내용을 입력해 주세요.");

    setLoading(true);
    try {
      if (editPost) {
        await updatePost({ postId: editPost._id, title, content, category });
        toast.success("게시글이 수정되었습니다.");
      } else {
        await createPost({ title, content, category });
        toast.success("게시글이 작성되었습니다.");
      }
      onOpenChange(false);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editPost ? "게시글 수정" : "새 게시글 작성"}</DialogTitle>
          <DialogDescription>커뮤니티 게시판에 글을 {editPost ? "수정" : "작성"}합니다.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>카테고리 *</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input
              placeholder="게시글 제목을 입력하세요"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
          </div>
          <div className="space-y-1.5">
            <Label>내용 *</Label>
            <Textarea
              placeholder="내용을 입력하세요"
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "저장 중..." : editPost ? "수정하기" : "작성하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
