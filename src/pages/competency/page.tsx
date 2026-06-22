import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import {
  BarChart2,
  Plus,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import AssessmentFormDialog from "./_components/assessment-form-dialog.tsx";
import AssessmentResultCard from "./_components/assessment-result-card.tsx";

export default function CompetencyAssessmentPage() {
  const { user } = useCurrentUser();
  const assessments = useQuery(api.competencyAssessments.listMyAssessments, {});
  const deleteAssessment = useMutation(api.competencyAssessments.deleteAssessment);

  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Doc<"competencyAssessments"> | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const goal = user?.certificationGoal ?? "KAC";
  const isLoading = assessments === undefined;

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteAssessment({ id: deleteTarget._id });
      toast.success("평가 기록이 삭제되었습니다");
    } catch (err) {
      if (err instanceof ConvexError) {
        const d = err.data as { message?: string };
        toast.error(d.message ?? "삭제 실패");
      } else {
        toast.error("오류가 발생했습니다");
      }
    } finally {
      setDeleteTarget(null);
    }
  };

  const latest = assessments?.[0] ?? null;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">코칭 역량 자가 평가</h1>
            <p className="text-sm text-muted-foreground">
              KCA 핵심역량 기준 · {goal} 심사항목
            </p>
          </div>
        </div>
        <Button onClick={() => setFormOpen(true)} className="gap-1.5">
          <Plus className="w-4 h-4" />
          새 평가
        </Button>
      </div>

      {/* Info banner */}
      <div className="flex gap-2.5 bg-primary/5 border border-primary/15 rounded-lg p-3.5 text-xs text-muted-foreground">
        <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p>
          KCA(한국코치협회) 8대 핵심역량 체계를 기반으로 한 자가 평가입니다.
          {goal === "KAC"
            ? " KAC 심사항목(라포 형성, 변화와 성장 축하 포함)으로 구성됩니다."
            : " KPC 심사항목(호기심, 관점전환과 재구성, 정체성과의 통합 지원 포함)으로 구성됩니다."}
          {" "}정기적으로 평가하면 역량 성장 추이를 확인할 수 있습니다.
        </p>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : !assessments || assessments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BarChart2 />
            </EmptyMedia>
            <EmptyTitle>아직 평가 기록이 없습니다</EmptyTitle>
            <EmptyDescription>
              첫 번째 KCA 핵심역량 자가 평가를 시작해 보세요
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button size="sm" onClick={() => setFormOpen(true)}>
              <Plus className="w-4 h-4 mr-1" />
              첫 평가 시작
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="space-y-3">
          {assessments.map((assessment, index) => {
            const isExpanded = expandedIds.has(assessment._id);
            const isFirst = index === 0;

            return (
              <div key={assessment._id}>
                {/* Latest: always expanded */}
                {isFirst ? (
                  <AssessmentResultCard assessment={assessment} isLatest={true} />
                ) : (
                  /* Older: collapsible */
                  <div className="border rounded-xl overflow-hidden">
                    <button
                      onClick={() => toggleExpanded(assessment._id)}
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {format(new Date(assessment.assessedAt), "yyyy년 M월 d일 (EEE)", { locale: ko })}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {assessment.certificationGoal} 기준
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(assessment);
                          }}
                          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
                          : <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                    </button>
                    {isExpanded && (
                      <div className="border-t p-4">
                        <AssessmentResultCard assessment={assessment} />
                      </div>
                    )}
                  </div>
                )}

                {/* Delete button for latest */}
                {isFirst && (
                  <div className="flex justify-end mt-1">
                    <button
                      onClick={() => setDeleteTarget(assessment)}
                      className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Form Dialog */}
      <AssessmentFormDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        certificationGoal={goal}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => { if (!v) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>평가 기록 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget &&
                format(new Date(deleteTarget.assessedAt), "yyyy년 M월 d일", { locale: ko })}
              {" "}평가 기록을 삭제합니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
