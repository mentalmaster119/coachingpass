import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Pencil, Trash2, Clock, Share2, User, MapPin, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog.tsx";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { EVENT_COLORS, SEMINAR_COLORS, EVENT_TYPE_LABELS, SEMINAR_TYPE_LABELS } from "./calendar-view.tsx";
import type { CalendarEvent, SeminarItem } from "./calendar-view.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type Props = {
  selectedDate: Date | null;
  events: CalendarEvent[];
  seminars: SeminarItem[];
  currentUserId: Id<"users"> | undefined;
  onAddEvent: () => void;
  onEditEvent: (event: CalendarEvent) => void;
  userRole: string;
};

export default function DayEventsPanel({
  selectedDate,
  events,
  seminars,
  currentUserId,
  onAddEvent,
  onEditEvent,
  userRole,
}: Props) {
  const deleteEvent = useMutation(api.calendar.deleteEvent);

  const handleDelete = async (eventId: Id<"calendarEvents">) => {
    try {
      await deleteEvent({ eventId });
      toast.success("일정이 삭제되었습니다.");
    } catch {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!selectedDate) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
        <p className="text-sm">날짜를 선택하면</p>
        <p className="text-sm">일정이 표시됩니다.</p>
      </div>
    );
  }

  const dateLabel = format(selectedDate, "M월 d일 (EEE)", { locale: ko });
  const totalItems = seminars.length + events.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h3 className="font-semibold text-sm">{dateLabel}</h3>
        {userRole === "admin" && (
          <Button size="sm" onClick={onAddEvent} className="gap-1 h-7 text-xs px-2">
            <Plus className="w-3 h-3" />
            추가
          </Button>
        )}
      </div>

      {/* Events list */}
      <ScrollArea className="flex-1">
        {totalItems === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
            <p className="text-sm">등록된 일정이 없습니다.</p>
            {userRole === "admin" && (
              <button onClick={onAddEvent} className="mt-2 text-xs text-primary hover:underline">
                + 일정 추가하기
              </button>
            )}
          </div>
        ) : (
          <div className="p-3 space-y-2">
            {/* Seminar items (read-only) */}
            {seminars.map((seminar) => {
              const colors = SEMINAR_COLORS[seminar.seminarType];
              return (
                <div
                  key={seminar._id}
                  className={cn("rounded-lg border p-3 space-y-1.5", colors.bg)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold leading-tight flex-1", colors.text)}>
                      {seminar.title}
                    </p>
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border-current/30 flex-shrink-0", colors.text)}>
                      {SEMINAR_TYPE_LABELS[seminar.seminarType]}
                    </Badge>
                  </div>

                  {(seminar.startTime || seminar.endTime) && (
                    <div className={cn("flex items-center gap-1 text-xs opacity-80", colors.text)}>
                      <Clock className="w-3 h-3" />
                      <span>
                        {seminar.startTime ?? ""}
                        {seminar.startTime && seminar.endTime && " ~ "}
                        {seminar.endTime ?? ""}
                      </span>
                    </div>
                  )}

                  {seminar.location && (
                    <div className={cn("flex items-center gap-1 text-xs opacity-80", colors.text)}>
                      {seminar.isOnline ? <Wifi className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      <span>{seminar.location}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border-current/30", colors.text)}>
                      {seminar.isOnline ? "온라인" : "오프라인"}
                    </Badge>
                    <span className={cn("text-[10px] opacity-60", colors.text)}>
                      {seminar.startDate} {seminar.startDate !== seminar.endDate ? `~ ${seminar.endDate}` : ""}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Personal calendar events */}
            {events.map((ev) => {
              const colors = EVENT_COLORS[ev.eventType];
              const canEdit = userRole === "admin";
              return (
                <div
                  key={ev._id}
                  className={cn("rounded-lg border p-3 space-y-1.5", colors.bg)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={cn("text-sm font-semibold leading-tight flex-1", colors.text)}>
                      {ev.title}
                    </p>
                    {canEdit && (
                      <div className="flex gap-1 flex-shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEditEvent(ev)}>
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive">
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>일정 삭제</AlertDialogTitle>
                              <AlertDialogDescription>"{ev.title}" 일정을 삭제하시겠습니까?</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>취소</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(ev._id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                삭제
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    )}
                  </div>

                  {(ev.startTime || ev.endTime) && (
                    <div className={cn("flex items-center gap-1 text-xs opacity-80", colors.text)}>
                      <Clock className="w-3 h-3" />
                      <span>
                        {ev.startTime ?? ""}
                        {ev.startTime && ev.endTime && " ~ "}
                        {ev.endTime ?? ""}
                      </span>
                    </div>
                  )}

                  {ev.description && (
                    <p className={cn("text-xs opacity-70 leading-relaxed", colors.text)}>{ev.description}</p>
                  )}

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5 border-current/30", colors.text)}>
                      {EVENT_TYPE_LABELS[ev.eventType]}
                    </Badge>
                    {ev.isShared && (
                      <div className={cn("flex items-center gap-0.5 text-[10px] opacity-60", colors.text)}>
                        <Share2 className="w-2.5 h-2.5" />
                        공유
                      </div>
                    )}
                    {!canEdit && (
                      <div className={cn("flex items-center gap-0.5 text-[10px] opacity-50", colors.text)}>
                        <User className="w-2.5 h-2.5" />
                        공유됨
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
