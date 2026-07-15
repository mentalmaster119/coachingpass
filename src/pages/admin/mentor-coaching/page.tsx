import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { Check, X, Paperclip, Calendar, Clock, User, MessageSquare, Star } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
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
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type PendingLog = Doc<"mentorCoachingLogs"> & {
  userName: string;
  userEmail: string;
  evidenceUrl: string | null;
};

const SESSION_TYPE_CONFIG = {
  mentor_coaching: { label: "개인 슈퍼비전", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  coder_co: { label: "그룹 슈퍼비전", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function RejectDialog({
  log,
  open,
  onOpenChange,
}: {
  log: PendingLog | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const reject = useMutation(api.mentorCoaching.reject);

  const handleReject = async () => {
    if (!log || !reason.trim()) return;
    setIsPending(true);
    try {
      await reject({ logId: log._id, reason: reason.trim() });
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
          <DialogTitle>기록 반려</DialogTitle>
          <DialogDescription>
            {log?.userName}님의 "{log?.topic}" 기록을 반려합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>반려 사유 <span className="text-destructive">*</span></Label>
          <Input
            placeholder="예: 내용 불충분, 코치 확인 필요 등"
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

function PendingLogCard({
  log,
  onReject,
}: {
  log: PendingLog;
  onReject: (log: PendingLog) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const approve = useMutation(api.mentorCoaching.approve);
  const typeCfg = SESSION_TYPE_CONFIG[log.sessionType];

  const handleApprove = async () => {
    setIsApproving(true);
    try {
      await approve({ logId: log._id });
      setIsApproved(true);
      toast.success("승인되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsApproving(false);
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
                {(log.userName?.[0] ?? "?").toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">{log.userName}</p>
                <p className="text-xs text-muted-foreground">{log.userEmail}</p>
              </div>
              <span className={cn("ml-2 text-xs font-semibold px-2 py-0.5 rounded-full", typeCfg.color)}>
                {typeCfg.label}
              </span>
            </div>

            {/* Log info */}
            <div className="space-y-1">
              <p className="font-medium text-sm text-foreground">{log.topic}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(log.sessionDate), "yyyy.MM.dd (EEE)", { locale: ko })}
                </span>
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  {log.coachName}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="w-3 h-3 text-primary" />
                  {formatDuration(log.durationMinutes)}
                </span>
                {log.location && (
                  <span className="flex items-center gap-1">
                    <span className="text-primary font-bold">@</span>
                    {log.location}
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {expanded ? "내용 접기" : "내용 자세히 보기"}
            </button>

            {expanded && (
              <div className="space-y-3 border-t border-border pt-3 mt-2">
                {log.sessionType === "mentor_coaching" ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {log.coacheeGoal && (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground">기대 결과 (목표)</p>
                        <p className="text-foreground whitespace-pre-wrap">{log.coacheeGoal}</p>
                      </div>
                    )}
                    {log.coachingTool && (
                      <div className="space-y-0.5">
                        <p className="text-xs font-semibold text-muted-foreground">대표적인 코칭 도구</p>
                        <p className="text-foreground whitespace-pre-wrap">{log.coachingTool}</p>
                      </div>
                    )}
                    {log.powerfulQuestion && (
                      <div className="space-y-0.5 md:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground text-amber-600">가장 강력했던 질문</p>
                        <p className="text-foreground whitespace-pre-wrap font-medium bg-amber-50 dark:bg-amber-950/20 p-2 rounded-md border border-amber-100 dark:border-amber-900/40">{log.powerfulQuestion}</p>
                      </div>
                    )}
                    {log.learnedAsCoach && (
                      <div className="space-y-0.5 md:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground">코치로서 배운 점</p>
                        <p className="text-foreground whitespace-pre-wrap">{log.learnedAsCoach}</p>
                      </div>
                    )}
                    {log.actionPlan && (
                      <div className="space-y-0.5 md:col-span-2">
                        <p className="text-xs font-semibold text-muted-foreground">향후 실행 과제 (Action Item)</p>
                        <p className="text-foreground whitespace-pre-wrap bg-muted p-2 rounded-md">{log.actionPlan}</p>
                      </div>
                    )}
                    <div className="space-y-0.5 md:col-span-2">
                      <p className="text-xs font-semibold text-muted-foreground">피코칭 소감</p>
                      <p className="text-foreground whitespace-pre-wrap">{log.content}</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-0.5">세션 내용</p>
                      <p className="text-sm whitespace-pre-wrap">{log.content}</p>
                    </div>
                    {log.reflection && (
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-0.5">성찰</p>
                        <p className="text-sm whitespace-pre-wrap">{log.reflection}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {log.evidenceUrl && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-muted-foreground hover:text-primary"
                onClick={() => window.open(log.evidenceUrl!, "_blank")}
              >
                <Paperclip className="w-3.5 h-3.5 mr-1" />
                증빙
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onReject(log)}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              반려
            </Button>
            <Button size="sm" className="h-8" disabled={isApproving || isApproved} onClick={handleApprove}>
              <Check className="w-3.5 h-3.5 mr-1" />
              {isApproving ? "처리 중..." : isApproved ? "승인 완료" : "승인"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminMentorCoachingPage() {
  const logs = useQuery(api.mentorCoaching.getPendingLogs);
  const [rejectTarget, setRejectTarget] = useState<PendingLog | null>(null);
  const isLoading = logs === undefined;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">슈퍼비전 기록 검토</h1>
          <p className="text-sm text-muted-foreground">
            교육생이 제출한 슈퍼비전 기록을 검토하고 승인/반려하세요.
          </p>
        </div>
        {!isLoading && logs.length > 0 && (
          <Badge className="ml-auto bg-chart-2/15 text-chart-2 border-chart-2/20">
            {logs.length}건 대기
          </Badge>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {isLoading ? (
          [1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)
        ) : logs.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Star /></EmptyMedia>
              <EmptyTitle>검토 대기 기록이 없습니다</EmptyTitle>
              <EmptyDescription>모든 슈퍼비전 기록이 처리되었습니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          logs.map((log) => (
            <PendingLogCard
              key={log._id}
              log={log}
              onReject={(l: PendingLog) => setRejectTarget(l)}
            />
          ))
        )}
      </motion.div>

      <RejectDialog
        log={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
      />
    </div>
  );
}
