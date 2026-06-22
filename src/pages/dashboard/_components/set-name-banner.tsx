import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { toast } from "sonner";
import { UserPen } from "lucide-react";
import { motion } from "motion/react";

export default function SetNameBanner() {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const updateProfile = useMutation(api.users.updateProfile);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name: trimmed });
      toast.success(`${trimmed}님, 환영합니다!`);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center gap-3"
    >
      <div className="flex items-center gap-3 flex-1">
        <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
          <UserPen className="w-4 h-4 text-primary" />
        </div>
        <div>
          <p className="font-semibold text-sm text-foreground">이름을 설정해 주세요</p>
          <p className="text-xs text-muted-foreground">대시보드 및 각종 기록에 표시될 이름입니다.</p>
        </div>
      </div>
      <div className="flex gap-2 sm:w-auto w-full">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="홍길동"
          className="h-9 text-sm flex-1 sm:w-40"
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
          autoFocus
        />
        <Button
          size="sm"
          className="h-9 px-4 flex-shrink-0"
          disabled={!name.trim() || loading}
          onClick={handleSave}
        >
          {loading ? "저장 중..." : "저장"}
        </Button>
      </div>
    </motion.div>
  );
}
