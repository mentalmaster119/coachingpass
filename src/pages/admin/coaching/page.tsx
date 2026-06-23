import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Check, X, Paperclip, Calendar, Clock, User, Users, ClipboardList,
  Search, ChevronDown, ChevronUp, Brain, Target, Lightbulb, Zap,
  MessageSquare, BookOpen, Filter,
} from "lucide-react";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
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
import { toast } from "sonner";

type CoachingLog = Doc<"coachingLogs"> & {
  userName: string;
  userEmail: string;
  evidenceUrl: string | null;
};

type StatusFilter = "all" | "pending" | "approved" | "rejected";
type TypeFilter = "all" | "individual" | "group";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

const STATUS_CONFIG = {
  draft:    { label: "임시저장", color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400" },
  pending:  { label: "검토 대기", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "승인",     color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" },
  rejected: { label: "반려",     color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" },
};

const MCCI_DOMAIN_LABELS: Record<string, string> = {
  motivation: "동기부여",
  skill: "기술",
  performance: "수행",
  relationship: "관계",
};

const STATE_LABELS: Record<string, string> = {
  motivation: "의욕",
  confidence: "자신감",
  focus: "집중력",
  calmness: "평온함",
  actionWill: "실행의지",
};

// ── Reject Dialog ─────────────────────────────────────────────────────────────

function RejectDialog({
  log,
  open,
  onOpenChange,
}: {
  log: CoachingLog | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const reject = useMutation(api.coaching.reject);

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
          <DialogTitle>코칭 기록 반려</DialogTitle>
          <DialogDescription>
            {log?.userName}님의 "{log?.topic}" 기록을 반려합니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label>
            반려 사유 <span className="text-destructive">*</span>
          </Label>
          <Input
            placeholder="예: 코칭 내용 불충분, 시간 불일치 등"
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

// ── Detail Dialog (full MCCI fields) ─────────────────────────────────────────

function DetailDialog({
  log,
  open,
  onOpenChange,
  onReject,
}: {
  log: CoachingLog | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onReject: (log: CoachingLog) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const approve = useMutation(api.coaching.approve);

  const handleApprove = async () => {
    if (!log) return;
    setIsApproving(true);
    try {
      await approve({ logId: log._id });
      toast.success("승인되었습니다.");
      onOpenChange(false);
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsApproving(false);
    }
  };

  if (!log) return null;

  const isPending = log.approvalStatus === "pending";

  const renderField = (label: string, value: string | undefined | null) =>
    value ? (
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-sm whitespace-pre-wrap">{value}</p>
      </div>
    ) : null;

  const renderStateBar = (state: Record<string, number | null> | undefined, title: string) => {
    if (!state) return null;
    return (
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{title}</p>
        <div className="grid grid-cols-5 gap-1">
          {Object.entries(state).map(([key, val]) => (
            <div key={key} className="text-center">
              <div className="text-xs text-muted-foreground mb-0.5">{STATE_LABELS[key] ?? key}</div>
              {val === null ? (
                <div className="text-xs font-semibold text-muted-foreground">NA</div>
              ) : (
                <>
                  <div className="text-sm font-semibold">{val}</div>
                  <div className="h-1.5 bg-muted rounded-full mt-0.5">
                    <div
                      className="h-1.5 bg-primary rounded-full"
                      style={{ width: `${(val / 10) * 100}%` }}
                    />
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-primary" />
            코칭 기록 상세
          </DialogTitle>
          <DialogDescription>
            {log.userName} · {log.topic}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Status badge */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-[11px] px-2 py-0.5 ${STATUS_CONFIG[log.approvalStatus].color}`}>
              {STATUS_CONFIG[log.approvalStatus].label}
            </Badge>
            {log.mcciDomain && (
              <Badge variant="secondary" className="text-[11px]">
                MCCI: {MCCI_DOMAIN_LABELS[log.mcciDomain] ?? log.mcciDomain}
              </Badge>
            )}
            {log.rejectionReason && (
              <p className="text-xs text-destructive">반려 사유: {log.rejectionReason}</p>
            )}
          </div>

          {/* Ⅰ. 기본정보 */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅰ. 기본정보</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">날짜</span>
                <p className="font-medium">{format(new Date(log.coachingDate), "yyyy.MM.dd (EEE)", { locale: ko })}</p>
              </div>
              {(log.coachingStartTime || log.coachingEndTime) && (
                <div>
                  <span className="text-xs text-muted-foreground">시간</span>
                  <p className="font-medium">{log.coachingStartTime ?? ""} ~ {log.coachingEndTime ?? ""}</p>
                </div>
              )}
              <div>
                <span className="text-xs text-muted-foreground">소요시간</span>
                <p className="font-medium">{formatDuration(log.durationMinutes)}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">코칭유형</span>
                <p className="font-medium">{log.coachingType === "individual" ? "개인" : "그룹"}</p>
              </div>
              {log.sessionNumber && (
                <div>
                  <span className="text-xs text-muted-foreground">회차</span>
                  <p className="font-medium">{log.sessionNumber}회차</p>
                </div>
              )}
              {log.coachingPlace && (
                <div>
                  <span className="text-xs text-muted-foreground">장소</span>
                  <p className="font-medium">
                    {log.coachingPlace === "other"
                      ? (log.coachingPlaceOther ?? "기타")
                      : ({ zoom: "Zoom", study_room: "공부방", center: "센터", home: "가정집", hanyang: "한양대 올림픽체육관" }[log.coachingPlace] ?? log.coachingPlace)}
                  </p>
                </div>
              )}
            </div>

            <div className="border-t pt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
              <div>
                <span className="text-xs text-muted-foreground">코치이</span>
                <p className="font-medium">{log.coacheeInfo}</p>
              </div>
              {log.coacheeGender && (
                <div>
                  <span className="text-xs text-muted-foreground">성별</span>
                  <p className="font-medium">{log.coacheeGender === "male" ? "남" : "여"}</p>
                </div>
              )}
              {log.coacheeAge !== undefined && (
                <div>
                  <span className="text-xs text-muted-foreground">나이</span>
                  <p className="font-medium">{log.coacheeAge}세</p>
                </div>
              )}
              {log.coacheeField && (
                <div>
                  <span className="text-xs text-muted-foreground">종목/직군</span>
                  <p className="font-medium">{log.coacheeField}</p>
                </div>
              )}
              {log.coacheeType && log.coacheeType.length > 0 && (
                <div className="col-span-2">
                  <span className="text-xs text-muted-foreground">고객유형</span>
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {log.coacheeType.map((t) => (
                      <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Ⅱ. 코칭 주제 */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅱ. 코칭 주제</p>
            {renderField("주제", log.topic)}
            {log.coreIssues && log.coreIssues.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">핵심 문제</p>
                <div className="flex flex-wrap gap-1">
                  {log.coreIssues.map((issue) => (
                    <Badge key={issue} variant="outline" className="text-[11px]">{issue}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Ⅲ. 상태 진단 */}
          {(log.preCoachingState || log.postCoachingState) && (
            <div className="rounded-lg border p-3 space-y-3">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅲ. 상태 진단 (1~10)</p>
              {renderStateBar(log.preCoachingState, "코칭 전")}
              {renderStateBar(log.postCoachingState, "코칭 후")}
            </div>
          )}

          {/* Ⅳ. 사용 기법 */}
          {(log.techniquesUsed || log.techniqueOther) && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅳ. 사용 기법</p>
              {log.techniquesUsed && log.techniquesUsed.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {log.techniquesUsed.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[11px]">{t}</Badge>
                  ))}
                </div>
              )}
              {renderField("기타 기법", log.techniqueOther)}
            </div>
          )}

          {/* Ⅴ. 핵심 발견 */}
          {(log.clientInsight || log.coachPattern) && (
            <div className="rounded-lg border p-3 space-y-2">
              <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅴ. 핵심 발견</p>
              {renderField("고객의 핵심 통찰", log.clientInsight)}
              {renderField("코치가 발견한 핵심 패턴", log.coachPattern)}
            </div>
          )}

          {/* Ⅵ. 실행 */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅵ. 실행</p>
            {renderField("코칭 목표", log.goals)}
            {renderField("고객의 실행계획", log.actionPlan)}
            {renderField("다음 회차까지 실천사항", log.nextSessionPractice)}
          </div>

          {/* Ⅶ. 코치 성장 */}
          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-xs font-semibold text-primary uppercase tracking-wide">Ⅶ. 코치 성장</p>
            {renderField("코칭 내용 요약", log.summary)}
            {renderField("성찰", log.reflection)}
            {renderField("이번 세션에서 가장 잘한 점", log.bestOfSession)}
            {renderField("다음 세션에서 개선할 점", log.improvementForNext)}
            {renderField("가장 효과적이었던 개입", log.mostEffectiveTechnique)}
            {renderField("고객의 대표 한마디", log.clientQuote)}
            {renderField("코치 전체 소감", log.coachOverallFeedback)}
            {log.changeKeywords && log.changeKeywords.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs font-medium text-muted-foreground">변화 키워드</p>
                <div className="flex flex-wrap gap-1">
                  {log.changeKeywords.map((kw) => (
                    <Badge key={kw} className="text-[11px] bg-primary/10 text-primary">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>닫기</Button>
          {log.evidenceUrl && (
            <Button variant="ghost" size="sm" onClick={() => window.open(log.evidenceUrl!, "_blank")}>
              <Paperclip className="w-3.5 h-3.5 mr-1" />증빙
            </Button>
          )}
          {isPending && (
            <>
              <Button
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={() => { onOpenChange(false); onReject(log); }}
              >
                <X className="w-3.5 h-3.5 mr-1" />반려
              </Button>
              <Button disabled={isApproving} onClick={handleApprove}>
                <Check className="w-3.5 h-3.5 mr-1" />
                {isApproving ? "처리 중..." : "승인"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Log card ──────────────────────────────────────────────────────────────────

function LogCard({
  log,
  onReject,
  onDetail,
}: {
  log: CoachingLog;
  onReject: (log: CoachingLog) => void;
  onDetail: (log: CoachingLog) => void;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [optimisticApproved, setOptimisticApproved] = useState(false);
  const approve = useMutation(api.coaching.approve);
  const isPending = log.approvalStatus === "pending" && !optimisticApproved;
  const effectiveStatus = optimisticApproved ? "approved" : log.approvalStatus;

  const handleApprove = async () => {
    setIsApproving(true);
    setOptimisticApproved(true);
    try {
      await approve({ logId: log._id });
      toast.success("승인되었습니다.");
    } catch {
      setOptimisticApproved(false);
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsApproving(false);
    }
  };

  const cfg = STATUS_CONFIG[effectiveStatus];

  return (
    <Card className="shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            {/* Trainee info + status */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold flex-shrink-0">
                {(log.userName?.[0] ?? "?").toUpperCase()}
              </div>
              <p className="text-xs font-semibold text-foreground">{log.userName}</p>
              <p className="text-xs text-muted-foreground hidden sm:block">{log.userEmail}</p>
              <Badge className={`text-[10px] px-1.5 py-0 ${cfg.color}`}>{cfg.label}</Badge>
              {log.mcciDomain && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {MCCI_DOMAIN_LABELS[log.mcciDomain]}
                </Badge>
              )}
            </div>

            {/* Log info */}
            <div className="space-y-0.5">
              <p className="font-medium text-sm">{log.topic}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {format(new Date(log.coachingDate), "yyyy.MM.dd (EEE)", { locale: ko })}
                </span>
                <span className="flex items-center gap-1">
                  {log.coachingType === "individual" ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                  {log.coachingType === "individual" ? "개인" : "그룹"}
                </span>
                <span className="flex items-center gap-1 font-semibold text-foreground">
                  <Clock className="w-3 h-3 text-primary" />
                  {formatDuration(log.durationMinutes)}
                </span>
                <span>코치이: {log.coacheeInfo}</span>
              </div>
            </div>

            {log.rejectionReason && (
              <p className="text-xs text-destructive">반려 사유: {log.rejectionReason}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs"
              onClick={() => onDetail(log)}
            >
              전체 보기
            </Button>
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
            {(isPending || optimisticApproved) && !isPending ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-2.5 py-1 rounded-full">
                <Check className="w-3.5 h-3.5" />승인됨
              </span>
            ) : isPending ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onReject(log)}
                >
                  <X className="w-3.5 h-3.5 mr-1" />반려
                </Button>
                <Button
                  size="sm"
                  className="h-8 bg-green-600 hover:bg-green-700 text-white"
                  disabled={isApproving}
                  onClick={handleApprove}
                >
                  <Check className="w-3.5 h-3.5 mr-1" />
                  {isApproving ? "처리 중..." : "승인"}
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminCoachingPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [rejectTarget, setRejectTarget] = useState<CoachingLog | null>(null);
  const [detailTarget, setDetailTarget] = useState<CoachingLog | null>(null);

  const convexStatus = statusFilter === "all" ? undefined : statusFilter;
  const convexType = typeFilter === "all" ? undefined : typeFilter;

  const logs = useQuery(api.coaching.getAllLogs, { status: convexStatus, coachingType: convexType });

  const filtered = logs?.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      l.userName.toLowerCase().includes(q) ||
      l.topic.toLowerCase().includes(q) ||
      l.coacheeInfo.toLowerCase().includes(q)
    );
  }) ?? [];

  const pendingCount = logs === undefined
    ? undefined
    : (statusFilter === "all" ? logs.filter((l) => l.approvalStatus === "pending").length : undefined);

  const isLoading = logs === undefined;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
          <ClipboardList className="w-5 h-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">코칭 기록 검토</h1>
          <p className="text-sm text-muted-foreground">
            교육생이 제출한 코칭 실습 기록을 검토하고 승인/반려하세요
          </p>
        </div>
        {!isLoading && (
          <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            {statusFilter === "all"
              ? `전체 ${logs.length}건`
              : `${filtered.length}건`}
          </Badge>
        )}
      </motion.div>

      {/* Filters row */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="수련생·코칭주제·코치이로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Type filter */}
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
          <SelectTrigger className="w-32">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 유형</SelectItem>
            <SelectItem value="individual">개인</SelectItem>
            <SelectItem value="group">그룹</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Status tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList className="flex-wrap h-auto gap-1">
            <TabsTrigger value="pending" className="gap-1.5">
              검토 대기
              {pendingCount !== undefined && pendingCount > 0 && (
                <span className="ml-1 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">승인</TabsTrigger>
            <TabsTrigger value="rejected">반려</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-4 space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))
            ) : filtered.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Check />
                  </EmptyMedia>
                  <EmptyTitle>
                    {statusFilter === "pending" ? "검토 대기 기록이 없습니다" : "해당 기록이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {statusFilter === "pending" ? "모든 코칭 기록이 처리되었습니다." : "다른 탭을 확인해보세요."}
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              filtered.map((log) => (
                <LogCard
                  key={log._id}
                  log={log}
                  onReject={(l) => setRejectTarget(l)}
                  onDetail={(l) => setDetailTarget(l)}
                />
              ))
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <RejectDialog
        log={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
      />
      <DetailDialog
        log={detailTarget}
        open={detailTarget !== null}
        onOpenChange={(v) => { if (!v) setDetailTarget(null); }}
        onReject={(l) => { setDetailTarget(null); setRejectTarget(l); }}
      />
    </div>
  );
}
