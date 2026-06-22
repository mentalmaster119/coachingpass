import { useState } from "react";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { Plus, NotebookPen, BookOpen, TrendingUp, Calendar } from "lucide-react";
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
import ReflectionForm from "./_components/reflection-form.tsx";
import ReflectionCard from "./_components/reflection-card.tsx";

type RelatedType = "general" | "coaching" | "mentor_coaching" | "education";

const TYPE_LABELS: Record<RelatedType, string> = {
  general: "일반 성찰",
  coaching: "코칭 실습",
  mentor_coaching: "멘토코칭/코더코",
  education: "교육 이수",
};

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

export default function ReflectionPage() {
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const journals = useQuery(api.reflections.getMyJournals);
  const summary = useQuery(api.reflections.getMySummary);

  const filteredJournals =
    journals?.filter((j) => {
      if (activeTab === "all") return true;
      return (j.relatedType ?? "general") === activeTab;
    }) ?? [];

  const topType = summary
    ? (Object.entries(summary.byType).sort((a, b) => b[1] - a[1])[0]?.[0] as RelatedType | undefined)
    : undefined;

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
          <h1 className="text-2xl font-bold text-foreground">성찰 일지</h1>
          <p className="text-muted-foreground text-sm mt-1">
            코칭 여정을 기록하고 성장을 돌아보세요.
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} className="self-start sm:self-center">
          <Plus className="w-4 h-4 mr-2" />
          일지 작성
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-3 gap-4"
      >
        {summary === undefined ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))
        ) : (
          <>
            <StatCard
              icon={<BookOpen className="w-4.5 h-4.5" />}
              label="총 일지 수"
              value={`${summary.total}개`}
            />
            <StatCard
              icon={<Calendar className="w-4.5 h-4.5" />}
              label="이번 달"
              value={`${summary.thisMonthCount}개`}
              sub="이번 달 작성"
            />
            <StatCard
              icon={<TrendingUp className="w-4.5 h-4.5" />}
              label="주요 유형"
              value={topType ? TYPE_LABELS[topType] : "-"}
              sub={topType ? `${summary.byType[topType]}개 기록` : "아직 없음"}
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
            <TabsTrigger value="general">일반 성찰</TabsTrigger>
            <TabsTrigger value="coaching">코칭 실습</TabsTrigger>
            <TabsTrigger value="mentor_coaching">멘토코칭</TabsTrigger>
            <TabsTrigger value="education">교육 이수</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-0">
            {journals === undefined ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-xl" />
                ))}
              </div>
            ) : filteredJournals.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <NotebookPen />
                  </EmptyMedia>
                  <EmptyTitle>
                    {activeTab === "all" ? "아직 작성된 성찰 일지가 없습니다" : "해당 유형의 일지가 없습니다"}
                  </EmptyTitle>
                  <EmptyDescription>
                    {activeTab === "all"
                      ? "코칭 경험과 성장 과정을 성찰 일지에 기록해 보세요."
                      : "다른 탭에서 확인하거나 새 일지를 작성해 보세요."}
                  </EmptyDescription>
                </EmptyHeader>
                {activeTab === "all" && (
                  <EmptyContent>
                    <Button size="sm" onClick={() => setAddOpen(true)}>
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      일지 작성
                    </Button>
                  </EmptyContent>
                )}
              </Empty>
            ) : (
              <div className="space-y-3">
                {filteredJournals.map((entry) => (
                  <ReflectionCard key={entry._id} entry={entry} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>

      <ReflectionForm open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
