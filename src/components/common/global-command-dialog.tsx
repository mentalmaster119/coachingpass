import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command.tsx";
import {
  LayoutDashboard,
  Heart,
  CalendarDays,
  TrendingUp,
  GraduationCap,
  FileCheck,
  ClipboardList,
  Users,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Award,
  Megaphone,
  FolderOpen,
  Building2,
  Settings,
  UsersRound,
  FileSpreadsheet,
  Moon,
  Sun,
  RefreshCw,
  Search,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/use-current-user.ts";
import { toast } from "sonner";

interface GlobalCommandDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function GlobalCommandDialog({
  open,
  onOpenChange,
}: GlobalCommandDialogProps) {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const { user } = useCurrentUser();

  const isAdmin = user?.role === "admin" || user?.role === "admin3";

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  const handleClearCacheAndReload = useCallback(async () => {
    toast.info("캐시를 비우고 앱을 새로고침합니다...");
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
        }
      }
      if ("caches" in window) {
        const cacheKeys = await caches.keys();
        for (const key of cacheKeys) {
          await caches.delete(key);
        }
      }
      localStorage.clear();
      sessionStorage.clear();
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, []);

  return (
    <CommandDialog
      title="전체 빠른 이동 & 명령어 검색"
      description="페이지, 코칭 실습, 자격 인증 또는 시스템 설정을 검색하세요."
      open={open}
      onOpenChange={onOpenChange}
    >
      <CommandInput placeholder="메뉴, 코칭일지, 자격증, 관리자 기능 검색… (예: 인증, 코칭, 출석)" />
      <CommandList className="max-h-[360px]">
        <CommandEmpty>일치하는 메뉴나 기능이 없습니다.</CommandEmpty>

        {/* ── 자주 찾는 메뉴 ── */}
        <CommandGroup heading="자주 찾는 학습 & 코칭 메뉴">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/dashboard"))}
            className="cursor-pointer"
          >
            <LayoutDashboard className="w-4 h-4 mr-2 text-primary" />
            <span>대시보드</span>
            <CommandShortcut>홈</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/coaching-log"))}
            className="cursor-pointer"
          >
            <ClipboardList className="w-4 h-4 mr-2 text-primary" />
            <span>코칭일지 작성 & 목록</span>
            <CommandShortcut>실습</CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/daily-checkin"))}
            className="cursor-pointer"
          >
            <Heart className="w-4 h-4 mr-2 text-rose-500" />
            <span>매일 체크인 & 감사일기</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/attendance"))}
            className="cursor-pointer"
          >
            <CalendarDays className="w-4 h-4 mr-2 text-blue-500" />
            <span>출석 체크 및 현황</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/progress"))}
            className="cursor-pointer"
          >
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-500" />
            <span>목표설정 및 진행 현황</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/submissions"))}
            className="cursor-pointer"
          >
            <FileCheck className="w-4 h-4 mr-2 text-amber-500" />
            <span>과제 제출 (독후감 / 에세이)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── 자격 인증 & 시험 ── */}
        <CommandGroup heading="SMPCC 자격 인증 & 시험">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/certification"))}
            className="cursor-pointer"
          >
            <Award className="w-4 h-4 mr-2 text-amber-500" />
            <span>자격 인증 및 시험 신청 (원서 접수)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/recognition-status"))}
            className="cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
            <span>SMPCC 실습 인증요건 달성 현황</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/mental-forum"))}
            className="cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-2 text-purple-500" />
            <span>멘탈 포럼 (동문 보수교육)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/training-history"))}
            className="cursor-pointer"
          >
            <GraduationCap className="w-4 h-4 mr-2 text-blue-500" />
            <span>교육이력 및 자격증</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── 코칭 & 멘토링 ── */}
        <CommandGroup heading="코칭 및 멘토링 실습">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/bcp"))}
            className="cursor-pointer"
          >
            <Users className="w-4 h-4 mr-2 text-violet-500" />
            <span>버디코칭 (BCP)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/mentor-coaching"))}
            className="cursor-pointer"
          >
            <MessageSquare className="w-4 h-4 mr-2 text-cyan-500" />
            <span>멘토코칭 (MCP)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/supervision"))}
            className="cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 mr-2 text-emerald-500" />
            <span>수퍼비전 (SVP)</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/coaching-quality"))}
            className="cursor-pointer"
          >
            <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
            <span>코칭 역량 분석 (AI 품질 진단)</span>
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />

        {/* ── 정보 & 지원 ── */}
        <CommandGroup heading="커뮤니티 및 지원">
          <CommandItem
            onSelect={() => runCommand(() => navigate("/announcements"))}
            className="cursor-pointer"
          >
            <Megaphone className="w-4 h-4 mr-2 text-orange-500" />
            <span>공지사항</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/resources"))}
            className="cursor-pointer"
          >
            <FolderOpen className="w-4 h-4 mr-2 text-blue-500" />
            <span>강의 자료실</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/classroom-booking"))}
            className="cursor-pointer"
          >
            <Building2 className="w-4 h-4 mr-2 text-indigo-500" />
            <span>교육장 및 코칭룸 대관 신청</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => navigate("/search"))}
            className="cursor-pointer"
          >
            <Search className="w-4 h-4 mr-2 text-muted-foreground" />
            <span>상세 통합 검색 페이지</span>
          </CommandItem>
        </CommandGroup>

        {/* ── 관리자 전용 기능 ── */}
        {isAdmin && (
          <>
            <CommandSeparator />
            <CommandGroup heading="관리자 운영 콘솔">
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin"))}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2 text-primary" />
                <span>관리자 대시보드</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin/users"))}
                className="cursor-pointer"
              >
                <UsersRound className="w-4 h-4 mr-2 text-primary" />
                <span>회원 관리 (명단 엑셀 등록)</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin/completion"))}
                className="cursor-pointer"
              >
                <GraduationCap className="w-4 h-4 mr-2 text-emerald-600" />
                <span>과정 수료 사정 심사</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin/smpcc"))}
                className="cursor-pointer"
              >
                <Award className="w-4 h-4 mr-2 text-amber-500" />
                <span>SMPCC 레벨 및 자격 관리 (자격증 발급/조회)</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin/certification"))}
                className="cursor-pointer"
              >
                <Award className="w-4 h-4 mr-2 text-blue-500" />
                <span>인증시험 원서 접수 및 심사 관리</span>
              </CommandItem>
              <CommandItem
                onSelect={() => runCommand(() => navigate("/admin/export"))}
                className="cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2 text-emerald-500" />
                <span>데이터 엑셀 내보내기</span>
              </CommandItem>
            </CommandGroup>
          </>
        )}

        <CommandSeparator />

        {/* ── 환경 설정 & 유틸리티 ── */}
        <CommandGroup heading="환경 설정 및 도구">
          <CommandItem
            onSelect={() => runCommand(() => setTheme(theme === "dark" ? "light" : "dark"))}
            className="cursor-pointer"
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4 mr-2 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 mr-2 text-slate-700" />
            )}
            <span>테마 전환 ({theme === "dark" ? "라이트 모드로" : "다크 모드로"})</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(handleClearCacheAndReload)}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <RefreshCw className="w-4 h-4 mr-2 text-destructive" />
            <span>캐시 비우기 및 강제 새로고침</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
