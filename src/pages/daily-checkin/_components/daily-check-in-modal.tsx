import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { Heart, Brain, Flame, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
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
  const todayCheckIn = useQuery(api.dailyCheckIn.getTodayCheckIn);
  const submitCheckIn = useMutation(api.dailyCheckIn.submitCheckIn);

  const [body, setBody] = useState(0);
  const [mind, setMind] = useState(0);
  const [passion, setPassion] = useState(0);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const alreadyDone = todayCheckIn !== null && todayCheckIn !== undefined;

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
        message: message || undefined,
      });
      toast.success("오늘의 체크인이 저장되었습니다!");
      setDone(true);
      setTimeout(() => {
        onOpenChange(false);
        setDone(false);
        setBody(0); setMind(0); setPassion(0); setMessage("");
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
            <Heart className="w-5 h-5 text-rose-500" />
            오늘의 자기 체크인
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
            <p className="text-sm text-muted-foreground">오늘도 스스로를 돌봐 주셔서 감사합니다 :)</p>
          </div>
        ) : alreadyDone ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-green-800 dark:text-green-300">오늘 이미 체크인 완료!</p>
                <p className="text-xs text-green-700 dark:text-green-400">
                  몸 {todayCheckIn.bodyScore} · 마음 {todayCheckIn.mindScore} · 열정 {todayCheckIn.passionScore}
                </p>
              </div>
            </div>
            <Button variant="secondary" className="w-full" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
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
            <div className="space-y-2 pt-2 border-t">
              <label className="text-sm font-medium">
                오늘 자신에게 힘을 주는 한 마디{" "}
                <span className="text-muted-foreground font-normal">(선택)</span>
              </label>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
