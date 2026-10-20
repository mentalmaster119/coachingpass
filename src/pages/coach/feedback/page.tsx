import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { motion } from "motion/react";
import { MessageSquareDot, Plus, Users, Star, ClipboardList, Trash2, Copy, Calendar, Award } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
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
import SupervisionObservationDialog from "@/pages/supervision/_components/supervision-observation-dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

function CoachFeedbackInner() {
  const [showForm, setShowForm] = useState(false);
  const [observationOpen, setObservationOpen] = useState(false);
  const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
  const [activeTab, setActiveTab] = useState<"feedbacks" | "journals">("feedbacks");

  const feedbacks = useQuery(api.coachFeedback.listMyWrittenFeedbacks, {});
  const journals = useQuery((api as any).supervisionJournals.listMyJournals, {});
  const trainees = useQuery(api.admin.getMyAssignedTrainees);
  const removeFeedback = useMutation(api.coachFeedback.remove);
  const removeJournal = useMutation((api as any).supervisionJournals.removeJournal);

  const handleDeleteJournal = async (id: any) => {
    if (!window.confirm("수퍼바이징 일지를 삭제하시겠습니까?")) return;
    try {
      await removeJournal({ journalId: id });
      toast.success("수퍼바이징 일지가 삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    }
  };

  const handleCopyJournal = (j: any) => {
    const text = `[멘탈코칭 수퍼바이징 일지 (V3.0)]
- 수퍼바이지(교육생): ${j.traineeName}
- 일시: ${j.coachingDate}
- 코칭 주제: ${j.topic}
- 고객 사전/사후 척도: ${j.currentScore || "-"}점 → ${j.targetScore || "-"}점
- 활용 툴: ${j.toolsUsed.join(", ")}${j.toolOther ? ` (${j.toolOther})` : ""}
- 평균 평점: ${j.averageScore ? `${j.averageScore.toFixed(2)}점 / 4.0점` : "-"}

[종합 관찰 피드백]
■ 주요 강점:
${j.strengths}

■ 개선할 점:
${j.improvements}

■ 다음 실습 추천 과제:
${j.nextActionPlan}`;
    navigator.clipboard.writeText(text);
    toast.success("수퍼바이징 일지 내용이 클립보드에 복사되었습니다");
  };

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
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setObservationOpen(true)}
              className="border-purple-200 text-purple-700 hover:bg-purple-50"
            >
              수퍼바이징 일지 작성
            </Button>
            <Button onClick={() => { setEditingFeedback(null); setShowForm(true); }}>
              <Plus className="w-4 h-4 mr-2" />
              피드백 작성
            </Button>
          </div>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-xs">
          <TabsTrigger value="feedbacks">
            일반 피드백 ({feedbacks?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="journals">
            수퍼바이징 일지 ({journals?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="feedbacks" className="mt-4">
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
        </TabsContent>

        <TabsContent value="journals" className="mt-4">
          {journals === undefined ? (
            <div className="space-y-4">
              {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-44 w-full" />)}
            </div>
          ) : journals.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><ClipboardList /></EmptyMedia>
                <EmptyTitle>작성한 수퍼바이징 일지가 없습니다</EmptyTitle>
                <EmptyDescription>
                  수퍼비전 실습 장면을 현장 관찰하고 평가 및 피드백 일지를 작성해 보세요.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setObservationOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white">
                  <ClipboardList className="w-4 h-4 mr-1" />
                  수퍼바이징 일지 작성
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-4">
              {journals.map((j: any) => (
                <Card key={j._id} className="shadow-sm border-purple-100 hover:border-purple-200 transition-all">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-base text-foreground">{j.traineeName}</span>
                          <span className="text-xs text-muted-foreground">교육생 관찰</span>
                          {j.averageScore && (
                            <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                              평균 {j.averageScore.toFixed(2)}점 / 4.0점
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm font-semibold text-foreground/90 mt-1">{j.topic}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{j.coachingDate}</span>
                          {(j.currentScore || j.targetScore) && (
                            <span>· 고객 척도: {j.currentScore || "-"}점 → {j.targetScore || "-"}점</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                          onClick={() => handleCopyJournal(j)}
                        >
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          복사
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteJournal(j._id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    {j.toolsUsed && j.toolsUsed.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs text-muted-foreground">활용 툴:</span>
                        {j.toolsUsed.map((tool: string) => (
                          <Badge key={tool} variant="outline" className="text-[11px] py-0">
                            {tool}
                          </Badge>
                        ))}
                        {j.toolOther && (
                          <Badge variant="outline" className="text-[11px] py-0 text-muted-foreground">
                            {j.toolOther}
                          </Badge>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-border/60 text-xs">
                      <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
                        <p className="font-semibold text-emerald-700 dark:text-emerald-400 mb-1">■ 주요 강점</p>
                        <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{j.strengths || "-"}</p>
                      </div>
                      <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 p-2.5 border border-amber-100 dark:border-amber-900/40">
                        <p className="font-semibold text-amber-700 dark:text-amber-400 mb-1">■ 개선할 점</p>
                        <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{j.improvements || "-"}</p>
                      </div>
                      <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 p-2.5 border border-blue-100 dark:border-blue-900/40">
                        <p className="font-semibold text-blue-700 dark:text-blue-400 mb-1">■ 다음 실습 과제</p>
                        <p className="text-muted-foreground line-clamp-3 whitespace-pre-wrap">{j.nextActionPlan || "-"}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <FeedbackFormDialog
        open={showForm}
        onClose={() => { setShowForm(false); setEditingFeedback(null); }}
        editing={editingFeedback}
      />

      <SupervisionObservationDialog
        open={observationOpen}
        onOpenChange={setObservationOpen}
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
