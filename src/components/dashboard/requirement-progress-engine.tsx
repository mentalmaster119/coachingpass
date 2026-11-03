import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Award,
  CheckCircle2,
  Circle,
  Clock,
  BookOpen,
  ClipboardList,
  Calendar,
  ChevronRight,
  ChevronDown,
  Sparkles,
  ArrowRight,
  Target,
  FileText,
  AlertTriangle,
  GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";

function CircularProgressRing({
  pct,
  size = 84,
  strokeWidth = 8,
  color = "hsl(var(--primary))",
}: {
  pct: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const dash = Math.min(Math.max(pct, 0) / 100, 1) * circ;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" style={{ display: "block" }}>
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-black tracking-tight text-foreground">{pct}%</span>
        <span className="text-[10px] text-muted-foreground font-semibold">달성률</span>
      </div>
    </div>
  );
}

export default function RequirementProgressEngine() {
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const status = useQuery(api.certification.getMyRequirementStatus);

  if (status === undefined) {
    return (
      <Card className="border-primary/20 shadow-sm overflow-hidden">
        <CardHeader className="pb-3">
          <Skeleton className="h-6 w-48 rounded-md" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Next Milestone Recommendation Engine
  let nextMilestoneText = "";
  let nextMilestoneAction = "/coaching-log";
  let nextMilestoneButtonText = "코칭 실습 등록";

  if (!status.isCompletionMet) {
    if (!status.attendanceMet) {
      nextMilestoneText = "1단계 수료를 위해 세미나 출석률 80% 달성이 필요합니다.";
      nextMilestoneAction = "/attendance";
      nextMilestoneButtonText = "출석 일정 확인";
    } else {
      const coachingLeft = Math.max(0, 15 - (status.criteria.find((c) => c.key === "totalCoaching")?.current || 0));
      nextMilestoneText = `1단계 수료를 위해 기본 코칭 실습 ${coachingLeft}회가 추가로 필요합니다.`;
      nextMilestoneAction = "/coaching-log";
      nextMilestoneButtonText = "코칭 실습 작성";
    }
  } else if (!status.isCertEligible) {
    const coachingLeft = Math.max(0, 20 - (status.criteria.find((c) => c.key === "totalCoaching")?.current || 0));
    const bookReports = status.criteria.find((c) => c.key === "bookReports");
    const essay = status.criteria.find((c) => c.key === "coachingEssay");

    if (coachingLeft > 0) {
      nextMilestoneText = `2단계 인증 요건 충족까지 심화 코칭 실습 ${coachingLeft}회 남았습니다.`;
      nextMilestoneAction = "/coaching-log";
      nextMilestoneButtonText = "코칭 실습 등록";
    } else if (bookReports && !bookReports.met) {
      nextMilestoneText = `2단계 인증 요건 충족을 위해 지정 도서 독후감 제출이 필요합니다.`;
      nextMilestoneAction = "/submissions";
      nextMilestoneButtonText = "과제 제출하기";
    } else if (essay && !essay.met) {
      nextMilestoneText = `2단계 인증 요건 충족을 위해 멘탈코칭 성찰 에세이 제출이 필요합니다.`;
      nextMilestoneAction = "/submissions";
      nextMilestoneButtonText = "에세이 작성하기";
    } else {
      nextMilestoneText = "인증 심사 요건을 모두 충족했습니다! 인증시험 응시를 준비하세요.";
      nextMilestoneAction = "/certification";
      nextMilestoneButtonText = "인증시험 신청";
    }
  } else if (!status.hasActiveCert) {
    nextMilestoneText = "축하합니다! 모든 인증 요건을 통과했습니다. 인증시험에 응시하여 SMPCC 자격을 획득하세요.";
    nextMilestoneAction = "/certification";
    nextMilestoneButtonText = "인증시험 신청하기";
  } else {
    nextMilestoneText = `MCCI-SMPCC 자격을 보유하고 계십니다! (유효기간: ${status.certExpiresAt || "3년"})`;
    nextMilestoneAction = "/recognition-status";
    nextMilestoneButtonText = "공인 자격증 확인";
  }

  // Key Area Stats
  const attendanceCriterion = status.criteria.find((c) => c.key === "attendance");
  const totalCoachingCriterion = status.criteria.find((c) => c.key === "totalCoaching");
  const bookReportsCriterion = status.criteria.find((c) => c.key === "bookReports");
  const essayCriterion = status.criteria.find((c) => c.key === "coachingEssay");
  const assignmentMetCount =
    (bookReportsCriterion?.met ? 1 : 0) + (essayCriterion?.met ? 1 : 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="overflow-hidden border-primary/25 shadow-md bg-gradient-to-b from-card via-card to-primary/[0.02]">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-transparent px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-primary/15">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shadow-xs">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-foreground">
                  SMPCC 자격 취득 요건 시뮬레이터
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/30 text-primary bg-primary/5">
                  실시간 연동
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                교육 수료(1단계) ➔ 인증 요건(2단계) ➔ SMPCC 레벨 부여(3단계)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Badge
              className={cn(
                "text-xs px-2.5 py-1 font-semibold",
                status.hasActiveCert
                  ? "bg-emerald-600 text-white"
                  : status.isCertEligible
                    ? "bg-purple-600 text-white"
                    : status.isCompletionMet
                      ? "bg-blue-600 text-white"
                      : "bg-amber-600 text-white"
              )}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              {status.hasActiveCert
                ? "SMPCC 자격 취득 완료"
                : status.isCertEligible
                  ? "인증시험 응시 가능"
                  : status.isCompletionMet
                    ? "수료 완료 (인증 준비중)"
                    : "1단계 수료 준비중"}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 sm:p-6 space-y-6">
          {/* ── 3-Stage Visual Pipeline ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {status.stages.map((stage) => {
              const isCompleted = stage.status === "completed";
              const isInProgress = stage.status === "in_progress";

              return (
                <div
                  key={stage.stageNumber}
                  className={cn(
                    "p-3 rounded-xl border transition-all relative overflow-hidden",
                    isCompleted
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                      : isInProgress
                        ? "bg-amber-500/10 border-amber-500/40 text-amber-950 dark:text-amber-200 shadow-xs"
                        : "bg-muted/40 border-border/60 text-muted-foreground opacity-60"
                  )}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold flex items-center gap-1.5">
                      <span className={cn(
                        "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-extrabold",
                        isCompleted
                          ? "bg-emerald-600 text-white"
                          : isInProgress
                            ? "bg-amber-600 text-white"
                            : "bg-muted text-muted-foreground"
                      )}>
                        {stage.stageNumber}
                      </span>
                      {stage.name}
                    </span>
                    {isCompleted ? (
                      <Badge className="text-[10px] px-1.5 h-4.5 bg-emerald-600 text-white">
                        달성 완료
                      </Badge>
                    ) : isInProgress ? (
                      <Badge variant="outline" className="text-[10px] px-1.5 h-4.5 border-amber-600 text-amber-600 animate-pulse">
                        진행중
                      </Badge>
                    ) : (
                      <span className="text-[10px] text-muted-foreground">대기</span>
                    )}
                  </div>
                  <p className="text-[11px] leading-snug line-clamp-2">
                    {stage.label}
                  </p>
                </div>
              );
            })}
          </div>

          {/* ── Core Gauge & 4 Key Cards ── */}
          <div className="flex flex-col md:flex-row items-center gap-5 pt-1">
            {/* Radial Gauge */}
            <div className="flex flex-col items-center gap-2 shrink-0 p-3 rounded-2xl bg-muted/30 border border-border/50">
              <CircularProgressRing
                pct={status.readinessPercentage}
                color={
                  status.readinessPercentage >= 100
                    ? "#10b981"
                    : status.readinessPercentage >= 70
                      ? "#3b82f6"
                      : "#f59e0b"
                }
              />
              <span className="text-xs text-muted-foreground font-semibold">
                총 {status.metCount} / {status.totalCriteriaCount}개 항목 통과
              </span>
            </div>

            {/* 4 Key Pillar Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 flex-1 w-full">
              {/* 1. 세미나 출석 */}
              <button
                type="button"
                onClick={() => navigate("/attendance")}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors text-left flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                      <Calendar className="w-3.5 h-3.5 text-blue-500" />
                      세미나 출석
                    </span>
                    {status.attendanceMet && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {attendanceCriterion?.current ?? 0}%
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress value={attendanceCriterion?.current ?? 0} className="h-1.5" />
                  <span className="text-[10px] text-muted-foreground block truncate">
                    목표 80% (수료 요건)
                  </span>
                </div>
              </button>

              {/* 2. 코칭 실습 */}
              <button
                type="button"
                onClick={() => navigate("/coaching-log")}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors text-left flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                      <ClipboardList className="w-3.5 h-3.5 text-green-500" />
                      코칭 실습
                    </span>
                    {(totalCoachingCriterion?.current ?? 0) >= 20 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {totalCoachingCriterion?.current ?? 0}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 20회</span>
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress
                    value={Math.min(((totalCoachingCriterion?.current ?? 0) / 20) * 100, 100)}
                    className="h-1.5"
                  />
                  <span className="text-[10px] text-muted-foreground block truncate">
                    수료 15회 · 인증 20회
                  </span>
                </div>
              </button>

              {/* 3. 과제 제출 */}
              <button
                type="button"
                onClick={() => navigate("/submissions")}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors text-left flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                      <FileText className="w-3.5 h-3.5 text-purple-500" />
                      과제 제출
                    </span>
                    {assignmentMetCount >= 2 && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {assignmentMetCount}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ 2개</span>
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress value={(assignmentMetCount / 2) * 100} className="h-1.5" />
                  <span className="text-[10px] text-muted-foreground block truncate">
                    독후감 2편 · 에세이 1편
                  </span>
                </div>
              </button>

              {/* 4. 정규 교육시간 */}
              <button
                type="button"
                onClick={() => navigate("/training-history")}
                className="p-3 rounded-xl border border-border/70 bg-card hover:bg-muted/40 transition-colors text-left flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between text-muted-foreground mb-1">
                    <span className="text-[11px] font-medium flex items-center gap-1 group-hover:text-primary transition-colors">
                      <BookOpen className="w-3.5 h-3.5 text-amber-500" />
                      교육시간
                    </span>
                    {status.educationMet && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    )}
                  </div>
                  <p className="text-lg font-bold text-foreground">
                    {status.educationHours}
                    <span className="text-xs font-normal text-muted-foreground ml-1">/ {status.educationRequired}h</span>
                  </p>
                </div>
                <div className="mt-2 space-y-1">
                  <Progress
                    value={Math.min((status.educationHours / status.educationRequired) * 100, 100)}
                    className="h-1.5"
                  />
                  <span className="text-[10px] text-muted-foreground block truncate">
                    정규 기초 교육 인정
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* ── Next Milestone Guide Banner ── */}
          <div className="p-3.5 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <Target className="w-4 h-4" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-foreground break-keep">
                {nextMilestoneText}
              </p>
            </div>

            <Button
              size="sm"
              onClick={() => navigate(nextMilestoneAction)}
              className="text-xs h-8.5 gap-1.5 font-bold shrink-0 self-end sm:self-auto cursor-pointer"
            >
              <span>{nextMilestoneButtonText}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* ── Toggleable Full Checklist ── */}
          <div className="border-t border-border/60 pt-3">
            <button
              type="button"
              onClick={() => setShowDetail(!showDetail)}
              className="w-full flex items-center justify-between text-xs font-semibold text-muted-foreground hover:text-foreground py-1 cursor-pointer transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-primary" />
                전체 10대 세부 자격 요건 충족 표 ({status.metCount}/{status.totalCriteriaCount} 완료)
              </span>
              <div className="flex items-center gap-1 text-[11px] text-primary">
                <span>{showDetail ? "접기" : "자세히 보기"}</span>
                <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", showDetail && "rotate-180")} />
              </div>
            </button>

            <AnimatePresence>
              {showDetail && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden pt-3"
                >
                  <div className="space-y-2.5 rounded-xl border border-border/70 p-3 sm:p-4 bg-muted/20 text-xs">
                    {status.criteria.map((c) => {
                      const pct = Math.min((c.current / c.required) * 100, 100);

                      return (
                        <div
                          key={c.key}
                          className="p-2.5 rounded-lg border border-border/50 bg-card space-y-1.5 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {c.met ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                              )}
                              <span className="font-semibold text-foreground">{c.label}</span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[9px] px-1 py-0",
                                  c.category === "completion"
                                    ? "border-blue-500/40 text-blue-600 bg-blue-500/5"
                                    : c.category === "assignment"
                                      ? "border-purple-500/40 text-purple-600 bg-purple-500/5"
                                      : "border-green-500/40 text-green-600 bg-green-500/5"
                                )}
                              >
                                {c.category === "completion"
                                  ? "수료 요건"
                                  : c.category === "assignment"
                                    ? "필수 과제"
                                    : "인증 실습"}
                              </Badge>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-muted-foreground font-mono">
                                <strong className={c.met ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}>
                                  {c.current}
                                </strong>
                                {" / "}{c.required}{c.unit}
                              </span>
                              {c.met ? (
                                <Badge className="text-[10px] px-1.5 h-4.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30">
                                  달성
                                </Badge>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => c.href && navigate(c.href)}
                                  className="text-[10px] text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                                >
                                  바로가기 <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <Progress
                            value={pct}
                            className={cn("h-1.5", c.met && "[&>div]:bg-emerald-500")}
                          />
                          {c.subLabel && (
                            <p className="text-[11px] text-muted-foreground">
                              {c.subLabel}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
