import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button.tsx";

const INHALE_SEC = 3;
const EXHALE_SEC = 6;
const CYCLE_SEC = INHALE_SEC + EXHALE_SEC; // 9초
const TOTAL_SEC = 60; // 1분

type Phase = "inhale" | "exhale";

type BreathingMeditationProps = {
  onComplete: () => void;
  autoStart?: boolean;
};

export default function BreathingMeditation({ onComplete, autoStart = false }: BreathingMeditationProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(autoStart);
  const [started, setStarted] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cyclePos = elapsed % CYCLE_SEC;
  const phase: Phase = cyclePos < INHALE_SEC ? "inhale" : "exhale";
  const phaseElapsed = phase === "inhale" ? cyclePos : cyclePos - INHALE_SEC;
  const phaseDuration = phase === "inhale" ? INHALE_SEC : EXHALE_SEC;
  const remaining = TOTAL_SEC - elapsed;

  // 원 크기: 들이쉬기=100% → 160%, 내쉬기=160% → 100%
  const minSize = 100;
  const maxSize = 160;
  const progress = phaseElapsed / phaseDuration;
  const circleSize =
    phase === "inhale"
      ? minSize + (maxSize - minSize) * progress
      : maxSize - (maxSize - minSize) * progress;

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= TOTAL_SEC) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            return TOTAL_SEC;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (elapsed >= TOTAL_SEC && started) {
      const t = setTimeout(onComplete, 1500);
      return () => clearTimeout(t);
    }
  }, [elapsed, started, onComplete]);

  const handleStart = () => {
    setStarted(true);
    setRunning(true);
    setElapsed(0);
  };

  const handleSkip = () => {
    onComplete();
  };

  const isDone = elapsed >= TOTAL_SEC;
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-8 py-6 select-none">
      {/* 헤더 */}
      <div className="text-center space-y-1">
        <p className="text-lg font-semibold text-foreground">1분 호흡 명상</p>
        <p className="text-sm text-muted-foreground">
          체크인 완료! 잠깐 호흡을 고르며 하루를 시작해 보세요
        </p>
      </div>

      {/* 원 애니메이션 영역 */}
      <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
        {/* 배경 링 */}
        <div className="absolute rounded-full border-2 border-primary/10" style={{ width: 170, height: 170 }} />

        {/* 숨결 원 */}
        <AnimatePresence mode="sync">
          <motion.div
            key={started ? `${phase}-${Math.floor(elapsed / CYCLE_SEC)}` : "idle"}
            className="absolute rounded-full"
            style={{
              width: circleSize,
              height: circleSize,
              background:
                phase === "inhale"
                  ? "radial-gradient(circle, oklch(0.7 0.15 250 / 0.6), oklch(0.55 0.2 250 / 0.85))"
                  : "radial-gradient(circle, oklch(0.7 0.15 200 / 0.5), oklch(0.55 0.18 200 / 0.75))",
              boxShadow:
                phase === "inhale"
                  ? "0 0 30px oklch(0.65 0.18 250 / 0.4)"
                  : "0 0 20px oklch(0.65 0.15 200 / 0.3)",
            }}
            animate={
              started && !isDone
                ? {
                    width: phase === "inhale" ? maxSize : minSize,
                    height: phase === "inhale" ? maxSize : minSize,
                  }
                : {}
            }
            transition={{
              duration: phase === "inhale" ? INHALE_SEC : EXHALE_SEC,
              ease: "easeInOut",
            }}
          />
        </AnimatePresence>

        {/* 중앙 텍스트 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          {!started ? (
            <span className="text-sm text-white/90 font-medium drop-shadow">시작 준비</span>
          ) : isDone ? (
            <span className="text-sm text-white/90 font-medium drop-shadow">완료!</span>
          ) : (
            <>
              <span className="text-base font-bold text-white drop-shadow">
                {phase === "inhale" ? "들이쉬기" : "내쉬기"}
              </span>
              <span className="text-xs text-white/80 drop-shadow mt-0.5">
                {phase === "inhale" ? `${INHALE_SEC - phaseElapsed}초` : `${EXHALE_SEC - phaseElapsed}초`}
              </span>
            </>
          )}
        </div>
      </div>

      {/* 안내 텍스트 */}
      {started && !isDone && (
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-1"
        >
          <p className="text-sm text-muted-foreground">
            {phase === "inhale"
              ? `코로 천천히 들이쉬세요 (${INHALE_SEC}초)`
              : `입으로 천천히 내쉬세요 (${EXHALE_SEC}초)`}
          </p>
          <p className="text-xs text-muted-foreground/60">남은 시간: {formatTime(remaining)}</p>
        </motion.div>
      )}

      {isDone && (
        <motion.p
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-sm font-medium text-primary text-center"
        >
          명상이 완료되었습니다. 오늘도 수고하셨어요!
        </motion.p>
      )}

      {/* 버튼 영역 */}
      {!started && !isDone && (
        <div className="flex flex-col items-center gap-2 w-full max-w-xs">
          <Button onClick={handleStart} className="w-full">
            명상 시작하기
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSkip}>
            건너뛰기
          </Button>
        </div>
      )}

      {started && !isDone && (
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleSkip}>
          건너뛰기
        </Button>
      )}
    </div>
  );
}
