import { useState, useEffect, useCallback } from "react";
import { WifiOff, Wifi, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true
  );
  const [showReconnected, setShowReconnected] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkConnectivity = useCallback(async () => {
    setIsChecking(true);
    try {
      // Lightweight cache-busted ping to check real connection
      const response = await fetch(`/icon/icon-192.png?t=${Date.now()}`, {
        method: "HEAD",
        cache: "no-store",
      });
      if (response.ok) {
        setIsOnline(true);
        setShowReconnected(true);
        toast.success("네트워크가 정상 연결되었습니다.");
        setTimeout(() => setShowReconnected(false), 4000);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
      toast.error("아직 인터넷에 연결되지 않았습니다.");
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowReconnected(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div
        role="alert"
        className="bg-amber-600 dark:bg-amber-700 text-white px-3 sm:px-4 py-2 text-xs font-medium flex items-center justify-between gap-2 shadow-md z-[9999] sticky top-0 animate-in slide-in-from-top duration-200"
      >
        <div className="flex items-center gap-2 min-w-0">
          <WifiOff className="w-4 h-4 shrink-0 animate-pulse text-amber-200" />
          <span className="truncate sm:whitespace-normal">
            오프라인 상태입니다. 네트워크 복구 시 자동 동기화되며, 작성 중인 내용은 브라우저에 안전하게 보존됩니다.
          </span>
        </div>
        <button
          type="button"
          onClick={checkConnectivity}
          disabled={isChecking}
          className="shrink-0 flex items-center gap-1 bg-amber-700/80 hover:bg-amber-800 text-white text-[11px] px-2.5 py-1 rounded-md border border-amber-500/40 transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? "animate-spin" : ""}`} />
          <span>{isChecking ? "확인중" : "연결 확인"}</span>
        </button>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div
        role="status"
        className="bg-emerald-600 dark:bg-emerald-700 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-md z-[9999] sticky top-0 animate-in slide-in-from-top duration-200"
      >
        <Wifi className="w-4 h-4 shrink-0 text-emerald-200" />
        <span>인터넷 연결이 정상 복구되었습니다. 실시간 동기화가 재개됩니다.</span>
      </div>
    );
  }

  return null;
}
