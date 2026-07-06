import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { ConvexError } from "convex/values";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent } from "@/components/ui/card.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Button } from "@/components/ui/button.tsx";
import CoachingLogCommentsDrawer from "./coaching-log-comments-drawer.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog.tsx";
import {
  Pencil,
  Trash2,
  Paperclip,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  Clock,
  MessageSquare,
} from "lucide-react";
import CoachingLogForm from "./coaching-log-form.tsx";

export const COACHING_TYPE_MAP: Record<string, string> = {
  individual: "개인",
  group: "그룹",
  team: "팀",
  buddy: "버디",
  mentor: "멘토",
  sv: "SV",
};

type CoachingLog = Doc<"coachingLogs"> & { evidenceUrl?: string | null };

const statusConfig = {
  draft: { label: "임시저장", variant: "outline" as const },
  pending: { label: "검토중", variant: "secondary" as const },
  approved: { label: "승인됨", variant: "default" as const },
  rejected: { label: "반려됨", variant: "destructive" as const },
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

export default function CoachingLogCard({ log }: { log: CoachingLog }) {
  const [expanded, setExpanded] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const removeLog = useMutation(api.coaching.remove);

  const comments = useQuery(api.comments.list, { coachingLogId: log._id });
  const commentsCount = comments?.length ?? 0;

  const status = statusConfig[log.approvalStatus];
  const canEdit = log.approvalStatus !== "approved";
  const isDraft = log.approvalStatus === "draft";
  const date = new Date(log.coachingDate);

  const handleDelete = async () => {
    try {
      await removeLog({ logId: log._id });
      toast.success("코칭 기록이 삭제되었습니다");
    } catch (err) {
      if (err instanceof ConvexError) {
        const { message } = err.data as { message: string };
        toast.error(message);
      } else {
        toast.error("삭제 중 오류가 발생했습니다");
      }
    }
  };

  return (
    <>
      <Card className="shadow-sm hover:shadow-md transition-shadow">
        <CardContent className="pt-4 pb-3">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mt-0.5">
                {log.coachingType === "individual" ? (
                  <User className="w-4 h-4 text-primary" />
                ) : (
                  <Users className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{log.topic}</p>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                  <span>{format(date, "yyyy.MM.dd (EEE)", { locale: ko })}</span>
                  <span>·</span>
                  <span>{COACHING_TYPE_MAP[log.coachingType] ?? log.coachingType} 코칭</span>
                  <span>·</span>
                  <span className="flex items-center gap-0.5">
                    <Clock className="w-3 h-3" />
                    {formatDuration(log.durationMinutes)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge
                variant={status.variant}
                className={`text-xs ${isDraft ? "border-amber-400 text-amber-600 dark:text-amber-400" : ""}`}
              >
                {status.label}
              </Badge>
              {isDraft && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700"
                  onClick={() => setEditOpen(true)}
                >
                  이어 작성
                </Button>
              )}
              {canEdit && !isDraft && (
                <>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-7 h-7"
                    onClick={() => setEditOpen(true)}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </>
              )}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-destructive hover:text-destructive"
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>

          {/* Coachee info */}
          <p className="text-xs text-muted-foreground mb-2">
            <span className="font-medium text-foreground/70">코치이:</span> {log.coacheeInfo}
          </p>

          {/* Rejection reason */}
          {log.approvalStatus === "rejected" && log.rejectionReason && (
            <div className="mt-2 px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">
              <span className="font-medium">반려 사유:</span> {log.rejectionReason}
            </div>
          )}

          {/* Expand toggle and comments button row */}
          <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2.5">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3.5 h-3.5" />
                  내용 접기
                </>
              ) : (
                <>
                  <ChevronDown className="w-3.5 h-3.5" />
                  내용 보기
                </>
              )}
            </button>

            <button
              onClick={() => setCommentsOpen(true)}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>댓글 피드백</span>
              {commentsCount > 0 && (
                <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
                  {commentsCount}
                </span>
              )}
            </button>
          </div>

          {/* Expanded details */}
          {expanded && (
            <div className="mt-3 space-y-3 border-t border-border pt-3">
              {/* 기본정보 추가 */}
              {(log.coachingPlace || log.sessionNumber || log.coacheeGender || log.coacheeAge || log.coacheePersonality || (log.coacheeType && log.coacheeType.length > 0) || log.coacheeField) && (
                <div className="bg-muted/40 rounded-md px-3 py-2 space-y-1 text-xs text-muted-foreground">
                  {log.sessionNumber && <span className="mr-3">회차: {log.sessionNumber}회차</span>}
                  {log.coachingPlace && <span className="mr-3">장소: {{ zoom: "Zoom", study_room: "공부방", center: "센터", home: "가정집", hanyang: "한양대 올림픽체육관", other: log.coachingPlaceOther ?? "기타" }[log.coachingPlace]}</span>}
                  {(log.coacheeGender || log.coacheeAge) && (
                    <span className="mr-3">코치이: {log.coacheeGender === "male" ? "남" : log.coacheeGender === "female" ? "여" : ""}{log.coacheeAge ? ` ${log.coacheeAge}세` : ""}</span>
                  )}
                  {log.coacheeType && log.coacheeType.length > 0 && <span className="mr-3">유형: {log.coacheeType.join(", ")}</span>}
                  {log.coacheeField && <span className="mr-3">종목/직군: {log.coacheeField}</span>}
                  {log.coacheePersonality && <span>성격: {log.coacheePersonality}</span>}
                </div>
              )}

              {/* 핵심 문제 */}
              {log.coreIssues && log.coreIssues.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">핵심 문제</p>
                  <div className="flex flex-wrap gap-1">
                    {log.coreIssues.map((issue) => (
                      <span key={issue} className="px-2 py-0.5 rounded-full bg-secondary text-xs">{issue}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* 코칭 전/후 상태 */}
              {(log.preCoachingState || log.postCoachingState) && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">상태 진단 (코칭 전 → 후)</p>
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    {(["motivation", "confidence", "focus", "calmness", "actionWill"] as const).map((key) => {
                      const labels = { motivation: "의욕", confidence: "자신감", focus: "집중력", calmness: "평온함", actionWill: "실행의지" };
                      const pre = log.preCoachingState?.[key];
                      const post = log.postCoachingState?.[key];
                      return (
                        <div key={key} className="bg-muted/40 rounded px-1 py-1.5">
                          <p className="text-muted-foreground mb-1" style={{ fontSize: "10px" }}>{labels[key]}</p>
                          <p className="font-semibold text-foreground">{pre ?? "-"} → {post ?? "-"}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 사용 기법 */}
              {((log.techniquesUsed && log.techniquesUsed.length > 0) || log.techniqueOther) && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">사용 기법</p>
                  <div className="flex flex-wrap gap-1">
                    {log.techniquesUsed?.map((t) => (
                      <span key={t} className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{t}</span>
                    ))}
                    {log.techniqueOther && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">{log.techniqueOther}</span>}
                  </div>
                </div>
              )}

              {/* 목표 */}
              <div>
                <p className="text-xs font-medium text-foreground/70 mb-1">코칭 목표</p>
                <p className="text-sm text-foreground">{log.goals}</p>
              </div>

              {/* 실행계획 */}
              {log.actionPlan && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">고객의 실행계획</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.actionPlan}</p>
                </div>
              )}
              {log.nextSessionPractice && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">다음 회차까지 실천사항</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.nextSessionPractice}</p>
                </div>
              )}

              {/* 핵심 발견 */}
              {log.clientInsight && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">고객의 핵심 통찰</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.clientInsight}</p>
                </div>
              )}
              {log.coachPattern && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">코치가 발견한 핵심 패턴</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.coachPattern}</p>
                </div>
              )}

              {/* 코칭 내용 요약 */}
              <div>
                <p className="text-xs font-medium text-foreground/70 mb-1">코칭 내용 요약</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">{log.summary}</p>
              </div>

              {/* 코치 성장 */}
              {log.bestOfSession && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">가장 잘한 점</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.bestOfSession}</p>
                </div>
              )}
              {log.improvementForNext && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">다음 개선할 점</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.improvementForNext}</p>
                </div>
              )}
              {log.changeKeywords && log.changeKeywords.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">변화 키워드</p>
                  <div className="flex flex-wrap gap-1">
                    {log.changeKeywords.map((k) => (
                      <span key={k} className="px-2 py-0.5 rounded-full bg-chart-2/10 text-chart-2 text-xs">{k}</span>
                    ))}
                  </div>
                </div>
              )}
              {log.clientQuote && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">고객의 대표 한마디</p>
                  <p className="text-sm text-foreground italic">"{log.clientQuote}"</p>
                </div>
              )}
              {log.mcciDomain && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">MCCI 4대 영역</p>
                  <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs">
                    {{ motivation: "의욕", skill: "실력", performance: "실전력", relationship: "관계" }[log.mcciDomain]}
                  </span>
                </div>
              )}
              {log.reflection && (
                <div>
                  <p className="text-xs font-medium text-foreground/70 mb-1">성찰 및 느낀점</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{log.reflection}</p>
                </div>
              )}
              {log.evidenceUrl && (
                <a
                  href={log.evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                  증빙 자료 보기
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CoachingLogForm
        open={editOpen}
        onOpenChange={setEditOpen}
        editLog={log}
      />

      <CoachingLogCommentsDrawer
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        coachingLogId={log._id}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>코칭 기록을 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제된 기록은 복구할 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
