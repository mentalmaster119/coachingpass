import { useMutation, useQuery } from "convex/react";
import { motion } from "motion/react";
import { CalendarDays, MapPin, Clock, Award, CheckCircle2, XCircle, Hourglass } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ConvexError } from "convex/values";

function StatusBadge({ status }: { status: string | null }) {
  if (status === "approved") {
    return <Badge className="bg-chart-4/15 text-chart-4 border-chart-4/20 hover:bg-chart-4/15 text-xs">승인 (시간 인정됨)</Badge>;
  }
  if (status === "pending") {
    return <Badge variant="secondary" className="text-xs">신청 완료 · 승인 대기</Badge>;
  }
  if (status === "rejected") {
    return <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/10 text-xs">반려됨</Badge>;
  }
  return null;
}

export default function MentalForumPage() {
  const forums = useQuery(api.smpcc.listForums);
  const creditHours = useQuery(api.smpcc.getMyCreditHours);
  const cert = useQuery(api.smpcc.getMyCertification);
  const applyForum = useMutation(api.smpcc.applyForForum);
  const cancelForum = useMutation(api.smpcc.cancelForumApplication);

  const today = new Date().toISOString().slice(0, 10);

  const handleApply = async (forumId: (typeof forums extends (infer T)[] | undefined ? T : never)["_id"]) => {
    try {
      await applyForum({ forumId });
      toast.success("참석 신청이 완료되었습니다. 관리자 승인 후 교육시간이 인정됩니다.");
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("오류가 발생했습니다.");
      }
    }
  };

  const handleCancel = async (forumId: (typeof forums extends (infer T)[] | undefined ? T : never)["_id"]) => {
    try {
      await cancelForum({ forumId });
      toast.success("신청이 취소되었습니다.");
    } catch (e) {
      if (e instanceof ConvexError) {
        toast.error((e.data as { message: string }).message);
      } else {
        toast.error("오류가 발생했습니다.");
      }
    }
  };

  const activeCert = cert?.cert;

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
            <Award className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">멘탈 포럼 & 인정시간</h1>
            <p className="text-sm text-muted-foreground">포럼 참석 신청 및 누적 인정 교육시간 확인</p>
          </div>
        </div>
      </motion.div>

      {/* SMPCC 자격 현황 */}
      {cert !== undefined && (
        <Card className={activeCert ? "border-amber-400/40 bg-amber-500/5" : ""}>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-500" />
              SMPCC 자격 현황
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {activeCert ? (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-500/15 text-amber-600 border-amber-400/30 hover:bg-amber-500/15 font-semibold">
                    ✦ SMPCC 취득
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  취득일: {activeCert.issuedAt} · 만료일: {activeCert.expiresAt}
                </p>
                {activeCert.expiresAt <= today ? (
                  <p className="text-xs text-destructive">⚠ 자격이 만료되었습니다. 갱신이 필요합니다.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    갱신을 위해 만료일 전까지 20시간 이상의 추가 교육을 이수해야 합니다.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">아직 SMPCC 자격을 취득하지 않았습니다.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 누적 인정시간 */}
      {creditHours !== undefined && creditHours !== null && (
        <Card>
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Hourglass className="w-4 h-4 text-primary" />
              누적 인정 교육시간
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <div className="flex items-end gap-2 mb-3">
              <span className="text-3xl font-bold text-foreground">{creditHours.totalHours}</span>
              <span className="text-muted-foreground mb-1">시간</span>
              {activeCert && (
                <span className="text-xs text-muted-foreground mb-1 ml-2">
                  (갱신 기준 20시간 중 {Math.min(creditHours.totalHours, 20)}/20)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {creditHours.breakdown.map((b) => (
                <div key={b.key} className="bg-muted/40 rounded-lg px-3 py-2">
                  <p className="text-xs text-muted-foreground">{b.label}</p>
                  <p className="font-semibold text-foreground">{b.hours}h <span className="text-xs font-normal text-muted-foreground">({b.count}건)</span></p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 포럼 목록 */}
      <div>
        <h2 className="text-base font-semibold mb-3">멘탈 포럼 일정</h2>
        {forums === undefined ? (
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : forums.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon"><CalendarDays /></EmptyMedia>
              <EmptyTitle>등록된 포럼이 없습니다</EmptyTitle>
              <EmptyDescription>포럼 일정이 등록되면 여기에 표시됩니다.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {forums.map((f) => {
              const isPast = f.forumDate < today;
              return (
                <Card key={f._id} className={`shadow-sm ${isPast ? "opacity-70" : ""}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-foreground">{f.title}</p>
                          <Badge variant="outline" className="text-xs">+{f.creditHours}h 인정</Badge>
                          {isPast && <Badge variant="secondary" className="text-xs">종료됨</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {format(new Date(f.forumDate), "yyyy년 M월 d일 (eee)", { locale: ko })}
                            {f.startTime && ` ${f.startTime}`}{f.endTime && ` ~ ${f.endTime}`}
                          </span>
                          {f.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />{f.location}
                            </span>
                          )}
                        </div>
                        {f.description && <p className="text-xs text-muted-foreground">{f.description}</p>}
                        {f.myStatus && <StatusBadge status={f.myStatus} />}
                      </div>

                      <div className="flex-shrink-0">
                        {f.myStatus === null && !isPast ? (
                          <Button size="sm" onClick={() => handleApply(f._id)}>
                            참석 신청
                          </Button>
                        ) : f.myStatus === "pending" ? (
                          <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={() => handleCancel(f._id)}>
                            신청 취소
                          </Button>
                        ) : f.myStatus === "approved" ? (
                          <CheckCircle2 className="w-5 h-5 text-chart-4" />
                        ) : f.myStatus === "rejected" ? (
                          <XCircle className="w-5 h-5 text-destructive" />
                        ) : null}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
