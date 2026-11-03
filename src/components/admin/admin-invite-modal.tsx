import { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import { useQuery } from "convex/react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select.tsx";
import {
  Mail,
  Copy,
  Download,
  Printer,
  ExternalLink,
  Sparkles,
  QrCode,
  Share2,
  Check,
  GraduationCap,
  MessageSquare,
  Smartphone,
} from "lucide-react";
import { toast } from "sonner";

interface AdminInviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialCohortId?: Id<"cohorts">;
}

export default function AdminInviteModal({
  open,
  onOpenChange,
  initialCohortId,
}: AdminInviteModalProps) {
  const cohorts = useQuery(api.cohorts.list, {});
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Active cohort or 18기 by default
  const defaultCohortId = useMemo(() => {
    if (initialCohortId) return initialCohortId;
    if (!cohorts || cohorts.length === 0) return "";
    const active =
      cohorts.find((c) => c.status === "active") ||
      cohorts.find((c) => c.name.includes("18기")) ||
      cohorts[0];
    return active?._id ?? "";
  }, [cohorts, initialCohortId]);

  const [selectedCohortId, setSelectedCohortId] = useState<string>("");

  useEffect(() => {
    if (open && defaultCohortId) {
      setSelectedCohortId(defaultCohortId);
    }
  }, [open, defaultCohortId]);

  const selectedCohort = useMemo(() => {
    if (!cohorts) return null;
    return cohorts.find((c) => c._id === selectedCohortId) || null;
  }, [cohorts, selectedCohortId]);

  const isGeneral = selectedCohortId === "general";

  // Invite URL
  const inviteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    const origin = window.location.origin;
    if (selectedCohortId && selectedCohortId !== "general") {
      return `${origin}/invite?cohortId=${selectedCohortId}`;
    }
    return `${origin}/invite`;
  }, [selectedCohortId]);

  // KakaoTalk / SMS text template
  const inviteText = useMemo(() => {
    if (isGeneral) {
      return `[MCCI-SMPCC] 멘탈코칭 전문가 과정 동문 공식 초대장 💌

안녕하세요, MCCI-SMPCC 수료 코치님!
16기 이전 수료 코치님 및 전 기수 동문 여러분의 지속적인 코칭 실습일지 작성과 자격증 관리를 위해 MCCI 공식 웹앱(Coachingpass)에 초대합니다.

✨ 주요 혜택 및 기능:
• 코칭 실습일지 기록 및 6대 역량 AI 품질 분석 피드백
• SMPCC / KPC 자격증 이수 요건 및 실습 시간 실시간 집계
• MCCI 세미나 및 동문 포럼 일정 확인
• 멘토코칭 및 동문 코치 네트워크 연동

🔗 동문 공식 참가 신청 링크:
${inviteUrl}
(가입 페이지에서 본인의 소속 기수를 선택해 주세요)

📱 앱 설치 안내 (간편 홈 화면 추가):
링크 접속 후 브라우저(Safari/Chrome) 메뉴에서 '홈 화면에 추가'를 누르시면 앱스토어 설치 없이 스마트폰 앱처럼 바로 편리하게 사용하실 수 있습니다!`;
    }

    const name = selectedCohort ? selectedCohort.name : "18기";
    return `[MCCI-SMPCC] ${name} 멘탈코칭 전문가 과정 공식 초대장 💌

안녕하세요, ${name} 코치님!
MCCI-SMPCC 멘탈코칭 전문가 과정 공식 웹앱(Coachingpass)에 초대합니다.

✨ 주요 혜택 및 기능:
• 실시간 세미나 출석 및 일정 관리
• 코칭 실습일지 작성 및 6대 역량 AI 품질 분석 피드백
• SMPCC / KPC 자격증 이수 요건 실시간 트래킹
• 멘토코칭 및 스터디 조 편성 연동

🔗 ${name} 참가 신청 및 가입 링크:
${inviteUrl}

📱 앱 설치 안내 (간편 홈 화면 추가):
링크 접속 후 브라우저(Safari/Chrome) 메뉴에서 '홈 화면에 추가'를 누르시면 앱스토어 설치 없이 스마트폰 앱처럼 바로 사용하실 수 있습니다!`;
  }, [isGeneral, selectedCohort, inviteUrl]);

  // Render QR Code
  useEffect(() => {
    if (!open || !inviteUrl || !canvasRef.current) return;

    QRCode.toCanvas(
      canvasRef.current,
      inviteUrl,
      {
        width: 180,
        margin: 2,
        color: {
          dark: "#090d16",
          light: "#ffffff",
        },
        errorCorrectionLevel: "H",
      },
      (err) => {
        if (err) console.error("Invite QR Code error:", err);
      },
    );
  }, [open, inviteUrl]);

  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      toast.success("초대 링크가 복사되었습니다!");
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(inviteText);
      setCopiedText(true);
      toast.success("카카오톡/문자용 초대 문구가 복사되었습니다!");
      setTimeout(() => setCopiedText(false), 2000);
    } catch {
      toast.error("문구 복사에 실패했습니다.");
    }
  };

  const handleDownloadQr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const name = isGeneral ? "동문통합초대장" : (selectedCohort ? selectedCohort.name : "신규기수");
    const link = document.createElement("a");
    link.download = `Coachingpass_초대QR_${name}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    toast.success("QR 코드 이미지가 저장되었습니다.");
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const name = isGeneral ? "동문 통합 공식 초대장" : (selectedCohort ? `${selectedCohort.name} 공식 초대장` : "신규 기수 초대장");
    const badgeText = isGeneral ? "🏛️ 16기 이전 및 전체 동문 초대장" : (selectedCohort ? `${selectedCohort.name} 공식 초대장` : "공식 초대장");
    const descText = isGeneral
      ? "스마트폰 기본 카메라로 QR 코드를 비추시면<br/><strong>MCCI-SMPCC 동문 공식 가입 페이지</strong>로 바로 연결되며, 가입 시 소속 기수를 선택하실 수 있습니다."
      : `스마트폰 기본 카메라로 QR 코드를 비추시면<br/><strong>${selectedCohort?.name ?? ""} 공식 가입 페이지</strong>로 바로 연결됩니다.`;

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
          <title>${name} - MCCI-SMPCC</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px 20px; }
            h1 { font-size: 26px; color: #1e293b; margin-bottom: 6px; }
            .badge { display: inline-block; padding: 4px 14px; background: #e0f2fe; color: #0284c7; border-radius: 999px; font-weight: bold; font-size: 14px; margin-bottom: 20px; }
            .qr-box { display: inline-block; padding: 16px; border: 2px solid #e2e8f0; border-radius: 20px; margin: 16px 0; background: #fff; }
            .qr-img { width: 280px; height: 280px; }
            .desc { font-size: 15px; color: #475569; line-height: 1.6; margin-top: 20px; }
            .install-tip { margin-top: 18px; padding: 12px; background: #f8fafc; border-radius: 12px; font-size: 13px; color: #64748b; display: inline-block; }
            .url { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 20px; }
          </style>
        </head>
        <body>
          <h1>MCCI-SMPCC 멘탈코칭 전문가 과정</h1>
          <div class="badge">${badgeText}</div>
          <div>
            <div class="qr-box">
              <img class="qr-img" src="${dataUrl}" alt="가입 QR" />
            </div>
          </div>
          <div class="desc">${descText}</div>
          <div class="install-tip">
            💡 가입 후 브라우저 메뉴에서 <strong>'홈 화면에 추가'</strong>를 누르시면 앱처럼 편리하게 사용하실 수 있습니다.
          </div>
          <div class="url">${inviteUrl}</div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5 text-left">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
              <Mail className="w-3.5 h-3.5" />
              신규 코치 초대장 관리
            </span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isGeneral ? "동문 통합 가입 초대장 발행 및 공유" : "기수별 가입 초대장 발행 및 공유"}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {isGeneral
              ? "16기 이전 수료 코치님 및 전체 동문 대상 초대 링크, 추천 공지 문구, 인쇄용 QR을 생성합니다."
              : "새 기수 코치들에게 전달할 모바일 초대 링크와 카카오톡 공지 문구, 인쇄용 QR을 생성합니다."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* 1. Cohort selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-primary" />
              초대 대상 기수 선택
            </label>
            <Select
              value={selectedCohortId}
              onValueChange={(val) => setSelectedCohortId(val)}
            >
              <SelectTrigger className="w-full h-9 text-xs sm:text-sm font-medium bg-background">
                <SelectValue placeholder="기수 선택..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general" className="font-semibold text-primary">
                  <div className="flex items-center gap-2">
                    <span>🏛️ 16기 이전 / 전체 동문 통합 초대장</span>
                    <Badge variant="secondary" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                      가입 시 기수 직접 선택
                    </Badge>
                  </div>
                </SelectItem>
                <div className="my-1 border-t border-border/50" />
                <div className="px-2 py-1 text-[11px] font-semibold text-muted-foreground">
                  기수별 전용 초대장
                </div>
                {cohorts?.map((c) => (
                  <SelectItem key={c._id} value={c._id}>
                    <div className="flex items-center gap-2">
                      <span>{c.name}</span>
                      {c.status === "active" && (
                        <span className="text-[11px] text-emerald-600 font-semibold">(현재 진행중)</span>
                      )}
                      {c.status === "upcoming" && (
                        <span className="text-[11px] text-muted-foreground">(예정)</span>
                      )}
                      {c.status === "completed" && (
                        <span className="text-[11px] text-muted-foreground">(수료)</span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Direct Invite URL Card */}
          <div className="p-3.5 rounded-xl bg-muted/40 border border-border/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5 text-primary" />
                {isGeneral ? "동문 통합 모바일 초대 링크" : "기수 전용 모바일 초대 링크"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[11px] px-2 gap-1 text-primary hover:text-primary hover:bg-primary/10"
                onClick={() => window.open(inviteUrl, "_blank")}
              >
                <span>미리보기</span>
                <ExternalLink className="w-3 h-3" />
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <input
                readOnly
                value={inviteUrl}
                className="flex-1 h-8 px-2.5 rounded-lg border border-border bg-background text-xs text-foreground font-mono truncate"
              />
              <Button
                size="sm"
                className="h-8 px-3 text-xs gap-1.5 shrink-0"
                onClick={handleCopyLink}
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedLink ? "복사됨" : "링크 복사"}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              {isGeneral ? (
                <span>* <strong>16기 이전 수료 코치님 및 동문용 링크</strong>입니다. 코치가 가입 시 본인의 소속 기수를 직접 선택합니다.</span>
              ) : (
                <span>* 위 링크로 가입한 코치는 자동으로 <strong>{selectedCohort?.name ?? "선택 기수"}</strong>로 등록 배정됩니다. (가입 시 변경 가능)</span>
              )}
            </p>
          </div>

          {/* 3. KakaoTalk / Message Template Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-primary" />
                카카오톡 / 문자 공지용 추천 문구
              </label>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                onClick={handleCopyText}
              >
                {copiedText ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedText ? "문구 복사됨" : "전체 문구 복사"}
              </Button>
            </div>
            <div className="relative">
              <textarea
                readOnly
                value={inviteText}
                rows={7}
                className="w-full p-3 rounded-xl border border-border bg-muted/30 text-xs text-foreground font-sans leading-relaxed resize-none focus:outline-none"
              />
            </div>
          </div>

          {/* 4. QR Code & Offline Distribution */}
          <div className="p-3.5 rounded-xl bg-card border border-border/70 flex flex-col sm:flex-row items-center gap-4">
            <div className="p-2 bg-white rounded-xl shadow-xs border border-border shrink-0">
              <canvas ref={canvasRef} className="block rounded" />
            </div>
            <div className="flex-1 space-y-2 text-center sm:text-left min-w-0">
              <div>
                <p className="text-xs font-bold text-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <QrCode className="w-3.5 h-3.5 text-primary" />
                  현장 배포 및 PPT용 QR 코드
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  개강식/오리엔테이션 PPT 화면에 띄우거나 출력물에 인쇄하여 코치들이 즉석에서 가입하도록 안내하세요.
                </p>
              </div>
              <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handleDownloadQr}
                >
                  <Download className="w-3 h-3" />
                  QR 이미지 저장
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  onClick={handlePrint}
                >
                  <Printer className="w-3 h-3" />
                  인쇄용 출력
                </Button>
              </div>
            </div>
          </div>

          {/* 5. Mobile App Install Guide Hint */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5">
            <Smartphone className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-[11px] text-amber-900 dark:text-amber-300 leading-relaxed">
              <span className="font-semibold">초대장 내 앱 설치 안내문 포함:</span> 코치가 초대장 링크를 열면 상단에서 바로 스마트폰 홈 화면에 바로가기 앱을 추가(PWA)할 수 있는 가이드가 함께 제공됩니다.
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
