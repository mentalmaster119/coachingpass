import { useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Award, Printer, Copy, ExternalLink, CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

export interface CertificateModalData {
  certId: string;
  userName: string;
  cohortName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  isValid?: boolean;
}

interface CertificateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: CertificateModalData | null;
}

export default function CertificateModal({ open, onOpenChange, data }: CertificateModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const verificationUrl = typeof window !== "undefined" && data
    ? `${window.location.origin}/verify/${data.certId}`
    : "";

  useEffect(() => {
    if (!open || !verificationUrl || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      verificationUrl,
      {
        width: 110,
        margin: 1,
        color: {
          dark: "#0f172a",
          light: "#ffffff",
        },
        errorCorrectionLevel: "M",
      },
      (err) => {
        if (err) console.error("Certificate QR generation error:", err);
      }
    );
  }, [open, verificationUrl]);

  if (!data) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      toast.success("공식 자격 검증 링크가 클립보드에 복사되었습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formattedCertNo = `MCCI-SMPCC-${data.certId.slice(-8).toUpperCase()}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 print:p-0 print:border-none print:shadow-none print:max-w-none">
        <DialogHeader className="print:hidden">
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-amber-500" />
              <DialogTitle className="text-lg font-bold">MCCI-SMPCC 공인 자격증</DialogTitle>
            </div>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 text-xs">
              <Sparkles className="w-3 h-3 mr-1" />
              공식 발급본
            </Badge>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            정규 수료 사정 및 인증 평가를 통과한 코치에게 발급되는 공식 디지털 자격 증서입니다.
          </DialogDescription>
        </DialogHeader>

        {/* ── Certificate Body (Printable Area) ── */}
        <div id="printable-certificate" className="mt-2 rounded-2xl border-4 border-double border-amber-600/30 bg-gradient-to-b from-amber-500/[0.04] via-card to-amber-500/[0.07] dark:bg-card p-6 sm:p-8 relative shadow-md">
          {/* Subtle Corner Accents */}
          <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-amber-600/40 rounded-tl-md pointer-events-none" />
          <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-amber-600/40 rounded-tr-md pointer-events-none" />
          <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-amber-600/40 rounded-bl-md pointer-events-none" />
          <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-amber-600/40 rounded-br-md pointer-events-none" />

          {/* Header */}
          <div className="text-center space-y-1 pb-6 border-b border-border/60">
            <p className="text-[11px] sm:text-xs tracking-widest text-muted-foreground uppercase font-semibold">
              Mental Coaching Center of Institute · Korea
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground pt-1">
              자 격 인 증 서
            </h2>
            <p className="text-xs sm:text-sm font-serif tracking-wider text-amber-700 dark:text-amber-400 font-semibold">
              CERTIFICATE OF SPORTS MENTAL PERFORMANCE COACH (SMPCC)
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-mono pt-1">
              등록번호: {formattedCertNo}
            </p>
          </div>

          {/* Coach Details */}
          <div className="py-6 sm:py-8 space-y-4 text-center">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">성 명</span>
              <p className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
                {data.userName} <span className="text-lg font-medium text-muted-foreground">코치</span>
              </p>
              {data.cohortName && (
                <p className="text-xs text-muted-foreground font-medium">
                  (소속: {data.cohortName})
                </p>
              )}
            </div>

            {/* Official Certification Statement */}
            <div className="max-w-md mx-auto pt-3 px-2">
              <p className="text-xs sm:text-sm leading-relaxed text-foreground/85 font-medium break-keep text-center">
                위 코치는 한국멘탈코칭센터가 주관하는 SMPCC 멘탈코칭 전문가 양성 과정을 성실히 이수하고,
                소정의 코칭 실습 시간 및 공인 역량 평가 기준을 충족하여 자격 심사를 통과하였으므로
                본 공인 자격증을 수여합니다.
              </p>
            </div>

            {/* Dates */}
            <div className="pt-2 flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>발급일자: <strong className="text-foreground">{data.issuedAt}</strong></span>
              <span>·</span>
              <span>유효만료: <strong className="text-foreground">{data.expiresAt || "발급일로부터 3년"}</strong></span>
            </div>
          </div>

          {/* Bottom Area: QR code + Official Seal */}
          <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Live QR verification code */}
            <div className="flex items-center gap-3 bg-card p-2 rounded-xl border border-border/80 shadow-xs">
              <canvas ref={canvasRef} className="rounded-md shrink-0" />
              <div className="text-left space-y-0.5">
                <span className="text-[11px] font-bold text-foreground flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                  온라인 원본 대조
                </span>
                <p className="text-[10px] text-muted-foreground leading-tight max-w-[140px]">
                  스마트폰 카메라로 스캔하여 MCCI 자격 공식 검증 페이지로 즉시 이동합니다.
                </p>
              </div>
            </div>

            {/* Official Issuer & Seal */}
            <div className="text-center sm:text-right space-y-1">
              <p className="text-xs font-semibold text-muted-foreground tracking-wide">
                사단법인 한국멘탈코칭센터
              </p>
              <div className="flex items-center justify-center sm:justify-end gap-2 pt-0.5">
                <span className="text-sm font-bold text-foreground">대표 멘탈코치</span>
                <div className="w-10 h-10 rounded-full border-2 border-red-500 bg-red-500/10 flex items-center justify-center text-red-600 font-extrabold text-[10px] tracking-tight shadow-xs select-none">
                  [직인]
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog Actions (hidden in print) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-border/60 print:hidden">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="gap-1.5 text-xs h-9 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              검증 링크 복사
            </Button>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="gap-1.5 text-xs h-9 cursor-pointer"
            >
              <a href={verificationUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5" />
                검증 페이지 열기
              </a>
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 text-xs h-9 font-semibold cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              인쇄 / PDF 출력
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-xs h-9 cursor-pointer"
            >
              닫기
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
