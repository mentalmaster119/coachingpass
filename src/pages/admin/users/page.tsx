import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  Check,
  X,
  Search,
  Users,
  Clock,
  CheckCircle2,
  UserCog,
  GraduationCap,
  ArrowUpDown,
  Phone,
  UserCheck,
  AlertCircle,
  Trash2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc, Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import IncompleteProfilesTab from "./_components/incomplete-profiles-tab.tsx";

type User = Doc<"users"> & { cohortId?: Id<"cohorts"> | null; cohortName?: string | null; cohortNumber?: number | null };

const ROLE_LABELS: Record<string, string> = {
  trainee: "수강생",
  senior_coach: "상위코치",
  admin: "관리자",
};

function UserStatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15">승인</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10">거절</Badge>;
  }
  return <Badge variant="secondary">대기</Badge>;
}

function RejectDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [reason, setReason] = useState("");
  const [isPending, setIsPending] = useState(false);
  const rejectUser = useMutation(api.admin.rejectUser);

  const handleReject = async () => {
    if (!user || !reason.trim()) return;
    setIsPending(true);
    try {
      await rejectUser({ userId: user._id, reason: reason.trim() });
      toast.success(`${user.name ?? "사용자"} 가입을 거절했습니다.`);
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
          <DialogTitle>가입 거절</DialogTitle>
          <DialogDescription>
            {user?.name ?? "사용자"}님의 가입을 거절합니다. 거절 사유를 입력해 주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">거절 사유</label>
          <Input
            placeholder="예: 소속 기관 미확인, 정보 불일치 등"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>취소</Button>
          <Button variant="destructive" disabled={!reason.trim() || isPending} onClick={handleReject}>
            {isPending ? "처리 중..." : "거절하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PendingUserCard({
  user,
  onReject,
  onViewDetail,
}: {
  user: User;
  onReject: (user: User) => void;
  onViewDetail: (userId: Id<"users">) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const approveUser = useMutation(api.admin.approveUser);

  const handleApprove = async () => {
    setIsPending(true);
    try {
      await approveUser({ userId: user._id });
      toast.success(`${user.name ?? "사용자"} 승인 완료!`);
    } catch {
      toast.error("오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card
      className="shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
      onClick={() => onViewDetail(user._id)}
    >
      <CardContent className="pt-4 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-medium text-foreground truncate">{user.name ?? "이름 미설정"}</p>
              <Badge variant="secondary" className="text-xs flex-shrink-0">{ROLE_LABELS[user.role]}</Badge>
              {user.cohortName && (
                <Badge variant="outline" className="text-xs flex-shrink-0">{user.cohortName}</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onReject(user)}
            >
              <X className="w-4 h-4 mr-1" />
              거절
            </Button>
            <Button size="sm" disabled={isPending} onClick={handleApprove}>
              <Check className="w-4 h-4 mr-1" />
              {isPending ? "처리 중..." : "승인"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeleteUserDialog({
  user,
  open,
  onOpenChange,
}: {
  user: User | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [isPending, setIsPending] = useState(false);
  const deleteUser = useMutation(api.admin.deleteUser);

  const handleDelete = async () => {
    if (!user) return;
    setIsPending(true);
    try {
      await deleteUser({ userId: user._id });
      toast.success(`${user.name ?? "사용자"} 계정이 삭제되었습니다.`);
      onOpenChange(false);
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정 삭제</DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-destructive">{user?.name ?? "사용자"}</span>님의 계정을 삭제합니다.
            <br />
            코칭 기록, 교육 이수 기록, 기수 소속 정보 등 모든 관련 데이터가 함께 삭제되며 <span className="font-semibold">복구할 수 없습니다.</span>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isPending}>취소</Button>
          <Button variant="destructive" disabled={isPending} onClick={handleDelete}>
            {isPending ? "삭제 중..." : "영구 삭제"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


type SortKey = "name" | "cohort";

function AllUsersTable({
  users,
  onViewDetail,
}: {
  users: (User & { cohortNumber: number | null })[];
  onViewDetail: (userId: Id<"users">) => void;
}) {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const updateRole = useMutation(api.admin.updateUserRole);
  const approveUser = useMutation(api.admin.approveUser);
  const changeCohort = useMutation(api.cohorts.changeMemberCohort);
  const cohorts = useQuery(api.cohorts.list, {});
  const { user: currentUser } = useCurrentUser();

  const handleCohortChange = async (userId: Id<"users">, cohortId: string) => {
    try {
      await changeCohort({ userId, cohortId: cohortId as any });
      toast.success("기수가 변경되었습니다.");
    } catch {
      toast.error("기수 변경 중 오류가 발생했습니다.");
    }
  };

  const filtered = users
    .filter(
      (u) =>
        (u.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (u.email ?? "").toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "cohort") {
        const cohortDiff = (a.cohortNumber ?? Infinity) - (b.cohortNumber ?? Infinity);
        if (cohortDiff !== 0) return cohortDiff;
      }
      return (a.name ?? "").localeCompare(b.name ?? "", "ko");
    });

  const handleRoleChange = async (userId: Id<"users">, role: string) => {
    try {
      await updateRole({ userId, role: role as "trainee" | "senior_coach" | "admin" });
      toast.success("역할이 변경되었습니다.");
    } catch {
      toast.error("역할 변경 중 오류가 발생했습니다.");
    }
  };

  const handleApprove = async (user: User) => {
    try {
      await approveUser({ userId: user._id });
      toast.success(`${user.name ?? "사용자"} 승인 완료!`);
    } catch {
      toast.error("오류가 발생했습니다.");
    }
  };

  return (
    <>
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="이름 또는 이메일로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
          <SelectTrigger className="w-[130px] gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name">이름순</SelectItem>
            <SelectItem value="cohort">기수순</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>사용자가 없습니다</EmptyTitle>
            <EmptyDescription>검색 조건에 맞는 사용자가 없습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => (
            <Card
              key={u._id}
              className="shadow-sm cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onViewDetail(u._id)}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm text-foreground truncate">{u.name ?? "이름 미설정"}</p>
                      {u.cohortName && (
                        <Badge variant="outline" className="text-xs flex-shrink-0">{u.cohortName}</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>

                  <div
                    className="flex items-center gap-2 flex-shrink-0 flex-wrap"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <UserStatusBadge status={u.approvalStatus} />

                    {currentUser?._id !== u._id && (
                      <div className="flex items-center gap-1.5">
                        <Select value={u.role} onValueChange={(v) => handleRoleChange(u._id, v)}>
                          <SelectTrigger className="h-7 text-xs w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="trainee">수강생</SelectItem>
                            <SelectItem value="senior_coach">상위코치</SelectItem>
                            <SelectItem value="admin">관리자</SelectItem>
                          </SelectContent>
                        </Select>

                        {u.role === "trainee" && cohorts && (
                          <Select
                            value={u.cohortId || "none"}
                            onValueChange={(v) => handleCohortChange(u._id, v)}
                          >
                            <SelectTrigger className="h-7 text-xs w-24 border-amber-300 bg-amber-500/5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10">
                              <SelectValue placeholder="기수 없음" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">기수 없음</SelectItem>
                              {cohorts.map((c) => (
                                <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    )}

                    {u.approvalStatus !== "approved" && currentUser?._id !== u._id && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setRejectTarget(u)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                        <Button size="sm" className="h-7 px-2" onClick={() => handleApprove(u)}>
                          <Check className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )}

                    {/* 삭제 버튼 - 자기 자신 제외 */}
                    {currentUser?._id !== u._id && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                        title="계정 삭제"
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(u); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                {u.rejectionReason && (
                  <p className="text-xs text-destructive mt-2 bg-destructive/5 rounded px-2 py-1">
                    거절 사유: {u.rejectionReason}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <RejectDialog
        user={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
      />
      <DeleteUserDialog
        user={deleteTarget}
        open={deleteTarget !== null}
        onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}
      />
    </>
  );
}

export default function AdminUsersPage() {
  const allUsers = useQuery(api.admin.getAllUsers);
  const pendingUsers = useQuery(api.admin.getPendingUsers);
  const [rejectTarget, setRejectTarget] = useState<User | null>(null);
  const navigate = useNavigate();

  const isLoading = allUsers === undefined || pendingUsers === undefined;

  const handleViewDetail = (userId: Id<"users">) => {
    navigate(`/admin/trainee/${userId}`);
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <UserCog className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">사용자 관리</h1>
            <p className="text-sm text-muted-foreground">가입 신청 승인/거절 및 역할 관리</p>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              승인 대기
              {!isLoading && pendingUsers.length > 0 && (
                <span className="ml-1 bg-chart-2 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {pendingUsers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5">
              <Users className="w-3.5 h-3.5" />
              전체 사용자
              {!isLoading && (
                <span className="ml-1 text-muted-foreground text-xs">({allUsers.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="cohort" className="gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              기수별 관리
            </TabsTrigger>
            <TabsTrigger value="incomplete" className="gap-1.5">
              <AlertCircle className="w-3.5 h-3.5" />
              프로필 미완성
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}
              </div>
            ) : pendingUsers.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon"><CheckCircle2 /></EmptyMedia>
                  <EmptyTitle>대기 중인 신청이 없습니다</EmptyTitle>
                  <EmptyDescription>모든 가입 신청이 처리되었습니다.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                {pendingUsers.map((u) => (
                  <PendingUserCard
                    key={u._id}
                    user={u}
                    onReject={(user) => setRejectTarget(user)}
                    onViewDetail={handleViewDetail}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
              </div>
            ) : (
              <AllUsersTable users={allUsers} onViewDetail={handleViewDetail} />
            )}
          </TabsContent>

          <TabsContent value="cohort">
            <CohortUsersTab onViewDetail={handleViewDetail} />
          </TabsContent>

          <TabsContent value="incomplete">
            <IncompleteProfilesTab onViewDetail={handleViewDetail} />
          </TabsContent>
        </Tabs>
      </motion.div>

      <RejectDialog
        user={rejectTarget}
        open={rejectTarget !== null}
        onOpenChange={(v) => { if (!v) setRejectTarget(null); }}
      />
    </div>
  );
}

// ── 기수별 관리 탭 ──────────────────────────────────────────────────────────

type MemberStat = {
  _id: string;
  memberId: string;
  memberStatus: string;
  joinedAt: string;
  name: string;
  email: string;
  phone: string | null;
  approvalStatus: string;
  userId: string;
  coachingHours: number;
  approvedCoachingLogs: number;
  totalCoachingLogs: number;
  supervisorName: string | null;
};

const MEMBER_STATUS_LABEL: Record<string, string> = {
  active: "수강중",
  completed: "수료",
  withdrawn: "중도탈락",
};
const MEMBER_STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  withdrawn: "bg-destructive/10 text-destructive",
};

function CohortUsersTab({ onViewDetail }: { onViewDetail: (userId: Id<"users">) => void }) {
  const cohorts = useQuery(api.cohorts.list, {});

  // 진행중 기수가 있으면 그것을, 없으면 첫 번째 기수를 기본값으로
  const defaultCohortId = cohorts
    ? ((cohorts.find((c) => c.status === "active") ?? cohorts[0])?._id ?? "")
    : "";

  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | "">("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "coachingHours">("name");

  // 기수 데이터 로드 후 아직 선택 전이면 자동 선택
  const resolvedId = selectedCohortId !== "" ? selectedCohortId : (defaultCohortId as Id<"cohorts"> | "");

  const members = useQuery(
    api.admin.getCohortMembersWithStats,
    resolvedId ? { cohortId: resolvedId } : "skip",
  );

  const updateStatus = useMutation(api.cohorts.updateMemberStatus);

  const selectedCohort = cohorts?.find((c) => c._id === resolvedId);

  const filtered = (members ?? [])
    .filter((m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === "coachingHours") return b.coachingHours - a.coachingHours;
      return a.name.localeCompare(b.name, "ko");
    });

  const stats = members
    ? {
        total: members.length,
        active: members.filter((m) => m.memberStatus === "active").length,
        completed: members.filter((m) => m.memberStatus === "completed").length,
        withdrawn: members.filter((m) => m.memberStatus === "withdrawn").length,
        avgHours: members.length
          ? Math.round((members.reduce((s, m) => s + m.coachingHours, 0) / members.length) * 10) / 10
          : 0,
      }
    : null;

  const handleStatusChange = async (memberId: string, status: "active" | "completed" | "withdrawn") => {
    try {
      await updateStatus({ memberId: memberId as Id<"cohortMembers">, status });
      toast.success("상태가 변경되었습니다.");
    } catch {
      toast.error("변경에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-5">
      {/* 기수 선택 */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">기수 선택</label>
        <Select
          value={resolvedId}
          onValueChange={(v) => { setSelectedCohortId(v as Id<"cohorts">); setSearch(""); }}
        >
          <SelectTrigger className="w-full sm:w-72">
            <SelectValue placeholder="기수를 선택하세요" />
          </SelectTrigger>
          <SelectContent>
            {cohorts === undefined ? (
              <SelectItem value="loading" disabled>로딩 중...</SelectItem>
            ) : cohorts.length === 0 ? (
              <SelectItem value="none" disabled>등록된 기수가 없습니다</SelectItem>
            ) : (
              cohorts.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                  {c.status === "active" ? " ✓ 진행중" : c.status === "completed" ? " (완료)" : " (예정)"}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {resolvedId && cohorts && (
          <p className="text-xs text-muted-foreground">
            {cohorts.find((c) => c._id === resolvedId)?.status === "active"
              ? "현재 진행중인 기수가 자동 선택되었습니다."
              : ""}
          </p>
        )}
      </div>

      {!resolvedId && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><GraduationCap /></EmptyMedia>
            <EmptyTitle>기수를 선택해 주세요</EmptyTitle>
            <EmptyDescription>기수를 선택하면 소속 교육생 목록과 통계를 확인할 수 있습니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {resolvedId && members === undefined && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
          {[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      )}

      {resolvedId && members !== undefined && (
        <>
          {/* 통계 카드 */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {[
                { label: "전체 교육생", value: `${stats.total}명`, highlight: false },
                { label: "수강중", value: `${stats.active}명`, color: "text-green-600 dark:text-green-400" },
                { label: "수료", value: `${stats.completed}명`, color: "text-blue-600 dark:text-blue-400" },
                { label: "중도탈락", value: `${stats.withdrawn}명`, color: "text-destructive" },
                { label: "평균 코칭시간", value: `${stats.avgHours}h`, highlight: true },
              ].map((s) => (
                <div key={s.label} className={cn(
                  "rounded-xl border px-3 py-3 text-center",
                  s.highlight ? "bg-primary/5 border-primary/20" : "bg-muted/40 border-transparent"
                )}>
                  <p className={cn("text-lg font-bold", s.color ?? (s.highlight ? "text-primary" : "text-foreground"))}>
                    {s.value}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* 검색 & 정렬 */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="이름 또는 이메일 검색"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setSortBy(sortBy === "name" ? "coachingHours" : "name")}
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortBy === "name" ? "이름순" : "코칭시간순"}
            </Button>
          </div>

          {/* 교육생 목록 */}
          {filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              {search ? "검색 결과가 없습니다." : `${selectedCohort?.name ?? "이 기수"}에 등록된 교육생이 없습니다.`}
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((m: MemberStat) => (
                <Card
                  key={m._id}
                  className="cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => onViewDetail(m.userId as Id<"users">)}
                >
                  <CardContent className="pt-3 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      {/* 이름/이메일 */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">{m.name[0]}</span>
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-sm">{m.name}</p>
                            <Badge
                              className={cn("text-xs", MEMBER_STATUS_COLOR[m.memberStatus])}
                            >
                              {MEMBER_STATUS_LABEL[m.memberStatus] ?? m.memberStatus}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{m.email}</p>
                          {m.phone && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3" />{m.phone}
                            </p>
                          )}
                          {m.supervisorName && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <UserCheck className="w-3 h-3" />슈퍼바이저: {m.supervisorName}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* 코칭 시간 */}
                      <div className="flex items-center gap-4 flex-shrink-0 sm:text-right">
                        <div className="text-center">
                          <p className="text-base font-bold text-primary">{m.coachingHours}h</p>
                          <p className="text-xs text-muted-foreground">승인 코칭</p>
                        </div>
                        <div className="text-center">
                          <p className="text-base font-bold text-foreground">{m.totalCoachingLogs}</p>
                          <p className="text-xs text-muted-foreground">전체 건수</p>
                        </div>

                        {/* 상태 변경 */}
                        <div onClick={(e) => e.stopPropagation()}>
                          <Select
                            value={m.memberStatus}
                            onValueChange={(v) => handleStatusChange(m.memberId, v as "active" | "completed" | "withdrawn")}
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
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
