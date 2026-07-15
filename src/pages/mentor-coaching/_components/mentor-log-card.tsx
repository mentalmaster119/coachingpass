import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, Clock, User, Paperclip, ChevronDown, ChevronUp, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import MentorCoachingForm from "./mentor-coaching-form.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type MentorLog = Doc<"mentorCoachingLogs"> & { evidenceUrl?: string | null };

const STATUS_CONFIG = {
  pending:  { label: "검토중",  variant: "secondary" as const },
  approved: { label: "승인됨",  variant: "default"   as const },
  rejected: { label: "반려됨",  variant: "destructive" as const },
};

const SESSION_TYPE_CONFIG = {
  mentor_coaching: { label: "개인 슈퍼비전", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300" },
  coder_co:        { label: "그룹 슈퍼비전",   color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300" },
};

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function MentorLogCard({ log }: { log: MentorLog }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const remove = useMutation(api.mentorCoaching.remove);

  const statusCfg = STATUS_CONFIG[log.approvalStatus];
  const typeCfg = SESSION_TYPE_CONFIG[log.sessionType];
  const canEdit = log.approvalStatus !== "approved";

  const handleDelete = async () => {
    try {
      await remove({ logId: log._id });
      toast.success("기록이 삭제되었습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  return (
    <>
      <Card className="shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              {/* Type + status badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", typeCfg.color)}>
                  {typeCfg.label}
                </span>
                <Badge variant={statusCfg.variant} className="text-xs">{statusCfg.label}</Badge>
              </div>

              {/* Topic */}
              <p className="font-semibold text-sm text-foreground">{log.topic}</p>

              {/* Meta info */}
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

              {/* Rejection reason */}
              {log.approvalStatus === "rejected" && log.rejectionReason && (
                <div className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
                  반려 사유: {log.rejectionReason}
                </div>
              )}

              {/* Expand toggle */}
              <button
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
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
            <div className="flex items-center gap-1.5 flex-shrink-0">
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
              {canEdit && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-muted-foreground"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MentorCoachingForm open={editOpen} onOpenChange={setEditOpen} editLog={log} />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              "{log.topic}" 기록을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
