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

type EducationRecord = Doc<"educationRecords"> & { certificateUrl?: string | null };

type UserInfo = {
  name?: string;
  email?: string;
  certificationGoal?: "KAC" | "KPC" | "SMPCC";
};

type Summary = {
  approvedHours: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: EducationRecord[];
  user: UserInfo;
  summary: Summary;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "검토중", color: "#b45309" },
  approved: { label: "승인됨", color: "#15803d" },
  rejected: { label: "반려됨", color: "#dc2626" },
};

// ── Report document ───────────────────────────────────────────────────────────
function ReportContent({ records, user, summary }: Omit<Props, "open" | "onOpenChange">) {
  const today = format(new Date(), "yyyy년 MM월 dd일 (EEE)", { locale: ko });
  const approvedRecords = records.filter((r) => r.approvalStatus === "approved");
  const target = user.certificationGoal === "KPC" ? 125 : 60;
  const pct = Math.min(Math.round((summary.approvedHours / target) * 100), 100);

  const STAT_CELLS = [
    { label: "총 승인 시간", value: `${Math.round(summary.approvedHours * 10) / 10}시간` },
    { label: "목표 시간", value: `${target}시간` },
    { label: "달성률", value: `${pct}%` },
    { label: "승인된 건수", value: `${approvedRecords.length}건` },
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
      <div
        style={{
          textAlign: "center",
          borderBottom: "2px solid #1e3a5f",
          paddingBottom: "14px",
          marginBottom: "16px",
        }}
      >
        <p style={{ fontSize: "10px", color: "#6b7280", marginBottom: "4px" }}>
          한국코치협회 (KCA) · Korea Coach Association
        </p>
        <h1 style={{ fontSize: "22px", fontWeight: "800", color: "#1e3a5f", margin: "0 0 4px", letterSpacing: "-0.5px" }}>
          교육 이수 확인서
        </h1>
        <p style={{ fontSize: "11px", color: "#374151" }}>
          Education Record — {user.certificationGoal === "KPC" ? "멘탈코칭전문가 2급" : "멘탈코칭전문가 1급"} 인증 과정
        </p>
      </div>

      {/* User info */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px", background: "#f9fafb", border: "1px solid #e5e7eb" }}>
        <tbody>
          <tr>
            {[
              { label: "성    명", value: user.name ?? "—" },
              { label: "목표 자격증", value: user.certificationGoal ?? "—" },
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

      {/* Stats */}
      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}>
        <tbody>
          <tr>
            {STAT_CELLS.map(({ label, value }) => (
              <td key={label} style={{ width: "25%", textAlign: "center", padding: "10px 8px", border: "1px solid #dcfce7", background: "#f0fdf4" }}>
                <div style={{ fontSize: "9px", color: "#6b7280", marginBottom: "3px" }}>{label}</div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#15803d" }}>{value}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Progress bar */}
      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#6b7280", marginBottom: "4px" }}>
          <span>교육 이수 진행률</span>
          <span>{pct}% ({Math.round(summary.approvedHours * 10) / 10}/{target}시간)</span>
        </div>
        <div style={{ width: "100%", height: "8px", background: "#e5e7eb", borderRadius: "4px" }}>
          <div style={{ width: `${pct}%`, height: "8px", background: "#15803d", borderRadius: "4px" }} />
        </div>
      </div>

      {/* Table */}
      <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "6px", paddingBottom: "4px", borderBottom: "1px solid #e5e7eb" }}>
        교육 이수 내역 ({records.length}건)
      </h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ background: "#1e3a5f", color: "#fff" }}>
            {["No.", "교육 과정명", "교육 기관", "이수 일자", "시간", "상태"].map((h) => (
              <th key={h} style={{ padding: "7px 6px", border: "1px solid #1e3a5f", textAlign: "center", fontSize: "10px", fontWeight: "700", letterSpacing: "0.3px" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={6} style={{ padding: "20px", textAlign: "center", color: "#9ca3af", fontSize: "11px", border: "1px solid #e5e7eb" }}>
                기록된 교육이 없습니다.
              </td>
            </tr>
          ) : (
            records.map((rec, i) => {
              const st = STATUS_MAP[rec.approvalStatus];
              return (
                <tr key={rec._id} style={{ background: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px" }}>{i + 1}</td>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", fontSize: "10px" }}>{rec.educationName}</td>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", fontSize: "10px" }}>{rec.institution}</td>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", whiteSpace: "nowrap" }}>
                    {format(new Date(rec.educationDate), "yy.MM.dd")}
                  </td>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", whiteSpace: "nowrap" }}>
                    {rec.hours}시간
                  </td>
                  <td style={{ padding: "6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", fontWeight: "600", color: st.color, whiteSpace: "nowrap" }}>
                    {st.label}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {/* Approved hours total */}
        {approvedRecords.length > 0 && (
          <tfoot>
            <tr style={{ background: "#f0fdf4" }}>
              <td colSpan={4} style={{ padding: "6px 8px", border: "1px solid #e5e7eb", textAlign: "right", fontSize: "10px", fontWeight: "700", color: "#15803d" }}>
                승인된 교육 합계
              </td>
              <td style={{ padding: "6px", border: "1px solid #e5e7eb", textAlign: "center", fontSize: "10px", fontWeight: "700", color: "#15803d" }}>
                {Math.round(summary.approvedHours * 10) / 10}시간
              </td>
              <td style={{ border: "1px solid #e5e7eb" }} />
            </tr>
          </tfoot>
        )}
      </table>

      {/* Notes */}
      {records.some((r) => r.notes) && (
        <>
          <h2 style={{ fontSize: "11px", fontWeight: "700", color: "#1e3a5f", marginBottom: "6px", paddingBottom: "4px", borderBottom: "1px solid #e5e7eb" }}>
            메모
          </h2>
          {records.filter((r) => r.notes).map((rec, i) => (
            <div key={rec._id} style={{ fontSize: "10px", marginBottom: "6px", padding: "6px 8px", background: "#f9fafb", borderLeft: "3px solid #1e3a5f" }}>
              <strong>{i + 1}. {rec.educationName}</strong>: {rec.notes}
            </div>
          ))}
        </>
      )}

      {/* Signature */}
      <table style={{ width: "100%", borderCollapse: "collapse", borderTop: "1px solid #e5e7eb", marginTop: "24px" }}>
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
        본 확인서는 MCCI 멘탈코칭전문가 인증 심사 제출용입니다 · MCCI 멘탈코칭전문가양성과정 관리 시스템
      </p>
    </div>
  );
}

// ── Dialog ────────────────────────────────────────────────────────────────────
export default function EducationReportDialog({ open, onOpenChange, records, user, summary }: Props) {
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
              교육 이수 확인서 미리보기
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-[#e5e7eb] p-4">
            <div className="shadow-xl mx-auto" style={{ maxWidth: "794px" }}>
              <ReportContent records={records} user={user} summary={summary} />
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
        <ReportContent records={records} user={user} summary={summary} />,
        printPortal,
      )}
    </>
  );
}
