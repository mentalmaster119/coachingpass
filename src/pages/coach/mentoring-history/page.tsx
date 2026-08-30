import { useState } from "react";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  Clock,
  Users,
  Search,
  CalendarDays,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BookOpen,
  MessageSquare,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { cn } from "@/lib/utils.ts";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    pending: { label: "검토 대기", className: "bg-amber-100 text-amber-700 border-amber-200" },
    approved: { label: "승인 완료", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    rejected: { label: "반려됨", className: "bg-red-100 text-red-700 border-red-200" },
    draft: { label: "임시저장", className: "bg-muted text-muted-foreground border-border" },
  };
  const config = map[status] || { label: "대기", className: "bg-muted text-muted-foreground border-border" };
  return (
    <Badge variant="outline" className={cn("text-[11px] font-semibold", config.className)}>
      {config.label}
    </Badge>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-xl font-bold text-foreground leading-tight mt-0.5">{value}</p>
          {sub && <p className="text-[10px] text-muted-foreground mt-1">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function CoachMentoringHistoryPage() {
  const data = useQuery(api.mentorCoaching.getCoachMentoringHistory);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isLoading = data === undefined;

  const filteredLogs = data?.logs.filter((log) => {
    const query = searchQuery.toLowerCase();
    return (
      log.traineeName.toLowerCase().includes(query) ||
      (log.traineeEmail && log.traineeEmail.toLowerCase().includes(query)) ||
      log.topic.toLowerCase().includes(query) ||
      (log.content && log.content.toLowerCase().includes(query))
    );
  }) ?? [];

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">멘토링 누적 실적</h1>
            <p className="text-sm text-muted-foreground">
              교육생들과 함께 진행한 멘토코칭 및 코더코 누적 실적과 상세 기록을 조회합니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<Clock className="w-4 h-4" />}
              label="총 멘토링 시간"
              value={`${data.summary.totalHours.toFixed(1)}시간`}
              sub="승인된 시간 기준"
            />
            <StatCard
              icon={<CheckCircle2 className="w-4 h-4" />}
              label="총 완료 횟수"
              value={`${data.summary.totalCount}건`}
              sub="승인 완료 건수"
            />
            <StatCard
              icon={<AlertCircle className="w-4 h-4" />}
              label="검토 대기 건수"
              value={`${data.summary.pendingCount}건`}
              sub="검토 대기 중인 기록"
            />
          </>
        )}
      </motion.div>

      {/* Search area */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9 bg-background/50 border-purple-100 focus-visible:ring-purple-500"
            placeholder="교육생 이름, 이메일, 또는 코칭 주제로 검색하세요"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Records list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <Empty className="border-purple-100/20 bg-purple-500/5">
            <EmptyHeader>
              <EmptyMedia variant="icon"><Search className="text-purple-400" /></EmptyMedia>
              <EmptyTitle>검색 조건에 맞는 실적 기록이 없습니다</EmptyTitle>
              <EmptyDescription>다른 이름이나 검색어로 다시 검색해 보세요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            <AnimatePresence mode="popLayout">
              {filteredLogs.map((log) => {
                const isExpanded = expandedId === log._id;
                const dateStr = (() => {
                  try {
                    return format(new Date(log.sessionDate), "yyyy년 M월 d일 (EEE)", { locale: ko });
                  } catch {
                    return log.sessionDate;
                  }
                })();

                return (
                  <Card key={log._id} className="overflow-hidden border-purple-100 shadow-sm">
                    <CardContent className="p-4">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <StatusBadge status={log.approvalStatus} />
                            <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50/50 text-[10px]">
                              {log.sessionType === "mentor_coaching" ? "멘토코칭" : "코더코"}
                            </Badge>
                            <span className="text-xs font-semibold text-foreground">
                              {log.traineeName}
                            </span>
                            <span className="text-[10px] text-muted-foreground hidden sm:inline">
                              ({log.traineeEmail})
                            </span>
                          </div>
                          <p className="font-semibold text-foreground mt-1.5 line-clamp-1">{log.topic}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5" />
                              {dateStr}
                            </span>
                            <span className="flex items-center gap-1 font-semibold text-foreground">
                              <Clock className="w-3.5 h-3.5 text-purple-600" />
                              {log.durationMinutes}분 ({(log.durationMinutes / 60).toFixed(1)}시간)
                            </span>
                          </div>
                        </div>

                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground flex-shrink-0"
                          onClick={() => toggleExpand(log._id)}
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>
                      </div>

                      {/* Collapsible details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-3 border-t border-purple-50 space-y-3 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-purple-700 mb-0.5">피코칭 소감 / 세션 내용 요약</p>
                            <p className="text-foreground whitespace-pre-wrap leading-relaxed">{log.content}</p>
                          </div>

                          {log.reflection && (
                            <div>
                              <p className="font-semibold text-purple-700 mb-0.5">성찰 일지</p>
                              <p className="text-foreground whitespace-pre-wrap leading-relaxed">{log.reflection}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-500/5 p-2.5 rounded-lg border border-purple-100">
                            {log.coachingTool && (
                              <div>
                                <p className="font-semibold text-purple-800">사용된 대표 코칭 도구</p>
                                <p className="text-foreground mt-0.5">{log.coachingTool}</p>
                              </div>
                            )}
                            {log.powerfulQuestion && (
                              <div>
                                <p className="font-semibold text-purple-800">가장 강력했던 질문</p>
                                <p className="text-foreground mt-0.5">{log.powerfulQuestion}</p>
                              </div>
                            )}
                            {log.learnedAsCoach && (
                              <div className="sm:col-span-2 border-t border-purple-100/50 pt-2">
                                <p className="font-semibold text-purple-800">코치로서 배운 점</p>
                                <p className="text-foreground mt-0.5 whitespace-pre-wrap">{log.learnedAsCoach}</p>
                              </div>
                            )}
                            {log.actionPlan && (
                              <div className="sm:col-span-2 border-t border-purple-100/50 pt-2">
                                <p className="font-semibold text-purple-800">향후 실행 과제 (Action Plan)</p>
                                <p className="text-foreground mt-0.5">{log.actionPlan}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}
