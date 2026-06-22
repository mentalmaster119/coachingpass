import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Award,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  BookOpen,
  ClipboardList,
  Search,
  CheckSquare,
  Square,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";

type ApplicationStatus = "submitted" | "under_review" | "approved" | "rejected";

const STATUS_CONFIG: Record<ApplicationStatus, { label: string; color: string }> = {
  submitted:    { label: "검토 대기", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
  under_review: { label: "검토 중",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" },
  approved:     { label: "승인",      color: "bg-chart-4/15 text-chart-4" },
  rejected:     { label: "반려",      color: "bg-destructive/10 text-destructive" },
};

const CERT_COLORS: Record<string, string> = {
  KAC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  KPC: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  SMPCC: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

type Application = {
  _id: Id<"certificationApplications">;
  userId: Id<"users">;
  certificationGoal?: "KAC" | "KPC" | "SMPCC";
  submittedAt: string;
  status: ApplicationStatus;
  personalStatement: string;
  reviewedBy?: Id<"users">;
  reviewedAt?: string;
  reviewComment?: string;
  educationHoursAtSubmission: number;
  coachingHoursAtSubmission: number;
  userName: string;
  userEmail: string;
  reviewerName: string | null;
};

function ReviewDialog({
  application,
  open,
  onOpenChange,
}: {
  application: Application | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const approve = useMutation(api.certification.approve);
  const reject = useMutation(api.certification.reject);
  const setUnderReview = useMutation(api.certification.setUnderReview);

  const handleSetUnderReview = async () => {
    if (!application) return;
    setSubmitting(true);
    try {
      await setUnderReview({ applicationId: application._id });
      toast.success("검토 중으로 상태가 변경되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!application) return;
    setSubmitting(true);
    try {
      await approve({ applicationId: application._id, reviewComment: comment.trim() || undefined });
      toast.success("신청이 승인되었습니다.");
      onOpenChange(false);
      setComment("");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!application || !comment.trim()) {
      toast.error("반려 사유를 입력해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await reject({ applicationId: application._id, reviewComment: comment.trim() });
      toast.success("신청이 반려되었습니다.");
      onOpenChange(false);
      setComment("");
    } catch (error) {
      if (error instanceof ConvexError) {
        const data = error.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (!application) return null;
  const isPending = application.status === "submitted" || application.status === "under_review";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>자격증 신청 심사</DialogTitle>
          <DialogDescription>
            {application.userName}님의 {application.certificationGoal} 자격증 신청을 검토합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Applicant info */}
          <div className="rounded-lg border p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">신청자</span>
              <span className="font-medium">{application.userName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">자격증</span>
              {application.certificationGoal && (
                <Badge className={`text-[11px] px-1.5 py-0 ${CERT_COLORS[application.certificationGoal] ?? ""}`}>
                  {application.certificationGoal}
                </Badge>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">신청일</span>
              <span>{format(new Date(application.submittedAt), "yyyy.MM.dd", { locale: ko })}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5 text-chart-3" />
                <span>교육 {application.educationHoursAtSubmission}h</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs">
                <ClipboardList className="w-3.5 h-3.5 text-chart-1" />
                <span>코칭 {application.coachingHoursAtSubmission}h</span>
              </div>
            </div>
          </div>

          {/* Personal statement */}
          <div className="space-y-1">
            <p className="text-sm font-medium">지원 동기</p>
            <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground whitespace-pre-wrap max-h-36 overflow-y-auto">
              {application.personalStatement}
            </div>
          </div>

          {/* Review comment */}
          {isPending && (
            <div className="space-y-1.5">
              <Label htmlFor="comment">검토 의견 {application.status === "under_review" && "(반려 시 필수)"}</Label>
              <Textarea
                id="comment"
                placeholder="승인 또는 반려 사유를 입력하세요 (선택)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          {/* Existing comment */}
          {!isPending && application.reviewComment && (
            <div className={`rounded-lg p-3 text-sm ${
              application.status === "approved" ? "bg-chart-4/5 text-chart-4" : "bg-destructive/5 text-destructive"
            }`}>
              <strong>검토 의견:</strong> {application.reviewComment}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            닫기
          </Button>
          {application.status === "submitted" && (
            <Button variant="ghost" onClick={handleSetUnderReview} disabled={submitting} className="text-amber-600">
              <Eye className="w-3.5 h-3.5 mr-1" />
              검토 시작
            </Button>
          )}
          {isPending && (
            <>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={submitting || !comment.trim()}
                onClick={handleReject}
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                반려
              </Button>
              <Button disabled={submitting} onClick={handleApprove}>
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                승인
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminCertificationPage() {
  const applications = useQuery(api.certification.getAllApplications);
  const bulkUpdateStatus = useMutation(api.certification.bulkUpdateStatus);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedApp, setSelectedApp] = useState<Application | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkStatus, setBulkStatus] = useState<"under_review" | "approved" | "rejected">("under_review");
  const [bulkComment, setBulkComment] = useState("");
  const [isBulkSubmitting, setIsBulkSubmitting] = useState(false);

  const filtered =
    applications
      ?.filter((a) => {
        const matchSearch =
          a.userName.toLowerCase().includes(search.toLowerCase()) ||
          a.userEmail.toLowerCase().includes(search.toLowerCase());

        const matchTab =
          activeTab === "all" ||
          (activeTab === "pending" && (a.status === "submitted" || a.status === "under_review")) ||
          activeTab === a.status;

        return matchSearch && matchTab;
      })
      .map((a) => ({ ...a, status: a.status as ApplicationStatus })) ?? [];

  const pendingCount = applications?.filter(
    (a) => a.status === "submitted" || a.status === "under_review",
  ).length ?? 0;

  const allFilteredSelected = filtered.length > 0 && filtered.every((a) => selectedIds.has(a._id));

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((a) => a._id)));
    }
  };

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) return;
    setIsBulkSubmitting(true);
    try {
      await bulkUpdateStatus({
        applicationIds: Array.from(selectedIds) as Id<"certificationApplications">[],
        status: bulkStatus,
        reviewComment: bulkComment.trim() || undefined,
      });
      toast.success(`${selectedIds.size}건이 일괄 처리되었습니다.`);
      setSelectedIds(new Set());
      setBulkDialogOpen(false);
      setBulkComment("");
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsBulkSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Award className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">자격증 신청 관리</h1>
            <p className="text-sm text-muted-foreground">
              수강생의 자격증 신청을 검토하고 승인/반려합니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="relative"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="신청자 이름 또는 이메일로 검색"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              검토 대기
              {pendingCount > 0 && (
                <span className="ml-1 bg-chart-2 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">
              <CheckCircle className="w-3.5 h-3.5 mr-1" />
              승인
            </TabsTrigger>
            <TabsTrigger value="rejected">
              <XCircle className="w-3.5 h-3.5 mr-1" />
              반려
            </TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {applications === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><Award /></EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "pending" ? "검토 대기 중인 신청이 없습니다" : "해당하는 신청이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "pending"
                      ? "모든 자격증 신청이 처리되었습니다."
                      : "다른 탭에서 확인해 보세요."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                {/* Bulk action bar */}
                <div className="flex items-center justify-between gap-3 px-1">
                  <button
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    onClick={toggleSelectAll}
                  >
                    {allFilteredSelected
                      ? <CheckSquare className="w-4 h-4 text-primary" />
                      : <Square className="w-4 h-4" />}
                    전체 선택
                  </button>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{selectedIds.size}건 선택됨</span>
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setBulkDialogOpen(true)}
                      >
                        <ListChecks className="w-3.5 h-3.5" />
                        일괄 처리
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setSelectedIds(new Set())}
                      >
                        선택 해제
                      </Button>
                    </div>
                  )}
                </div>

                {filtered.map((app) => {
                  const cfg = STATUS_CONFIG[app.status];
                  const isSelected = selectedIds.has(app._id);
                  return (
                    <Card
                      key={app._id}
                      className={`shadow-sm hover:shadow-md transition-shadow ${isSelected ? "ring-2 ring-primary/40 border-primary/40" : ""}`}
                    >
                      <CardContent className="pt-4 pb-4">
                        <div className="flex gap-3">
                          {/* Checkbox */}
                          <button
                            className="flex-shrink-0 mt-0.5 cursor-pointer"
                            onClick={(e) => { e.stopPropagation(); toggleSelect(app._id); }}
                          >
                            {isSelected
                              ? <CheckSquare className="w-4 h-4 text-primary" />
                              : <Square className="w-4 h-4 text-muted-foreground" />}
                          </button>

                          {/* Content */}
                          <div
                            className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
                            onClick={() => { setSelectedApp(app); setReviewOpen(true); }}
                          >
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-medium text-foreground">
                                  {app.userName}
                                </p>
                                {app.certificationGoal && (
                                  <Badge className={`text-[11px] px-1.5 py-0 ${CERT_COLORS[app.certificationGoal] ?? ""}`}>
                                    {app.certificationGoal}
                                  </Badge>
                                )}
                                <Badge className={`text-[11px] px-1.5 py-0 ${cfg.color}`}>
                                  {cfg.label}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{app.userEmail}</p>
                              <div className="flex gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <BookOpen className="w-3 h-3" />
                                  교육 {app.educationHoursAtSubmission}h
                                </span>
                                <span className="flex items-center gap-1">
                                  <ClipboardList className="w-3 h-3" />
                                  코칭 {app.coachingHoursAtSubmission}h
                                </span>
                                <span>
                                  신청일: {format(new Date(app.submittedAt), "yyyy.MM.dd", { locale: ko })}
                                </span>
                              </div>
                            </div>
                            <Button size="sm" variant="ghost" className="flex-shrink-0 self-start sm:self-center pointer-events-none">
                              {app.status === "submitted" || app.status === "under_review" ? "심사하기" : "상세 보기"}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <ReviewDialog
        application={selectedApp}
        open={reviewOpen}
        onOpenChange={(v) => { setReviewOpen(v); if (!v) setSelectedApp(null); }}
      />

      {/* Bulk action dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListChecks className="w-4 h-4 text-primary" />
              일괄 상태 변경
            </DialogTitle>
            <DialogDescription>
              선택된 {selectedIds.size}건의 신청 상태를 일괄 변경합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>변경할 상태</Label>
              <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as typeof bulkStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">검토 중</SelectItem>
                  <SelectItem value="approved">승인</SelectItem>
                  <SelectItem value="rejected">반려</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                검토 의견{bulkStatus === "rejected" && <span className="text-destructive ml-1">*</span>}
              </Label>
              <Textarea
                placeholder={bulkStatus === "rejected" ? "반려 사유를 입력하세요" : "의견을 입력하세요 (선택)"}
                value={bulkComment}
                onChange={(e) => setBulkComment(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setBulkDialogOpen(false)} disabled={isBulkSubmitting}>
              취소
            </Button>
            <Button
              disabled={isBulkSubmitting || (bulkStatus === "rejected" && !bulkComment.trim())}
              onClick={handleBulkAction}
            >
              {isBulkSubmitting ? "처리 중..." : `${selectedIds.size}건 일괄 변경`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
