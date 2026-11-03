import { useState, useEffect } from "react";
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
import { Input } from "@/components/ui/input.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Award,
  User,
  Phone,
  GraduationCap,
  Sparkles,
  Clock,
  MapPin,
  BookOpen,
} from "lucide-react";

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

interface ExamScheduleInfo {
  id: string;
  title: string;
  shortTitle: string;
  targetCohorts?: string[];
  targetCohortDisplay?: string;
  applicationPeriod?: string;
  examDate?: string;
  examTimeDisplay?: string;
  location?: string;
  subjects?: string;
  isOpen?: boolean;
  description?: string;
}

interface CertificationApplyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requirements: RequirementStatus;
  examSchedule?: ExamScheduleInfo | null;
  defaultCohortName?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

export default function CertificationApplyDialog({
  open,
  onOpenChange,
  requirements,
  examSchedule,
  defaultCohortName,
  userName,
  userEmail,
  userPhone,
}: CertificationApplyDialogProps) {
  const submit = useMutation(api.certification.submit);

  const [statement, setStatement] = useState("");
  const [phone, setPhone] = useState(userPhone || "");
  const [selectedCohort, setSelectedCohort] = useState(defaultCohortName || "17기");
  const [examType, setExamType] = useState<string>("comprehensive");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (userPhone && !phone) {
      setPhone(userPhone);
    }
  }, [userPhone]);

  useEffect(() => {
    if (defaultCohortName) {
      setSelectedCohort(defaultCohortName);
    }
  }, [defaultCohortName]);

  const handleSubmit = async () => {
    if (!statement.trim() || statement.trim().length < 20) {
      toast.error("지원 동기 및 각오를 20자 이상 작성해 주세요.");
      return;
    }
    if (!selectedCohort) {
      toast.error("소속 기수를 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await submit({
        personalStatement: statement.trim(),
        examTitle: examSchedule?.title || "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험",
        examDate: examSchedule?.examDate || "2026-11-28",
        targetCohort: selectedCohort,
        examType,
        phone: phone.trim() || undefined,
      });

      toast.success(
        `${selectedCohort} ${examSchedule?.shortTitle || "2026 하반기 인증시험"} 신청이 정상 접수되었습니다!`,
      );
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

  const examTitleDisplay = examSchedule?.title || "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <DialogHeader className="text-left space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Award className="w-3.5 h-3.5" />
              2026년 하반기 정기 자격시험
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            SMPCC 자격 인증시험 응시 신청서
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            16기, 17기 및 동문 코치님을 위한 2026년 하반기 인증시험 원서 접수 양식입니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* 1. Exam Schedule Summary Banner */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                {examTitleDisplay}
              </span>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30 bg-emerald-500/10">
                접수 진행중
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
              <div>
                <span className="font-medium text-foreground">시험 일시:</span>{" "}
                {examSchedule?.examTimeDisplay || "2026. 11. 28 (토) 10:00 ~ 17:00"}
              </div>
              <div>
                <span className="font-medium text-foreground">원서 접수:</span>{" "}
                {examSchedule?.applicationPeriod || "2026. 10. 20 ~ 11. 15"}
              </div>
              <div className="col-span-2">
                <span className="font-medium text-foreground">시험 장소:</span>{" "}
                {examSchedule?.location || "MCCI 본원 대강당 및 온라인 화상 심사"}
              </div>
            </div>
          </div>

          {/* 2. Applicant Info Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              응시자 기본 정보
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">응시자 성명</Label>
                <Input value={userName || "코치"} readOnly className="h-8 text-xs bg-muted/30" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">이메일 계정</Label>
                <Input value={userEmail || ""} readOnly className="h-8 text-xs bg-muted/30 font-mono" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground flex items-center justify-between">
                  <span>소속 기수 *</span>
                  <span className="text-[10px] text-primary">16기/17기 중심</span>
                </Label>
                <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue placeholder="소속 기수 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="17기">17기 (2026 하반기 대상)</SelectItem>
                    <SelectItem value="16기">16기 (2026 하반기 대상)</SelectItem>
                    <SelectItem value="18기">18기 (진행중 사전 신청)</SelectItem>
                    <SelectItem value="15기">15기 (동문 수료 코치)</SelectItem>
                    <SelectItem value="14기 이하 이전 기수">14기 이하 이전 기수 동문</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">연락처 (휴대폰)</Label>
                <Input
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-8 text-xs bg-background"
                />
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Label className="text-xs text-muted-foreground">응시 전형 구분</Label>
                <Select value={examType} onValueChange={setExamType}>
                  <SelectTrigger className="h-8 text-xs bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comprehensive">
                      종합 응시 (1차 필기시험 + 2차 실기 시연 및 구술 심사) - 일반
                    </SelectItem>
                    <SelectItem value="practical_only">
                      실기 전형만 응시 (1차 필기시험 기합격자 또는 면제자)
                    </SelectItem>
                    <SelectItem value="written_only">
                      필기 전형만 응시 (이론 시험 단독 응시)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* 3. Requirement Status Preview & Grace Policy Callout */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-foreground flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-primary" />
                현재 자격 이수 요건 현황 (참고용)
              </span>
              <span className="text-[11px] text-muted-foreground">
                교육 {requirements.educationHours}/{requirements.educationRequired}h · 실습{" "}
                {requirements.coachingHours}/{requirements.coachingRequired}h
              </span>
            </div>

            <div className="rounded-xl border border-border p-3 space-y-2 bg-card">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">정규 교육 이수 시간</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {requirements.educationHours} / {requirements.educationRequired}시간
                  </span>
                  {requirements.educationMet ? (
                    <CheckCircle className="w-3.5 h-3.5 text-chart-4" />
                  ) : (
                    <span className="text-[11px] text-amber-600 font-medium">(진행중)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">코칭 실습 인정 시간</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-foreground">
                    {requirements.coachingHours} / {requirements.coachingRequired}시간
                  </span>
                  {requirements.coachingMet ? (
                    <CheckCircle className="w-3.5 h-3.5 text-chart-4" />
                  ) : (
                    <span className="text-[11px] text-amber-600 font-medium">(진행중)</span>
                  )}
                </div>
              </div>
            </div>

            {/* Crucial policy callout: Deficiencies do not block application */}
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
                <span className="font-semibold">[사전 요건 유예 안내]</span> 과제 제출 및 실습 시간 일부
                미달 항목이 있더라도 <strong>인증시험 응시 신청이 가능합니다.</strong> 부족한 요건은 시험 전후
                보완할 수 있으며, 최종 자격증 교부 시 관리자 및 심사위원회에서 충족 여부를 최종 검토합니다.
              </div>
            </div>
          </div>

          {/* 4. Personal Statement */}
          <div className="space-y-1.5">
            <Label htmlFor="statement" className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>지원 동기 및 코칭 실천 각오 *</span>
              <span className={`text-[11px] ${statement.length < 20 ? "text-muted-foreground" : "text-chart-4 font-medium"}`}>
                {statement.length}자 {statement.length < 20 ? "(최소 20자 필요)" : "✓"}
              </span>
            </Label>
            <Textarea
              id="statement"
              placeholder="코칭 여정을 돌아보며 이번 2026년 하반기 SMPCC 인증시험에 응시하는 각오와 향후 멘탈코칭 실천 계획을 작성해 주세요. (최소 20자 이상)"
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              rows={4}
              className="resize-none text-xs bg-background"
            />
          </div>
        </div>

        <DialogFooter className="pt-2 gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || statement.trim().length < 20}
            className="font-semibold shadow-xs"
          >
            {submitting ? "접수 처리 중..." : "인증시험 응시 신청 완료"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
