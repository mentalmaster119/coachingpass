import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  Users,
  BarChart3,
  BookOpen,
  FileText,
  Dumbbell,
  UserCheck,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";

// ── Criterion Row ────────────────────────────────────────────────────────────

function CriterionRow({
  icon,
  label,
  current,
  required,
  met,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  current: string | number;
  required: string | number;
  met: boolean;
  detail?: string;
}) {
  return (
    <div className={cn(
      "flex items-center justify-between py-2.5 px-3 rounded-lg text-sm",
      met ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"
    )}>
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={met ? "text-green-600" : "text-destructive"}>{icon}</span>
        <div className="min-w-0">
          <p className="font-medium truncate">{label}</p>
          {detail && <p className="text-xs text-muted-foreground">{detail}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <span className={cn("font-semibold tabular-nums", met ? "text-green-600" : "text-destructive")}>
          {current} / {required}
        </span>
        {met
          ? <CheckCircle2 className="w-4 h-4 text-green-600" />
          : <XCircle className="w-4 h-4 text-destructive" />}
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function AdminCompletionPage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | null>(null);
  const [activeTab, setActiveTab] = useState("completion");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">수료 및 인증 관리</h1>
        <p className="text-muted-foreground text-sm mt-1">
          기수별 교육생의 수료 및 인증시험 응시 자격을 확인합니다
        </p>
      </div>

      {/* Criteria summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">수료 기준</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-start gap-2 text-sm">
              <ClipboardList className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>코칭 실습 보고서 승인 <strong>10건</strong> 이상</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <BarChart3 className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>전체 세미나 출석률 <strong>80%</strong> 이상</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <XCircle className="w-4 h-4 mt-0.5 text-destructive flex-shrink-0" />
              <span>2~6차 세션 중 한 세션 완전 결석 시 미수료 (토/일 하루만 빠지는 경우는 전체 출석률로 판단)</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">인증시험 응시 자격</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            <div className="flex items-start gap-2 text-sm">
              <ClipboardList className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>코칭 실습 보고서 <strong>20건</strong> (수료기준 10건 포함, 동일인 최대 2건)</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <Dumbbell className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>스포츠선수 대상 코칭 <strong>8건</strong> 이상</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <BookOpen className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>독후감 제출 <strong>2편</strong> 이상</span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <FileText className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>멘탈코칭 에세이 제출 <strong>1편</strong></span>
            </div>
            <div className="flex items-start gap-2 text-sm">
              <UserCheck className="w-4 h-4 mt-0.5 text-primary flex-shrink-0" />
              <span>슈퍼비전/멘토링 <strong>*회</strong> 이상 (예정)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cohort selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            기수 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cohorts === undefined ? (
            <Skeleton className="h-10 w-64" />
          ) : cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 기수가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {cohorts.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCohortId(c._id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                    selectedCohortId === c._id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  {c.name}
                  <span className="ml-1.5 text-xs opacity-70">
                    {c.term === "first" ? "상반기" : "하반기"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCohortId && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="completion" className="gap-2">
              <Users className="w-4 h-4" />
              수료 현황
            </TabsTrigger>
            <TabsTrigger value="submissions" className="gap-2">
              <FileText className="w-4 h-4" />
              제출물 검토
            </TabsTrigger>
          </TabsList>
          <TabsContent value="completion" className="mt-4">
            <CompletionTable cohortId={selectedCohortId} />
          </TabsContent>
          <TabsContent value="submissions" className="mt-4">
            <SubmissionsReview />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

// ── Completion Table ──────────────────────────────────────────────────────────

function CompletionTable({ cohortId }: { cohortId: Id<"cohorts"> }) {
  const results = useQuery(api.completion.evaluateCohort, { cohortId });
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (results === undefined) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }
  if (results.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>등록된 교육생이 없습니다</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  const completedCount = results.filter((r) => r.isCompleted).length;
  const certEligibleCount = results.filter((r) => r.isCertEligible).length;

  return (
    <div className="space-y-4">
      {/* Summary chips */}
      <div className="flex flex-wrap gap-3">
        {[
          { label: "전체 교육생", value: results.length, color: "text-foreground" },
          { label: "수료", value: completedCount, color: "text-green-600" },
          { label: "미수료", value: results.length - completedCount, color: "text-destructive" },
          { label: "인증 응시 자격", value: certEligibleCount, color: "text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-lg">
            <span className={cn("font-bold text-lg", s.color)}>{s.value}</span>
            <span className="text-sm text-muted-foreground">{s.label}</span>
          </div>
        ))}
      </div>

      {/* Per-person rows */}
      <div className="space-y-2">
        {results.map((r) => {
          const isExpanded = expandedId === r.userId;
          return (
            <Card key={r.userId} className="overflow-hidden">
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors flex-wrap"
                onClick={() => setExpandedId(isExpanded ? null : r.userId)}
              >
                {/* Avatar */}
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                  {(r.name ?? "?")[0]}
                </div>
                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{r.name ?? "이름 없음"}</p>
                  <p className="text-xs text-muted-foreground">{r.email ?? ""}</p>
                </div>
                {/* Status badges */}
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  {r.certificationGoal && (
                    <Badge variant="outline" className="text-xs">{r.certificationGoal}</Badge>
                  )}
                  <Badge variant={r.isCompleted ? "default" : "destructive"} className="text-xs">
                    {r.isCompleted ? "수료" : "미수료"}
                  </Badge>
                  <Badge
                    variant={r.isCertEligible ? "default" : "secondary"}
                    className={cn("text-xs", r.isCertEligible && "bg-blue-600 hover:bg-blue-700")}
                  >
                    {r.isCertEligible ? "인증 응시 가능" : "인증 응시 불가"}
                  </Badge>
                  {/* Quick stats */}
                  <span className="text-xs text-muted-foreground">
                    출석 {r.attendanceRate}% · 코칭 {r.approvedCoachingCount}건
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t px-4 pb-4 pt-3 grid md:grid-cols-2 gap-4 bg-muted/10">
                  {/* Completion criteria */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">수료 기준</p>
                    <CriterionRow
                      icon={<ClipboardList className="w-3.5 h-3.5" />}
                      label="코칭 실습 보고서"
                      current={r.approvedCoachingCount}
                      required={10}
                      met={r.approvedCoachingCount >= 10}
                    />
                    <CriterionRow
                      icon={<BarChart3 className="w-3.5 h-3.5" />}
                      label="출석률"
                      current={`${r.attendanceRate}%`}
                      required="80%"
                      met={r.attendanceRate >= 80 && !r.sessionAbsenceViolation}
                      detail={r.sessionAbsenceViolation ? "2~6차 세션 중 완전 결석 있음" : undefined}
                    />
                  </div>
                  {/* Cert criteria */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">인증 응시 자격</p>
                    <CriterionRow
                      icon={<ClipboardList className="w-3.5 h-3.5" />}
                      label="코칭 보고서 (유효)"
                      current={r.eligibleCoachingCount}
                      required={20}
                      met={r.eligibleCoachingCount >= 20}
                      detail={`전체 ${r.approvedCoachingCount}건 · 동일인 2건 초과분 제외`}
                    />
                    <CriterionRow
                      icon={<Dumbbell className="w-3.5 h-3.5" />}
                      label="스포츠선수 대상 코칭"
                      current={r.sportsCount}
                      required={8}
                      met={r.sportsCount >= 8}
                    />
                    <CriterionRow
                      icon={<BookOpen className="w-3.5 h-3.5" />}
                      label="독후감"
                      current={r.bookReportCount}
                      required={2}
                      met={r.bookReportCount >= 2}
                    />
                    <CriterionRow
                      icon={<FileText className="w-3.5 h-3.5" />}
                      label="멘탈코칭 에세이"
                      current={r.essayCount}
                      required={1}
                      met={r.essayCount >= 1}
                    />
                    <CriterionRow
                      icon={<UserCheck className="w-3.5 h-3.5" />}
                      label="슈퍼비전/멘토링"
                      current={r.mentorCount}
                      required={1}
                      met={r.mentorCount >= 1}
                    />
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ── Submissions Review ────────────────────────────────────────────────────────

function SubmissionsReview() {
  const pending = useQuery(api.submissions.listPendingSubmissions, {});
  const reviewBookReport = useMutation(api.submissions.reviewBookReport);
  const reviewEssay = useMutation(api.submissions.reviewEssay);

  const [rejectDialog, setRejectDialog] = useState<{
    type: "bookReport" | "essay";
    id: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = async (type: "bookReport" | "essay", id: string) => {
    try {
      if (type === "bookReport") {
        await reviewBookReport({ reportId: id as Id<"bookReports">, approvalStatus: "approved" });
      } else {
        await reviewEssay({ essayId: id as Id<"coachingEssays">, approvalStatus: "approved" });
      }
      toast.success("승인되었습니다");
    } catch {
      toast.error("처리에 실패했습니다");
    }
  };

  const handleReject = async () => {
    if (!rejectDialog) return;
    try {
      if (rejectDialog.type === "bookReport") {
        await reviewBookReport({
          reportId: rejectDialog.id as Id<"bookReports">,
          approvalStatus: "rejected",
          rejectionReason: rejectReason || undefined,
        });
      } else {
        await reviewEssay({
          essayId: rejectDialog.id as Id<"coachingEssays">,
          approvalStatus: "rejected",
          rejectionReason: rejectReason || undefined,
        });
      }
      toast.success("반려되었습니다");
      setRejectDialog(null);
      setRejectReason("");
    } catch {
      toast.error("처리에 실패했습니다");
    }
  };

  if (pending === undefined) {
    return <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>;
  }

  const totalPending = pending.bookReports.length + pending.essays.length;

  return (
    <div className="space-y-6">
      {totalPending === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia>
            <EmptyTitle>검토 대기 중인 제출물이 없습니다</EmptyTitle>
            <EmptyDescription>모든 독후감과 에세이가 처리되었습니다</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* Book Reports */}
          {pending.bookReports.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                독후감 검토 대기
                <Badge variant="secondary">{pending.bookReports.length}</Badge>
              </h3>
              {pending.bookReports.map((r) => (
                <SubmissionCard
                  key={r._id}
                  title={r.bookTitle}
                  subtitle={r.author ? `저자: ${r.author}` : undefined}
                  fileName={r.fileName}
                  fileStorageId={r.fileStorageId}
                  userName={r.userName}
                  userEmail={r.userEmail}
                  submittedAt={r.submittedAt}
                  onApprove={() => handleApprove("bookReport", r._id)}
                  onReject={() => setRejectDialog({ type: "bookReport", id: r._id })}
                />
              ))}
            </div>
          )}

          {/* Essays */}
          {pending.essays.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4" />
                에세이 검토 대기
                <Badge variant="secondary">{pending.essays.length}</Badge>
              </h3>
              {pending.essays.map((e) => (
                <SubmissionCard
                  key={e._id}
                  title={e.title}
                  fileName={e.fileName}
                  fileStorageId={e.fileStorageId}
                  userName={e.userName}
                  userEmail={e.userEmail}
                  submittedAt={e.submittedAt}
                  onApprove={() => handleApprove("essay", e._id)}
                  onReject={() => setRejectDialog({ type: "essay", id: e._id })}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(open) => !open && setRejectDialog(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>반려 사유 입력</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>반려 사유 (선택)</Label>
            <Textarea
              placeholder="반려 사유를 입력하세요"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectDialog(null)}>취소</Button>
            <Button variant="destructive" onClick={handleReject}>반려</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Submission Card ──────────────────────────────────────────────────────────

function SubmissionCard({
  title,
  subtitle,
  fileName,
  fileStorageId,
  userName,
  userEmail,
  submittedAt,
  onApprove,
  onReject,
}: {
  title: string;
  subtitle?: string;
  fileName: string;
  fileStorageId: Id<"_storage">;
  userName?: string;
  userEmail?: string;
  submittedAt: string;
  onApprove: () => void;
  onReject: () => void;
}) {
  const fileUrl = useQuery(api.resources.getFileUrl, { storageId: fileStorageId });

  return (
    <Card>
      <CardContent className="py-4 px-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="font-medium text-sm">{title}</p>
            {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span>{userName ?? "이름 없음"} {userEmail ? `(${userEmail})` : ""}</span>
              <span>{format(parseISO(submittedAt), "yyyy.MM.dd", { locale: ko })} 제출</span>
              {fileUrl && (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-0.5 text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  {fileName}
                </a>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button size="sm" variant="outline" onClick={onReject} className="text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer">
              반려
            </Button>
            <Button size="sm" onClick={onApprove} className="cursor-pointer">
              승인
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
