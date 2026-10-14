import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { motion } from "motion/react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import {
  FileText,
  BookOpen,
  Upload,
  CheckCircle2,
  Clock,
  XCircle,
  Trash2,
  ExternalLink,
  Plus,
  AlertCircle,
  HelpCircle,
  FileCheck,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
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
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

export default function SubmissionsPage() {
  const summary = useQuery(api.submissions.getMySubmissionSummary);
  const bookReports = useQuery(api.submissions.listBookReports, {});
  const essays = useQuery(api.submissions.listEssays, {});

  const [activeTab, setActiveTab] = useState("book-reports");
  const [bookReportOpen, setBookReportOpen] = useState(false);
  const [essayOpen, setEssayOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{
    type: "bookReport" | "essay";
    id: string;
    title: string;
  } | null>(null);

  const deleteBookReport = useMutation(api.submissions.deleteBookReport);
  const deleteEssay = useMutation(api.submissions.deleteEssay);

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === "bookReport") {
        await deleteBookReport({ reportId: deleteTarget.id as Id<"bookReports"> });
      } else {
        await deleteEssay({ essayId: deleteTarget.id as Id<"coachingEssays"> });
      }
      toast.success("과제 제출이 삭제되었습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleteTarget(null);
    }
  };

  const isLoading = summary === undefined || bookReports === undefined || essays === undefined;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                과제 제출 (독후감 / 코칭에세이)
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                멘탈코칭전문가(SMPCC) 수료 및 인증 자격 취득을 위한 필수 과제를 제출하고 심사 현황을 확인합니다.
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            onClick={() => setBookReportOpen(true)}
            size="sm"
            variant="outline"
            className="gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            독후감 제출
          </Button>
          <Button
            onClick={() => setEssayOpen(true)}
            size="sm"
            className="gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            에세이 제출
          </Button>
        </div>
      </motion.div>

      {/* Requirement Summary Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Book Reports Card */}
        <Card className={cn(
          "transition-all border-border shadow-xs",
          summary?.bookReports.met && "border-green-500/40 bg-green-50/20 dark:bg-green-950/10"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />
                독후감 요건
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : summary?.bookReports.met ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 text-xs">
                  요건 충족 ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  {Math.max(0, summary.bookReports.required - summary.bookReports.approved)}편 남음
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              선정도서 <strong>최소 2편</strong> 제출 및 승인 필요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">승인 완료</span>
              <span className="text-base font-bold text-foreground">
                {summary?.bookReports.approved ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ 2편</span>
              </span>
            </div>
            <Progress
              value={Math.min(((summary?.bookReports.approved ?? 0) / 2) * 100, 100)}
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Coaching Essay Card */}
        <Card className={cn(
          "transition-all border-border shadow-xs",
          summary?.essays.met && "border-green-500/40 bg-green-50/20 dark:bg-green-950/10"
        )}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                멘탈코칭 에세이 요건
              </CardTitle>
              {isLoading ? (
                <Skeleton className="h-5 w-16 rounded-full" />
              ) : summary?.essays.met ? (
                <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 text-xs">
                  요건 충족 ✓
                </Badge>
              ) : (
                <Badge variant="outline" className="text-amber-600 border-amber-300 text-xs">
                  1편 미제출
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              코칭 통찰 에세이 <strong>최소 1편</strong> 제출 및 승인 필요
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-muted-foreground">승인 완료</span>
              <span className="text-base font-bold text-foreground">
                {summary?.essays.approved ?? 0}
                <span className="text-xs font-normal text-muted-foreground ml-1">/ 1편</span>
              </span>
            </div>
            <Progress
              value={Math.min(((summary?.essays.approved ?? 0) / 1) * 100, 100)}
              className="h-2"
            />
          </CardContent>
        </Card>

        {/* Certification Guide Card */}
        <Card className="border-primary/20 bg-primary/5 shadow-xs flex flex-col justify-between">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-primary">
              <Award className="w-4 h-4" />
              수료 및 인증 연계 안내
            </CardTitle>
            <CardDescription className="text-xs leading-relaxed text-foreground/80">
              세미나 출석률 80% 이상과 함께 <strong>독후감 2편</strong>, <strong>코칭에세이 1편</strong>이 모두 승인되면 SMPCC 정규 수료 판정 및 인증시험 응시 자격이 주어집니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 flex-shrink-0" />
              제출 파일 포맷: PDF, HWP, DOCX, DOC 권장 (최대 20MB)
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="book-reports" className="gap-2 cursor-pointer">
            <BookOpen className="w-4 h-4" />
            독후감 제출 목록
            {bookReports && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                {bookReports.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="essays" className="gap-2 cursor-pointer">
            <FileText className="w-4 h-4" />
            코칭에세이 제출 목록
            {essays && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0 font-normal">
                {essays.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Book Reports Tab ── */}
        <TabsContent value="book-reports" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              내가 제출한 독후감 ({bookReports?.length ?? 0}건)
            </h3>
            <Button
              onClick={() => setBookReportOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              독후감 제출하기
            </Button>
          </div>

          {bookReports === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : bookReports.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
                <EmptyTitle>제출된 독후감이 없습니다</EmptyTitle>
                <EmptyDescription>
                  추천 도서를 읽고 독후감을 작성하여 제출해 주세요. (최소 2편 제출 필수)
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => setBookReportOpen(true)} size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" />
                첫 독후감 제출하기
              </Button>
            </Empty>
          ) : (
            <div className="space-y-3">
              {bookReports.map((report) => (
                <SubmissionItemCard
                  key={report._id}
                  title={report.bookTitle}
                  subtitle={report.author ? `저자: ${report.author}` : undefined}
                  submittedAt={report.submittedAt}
                  fileName={report.fileName}
                  fileUrl={report.fileUrl}
                  approvalStatus={report.approvalStatus}
                  rejectionReason={report.rejectionReason}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "bookReport",
                      id: report._id,
                      title: report.bookTitle,
                    })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Coaching Essays Tab ── */}
        <TabsContent value="essays" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground">
              내가 제출한 멘탈코칭 에세이 ({essays?.length ?? 0}건)
            </h3>
            <Button
              onClick={() => setEssayOpen(true)}
              size="sm"
              variant="outline"
              className="gap-1.5 text-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              에세이 제출하기
            </Button>
          </div>

          {essays === undefined ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : essays.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><FileText /></EmptyMedia>
                <EmptyTitle>제출된 코칭에세이가 없습니다</EmptyTitle>
                <EmptyDescription>
                  코칭 실습 및 배움에 대한 통찰을 담은 에세이를 작성하여 제출해 주세요. (최소 1편 필수)
                </EmptyDescription>
              </EmptyHeader>
              <Button onClick={() => setEssayOpen(true)} size="sm" className="mt-4 gap-1.5">
                <Plus className="w-4 h-4" />
                첫 코칭에세이 제출하기
              </Button>
            </Empty>
          ) : (
            <div className="space-y-3">
              {essays.map((essay) => (
                <SubmissionItemCard
                  key={essay._id}
                  title={essay.title}
                  submittedAt={essay.submittedAt}
                  fileName={essay.fileName}
                  fileUrl={essay.fileUrl}
                  approvalStatus={essay.approvalStatus}
                  rejectionReason={essay.rejectionReason}
                  onDelete={() =>
                    setDeleteTarget({
                      type: "essay",
                      id: essay._id,
                      title: essay.title,
                    })
                  }
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Book Report Submit Modal */}
      <BookReportModal
        open={bookReportOpen}
        onOpenChange={setBookReportOpen}
      />

      {/* Essay Submit Modal */}
      <EssayModal
        open={essayOpen}
        onOpenChange={setEssayOpen}
      />

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>과제 제출 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              &apos;{deleteTarget?.title}&apos; 제출물을 삭제하시겠습니까? 삭제 후에는 다시 제출하셔야 합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Submission Item Card Component ───────────────────────────────────────────

function SubmissionItemCard({
  title,
  subtitle,
  submittedAt,
  fileName,
  fileUrl,
  approvalStatus,
  rejectionReason,
  onDelete,
}: {
  title: string;
  subtitle?: string;
  submittedAt: string;
  fileName: string;
  fileUrl: string | null;
  approvalStatus: "pending" | "approved" | "rejected";
  rejectionReason?: string;
  onDelete: () => void;
}) {
  return (
    <Card className="overflow-hidden border-border transition-all hover:border-primary/40">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-1.5 min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="font-semibold text-base text-foreground leading-tight">{title}</h4>
              <StatusBadge status={approvalStatus} />
            </div>

            {subtitle && (
              <p className="text-xs text-muted-foreground font-medium">{subtitle}</p>
            )}

            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap pt-1">
              <span>제출일: {format(parseISO(submittedAt), "yyyy.MM.dd (EEE) HH:mm", { locale: ko })}</span>
              {fileUrl ? (
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline font-medium"
                >
                  <ExternalLink className="w-3 h-3" />
                  {fileName}
                </a>
              ) : (
                <span className="text-muted-foreground">{fileName}</span>
              )}
            </div>
          </div>

          {/* Delete action (allowed when pending or rejected) */}
          {approvalStatus !== "approved" && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onDelete}
              className="w-8 h-8 text-muted-foreground hover:text-destructive cursor-pointer flex-shrink-0"
              title="제출물 삭제"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Rejection notice box */}
        {approvalStatus === "rejected" && (
          <div className="mt-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs space-y-1">
            <div className="flex items-center gap-1.5 text-destructive font-semibold">
              <AlertCircle className="w-4 h-4" />
              반려 사유 안내
            </div>
            <p className="text-destructive/90 pl-5 whitespace-pre-wrap">
              {rejectionReason || "관리자 검토 결과 반려되었습니다. 과제 요건을 확인 후 다시 제출해 주세요."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ── Status Badge Helper ──────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "pending" | "approved" | "rejected" }) {
  if (status === "approved") {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-300 text-xs font-semibold gap-1">
        <CheckCircle2 className="w-3 h-3" />
        승인 완료
      </Badge>
    );
  }
  if (status === "rejected") {
    return (
      <Badge variant="destructive" className="text-xs font-semibold gap-1">
        <XCircle className="w-3 h-3" />
        반려
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-300 text-xs font-semibold gap-1">
      <Clock className="w-3 h-3" />
      검토 대기
    </Badge>
  );
}

// ── Book Report Modal ────────────────────────────────────────────────────────

function BookReportModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [bookTitle, setBookTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const submitBookReport = useMutation(api.submissions.submitBookReport);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookTitle.trim()) {
      toast.error("도서명을 입력해 주세요.");
      return;
    }
    if (!file) {
      toast.error("독후감 과제 파일을 첨부해 주세요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기는 20MB 이하만 첨부 가능합니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Get Convex upload URL
      const postUrl = await generateUploadUrl();

      // 2. Upload file
      const uploadRes = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("파일 업로드에 실패했습니다.");
      }

      const { storageId } = await uploadRes.json();

      // 3. Submit record
      await submitBookReport({
        bookTitle: bookTitle.trim(),
        author: author.trim() || undefined,
        fileStorageId: storageId,
        fileName: file.name,
      });

      toast.success("독후감이 성공적으로 제출되었습니다. 관리자 검토 후 승인됩니다.");
      setBookTitle("");
      setAuthor("");
      setFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "독후감 제출에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            독후감 과제 제출
          </DialogTitle>
          <DialogDescription>
            선정 도서를 읽고 작성한 독후감 파일(PDF, HWP, DOCX 등)을 첨부하여 제출하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="bookTitle">
              도서명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="bookTitle"
              placeholder="예: 멘탈코칭의 정석, 회복탄력성"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="author">저자 (선택)</Label>
            <Input
              id="author"
              placeholder="예: 저자명 입력"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              disabled={submitting}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bookFile">
              과제 파일 첨부 <span className="text-destructive">*</span>
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <input
                id="bookFile"
                type="file"
                accept=".pdf,.hwp,.hwpx,.doc,.docx,.txt"
                className="hidden"
                disabled={submitting}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
              <label htmlFor="bookFile" className="cursor-pointer space-y-1 block">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                {file ? (
                  <div className="text-xs font-semibold text-primary truncate max-w-xs mx-auto">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-foreground">
                      클릭하여 독후감 파일을 선택하세요
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PDF, HWP, DOCX 등 (최대 20MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting} className="cursor-pointer gap-1.5">
              {submitting ? "업로드 및 제출 중..." : "제출하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Coaching Essay Modal ─────────────────────────────────────────────────────

function EssayModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const generateUploadUrl = useMutation(api.submissions.generateUploadUrl);
  const submitEssay = useMutation(api.submissions.submitEssay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("에세이 제목/주제를 입력해 주세요.");
      return;
    }
    if (!file) {
      toast.error("에세이 과제 파일을 첨부해 주세요.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast.error("파일 크기는 20MB 이하만 첨부 가능합니다.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Get Convex upload URL
      const postUrl = await generateUploadUrl();

      // 2. Upload file
      const uploadRes = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error("파일 업로드에 실패했습니다.");
      }

      const { storageId } = await uploadRes.json();

      // 3. Submit record
      await submitEssay({
        title: title.trim(),
        fileStorageId: storageId,
        fileName: file.name,
      });

      toast.success("코칭에세이가 성공적으로 제출되었습니다. 관리자 검토 후 승인됩니다.");
      setTitle("");
      setFile(null);
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "에세이 제출에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            멘탈코칭 에세이 제출
          </DialogTitle>
          <DialogDescription>
            코칭 실습 및 배움에 대한 통찰을 담은 에세이 파일(PDF, HWP, DOCX 등)을 첨부하여 제출하세요.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="essayTitle">
              에세이 제목 / 주제 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="essayTitle"
              placeholder="예: 스포츠 멘탈코칭 실습을 통해 얻은 성찰과 코칭 철학"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="essayFile">
              과제 파일 첨부 <span className="text-destructive">*</span>
            </Label>
            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary/50 transition-colors">
              <input
                id="essayFile"
                type="file"
                accept=".pdf,.hwp,.hwpx,.doc,.docx,.txt"
                className="hidden"
                disabled={submitting}
                onChange={(e) => {
                  const selected = e.target.files?.[0];
                  if (selected) setFile(selected);
                }}
              />
              <label htmlFor="essayFile" className="cursor-pointer space-y-1 block">
                <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
                {file ? (
                  <div className="text-xs font-semibold text-primary truncate max-w-xs mx-auto">
                    {file.name} ({(file.size / 1024).toFixed(1)} KB)
                  </div>
                ) : (
                  <>
                    <p className="text-xs font-medium text-foreground">
                      클릭하여 에세이 파일을 선택하세요
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      PDF, HWP, DOCX 등 (최대 20MB)
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              취소
            </Button>
            <Button type="submit" disabled={submitting} className="cursor-pointer gap-1.5">
              {submitting ? "업로드 및 제출 중..." : "제출하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
