import { Bell, BellOff, BellRing, Loader2, ExternalLink, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Switch } from "@/components/ui/switch.tsx";
import { Label } from "@/components/ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select.tsx";
import { Separator } from "@/components/ui/separator.tsx";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { usePushNotifications } from "@/hooks/use-push-notifications.ts";
import { api } from "@/convex/_generated/api.js";
import { useState } from "react";
import { toast } from "sonner";
import { Authenticated } from "@/components/providers/convex.tsx";

// KST hour options
const KST_HOUR_OPTIONS = [
  { label: "오전 6시", kstHour: 6 },
  { label: "오전 7시", kstHour: 7 },
  { label: "오전 8시", kstHour: 8 },
  { label: "오전 9시 (기본)", kstHour: 9 },
  { label: "오전 10시", kstHour: 10 },
  { label: "오전 11시", kstHour: 11 },
  { label: "오후 12시", kstHour: 12 },
  { label: "오후 1시", kstHour: 13 },
  { label: "오후 2시", kstHour: 14 },
  { label: "오후 3시", kstHour: 15 },
  { label: "오후 6시", kstHour: 18 },
  { label: "오후 8시", kstHour: 20 },
  { label: "오후 9시", kstHour: 21 },
  { label: "오후 10시", kstHour: 22 },
];

function kstToUtc(kstHour: number): number {
  return ((kstHour - 9) + 24) % 24;
}

function utcToKst(utcHour: number): number {
  return (utcHour + 9) % 24;
}

type ReminderField = {
  label: string;
  description: string;
  enabledKey: "checkInReminderEnabled" | "reflectionReminderEnabled" | "coachingLogReminderEnabled";
  showTimePicker?: boolean;
};

const REMINDER_FIELDS: ReminderField[] = [
  {
    label: "매일 체크인 리마인더",
    description: "오늘 체크인을 완료하지 않으면 알림을 보냅니다.",
    enabledKey: "checkInReminderEnabled",
    showTimePicker: true,
  },
  {
    label: "주간 성찰 일지 리마인더",
    description: "이번 주 성찰 일지를 작성하지 않으면 일요일 오전 9시에 알림을 보냅니다.",
    enabledKey: "reflectionReminderEnabled",
  },
  {
    label: "코칭 로그 제출 리마인더",
    description: "임시 저장된 코칭 로그가 있으면 월요일 오전 9시에 알림을 보냅니다.",
    enabledKey: "coachingLogReminderEnabled",
  },
];

function ReminderSettings() {
  const currentUser = useQuery(api.users.getCurrentUser, {});
  const updateReminderSettings = useMutation(api.users.updateReminderSettings);
  const [saving, setSaving] = useState(false);

  const reminderKstHour = currentUser?.checkInReminderHourUTC !== undefined
    ? utcToKst(currentUser.checkInReminderHourUTC)
    : 9;

  const getEnabled = (key: ReminderField["enabledKey"]) =>
    currentUser?.[key] !== false;

  const save = async (updates: {
    checkInReminderEnabled?: boolean;
    checkInReminderHourUTC?: number;
    reflectionReminderEnabled?: boolean;
    coachingLogReminderEnabled?: boolean;
  }) => {
    setSaving(true);
    try {
      await updateReminderSettings({
        checkInReminderEnabled: updates.checkInReminderEnabled ?? getEnabled("checkInReminderEnabled"),
        checkInReminderHourUTC: updates.checkInReminderHourUTC ?? kstToUtc(reminderKstHour),
        reflectionReminderEnabled: updates.reflectionReminderEnabled ?? getEnabled("reflectionReminderEnabled"),
        coachingLogReminderEnabled: updates.coachingLogReminderEnabled ?? getEnabled("coachingLogReminderEnabled"),
      });
      toast.success("알림 설정이 저장되었습니다.");
    } catch {
      toast.error("설정 저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pt-3 border-t space-y-4">
      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">알림 종류 설정</p>
      {REMINDER_FIELDS.map((field, i) => (
        <div key={field.enabledKey}>
          {i > 0 && <Separator className="mb-4" />}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Label
                htmlFor={`reminder-${field.enabledKey}`}
                className="cursor-pointer text-sm font-medium"
              >
                {field.label}
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                {field.description}
              </p>
              {field.showTimePicker && getEnabled(field.enabledKey) && (
                <div className="flex items-center gap-2 mt-2">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground">알림 시간 (KST)</span>
                  <Select
                    value={String(reminderKstHour)}
                    onValueChange={(v) => void save({ checkInReminderHourUTC: kstToUtc(parseInt(v, 10)) })}
                    disabled={saving}
                  >
                    <SelectTrigger className="h-7 text-xs w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {KST_HOUR_OPTIONS.map((opt) => (
                        <SelectItem key={opt.kstHour} value={String(opt.kstHour)} className="text-xs">
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <Switch
              id={`reminder-${field.enabledKey}`}
              checked={getEnabled(field.enabledKey)}
              onCheckedChange={(enabled) => void save({ [field.enabledKey]: enabled })}
              disabled={saving || currentUser === undefined}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function NotificationSettingsCard() {
  const { isAuthenticated } = useConvexAuth();
  const { status, subscribe, unsubscribe } = usePushNotifications(isAuthenticated);

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          푸시 알림 설정
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status === "iframe" && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>
              앱 빌더 미리보기에서는 푸시 알림을 테스트할 수 없습니다.
              앱을 게시한 후 테스트해 주세요.
            </p>
          </div>
        )}

        {status === "unsupported" && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p>이 브라우저는 푸시 알림을 지원하지 않습니다.</p>
          </div>
        )}

        {status === "denied" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 text-sm text-destructive">
              <BellOff className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">알림이 차단되어 있습니다</p>
                <p className="text-destructive/80 mt-0.5">
                  브라우저 설정에서 알림을 허용한 후 페이지를 새로고침하세요.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => window.location.reload()}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              새로고침
            </Button>
          </div>
        )}

        {status === "loading" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground p-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            처리 중...
          </div>
        )}

        {status === "subscribed" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/20 text-sm text-green-700 dark:text-green-400">
              <BellRing className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-medium">푸시 알림이 활성화되어 있습니다</p>
                <p className="text-green-600/80 dark:text-green-500/80 mt-0.5">
                  아래에서 받고 싶은 알림 종류를 선택하세요.
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              size="sm"
              className="gap-2"
              onClick={() => void unsubscribe()}
            >
              <BellOff className="w-3.5 h-3.5" />
              알림 끄기
            </Button>
            <Authenticated>
              <ReminderSettings />
            </Authenticated>
          </div>
        )}

        {status === "unsubscribed" && (
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <Bell className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                <p>알림을 켜면 다음 내용을 받을 수 있습니다</p>
                <ul className="mt-1.5 space-y-0.5 text-xs list-disc list-inside">
                  <li>매일 체크인 리마인더</li>
                  <li>주간 성찰 일지 미작성 리마인더</li>
                  <li>임시 저장 코칭 로그 제출 독려</li>
                  <li>코칭 기록 승인/반려 알림</li>
                  <li>중요 공지사항</li>
                </ul>
              </div>
            </div>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => void subscribe()}
            >
              <Bell className="w-3.5 h-3.5" />
              알림 켜기
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
