import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  Award,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  ChevronRight,
  UserCheck,
  CheckCircle,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Textarea } from "@/components/ui/textarea.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";

export default function MentorsPage() {
  const mentors = useQuery(api.users.listMentorCoaches);
  const requestMentoring = useMutation(api.users.requestMentoring);
  const cancelMentoring = useMutation(api.users.cancelMentoring);
  const { user: currentUser } = useCurrentUser();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<any | null>(null);
  const [applyMessage, setApplyMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canceling, setCanceling] = useState(false);

  const isLoading = mentors === undefined;

  const filteredMentors = mentors?.filter((m) => {
    const nameMatch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const specMatch = m.specializations.some((s) =>
      s.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const styleMatch = (m.coachingStyle ?? "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return nameMatch || specMatch || styleMatch;
  });

  const handleApplyClick = (mentor: any) => {
    setSelectedMentor(mentor);
    setApplyMessage(
      `안녕하세요, ${mentor.name} 멘토코치님! 이번 학기 멘토코칭을 신청하고자 연락드립니다. 잘 부탁드립니다.`
    );
  };

  const handleConfirmApply = async () => {
    if (!selectedMentor) return;
    if (!applyMessage.trim()) {
      toast.error("신청 메시지를 입력해 주세요.");
      return;
    }

    setSubmitting(true);
    try {
      await requestMentoring({
        mentorId: selectedMentor._id,
        message: applyMessage.trim(),
      });
      toast.success(`${selectedMentor.name} 멘토코치님께 매칭 신청을 전송했습니다!`);
      setSelectedMentor(null);
    } catch (error: any) {
      console.error(error);
      const errMsg = error instanceof Error ? error.message : String(error);
      toast.error(errMsg.includes("이미 신청") || errMsg.includes("마감") ? errMsg : "신청 전송에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelClick = async () => {
    if (!window.confirm("멘토코칭 매칭 신청을 취소하시겠습니까?")) return;
    setCanceling(true);
    try {
      await cancelMentoring();
      toast.success("신청이 취소되었습니다.");
    } catch (error) {
      console.error(error);
      toast.error("신청 취소에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-6">
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-600" />
            멘토코치 매칭 및 신청
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            국제멘탈코칭센터가 공인한 전문 멘토코치님을 열람하고 멘토코칭 매칭을 신청합니다.
          </p>
        </div>
      </motion.div>

      {/* Search area */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          className="pl-9 bg-background/50 border-purple-100 focus-visible:ring-purple-500 h-10"
          placeholder="멘토코치 이름, 전문 분야, 또는 코칭 스타일로 검색하세요"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Mentor Directory grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="overflow-hidden border-purple-100/30">
              <CardContent className="p-6 flex gap-4">
                <Skeleton className="w-16 h-16 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredMentors && filteredMentors.length === 0 ? (
        <Empty className="border-purple-100/20 bg-purple-500/5">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Search className="text-purple-400" /></EmptyMedia>
            <EmptyTitle className="text-purple-900 dark:text-purple-300">검색 조건에 맞는 멘토코치가 없습니다</EmptyTitle>
            <EmptyDescription>다른 검색어로 검색해 보시거나 관리자에게 문의해 주세요.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredMentors?.map((mentor) => {
              const isAppliedToThisMentor = currentUser?.assignedCoachId === mentor._id;
              const isAppliedToOtherMentor = currentUser?.assignedCoachId && currentUser?.assignedCoachId !== mentor._id;
              const isMentorFull = mentor.assignedTraineesCount >= 2;

              return (
                <motion.div
                  key={mentor._id}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <Card className="overflow-hidden border-purple-100 hover:border-purple-300 shadow-sm hover:shadow-md transition-all h-full flex flex-col justify-between group">
                    <CardContent className="p-5 flex flex-col justify-between h-full space-y-4">
                      <div className="flex gap-4 items-start">
                        {/* Avatar */}
                        <div className="w-16 h-16 rounded-full bg-purple-100 border border-purple-200 flex-shrink-0 overflow-hidden flex items-center justify-center text-purple-700 font-bold text-lg animate-pulse-once">
                          {mentor.avatarUrl ? (
                            <img
                              src={mentor.avatarUrl}
                              alt={mentor.name}
                              className="w-full h-full object-cover animate-fade-in"
                            />
                          ) : (
                            mentor.name.slice(0, 2)
                          )}
                        </div>

                        {/* Header info */}
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h3 className="font-semibold text-base text-foreground truncate">
                              {mentor.name}
                            </h3>
                            {mentor.cohortName && (
                              <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50/50 text-[10px] h-4.5 px-1.5 flex-shrink-0">
                                {mentor.cohortName}
                              </Badge>
                            )}
                            {mentor.hasMentalCoachLicense && (
                              <Badge className="bg-purple-600 hover:bg-purple-700 text-white text-[10px] h-4.5 px-1.5 gap-0.5 select-none flex-shrink-0">
                                <Award className="w-3 h-3" />
                                자격 취득
                              </Badge>
                            )}
                          </div>

                          {/* Matching Availability Stats */}
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            {isMentorFull ? (
                              <Badge className="bg-red-100 hover:bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-none text-[10px] h-4.5 px-1.5 flex-shrink-0 font-semibold">
                                신청불가능 (마감)
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 hover:bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-none text-[10px] h-4.5 px-1.5 flex-shrink-0 font-semibold">
                                신청가능
                              </Badge>
                            )}
                            <span className="text-[11px] text-muted-foreground font-medium">
                              신청 인원: <strong>{mentor.assignedTraineesCount} / 2명</strong>
                            </span>
                          </div>

                          {/* Contact details */}
                          <div className="space-y-0.5 text-xs text-muted-foreground pt-1.5">
                            {mentor.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                <span className="truncate">{mentor.email}</span>
                              </div>
                            )}
                            {mentor.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                <span>{mentor.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Bio */}
                      {mentor.bio && (
                        <p className="text-xs text-muted-foreground/80 leading-relaxed bg-muted/30 p-2.5 rounded-lg border border-muted-foreground/5 max-h-[90px] overflow-y-auto">
                          {mentor.bio}
                        </p>
                      )}

                      {/* Coaching style */}
                      {mentor.coachingStyle && (
                        <div className="space-y-1">
                          <h4 className="text-[10px] font-semibold text-purple-600 uppercase tracking-wider">
                            코칭 스타일
                          </h4>
                          <p className="text-xs text-foreground/90 font-medium truncate">
                            {mentor.coachingStyle}
                          </p>
                        </div>
                      )}

                      {/* Specializations tags */}
                      {mentor.specializations.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {mentor.specializations.map((spec: string) => (
                            <Badge
                              key={spec}
                              variant="secondary"
                              className="bg-purple-100/50 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 border-none text-[10px] px-1.5 py-0.5"
                            >
                              {spec}
                            </Badge>
                          ))}
                        </div>
                      )}

                      {/* Apply / Cancel matching Button */}
                      <div className="pt-2 border-t border-purple-50">
                        {isAppliedToThisMentor ? (
                          <Button
                            onClick={handleCancelClick}
                            disabled={canceling}
                            variant="destructive"
                            className="w-full text-xs h-9 gap-1.5 cursor-pointer bg-red-600 hover:bg-red-700 text-white"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            {canceling ? "취소 처리 중..." : "신청 취소하기 (배정 완료)"}
                          </Button>
                        ) : isAppliedToOtherMentor ? (
                          <Button
                            disabled
                            className="w-full bg-muted text-muted-foreground text-xs h-9 gap-1.5 cursor-not-allowed border border-border"
                          >
                            다른 멘토 신청됨
                          </Button>
                        ) : isMentorFull ? (
                          <Button
                            disabled
                            className="w-full bg-red-100 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs h-9 gap-1.5 cursor-not-allowed border border-red-200 dark:border-red-900/50 font-semibold"
                          >
                            신청 마감
                          </Button>
                        ) : (
                          <Button
                            onClick={() => handleApplyClick(mentor)}
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            멘토코칭 신청하기
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Application Dialog */}
      <Dialog open={selectedMentor !== null} onOpenChange={(open) => !open && setSelectedMentor(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-purple-950 dark:text-purple-300">
              <Sparkles className="w-5 h-5 text-purple-600" />
              멘토코칭 신청
            </DialogTitle>
            <DialogDescription>
              {selectedMentor?.name} 멘토코치님께 매칭 신청 메시지를 작성해 전달합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-100 dark:border-purple-900/40 text-xs text-purple-800 dark:text-purple-300 space-y-1">
              <p className="font-semibold">💡 매칭 신청 안내</p>
              <p className="leading-relaxed">
                신청이 접수되면 멘토코치님께 실시간 알림이 발송되며, 기입하신 이메일/연락처로 개별 회신을 받으실 수 있습니다.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">신청 메시지</label>
              <Textarea
                rows={5}
                placeholder="코칭 일정 조율 및 희망하는 전문 코칭 영역에 대해 작성해 보세요."
                value={applyMessage}
                onChange={(e) => setApplyMessage(e.target.value)}
                className="text-sm border-purple-100 focus-visible:ring-purple-500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setSelectedMentor(null)}
              className="cursor-pointer text-xs h-9"
            >
              취소
            </Button>
            <Button
              onClick={handleConfirmApply}
              disabled={submitting || !applyMessage.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs h-9 gap-1.5 cursor-pointer"
            >
              {submitting ? "신청 중..." : "신청 전송"}
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
