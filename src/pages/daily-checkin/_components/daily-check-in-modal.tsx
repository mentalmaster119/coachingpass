import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Heart, Brain, Flame, CheckCircle2, Sparkles, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  autoStart?: boolean;
};

const SCORE_COLORS: Record<string, string> = {
  body: "bg-rose-500",
  mind: "bg-blue-500",
  passion: "bg-amber-500",
};

const QUICK_TAGS = ["따뜻한 대화", "맛있는 음식", "스스로의 노력", "가족/동료", "맑은 날씨", "새로운 배움"];

function ScoreButton({
  value,
  selected,
  color,
  onSelect,
}: {
  value: number;
  selected: number;
  color: string;
  onSelect: (v: number) => void;
}) {
  const isSelected = selected === value;
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cn(
        "w-9 h-9 rounded-full text-sm font-bold border-2 transition-all cursor-pointer",
        isSelected
          ? `${color} text-white border-transparent scale-110 shadow-md`
          : "bg-muted/50 border-border text-muted-foreground hover:border-primary/50",
      )}
    >
      {value}
    </button>
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
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((v) => (
          <ScoreButton key={v} value={v} selected={value} color={color} onSelect={onChange} />
        ))}
      </div>
    </div>
  );
}

export default function DailyCheckInModal({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const todayCheckIn = useQuery(api.dailyCheckIn.getTodayCheckIn);
  const submitCheckIn = useMutation(api.dailyCheckIn.submitCheckIn);

  const [body, setBody] = useState(0);
  const [mind, setMind] = useState(0);
  const [passion, setPassion] = useState(0);
  const [gratitude1, setGratitude1] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const alreadyDone = todayCheckIn !== null && todayCheckIn !== undefined;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async () => {
    if (body === 0 || mind === 0 || passion === 0) {
      toast.error("세 가지 점수를 모두 선택해 주세요");
      return;
    }
    setSubmitting(true);
    try {
      await submitCheckIn({
        bodyScore: body,
        mindScore: mind,
        passionScore: passion,
        gratitude1: gratitude1.trim() || undefined,
        gratitudeTags: selectedTags.length > 0 ? selectedTags : undefined,
        message: message.trim() || undefined,
      });
      toast.success("오늘의 체크인과 감사가 저장되었습니다! 💖");
      setDone(true);
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
        setBody(0); setMind(0); setPassion(0); setMessage(""); setGratitude1(""); setSelectedTags([]);
      }, 1200);
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-500 fill-rose-500/20" />
            오늘의 체크인 & 감사 한 줄
          </DialogTitle>
        </DialogHeader>

        {todayCheckIn === undefined ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : done ? (
          <div className="flex flex-col items-center justify-center py-8 text-center gap-3">
            <CheckCircle2 className="w-14 h-14 text-green-500" />
            <p className="text-lg font-bold text-foreground">저장 완료!</p>
            <p className="text-sm text-muted-foreground">오늘도 스스로를 돌보고 감사함을 기록해 주셔서 감사합니다 :)</p>
          </div>
        ) : alreadyDone ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-rose-50/70 to-amber-50/70 dark:from-rose-950/20 dark:to-amber-950/20 border border-rose-200/60 dark:border-rose-800/40 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                <p className="text-sm font-semibold text-foreground">오늘 체크인을 이미 완료했습니다!</p>
              </div>
              <p className="text-xs text-muted-foreground">
                몸 <span className="font-semibold text-rose-500">{todayCheckIn.bodyScore}</span> · 마음 <span className="font-semibold text-blue-500">{todayCheckIn.mindScore}</span> · 열정 <span className="font-semibold text-amber-500">{todayCheckIn.passionScore}</span>
              </p>
              {(todayCheckIn.gratitude1 || todayCheckIn.message) && (
                <div className="text-xs bg-background/80 rounded-lg p-2.5 border border-border/50 text-foreground/90 space-y-1">
                  {todayCheckIn.gratitude1 && (
                    <p className="flex items-start gap-1.5">
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500/20 mt-0.5 flex-shrink-0" />
                      <span>{todayCheckIn.gratitude1}</span>
                    </p>
                  )}
                  {todayCheckIn.message && (
                    <p className="text-muted-foreground italic pl-5">"{todayCheckIn.message}"</p>
                  )}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 text-xs gap-1"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/daily-checkin");
                }}
              >
                <span>상세 감사일기 & 충전소</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
              <Button variant="secondary" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
              label="지금 현재 열정은 몇 점인가요?"
              color={SCORE_COLORS.passion}
              value={passion}
              onChange={setPassion}
            />

            {/* Quick Gratitude Input */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium flex items-center gap-1.5 text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  오늘 작지만 감사했던 일 <span className="text-muted-foreground font-normal text-xs">(선택)</span>
                </label>
              </div>

              {/* Tag chips */}
              <div className="flex flex-wrap gap-1">
                {QUICK_TAGS.map((tag) => {
                  const isSel = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "text-[11px] px-2 py-0.5 rounded-full border transition-all cursor-pointer",
                        isSel
                          ? "bg-rose-500 text-white border-rose-500 shadow-xs"
                          : "bg-muted/40 border-border/60 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>

              <Input
                placeholder="예: 따뜻한 햇살 아래 산책하며 마신 커피 한 잔"
                value={gratitude1}
                onChange={(e) => setGratitude1(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                자신에게 힘을 주는 한 마디 (선택)
              </label>
              <Textarea
                placeholder="예: 오늘도 최선을 다한 나, 충분히 잘하고 있어!"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting || body === 0 || mind === 0 || passion === 0}
              className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-medium shadow-sm"
            >
              {submitting ? "저장 중..." : "체크인 & 감사 완료"}
            </Button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  onOpenChange(false);
                  navigate("/daily-checkin");
                }}
                className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1 underline underline-offset-2 cursor-pointer"
              >
                <span>3가지 감사 쓰기 & 마음 충전소 바로가기</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
