import { useState, useEffect } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
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
  Calendar,
  CalendarDays,
  Clock,
  MapPin,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle,
  AlertCircle,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";

interface AdminExamScheduleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminExamScheduleModal({
  open,
  onOpenChange,
}: AdminExamScheduleModalProps) {
  const currentExam = useQuery(api.certification.getUpcomingExamSchedule);
  const upsertExam = useMutation(api.certification.upsertExamSchedule);

  const [title, setTitle] = useState("");
  const [targetCohorts, setTargetCohorts] = useState("");
  const [applicationStartDate, setApplicationStartDate] = useState("");
  const [applicationEndDate, setApplicationEndDate] = useState("");
  const [applicationPeriod, setApplicationPeriod] = useState("");
  const [examDate, setExamDate] = useState("");
  const [examTimeDisplay, setExamTimeDisplay] = useState("");
  const [location, setLocation] = useState("");
  const [subjects, setSubjects] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [description, setDescription] = useState("");
  const [syncToCalendar, setSyncToCalendar] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load from current query when opened
  useEffect(() => {
    if (open && currentExam) {
      setTitle(currentExam.title || "2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험");
      setTargetCohorts(currentExam.targetCohortDisplay || "16기, 17기 (및 이전 기수 동문/재응시자)");
      setApplicationStartDate(currentExam.applicationStartDate || "2026-10-20");
      setApplicationEndDate(currentExam.applicationEndDate || "2026-11-15");
      setApplicationPeriod(currentExam.applicationPeriod || "2026. 10. 20 (월) ~ 2026. 11. 15 (일)");
      setExamDate(currentExam.examDate || "2026-11-28");
      setExamTimeDisplay(currentExam.examTimeDisplay || "2026년 11월 28일 (토) 10:00 ~ 17:00");
      setLocation(currentExam.location || "MCCI 본원 대강당 (서울 강남) 및 비대면 화상 심사 병행");
      setSubjects(currentExam.subjects || "1차 필기 (코칭 이론 및 윤리 규정) + 2차 실기 (코칭 시연 및 구술 면접)");
      setIsOpen(currentExam.isOpen ?? true);
      setDescription(
        currentExam.description ||
          "16기, 17기 교육생 및 수료생을 위한 2026년 하반기 공식 인증시험입니다. 과제 제출 또는 실습 시간 일부 미달 항목이 있더라도 응시 신청이 가능하며, 최종 자격증 발급 시 심사위원회에서 이수 기준을 최종 검토합니다.",
      );
    }
  }, [open, currentExam]);

  // Preset 2026 하반기 default loader
  const handleLoadDefaults = () => {
    setTitle("2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험");
    setTargetCohorts("16기, 17기 (및 이전 기수 동문/재응시자)");
    setApplicationStartDate("2026-10-20");
    setApplicationEndDate("2026-11-15");
    setApplicationPeriod("2026. 10. 20 (월) ~ 2026. 11. 15 (일)");
    setExamDate("2026-11-28");
    setExamTimeDisplay("2026년 11월 28일 (토) 10:00 ~ 17:00");
    setLocation("MCCI 본원 대강당 (서울 강남) 및 비대면 화상 심사 병행");
    setSubjects("1차 필기 (코칭 이론 및 윤리 규정) + 2차 실기 (코칭 시연 및 구술 면접)");
    setIsOpen(true);
    setDescription(
      "16기, 17기 교육생 및 수료생을 위한 2026년 하반기 공식 인증시험입니다. 과제 제출 또는 실습 시간 일부 미달 항목이 있더라도 응시 신청이 가능하며, 최종 자격증 발급 시 심사위원회에서 이수 기준을 최종 검토합니다.",
    );
    toast.info("2026년 하반기 추천 기본값이 로드되었습니다.");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !examDate.trim()) {
      toast.error("시험명과 시험 일자를 입력해 주세요.");
      return;
    }

    setSaving(true);
    try {
      await upsertExam({
        scheduleId: currentExam?._id as Id<"examSchedules"> | undefined,
        title: title.trim(),
        targetCohorts: targetCohorts.trim(),
        applicationStartDate: applicationStartDate.trim(),
        applicationEndDate: applicationEndDate.trim(),
        applicationPeriod: applicationPeriod.trim() || undefined,
        examDate: examDate.trim(),
        examTimeDisplay: examTimeDisplay.trim(),
        location: location.trim(),
        subjects: subjects.trim(),
        isOpen,
        description: description.trim() || undefined,
        syncToCalendar,
      });

      toast.success("인증시험 공지 및 일정이 저장되었습니다! 교육생 화면에 즉시 반영됩니다.");
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.message || "저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6">
        <form onSubmit={handleSave} className="space-y-5">
          <DialogHeader className="text-left space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <Calendar className="w-3.5 h-3.5" />
                인증시험 안내 카드 & 일정 관리
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadDefaults}
                className="h-7 text-xs gap-1 cursor-pointer border-primary/30 text-primary hover:bg-primary/10"
              >
                <RotateCcw className="w-3 h-3" />
                16기·17기 기본값 불러오기
              </Button>
            </div>
            <DialogTitle className="text-xl font-bold text-foreground">
              인증시험 공지 카드 및 일정 설정
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              교육생 화면의 <strong>'인증시험 안내 카드'</strong>에 표시될 시험명, 일정, 장소, 안내 문구를 직접 등록 및 편집합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {/* 1. Exam Title & Target Cohort */}
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/70">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-primary" />
                시험 기본 정보
              </h4>
              <div className="space-y-2.5">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">시험 공식 명칭 *</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예: 2026년 하반기 SMPCC 멘탈코칭 전문가 자격 인증시험"
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">대상 기수 *</Label>
                    <Input
                      value={targetCohorts}
                      onChange={(e) => setTargetCohorts(e.target.value)}
                      placeholder="예: 16기, 17기 (및 이전 기수 동문)"
                      className="h-8 text-xs bg-background"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">원서 접수 상태</Label>
                    <Select
                      value={isOpen ? "open" : "closed"}
                      onValueChange={(v) => setIsOpen(v === "open")}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">🟢 원서 접수 진행중 (오픈)</SelectItem>
                        <SelectItem value="closed">⚪ 접수 마감 / 예정 (비활성화)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Schedule & Period */}
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/70">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-primary" />
                접수 기간 및 시험 일시
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">원서 접수 시작일 (YYYY-MM-DD)</Label>
                  <Input
                    type="date"
                    value={applicationStartDate}
                    onChange={(e) => {
                      setApplicationStartDate(e.target.value);
                      if (applicationEndDate) {
                        setApplicationPeriod(`${e.target.value} ~ ${applicationEndDate}`);
                      }
                    }}
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">원서 접수 마감일 (YYYY-MM-DD)</Label>
                  <Input
                    type="date"
                    value={applicationEndDate}
                    onChange={(e) => {
                      setApplicationEndDate(e.target.value);
                      if (applicationStartDate) {
                        setApplicationPeriod(`${applicationStartDate} ~ ${e.target.value}`);
                      }
                    }}
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs font-medium">카드에 표시될 접수 기간 문구</Label>
                  <Input
                    value={applicationPeriod}
                    onChange={(e) => setApplicationPeriod(e.target.value)}
                    placeholder="예: 2026. 10. 20 (월) ~ 2026. 11. 15 (일)"
                    className="h-8 text-xs bg-background"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">시험일 (YYYY-MM-DD)</Label>
                  <Input
                    type="date"
                    value={examDate}
                    onChange={(e) => {
                      setExamDate(e.target.value);
                      setExamTimeDisplay(`${e.target.value} 10:00 ~ 17:00`);
                    }}
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">카드에 표시될 시험 일시 문구</Label>
                  <Input
                    value={examTimeDisplay}
                    onChange={(e) => setExamTimeDisplay(e.target.value)}
                    placeholder="예: 2026년 11월 28일 (토) 10:00 ~ 17:00"
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 3. Location & Subjects */}
            <div className="space-y-3 p-3.5 rounded-xl bg-muted/30 border border-border/70">
              <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                장소 및 전형 과목
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">시험 장소</Label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="예: MCCI 본원 대강당 및 비대면 화상 심사 병행"
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">전형 과목</Label>
                  <Input
                    value={subjects}
                    onChange={(e) => setSubjects(e.target.value)}
                    placeholder="예: 1차 필기 (코칭 이론/윤리) + 2차 실기 (코칭 시연 및 구술)"
                    className="h-8 text-xs bg-background"
                    required
                  />
                </div>
              </div>
            </div>

            {/* 4. Description & Policy Guide */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-foreground flex items-center justify-between">
                <span>안내 카드 본문 문구 및 공지사항</span>
                <span className="text-[11px] text-muted-foreground font-normal">
                  (과제/실습 요건 유예 안내 포함 권장)
                </span>
              </Label>
              <Textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="교육생 화면의 안내 카드 본문에 노출될 세부 공지 내용을 입력하세요."
                className="text-xs resize-none bg-background leading-relaxed"
              />
            </div>

            {/* 5. Calendar Auto Sync Checkbox */}
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2.5">
              <input
                type="checkbox"
                id="syncCal"
                checked={syncToCalendar}
                onChange={(e) => setSyncToCalendar(e.target.checked)}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
              <label htmlFor="syncCal" className="text-xs text-emerald-950 dark:text-emerald-200 cursor-pointer font-medium">
                공식 캘린더(일정 메뉴)에도 시험 일정을 함께 등록·동기화합니다. (권장)
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              취소
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="font-semibold shadow-xs">
              {saving ? "저장 중..." : "인증시험 공지 카드 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
