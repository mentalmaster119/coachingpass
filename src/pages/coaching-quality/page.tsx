import { useState } from "react";
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
  HelpCircle,
  Calendar,
  Layers,
  Clock,
  ArrowLeft,
  ChevronRight,
  BookOpen,
  Compass,
  Zap,
  Lock,
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

export default function CoachingQualityPage() {
  const [searchParams] = useSearchParams();
  const userIdParam = searchParams.get("userId");
  const report = useQuery(
    api.coachingQuality.getMyCoachingQualityReport,
    userIdParam ? { userId: userIdParam as any } : {},
  );

  const [activeTab, setActiveTab] = useState<string>("overall");
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

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
    milestones,
    evaluatedLogs,
    narrativeFeedback,
    motivationSection,
  } = report;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4">
        <div className="flex items-center gap-2">
          <Link to="/coaching-log">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
              <span>실습 목록으로</span>
            </Button>
          </Link>
          <span className="text-muted-foreground">/</span>
          <span className="text-xs font-semibold text-foreground">코칭실습 품질 분석 & AI 피드백</span>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-1">
            {trainee.name} 코치
          </Badge>
          <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300 text-xs py-1">
            누적 실습 {totalLogs}건 분석
          </Badge>
        </div>
      </div>

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
                    {currentGroup.name} · {currentGroup.label}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {totalLogs === 0 ? "실습일지 등록 대기 중" : `총 ${totalLogs}건 누적 통합 평가`}
                  </span>
                </div>

                <div className="space-y-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold text-foreground tracking-tight flex items-center gap-2.5">
                    <Sparkles className="w-6 h-6 text-purple-600 inline" />
                    코칭실습 품질 진단 리포트
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-2xl">
                    {currentGroup.description}
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    수퍼비전 5대 핵심 지표 표준 채점 (완결성·구체성·과정추적·자기성찰·학습전이)
                  </span>
                </div>
              </div>

              {/* Right Big Score Gauge */}
              <div className="flex flex-col items-center justify-center p-4 bg-white/80 dark:bg-slate-900/80 rounded-2xl border shadow-sm min-w-[180px]">
                <span className="text-xs font-semibold text-muted-foreground mb-1">내 실습 품질 종합 점수</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl md:text-5xl font-black text-purple-700 dark:text-purple-400">
                    {currentScores.total}
                  </span>
                  <span className="text-base text-muted-foreground font-semibold">/ 100점</span>
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
          <span className="text-xs text-muted-foreground">현재 누적 평균</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. 완결성 */}
          <Card className="shadow-sm border-blue-100 dark:border-blue-900/30 bg-blue-50/20 dark:bg-blue-950/10">
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
                5대 항목(목표·내용·통찰·성찰·계획) 누락 여부 및 작성 일관성
              </p>
            </CardContent>
          </Card>

          {/* 2. 구체성 */}
          <Card className="shadow-sm border-indigo-100 dark:border-indigo-900/30 bg-indigo-50/20 dark:bg-indigo-950/10">
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
                멘탈 도구(VAK, 포스트잇 등), 대화 인용문 및 사실적 묘사
              </p>
            </CardContent>
          </Card>

          {/* 3. 과정추적 */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20">
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
                관찰-판단-개입-반응의 인과적 구조화 및 코치 지시 혼재 배제
              </p>
            </CardContent>
          </Card>

          {/* 4. 자기성찰 */}
          <Card className="shadow-sm border-amber-100 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10">
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
                코치 자신의 개입·성급함·실패를 객관화하는 메타인지 수준
              </p>
            </CardContent>
          </Card>

          {/* 5. 학습전이 */}
          <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/20 dark:bg-emerald-950/10">
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
                '다음 적용 계획'에 고객 과제 대신 코치 자신의 행동규칙 수립
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Milestone Segment Reports (5건, 10건, 15건, 20건 구간 열람) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              실습 차수별 구간 피드백 리포트 (5 · 10 · 15 · 20회 마일스톤)
            </h2>
            <p className="text-xs text-muted-foreground">
              각 구간(5회 단위)별로 리포트 품질 변화와 맞춤 수퍼비전 진단을 열람할 수 있습니다.
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
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

          {/* TAB: Overall Cumulative Feedback */}
          <TabsContent value="overall" className="mt-4 space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center justify-between flex-wrap gap-2">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-600" />
                    수퍼바이저 종합 진단 및 처방
                  </span>
                  <Badge variant="outline" className={currentGroup.badgeColor}>
                    {currentGroup.name} ({currentScores.total}점)
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  현재까지 등록된 총 {totalLogs}건의 실습일지를 종합 분석한 결과입니다.
                </CardDescription>
              </CardHeader>

              <CardContent className="pt-4 space-y-4 text-xs">
                {/* General Advice Banner */}
                <div className="rounded-xl bg-purple-50/60 dark:bg-purple-950/20 p-4 border border-purple-100 dark:border-purple-900/40 space-y-1">
                  <span className="font-bold text-purple-900 dark:text-purple-300 block">
                    수퍼바이저 총평 & 처방 제언:
                  </span>
                  <p className="text-muted-foreground leading-relaxed text-xs">
                    {narrativeFeedback.supervisorAdvice}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="rounded-lg border p-4 bg-emerald-50/20 dark:bg-emerald-950/10 border-emerald-100 dark:border-emerald-900/30 space-y-2">
                    <span className="font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      현재 잘하고 있는 핵심 강점
                    </span>
                    <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground text-xs">
                      {narrativeFeedback.strengths.map((str: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{str}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Improvements */}
                  <div className="rounded-lg border p-4 bg-amber-50/20 dark:bg-amber-950/10 border-amber-100 dark:border-amber-900/30 space-y-2">
                    <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                      다음 리포트 작성 시 결정적 보완 과제
                    </span>
                    <ul className="space-y-1.5 pl-4 list-disc text-muted-foreground text-xs">
                      {narrativeFeedback.improvements.map((imp: string, idx: number) => (
                        <li key={idx} className="leading-relaxed">{imp}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* TAB: Specific Milestones (1-5, 6-10, 11-15, 16-20) */}
          {milestones.map((m: any) => (
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
                        <div className="bg-emerald-50/50 p-2.5 rounded border border-emerald-100 col-span-2 sm:col-span-1">
                          <span className="text-muted-foreground block text-[10px]">5. 학습전이</span>
                          <strong className="text-emerald-700 text-sm">{m.scores.learningTransfer}점</strong>
                        </div>
                      </div>

                      {/* Segment Diagnostics */}
                      <div className="space-y-3 pt-2">
                        <div className="rounded-lg bg-purple-50/50 p-3.5 border border-purple-100 space-y-1">
                          <span className="font-semibold text-purple-900 block">구간 종합 진단:</span>
                          <p className="text-muted-foreground leading-relaxed">{m.narrative.summary}</p>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="rounded-lg bg-emerald-50/30 p-3 border border-emerald-100 space-y-1">
                            <span className="font-semibold text-emerald-900 block">이 구간의 강점:</span>
                            <p className="text-muted-foreground leading-relaxed">{m.narrative.keyStrengths}</p>
                          </div>
                          <div className="rounded-lg bg-amber-50/30 p-3 border border-amber-100 space-y-1">
                            <span className="font-semibold text-amber-900 block">결정적 보완 과제:</span>
                            <p className="text-muted-foreground leading-relaxed">{m.narrative.criticalImprovement}</p>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Special Motivation Section: 왜 코칭실습일지를 잘 작성해야 하는가? */}
      <Card className="border-2 border-amber-200 dark:border-amber-900/60 shadow-sm bg-gradient-to-br from-amber-50/40 via-card to-amber-100/20 dark:from-amber-950/20 dark:via-card dark:to-amber-950/10">
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base flex items-center gap-2 text-foreground">
            <Zap className="w-5 h-5 text-amber-500" />
            <span>{motivationSection.title}</span>
          </CardTitle>
          <CardDescription className="text-xs">
            {motivationSection.subtitle}
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {motivationSection.pillars.map((pillar: any) => (
              <div
                key={pillar.no}
                className="rounded-xl border p-4 bg-card/80 space-y-1.5 hover:border-amber-300 transition-colors"
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

      {/* Cumulative Log Quality History (회차별 점수 진행표: 1건, 2건, ... N건) */}
      <Card className="shadow-sm">
        <CardHeader className="pb-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600" />
                회차별 실습 리포트 품질 평가 이력 ({evaluatedLogs.length}건)
              </CardTitle>
              <CardDescription className="text-xs">
                실습일지를 등록할 때마다 산출된 개별 건의 5대 항목 점수와 누적 평균 점수 추이입니다.
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

      {/* Log Detail Modal */}
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
                  {selectedLog.index}회차 실습일지 5대 항목 평가 및 작성 원문입니다.
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
