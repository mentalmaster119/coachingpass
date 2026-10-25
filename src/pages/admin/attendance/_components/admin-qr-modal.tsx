import { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { useQuery } from "convex/react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import {
  QrCode,
  Maximize2,
  Minimize2,
  Copy,
  Download,
  Printer,
  CalendarDays,
  Clock,
  MapPin,
  CheckCircle2,
  Users,
  Sparkles,
  ExternalLink,
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
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

export interface SeminarForQr {
  _id: Id<"seminars">;
  title: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  isOnline?: boolean;
  cohortName?: string;
}

interface AdminQrModalProps {
  seminar: SeminarForQr | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminQrAttendanceDialog({
  seminar,
  open,
  onOpenChange,
}: AdminQrModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fullscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Available dates for multi-day seminars
  const dates = useMemo(() => {
    if (!seminar) return [];
    if (seminar.startDate === seminar.endDate) return [seminar.startDate];
    return [seminar.startDate, seminar.endDate];
  }, [seminar]);

  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Default to today if within seminar range, else startDate
  useEffect(() => {
    if (!seminar) return;
    if (dates.includes(today)) {
      setSelectedDate(today);
    } else {
      setSelectedDate(seminar.startDate);
    }
  }, [seminar, dates, today]);

  // Live attendees for this seminar
  const attendees = useQuery(
    api.attendance.getBySeminar,
    seminar ? { seminarId: seminar._id } : "skip",
  );

  const presentCount = useMemo(() => {
    if (!attendees || !selectedDate) return 0;
    return attendees.filter(
      (a) => (a.date === selectedDate || (!a.date && a.date === undefined)) && a.status === "present",
    ).length;
  }, [attendees, selectedDate]);

  // QR URL
  const qrUrl = useMemo(() => {
    if (!seminar || !selectedDate) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/attendance/qr-checkin?seminarId=${seminar._id}&date=${selectedDate}`;
  }, [seminar, selectedDate]);

  // Draw QR code on canvas
  useEffect(() => {
    if (!open || !qrUrl) return;

    const renderQr = (canvas: HTMLCanvasElement, size: number) => {
      QRCode.toCanvas(
        canvas,
        qrUrl,
        {
          width: size,
          margin: 2,
          color: {
            dark: "#090d16",
            light: "#ffffff",
          },
          errorCorrectionLevel: "H",
        },
        (err) => {
          if (err) console.error("QR Code generation error:", err);
        },
      );
    };

    if (canvasRef.current) {
      renderQr(canvasRef.current, 280);
    }
    if (fullscreenCanvasRef.current && isFullscreen) {
      renderQr(fullscreenCanvasRef.current, 440);
    }
  }, [open, qrUrl, isFullscreen]);

  if (!seminar) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(qrUrl);
      toast.success("출석 링크가 클립보드에 복사되었습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleDownloadQr = () => {
    const canvas = isFullscreen ? fullscreenCanvasRef.current : canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `출석QR_${seminar.title}_${selectedDate}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR 코드 이미지가 다운로드되었습니다.");
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL("image/png");
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("인쇄 창을 열 수 없습니다. 팝업 차단을 해제해 주세요.");
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${seminar.title} - 출석체크 QR</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; }
            h1 { font-size: 26px; margin-bottom: 8px; color: #1e293b; }
            p { font-size: 14px; color: #64748b; margin: 4px 0; }
            .date-badge { display: inline-block; padding: 4px 12px; background: #e0f2fe; color: #0284c7; border-radius: 9999px; font-weight: bold; margin: 12px 0 24px; }
            .qr-wrapper { display: inline-block; padding: 16px; border: 2px solid #e2e8f0; border-radius: 16px; margin: 16px 0; }
            .qr-img { width: 320px; height: 320px; }
            .guide { margin-top: 24px; font-size: 15px; color: #334155; line-height: 1.6; }
            .url { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 16px; }
          </style>
        </head>
        <body>
          <h1>${seminar.title}</h1>
          <div class="date-badge">출석 일자: ${selectedDate}</div>
          <div class="qr-wrapper">
            <img class="qr-img" src="${dataUrl}" alt="출석 QR" />
          </div>
          <div class="guide">
            <strong>스마트폰 기본 카메라</strong> 또는 <strong>Coachingpass 앱</strong>으로 QR 코드를 비추면<br/>
            자동으로 출석이 완료됩니다.
          </div>
          <div class="url">${qrUrl}</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <>
      {/* ── Standard Dialog ── */}
      <Dialog open={open && !isFullscreen} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader className="space-y-1.5 text-center sm:text-left">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                <QrCode className="w-3.5 h-3.5" />
                현장 세미나 출석 QR
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                onClick={() => setIsFullscreen(true)}
                title="강의실 빔프로젝터 전체화면 모드"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                전체화면
              </Button>
            </div>
            <DialogTitle className="text-lg font-bold text-foreground">
              {seminar.title}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              교육생이 스마트폰 카메라 또는 앱 내 [📷 QR 출석]으로 비추면 실시간 자동 출석됩니다.
            </DialogDescription>
          </DialogHeader>

          {/* Multi-day date selector */}
          {dates.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {dates.map((d, idx) => (
                <Button
                  key={d}
                  variant={selectedDate === d ? "default" : "outline"}
                  size="sm"
                  className="h-7 text-xs font-medium"
                  onClick={() => setSelectedDate(d)}
                >
                  {idx + 1}일차 ({format(parseISO(d), "M/d (E)", { locale: ko })})
                  {d === today && " · 오늘"}
                </Button>
              ))}
            </div>
          )}

          {/* QR Display Card */}
          <div className="flex flex-col items-center justify-center py-3">
            <div className="p-3 bg-white rounded-2xl shadow-sm border-2 border-primary/20 relative group">
              <canvas ref={canvasRef} className="block rounded-lg" />
              <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-center justify-center pointer-events-none">
                <span className="text-xs font-semibold bg-background/90 text-foreground px-3 py-1.5 rounded-full shadow-sm">
                  스마트폰 카메라로 스캔
                </span>
              </div>
            </div>

            {/* Attendance & Session info */}
            <div className="w-full mt-4 p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-primary" />
                  출석 적용 일자
                </span>
                <span className="font-semibold text-foreground">
                  {selectedDate && format(parseISO(selectedDate), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                </span>
              </div>
              <div className="flex items-center justify-between font-medium">
                <span className="text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  실시간 출석 완료
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {presentCount}명 완료
                </span>
              </div>
              {seminar.location && (
                <div className="flex items-center justify-between text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    장소
                  </span>
                  <span className="truncate max-w-[200px] text-foreground">{seminar.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={handleCopyLink}
            >
              <Copy className="w-3.5 h-3.5" />
              링크 복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={handleDownloadQr}
            >
              <Download className="w-3.5 h-3.5" />
              이미지 저장
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-xs h-8 gap-1.5"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5" />
              QR 인쇄
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Fullscreen Beam Projector Mode ── */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-200">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsFullscreen(false)}
            className="absolute top-6 right-6 h-9 px-3 gap-1.5 bg-background shadow-sm text-xs font-semibold"
          >
            <Minimize2 className="w-4 h-4" />
            전체화면 닫기 (ESC)
          </Button>

          <div className="max-w-2xl w-full space-y-4">
            <div className="space-y-1.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary text-primary-foreground">
                <Sparkles className="w-3.5 h-3.5" />
                MCCI-SMPCC 세미나 현장 출석
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
                {seminar.title}
              </h1>
              <p className="text-base text-muted-foreground font-medium">
                {selectedDate && format(parseISO(selectedDate), "yyyy년 M월 d일 (EEEE)", { locale: ko })}
                {seminar.startTime && ` · ${seminar.startTime}`}
                {seminar.location && ` · ${seminar.location}`}
              </p>
            </div>

            {/* Giant QR Canvas */}
            <div className="inline-block p-5 bg-white rounded-3xl shadow-xl border-4 border-primary/20">
              <canvas ref={fullscreenCanvasRef} className="block rounded-xl mx-auto" />
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-base font-semibold text-foreground">
                스마트폰 기본 카메라 또는 Coachingpass 앱으로 QR 코드를 비춰주세요.
              </p>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                현재 실시간 출석: {presentCount}명 완료
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
