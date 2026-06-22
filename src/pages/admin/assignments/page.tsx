import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { UserCheck, Search, Users, UserX } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";

const CERT_COLORS: Record<string, string> = {
  KAC: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  KPC: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

export default function AdminAssignmentsPage() {
  const trainees = useQuery(api.admin.getApprovedTrainees);
  const coaches = useQuery(api.admin.getAllSeniorCoaches);
  const assignCoach = useMutation(api.admin.assignCoach);
  const [search, setSearch] = useState("");
  const [assigningId, setAssigningId] = useState<Id<"users"> | null>(null);

  const filteredTrainees =
    trainees?.filter(
      (t) =>
        (t.name ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.email ?? "").toLowerCase().includes(search.toLowerCase()),
    ) ?? [];

  const unassignedCount = trainees?.filter((t) => !t.assignedCoachId).length ?? 0;
  const assignedCount = trainees?.filter((t) => !!t.assignedCoachId).length ?? 0;

  const handleAssign = async (traineeId: Id<"users">, coachId: string) => {
    setAssigningId(traineeId);
    try {
      await assignCoach({
        traineeId,
        coachId: coachId === "none" ? undefined : (coachId as Id<"users">),
      });
      toast.success(coachId === "none" ? "배정이 해제되었습니다." : "코치가 배정되었습니다.");
    } catch {
      toast.error("배정 중 오류가 발생했습니다.");
    } finally {
      setAssigningId(null);
    }
  };

  const isLoading = trainees === undefined || coaches === undefined;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
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
            <h1 className="text-xl font-bold text-foreground">수강생 코치 배정</h1>
            <p className="text-sm text-muted-foreground">
              수강생에게 담당 상위코치를 배정하거나 변경합니다.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Summary badges */}
      {!isLoading && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="flex gap-3 flex-wrap"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span>전체 수강생 <strong>{trainees.length}명</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-chart-4/10 text-chart-4 text-sm">
            <UserCheck className="w-3.5 h-3.5" />
            <span>배정 완료 <strong>{assignedCount}명</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-sm">
            <UserX className="w-3.5 h-3.5" />
            <span>미배정 <strong>{unassignedCount}명</strong></span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-sm">
            <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
            <span>상위코치 <strong>{coaches.length}명</strong></span>
          </div>
        </motion.div>
      )}

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="수강생 이름 또는 이메일로 검색"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </motion.div>

      {/* Trainee list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
      >
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredTrainees.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><Users /></EmptyMedia>
              <EmptyTitle>수강생이 없습니다</EmptyTitle>
              <EmptyDescription>
                {search ? "검색 조건에 맞는 수강생이 없습니다." : "승인된 수강생이 없습니다."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-2">
            {filteredTrainees.map((trainee) => (
              <Card key={trainee._id} className="shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    {/* Trainee info */}
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-foreground truncate">
                          {trainee.name ?? "이름 미설정"}
                        </p>
                        {trainee.certificationGoal && (
                          <Badge
                            className={`text-[11px] px-1.5 py-0 ${CERT_COLORS[trainee.certificationGoal] ?? ""}`}
                          >
                            {trainee.certificationGoal}
                          </Badge>
                        )}
                        {!trainee.assignedCoachId && (
                          <Badge variant="secondary" className="text-[11px] px-1.5 py-0 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            미배정
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{trainee.email}</p>
                      {trainee.coachName && (
                        <p className="text-xs text-muted-foreground">
                          현재 담당: <span className="text-foreground font-medium">{trainee.coachName}</span>
                        </p>
                      )}
                    </div>

                    {/* Coach selector */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Select
                        value={trainee.assignedCoachId ?? "none"}
                        onValueChange={(val) => handleAssign(trainee._id, val)}
                        disabled={assigningId === trainee._id}
                      >
                        <SelectTrigger className="w-44 h-8 text-sm">
                          <SelectValue placeholder="코치 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">
                            <span className="text-muted-foreground">배정 안함</span>
                          </SelectItem>
                          {coaches.map((coach) => (
                            <SelectItem key={coach._id} value={coach._id}>
                              {coach.name ?? coach.email ?? "이름 미설정"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {assigningId === trainee._id && (
                        <span className="text-xs text-muted-foreground">저장 중...</span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </motion.div>

      {/* No coaches warning */}
      {!isLoading && coaches.length === 0 && (
        <Card className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <UserCheck className="w-4.5 h-4.5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-700 dark:text-amber-400">상위코치가 없습니다</p>
                <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">
                  사용자 관리 페이지에서 먼저 상위코치 역할을 부여하세요.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
