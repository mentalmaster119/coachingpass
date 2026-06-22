import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import { MessageSquareDot, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import FeedbackCard from "./_components/feedback-card.tsx";
import { CATEGORY_LABELS } from "./_components/feedback-constants.ts";
import type { FeedbackItem } from "./_components/feedback-card.tsx";

type FilterCategory = "all" | "coaching_skills" | "communication" | "self_development" | "overall";

function FeedbackPageInner() {
  const [filter, setFilter] = useState<FilterCategory>("all");
  const feedbacks = useQuery(api.coachFeedback.listMyFeedbacks, {});
  const markAsRead = useMutation(api.coachFeedback.markAsRead);

  const handleCardView = async (fb: FeedbackItem) => {
    if (!fb.isRead) {
      try {
        await markAsRead({ feedbackId: fb._id });
      } catch {
        // silent
      }
    }
  };

  const filtered = (feedbacks ?? []).filter((fb) => {
    if (filter === "all") return true;
    return fb.category === filter;
  });

  const unreadCount = (feedbacks ?? []).filter((fb) => !fb.isRead).length;

  const avgRating =
    feedbacks && feedbacks.length > 0
      ? (feedbacks.reduce((s, fb) => s + fb.rating, 0) / feedbacks.length).toFixed(1)
      : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <MessageSquareDot className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold">코치 피드백</h1>
            <p className="text-sm text-muted-foreground">담당 코치로부터 받은 피드백을 확인합니다</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {feedbacks !== undefined && feedbacks.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { label: "총 피드백", value: feedbacks.length },
            { label: "미확인", value: unreadCount },
            { label: "평균 평점", value: avgRating ? `${avgRating}점` : "-" },
          ].map((stat) => (
            <Card key={stat.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold flex items-center justify-center gap-1">
                  {stat.label === "평균 평점" && avgRating && (
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                  )}
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-wrap gap-2"
      >
        {(["all", "coaching_skills", "communication", "self_development", "overall"] as FilterCategory[]).map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={filter === cat ? "default" : "secondary"}
            onClick={() => setFilter(cat)}
          >
            {cat === "all" ? "전체" : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </motion.div>

      {/* Feedback list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        {feedbacks === undefined ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><MessageSquareDot /></EmptyMedia>
              <EmptyTitle>피드백이 없습니다</EmptyTitle>
              <EmptyDescription>
                담당 코치가 피드백을 작성하면 여기에 표시됩니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-4">
            {filtered.map((fb) => (
              <div key={fb._id} onClick={() => handleCardView(fb)}>
                <FeedbackCard feedback={fb} showCoachName />
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default function FeedbackPage() {
  return (
    <Authenticated>
      <FeedbackPageInner />
    </Authenticated>
  );
}
