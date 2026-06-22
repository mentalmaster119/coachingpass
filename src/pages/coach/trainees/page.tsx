import { useQuery } from "convex/react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { UserCheck, TrendingUp, AlertCircle, BookOpen, ClipboardList } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Badge } from "@/components/ui/badge.tsx";
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

const CERT_COLORS: Record<string, string> = {
  KAC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  KPC: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function CoachTraineesPage() {
  const trainees = useQuery(api.admin.getMyAssignedTrainees);
  const navigate = useNavigate();

  const pendingTotal = trainees?.reduce((s, t) => s + t.pendingReviewCount, 0) ?? 0;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <UserCheck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">담당 교육생</h1>
            <p className="text-sm text-muted-foreground">
              배정된 교육생의 진행 상황을 확인합니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Pending alert */}
      {trainees !== undefined && pendingTotal > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  담당 교육생 중 <strong>{pendingTotal}건</strong>의 검토 대기 기록이 있습니다.
                </p>
                <div className="ml-auto flex gap-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/admin/education")}>
                    <BookOpen className="w-3.5 h-3.5 mr-1" />
                    교육 검토
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => navigate("/admin/coaching")}>
                    <ClipboardList className="w-3.5 h-3.5 mr-1" />
                    코칭 검토
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Trainee list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {trainees === undefined ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : trainees.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><UserCheck /></EmptyMedia>
              <EmptyTitle>배정된 교육생이 없습니다</EmptyTitle>
              <EmptyDescription>
                관리자가 담당 교육생을 배정하면 여기에 표시됩니다.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {trainees.map((trainee) => (
              <Card key={trainee._id} className="shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Trainee info */}
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground">
                          {trainee.name ?? "이름 미설정"}
                        </p>
                        {trainee.certificationGoal && (
                          <Badge className={`text-[11px] px-1.5 py-0 ${CERT_COLORS[trainee.certificationGoal] ?? ""}`}>
                            {trainee.certificationGoal}
                          </Badge>
                        )}
                        {trainee.pendingReviewCount > 0 && (
                          <Badge className="text-[11px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            검토 대기 {trainee.pendingReviewCount}건
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{trainee.email}</p>
                    </div>

                    {/* Actions */}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="self-start sm:self-center flex-shrink-0"
                      onClick={() => navigate(`/progress/trainee/${trainee._id}`)}
                    >
                      <TrendingUp className="w-3.5 h-3.5 mr-1.5" />
                      진행 현황 보기
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
