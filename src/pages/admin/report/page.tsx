import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  BarChart3,
  Users,
  GraduationCap,
  CheckCircle2,
  XCircle,
  Award,
  ClipboardList,
  BookOpen,
  FileText,
  Dumbbell,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { cn } from "@/lib/utils.ts";

// ── Stat Card ──────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  sub,
  color = "default",
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  color?: "default" | "green" | "red" | "blue" | "amber";
}) {
  const colorMap = {
    default: "text-foreground",
    green: "text-green-600",
    red: "text-red-600",
    blue: "text-blue-600",
    amber: "text-amber-600",
  };
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={cn("text-2xl font-bold mt-0.5", colorMap[color])}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Requirement Badge ──────────────────────────────────────────────────────────

function ReqBadge({ met }: { met: boolean }) {
  return met ? (
    <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
  ) : (
    <XCircle className="w-4 h-4 text-red-400 shrink-0" />
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function AdminReportPage() {
  const cohorts = useQuery(api.cohorts.list, {});
  const [selectedCohortId, setSelectedCohortId] = useState<Id<"cohorts"> | "">("");

  const cohortId = selectedCohortId !== "" ? selectedCohortId : undefined;

  // Get cohort evaluation (all members)
  const evaluation = useQuery(
    api.completion.evaluateCohort,
    cohortId ? { cohortId } : "skip",
  );

  // Get cohort stats
  const cohortStats = useQuery(
    api.cohorts.getWithStats,
    cohortId ? { cohortId: cohortId } : "skip",
  );

  // Get seminars for the cohort (attendance overview)
  const seminars = useQuery(
    api.seminars.listByCohort,
    cohortId ? { cohortId } : "skip",
  );

  const selectedCohort = cohorts?.find((c) => c._id === cohortId);

  // ── Computed stats from evaluation ──────────────────────────────────────────

  const totalMembers = evaluation?.length ?? 0;
  const completedCount = evaluation?.filter((m) => m.isCompleted).length ?? 0;
  const certEligibleCount = evaluation?.filter((m) => m.isCertEligible).length ?? 0;
  const avgAttendance =
    totalMembers > 0
      ? Math.round(
          (evaluation ?? []).reduce((sum, m) => sum + m.attendanceRate, 0) / totalMembers,
        )
      : 0;

  // Deficiency list: members who are NOT cert eligible, show what's missing
  const deficientMembers = (evaluation ?? []).filter((m) => !m.isCertEligible);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            관리자 종합 보고서
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            기수별 수료·인증 현황을 한눈에 확인합니다
          </p>
        </div>
        {/* Cohort Selector */}
        {cohorts === undefined ? (
          <Skeleton className="h-10 w-48" />
        ) : (
          <Select
            value={selectedCohortId}
            onValueChange={(v) => setSelectedCohortId(v as Id<"cohorts">)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="기수 선택" />
            </SelectTrigger>
            <SelectContent>
              {cohorts.map((c) => (
                <SelectItem key={c._id} value={c._id}>
                  {c.name}
                  {c.status === "active" && " (진행중)"}
                  {c.status === "upcoming" && " (예정)"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Empty state – no cohort selected */}
      {!cohortId && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-muted-foreground">
          <GraduationCap className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-lg font-medium">기수를 선택하세요</p>
          <p className="text-sm mt-1">위에서 기수를 선택하면 종합 보고서가 표시됩니다.</p>
        </div>
      )}

      {/* Content */}
      {cohortId && (
        <>
          {/* Cohort title & status */}
          {selectedCohort && (
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-semibold">{selectedCohort.name}</h2>
              <Badge
                variant={
                  selectedCohort.status === "active"
                    ? "default"
                    : selectedCohort.status === "upcoming"
                      ? "secondary"
                      : "outline"
                }
              >
                {selectedCohort.status === "active"
                  ? "진행중"
                  : selectedCohort.status === "upcoming"
                    ? "예정"
                    : "완료"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />
                {selectedCohort.startDate} ~ {selectedCohort.endDate}
              </span>
            </div>
          )}

          {/* Summary Stats */}
          {evaluation === undefined ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                icon={<Users className="w-4 h-4" />}
                label="전체 교육생"
                value={`${totalMembers}명`}
                sub={`활성 ${cohortStats?.activeCount ?? "-"}명`}
              />
              <StatCard
                icon={<TrendingUp className="w-4 h-4" />}
                label="평균 출석률"
                value={`${avgAttendance}%`}
                color={avgAttendance >= 80 ? "green" : "red"}
              />
              <StatCard
                icon={<GraduationCap className="w-4 h-4" />}
                label="수료 달성"
                value={`${completedCount}명`}
                sub={totalMembers > 0 ? `${Math.round((completedCount / totalMembers) * 100)}%` : "-"}
                color="blue"
              />
              <StatCard
                icon={<Award className="w-4 h-4" />}
                label="인증 응시 자격"
                value={`${certEligibleCount}명`}
                sub={totalMembers > 0 ? `${Math.round((certEligibleCount / totalMembers) * 100)}%` : "-"}
                color={certEligibleCount > 0 ? "green" : "amber"}
              />
            </div>
          )}

          {/* Seminar count */}
          {seminars !== undefined && (
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm text-muted-foreground">전체 세미나</p>
                  <p className="text-xl font-bold mt-1">{seminars.length}회</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm text-muted-foreground">2일 세미나</p>
                  <p className="text-xl font-bold mt-1">
                    {seminars.filter((s) => s.seminarType === "two_day").length}회
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-5 pb-4">
                  <p className="text-sm text-muted-foreground">그룹코칭</p>
                  <p className="text-xl font-bold mt-1">
                    {seminars.filter((s) => s.seminarType === "group_coaching").length}회
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Per-trainee table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="w-4 h-4" />
                교육생별 수료·인증 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {evaluation === undefined ? (
                <div className="p-6 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : evaluation.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  등록된 교육생이 없습니다.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[120px]">이름</TableHead>
                        <TableHead className="text-center">출석률</TableHead>
                        <TableHead className="text-center">코칭 보고서</TableHead>
                        <TableHead className="text-center">스포츠</TableHead>
                        <TableHead className="text-center">독후감</TableHead>
                        <TableHead className="text-center">에세이</TableHead>
                        <TableHead className="text-center">슈퍼비전</TableHead>
                        <TableHead className="text-center">수료</TableHead>
                        <TableHead className="text-center">인증자격</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {evaluation.map((m) => {
                        const coachingOk = m.eligibleCoachingCount >= 20;
                        const sportsOk = m.sportsCount >= 8;
                        const bookOk = m.bookReportCount >= 2;
                        const essayOk = m.essayCount >= 1;
                        const mentorOk = m.mentorCount >= 1;
                        const attendanceOk = m.attendanceRate >= 80 && !m.sessionAbsenceViolation;
                        return (
                          <TableRow key={m.userId} className={m.isCertEligible ? "" : "bg-muted/30"}>
                            <TableCell className="font-medium">
                              <div>{m.name ?? "이름 미설정"}</div>
                              {m.memberStatus === "withdrawn" && (
                                <Badge variant="destructive" className="text-xs mt-0.5">중도탈락</Badge>
                              )}
                            </TableCell>
                            {/* Attendance */}
                            <TableCell className="text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span
                                  className={cn(
                                    "text-sm font-medium",
                                    attendanceOk ? "text-green-600" : "text-red-600",
                                  )}
                                >
                                  {m.attendanceRate}%
                                </span>
                                <Progress
                                  value={m.attendanceRate}
                                  className="h-1 w-16"
                                />
                              </div>
                            </TableCell>
                            {/* Coaching */}
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "text-sm",
                                  coachingOk ? "text-green-600 font-medium" : "text-muted-foreground",
                                )}
                              >
                                {m.eligibleCoachingCount}
                                <span className="text-xs text-muted-foreground">/20</span>
                              </span>
                              <div className="text-xs text-muted-foreground">총 {m.approvedCoachingCount}건</div>
                            </TableCell>
                            {/* Sports */}
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "text-sm",
                                  sportsOk ? "text-green-600 font-medium" : "text-muted-foreground",
                                )}
                              >
                                {m.sportsCount}
                                <span className="text-xs text-muted-foreground">/8</span>
                              </span>
                            </TableCell>
                            {/* Book reports */}
                            <TableCell className="text-center">
                              <span
                                className={cn(
                                  "text-sm",
                                  bookOk ? "text-green-600 font-medium" : "text-muted-foreground",
                                )}
                              >
                                {m.bookReportCount}
                                <span className="text-xs text-muted-foreground">/2</span>
                              </span>
                            </TableCell>
                            {/* Essay */}
                            <TableCell className="text-center">
                              <ReqBadge met={essayOk} />
                            </TableCell>
                            {/* Mentor */}
                            <TableCell className="text-center">
                              <ReqBadge met={mentorOk} />
                            </TableCell>
                            {/* Completion */}
                            <TableCell className="text-center">
                              <ReqBadge met={m.isCompleted} />
                            </TableCell>
                            {/* Cert eligible */}
                            <TableCell className="text-center">
                              {m.isCertEligible ? (
                                <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-xs">자격충족</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">미충족</Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Deficiency list */}
          {deficientMembers.length > 0 && (
            <Card className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertTriangle className="w-4 h-4" />
                  인증 요건 미충족 교육생 ({deficientMembers.length}명)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {deficientMembers.map((m) => {
                    const missing: string[] = [];
                    if (m.attendanceRate < 80 || m.sessionAbsenceViolation)
                      missing.push(`출석 ${m.attendanceRate}% (80% 미달${m.sessionAbsenceViolation ? ", 결석 위반" : ""})`);
                    if (m.approvedCoachingCount < 10)
                      missing.push(`코칭 보고서 수료기준 미달 (${m.approvedCoachingCount}/10건)`);
                    if (m.eligibleCoachingCount < 20)
                      missing.push(`코칭 보고서 인증기준 미달 (${m.eligibleCoachingCount}/20건)`);
                    if (m.sportsCount < 8)
                      missing.push(`스포츠선수 코칭 부족 (${m.sportsCount}/8건)`);
                    if (m.bookReportCount < 2)
                      missing.push(`독후감 부족 (${m.bookReportCount}/2건)`);
                    if (m.essayCount < 1)
                      missing.push("에세이 미제출");
                    if (m.mentorCount < 1)
                      missing.push("슈퍼비전/멘토링 미이수");
                    return (
                      <div
                        key={m.userId}
                        className="flex flex-col sm:flex-row sm:items-start gap-2 p-3 rounded-lg bg-background border"
                      >
                        <div className="font-medium text-sm w-28 shrink-0">{m.name ?? "이름 미설정"}</div>
                        <div className="flex flex-wrap gap-1.5">
                          {missing.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* SMPCC criteria reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Award className="w-4 h-4" />
                SMPCC 인증 응시 자격 기준
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { icon: <Users className="w-4 h-4" />, label: "출석률 80% 이상 (2~6차 완전 결석 불가)", section: "수료" },
                  { icon: <ClipboardList className="w-4 h-4" />, label: "코칭 보고서 10건 이상 (수료 기준)", section: "수료" },
                  { icon: <ClipboardList className="w-4 h-4" />, label: "코칭 보고서 20건 이상 (동일인 최대 2건)", section: "인증" },
                  { icon: <Dumbbell className="w-4 h-4" />, label: "스포츠선수 대상 코칭 8건 이상", section: "인증" },
                  { icon: <BookOpen className="w-4 h-4" />, label: "독후감 2건 이상", section: "인증" },
                  { icon: <FileText className="w-4 h-4" />, label: "멘탈코칭 에세이 1건 이상", section: "인증" },
                  { icon: <UserCheck className="w-4 h-4" />, label: "슈퍼비전/멘토링 *회 이상 (예정)", section: "인증" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span className="text-muted-foreground mt-0.5 shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                    <Badge
                      variant={item.section === "수료" ? "secondary" : "outline"}
                      className="ml-auto shrink-0 text-xs"
                    >
                      {item.section}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
