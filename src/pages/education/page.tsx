import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { Plus, BookOpen, Clock, CheckCircle2, AlertCircle, XCircle, FileDown } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import EducationForm from "./_components/education-form.tsx";
import EducationRecordCard from "./_components/education-record-card.tsx";
import EducationReportDialog from "./_components/education-report-dialog.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

const KAC_TARGET = 60;
const KPC_TARGET = 125;

export default function EducationPage() {
  const [showForm, setShowForm] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const records = useQuery(api.education.getMyRecords);
  const summary = useQuery(api.education.getMySummary);
  const { user } = useCurrentUser();

  const isLoading = records === undefined || summary === undefined;
  const target = user?.certificationGoal === "KPC" ? KPC_TARGET : KAC_TARGET;
  const progress = Math.min(((summary?.approvedHours ?? 0) / target) * 100, 100);

  const allRecords = records ?? [];
  const pendingRecords = allRecords.filter((r) => r.approvalStatus === "pending");
  const approvedRecords = allRecords.filter((r) => r.approvalStatus === "approved");
  const rejectedRecords = allRecords.filter((r) => r.approvalStatus === "rejected");

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground">교육 이수 기록</h1>
          <p className="text-sm text-muted-foreground mt-1">
            코칭 교육 이수 내역을 기록하고 관리하세요
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setReportOpen(true)}
            disabled={!records || records.length === 0}
          >
            <FileDown className="w-4 h-4 mr-1.5" />
            PDF 저장
          </Button>
          <Button onClick={() => setShowForm(true)} className="flex-shrink-0">
            <Plus className="w-4 h-4 mr-1.5" />
            기록 추가
          </Button>
        </div>
      </motion.div>

      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-3 gap-3"
      >
        {isLoading ? (
          <>
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
            <Skeleton className="h-20 rounded-xl" />
          </>
        ) : (
          <>
            <div className="bg-card border border-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-chart-4">
                <Clock className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">승인 시간</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {summary?.approvedHours ?? 0}
                <span className="text-sm font-normal text-muted-foreground ml-1">
                  / {target}h
                </span>
              </p>
              {/* Progress bar */}
              <div className="w-full bg-secondary rounded-full h-1.5">
                <div
                  className="bg-chart-4 h-1.5 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">검토 대기</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summary?.pendingCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">건</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-3 space-y-1">
              <div className="flex items-center gap-1.5 text-destructive">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">반려</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{summary?.rejectedCount ?? 0}</p>
              <p className="text-xs text-muted-foreground">건</p>
            </div>
          </>
        )}
      </motion.div>

      {/* Records list with tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">
              전체 ({allRecords.length})
            </TabsTrigger>
            <TabsTrigger value="pending">
              대기 ({pendingRecords.length})
            </TabsTrigger>
            <TabsTrigger value="approved">
              승인 ({approvedRecords.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              반려 ({rejectedRecords.length})
            </TabsTrigger>
          </TabsList>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              {(["all", "pending", "approved", "rejected"] as const).map((tab) => {
                const tabRecords =
                  tab === "all"
                    ? allRecords
                    : tab === "pending"
                    ? pendingRecords
                    : tab === "approved"
                    ? approvedRecords
                    : rejectedRecords;

                return (
                  <TabsContent key={tab} value={tab} className="space-y-3 mt-0">
                    {tabRecords.length === 0 ? (
                      <Empty>
                        <EmptyHeader>
                          <EmptyMedia variant="icon"><BookOpen /></EmptyMedia>
                          <EmptyTitle>기록이 없습니다</EmptyTitle>
                          <EmptyDescription>
                            {tab === "all"
                              ? "첫 번째 교육 기록을 추가해 보세요."
                              : `${tab === "pending" ? "대기 중인" : tab === "approved" ? "승인된" : "반려된"} 기록이 없습니다.`}
                          </EmptyDescription>
                        </EmptyHeader>
                        {tab === "all" && (
                          <EmptyContent>
                            <Button size="sm" onClick={() => setShowForm(true)}>
                              <Plus className="w-3.5 h-3.5 mr-1" />
                              기록 추가
                            </Button>
                          </EmptyContent>
                        )}
                      </Empty>
                    ) : (
                      tabRecords.map((record) => (
                        <EducationRecordCard key={record._id} record={record} />
                      ))
                    )}
                  </TabsContent>
                );
              })}
            </>
          )}
        </Tabs>
      </motion.div>

      <EducationForm
        open={showForm}
        onOpenChange={setShowForm}
      />

      {records && summary && (
        <EducationReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          records={records}
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
