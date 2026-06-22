import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  eachDayOfInterval,
} from "date-fns";
import { ko } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { cn } from "@/lib/utils.ts";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

type EventType = "personal" | "coaching" | "education" | "mentor_coaching" | "shared";

type CalendarEvent = {
  _id: Id<"calendarEvents">;
  title: string;
  description?: string;
  eventDate: string;
  startTime?: string;
  endTime?: string;
  eventType: EventType;
  isShared: boolean;
  userId: Id<"users">;
};

type SeminarItem = {
  _id: Id<"seminars">;
  title: string;
  seminarType: "two_day" | "one_day" | "group_coaching";
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  isOnline?: boolean;
  sessionNumber: number;
};

const EVENT_COLORS: Record<EventType, { bg: string; text: string; dot: string }> = {
  personal:       { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-800 dark:text-blue-200", dot: "bg-blue-500" },
  coaching:       { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-800 dark:text-emerald-200", dot: "bg-emerald-500" },
  education:      { bg: "bg-purple-100 dark:bg-purple-900/40", text: "text-purple-800 dark:text-purple-200", dot: "bg-purple-500" },
  mentor_coaching:{ bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-800 dark:text-amber-200", dot: "bg-amber-500" },
  shared:         { bg: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-800 dark:text-rose-200", dot: "bg-rose-500" },
};

const SEMINAR_COLORS: Record<SeminarItem["seminarType"], { bg: string; text: string; dot: string }> = {
  two_day:        { bg: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-800 dark:text-indigo-200", dot: "bg-indigo-500" },
  one_day:        { bg: "bg-teal-100 dark:bg-teal-900/40", text: "text-teal-800 dark:text-teal-200", dot: "bg-teal-500" },
  group_coaching: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-800 dark:text-orange-200", dot: "bg-orange-500" },
};

const SEMINAR_TYPE_LABELS: Record<SeminarItem["seminarType"], string> = {
  two_day: "2일 세미나",
  one_day: "교재학습",
  group_coaching: "그룹코칭",
};

const EVENT_TYPE_LABELS: Record<EventType, string> = {
  personal: "개인",
  coaching: "코칭",
  education: "교육",
  mentor_coaching: "멘토코칭",
  shared: "공유",
};

type Props = {
  currentDate: Date;
  onMonthChange: (date: Date) => void;
  events: CalendarEvent[];
  seminars: SeminarItem[];
  onDayClick: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSeminarClick: (seminar: SeminarItem) => void;
  selectedDate: Date | null;
};

export default function CalendarView({
  currentDate,
  onMonthChange,
  events,
  seminars,
  onDayClick,
  onEventClick,
  onSeminarClick,
  selectedDate,
}: Props) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Build grid rows
  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  // Map events by date string
  const eventsByDate: Record<string, CalendarEvent[]> = {};
  for (const ev of events) {
    if (!eventsByDate[ev.eventDate]) eventsByDate[ev.eventDate] = [];
    eventsByDate[ev.eventDate].push(ev);
  }

  // Expand multi-day seminars to all their dates
  const seminarsByDate: Record<string, SeminarItem[]> = {};
  for (const seminar of seminars) {
    try {
      const start = new Date(seminar.startDate);
      const end = new Date(seminar.endDate);
      const days = eachDayOfInterval({ start, end });
      for (const d of days) {
        const dateStr = format(d, "yyyy-MM-dd");
        if (!seminarsByDate[dateStr]) seminarsByDate[dateStr] = [];
        seminarsByDate[dateStr].push(seminar);
      }
    } catch {
      // skip invalid dates
    }
  }

  const weekDayLabels = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(subMonths(currentDate, 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <h2 className="text-xl font-bold min-w-[140px] text-center">
            {format(currentDate, "yyyy년 M월", { locale: ko })}
          </h2>
          <Button variant="ghost" size="icon" onClick={() => onMonthChange(addMonths(currentDate, 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-sm text-muted-foreground border"
          onClick={() => onMonthChange(new Date())}
        >
          오늘
        </Button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {weekDayLabels.map((label, i) => (
          <div
            key={label}
            className={cn(
              "text-center text-xs font-semibold py-2 uppercase tracking-wide",
              i === 0 ? "text-rose-500" : i === 6 ? "text-blue-500" : "text-muted-foreground"
            )}
          >
            {label}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex-1 grid grid-cols-7 border-l border-t rounded-lg overflow-hidden">
        {weeks.flat().map((date, idx) => {
          const dateStr = format(date, "yyyy-MM-dd");
          const dayEvents = eventsByDate[dateStr] ?? [];
          const daySeminars = seminarsByDate[dateStr] ?? [];
          const allItems = [...daySeminars, ...dayEvents];
          const isCurrentMonth = isSameMonth(date, currentDate);
          const isSelected = selectedDate ? isSameDay(date, selectedDate) : false;
          const todayDate = isToday(date);
          const isSunday = idx % 7 === 0;
          const isSaturday = idx % 7 === 6;
          const maxShow = 2;

          return (
            <div
              key={dateStr}
              onClick={() => onDayClick(date)}
              className={cn(
                "border-r border-b min-h-[70px] md:min-h-[90px] p-1 cursor-pointer transition-colors",
                "hover:bg-muted/30",
                !isCurrentMonth && "bg-muted/10",
                isSelected && "bg-primary/5 ring-1 ring-inset ring-primary/30",
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    !isCurrentMonth && "text-muted-foreground/40",
                    isCurrentMonth && isSunday && "text-rose-500",
                    isCurrentMonth && isSaturday && "text-blue-500",
                    isCurrentMonth && !isSunday && !isSaturday && "text-foreground",
                    todayDate && "bg-primary text-primary-foreground font-bold",
                  )}
                >
                  {format(date, "d")}
                </span>
              </div>

              {/* Items: seminars first, then events */}
              <div className="space-y-0.5">
                {allItems.slice(0, maxShow).map((item, i) => {
                  // Seminar item
                  if ("seminarType" in item) {
                    const seminar = item as SeminarItem;
                    const colors = SEMINAR_COLORS[seminar.seminarType];
                    return (
                      <div
                        key={`s-${seminar._id}-${i}`}
                        onClick={(e) => { e.stopPropagation(); onSeminarClick(seminar); }}
                        className={cn(
                          "text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity",
                          colors.bg, colors.text
                        )}
                        title={seminar.title}
                      >
                        {seminar.startTime && <span className="mr-0.5 opacity-70">{seminar.startTime}</span>}
                        {seminar.title}
                      </div>
                    );
                  }
                  // Calendar event
                  const ev = item as CalendarEvent;
                  const colors = EVENT_COLORS[ev.eventType];
                  return (
                    <div
                      key={`e-${ev._id}`}
                      onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded truncate font-medium cursor-pointer hover:opacity-80 transition-opacity",
                        colors.bg, colors.text
                      )}
                      title={ev.title}
                    >
                      {ev.startTime && <span className="mr-0.5 opacity-70">{ev.startTime}</span>}
                      {ev.title}
                    </div>
                  );
                })}
                {allItems.length > maxShow && (
                  <div className="text-[10px] text-muted-foreground px-1">
                    +{allItems.length - maxShow}개 더
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-3 px-1">
        {(Object.keys(SEMINAR_COLORS) as SeminarItem["seminarType"][]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", SEMINAR_COLORS[type].dot)} />
            <span className="text-xs text-muted-foreground">{SEMINAR_TYPE_LABELS[type]}</span>
          </div>
        ))}
        {(Object.keys(EVENT_COLORS) as EventType[]).map((type) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className={cn("w-2.5 h-2.5 rounded-full", EVENT_COLORS[type].dot)} />
            <span className="text-xs text-muted-foreground">{EVENT_TYPE_LABELS[type]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { EVENT_COLORS, SEMINAR_COLORS, EVENT_TYPE_LABELS, SEMINAR_TYPE_LABELS };
export type { CalendarEvent, EventType, SeminarItem };
