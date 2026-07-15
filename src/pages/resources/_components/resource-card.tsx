import { Download, FileText, FileSpreadsheet, FileImage, File, Eye } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { CATEGORY_LABELS, CATEGORY_COLORS } from "./resource-constants.ts";

export type ResourceCardProps = {
  resource: {
    _id: Id<"resources">;
    title: string;
    description?: string;
    category: "education" | "form" | "guideline" | "reference" | "other";
    fileName: string;
    fileSize: number;
    mimeType: string;
    downloadCount: number;
    tags?: string[];
    fileUrl: string | null;
    uploaderName: string;
    _creationTime: number;
  };
};

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith("image/")) return <FileImage className="w-5 h-5 text-blue-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType.includes("csv"))
    return <FileSpreadsheet className="w-5 h-5 text-green-500" />;
  if (mimeType.includes("pdf")) return <FileText className="w-5 h-5 text-red-500" />;
  if (mimeType.includes("word") || mimeType.includes("document"))
    return <FileText className="w-5 h-5 text-blue-600" />;
  return <File className="w-5 h-5 text-muted-foreground" />;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ResourceCard({ resource }: ResourceCardProps) {
  const incrementDownload = useMutation(api.resources.incrementDownloadCount);

  const handleDownload = async () => {
    if (!resource.fileUrl) {
      toast.error("파일 URL을 불러올 수 없습니다");
      return;
    }
    try {
      // Increment count then open
      await incrementDownload({ resourceId: resource._id });
      window.open(resource.fileUrl, "_blank");
    } catch {
      toast.error("다운로드에 실패했습니다");
    }
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow">
      <CardContent className="p-5 flex flex-col flex-1">
        <div className="flex items-start gap-4">
          {/* File icon */}
          <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
            <FileIcon mimeType={resource.mimeType} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-sm leading-tight truncate">{resource.title}</h3>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${CATEGORY_COLORS[resource.category]}`}
              >
                {CATEGORY_LABELS[resource.category]}
              </span>
            </div>

            {resource.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {resource.description}
              </p>
            )}

            {/* Tags */}
            {resource.tags && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {resource.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Meta */}
            <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
              <div className="truncate font-medium text-foreground/80" title={resource.fileName}>
                {resource.fileName}
              </div>
              <div className="flex items-center gap-2">
                <span>{formatBytes(resource.fileSize)}</span>
                <span>·</span>
                <span className="flex items-center gap-0.5">
                  <Download className="w-3 h-3" />
                  {resource.downloadCount}회 다운로드
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Download button */}
        <Button
          onClick={handleDownload}
          disabled={!resource.fileUrl}
          size="sm"
          className="w-full mt-4 mt-auto"
        >
          <Download className="w-4 h-4 mr-2" />
          다운로드
        </Button>
      </CardContent>
    </Card>
  );
}
