import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import {
  Heart,
  ClipboardList,
  NotebookPen,
  CheckCircle2,
  Circle,
  ChevronRight,
  FileEdit,
  Zap,
  ChevronDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { api } from "@/convex/_generated/api.js";
import { cn } from "@/lib/utils.ts";
import CoachingLogForm from "@/pages/coaching-log/_components/coaching-log-form.tsx";
import ReflectionForm from "@/pages/reflection/_components/reflection-form.tsx";
import DailyCheckInModal from "@/pages/daily-checkin/_components/daily-check-in-modal.tsx";

type QuickAction = {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  done: boolean;
  doneLabel: string;
  accent: string;
  onClick: () => void;
};

export default function QuickActionWidget() {
  const navigate = useNavigate();
  const status = useQuery(api.dashboard.getQuickActionStatus);

  const [coachingFormOpen, setCoachingFormOpen] = useState(false);
  const [reflectionFormOpen, setReflectionFormOpen] = useState(false);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  if (status === undefined) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const completedCount = [
    status.checkedInToday,
    status.coachingLogThisWeek,
    status.reflectionThisWeek,
  ].filter(Boolean).length;
  const totalCount = 3;
  const allDone = completedCount === totalCount;

  const actions: QuickAction[] = [
    {
      id: "checkin",
      icon: <Heart className="w-5 h-5" />,
      label: "오늘 자기 체크인",
      sub: status.checkedInToday ? "오늘 완료!" : "오늘 아직 안 했어요",
      done: status.checkedInToday,
      doneLabel: "완료",
      accent: "text-rose-500 bg-rose-50 dark:bg-rose-900/20",
      onClick: () => {
        if (!status.checkedInToday) setCheckInOpen(true);
        else navigate("/daily-checkin");
      },
    },
    {
      id: "coaching",
      icon: <ClipboardList className="w-5 h-5" />,
      label: "이번 주 코칭 로그",
      sub: status.coachingLogThisWeek
        ? "이번 주 기록 완료!"
        : status.draftCoachingLogs > 0
        ? `임시저장 ${status.draftCoachingLogs}건 있음`
        : "이번 주 아직 없어요",
      done: status.coachingLogThisWeek,
      doneLabel: "기록됨",
      accent: "text-green-500 bg-green-50 dark:bg-green-900/20",
      onClick: () => setCoachingFormOpen(true),
    },
    {
      id: "reflection",
      icon: <NotebookPen className="w-5 h-5" />,
      label: "이번 주 성찰 일지",
      sub: status.reflectionThisWeek ? "이번 주 작성 완료!" : "이번 주 아직 안 썼어요",
      done: status.reflectionThisWeek,
      doneLabel: "작성됨",
      accent: "text-purple-500 bg-purple-50 dark:bg-purple-900/20",
      onClick: () => setReflectionFormOpen(true),
    },
  ];

  return (
    <>
      <Card className={cn("overflow-hidden", allDone && "border-green-300 dark:border-green-700")}>
        <CardContent className="p-0">
          {/* Header */}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center",
                  allDone ? "bg-green-100 dark:bg-green-900/30" : "bg-primary/10",
                )}
              >
                <Zap
                  className={cn(
                    "w-3.5 h-3.5",
                    allDone ? "text-green-500" : "text-primary",
                  )}
                />
              </div>
              <span className="text-sm font-semibold text-foreground">오늘의 퀵 액션</span>
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full",
                  allDone
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {completedCount}/{totalCount} 완료
              </span>
              {status.draftCoachingLogs > 0 && !status.coachingLogThisWeek && (
                <span className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                  <FileEdit className="w-3 h-3" />
                  임시저장 {status.draftCoachingLogs}건
                </span>
              )}
            </div>
            <ChevronDown
              className={cn(
                "w-4 h-4 text-muted-foreground transition-transform",
                collapsed && "-rotate-90",
              )}
            />
          </button>

          {/* Actions */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="actions"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 px-4 pb-4">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={action.onClick}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-xl border text-left transition-all cursor-pointer group",
                        action.done
                          ? "bg-muted/30 border-border opacity-80 hover:opacity-100"
                          : "bg-card border-border hover:border-primary/40 hover:shadow-sm",
                      )}
                    >
                      {/* Icon */}
                      <div
                        className={cn(
                          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105",
                          action.accent,
                        )}
                      >
                        {action.icon}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-xs font-semibold leading-tight",
                            action.done ? "text-muted-foreground" : "text-foreground",
                          )}
                        >
                          {action.label}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">
                          {action.sub}
                        </p>
                      </div>

                      {/* Status icon */}
                      <div className="flex-shrink-0">
                        {action.done ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <div className="flex items-center gap-0.5">
                            <Circle className="w-4 h-4 text-muted-foreground/40" />
                            <ChevronRight className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary transition-colors -ml-1" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>

      {/* Modals */}
      <CoachingLogForm open={coachingFormOpen} onOpenChange={setCoachingFormOpen} />
      <ReflectionForm open={reflectionFormOpen} onOpenChange={setReflectionFormOpen} />
      <DailyCheckInModal
        open={checkInOpen}
        onOpenChange={setCheckInOpen}
      />
    </>
  );
}
