import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
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
import { Calendar, Clock, Building2, Pencil, Trash2, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import EducationForm from "./education-form.tsx";

type EducationRecordWithUrl = Doc<"educationRecords"> & { certificateUrl: string | null };

const STATUS_CONFIG = {
  pending: { label: "검토 대기", variant: "secondary" as const, className: "" },
  approved: { label: "승인", variant: "default" as const, className: "bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15" },
  rejected: { label: "반려", variant: "destructive" as const, className: "bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10" },
};

export default function EducationRecordCard({ record }: { record: EducationRecordWithUrl }) {
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const remove = useMutation(api.education.remove);
  const statusCfg = STATUS_CONFIG[record.approvalStatus];

  const handleDelete = async () => {
    try {
      await remove({ recordId: record._id });
      toast.success("기록이 삭제되었습니다.");
    } catch (err) {
      if (err instanceof Error) toast.error(err.message);
      else toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  const canEdit = record.approvalStatus === "pending" || record.approvalStatus === "rejected";

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Title & badge */}
              <div className="flex items-start gap-2 flex-wrap">
                <p className="font-semibold text-foreground text-sm leading-snug">
                  {record.educationName}
                </p>
                <Badge
                  variant={statusCfg.variant}
                  className={`text-xs flex-shrink-0 ${statusCfg.className}`}
                >
                  {statusCfg.label}
                </Badge>
              </div>

              {/* Meta info */}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {record.institution}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {record.educationDate}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="w-3 h-3 text-primary" />
                  {record.hours}시간
                </span>
              </div>

              {/* Notes */}
              {record.notes && (
                <p className="text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1">
                  {record.notes}
                </p>
              )}

              {/* Rejection reason */}
              {record.approvalStatus === "rejected" && record.rejectionReason && (
                <div className="bg-destructive/8 border border-destructive/15 rounded px-3 py-2">
                  <p className="text-xs font-semibold text-destructive mb-0.5">반려 사유</p>
                  <p className="text-xs text-foreground">{record.rejectionReason}</p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {record.certificateUrl && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-primary"
                  onClick={() => window.open(record.certificateUrl!, "_blank")}
                  title="수료증 보기"
                >
                  <FileText className="w-4 h-4" />
                </Button>
              )}
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary"
                    onClick={() => setShowEdit(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setShowDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <EducationForm
        open={showEdit}
        onOpenChange={setShowEdit}
        record={record}
      />

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기록을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{record.educationName}" 기록이 영구적으로 삭제됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
