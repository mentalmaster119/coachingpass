import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
  Calendar,
  CalendarDays,
  MapPin,
  AlertCircle,
  Sparkles,
  Users,
  GraduationCap,
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
  submitted:    { label: "접수 완료 (검토 대기)", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",    icon: <Clock className="w-3.5 h-3.5" /> },
  under_review: { label: "심사 진행 중",       color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <Eye className="w-3.5 h-3.5" /> },
  approved:     { label: "합격 및 최종 승인", color: "bg-chart-4/15 text-chart-4",                                            icon: <CheckCircle className="w-3.5 h-3.5" /> },
  rejected:     { label: "보완 요청 / 반려",  color: "bg-destructive/10 text-destructive",                                    icon: <XCircle className="w-3.5 h-3.5" /> },
};

function ApplicationCard({ app, onCancel }: {
  app: Doc<"certificationApplications"> & { reviewerName: string | null };
  onCancel: (id: Id<"certificationApplications">) => void;
}) {
  const cfg = STATUS_CONFIG[app.status];
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="shadow-xs border-border/80">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1.5 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-sm sm:text-base text-foreground">
                {app.examTitle || `${app.certificationGoal || "SMPCC"} 자격증 신청`}
              </p>
              {app.targetCohort && (
                <Badge variant="outline" className="text-[11px] px-2 py-0 border-primary/30 text-primary bg-primary/5 font-semibold">
                  {app.targetCohort}
                </Badge>
              )}
              <Badge className={`flex items-center gap-1 text-[11px] px-1.5 py-0 ${cfg.color}`}>
                {cfg.icon} {cfg.label}
              </Badge>
              {app.hasPrerequisiteDeficiency && (
                <Badge variant="secondary" className="text-[10px] text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/40">
                  사전 요건 유예 심사
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              신청 접수일: {format(new Date(app.submittedAt), "yyyy년 M월 d일", { locale: ko })}
              {app.examDate && <span> · 시험 예정일: {app.examDate}</span>}
              {app.reviewedAt && (
                <span> · 심사일: {format(new Date(app.reviewedAt), "yyyy년 M월 d일", { locale: ko })}</span>
              )}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground flex-wrap">
              <span>신청 당시 교육: <strong className="text-foreground">{app.educationHoursAtSubmission}h / 60h</strong></span>
              <span>코칭 실습: <strong className="text-foreground">{app.coachingHoursAtSubmission}h / 100h</strong></span>
            </div>
          </div>

          {app.status === "submitted" && (
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 text-destructive hover:text-destructive flex-shrink-0 cursor-pointer"
              onClick={() => onCancel(app._id)}
              title="신청 취소"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        {/* Personal statement preview */}
        <div className="mt-3 pt-3 border-t border-border/60">
          <p className="text-xs text-foreground/80 font-medium mb-1">지원 동기 및 코칭 실천 각오</p>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {app.personalStatement}
          </p>
          {app.personalStatement.length > 80 && (
            <button className="text-xs text-primary hover:underline mt-1 cursor-pointer font-medium" onClick={() => setExpanded(!expanded)}>
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
          <div className={`mt-3 pt-3 border-t border-border rounded-md p-2.5 text-xs ${
            app.status === "approved" ? "bg-chart-4/10 text-chart-4 border border-chart-4/20" : "bg-destructive/10 text-destructive border border-destructive/20"
          }`}>
            <strong>심사위원 검토 의견:</strong> {app.reviewComment}
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
  const examSchedule = useQuery(api.certification.getUpcomingExamSchedule);
  const myCohort = useQuery(api.certification.getMyCohort);
  const cancelApp = useMutation(api.certification.cancelApplication);
  const ensureExamEvent = useMutation(api.certification.ensureExamCalendarEvent);

  const [applyOpen, setApplyOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<Id<"certificationApplications"> | null>(null);

  // Sync the exam schedule event to calendarEvents on mount
  useEffect(() => {
    ensureExamEvent().catch(() => {});
  }, [ensureExamEvent]);

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
    <div className="p-4 sm:p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">자격 인증 및 시험 신청</h1>
          <p className="text-muted-foreground text-sm mt-1">
            MCCI-SMPCC 멘탈코칭 전문가 자격 인증시험 일정 확인 및 응시 원서를 접수하세요.
          </p>
        </div>
        {!isLoading && hasActive && (
          <Badge className="self-start sm:self-center bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 px-3 py-1">
            <Clock className="w-3.5 h-3.5 mr-1" />
            인증시험 신청서 접수 완료
          </Badge>
        )}
      </motion.div>

      {/* ── 1. Featured Upcoming Exam Schedule Card (인증시험 공지 & 신청란) ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-background to-primary/5 shadow-sm overflow-hidden">
          <CardContent className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className="bg-primary text-primary-foreground font-semibold px-2.5 py-0.5 text-xs shadow-xs">
                    <Award className="w-3.5 h-3.5 mr-1" />
                    2026 하반기 정기 자격시험
                  </Badge>
                  <Badge variant="outline" className="text-xs text-emerald-600 border-emerald-500/30 bg-emerald-500/10 font-semibold">
                    🟢 원서 접수 진행중
                  </Badge>
                  <span className="text-xs text-muted-foreground font-medium">
                    대상: {examSchedule?.targetCohortDisplay || "16기, 17기 (및 이전 기수 동문)"}
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight pt-1">
                  {examSchedule?.title || "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험"}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-0.5">
                  {examSchedule?.description || "16기 및 17기 코치를 위한 정기 인증시험입니다. 과제 제출이나 실습 시간 미달 항목이 있더라도 응시 신청이 가능합니다."}
                </p>
              </div>

              {!hasActive && (
                <Button
                  size="default"
                  onClick={() => setApplyOpen(true)}
                  className="font-bold shadow-sm shrink-0 gap-1.5 h-11 px-5 text-sm"
                >
                  <Award className="w-4 h-4" />
                  인증시험 신청하기
                </Button>
              )}
            </div>

            {/* Exam Detail Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  원서 접수 기간
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {examSchedule?.applicationPeriod || "2026. 10. 20 ~ 2026. 11. 15"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  시험 일시
                </span>
                <p className="font-semibold text-foreground text-xs">
                  {examSchedule?.examTimeDisplay || "2026년 11월 28일 (토) 10:00 ~ 17:00"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  시험 장소
                </span>
                <p className="font-semibold text-foreground text-xs truncate" title={examSchedule?.location}>
                  MCCI 본원 대강당 / 온라인 화상
                </p>
              </div>

              <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                <span className="text-muted-foreground flex items-center gap-1 font-medium">
                  <BookOpen className="w-3.5 h-3.5 text-primary" />
                  전형 과목
                </span>
                <p className="font-semibold text-foreground text-xs truncate" title={examSchedule?.subjects}>
                  1차 필기 + 2차 실기 시연
                </p>
              </div>
            </div>

            {/* Grace Policy Callout */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                <strong>[과제/실습 요건 유예 안내]</strong> 과제 제출이나 실습 시간 인정에 일부 미달 항목이
                있더라도 <strong>인증시험 응시 신청이 가능</strong>합니다. 부족한 요건은 시험 전후로 보완할 수
                있으며, 최종 자격증 수여 시 심사위원회에서 이수 기준을 종합 검토하여 수여합니다.
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 2. Requirement Status Simulator Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card className="shadow-xs border-border/80 overflow-hidden">
          <CardHeader className="pb-3 bg-muted/20 border-b border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  <span>SMPCC 자격 인증 요건 종합 시뮬레이터</span>
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  수료 및 인증시험 합격 후 최종 공인 SMPCC 자격증 수여를 위한 세부 필수 기준 충족도입니다.
                </p>
              </div>

              {!isLoading && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1 border-primary/30 text-primary bg-primary/5">
                    달성도 {requirements.readinessPercentage ?? 0}%
                  </Badge>
                  {myCohort && (
                    <Badge variant="secondary" className="text-xs font-normal">
                      소속: {myCohort.name}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-6">
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : (
              <>
                {/* Overall Progress Gauge */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 space-y-2">
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      전체 자격 인증 준비율
                    </span>
                    <span className="text-muted-foreground font-medium">
                      <strong className="text-foreground">{requirements.metCount ?? 0}</strong> / {requirements.totalCriteriaCount ?? 9} 항목 완결
                    </span>
                  </div>
                  <Progress value={requirements.readinessPercentage ?? 0} className="h-2.5" />
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                    <span>기초 교육(20%) + 실습 시간(20%) + 유형별 코칭(45%) + 과제(15%)</span>
                    <span className="font-bold text-primary">{requirements.readinessPercentage ?? 0}%</span>
                  </div>
                </div>

                {/* 2-Column Grid of Criteria */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {requirements.criteria?.map((item) => {
                    const pct = Math.min(Math.round((item.current / item.required) * 100), 100);
                    return (
                      <div
                        key={item.key}
                        className={`p-3.5 rounded-xl border transition-colors ${
                          item.met
                            ? "bg-chart-4/[0.04] border-chart-4/30"
                            : "bg-card border-border/70"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.met ? (
                              <CheckCircle className="w-4 h-4 text-chart-4 shrink-0" />
                            ) : (
                              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                            )}
                            <span className="text-xs sm:text-sm font-semibold text-foreground truncate">
                              {item.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs font-bold text-foreground">
                              {item.current} <span className="text-[11px] font-normal text-muted-foreground">/ {item.required}{item.unit}</span>
                            </span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0 ${
                                item.met
                                  ? "bg-chart-4/15 text-chart-4"
                                  : "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                              }`}
                            >
                              {item.met ? "완료" : `${Math.max(0, item.required - item.current)}${item.unit} 부족`}
                            </Badge>
                          </div>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    );
                  })}
                </div>

                {/* Quick Shortcuts */}
                <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-border/60">
                  <p className="text-xs text-muted-foreground">
                    부족한 실습과 과제는 각 전용 메뉴에서 바로 작성 및 등록할 수 있습니다:
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                      <Link to="/coaching-log">
                        <ClipboardList className="w-3.5 h-3.5" />
                        코칭일지 등록
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                      <Link to="/submissions">
                        <BookOpen className="w-3.5 h-3.5" />
                        독후감/에세이 제출
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1 cursor-pointer">
                      <Link to="/bcp">
                        <Users className="w-3.5 h-3.5" />
                        버디코칭 매칭
                      </Link>
                    </Button>
                  </div>
                </div>

                {/* Overall Status Notice */}
                <div className={`rounded-xl p-3.5 text-xs sm:text-sm font-medium flex items-center gap-2.5 ${
                  requirements.allMet
                    ? "bg-chart-4/10 text-chart-4 border border-chart-4/20"
                    : "bg-muted/70 text-foreground border border-border"
                }`}>
                  {requirements.allMet ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-chart-4 shrink-0" />
                      <span>축하합니다! SMPCC 필수 요건을 100% 충족하셨습니다. 인증시험에 편안하게 응시하시기 바랍니다.</span>
                    </>
                  ) : (
                    <>
                      <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                      <span>일부 요건이 진행 중이더라도 인증시험 사전 접수가 전액/전형 유예 상태로 즉시 가능합니다.</span>
                    </>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* ── 3. Application History ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-3"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">신청 및 접수 내역</h2>
          {!isLoading && !hasActive && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setApplyOpen(true)}
              className="text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
            >
              <Plus className="w-3.5 h-3.5" />
              신규 원서 접수
            </Button>
          )}
        </div>

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
              <EmptyTitle>접수된 인증시험 신청 내역이 없습니다</EmptyTitle>
              <EmptyDescription>
                2026년 하반기 SMPCC 인증시험 원서 접수가 진행 중입니다. 지금 신청서를 제출하세요.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => setApplyOpen(true)}>
                <Plus className="w-3.5 h-3.5 mr-1" />
                인증시험 신청하기
              </Button>
            </EmptyContent>
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

      {/* ── Apply Dialog ── */}
      {requirements && (
        <CertificationApplyDialog
          open={applyOpen}
          onOpenChange={setApplyOpen}
          requirements={requirements}
          examSchedule={examSchedule}
          defaultCohortName={myCohort?.name || (user?.email?.includes("16") ? "16기" : "17기")}
          userName={user?.name}
          userEmail={user?.email}
          userPhone={user?.phone}
        />
      )}

      {/* ── Cancel Alert Dialog ── */}
      <AlertDialog open={cancelTarget !== null} onOpenChange={(v) => { if (!v) setCancelTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>인증시험 신청 취소</AlertDialogTitle>
            <AlertDialogDescription>
              인증시험 응시 신청을 취소하시겠습니까? 취소 후 접수 기간 내에 다시 신청하실 수 있습니다.
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
