import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Heart,
  Brain,
  Flame,
  CheckCircle2,
  TrendingUp,
  Wind,
  Sparkles,
  RefreshCw,
  BookmarkCheck,
  CalendarDays,
  History,
  MessageCircleHeart,
  Quote,
  Pencil,
  Smile,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs.tsx";
import { cn } from "@/lib/utils.ts";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import BreathingMeditation from "./_components/breathing-meditation.tsx";

type ScoreButtonProps = {
  value: number;
  selected: number;
  color: string;
  onSelect: (v: number) => void;
};

function ScoreButton({ value, selected, color, onSelect }: ScoreButtonProps) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "w-8 h-8 sm:w-9 sm:h-9 rounded-full text-xs sm:text-sm font-bold border-2 transition-all cursor-pointer",
        isSelected
          ? `${color} text-white border-transparent scale-110 shadow-md`
          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50"
      )}
    >
      {value}
    </button>
  );
}

const SCORE_COLORS: Record<string, string> = {
  body: "bg-rose-500",
  mind: "bg-blue-500",
  passion: "bg-amber-500",
};

const INSPIRATION_PROMPTS = [
  "오늘 나를 미소 짓게 만든 작은 순간은 무엇인가요?",
  "오늘 고마운 마음을 전하고 싶은 사람이나 대화가 있나요?",
  "오늘 내가 힘든 순간에도 잘 버텨낸 나 자신에게 해주고 싶은 칭찬은?",
  "오늘 코칭이나 일상에서 새롭게 배운 작은 깨달음은?",
  "오늘 당연하게 여겼지만 감사했던 일상의 순간은?",
  "오늘 내 몸과 마음에 편안함과 쉼을 준 것은 무엇인가요?",
  "오늘 누군가에게 작은 친절이나 따뜻한 배려를 느낀 순간이 있나요?",
];

const GRATITUDE_TAGS = [
  "일상의기쁨",
  "코칭배움",
  "버디/동료",
  "나자신칭찬",
  "가족/인연",
  "건강/신체",
  "작은성공",
  "마음의평온",
];

export default function DailyCheckInPage() {
  const todayCheckIn = useQuery(api.dailyCheckIn.getTodayCheckIn);
  const history = useQuery(api.dailyCheckIn.getMyHistory, { days: 30 });
  const stats = useQuery(api.dailyCheckIn.getMyCheckInStats);
  const submitCheckIn = useMutation(api.dailyCheckIn.submitCheckIn);

  const [activeTab, setActiveTab] = useState<"checkin" | "vault" | "trend">("checkin");
  const [body, setBody] = useState(0);
  const [mind, setMind] = useState(0);
  const [passion, setPassion] = useState(0);
  const [gratitude1, setGratitude1] = useState("");
  const [gratitude2, setGratitude2] = useState("");
  const [gratitude3, setGratitude3] = useState("");
  const [message, setMessage] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [entryMode, setEntryMode] = useState<"three_items" | "freeform">("three_items");
  const [promptIdx, setPromptIdx] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);

  const today = format(new Date(), "yyyy년 M월 d일 (E)", { locale: ko });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const nextPrompt = () => {
    setPromptIdx((prev) => (prev + 1) % INSPIRATION_PROMPTS.length);
  };

  const handleStartEdit = () => {
    if (!todayCheckIn) return;
    setBody(todayCheckIn.bodyScore);
    setMind(todayCheckIn.mindScore);
    setPassion(todayCheckIn.passionScore);
    setMessage(todayCheckIn.message ?? "");
    setGratitude1(todayCheckIn.gratitude1 ?? "");
    setGratitude2(todayCheckIn.gratitude2 ?? "");
    setGratitude3(todayCheckIn.gratitude3 ?? "");
    setSelectedTags(todayCheckIn.gratitudeTags ?? []);
    if (!todayCheckIn.gratitude1 && !todayCheckIn.gratitude2 && !todayCheckIn.gratitude3 && todayCheckIn.message) {
      setEntryMode("freeform");
    } else {
      setEntryMode("three_items");
    }
    setIsEditing(true);
  };

  const handleSubmit = async () => {
    if (body === 0 || mind === 0 || passion === 0) {
      toast.error("몸, 마음, 열정 점수를 모두 선택해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      await submitCheckIn({
        bodyScore: body,
        mindScore: mind,
        passionScore: passion,
        message: message.trim() || undefined,
        gratitude1: gratitude1.trim() || undefined,
        gratitude2: gratitude2.trim() || undefined,
        gratitude3: gratitude3.trim() || undefined,
        gratitudeTags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      toast.success("오늘의 체크인과 감사일기가 저장되었습니다! ✨");
      setSubmitted(true);
      setIsEditing(false);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const alreadyDone = todayCheckIn !== undefined && todayCheckIn !== null;

  const chartData = (history ?? []).map((r) => ({
    date: format(parseISO(r.checkInDate), "M/d", { locale: ko }),
    몸: r.bodyScore,
    마음: r.mindScore,
    열정: r.passionScore,
  }));

  const streak = stats?.currentStreak ?? 0;
  const totalCount = stats?.totalCount ?? 0;
  const pastGratitudes = stats?.gratitudeEntries ?? [];

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
            매일 체크인 & 감사일기
          </h1>
          <p className="text-muted-foreground text-sm mt-1">{today}</p>
        </div>

        {/* Streak & Stats Pill */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {stats === undefined ? (
            <Skeleton className="h-8 w-32 rounded-full" />
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {streak > 0 ? (
                <Badge
                  variant="outline"
                  className="px-2.5 py-1 text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700/50 gap-1.5 shadow-sm"
                >
                  <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500 animate-bounce" />
                  연속 {streak}일 달성!
                </Badge>
              ) : (
                <Badge variant="outline" className="px-2.5 py-1 text-xs text-muted-foreground gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  오늘의 첫 감사 쓰기
                </Badge>
              )}
              {totalCount > 0 && (
                <Badge variant="secondary" className="px-2.5 py-1 text-xs">
                  누적 {totalCount}일
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Tabs navigation: 오늘 작성 / 감사 보관함 / 추세 차트 */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="checkin" className="gap-1.5 text-xs sm:text-sm">
            <Heart className="w-3.5 h-3.5 text-rose-500" />
            오늘의 체크인
          </TabsTrigger>
          <TabsTrigger value="vault" className="gap-1.5 text-xs sm:text-sm">
            <MessageCircleHeart className="w-3.5 h-3.5 text-blue-500" />
            마음 충전소 ({pastGratitudes.length})
          </TabsTrigger>
          <TabsTrigger value="trend" className="gap-1.5 text-xs sm:text-sm">
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
            컨디션 추세
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: 오늘의 체크인 & 감사일기 */}
        <TabsContent value="checkin" className="space-y-6 mt-4">
          {todayCheckIn === undefined ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : alreadyDone && !isEditing && !submitted ? (
            /* 오늘 완료된 카드 뷰 */
            <Card className="border-emerald-300 dark:border-emerald-800/80 bg-gradient-to-br from-emerald-50/70 via-background to-teal-50/40 dark:from-emerald-950/20 dark:via-background dark:to-teal-950/20 shadow-sm">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-600">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-800 dark:text-emerald-300 text-base">
                        오늘의 체크인 & 감사일기 완료!
                      </p>
                      <p className="text-xs text-emerald-700/80 dark:text-emerald-400">
                        오늘 하루 스스로를 돌아보고 감사를 채웠습니다.
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 border-emerald-300 text-emerald-700 hover:bg-emerald-100/50 dark:border-emerald-700 dark:text-emerald-300 cursor-pointer"
                    onClick={handleStartEdit}
                  >
                    <Pencil className="w-3 h-3" />
                    수정하기
                  </Button>
                </div>

                {/* 점수 칩들 */}
                <div className="flex gap-2.5 flex-wrap pt-1">
                  <ScoreChip
                    icon={<Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />}
                    label="몸 상태"
                    score={todayCheckIn.bodyScore}
                  />
                  <ScoreChip
                    icon={<Brain className="w-4 h-4 text-blue-500 fill-blue-500/20" />}
                    label="마음 상태"
                    score={todayCheckIn.mindScore}
                  />
                  <ScoreChip
                    icon={<Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
                    label="꿈/열정"
                    score={todayCheckIn.passionScore}
                  />
                </div>

                {/* 태그 칩들 */}
                {todayCheckIn.gratitudeTags && todayCheckIn.gratitudeTags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap pt-1">
                    {todayCheckIn.gratitudeTags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* 감사 3가지 내용 */}
                {(todayCheckIn.gratitude1 || todayCheckIn.gratitude2 || todayCheckIn.gratitude3) && (
                  <div className="space-y-2 p-3.5 bg-background/90 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40">
                    <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      오늘 내가 찾은 감사의 순간들
                    </p>
                    <div className="space-y-1.5 text-sm pt-1">
                      {todayCheckIn.gratitude1 && (
                        <div className="flex items-start gap-2 text-foreground">
                          <span className="w-5 h-5 rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                            1
                          </span>
                          <p className="leading-snug">{todayCheckIn.gratitude1}</p>
                        </div>
                      )}
                      {todayCheckIn.gratitude2 && (
                        <div className="flex items-start gap-2 text-foreground">
                          <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                            2
                          </span>
                          <p className="leading-snug">{todayCheckIn.gratitude2}</p>
                        </div>
                      )}
                      {todayCheckIn.gratitude3 && (
                        <div className="flex items-start gap-2 text-foreground">
                          <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 text-xs flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
                            3
                          </span>
                          <p className="leading-snug">{todayCheckIn.gratitude3}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 응원 메시지 */}
                {todayCheckIn.message && (
                  <div className="p-3 bg-muted/40 rounded-lg text-xs sm:text-sm italic text-muted-foreground flex items-start gap-2 border">
                    <Quote className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed font-sans">{todayCheckIn.message}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : submitted ? (
            /* 방금 저장 완료 */
            <Card className="border-emerald-300 bg-emerald-50/80 dark:bg-emerald-950/30 shadow-sm">
              <CardContent className="pt-8 pb-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center mx-auto text-emerald-600 animate-pulse">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <p className="font-bold text-emerald-900 dark:text-emerald-200 text-lg">
                  오늘의 체크인 & 감사일기 저장 완료!
                </p>
                <p className="text-sm text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
                  작은 감사를 모아 마음의 힘을 채웠습니다. 오늘도 멋진 하루 보내세요 :)
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                  onClick={() => setSubmitted(false)}
                >
                  기록 확인하기
                </Button>
              </CardContent>
            </Card>
          ) : (
            /* 입력 폼 */
            <Card className="shadow-sm border-primary/20">
              <CardHeader className="pb-3 border-b bg-muted/10">
                <CardTitle className="text-base flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    오늘의 상태와 감사를 기록해보세요
                  </span>
                  {isEditing && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      수정 모드
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-5 space-y-6">
                {/* ── STEP 1: 컨디션 점수 체크 ── */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground">
                      Step 1. 컨디션 체크
                    </span>
                    <span className="text-[11px] text-muted-foreground">1(최저) ~ 10(최고)</span>
                  </div>
                  <ScoreRow
                    icon={<Heart className="w-4 h-4 text-rose-500 fill-rose-500/20" />}
                    label="지금 현재 몸 상태는 몇 점인가요?"
                    color={SCORE_COLORS.body}
                    value={body}
                    onChange={setBody}
                  />
                  <ScoreRow
                    icon={<Brain className="w-4 h-4 text-blue-500 fill-blue-500/20" />}
                    label="지금 현재 마음 상태는 몇 점인가요?"
                    color={SCORE_COLORS.mind}
                    value={mind}
                    onChange={setMind}
                  />
                  <ScoreRow
                    icon={<Flame className="w-4 h-4 text-amber-500 fill-amber-500/20" />}
                    label="꿈을 이루기 위한 열정은 몇 점인가요?"
                    color={SCORE_COLORS.passion}
                    value={passion}
                    onChange={setPassion}
                  />
                </div>

                <div className="border-t pt-4 space-y-4">
                  {/* ── STEP 2: 오늘의 감사일기 ── */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="text-xs font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500" />
                      Step 2. 오늘의 감사일기 (Three Good Things)
                    </span>
                    {/* 모드 전환 */}
                    <div className="flex rounded-md border p-0.5 bg-muted/30 text-xs">
                      <button
                        type="button"
                        onClick={() => setEntryMode("three_items")}
                        className={cn(
                          "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                          entryMode === "three_items"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        3가지 작성
                      </button>
                      <button
                        type="button"
                        onClick={() => setEntryMode("freeform")}
                        className={cn(
                          "px-2.5 py-1 rounded font-medium transition-colors cursor-pointer",
                          entryMode === "freeform"
                            ? "bg-background text-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        자유 서술
                      </button>
                    </div>
                  </div>

                  {/* 오늘의 영감 프롬프트 배너 */}
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-300/60 dark:border-amber-700/40 flex items-start justify-between gap-3">
                    <div className="space-y-0.5 text-xs min-w-0">
                      <p className="font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        오늘의 감사 영감 질문
                      </p>
                      <p className="text-amber-900/90 dark:text-amber-200/90 leading-relaxed font-medium">
                        "{INSPIRATION_PROMPTS[promptIdx]}"
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs px-2 text-amber-700 dark:text-amber-300 hover:bg-amber-500/20 cursor-pointer flex-shrink-0"
                      onClick={nextPrompt}
                      title="다른 질문 보기"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      다른 질문
                    </Button>
                  </div>

                  {/* 빠른 키워드 태그 칩 */}
                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground">감사 주제 태그 선택 (선택):</p>
                    <div className="flex flex-wrap gap-1.5">
                      {GRATITUDE_TAGS.map((tag) => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-full border transition-all cursor-pointer",
                              isSelected
                                ? "bg-primary text-primary-foreground border-primary font-medium shadow-xs"
                                : "bg-background text-muted-foreground border-border hover:bg-muted"
                            )}
                          >
                            #{tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3가지 입력 모드 */}
                  {entryMode === "three_items" ? (
                    <div className="space-y-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-400 text-[10px] flex items-center justify-center font-bold">
                            1
                          </span>
                          오늘 감사했던 순간 또는 일
                        </label>
                        <Input
                          placeholder="예: 맑은 아침 공기를 마시며 산책했던 15분"
                          value={gratitude1}
                          onChange={(e) => setGratitude1(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 text-[10px] flex items-center justify-center font-bold">
                            2
                          </span>
                          오늘 고마웠던 사람 또는 대화
                        </label>
                        <Input
                          placeholder="예: 버디 코칭 파트너의 따뜻한 공감과 지지"
                          value={gratitude2}
                          onChange={(e) => setGratitude2(e.target.value)}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[10px] flex items-center justify-center font-bold">
                            3
                          </span>
                          오늘 나 자신에게 감사하고 칭찬할 점
                        </label>
                        <Input
                          placeholder="예: 지친 퇴근길에도 차분히 배움을 실천한 나"
                          value={gratitude3}
                          onChange={(e) => setGratitude3(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : (
                    /* 자유 서술 모드 */
                    <div className="space-y-1.5 pt-1">
                      <label className="text-xs font-medium text-foreground">
                        오늘 감사했던 일과 느낌을 자유롭게 적어보세요
                      </label>
                      <Textarea
                        placeholder="오늘 하루를 돌아보며 고마웠던 일, 나 자신과 주변 사람들에게 느끼는 감사를 편안하게 적어보세요..."
                        value={gratitude1}
                        onChange={(e) => setGratitude1(e.target.value)}
                        rows={4}
                      />
                    </div>
                  )}
                </div>

                {/* ── STEP 3: 나에게 주는 응원의 한 마디 ── */}
                <div className="border-t pt-4 space-y-2">
                  <label className="text-xs font-bold tracking-wide uppercase text-muted-foreground flex items-center gap-1.5">
                    <Quote className="w-3.5 h-3.5 text-primary" />
                    Step 3. 나에게 힘을 주는 한마디 (선택)
                  </label>
                  <Input
                    placeholder="예: 오늘도 한 걸음 성장한 나, 충분히 잘하고 있어!"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  {isEditing && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditing(false)}
                      disabled={submitting}
                      className="cursor-pointer"
                    >
                      취소
                    </Button>
                  )}
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting || body === 0 || mind === 0 || passion === 0}
                    className="flex-1 gap-2 cursor-pointer text-sm font-semibold"
                  >
                    <BookmarkCheck className="w-4 h-4" />
                    {submitting ? "저장 중..." : isEditing ? "수정 완료" : "오늘의 체크인 & 감사일기 저장 완료"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 호흡 명상 박스 */}
          {showMeditation ? (
            <Card className="border-blue-300 dark:border-blue-700 shadow-sm">
              <CardContent className="pt-4 pb-6">
                <BreathingMeditation onComplete={() => setShowMeditation(false)} autoStart={true} />
              </CardContent>
            </Card>
          ) : (
            <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-blue-950/30 dark:to-indigo-950/20 shadow-xs">
              <CardContent className="pt-5 pb-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                      <Wind className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">
                        마음 챙김 호흡 명상
                      </p>
                      <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">
                        잠깐 멈추고 1분간 깊은 호흡에 집중해 보세요.
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0 cursor-pointer shadow-xs"
                    onClick={() => setShowMeditation(true)}
                  >
                    시작하기
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB 2: 마음 충전소 (과거 감사 모아보기) */}
        <TabsContent value="vault" className="space-y-4 mt-4">
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <MessageCircleHeart className="w-5 h-5" />
            </div>
            <div className="text-xs leading-relaxed text-muted-foreground">
              <p className="font-semibold text-foreground text-sm">내 마음의 감사 충전소</p>
              지치거나 에너지가 떨어질 때, 내가 적었던 지난 감사의 순간들을 다시 읽어보며 따뜻한 회복탄력성을 채워보세요.
            </div>
          </div>

          {stats === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-xl" />
              ))}
            </div>
          ) : pastGratitudes.length === 0 ? (
            <Card className="text-center py-12 px-4 text-muted-foreground space-y-2 border-dashed">
              <Heart className="w-10 h-10 mx-auto text-muted-foreground/30" />
              <p className="font-medium text-sm text-foreground">아직 보관된 감사일기가 없습니다</p>
              <p className="text-xs max-w-sm mx-auto">
                매일 감사를 1가지 이상 기록하면, 이곳에 나만의 소중한 긍정 에너지 보관함이 차곡차곡 쌓입니다.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 cursor-pointer"
                onClick={() => setActiveTab("checkin")}
              >
                오늘의 첫 감사 작성하러 가기
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {pastGratitudes.map((entry) => {
                const dateLabel = format(parseISO(entry.checkInDate), "yyyy년 M월 d일 (E)", { locale: ko });
                return (
                  <Card key={entry._id} className="overflow-hidden shadow-xs hover:shadow-md transition-shadow">
                    <CardContent className="pt-4 pb-4 space-y-2.5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                          <CalendarDays className="w-3.5 h-3.5 text-muted-foreground" />
                          {dateLabel}
                        </span>
                        <div className="flex gap-1.5 items-center">
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 font-medium">
                            몸 {entry.bodyScore}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-medium">
                            마음 {entry.mindScore}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-medium">
                            열정 {entry.passionScore}
                          </span>
                        </div>
                      </div>

                      {entry.gratitudeTags && entry.gratitudeTags.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {entry.gratitudeTags.map((t) => (
                            <span
                              key={t}
                              className="text-[10px] px-2 py-0.3 rounded-full bg-muted text-muted-foreground font-medium"
                            >
                              #{t}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* 감사 1, 2, 3 */}
                      <div className="space-y-1 text-xs text-foreground bg-muted/20 p-2.5 rounded-lg border border-border/50">
                        {entry.gratitude1 && (
                          <p className="flex items-start gap-1.5">
                            <span className="text-rose-500 font-bold">•</span>
                            <span>{entry.gratitude1}</span>
                          </p>
                        )}
                        {entry.gratitude2 && (
                          <p className="flex items-start gap-1.5">
                            <span className="text-blue-500 font-bold">•</span>
                            <span>{entry.gratitude2}</span>
                          </p>
                        )}
                        {entry.gratitude3 && (
                          <p className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold">•</span>
                            <span>{entry.gratitude3}</span>
                          </p>
                        )}
                      </div>

                      {entry.message && (
                        <p className="text-[11px] italic text-muted-foreground pl-2 border-l-2 border-primary/40">
                          "{entry.message}"
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* TAB 3: 컨디션 추세 차트 */}
        <TabsContent value="trend" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                최근 30일 컨디션 추세
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history === undefined ? (
                <Skeleton className="h-48 w-full" />
              ) : history.length < 2 ? (
                <p className="text-sm text-muted-foreground text-center py-10">
                  데이터가 쌓이면 추세선이 표시됩니다 (최소 2일 이상 필요)
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                      formatter={(value: number, name: string) => [`${value}점`, name]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="몸" stroke="#f43f5e" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="마음" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                    <Line type="monotone" dataKey="열정" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreRow({
  icon,
  label,
  color,
  value,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs sm:text-sm font-medium">
        <span className="flex items-center gap-1.5">
          {icon}
          {label}
        </span>
        {value > 0 && (
          <Badge variant="secondary" className="font-bold text-xs">
            {value}점
          </Badge>
        )}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <ScoreButton key={n} value={n} selected={value} color={color} onSelect={onChange} />
        ))}
      </div>
    </div>
  );
}

function ScoreChip({
  icon,
  label,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  score: number;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-background rounded-lg px-2.5 py-1 shadow-2xs border text-xs">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-foreground">{score}점</span>
    </div>
  );
}
