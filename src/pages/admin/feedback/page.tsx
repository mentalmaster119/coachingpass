import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import { MessageSquareDot, Search, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import FeedbackCard from "@/pages/feedback/_components/feedback-card.tsx";
import { CATEGORY_LABELS } from "@/pages/feedback/_components/feedback-constants.ts";

export default function AdminFeedbackPage() {
  const [search, setSearch] = useState("");
  const feedbacks = useQuery(api.coachFeedback.listAll, {});

  const filtered = (feedbacks ?? []).filter((fb) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      fb.traineeName.toLowerCase().includes(q) ||
      fb.coachName.toLowerCase().includes(q) ||
      CATEGORY_LABELS[fb.category]?.toLowerCase().includes(q)
    );
  });

  const totalFeedbacks = feedbacks?.length ?? 0;
  const avgRating =
    feedbacks && feedbacks.length > 0
      ? (feedbacks.reduce((s, fb) => s + fb.rating, 0) / feedbacks.length).toFixed(1)
      : null;

  const uniqueCoaches = feedbacks
    ? new Set(feedbacks.map((fb) => fb.coachId.toString())).size
    : 0;
  const uniqueTrainees = feedbacks
    ? new Set(feedbacks.map((fb) => fb.traineeId.toString())).size
    : 0;

  return (
    <Authenticated>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquareDot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">피드백 전체 현황</h1>
              <p className="text-sm text-muted-foreground">코치가 작성한 모든 피드백을 확인합니다</p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 sm:grid-cols-4 gap-4"
        >
          {[
            { label: "전체 피드백", value: totalFeedbacks },
            { label: "피드백 받은 교육생", value: uniqueTrainees },
            { label: "피드백 작성 코치", value: uniqueCoaches },
            {
              label: "전체 평균 평점",
              value: avgRating ? (
                <span className="flex items-center justify-center gap-1">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  {avgRating}
                </span>
              ) : "-",
            },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="교육생, 슈퍼바이저명 검색..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </motion.div>

        {/* List */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          {feedbacks === undefined ? (
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-48 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><MessageSquareDot /></EmptyMedia>
                <EmptyTitle>피드백이 없습니다</EmptyTitle>
                <EmptyDescription>
                  {search ? "검색 결과가 없습니다." : "아직 작성된 피드백이 없습니다."}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">총 {filtered.length}개</p>
              {filtered.map((fb) => (
                <FeedbackCard
                  key={fb._id}
                  feedback={fb}
                  showTraineeName
                  showCoachName
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </Authenticated>
  );
}
