import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { Authenticated, AuthLoading } from "@/components/providers/convex.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, CheckCircle2, ArrowRight, User, Users, CalendarDays,
  LayoutDashboard, ClipboardList, Heart, TrendingUp, BookOpen,
  GraduationCap, Star, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { ConvexError } from "convex/values";

type Step = "name" | "cohort" | "tour" | "confirm";

const STATUS_LABEL: Record<string, string> = {
  active: "진행중",
  upcoming: "예정",
  completed: "완료",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
};

const TOUR_FEATURES = [
  {
    icon: <LayoutDashboard className="w-6 h-6" />,
    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    title: "대시보드",
    description: "나의 학습 현황, 출석률, 진행 상태를 한눈에 확인할 수 있습니다.",
  },
  {
    icon: <CalendarDays className="w-6 h-6" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    title: "출석 체크",
    description: "세미나 일정을 확인하고 당일 출석을 직접 체크할 수 있습니다.",
  },
  {
    icon: <Heart className="w-6 h-6" />,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    title: "매일 자기 체크인",
    description: "오늘의 컨디션과 학습 의지를 기록하고 호흡 명상으로 마음을 정돈하세요.",
  },
  {
    icon: <ClipboardList className="w-6 h-6" />,
    color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    title: "코칭 실습 기록",
    description: "코칭 실습 내용을 기록하고 슈퍼바이저의 피드백을 받을 수 있습니다.",
  },
  {
    icon: <BookOpen className="w-6 h-6" />,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    title: "교육 이수 기록",
    description: "수강한 교육 내용을 기록하고 이수 현황을 관리할 수 있습니다.",
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    title: "진행 현황",
    description: "SMPCC 인증을 위한 요건 충족 현황을 항목별로 확인할 수 있습니다.",
  },
];

function OnboardingContent() {
  const navigate = useNavigate();
  const { user } = useCurrentUser();
  const [step, setStep] = useState<Step>(user?.name ? "cohort" : "name");
  const [name, setName] = useState(user?.name ?? "");
  const [selectedCohort, setSelectedCohort] = useState<Id<"cohorts"> | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [tourIndex, setTourIndex] = useState(0);

  const updateProfile = useMutation(api.users.updateProfile);
  const setCertificationGoal = useMutation(api.users.setCertificationGoal);
  const requestJoin = useMutation(api.cohorts.requestJoinCohort);
  const cohorts = useQuery(api.cohorts.list, {});

  const sortedCohorts = [...(cohorts ?? [])].sort((a, b) => {
    const order = { active: 0, upcoming: 1, completed: 2 };
    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
  });

  const handleNameNext = () => {
    if (!name.trim()) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    setStep("cohort");
  };

  const handleCohortNext = () => {
    setStep("tour");
  };

  const handleTourNext = () => {
    if (tourIndex < TOUR_FEATURES.length - 1) {
      setTourIndex((i) => i + 1);
    } else {
      setStep("confirm");
    }
  };

  const handleSubmit = async () => {
    setIsPending(true);
    try {
      if (name.trim() && name.trim() !== user?.name) {
        await updateProfile({ name: name.trim() });
      }
      if (selectedCohort) {
        try {
          await requestJoin({ cohortId: selectedCohort });
        } catch (err) {
          if (err instanceof ConvexError) {
            const data = err.data as { message: string };
            toast.error(`기수 등록 오류: ${data.message}`);
          }
        }
      }
      await setCertificationGoal({});
      toast.success(`환영합니다, ${name.trim() || ""}님! SMPCC 과정이 설정되었습니다.`);
      navigate("/dashboard", { replace: true });
    } catch {
      toast.error("설정 중 오류가 발생했습니다.");
    } finally {
      setIsPending(false);
    }
  };

  const stepIndex = { name: 0, cohort: 1, tour: 2, confirm: 3 };
  const STEP_LABELS = ["이름", "기수", "기능 안내", "시작"];
  const current = stepIndex[step];

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {STEP_LABELS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all",
                current === i ? "bg-primary text-primary-foreground shadow-md" :
                current > i ? "bg-primary/30 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {current > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
              </div>
              <span className={cn(
                "text-xs font-medium hidden sm:block",
                current === i ? "text-primary" : "text-muted-foreground"
              )}>{label}</span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={cn("h-0.5 w-10 mb-4 transition-colors", current > i ? "bg-primary" : "bg-border")} />
            )}
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Name */}
        {step === "name" && (
          <motion.div
            key="name"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
              >
                <User className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">환영합니다!</h1>
              <p className="text-muted-foreground">MCCI-SMPCC 멘탈코칭전문가 과정에 오신 것을 환영합니다.<br />시스템에서 사용할 이름을 입력해 주세요.</p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="name" className="text-base font-medium">이름 <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="홍길동"
                className="h-12 text-base"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") handleNameNext(); }}
              />
              <p className="text-xs text-muted-foreground">
                입력한 이름은 대시보드, 보고서, 관리자 화면 등에 표시됩니다.
              </p>
            </div>

            <Button
              className="w-full h-12 text-base font-semibold rounded-xl cursor-pointer"
              disabled={!name.trim()}
              onClick={handleNameNext}
            >
              다음 단계
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Cohort */}
        {step === "cohort" && (
          <motion.div
            key="cohort"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
              >
                <Users className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">기수 선택</h1>
              <p className="text-muted-foreground">
                수강 중인 기수를 선택해 주세요. 나중에 변경할 수 없으니 정확히 선택해 주세요.
              </p>
            </div>

            <div className="space-y-2">
              {cohorts === undefined ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : sortedCohorts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  등록 가능한 기수가 없습니다. 관리자에게 문의해 주세요.
                </p>
              ) : (
                sortedCohorts.map((cohort) => {
                  const isSelected = selectedCohort === cohort._id;
                  return (
                    <button
                      key={cohort._id}
                      onClick={() => setSelectedCohort(cohort._id)}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        {isSelected
                          ? <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                          : <div className="w-5 h-5 rounded-full border-2 border-border flex-shrink-0" />
                        }
                        <div>
                          <p className="font-semibold">{cohort.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {cohort.startDate} ~ {cohort.endDate}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs ml-2 shrink-0", STATUS_COLOR[cohort.status])}>
                        {STATUS_LABEL[cohort.status]}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="h-12 px-6 rounded-xl cursor-pointer" onClick={() => setStep("name")}>
                이전
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold rounded-xl cursor-pointer"
                onClick={handleCohortNext}
              >
                {selectedCohort ? "다음 단계" : "건너뛰기"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Feature Tour */}
        {step === "tour" && (
          <motion.div
            key="tour"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
              >
                <Sparkles className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">주요 기능 안내</h1>
              <p className="text-muted-foreground">MCCI-SMPCC 시스템에서 사용할 수 있는 주요 기능을 소개합니다.</p>
            </div>

            {/* Tour card */}
            <div className="relative overflow-hidden rounded-2xl border bg-card min-h-[220px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={tourIndex}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.25 }}
                  className="p-8 space-y-4"
                >
                  <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", TOUR_FEATURES[tourIndex].color)}>
                    {TOUR_FEATURES[tourIndex].icon}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold">{TOUR_FEATURES[tourIndex].title}</h3>
                    <p className="text-muted-foreground mt-1 leading-relaxed">{TOUR_FEATURES[tourIndex].description}</p>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {TOUR_FEATURES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setTourIndex(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all cursor-pointer",
                      i === tourIndex ? "bg-primary w-5" : "bg-border hover:bg-muted-foreground"
                    )}
                  />
                ))}
              </div>
            </div>

            {/* Feature grid preview */}
            <div className="grid grid-cols-3 gap-2">
              {TOUR_FEATURES.map((f, i) => (
                <button
                  key={i}
                  onClick={() => setTourIndex(i)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all cursor-pointer",
                    i === tourIndex ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
                  )}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", f.color)}>
                    <span className="scale-75">{f.icon}</span>
                  </div>
                  <span className="text-[10px] font-medium leading-tight">{f.title}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="h-12 px-6 rounded-xl cursor-pointer" onClick={() => setStep("cohort")}>
                이전
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold rounded-xl cursor-pointer"
                onClick={handleTourNext}
              >
                {tourIndex < TOUR_FEATURES.length - 1 ? "다음 기능 보기" : "완료 — 시작하기"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Confirm */}
        {step === "confirm" && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-8"
          >
            <div className="text-center space-y-2">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-4"
              >
                <Trophy className="w-8 h-8 text-primary-foreground" />
              </motion.div>
              <h1 className="text-3xl font-bold text-foreground">
                {name ? `${name}님,` : ""} 준비가 되셨나요?
              </h1>
              <p className="text-muted-foreground">SMPCC 멘탈코칭전문가 과정을 시작합니다.</p>
            </div>

            {/* Summary card */}
            <div className="rounded-2xl border-2 border-primary bg-primary/5 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <Star className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xl font-bold text-foreground">SMPCC</p>
                  <p className="text-sm text-muted-foreground mt-0.5">Sports Mental Professional Certified Coach</p>
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-primary/20">
                {name && (
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium">{name}</span>
                  </div>
                )}
                {selectedCohort && sortedCohorts.find((c) => c._id === selectedCohort) && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-primary flex-shrink-0" />
                    <span className="font-medium text-primary">
                      {sortedCohorts.find((c) => c._id === selectedCohort)?.name}
                    </span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-muted-foreground">멘탈코칭 전문가 인증 과정</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="ghost" className="h-12 px-6 rounded-xl cursor-pointer" onClick={() => setStep("tour")}>
                이전
              </Button>
              <Button
                className="flex-1 h-12 text-base font-semibold rounded-xl cursor-pointer"
                disabled={isPending}
                onClick={handleSubmit}
              >
                {isPending ? "저장 중..." : "시작하기"}
                {!isPending && <ArrowRight className="w-4 h-4 ml-2" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header
        className="flex items-center gap-2 px-6 py-4 border-b border-white/10"
        style={{ background: "oklch(0.295 0.165 258)" }}
      >
        <Trophy className="w-5 h-5 text-accent" />
        <span className="font-bold text-white text-sm">MCCI-SMPCC</span>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 bg-background">
        <AuthLoading>
          <Skeleton className="h-96 w-full max-w-2xl" />
        </AuthLoading>
        <Authenticated>
          <OnboardingContent />
        </Authenticated>
      </main>
    </div>
  );
}
