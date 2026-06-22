import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { motion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  BookOpen,
  FileText,
  Users,
  Sparkles,
  Trophy,
  Heart,
  Star,
  Zap,
  ChevronDown,
  Layers,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { Dialog, DialogContent } from "@/components/ui/dialog.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu.tsx";
import { cn } from "@/lib/utils.ts";

const SEMINAR_TYPE_LABELS: Record<string, string> = {
  two_day: "2일 세미나",
  one_day: "1일 세미나",
  group_coaching: "그룹코칭",
};

function seminarTypeIcon(type: string) {
  if (type === "two_day") return <BookOpen className="w-4 h-4" />;
  if (type === "one_day") return <FileText className="w-4 h-4" />;
  return <Users className="w-4 h-4" />;
}

const CHECKIN_MESSAGES = [
  {
    title: "오늘의 도전을 환영합니다! 🌟",
    body: "출석 완료! 오늘도 코칭 여정에 함께해 주셔서 감사합니다. 배움은 성장의 첫걸음입니다.",
    icon: <Star className="w-12 h-12 text-yellow-400" />,
    color: "from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30",
  },
  {
    title: "훌륭합니다! 당신은 해냈습니다! 💪",
    body: "오늘 이 자리에 온 것만으로도 대단합니다. 꾸준함이 전문가를 만듭니다. 오늘도 최선을 다해보세요!",
    icon: <Trophy className="w-12 h-12 text-amber-500" />,
    color: "from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30",
  },
  {
    title: "빛나는 하루가 될 거예요! ✨",
    body: "출석 확인! 코칭은 타인의 삶을 변화시키는 숭고한 일입니다. 오늘 배움이 누군가의 삶에 빛이 되길 바랍니다.",
    icon: <Sparkles className="w-12 h-12 text-violet-500" />,
    color: "from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30",
  },
  {
    title: "함께여서 더 강합니다! 🤝",
    body: "오늘도 함께하는 동료들과 함께 성장해 나가세요. 서로의 배움이 모여 더 큰 코칭 문화를 만들어 갑니다.",
    icon: <Heart className="w-12 h-12 text-rose-400" />,
    color: "from-rose-50 to-pink-50 dark:from-rose-950/30 dark:to-pink-950/30",
  },
  {
    title: "오늘도 에너지 넘치게! ⚡",
    body: "체크인 완료! 코칭 전문가로 나아가는 여정에서 오늘 하루도 값진 시간이 될 것입니다. 집중하고 즐겨보세요!",
    icon: <Zap className="w-12 h-12 text-blue-500" />,
    color: "from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30",
  },
];

type SeminarWithAttendance = Doc<"seminars"> & {
  myAttendances: Doc<"attendances">[];
  cohortName: string;
  cohortNumber: number;
};

const TERM_LABELS: Record<string, string> = { first: "상반기", second: "하반기" };

// "전체" 옵션
const ALL_COHORTS = "all";

export default function AttendancePage() {
  const allSeminars = useQuery(api.attendance.getAllMySeminars, {});
  const myCohorts = useQuery(api.attendance.getMyCohorts, {});
  const [filterCohortId, setFilterCohortId] = useState<string>(ALL_COHORTS);

  // When multiple cohorts, default to "all"
  useEffect(() => {
    if (myCohorts && myCohorts.length === 1) {
      setFilterCohortId(myCohorts[0]._id);
    }
  }, [myCohorts]);

  const selfCheckIn = useMutation(api.attendance.selfCheckIn);
  const [checkingIn, setCheckingIn] = useState<string | null>(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [celebrationMsg, setCelebrationMsg] = useState(CHECKIN_MESSAGES[0]);

  const handleCheckIn = async (seminarId: Id<"seminars">, date: string) => {
    const key = `${seminarId}_${date}`;
    setCheckingIn(key);
    try {
      await selfCheckIn({ seminarId, date });
      const msg = CHECKIN_MESSAGES[Math.floor(Math.random() * CHECKIN_MESSAGES.length)];
      setCelebrationMsg(msg);
      setCelebrationOpen(true);
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("출석 체크에 실패했습니다");
      }
    } finally {
      setCheckingIn(null);
    }
  };

  const today = new Date().toISOString().slice(0, 10);

  const filteredSeminars: SeminarWithAttendance[] = (allSeminars ?? []).map(s => ({
    ...s,
    myAttendances: s.myAttendances || []
  })).filter(
    (s) => filterCohortId === ALL_COHORTS || s.cohortId === filterCohortId
  );

  // 진행중(오늘 포함) + 예정 세미나: endDate가 오늘 이상인 것
  const upcomingSeminars = filteredSeminars.filter((s) => s.endDate >= today);
  const pastSeminars = filteredSeminars.filter((s) => s.endDate < today);

  const isMultiCohort = (myCohorts?.length ?? 0) > 1;
  const selectedCohort = myCohorts?.find((c) => c._id === filterCohortId);

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">출석 체크</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {isMultiCohort
            ? "소속 기수 전체 일정이 통합 표시됩니다. 보강 세션도 함께 확인하세요."
            : "기수 전체 세미나 출석 현황을 확인하고 체크할 수 있습니다"}
        </p>
      </div>

      {/* 보강 안내 배너 (여러 기수 소속인 경우) */}
      {isMultiCohort && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
          <Layers className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            <span className="font-semibold">여러 기수에 소속되어 있습니다.</span>{" "}
            이전 기수에서 미이수한 세션은 다른 기수 일정에서 보강 출석할 수 있습니다.
            기수 필터로 원하는 기수만 볼 수도 있습니다.
          </div>
        </div>
      )}

      {/* 기수 필터 */}
      {myCohorts === undefined ? (
        <Skeleton className="h-10 w-48" />
      ) : myCohorts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
            <EmptyTitle>소속 기수가 없습니다</EmptyTitle>
            <EmptyDescription>관리자가 기수에 등록하면 여기에 일정이 표시됩니다.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          {/* 기수 선택 드롭다운 (단일 기수면 숨김) */}
          {myCohorts.length > 1 && (
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-medium text-muted-foreground">기수 필터</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" className="gap-2 cursor-pointer">
                    {filterCohortId === ALL_COHORTS
                      ? "전체 기수"
                      : selectedCohort
                      ? `${selectedCohort.name} (${TERM_LABELS[selectedCohort.term] ?? selectedCohort.term})`
                      : "선택"}
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => setFilterCohortId(ALL_COHORTS)}
                    className={cn("cursor-pointer", filterCohortId === ALL_COHORTS && "font-semibold text-primary")}
                  >
                    전체 기수 통합 보기
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {myCohorts.map((c) => (
                    <DropdownMenuItem
                      key={c._id}
                      onClick={() => setFilterCohortId(c._id)}
                      className={cn("cursor-pointer", filterCohortId === c._id && "font-semibold text-primary")}
                    >
                      {c.name} ({TERM_LABELS[c.term] ?? c.term})
                      {c.status === "active" && (
                        <Badge className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                          진행중
                        </Badge>
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* 세미나 목록 */}
          {allSeminars === undefined ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}
            </div>
          ) : filteredSeminars.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
                <EmptyTitle>등록된 세미나가 없습니다</EmptyTitle>
                <EmptyDescription>관리자가 세미나 일정을 등록하면 여기에 표시됩니다.</EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-6">
              {upcomingSeminars.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">예정 / 진행중 세미나</h2>
                  {upcomingSeminars.map((s) => (
                    <SeminarCard
                      key={s._id}
                      seminar={s}
                      today={today}
                      showCohortBadge={isMultiCohort && filterCohortId === ALL_COHORTS}
                      onCheckIn={handleCheckIn}
                      checkingIn={checkingIn}
                    />
                  ))}
                </section>
              )}
              {pastSeminars.length > 0 && (
                <section className="space-y-3">
                  <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">지난 세미나</h2>
                  {pastSeminars.map((s) => (
                    <SeminarCard
                      key={s._id}
                      seminar={s}
                      today={today}
                      showCohortBadge={isMultiCohort && filterCohortId === ALL_COHORTS}
                      onCheckIn={handleCheckIn}
                      checkingIn={checkingIn}
                    />
                  ))}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Celebration dialog */}
      <Dialog open={celebrationOpen} onOpenChange={setCelebrationOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-0">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 24 }}
            className={cn("p-8 text-center space-y-4 bg-gradient-to-br", celebrationMsg.color)}
          >
            <motion.div
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.1 }}
              className="flex justify-center"
            >
              {celebrationMsg.icon}
            </motion.div>
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h2 className="text-xl font-bold">{celebrationMsg.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{celebrationMsg.body}</p>
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Button onClick={() => setCelebrationOpen(false)} className="mt-2 cursor-pointer">
                감사합니다!
              </Button>
            </motion.div>
          </motion.div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SeminarCard({
  seminar,
  today,
  showCohortBadge,
  onCheckIn,
  checkingIn,
}: {
  seminar: SeminarWithAttendance;
  today: string;
  showCohortBadge: boolean;
  onCheckIn: (id: Id<"seminars">, date: string) => void;
  checkingIn: string | null;
}) {
  const dates = seminar.startDate === seminar.endDate
    ? [seminar.startDate]
    : [seminar.startDate, seminar.endDate];

  const isTodaySeminar = seminar.startDate <= today && seminar.endDate >= today;

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isTodaySeminar && "ring-2 ring-primary/25 shadow-md"
    )}>
      <CardContent className="p-0">
        <div className="flex items-stretch">
          <div className={cn(
            "w-1.5 flex-shrink-0 bg-border"
          )} />
          <div className="flex-1 p-4 space-y-4">
            {/* Top row: Seminar info */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-muted text-muted-foreground flex-shrink-0 mt-0.5">
                  {seminarTypeIcon(seminar.seminarType)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate">{seminar.title}</p>
                    <Badge variant="secondary" className="text-xs flex-shrink-0">
                      {SEMINAR_TYPE_LABELS[seminar.seminarType] ?? seminar.seminarType}
                    </Badge>
                    {showCohortBadge && (
                      <Badge variant="outline" className="text-xs flex-shrink-0 text-indigo-600 border-indigo-300 dark:text-indigo-400">
                        {seminar.cohortName}
                      </Badge>
                    )}
                    {isTodaySeminar && (
                      <Badge className="text-xs flex-shrink-0 bg-primary/10 text-primary border-primary/30">
                        오늘 진행중
                      </Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      {format(parseISO(seminar.startDate), "yyyy.MM.dd (E)", { locale: ko })}
                      {seminar.startDate !== seminar.endDate && ` ~ ${format(parseISO(seminar.endDate), "MM.dd (E)", { locale: ko })}`}
                    </span>
                    {(seminar.startTime || seminar.endTime) && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {seminar.startTime}{seminar.startTime && seminar.endTime && " ~ "}{seminar.endTime}
                      </span>
                    )}
                    {seminar.location && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {seminar.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom: Date-specific slots list */}
            <div className="border-t pt-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground mb-1.5">일자별 출석 현황</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {dates.map((d) => {
                  const record = seminar.myAttendances.find((r) => r.date === d);
                  const isCheckedIn = !!record && record.status !== "absent";
                  const isSelfChecked = !!record?.selfCheckedIn;
                  const isDateToday = d === today;
                  const isPastDate = d < today;
                  const formattedDate = format(parseISO(d), "yyyy.MM.dd (E)", { locale: ko });
                  
                  const isCheckingThisSlot = checkingIn === `${seminar._id}_${d}`;

                  return (
                    <div key={d} className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-muted/10">
                      <span className="text-xs font-medium text-foreground">{formattedDate}</span>
                      
                      <div>
                        {isCheckedIn ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <Badge className={cn(
                              "text-xs gap-1 font-medium",
                              record.status === "present" ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400"
                                : record.status === "late" ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:text-yellow-400"
                                : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400"
                            )}>
                              {record.status === "present" ? "출석" : record.status === "late" ? "지각" : "공결"}
                            </Badge>
                            {isSelfChecked && record.checkedInAt && (
                              <span className="text-[9px] text-muted-foreground">
                                {format(new Date(record.checkedInAt), "HH:mm 자가체크인", { locale: ko })}
                              </span>
                            )}
                          </div>
                        ) : isDateToday ? (
                          <Button
                            onClick={() => onCheckIn(seminar._id, d)}
                            disabled={checkingIn !== null}
                            size="sm"
                            className="h-7 text-xs px-3 cursor-pointer"
                          >
                            {isCheckingThisSlot ? "처리 중..." : "출석 체크"}
                          </Button>
                        ) : isPastDate ? (
                          <Button
                            onClick={() => onCheckIn(seminar._id, d)}
                            disabled={checkingIn !== null}
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs px-3 cursor-pointer"
                          >
                            {isCheckingThisSlot ? "처리 중..." : "지각 체크인"}
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">대기 중</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
