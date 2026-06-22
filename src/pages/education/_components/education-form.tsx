import { useState, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";

type EducationRecord = Doc<"educationRecords">;

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  record?: EducationRecord | null;
};

const HOUR_OPTIONS = [0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 24];

export default function EducationForm({ open, onOpenChange, record }: Props) {
  const isEdit = !!record;

  const [educationName, setEducationName] = useState(record?.educationName ?? "");
  const [institution, setInstitution] = useState(record?.institution ?? "");
  const [educationDate, setEducationDate] = useState(record?.educationDate ?? "");
  const [hours, setHours] = useState<string>(record?.hours?.toString() ?? "");
  const [notes, setNotes] = useState(record?.notes ?? "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isPending, setIsPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateUploadUrl = useMutation(api.education.generateUploadUrl);
  const create = useMutation(api.education.create);
  const update = useMutation(api.education.update);

  const resetForm = () => {
    setEducationName("");
    setInstitution("");
    setEducationDate("");
    setHours("");
    setNotes("");
    setSelectedFile(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const handleSubmit = async () => {
    if (!educationName.trim() || !institution.trim() || !educationDate || !hours) {
      toast.error("필수 항목을 모두 입력해 주세요.");
      return;
    }
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) {
      toast.error("올바른 이수 시간을 입력해 주세요.");
      return;
    }

    setIsPending(true);
    try {
      let certificateStorageId: string | undefined;

      // Upload certificate file if selected
      if (selectedFile) {
        const uploadUrl = await generateUploadUrl();
        const result = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": selectedFile.type },
          body: selectedFile,
        });
        if (!result.ok) throw new Error("파일 업로드 실패");
        const { storageId } = await result.json() as { storageId: string };
        certificateStorageId = storageId;
      }

      if (isEdit && record) {
        await update({
          recordId: record._id,
          educationName: educationName.trim(),
          institution: institution.trim(),
          educationDate,
          hours: hoursNum,
          certificateStorageId: certificateStorageId as Parameters<typeof update>[0]["certificateStorageId"] ?? record.certificateStorageId,
          notes: notes.trim() || undefined,
        });
        toast.success("교육 기록이 수정되었습니다.");
      } else {
        await create({
          educationName: educationName.trim(),
          institution: institution.trim(),
          educationDate,
          hours: hoursNum,
          certificateStorageId: certificateStorageId as Parameters<typeof create>[0]["certificateStorageId"],
          notes: notes.trim() || undefined,
        });
        toast.success("교육 기록이 등록되었습니다. 승인 후 시간이 반영됩니다.");
      }

      handleClose();
    } catch (err) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("오류가 발생했습니다.");
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "교육 기록 수정" : "교육 이수 기록 추가"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* 교육명 */}
          <div className="space-y-1.5">
            <Label htmlFor="educationName">
              교육명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="educationName"
              placeholder="예: 코칭 핵심 역량 기초 과정"
              value={educationName}
              onChange={(e) => setEducationName(e.target.value)}
            />
          </div>

          {/* 기관명 */}
          <div className="space-y-1.5">
            <Label htmlFor="institution">
              기관명 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="institution"
              placeholder="예: 국제멘탈코칭센터"
              value={institution}
              onChange={(e) => setInstitution(e.target.value)}
            />
          </div>

          {/* 날짜 + 시간 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="educationDate">
                교육 일자 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="educationDate"
                type="date"
                value={educationDate}
                onChange={(e) => setEducationDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hours">
                이수 시간 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="hours"
                type="number"
                placeholder="예: 3"
                min="0.5"
                step="0.5"
                value={hours}
                onChange={(e) => setHours(e.target.value)}
              />
            </div>
          </div>

          {/* 메모 */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">메모 (선택)</Label>
            <Textarea
              id="notes"
              placeholder="추가 메모사항을 입력하세요"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>

          {/* 수료증 파일 */}
          <div className="space-y-1.5">
            <Label>수료증 첨부 (선택)</Label>
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              {selectedFile ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-foreground">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                    }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-1">
                  <Upload className="w-6 h-6 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    클릭하여 파일 선택
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    이미지 또는 PDF (최대 10MB)
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) setSelectedFile(file);
              }}
            />
            {isEdit && record?.certificateStorageId && !selectedFile && (
              <p className="text-xs text-muted-foreground">
                기존 수료증이 유지됩니다. 새 파일 선택 시 교체됩니다.
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose} disabled={isPending}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "저장 중..." : isEdit ? "수정하기" : "등록하기"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
