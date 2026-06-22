import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { Check, X, FileText, Calendar, Clock, Building2, GraduationCap } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { toast } from "sonner";

type PendingRecord = Doc<"educationRecords"> & {
  userName: string;
  userEmail: string;
  certificateUrl: string | null;
};

function RejectDialog({
  record,
  open,
  onOpenChange,
}: {
  record: PendingRecord | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const reject = useMutation(api.education.reject);

  const handleReject = async () => {
    if (!record || !reason.trim()) return;
    setIsPending(true);
    try {
      await reject({ recordId: record._id, reason: reason.trim() });
      toast.success("반려 처리되었습니다.");
      onOpenChange(false);
      setReason("");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>교육 기록 반려</DialogTitle>
          <DialogDescription>
            {record?.userName}님의 "{record?.educationName}" 기록을 반려합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>반려 사유 <span className="text-destructive">*</span></Label>
          <Input
            placeholder="예: 수료증 미첨부, 기관 정보 불일치 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || isPending}
            onClick={handleReject}
          >
            {isPending ? "처리 중..." : "반려하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingRecordCard({
  record,
  onReject,
}: {
  record: PendingRecord;
  onReject: (record: PendingRecord) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const approve = useMutation(api.education.approve);

  const handleApprove = async () => {
    setIsPending(true);
    try {
      await approve({ recordId: record._id });
      setIsApproved(true);
      toast.success("승인되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Trainee info */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold flex-shrink-0">
                {(record.userName?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{record.userName}</p>
                <p className="text-xs text-muted-foreground">{record.userEmail}</p>
              </div>
            </div>

            {/* Record info */}
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">{record.educationName}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />{record.institution}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />{record.educationDate}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="w-3 h-3 text-primary" />{record.hours}시간
                </span>
              </div>
            </div>

            {record.notes && (
              <p className="text-xs text-muted-foreground bg-secondary/50 rounded px-2 py-1">
                {record.notes}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {record.certificateUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-primary"
                onClick={() => window.open(record.certificateUrl!, "_blank")}
              >
                <FileText className="w-3.5 h-3.5 mr-1" />
                수료증
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onReject(record)}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              반려
            </Button>
            <Button size="sm" className="h-8" disabled={isPending || isApproved} onClick={handleApprove}>
              <Check className="w-3.5 h-3.5 mr-1" />
              {isPending ? "처리 중..." : isApproved ? "승인 완료" : "승인"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminEducationPage() {
  const records = useQuery(api.education.getPendingRecords);
  const [rejectTarget, setRejectTarget] = useState<PendingRecord | null>(null);

  const isLoading = records === undefined;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">교육 기록 검토</h1>
          <p className="text-sm text-muted-foreground">
            수강생이 제출한 교육 이수 기록을 검토하고 승인/반려하세요
          </p>
        </div>
        {!isLoading && records.length > 0 && (
          <Badge className="ml-auto bg-chart-2/15 text-chart-2 border-chart-2/20">
            {records.length}건 대기
          </Badge>
        )}
      </motion.div>

      {/* List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)
        ) : records.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Check /></EmptyMedia>
              <EmptyTitle>검토 대기 기록이 없습니다</EmptyTitle>
              <EmptyDescription>모든 교육 기록이 처리되었습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          records.map((record) => (
            <PendingRecordCard
              key={record._id}
              record={record}
              onReject={(r) => setRejectTarget(r)}
            />
          ))
        )}
      </motion.div>

      <RejectDialog
        record={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
      />
    </div>
  );
}
