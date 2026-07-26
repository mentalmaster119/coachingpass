import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  CheckCircle2,
  Circle,
  ClipboardList,
  MessageSquare,
  Users,
  Award,
  ChevronRight,
  TrendingUp,
  Info,
  ShieldCheck,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";

// ── Recognition criteria ──────────────────────────────────────────────────────
// SMPCC 코칭실습시간 인정 기준
// NCP: 스포츠선수 세션 5회 이상 + 전체 15회 이상 (일반인은 최대 15회까지 합산 인정)
// BCP: 버디코칭 실습 기록 2회 이상
// MCP: 멘토코칭 2회 이상
// SVP: 슈퍼비전 1회 이상

const NCP_ATHLETE_TARGET = 5;
const NCP_SESSION_TARGET = 15;
const BCP_TARGET = 2;
const MCP_TARGET = 2;
const SVP_TARGET = 1;

function RequirementRow({
  label,
  current,
  target,
  unit,
  done,
  href,
  navigate,
  subLabel,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  done: boolean;
  href: string;
  navigate: (path: string) => void;
  subLabel?: string;
}) {
  const pct = Math.min((current / target) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {done ? (
            <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
          ) : (
            <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{label}</span>
          {subLabel && (
            <span className="text-xs text-muted-foreground">({subLabel})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            <span className={`font-semibold ${done ? "text-green-600" : "text-foreground"}`}>
              {current}
            </span>
            {" / "}{target}{unit}
          </span>
          {done && (
            <Badge className="text-[10px] px-1.5 h-4 bg-green-500/10 text-green-600 border-green-200">
              달성
            </Badge>
          )}
        </div>
      </div>
      <Progress value={pct} className="h-1.5" />
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {done
            ? "목표를 달성했습니다!"
            : `${Math.max(0, target - current)}${unit} 남음`}
        </p>
        <button
          onClick={() => navigate(href)}
          className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
        >
          바로가기 <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

export default function RecognitionStatusPage() {
  const navigate = useNavigate();

  const logs = useQuery(api.coaching.getMyLogs);
  const bcpSummary = useQuery(api.bcp.getMySummary);
  const mentorSummary = useQuery(api.mentorCoaching.getMySummary);

  const isLoading =
    logs === undefined ||
    bcpSummary === undefined ||
    mentorSummary === undefined;

  // ── Approved logs calculations ──────────────────────────────────────────
  const approvedLogs = logs?.filter((l) => l.approvalStatus === "approved") ?? [];
  
  // NCP (일반코칭실습): coachingType 이 individual, group, team 인 건 기준
  const ncpLogs = approvedLogs.filter(
    (l) => l.coachingType === "individual" || l.coachingType === "group" || l.coachingType === "team"
  );
  
  const athleteSessions = ncpLogs.filter((l) => l.ncpClientCategory === "athlete").length;
  const generalSessions = ncpLogs.filter((l) => l.ncpClientCategory === "general" || !l.ncpClientCategory).length;
  
  const ncpAthleteDone = athleteSessions >= NCP_ATHLETE_TARGET;
  const ncpTotalSessions = athleteSessions + Math.min(generalSessions, 15);
  const ncpTotalDone = ncpTotalSessions >= NCP_SESSION_TARGET;
  const ncpFullyDone = ncpAthleteDone && ncpTotalDone;

  // ── BCP (버디코칭) ───────────────────────────────────────────────────────
  const bcpRecognized = bcpSummary?.recognizedCount ?? 0;
  const bcpDone = bcpRecognized >= BCP_TARGET;

  // ── MCP (멘토코칭) ───────────────────────────────────────────────────────
  const mentorCount = mentorSummary?.mentorCoachingCount ?? 0;
  const mcpDone = mentorCount >= MCP_TARGET;

  // ── SVP (슈퍼비전) ───────────────────────────────────────────────────────
  const approvedSvLogs = approvedLogs.filter((l) => l.coachingType === "sv");
  const approvedSvCount = approvedSvLogs.length;
  const approvedSvHours = approvedSvLogs.reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
  const pendingSvCount = logs?.filter((l) => l.coachingType === "sv" && l.approvalStatus === "pending").length ?? 0;
  const rejectedSvCount = logs?.filter((l) => l.coachingType === "sv" && l.approvalStatus === "rejected").length ?? 0;
  const svpDone = approvedSvCount >= SVP_TARGET;

  // Overall done criteria
  const allCoreDone = ncpFullyDone && bcpDone && mcpDone && svpDone;

  // Summary stat cards
  const statCards = [
    {
      label: "선수코칭 (NCP)",
      value: isLoading ? "..." : `${athleteSessions}회`,
      sub: `목표 ${NCP_ATHLETE_TARGET}회 (필수)`,
      done: ncpAthleteDone,
      icon: <Users className="w-3.5 h-3.5" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "일반코칭 (NCP)",
      value: isLoading ? "..." : `${generalSessions}회`,
      sub: "최대 15회 인정",
      done: generalSessions >= 10,
      icon: <ClipboardList className="w-3.5 h-3.5" />,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "버디코칭 (BCP)",
      value: isLoading ? "..." : `${bcpRecognized}건`,
      sub: `목표 ${BCP_TARGET}회`,
      done: bcpDone,
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "멘토코칭 (MCP)",
      value: isLoading ? "..." : `${mentorCount}회`,
      sub: `목표 ${MCP_TARGET}회`,
      done: mcpDone,
      icon: <Award className="w-3.5 h-3.5" />,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
    {
      label: "슈퍼비전 (SVP)",
      value: isLoading ? "..." : `${approvedSvCount}회`,
      sub: `목표 ${SVP_TARGET}회`,
      done: svpDone,
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      color: "text-rose-600",
      bg: "bg-rose-50 dark:bg-rose-900/20",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShieldCheck className="w-6 h-6 text-primary" />
              코칭실습 인정 기준 달성 현황
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              멘탈코칭전문가 자격 취득을 위한 코칭실습 인정 기준입니다.
            </p>
          </div>
          {!isLoading && (
            <Badge
              className={`text-sm px-3 py-1.5 flex-shrink-0 ${
                allCoreDone
                  ? "bg-green-500/10 text-green-700 border-green-200"
                  : "bg-amber-500/10 text-amber-700 border-amber-200"
              }`}
            >
              {allCoreDone ? "모든 요건 달성 ✓" : "진행중"}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Quick stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 sm:grid-cols-5 gap-3"
      >
        {statCards.map((stat) => (
          <Card key={stat.label} className={`shadow-sm ${stat.done ? "border-green-200 dark:border-green-800" : ""}`}>
            <CardContent className="p-3 flex flex-col justify-between h-full">
              {isLoading ? (
                <Skeleton className="h-14 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${stat.bg} ${stat.color}`}>
                      {stat.icon}
                    </div>
                    {stat.done && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                    )}
                  </div>
                  <div>
                    <p className="text-base font-bold leading-tight">{stat.value}</p>
                    <p className="text-[11px] font-semibold text-foreground mt-0.5 truncate">{stat.label.split(" ")[0]}</p>
                    <p className="text-[9px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Detail Cards Row (2x2 Grid) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* NCP 기준 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className={`h-full flex flex-col justify-between shadow-sm ${ncpFullyDone ? "border-green-200 dark:border-green-800" : ""}`}>
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-green-600" />
                    NCP 코칭실습 인정 기준
                  </span>
                  {ncpFullyDone ? (
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200">달성</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">진행중</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <div className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <RequirementRow
                      label="스포츠선수 코칭 세션"
                      current={athleteSessions}
                      target={NCP_ATHLETE_TARGET}
                      unit="회"
                      done={ncpAthleteDone}
                      href="/coaching-log"
                      navigate={navigate}
                      subLabel="고객유형: 스포츠선수"
                    />
                    <RequirementRow
                      label="총 코칭 세션 (인정 대상)"
                      current={ncpTotalSessions}
                      target={NCP_SESSION_TARGET}
                      unit="회"
                      done={ncpTotalDone}
                      href="/coaching-log"
                      navigate={navigate}
                      subLabel="선수코칭 + 일반인코칭(최대 15회)"
                    />
                  </>
                )}
              </CardContent>
            </div>
            <CardContent className="pt-0">
              <div className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/50 text-[11px] text-muted-foreground">
                <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <p>
                  스포츠선수 코칭은 반드시 <strong className="text-foreground">5회 이상</strong>이어야 하며, 
                  일반인 코칭은 최대 <strong className="text-foreground">15회까지</strong>만 합산 인정되어 총 합계가 <strong className="text-foreground">15회 이상</strong>이어야 합니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* BCP 기준 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className={`h-full flex flex-col justify-between shadow-sm ${bcpDone ? "border-green-200 dark:border-green-800" : ""}`}>
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-purple-600" />
                    BCP 버디코칭 실습 현황
                  </span>
                  {bcpDone ? (
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200">달성</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">진행중</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      {[
                        { label: "승인된 세션", value: `${bcpSummary?.approvedCount ?? 0}회`, note: `목표 ${BCP_TARGET}회` },
                        { label: "총 실습 시간", value: `${bcpSummary?.totalHours ?? 0}시간`, note: "" },
                      ].map((item) => (
                        <div key={item.label} className="p-3 rounded-lg bg-muted/50 flex flex-col justify-center">
                          <p className="text-base font-bold">{item.value}</p>
                          <p className="text-xs font-semibold text-foreground mt-0.5">{item.label}</p>
                          {item.note && <p className="text-[10px] text-muted-foreground mt-0.5">{item.note}</p>}
                        </div>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-center">
                      {[
                        { label: "코치 역할", value: bcpSummary?.coachSessions ?? 0 },
                        { label: "코치이 역할", value: bcpSummary?.coacheeSessions ?? 0 },
                      ].map((item) => (
                        <div key={item.label} className="p-2 rounded-lg bg-muted/30">
                          <p className="text-sm font-bold">{item.value}회</p>
                          <p className="text-[10px] text-muted-foreground">{item.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </div>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/bcp")}
              >
                BCP 기록 보기 <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* MCP (멘토코칭) 현황 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className={`h-full flex flex-col justify-between shadow-sm ${mcpDone ? "border-green-200 dark:border-green-800" : ""}`}>
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-amber-600" />
                    멘토코칭 현황 (MCP)
                  </span>
                  {mcpDone ? (
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200">달성</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">진행중</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    {[
                      {
                        label: "멘토코칭",
                        value: `${mentorCount}회`,
                        note: `목표 ${MCP_TARGET}회`,
                      },
                      {
                        label: "총 승인 시간",
                        value: `${Math.round((mentorSummary?.totalApprovedHours ?? 0) * 10) / 10}시간`,
                        note: "",
                      },
                      {
                        label: "검토 중",
                        value: `${mentorSummary?.pendingCount ?? 0}건`,
                        note: "",
                      },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/50 flex flex-col justify-center">
                        <p className="text-base font-bold text-foreground">{item.value}</p>
                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{item.label}</p>
                        {item.note && <p className="text-[9px] text-muted-foreground mt-0.5">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/mentor-coaching")}
              >
                멘토코칭 기록 보기 <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* SVP (슈퍼비전) 현황 */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Card className={`h-full flex flex-col justify-between shadow-sm ${svpDone ? "border-green-200 dark:border-green-800" : ""}`}>
            <div>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-rose-600" />
                    슈퍼비전 현황 (SVP)
                  </span>
                  {svpDone ? (
                    <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-200">달성</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-[10px]">진행중</Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoading ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="grid grid-cols-3 gap-2.5 text-center">
                    {[
                      {
                        label: "슈퍼비전",
                        value: `${approvedSvCount}회`,
                        note: `목표 ${SVP_TARGET}회`,
                      },
                      {
                        label: "총 승인 시간",
                        value: `${approvedSvHours.toFixed(1)}시간`,
                        note: "",
                      },
                      {
                        label: "검토 중",
                        value: `${pendingSvCount}건`,
                        note: "",
                      },
                    ].map((item) => (
                      <div key={item.label} className="p-3 rounded-lg bg-muted/50 flex flex-col justify-center">
                        <p className="text-base font-bold text-foreground">{item.value}</p>
                        <p className="text-[11px] font-semibold text-muted-foreground mt-0.5">{item.label}</p>
                        {item.note && <p className="text-[9px] text-muted-foreground mt-0.5">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </div>
            <CardContent className="pt-0">
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs"
                onClick={() => navigate("/supervision")}
              >
                슈퍼비전 기록 보기 <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
