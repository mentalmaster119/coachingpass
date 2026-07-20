import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { Plus, Users, CheckCircle, AlertCircle, Clock, Award } from "lucide-react";
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
import BcpForm from "./_components/bcp-form.tsx";
import BcpLogCard from "./_components/bcp-log-card.tsx";

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

export default function BcpPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const logs = useQuery(api.bcp.getMyLogs);
  const summary = useQuery(api.bcp.getMySummary);

  const draftBcpCount = logs?.filter((log) => log.approvalStatus === "draft").length ?? 0;

  const filteredLogs =
    logs?.filter((log) => {
      if (activeTab === "all") return true;
      if (activeTab === "draft") return log.approvalStatus === "draft";
      if (activeTab === "coach") return log.myRole === "coach" && log.approvalStatus !== "draft";
      if (activeTab === "coachee") return log.myRole === "coachee" && log.approvalStatus !== "draft";
      if (activeTab === "pending") return log.approvalStatus === "pending";
      if (activeTab === "approved") return log.approvalStatus === "approved";
      return true;
    }) ?? [];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">BCP 버디코칭 실습</h1>
          <p className="text-muted-foreground text-sm mt-1">
            같은 기수 동기생과의 버디코칭 실습을 기록하세요.
          </p>
          <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 space-y-0.5 max-w-md">
            <p>• 한 명은 코치, 다른 한 명은 고객 역할 수행 (최소 1시간 이내)</p>
            <p>• 최대 2명의 동기생 선택 가능</p>
            <p>• 동일 버디 2명 조합의 실습은 총 <strong>1건</strong>만 인정</p>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
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
        className="grid grid-cols-2 md:grid-cols-4 gap-3"
      >
        {summary === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Award className="w-4 h-4" />}
              label="인정 건수"
              value={`${summary.recognizedCount}건`}
              sub={`전체 ${summary.approvedCount}건 승인`}
            />
            <StatCard
              icon={<Users className="w-4 h-4" />}
              label="코치 역할"
              value={`${summary.coachSessions}회`}
            />
            <StatCard
              icon={<CheckCircle className="w-4 h-4" />}
              label="고객 역할"
              value={`${summary.coacheeSessions}회`}
            />
            <StatCard
              icon={
                summary.pendingCount > 0 ? (
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                ) : (
                  <Clock className="w-4 h-4" />
                )
              }
              label="검토 대기"
              value={`${summary.pendingCount}건`}
              sub={summary.rejectedCount > 0 ? `반려 ${summary.rejectedCount}건` : undefined}
            />
          </>
        )}
      </motion.div>

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
              {draftBcpCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
                  {draftBcpCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="coach">코치 역할</TabsTrigger>
            <TabsTrigger value="coachee">고객 역할</TabsTrigger>
            <TabsTrigger value="pending">검토중</TabsTrigger>
            <TabsTrigger value="approved">승인됨</TabsTrigger>
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
                    <Users />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "all" ? "BCP 기록이 없습니다" : "해당하는 기록이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "all"
                      ? "버디코칭 실습을 기록해 보세요."
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
                  <BcpLogCard key={log._id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <BcpForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
