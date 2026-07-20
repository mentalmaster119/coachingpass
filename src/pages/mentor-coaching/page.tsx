import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { Plus, MessageSquare, CheckCircle, AlertCircle, Clock, Star } from "lucide-react";
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
import MentorCoachingForm from "./_components/mentor-coaching-form.tsx";
import MentorLogCard from "./_components/mentor-log-card.tsx";

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

export default function MentorCoachingPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const logs = useQuery(api.mentorCoaching.getMyLogs);
  const summary = useQuery(api.mentorCoaching.getMySummary);

  const draftCount = logs?.filter((log) => log.approvalStatus === "draft").length ?? 0;

  const filteredLogs =
    logs?.filter((log) => {
      if (activeTab === "all") return true;
      if (activeTab === "draft") return log.approvalStatus === "draft";
      if (activeTab === "mentor_coaching") return log.sessionType === "mentor_coaching" && log.approvalStatus !== "draft";
      if (activeTab === "coder_co") return log.sessionType === "coder_co" && log.approvalStatus !== "draft";
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
          <h1 className="text-2xl font-bold text-foreground">멘토코칭 실습 기록</h1>
          <p className="text-muted-foreground text-sm mt-1">
            멘토코칭 세션을 기록하고 승인을 받으세요.
          </p>
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
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {summary === undefined ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<CheckCircle className="w-4.5 h-4.5" />}
              label="총 승인 횟수"
              value={`${summary.approvedCount}회`}
              sub={`전체 ${summary.totalCount}건`}
            />
            <StatCard
              icon={<Star className="w-4.5 h-4.5" />}
              label="개인 멘토코칭"
              value={`${summary.mentorCoachingCount}회`}
            />
            <StatCard
              icon={<MessageSquare className="w-4.5 h-4.5" />}
              label="그룹 코더코"
              value={`${summary.coderCoCount}회`}
            />
            <StatCard
              icon={
                summary.pendingCount > 0 ? (
                  <AlertCircle className="w-4.5 h-4.5 text-amber-500" />
                ) : (
                  <Clock className="w-4.5 h-4.5" />
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
              {draftCount > 0 && (
                <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-medium text-white">
                  {draftCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="mentor_coaching">개인 멘토코칭</TabsTrigger>
            <TabsTrigger value="coder_co">그룹 코더코</TabsTrigger>
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
                    <MessageSquare />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "all" ? "멘토코칭 기록이 없습니다" : "해당하는 기록이 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "all"
                      ? "멘토코칭 세션을 기록해 보세요."
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
                  <MentorLogCard key={log._id} log={log} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <MentorCoachingForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
