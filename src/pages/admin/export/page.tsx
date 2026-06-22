import { useState } from "react";
import { useQuery } from "convex/react";
import { Authenticated, AuthLoading } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import {
  Download,
  Users,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Award,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  TrendingUp,
  CalendarDays,
  Layers,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { toast } from "sonner";
import { toCSV, downloadCSV } from "@/lib/csv.ts";

type StatusFilter = "all" | "pending" | "approved" | "rejected";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "approved", label: "승인됨" },
  { value: "pending", label: "대기중" },
  { value: "rejected", label: "거부됨" },
];

// ── Cohort selector (shared) ──────────────────────────────────────────────────

function CohortSelector({
  cohortId,
  onChange,
}: {
  cohortId: Id<"cohorts"> | "";
  onChange: (id: Id<"cohorts">) => void;
}) {
  const cohorts = useQuery(api.cohorts.list);

  if (!cohorts) return <Skeleton className="h-9 w-48" />;

  return (
    <div className="flex items-center gap-2">
      <Layers className="w-4 h-4 text-primary flex-shrink-0" />
      <Select
        value={cohortId}
        onValueChange={(v) => onChange(v as Id<"cohorts">)}
      >
        <SelectTrigger className="w-48">
          <SelectValue placeholder="기수를 선택하세요" />
        </SelectTrigger>
        <SelectContent>
          {cohorts.map((c) => (
            <SelectItem key={c._id} value={c._id}>
              {c.name}{c.status === "active" ? " ✓" : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// Helper hook to resolve the default cohort (active or first)
function useDefaultCohort() {
  const cohorts = useQuery(api.cohorts.list);
  const activeCohort = cohorts?.find((c) => c.status === "active") ?? cohorts?.[0];
  return { cohorts, defaultCohortId: activeCohort?._id ?? "" as Id<"cohorts"> | "" };
}

// ── Individual export cards ───────────────────────────────────────────────────

function TraineesExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const data = useQuery(api.export.exportTrainees, cohortId ? { cohortId } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `교육생_목록_${date}.csv`);
      toast.success(`${data.length}명의 교육생 데이터를 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<Users className="w-5 h-5" />}
      title="교육생 목록"
      description="선택한 기수의 교육생 기본 정보, 인증 목표, 승인 상태를 내보냅니다"
      count={data?.length}
      columns={["이름", "이메일", "인증목표", "승인상태", "가입일", "온보딩완료"]}
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function EducationExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const data = useQuery(api.export.exportEducationRecords, cohortId ? { cohortId, status } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `교육_기록_${status}_${date}.csv`);
      toast.success(`${data.length}건의 교육 기록을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<BookOpen className="w-5 h-5" />}
      title="교육 이수 기록"
      description="선택한 기수의 교육 이수 기록, 기관명, 이수 시간, 승인 상태를 내보냅니다"
      count={data?.length}
      columns={["교육생명", "교육명", "기관명", "교육일", "이수시간", "승인상태"]}
      filter={
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function CoachingExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const data = useQuery(api.export.exportCoachingLogs, cohortId ? { cohortId, status } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `코칭_기록_${status}_${date}.csv`);
      toast.success(`${data.length}건의 코칭 기록을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<ClipboardList className="w-5 h-5" />}
      title="코칭 실습 기록"
      description="선택한 기수의 코칭 세션 기록, 코치이 정보, 주제, 승인 상태를 내보냅니다"
      count={data?.length}
      columns={["교육생명", "코칭일", "코치이", "유형", "시간(분)", "주제", "승인상태"]}
      filter={
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function MentorCoachingExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const [status, setStatus] = useState<StatusFilter>("all");
  const data = useQuery(api.export.exportMentorCoachingLogs, cohortId ? { cohortId, status } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `슈퍼비전_기록_${status}_${date}.csv`);
      toast.success(`${data.length}건의 슈퍼비전 기록을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<MessageSquare className="w-5 h-5" />}
      title="슈퍼비전 기록"
      description="선택한 기수의 멘토코칭·코더코 세션 기록, 코치명, 주제, 승인 상태를 내보냅니다"
      count={data?.length}
      columns={["교육생명", "세션일", "유형", "코치명", "시간(분)", "주제", "승인상태"]}
      filter={
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <Filter className="w-3 h-3 mr-1" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function CertificationExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const data = useQuery(api.export.exportCertificationApplications, cohortId ? { cohortId } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `인증신청_현황_${date}.csv`);
      toast.success(`${data.length}건의 인증 신청 데이터를 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<Award className="w-5 h-5" />}
      title="인증 신청 현황"
      description="선택한 기수의 인증 신청 목록, 신청일, 심사 상태, 검토 의견을 내보냅니다"
      count={data?.length}
      columns={["교육생명", "인증목표", "신청일", "상태", "교육시간", "코칭시간", "검토일"]}
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function TraineeProgressExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const data = useQuery(api.export.exportTraineeProgress, cohortId ? { cohortId } : "skip");
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `교육생_진행현황_${date}.csv`);
      toast.success(`${data.length}명의 진행 현황을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<TrendingUp className="w-5 h-5" />}
      title="교육생별 진행 현황"
      description="선택한 기수의 승인된 교육시간, 코칭시간(개인/그룹), 슈퍼비전 횟수를 요약합니다"
      count={data?.length}
      columns={["이름", "이메일", "승인교육시간", "승인코칭시간", "개인코칭시간", "그룹코칭시간", "슈퍼비전횟수"]}
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function CoachingFilteredExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const [status, setStatus] = useState<StatusFilter>("approved");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const data = useQuery(
    api.export.exportCoachingLogsFiltered,
    cohortId
      ? { cohortId, status, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }
      : "skip"
  );
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `코칭기록_상세_${status}_${date}.csv`);
      toast.success(`${data.length}건의 코칭 기록을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<ClipboardList className="w-5 h-5" />}
      title="코칭 기록 (기간 필터)"
      description="선택한 기수의 코칭 기록을 기간과 승인 상태로 필터링합니다. MCCI 도메인·사용 기법 포함"
      count={data?.length}
      columns={["교육생명", "코칭일", "유형", "시간", "MCCI도메인", "사용기법", "승인상태"]}
      filter={
        <div className="flex flex-wrap gap-2 items-center">
          <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <Filter className="w-3 h-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 text-xs w-36"
          />
          <span className="text-xs text-muted-foreground">~</span>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-8 text-xs w-36"
          />
        </div>
      }
      onExport={handleExport}
      loading={loading || data === undefined}
      disabled={!cohortId}
    />
  );
}

function AttendanceExportCard({ cohortId }: { cohortId: Id<"cohorts"> | "" }) {
  const cohorts = useQuery(api.cohorts.list);
  const data = useQuery(
    api.export.exportAttendanceByCohort,
    cohortId ? { cohortId } : "skip"
  );
  const [loading, setLoading] = useState(false);

  const handleExport = () => {
    if (!data || !cohortId) return;
    setLoading(true);
    try {
      const csv = toCSV(data);
      const cohortName = cohorts?.find((c) => c._id === cohortId)?.name ?? "기수";
      const date = new Date().toISOString().slice(0, 10);
      downloadCSV(csv, `출석현황_${cohortName}_${date}.csv`);
      toast.success(`${data.length}명의 출석 현황을 내보냈습니다`);
    } catch {
      toast.error("내보내기 실패");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ExportCard
      icon={<CalendarDays className="w-5 h-5" />}
      title="기수별 출석 현황"
      description="선택한 기수의 교육생별 세미나 출석 현황을 내보냅니다 (출석/지각/결석/공결)"
      count={data?.length}
      columns={["이름", "이메일", "1차", "2차", "3차", "..."]}
      onExport={handleExport}
      loading={loading || (cohortId ? data === undefined : false)}
      disabled={!cohortId}
    />
  );
}

// ── Reusable card component ───────────────────────────────────────────────────

function ExportCard({
  icon,
  title,
  description,
  count,
  columns,
  filter,
  onExport,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  count?: number;
  columns: string[];
  filter?: React.ReactNode;
  onExport: () => void;
  loading: boolean;
  disabled?: boolean;
}) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            {icon}
          </div>
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            {disabled ? (
              <p className="text-xs text-muted-foreground mt-0.5">기수를 선택하세요</p>
            ) : count !== undefined ? (
              <p className="text-xs text-muted-foreground mt-0.5">총 {count.toLocaleString()}건</p>
            ) : (
              <Skeleton className="h-3 w-16 mt-1" />
            )}
          </div>
        </div>
        <CardDescription className="mt-2 text-xs leading-relaxed">{description}</CardDescription>
        {filter && <div className="mt-2">{filter}</div>}
      </CardHeader>
      <CardContent className="flex flex-col gap-3 flex-1 justify-end">
        <div className="flex flex-wrap gap-1">
          {columns.map((col) => (
            <Badge key={col} variant="secondary" className="text-[10px] px-1.5 py-0">
              {col}
            </Badge>
          ))}
        </div>
        <Button
          className="w-full gap-2 cursor-pointer"
          onClick={onExport}
          disabled={loading || disabled || count === 0}
        >
          {loading && !disabled ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
              준비 중...
            </span>
          ) : (
            <>
              <Download className="w-4 h-4" />
              CSV 내보내기
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function ExportPageInner() {
  const { cohorts, defaultCohortId } = useDefaultCohort();
  const [cohortId, setCohortId] = useState<Id<"cohorts"> | "">("");
  const resolvedCohortId = cohortId || defaultCohortId;

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold">데이터 내보내기</h1>
            <p className="text-sm text-muted-foreground">CSV 형식으로 데이터를 다운로드합니다 (Excel 호환)</p>
          </div>
        </div>
      </motion.div>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: "easeOut" }}
        className="flex items-start gap-3 p-4 rounded-lg bg-muted/50 border text-sm text-muted-foreground"
      >
        <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
        <p>
          내보낸 CSV 파일은 <strong>한글(UTF-8 BOM)</strong> 인코딩으로 저장되어 Microsoft Excel 및 구글 스프레드시트에서 바로 열 수 있습니다.
          아래에서 기수를 선택하면 해당 기수의 데이터만 내보냅니다.
        </p>
      </motion.div>

      {/* Cohort selector */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15, ease: "easeOut" }}
        className="flex items-center gap-3 p-4 rounded-lg border bg-background"
      >
        <Label className="text-sm font-medium whitespace-nowrap">기수 선택</Label>
        {cohorts ? (
          <CohortSelector
            cohortId={resolvedCohortId}
            onChange={(id) => setCohortId(id)}
          />
        ) : (
          <Skeleton className="h-9 w-48" />
        )}
        {resolvedCohortId && cohorts && (
          <span className="text-xs text-muted-foreground">
            {cohorts.find((c) => c._id === resolvedCohortId)?.name ?? ""}의 데이터를 내보냅니다
          </span>
        )}
      </motion.div>

      {/* Export cards grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <TraineesExportCard cohortId={resolvedCohortId} />
        <EducationExportCard cohortId={resolvedCohortId} />
        <CoachingExportCard cohortId={resolvedCohortId} />
        <MentorCoachingExportCard cohortId={resolvedCohortId} />
        <CertificationExportCard cohortId={resolvedCohortId} />
        <TraineeProgressExportCard cohortId={resolvedCohortId} />
        <CoachingFilteredExportCard cohortId={resolvedCohortId} />
        <AttendanceExportCard cohortId={resolvedCohortId} />
      </motion.div>
    </div>
  );
}

export default function ExportPage() {
  return (
    <>
      <AuthLoading>
        <div className="p-6 max-w-5xl mx-auto space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      </AuthLoading>
      <Authenticated>
        <ExportPageInner />
      </Authenticated>
    </>
  );
}
