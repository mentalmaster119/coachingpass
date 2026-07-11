import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  MapPin,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import BcpForm from "./bcp-form.tsx";
import { cn } from "@/lib/utils.ts";

type BcpLog = Doc<"bcpLogs"> & {
  buddy1Name: string;
  buddy2Name: string | null;
  evidenceUrl?: string | null;
};

function StatusBadge({ status }: { status: BcpLog["approvalStatus"] }) {
  const map = {
    pending: { label: "대기", className: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "승인됨", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "반려됨", className: "bg-red-100 text-red-700 border-red-200" },
    draft: { label: "임시저장", className: "bg-muted text-muted-foreground border-border" },
  };
  const config = map[status] || { label: "임시저장", className: "bg-muted text-muted-foreground border-border" };
  const { label, className } = config;
  return (
    <Badge variant="outline" className={cn("text-[11px] font-medium", className)}>
      {label}
    </Badge>
  );
}

interface Props {
  log: BcpLog;
  isAdmin?: boolean;
  onApprove?: (logId: BcpLog["_id"]) => void;
  onReject?: (logId: BcpLog["_id"], reason: string) => void;
}

export default function BcpLogCard({ log, isAdmin = false, onApprove, onReject }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  const removeLog = useMutation(api.bcp.remove);
  const approveLog = useMutation(api.bcp.approve);
  const rejectLog = useMutation(api.bcp.reject);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await removeLog({ logId: log._id });
      toast.success("기록이 삭제되었습니다.");
      setDeleteOpen(false);
    } catch {
      toast.error("삭제에 실패했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  const handleApprove = async () => {
    if (onApprove) {
      onApprove(log._id);
    } else {
      await approveLog({ logId: log._id });
      toast.success("승인되었습니다.");
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return toast.error("반려 사유를 입력하세요.");
    setRejecting(true);
    try {
      if (onReject) {
        onReject(log._id, rejectReason.trim());
      } else {
        await rejectLog({ logId: log._id, reason: rejectReason.trim() });
        toast.success("반려되었습니다.");
      }
      setRejectOpen(false);
    } catch {
      toast.error("처리에 실패했습니다.");
    } finally {
      setRejecting(false);
    }
  };

  const dateStr = (() => {
    try {
      return format(new Date(log.sessionDate), "yyyy년 M월 d일 (EEE)", { locale: ko });
    } catch {
      return log.sessionDate;
    }
  })();

  const buddyLabel = log.buddy2Name
    ? `${log.buddy1Name}, ${log.buddy2Name}`
    : log.buddy1Name;

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="p-4">
          {/* Top row */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <StatusBadge status={log.approvalStatus} />
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[11px]",
                    log.myRole === "coach"
                      ? "bg-blue-50 text-blue-700 border-blue-200"
                      : "bg-purple-50 text-purple-700 border-purple-200"
                  )}
                >
                  {log.myRole === "coach" ? "코치 역할" : "고객 역할"}
                </Badge>
              </div>
              <p className="font-semibold text-foreground mt-1.5 line-clamp-1">{log.topic}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  {dateStr}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {log.durationMinutes}분
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {buddyLabel}
                </span>
                {log.location && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {log.location}
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {isAdmin && log.approvalStatus === "pending" && (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                    onClick={handleApprove}
                  >
                    <UserCheck className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                    onClick={() => setRejectOpen(true)}
                  >
                    <UserX className="w-4 h-4" />
                  </Button>
                </>
              )}
              {!isAdmin && log.approvalStatus !== "approved" && (
                <>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setExpanded((p) => !p)}
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Expanded content */}
          {expanded && (
            <div className="mt-3 pt-3 border-t space-y-2 text-sm">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-0.5">세션 내용</p>
                <p className="text-foreground whitespace-pre-wrap">{log.content}</p>
              </div>
              {log.reflection && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-0.5">성찰</p>
                  <p className="text-foreground whitespace-pre-wrap">{log.reflection}</p>
                </div>
              )}
              {log.approvalStatus === "rejected" && log.rejectionReason && (
                <div className="bg-red-50 rounded-md p-2.5">
                  <p className="text-xs font-medium text-red-600 mb-0.5">반려 사유</p>
                  <p className="text-red-700 text-xs">{log.rejectionReason}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <BcpForm open={editOpen} onOpenChange={setEditOpen} editLog={log} />

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>기록 삭제</DialogTitle>
            <DialogDescription>
              이 BCP 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? "삭제 중..." : "삭제"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>BCP 기록 반려</DialogTitle>
            <DialogDescription>반려 사유를 입력하세요.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="반려 사유를 입력하세요..."
            rows={3}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectOpen(false)}>취소</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejecting}>
              {rejecting ? "처리 중..." : "반려"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
