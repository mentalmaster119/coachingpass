import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import { MessageSquareDot, Plus, Users, Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import FeedbackCard, { type FeedbackItem } from "@/pages/feedback/_components/feedback-card.tsx";
import FeedbackFormDialog from "@/pages/feedback/_components/feedback-form-dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

function CoachFeedbackInner() {
  const [showForm, setShowForm] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);

  const feedbacks = useQuery(api.coachFeedback.listMyWrittenFeedbacks, {});
  const trainees = useQuery(api.admin.getMyAssignedTrainees);
  const removeFeedback = useMutation(api.coachFeedback.remove);

  const handleDelete = async (id: Id<"coachFeedbacks">) => {
    try {
      await removeFeedback({ feedbackId: id });
      toast.success("피드백이 삭제되었습니다");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("삭제에 실패했습니다");
      }
    }
  };

  const totalGiven = feedbacks?.length ?? 0;
  const avgRating =
    feedbacks && feedbacks.length > 0
      ? (feedbacks.reduce((s, fb) => s + fb.rating, 0) / feedbacks.length).toFixed(1)
      : null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <MessageSquareDot className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">피드백 관리</h1>
              <p className="text-sm text-muted-foreground">담당 교육생에게 피드백을 작성합니다</p>
            </div>
          </div>
          <Button onClick={() => { setEditingFeedback(null); setShowForm(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            피드백 작성
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-3 gap-4"
      >
        {[
          { label: "담당 교육생", value: trainees?.length ?? "-", icon: <Users className="w-4 h-4 text-muted-foreground" /> },
          { label: "작성한 피드백", value: totalGiven, icon: <MessageSquareDot className="w-4 h-4 text-muted-foreground" /> },
          { label: "평균 평점", value: avgRating ? `${avgRating}점` : "-", icon: <Star className="w-4 h-4 text-amber-400" /> },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4 text-center">
              <div className="flex justify-center mb-1">{stat.icon}</div>
              <p className="text-xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Feedback list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {feedbacks === undefined ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
          </div>
        ) : feedbacks.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><MessageSquareDot /></EmptyMedia>
              <EmptyTitle>작성한 피드백이 없습니다</EmptyTitle>
              <EmptyDescription>
                담당 교육생에게 첫 피드백을 작성해보세요.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button size="sm" onClick={() => { setEditingFeedback(null); setShowForm(true); }}>
                <Plus className="w-4 h-4 mr-1" />
                피드백 작성
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="space-y-4">
            {feedbacks.map((fb) => (
              <FeedbackCard
                key={fb._id}
                feedback={fb}
                showTraineeName
                canEdit
                canDelete
                onEdit={(f) => { setEditingFeedback(f); setShowForm(true); }}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </motion.div>

      <FeedbackFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingFeedback(null); }}
        editing={editingFeedback}
      />
    </div>
  );
}

export default function CoachFeedbackPage() {
  return (
    <Authenticated>
      <CoachFeedbackInner />
    </Authenticated>
  );
}
