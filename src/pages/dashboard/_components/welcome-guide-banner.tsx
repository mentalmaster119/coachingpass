import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import {
  X, Sparkles, CalendarDays, Heart, ClipboardList,
  BookOpen, TrendingUp, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";

const QUICK_LINKS = [
  {
    icon: <CalendarDays className="w-5 h-5" />,
    color: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    label: "출석 체크",
    href: "/attendance",
  },
  {
    icon: <Heart className="w-5 h-5" />,
    color: "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400",
    label: "자기 체크인",
    href: "/daily-checkin",
  },
  {
    icon: <ClipboardList className="w-5 h-5" />,
    color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400",
    label: "코칭 기록",
    href: "/coaching-log",
  },
  {
    icon: <BookOpen className="w-5 h-5" />,
    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    label: "교육 기록",
    href: "/education",
  },
  {
    icon: <TrendingUp className="w-5 h-5" />,
    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400",
    label: "진행 현황",
    href: "/progress",
  },
];

export default function WelcomeGuideBanner({ name }: { name?: string }) {
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();

  return (
    <AnimatePresence>
      {!dismissed && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16, height: 0, marginBottom: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden mb-6"
        >
          <div className="p-5 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-base">
                    {name ? `${name}님, 환영합니다!` : "환영합니다!"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    MCCI-SMPCC 시스템에서 자주 사용하는 기능들을 바로 시작해 보세요.
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="flex-shrink-0 -mt-1 -mr-1 w-8 h-8 cursor-pointer text-muted-foreground hover:text-foreground"
                onClick={() => setDismissed(true)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {QUICK_LINKS.map((link) => (
                <button
                  key={link.href}
                  onClick={() => navigate(link.href)}
                  className="flex flex-col items-center gap-2 p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-muted/40 transition-all cursor-pointer group"
                >
                  <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110", link.color)}>
                    {link.icon}
                  </div>
                  <span className="text-xs font-medium text-center leading-tight">{link.label}</span>
                </button>
              ))}
            </div>

            {/* CTA */}
            <button
              onClick={() => navigate("/progress")}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl bg-primary/5 border border-primary/15 hover:bg-primary/10 transition-colors cursor-pointer group"
            >
              <span className="text-sm font-medium text-primary">SMPCC 인증 요건 현황 확인하기</span>
              <ChevronRight className="w-4 h-4 text-primary transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
