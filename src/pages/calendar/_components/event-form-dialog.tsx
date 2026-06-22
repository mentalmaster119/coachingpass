import { useState, useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

type EventType = "personal" | "coaching" | "education" | "mentor_coaching" | "shared";

type ExistingEvent = {
  _id: Id<"calendarEvents">;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  eventType: EventType;
  isShared: boolean;
  color?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  defaultDate?: string; // YYYY-MM-DD
  existingEvent?: ExistingEvent;
  userRole: string;
};

const EVENT_TYPE_OPTIONS: { value: EventType; label: string }[] = [
  { value: "personal", label: "개인 일정" },
  { value: "coaching", label: "코칭 실습" },
  { value: "education", label: "교육 이수" },
  { value: "mentor_coaching", label: "멘토코칭/코더코" },
  { value: "shared", label: "공유 일정" },
];

export default function EventFormDialog({ open, onClose, defaultDate, existingEvent, userRole }: Props) {
  const createEvent = useMutation(api.calendar.createEvent);
  const updateEvent = useMutation(api.calendar.updateEvent);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate ?? "");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [eventType, setEventType] = useState<EventType>("personal");
  const [isShared, setIsShared] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Allow admin/senior_coach to create shared events
  const canCreateShared = userRole === "admin" || userRole === "senior_coach";

  // Filter event type options
  const typeOptions = canCreateShared
    ? EVENT_TYPE_OPTIONS
    : EVENT_TYPE_OPTIONS.filter((o) => o.value !== "shared");

  useEffect(() => {
    if (existingEvent) {
      setTitle(existingEvent.title);
      setDescription(existingEvent.description ?? "");
      setEventDate(existingEvent.eventDate);
      setStartTime(existingEvent.startTime ?? "");
      setEndTime(existingEvent.endTime ?? "");
      setEventType(existingEvent.eventType);
      setIsShared(existingEvent.isShared);
    } else {
      setTitle("");
      setDescription("");
      setEventDate(defaultDate ?? "");
      setStartTime("");
      setEndTime("");
      setEventType("personal");
      setIsShared(false);
    }
  }, [existingEvent, defaultDate, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("제목을 입력해주세요."); return; }
    if (!eventDate) { toast.error("날짜를 선택해주세요."); return; }

    setSubmitting(true);
    try {
      if (existingEvent) {
        await updateEvent({
          eventId: existingEvent._id,
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          eventType,
          isShared,
        });
        toast.success("일정이 수정되었습니다.");
      } else {
        await createEvent({
          title: title.trim(),
          description: description.trim() || undefined,
          eventDate,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          eventType,
          isShared,
        });
        toast.success("일정이 등록되었습니다.");
      }
      onClose();
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("저장 중 오류가 발생했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{existingEvent ? "일정 수정" : "새 일정 등록"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>제목 *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="일정 제목 입력"
              maxLength={100}
            />
          </div>

          <div className="space-y-1.5">
            <Label>날짜 *</Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>시작 시간</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>종료 시간</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>유형</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {typeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>설명 (선택)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="일정 설명을 입력하세요"
              rows={3}
            />
          </div>

          {canCreateShared && (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
              <div>
                <p className="text-sm font-medium">전체 공유 일정</p>
                <p className="text-xs text-muted-foreground">모든 수강생에게 표시됩니다</p>
              </div>
              <Switch checked={isShared} onCheckedChange={setIsShared} />
            </div>
          )}

          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>
              취소
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "저장 중..." : existingEvent ? "수정" : "등록"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
