import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  CheckCircle2,
  AlertTriangle,
  CalendarDays,
  Clock,
  MapPin,
  ArrowRight,
  Sparkles,
  RefreshCw,
  LogIn,
  GraduationCap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function QrCheckInLandingPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, isLoading: isUserLoading } = useCurrentUser();

  const seminarIdParam = searchParams.get("seminarId");
  const dateParam = searchParams.get("date");
  const codeParam = searchParams.get("code") || undefined;

  const qrCheckIn = useMutation(api.attendance.qrCheckIn);
  const seminar = useQuery(
    api.attendance.getSeminarForQr,
    seminarIdParam ? { seminarId: seminarIdParam as Id<"seminars"> } : "skip",
  );

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "already" | "error">("idle");
  const [resultData, setResultData] = useState<{
    seminarTitle: string;
    date: string;
    checkedInAt: string;
    userName: string;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (isUserLoading) return;

    if (!user) {
      // User is not logged in
      return;
    }

    if (!seminarIdParam || !dateParam) {
      setStatus("error");
      setErrorMessage("유효하지 않은 출석 QR 링크입니다. 세미나 정보가 누락되었습니다.");
      return;
    }

    const performCheckIn = async () => {
      setStatus("loading");
      try {
        const res = await qrCheckIn({
          seminarId: seminarIdParam as Id<"seminars">,
          date: dateParam,
          code: codeParam,
        });

        setResultData({
          seminarTitle: res.seminarTitle,
          date: res.date,
          checkedInAt: res.checkedInAt,
          userName: res.userName,
        });

        if (res.alreadyCheckedIn) {
          setStatus("already");
        } else {
          setStatus("success");
        }

        // Haptic feedback
        try {
          if (typeof navigator !== "undefined" && "vibrate" in navigator) {
            navigator.vibrate([80, 50, 120]);
          }
        } catch {}
      } catch (err: unknown) {
        setStatus("error");
        let msg = "출석 체크 처리 중 오류가 발생했습니다.";
        if (err instanceof ConvexError) {
          msg = (err.data as { message: string }).message;
        } else if (err instanceof Error) {
          msg = err.message;
        }
        setErrorMessage(msg);
      }
    };

    performCheckIn();
  }, [user, isUserLoading, seminarIdParam, dateParam, codeParam]);

  // Loading user
  if (isUserLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">사용자 정보를 확인하는 중입니다...</p>
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 max-w-md mx-auto text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto shadow-sm">
          <LogIn className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">로그인이 필요합니다</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            세미나 출석을 기록하려면 먼저 Coachingpass에 로그인해 주세요. 로그인 완료 후 출석 체크가 자동으로 진행됩니다.
          </p>
        </div>
        <Button
          onClick={() => {
            const returnUrl = window.location.pathname + window.location.search;
            navigate(`/?returnTo=${encodeURIComponent(returnUrl)}`);
          }}
          className="w-full gap-2 h-11 text-sm font-semibold"
        >
          <LogIn className="w-4 h-4" />
          로그인하러 가기
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[75vh] flex flex-col items-center justify-center p-4 sm:p-6 max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="w-full"
      >
        <Card className="border-border/80 shadow-md overflow-hidden">
          <CardContent className="p-6 sm:p-8 space-y-6 text-center">
            {/* Status 1: Loading */}
            {status === "loading" && (
              <div className="py-8 space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <RefreshCw className="w-8 h-8 animate-spin" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-foreground">세미나 출석 확인 중...</h2>
                  <p className="text-xs text-muted-foreground">
                    QR 코드 유효성을 검증하고 출석을 기록하고 있습니다.
                  </p>
                </div>
              </div>
            )}

            {/* Status 2: Success */}
            {status === "success" && (
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <Sparkles className="w-3.5 h-3.5" />
                    QR 출석 체크 완료
                  </span>
                  <h1 className="text-2xl font-bold text-foreground">
                    출석이 정상 처리되었습니다!
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    {resultData?.userName}님의 출석이 실시간으로 등록되었습니다.
                  </p>
                </div>

                {/* Details box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-primary" />
                      세미나 과정
                    </span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {resultData?.seminarTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-primary" />
                      출석 일자
                    </span>
                    <span className="font-semibold text-foreground">
                      {resultData?.date && format(parseISO(resultData.date), "yyyy.MM.dd (E)", { locale: ko })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      체크 시각
                    </span>
                    <span className="font-semibold text-foreground">
                      {resultData?.checkedInAt &&
                        format(parseISO(resultData.checkedInAt), "HH:mm:ss", { locale: ko })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={() => navigate("/attendance")}
                    className="w-full gap-2 text-xs h-10 font-semibold"
                  >
                    나의 출석 현황 확인
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full text-xs h-10"
                  >
                    대시보드로 가기
                  </Button>
                </div>
              </div>
            )}

            {/* Status 3: Already Checked In */}
            {status === "already" && (
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    이미 완료됨
                  </span>
                  <h1 className="text-2xl font-bold text-foreground">
                    이미 출석 처리되었습니다
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    해당 세미나 일정에 이미 출석 체크가 완료되어 있습니다.
                  </p>
                </div>

                {/* Details box */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border/60 text-left text-xs space-y-2">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">세미나</span>
                    <span className="font-semibold text-foreground truncate max-w-[200px]">
                      {resultData?.seminarTitle}
                    </span>
                  </div>
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-muted-foreground">출석 일자</span>
                    <span className="font-semibold text-foreground">
                      {resultData?.date && format(parseISO(resultData.date), "yyyy.MM.dd (E)", { locale: ko })}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={() => navigate("/attendance")}
                    className="w-full gap-2 text-xs h-10 font-semibold"
                  >
                    나의 출석 현황 확인
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/dashboard")}
                    className="w-full text-xs h-10"
                  >
                    대시보드로 가기
                  </Button>
                </div>
              </div>
            )}

            {/* Status 4: Error */}
            {status === "error" && (
              <div className="space-y-5">
                <div className="w-16 h-16 rounded-2xl bg-destructive/15 text-destructive flex items-center justify-center mx-auto shadow-sm">
                  <AlertTriangle className="w-9 h-9" />
                </div>
                <div className="space-y-1.5">
                  <h1 className="text-xl font-bold text-foreground">
                    출석 체크에 실패했습니다
                  </h1>
                  <p className="text-xs text-muted-foreground leading-relaxed px-2">
                    {errorMessage}
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <Button
                    onClick={() => navigate("/attendance")}
                    className="w-full gap-2 text-xs h-10 font-semibold"
                  >
                    출석 체크 페이지로 이동
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="w-full text-xs h-10"
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
