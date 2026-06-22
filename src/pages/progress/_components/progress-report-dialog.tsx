import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { FileDown, Printer } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";

type User = Doc<"users">;

type ProgressData = {
  approvedEducationHours: number;
  approvedCoachingHours: number;
  educationPendingCount: number;
  coachingPendingCount: number;
  monthlyActivity: { month: string; educationHours: number; coachingHours: number }[];
  recentActivity: {
    type: "education" | "coaching";
    date: string;
    title: string;
    hours: number;
    status: "pending" | "approved" | "rejected" | "draft";
  }[];
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
  progress: ProgressData;
};

const KAC = { education: 60, coaching: 100 };
const KPC = { education: 125, coaching: 500 };

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  pending: { label: "검토중", color: "#b45309" },
  approved: { label: "승인됨", color: "#15803d" },
  rejected: { label: "반려됨", color: "#dc2626" },
};

// ── Report document ────────────────────────────────────────────────────────────
function ReportContent({ user, progress }: Omit<Props, "open" | "onOpenChange">) {
  const today = format(new Date(), "yyyy년 MM월 dd일 (EEE)", { locale: ko });
  const goal = user.certificationGoal ?? "KAC";
  const targets = goal === "KPC" ? KPC : KAC;

  const educationPct = Math.min(
    Math.round((progress.approvedEducationHours / targets.education) * 100), 100,
  );
  const coachingPct = Math.min(
    Math.round((progress.approvedCoachingHours / targets.coaching) * 100), 100,
  );
  const overallPct = Math.round((educationPct + coachingPct) / 2);

  const educationDone = progress.approvedEducationHours >= targets.education;
  const coachingDone = progress.approvedCoachingHours >= targets.coaching;

  const recentApproved = progress.recentActivity.filter((a) => a.status === "approved").slice(0, 15);

  const CELLS = [
    { label: "종합 진행률", value: `${overallPct}%`, color: "#1e3a5f" },
    { label: "교육 이수", value: `${Math.round(progress.approvedEducationHours * 10) / 10}/${targets.education}시간`, color: "#15803d" },
    { label: "코칭 실습", value: `${Math.round(progress.approvedCoachingHours * 10) / 10}/${targets.coaching}시간`, color: "#1d4ed8" },
    { label: "목표 자격증", value: goal, color: "#7e22ce" },
  ];

  return (
    <div
      style={{
        fontFamily:
          "'Pretendard Variable', Pretendard, 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
        fontSize: "12px",
        color: "#111827",
        background: "#fff",
        padding: "24px",
        minHeight: "297mm",
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #1e3a5f", paddingBottom: "14px", marginBottom: "16px" }}>
        <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px" }}>
          한국코치협회 (KCA) · Korea Coach Association
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          자격증 취득 진행 보고서
        </h1>
        <p style={{ fontSize: "11px", color: "#374151" }}>
          Certification Progress Report — {goal} 자격증 취득 과정
        </p>
      </div>

      {/* User info */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        <tbody>
          <tr>
            {[
              { label: "성    명", value: user.name ?? "—" },
              { label: "목표 자격증", value: goal },
              { label: "이메일", value: user.email ?? "—" },
              { label: "출력 일자", value: today },
            ].map(({ label, value }) => (
              <td key={label} style={{ padding: "8px 12px", borderRight: "1px solid #e5e7eb", verticalAlign: "top", width: "25%" }}>
                <div style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>{label}</div>
                <div style={{ fontWeight: "600", fontSize: "12px" }}>{value}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* KPI summary */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <tbody>
          <tr>
            {CELLS.map(({ label, value, color }) => (
              <td key={label} style={{ width: "25%", textAlign: "center", padding: "10px 8px", border: "1px solid #e5e7eb", background: "#f9fafb" }}>
                <div style={{ fontSize: "9px", color: "#6b7280", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color }}>{value}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Requirements checklist */}
      <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "8px", paddingBottom: "4px", borderBottom: "1px solid #e5e7eb" }}>
        {goal} 자격증 취득 요건 현황
      </h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <thead>
          <tr style={{ background: "#1e3a5f", color: "#fff" }}>
            {["요건 항목", "목표 시간", "달성 시간", "달성률", "상태"].map((h) => (
              <th key={h} style={{ padding: "7px 8px", textAlign: "center", fontSize: "10px", fontWeight: "700", border: "1px solid #1e3a5f" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[
            {
              label: "교육 이수",
              target: targets.education,
              current: progress.approvedEducationHours,
              pct: educationPct,
              done: educationDone,
              pending: progress.educationPendingCount,
            },
            {
              label: "코칭 실습",
              target: targets.coaching,
              current: progress.approvedCoachingHours,
              pct: coachingPct,
              done: coachingDone,
              pending: progress.coachingPendingCount,
            },
          ].map((req, i) => (
            <tr key={req.label} style={{ background: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
              <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontSize: "10px", fontWeight: "600" }}>{req.label}</td>
              <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>{req.target}시간</td>
              <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
                {Math.round(req.current * 10) / 10}시간
                {req.pending > 0 && (
                  <span style={{ fontSize: "9px", color: "#b45309" }}> (+검토중 {req.pending}건)</span>
                )}
              </td>
              <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "3px" }}>
                    <div style={{ width: `${req.pct}%`, height: "6px", background: req.done ? "#15803d" : "#1e3a5f", borderRadius: "3px" }} />
                  </div>
                  <span style={{ whiteSpace: "nowrap" }}>{req.pct}%</span>
                </div>
              </td>
              <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", fontWeight: "700", color: req.done ? "#15803d" : "#b45309" }}>
                {req.done ? "✓ 달성" : "진행중"}
              </td>
            </tr>
          ))}
          {/* Overall row */}
          <tr style={{ background: "#eff6ff" }}>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", fontSize: "10px", fontWeight: "700", color: "#1e3a5f" }}>종합</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>—</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>—</td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ flex: 1, height: "6px", background: "#e5e7eb", borderRadius: "3px" }}>
                  <div style={{ width: `${overallPct}%`, height: "6px", background: "#1e3a5f", borderRadius: "3px" }} />
                </div>
                <span style={{ whiteSpace: "nowrap", fontWeight: "700" }}>{overallPct}%</span>
              </div>
            </td>
            <td style={{ padding: "8px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", fontWeight: "700", color: educationDone && coachingDone ? "#15803d" : "#1e3a5f" }}>
              {educationDone && coachingDone ? "✓ 완료" : "진행중"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Monthly trend */}
      {progress.monthlyActivity.length > 0 && (
        <>
          <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "8px", paddingBottom: "4px", borderBottom: "1px solid #e5e7eb" }}>
            월별 활동 현황 (최근 6개월)
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
            <thead>
              <tr style={{ background: "#f3f4f6" }}>
                {["월", ...progress.monthlyActivity.slice(-6).map((m) => m.month)].map((h) => (
                  <th key={h} style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", color: "#374151" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", fontSize: "10px", background: "#f0fdf4", fontWeight: "600", color: "#15803d" }}>교육(시간)</td>
                {progress.monthlyActivity.slice(-6).map((m) => (
                  <td key={m.month} style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
                    {m.educationHours || "—"}
                  </td>
                ))}
              </tr>
              <tr>
                <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", fontSize: "10px", background: "#eff6ff", fontWeight: "600", color: "#1d4ed8" }}>코칭(시간)</td>
                {progress.monthlyActivity.slice(-6).map((m) => (
                  <td key={m.month} style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
                    {m.coachingHours || "—"}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </>
      )}

      {/* Recent approved activity */}
      {recentApproved.length > 0 && (
        <>
          <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "8px", paddingBottom: "4px", borderBottom: "1px solid #e5e7eb" }}>
            최근 승인된 활동
          </h2>
          <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
            <thead>
              <tr style={{ background: "#1e3a5f", color: "#fff" }}>
                {["No.", "유형", "날짜", "내용", "시간", "상태"].map((h) => (
                  <th key={h} style={{ padding: "6px", border: "1px solid #1e3a5f", textAlign: "center", fontSize: "10px", fontWeight: "700" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recentApproved.map((act, i) => {
                const st = STATUS_LABEL[act.status];
                return (
                  <tr key={i} style={{ background: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>{i + 1}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>
                      {act.type === "education" ? "교육" : "코칭"}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", whiteSpace: "nowrap" }}>
                      {format(new Date(act.date), "yy.MM.dd")}
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", fontSize: "10px" }}>{act.title}</td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", whiteSpace: "nowrap" }}>
                      {act.hours}시간
                    </td>
                    <td style={{ padding: "5px 6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", fontWeight: "600", color: st.color, whiteSpace: "nowrap" }}>
                      {st.label}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      {/* Completion message */}
      {educationDone && coachingDone && (
        <div style={{ padding: "12px 16px", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", marginBottom: "16px", textAlign: "center" }}>
          <p style={{ fontWeight: "700", color: "#15803d", fontSize: "13px", margin: 0 }}>
            모든 {goal} 자격증 취득 요건을 충족하였습니다!
          </p>
          <p style={{ fontSize: "10px", color: "#6b7280", marginTop: "4px" }}>
            관리자에게 최종 자격증 신청 절차를 문의하시기 바랍니다.
          </p>
        </div>
      )}

      {/* Signature */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid #e5e7eb", marginTop: "16px" }}>
        <tbody>
          <tr>
            {[
              { role: "제출자", name: user.name ?? "성명" },
              { role: "슈퍼바이저", name: "" },
              { role: "심사위원", name: "" },
            ].map(({ role, name }) => (
              <td key={role} style={{ width: "33%", padding: "16px 8px 8px", verticalAlign: "bottom" }}>
                <div style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "28px" }}>{role} 서명</div>
                <div style={{ borderBottom: "1px solid #6b7280", width: "120px", marginBottom: "4px" }} />
                <div style={{ fontSize: "9px", color: "#6b7280" }}>{name || "（서명）"}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <p style={{ textAlign: "center", fontSize: "9px", color: "#9ca3af", marginTop: "16px", paddingTop: "12px", borderTop: "1px dashed #e5e7eb" }}>
        본 보고서는 MCCI 멘탈코칭전문가 인증 심사 제출용입니다 · MCCI 멘탈코칭전문가양성과정 관리 시스템
      </p>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────
export default function ProgressReportDialog({ open, onOpenChange, user, progress }: Props) {
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    const cleanup = () => setIsPrinting(false);
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const handlePrint = () => {
    const portalEl = document.getElementById("print-portal");
    if (!portalEl) return;
    setIsPrinting(true);
    setTimeout(() => { window.print(); }, 150);
  };

  const printPortal = document.getElementById("print-portal");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              자격증 취득 진행 보고서 미리보기
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-[#e5e7eb] p-4">
            <div className="shadow-xl mx-auto" style={{ maxWidth: "794px" }}>
              <ReportContent user={user} progress={progress} />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-background">
            <p className="text-xs text-muted-foreground hidden sm:block">
              인쇄 대화상자에서 <strong>PDF로 저장</strong>을 선택하세요
            </p>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>닫기</Button>
              <Button onClick={handlePrint} disabled={isPrinting}>
                <FileDown className="w-4 h-4 mr-2" />
                {isPrinting ? "출력 중..." : "PDF로 저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {isPrinting && printPortal && createPortal(
        <ReportContent user={user} progress={progress} />,
        printPortal,
      )}
    </>
  );
}
