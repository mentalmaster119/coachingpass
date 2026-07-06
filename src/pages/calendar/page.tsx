import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { format, eachDayOfInterval } from "date-fns";
import { CalendarDays, Plus } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import CalendarView from "./_components/calendar-view.tsx";
import type { CalendarEvent, SeminarItem } from "./_components/calendar-view.tsx";
import DayEventsPanel from "./_components/day-events-panel.tsx";
import EventFormDialog from "./_components/event-form-dialog.tsx";
import type { Id } from "@/convex/_generated/dataModel.d.ts";

function CalendarPageInner() {
  const { user } = useCurrentUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const events = useQuery(api.calendar.listEventsForMonth, { year, month });
  const seminars = useQuery(api.seminars.listForMonth, { year, month });
  const bookings = useQuery(api.classroomBookings.list, {});

  // Filter events and seminars for selected date
  const selectedDateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : null;

  const selectedDayEvents = selectedDateStr
    ? (events ?? []).filter((e) => e.eventDate === selectedDateStr)
    : [];

  const selectedDaySeminars = selectedDateStr
    ? (seminars ?? []).filter((s) => {
        try {
          const days = eachDayOfInterval({ start: new Date(s.startDate), end: new Date(s.endDate) });
          return days.some((d) => format(d, "yyyy-MM-dd") === selectedDateStr);
        } catch {
          return false;
        }
      })
    : [];

  const selectedDayBookings = selectedDateStr
    ? (bookings ?? []).filter((b) => b.date === selectedDateStr)
    : [];

  const handleDayClick = (date: Date) => setSelectedDate(date);

  const handleAddEvent = () => {
    setEditEvent(null);
    setAddDialogOpen(true);
  };

  const handleEditEvent = (event: CalendarEvent) => {
    setEditEvent(event);
    setAddDialogOpen(true);
  };

  const handleSeminarClick = (_seminar: SeminarItem) => {
    // Selecting seminar date shows it in side panel (already done via day click)
  };

  const isLoading = events === undefined || seminars === undefined || bookings === undefined;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Page header */}
      <div className="px-6 py-5 border-b bg-background flex-shrink-0">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold">일정 캘린더</h1>
              <p className="text-sm text-muted-foreground">세미나 일정 및 개인 일정을 한눈에 확인하세요</p>
            </div>
          </div>
          {user?.role === "admin" && (
            <Button onClick={handleAddEvent} className="gap-2">
              <Plus className="w-4 h-4" />
              일정 추가
            </Button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-y-auto md:overflow-hidden">
        <div className="h-full max-w-6xl mx-auto flex flex-col md:flex-row gap-0">
          {/* Calendar */}
          <div className="w-full md:flex-1 min-w-0 p-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-[500px] w-full" />
              </div>
            ) : (
              <CalendarView
                currentDate={currentDate}
                onMonthChange={setCurrentDate}
                events={events as CalendarEvent[]}
                seminars={seminars as SeminarItem[]}
                bookings={bookings}
                onDayClick={handleDayClick}
                onEventClick={handleEditEvent}
                onSeminarClick={handleSeminarClick}
                selectedDate={selectedDate}
              />
            )}
          </div>

          {/* Day detail panel */}
          <div className="w-full md:w-72 flex-shrink-0 border-t md:border-t-0 md:border-l bg-muted/10 flex flex-col min-h-[350px] md:min-h-0">
            <DayEventsPanel
              selectedDate={selectedDate}
              events={selectedDayEvents as CalendarEvent[]}
              seminars={selectedDaySeminars as SeminarItem[]}
              bookings={selectedDayBookings}
              currentUserId={user?._id as Id<"users"> | undefined}
              onAddEvent={handleAddEvent}
              onEditEvent={handleEditEvent}
              userRole={user?.role ?? "trainee"}
            />
          </div>
        </div>
      </div>

      {/* Event form dialog */}
      <EventFormDialog
        open={addDialogOpen}
        onClose={() => { setAddDialogOpen(false); setEditEvent(null); }}
        defaultDate={selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined}
        existingEvent={editEvent ?? undefined}
        userRole={user?.role ?? "trainee"}
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <Authenticated>
      <CalendarPageInner />
    </Authenticated>
  );
}
