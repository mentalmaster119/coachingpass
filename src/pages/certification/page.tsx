import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Trash2,
  BookOpen,
  ClipboardList,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
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
import CertificationApplyDialog from "./_components/apply-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  submitted:    { label: "검토 대기", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    icon: <Clock className="w-3.5 h-3.5" /> },
  under_review: { label: "검토 중",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <Eye className="w-3.5 h-3.5" /> },
  approved:     { label: "승인",      color: "bg-chart-4/15 text-chart-4",                                            icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:     { label: "반려",      color: "bg-destructive/10 text-destructive",                                    icon: <XCircle className="w-3.5 h-3.5" /> },
};

function ApplicationCard({ app, onCancel }: {
  app: Doc<"certificationApplications"> & { reviewerName: string | null };
  onCancel: (id: Id<"certificationApplications">) => void;
}) {
  const cfg = STATUS_CONFIG[app.status];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-foreground">
                {app.certificationGoal} 자격증 신청
              </p>
              <Badge className={`flex items-center gap-1 text-[11px] px-1.5 py-0 ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              신청일: {format(new Date(app.submittedAt), "yyyy년 M월 d일", { locale: ko })}
              {app.reviewedAt && (
                <span> · 검토일: {format(new Date(app.reviewedAt), "yyyy년 M월 d일", { locale: ko })}</span>
              )}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>교육 이수: <strong className="text-foreground">{app.educationHoursAtSubmission}h</strong></span>
              <span>코칭 실습: <strong className="text-foreground">{app.coachingHoursAtSubmission}h</strong></span>
            </div>
          </div>

          {app.status === "submitted" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-destructive hover:text-destructive flex-shrink-0"
              onClick={() => onCancel(app._id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Personal statement preview */}
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {app.personalStatement}
          </p>
          {app.personalStatement.length > 80 && (
            <button className="text-xs text-primary hover:underline mt-1" onClick={() => setExpanded(!expanded)}>
              {expanded ? "접기" : "더 보기"}
            </button>
          )}
          {expanded && (
            <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">
              {app.personalStatement}
            </p>
          )}
        </div>

        {/* Review comment */}
        {app.reviewComment && (
          <div className={`mt-3 pt-3 border-t border-border rounded-md p-2 text-xs ${
            app.status === "approved" ? "bg-chart-4/5 text-chart-4" : "bg-destructive/5 text-destructive"
          }`}>
            <strong>검토 의견:</strong> {app.reviewComment}
            {app.reviewerName && <span className="ml-1 opacity-70">— {app.reviewerName}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CertificationPage() {
  const { user } = useCurrentUser();
  const applications = useQuery(api.certification.getMyApplications);
  const requirements = useQuery(api.certification.getMyRequirementStatus);
  const cancelApp = useMutation(api.certification.cancelApplication);

  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Id<"certificationApplications"> | null>(null);

  const hasActive = applications?.some(
    (a) => a.status === "submitted" || a.status === "under_review",
  );

  const handleCancel = async () => {
    if (!cancelTarget) return;
    try {
      await cancelApp({ applicationId: cancelTarget });
      toast.success("신청이 취소되었습니다.");
    } catch {
      toast.error("취소 중 오류가 발생했습니다.");
    } finally {
      setCancelTarget(null);
    }
  };

  const isLoading = applications === undefined || requirements === undefined;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">자격증 신청</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {user?.certificationGoal === "KPC" ? "멘탈코칭전문가 2급" : "멘탈코칭전문가 1급"} 인증을 위한 신청서를 제출하세요.
          </p>
        </div>
        {!isLoading && !hasActive && (
          <Button
            onClick={() => setApplyOpen(true)}
            disabled={!requirements.allMet}
            className="self-start sm:self-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            자격증 신청
          </Button>
        )}
      </motion.div>

      {/* Requirement status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-primary" />
              {isLoading ? "..." : `${requirements.goal} 취득 요건`}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                {/* Education */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-4 h-4 text-chart-3" />
                      <span className="font-medium">교육 이수</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {requirements.educationHours} / {requirements.educationRequired}시간
                      </span>
                      {requirements.educationMet ? (
                        <CheckCircle className="w-4 h-4 text-chart-4" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min((requirements.educationHours / requirements.educationRequired) * 100, 100)}
                    className="h-2"
                  />
                </div>

                {/* Coaching */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-chart-1" />
                      <span className="font-medium">코칭 실습</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">
                        {requirements.coachingHours} / {requirements.coachingRequired}시간
                      </span>
                      {requirements.coachingMet ? (
                        <CheckCircle className="w-4 h-4 text-chart-4" />
                      ) : (
                        <XCircle className="w-4 h-4 text-destructive" />
                      )}
                    </div>
                  </div>
                  <Progress
                    value={Math.min((requirements.coachingHours / requirements.coachingRequired) * 100, 100)}
                    className="h-2"
                  />
                </div>

                {/* Overall status */}
                <div className={`rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
                  requirements.allMet
                    ? "bg-chart-4/10 text-chart-4"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {requirements.allMet ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      모든 요건을 충족했습니다. 지금 바로 신청할 수 있습니다!
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4" />
                      아직 모든 요건을 충족하지 못했습니다. 계속 활동을 기록해 주세요.
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Application history */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-base font-semibold text-foreground">신청 내역</h2>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : applications.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Award /></EmptyMedia>
              <EmptyTitle>신청 내역이 없습니다</EmptyTitle>
              <EmptyDescription>
                {requirements.allMet
                  ? "모든 요건을 충족했습니다. 자격증을 신청해 보세요."
                  : "요건을 충족하면 자격증을 신청할 수 있습니다."}
              </EmptyDescription>
            </EmptyHeader>
            {requirements.allMet && (
              <EmptyContent>
                <Button size="sm" onClick={() => setApplyOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  자격증 신청
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <ApplicationCard
                key={app._id}
                app={app}
                onCancel={(id) => setCancelTarget(id)}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Dialogs */}
      {requirements && (
        <CertificationApplyDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          requirements={requirements}
        />
      )}

      <AlertDialog open={cancelTarget !== null} onOpenChange={(v) => { if (!v) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>신청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              자격증 신청을 취소하시겠습니까? 취소 후 다시 신청할 수 있습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>돌아가기</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              신청 취소
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
