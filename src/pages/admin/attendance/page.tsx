import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id, Doc } from "@/convex/_generated/dataModel.d.ts";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  GraduationCap,
  CalendarDays,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  FileCheck,
  BarChart3,
  Save,
  BookOpen,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { cn } from "@/lib/utils.ts";

type AttendanceStatus = "present" | "absent" | "late" | "excused";
type Cohort = Doc<"cohorts">;
type Seminar = Doc<"seminars">;

const STATUS_CONFIG: Record<AttendanceStatus, {
  label: string;
  icon: React.ReactNode;
  color: string;
  badgeVariant: "default" | "secondary" | "outline" | "destructive";
}> = {
  present: { label: "출석", icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: "text-green-600", badgeVariant: "default" },
  late: { label: "지각", icon: <Clock className="w-3.5 h-3.5" />, color: "text-yellow-600", badgeVariant: "secondary" },
  excused: { label: "공결", icon: <FileCheck className="w-3.5 h-3.5" />, color: "text-blue-600", badgeVariant: "outline" },
  absent: { label: "결석", icon: <XCircle className="w-3.5 h-3.5" />, color: "text-destructive", badgeVariant: "destructive" },
};

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

export default function AdminAttendancePage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | null>(null);
  const [activeTab, setActiveTab] = useState("record");

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">출석 관리</h1>
        <p className="text-muted-foreground text-sm mt-1">세미나별 교육생 출석을 기록하고 현황을 확인합니다</p>
      </div>

      {/* Cohort selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            기수 선택
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cohorts === undefined ? (
            <Skeleton className="h-10 w-64" />
          ) : cohorts.length === 0 ? (
            <p className="text-sm text-muted-foreground">등록된 기수가 없습니다.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCohortId(null)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                  selectedCohortId === null
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border hover:bg-muted"
                )}
              >
                공통
              </button>
              {cohorts.map((c) => (
                <button
                  key={c._id}
                  onClick={() => setSelectedCohortId(c._id)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer",
                    selectedCohortId === c._id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:bg-muted"
                  )}
                >
                  {c.name}
                  <span className="ml-1.5 text-xs opacity-70">
                    {c.term === "first" ? "상반기" : "하반기"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {cohorts !== undefined && (
        <>
          {selectedCohortId === null ? (
            <div className="mt-4">
              <AttendanceRecordTab cohortId={null} />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="record" className="gap-2">
                  <CalendarDays className="w-4 h-4" />
                  출석 입력
                </TabsTrigger>
                <TabsTrigger value="summary" className="gap-2">
                  <BarChart3 className="w-4 h-4" />
                  출석 현황
                </TabsTrigger>
              </TabsList>
              <TabsContent value="record" className="mt-4">
                <AttendanceRecordTab cohortId={selectedCohortId} />
              </TabsContent>
              <TabsContent value="summary" className="mt-4">
                <AttendanceSummaryTab cohortId={selectedCohortId} />
              </TabsContent>
            </Tabs>
          )}
        </>
      )}
    </div>
  );
}

// ── Attendance Record Tab ─────────────────────────────────────────────────────

function AttendanceRecordTab({ cohortId }: { cohortId: Id<"cohorts"> | null }) {
  const seminars = useQuery(api.seminars.listByCohort, cohortId ? { cohortId } : {});
  const [selectedSeminarId, setSelectedSeminarId] = useState<Id<"seminars"> | null>(null);

  const selectedSeminar = seminars?.find((s) => s._id === selectedSeminarId);

  return (
    <div className="space-y-4">
      {/* Seminar selector */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">세미나 일정을 선택하여 출석을 입력하세요</p>
        {seminars === undefined ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
          </div>
        ) : seminars.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
              <EmptyTitle>등록된 세미나가 없습니다</EmptyTitle>
              <EmptyDescription>먼저 세미나 일정 관리에서 일정을 추가해 주세요.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {seminars.map((s) => {
              const isSelected = selectedSeminarId === s._id;
              const isMultiDay = s.startDate !== s.endDate;
              return (
                <button
                  key={s._id}
                  onClick={() => setSelectedSeminarId(s._id)}
                  className={cn(
                    "text-left rounded-xl border p-4 transition-all cursor-pointer space-y-2",
                    isSelected
                      ? "bg-primary text-primary-foreground border-primary shadow-md"
                      : "bg-card border-border hover:border-primary/50 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className={cn(
                      "flex items-center gap-2 text-sm font-semibold",
                      isSelected ? "text-primary-foreground" : "text-foreground"
                    )}>
                      <span className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
                        isSelected ? "bg-primary-foreground/20" : "bg-primary/10 text-primary"
                      )}>
                        {seminarTypeIcon(s.seminarType)}
                      </span>
                      <span className="leading-tight">{s.title}</span>
                    </div>
                    <span className={cn(
                      "text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-medium",
                      isSelected
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {SEMINAR_TYPE_LABELS[s.seminarType] ?? s.seminarType}
                    </span>
                  </div>
                  <div className={cn(
                    "text-xs space-y-1",
                    isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="w-3 h-3 flex-shrink-0" />
                      <span>
                        {format(parseISO(s.startDate), "yyyy.MM.dd (E)", { locale: ko })}
                        {isMultiDay && ` ~ ${format(parseISO(s.endDate), "MM.dd (E)", { locale: ko })}`}
                      </span>
                    </div>
                    {(s.startTime || s.endTime) && (
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>
                          {s.startTime ?? ""}
                          {s.startTime && s.endTime && " ~ "}
                          {s.endTime ?? ""}
                        </span>
                      </div>
                    )}
                    {s.location && (
                      <div className="flex items-center gap-1.5">
                        <Users className="w-3 h-3 flex-shrink-0" />
                        <span>{s.location}</span>
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedSeminarId && selectedSeminar && (
        <AttendanceSheet
          seminar={selectedSeminar}
          cohortId={cohortId}
        />
      )}
    </div>
  );
}

// ── Attendance Sheet ──────────────────────────────────────────────────────────

type LocalRecord = {
  userId: Id<"users">;
  name: string;
  email: string;
  certificationGoal?: "KAC" | "KPC" | "SMPCC";
  dates: Record<string, {
    status: AttendanceStatus;
    note: string;
    selfCheckedIn?: boolean;
    checkedInAt?: string;
  }>;
  saved: boolean;
};

function AttendanceSheet({ seminar, cohortId }: { seminar: Seminar; cohortId: Id<"cohorts"> | null }) {
  const members = useQuery(api.cohorts.getMembers, cohortId ? { cohortId } : {});
  const existingRecords = useQuery(api.attendance.getBySeminar, { seminarId: seminar._id });
  const bulkUpsert = useMutation(api.attendance.bulkUpsert);

  const [localRecords, setLocalRecords] = useState<Record<string, LocalRecord>>({});
  const [initialized, setInitialized] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dates = useMemo(() => {
    if (seminar.startDate === seminar.endDate) {
      return [seminar.startDate];
    }
    return [seminar.startDate, seminar.endDate];
  }, [seminar]);

  // Initialize local state from existing records + members
  const initKey = `${seminar._id}`;
  if (initialized !== initKey && members !== undefined && existingRecords !== undefined) {
    const init: Record<string, LocalRecord> = {};
    const activeMembers = members.filter((m) => m.status === "active");
    for (const m of activeMembers) {
      if (!m.user) continue;
      
      const datesState: Record<string, { status: AttendanceStatus; note: string; selfCheckedIn?: boolean; checkedInAt?: string }> = {};
      for (const d of dates) {
        const existing = existingRecords.find((r) => r.userId === m.userId && r.date === d);
        datesState[d] = {
          status: existing?.status ?? "present",
          note: existing?.note ?? "",
          selfCheckedIn: existing?.selfCheckedIn,
          checkedInAt: existing?.checkedInAt,
        };
      }

      init[m.userId] = {
        userId: m.userId,
        name: m.user.name ?? "이름 없음",
        email: m.user.email ?? "",
        certificationGoal: m.user.certificationGoal,
        dates: datesState,
        saved: true,
      };
    }
    setLocalRecords(init);
    setInitialized(initKey);
  }

  const records = Object.values(localRecords);

  const setStatus = (userId: string, date: string, status: AttendanceStatus) => {
    setLocalRecords((prev) => {
      const userState = prev[userId];
      if (!userState) return prev;
      return {
        ...prev,
        [userId]: {
          ...userState,
          saved: false,
          dates: {
            ...userState.dates,
            [date]: {
              ...userState.dates[date],
              status,
            }
          }
        }
      };
    });
  };

  const setNote = (userId: string, date: string, note: string) => {
    setLocalRecords((prev) => {
      const userState = prev[userId];
      if (!userState) return prev;
      return {
        ...prev,
        [userId]: {
          ...userState,
          saved: false,
          dates: {
            ...userState.dates,
            [date]: {
              ...userState.dates[date],
              note,
            }
          }
        }
      };
    });
  };

  const setAll = (status: AttendanceStatus) => {
    setLocalRecords((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        const userState = next[k];
        const datesState = { ...userState.dates };
        for (const d of dates) {
          datesState[d] = { ...datesState[d], status };
        }
        next[k] = { ...userState, saved: false, dates: datesState };
      }
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const upsertRecords: Array<{
        userId: Id<"users">;
        date: string;
        status: AttendanceStatus;
        note?: string;
      }> = [];

      for (const r of records) {
        for (const d of dates) {
          const dateState = r.dates[d];
          if (dateState) {
            upsertRecords.push({
              userId: r.userId,
              date: d,
              status: dateState.status,
              note: dateState.note || undefined,
            });
          }
        }
      }

      await bulkUpsert({
        seminarId: seminar._id,
        cohortId: cohortId || undefined,
        records: upsertRecords,
      });
      setLocalRecords((prev) => {
        const next = { ...prev };
        for (const k of Object.keys(next)) next[k] = { ...next[k], saved: true };
        return next;
      });
      toast.success("출석이 저장되었습니다");
    } catch (err) {
      if (err instanceof ConvexError) {
        toast.error((err.data as { message: string }).message);
      } else {
        toast.error("저장에 실패했습니다");
      }
    } finally {
      setSaving(false);
    }
  };

  const isMultiDay = seminar.startDate !== seminar.endDate;
  const counts = useMemo(() => {
    const c = { present: 0, late: 0, excused: 0, absent: 0 };
    for (const r of records) {
      for (const d of dates) {
        const state = r.dates[d];
        if (state) c[state.status]++;
      }
    }
    return c;
  }, [records, dates]);

  if (members === undefined || existingRecords === undefined) {
    return <div className="space-y-3">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>;
  }

  const activeMembers = members.filter((m) => m.status === "active");

  if (activeMembers.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>수강 중인 교육생이 없습니다</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {/* Seminar info */}
      <Card>
        <CardContent className="py-4 px-5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                {seminarTypeIcon(seminar.seminarType)}
              </div>
              <div>
                <p className="font-semibold">{seminar.title}</p>
                <p className="text-xs text-muted-foreground">
                  <CalendarDays className="w-3 h-3 inline mr-1" />
                  {format(parseISO(seminar.startDate), "yyyy.MM.dd (E)", { locale: ko })}
                  {isMultiDay && ` ~ ${format(parseISO(seminar.endDate), "MM.dd (E)", { locale: ko })}`}
                  {seminar.location && ` · ${seminar.location}`}
                </p>
              </div>
            </div>
            <div className="flex gap-3 text-sm">
              {(["present","late","excused","absent"] as AttendanceStatus[]).map((s) => (
                <span key={s} className={cn("flex items-center gap-1 font-medium", STATUS_CONFIG[s].color)}>
                  {STATUS_CONFIG[s].icon}
                  {counts[s]}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick fill + Save */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">전체 일괄:</span>
          {(["present","late","excused","absent"] as AttendanceStatus[]).map((s) => (
            <Button
              key={s}
              variant="outline"
              size="sm"
              onClick={() => setAll(s)}
              className={cn("gap-1.5 h-7 text-xs cursor-pointer", STATUS_CONFIG[s].color)}
            >
              {STATUS_CONFIG[s].icon}
              {STATUS_CONFIG[s].label}
            </Button>
          ))}
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2 cursor-pointer">
          <Save className="w-4 h-4" />
          {saving ? "저장 중..." : "출석 저장"}
        </Button>
      </div>

      {/* Attendance grid */}
      <Card className="p-4">
        <div className="divide-y space-y-4">
          {records.map((r) => (
            <div key={r.userId} className="pt-4 first:pt-0 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
              {/* Profile */}
              <div className="flex items-center gap-3 w-64 flex-shrink-0">
                <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold truncate">{r.name}</p>
                    {r.certificationGoal && (
                      <Badge variant="outline" className="text-[10px] px-1 py-0">{r.certificationGoal}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{r.email}</p>
                </div>
              </div>

              {/* Date Slots */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {dates.map((d) => {
                  const dateState = r.dates[d] || { status: "present", note: "" };
                  const formattedDate = format(parseISO(d), "MM.dd (E)", { locale: ko });
                  return (
                    <div key={d} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
                      {/* Date label & Self checkin info */}
                      <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1 w-24 flex-shrink-0">
                        <span className="text-xs font-bold text-foreground">{formattedDate}</span>
                        {dateState.selfCheckedIn && (
                          <Badge className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 flex-shrink-0">
                            자가체크인
                          </Badge>
                        )}
                      </div>

                      {/* Status select buttons */}
                      <div className="flex flex-wrap gap-1 flex-1">
                        {(["present","late","excused","absent"] as AttendanceStatus[]).map((s) => (
                          <button
                            key={s}
                            onClick={() => setStatus(r.userId, d, s)}
                            className={cn(
                              "h-7 px-2.5 rounded-md text-xs font-medium flex items-center gap-1 border transition-all cursor-pointer",
                              dateState.status === s
                                ? s === "present" ? "bg-green-100 border-green-400 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-400"
                                  : s === "late" ? "bg-yellow-100 border-yellow-400 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-400"
                                  : s === "excused" ? "bg-blue-100 border-blue-400 text-blue-700 dark:bg-green-900/30 dark:border-blue-600 dark:text-blue-400"
                                  : "bg-red-100 border-red-400 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-400"
                                : "bg-background border-border text-muted-foreground hover:bg-muted"
                            )}
                          >
                            {STATUS_CONFIG[s].icon}
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                      </div>

                      {/* Note input */}
                      <Input
                        className="h-7 text-xs w-full sm:w-28 flex-shrink-0"
                        placeholder="메모"
                        value={dateState.note}
                        onChange={(e) => setNote(r.userId, d, e.target.value)}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── Attendance Summary Tab ────────────────────────────────────────────────────

function AttendanceSummaryTab({ cohortId }: { cohortId: Id<"cohorts"> }) {
  const summary = useQuery(api.attendance.getCohortSummary, { cohortId });

  if (summary === undefined) {
    return (
      <div className="space-y-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }

  if (summary.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon"><Users /></EmptyMedia>
          <EmptyTitle>등록된 교육생이 없습니다</EmptyTitle>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "전체 교육생", value: summary.length, icon: <Users className="w-4 h-4" />, color: "text-primary" },
          { label: "평균 출석률", value: `${Math.round(summary.reduce((a,b) => a + b.attendanceRate, 0) / summary.length)}%`, icon: <BarChart3 className="w-4 h-4" />, color: "text-green-600" },
          { label: "출석률 80% 이상", value: summary.filter(s => s.attendanceRate >= 80).length, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600" },
          { label: "출석률 80% 미만", value: summary.filter(s => s.attendanceRate < 80).length, icon: <XCircle className="w-4 h-4" />, color: "text-destructive" },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="py-4 px-5">
              <div className={cn("flex items-center gap-2 mb-1", stat.color)}>
                {stat.icon}
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Per-person table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">교육생별 출석 현황</CardTitle>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <th className="text-left px-4 py-2.5 font-medium">교육생</th>
                <th className="text-center px-3 py-2.5 font-medium">출석</th>
                <th className="text-center px-3 py-2.5 font-medium">지각</th>
                <th className="text-center px-3 py-2.5 font-medium">공결</th>
                <th className="text-center px-3 py-2.5 font-medium">결석</th>
                <th className="text-center px-3 py-2.5 font-medium">출석률</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((s) => (
                <tr key={s.userId} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                        {(s.name ?? "?")[0]}
                      </div>
                      <div>
                        <p className="font-medium">{s.name ?? "이름 없음"}</p>
                        {s.certificationGoal && (
                          <p className="text-xs text-muted-foreground">{s.certificationGoal}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-green-600 font-medium">{s.present}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-yellow-600 font-medium">{s.late}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-blue-600 font-medium">{s.excused}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <span className="text-destructive font-medium">{s.absent}</span>
                  </td>
                  <td className="text-center px-3 py-3">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.attendanceRate >= 80 ? "bg-green-500" : "bg-destructive"
                          )}
                          style={{ width: `${s.attendanceRate}%` }}
                        />
                      </div>
                      <span className={cn(
                        "font-semibold text-xs w-8",
                        s.attendanceRate >= 80 ? "text-green-600" : "text-destructive"
                      )}>
                        {s.attendanceRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
