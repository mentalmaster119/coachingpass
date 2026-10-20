import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  Users,
  Search,
  BarChart2,
  BookOpen,
  ClipboardList,
  MessageSquare,
  Award,
  Sparkles,
  Heart,
  TrendingUp,
  Clock,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  Tag,
  Dumbbell,
  Lightbulb,
  Target,
  ArrowRight,
  Filter,
  Eye,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";

const COMPETENCY_TITLES: Record<string, string> = {
  topicClarity: "1. 목표 및 기대성과 명확화",
  goalQuantification: "2. 코칭 프로세스 구조화",
  toolSelection: "3. 질문의 개방성과 질문력",
  toolProficiency: "4. 코칭 툴 선택과 적용",
  toolStandardAdherence: "5. 비언어적 커뮤니케이션",
  selfTalkQuality: "6. 고객의 자기인식 촉진",
  questionAppropriateness: "7. 과제 부여 및 실행 계획",
  activeListening: "8. 경청과 반응",
  praiseEnergy: "9. 칭찬·인정·에너지 촉진",
};

export default function AdminCoachingAnalysisPage() {
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const selectedUserId = (routeUserId || searchParams.get("userId")) as Id<"users"> | undefined;

  // List of all trainees for the selector
  const trainees = useQuery(api.coachingAnalysis.listTraineesForAnalysis, {});
  const [searchTerm, setSearchTerm] = useState("");
  const [cohortFilter, setCohortFilter] = useState<string>("all");

  // Filtered trainees list
  const filteredTrainees = useMemo(() => {
    if (!trainees) return [];
    return trainees.filter((t: any) => {
      const matchSearch =
        !searchTerm.trim() ||
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCohort = cohortFilter === "all" || t.cohortName === cohortFilter;
      return matchSearch && matchCohort;
    });
  }, [trainees, searchTerm, cohortFilter]);

  // Unique cohorts list
  const cohorts = useMemo(() => {
    if (!trainees) return [];
    const set = new Set<string>();
    trainees.forEach((t: any) => {
      if (t.cohortName) set.add(t.cohortName);
    });
    return Array.from(set);
  }, [trainees]);

  // Effective selected ID (defaults to first trainee if none specified and list loaded)
  const currentUserId = selectedUserId ?? (trainees && trainees.length > 0 ? trainees[0]._id : undefined);

  // Load deep analysis for the selected trainee
  const analysis = useQuery(
    api.coachingAnalysis.getTraineeCoachingDeepAnalysis,
    currentUserId ? { userId: currentUserId } : "skip",
  );

  const handleSelectTrainee = (id: string) => {
    setSearchParams({ userId: id });
  };

  // State for detail modal
  const [detailReport, setDetailReport] = useState<any | null>(null);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Page Title & Navigation */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center text-white shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">교육생 코칭 실습 심층 분석</h1>
            <p className="text-xs md:text-sm text-muted-foreground">
              교육생이 제출한 코칭리포트·버디코칭·멘토코칭·수퍼비전 기록을 종합 분석하여 실제 역량과 실상을 파악합니다.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/coaching")}
            className="text-xs h-9"
          >
            <ClipboardList className="w-3.5 h-3.5 mr-1.5" />
            코칭 검토로 이동
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/users")}
            className="text-xs h-9"
          >
            <Users className="w-3.5 h-3.5 mr-1.5" />
            사용자 관리
          </Button>
        </div>
      </motion.div>

      {/* Trainee Selector Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.05 }}
      >
        <Card className="shadow-sm border-purple-100 bg-purple-50/20 dark:bg-purple-950/10">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="flex items-center gap-2 flex-shrink-0 text-sm font-semibold text-foreground">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>분석 대상 교육생:</span>
              </div>

              {/* Cohort filter */}
              <div className="w-full sm:w-40 flex-shrink-0">
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue placeholder="기수 전체" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체 기수</SelectItem>
                    {cohorts.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Trainee Select */}
              <div className="flex-1 min-w-[200px]">
                <Select
                  value={currentUserId ?? ""}
                  onValueChange={handleSelectTrainee}
                >
                  <SelectTrigger className="h-9 text-sm font-medium">
                    <SelectValue placeholder="교육생을 선택해 주세요" />
                  </SelectTrigger>
                  <SelectContent className="max-h-80">
                    {filteredTrainees.map((t: any) => (
                      <SelectItem key={t._id} value={t._id} className="text-sm py-2">
                        <div className="flex items-center justify-between w-full gap-4">
                          <span className="font-semibold text-foreground">{t.name}</span>
                          <span className="text-xs text-muted-foreground">{t.cohortName ?? "기수 미정"}</span>
                          <Badge variant="outline" className="text-[10px] ml-auto py-0">
                            총 {t.totalCount}건 ({t.approvedHours}h)
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Main Analysis Display */}
      {analysis === undefined ? (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full rounded-xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-80 w-full rounded-xl" />
        </div>
      ) : analysis === null ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><Users /></EmptyMedia>
            <EmptyTitle>분석할 교육생을 선택해 주세요</EmptyTitle>
            <EmptyDescription>
              상단 선택 메뉴에서 특정 교육생을 선택하시면 제출된 모든 실습 리포트의 통합 분석 결과가 제공됩니다.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-6">
          {/* Selected Trainee Profile Card */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-xl font-bold text-foreground">{analysis.trainee.name}</h2>
                      <span className="text-sm text-muted-foreground">({analysis.trainee.email})</span>
                      {analysis.trainee.cohortName && (
                        <Badge variant="secondary" className="text-xs">
                          {analysis.trainee.cohortName}
                        </Badge>
                      )}
                      {analysis.trainee.certificationGoal && (
                        <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 text-xs">
                          목표: {analysis.trainee.certificationGoal}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap pt-1">
                      {analysis.trainee.coachName && (
                        <span className="flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5 text-primary" />
                          담당 수퍼바이저: <strong className="text-foreground">{analysis.trainee.coachName}</strong>
                        </span>
                      )}
                      {analysis.trainee.phone && (
                        <span>연락처: {analysis.trainee.phone}</span>
                      )}
                      {analysis.trainee.coachingStyle && (
                        <span>코칭스타일: {analysis.trainee.coachingStyle}</span>
                      )}
                      {analysis.trainee.mbti && (
                        <span>MBTI: {analysis.trainee.mbti}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-8"
                      onClick={() => navigate(`/admin/trainee/${analysis.trainee._id}`)}
                    >
                      전체 프로필
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 4 Pillars Summary Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm border-blue-100 bg-blue-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-700">1:1 코칭 리포트</span>
                  <BookOpen className="w-4 h-4 text-blue-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{analysis.stats.regularCoaching.count}건</span>
                  <span className="text-xs text-muted-foreground">({analysis.stats.regularCoaching.hours}h)</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  승인 {analysis.stats.regularCoaching.approvedCount}건 · 대기 {analysis.stats.regularCoaching.pendingCount}건
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-emerald-100 bg-emerald-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-emerald-700">버디코칭 (BCP)</span>
                  <Users className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{analysis.stats.bcp.count}건</span>
                  <span className="text-xs text-muted-foreground">({analysis.stats.bcp.hours}h)</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  승인 {analysis.stats.bcp.approvedCount}건 · 대기 {analysis.stats.bcp.pendingCount}건
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-sky-100 bg-sky-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-sky-700">멘토코칭 (피코칭)</span>
                  <MessageSquare className="w-4 h-4 text-sky-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{analysis.stats.mentor.count}건</span>
                  <span className="text-xs text-muted-foreground">({analysis.stats.mentor.hours}h)</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  승인 {analysis.stats.mentor.approvedCount}건 · 대기 {analysis.stats.mentor.pendingCount}건
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-purple-100 bg-purple-50/20">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-purple-700">수퍼비전 실습</span>
                  <Award className="w-4 h-4 text-purple-600" />
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-2xl font-bold text-foreground">{analysis.stats.sv.count}건</span>
                  <span className="text-xs text-muted-foreground">({analysis.stats.sv.hours}h)</span>
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  현장 관찰일지 {analysis.stats.journalCount}건 기록됨
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Requirement Callout (Athlete Coaching Progress) */}
          <Card className="bg-gradient-to-r from-purple-50 via-white to-sky-50 border-purple-200/80 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="w-4 h-4 text-purple-600" />
                    <span className="font-semibold text-sm text-foreground">스포츠 선수 대상 코칭 실습 달성률</span>
                    <Badge variant="outline" className="text-xs">
                      {analysis.stats.athleteCoachingCount} / 8건 완료
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    자격 인증 시험 응시를 위한 필수 조건 (스포츠 선수 대상 코칭 승인 8건 이상)
                  </p>
                </div>
                <div className="w-full sm:w-48">
                  <div className="flex items-center justify-between text-xs mb-1 font-semibold text-purple-900">
                    <span>진행률</span>
                    <span>{Math.min(100, Math.round((analysis.stats.athleteCoachingCount / 8) * 100))}%</span>
                  </div>
                  <Progress
                    value={Math.min(100, Math.round((analysis.stats.athleteCoachingCount / 8) * 100))}
                    className="h-2.5"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detailed Analysis Tabs */}
          <Tabs defaultValue="patterns" className="space-y-4">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full h-auto p-1 bg-muted/60">
              <TabsTrigger value="patterns" className="text-xs py-2">
                <BarChart2 className="w-3.5 h-3.5 mr-1.5" />
                1. 실습 패턴 & 툴 분석
              </TabsTrigger>
              <TabsTrigger value="reflection" className="text-xs py-2">
                <Lightbulb className="w-3.5 h-3.5 mr-1.5 text-amber-500" />
                2. 자기성찰 & 배움 분석
              </TabsTrigger>
              <TabsTrigger value="feedback" className="text-xs py-2">
                <Target className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                3. 수퍼바이저 평가 실상
              </TabsTrigger>
              <TabsTrigger value="reports" className="text-xs py-2">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5 text-emerald-500" />
                4. 제출 리포트 원문 전체 ({analysis.allReports.length})
              </TabsTrigger>
            </TabsList>

            {/* TAB 1: 실습 패턴 & 툴 분석 */}
            <TabsContent value="patterns" className="space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 툴 및 기법 활용 빈도 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                        활용 멘탈코칭 기법 & 툴 ({analysis.techniques.uniqueCount}종)
                      </span>
                    </CardTitle>
                    <CardDescription className="text-xs">
                      교육생이 리포트에 기록한 코칭 기법과 툴의 활용 빈도입니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {analysis.techniques.list.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">기록된 기법이 없습니다.</p>
                    ) : (
                      analysis.techniques.list.slice(0, 8).map((tech: any) => (
                        <div key={tech.name} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-medium">
                            <span className="text-foreground">{tech.name}</span>
                            <span className="text-muted-foreground">{tech.count}회 ({tech.percentage}%)</span>
                          </div>
                          <Progress value={tech.percentage} className="h-1.5" />
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>

                {/* 고객군 분석 & 종목 분포 */}
                <Card className="shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-sky-600" />
                      코칭 대상 고객군 & 종목 분포
                    </CardTitle>
                    <CardDescription className="text-xs">
                      실습 대상자의 고객 분류 및 주요 스포츠 종목/분야입니다.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-center">
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">스포츠 선수 고객</p>
                        <p className="text-xl font-bold text-primary mt-0.5">{analysis.demographics.athleteClients}명</p>
                      </div>
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <p className="text-xs text-muted-foreground">일반 고객</p>
                        <p className="text-xl font-bold text-foreground mt-0.5">{analysis.demographics.generalClients}명</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold text-foreground mb-2">주요 대상 종목/분야</p>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.demographics.fields.length === 0 ? (
                          <span className="text-xs text-muted-foreground">기록된 종목 정보 없음</span>
                        ) : (
                          analysis.demographics.fields.map((f: any) => (
                            <Badge key={f.field} variant="outline" className="text-xs py-1">
                              {f.field} ({f.count}건)
                            </Badge>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 주요 코칭 주제 키워드 분석 */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-600" />
                    주요 코칭 주제 & 키워드 분석
                  </CardTitle>
                  <CardDescription className="text-xs">
                    제출된 실습 주제명에서 빈번하게 등장하는 핵심 고민 키워드입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {analysis.topics.keywords.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">주제 키워드가 없습니다.</p>
                    ) : (
                      analysis.topics.keywords.map((kw: any, idx: number) => (
                        <div
                          key={kw.keyword}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                            idx < 3
                              ? "bg-purple-100 text-purple-800 border border-purple-200"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          <span>{kw.keyword}</span>
                          <span className="text-[10px] opacity-70">x{kw.count}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 2: 자기성찰 & 배움 분석 (실제 내면/성장 상태) */}
            <TabsContent value="reflection" className="space-y-4 mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500" />
                    교육생의 성찰 및 배움 기록 ({analysis.reflections.length}건)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    실습 후 교육생이 직접 기록한 통찰(고객의 변화, 자신의 코칭 패턴, 깨달은 점)을 통해 실제 성장 상태를 파악합니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {analysis.reflections.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">기록된 성찰 내용이 없습니다.</p>
                  ) : (
                    analysis.reflections.map((ref: any) => (
                      <div
                        key={ref.id}
                        className="rounded-lg border p-4 space-y-2.5 bg-card hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                ref.type === "sv"
                                  ? "bg-purple-100 text-purple-700"
                                  : ref.type === "bcp"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : ref.type === "mentor"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {ref.type === "sv"
                                ? "수퍼비전"
                                : ref.type === "bcp"
                                ? "버디코칭"
                                : ref.type === "mentor"
                                ? "멘토코칭"
                                : "코칭리포트"}
                            </Badge>
                            <span className="font-semibold text-foreground">{ref.topic}</span>
                          </div>
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {ref.date}
                          </span>
                        </div>

                        {ref.clientInsight && (
                          <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 p-2.5 text-xs border border-amber-100 dark:border-amber-900/40">
                            <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-0.5">
                              💡 고객 통찰 및 깨달음:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{ref.clientInsight}</p>
                          </div>
                        )}

                        {ref.coachReflection && (
                          <div className="rounded-md bg-purple-50/60 dark:bg-purple-950/20 p-2.5 text-xs border border-purple-100 dark:border-purple-900/40">
                            <span className="font-semibold text-purple-800 dark:text-purple-400 block mb-0.5">
                              🌱 코치로서의 성찰 및 배움:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{ref.coachReflection}</p>
                          </div>
                        )}

                        {ref.actionPlan && (
                          <div className="rounded-md bg-muted/50 p-2.5 text-xs">
                            <span className="font-semibold text-foreground block mb-0.5">
                              🎯 다음 코칭 적용 계획:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{ref.actionPlan}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 3: 수퍼바이저 평가 실상 */}
            <TabsContent value="feedback" className="space-y-6 mt-4">
              {/* 9대 역량 관찰 평점 */}
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-600" />
                    수퍼비전 현장 관찰 9대 역량 평균 평점 (1~4점 만점)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    수퍼바이저가 현장 관찰일지(V3.0)를 통해 실습을 관찰하고 부여한 항목별 평균 점수입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {Object.entries(COMPETENCY_TITLES).map(([key, title]) => {
                      const score = analysis.competencyAverages[key];
                      return (
                        <div key={key} className="rounded-lg border p-3 bg-muted/20 space-y-1.5">
                          <p className="text-xs font-semibold text-foreground line-clamp-1">{title}</p>
                          <div className="flex items-baseline justify-between">
                            <span className="text-lg font-bold text-purple-700">
                              {score !== null ? `${score}점` : "평가 없음"}
                            </span>
                            <span className="text-[11px] text-muted-foreground">/ 4.0점</span>
                          </div>
                          {score !== null && (
                            <Progress value={(score / 4) * 100} className="h-1.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* 수퍼바이저 & 코치 피드백 목록 */}
              <Card className="shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    수퍼바이저 및 멘토코치 피드백 모음 ({analysis.feedbackList.length}건)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    지도 코치진이 해당 교육생에게 부여한 강점 및 개선점 조언 내용입니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 pt-2">
                  {analysis.feedbackList.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">기록된 코치 피드백이 없습니다.</p>
                  ) : (
                    analysis.feedbackList.map((fb: any) => (
                      <div key={fb.id} className="rounded-lg border p-4 space-y-2 bg-card">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px]">
                              {fb.author}
                            </Badge>
                            {fb.topic && <span className="font-semibold text-foreground">{fb.topic}</span>}
                            {fb.averageScore && (
                              <Badge className="bg-purple-100 text-purple-700 py-0">
                                평점 {fb.averageScore.toFixed(2)} / 4.0
                              </Badge>
                            )}
                          </div>
                          <span className="text-muted-foreground">{fb.date}</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                          <div className="rounded-md bg-emerald-50/60 dark:bg-emerald-950/20 p-2.5 border border-emerald-100">
                            <span className="font-semibold text-emerald-800 dark:text-emerald-400 block mb-1">
                              ■ 관찰된 강점:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{fb.strengths || "-"}</p>
                          </div>
                          <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 p-2.5 border border-amber-100">
                            <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-1">
                              ■ 보완 및 개선점:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{fb.improvements || "-"}</p>
                          </div>
                        </div>

                        {fb.nextActionPlan && (
                          <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 p-2 text-xs border border-blue-100">
                            <span className="font-semibold text-blue-800 dark:text-blue-400 block mb-0.5">
                              ■ 추천 실습 과제:
                            </span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{fb.nextActionPlan}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* TAB 4: 제출 리포트 원문 전체 */}
            <TabsContent value="reports" className="space-y-4 mt-4">
              <Card className="shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-foreground" />
                      제출 리포트 전체 목록 ({analysis.allReports.length}건)
                    </span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    카드를 클릭하면 제출된 리포트 원문 전체 내용을 확인할 수 있습니다.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {analysis.allReports.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">제출된 리포트가 없습니다.</p>
                  ) : (
                    analysis.allReports.map((report: any) => (
                      <div
                        key={report.id}
                        onClick={() => setDetailReport(report)}
                        className="rounded-lg border p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card hover:border-purple-300 hover:shadow-sm cursor-pointer transition-all"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge
                              className={`text-[10px] ${
                                report.category === "sv"
                                  ? "bg-purple-100 text-purple-700"
                                  : report.category === "bcp"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : report.category === "mentor"
                                  ? "bg-sky-100 text-sky-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {report.category === "sv"
                                ? "수퍼비전"
                                : report.category === "bcp"
                                ? "버디코칭"
                                : report.category === "mentor"
                                ? "멘토코칭"
                                : "코칭리포트"}
                            </Badge>
                            <span className="font-semibold text-sm text-foreground truncate">
                              {report.topic}
                            </span>
                            <Badge
                              variant={report.approvalStatus === "approved" ? "default" : "secondary"}
                              className="text-[10px] py-0"
                            >
                              {report.approvalStatus === "approved"
                                ? "승인"
                                : report.approvalStatus === "rejected"
                                ? "반려"
                                : "대기"}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>{report.date}</span>
                            <span>· {report.partnerLabel}: {report.partner || "-"}</span>
                            <span>· {Math.round((report.durationMinutes / 60) * 10) / 10}시간</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-center flex-shrink-0">
                          <Button size="sm" variant="ghost" className="h-8 text-xs text-purple-700">
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            상세보기
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {/* Report Detail Modal */}
      <Dialog open={!!detailReport} onOpenChange={(open) => !open && setDetailReport(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {detailReport && (
            <div className="space-y-4">
              <DialogHeader>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-xs">
                    {detailReport.category === "sv"
                      ? "수퍼비전"
                      : detailReport.category === "bcp"
                      ? "버디코칭"
                      : detailReport.category === "mentor"
                      ? "멘토코칭"
                      : "코칭리포트"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{detailReport.date}</span>
                </div>
                <DialogTitle className="text-lg font-bold">{detailReport.topic}</DialogTitle>
              </DialogHeader>

              <div className="border-t pt-3 space-y-3 text-sm">
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/30 p-2.5 rounded-lg">
                  <div>
                    <span className="text-muted-foreground">실습 시간:</span>{" "}
                    <strong>{detailReport.durationMinutes}분</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground">{detailReport.partnerLabel}:</span>{" "}
                    <strong>{detailReport.partner || "-"}</strong>
                  </div>
                </div>

                {detailReport.goals && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">코칭 목표</p>
                    <p className="bg-muted/30 p-2.5 rounded-md text-xs">{detailReport.goals}</p>
                  </div>
                )}

                {detailReport.coachingProcess && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">코칭 프로세스 전개</p>
                    <p className="bg-muted/30 p-2.5 rounded-md text-xs whitespace-pre-wrap">{detailReport.coachingProcess}</p>
                  </div>
                )}

                {detailReport.summary && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">코칭 내용 요약</p>
                    <p className="bg-muted/30 p-2.5 rounded-md text-xs whitespace-pre-wrap">{detailReport.summary}</p>
                  </div>
                )}

                {detailReport.techniquesUsed && detailReport.techniquesUsed.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-1">활용 멘탈코칭 툴</p>
                    <div className="flex flex-wrap gap-1">
                      {detailReport.techniquesUsed.map((t: string) => (
                        <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {detailReport.clientInsight && (
                  <div className="rounded-md bg-amber-50/60 dark:bg-amber-950/20 p-2.5 border border-amber-100 text-xs">
                    <span className="font-semibold text-amber-800 dark:text-amber-400 block mb-0.5">고객의 통찰 / 핵심 발견:</span>
                    <p className="text-muted-foreground whitespace-pre-wrap">{detailReport.clientInsight}</p>
                  </div>
                )}

                {detailReport.reflection && (
                  <div className="rounded-md bg-purple-50/60 dark:bg-purple-950/20 p-2.5 border border-purple-100 text-xs">
                    <span className="font-semibold text-purple-800 dark:text-purple-400 block mb-0.5">성찰 및 배움:</span>
                    <p className="text-muted-foreground whitespace-pre-wrap">{detailReport.reflection}</p>
                  </div>
                )}

                {detailReport.supervisorFeedback && (
                  <div className="rounded-md bg-blue-50/60 dark:bg-blue-950/20 p-2.5 border border-blue-100 text-xs">
                    <span className="font-semibold text-blue-800 dark:text-blue-400 block mb-0.5">수퍼바이저 피드백:</span>
                    <p className="text-muted-foreground whitespace-pre-wrap">{detailReport.supervisorFeedback}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
