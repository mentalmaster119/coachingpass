import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import {
  ShieldCheck,
  ShieldAlert,
  Award,
  Calendar,
  User,
  Search,
  Copy,
  Printer,
  ArrowLeft,
  CheckCircle2,
  Building2,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { toast } from "sonner";

export default function VerifyCertPage() {
  const { certNumber } = useParams<{ certNumber?: string }>();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState(certNumber || "");

  const certData = useQuery(
    api.smpcc.verifyCertification,
    certNumber ? { certId: certNumber } : "skip"
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = searchInput.trim();
    if (!clean) {
      toast.error("조회할 자격증 번호 또는 ID를 입력해 주세요.");
      return;
    }
    navigate(`/verify/${encodeURIComponent(clean)}`);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("공식 검증서 링크가 클립보드에 복사되었습니다.");
    } catch {
      toast.error("링크 복사에 실패했습니다.");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Case 1: No certNumber in URL (Root /verify landing search)
  if (!certNumber) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 text-center">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-sm">
            <Award className="w-9 h-9" />
          </div>

          <div className="space-y-1.5">
            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 text-xs mb-1">
              MCCI 공식 인증 원본 대조
            </Badge>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              SMPCC 자격 진위 확인
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground break-keep">
              사단법인 한국멘탈코칭센터가 공인한 스포츠멘탈코칭전문가(SMPCC) 자격증의 진위 여부를 실시간으로 조회합니다.
            </p>
          </div>

          <form onSubmit={handleSearch} className="space-y-3 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="예: MCCI-SMPCC-8A7B3C4D 또는 자격증 ID"
                className="pl-10 h-11 text-sm bg-background"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full h-11 gap-2 font-semibold">
              <Search className="w-4 h-4" /> 자격증 진위 검증하기
            </Button>
          </form>

          <div className="pt-4 border-t border-border/60 text-[11px] text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground/80">사단법인 한국멘탈코칭센터 (MCCI)</p>
            <p>Official Verification Portal · SMPCC Registry</p>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Loading State
  if (certData === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm font-medium text-foreground">자격 인증 정보를 조회하는 중입니다...</p>
          <p className="text-xs text-muted-foreground font-mono">{certNumber}</p>
        </div>
      </div>
    );
  }

  // Case 3: Invalid / Not Found State
  if (!certData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="max-w-md w-full bg-card border border-destructive/30 rounded-2xl p-6 sm:p-8 shadow-lg text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center shadow-xs">
            <ShieldAlert className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h1 className="text-lg font-bold text-foreground">유효하지 않은 자격 번호</h1>
            <p className="text-xs sm:text-sm text-muted-foreground break-keep">
              조회하신 자격 번호(<strong className="text-foreground font-mono">{certNumber}</strong>)는 한국멘탈코칭센터 자격 데이터베이스에 정식 등록되어 있지 않거나 입력 오류입니다.
            </p>
          </div>

          {/* Retry Search */}
          <form onSubmit={handleSearch} className="space-y-2 pt-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="올바른 자격 번호 재입력"
                className="pl-9 h-10 text-xs bg-background"
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full text-xs h-9 font-semibold">
              다시 조회하기
            </Button>
          </form>

          <div className="pt-2 border-t border-border/60 flex items-center justify-center gap-2">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs">
              <Link to="/">
                <ArrowLeft className="w-3.5 h-3.5" /> 홈으로 이동
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Case 4: Valid Verification Result
  const formattedCertNo = certData.formattedCertNo || `MCCI-SMPCC-${certData.certId.slice(-8).toUpperCase()}`;
  const verifiedTime = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-100 to-slate-200 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex flex-col items-center justify-center p-3 sm:p-6 print:p-0 print:bg-white">
      <div className="max-w-xl w-full bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden print:border-none print:shadow-none print:max-w-none">
        
        {/* Top Header */}
        <div className="bg-slate-900 text-white px-6 py-6 text-center relative border-b border-slate-800">
          <div className="w-12 h-12 mx-auto rounded-xl bg-white/10 flex items-center justify-center mb-3 shadow-sm">
            <Award className="w-7 h-7 text-amber-400" />
          </div>
          <p className="text-[11px] font-semibold text-amber-400 uppercase tracking-widest">
            Official Credential Verification Service
          </p>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
            MCCI-SMPCC 자격 진위 확인서
          </h1>
          <p className="text-xs text-slate-300 mt-1">
            사단법인 한국멘탈코칭센터 공인 스포츠멘탈코칭전문가
          </p>
        </div>

        <div className="p-5 sm:p-7 space-y-6">
          {/* Status Banner */}
          <div className={`p-4 rounded-xl border flex items-start sm:items-center gap-3.5 shadow-xs ${
            certData.isValid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
              : "bg-amber-500/10 border-amber-500/30 text-amber-950 dark:text-amber-200"
          }`}>
            {certData.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold">
                  {certData.isValid ? "공식 등록된 유효 자격 (Active)" : "자격 만료 / 갱신 필요 (Inactive)"}
                </span>
                <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                  certData.isValid
                    ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10"
                    : "border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/10"
                }`}>
                  {certData.isValid ? "정상 유효" : "만료"}
                </Badge>
              </div>
              <p className="text-xs opacity-90 break-keep">
                {certData.isValid
                  ? "본 자격은 한국멘탈코칭센터 정규 심사위원회의 공인 평가를 통과하여 중앙 데이터베이스에 정식 등록된 유효 자격입니다."
                  : "현재 자격 유지 유효기간이 만료되었거나 보수 교육/갱신 심사 대상입니다."}
              </p>
            </div>
          </div>

          {/* Certificate Detail Information */}
          <div className="rounded-xl border border-border/80 bg-muted/30 overflow-hidden text-sm">
            <div className="px-4 py-2.5 bg-muted/60 border-b border-border/60 flex items-center justify-between">
              <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" />
                공인 자격 세부 제원
              </span>
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Clock className="w-3 h-3" />
                조회일시: {verifiedTime}
              </span>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <Award className="w-4 h-4 text-amber-500" /> 자격증 등록번호
                </span>
                <span className="font-mono font-bold text-foreground text-xs sm:text-sm select-all">
                  {formattedCertNo}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <User className="w-4 h-4 text-primary" /> 공인 대상자
                </span>
                <div className="text-right">
                  <span className="font-bold text-foreground text-sm sm:text-base">
                    {certData.userName} <span className="font-medium text-xs text-muted-foreground">코치</span>
                  </span>
                  {certData.cohortName && (
                    <span className="block text-[11px] text-muted-foreground">
                      (소속: {certData.cohortName})
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <Sparkles className="w-4 h-4 text-purple-500" /> 공인 종목 및 등급
                </span>
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  스포츠 멘탈코칭 전문가 (SMPCC)
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="w-4 h-4 text-blue-500" /> 최초 자격 취득일
                </span>
                <span className="font-medium text-foreground text-xs sm:text-sm">
                  {certData.issuedAt}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" /> 자격 유효 만료일
                </span>
                <span className="font-medium text-foreground text-xs sm:text-sm">
                  {certData.expiresAt || "발급일로부터 3년"}
                </span>
              </div>

              <div className="flex items-center justify-between py-1.5">
                <span className="text-muted-foreground flex items-center gap-2 text-xs sm:text-sm">
                  <Building2 className="w-4 h-4 text-slate-500" /> 자격 주관 및 관리기관
                </span>
                <span className="font-semibold text-foreground text-xs sm:text-sm">
                  사단법인 한국멘탈코칭센터 (MCCI)
                </span>
              </div>
            </div>
          </div>

          {/* Official Verification Statement & Digital Seal */}
          <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-left space-y-1 max-w-sm">
              <p className="text-[11px] leading-relaxed text-muted-foreground break-keep">
                본 문서는 사단법인 한국멘탈코칭센터 자격관리 규정에 의거하여 전산 발행된 <strong>공식 전자 원본 확인서</strong>로서, 대외 기관 및 기업에 증빙 서류로 제출 시 법적 효력을 가집니다.
              </p>
              <p className="text-[10px] text-muted-foreground/60 font-mono">
                Verification UUID: {certData.certId}
              </p>
            </div>

            <div className="flex items-center gap-3 shrink-0 self-center sm:self-auto">
              <div className="text-right">
                <p className="text-xs font-bold text-foreground">한국멘탈코칭센터</p>
                <p className="text-[10px] text-muted-foreground">자격심사위원회</p>
              </div>
              <div className="w-12 h-12 rounded-full border-2 border-red-500/80 bg-red-500/10 flex items-center justify-center text-red-600 font-extrabold text-[11px] tracking-tight shadow-xs select-none">
                [직인]
              </div>
            </div>
          </div>

          {/* Action Buttons (Hidden in Print) */}
          <div className="pt-4 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 print:hidden">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyLink}
                className="text-xs h-9 gap-1.5 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" /> 링크 복사
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="text-xs h-9 gap-1.5 font-medium cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" /> 인쇄 / PDF 저장
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/verify")}
                className="text-xs h-9 cursor-pointer"
              >
                다른 자격증 조회
              </Button>
              <Button
                asChild
                variant="default"
                size="sm"
                className="text-xs h-9 cursor-pointer"
              >
                <Link to="/">홈으로</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
