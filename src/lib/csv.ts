/**
 * Converts an array of objects to a CSV string.
 * Handles Korean characters (BOM for Excel compatibility).
 * Uses an optional header translation map to convert English keys to Korean labels.
 */

// Maps English field keys to Korean CSV column headers
export const HEADER_LABELS: Record<string, string> = {
  // trainees
  name: "이름",
  email: "이메일",
  certGoal: "인증목표",
  approvalStatus: "승인상태",
  joinedAt: "가입일",
  onboardingDone: "온보딩완료",
  // education
  traineeName: "교육생명",
  educationName: "교육명",
  institution: "기관명",
  educationDate: "교육일",
  hours: "이수시간",
  notes: "메모",
  // coaching
  coachingDate: "코칭일",
  coachee: "코치이",
  type: "유형",
  durationMin: "시간(분)",
  topic: "주제",
  goals: "목표",
  mcciDomain: "MCCI도메인",
  techniques: "사용기법",
  // mentor coaching
  sessionDate: "세션일",
  sessionType: "유형",
  coachName: "코치명",
  // progress
  approvedEduHours: "승인교육시간",
  approvedCoachingHours: "승인코칭시간",
  individualCoachingHours: "개인코칭시간",
  groupCoachingHours: "그룹코칭시간",
  mentorCount: "슈퍼비전횟수",
  totalCoachingLogs: "코칭기록총수",
  // certification
  submittedAt: "신청일",
  status: "상태",
  eduHoursAtSubmission: "교육시간(신청시)",
  coachingHoursAtSubmission: "코칭시간(신청시)",
  reviewedAt: "검토일",
  reviewComment: "검토의견",
  // attendance — dynamic session keys handled separately
};

/**
 * Translate an English key to its Korean label.
 * For attendance session keys like "session_1" → "1차".
 */
function translateHeader(key: string): string {
  if (HEADER_LABELS[key]) return HEADER_LABELS[key];
  // attendance: session_N → N차
  const sessionMatch = key.match(/^session_(\d+)$/);
  if (sessionMatch) return `${sessionMatch[1]}차`;
  return key;
}

export function toCSV(rows: Record<string, string | number | boolean | null | undefined>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const koreanHeaders = headers.map(translateHeader);
  const escape = (val: string | number | boolean | null | undefined): string => {
    const str = val === null || val === undefined ? "" : String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const lines = [
    koreanHeaders.map(escape).join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ];
  return lines.join("\r\n");
}

/** Download a CSV string as a file with Korean BOM for Excel */
export function downloadCSV(csvContent: string, filename: string): void {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
