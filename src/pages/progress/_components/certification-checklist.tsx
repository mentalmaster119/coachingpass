import { useState } from "react";
import { useMutation } from "convex/react";
import { motion } from "motion/react";
import { CheckCircle, Circle, GraduationCap, ChevronDown } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type User = Doc<"users">;

type ProgressData = {
  approvedEducationHours: number;
  approvedCoachingHours: number;
  educationPendingCount: number;
  coachingPendingCount: number;
  buddyCount?: number;
  mentorCount?: number;
  svCount?: number;
  sportsCount?: number;
  generalCount?: number;
  totalCoachingCount?: number;
};

const REQUIREMENTS = {
  KAC: {
    label: "멘탈코칭전문가 1급",
    education: { hours: 60, label: "교육 이수 60시간" },
    coaching: { hours: 100, label: "코칭 실습 100시간" },
    description: "입문 레벨 코칭 자격증",
  },
  KPC: {
    label: "멘탈코칭전문가 2급",
    education: { hours: 125, label: "교육 이수 125시간" },
    coaching: { hours: 500, label: "코칭 실습 500시간" },
    description: "전문 레벨 코칭 자격증",
  },
} as const;

type GoalKey = keyof typeof REQUIREMENTS;

export default function CertificationChecklist({
  user,
  progress,
}: {
  user: User;
  progress: ProgressData;
}) {
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalKey>(
    (user.certificationGoal === "KPC" ? "KPC" : "KAC"),
  );
  const [isChanging, setIsChanging] = useState(false);
  const changeGoal = useMutation(api.users.setCertificationGoal);

  const currentGoal = (user.certificationGoal as string) ?? "KAC";
  const isSMPCC = currentGoal === "SMPCC";
  const req = !isSMPCC ? REQUIREMENTS[currentGoal as GoalKey] : null;

  const requirements = isSMPCC ? [
    {
      label: "교육 이수 시간 (최소 60시간)",
      current: progress.approvedEducationHours,
      target: 60,
      pending: progress.educationPendingCount,
      done: progress.approvedEducationHours >= 60,
      unit: "시간",
    },
    {
      label: "버디코칭 (최소 2회)",
      current: progress.buddyCount ?? 0,
      target: 2,
      pending: 0,
      done: (progress.buddyCount ?? 0) >= 2,
      unit: "회",
    },
    {
      label: "멘토코칭 (최소 2회)",
      current: progress.mentorCount ?? 0,
      target: 2,
      pending: 0,
      done: (progress.mentorCount ?? 0) >= 2,
      unit: "회",
    },
    {
      label: "SV코칭 (최소 1회)",
      current: progress.svCount ?? 0,
      target: 1,
      pending: 0,
      done: (progress.svCount ?? 0) >= 1,
      unit: "회",
    },
    {
      label: "스포츠선수코칭 (최소 8회)",
      current: progress.sportsCount ?? 0,
      target: 8,
      pending: 0,
      done: (progress.sportsCount ?? 0) >= 8,
      unit: "회",
    },
    {
      label: "일반인코칭 (최소 7회)",
      current: progress.generalCount ?? 0,
      target: 7,
      pending: 0,
      done: (progress.generalCount ?? 0) >= 7,
      unit: "회",
    },
    {
      label: "총 코칭 실습 보고서 (최소 20회)",
      current: progress.totalCoachingCount ?? 0,
      target: 20,
      pending: progress.coachingPendingCount,
      done: (progress.totalCoachingCount ?? 0) >= 20,
      unit: "회",
    },
  ] : [
    {
      label: req!.education.label,
      current: progress.approvedEducationHours,
      target: req!.education.hours,
      pending: progress.educationPendingCount,
      done: progress.approvedEducationHours >= req!.education.hours,
      unit: "시간",
    },
    {
      label: req!.coaching.label,
      current: progress.approvedCoachingHours,
      target: req!.coaching.hours,
      pending: progress.coachingPendingCount,
      done: progress.approvedCoachingHours >= req!.coaching.hours,
      unit: "시간",
    },
  ];

  const allDone = requirements.every((r) => r.done);

  const handleChangeGoal = async () => {
    if (selectedGoal === currentGoal) {
      setChangeDialogOpen(false);
      return;
    }
    setIsChanging(true);
    try {
      await changeGoal({});
      toast.success(`목표가 ${selectedGoal}로 변경되었습니다.`);
      setChangeDialogOpen(false);
    } catch {
      toast.error("목표 변경에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsChanging(false);
    }
  };

  // Requirements array is built dynamically above

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className={cn("shadow-sm", allDone && "border-chart-4/40 bg-chart-4/3")}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-primary" />
              <CardTitle className="text-base font-semibold">자격증 취득 요건</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              {allDone && (
                <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 text-xs">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  요건 충족!
                </Badge>
              )}
              <Dialog open={changeDialogOpen} onOpenChange={setChangeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1">
                    {currentGoal} 목표 <ChevronDown className="w-3 h-3" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>자격증 목표 변경</DialogTitle>
                    <DialogDescription>
                      취득을 목표로 하는 자격증을 변경합니다. 기존에 쌓은 기록은 그대로 유지됩니다.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    {(Object.entries(REQUIREMENTS) as [GoalKey, typeof REQUIREMENTS[GoalKey]][]).map(
                      ([key, info]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedGoal(key)}
                          className={cn(
                            "w-full text-left rounded-lg border-2 p-4 transition-all",
                            selectedGoal === key
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/40",
                          )}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={cn(
                                "w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 flex-shrink-0 transition-colors",
                                selectedGoal === key
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground/40",
                              )}
                            >
                              {selectedGoal === key && (
                                <div className="w-2 h-2 rounded-full bg-primary-foreground" />
                              )}
                            </div>
                            <div>
                              <p className="font-semibold text-sm text-foreground">{key}</p>
                              <p className="text-xs text-muted-foreground">{info.label}</p>
                              <p className="text-xs text-muted-foreground mt-1">{info.description}</p>
                              <div className="flex gap-3 mt-2">
                                <span className="text-[11px] bg-muted rounded px-1.5 py-0.5">교육 {info.education.hours}시간</span>
                                <span className="text-[11px] bg-muted rounded px-1.5 py-0.5">코칭 {info.coaching.hours}시간</span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ),
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setChangeDialogOpen(false)}>
                      취소
                    </Button>
                    <Button
                      onClick={handleChangeGoal}
                      disabled={isChanging || selectedGoal === currentGoal}
                    >
                      {isChanging ? "변경 중..." : "변경하기"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-3">
            {requirements.map((req) => (
              <div
                key={req.label}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                  req.done ? "bg-chart-4/5 border-chart-4/20" : "bg-muted/30 border-transparent",
                )}
              >
                {req.done ? (
                  <CheckCircle className="w-5 h-5 text-chart-4 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{req.label}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-muted/30 rounded-full h-1.5">
                      <div
                        className={cn(
                          "h-1.5 rounded-full transition-all duration-700",
                          req.done ? "bg-chart-4" : "bg-primary",
                        )}
                        style={{ width: `${Math.min((req.current / req.target) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                      {Math.round(req.current * 10) / 10}/{req.target}{req.unit}
                    </span>
                  </div>
                  {req.pending > 0 && (
                    <p className="text-[10px] text-chart-2 mt-0.5">검토중 {req.pending}건 포함 안됨</p>
                  )}
                </div>
                {req.done && (
                  <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 text-[10px] px-1.5 py-0 flex-shrink-0">
                    완료
                  </Badge>
                )}
              </div>
            ))}
          </div>

          {allDone && (
            <div className="mt-4 p-3 rounded-lg bg-chart-4/10 border border-chart-4/20 text-center">
              <p className="text-sm font-semibold text-chart-4">
                모든 취득 요건을 충족했습니다! 관리자에게 최종 신청을 문의하세요.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
