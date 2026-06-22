import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Bell, UserCircle, AlertCircle, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Card, CardContent } from "@/components/ui/card.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

type IncompleteUser = {
  _id: string;
  name: string | null;
  email: string | null;
  missingFields: string[];
};

export default function IncompleteProfilesTab({
  onViewDetail,
}: {
  onViewDetail: (userId: Id<"users">) => void;
}) {
  const users = useQuery(api.admin.getIncompleteProfileUsers);
  const sendNotification = useMutation(api.admin.sendProfileIncompleteNotification);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isSending, setIsSending] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (!users) return;
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u) => u._id)));
    }
  };

  const handleSend = async (userIds: string[]) => {
    if (userIds.length === 0) return;
    setIsSending(true);
    try {
      const result = await sendNotification({
        userIds: userIds as Id<"users">[],
      });
      if (result.sent === 0) {
        toast.info("24시간 이내 이미 알림이 발송된 교육생입니다.");
      } else {
        toast.success(`${result.sent}명에게 프로필 완성 알림을 보냈습니다.`);
      }
      setSelected(new Set());
    } catch {
      toast.error("알림 발송에 실패했습니다.");
    } finally {
      setIsSending(false);
    }
  };

  if (users === undefined) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <CheckCheck />
          </EmptyMedia>
          <EmptyTitle>모든 교육생이 프로필을 완성했습니다</EmptyTitle>
          <EmptyDescription>전화번호와 프로필 사진이 모두 등록되어 있습니다.</EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  const allSelected = selected.size === users.length;

  return (
    <div className="space-y-4">
      {/* 헤더 액션 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="w-3 h-3" />
            미완성 {users.length}명
          </Badge>
          <button
            onClick={toggleAll}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer"
          >
            {allSelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="flex gap-2">
          {selected.size > 0 && (
            <Button
              size="sm"
              variant="secondary"
              disabled={isSending}
              onClick={() => handleSend([...selected])}
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              {isSending ? "발송 중..." : `선택 ${selected.size}명에게 알림`}
            </Button>
          )}
          <Button
            size="sm"
            disabled={isSending}
            onClick={() => handleSend(users.map((u) => u._id))}
          >
            <Bell className="w-3.5 h-3.5 mr-1.5" />
            {isSending ? "발송 중..." : "전체에게 알림"}
          </Button>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="space-y-2">
        {users.map((u: IncompleteUser) => {
          const isSelected = selected.has(u._id);
          return (
            <Card
              key={u._id}
              className={cn(
                "cursor-pointer transition-colors",
                isSelected
                  ? "border-primary/50 bg-primary/5"
                  : "hover:border-primary/30",
              )}
              onClick={() => toggleSelect(u._id)}
            >
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center gap-3">
                  {/* 체크박스 역할 */}
                  <div
                    className={cn(
                      "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/30",
                    )}
                  >
                    {isSelected && (
                      <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 12 12">
                        <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>

                  {/* 아바타 */}
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <UserCircle className="w-5 h-5 text-muted-foreground" />
                  </div>

                  {/* 이름/이메일 */}
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-medium text-sm hover:text-primary transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewDetail(u._id as Id<"users">);
                      }}
                    >
                      {u.name ?? "이름 미설정"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? "-"}</p>
                  </div>

                  {/* 미완성 항목 배지 */}
                  <div className="flex gap-1.5 flex-wrap justify-end">
                    {u.missingFields.map((f) => (
                      <Badge
                        key={f}
                        variant="secondary"
                        className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                      >
                        {f} 없음
                      </Badge>
                    ))}
                  </div>

                  {/* 개별 알림 버튼 */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 flex-shrink-0"
                    disabled={isSending}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSend([u._id]);
                    }}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
