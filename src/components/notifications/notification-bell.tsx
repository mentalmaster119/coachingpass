import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "@/convex/_generated/api.js";
import {
  Bell, CheckCheck, BookOpen, ClipboardList, UserCheck,
  MessageSquare, Award, MessageSquareDot, AlertCircle, Megaphone, Users,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover.tsx";
import { ScrollArea } from "@/components/ui/scroll-area.tsx";
import { cn } from "@/lib/utils.ts";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";

type Notification = Doc<"notifications">;

const NOTIFICATION_ICONS: Record<Notification["type"], React.ReactNode> = {
  education_approved: <BookOpen className="w-4 h-4 text-green-500" />,
  education_rejected: <BookOpen className="w-4 h-4 text-red-500" />,
  coaching_approved: <ClipboardList className="w-4 h-4 text-green-500" />,
  coaching_rejected: <ClipboardList className="w-4 h-4 text-red-500" />,
  mentor_coaching_approved: <MessageSquare className="w-4 h-4 text-green-500" />,
  mentor_coaching_rejected: <MessageSquare className="w-4 h-4 text-red-500" />,
  account_approved: <UserCheck className="w-4 h-4 text-green-500" />,
  account_rejected: <UserCheck className="w-4 h-4 text-red-500" />,
  certification_approved: <Award className="w-4 h-4 text-green-500" />,
  certification_rejected: <Award className="w-4 h-4 text-red-500" />,
  feedback_received: <MessageSquareDot className="w-4 h-4 text-blue-500" />,
  profile_incomplete: <AlertCircle className="w-4 h-4 text-amber-500" />,
  announcement: <Megaphone className="w-4 h-4 text-primary" />,
  bcp_approved: <Users className="w-4 h-4 text-green-500" />,
  bcp_rejected: <Users className="w-4 h-4 text-red-500" />,
  coaching_log_submitted: <ClipboardList className="w-4 h-4 text-blue-500" />,
  reflection_submitted: <BookOpen className="w-4 h-4 text-blue-500" />,
  trainee_progress_alert: <AlertCircle className="w-4 h-4 text-amber-500" />,
};

// Map notification type to the page route it should navigate to
function getNotificationRoute(notification: Notification): string | null {
  switch (notification.type) {
    case "coaching_approved":
    case "coaching_rejected":
      return "/coaching-log";
    case "education_approved":
    case "education_rejected":
      return "/education";
    case "mentor_coaching_approved":
    case "mentor_coaching_rejected":
      return "/mentor-coaching";
    case "certification_approved":
    case "certification_rejected":
      return "/certification";
    case "feedback_received":
      return "/coaching-log";
    case "profile_incomplete":
      return "/profile";
    case "account_approved":
    case "account_rejected":
      return "/";
    case "announcement":
      return notification.relatedId
        ? `/announcements/${notification.relatedId}`
        : "/announcements";
    case "bcp_approved":
    case "bcp_rejected":
      return "/bcp";
    default:
      return null;
  }
}

function NotificationItem({
  notification,
  onRead,
  onNavigate,
}: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (route: string) => void;
}) {
  const icon = NOTIFICATION_ICONS[notification.type];
  const timeAgo = formatDistanceToNow(new Date(notification._creationTime), {
    addSuffix: true,
    locale: ko,
  });
  const route = getNotificationRoute(notification);

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
    if (route) onNavigate(route);
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
        !notification.isRead && "bg-primary/5",
        route && "cursor-pointer",
        !route && !notification.isRead && "cursor-pointer",
      )}
      onClick={handleClick}
    >
      {/* Icon */}
      <div className="mt-0.5 w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
        {icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn(
            "text-sm font-medium leading-tight",
            !notification.isRead && "text-foreground",
            notification.isRead && "text-muted-foreground",
          )}>
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
          {notification.message}
        </p>
        <div className="flex items-center justify-between mt-1">
          <p className="text-[11px] text-muted-foreground/70">{timeAgo}</p>
          {route && (
            <span className="text-[11px] text-primary/70 hover:text-primary">
              바로가기 →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const notifications = useQuery(api.notifications.getMyNotifications, {});
  const unreadCount = useQuery(api.notifications.getUnreadCount, {});
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);

  const handleRead = async (id: string) => {
    await markAsRead({ notificationId: id as Parameters<typeof markAsRead>[0]["notificationId"] });
  };

  const handleNavigate = (route: string) => {
    setOpen(false);
    navigate(route);
  };

  const handleMarkAllRead = async () => {
    await markAllAsRead({});
  };

  const hasUnread = (unreadCount ?? 0) > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-md text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          aria-label="알림"
        >
          <Bell className="w-4 h-4" />
          {hasUnread && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-sidebar" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="end"
        sideOffset={8}
        className="w-80 p-0 shadow-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-muted-foreground" />
            <span className="font-semibold text-sm">알림</span>
            {hasUnread && (
              <span className="text-xs bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-medium">
                {unreadCount}
              </span>
            )}
          </div>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
              onClick={handleMarkAllRead}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              모두 읽음
            </Button>
          )}
        </div>

        {/* Notification list */}
        <ScrollArea className="max-h-[400px]">
          {!notifications || notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/40 mb-2" />
              <p className="text-sm text-muted-foreground">알림이 없습니다</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                기록이 승인되거나 반려되면 여기에 표시됩니다
              </p>
            </div>
          ) : (
            <div>
              {notifications.map((n) => (
                <NotificationItem
                  key={n._id}
                  notification={n}
                  onRead={handleRead}
                  onNavigate={handleNavigate}
                />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications && notifications.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border">
            <p className="text-[11px] text-muted-foreground/60">
              최근 50개 알림 표시
            </p>
            <button
              className="text-[11px] text-primary/70 hover:text-primary cursor-pointer"
              onClick={() => handleNavigate("/announcements")}
            >
              공지사항 보기
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
