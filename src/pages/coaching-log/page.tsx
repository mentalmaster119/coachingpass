import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { toast } from "sonner";
import {
  Plus,
  ClipboardList,
  User,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  FileDown,
  Trophy,
  UserCheck,
  Sparkles,
  ChevronRight,
  FolderOpen,
  Trash2,
  Pencil,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CoachingLogForm from "./_components/coaching-log-form.tsx";
import CoachingLogCard from "./_components/coaching-log-card.tsx";
import CoachingReportDialog from "./_components/coaching-report-dialog.tsx";
import CoachingStats from "./_components/coaching-stats.tsx";

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4">
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] md:text-xs text-muted-foreground leading-snug">{label}</p>
            <p className="text-lg md:text-xl font-bold text-foreground leading-tight">{value}</p>
            {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NcpProgressCard({
  label,
  current,
  goal,
  icon,
  unit,
}: {
  label: string;
  current: number;
  goal: number;
  icon: React.ReactNode;
  unit: string;
}) {
  const pct = Math.min(100, Math.round((current / goal) * 100));
  const done = current >= goal;
  return (
    <Card className={`shadow-sm ${done ? "border-emerald-300 bg-emerald-50/30" : ""}`}>
      <CardContent className="pt-3 pb-3 md:pt-4 md:pb-4">
        <div className="flex items-start gap-2">
          <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${done ? "bg-emerald-100 text-emerald-600" : "bg-primary/10 text-primary"}`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] md:text-xs text-muted-foreground leading-snug">{label}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-lg md:text-xl font-bold text-foreground leading-tight">{current}</span>
              <span className="text-xs text-muted-foreground">/ {goal}{unit}</span>
            </div>
            <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${done ? "bg-emerald-500" : "bg-primary"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {done && <p className="text-[10px] text-emerald-600 font-medium mt-0.5">달성 완료</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoachingLogPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [editingDraft, setEditingDraft] = useState<
    (Doc<"coachingLogs"> & { evidenceUrl?: string | null }) | undefined
  >(undefined);
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const logs = useQuery(api.coaching.getMyLogs);
  const summary = useQuery(api.coaching.getMySummary);
  const removeLog = useMutation(api.coaching.remove);
  const { user } = useCurrentUser();
  const activeRole = user?.role;
  const isAdmin =
    activeRole === "admin" || activeRole === "senior_coach" || activeRole === "admin3";

  const draftLogs = logs?.filter((l) => l.approvalStatus === "draft") ?? [];

  const handleDeleteDraft = async (draftId: Doc<"coachingLogs">["_id"]) => {
    try {
      await removeLog({ logId: draftId });
      toast.success("임시저장 파일이 삭제되었습니다.");
    } catch {
      toast.error("임시저장 삭제 중 오류가 발생했습니다.");
    }
  };

  const filteredLogs =
    logs?.filter((log) => {
      if (activeTab === "all") return true;
      if (activeTab === "individual") return log.coachingType === "individual";
      if (activeTab === "group") return log.coachingType === "group";
      if (activeTab === "team") return log.coachingType === "team";
      if (activeTab === "buddy") return log.coachingType === "buddy";
      if (activeTab === "mentor") return log.coachingType === "mentor";
      if (activeTab === "sv") return log.coachingType === "sv";
      if (activeTab === "draft") return log.approvalStatus === "draft";
      if (activeTab === "pending") return log.approvalStatus === "pending";
      if (activeTab === "approved") return log.approvalStatus === "approved";
      return true;
    }) ?? [];

  const formatHours = (h: number) => {
    const rounded = Math.round(h * 10) / 10;
    return `${rounded}시간`;
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Admin Notice Banner if accessed by Admin */}
      {isAdmin && (
        <div className="bg-purple-50/90 dark:bg-purple-950/40 border-2 border-purple-200 dark:border-purple-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">
                현재 관리자(수퍼바이저) 모드로 접속 중입니다.
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                이 페이지는 코치 본인의 실습 등록 공간입니다. 코치들의 코칭 기록을 검토하고 분석하시려면 관리자 전용 메뉴로 이동하세요.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            <Link to="/admin/coaching-analysis">
              <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>코치 코칭 실습 분석</span>
              </Button>
            </Link>
            <Link to="/admin/coaching">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                <ClipboardList className="w-3.5 h-3.5" />
                <span>코칭 기록 검토</span>
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">코칭 실습 기록</h1>
          <p className="text-muted-foreground text-sm mt-1">
            코칭 세션을 기록하고 승인을 받아 실습 시간을 인정받으세요.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center flex-wrap">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            disabled={!logs || logs.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            PDF 저장
          </Button>
          {draftLogs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("draft")}
              className="border-amber-400 bg-amber-50/80 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
            >
              <FolderOpen className="w-4 h-4 mr-1.5" />
              임시저장 불러오기 ({draftLogs.length})
            </Button>
          )}
          <Button
            onClick={() => {
              setEditingDraft(undefined);
              setAddOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            기록 추가
          </Button>
        </div>
      </motion.div>

      {/* Draft Logs Quick Access Banner */}
      {draftLogs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-xl border border-amber-300 dark:border-amber-800/70 bg-amber-50/80 dark:bg-amber-950/25 p-4 space-y-3 shadow-xs"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                  작성 중인 임시저장 일지가 {draftLogs.length}건 있습니다
                </p>
                <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                  아래에서 바로 불러와 이어서 작성하거나 불필요한 임시저장 파일을 삭제할 수 있습니다.
                </p>
              </div>
            </div>
            {activeTab !== "draft" && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setActiveTab("draft")}
                className="h-7 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
              >
                임시저장 탭 보기 →
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {draftLogs.map((draft) => (
              <div
                key={draft._id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-background/95 border border-amber-200 dark:border-amber-900/50 rounded-lg px-3 py-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-foreground truncate">
                    {draft.topic || "(코칭 주제 미입력 — 임시저장 일지)"}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {draft.coacheeInfo ? `코치이: ${draft.coacheeInfo}` : "코치이 미입력"}
                    </span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    코칭 날짜: {draft.coachingDate || "미지정"}
                    {draft.coachingStartTime && draft.coachingEndTime
                      ? ` · 시간: ${draft.coachingStartTime}~${draft.coachingEndTime}`
                      : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2.5 text-xs border-amber-400 text-amber-800 dark:text-amber-300 hover:bg-amber-100 cursor-pointer"
                    onClick={() => {
                      setEditingDraft(draft);
                      setAddOpen(true);
                    }}
                  >
                    <Pencil className="w-3 h-3 mr-1" />
                    불러오기 (이어 작성)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    onClick={() => handleDeleteDraft(draft._id)}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    삭제
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Coaching Quality Banner */}
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Link to="/coaching-quality">
          <div className="rounded-xl border border-purple-200 dark:border-purple-800/60 bg-gradient-to-r from-purple-50/80 via-card to-indigo-50/80 dark:from-purple-950/30 dark:via-card dark:to-indigo-950/30 p-3.5 flex items-center justify-between gap-3 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-purple-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-foreground group-hover:text-purple-700 transition-colors flex items-center gap-1.5">
                  <span>내 코칭실습 품질 분석 & AI 피드백</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-purple-300 text-purple-700 bg-white/80 dark:bg-slate-900">
                    5대 지표 자동 점수화
                  </Badge>
                </p>
                <p className="text-[11px] text-muted-foreground">
                  완결성·구체성·과정추적·자기성찰·학습전이 5대 기준 실습 품질 진단 및 5·10·15·20회 구간 리포트 확인하기
                </p>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-8 text-xs text-purple-700 group-hover:translate-x-1 transition-transform">
              <span>리포트 보기</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </Link>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {summary === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Clock className="w-4.5 h-4.5" />}
              label="총 승인 건수"
              value={`${summary.approvedSessionCount}건`}
              sub={`제출 ${summary.totalCount}건 · 누적 ${formatHours(summary.approvedHours)}`}
            />
            <StatCard
              icon={<User className="w-4.5 h-4.5" />}
              label="개인 코칭"
              value={`${summary.individualCount ?? 0}건`}
              sub={formatHours(summary.individualHours)}
            />
            <StatCard
              icon={<Users className="w-4.5 h-4.5" />}
              label="그룹 코칭"
              value={`${summary.groupCount ?? 0}건`}
              sub={formatHours(summary.groupHours)}
            />
            <StatCard
              icon={
                summary.pendingCount > 0 ? (
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4.5 h-4.5" />
                )
              }
              label="검토 대기"
              value={`${summary.pendingCount}건`}
              sub={summary.rejectedCount > 0 ? `반려 ${summary.rejectedCount}건` : undefined}
            />
          </>
        )}
      </motion.div>

      {/* NCP 달성 현황 */}
      {summary !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="text-sm font-semibold text-foreground mb-2">NCP 인정 기준 달성 현황</p>
          <div className="grid grid-cols-2 gap-3">
            <NcpProgressCard
              label="선수 코칭 횟수 (목표 8회)"
              current={summary.athleteClientCount}
              goal={8}
              icon={<UserCheck className="w-4 h-4" />}
              unit="회"
            />
            <NcpProgressCard
              label="총 코칭 횟수 (목표 15회)"
              current={summary.approvedSessionCount}
              goal={15}
              icon={<Trophy className="w-4 h-4" />}
              unit="회"
            />
          </div>
        </motion.div>
      )}

      {/* Tabs + List */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4 flex-wrap h-auto gap-1">
            <TabsTrigger value="all">전체</TabsTrigger>
            <TabsTrigger value="draft" className="gap-1.5">
              임시저장
              {logs && logs.filter((l) => l.approvalStatus === "draft").length > 0 && (
                <span className="ml-0.5 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {logs.filter((l) => l.approvalStatus === "draft").length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="individual">개인 코칭</TabsTrigger>
            <TabsTrigger value="group">그룹 코칭</TabsTrigger>
            <TabsTrigger value="team">팀 코칭</TabsTrigger>
            <TabsTrigger value="buddy">버디 코칭</TabsTrigger>
            <TabsTrigger value="mentor">멘토 코칭</TabsTrigger>
            <TabsTrigger value="sv">SV 코칭</TabsTrigger>
            <TabsTrigger value="pending">검토중</TabsTrigger>
            <TabsTrigger value="approved">승인됨</TabsTrigger>
            <TabsTrigger value="stats">통계 & 인사이트</TabsTrigger>
          </TabsList>

          {activeTab === "stats" ? (
            <TabsContent value="stats" className="mt-0">
              <CoachingStats />
            </TabsContent>
          ) : (
          <TabsContent value={activeTab} className="mt-0">
            {logs === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ClipboardList />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "all" ? "아직 기록된 코칭이 없습니다" : activeTab === "draft" ? "임시저장된 기록이 없습니다" : "해당하는 기록이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "all"
                      ? "첫 번째 코칭 실습 기록을 추가해 보세요."
                      : activeTab === "draft"
                      ? "작성 중인 기록을 임시저장하면 여기서 확인할 수 있습니다."
                      : "다른 탭에서 확인해 보세요."}
                  </EmptyDescription>
                </EmptyHeader>
                {activeTab === "all" && (
                  <EmptyContent>
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      기록 추가
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <CoachingLogCard key={log._id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
          )}
        </Tabs>
      </motion.div>

      <CoachingLogForm
        open={addOpen}
        onOpenChange={(open) => {
          setAddOpen(open);
          if (!open) setEditingDraft(undefined);
        }}
        editLog={editingDraft}
      />

      {logs && summary && (
        <CoachingReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          logs={logs}
          user={{
            name: user?.name,
            email: user?.email,
            certificationGoal: user?.certificationGoal,
          }}
          summary={summary}
        />
      )}
    </div>
  );
}
