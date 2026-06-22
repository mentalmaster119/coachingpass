import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
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
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
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
  const [reportOpen, setReportOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const logs = useQuery(api.coaching.getMyLogs);
  const summary = useQuery(api.coaching.getMySummary);
  const { user } = useCurrentUser();

  const filteredLogs =
    logs?.filter((log) => {
      if (activeTab === "all") return true;
      if (activeTab === "individual") return log.coachingType === "individual";
      if (activeTab === "group") return log.coachingType === "group";
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
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            disabled={!logs || logs.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            PDF 저장
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            기록 추가
          </Button>
        </div>
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
              label="총 승인 시간"
              value={formatHours(summary.approvedHours)}
              sub={`전체 ${summary.totalCount}건`}
            />
            <StatCard
              icon={<User className="w-4.5 h-4.5" />}
              label="개인 코칭"
              value={formatHours(summary.individualHours)}
            />
            <StatCard
              icon={<Users className="w-4.5 h-4.5" />}
              label="그룹 코칭"
              value={formatHours(summary.groupHours)}
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
              label="선수 고객 수 (최소 5명)"
              current={summary.athleteClientCount}
              goal={5}
              icon={<UserCheck className="w-4 h-4" />}
              unit="명"
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

      <CoachingLogForm open={addOpen} onOpenChange={setAddOpen} />

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
