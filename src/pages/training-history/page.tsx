import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  Plus,
  BookOpen,
  Award,
  Building2,
  CalendarDays,
  Pencil,
  Trash2,
  ShieldCheck,
  GraduationCap,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

// ── Constants ──────────────────────────────────────────────────────────────────

const CENTER_COURSES = [
  "KAC기본과정",
  "KPC심화과정",
  "MSPE기본과정",
  "SuperVision과정",
  "스포츠멘탈코칭강독기본과정",
  "스포츠멘탈코칭강독심화과정",
] as const;

type CenterCourse = (typeof CENTER_COURSES)[number];

const LICENSE_TYPES = ["KAC", "KPC", "KSC", "ACC", "PCC", "MCC", "other"] as const;
type LicenseType = (typeof LICENSE_TYPES)[number];

const LICENSE_LABELS: Record<LicenseType, string> = {
  KAC: "KAC (한국코치협회 전문코치)",
  KPC: "KPC (한국코치협회 수석코치)",
  KSC: "KSC (한국코치협회 코치수퍼바이저)",
  ACC: "ACC (ICF 인증코치)",
  PCC: "PCC (ICF 전문코치)",
  MCC: "MCC (ICF 마스터코치)",
  other: "기타",
};

// ── Types ──────────────────────────────────────────────────────────────────────

type TrainingRecord = {
  _id: Id<"trainingHistory">;
  courseType: "center" | "external";
  centerCourseName?: CenterCourse;
  externalCourseName?: string;
  organizer?: string;
  completionDate: string;
  notes?: string;
};

type LicenseRecord = {
  _id: Id<"coachLicenses">;
  licenseType: LicenseType;
  otherLicenseName?: string;
  issuedBy?: string;
  acquiredDate?: string;
  expiryDate?: string;
  isActive: boolean;
  notes?: string;
};

// ── Training Form ──────────────────────────────────────────────────────────────

type TrainingFormData = {
  courseType: "center" | "external";
  centerCourseName: CenterCourse | "";
  externalCourseName: string;
  organizer: string;
  completionDate: string;
  notes: string;
};

const defaultTrainingForm: TrainingFormData = {
  courseType: "center",
  centerCourseName: "",
  externalCourseName: "",
  organizer: "",
  completionDate: "",
  notes: "",
};

function TrainingDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: TrainingRecord;
  onSave: (data: TrainingFormData) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState<TrainingFormData>(
    initial
      ? {
          courseType: initial.courseType,
          centerCourseName: (initial.centerCourseName as CenterCourse) ?? "",
          externalCourseName: initial.externalCourseName ?? "",
          organizer: initial.organizer ?? "",
          completionDate: initial.completionDate,
          notes: initial.notes ?? "",
        }
      : defaultTrainingForm,
  );

  const set = <K extends keyof TrainingFormData>(k: K, v: TrainingFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.completionDate) { toast.error("이수일을 입력해주세요"); return; }
    if (form.courseType === "center" && !form.centerCourseName) { toast.error("과정을 선택해주세요"); return; }
    if (form.courseType === "external" && !form.externalCourseName.trim()) { toast.error("과정명을 입력해주세요"); return; }
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "과정 이수 수정" : "과정 이수 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* Course type */}
          <div className="space-y-1.5">
            <Label>과정 구분</Label>
            <div className="flex gap-2">
              <Button
                variant={form.courseType === "center" ? "default" : "outline"}
                size="sm"
                className="cursor-pointer"
                onClick={() => set("courseType", "center")}
                type="button"
              >
                <GraduationCap className="w-3.5 h-3.5 mr-1" />
                센터 과정
              </Button>
              <Button
                variant={form.courseType === "external" ? "default" : "outline"}
                size="sm"
                className="cursor-pointer"
                onClick={() => set("courseType", "external")}
                type="button"
              >
                <ExternalLink className="w-3.5 h-3.5 mr-1" />
                외부 과정
              </Button>
            </div>
          </div>

          {/* Center course selector */}
          {form.courseType === "center" && (
            <div className="space-y-1.5">
              <Label>과정명 <span className="text-destructive">*</span></Label>
              <Select
                value={form.centerCourseName}
                onValueChange={(v) => set("centerCourseName", v as CenterCourse)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="과정 선택" />
                </SelectTrigger>
                <SelectContent>
                  {CENTER_COURSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* External course */}
          {form.courseType === "external" && (
            <>
              <div className="space-y-1.5">
                <Label>과정명 <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="과정명 입력"
                  value={form.externalCourseName}
                  onChange={(e) => set("externalCourseName", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>주관 기관</Label>
                <Input
                  placeholder="주관 회사/기관명"
                  value={form.organizer}
                  onChange={(e) => set("organizer", e.target.value)}
                />
              </div>
            </>
          )}

          {/* Completion date */}
          <div className="space-y-1.5">
            <Label>이수일 <span className="text-destructive">*</span></Label>
            <Input
              type="date"
              value={form.completionDate}
              onChange={(e) => set("completionDate", e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>비고</Label>
            <Textarea
              placeholder="추가 내용 (선택)"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── License Form ───────────────────────────────────────────────────────────────

type LicenseFormData = {
  licenseType: LicenseType | "";
  otherLicenseName: string;
  issuedBy: string;
  acquiredDate: string;
  expiryDate: string;
  isActive: boolean;
  notes: string;
};

const defaultLicenseForm: LicenseFormData = {
  licenseType: "",
  otherLicenseName: "",
  issuedBy: "",
  acquiredDate: "",
  expiryDate: "",
  isActive: true,
  notes: "",
};

function LicenseDialog({
  open,
  onClose,
  initial,
  onSave,
  loading,
}: {
  open: boolean;
  onClose: () => void;
  initial?: LicenseRecord;
  onSave: (data: LicenseFormData) => Promise<void>;
  loading: boolean;
}) {
  const [form, setForm] = useState<LicenseFormData>(
    initial
      ? {
          licenseType: initial.licenseType,
          otherLicenseName: initial.otherLicenseName ?? "",
          issuedBy: initial.issuedBy ?? "",
          acquiredDate: initial.acquiredDate ?? "",
          expiryDate: initial.expiryDate ?? "",
          isActive: initial.isActive,
          notes: initial.notes ?? "",
        }
      : defaultLicenseForm,
  );

  const set = <K extends keyof LicenseFormData>(k: K, v: LicenseFormData[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.licenseType) { toast.error("자격증 종류를 선택해주세요"); return; }
    if (form.licenseType === "other" && !form.otherLicenseName.trim()) { toast.error("자격증명을 입력해주세요"); return; }
    await onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{initial ? "자격증 수정" : "자격증 추가"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {/* License type */}
          <div className="space-y-1.5">
            <Label>자격증 종류 <span className="text-destructive">*</span></Label>
            <Select
              value={form.licenseType}
              onValueChange={(v) => set("licenseType", v as LicenseType)}
            >
              <SelectTrigger>
                <SelectValue placeholder="자격증 선택" />
              </SelectTrigger>
              <SelectContent>
                {LICENSE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{LICENSE_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Other license name */}
          {form.licenseType === "other" && (
            <div className="space-y-1.5">
              <Label>자격증명 <span className="text-destructive">*</span></Label>
              <Input
                placeholder="자격증명 입력"
                value={form.otherLicenseName}
                onChange={(e) => set("otherLicenseName", e.target.value)}
              />
            </div>
          )}

          {/* Issued by */}
          <div className="space-y-1.5">
            <Label>발급 기관</Label>
            <Input
              placeholder="발급 기관명 (예: 한국코치협회, ICF)"
              value={form.issuedBy}
              onChange={(e) => set("issuedBy", e.target.value)}
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>취득일</Label>
              <Input
                type="date"
                value={form.acquiredDate}
                onChange={(e) => set("acquiredDate", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>만료일</Label>
              <Input
                type="date"
                value={form.expiryDate}
                onChange={(e) => set("expiryDate", e.target.value)}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border">
            <div>
              <p className="text-sm font-medium">현재 유효</p>
              <p className="text-xs text-muted-foreground">현재 유효한 자격증이면 켜주세요</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => set("isActive", v)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>비고</Label>
            <Textarea
              placeholder="추가 내용 (선택)"
              rows={2}
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={loading}>취소</Button>
          <Button onClick={handleSubmit} disabled={loading} className="cursor-pointer">
            {loading ? "저장 중..." : "저장"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function TrainingHistoryPage() {
  const trainings = useQuery(api.trainingHistory.getMyTrainingHistory, {});
  const licenses = useQuery(api.trainingHistory.getMyLicenses, {});

  const addTraining = useMutation(api.trainingHistory.addTrainingHistory);
  const updateTraining = useMutation(api.trainingHistory.updateTrainingHistory);
  const deleteTraining = useMutation(api.trainingHistory.deleteTrainingHistory);

  const addLicense = useMutation(api.trainingHistory.addLicense);
  const updateLicense = useMutation(api.trainingHistory.updateLicense);
  const deleteLicense = useMutation(api.trainingHistory.deleteLicense);

  // Training dialog state
  const [trainingDialog, setTrainingDialog] = useState<{ open: boolean; record?: TrainingRecord }>({ open: false });
  const [trainingLoading, setTrainingLoading] = useState(false);
  const [deleteTrainingId, setDeleteTrainingId] = useState<Id<"trainingHistory"> | null>(null);

  // License dialog state
  const [licenseDialog, setLicenseDialog] = useState<{ open: boolean; record?: LicenseRecord }>({ open: false });
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [deleteLicenseId, setDeleteLicenseId] = useState<Id<"coachLicenses"> | null>(null);

  // ── Training handlers ────────────────────────────────────────────────────────

  const handleSaveTraining = async (data: TrainingFormData) => {
    setTrainingLoading(true);
    try {
      const payload = {
        courseType: data.courseType,
        centerCourseName: data.courseType === "center" && data.centerCourseName
          ? data.centerCourseName
          : undefined,
        externalCourseName: data.courseType === "external" ? data.externalCourseName : undefined,
        organizer: data.organizer || undefined,
        completionDate: data.completionDate,
        notes: data.notes || undefined,
      };
      if (trainingDialog.record) {
        await updateTraining({ id: trainingDialog.record._id, ...payload });
        toast.success("과정 이수 기록이 수정되었습니다");
      } else {
        await addTraining(payload);
        toast.success("과정 이수 기록이 추가되었습니다");
      }
      setTrainingDialog({ open: false });
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setTrainingLoading(false);
    }
  };

  const handleDeleteTraining = async () => {
    if (!deleteTrainingId) return;
    try {
      await deleteTraining({ id: deleteTrainingId });
      toast.success("삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteTrainingId(null);
    }
  };

  // ── License handlers ─────────────────────────────────────────────────────────

  const handleSaveLicense = async (data: LicenseFormData) => {
    if (!data.licenseType) return;
    setLicenseLoading(true);
    try {
      const payload = {
        licenseType: data.licenseType,
        otherLicenseName: data.licenseType === "other" ? data.otherLicenseName : undefined,
        issuedBy: data.issuedBy || undefined,
        acquiredDate: data.acquiredDate || undefined,
        expiryDate: data.expiryDate || undefined,
        isActive: data.isActive,
        notes: data.notes || undefined,
      };
      if (licenseDialog.record) {
        await updateLicense({ id: licenseDialog.record._id, ...payload });
        toast.success("자격증 정보가 수정되었습니다");
      } else {
        await addLicense(payload);
        toast.success("자격증이 추가되었습니다");
      }
      setLicenseDialog({ open: false });
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setLicenseLoading(false);
    }
  };

  const handleDeleteLicense = async () => {
    if (!deleteLicenseId) return;
    try {
      await deleteLicense({ id: deleteLicenseId });
      toast.success("삭제되었습니다");
    } catch {
      toast.error("삭제에 실패했습니다");
    } finally {
      setDeleteLicenseId(null);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  const centerTrainings = (trainings ?? []).filter((t) => t.courseType === "center");
  const externalTrainings = (trainings ?? []).filter((t) => t.courseType === "external");
  const activeCount = (licenses ?? []).filter((l) => l.isActive).length;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            교육이력 및 자격증
          </h1>
          <p className="text-sm text-muted-foreground mt-1">과정 이수 이력과 보유 자격증을 관리하세요</p>
        </div>
      </div>

      <Tabs defaultValue="training">
        <TabsList className="w-full">
          <TabsTrigger value="training" className="flex-1">
            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
            과정 이수 이력
            {trainings !== undefined && <Badge variant="secondary" className="ml-1.5 text-xs">{trainings.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="licenses" className="flex-1">
            <Award className="w-3.5 h-3.5 mr-1.5" />
            보유 자격증
            {licenses !== undefined && activeCount > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs">{activeCount}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Training History Tab ── */}
        <TabsContent value="training" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setTrainingDialog({ open: true })} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              과정 추가
            </Button>
          </div>

          {trainings === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : trainings.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><GraduationCap /></EmptyMedia>
                <EmptyTitle>이수 이력이 없습니다</EmptyTitle>
                <EmptyDescription>센터 과정 또는 외부 과정 이수 이력을 추가하세요</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setTrainingDialog({ open: true })} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-1.5" />과정 추가
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-4">
              {centerTrainings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5" />센터 개설 과정
                  </h3>
                  <div className="space-y-2">
                    {centerTrainings
                      .sort((a, b) => b.completionDate.localeCompare(a.completionDate))
                      .map((t) => (
                        <TrainingCard
                          key={t._id}
                          record={t as TrainingRecord}
                          onEdit={() => setTrainingDialog({ open: true, record: t as TrainingRecord })}
                          onDelete={() => setDeleteTrainingId(t._id)}
                        />
                      ))}
                  </div>
                </div>
              )}
              {externalTrainings.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                    <ExternalLink className="w-3.5 h-3.5" />외부 과정
                  </h3>
                  <div className="space-y-2">
                    {externalTrainings
                      .sort((a, b) => b.completionDate.localeCompare(a.completionDate))
                      .map((t) => (
                        <TrainingCard
                          key={t._id}
                          record={t as TrainingRecord}
                          onEdit={() => setTrainingDialog({ open: true, record: t as TrainingRecord })}
                          onDelete={() => setDeleteTrainingId(t._id)}
                        />
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ── Licenses Tab ── */}
        <TabsContent value="licenses" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setLicenseDialog({ open: true })} className="cursor-pointer">
              <Plus className="w-4 h-4 mr-1.5" />
              자격증 추가
            </Button>
          </div>

          {licenses === undefined ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : licenses.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><Award /></EmptyMedia>
                <EmptyTitle>자격증이 없습니다</EmptyTitle>
                <EmptyDescription>보유한 코칭 자격증을 추가하세요</EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button size="sm" onClick={() => setLicenseDialog({ open: true })} className="cursor-pointer">
                  <Plus className="w-4 h-4 mr-1.5" />자격증 추가
                </Button>
              </EmptyContent>
            </Empty>
          ) : (
            <div className="space-y-2">
              {licenses
                .sort((a, b) => (b.isActive ? 1 : 0) - (a.isActive ? 1 : 0))
                .map((l) => (
                  <LicenseCard
                    key={l._id}
                    record={l as LicenseRecord}
                    onEdit={() => setLicenseDialog({ open: true, record: l as LicenseRecord })}
                    onDelete={() => setDeleteLicenseId(l._id)}
                  />
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <TrainingDialog
        open={trainingDialog.open}
        onClose={() => setTrainingDialog({ open: false })}
        initial={trainingDialog.record}
        onSave={handleSaveTraining}
        loading={trainingLoading}
      />
      <LicenseDialog
        open={licenseDialog.open}
        onClose={() => setLicenseDialog({ open: false })}
        initial={licenseDialog.record}
        onSave={handleSaveLicense}
        loading={licenseLoading}
      />

      {/* Delete confirmations */}
      <AlertDialog open={!!deleteTrainingId} onOpenChange={(o) => !o && setDeleteTrainingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 과정 이수 기록이 영구적으로 삭제됩니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTraining}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteLicenseId} onOpenChange={(o) => !o && setDeleteLicenseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>이 자격증 기록이 영구적으로 삭제됩니다.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteLicense}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrainingCard({
  record,
  onEdit,
  onDelete,
}: {
  record: TrainingRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const name =
    record.courseType === "center"
      ? record.centerCourseName
      : record.externalCourseName;

  const dateStr = (() => {
    try {
      return format(parseISO(record.completionDate), "yyyy년 M월 d일", { locale: ko });
    } catch {
      return record.completionDate;
    }
  })();

  return (
    <Card>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{name}</span>
              {record.courseType === "center" ? (
                <Badge variant="default" className="text-xs">센터과정</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">외부과정</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <CalendarDays className="w-3 h-3" />
                {dateStr}
              </span>
              {record.organizer && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {record.organizer}
                </span>
              )}
            </div>
            {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive cursor-pointer" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LicenseCard({
  record,
  onEdit,
  onDelete,
}: {
  record: LicenseRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const licenseName =
    record.licenseType === "other"
      ? (record.otherLicenseName ?? "기타 자격증")
      : record.licenseType;

  const acquiredStr = record.acquiredDate
    ? (() => {
        try { return format(parseISO(record.acquiredDate), "yyyy.MM.dd"); }
        catch { return record.acquiredDate; }
      })()
    : null;

  const expiryStr = record.expiryDate
    ? (() => {
        try { return format(parseISO(record.expiryDate), "yyyy.MM.dd"); }
        catch { return record.expiryDate; }
      })()
    : null;

  return (
    <Card className={cn(!record.isActive && "opacity-60")}>
      <CardContent className="py-3 px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <ShieldCheck className={cn("w-4 h-4 shrink-0", record.isActive ? "text-green-500" : "text-muted-foreground")} />
              <span className="font-semibold text-sm">{licenseName}</span>
              <Badge variant={record.isActive ? "default" : "outline"} className="text-xs">
                {record.isActive ? "유효" : "만료/비활성"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
              {record.issuedBy && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  {record.issuedBy}
                </span>
              )}
              {acquiredStr && (
                <span className="flex items-center gap-1">
                  <CalendarDays className="w-3 h-3" />
                  취득: {acquiredStr}
                </span>
              )}
              {expiryStr && (
                <span>만료: {expiryStr}</span>
              )}
            </div>
            {record.notes && <p className="text-xs text-muted-foreground mt-1">{record.notes}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive cursor-pointer" onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
