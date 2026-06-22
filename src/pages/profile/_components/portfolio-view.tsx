import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Progress } from "@/components/ui/progress.tsx";
import {
  BookOpen,
  ClipboardList,
  MessageSquare,
  NotebookPen,
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type PortfolioViewProps = {
  stats: {
    approvedEducationHours: number;
    approvedCoachingHours: number;
    approvedMentorCoachingHours: number;
    totalReflections: number;
    totalCoachingLogs: number;
    totalEducationRecords: number;
  };
  recentActivity: {
    type: string;
    date: string;
    title: string;
    hours: number;
    status: string;
  }[];
  educationTarget: number;
  coachingTarget: number;
  certificationGoal: string | null;
  role: string;
};

function CircularProgress({
  pct,
  label,
  sublabel,
  color,
}: {
  pct: number;
  label: string;
  sublabel: string;
  color: string;
}) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const dashOffset = circ - (circ * Math.min(pct, 100)) / 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 88 88">
          <circle cx="44" cy="44" r={r} strokeWidth="8" className="stroke-muted fill-none" />
          <circle
            cx="44"
            cy="44"
            r={r}
            strokeWidth="8"
            className={`fill-none transition-all duration-700 ${color}`}
            strokeDasharray={circ}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold leading-none">{Math.round(pct)}%</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

function activityIcon(type: string) {
  switch (type) {
    case "education": return <BookOpen className="w-3.5 h-3.5" />;
    case "coaching": return <ClipboardList className="w-3.5 h-3.5" />;
    case "mentor_coaching": return <MessageSquare className="w-3.5 h-3.5" />;
    default: return <NotebookPen className="w-3.5 h-3.5" />;
  }
}

function activityLabel(type: string) {
  switch (type) {
    case "education": return "교육";
    case "coaching": return "코칭";
    case "mentor_coaching": return "개인 슈퍼비전";
    default: return "활동";
  }
}

function statusIcon(status: string) {
  switch (status) {
    case "approved": return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case "rejected": return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    default: return <Clock className="w-3.5 h-3.5 text-yellow-500" />;
  }
}

function statusLabel(status: string) {
  switch (status) {
    case "approved": return "승인";
    case "rejected": return "반려";
    default: return "검토중";
  }
}

export default function PortfolioView({
  stats,
  recentActivity,
  educationTarget,
  coachingTarget,
  certificationGoal,
  role,
}: PortfolioViewProps) {
  const educationPct = educationTarget > 0
    ? (stats.approvedEducationHours / educationTarget) * 100
    : 0;
  const coachingPct = coachingTarget > 0
    ? (stats.approvedCoachingHours / coachingTarget) * 100
    : 0;
  const overallPct = Math.round((educationPct + coachingPct) / 2);

  const isTrainee = role === "trainee";

  const summaryCards = [
    {
      icon: <BookOpen className="w-5 h-5" />,
      label: "교육 이수",
      value: `${stats.approvedEducationHours}h`,
      sub: `${stats.totalEducationRecords}건 기록`,
      color: "bg-blue-500/10 text-blue-600",
    },
    {
      icon: <ClipboardList className="w-5 h-5" />,
      label: "코칭 실습",
      value: `${stats.approvedCoachingHours}h`,
      sub: `${stats.totalCoachingLogs}건 기록`,
      color: "bg-violet-500/10 text-violet-600",
    },
    {
      icon: <MessageSquare className="w-5 h-5" />,
      label: "슈퍼비전",
      value: `${stats.approvedMentorCoachingHours}h`,
      sub: "승인된 시간",
      color: "bg-emerald-500/10 text-emerald-600",
    },
    {
      icon: <NotebookPen className="w-5 h-5" />,
      label: "성찰 일지",
      value: `${stats.totalReflections}개`,
      sub: "작성한 일지",
      color: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Certification progress - trainee only */}
      {isTrainee && certificationGoal && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="w-4 h-4 text-primary" />
              자격증 취득 현황
              <Badge variant="secondary" className="ml-auto">
                {certificationGoal}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-around gap-4">
              <CircularProgress
                pct={educationPct}
                label="교육 이수"
                sublabel={`${stats.approvedEducationHours}/${educationTarget}h`}
                color="stroke-blue-500"
              />
              <CircularProgress
                pct={coachingPct}
                label="코칭 실습"
                sublabel={`${Math.round(stats.approvedCoachingHours * 10) / 10}/${coachingTarget}h`}
                color="stroke-violet-500"
              />
              <CircularProgress
                pct={overallPct}
                label="전체 달성률"
                sublabel="평균"
                color="stroke-primary"
              />
            </div>

            {/* Progress bars */}
            <div className="mt-6 space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">교육 이수</span>
                  <span className="font-medium">{stats.approvedEducationHours}h / {educationTarget}h</span>
                </div>
                <Progress value={educationPct} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">코칭 실습</span>
                  <span className="font-medium">{Math.round(stats.approvedCoachingHours * 10) / 10}h / {coachingTarget}h</span>
                </div>
                <Progress value={coachingPct} className="h-2" />
              </div>
            </div>

            {overallPct >= 100 && (
              <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700">
                <Award className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">모든 요건을 충족했습니다! 자격증 신청이 가능합니다.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="w-4 h-4 text-primary" />
            활동 요약
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {summaryCards.map((card) => (
              <div key={card.label} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${card.color}`}>
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-lg font-bold leading-none">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                  <p className="text-xs text-muted-foreground">{card.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="w-4 h-4 text-primary" />
            최근 활동 내역
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">아직 활동 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2">
              {recentActivity.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-muted/40 transition-colors"
                >
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    item.type === "education" ? "bg-blue-500/10 text-blue-600" :
                    item.type === "coaching" ? "bg-violet-500/10 text-violet-600" :
                    "bg-emerald-500/10 text-emerald-600"
                  }`}>
                    {activityIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs px-1.5 py-0 h-4">
                        {activityLabel(item.type)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{item.hours}h</span>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(item.date), "M월 d일", { locale: ko })}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {statusIcon(item.status)}
                    <span className="text-xs text-muted-foreground">{statusLabel(item.status)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
