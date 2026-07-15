import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  Plus,
  ClipboardList,
  Clock,
  CheckCircle,
  AlertCircle,
  Trophy,
  Users,
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
import CoachingLogForm from "../coaching-log/_components/coaching-log-form.tsx";
import CoachingLogCard from "../coaching-log/_components/coaching-log-card.tsx";

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

function SvProgressCard({
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

export default function SupervisionPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const logs = useQuery(api.coaching.getMyLogs);
  const summary = useQuery(api.coaching.getMySummary);

  const svLogs = logs?.filter((log) => log.coachingType === "sv") ?? [];

  const filteredLogs = svLogs.filter((log) => {
    if (activeTab === "all") return true;
    if (activeTab === "draft") return log.approvalStatus === "draft";
    if (activeTab === "pending") return log.approvalStatus === "pending";
    if (activeTab === "approved") return log.approvalStatus === "approved";
    if (activeTab === "rejected") return log.approvalStatus === "rejected";
    return true;
  });

  const approvedSvLogs = svLogs.filter((log) => log.approvalStatus === "approved");
  const approvedSvHours = approvedSvLogs.reduce((sum, log) => sum + log.durationMinutes, 0) / 60;
  const approvedSvCount = approvedSvLogs.length;
  const pendingSvCount = svLogs.filter((log) => log.approvalStatus === "pending").length;
  const rejectedSvCount = svLogs.filter((log) => log.approvalStatus === "rejected").length;
  const draftSvCount = svLogs.filter((log) => log.approvalStatus === "draft").length;

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
          <h1 className="text-2xl font-bold text-foreground">슈퍼비전 실습 기록</h1>
          <p className="text-muted-foreground text-sm mt-1">
            버디코칭 장면에 슈퍼바이저(멘토코치)가 참가한 슈퍼비전 실습을 작성하고 피드백을 기록해 보세요.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            실습 기록 작성
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
        {logs === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Clock className="w-4.5 h-4.5" />}
              label="총 승인 시간"
              value={formatHours(approvedSvHours)}
              sub={`전체 ${svLogs.length}건`}
            />
            <StatCard
              icon={<Trophy className="w-4.5 h-4.5" />}
              label="총 승인 횟수"
              value={`${approvedSvCount}회`}
            />
            <StatCard
              icon={
                pendingSvCount > 0 ? (
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                ) : (
                  <CheckCircle className="w-4.5 h-4.5" />
                )
              }
              label="검토 대기"
              value={`${pendingSvCount}건`}
            />
            <StatCard
              icon={<AlertCircle className="w-4.5 h-4.5 text-destructive" />}
              label="반려 건수"
              value={`${rejectedSvCount}건`}
            />
          </>
        )}
      </motion.div>

      {/* Supervision Goal Card */}
      {logs !== undefined && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <p className="text-sm font-semibold text-foreground mb-2">인정 기준 달성 현황</p>
          <div className="grid grid-cols-1 gap-3">
            <SvProgressCard
              label="슈퍼비전 실습 완료 여부 (최소 1회)"
              current={approvedSvCount}
              goal={1}
              icon={<Users className="w-4 h-4" />}
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
              {draftSvCount > 0 && (
                <span className="ml-0.5 bg-amber-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {draftSvCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="pending">검토중</TabsTrigger>
            <TabsTrigger value="approved">승인됨</TabsTrigger>
            <TabsTrigger value="rejected">반려됨</TabsTrigger>
          </TabsList>

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
                    {activeTab === "all" ? "아직 기록된 슈퍼비전 실습이 없습니다" : activeTab === "draft" ? "임시저장된 기록이 없습니다" : "해당하는 기록이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "all"
                      ? "첫 번째 슈퍼비전 실습 기록을 등록해 보세요."
                      : activeTab === "draft"
                      ? "작성 중인 기록을 임시저장하면 여기서 확인할 수 있습니다."
                      : "다른 탭에서 확인해 보세요."}
                  </EmptyDescription>
                </EmptyHeader>
                {activeTab === "all" && (
                  <EmptyContent>
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      실습 기록 작성
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
        </Tabs>
      </motion.div>

      <CoachingLogForm open={addOpen} onOpenChange={setAddOpen} defaultCoachingType="sv" />
    </div>
  );
}
