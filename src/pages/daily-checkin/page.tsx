import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Heart, Brain, Flame, CheckCircle2, TrendingUp, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { cn } from "@/lib/utils.ts";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
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
        "w-9 h-9 rounded-full text-sm font-bold border-2 transition-all cursor-pointer",
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

export default function DailyCheckInPage() {
  const todayCheckIn = useQuery(api.dailyCheckIn.getTodayCheckIn);
  const history = useQuery(api.dailyCheckIn.getMyHistory, { days: 30 });
  const submitCheckIn = useMutation(api.dailyCheckIn.submitCheckIn);

  const [body, setBody] = useState(0);
  const [mind, setMind] = useState(0);
  const [passion, setPassion] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showMeditation, setShowMeditation] = useState(false);

  const today = format(new Date(), "yyyy년 M월 d일 (E)", { locale: ko });

  const handleSubmit = async () => {
    if (body === 0 || mind === 0 || passion === 0) {
      toast.error("세 가지 점수를 모두 선택해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      await submitCheckIn({ bodyScore: body, mindScore: mind, passionScore: passion, message: message || undefined });
      toast.success("오늘의 체크인이 저장되었습니다!");
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

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500" />
          매일 자기 체크인
        </h1>
        <p className="text-muted-foreground text-sm mt-1">{today}</p>
      </div>

      {/* 오늘 체크인 카드 */}
      {todayCheckIn === undefined ? (
        <Skeleton className="h-64 w-full" />
      ) : alreadyDone && !isEditing && !submitted ? (
        <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-semibold text-green-800 dark:text-green-300">오늘 체크인 완료!</p>
                <p className="text-sm text-green-700 dark:text-green-400">오늘의 기록이 저장되어 있습니다.</p>
              </div>
            </div>
            <div className="flex gap-4 flex-wrap">
              <ScoreChip icon={<Heart className="w-4 h-4 text-rose-500" />} label="몸" score={todayCheckIn.bodyScore} />
              <ScoreChip icon={<Brain className="w-4 h-4 text-blue-500" />} label="마음" score={todayCheckIn.mindScore} />
              <ScoreChip icon={<Flame className="w-4 h-4 text-amber-500" />} label="열정" score={todayCheckIn.passionScore} />
            </div>
            {todayCheckIn.message && (
              <p className="mt-3 text-sm italic text-green-800 dark:text-green-300">
                {'"'}{todayCheckIn.message}{'"'}
              </p>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-3 text-green-700 dark:text-green-400"
              onClick={() => { setBody(todayCheckIn.bodyScore); setMind(todayCheckIn.mindScore); setPassion(todayCheckIn.passionScore); setMessage(todayCheckIn.message ?? ""); setIsEditing(true); }}
            >
              수정하기
            </Button>
          </CardContent>
        </Card>
      ) : submitted ? (
        <Card className="border-green-300 bg-green-50 dark:bg-green-900/20">
          <CardContent className="pt-6 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto" />
            <p className="font-bold text-green-800 dark:text-green-300 text-lg">저장 완료!</p>
            <p className="text-sm text-green-700 dark:text-green-400">오늘도 스스로를 돌봐 주셔서 감사합니다 :)</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">오늘 나의 상태를 체크해 보세요</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ScoreRow
              icon={<Heart className="w-5 h-5 text-rose-500" />}
              label="지금 현재 몸은 몇 점인가요?"
              color={SCORE_COLORS.body}
              value={body}
              onChange={setBody}
            />
            <ScoreRow
              icon={<Brain className="w-5 h-5 text-blue-500" />}
              label="지금 현재 마음은 몇 점인가요?"
              color={SCORE_COLORS.mind}
              value={mind}
              onChange={setMind}
            />
            <ScoreRow
              icon={<Flame className="w-5 h-5 text-amber-500" />}
              label="지금 현재 꿈을 이루기 위한 열정은 몇 점인가요?"
              color={SCORE_COLORS.passion}
              value={passion}
              onChange={setPassion}
            />
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">오늘 자신에게 힘을 주는 한 마디를 적어보세요 <span className="text-muted-foreground">(선택)</span></label>
              <Textarea
                placeholder="예: 오늘도 최선을 다한 나, 정말 수고했어!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={submitting || body === 0 || mind === 0 || passion === 0}
              className="w-full"
            >
              {submitting ? "저장 중..." : "오늘의 체크인 완료"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 호흡 명상 박스 */}
      {showMeditation ? (
        <Card>
          <CardContent className="pt-4 pb-6">
            <BreathingMeditation onComplete={() => setShowMeditation(false)} autoStart={true} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-blue-200 dark:border-blue-800 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardContent className="pt-6 pb-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center flex-shrink-0">
                  <Wind className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900 dark:text-blue-200 text-sm">호흡 명상</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">잠깐 멈추고, 호흡에 집중해 보세요</p>
                </div>
              </div>
              <Button
                size="sm"
                className="bg-blue-500 hover:bg-blue-600 text-white flex-shrink-0"
                onClick={() => setShowMeditation(true)}
              >
                시작하기
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 추세 차트 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            최근 30일 추세
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history === undefined ? (
            <Skeleton className="h-48 w-full" />
          ) : history.length < 2 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              데이터가 쌓이면 추세선이 표시됩니다 (최소 2일)
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12 }}
                  formatter={(value: number, name: string) => [`${value}점`, name]}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="몸" stroke="#f43f5e" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="마음" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="열정" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ScoreRow({
  icon, label, color, value, onChange,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span>{label}</span>
        {value > 0 && <Badge variant="secondary" className="ml-auto">{value}점</Badge>}
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
          <ScoreButton key={n} value={n} selected={value} color={color} onSelect={onChange} />
        ))}
      </div>
    </div>
  );
}

function ScoreChip({ icon, label, score }: { icon: React.ReactNode; label: string; score: number }) {
  return (
    <div className="flex items-center gap-1.5 bg-white dark:bg-background rounded-lg px-3 py-1.5 shadow-sm border text-sm">
      {icon}
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{score}점</span>
    </div>
  );
}
