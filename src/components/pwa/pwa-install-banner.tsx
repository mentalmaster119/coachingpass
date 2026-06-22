import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Smartphone, X, Download, Share } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { usePWAInstall } from "@/hooks/use-pwa-install.ts";
import { Link } from "react-router-dom";

export default function PWAInstallBanner() {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS device
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(ios);

    // Check if dismissed recently (within last 3 days)
    const dismissedAt = localStorage.getItem("pwa_install_banner_dismissed_at");
    let isDismissedRecently = false;
    if (dismissedAt) {
      const timeDiff = Date.now() - parseInt(dismissedAt, 10);
      const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
      if (timeDiff < threeDaysInMs) {
        isDismissedRecently = true;
      }
    }

    // Determine whether to show the banner
    if (!isInstalled && !isDismissedRecently) {
      if (isInstallable || ios) {
        // Delay showing the banner slightly for better entry presentation
        const timer = setTimeout(() => setShowBanner(true), 2500);
        return () => clearTimeout(timer);
      }
    }
  }, [isInstallable, isInstalled]);

  const handleDismiss = () => {
    localStorage.setItem("pwa_install_banner_dismissed_at", Date.now().toString());
    setShowBanner(false);
  };

  const handleInstall = async () => {
    if (isIOS) return;
    const success = await installApp();
    if (success) {
      setShowBanner(false);
    }
  };

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="fixed bottom-[76px] md:bottom-6 left-4 right-4 md:left-auto md:right-6 md:w-96 z-30 p-4 rounded-xl border border-border/40 shadow-xl bg-background/95 backdrop-blur-md flex flex-col gap-3"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-snug">
                앱으로 더 편리하게 사용하세요
              </p>
              <p className="text-xs text-muted-foreground leading-normal mt-0.5">
                홈 화면에 추가하면 앱 스토어 없이 바로 실행할 수 있습니다.
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="p-1 rounded-full text-muted-foreground hover:bg-muted transition-colors cursor-pointer border-0 bg-transparent"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2 w-full mt-1">
          {isIOS ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs py-1.5 h-8 font-medium cursor-pointer"
                onClick={handleDismiss}
              >
                나중에 하기
              </Button>
              <Button
                size="sm"
                className="flex-1 text-xs py-1.5 h-8 font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5"
                asChild
              >
                <Link to="/install-guide" onClick={() => setShowBanner(false)}>
                  <Share className="w-3.5 h-3.5" />
                  설치 가이드 보기
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="flex-1 text-xs py-1.5 h-8 font-medium cursor-pointer"
                onClick={handleDismiss}
              >
                나중에 하기
              </Button>
              <Button
                size="sm"
                onClick={handleInstall}
                className="flex-1 text-xs py-1.5 h-8 font-semibold cursor-pointer bg-primary text-primary-foreground hover:bg-primary/95 flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                앱 설치하기
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
