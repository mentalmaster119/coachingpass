import { useState, createContext, useContext } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Authenticated, useQuery, useMutation } from "convex/react";
import {
  Heart,
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  MessageSquare,
  NotebookPen,
  UserCircle,
  UserCheck,
  LogOut,
  Menu,
  ChevronRight,
  TrendingUp,
  Settings,
  Award,
  Megaphone,
  BarChart2,
  FolderOpen,
  MessageSquareDot,
  CalendarDays,
  MessagesSquare,
  FileSpreadsheet,
  GraduationCap,
  Smartphone,
  ShieldCheck,
  Eye,
  ShieldAlert,
  Search,
  RotateCw,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button.tsx";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { useAuth } from "@/hooks/use-auth.ts";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { cn } from "@/lib/utils.ts";
import { PageTransition } from "./page-transition.tsx";
import { toast } from "sonner";
import { useEffect } from "react";
import NotificationBell from "@/components/notifications/notification-bell.tsx";
import { api } from "@/convex/_generated/api.js";
import { usePushNotifications } from "@/hooks/use-push-notifications.ts";
import PWAInstallBanner from "@/components/pwa/pwa-install-banner.tsx";
import { ErrorBoundary } from "@/components/ui/error-boundary.tsx";

// Context for admin preview mode (admin viewing as trainee/coach)
type ViewModeContextType = {
  isPreviewMode: boolean;
  previewRole: "trainee" | "senior_coach";
  setPreviewMode: (enabled: boolean, role?: "trainee" | "senior_coach") => Promise<void>;
};
const ViewModeContext = createContext<ViewModeContextType>({
  isPreviewMode: false,
  previewRole: "trainee",
  setPreviewMode: async () => {},
});
export function useViewMode() {
  return useContext(ViewModeContext);
}

type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  comingSoon?: boolean;
};

function getNavItems(role: string, isPreviewMode?: boolean): NavItem[] {
  // Admin or senior_coach in preview mode sees the trainee nav
  if ((role === "admin" || role === "senior_coach") && isPreviewMode) {
    return [
      { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "매일 자기 체크인", href: "/daily-checkin", icon: <Heart className="w-4 h-4" /> },
      { label: "출석 체크", href: "/attendance", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "진행 현황", href: "/progress", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "교육 이수 기록", href: "/education", icon: <BookOpen className="w-4 h-4" /> },
      { label: "교육이력 및 자격증", href: "/training-history", icon: <GraduationCap className="w-4 h-4" /> },
      { label: "코칭 실습 기록", href: "/coaching-log", icon: <ClipboardList className="w-4 h-4" /> },
      { label: "BCP 버디코칭 실습", href: "/bcp", icon: <Users className="w-4 h-4" /> },
      { label: "슈퍼비전", href: "/mentor-coaching", icon: <MessageSquare className="w-4 h-4" /> },
      { label: "인정 기준 달성 현황", href: "/recognition-status", icon: <ShieldCheck className="w-4 h-4" /> },
      { label: "멘탈 포럼", href: "/mental-forum", icon: <Award className="w-4 h-4" /> },
      { label: "인증 신청", href: "/certification", icon: <Award className="w-4 h-4" /> },
      { label: "역량 자가 평가", href: "/competency-assessment", icon: <BarChart2 className="w-4 h-4" /> },
      { label: "성찰 일지", href: "/reflection", icon: <NotebookPen className="w-4 h-4" /> },
      { label: "공지사항", href: "/announcements", icon: <Megaphone className="w-4 h-4" /> },
      { label: "자료실", href: "/resources", icon: <FolderOpen className="w-4 h-4" /> },
      { label: "슈퍼바이저 피드백", href: "/feedback", icon: <MessageSquareDot className="w-4 h-4" /> },
      { label: "일정 캘린더", href: "/calendar", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "교육장 예약", href: "/classroom-booking", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-4 h-4" /> },
      { label: "내 프로필", href: "/profile", icon: <UserCircle className="w-4 h-4" /> },
      { label: "설정", href: "/settings", icon: <Settings className="w-4 h-4" /> },
      { label: "앱 설치 안내", href: "/install-guide", icon: <Smartphone className="w-4 h-4" /> },
    ];
  }
  if (role === "admin") {
    return [
      { label: "관리자 대시보드", href: "/admin", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "자기 체크인 현황", href: "/admin/checkin", icon: <Heart className="w-4 h-4" /> },
      { label: "기수 관리", href: "/admin/cohorts", icon: <GraduationCap className="w-4 h-4" /> },
      { label: "세미나 일정 관리", href: "/admin/seminars", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "출석 관리", href: "/admin/attendance", icon: <Users className="w-4 h-4" /> },
      { label: "수료 및 인증 관리", href: "/admin/completion", icon: <Award className="w-4 h-4" /> },
      { label: "SMPCC 자격 관리", href: "/admin/smpcc", icon: <Award className="w-4 h-4" /> },
      { label: "종합 보고서", href: "/admin/report", icon: <BarChart2 className="w-4 h-4" /> },
      { label: "진행 현황", href: "/progress", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "교육생 슈퍼바이저 배정", href: "/admin/assignments", icon: <UserCheck className="w-4 h-4" /> },
      { label: "인증 신청 관리", href: "/admin/certification", icon: <Award className="w-4 h-4" /> },
      { label: "공지사항 관리", href: "/admin/announcements", icon: <Megaphone className="w-4 h-4" /> },
      { label: "자료실 관리", href: "/admin/resources", icon: <FolderOpen className="w-4 h-4" /> },
      { label: "피드백 현황", href: "/admin/feedback", icon: <MessageSquareDot className="w-4 h-4" /> },
      { label: "일정 캘린더", href: "/calendar", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "교육장 예약 관리", href: "/classroom-booking", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "사용자 관리", href: "/admin/users", icon: <Users className="w-4 h-4" /> },
      { label: "교육 기록 검토", href: "/admin/education", icon: <BookOpen className="w-4 h-4" /> },
      { label: "코칭 기록 검토", href: "/admin/coaching", icon: <ClipboardList className="w-4 h-4" /> },
      { label: "BCP 기록 검토", href: "/admin/bcp", icon: <Users className="w-4 h-4" /> },
      { label: "슈퍼비전 검토", href: "/admin/mentor-coaching", icon: <MessageSquare className="w-4 h-4" /> },
      { label: "데이터 내보내기", href: "/admin/export", icon: <FileSpreadsheet className="w-4 h-4" /> },
      { label: "내 프로필", href: "/profile", icon: <UserCircle className="w-4 h-4" /> },
      { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-4 h-4" /> },
      { label: "설정", href: "/settings", icon: <Settings className="w-4 h-4" /> },
      { label: "앱 설치 안내", href: "/install-guide", icon: <Smartphone className="w-4 h-4" /> },
    ];
  }
  if (role === "senior_coach") {
    return [
      { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "진행 현황", href: "/progress", icon: <TrendingUp className="w-4 h-4" /> },
      { label: "교육 기록 검토", href: "/admin/education", icon: <BookOpen className="w-4 h-4" /> },
      { label: "코칭 기록 검토", href: "/admin/coaching", icon: <ClipboardList className="w-4 h-4" /> },
      { label: "BCP 기록 검토", href: "/admin/bcp", icon: <Users className="w-4 h-4" /> },
      { label: "슈퍼비전 검토", href: "/admin/mentor-coaching", icon: <MessageSquare className="w-4 h-4" /> },
      { label: "인증 신청 관리", href: "/admin/certification", icon: <Award className="w-4 h-4" /> },
      { label: "담당 교육생", href: "/coach/trainees", icon: <UserCheck className="w-4 h-4" /> },
      { label: "피드백 관리", href: "/coach/feedback", icon: <MessageSquareDot className="w-4 h-4" /> },
      { label: "일정 캘린더", href: "/calendar", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "교육장 예약", href: "/classroom-booking", icon: <CalendarDays className="w-4 h-4" /> },
      { label: "공지사항", href: "/announcements", icon: <Megaphone className="w-4 h-4" /> },
      { label: "자료실", href: "/resources", icon: <FolderOpen className="w-4 h-4" /> },
      { label: "내 프로필", href: "/profile", icon: <UserCircle className="w-4 h-4" /> },
      { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-4 h-4" /> },
      { label: "설정", href: "/settings", icon: <Settings className="w-4 h-4" /> },
      { label: "앱 설치 안내", href: "/install-guide", icon: <Smartphone className="w-4 h-4" /> },
    ];
  }
  // trainee
  return [
    { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
    { label: "매일 자기 체크인", href: "/daily-checkin", icon: <Heart className="w-4 h-4" /> },
    { label: "출석 체크", href: "/attendance", icon: <CalendarDays className="w-4 h-4" /> },
    { label: "진행 현황", href: "/progress", icon: <TrendingUp className="w-4 h-4" /> },
    { label: "교육 이수 기록", href: "/education", icon: <BookOpen className="w-4 h-4" /> },
    { label: "교육이력 및 자격증", href: "/training-history", icon: <GraduationCap className="w-4 h-4" /> },
    { label: "코칭 실습 기록", href: "/coaching-log", icon: <ClipboardList className="w-4 h-4" /> },
    { label: "BCP 버디코칭 실습", href: "/bcp", icon: <Users className="w-4 h-4" /> },
    { label: "슈퍼비전", href: "/mentor-coaching", icon: <MessageSquare className="w-4 h-4" /> },
    { label: "인정 기준 달성 현황", href: "/recognition-status", icon: <ShieldCheck className="w-4 h-4" /> },
    { label: "멘탈 포럼", href: "/mental-forum", icon: <Award className="w-4 h-4" /> },
    { label: "인증 신청", href: "/certification", icon: <Award className="w-4 h-4" /> },
    { label: "역량 자가 평가", href: "/competency-assessment", icon: <BarChart2 className="w-4 h-4" /> },
    { label: "성찰 일지", href: "/reflection", icon: <NotebookPen className="w-4 h-4" /> },
    { label: "공지사항", href: "/announcements", icon: <Megaphone className="w-4 h-4" /> },
    { label: "자료실", href: "/resources", icon: <FolderOpen className="w-4 h-4" /> },
    { label: "슈퍼바이저 피드백", href: "/feedback", icon: <MessageSquareDot className="w-4 h-4" /> },
    { label: "일정 캘린더", href: "/calendar", icon: <CalendarDays className="w-4 h-4" /> },
    { label: "교육장 예약", href: "/classroom-booking", icon: <CalendarDays className="w-4 h-4" /> },
    { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-4 h-4" /> },
    { label: "내 프로필", href: "/profile", icon: <UserCircle className="w-4 h-4" /> },
    { label: "설정", href: "/settings", icon: <Settings className="w-4 h-4" /> },
    { label: "앱 설치 안내", href: "/install-guide", icon: <Smartphone className="w-4 h-4" /> },
  ];
}

function RoleLabel({ role }: { role: string }) {
  const map: Record<string, string> = {
    admin: "관리자",
    senior_coach: "슈퍼바이저",
    trainee: "교육생",
  };
  return <span>{map[role] ?? role}</span>;
}

function SidebarContent({ onClose }: { onClose?: () => void }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { signout } = useAuth();
  const { user, realUser } = useCurrentUser();
  const myCert = useQuery(api.smpcc.getMyCertification);
  const { isPreviewMode, previewRole, setPreviewMode } = useViewMode();
  const { unsubscribe: unsubscribePush } = usePushNotifications();
  const mockLogin = useMutation(api.users.setActiveMockUser);
  const { theme, setTheme } = useTheme();

  const realRole = realUser?.role || localStorage.getItem("real_role");
  const navItems = user ? getNavItems(user.role, isPreviewMode) : [];

  const handleNavClick = (item: NavItem) => {
    if (item.comingSoon) {
      toast.info("준비 중인 기능입니다", {
        description: "다음 업데이트에서 제공될 예정입니다.",
      });
      return;
    }
    navigate(item.href);
    onClose?.();
  };

  const handleSignOut = async () => {
    // Unsubscribe push before sign out to prevent notifications reaching next user
    await unsubscribePush();
    await signout();
    window.location.replace("/");
  };

  const handleClearCache = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.unregister();
        }
      }
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      // Preserve auth-related keys in localStorage to prevent logging out
      const authKeys = Object.keys(localStorage).filter(
        (key) =>
          key.startsWith("oidc.") ||
          key.includes("token") ||
          key.includes("auth") ||
          key.includes("hercules")
      );
      const authValues = authKeys.reduce(
        (acc, key) => {
          acc[key] = localStorage.getItem(key) || "";
          return acc;
        },
        {} as Record<string, string>,
      );

      localStorage.clear();

      // Restore auth keys
      Object.entries(authValues).forEach(([key, val]) => {
        localStorage.setItem(key, val);
      });

      toast.success("캐시가 초기화되었습니다. 페이지를 새로고침합니다.");
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.error("Failed to clear cache:", err);
      toast.error("캐시 초기화에 실패했습니다.");
    }
  };

  const handleRoleSwitch = async (targetRole: "admin" | "senior_coach" | "trainee") => {
    try {
      if (targetRole === realRole) {
        await setPreviewMode(false);
        navigate(realRole === "admin" ? "/admin" : "/dashboard");
      } else {
        await setPreviewMode(true, targetRole === "senior_coach" ? "senior_coach" : "trainee");
        navigate("/dashboard");
      }
      window.location.reload();
    } catch (err) {
      console.error("Failed to switch role:", err);
      toast.error("화면 전환에 실패했습니다.");
    }
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-sidebar-border">
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0">
          <img src="/logo.png" alt="MCCI-SMPCC" className="w-full h-full object-cover" />
        </div>
        <div>
          <p className="font-bold text-base leading-tight">MCCI-SMPCC</p>
          <p className="text-xs text-sidebar-foreground/60 leading-tight">멘탈코칭전문가 양성과정</p>
        </div>
      </div>

      {/* Preview mode banner */}
      {isPreviewMode && (
        <div className="mx-3 mt-3 px-3 py-2 rounded-md bg-amber-500/15 border border-amber-400/30 flex items-center gap-2">
          <Eye className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            {previewRole === "senior_coach" ? "멘토코치" : "교육생"} 화면 미리보기 중
          </span>
        </div>
      )}

      {/* Search button */}
      <div className="px-3 pt-3">
        <button
          type="button"
          onClick={() => { navigate("/search"); onClose?.(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md border border-sidebar-border bg-sidebar-accent/30 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors text-sm cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span>통합 검색…</span>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.href}
              onClick={() => handleNavClick(item)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                item.comingSoon && "opacity-60"
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.comingSoon && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sidebar-border/50 text-sidebar-foreground/50">
                  준비중
                </span>
              )}
              {isActive && !item.comingSoon && (
                <ChevronRight className="w-3 h-3 opacity-60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className="px-3 py-4 border-t border-sidebar-border space-y-3">
        {user && (
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 rounded-md bg-sidebar-accent/50 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <p className="text-sm font-medium truncate">{user.name ?? "사용자"}</p>
                {myCert?.cert && myCert.cert.status === "active" && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 border border-amber-400/30 flex-shrink-0">
                    ✦ SMPCC
                  </span>
                )}
              </div>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                <RoleLabel role={user.role} />
              </p>
            </div>
            <NotificationBell />
          </div>
        )}

        {/* Role switcher for Admin */}
        {realRole === "admin" && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold text-sidebar-foreground/45 px-3 uppercase tracking-wider">
              화면 모드 전환 (관리자)
            </p>
            <div className="grid grid-cols-3 gap-1 p-1 bg-sidebar-accent/30 rounded-lg">
              <button
                onClick={() => handleRoleSwitch("admin")}
                className={cn(
                  "px-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center",
                  !isPreviewMode
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                관리자
              </button>
              <button
                onClick={() => handleRoleSwitch("senior_coach")}
                className={cn(
                  "px-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center",
                  isPreviewMode && previewRole === "senior_coach"
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                멘토코치
              </button>
              <button
                onClick={() => handleRoleSwitch("trainee")}
                className={cn(
                  "px-1 py-1 text-[11px] font-semibold rounded-md transition-all cursor-pointer text-center",
                  isPreviewMode && previewRole === "trainee"
                    ? "bg-sidebar text-sidebar-foreground shadow-sm"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                교육생
              </button>
            </div>
          </div>
        )}

        {/* Role switcher for Senior Coach */}
        {realRole === "senior_coach" && (
          <button
            onClick={() => handleRoleSwitch(isPreviewMode ? "senior_coach" : "trainee")}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
          >
            {isPreviewMode ? (
              <>
                <ShieldAlert className="w-4 h-4" />
                멘토코치 화면으로 복귀
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                교육생 화면으로 보기
              </>
            )}
          </button>
        )}

        <button
          onClick={handleClearCache}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-amber-600 dark:text-amber-400 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          캐시 비우기 및 새로고침
        </button>

        <button
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors cursor-pointer"
        >
          {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          {theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
        </button>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
        >
          <LogOut className="w-4 h-4" />
          로그아웃
        </button>
      </div>
    </div>
  );
}

type BottomNavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
};

function getBottomNavItems(role: string, isPreviewMode?: boolean): BottomNavItem[] {
  if ((role === "admin" || role === "senior_coach") && isPreviewMode) {
    return [
      { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: "체크인", href: "/daily-checkin", icon: <Heart className="w-5 h-5" /> },
      { label: "코칭", href: "/coaching-log", icon: <ClipboardList className="w-5 h-5" /> },
      { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-5 h-5" /> },
      { label: "더보기", href: "#menu", icon: <Menu className="w-5 h-5" /> },
    ];
  }
  if (role === "admin") {
    return [
      { label: "대시보드", href: "/admin", icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: "기수관리", href: "/admin/cohorts", icon: <GraduationCap className="w-5 h-5" /> },
      { label: "출석", href: "/admin/attendance", icon: <Users className="w-5 h-5" /> },
      { label: "캘린더", href: "/calendar", icon: <CalendarDays className="w-5 h-5" /> },
      { label: "설정", href: "/settings", icon: <Settings className="w-5 h-5" /> },
    ];
  }
  if (role === "senior_coach") {
    return [
      { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: "코칭기록", href: "/admin/coaching", icon: <ClipboardList className="w-5 h-5" /> },
      { label: "캘린더", href: "/calendar", icon: <CalendarDays className="w-5 h-5" /> },
      { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-5 h-5" /> },
      { label: "설정", href: "/settings", icon: <Settings className="w-5 h-5" /> },
    ];
  }
  return [
    { label: "대시보드", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: "체크인", href: "/daily-checkin", icon: <Heart className="w-5 h-5" /> },
    { label: "코칭", href: "/coaching-log", icon: <ClipboardList className="w-5 h-5" /> },
    { label: "커뮤니티", href: "/community", icon: <MessagesSquare className="w-5 h-5" /> },
    { label: "더보기", href: "#menu", icon: <Menu className="w-5 h-5" /> },
  ];
}

function BottomNav({
  role,
  onMenuOpen,
}: {
  role: string;
  onMenuOpen: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isPreviewMode } = useViewMode();
  const items = getBottomNavItems(role, isPreviewMode);

  const handleClick = (item: BottomNavItem) => {
    if (item.href === "#menu") {
      onMenuOpen();
    } else {
      navigate(item.href);
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-stretch bg-sidebar border-t border-sidebar-border" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      {items.map((item) => {
        const isActive =
          item.href !== "#menu" && location.pathname === item.href;
        return (
          <button
            key={item.href}
            onClick={() => handleClick(item)}
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 px-1 text-[10px] font-medium transition-colors cursor-pointer",
              isActive
                ? "text-primary"
                : "text-sidebar-foreground/60 hover:text-sidebar-foreground"
            )}
          >
            <span className={cn(isActive && "text-primary")}>{item.icon}</span>
            <span className="leading-tight truncate w-full text-center">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function PreviewModeBanner() {
  const navigate = useNavigate();
  const { previewRole, setPreviewMode } = useViewMode();

  const handleRoleChange = async (role: "trainee" | "senior_coach") => {
    await setPreviewMode(true, role);
    navigate("/dashboard");
    window.location.reload();
  };

  return (
    <div className="sticky top-0 z-30 flex items-center justify-between px-4 py-2 bg-amber-500/10 border-b border-amber-400/30 gap-4 flex-wrap">
      <div className="flex items-center gap-3 text-xs font-medium text-amber-600 dark:text-amber-400">
        <Eye className="w-3.5 h-3.5 flex-shrink-0" />
        <span>관리자 미리보기 모드 (Read-only)</span>
        <div className="flex rounded-md bg-amber-500/10 p-0.5 border border-amber-400/20">
          <button
            onClick={() => handleRoleChange("trainee")}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer",
              previewRole === "trainee" ? "bg-amber-500 text-white" : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
            )}
          >
            교육생 뷰
          </button>
          <button
            onClick={() => handleRoleChange("senior_coach")}
            className={cn(
              "px-2.5 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer",
              previewRole === "senior_coach" ? "bg-amber-500 text-white" : "text-amber-600 dark:text-amber-400 hover:bg-amber-500/15"
            )}
          >
            멘토코치 뷰
          </button>
        </div>
      </div>
      <button
        onClick={async () => {
          const realRole = localStorage.getItem("real_role");
          await setPreviewMode(false);
          navigate(realRole === "admin" ? "/admin" : "/dashboard");
          window.location.reload();
        }}
        className="text-xs text-amber-700 dark:text-amber-300 font-bold hover:underline cursor-pointer"
      >
        관리자 화면으로 복귀 →
      </button>
    </div>
  );
}

function AppLayoutInner() {
  const navigate = useNavigate();
  const { user, isLoading } = useCurrentUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isPreviewMode } = useViewMode();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    if (isLoading) return;
    if (!user) return;

    if (user.approvalStatus === "pending" || user.approvalStatus === "rejected") {
      navigate("/pending", { replace: true });
      return;
    }
    if (user.approvalStatus === "approved" && !user.onboardingCompleted) {
      navigate("/onboarding", { replace: true });
      return;
    }
    // Trainees cannot access admin pages
    if (user.role === "trainee" && window.location.pathname.startsWith("/admin")) {
      navigate("/dashboard", { replace: true });
    }
    // Admin in preview mode should not be on admin pages
    if (user.role === "admin" && isPreviewMode && window.location.pathname.startsWith("/admin")) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, isLoading, navigate, isPreviewMode]);

  if (isLoading) {
    return (
      <div className="flex h-screen">
        <div className="w-60 bg-sidebar p-4 space-y-3">
          <Skeleton className="h-10 w-full bg-sidebar-accent/30" />
          <Skeleton className="h-8 w-full bg-sidebar-accent/30" />
          <Skeleton className="h-8 w-3/4 bg-sidebar-accent/30" />
          <Skeleton className="h-8 w-4/5 bg-sidebar-accent/30" />
        </div>
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile Header + content */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-sidebar text-sidebar-foreground border-b border-sidebar-border flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="MCCI-SMPCC" className="w-5 h-5 rounded object-cover" />
            <span className="font-bold text-sm">MCCI-SMPCC</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => navigate("/search")}
              title="통합 검색"
            >
              <Search className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              title={theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
            >
              {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
            <NotificationBell />
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-sidebar-foreground hover:bg-sidebar-accent">
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60 border-0">
                <SidebarContent onClose={() => setMobileOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Main content — extra bottom padding on mobile for the bottom nav */}
        <main className="flex-1 overflow-y-auto bg-background pb-20 md:pb-0">
          {/* Preview mode top banner */}
          {isPreviewMode && (
            <PreviewModeBanner />
          )}
          <PageTransition key={location.pathname}>
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </PageTransition>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      {user && (
        <BottomNav role={user.role} onMenuOpen={() => setMobileOpen(true)} />
      )}
      <PWAInstallBanner />
    </div>
  );
}

function AuthSync() {
  const updateCurrentUser = useMutation(api.users.updateCurrentUser);
  useEffect(() => {
    updateCurrentUser().catch(console.error);
  }, [updateCurrentUser]);
  return null;
}

export default function AppLayout() {
  const [isPreviewMode, setIsPreviewModeState] = useState(() => {
    return localStorage.getItem("admin_preview_mode") === "true";
  });
  const [previewRole, setPreviewRoleState] = useState<"trainee" | "senior_coach">(() => {
    return (localStorage.getItem("preview_role") as "trainee" | "senior_coach") || "trainee";
  });

  const { isAuthenticated } = useAuth();
  const { user, isLoading: isUserLoading, isPending, isRejected } = useCurrentUser();
  const navigate = useNavigate();
  const location = useLocation();
  const mockLogin = useMutation(api.users.setActiveMockUser);

  const setPreviewMode = async (enabled: boolean, role: "trainee" | "senior_coach" = "trainee") => {
    const realRole = (localStorage.getItem("real_role") as "admin" | "senior_coach" | "trainee") || "admin";
    try {
      if (enabled) {
        await mockLogin({ role });
        localStorage.setItem("admin_preview_mode", "true");
        localStorage.setItem("preview_role", role);
        setIsPreviewModeState(true);
        setPreviewRoleState(role);
      } else {
        await mockLogin({ role: realRole });
        localStorage.removeItem("admin_preview_mode");
        localStorage.removeItem("preview_role");
        setIsPreviewModeState(false);
      }
    } catch (err) {
      console.error("Failed to set preview mode:", err);
      toast.error("화면 전환에 실패했습니다.");
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/", { replace: true });
      return;
    }

    if (!isUserLoading && user && (isPending || isRejected)) {
      navigate("/pending", { replace: true });
    }
  }, [isAuthenticated, isUserLoading, user, isPending, isRejected, navigate]);

  if (!isAuthenticated || isUserLoading) {
    return null;
  }

  if (user && (isPending || isRejected)) {
    return null;
  }

  return (
    <ViewModeContext.Provider value={{ isPreviewMode, previewRole, setPreviewMode }}>
      <AuthSync />
      <AppLayoutInner />
    </ViewModeContext.Provider>
  );
}
