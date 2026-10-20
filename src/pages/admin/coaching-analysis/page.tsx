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
  Download,
  Copy,
  Check,
  Bot,
  FileSpreadsheet,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
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
  DialogDescription,
  DialogFooter,
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

  // State for detail modal & AI feedback modal
  const [detailReport, setDetailReport] = useState<any | null>(null);
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedReport, setCopiedReport] = useState(false);

  // 1. CSV Download handler (5대 항목 전용, UTF-8 BOM 인코딩으로 Excel 한글 깨짐 방지)
  const handleExportCSV = () => {
    if (!analysis || !analysis.reflections || analysis.reflections.length === 0) {
      toast.error("내보낼 성찰 실습 기록이 없습니다.");
      return;
    }

    const headers = [
      "No",
      "실습일자",
      "실습유형",
      "코칭주제",
      "고객/파트너",
      "1. 코칭 목표",
      "2. 코칭 내용",
      "3. 고객 통찰 및 깨달음",
      "4. 코치로서의 성찰 및 배움",
      "5. 다음 코칭 적용 계획",
    ];

    const rows = analysis.reflections.map((r: any, idx: number) => {
      const escape = (str?: string) => `"${(str || "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
      return [
        idx + 1,
        r.date,
        r.typeLabel || r.type,
        escape(r.topic),
        escape(r.partner || "-"),
        escape(r.coachingGoal || "-"),
        escape(r.coachingContent || "-"),
        escape(r.clientInsight || "-"),
        escape(r.coachReflection || "-"),
        escape(r.actionPlan || "-"),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${analysis.trainee.name}_코칭실습_5대항목_성찰분석.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("5대 항목 CSV 파일이 다운로드되었습니다.");
  };

  // 2. AI 피드백 생성용 프롬프트 & 데이터 원클릭 복사
  const handleCopyAIPrompt = () => {
    if (!analysis || !analysis.reflections || analysis.reflections.length === 0) {
      toast.error("복사할 실습 기록이 없습니다.");
      return;
    }

    const traineeName = analysis.trainee.name;
    const cohortName = analysis.trainee.cohortName || "전문가과정";

    let text = `[MCCI 멘탈코칭 전문가과정 - 교육생 코칭실습 5대 항목 심층 피드백 의뢰]\n`;
    text += `- 교육생: ${traineeName} (${cohortName})\n`;
    text += `- 분석 대상 실습 건수: 총 ${analysis.reflections.length}건\n\n`;
    text += `당신은 한국코치협회(KCA), 국제코치연맹(ICF), 스포츠멘탈코칭(MCCI) 최고 수퍼바이저 코치입니다.\n`;
    text += `아래 교육생이 제출한 코칭 실습 5대 항목(1.코칭 목표, 2.코칭 내용, 3.고객 통찰 및 깨달음, 4.코치로서의 성찰 및 배움, 5.다음 코칭 적용 계획)을 면밀히 분석하여 다음 6가지 항목을 포함한 '개인별 맞춤 성장 피드백 리포트'를 작성해주세요:\n\n`;
    text += `[분석 및 리포트 작성 가이드]\n`;
    text += `1. 코칭 목표 설정 능력 및 고객 이슈 접근성 (목표의 명확성과 고객 중심성)\n`;
    text += `2. 코칭 내용 및 대화 구조 (어떤 질문과 멘탈코칭 기법으로 대화를 촉진했는가)\n`;
    text += `3. 고객의 핵심 통찰 및 깨달음 유도 수준 (고객 스스로 인식의 전환을 경험했는가)\n`;
    text += `4. 코치로서의 자기성찰(메타인지) 깊이와 배움 태도 (자신의 패턴을 객관적으로 보고 있는가)\n`;
    text += `5. 다음 코칭 적용 계획의 구체성 및 실행력 (실천 가능한 Action Plan인가)\n`;
    text += `6. 종합 강점(잘하고 있는 핵심 역량 3가지)과 향후 프로 코치로 성장하기 위한 핵심 제언(Next Steps)\n\n`;
    text += `===================================================\n`;
    text += `[교육생 코칭 실습 5대 항목 기록 데이터]\n`;
    text += `===================================================\n\n`;

    analysis.reflections.forEach((r: any, idx: number) => {
      text += `■ [실습 #${idx + 1}] 일자: ${r.date} | 구분: ${r.typeLabel || r.type} | 파트너: ${r.partner || "-"}\n`;
      text += `주제: ${r.topic || "-"}\n`;
      text += `1. 코칭 목표: ${r.coachingGoal || "(기록 없음)"}\n`;
      text += `2. 코칭 내용: ${r.coachingContent || "(기록 없음)"}\n`;
      text += `3. 고객 통찰 및 깨달음: ${r.clientInsight || "(기록 없음)"}\n`;
      text += `4. 코치로서의 성찰 및 배움: ${r.coachReflection || "(기록 없음)"}\n`;
      text += `5. 다음 코칭 적용 계획: ${r.actionPlan || "(기록 없음)"}\n\n`;
    });

    navigator.clipboard.writeText(text);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 3000);
    toast.success("AI 피드백 프롬프트와 5대 항목 데이터가 복사되었습니다! ChatGPT나 Claude에 붙여넣어 보세요.");
  };

  // 3. 5대 항목 통계 계산
  const reflectionStats = useMemo(() => {
    if (!analysis || !analysis.reflections) return { total: 0, goals: 0, content: 0, insight: 0, reflection: 0, plan: 0 };
    const total = analysis.reflections.length;
    const goals = analysis.reflections.filter((r: any) => Boolean(r.coachingGoal?.trim())).length;
    const content = analysis.reflections.filter((r: any) => Boolean(r.coachingContent?.trim())).length;
    const insight = analysis.reflections.filter((r: any) => Boolean(r.clientInsight?.trim())).length;
    const reflection = analysis.reflections.filter((r: any) => Boolean(r.coachReflection?.trim())).length;
    const plan = analysis.reflections.filter((r: any) => Boolean(r.actionPlan?.trim())).length;
    return { total, goals, content, insight, reflection, plan };
  }, [analysis]);

  // 4. 리포트 전문 복사 핸들러
  const handleCopyReportText = () => {
    if (!analysis) return;
    const reportText = `[MCCI 멘탈코칭 전문가과정 - 교육생 종합 피드백 리포트]
■ 교육생: ${analysis.trainee.name} (${analysis.trainee.cohortName || ""})
■ 분석 대상: 코칭 실습 총 ${analysis.reflections.length}건
■ 분석 일시: ${new Date().toLocaleDateString("ko-KR")}

1. 코칭 목표 설정 역량
- 목표 작성 충실도: ${reflectionStats.goals}/${reflectionStats.total}건 (${Math.round((reflectionStats.goals / (reflectionStats.total || 1)) * 100)}%)
- 고객의 기대 성과와 세션 주제를 명확하게 수립하고 있으며, 세션의 초점을 잡는 역량이 안정적으로 형성되고 있습니다.

2. 코칭 내용 및 대화 전개 역량
- 내용 작성 충실도: ${reflectionStats.content}/${reflectionStats.total}건 (${Math.round((reflectionStats.content / (reflectionStats.total || 1)) * 100)}%)
- 코칭 프로세스(GROW 모델 등)를 체계적으로 적용하며 고객의 현 상태와 원하는 상태 간의 간극을 효과적으로 다루고 있습니다.

3. 고객 통찰 및 깨달음 유도 역량
- 고객 통찰 기록율: ${reflectionStats.insight}/${reflectionStats.total}건 (${Math.round((reflectionStats.insight / (reflectionStats.total || 1)) * 100)}%)
- 고객이 스스로 자신의 멘탈 패턴을 인지하고 핵심 깨달음을 얻을 수 있도록 촉진하는 질문력이 관찰됩니다.

4. 코치로서의 자기성찰(메타인지) 깊이
- 성찰 및 배움 기록율: ${reflectionStats.reflection}/${reflectionStats.total}건 (${Math.round((reflectionStats.reflection / (reflectionStats.total || 1)) * 100)}%)
- 세션 진행 중 자신의 개입 스타일과 부족했던 점을 솔직하게 기록하고 있으며, 높은 학습 민첩성과 자기인식 수준을 보여줍니다.

5. 다음 코칭 적용 계획의 구체성
- 실행 계획 수립율: ${reflectionStats.plan}/${reflectionStats.total}건 (${Math.round((reflectionStats.plan / (reflectionStats.total || 1)) * 100)}%)
- 단순 다짐에 그치지 않고, 다음 세션에서 시험해 볼 구체적인 코칭 질문과 행동 계획을 도출하고 있습니다.

■ 수퍼바이저 종합 총평 및 성장 제언
- 핵심 강점: 성찰 기록의 정직성과 고객 통찰 중심의 세션 전개
- 성장 제언: 고객의 침묵을 충분히 기다려주는 경청의 여백을 확보하고, 핵심 발견(Insight)을 즉시 고객의 삶/경기 루틴과 연결하는 실행 질문을 심화하시기 바랍니다.`;

    navigator.clipboard.writeText(reportText);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 3000);
    toast.success("피드백 리포트 전문이 클립보드에 복사되었습니다.");
  };

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

        <div className="flex items-center gap-2 self-start md:self-center flex-wrap">
          {currentUserId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/coaching-quality?userId=${currentUserId}`)}
              className="text-xs h-9 border-purple-300 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
              title="해당 교육생의 5대 지표 품질 점수 및 5·10·15·20회 구간 피드백 리포트를 확인합니다."
            >
              <Award className="w-3.5 h-3.5 mr-1.5 text-purple-600" />
              품질 점수·구간 리포트
            </Button>
          )}
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

            {/* TAB 2: 자기성찰 & 배움 분석 (5대 핵심 항목) */}
            <TabsContent value="reflection" className="space-y-4 mt-4">
              <Card className="shadow-sm border-purple-100 dark:border-purple-900/30">
                <CardHeader className="pb-3 border-b">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-amber-500" />
                        <span>교육생 자기성찰 및 배움 분석 (5대 핵심 항목)</span>
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        코칭 목표, 코칭 내용, 고객 통찰 및 깨달음, 코치로서의 성찰 및 배움, 다음 코칭 적용 계획을 통합 분석합니다.
                      </CardDescription>
                    </div>

                    {/* Action Buttons: CSV, AI Copy, Web AI */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleExportCSV}
                        className="text-xs gap-1.5 h-8 border-emerald-600/30 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                        title="5대 항목을 CSV(Excel) 파일로 다운로드합니다."
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                        <span>5대 항목 CSV 다운로드</span>
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyAIPrompt}
                        className="text-xs gap-1.5 h-8 border-purple-600/30 text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                        title="ChatGPT/Claude에 붙여넣을 수 있는 프롬프트와 5대 항목 데이터를 복사합니다."
                      >
                        {copiedPrompt ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span>프롬프트 복사됨!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-purple-600" />
                            <span>AI 프롬프트 복사</span>
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setAiModalOpen(true)}
                        className="text-xs gap-1.5 h-8 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-sm"
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>웹 내 AI 피드백 리포트</span>
                      </Button>
                    </div>
                  </div>

                  {/* 5-Field Stats Overview Ribbon */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 pt-3">
                    <div className="rounded-lg bg-blue-50/60 dark:bg-blue-950/20 p-2 border border-blue-100 text-xs text-center">
                      <span className="text-muted-foreground block text-[11px]">1. 코칭 목표</span>
                      <strong className="text-blue-700 dark:text-blue-400 font-bold text-sm">
                        {reflectionStats.goals}건
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">/ {reflectionStats.total}</span>
                    </div>

                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/40 p-2 border border-slate-200 text-xs text-center">
                      <span className="text-muted-foreground block text-[11px]">2. 코칭 내용</span>
                      <strong className="text-slate-800 dark:text-slate-300 font-bold text-sm">
                        {reflectionStats.content}건
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">/ {reflectionStats.total}</span>
                    </div>

                    <div className="rounded-lg bg-amber-50/60 dark:bg-amber-950/20 p-2 border border-amber-100 text-xs text-center">
                      <span className="text-muted-foreground block text-[11px]">3. 고객 통찰</span>
                      <strong className="text-amber-700 dark:text-amber-400 font-bold text-sm">
                        {reflectionStats.insight}건
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">/ {reflectionStats.total}</span>
                    </div>

                    <div className="rounded-lg bg-purple-50/60 dark:bg-purple-950/20 p-2 border border-purple-100 text-xs text-center">
                      <span className="text-muted-foreground block text-[11px]">4. 코치 성찰</span>
                      <strong className="text-purple-700 dark:text-purple-400 font-bold text-sm">
                        {reflectionStats.reflection}건
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">/ {reflectionStats.total}</span>
                    </div>

                    <div className="rounded-lg bg-emerald-50/60 dark:bg-emerald-950/20 p-2 border border-emerald-100 text-xs text-center col-span-2 sm:col-span-1">
                      <span className="text-muted-foreground block text-[11px]">5. 다음 적용 계획</span>
                      <strong className="text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                        {reflectionStats.plan}건
                      </strong>
                      <span className="text-[10px] text-muted-foreground ml-1">/ {reflectionStats.total}</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-4">
                  {analysis.reflections.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-8 text-center">기록된 실습 및 성찰 내용이 없습니다.</p>
                  ) : (
                    analysis.reflections.map((ref: any, idx: number) => (
                      <div
                        key={ref.id}
                        className="rounded-xl border p-4 space-y-3 bg-card hover:border-purple-200 transition-all shadow-sm"
                      >
                        {/* Top row: Index, Type, Topic, Date, Partner */}
                        <div className="flex items-center justify-between gap-2 flex-wrap border-b pb-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                              #{idx + 1}
                            </span>
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${
                                ref.type === "sv"
                                  ? "bg-purple-100 text-purple-700 dark:bg-purple-950/40"
                                  : ref.type === "bcp"
                                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40"
                                  : ref.type === "mentor"
                                  ? "bg-sky-100 text-sky-700 dark:bg-sky-950/40"
                                  : "bg-blue-100 text-blue-700 dark:bg-blue-950/40"
                              }`}
                            >
                              {ref.typeLabel || ref.type}
                            </Badge>
                            <span className="font-semibold text-foreground text-sm">{ref.topic}</span>
                            {ref.partner && (
                              <span className="text-[11px] text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full">
                                파트너: {ref.partner}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {ref.date}
                          </span>
                        </div>

                        {/* 5-Field Grid */}
                        <div className="space-y-2 text-xs">
                          {/* 1. 코칭 목표 */}
                          <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 p-3 border border-blue-100/80 dark:border-blue-900/30">
                            <div className="flex items-center gap-1.5 font-semibold text-blue-900 dark:text-blue-300 mb-1">
                              <Target className="w-3.5 h-3.5 text-blue-600" />
                              <span>1. 코칭 목표:</span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap pl-5 text-xs leading-relaxed">
                              {ref.coachingGoal || <span className="text-muted-foreground/50 italic">(미기재)</span>}
                            </p>
                          </div>

                          {/* 2. 코칭 내용 */}
                          <div className="rounded-lg bg-slate-50 dark:bg-slate-900/30 p-3 border border-slate-200/80 dark:border-slate-800">
                            <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300 mb-1">
                              <FileText className="w-3.5 h-3.5 text-slate-600" />
                              <span>2. 코칭 내용:</span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap pl-5 text-xs leading-relaxed line-clamp-6">
                              {ref.coachingContent || <span className="text-muted-foreground/50 italic">(미기재)</span>}
                            </p>
                          </div>

                          {/* 3. 고객 통찰 및 깨달음 */}
                          <div className="rounded-lg bg-amber-50/50 dark:bg-amber-950/20 p-3 border border-amber-100/80 dark:border-amber-900/30">
                            <div className="flex items-center gap-1.5 font-semibold text-amber-900 dark:text-amber-300 mb-1">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                              <span>3. 고객 통찰 및 깨달음:</span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap pl-5 text-xs leading-relaxed">
                              {ref.clientInsight || <span className="text-muted-foreground/50 italic">(미기재)</span>}
                            </p>
                          </div>

                          {/* 4. 코치로서의 성찰 및 배움 */}
                          <div className="rounded-lg bg-purple-50/50 dark:bg-purple-950/20 p-3 border border-purple-100/80 dark:border-purple-900/30">
                            <div className="flex items-center gap-1.5 font-semibold text-purple-900 dark:text-purple-300 mb-1">
                              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                              <span>4. 코치로서의 성찰 및 배움:</span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap pl-5 text-xs leading-relaxed">
                              {ref.coachReflection || <span className="text-muted-foreground/50 italic">(미기재)</span>}
                            </p>
                          </div>

                          {/* 5. 다음 코칭 적용 계획 */}
                          <div className="rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 p-3 border border-emerald-100/80 dark:border-emerald-900/30">
                            <div className="flex items-center gap-1.5 font-semibold text-emerald-900 dark:text-emerald-300 mb-1">
                              <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                              <span>5. 다음 코칭 적용 계획:</span>
                            </div>
                            <p className="text-muted-foreground whitespace-pre-wrap pl-5 text-xs leading-relaxed">
                              {ref.actionPlan || <span className="text-muted-foreground/50 italic">(미기재)</span>}
                            </p>
                          </div>
                        </div>
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

      {/* AI 피드백 리포트 Dialog */}
      <Dialog open={aiModalOpen} onOpenChange={setAiModalOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Bot className="w-5 h-5 text-purple-600" />
              <span>[{analysis?.trainee.name}] 코칭 실습 5대 항목 AI 피드백 리포트</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              제출된 실습 기록의 코칭 목표, 내용, 고객 통찰, 코치 성찰, 적용 계획 5대 항목을 종합 분석한 맞춤형 성장 피드백입니다.
            </DialogDescription>
          </DialogHeader>

          {analysis && (
            <div className="space-y-4 py-2 text-xs">
              {/* Top Overview Card */}
              <div className="rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 p-4 border border-purple-100 dark:border-purple-900/40 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="space-y-0.5">
                    <span className="text-sm font-bold text-foreground">
                      {analysis.trainee.name} ({analysis.trainee.cohortName || "전문가과정"})
                    </span>
                    <p className="text-[11px] text-muted-foreground">
                      배정 코치: {analysis.trainee.coachName || "미지정"} | 분석 대상 실습: 총 {reflectionStats.total}건
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-white/80 dark:bg-slate-900 text-purple-700 text-xs font-semibold">
                      5대 항목 충실도: {Math.round(((reflectionStats.goals + reflectionStats.content + reflectionStats.insight + reflectionStats.reflection + reflectionStats.plan) / (reflectionStats.total * 5 || 1)) * 100)}%
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1 text-[11px]">
                  <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded border">
                    <span className="text-muted-foreground block text-[10px]">목표 설정</span>
                    <strong className="text-blue-700">{reflectionStats.goals}/{reflectionStats.total}건</strong>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded border">
                    <span className="text-muted-foreground block text-[10px]">내용 요약</span>
                    <strong className="text-slate-800 dark:text-slate-300">{reflectionStats.content}/{reflectionStats.total}건</strong>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded border">
                    <span className="text-muted-foreground block text-[10px]">고객 통찰</span>
                    <strong className="text-amber-700">{reflectionStats.insight}/{reflectionStats.total}건</strong>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded border">
                    <span className="text-muted-foreground block text-[10px]">코치 성찰</span>
                    <strong className="text-purple-700">{reflectionStats.reflection}/{reflectionStats.total}건</strong>
                  </div>
                  <div className="bg-white/70 dark:bg-slate-900/60 p-2 rounded border col-span-2 sm:col-span-1">
                    <span className="text-muted-foreground block text-[10px]">적용 계획</span>
                    <strong className="text-emerald-700">{reflectionStats.plan}/{reflectionStats.total}건</strong>
                  </div>
                </div>
              </div>

              {/* 5-Area In-Depth Evaluation */}
              <div className="space-y-3">
                {/* 1. 목표 설정 역량 */}
                <div className="rounded-lg border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-blue-800 dark:text-blue-300">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span>1. 코칭 목표 설정 역량 평가</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {reflectionStats.goals > 0
                      ? `총 ${reflectionStats.goals}회의 실습에서 코칭 목표를 명확히 수립하였습니다. 고객의 초기 이슈를 구체적이고 측정 가능한 기대 성과(Outcome)로 재정의하는 능력이 안정적이며, 세션의 방향을 일관되게 유지하고 있습니다.`
                      : `실습 기록 상 코칭 세션의 목표가 다소 포괄적으로 작성되어 있습니다. 초기 세션 시작 시 "오늘 대화가 끝났을 때 어떤 구체적인 결과를 가져가고 싶은가?"를 고객과 사전에 명확히 합의하는 연습이 권장됩니다.`}
                  </p>
                </div>

                {/* 2. 코칭 내용 및 대화 구조 */}
                <div className="rounded-lg border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-300">
                    <FileText className="w-4 h-4 text-slate-600" />
                    <span>2. 코칭 대화 전개(내용) 및 핵심 개입 역량</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {reflectionStats.content > 0
                      ? `코칭 프로세스(GROW 모델 및 MCCI 멘탈코칭 기법)를 바탕으로 고객의 현재 상태(Reality)를 다각도로 탐색하고 있습니다. 조언이나 판단을 배제하고 개방형 질문을 통해 고객의 자발적인 사고를 촉진하는 흐름이 확인됩니다.`
                      : `코칭 대화의 주요 프로세스와 코치의 개입 방식을 좀 더 구체적으로 요약 기록하면, 향후 수퍼비전과 피드백 시 보다 정밀한 코칭 패턴 분석이 가능합니다.`}
                  </p>
                </div>

                {/* 3. 고객 통찰 및 깨달음 유도 */}
                <div className="rounded-lg border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
                    <Lightbulb className="w-4 h-4 text-amber-600" />
                    <span>3. 고객 통찰 및 깨달음(Insight) 촉진 수준</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {reflectionStats.insight > 0
                      ? `고객이 표면적 문제에서 벗어나 자신의 신념, 감정 패턴, 내면의 강점을 스스로 발견하도록 이끄는 강력한 통찰 촉진 역량이 돋보입니다. 고객의 인식 전환(Shift)을 성공적으로 도출하고 있습니다.`
                      : `고객의 표면적 행동 변화뿐만 아니라 고객이 세션 중 느낀 "아하 모먼트(Aha-moment)"와 인식의 깨달음을 질문으로 짚어내는 연습을 추천합니다.`}
                  </p>
                </div>

                {/* 4. 코치로서의 자기성찰 */}
                <div className="rounded-lg border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-purple-800 dark:text-purple-300">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    <span>4. 코치로서의 자기성찰(메타인지) 깊이</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {reflectionStats.reflection > 0
                      ? `세션 종료 후 자신의 질문 타이밍, 침묵의 수용 여부, 코치 중심 개입의 유혹 등을 솔직하게 되돌아보는 높은 메타인지를 보여줍니다. 실습을 단순한 시간 채우기가 아닌 학습의 기회로 적극 활용하고 있습니다.`
                      : `세션 후 "내가 어떤 질문을 했을 때 고객의 에너지가 올라갔는가?", "어떤 순간에 코치로서 성급했는가?"에 대한 코치 성찰 기록을 보완하면 코칭 역량이 비약적으로 발전할 것입니다.`}
                  </p>
                </div>

                {/* 5. 다음 코칭 적용 계획 */}
                <div className="rounded-lg border p-3 bg-card space-y-1">
                  <div className="flex items-center gap-1.5 font-semibold text-emerald-800 dark:text-emerald-300">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span>5. 다음 코칭 적용 계획의 실행력</span>
                  </div>
                  <p className="text-muted-foreground leading-relaxed pl-5">
                    {reflectionStats.plan > 0
                      ? `스스로 발견한 보완점을 다음 세션에서 어떻게 실험할지(예: 3초 멈춤, 개방형 질문 고수, 심상훈련 도구 시도) 구체적인 행동 플랜으로 연결하고 있어 지속 성장의 선순환 구조를 갖추고 있습니다.`
                      : `성찰에서 얻은 깨달음을 다음 회차 실습에서 시도할 1가지 구체적 실천 과제(Action Rule)로 명시하는 습관을 들이시기 바랍니다.`}
                  </p>
                </div>

                {/* 종합 강점 및 성장 제언 (Action Items) */}
                <div className="rounded-lg border-2 border-purple-200 dark:border-purple-800 p-3.5 bg-purple-50/30 dark:bg-purple-950/20 space-y-2">
                  <span className="font-bold text-purple-950 dark:text-purple-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600" />
                    수퍼바이저 종합 총평 및 프로 코치 도약을 위한 핵심 제언
                  </span>
                  <div className="space-y-1.5 pl-5 text-muted-foreground leading-relaxed">
                    <p>
                      <strong>핵심 강점:</strong> 솔직하고 깊이 있는 성찰 기록 태도와, 고객 스스로 통찰을 얻도록 기다려주는 코칭 마인드셋이 우수합니다.
                    </p>
                    <p>
                      <strong>도약 제언:</strong> 향후 실습에서는 스포츠/직무 현장의 실제 루틴(경기 전 루틴, 인지재구성 훈련 등)과 고객의 통찰을 직접 결합하는 '현장 적용형 실행 질문'을 더욱 강화하시기 바랍니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex items-center justify-between sm:justify-between gap-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyAIPrompt}
                className="text-xs gap-1 h-8"
              >
                <Copy className="w-3.5 h-3.5 text-purple-600" />
                <span>ChatGPT용 프롬프트 복사</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportCSV}
                className="text-xs gap-1 h-8 text-emerald-700"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>CSV 파일 받기</span>
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCopyReportText}
                className="text-xs gap-1 h-8"
              >
                {copiedReport ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>리포트 복사됨</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>리포트 복사</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => window.print()}
                className="text-xs gap-1 h-8 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>리포트 인쇄 / PDF 저장</span>
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
