import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO, addDays, subDays, startOfWeek } from "date-fns";
import { ko } from "date-fns/locale";
import {
  CalendarDays,
  Clock,
  Plus,
  Trash2,
  User,
  Check,
  AlertCircle,
  MapPin,
  ChevronLeft,
  ChevronRight,
  BookmarkCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

type TimeSlot = "10:00-12:00" | "13:00-15:00" | "16:00-18:00";
type CoachingType = "buddy" | "mentor" | "supervision";

const SLOT_CONFIG: Record<TimeSlot, { label: string; period: string }> = {
  "10:00-12:00": { label: "오전 세션", period: "10:00 ~ 12:00" },
  "13:00-15:00": { label: "오후 세션 1", period: "13:00 ~ 15:00" },
  "16:00-18:00": { label: "오후 세션 2", period: "16:00 ~ 18:00" },
};

const COACHING_CONFIG: Record<CoachingType, { label: string; color: string; badgeVariant: "default" | "secondary" | "outline" }> = {
  buddy: { label: "버디코칭", color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400", badgeVariant: "default" },
  mentor: { label: "멘토코칭", color: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/30 dark:text-sky-400", badgeVariant: "secondary" },
  supervision: { label: "슈퍼비전", color: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/30 dark:text-violet-400", badgeVariant: "outline" },
};

export default function ClassroomBookingPage() {
  const { user } = useCurrentUser();
  const [baseDate, setBaseDate] = useState<Date>(new Date());
  
  // Form State
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot>("10:00-12:00");
  const [selectedCoaching, setSelectedCoaching] = useState<CoachingType>("buddy");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Queries & Mutations
  const bookings = useQuery(api.classroomBookings.list, {});
  const book = useMutation(api.classroomBookings.book);
  const cancel = useMutation(api.classroomBookings.cancel);

  // Calculate Monday to Thursday for the current week
  const weekDays = useMemo(() => {
    // Get start of week (Sunday is 0, Monday is 1)
    const monday = startOfWeek(baseDate, { weekStartsOn: 1 });
    const days: string[] = [];
    for (let i = 0; i < 4; i++) {
      days.push(format(addDays(monday, i), "yyyy-MM-dd"));
    }
    return days;
  }, [baseDate]);

  const handlePrevWeek = () => setBaseDate((prev) => subDays(prev, 7));
  const handleNextWeek = () => setBaseDate((prev) => addDays(prev, 7));
  const handleTodayWeek = () => setBaseDate(new Date());

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) {
      toast.error("날짜를 선택해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await book({
        date: selectedDate,
        timeSlot: selectedSlot,
        coachingType: selectedCoaching,
        notes: notes || undefined,
      });
      toast.success("교육장 예약이 완료되었습니다.");
      setNotes("");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("예약 신청에 실패했습니다.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (bookingId: Id<"classroomBookings">) => {
    if (!confirm("정말로 예약을 취소하시겠습니까?")) return;

    try {
      await cancel({ bookingId });
      toast.success("예약이 취소되었습니다.");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("예약 취소에 실패했습니다.");
      }
    }
  };

  const isWeekLoading = bookings === undefined;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">양재 센터 교육장 예약</h1>
        <p className="text-muted-foreground text-sm mt-1">
          멘탈코칭 실습을 위한 양재 센터 교육장 예약을 관리합니다.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed space-y-1">
          <p className="font-semibold">교육장 예약 규칙 안내</p>
          <p>1. **예약 가능 요일**: 매주 **월요일부터 목요일**까지 4일간 예약할 수 있습니다. (금, 토, 일 제외)</p>
          <p>2. **이용 시간대**: 10:00~12:00, 13:00~15:00, 16:00~18:00의 3개 슬롯이 존재합니다.</p>
          <p>3. **독점 예약**: 시간대별로 1개 팀(교육생)만 단독 예약하여 사용하므로, 중복 예약 시 신청이 반려됩니다.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2/3: Timetable Dashboard */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="py-4 px-5 border-b border-border flex flex-row items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="w-4.5 h-4.5 text-primary" />
                  주간 예약 현황표
                </CardTitle>
                <CardDescription className="text-xs">
                  {format(parseISO(weekDays[0]), "yyyy년 MM월 dd일")} ~ {format(parseISO(weekDays[3]), "MM월 dd일")}
                </CardDescription>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="outline" size="sm" onClick={handlePrevWeek} className="h-8 w-8 p-0 cursor-pointer">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleTodayWeek} className="h-8 text-xs cursor-pointer">
                  오늘
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-8 w-8 p-0 cursor-pointer">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isWeekLoading ? (
                <div className="space-y-4 py-6">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  {weekDays.map((dayStr) => {
                    const parsedDate = parseISO(dayStr);
                    const isToday = format(new Date(), "yyyy-MM-dd") === dayStr;
                    return (
                      <div
                        key={dayStr}
                        className={cn(
                          "rounded-xl border p-3 flex flex-col space-y-3 transition-all",
                          isToday
                            ? "bg-primary/5 border-primary/40 shadow-sm"
                            : "bg-card border-border"
                        )}
                      >
                        {/* Day Header */}
                        <div className="border-b pb-2 flex items-center justify-between">
                          <div>
                            <span className="text-sm font-bold block text-foreground">
                              {format(parsedDate, "EEEE", { locale: ko })}
                            </span>
                            <span className="text-[10px] text-muted-foreground block mt-0.5">
                              {format(parsedDate, "MM.dd")}
                            </span>
                          </div>
                          {isToday && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-primary text-primary-foreground border-0">
                              오늘
                            </Badge>
                          )}
                        </div>

                        {/* Slots */}
                        <div className="space-y-2 flex-1">
                          {(["10:00-12:00", "13:00-15:00", "16:00-18:00"] as TimeSlot[]).map((slotKey) => {
                            const b = bookings.find((bk) => bk.date === dayStr && bk.timeSlot === slotKey);
                            const isMine = b && user && b.userId === user._id;
                            const isAdmin = user?.role === "admin" || user?.role === "admin3";

                            return (
                              <div
                                key={slotKey}
                                className={cn(
                                  "rounded-lg border p-2.5 flex flex-col justify-between text-xs transition-all relative overflow-hidden",
                                  b
                                    ? cn(
                                        "border-l-4",
                                        b.coachingType === "buddy" ? "border-l-emerald-500 bg-emerald-50/20 border-emerald-100"
                                          : b.coachingType === "mentor" ? "border-l-sky-500 bg-sky-50/20 border-sky-100"
                                          : "border-l-violet-500 bg-violet-50/20 border-violet-100"
                                      )
                                    : "border-dashed border-border bg-muted/10 hover:bg-muted/30 cursor-pointer"
                                )}
                                onClick={() => {
                                  if (!b) {
                                    setSelectedDate(dayStr);
                                    setSelectedSlot(slotKey);
                                  }
                                }}
                              >
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <Clock className="w-3 h-3 flex-shrink-0" />
                                    {slotKey.split("-")[0]}
                                  </span>
                                  {b ? (
                                    <Badge variant="outline" className={cn("text-[9px] px-1 py-0 border-0 flex-shrink-0", COACHING_CONFIG[b.coachingType].color)}>
                                      {COACHING_CONFIG[b.coachingType].label}
                                    </Badge>
                                  ) : (
                                    <span className="text-[9px] text-emerald-600 font-semibold flex items-center gap-0.5 flex-shrink-0">
                                      <Plus className="w-2.5 h-2.5" />
                                      예약가능
                                    </span>
                                  )}
                                </div>

                                {b ? (
                                  <div className="mt-1.5 space-y-1">
                                    <p className="font-semibold text-foreground flex items-center gap-1 text-[11px] truncate">
                                      <User className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                      {b.bookerName}
                                    </p>
                                    {b.notes && (
                                      <p className="text-[10px] text-muted-foreground leading-tight line-clamp-1">
                                        {b.notes}
                                      </p>
                                    )}
                                    {/* Action button */}
                                    {(isMine || isAdmin) && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel(b._id);
                                        }}
                                        className="absolute right-1 bottom-1 p-1 hover:bg-destructive/15 text-destructive rounded-md transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-muted-foreground/60 italic mt-2">
                                    비어 있음
                                  </p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3: Form Panel */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="py-4 px-5">
              <CardTitle className="text-base flex items-center gap-2">
                <BookmarkCheck className="w-4.5 h-4.5 text-primary" />
                교육장 예약 신청
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              <form onSubmit={handleBooking} className="space-y-4">
                {/* Date */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">예약 날짜</label>
                  <Input
                    type="date"
                    required
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="w-full text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    * 매주 월, 화, 수, 목요일만 예약이 승인됩니다.
                  </p>
                </div>

                {/* TimeSlot */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">이용 시간대</label>
                  <Select
                    value={selectedSlot}
                    onValueChange={(val: TimeSlot) => setSelectedSlot(val)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="시간대 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(SLOT_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {config.label} ({config.period})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Coaching Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">코칭 유형</label>
                  <Select
                    value={selectedCoaching}
                    onValueChange={(val: CoachingType) => setSelectedCoaching(val)}
                  >
                    <SelectTrigger className="w-full text-xs">
                      <SelectValue placeholder="코칭 유형 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COACHING_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key} className="text-xs">
                          {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">메모 / 내용</label>
                  <Input
                    placeholder="예: 스포츠 멘탈코칭 실습 (버디: 홍길동)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={submitting || isWeekLoading}
                  className="w-full text-xs cursor-pointer gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {submitting ? "예약 처리 중..." : "교육장 예약 완료"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
