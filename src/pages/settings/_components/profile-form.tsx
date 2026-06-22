import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { toast } from "sonner";
import { Pencil, Save, X, Users, CheckCircle2, CalendarDays, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { ConvexError } from "convex/values";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type User = Doc<"users">;

const STATUS_LABEL: Record<string, string> = {
  active: "진행중",
  upcoming: "예정",
  completed: "완료",
};
const STATUS_COLOR: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  upcoming: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  completed: "bg-muted text-muted-foreground",
};

export default function ProfileForm({ user }: { user: User }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user.name ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const updateProfile = useMutation(api.users.updateDetailedProfile);

  const isTrainee = user.role === "trainee";
  const myMembership = useQuery(api.cohorts.getMyMembership, isTrainee ? {} : "skip");
  const cohorts = useQuery(api.cohorts.list, isTrainee && myMembership === null ? {} : "skip");
  const requestJoin = useMutation(api.cohorts.requestJoinCohort);
  const [selectedCohort, setSelectedCohort] = useState<Id<"cohorts"> | null>(null);
  const [cohortLoading, setCohortLoading] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("이름을 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ name: trimmed, phone: phone.trim() || undefined });
      toast.success("프로필이 저장되었습니다.");
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
      setEditing(false);
    } catch {
      toast.error("저장에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name ?? "");
    setPhone(user.phone ?? "");
    setEditing(false);
  };

  const handleJoinCohort = async () => {
    if (!selectedCohort) return;
    setCohortLoading(true);
    try {
      await requestJoin({ cohortId: selectedCohort });
      toast.success("기수 등록이 완료되었습니다!");
      setSelectedCohort(null);
    } catch (err) {
      if (err instanceof ConvexError) {
        const data = err.data as { message: string };
        toast.error(data.message);
      } else {
        toast.error("등록에 실패했습니다. 다시 시도해 주세요.");
      }
    } finally {
      setCohortLoading(false);
    }
  };

  const initials = (user.name ?? "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sortedCohorts = [...(cohorts ?? [])].sort((a, b) => {
    const order = { active: 0, upcoming: 1, completed: 2 };
    return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">프로필 정보</CardTitle>
        <CardDescription>이름과 계정 정보를 확인하고 수정할 수 있습니다.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-primary-foreground">{initials}</span>
          </div>
          <div>
            <p className="font-semibold text-base">{user.name ?? "이름 미설정"}</p>
            <p className="text-sm text-muted-foreground">{user.email ?? "이메일 없음"}</p>
          </div>
        </div>

        {/* Name field */}
        <div className="space-y-1.5">
          <Label htmlFor="display-name">표시 이름</Label>
          {editing ? (
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="이름을 입력하세요"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSave();
                if (e.key === "Escape") handleCancel();
              }}
            />
          ) : (
            <div className="flex items-center gap-2">
              <Input
                id="display-name"
                value={user.name ?? ""}
                readOnly
                className="flex-1 bg-muted/50 cursor-default"
              />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setEditing(true)}
                className="gap-1.5 text-muted-foreground"
              >
                <Pencil className="w-3.5 h-3.5" />
                수정
              </Button>
            </div>
          )}
        </div>

        {/* Phone field */}
        <div className="space-y-1.5">
          <Label htmlFor="phone">전화번호</Label>
          {editing ? (
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="예: 010-1234-5678"
            />
          ) : (
            <Input
              id="phone"
              value={user.phone ?? ""}
              readOnly
              className="bg-muted/50 cursor-default"
              placeholder="미입력"
            />
          )}
        </div>

        {/* Save/Cancel buttons */}
        {editing && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={handleSave} disabled={loading} className="gap-1.5">
              {saveSuccess ? (
                <><CheckCircle className="w-3.5 h-3.5" />저장됨</>
              ) : (
                <><Save className="w-3.5 h-3.5" />저장</>
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} disabled={loading}>
              <X className="w-3.5 h-3.5" />
              취소
            </Button>
          </div>
        )}

        {/* Email (read-only) */}
        <div className="space-y-1.5">
          <Label htmlFor="email">이메일</Label>
          <Input
            id="email"
            value={user.email ?? ""}
            readOnly
            className="bg-muted/50 cursor-default"
          />
          <p className="text-xs text-muted-foreground">이메일은 로그인 제공자에서 관리됩니다.</p>
        </div>

        {/* 기수 — 교육생이고 아직 기수 미등록인 경우에만 표시 */}
        {isTrainee && myMembership === null && (
          <div className="pt-2 border-t space-y-3">
            <Label className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Users className="w-3.5 h-3.5" />
              소속 기수 미등록
            </Label>
            <p className="text-xs text-muted-foreground">
              온보딩 시 기수를 선택하지 않으셨습니다. 아래에서 소속 기수를 선택해 주세요.
            </p>
            <div className="space-y-2">
              {sortedCohorts.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-3">
                  등록 가능한 기수가 없습니다. 관리자에게 문의해 주세요.
                </p>
              ) : (
                sortedCohorts.map((cohort) => {
                  const isSelected = selectedCohort === cohort._id;
                  return (
                    <button
                      key={cohort._id}
                      onClick={() => setSelectedCohort(cohort._id)}
                      className={cn(
                        "w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 bg-card hover:bg-muted/30"
                      )}
                    >
                      <div className="flex items-center gap-2.5">
                        {isSelected
                          ? <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                          : <div className="w-4 h-4 rounded-full border-2 border-border flex-shrink-0" />
                        }
                        <div>
                          <p className="font-semibold text-sm">{cohort.name}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            {cohort.startDate} ~ {cohort.endDate}
                          </p>
                        </div>
                      </div>
                      <Badge className={cn("text-xs ml-2 shrink-0", STATUS_COLOR[cohort.status])}>
                        {STATUS_LABEL[cohort.status]}
                      </Badge>
                    </button>
                  );
                })
              )}
            </div>
            {sortedCohorts.length > 0 && (
              <Button
                size="sm"
                className="w-full"
                onClick={handleJoinCohort}
                disabled={!selectedCohort || cohortLoading}
              >
                {cohortLoading ? "등록 중..." : "기수 등록"}
              </Button>
            )}
          </div>
        )}

        {/* 기수 등록 완료 시 표시 */}
        {isTrainee && myMembership && (
          <div className="pt-2 border-t">
            <Label className="flex items-center gap-1.5 mb-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              소속 기수
            </Label>
            <div className="flex items-center justify-between p-3 rounded-xl border-2 border-primary bg-primary/5">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <div>
                  <p className="font-semibold text-sm">{myMembership.cohort?.name ?? "기수 정보 없음"}</p>
                  {myMembership.cohort && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <CalendarDays className="w-3 h-3" />
                      {myMembership.cohort.startDate} ~ {myMembership.cohort.endDate}
                    </p>
                  )}
                </div>
              </div>
              <Badge className={cn("text-xs", STATUS_COLOR[myMembership.membership.status])}>
                {STATUS_LABEL[myMembership.membership.status]}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              기수 변경이 필요하면 관리자에게 문의해 주세요.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
