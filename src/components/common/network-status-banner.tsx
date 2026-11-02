import { useState, useEffect } from "react";
import { WifiOff, Wifi } from "lucide-react";

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== "undefined" ? navigator.onLine : true));
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
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
      <div className="bg-amber-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-sm z-50 sticky top-0 animate-in slide-in-from-top duration-200">
        <WifiOff className="w-4 h-4 flex-shrink-0 animate-pulse" />
        <span>인터넷 연결이 원활하지 않습니다 (오프라인). 작성 중인 내용은 기기에 안전하게 보존됩니다.</span>
      </div>
    );
  }

  if (showReconnected) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-medium flex items-center justify-center gap-2 shadow-sm z-50 sticky top-0 animate-in slide-in-from-top duration-200">
        <Wifi className="w-4 h-4 flex-shrink-0" />
        <span>인터넷 연결이 다시 복구되었습니다.</span>
      </div>
    );
  }

  return null;
}
