import { useParams, Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { ShieldCheck, ShieldAlert, Award, Calendar, User, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

export default function VerifyCertPage() {
  const { certNumber } = useParams<{ certNumber: string }>();
  const certData = useQuery(api.smpcc.verifyCertification, { certId: certNumber || "" });

  if (certData === undefined) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 border-3 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground">자격 인증 정보를 조회하는 중입니다...</p>
        </div>
      </div>
    );
  }

  if (!certData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-card border border-border rounded-2xl p-6 shadow-sm text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground">유효하지 않은 자격 번호</h1>
            <p className="text-sm text-muted-foreground mt-1">
              조회하신 자격증 번호(<span className="font-mono font-semibold">{certNumber}</span>)는 등록되어 있지 않거나 잘못된 링크입니다.
            </p>
          </div>
          <div className="pt-2">
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/">
                <ArrowLeft className="w-4 h-4" /> 홈으로 이동
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="max-w-lg w-full bg-card border border-border/80 rounded-2xl shadow-xl overflow-hidden">
        {/* Top Header */}
        <div className="bg-primary/95 text-primary-foreground px-6 py-6 text-center relative">
          <div className="w-12 h-12 mx-auto rounded-xl bg-primary-foreground/15 flex items-center justify-center mb-3">
            <Award className="w-7 h-7 text-amber-400" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">MCCI-SMPCC 자격 인증 검증</h1>
          <p className="text-xs text-primary-foreground/80 mt-1">
            한국멘탈코칭센터 공인 멘탈코칭전문가(SMPCC)
          </p>
        </div>

        {/* Status Badge */}
        <div className="p-6 space-y-6">
          <div className={`p-4 rounded-xl border flex items-center gap-3.5 ${
            certData.isValid
              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
              : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
          }`}>
            {certData.isValid ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
            ) : (
              <ShieldAlert className="w-6 h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" />
            )}
            <div>
              <p className="text-sm font-bold">
                {certData.isValid ? "공식 인증된 유효 자격 (Active)" : "만료 또는 갱신 필요 (Inactive)"}
              </p>
              <p className="text-xs opacity-85">
                {certData.isValid
                  ? "본 자격은 한국멘탈코칭센터 심사를 통과하여 정식 등록된 유효 자격입니다."
                  : "현재 자격 유지 기간이 만료되었거나 갱신 절차가 필요합니다."}
              </p>
            </div>
          </div>

          {/* Details Table */}
          <div className="space-y-3 bg-muted/40 p-4 rounded-xl border border-border/60 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> 코치 성명
              </span>
              <span className="font-bold text-foreground">{certData.userName} 코치</span>
            </div>

            {certData.cohortName && (
              <div className="flex items-center justify-between py-1.5 border-b border-border/40">
                <span className="text-muted-foreground">소속 기수</span>
                <span className="font-semibold text-foreground">{certData.cohortName}</span>
              </div>
            )}

            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Award className="w-4 h-4" /> 자격 종목
              </span>
              <span className="font-semibold text-foreground">SMPCC (스포츠 멘탈코칭 전문가)</span>
            </div>

            <div className="flex items-center justify-between py-1.5 border-b border-border/40">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> 취득 일자
              </span>
              <span className="font-medium text-foreground">{certData.issuedAt}</span>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="text-muted-foreground">유효 만료일</span>
              <span className="font-medium text-foreground">{certData.expiresAt || "영구"}</span>
            </div>
          </div>

          {/* Seal / Footer Notice */}
          <div className="text-center pt-2 text-xs text-muted-foreground space-y-1">
            <p className="font-semibold text-foreground/80">한국멘탈코칭연구원 (MCCI)</p>
            <p className="text-[11px]">Korea Mental Coaching Center Official Certification Register</p>
            <p className="text-[10px] text-muted-foreground/60 font-mono mt-2">
              Cert Verification Key: {certData.certId}
            </p>
          </div>

          <div className="pt-2">
            <Button asChild variant="outline" className="w-full text-xs">
              <Link to="/">MCCI-SMPCC 코칭패스 홈으로</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
