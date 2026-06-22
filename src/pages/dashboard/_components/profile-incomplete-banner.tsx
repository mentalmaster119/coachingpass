import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type User = Doc<"users">;

export default function ProfileIncompleteBanner({ user }: { user: User }) {
  const navigate = useNavigate();

  const missingFields: string[] = [];
  if (!user.phone) missingFields.push("전화번호");
  if (!user.avatarStorageId) missingFields.push("프로필 사진");

  if (missingFields.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-amber-300/60 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">프로필을 완성해 주세요</p>
          <p className="text-xs text-muted-foreground">
            <span className="text-amber-700 dark:text-amber-400 font-medium">
              {missingFields.join(", ")}
            </span>
            이(가) 아직 입력되지 않았습니다.
          </p>
        </div>
      </div>
      <Button
        size="sm"
        variant="secondary"
        className="h-8 gap-1.5 flex-shrink-0"
        onClick={() => navigate("/profile")}
      >
        프로필 작성하기
        <ArrowRight className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}
