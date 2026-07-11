import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { motion } from "motion/react";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Shield,
  CalendarCheck,
  BarChart2,
  BookOpen,
  FileText,
  Award,
  Heart,
  NotebookPen,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  GraduationCap,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

const ROLE_LABELS: Record<string, string> = {
  trainee: "수강생",
  senior_coach: "상위코치",
  admin: "관리자",
};

const APPROVAL_LABELS: Record<string, string> = {
  approved: "승인",
  pending: "대기",
  rejected: "거절",
};

const LICENSE_LABELS: Record<string, string> = {
  KAC: "KAC",
  KPC: "KPC",
  KSC: "KSC",
  ACC: "ACC",
  PCC: "PCC",
  MCC: "MCC",
  other: "기타",
};

const CERT_STATUS_LABELS: Record<string, string> = {
  submitted: "신청 완료",
  under_review: "검토 중",
  approved: "승인",
  rejected: "반려",
};

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") {
    return <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15 text-xs">승인</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs">거절</Badge>;
  }
  if (status === "draft") {
    return <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">임시저장</Badge>;
  }
  return <Badge variant="secondary" className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40">대기</Badge>;
}

function StatCard({
  icon,
  label,
  main,
  sub,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  main: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl px-3 py-3 text-center border ${highlight ? "bg-primary/8 border-primary/20" : "bg-muted/40 border-transparent"}`}>
      <div className={`flex justify-center mb-1 ${highlight ? "text-primary" : "text-muted-foreground"}`}>
        {icon}
      </div>
      <p className={`text-base font-bold ${highlight ? "text-primary" : "text-foreground"}`}>{main}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      <p className={`text-xs mt-0.5 ${highlight ? "text-primary/70" : "text-muted-foreground"}`}>{label}</p>
    </div>
  );
}

export default function AdminTraineeProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();

  const profile = useQuery(
    api.admin.getTraineeFullProfile,
    userId ? { userId: userId as Id<"users"> } : "skip",
  );

  if (!userId) {
    return (
      <div className="p-8 text-center text-muted-foreground">잘못된 접근입니다.</div>
    );
  }

  if (profile === undefined) {
    return (
      <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-60 w-full rounded-xl" />
      </div>
    );
  }

  if (profile === null) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">사용자를 찾을 수 없습니다.</p>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 돌아가기
        </Button>
      </div>
    );
  }

  const { user, stats, recentCoachingLogs, recentEducation, licenses, certificationApplication } = profile;

  const coachingHours = Math.round((stats.approvedCoachingMinutes / 60) * 10) / 10;
  const mentorHours = Math.round((stats.approvedMentorMinutes / 60) * 10) / 10;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="flex items-center gap-3"
      >
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          뒤로
        </Button>
      </motion.div>

      {/* Profile card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      >
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden border-2 border-border flex-shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="프로필" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>

              {/* Name / badges */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-foreground">{user.name}</h1>
                  <Badge variant="secondary" className="text-xs">{ROLE_LABELS[user.role] ?? user.role}</Badge>
                  <StatusBadge status={user.approvalStatus} />
                  {user.mbti && (
                    <Badge variant="outline" className="text-xs">{user.mbti}</Badge>
                  )}
                </div>
                <div className="flex flex-col gap-1 mt-1">
                  {user.email && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>{user.email}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{user.phone ?? "전화번호 미입력"}</span>
                  </div>
                  {user.joinedAt && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarCheck className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>가입일: {format(new Date(user.joinedAt), "yyyy년 M월 d일", { locale: ko })}</span>
                    </div>
                  )}
                  {user.coachName && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Shield className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>담당 슈퍼바이저: {user.coachName}</span>
                    </div>
                  )}
                  {user.cohortName && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>소속 기수: {user.cohortName}</span>
                    </div>
                  )}
                  {user.certificationGoal && (
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Award className="w-3.5 h-3.5 flex-shrink-0" />
                      <span>자격증 목표: {user.certificationGoal}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 className={`w-3.5 h-3.5 flex-shrink-0 ${user.onboardingCompleted ? "text-chart-4" : "text-muted-foreground"}`} />
                    <span>온보딩: {user.onboardingCompleted ? "완료" : "미완료"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bio / Specializations / Style */}
            {(user.bio || user.coachingStyle || user.specializations.length > 0) && (
              <div className="mt-4 pt-4 border-t space-y-2">
                {user.bio && (
                  <p className="text-sm text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">{user.bio}</p>
                )}
                {user.coachingStyle && (
                  <p className="text-sm text-muted-foreground">코칭 스타일: <span className="text-foreground">{user.coachingStyle}</span></p>
                )}
                {user.specializations.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {user.specializations.map((s) => (
                      <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-primary" />
              활동 통계
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard
                icon={<Clock className="w-4 h-4" />}
                label="코칭 실습 (승인)"
                main={`${coachingHours}h`}
                sub={`전체 ${stats.totalCoachingLogs}건`}
                highlight
              />
              <StatCard
                icon={<Shield className="w-4 h-4" />}
                label="슈퍼비전 (승인)"
                main={`${mentorHours}h`}
                sub={`전체 ${stats.totalMentorLogs}건`}
              />
              <StatCard
                icon={<GraduationCap className="w-4 h-4" />}
                label="교육 이수 (승인)"
                main={`${stats.approvedEducationHours}h`}
                sub={`전체 ${stats.totalEducationRecords}건`}
              />
              <StatCard
                icon={<CalendarCheck className="w-4 h-4" />}
                label="출석 횟수"
                main={String(stats.attendanceCount)}
              />
              <StatCard
                icon={<BookOpen className="w-4 h-4" />}
                label="독서 보고서"
                main={String(stats.approvedBookReports)}
                sub={`전체 ${stats.bookReports}건`}
              />
              <StatCard
                icon={<FileText className="w-4 h-4" />}
                label="에세이"
                main={String(stats.approvedEssays)}
                sub={`전체 ${stats.essays}건`}
              />
              <StatCard
                icon={<NotebookPen className="w-4 h-4" />}
                label="성찰 일지"
                main={String(stats.totalReflections)}
              />
              <StatCard
                icon={<Heart className="w-4 h-4" />}
                label="자기 체크인"
                main={String(stats.totalCheckIns)}
              />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Licenses & Certification */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        {/* Licenses */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              보유 자격증
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {licenses.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">등록된 자격증이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {licenses.map((lic) => (
                  <div key={lic._id} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {lic.isActive ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-chart-4" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-muted-foreground" />
                      )}
                      <span className="font-medium text-foreground">
                        {lic.licenseType === "other" ? (lic.otherLicenseName ?? "기타") : LICENSE_LABELS[lic.licenseType]}
                      </span>
                      {lic.issuedBy && (
                        <span className="text-muted-foreground text-xs">({lic.issuedBy})</span>
                      )}
                    </div>
                    {lic.acquiredDate && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(lic.acquiredDate), "yyyy.MM", { locale: ko })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Certification application */}
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />
              인증 신청 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {!certificationApplication ? (
              <p className="text-sm text-muted-foreground text-center py-3">인증 신청 이력이 없습니다.</p>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">상태</span>
                  <Badge
                    variant={certificationApplication.status === "approved" ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {CERT_STATUS_LABELS[certificationApplication.status] ?? certificationApplication.status}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">신청일</span>
                  <span className="text-foreground">
                    {format(new Date(certificationApplication.submittedAt), "yyyy년 M월 d일", { locale: ko })}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Coaching Logs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              최근 코칭 실습 (최대 10건)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {recentCoachingLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">코칭 실습 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentCoachingLogs.map((log) => (
                  <div
                    key={log._id}
                    className="flex items-center justify-between gap-3 text-sm py-1.5 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={log.approvalStatus} />
                      <span className="text-muted-foreground text-xs flex-shrink-0">
                        {format(new Date(log.coachingDate), "MM/dd")}
                      </span>
                      <span className="text-foreground truncate">{log.topic}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {Math.round((log.durationMinutes / 60) * 10) / 10}h
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Education */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-primary" />
              최근 교육 이수 (최대 10건)
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {recentEducation.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-3">교육 이수 기록이 없습니다.</p>
            ) : (
              <div className="space-y-2">
                {recentEducation.map((edu) => (
                  <div
                    key={edu._id}
                    className="flex items-center justify-between gap-3 text-sm py-1.5 border-b last:border-0"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <StatusBadge status={edu.approvalStatus} />
                      <span className="text-muted-foreground text-xs flex-shrink-0">
                        {format(new Date(edu.educationDate), "MM/dd")}
                      </span>
                      <span className="text-foreground truncate">{edu.educationName}</span>
                    </div>
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {edu.hours}h
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
