import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import { toast } from "sonner";
import {
  FolderOpen,
  Plus,
  Search,
  MoreVertical,
  Eye,
  EyeOff,
  Trash2,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
} from "lucide-react";
import UploadResourceDialog from "@/pages/resources/_components/upload-resource-dialog.tsx";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "@/pages/resources/_components/resource-constants.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="w-5 h-5 text-blue-600" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function AdminResourcesInner() {
  const [showUpload, setShowUpload] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<Id<"resources"> | null>(null);

  const resources = useQuery(api.resources.listAll, {});
  const togglePublish = useMutation(api.resources.togglePublish);
  const remove = useMutation(api.resources.remove);

  const filtered = (resources ?? []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.fileName.toLowerCase().includes(q)
    );
  });

  const published = filtered.filter((r) => r.isPublished);
  const draft = filtered.filter((r) => !r.isPublished);

  const handleTogglePublish = async (resourceId: Id<"resources">, isPublished: boolean) => {
    try {
      await togglePublish({ resourceId });
      toast.success(isPublished ? "자료를 비공개로 변경했습니다" : "자료를 공개했습니다");
    } catch {
      toast.error("상태 변경에 실패했습니다");
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetId) return;
    try {
      await remove({ resourceId: deleteTargetId });
      toast.success("자료가 삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteTargetId(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">자료실 관리</h1>
          <p className="text-muted-foreground mt-1">
            교육생에게 제공할 자료를 업로드하고 관리합니다
          </p>
        </div>
        <Button onClick={() => setShowUpload(true)}>
          <Plus className="w-4 h-4 mr-2" />
          자료 업로드
        </Button>
      </div>

      {/* Stats */}
      {resources !== undefined && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "전체 자료", value: resources.length },
            { label: "공개", value: resources.filter((r) => r.isPublished).length },
            { label: "비공개", value: resources.filter((r) => !r.isPublished).length },
            {
              label: "총 다운로드",
              value: resources.reduce((acc, r) => acc + r.downloadCount, 0),
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="자료 검색..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Resource list */}
      {resources === undefined ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>자료가 없습니다</EmptyTitle>
            <EmptyDescription>
              {searchQuery ? "검색 결과가 없습니다." : "자료를 업로드해 보세요."}
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Plus className="w-4 h-4 mr-1" />
              자료 업로드
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-6">
          {/* Published */}
          {published.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                공개 ({published.length})
              </h2>
              <div className="space-y-2">
                {published.map((r) => (
                  <ResourceRow
                    key={r._id}
                    resource={r}
                    onToggle={() => handleTogglePublish(r._id, r.isPublished)}
                    onDelete={() => setDeleteTargetId(r._id)}
                  />
                ))}
              </div>
            </section>
          )}
          {/* Draft */}
          {draft.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                비공개 ({draft.length})
              </h2>
              <div className="space-y-2">
                {draft.map((r) => (
                  <ResourceRow
                    key={r._id}
                    resource={r}
                    onToggle={() => handleTogglePublish(r._id, r.isPublished)}
                    onDelete={() => setDeleteTargetId(r._id)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <UploadResourceDialog open={showUpload} onClose={() => setShowUpload(false)} />

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTargetId} onOpenChange={(v) => { if (!v) setDeleteTargetId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>자료 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 자료를 삭제하면 파일도 함께 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type ResourceRowProps = {
  resource: {
    _id: Id<"resources">;
    title: string;
    description?: string;
    category: "education" | "form" | "guideline" | "reference" | "other";
    fileName: string;
    fileSize: number;
    mimeType: string;
    isPublished: boolean;
    downloadCount: number;
    fileUrl: string | null;
    tags?: string[];
  };
  onToggle: () => void;
  onDelete: () => void;
};

function ResourceRow({ resource, onToggle, onDelete }: ResourceRowProps) {
  return (
    <Card className={!resource.isPublished ? "opacity-70" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
            <FileIcon mimeType={resource.mimeType} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm truncate">{resource.title}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[resource.category]}`}
              >
                {CATEGORY_LABELS[resource.category]}
              </span>
              {!resource.isPublished && (
                <Badge variant="secondary" className="text-[10px] py-0">비공개</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              {resource.fileName} · {formatBytes(resource.fileSize)}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground flex items-center gap-0.5">
              <Download className="w-3 h-3" />
              {resource.downloadCount}
            </span>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {resource.fileUrl && (
                  <DropdownMenuItem onClick={() => window.open(resource.fileUrl!, "_blank")}>
                    <Download className="w-4 h-4 mr-2" />
                    미리보기 / 다운로드
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={onToggle}>
                  {resource.isPublished ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      비공개로 변경
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      공개로 변경
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminResourcesPage() {
  return (
    <Authenticated>
      <AdminResourcesInner />
    </Authenticated>
  );
}
