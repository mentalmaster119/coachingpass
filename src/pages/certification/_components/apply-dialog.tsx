import { useState } from "react";
import { useMutation } from "convex/react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api.js";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { CheckCircle, XCircle } from "lucide-react";

interface RequirementStatus {
  goal: string;
  educationHours: number;
  coachingHours: number;
  educationRequired: number;
  coachingRequired: number;
  educationMet: boolean;
  coachingMet: boolean;
  allMet: boolean;
}

interface CertificationApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: RequirementStatus;
}

export default function CertificationApplyDialog({
  open,
  onOpenChange,
  requirements,
}: CertificationApplyDialogProps) {
  const submit = useMutation(api.certification.submit);
  const [statement, setStatement] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!statement.trim() || statement.trim().length < 50) {
      toast.error("지원 동기를 50자 이상 작성해 주세요.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({ personalStatement: statement.trim() });
      toast.success(`${requirements.goal} 자격증 신청이 완료되었습니다.`);
      onOpenChange(false);
      setStatement("");
    } catch (error) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("신청 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{requirements.goal} 자격증 신청</DialogTitle>
          <DialogDescription>
            자격증 신청 전 요건 충족 여부를 확인하고 지원 동기를 작성해 주세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Requirement check */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">요건 확인</p>
            <div className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">교육 이수</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {requirements.educationHours} / {requirements.educationRequired}시간
                  </span>
                  {requirements.educationMet ? (
                    <CheckCircle className="w-4 h-4 text-chart-4" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">코칭 실습</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {requirements.coachingHours} / {requirements.coachingRequired}시간
                  </span>
                  {requirements.coachingMet ? (
                    <CheckCircle className="w-4 h-4 text-chart-4" />
                  ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                  )}
                </div>
              </div>
            </div>
            {!requirements.allMet && (
              <p className="text-xs text-destructive">
                아직 필수 요건을 충족하지 못했습니다. 모든 요건 충족 후 신청 가능합니다.
              </p>
            )}
          </div>

          {/* Personal statement */}
          <div className="space-y-1.5">
            <Label htmlFor="statement">
              지원 동기 및 각오 <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="statement"
              placeholder="코칭 여정을 돌아보며 자격증 취득에 대한 동기, 코칭에 대한 철학, 앞으로의 목표를 자유롭게 작성해 주세요. (최소 50자)"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className={`text-xs text-right ${statement.length < 50 ? "text-muted-foreground" : "text-chart-4"}`}>
              {statement.length}자 {statement.length < 50 ? `(최소 50자 필요)` : "✓"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !requirements.allMet || statement.trim().length < 50}
          >
            {submitting ? "신청 중..." : "자격증 신청"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
