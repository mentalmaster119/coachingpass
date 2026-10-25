import { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { useMutation } from "convex/react";
import {
  Camera,
  X,
  Upload,
  AlertCircle,
  Sparkles,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { toast } from "sonner";
import { ConvexError } from "convex/values";

interface QrScannerModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (result: {
    seminarTitle: string;
    date: string;
    alreadyCheckedIn: boolean;
    checkedInAt: string;
  }) => void;
}

export default function QrScannerModal({
  open,
  onOpenChange,
  onSuccess,
}: QrScannerModalProps) {
  const qrCheckIn = useMutation(api.attendance.qrCheckIn);
  const [isProcessing, setIsProcessing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const containerId = "coachingpass-qr-reader";

  // Parse seminarId and date from decoded string
  const parseQrText = (decodedText: string) => {
    try {
      // 1. If it's a URL
      if (decodedText.includes("seminarId=")) {
        const url = new URL(decodedText);
        const seminarId = url.searchParams.get("seminarId");
        const date = url.searchParams.get("date");
        const code = url.searchParams.get("code") || undefined;
        if (seminarId && date) {
          return { seminarId: seminarId as Id<"seminars">, date, code };
        }
      }

      // 2. If it's JSON
      if (decodedText.startsWith("{")) {
        const data = JSON.parse(decodedText);
        if (data.seminarId && data.date) {
          return {
            seminarId: data.seminarId as Id<"seminars">,
            date: data.date as string,
            code: data.code as string | undefined,
          };
        }
      }

      // 3. If it's query string format
      const params = new URLSearchParams(decodedText);
      const sId = params.get("seminarId");
      const d = params.get("date");
      if (sId && d) {
        return { seminarId: sId as Id<"seminars">, date: d, code: params.get("code") || undefined };
      }
    } catch (e) {
      console.error("QR parse error:", e);
    }
    return null;
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return;

    const parsed = parseQrText(decodedText);
    if (!parsed) {
      toast.error("올바른 Coachingpass 세미나 출석 QR 코드가 아닙니다.");
      return;
    }

    setIsProcessing(true);

    // Stop scanning immediately
    try {
      if (html5QrCodeRef.current?.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch {
      // ignore stop error
    }

    // Vibrate device
    try {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) {
        navigator.vibrate([60, 60, 100]);
      }
    } catch {}

    try {
      const res = await qrCheckIn({
        seminarId: parsed.seminarId,
        date: parsed.date,
        code: parsed.code,
      });

      onOpenChange(false);
      onSuccess({
        seminarTitle: res.seminarTitle,
        date: res.date,
        alreadyCheckedIn: res.alreadyCheckedIn,
        checkedInAt: res.checkedInAt,
      });
    } catch (err: unknown) {
      let msg = "출석 체크 처리 중 오류가 발생했습니다.";
      if (err instanceof ConvexError) {
        msg = (err.data as { message: string }).message;
      } else if (err instanceof Error) {
        msg = err.message;
      }
      toast.error(msg);
      // Restart scanning after error
      startScanner();
    } finally {
      setIsProcessing(false);
    }
  };

  const startScanner = async () => {
    setCameraError(null);
    try {
      // Wait for element to mount
      await new Promise((resolve) => setTimeout(resolve, 150));
      const element = document.getElementById(containerId);
      if (!element) return;

      if (!html5QrCodeRef.current) {
        html5QrCodeRef.current = new Html5Qrcode(containerId);
      }

      if (html5QrCodeRef.current.isScanning) {
        return;
      }

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        handleScanSuccess,
        () => {
          // ignore scan frame errors
        },
      );
      setIsScanning(true);
    } catch (err: any) {
      console.warn("Camera start warning:", err);
      setCameraError(
        "카메라에 접근할 수 없습니다. 카메라 권한을 허용해 주시거나 '사진으로 인식'을 이용해 주세요.",
      );
      setIsScanning(false);
    }
  };

  const stopScanner = async () => {
    try {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        await html5QrCodeRef.current.stop();
      }
    } catch (err) {
      console.warn("Camera stop warning:", err);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    if (open) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => {
      stopScanner();
    };
  }, [open]);

  // Fallback: Scan from image file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(containerId);
        html5QrCodeRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, true);
      await handleScanSuccess(decodedText);
    } catch {
      toast.error("사진에서 QR 코드를 인식하지 못했습니다. 더 선명한 사진을 선택해 주세요.");
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-5 overflow-hidden">
        <DialogHeader className="text-center sm:text-left">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Camera className="w-3.5 h-3.5" />
              실시간 출석 QR 스캔
            </span>
          </div>
          <DialogTitle className="text-lg font-bold text-foreground mt-1">
            강의실 출석 QR 코드를 비춰주세요
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            화면의 사각형 영역 안에 강의장 빔프로젝터 또는 태블릿의 QR 코드를 맞추면 즉시 출석됩니다.
          </DialogDescription>
        </DialogHeader>

        {/* Video Viewport Container */}
        <div className="relative w-full aspect-square max-w-[320px] mx-auto rounded-2xl overflow-hidden bg-black/90 border-2 border-primary/40 shadow-inner flex items-center justify-center my-2">
          <div id={containerId} className="w-full h-full object-cover" />

          {/* Targeting Overlay Frame */}
          {isScanning && !cameraError && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
              <div className="w-48 h-48 border-2 border-primary rounded-2xl relative shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-5 h-5 border-t-4 border-l-4 border-primary rounded-tl-lg" />
                <div className="absolute -top-1 -right-1 w-5 h-5 border-t-4 border-r-4 border-primary rounded-tr-lg" />
                <div className="absolute -bottom-1 -left-1 w-5 h-5 border-b-4 border-l-4 border-primary rounded-bl-lg" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 border-b-4 border-r-4 border-primary rounded-br-lg" />

                {/* Animated scan bar */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-pulse absolute top-1/2 -translate-y-1/2" />
              </div>
            </div>
          )}

          {/* Loading / Processing Indicator */}
          {isProcessing && (
            <div className="absolute inset-0 bg-background/80 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-20">
              <RefreshCw className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm font-semibold text-foreground">출석 확인 중...</p>
            </div>
          )}

          {/* Camera Error Message */}
          {cameraError && (
            <div className="absolute inset-0 bg-background/90 p-4 flex flex-col items-center justify-center text-center gap-3 z-10">
              <AlertCircle className="w-8 h-8 text-amber-500" />
              <p className="text-xs text-muted-foreground leading-relaxed">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                className="text-xs gap-1.5"
                onClick={startScanner}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                카메라 다시 시도
              </Button>
            </div>
          )}
        </div>

        {/* Fallback buttons */}
        <div className="flex items-center justify-between gap-2 pt-2">
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full text-xs gap-1.5 h-9"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
          >
            <Upload className="w-3.5 h-3.5" />
            사진(앨범)에서 QR 인식
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs h-9 px-3"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
