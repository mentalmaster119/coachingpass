/**
 * MCCI-SMPCC Core Assessment Engine (수료 및 인증 사정 순수 로직)
 * 
 * 단위 테스트 및 백엔드/클라이언트 전역에서 공유되는 결정론적(Deterministic) 사정 함수군입니다.
 */

export interface SeminarSlotInfo {
  _id?: string;
  sessionNumber: number;
  seminarType: "two_day" | "one_day" | "group_coaching" | string;
  startDate: string;
  endDate: string;
}

export interface AttendanceRecordInfo {
  seminarId: string;
  cohortId?: string;
  date?: string;
  status: "present" | "late" | "excused" | "absent";
}

export interface MakeupSeminarMatch {
  seminarId: string;
  sessionNumber: number;
  seminarType: string;
  startDate: string;
  endDate: string;
}

export interface AttendanceMetricsResult {
  totalSlots: number;
  attendedSlots: number;
  present: number;
  late: number;
  excused: number;
  absent: number;
  attendanceRate: number; // 0 ~ 100 정수 (%)
  sessionAbsenceViolation: boolean; // 2차~6차 중 전일(모든 슬롯) 결석 발생 여부
  isAttendanceMet: boolean; // 출석률 80% 이상 & 결석 위반 없음
}

/**
 * 1. 출석률 및 결석 탈락 규정 사정 함수
 * - 2일 세미나(two_day): 2슬롯 (토/일)
 * - 1일 세미나(one_day): 1슬롯
 * - 출석 인정 상태: present, late, excused
 * - 결석 인정 상태: absent (또는 기록 누락)
 * - 타 기수 보강(makeup) 매칭 지원
 * - 결석 탈락 규정: 2차~6차 세미나 중 특정 회차의 모든 슬롯을 결석하면 실격
 */
export function calculateAttendanceMetrics(
  seminars: SeminarSlotInfo[],
  records: AttendanceRecordInfo[],
  options?: {
    makeups?: {
      records: AttendanceRecordInfo[];
      seminarLookup: Map<string, MakeupSeminarMatch>;
    };
    twoDayOnly?: boolean;
  }
): AttendanceMetricsResult {
  let targetSeminars = seminars;
  if (options?.twoDayOnly) {
    targetSeminars = targetSeminars.filter((s) => s.seminarType === "two_day");
  }

  let totalSlots = 0;
  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;
  let sessionAbsenceViolation = false;

  for (const seminar of targetSeminars) {
    const dates =
      seminar.startDate === seminar.endDate
        ? [seminar.startDate]
        : [seminar.startDate, seminar.endDate];

    let attendedSessionSlots = 0;

    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      totalSlots++;
      const targetDate = dates[dayIndex];

      // 기본 출석 기록 검색
      let record = records.find(
        (r) =>
          r.seminarId === seminar._id &&
          (r.date === targetDate || (!r.date && dates.length === 1))
      );

      // 본 기수 결석이거나 기록 누락인 경우 타 기수 보강 내역 확인
      if ((!record || record.status === "absent") && options?.makeups) {
        for (const mr of options.makeups.records) {
          if (mr.status === "absent") continue;
          const otherSem = options.makeups.seminarLookup.get(mr.seminarId);
          if (
            otherSem &&
            otherSem.sessionNumber === seminar.sessionNumber &&
            otherSem.seminarType === seminar.seminarType
          ) {
            const otherDates =
              otherSem.startDate === otherSem.endDate
                ? [otherSem.startDate]
                : [otherSem.startDate, otherSem.endDate];
            if (mr.date === otherDates[dayIndex]) {
              record = mr;
              break;
            }
          }
        }
      }

      const status = record?.status ?? "absent";
      if (status === "present") {
        present++;
        attendedSessionSlots++;
      } else if (status === "late") {
        late++;
        attendedSessionSlots++;
      } else if (status === "excused") {
        excused++;
        attendedSessionSlots++;
      } else {
        absent++;
      }
    }

    // 2차 ~ 6차 세미나 회차에서 모든 슬롯에 결석한 경우 결석 탈락 규정 위반
    if (
      attendedSessionSlots === 0 &&
      seminar.sessionNumber >= 2 &&
      seminar.sessionNumber <= 6
    ) {
      sessionAbsenceViolation = true;
    }
  }

  const attendedSlots = present + late + excused;
  const attendanceRate =
    totalSlots > 0 ? Math.round((attendedSlots / totalSlots) * 100) : 0;
  const isAttendanceMet = attendanceRate >= 80 && !sessionAbsenceViolation;

  return {
    totalSlots,
    attendedSlots,
    present,
    late,
    excused,
    absent,
    attendanceRate,
    sessionAbsenceViolation,
    isAttendanceMet,
  };
}

/**
 * 2. 코칭 5대 쿼터 사정 함수
 * - 버디코칭 (BCP): 수료 2회 / 인증 2회
 * - 멘토코칭 (MCP): 수료 2회 / 인증 2회
 * - 수퍼비전 (SVP): 수료 1회 / 인증 1회
 * - 스포츠선수 코칭: 수료 8회 / 인증 8회
 * - 일반인 코칭: 수료 2회 / 인증 7회
 * - 총 실습 건수: 수료 15회 / 인증 20회
 */
export interface CoachingCounts {
  buddyCount: number;
  mentorCount: number;
  svCount: number;
  sportsCount: number;
  generalCount: number;
  totalApprovedMinutes?: number;
}

export interface CoachingQuotasResult {
  totalCount: number;
  coachingHours: number;
  completion: {
    buddy: { count: number; required: 2; met: boolean };
    mentor: { count: number; required: 2; met: boolean };
    sv: { count: number; required: 1; met: boolean };
    sports: { count: number; required: 8; met: boolean };
    general: { count: number; required: 2; met: boolean };
    total: { count: number; required: 15; met: boolean };
    isMet: boolean;
  };
  certification: {
    buddy: { count: number; required: 2; met: boolean };
    mentor: { count: number; required: 2; met: boolean };
    sv: { count: number; required: 1; met: boolean };
    sports: { count: number; required: 8; met: boolean };
    general: { count: number; required: 7; met: boolean };
    total: { count: number; required: 20; met: boolean };
    isMet: boolean;
  };
}

export function calculateCoachingQuotas(
  counts: CoachingCounts
): CoachingQuotasResult {
  const {
    buddyCount,
    mentorCount,
    svCount,
    sportsCount,
    generalCount,
    totalApprovedMinutes = 0,
  } = counts;

  const totalCount =
    buddyCount + mentorCount + svCount + sportsCount + generalCount;
  const coachingHours =
    Math.round((totalApprovedMinutes / 60) * 10) / 10;

  // 수료 요건 (15회 기준)
  const compBuddy = buddyCount >= 2;
  const compMentor = mentorCount >= 2;
  const compSv = svCount >= 1;
  const compSports = sportsCount >= 8;
  const compGeneral = generalCount >= 2;
  const compTotal = totalCount >= 15;
  const isCompletionMet =
    compBuddy &&
    compMentor &&
    compSv &&
    compSports &&
    compGeneral &&
    compTotal;

  // 인증 요건 (20회 기준)
  const certBuddy = buddyCount >= 2;
  const certMentor = mentorCount >= 2;
  const certSv = svCount >= 1;
  const certSports = sportsCount >= 8;
  const certGeneral = generalCount >= 7;
  const certTotal = totalCount >= 20;
  const isCertMet =
    certBuddy &&
    certMentor &&
    certSv &&
    certSports &&
    certGeneral &&
    certTotal;

  return {
    totalCount,
    coachingHours,
    completion: {
      buddy: { count: buddyCount, required: 2, met: compBuddy },
      mentor: { count: mentorCount, required: 2, met: compMentor },
      sv: { count: svCount, required: 1, met: compSv },
      sports: { count: sportsCount, required: 8, met: compSports },
      general: { count: generalCount, required: 2, met: compGeneral },
      total: { count: totalCount, required: 15, met: compTotal },
      isMet: isCompletionMet,
    },
    certification: {
      buddy: { count: buddyCount, required: 2, met: certBuddy },
      mentor: { count: mentorCount, required: 2, met: certMentor },
      sv: { count: svCount, required: 1, met: certSv },
      sports: { count: sportsCount, required: 8, met: certSports },
      general: { count: generalCount, required: 7, met: certGeneral },
      total: { count: totalCount, required: 20, met: certTotal },
      isMet: isCertMet,
    },
  };
}

/**
 * 3. 3단계 라이프사이클 종합 사정 함수
 * - 1단계 (수료): 출석률 80% + 결석위반 없음 + 교육이수 + 코칭 15회 쿼터
 * - 2단계 (인증시험 응시자격): 1단계 수료 + 코칭 20회 쿼터 + 독후감 2편 + 에세이 1편
 * - 3단계 (공식 자격취득): SMPCC 자격 발급 및 활성 상태
 */
export interface EvaluationLifecycleInput {
  attendance: AttendanceMetricsResult;
  coaching: CoachingQuotasResult;
  educationHours: number;
  requiredEducationHours?: number; // default: 50
  bookReportCount: number;
  essayCount: number;
  hasActiveCert?: boolean;
}

export interface EvaluationLifecycleResult {
  isCompleted: boolean;
  isCertEligible: boolean;
  isCertified: boolean;
  progressRate: number; // 0 ~ 100
  criteria: Array<{
    key: string;
    label: string;
    category: "completion" | "coaching" | "assignment";
    current: number;
    required: number;
    unit: string;
    met: boolean;
    weight: number;
  }>;
}

export function evaluateLifecycleStage(
  input: EvaluationLifecycleInput
): EvaluationLifecycleResult {
  const reqEdu = input.requiredEducationHours ?? 50;
  const isEducationMet = input.educationHours >= reqEdu;

  const isCompleted =
    input.attendance.isAttendanceMet &&
    isEducationMet &&
    input.coaching.completion.isMet;

  const isCertEligible =
    isCompleted &&
    input.coaching.certification.isMet &&
    input.bookReportCount >= 2 &&
    input.essayCount >= 1;

  const isCertified = Boolean(input.hasActiveCert);

  const criteria = [
    {
      key: "attendance",
      label: "세미나 출석률",
      category: "completion" as const,
      current: input.attendance.attendanceRate,
      required: 80,
      unit: "%",
      met: input.attendance.isAttendanceMet,
      weight: 15,
    },
    {
      key: "education",
      label: "정규 교육 이수",
      category: "completion" as const,
      current: input.educationHours,
      required: reqEdu,
      unit: "시간",
      met: isEducationMet,
      weight: 15,
    },
    {
      key: "totalCoaching",
      label: "코칭 실습 총 건수",
      category: "completion" as const,
      current: input.coaching.totalCount,
      required: 20,
      unit: "회",
      met: input.coaching.certification.total.met,
      weight: 15,
    },
    {
      key: "sportsCoaching",
      label: "스포츠선수 코칭",
      category: "coaching" as const,
      current: input.coaching.certification.sports.count,
      required: 8,
      unit: "회",
      met: input.coaching.certification.sports.met,
      weight: 15,
    },
    {
      key: "generalCoaching",
      label: "일반인 코칭",
      category: "coaching" as const,
      current: input.coaching.certification.general.count,
      required: 7,
      unit: "회",
      met: input.coaching.certification.general.met,
      weight: 10,
    },
    {
      key: "buddyCoaching",
      label: "버디코칭 (BCP)",
      category: "coaching" as const,
      current: input.coaching.certification.buddy.count,
      required: 2,
      unit: "회",
      met: input.coaching.certification.buddy.met,
      weight: 10,
    },
    {
      key: "mentorCoaching",
      label: "멘토코칭 (MCP)",
      category: "coaching" as const,
      current: input.coaching.certification.mentor.count,
      required: 2,
      unit: "회",
      met: input.coaching.certification.mentor.met,
      weight: 10,
    },
    {
      key: "supervision",
      label: "수퍼비전 (SVP)",
      category: "coaching" as const,
      current: input.coaching.certification.sv.count,
      required: 1,
      unit: "회",
      met: input.coaching.certification.sv.met,
      weight: 5,
    },
    {
      key: "bookReports",
      label: "도서 독후감",
      category: "assignment" as const,
      current: input.bookReportCount,
      required: 2,
      unit: "편",
      met: input.bookReportCount >= 2,
      weight: 3,
    },
    {
      key: "essay",
      label: "멘탈코칭 에세이",
      category: "assignment" as const,
      current: input.essayCount,
      required: 1,
      unit: "편",
      met: input.essayCount >= 1,
      weight: 2,
    },
  ];

  let weightedScore = 0;
  for (const c of criteria) {
    const ratio = Math.min(1, c.required > 0 ? c.current / c.required : 0);
    weightedScore += ratio * c.weight;
  }

  const progressRate = Math.min(100, Math.round(weightedScore));

  return {
    isCompleted,
    isCertEligible,
    isCertified,
    progressRate,
    criteria,
  };
}
