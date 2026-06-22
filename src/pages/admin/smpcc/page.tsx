import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Award, Plus, CheckCircle2, XCircle, Clock, Users, RefreshCw,
  CalendarDays, MapPin, Edit2, Trash2, UserCheck, ArrowUpDown,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

// ── 인증 마크 배지 ─────────────────────────────────────────────────────────────
export function SmpccBadge({ expiresAt }: { expiresAt: string }) {
  const today = new Date().toISOString().slice(0, 10);
  const isExpiringSoon =
    expiresAt > today &&
    new Date(expiresAt) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <Badge className="bg-amber-500/15 text-amber-600 border-amber-400/30 hover:bg-amber-500/15 font-semibold">
      ✦ SMPCC {isExpiringSoon && <span className="ml-1 text-xs opacity-70">(갱신 필요)</span>}
    </Badge>
  );
}

// ── SMPCC 발급 다이얼로그 ─────────────────────────────────────────────────────
function IssueCertDialog({
  userId,
  userName,
  open,
  onOpenChange,
  isRenewal,
  certId,
}: {
  userId: Id<"users">;
  userName: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isRenewal?: boolean;
  certId?: Id<"smpccCertifications">;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [isPending, setIsPending] = useState(false);
  const issueCert = useMutation(api.smpcc.issueCertification);
  const renewCert = useMutation(api.smpcc.renewCertification);

  const expiresAt = (() => {
    const d = new Date(date);
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  })();

  const handleSubmit = async () => {
    setIsPending(true);
    try {
      if (isRenewal && certId) {
        await renewCert({ certId, renewedAt: date, notes: notes || undefined });
        toast.success("SMPCC 자격이 갱신되었습니다.");
      } else {
        await issueCert({ userId, issuedAt: date, notes: notes || undefined });
        toast.success("SMPCC 자격이 발급되었습니다.");
      }
      onOpenChange(false);
      setNotes("");
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
          <DialogTitle>{isRenewal ? "SMPCC 자격 갱신" : "SMPCC 자격 발급"}</DialogTitle>
          <DialogDescription>
            {userName}님의 SMPCC {isRenewal ? "갱신" : "취득"} 일자를 입력하세요.
            만료일은 자동으로 3년 후로 설정됩니다.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">취득일</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1" />
          </div>
          <p className="text-xs text-muted-foreground">
            만료 예정일: <span className="font-medium text-foreground">
              {format(new Date(expiresAt), "yyyy년 M월 d일", { locale: ko })}
            </span>
          </p>
          <div>
            <label className="text-sm font-medium">비고 (선택)</label>
            <Input
              placeholder="추가 메모"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button disabled={isPending || !date} onClick={handleSubmit}>
            {isPending ? "처리 중..." : isRenewal ? "갱신하기" : "발급하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 수강생 SMPCC 현황 카드 ────────────────────────────────────────────────────
type CompletedTrainee = NonNullable<ReturnType<typeof useQuery<typeof api.smpcc.getCompletedTraineesWithCohort>>>[number];

function UserCertCard({ trainee }: { trainee: CompletedTrainee }) {
  const [issueOpen, setIssueOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const isExpired = trainee.hasActiveCert && trainee.certExpiresAt ? trainee.certExpiresAt < today : false;

  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-foreground">
                {trainee.name}
                {trainee.cohortNumber !== null && (
                  <span className="text-muted-foreground font-normal ml-1">({trainee.cohortNumber}기)</span>
                )}
              </p>
              {trainee.hasActiveCert && !isExpired && trainee.certExpiresAt && (
                <SmpccBadge expiresAt={trainee.certExpiresAt} />
              )}
              {trainee.hasActiveCert && isExpired && (
                <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">
                  만료
                </Badge>
              )}
              {!trainee.hasActiveCert && <Badge variant="secondary">미취득</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{trainee.email}</p>
            {trainee.hasActiveCert && trainee.certIssuedAt && trainee.certExpiresAt && (
              <p className="text-xs text-muted-foreground">
                취득일 {trainee.certIssuedAt} · 만료일 {trainee.certExpiresAt}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {trainee.hasActiveCert ? (
              <Button size="sm" variant="secondary" onClick={() => setRenewOpen(true)}>
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> 갱신
              </Button>
            ) : (
              <Button size="sm" onClick={() => setIssueOpen(true)}>
                <Award className="w-3.5 h-3.5 mr-1" /> 발급
              </Button>
            )}
          </div>
        </div>
      </CardContent>

      <IssueCertDialog
        userId={trainee.userId}
        userName={trainee.name}
        open={issueOpen}
        onOpenChange={setIssueOpen}
      />
      {trainee.hasActiveCert && trainee.certId && (
        <IssueCertDialog
          userId={trainee.userId}
          userName={trainee.name}
          open={renewOpen}
          onOpenChange={setRenewOpen}
          isRenewal
          certId={trainee.certId}
        />
      )}
    </Card>
  );
}

// ── 포럼 폼 다이얼로그 ────────────────────────────────────────────────────────
function ForumFormDialog({
  forum,
  open,
  onOpenChange,
}: {
  forum?: { _id: Id<"mentalForums">; title: string; forumDate: string; startTime?: string; endTime?: string; location?: string; description?: string; creditHours: number } | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const isEdit = !!forum;
  const [form, setForm] = useState({
    title: forum?.title ?? "",
    forumDate: forum?.forumDate ?? new Date().toISOString().slice(0, 10),
    startTime: forum?.startTime ?? "",
    endTime: forum?.endTime ?? "",
    location: forum?.location ?? "",
    description: forum?.description ?? "",
    creditHours: forum?.creditHours ?? 2,
  });
  const [isPending, setIsPending] = useState(false);
  const createForum = useMutation(api.smpcc.createForum);
  const updateForum = useMutation(api.smpcc.updateForum);

  const handleSubmit = async () => {
    if (!form.title || !form.forumDate) return;
    setIsPending(true);
    try {
      const payload = {
        title: form.title,
        forumDate: form.forumDate,
        startTime: form.startTime || undefined,
        endTime: form.endTime || undefined,
        location: form.location || undefined,
        description: form.description || undefined,
        creditHours: form.creditHours,
      };
      if (isEdit && forum) {
        await updateForum({ forumId: forum._id, ...payload });
        toast.success("포럼이 수정되었습니다.");
      } else {
        await createForum(payload);
        toast.success("포럼이 등록되었습니다.");
      }
      onOpenChange(false);
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
          <DialogTitle>{isEdit ? "포럼 수정" : "멘탈 포럼 등록"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">포럼명 *</label>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="예: 2025년 제1회 멘탈 포럼" className="mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">개최일 *</label>
              <Input type="date" value={form.forumDate} onChange={(e) => setForm({ ...form, forumDate: e.target.value })} className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">인정 시간 (h)</label>
              <Input type="number" min={0.5} step={0.5} value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: parseFloat(e.target.value) || 2 })} className="mt-1" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium">시작 시간</label>
              <Input value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} placeholder="09:00" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">종료 시간</label>
              <Input value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} placeholder="18:00" className="mt-1" />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">장소</label>
            <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="장소 또는 Zoom 링크" className="mt-1" />
          </div>
          <div>
            <label className="text-sm font-medium">설명</label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="포럼 안내" className="mt-1" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button disabled={isPending || !form.title || !form.forumDate} onClick={handleSubmit}>
            {isPending ? "저장 중..." : isEdit ? "수정하기" : "등록하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 포럼 참석자 관리 다이얼로그 ───────────────────────────────────────────────
function ForumAttendeesDialog({
  forumId,
  forumTitle,
  open,
  onOpenChange,
}: {
  forumId: Id<"mentalForums">;
  forumTitle: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const attendees = useQuery(api.smpcc.getForumAttendees, { forumId });
  const approve = useMutation(api.smpcc.approveForumAttendance);
  const reject = useMutation(api.smpcc.rejectForumAttendance);

  const handleApprove = async (id: Id<"forumAttendances">, name: string) => {
    try {
      await approve({ attendanceId: id });
      toast.success(`${name} 참석 승인 완료 - 교육시간이 인정됩니다.`);
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleReject = async (id: Id<"forumAttendances">) => {
    try {
      await reject({ attendanceId: id });
      toast.success("참석 신청이 반려되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>참석자 관리</DialogTitle>
          <DialogDescription>{forumTitle}</DialogDescription>
        </DialogHeader>
        {attendees === undefined ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
        ) : attendees.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">신청자가 없습니다.</p>
        ) : (
          <div className="space-y-2">
            {attendees.map((a) => (
              <div key={a._id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/40">
                <div>
                  <p className="text-sm font-medium">{a.userName}</p>
                  <p className="text-xs text-muted-foreground">{a.userEmail}</p>
                </div>
                <div className="flex items-center gap-2">
                  {a.status === "approved" ? (
                    <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15">승인됨</Badge>
                  ) : a.status === "rejected" ? (
                    <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">반려됨</Badge>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" className="h-7 px-2" onClick={() => handleApprove(a._id, a.userName)}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleReject(a._id)}>
                        <XCircle className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>닫기</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── 메인 페이지 ────────────────────────────────────────────────────────────────
type ForumItem = NonNullable<ReturnType<typeof useQuery<typeof api.smpcc.listForums>>>[number];
type SortOrder = "name" | "cohort";

export default function AdminSmpccPage() {
  const completedTrainees = useQuery(api.smpcc.getCompletedTraineesWithCohort);
  const forums = useQuery(api.smpcc.listForums);
  const courseCredits = useQuery(api.smpcc.listCourseCredits);
  const upsertCredit = useMutation(api.smpcc.upsertCourseCredit);
  const deleteForum = useMutation(api.smpcc.deleteForum);

  const [sortOrder, setSortOrder] = useState<SortOrder>("name");
  const [forumOpen, setForumOpen] = useState(false);
  const [editForum, setEditForum] = useState<ForumItem | null>(null);
  const [attendeesForumId, setAttendeesForumId] = useState<Id<"mentalForums"> | null>(null);
  const [attendeesTitle, setAttendeesTitle] = useState("");

  // Sort trainees
  const sortedTrainees = completedTrainees
    ? [...completedTrainees].sort((a, b) => {
        if (sortOrder === "name") {
          return (a.name ?? "").localeCompare(b.name ?? "", "ko");
        } else {
          // 기수순: 기수 번호 오름차순, 같은 기수 내에서는 이름순
          const cohortDiff = (a.cohortNumber ?? 9999) - (b.cohortNumber ?? 9999);
          if (cohortDiff !== 0) return cohortDiff;
          return (a.name ?? "").localeCompare(b.name ?? "", "ko");
        }
      })
    : [];

  // Default course credits (shown if not set yet)
  const DEFAULT_CREDITS = [
    { key: "two_day_seminar", name: "2일 세미나", hours: 16 },
    { key: "one_day_seminar", name: "1일 세미나 (교재학습)", hours: 8 },
    { key: "group_coaching", name: "그룹코칭", hours: 4 },
    { key: "mental_forum", name: "멘탈 포럼", hours: 2 },
    { key: "kac_basic", name: "KAC 기본과정", hours: 30 },
    { key: "kpc_advanced", name: "KPC 심화과정", hours: 30 },
    { key: "mspe_basic", name: "MSPE 기본과정", hours: 20 },
    { key: "supervision_course", name: "SuperVision 과정", hours: 20 },
    { key: "sports_coaching_basic", name: "스포츠멘탈코칭강독 기본", hours: 15 },
    { key: "sports_coaching_advanced", name: "스포츠멘탈코칭강독 심화", hours: 15 },
  ];

  const [editingCredit, setEditingCredit] = useState<string | null>(null);
  const [creditInput, setCreditInput] = useState<number>(0);

  const handleSaveCredit = async (key: string, name: string) => {
    try {
      await upsertCredit({ courseKey: key, courseName: name, creditHours: creditInput });
      toast.success("인정시간이 저장되었습니다.");
      setEditingCredit(null);
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  const handleDeleteForum = async (id: Id<"mentalForums">) => {
    if (!confirm("포럼을 삭제하시겠습니까?")) return;
    try {
      await deleteForum({ forumId: id });
      toast.success("포럼이 삭제되었습니다.");
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">SMPCC 자격 관리</h1>
            <p className="text-sm text-muted-foreground">자격 발급·갱신, 멘탈 포럼, 인정시간 관리</p>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="certifications">
        <TabsList className="mb-6 flex-wrap h-auto gap-1">
          <TabsTrigger value="certifications" className="gap-1.5"><Award className="w-3.5 h-3.5" /> 자격 현황</TabsTrigger>
          <TabsTrigger value="forums" className="gap-1.5"><CalendarDays className="w-3.5 h-3.5" /> 멘탈 포럼</TabsTrigger>
          <TabsTrigger value="credits" className="gap-1.5"><Clock className="w-3.5 h-3.5" /> 인정시간 설정</TabsTrigger>
        </TabsList>

        {/* 자격 현황 탭 */}
        <TabsContent value="certifications">
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-400/20 text-sm text-amber-700 dark:text-amber-400">
            SMPCC 자격은 3년간 유효하며, 갱신을 위해 3년 내 20시간 이상의 추가 교육이 필요합니다.
            수료 기준을 통과한 수강생만 표시됩니다.
          </div>

          {/* 정렬 버튼 */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> 정렬:
            </span>
            <Button
              size="sm"
              variant={sortOrder === "name" ? "default" : "secondary"}
              className="h-7 text-xs"
              onClick={() => setSortOrder("name")}
            >
              이름순
            </Button>
            <Button
              size="sm"
              variant={sortOrder === "cohort" ? "default" : "secondary"}
              className="h-7 text-xs"
              onClick={() => setSortOrder("cohort")}
            >
              기수순
            </Button>
          </div>

          {!completedTrainees ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
          ) : sortedTrainees.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><UserCheck /></EmptyMedia>
                <EmptyTitle>수료 기준 통과 수강생이 없습니다</EmptyTitle>
                <EmptyDescription>수료 기준(코칭 10건 이상, 출석 80% 이상)을 통과한 수강생이 없습니다.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {sortedTrainees.map((t) => (
                <UserCertCard key={t.userId} trainee={t} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* 멘탈 포럼 탭 */}
        <TabsContent value="forums">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">연 4~6회 개최, 참석 시 교육시간 인정</p>
            <Button size="sm" onClick={() => { setEditForum(null); setForumOpen(true); }}>
              <Plus className="w-4 h-4 mr-1" /> 포럼 등록
            </Button>
          </div>
          {!forums ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
          ) : forums.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                <EmptyTitle>등록된 포럼이 없습니다</EmptyTitle>
                <EmptyDescription>멘탈 포럼을 등록해 주세요.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-3">
              {forums.map((f) => (
                <Card key={f._id} className="shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{f.title}</p>
                          <Badge variant="secondary" className="text-xs">+{f.creditHours}h 인정</Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(f.forumDate), "yyyy년 M월 d일 (eee)", { locale: ko })}
                            {f.startTime && ` ${f.startTime}`}{f.endTime && ` ~ ${f.endTime}`}
                          </span>
                          {f.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{f.location}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />승인 {f.attendeeCount}명
                          </span>
                        </div>
                        {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="h-7 text-xs"
                          onClick={() => { setAttendeesForumId(f._id); setAttendeesTitle(f.title); }}
                        >
                          <Users className="w-3.5 h-3.5 mr-1" />참석자
                          {(f.myStatus === null) && (
                            <span className="ml-1 text-muted-foreground">
                              ({f.attendeeCount})
                            </span>
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditForum(f); setForumOpen(true); }}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteForum(f._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* 인정시간 설정 탭 */}
        <TabsContent value="credits">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">각 과정별로 인정받는 교육시간을 설정합니다. 수강생의 누적 교육시간 계산에 반영됩니다.</p>
          </div>
          <div className="space-y-2">
            {DEFAULT_CREDITS.map((dc) => {
              const saved = courseCredits?.find((c) => c.courseKey === dc.key);
              const displayHours = saved?.creditHours ?? dc.hours;
              const isEditing = editingCredit === dc.key;
              return (
                <Card key={dc.key} className="shadow-sm">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">{dc.name}</p>
                        {saved?.description && (
                          <p className="text-xs text-muted-foreground">{saved.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEditing ? (
                          <>
                            <Input
                              type="number"
                              min={0.5}
                              step={0.5}
                              value={creditInput}
                              onChange={(e) => setCreditInput(parseFloat(e.target.value) || 0)}
                              className="w-20 h-7 text-xs"
                            />
                            <span className="text-xs text-muted-foreground">시간</span>
                            <Button size="sm" className="h-7 px-2" onClick={() => handleSaveCredit(dc.key, dc.name)}>저장</Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingCredit(null)}>취소</Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="secondary">{displayHours}h</Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2"
                              onClick={() => { setEditingCredit(dc.key); setCreditInput(displayHours); }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      <ForumFormDialog
        forum={editForum ?? null}
        open={forumOpen}
        onOpenChange={(v) => { setForumOpen(v); if (!v) setEditForum(null); }}
      />

      {attendeesForumId && (
        <ForumAttendeesDialog
          forumId={attendeesForumId}
          forumTitle={attendeesTitle}
          open={attendeesForumId !== null}
          onOpenChange={(v) => { if (!v) setAttendeesForumId(null); }}
        />
      )}
    </div>
  );
}
