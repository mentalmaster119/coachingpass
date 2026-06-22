import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { Trophy, CheckCircle2 } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type User = Doc<"users">;

export default function CertificationGoalCard({ user }: { user: User }) {
  const [loading, setLoading] = useState(false);
  const changeCertificationGoal = useMutation(api.users.setCertificationGoal);

  const isSet = user.certificationGoal === "SMPCC";

  const handleSave = async () => {
    setLoading(true);
    try {
      await changeCertificationGoal({});
      toast.success("자격증 목표가 SMPCC로 설정되었습니다.");
    } catch {
      toast.error("변경에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          자격증 목표
        </CardTitle>
        <CardDescription>준비 중인 자격증 목표를 확인할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className="flex flex-col items-start p-5 rounded-xl border-2 border-primary bg-primary/5 w-full"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-2xl font-bold text-primary">SMPCC</span>
            {isSet && <CheckCircle2 className="w-5 h-5 text-primary" />}
          </div>
          <span className="text-sm text-muted-foreground mt-1">
            Systemic Mental & Professional Certified Coach
          </span>
          <span className="text-xs text-muted-foreground/70 mt-2">
            국제멘탈코칭센터(MCCI) 공인 멘탈코칭전문가 자격증
          </span>
        </div>

        {!isSet && (
          <Button onClick={handleSave} disabled={loading} className="w-full">
            {loading ? "저장 중..." : "목표 설정"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
