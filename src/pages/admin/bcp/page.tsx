import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion } from "motion/react";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import BcpLogCard from "../../../pages/bcp/_components/bcp-log-card.tsx";

type BcpLog = Doc<"bcpLogs"> & {
  userName: string;
  userEmail: string;
  buddy1Name: string;
  buddy2Name: string | null;
  evidenceUrl?: string | null;
};

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <Card className="shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
            {icon}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminBcpPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const logs = useQuery(api.bcp.getAllLogs, {}) as BcpLog[] | undefined;

  const approveLog = useMutation(api.bcp.approve);
  const rejectLog = useMutation(api.bcp.reject);

  const filteredLogs =
    logs?.filter((l) => {
      if (activeTab === "all") return true;
      return l.approvalStatus === activeTab;
    }) ?? [];

  const pendingCount = logs?.filter((l) => l.approvalStatus === "pending").length ?? 0;
  const approvedCount = logs?.filter((l) => l.approvalStatus === "approved").length ?? 0;

  const handleApprove = async (logId: BcpLog["_id"]) => {
    try {
      await approveLog({ logId });
      toast.success("승인되었습니다.");
    } catch {
      toast.error("승인에 실패했습니다.");
    }
  };

  const handleReject = async (logId: BcpLog["_id"], reason: string) => {
    try {
      await rejectLog({ logId, reason });
      toast.success("반려되었습니다.");
    } catch {
      toast.error("반려에 실패했습니다.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold">BCP 버디코칭 기록 검토</h1>
        <p className="text-muted-foreground text-sm mt-1">
          교육생들의 버디코칭 실습 기록을 검토하고 승인하세요.
        </p>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-3"
      >
        {logs === undefined ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={<AlertCircle className="w-4 h-4 text-amber-500" />} label="검토 대기" value={`${pendingCount}건`} />
            <StatCard icon={<CheckCircle className="w-4 h-4" />} label="승인 완료" value={`${approvedCount}건`} />
            <StatCard icon={<Users className="w-4 h-4" />} label="전체 기록" value={`${logs.length}건`} />
          </>
        )}
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              검토 대기
              {pendingCount > 0 && (
                <span className="ml-1.5 bg-amber-500 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">승인됨</TabsTrigger>
            <TabsTrigger value="rejected">반려됨</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
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
                  <EmptyMedia variant="icon"><Clock /></EmptyMedia>
                  <EmptyTitle>해당하는 기록이 없습니다</EmptyTitle>
                  <EmptyDescription>다른 탭을 확인해 보세요.</EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <BcpLogCard
                    key={log._id}
                    log={log}
                    isAdmin
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
