import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { toast } from "sonner";
import { FileDown, Printer } from "lucide-react";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { COACHING_TYPE_MAP } from "./coaching-log-card.tsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog.tsx";
import { Button } from "@/components/ui/button.tsx";

type CoachingLog = Doc<"coachingLogs"> & { evidenceUrl?: string | null; reviewerName?: string | null };

type UserInfo = {
  name?: string;
  email?: string;
  certificationGoal?: "KAC" | "KPC" | "SMPCC";
};

type Summary = {
  approvedHours: number;
  individualHours: number;
  groupHours: number;
  pendingCount: number;
  rejectedCount: number;
  totalCount: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  logs: CoachingLog[];
  user: UserInfo;
  summary: Summary;
};

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "검토중", color: "#b45309" },
  approved: { label: "승인됨", color: "#15803d" },
  rejected: { label: "반려됨", color: "#dc2626" },
};

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h}시간`;
  return `${h}시간 ${m}분`;
}

function roundHours(h: number): string {
  return `${Math.round(h * 10) / 10}시간`;
}

// ── The printable report content ────────────────────────────────────────────
function ReportContent({ logs, user, summary }: Omit<Props, "open" | "onOpenChange">) {
  const today = format(new Date(), "yyyy년 MM월 dd일 (EEE)", { locale: ko });
  const approvedLogs = logs.filter((l) => l.approvalStatus === "approved");

  const STAT_CELLS = [
    { label: "총 승인 시간", value: roundHours(summary.approvedHours) },
    { label: "개인 코칭", value: roundHours(summary.individualHours) },
    { label: "그룹 코칭", value: roundHours(summary.groupHours) },
    { label: "승인된 기록", value: `${approvedLogs.length}건` },
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
      {/* ── Document header ── */}
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
        <h1
          style={{
            fontSize: "22px",
            fontWeight: "800",
            color: "#1e3a5f",
            margin: "0 0 4px",
            letterSpacing: "-0.5px",
          }}
        >
          코칭 실습 기록부
        </h1>
        <p style={{ fontSize: "11px", color: "#374151" }}>
          Coaching Practice Log — {user.certificationGoal ?? "KAC/KPC"} 자격증 취득 과정
        </p>
      </div>

      {/* ── User info ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
          background: "#f9fafb",
          border: "1px solid #e5e7eb",
          borderRadius: "6px",
        }}
      >
        <tbody>
          <tr>
            {[
              { label: "성    명", value: user.name ?? "—" },
              { label: "목표 자격증", value: user.certificationGoal ?? "—" },
              { label: "이메일", value: user.email ?? "—" },
              { label: "출력 일자", value: today },
            ].map(({ label, value }) => (
              <td
                key={label}
                style={{
                  padding: "8px 12px",
                  borderRight: "1px solid #e5e7eb",
                  verticalAlign: "top",
                  width: "25%",
                }}
              >
                <div style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ fontWeight: "600", fontSize: "12px" }}>{value}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ── Statistics ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "16px",
        }}
      >
        <tbody>
          <tr>
            {STAT_CELLS.map(({ label, value }) => (
              <td
                key={label}
                style={{
                  width: "25%",
                  textAlign: "center",
                  padding: "10px 8px",
                  border: "1px solid #dbeafe",
                  background: "#eff6ff",
                }}
              >
                <div style={{ fontSize: "9px", color: "#6b7280", marginBottom: "3px" }}>
                  {label}
                </div>
                <div style={{ fontSize: "18px", fontWeight: "800", color: "#1e3a5f" }}>
                  {value}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ── Coaching log table ── */}
      <h2
        style={{
          fontSize: "11px",
          fontWeight: "700",
          color: "#1e3a5f",
          marginBottom: "6px",
          paddingBottom: "4px",
          borderBottom: "1px solid #e5e7eb",
        }}
      >
        코칭 실습 내역 ({logs.length}건)
      </h2>

      <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "20px" }}>
        <thead>
          <tr style={{ background: "#1e3a5f", color: "#fff" }}>
            {["연번", "일시", "코칭구분", "코치이 성명/성별", "고객구분", "코칭주제", "코칭방법", "시간(H)", "확인인 서명"].map((h) => (
              <th
                key={h}
                style={{
                  padding: "7px 4px",
                  border: "1px solid #1e3a5f",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: "700",
                  letterSpacing: "0.3px",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.length === 0 ? (
            <tr>
              <td
                colSpan={9}
                style={{
                  padding: "20px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "11px",
                  border: "1px solid #e5e7eb",
                }}
              >
                기록된 코칭이 없습니다.
              </td>
            </tr>
          ) : (
            logs.map((log, i) => {
              const st = STATUS_MAP[log.approvalStatus];
              const dateStr = format(new Date(log.coachingDate), "yyyy.MM.dd");
              const timeStr = log.coachingStartTime && log.coachingEndTime
                ? ` ${log.coachingStartTime}~${log.coachingEndTime}`
                : "";
              const coacheeGenderStr = log.coacheeGender === "male"
                ? "남"
                : log.coacheeGender === "female"
                ? "여"
                : "—";
              const clientCatStr = log.ncpClientCategory === "athlete"
                ? "스포츠"
                : log.ncpClientCategory === "general"
                ? "일반"
                : "—";
              const methodStr = log.coachingPlace
                ? ({
                    zoom: "Zoom",
                    study_room: "공부방",
                    center: "양재센터",
                    home: "가정",
                    other: log.coachingPlaceOther || "기타",
                    hanyang: "한양대",
                  }[log.coachingPlace] || log.coachingPlace)
                : "—";
              const hoursStr = (log.durationMinutes / 60).toFixed(1);

              return (
                <tr
                  key={log._id}
                  style={{ background: i % 2 === 0 ? "#ffffff" : "#f9fafb" }}
                >
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                    }}
                  >
                    {i + 1}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "9px",
                    }}
                  >
                    {dateStr}{timeStr}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {COACHING_TYPE_MAP[log.coachingType] ?? log.coachingType}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      fontSize: "10px",
                      textAlign: "center",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {log.coacheeInfo} / {coacheeGenderStr}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {clientCatStr}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      fontSize: "10px",
                      maxWidth: "140px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={log.topic}
                  >
                    {log.topic}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                    }}
                  >
                    {methodStr}
                  </td>
                  <td
                    style={{
                      padding: "6px 4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                      fontWeight: "700",
                    }}
                  >
                    {hoursStr}H
                  </td>
                  <td
                    style={{
                      padding: "4px",
                      border: "1px solid #e5e7eb",
                      textAlign: "center",
                      fontSize: "10px",
                      verticalAlign: "middle",
                    }}
                  >
                    {log.approvalStatus === "approved" ? (
                      <div
                        style={{
                          display: "inline-flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1.5px solid #1d4ed8",
                          borderRadius: "4px",
                          padding: "2px 4px",
                          background: "#eff6ff",
                          transform: "rotate(-3deg)",
                        }}
                      >
                        <span style={{ fontSize: "8px", color: "#1d4ed8", fontWeight: "800", letterSpacing: "0.5px" }}>
                          승인완료
                        </span>
                        {log.reviewerName && (
                          <span style={{ fontSize: "8px", color: "#1e3a5f", fontWeight: "700", marginTop: "1px" }}>
                            {log.reviewerName}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontWeight: "600", color: st.color }}>
                        {st.label}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* ── Signature area ── */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "16px",
        }}
      >
        <tbody>
          <tr>
            {[
              { role: "제출자", name: user.name ?? "성명" },
              { role: "슈퍼바이저", name: "" },
              { role: "심사위원", name: "" },
            ].map(({ role, name }) => (
              <td
                key={role}
                style={{ width: "33%", padding: "16px 8px 8px", verticalAlign: "bottom" }}
              >
                <div style={{ fontSize: "9px", color: "#9ca3af", marginBottom: "28px" }}>
                  {role} 서명
                </div>
                <div
                  style={{
                    borderBottom: "1px solid #6b7280",
                    width: "120px",
                    marginBottom: "4px",
                  }}
                />
                <div style={{ fontSize: "9px", color: "#6b7280" }}>{name || "（서명）"}</div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* ── Footer ── */}
      <p
        style={{
          textAlign: "center",
          fontSize: "9px",
          color: "#9ca3af",
          marginTop: "16px",
          paddingTop: "12px",
          borderTop: "1px dashed #e5e7eb",
        }}
      >
        본 기록부는 한국코치협회(KCA) 자격증 심사 제출용입니다 · CoachPass — KAC/KPC 자격증 관리 시스템
      </p>
    </div>
  );
}

// ── Dialog ───────────────────────────────────────────────────────────────────
export default function CoachingReportDialog({
  open,
  onOpenChange,
  logs,
  user,
  summary,
}: Props) {
  const [isPrinting, setIsPrinting] = useState(false);

  // Cleanup after browser print dialog closes
  useEffect(() => {
    const cleanup = () => setIsPrinting(false);
    window.addEventListener("afterprint", cleanup);
    return () => window.removeEventListener("afterprint", cleanup);
  }, []);

  const handlePrint = () => {
    const portalEl = document.getElementById("print-portal");
    if (!portalEl) {
      toast.error("프린트 포탈을 찾을 수 없습니다.");
      return;
    }
    setIsPrinting(true);
    // Defer print until portal is rendered
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const printPortal = document.getElementById("print-portal");

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 py-4 border-b border-border flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" />
              코칭 실습 기록부 미리보기
            </DialogTitle>
          </DialogHeader>

          {/* Preview area */}
          <div className="flex-1 overflow-y-auto bg-[#e5e7eb] p-4">
            <div className="shadow-xl mx-auto" style={{ maxWidth: "794px" }}>
              <ReportContent logs={logs} user={user} summary={summary} />
            </div>
          </div>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between flex-shrink-0 bg-background">
            <p className="text-xs text-muted-foreground hidden sm:block">
              인쇄 대화상자에서 <strong>PDF로 저장</strong>을 선택하세요
            </p>
            <div className="flex gap-2 ml-auto">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                닫기
              </Button>
              <Button onClick={handlePrint} disabled={isPrinting}>
                <FileDown className="w-4 h-4 mr-2" />
                {isPrinting ? "출력 중..." : "PDF로 저장"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Print portal: rendered into #print-portal outside #root during print */}
      {isPrinting &&
        printPortal &&
        createPortal(
          <ReportContent logs={logs} user={user} summary={summary} />,
          printPortal,
        )}
    </>
  );
}
