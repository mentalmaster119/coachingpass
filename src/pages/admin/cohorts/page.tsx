import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  Users,
  CalendarDays,
  ChevronRight,
  Pencil,
  Trash2,
  UserPlus,
  UserMinus,
  GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
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
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";

type CohortStatus = "upcoming" | "active" | "completed";
type MemberStatus = "active" | "completed" | "withdrawn";

function statusBadge(status: CohortStatus) {
  const map: Record<CohortStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
    upcoming: { label: "예정", variant: "secondary" },
    active: { label: "진행중", variant: "default" },
    completed: { label: "완료", variant: "outline" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

function memberStatusBadge(status: MemberStatus) {
  const map: Record<MemberStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    active: { label: "수강중", variant: "default" },
    completed: { label: "수료", variant: "secondary" },
    withdrawn: { label: "중도탈락", variant: "destructive" },
  };
  const { label, variant } = map[status];
  return <Badge variant={variant}>{label}</Badge>;
}

type CohortFormData = {
  name: string;
  number: string;
  term: "first" | "second";
  startDate: string;
  endDate: string;
  status: CohortStatus;
  description: string;
};

const defaultForm: CohortFormData = {
  name: "",
  number: "",
  term: "first",
  startDate: "",
  endDate: "",
  status: "upcoming",
  description: "",
};

type Cohort = {
  _id: Id<"cohorts">;
  name: string;
  number: number;
  term: "first" | "second";
  startDate: string;
  endDate: string;
  status: CohortStatus;
  description?: string;
  createdBy: Id<"users">;
  _creationTime: number;
};

export default function AdminCohortsPage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const createCohort = useMutation(api.cohorts.create);
  const updateCohort = useMutation(api.cohorts.update);
  const removeCohort = useMutation(api.cohorts.remove);

  const [showForm, setShowForm] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [form, setForm] = useState<CohortFormData>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Id<"cohorts"> | null>(null);
  const [selectedCohort, setSelectedCohort] = useState<Id<"cohorts"> | null>(null);

  const openCreate = () => {
    setEditingCohort(null);
    setForm(defaultForm);
    setShowForm(true);
  };

  const openEdit = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setForm({
      name: cohort.name,
      number: String(cohort.number),
      term: cohort.term,
      startDate: cohort.startDate,
      endDate: cohort.endDate,
      status: cohort.status,
      description: cohort.description ?? "",
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.number || !form.startDate || !form.endDate) {
      toast.error("필수 항목을 입력해 주세요");
      return;
    }
    setSaving(true);
    try {
      if (editingCohort) {
        await updateCohort({
          cohortId: editingCohort._id,
          name: form.name,
          number: Number(form.number),
          term: form.term,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
          description: form.description || undefined,
        });
        toast.success("기수 정보가 수정되었습니다");
      } else {
        await createCohort({
          name: form.name,
          number: Number(form.number),
          term: form.term,
          startDate: form.startDate,
          endDate: form.endDate,
          status: form.status,
          description: form.description || undefined,
        });
        toast.success("기수가 생성되었습니다");
      }
      setShowForm(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await removeCohort({ cohortId: deleteTarget });
      toast.success("기수가 삭제되었습니다");
      if (selectedCohort === deleteTarget) setSelectedCohort(null);
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">기수 관리</h1>
          <p className="text-muted-foreground text-sm mt-1">멘탈코칭전문가과정 기수를 생성하고 교육생을 배정합니다</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="w-4 h-4" />
          기수 추가
        </Button>
      </div>

      {/* Cohort list */}
      {cohorts === undefined ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : cohorts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><GraduationCap /></EmptyMedia>
            <EmptyTitle>등록된 기수가 없습니다</EmptyTitle>
            <EmptyDescription>기수를 추가하여 교육생을 관리하세요</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={openCreate}>기수 추가</Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid gap-4">
          {cohorts.map((cohort) => (
            <Card
              key={cohort._id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedCohort === cohort._id ? "ring-2 ring-primary" : ""}`}
              onClick={() => setSelectedCohort(selectedCohort === cohort._id ? null : cohort._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{cohort.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {cohort.term === "first" ? "상반기" : "하반기"} ·{" "}
                        {format(new Date(cohort.startDate), "yyyy년 M월", { locale: ko })} ~{" "}
                        {format(new Date(cohort.endDate), "yyyy년 M월", { locale: ko })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {statusBadge(cohort.status)}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); openEdit(cohort); }}
                      className="cursor-pointer"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget(cohort._id); }}
                      className="cursor-pointer text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${selectedCohort === cohort._id ? "rotate-90" : ""}`} />
                  </div>
                </div>
              </CardHeader>
              {cohort.description && (
                <CardContent className="pt-0 pb-3">
                  <p className="text-sm text-muted-foreground">{cohort.description}</p>
                </CardContent>
              )}
              {/* Expanded member management */}
              {selectedCohort === cohort._id && (
                <CardContent className="pt-0">
                  <div className="border-t pt-4" onClick={(e) => e.stopPropagation()}>
                    <CohortMemberPanel cohortId={cohort._id} />
                  </div>
                </CardContent>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCohort ? "기수 수정" : "기수 추가"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>기수명 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="예: 17기"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>기수 번호 <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  placeholder="예: 17"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>과정 구분</Label>
                <Select value={form.term} onValueChange={(v: "first" | "second") => setForm({ ...form, term: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="first">상반기</SelectItem>
                    <SelectItem value="second">하반기</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>상태</Label>
                <Select value={form.status} onValueChange={(v: CohortStatus) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="upcoming">예정</SelectItem>
                    <SelectItem value="active">진행중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>시작일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>종료일 <span className="text-destructive">*</span></Label>
                <Input
                  type="date"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>설명 (선택)</Label>
              <Textarea
                placeholder="기수에 대한 설명을 입력하세요"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowForm(false)}>취소</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "저장 중..." : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>기수를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              기수와 소속된 모든 교육생 배정 정보가 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Member Panel ───────────────────────────────────────────────────────────────

type Member = {
  _id: Id<"cohortMembers">;
  cohortId: Id<"cohorts">;
  userId: Id<"users">;
  joinedAt: string;
  status: MemberStatus;
  _creationTime: number;
  approvedCount?: number;
  totalCount?: number;
  user: { _id: Id<"users">; name?: string; email?: string; certificationGoal?: "KAC" | "KPC" | "SMPCC"; role: string } | null;
};

function CohortMemberPanel({ cohortId }: { cohortId: Id<"cohorts"> }) {
  const members = useQuery(api.cohorts.getMembers, { cohortId });
  const allUsers = useQuery(api.admin.getAllUsers, {});
  const addMember = useMutation(api.cohorts.addMember);
  const removeMember = useMutation(api.cohorts.removeMember);
  const updateStatus = useMutation(api.cohorts.updateMemberStatus);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const memberUserIds = new Set(members?.map((m) => m.userId) ?? []);
  const eligibleUsers = allUsers?.filter((u) => u.role === "trainee" && !memberUserIds.has(u._id)) ?? [];

  // ── Calculate Stats ──
  const activeMembers = members?.filter((m) => m.status === "active") ?? [];
  const completedMembers = members?.filter((m) => m.status === "completed") ?? [];
  const totalCount = members?.length ?? 0;

  const activeApprovedLogs = activeMembers.map((m) => m.approvedCount ?? 0);
  const averageLogs = activeApprovedLogs.length > 0
    ? parseFloat((activeApprovedLogs.reduce((a, b) => a + b, 0) / activeApprovedLogs.length).toFixed(1))
    : 0;

  const completionFulfilled = activeMembers.filter((m) => (m.approvedCount ?? 0) >= 15).length;
  const completionRate = activeMembers.length > 0
    ? Math.round((completionFulfilled / activeMembers.length) * 100)
    : 0;

  const handleAdd = async () => {
    if (!selectedUserId) return;
    setAdding(true);
    try {
      await addMember({ cohortId, userId: selectedUserId as Id<"users"> });
      toast.success("교육생이 추가되었습니다");
      setShowAddDialog(false);
      setSelectedUserId("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("추가에 실패했습니다");
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (memberId: Id<"cohortMembers">) => {
    try {
      await removeMember({ memberId });
      toast.success("교육생이 제거되었습니다");
    } catch {
      toast.error("제거에 실패했습니다");
    }
  };

  const handleStatusChange = async (memberId: Id<"cohortMembers">, status: MemberStatus) => {
    try {
      await updateStatus({ memberId, status });
      toast.success("상태가 변경되었습니다");
    } catch {
      toast.error("상태 변경에 실패했습니다");
    }
  };

  return (
    <div className="space-y-4">
      {/* Cohort Stats Summary */}
      {members && members.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">평균 제출 개수 (수강생)</p>
            <p className="text-lg font-bold">{averageLogs} 회</p>
            <p className="text-[10px] text-muted-foreground">활성 수강생 평균 승인 건수</p>
          </div>
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">과정 수료 조건 충족률</p>
            <p className="text-lg font-bold">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">승인 15회 이상 인원 비율</p>
          </div>
          <div className="rounded-xl border bg-card p-3 space-y-1">
            <p className="text-[11px] font-medium text-muted-foreground">수료생 현황</p>
            <p className="text-lg font-bold">{completedMembers.length} / {totalCount} 명</p>
            <p className="text-[10px] text-muted-foreground">전체 등록 인원 중 수료 완료자</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border/40 pt-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Users className="w-4 h-4" />
          교육생 목록
          {members && <Badge variant="secondary">{members.length}명</Badge>}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)} className="gap-1.5 cursor-pointer">
          <UserPlus className="w-3.5 h-3.5" />
          교육생 추가
        </Button>
      </div>

      {members === undefined ? (
        <div className="space-y-2">
          {[1, 2].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
          등록된 교육생이 없습니다
        </div>
      ) : (
        <div className="space-y-2">
          {(members as Member[]).map((m) => (
            <div key={m._id} className="flex items-center justify-between py-2.5 px-3 rounded-lg bg-muted/50">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-semibold text-primary">
                    {(m.user?.name ?? "?")[0]}
                  </span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-medium truncate">{m.user?.name ?? "알 수 없음"}</p>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      ({m.approvedCount ?? 0}회 승인)
                    </span>
                    {m.status === "active" && (m.approvedCount ?? 0) < 10 && (
                      <Badge variant="outline" className="text-[9px] h-4.5 px-1 bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40">
                        진도 지연
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{m.user?.email ?? ""}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {m.user?.certificationGoal && (
                  <Badge variant="outline" className="text-xs">{m.user.certificationGoal}</Badge>
                )}
                <Select
                  value={m.status}
                  onValueChange={(v: MemberStatus) => handleStatusChange(m._id, v)}
                >
                  <SelectTrigger className="h-7 w-24 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">수강중</SelectItem>
                    <SelectItem value="completed">수료</SelectItem>
                    <SelectItem value="withdrawn">중도탈락</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive cursor-pointer"
                  onClick={() => handleRemove(m._id)}
                >
                  <UserMinus className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add member dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>교육생 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>교육생 선택</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder="교육생을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {eligibleUsers.length === 0 ? (
                    <SelectItem value="none" disabled>추가할 교육생이 없습니다</SelectItem>
                  ) : (
                    eligibleUsers.map((u) => (
                      <SelectItem key={u._id} value={u._id}>
                        {u.name ?? "이름 없음"} {u.email ? `(${u.email})` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>취소</Button>
            <Button onClick={handleAdd} disabled={adding || !selectedUserId || selectedUserId === "none"}>
              {adding ? "추가 중..." : "추가"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
