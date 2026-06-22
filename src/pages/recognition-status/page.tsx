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
// NCP: 스포츠선수 고객 5명 이상 + 전체 15회 이상
// BCP: 버디코칭 실습 기록 (buddy pair별 1건)
// MCP: 멘토코칭 / 코더코 횟수

const NCP_ATHLETE_TARGET = 5;   // 스포츠선수 고객 수
const NCP_SESSION_TARGET = 15;  // 총 승인 세션 수
const BCP_TARGET = 1;           // 최소 1건 인정 (버디 실습)

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

  const coachingSummary = useQuery(api.coaching.getMySummary);
  const bcpSummary = useQuery(api.bcp.getMySummary);
  const mentorSummary = useQuery(api.mentorCoaching.getMySummary);

  const isLoading =
    coachingSummary === undefined ||
    bcpSummary === undefined ||
    mentorSummary === undefined;

  // ── NCP criteria ─────────────────────────────────────────────────────────
  const athleteCount = coachingSummary?.athleteClientCount ?? 0;
  const sessionCount = coachingSummary?.approvedSessionCount ?? 0;
  const ncpAthleteDone = athleteCount >= NCP_ATHLETE_TARGET;
  const ncpSessionDone = sessionCount >= NCP_SESSION_TARGET;
  const ncpFullyDone = ncpAthleteDone && ncpSessionDone;

  // ── BCP criteria ─────────────────────────────────────────────────────────
  const bcpRecognized = bcpSummary?.recognizedCount ?? 0;
  const bcpDone = bcpRecognized >= BCP_TARGET;

  // ── MCP (멘토코칭 / 코더코) ───────────────────────────────────────────────
  const mentorCount = mentorSummary?.mentorCoachingCount ?? 0;
  const coderCoCount = mentorSummary?.coderCoCount ?? 0;
  const mcpCount = mentorCount + coderCoCount;

  // Overall done criteria: NCP fulfilled + BCP at least 1
  const allCoreDone = ncpFullyDone && bcpDone;

  // Summary stat cards
  const statCards = [
    {
      label: "NCP 코칭 세션",
      value: isLoading ? "..." : `${sessionCount}회`,
      sub: `목표 ${NCP_SESSION_TARGET}회`,
      done: ncpSessionDone,
      icon: <ClipboardList className="w-4 h-4" />,
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-900/20",
    },
    {
      label: "스포츠선수 고객",
      value: isLoading ? "..." : `${athleteCount}명`,
      sub: `목표 ${NCP_ATHLETE_TARGET}명`,
      done: ncpAthleteDone,
      icon: <Users className="w-4 h-4" />,
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      label: "BCP 버디코칭",
      value: isLoading ? "..." : `${bcpRecognized}건`,
      sub: "인정된 버디 쌍",
      done: bcpDone,
      icon: <MessageSquare className="w-4 h-4" />,
      color: "text-purple-600",
      bg: "bg-purple-50 dark:bg-purple-900/20",
    },
    {
      label: "멘토코칭 / 코더코",
      value: isLoading ? "..." : `${mcpCount}회`,
      sub: `멘토 ${mentorCount}회 + 코더코 ${coderCoCount}회`,
      done: false,
      icon: <Award className="w-4 h-4" />,
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-900/20",
    },
  ];

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-8">
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
              SMPCC 자격 취득을 위한 코칭실습시간 인정 기준입니다.
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
              {allCoreDone ? "핵심 요건 달성 ✓" : "진행중"}
            </Badge>
          )}
        </div>
      </motion.div>

      {/* Quick stat cards */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-3"
      >
        {statCards.map((stat) => (
          <Card key={stat.label} className={stat.done ? "border-green-200 dark:border-green-800" : ""}>
            <CardContent className="p-4">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <>
                  <div className="flex items-center justify-between mb-1">
                    <div className={`w-8 h-8 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                      {stat.icon}
                    </div>
                    {stat.done && (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    )}
                  </div>
                  <p className="text-xl font-bold mt-2">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5">{stat.sub}</p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* NCP 기준 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className={ncpFullyDone ? "border-green-200 dark:border-green-800" : ""}>
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
          <CardContent className="space-y-5">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <>
                <RequirementRow
                  label="스포츠선수 고객 수"
                  current={athleteCount}
                  target={NCP_ATHLETE_TARGET}
                  unit="명"
                  done={ncpAthleteDone}
                  href="/coaching-log"
                  navigate={navigate}
                  subLabel="고객유형: 스포츠선수 로 기록된 고유 코치이"
                />
                <RequirementRow
                  label="총 코칭 세션 수"
                  current={sessionCount}
                  target={NCP_SESSION_TARGET}
                  unit="회"
                  done={ncpSessionDone}
                  href="/coaching-log"
                  navigate={navigate}
                  subLabel="승인된 전체 세션 기준"
                />
              </>
            )}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
              <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
              <p>
                NCP 인정을 위해 코칭 로그 작성 시 <strong className="text-foreground">고객유형</strong>에서{" "}
                <strong className="text-foreground">스포츠선수</strong>를 선택하세요.
                스포츠선수 고객 5명 이상, 전체 세션 15회 이상 승인 시 인정됩니다.
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
        <Card className={bcpDone ? "border-green-200 dark:border-green-800" : ""}>
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
                <div className="grid grid-cols-3 gap-3 text-center">
                  {[
                    { label: "인정 건수", value: bcpRecognized, note: "버디 쌍 기준" },
                    { label: "승인된 세션", value: bcpSummary?.approvedCount ?? 0, note: "전체" },
                    { label: "총 실습 시간", value: `${bcpSummary?.totalHours ?? 0}h`, note: "" },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{item.value}</p>
                      <p className="text-xs font-medium text-foreground">{item.label}</p>
                      {item.note && <p className="text-[11px] text-muted-foreground">{item.note}</p>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3 text-center">
                  {[
                    { label: "코치 역할", value: bcpSummary?.coachSessions ?? 0 },
                    { label: "코치이 역할", value: bcpSummary?.coacheeSessions ?? 0 },
                  ].map((item) => (
                    <div key={item.label} className="p-3 rounded-lg bg-muted/50">
                      <p className="text-lg font-bold">{item.value}회</p>
                      <p className="text-xs text-muted-foreground">{item.label}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                  <Info className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  <p>
                    동일한 버디 2명과의 실습은 최대 <strong className="text-foreground">1건</strong>으로 인정됩니다.
                    다양한 버디와 실습할수록 더 많은 건수가 인정됩니다.
                  </p>
                </div>
              </>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate("/bcp")}
            >
              BCP 기록 보기 <ChevronRight className="w-4 h-4 ml-1" />
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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-600" />
              멘토코칭 / 코더코 현황 (MCP)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {[
                  {
                    label: "멘토코칭",
                    value: mentorCount,
                    unit: "회",
                    color: "text-orange-600",
                    bg: "bg-orange-50 dark:bg-orange-900/20",
                  },
                  {
                    label: "코더코",
                    value: coderCoCount,
                    unit: "회",
                    color: "text-teal-600",
                    bg: "bg-teal-50 dark:bg-teal-900/20",
                  },
                  {
                    label: "총 승인 시간",
                    value: `${Math.round((mentorSummary?.totalApprovedHours ?? 0) * 10) / 10}`,
                    unit: "시간",
                    color: "text-indigo-600",
                    bg: "bg-indigo-50 dark:bg-indigo-900/20",
                  },
                  {
                    label: "검토 중",
                    value: mentorSummary?.pendingCount ?? 0,
                    unit: "건",
                    color: "text-amber-600",
                    bg: "bg-amber-50 dark:bg-amber-900/20",
                  },
                ].map((item) => (
                  <div key={item.label} className={`p-3 rounded-lg ${item.bg} flex items-center gap-3`}>
                    <div className="min-w-0">
                      <p className={`text-xl font-bold ${item.color}`}>
                        {item.value}
                        <span className="text-sm font-medium ml-1">{item.unit}</span>
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => navigate("/mentor-coaching")}
            >
              멘토코칭 기록 보기 <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      {/* 전체 체크리스트 */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <Card className={allCoreDone ? "border-primary/30 bg-primary/5" : ""}>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              인정 요건 체크리스트
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : (
              <div className="space-y-2">
                {[
                  {
                    label: "NCP - 스포츠선수 고객 5명 이상",
                    done: ncpAthleteDone,
                    detail: `현재 ${athleteCount}명`,
                  },
                  {
                    label: "NCP - 코칭 세션 15회 이상 승인",
                    done: ncpSessionDone,
                    detail: `현재 ${sessionCount}회`,
                  },
                  {
                    label: "BCP - 버디코칭 실습 1건 이상 인정",
                    done: bcpDone,
                    detail: `현재 ${bcpRecognized}건`,
                  },
                  {
                    label: "MCP - 멘토코칭 / 코더코 참여",
                    done: mcpCount > 0,
                    detail: `현재 ${mcpCount}회`,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
                      item.done
                        ? "bg-green-50 dark:bg-green-900/20"
                        : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      {item.done ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      ) : (
                        <Circle className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                      )}
                      <span className={`text-sm ${item.done ? "text-green-700 dark:text-green-400 font-medium" : "text-foreground"}`}>
                        {item.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
