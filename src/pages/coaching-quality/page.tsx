import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Award,
  Sparkles,
  Target,
  FileText,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Clock,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Compass,
  Zap,
  Lock,
  CheckSquare,
  Square,
  HelpCircle,
  ShieldCheck,
  Flame,
  AlertTriangle,
  Info,
  Trophy,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Users } from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import ScoreTrendCard, { MilestoneMiniTrend } from "./_components/score-trend-card.tsx";

export default function CoachingQualityPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");

  const { user, realUser } = useCurrentUser();
  const activeRole =
    user?.role || realUser?.role || (localStorage.getItem("real_role") as string | null);
  const isAdmin =
    activeRole === "admin" || activeRole === "senior_coach" || activeRole === "admin3";

  const trainees = useQuery(
    api.coachingAnalysis.listTraineesForAnalysis,
    isAdmin ? {} : "skip",
  );

  const effectiveUserId =
    userIdParam ||
    (isAdmin && trainees && trainees.length > 0 ? trainees[0]._id : undefined);

  const report = useQuery(
    api.coachingQuality.getMyCoachingQualityReport,
    effectiveUserId ? { userId: effectiveUserId as any } : {},
  );

  const [mainNavTab, setMainNavTab] = useState<string>("feedback");
  const [milestoneTab, setMilestoneTab] = useState<string>("overall");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);
  const [selectedGuideItem, setSelectedGuideItem] = useState<string>("goal");
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  const toggleCheck = (no: number) => {
    setCheckedItems((prev) => ({ ...prev, [no]: !prev[no] }));
  };

  if (report === undefined) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-44 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const {
    trainee,
    totalLogs,
    currentScores,
    currentGroup,
    personalizedDiagnosis,
    personalizedLeapTip,
    milestones,
    evaluatedLogs,
    narrativeFeedback,
    motivationSection,
    mcciGuide,
    groupLevels,
  } = report;

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const chronologicalLogs = useMemo(() => {
    if (!evaluatedLogs) return [];
    return [...evaluatedLogs].sort((a: any, b: any) => a.index - b.index);
  }, [evaluatedLogs]);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Link to="/admin/coaching-analysis">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>교육생 실습 분석으로</span>
              </Button>
            </Link>
          ) : (
            <Link to="/coaching-log">
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span>실습 목록으로</span>
              </Button>
            </Link>
          )}
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">코칭실습 품질 분석 & AI 피드백</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs py-1">
            {trainee.name} 코치
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-xs py-1">
            누적 실습 {totalLogs}건 분석
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
            onClick={() => setMainNavTab("levels")}
          >
            <Trophy className="w-3.5 h-3.5" />
            <span>3개 그룹 수준 안내</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            onClick={() => setMainNavTab("guide")}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>MCCI 가이드</span>
          </Button>
        </div>
      </div>

      {/* Admin Mode Trainee Selector */}
      {isAdmin && trainees && trainees.length > 0 && (
        <div className="bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 p-3 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <Badge className="bg-purple-600 text-white text-xs">관리자 모드</Badge>
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Users className="w-4 h-4 text-purple-600" />
              분석 대상 교육생 선택:
            </span>
          </div>
          <Select
            value={effectiveUserId ?? ""}
            onValueChange={(val) => setSearchParams({ userId: val })}
          >
            <SelectTrigger className="h-8 text-xs bg-card min-w-[260px]">
              <SelectValue placeholder="교육생을 선택하세요" />
            </SelectTrigger>
            <SelectContent className="max-h-80">
              {trainees.map((t: any) => (
                <SelectItem key={t._id} value={t._id} className="text-xs">
                  {t.name} ({t.cohortName || "기수미정"}) · 실습 {t.totalCount}건 ({t.approvedHours}h)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Hero Header Card: Current Total Score & Group Classification */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-2 border-purple-200 dark:border-purple-800/60 shadow-md bg-gradient-to-br from-purple-50/70 via-card to-indigo-50/40 dark:from-purple-950/20 dark:via-card dark:to-indigo-950/20 overflow-hidden relative">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Left Info */}
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className={`text-xs px-2.5 py-0.5 font-bold ${currentGroup.badgeColor}`}>
                    {currentGroup.name} ({currentGroup.scoreRange}) · {currentGroup.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {totalLogs === 0 ? "실습일지 등록 대기 중" : `총 ${totalLogs}건 누적 통합 평가`}
                  </span>
                </div>

                <div>
                  <h1 className="text-xl md:text-2xl font-black text-foreground tracking-tight flex items-center gap-2">
                    <span>{trainee.name} 코치의 실습 품질 진단</span>
                    <Sparkles className="w-5 h-5 text-purple-600" />
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground mt-1 leading-relaxed">
                    {personalizedDiagnosis || currentGroup.description}
                  </p>
                </div>

                {/* Score Interval & Group Leap Advice */}
                <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-2 text-xs">
                  {currentScores.total >= 80 ? (
                    <div className="flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-200 w-fit">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>{personalizedLeapTip || "최우수 1그룹 달성! 수퍼비전에 즉시 활용 가능한 표준 포트폴리오를 유지하고 있습니다."}</span>
                    </div>
                  ) : currentScores.total >= 65 ? (
                    <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 bg-amber-50/70 dark:bg-amber-950/30 px-3 py-1.5 rounded-lg border border-amber-200 w-fit">
                      <Target className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>
                        {personalizedLeapTip || `1그룹(80점) 도약까지 +${80 - currentScores.total}점 남음 (행동규칙 수립 시 즉시 도약 가능)`}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-rose-800 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/30 px-3 py-1.5 rounded-lg border border-rose-200 w-fit">
                      <Target className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                      <span>
                        {personalizedLeapTip || `2그룹(65점) 진입까지 +${65 - currentScores.total}점 남음 (4단계 구조화 훈련을 통해 단기간 도약 가능)`}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={() => setMainNavTab("levels")}
                    className="text-xs text-purple-700 hover:text-purple-800 font-semibold underline underline-offset-2 ml-1 cursor-pointer w-fit"
                  >
                    3개 그룹 기준 자세히 보기 →
                  </button>
                </div>
              </div>

              {/* Right Score Hero Pill */}
              <div className="flex flex-col items-center justify-center bg-card/90 dark:bg-card/70 border-2 border-purple-300 dark:border-purple-700/80 rounded-2xl p-5 min-w-[200px] shadow-sm text-center">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  수퍼비전 종합 품질 평점
                </span>
                <div className="flex items-baseline justify-center gap-1 mt-1">
                  <span className="text-4xl md:text-5xl font-black text-purple-700 dark:text-purple-400">
                    {currentScores.total}
                  </span>
                  <span className="text-sm font-semibold text-muted-foreground">/ 100점</span>
                </div>
                <div className="w-full mt-2.5">
                  <Progress value={currentScores.total} className="h-2" />
                </div>
                <span className="text-[11px] text-muted-foreground mt-2">
                  {totalLogs >= 1 ? `1~${totalLogs}회차 누적 평점` : "실습 기록 후 산출"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 5-Dimension Score Cards (Each 20 points, Total 100 points) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Target className="w-4 h-4 text-purple-600" />
            수퍼비전 5대 핵심 항목별 품질 점수 (각 20점 만점)
          </h2>
          <button
            onClick={() => setMainNavTab("guide")}
            className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 cursor-pointer"
          >
            <span>MCCI 공식 작성 가이드 기준</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. 완결성 */}
          <Card
            className="shadow-sm border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10 cursor-pointer hover:border-blue-300 transition-colors"
            onClick={() => {
              setMainNavTab("guide");
              setSelectedGuideItem("goal");
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-blue-950 dark:text-blue-300 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  1. 완결성
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-300 text-blue-700">
                  {currentScores.completeness >= 17 ? "우수" : currentScores.completeness >= 13 ? "양호" : "보완"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {currentScores.completeness}
                </span>
                <span className="text-xs text-muted-foreground">/ 20점</span>
              </div>
              <Progress value={(currentScores.completeness / 20) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                5대 항목(목표·내용·통찰·성찰·계획) 누락 여부 및 포트폴리오 일관성
              </p>
            </CardContent>
          </Card>

          {/* 2. 구체성 */}
          <Card
            className="shadow-sm border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10 cursor-pointer hover:border-indigo-300 transition-colors"
            onClick={() => {
              setMainNavTab("guide");
              setSelectedGuideItem("content");
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-indigo-950 dark:text-indigo-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-indigo-600" />
                  2. 구체성
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-indigo-300 text-indigo-700">
                  {currentScores.specificity >= 17 ? "우수" : currentScores.specificity >= 13 ? "양호" : "보완"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-indigo-700 dark:text-indigo-400">
                  {currentScores.specificity}
                </span>
                <span className="text-xs text-muted-foreground">/ 20점</span>
              </div>
              <Progress value={(currentScores.specificity / 20) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                멘탈 도구(VAK, 포스트잇 등), 대화 인용문 및 사실적 맥락 묘사
              </p>
            </CardContent>
          </Card>

          {/* 3. 과정추적 */}
          <Card
            className="shadow-sm border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 cursor-pointer hover:border-slate-400 transition-colors"
            onClick={() => {
              setMainNavTab("guide");
              setSelectedGuideItem("content");
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-300 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-600" />
                  3. 과정추적
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-300 text-slate-700">
                  {currentScores.processTracking >= 17 ? "우수" : currentScores.processTracking >= 13 ? "양호" : "보완"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-800 dark:text-slate-300">
                  {currentScores.processTracking}
                </span>
                <span className="text-xs text-muted-foreground">/ 20점</span>
              </div>
              <Progress value={(currentScores.processTracking / 20) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                [상태➔탐색➔개입➔반응] 4단계 인과 구조화 및 코치 지시 배제
              </p>
            </CardContent>
          </Card>

          {/* 4. 자기성찰 */}
          <Card
            className="shadow-sm border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10 cursor-pointer hover:border-amber-300 transition-colors"
            onClick={() => {
              setMainNavTab("guide");
              setSelectedGuideItem("reflection");
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-950 dark:text-amber-300 flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  4. 자기성찰
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-700">
                  {currentScores.selfReflection >= 17 ? "우수" : currentScores.selfReflection >= 13 ? "양호" : "보완"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-amber-700 dark:text-amber-400">
                  {currentScores.selfReflection}
                </span>
                <span className="text-xs text-muted-foreground">/ 20점</span>
              </div>
              <Progress value={(currentScores.selfReflection / 20) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                코치 자신의 서두름·침묵대기·에고를 객관화하는 메타인지 수준
              </p>
            </CardContent>
          </Card>

          {/* 5. 학습전이 */}
          <Card
            className="shadow-sm border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10 cursor-pointer hover:border-emerald-300 transition-colors"
            onClick={() => {
              setMainNavTab("guide");
              setSelectedGuideItem("actionPlan");
            }}
          >
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-950 dark:text-emerald-300 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                  5. 학습전이
                </span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-emerald-300 text-emerald-700">
                  {currentScores.learningTransfer >= 17 ? "우수" : currentScores.learningTransfer >= 13 ? "양호" : "보완"}
                </Badge>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {currentScores.learningTransfer}
                </span>
                <span className="text-xs text-muted-foreground">/ 20점</span>
              </div>
              <Progress value={(currentScores.learningTransfer / 20) * 100} className="h-1.5" />
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                5-1(고객 과제)과 5-2(코치 행동규칙 Action Rules) 분리 수립
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <Tabs value={mainNavTab} onValueChange={setMainNavTab} className="w-full">
        <TabsList className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto p-1.5 bg-muted/80 rounded-xl">
          <TabsTrigger value="feedback" className="text-xs py-2.5 font-semibold gap-1.5">
            <Award className="w-4 h-4 text-purple-600" />
            <span>AI 진단 & 마일스톤</span>
          </TabsTrigger>
          <TabsTrigger value="levels" className="text-xs py-2.5 font-semibold gap-1.5">
            <Trophy className="w-4 h-4 text-emerald-600" />
            <span>3개 그룹 수준 안내</span>
          </TabsTrigger>
          <TabsTrigger value="guide" className="text-xs py-2.5 font-semibold gap-1.5">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <span>MCCI 공식 작성 가이드</span>
          </TabsTrigger>
          <TabsTrigger value="checklist" className="text-xs py-2.5 font-semibold gap-1.5">
            <CheckSquare className="w-4 h-4 text-emerald-600" />
            <span>5대 자기점검 체크</span>
          </TabsTrigger>
          <TabsTrigger value="motivation" className="text-xs py-2.5 font-semibold gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-600" />
            <span>왜 잘 써야 하는가?</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="text-xs py-2.5 font-semibold gap-1.5">
            <Layers className="w-4 h-4 text-slate-600" />
            <span>회차별 이력 ({totalLogs}건)</span>
          </TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 1: AI 수퍼바이저 종합 진단 & 4대 구간 마일스톤
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="feedback" className="mt-6 space-y-6">
          <Card className="shadow-sm border-purple-100 dark:border-purple-900/30">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                <span className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-purple-600" />
                  MCCI 가이드 기준 수퍼바이저 종합 진단 및 처방
                </span>
                <Badge variant="outline" className={currentGroup.badgeColor}>
                  {currentGroup.name} ({currentScores.total}점)
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                현재까지 등록된 총 {totalLogs}건의 실습일지를 종합 분석한 MCCI 공식 기준 진단입니다.
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5 space-y-5 text-xs">
              {/* General Advice Banner */}
              <div className="rounded-xl bg-purple-50/70 dark:bg-purple-950/20 p-4 border border-purple-200 dark:border-purple-900/40 space-y-1.5">
                <span className="font-bold text-purple-950 dark:text-purple-300 block text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  수퍼바이저 총평 & 처방 제언:
                </span>
                <p className="text-muted-foreground leading-relaxed text-xs md:text-sm">
                  {narrativeFeedback.supervisorAdvice}
                </p>
              </div>

              {/* MCCI Guidelines Direct Reference Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Strengths */}
                <div className="rounded-xl border p-4 bg-emerald-50/30 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-900/40 space-y-2.5">
                  <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5 text-xs md:text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    현재 잘하고 있는 핵심 강점
                  </span>
                  <ul className="space-y-2 pl-4 list-disc text-muted-foreground text-xs">
                    {narrativeFeedback.strengths.map((str: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{str}</li>
                    ))}
                  </ul>
                </div>

                {/* Improvements */}
                <div className="rounded-xl border p-4 bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/40 space-y-2.5">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5 text-xs md:text-sm">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    MCCI 가이드 기준 결정적 보완 과제
                  </span>
                  <ul className="space-y-2 pl-4 list-disc text-muted-foreground text-xs">
                    {narrativeFeedback.improvements.map((imp: string, idx: number) => (
                      <li key={idx} className="leading-relaxed">{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Quick Jump Bar */}
              <div className="bg-muted/40 rounded-xl p-3 border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span className="text-xs text-muted-foreground">
                    1그룹(80점 이상) 도약을 위한 3대 그룹 수준 기준과 작성 가이드를 확인해 보세요.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1"
                    onClick={() => setMainNavTab("levels")}
                  >
                    <Trophy className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3개 그룹 체계 보기</span>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 gap-1"
                    onClick={() => setMainNavTab("guide")}
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>작성 가이드 보기</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Milestone Segments (5회, 10회, 15회, 20회 구간) */}
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                실습 차수별 구간 피드백 리포트 (5 · 10 · 15 · 20회 마일스톤)
              </h2>
              <p className="text-xs text-muted-foreground">
                각 구간(5회 단위)별로 리포트 품질 변화와 구간 맞춤 수퍼비전 진단을 열람할 수 있습니다.
              </p>
            </div>

            {/* 📈 Score Progression Trendline Graph Card */}
            <ScoreTrendCard
              chronologicalLogs={chronologicalLogs}
              milestones={milestones}
              totalLogs={totalLogs}
              selectedMilestoneKey={milestoneTab}
              onSelectMilestone={(key) => setMilestoneTab(key)}
            />

            <Tabs value={milestoneTab} onValueChange={setMilestoneTab} className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 h-auto p-1 bg-muted/60">
                <TabsTrigger value="overall" className="text-xs py-2">
                  📊 전체 누적 ({totalLogs}건)
                </TabsTrigger>
                {milestones.map((m: any) => (
                  <TabsTrigger key={m.key} value={m.key} className="text-xs py-2 flex items-center gap-1">
                    {m.isLocked && <Lock className="w-3 h-3 text-muted-foreground/60" />}
                    {m.title}
                    {m.isCompleted && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                  </TabsTrigger>
                ))}
              </TabsList>

              {/* OVERALL SUB-TAB */}
              <TabsContent value="overall" className="mt-4">
                <Card className="shadow-sm">
                  <CardHeader className="pb-3 border-b">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span>전체 실습 품질 누적 요약 및 마일스톤 비교</span>
                      <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-300 text-xs">
                        총 {totalLogs}건 완료
                      </Badge>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      5회 단위 마일스톤 구간별 평균 점수 변화와 단계별 성장 요약을 확인하세요.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {milestones.map((m: any) => (
                        <div
                          key={m.key}
                          onClick={() => !m.isLocked && setMilestoneTab(m.key)}
                          className={`border rounded-xl p-3 space-y-2 transition-all ${
                            m.isLocked
                              ? "bg-muted/40 opacity-60 border-dashed"
                              : "bg-card hover:border-purple-300 hover:shadow-sm cursor-pointer"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-foreground">{m.title}</span>
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                m.isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : m.isInProgress
                                  ? "bg-purple-50 text-purple-700 border-purple-300"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {m.isCompleted ? "5/5 완료" : m.isInProgress ? `${m.actualCount}/5 진행` : "대기"}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-muted-foreground line-clamp-1">{m.stageName}</p>
                          {!m.isLocked ? (
                            <div className="pt-1 flex items-baseline justify-between border-t">
                              <span className="text-muted-foreground text-[10px]">구간 평점:</span>
                              <span className="text-base font-black text-purple-700 dark:text-purple-400">
                                {m.scores.total}점
                              </span>
                            </div>
                          ) : (
                            <div className="pt-1 text-center text-muted-foreground text-[10px] border-t">
                              {m.minCount}회 작성 시 오픈
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <p className="text-muted-foreground text-[11px]">
                      💡 상단 탭에서 특정 구간(예: 1~5회, 6~10회)을 클릭하시면 해당 구간의 5대 항목별 점수, 회차별 추세선과 심층 수퍼비전 진단 리포트를 열람할 수 있습니다.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SPECIFIC MILESTONE TABS */}
              {milestones.map((m: any) => {
                const segLogs = chronologicalLogs.filter(
                  (item: any) => item.index >= m.minCount && item.index <= m.maxCount
                );
                return (
                  <TabsContent key={m.key} value={m.key} className="mt-4 space-y-4">
                  <Card className="shadow-sm">
                    <CardHeader className="pb-3 border-b">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <span>{m.title} 실습 품질 리포트</span>
                            <Badge
                              variant="outline"
                              className={
                                m.isCompleted
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                                  : m.isInProgress
                                  ? "bg-purple-50 text-purple-700 border-purple-300"
                                  : "bg-muted text-muted-foreground"
                              }
                            >
                              {m.isCompleted
                                ? "구간 작성 완료 (5/5건)"
                                : m.isInProgress
                                ? `구간 진행 중 (${m.actualCount}/5건)`
                                : "아직 도달하지 않음"}
                            </Badge>
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {m.stageName} · {m.focusTheme}
                          </CardDescription>
                        </div>

                        {!m.isLocked && (
                          <div className="flex items-baseline gap-1 bg-muted/40 px-3 py-1.5 rounded-lg border">
                            <span className="text-xs text-muted-foreground">구간 평점:</span>
                            <span className="text-xl font-bold text-purple-700 dark:text-purple-400">
                              {m.scores.total}점
                            </span>
                            <span className="text-xs text-muted-foreground">/ 100점</span>
                          </div>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4 text-xs">
                      {m.isLocked ? (
                        <div className="py-12 text-center space-y-2">
                          <Lock className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                          <p className="font-semibold text-foreground">아직 도달하지 않은 실습 구간입니다.</p>
                          <p className="text-xs text-muted-foreground">
                            실습일지를 {m.minCount}회차 이상 작성하시면 이 구간의 5대 항목 평가와 피드백이 열립니다.
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Segment 5-Scores */}
                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                            <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100">
                              <span className="text-muted-foreground block text-[10px]">1. 완결성</span>
                              <strong className="text-blue-700 text-sm">{m.scores.completeness}점</strong>
                            </div>
                            <div className="bg-indigo-50/50 p-2.5 rounded border border-indigo-100">
                              <span className="text-muted-foreground block text-[10px]">2. 구체성</span>
                              <strong className="text-indigo-700 text-sm">{m.scores.specificity}점</strong>
                            </div>
                            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                              <span className="text-muted-foreground block text-[10px]">3. 과정추적</span>
                              <strong className="text-slate-800 text-sm">{m.scores.processTracking}점</strong>
                            </div>
                            <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100">
                              <span className="text-muted-foreground block text-[10px]">4. 자기성찰</span>
                              <strong className="text-amber-700 text-sm">{m.scores.selfReflection}점</strong>
                            </div>
                            <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                              <span className="text-muted-foreground block text-[10px]">5. 학습전이</span>
                              <strong className="text-emerald-700 text-sm">{m.scores.learningTransfer}점</strong>
                            </div>
                          </div>

                          {/* Mini Trendline for this milestone segment */}
                          {segLogs.length > 0 && (
                            <MilestoneMiniTrend
                              logs={segLogs}
                              milestoneTitle={m.title}
                            />
                          )}

                          {/* Segment Narrative Feedback */}
                          <div className="space-y-3 pt-2">
                            <div className="rounded-lg bg-muted/40 p-3 border space-y-1">
                              <span className="font-semibold text-foreground block">
                                📌 {m.title} 종합 평맥:
                              </span>
                              <p className="text-muted-foreground leading-relaxed">
                                {m.narrative.summary}
                              </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div className="p-3 rounded-lg border bg-emerald-50/20 border-emerald-200 dark:border-emerald-900/30">
                                <span className="font-semibold text-emerald-800 dark:text-emerald-300 block mb-1">
                                  ✨ 구간 주요 강점
                                </span>
                                <p className="text-muted-foreground leading-relaxed">
                                  {m.narrative.keyStrengths}
                                </p>
                              </div>
                              <div className="p-3 rounded-lg border bg-amber-50/20 border-amber-200 dark:border-amber-900/30">
                                <span className="font-semibold text-amber-800 dark:text-amber-300 block mb-1">
                                  🎯 구간 핵심 개선점 (MCCI 기준)
                                </span>
                                <p className="text-muted-foreground leading-relaxed">
                                  {m.narrative.criticalImprovement}
                                </p>
                              </div>
                            </div>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              );
            })}
            </Tabs>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 2: 3개 점수 구간 및 그룹 수준 안내 (1그룹 · 2그룹 · 3그룹)
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="levels" className="mt-6 space-y-6">
          <Card className="border-2 border-emerald-200 dark:border-emerald-900/60 shadow-md bg-gradient-to-br from-emerald-50/50 via-card to-indigo-50/30 dark:from-emerald-950/20 dark:via-card dark:to-indigo-950/20">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-emerald-600" />
                    <CardTitle className="text-base md:text-lg font-black text-foreground">
                      MCCI 코칭실습 리포트 3개 그룹 수준 체계표
                    </CardTitle>
                  </div>
                  <CardDescription className="text-xs">
                    코치가 작성한 실습일지의 5대 항목 품질 점수에 따라 3개 그룹으로 분류되며, 수퍼비전 활용도와 성장 로드맵을 정의합니다.
                  </CardDescription>
                </div>

                <Badge variant="outline" className={`text-xs px-3 py-1 font-bold ${currentGroup.badgeColor}`}>
                  현재 나의 위치: {currentGroup.name} ({currentScores.total}점)
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* 3 Group Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(groupLevels || []).map((lvl: any) => {
                  const isCurrent = currentGroup.groupNumber === lvl.groupNumber;
                  return (
                    <div
                      key={lvl.groupNumber}
                      className={`rounded-2xl border-2 p-5 space-y-3 relative transition-all ${
                        isCurrent
                          ? "border-purple-500 shadow-md ring-2 ring-purple-400/40 bg-card"
                          : `${lvl.borderColor} ${lvl.bgLight} bg-card/60`
                      }`}
                    >
                      {/* Current User Badge */}
                      {isCurrent && (
                        <div className="absolute -top-3 right-4 bg-purple-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                          <span>📍 현재 나의 수준</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className={`text-xs font-bold px-2 py-0.5 ${lvl.badgeColor}`}>
                          {lvl.name} ({lvl.scoreRange})
                        </Badge>
                        <span className="text-xs font-black text-foreground">{lvl.scoreRange}</span>
                      </div>

                      <div>
                        <h3 className="font-bold text-foreground text-sm leading-snug">{lvl.label}</h3>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {lvl.description}
                        </p>
                      </div>

                      {/* Characteristics */}
                      <div className="space-y-1.5 pt-2 border-t text-xs">
                        <span className="font-semibold text-foreground block text-[11px]">
                          📌 주요 리포트 특징:
                        </span>
                        <ul className="space-y-1 pl-4 list-disc text-muted-foreground text-[11px]">
                          {lvl.characteristics.map((c: string, idx: number) => (
                            <li key={idx} className="leading-relaxed">{c}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Prescription */}
                      <div className="pt-2 border-t text-xs space-y-1 bg-card/60 p-2.5 rounded-lg border">
                        <span className="font-bold text-foreground text-[11px] block flex items-center gap-1">
                          <Target className="w-3.5 h-3.5 text-purple-600" />
                          도약 및 유지 처방:
                        </span>
                        <p className="text-muted-foreground text-[11px] leading-relaxed">
                          {lvl.prescription}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 5-Dimension Comparison Matrix Table */}
              <Card className="border shadow-none">
                <CardHeader className="py-3 px-4 bg-muted/40 border-b">
                  <CardTitle className="text-xs md:text-sm font-bold flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-600" />
                    수퍼비전 5대 항목별 그룹 수준 비교표
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0 text-xs overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[600px]">
                    <thead>
                      <tr className="border-b bg-muted/20 text-[11px] text-muted-foreground">
                        <th className="p-3 w-1/5 font-semibold">평가 항목</th>
                        <th className="p-3 w-1/4 font-semibold text-emerald-800 dark:text-emerald-300 bg-emerald-50/30">
                          1그룹 (80점 이상 · 우수 표준)
                        </th>
                        <th className="p-3 w-1/4 font-semibold text-amber-800 dark:text-amber-300 bg-amber-50/30">
                          2그룹 (65~79점 · 보완 필요)
                        </th>
                        <th className="p-3 w-1/4 font-semibold text-rose-800 dark:text-rose-300 bg-rose-50/30">
                          3그룹 (64점 이하 · 훈련 필요)
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-[11px]">
                      <tr>
                        <td className="p-3 font-semibold text-foreground bg-muted/10">1. 완결성 (20점)</td>
                        <td className="p-3 text-muted-foreground bg-emerald-50/10">
                          5대 항목 누락 없이 전 회차에 걸쳐 균일하고 충실하게 작성
                        </td>
                        <td className="p-3 text-muted-foreground bg-amber-50/10">
                          작성한 부분의 질은 높으나 일부 사례에서 미기재 항목 발생
                        </td>
                        <td className="p-3 text-muted-foreground bg-rose-50/10">
                          미기재 항목이 많아 포트폴리오의 일관성과 신뢰도가 낮음
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-foreground bg-muted/10">2. 구체성 (20점)</td>
                        <td className="p-3 text-muted-foreground bg-emerald-50/10">
                          포스트잇, VAK 등 도구 선택 이유, 대화 인용(" "), 시간/수치 묘사
                        </td>
                        <td className="p-3 text-muted-foreground bg-amber-50/10">
                          현장 경험은 솔직하나 도구 사용 맥락이나 고객 반응 묘사 부족
                        </td>
                        <td className="p-3 text-muted-foreground bg-rose-50/10">
                          단순 도구 명칭만 나열하거나 지나치게 축약되어 맥락 파악 불가
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-foreground bg-muted/10">3. 과정추적 (20점)</td>
                        <td className="p-3 text-muted-foreground bg-emerald-50/10">
                          [상태 ➔ 탐색 ➔ 개입 ➔ 반응] 4단계 인과 흐름이 선명하게 연결
                        </td>
                        <td className="p-3 text-muted-foreground bg-amber-50/10">
                          진행 과정은 보이나 고객 반응과 코치 개입의 인과적 구분이 약함
                        </td>
                        <td className="p-3 text-muted-foreground bg-rose-50/10">
                          코치의 주관적 판단/지시와 고객 발견이 혼재되어 상호작용 불명확
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-foreground bg-muted/10">4. 자기성찰 (20점)</td>
                        <td className="p-3 text-muted-foreground bg-emerald-50/10">
                          서두름, 조급함, 침묵 대기 여부, 에고를 정직하게 직시하는 메타인지
                        </td>
                        <td className="p-3 text-muted-foreground bg-amber-50/10">
                          솔직성은 우수하나 단순 감상이나 고객 분석으로 이동하는 경향
                        </td>
                        <td className="p-3 text-muted-foreground bg-rose-50/10">
                          단순 소감("코칭은 좋다")에 그치거나 세션 어려움을 고객 탓으로 돌림
                        </td>
                      </tr>
                      <tr>
                        <td className="p-3 font-semibold text-foreground bg-muted/10">5. 학습전이 (20점)</td>
                        <td className="p-3 text-muted-foreground bg-emerald-50/10">
                          5-1(고객 과제)과 5-2(코치 행동규칙 Action Rules)를 명확히 분리
                        </td>
                        <td className="p-3 text-muted-foreground bg-amber-50/10">
                          고객 과제만 적고 코치 자신의 다음 실습 개입 규칙이 일부 누락됨
                        </td>
                        <td className="p-3 text-muted-foreground bg-rose-50/10">
                          다음 적용계획이 미기재되었거나 막연한 결심에 그쳐 실행력 부족
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </CardContent>
              </Card>

              {/* Roadmap: How to Climb Up */}
              <div className="rounded-xl border p-4 bg-muted/30 space-y-3">
                <span className="font-bold text-foreground text-xs md:text-sm flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  그룹 단계별 도약 전략 (Roadmap to Group 1)
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="font-bold text-amber-700 block">
                      🚀 3그룹 ➔ 2그룹 도약 (65점 달성):
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      5대 항목(목표·내용·통찰·성찰·계획)에 빈칸을 남기지 않고, 코칭 내용을 단순 도구 이름이 아닌 [고객 상태 ➔ 탐색 ➔ 개입 ➔ 반응] 4단계 흐름으로 기록하는 훈련만으로도 즉시 65점 이상으로 진입할 수 있습니다.
                    </p>
                  </div>
                  <div className="p-3 rounded-lg border bg-card space-y-1">
                    <span className="font-bold text-emerald-700 block">
                      🏆 2그룹 ➔ 1그룹 도약 (80점 우수 표준 달성):
                    </span>
                    <p className="text-muted-foreground leading-relaxed text-[11px]">
                      고객 통찰을 기존 문제 반복이 아닌 '고객의 실제 깨달음 발화'로 채우고, 다음 적용 계획에 고객 과제(5-1) 외에 <strong>'코치 자신이 실천할 1가지 행동 규칙(5-2 Action Rule, 예: 3초 침묵 기다리기)'</strong>을 분리해 작성하면 80점 이상의 최우수 리포트가 완성됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 3: MCCI 공식 5대 항목 작성 가이드 & 모범·주의 예시 (13페이지 가이드 전문)
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="guide" className="mt-6 space-y-6">
          {/* Guide Header Banner */}
          <Card className="border-2 border-blue-200 dark:border-blue-900/60 shadow-md bg-gradient-to-br from-blue-50/60 via-card to-indigo-50/30 dark:from-blue-950/20 dark:via-card dark:to-indigo-950/20">
            <CardContent className="pt-6 pb-6 space-y-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-600 text-white text-xs">
                  {mcciGuide?.organization || "국제멘탈코칭센터 (MCCI)"}
                </Badge>
                <span className="text-xs text-muted-foreground">공식 실습 리포트 작성 표준 매뉴얼</span>
              </div>
              <h2 className="text-lg md:text-xl font-black text-foreground">
                {mcciGuide?.title || "MCCI 코칭실습 리포트 5개 항목별 작성 가이드"}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground leading-relaxed">
                {mcciGuide?.philosophy ||
                  "코칭실습 리포트는 단순한 과제 제출이나 대화 녹취록이 아닙니다. 코치가 자신의 무의식적 세션 수행을 객관화(메타성찰)하고, 다음 세션의 질을 높이기 위한 자기 수퍼비전 도구입니다."}
              </p>
            </CardContent>
          </Card>

          {/* 5-Dimension Continuity Principle (유기적 연결성 다이어그램) */}
          <Card className="shadow-sm border-purple-100 dark:border-purple-900/30">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                {mcciGuide?.continuityPrinciple.title || "5개 항목의 유기적 연결성 (Organic Flow)"}
              </CardTitle>
              <CardDescription className="text-xs">
                {mcciGuide?.continuityPrinciple.description ||
                  "좋은 코칭 리포트는 5개 항목이 각각 따로 노는 것이 아니라 하나의 스토리라인으로 일관되게 관통됩니다."}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {/* Flow Steps */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                {(mcciGuide?.continuityPrinciple.flow || []).map((step: any, i: number) => (
                  <div
                    key={i}
                    className="p-3 rounded-lg border bg-card text-center space-y-1 relative shadow-sm"
                  >
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {step.step}
                    </Badge>
                    <span className="font-bold text-purple-700 dark:text-purple-400 block text-xs">
                      {step.label}
                    </span>
                    <p className="text-[11px] text-muted-foreground leading-snug">
                      {step.question}
                    </p>
                  </div>
                ))}
              </div>

              {/* Continuity Caution Alert */}
              <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3 border border-amber-200 dark:border-amber-900/40 flex items-start gap-2 text-xs text-amber-950 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  <strong>⚠️ 연결성 주의사항: </strong>
                  {mcciGuide?.continuityPrinciple.caution}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 5-Item Deep Dive with Item Navigation */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-600" />
                5대 항목별 상세 가이드 및 모범 예시 (클릭하여 항목 선택)
              </h3>
            </div>

            {/* Quick Item Nav Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
              {(mcciGuide?.items || []).map((item: any) => (
                <Button
                  key={item.id}
                  variant={selectedGuideItem === item.id ? "default" : "outline"}
                  size="sm"
                  className={`text-xs h-9 justify-start gap-1.5 ${
                    selectedGuideItem === item.id ? "bg-purple-600 text-white font-bold" : ""
                  }`}
                  onClick={() => setSelectedGuideItem(item.id)}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 text-center text-[10px] leading-4 flex-shrink-0">
                    {item.itemNumber}
                  </span>
                  <span className="truncate">{item.name}</span>
                </Button>
              ))}
            </div>

            {/* Active Selected Guide Item Card */}
            {(mcciGuide?.items || [])
              .filter((item: any) => item.id === selectedGuideItem)
              .map((item: any) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="border-2 border-purple-200 dark:border-purple-800/60 shadow-sm overflow-hidden">
                    <CardHeader className="bg-purple-50/50 dark:bg-purple-950/20 pb-3 border-b">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                            {item.itemNumber}
                          </span>
                          <div>
                            <CardTitle className="text-base font-bold text-foreground">
                              {item.name} <span className="text-xs text-muted-foreground font-normal">({item.englishName})</span>
                            </CardTitle>
                            <CardDescription className="text-xs text-purple-900 dark:text-purple-300 font-medium">
                              핵심 역할: {item.coreRole}
                            </CardDescription>
                          </div>
                        </div>

                        {item.itemNumber === 5 && (
                          <Badge className="bg-amber-500 text-white text-xs font-bold animate-pulse">
                            ★ 5-1 & 5-2 분리 필수
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4 space-y-4 text-xs">
                      {/* Key Questions */}
                      <div className="bg-muted/40 p-3 rounded-lg border space-y-1">
                        <span className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <HelpCircle className="w-3.5 h-3.5 text-blue-600" />
                          작성 시 스스로에게 던져야 할 핵심 질문:
                        </span>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground text-xs">
                          {item.keyQuestions.map((q: string, idx: number) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Item 5 Special Callout */}
                      {item.itemNumber === 5 && (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50/40 dark:bg-amber-950/20 p-4 space-y-2">
                          <span className="font-bold text-amber-950 dark:text-amber-200 text-sm flex items-center gap-1.5">
                            <Flame className="w-4 h-4 text-amber-600" />
                            가이드의 핵심 원칙: 고객 실행계획(5-1)과 코치 행동규칙(5-2)의 완전 분리
                          </span>
                          <p className="text-xs text-muted-foreground leading-relaxed">
                            초보 코치의 80%가 다음 적용 계획에 고객의 과제(매일 달리기 등)만 적고 코치 자신의 적용 계획을 빠뜨립니다. MCCI 표준 리포트는 <strong>5-1(고객 과제)</strong>과 <strong>5-2(코치 다음 실습 행동규칙 Action Rules)</strong>를 반드시 둘 다 기재해야 80점 이상의 고득점을 획득합니다.
                          </p>
                        </div>
                      )}

                      {/* Bad vs Good Comparison Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* BAD EXAMPLE */}
                        <div className="rounded-xl border-2 border-rose-200 dark:border-rose-900/50 bg-rose-50/30 dark:bg-rose-950/10 p-4 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center">
                              ✕
                            </span>
                            <span className="font-bold text-rose-900 dark:text-rose-300 text-xs">
                              피해야 할 작성 예 (부족한 예)
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {item.badExample.description}
                          </p>
                          <div className="p-2.5 rounded bg-card/90 border border-rose-200 text-rose-950 dark:text-rose-200 font-mono text-xs whitespace-pre-wrap">
                            {item.badExample.exampleText}
                          </div>
                          <div className="text-[11px] text-rose-800 dark:text-rose-400 leading-snug">
                            <strong>감점 이유:</strong> {item.badExample.whyBad}
                          </div>
                        </div>

                        {/* GOOD EXAMPLE */}
                        <div className="rounded-xl border-2 border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/30 dark:bg-emerald-950/10 p-4 space-y-2">
                          <div className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center">
                              ✓
                            </span>
                            <span className="font-bold text-emerald-900 dark:text-emerald-300 text-xs">
                              좋은 작성 예 (모범 리포트)
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground font-medium">
                            {item.goodExample.description}
                          </p>
                          <div className="p-2.5 rounded bg-card/90 border border-emerald-200 text-emerald-950 dark:text-emerald-200 font-mono text-xs whitespace-pre-wrap">
                            {item.goodExample.exampleText}
                          </div>
                          <div className="text-[11px] text-emerald-800 dark:text-emerald-400 leading-snug">
                            <strong>수퍼비전 가치:</strong> {item.goodExample.whyGood}
                          </div>
                        </div>
                      </div>

                      {/* Special Tips */}
                      {item.specialTips?.length > 0 && (
                        <div className="rounded-lg bg-blue-50/40 dark:bg-blue-950/20 p-3 border border-blue-200 dark:border-blue-900/30 flex items-start gap-2">
                          <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                          <div className="text-xs text-blue-950 dark:text-blue-300 space-y-1">
                            <span className="font-bold block">💡 실무 작성 팁:</span>
                            {item.specialTips.map((tip: string, idx: number) => (
                              <p key={idx} className="leading-relaxed">{tip}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 4: 작성 완료 전 5대 자기점검 체크리스트
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="checklist" className="mt-6 space-y-6">
          <Card className="border-2 border-emerald-200 dark:border-emerald-900/60 shadow-md">
            <CardHeader className="pb-3 border-b bg-emerald-50/40 dark:bg-emerald-950/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    {mcciGuide?.selfChecklist.title || "작성 완료 전 5대 자기점검 체크리스트"}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    {mcciGuide?.selfChecklist.subtitle ||
                      "리포트를 최종 제출하기 전, 다음 5가지 질문에 '그렇다'라고 답할 수 있는지 확인하세요."}
                  </CardDescription>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs font-semibold px-2.5 py-1">
                    점검 완료: {checkedCount} / 5개
                  </Badge>
                  {checkedCount === 5 && (
                    <Badge className="bg-emerald-600 text-white text-xs font-bold animate-bounce">
                      완벽합니다! 🎉
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-5 space-y-4">
              <div className="space-y-3">
                {(mcciGuide?.selfChecklist.questions || []).map((q: any) => {
                  const isChecked = !!checkedItems[q.no];
                  return (
                    <div
                      key={q.no}
                      onClick={() => toggleCheck(q.no)}
                      className={`p-4 rounded-xl border-2 transition-all cursor-pointer flex items-start gap-3.5 ${
                        isChecked
                          ? "bg-emerald-50/50 border-emerald-400 dark:bg-emerald-950/20"
                          : "bg-card border-border hover:border-emerald-300"
                      }`}
                    >
                      <button
                        type="button"
                        className="mt-0.5 text-emerald-600 flex-shrink-0"
                      >
                        {isChecked ? (
                          <CheckSquare className="w-5 h-5" />
                        ) : (
                          <Square className="w-5 h-5 text-muted-foreground" />
                        )}
                      </button>

                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center justify-center">
                            {q.no}
                          </span>
                          <span className={`text-sm font-bold ${isChecked ? "text-emerald-950 dark:text-emerald-200 line-through opacity-80" : "text-foreground"}`}>
                            {q.question}
                          </span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                            점검 대상: {q.targetItem}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed pl-7">
                          💡 <strong>확인 팁:</strong> {q.tip}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Checklist Action Footer */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setCheckedItems({})}
                >
                  체크 초기화
                </Button>

                <Link to="/coaching-log">
                  <Button size="sm" className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1">
                    <span>실습일지 작성하러 가기</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 5: 왜 실습일지를 잘 작성해야 하는가? (동기부여 4대 기둥)
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="motivation" className="mt-6 space-y-6">
          <Card className="border-2 border-amber-200 dark:border-amber-800/60 shadow-sm bg-gradient-to-br from-amber-50/50 via-card to-orange-50/30 dark:from-amber-950/20 dark:via-card dark:to-orange-950/20">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-600" />
                <CardTitle className="text-base font-black text-foreground">
                  {motivationSection.title}
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                {motivationSection.subtitle}
              </CardDescription>
            </CardHeader>

            <CardContent className="pt-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {motivationSection.pillars.map((pillar: any) => (
                  <div
                    key={pillar.no}
                    className="rounded-xl border p-4 bg-card/90 space-y-2 hover:border-amber-300 transition-colors shadow-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 font-bold text-xs flex items-center justify-center">
                        {pillar.no}
                      </span>
                      <h3 className="font-bold text-foreground text-xs md:text-sm">{pillar.title}</h3>
                    </div>
                    <p className="font-semibold text-amber-900 dark:text-amber-400 text-xs">
                      {pillar.summary}
                    </p>
                    <p className="text-muted-foreground text-xs leading-relaxed">
                      {pillar.detail}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ══════════════════════════════════════════════════════════════════════════
            TAB 6: 회차별 실습 리포트 품질 평가 이력 (1건, 2건, ... N건 누적 추이)
           ══════════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="history" className="mt-6 space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-purple-600" />
                    회차별 실습 리포트 품질 평가 이력 ({evaluatedLogs.length}건)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    개별 일지 클릭 시 5대 항목 평가 점수와 해당 건에 대한 MCCI 맞춤 처방 제언을 열람할 수 있습니다.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-2">
              {evaluatedLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  아직 등록된 코칭 실습일지가 없습니다. 실습 기록을 작성해 보세요!
                </p>
              ) : (
                <div className="divide-y text-xs">
                  {evaluatedLogs.map((item: any) => (
                    <div
                      key={item.log.id}
                      className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 px-2 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setSelectedLog(item)}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <span className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 font-bold text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          #{item.index}
                        </span>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {item.log.typeLabel}
                            </Badge>
                            <span className="font-semibold text-foreground text-sm line-clamp-1">
                              {item.log.topic}
                            </span>
                            {item.log.partner && (
                              <span className="text-[11px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                                파트너: {item.log.partner}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground text-[11px]">
                            <span>{item.log.date}</span>
                            <span>·</span>
                            <span>실습 {item.log.durationMinutes}분</span>
                            <span>·</span>
                            <span className="text-purple-600 font-medium">
                              해당 회차까지 누적 평점: {item.cumulativeScore.total}점
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right Score Pill */}
                      <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                        <div className="text-right">
                          <span className="text-xs font-bold text-foreground">
                            단일 건 {item.score.total}점
                          </span>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>완결 {item.score.completeness}</span>
                            <span>구체 {item.score.specificity}</span>
                            <span>과정 {item.score.processTracking}</span>
                            <span>성찰 {item.score.selfReflection}</span>
                            <span>전이 {item.score.learningTransfer}</span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Individual Log Detail Modal with MCCI Prescriptions */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selectedLog && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{selectedLog.index}회차 · {selectedLog.log.typeLabel}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{selectedLog.log.date}</span>
                  </div>
                  <Badge className="bg-purple-600 text-white text-xs">
                    단일 건 점수: {selectedLog.score.total}점
                  </Badge>
                </div>
                <DialogTitle className="text-base font-bold pt-1">{selectedLog.log.topic}</DialogTitle>
                <DialogDescription className="text-xs">
                  {selectedLog.index}회차 실습일지 5대 항목 평가 및 MCCI 가이드 처방문입니다.
                </DialogDescription>
              </DialogHeader>

              {/* 5 Scores Ribbon */}
              <div className="grid grid-cols-5 gap-1.5 text-center text-xs bg-muted/40 p-2.5 rounded-lg border">
                <div>
                  <span className="text-muted-foreground block text-[10px]">완결성</span>
                  <strong className="text-blue-700">{selectedLog.score.completeness}/20</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">구체성</span>
                  <strong className="text-indigo-700">{selectedLog.score.specificity}/20</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">과정추적</span>
                  <strong className="text-slate-800">{selectedLog.score.processTracking}/20</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">자기성찰</span>
                  <strong className="text-amber-700">{selectedLog.score.selfReflection}/20</strong>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">학습전이</span>
                  <strong className="text-emerald-700">{selectedLog.score.learningTransfer}/20</strong>
                </div>
              </div>

              {/* MCCI Custom Prescriptions for this log */}
              {selectedLog.score.prescriptions && selectedLog.score.prescriptions.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/40 dark:bg-amber-950/20 p-3.5 space-y-2 text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    이 일지에 대한 MCCI 가이드 기반 맞춤 처방 제언
                  </span>
                  <div className="space-y-1.5">
                    {selectedLog.score.prescriptions.map((p: any, idx: number) => (
                      <div key={idx} className="flex items-start gap-2 bg-card/80 p-2 rounded border border-amber-100">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 flex-shrink-0 text-amber-800 border-amber-300">
                          {p.dimension} · {p.guideClause}
                        </Badge>
                        <p className="text-muted-foreground text-xs leading-relaxed">
                          {p.advice}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 5 Original Fields */}
              <div className="space-y-2.5 text-xs border-t pt-3">
                <div className="bg-blue-50/50 p-2.5 rounded border border-blue-100">
                  <span className="font-semibold text-blue-900 block mb-0.5">1. 코칭 목표:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedLog.log.coachingGoal || "(미기재)"}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
                  <span className="font-semibold text-slate-800 block mb-0.5">2. 코칭 내용 요약:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedLog.log.coachingContent || "(미기재)"}</p>
                </div>
                <div className="bg-amber-50/50 p-2.5 rounded border border-amber-100">
                  <span className="font-semibold text-amber-900 block mb-0.5">3. 고객 통찰 및 깨달음:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedLog.log.clientInsight || "(미기재)"}</p>
                </div>
                <div className="bg-purple-50/50 p-2.5 rounded border border-purple-100">
                  <span className="font-semibold text-purple-900 block mb-0.5">4. 코치로서의 성찰 및 배움:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedLog.log.coachReflection || "(미기재)"}</p>
                </div>
                <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100">
                  <span className="font-semibold text-emerald-900 block mb-0.5">5. 다음 코칭 적용 계획:</span>
                  <p className="text-muted-foreground whitespace-pre-wrap">{selectedLog.log.actionPlan || "(미기재)"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
