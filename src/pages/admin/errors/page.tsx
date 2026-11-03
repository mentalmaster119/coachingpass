import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertTriangle,
  CheckCircle2,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Monitor,
  Smartphone,
  Copy,
  ChevronDown,
  ShieldAlert,
  ArrowUpRight,
  Sparkles,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

function parseDevice(userAgent: string): string {
  const ua = (userAgent || "").toLowerCase();
  if (ua.includes("iphone")) return "iPhone (iOS)";
  if (ua.includes("ipad")) return "iPad (iOS)";
  if (ua.includes("android")) return "Android";
  if (ua.includes("macintosh") || ua.includes("mac os")) return "Mac";
  if (ua.includes("windows")) return "Windows PC";
  return "기타 기기";
}

export default function AdminErrorsPage() {
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "resolved">("open");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useQuery(api.clientErrors.getErrorStats);
  const errors = useQuery(api.clientErrors.listErrors, {
    status: statusFilter,
    limit: 100,
  });

  const updateStatus = useMutation(api.clientErrors.updateErrorStatus);
  const resolveAll = useMutation(api.clientErrors.resolveAllOpen);
  const deleteErr = useMutation(api.clientErrors.deleteError);

  const handleResolve = async (id: Id<"clientErrors">) => {
    try {
      await updateStatus({ errorId: id, status: "resolved" });
      toast.success("에러 상태를 '해결됨'으로 변경했습니다.");
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleReopen = async (id: Id<"clientErrors">) => {
    try {
      await updateStatus({ errorId: id, status: "open" });
      toast.success("에러 상태를 '미해결'로 다시 열었습니다.");
    } catch {
      toast.error("상태 변경에 실패했습니다.");
    }
  };

  const handleDelete = async (id: Id<"clientErrors">) => {
    try {
      await deleteErr({ errorId: id });
      toast.success("에러 로그를 삭제했습니다.");
    } catch {
      toast.error("삭제에 실패했습니다.");
    }
  };

  const handleResolveAll = async () => {
    try {
      const count = await resolveAll({});
      toast.success(`${count}건의 미해결 에러를 모두 '해결됨' 처리했습니다.`);
    } catch {
      toast.error("일괄 처리에 실패했습니다.");
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("클립보드에 복사되었습니다.");
  };

  const filteredErrors = (errors || []).filter((err) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      err.message.toLowerCase().includes(q) ||
      err.url.toLowerCase().includes(q) ||
      (err.userName && err.userName.toLowerCase().includes(q)) ||
      (err.userEmail && err.userEmail.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-foreground">
              <ShieldAlert className="w-6 h-6 text-rose-500" />
              시스템 런타임 관측 대시보드
            </h1>
            <Badge variant="outline" className="border-rose-500/40 text-rose-600 bg-rose-500/10 text-xs">
              Live Sentry Mode
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            모바일 웹뷰 및 브라우저 환경에서 발생한 실시간 클라이언트 에러 및 스택 트레이스를 모니터링합니다.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {(stats?.openCount ?? 0) > 0 && (
            <Button
              size="sm"
              onClick={handleResolveAll}
              className="text-xs h-9 gap-1.5 font-semibold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              미해결 에러 전체 해결
            </Button>
          )}
        </div>
      </div>

      {/* Observability Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-rose-500/20 bg-rose-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-semibold text-rose-700 dark:text-rose-400">미해결 에러</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-600">
              {stats?.openCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">건</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">최근 24시간 발생</span>
              <RefreshCw className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.last24hCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">건</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">모바일 기기 비율</span>
              <Smartphone className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats
                ? `${Math.round(
                    (((stats.devices.iOS || 0) + (stats.devices.Android || 0)) /
                      Math.max(stats.total || 1, 1)) *
                      100
                  )}%`
                : "0%"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              iOS {stats?.devices.iOS || 0} · Android {stats?.devices.Android || 0}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-muted-foreground mb-1">
              <span className="text-xs font-medium">해결 완료</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-foreground">
              {stats?.resolvedCount ?? 0}
              <span className="text-xs font-normal text-muted-foreground ml-1">건</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="에러 메시지, 발생 URL, 사용자명 검색"
            className="pl-9 h-9 text-xs bg-background"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
          >
            <SelectTrigger className="h-9 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">미해결 (Open)</SelectItem>
              <SelectItem value="resolved">해결됨 (Resolved)</SelectItem>
              <SelectItem value="all">전체 상태</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error List */}
      <div className="space-y-3">
        {errors === undefined ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredErrors.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              {statusFilter === "open"
                ? "접수된 미해결 에러가 없습니다!"
                : "검색 조건에 일치하는 에러가 없습니다."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              모든 클라이언트가 안정적으로 동작 중입니다.
            </p>
          </Card>
        ) : (
          filteredErrors.map((err) => {
            const isExpanded = expandedId === err._id;
            const device = parseDevice(err.userAgent);

            return (
              <Card
                key={err._id}
                className={cn(
                  "overflow-hidden transition-all border",
                  err.status === "open"
                    ? "border-rose-500/30 hover:border-rose-500/50"
                    : "border-border/60 opacity-80"
                )}
              >
                <div className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] px-1.5 py-0 font-bold",
                            err.severity === "fatal"
                              ? "border-rose-600 text-rose-600 bg-rose-500/10"
                              : "border-amber-600 text-amber-600 bg-amber-500/10"
                          )}
                        >
                          {err.severity.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0 font-mono"
                        >
                          {device}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground">
                          {new Date(err.timestamp).toLocaleString("ko-KR")}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-foreground break-all">
                        {err.message}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        경로: {err.url}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-center">
                      {err.status === "open" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResolve(err._id)}
                          className="h-8 text-xs gap-1 font-semibold hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/40 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          해결 완료
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleReopen(err._id)}
                          className="h-8 text-xs text-muted-foreground cursor-pointer"
                        >
                          다시 열기
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(err._id)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive cursor-pointer"
                        title="에러 로그 삭제"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Context Bar */}
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                    <span className="truncate">
                      사용자:{" "}
                      <strong className="text-foreground">
                        {err.userName ? `${err.userName} (${err.userEmail || ""})` : "비로그인 / 익명"}
                      </strong>
                    </span>

                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : err._id)}
                      className="text-primary hover:underline flex items-center gap-1 cursor-pointer shrink-0 ml-2"
                    >
                      <span>스택 트레이스</span>
                      <ChevronDown
                        className={cn(
                          "w-3 h-3 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </button>
                  </div>

                  {/* Expandable Stack Trace */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden space-y-2 pt-2"
                      >
                        {err.stack && (
                          <div className="relative">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopy(err.stack || "")}
                              className="absolute right-2 top-2 h-7 px-2 text-[10px] gap-1 bg-background/80 cursor-pointer"
                            >
                              <Copy className="w-3 h-3" /> 복사
                            </Button>
                            <pre className="text-[10px] font-mono bg-muted/60 p-3 rounded-lg overflow-x-auto text-muted-foreground border border-border/50 max-h-48 whitespace-pre-wrap break-all">
                              {err.stack}
                            </pre>
                          </div>
                        )}
                        {err.componentStack && (
                          <div>
                            <p className="text-[11px] font-semibold text-muted-foreground mb-1">
                              React Component Stack
                            </p>
                            <pre className="text-[10px] font-mono bg-muted/40 p-2.5 rounded-lg overflow-x-auto text-muted-foreground border border-border/40 max-h-32 whitespace-pre-wrap break-all">
                              {err.componentStack}
                            </pre>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground/60 font-mono break-all">
                          UserAgent: {err.userAgent}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
