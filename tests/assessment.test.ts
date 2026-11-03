import { describe, it, expect } from "vitest";
import {
  calculateAttendanceMetrics,
  calculateCoachingQuotas,
  evaluateLifecycleStage,
  type SeminarSlotInfo,
  type AttendanceRecordInfo,
  type MakeupSeminarMatch,
} from "@/convex/assessmentLogic";

describe("MCCI-SMPCC 사정 엔진 단위 테스트 (Assessment Logic)", () => {
  describe("1. 세미나 출석률 및 결석 탈락 규정 검증 (calculateAttendanceMetrics)", () => {
    // 6회차 세미나 (2차~6차는 2일 세미나, 1차는 1일 세미나)
    const mockSeminars: SeminarSlotInfo[] = [
      { _id: "sem-1", sessionNumber: 1, seminarType: "two_day", startDate: "2026-03-01", endDate: "2026-03-02" },
      { _id: "sem-2", sessionNumber: 2, seminarType: "two_day", startDate: "2026-04-01", endDate: "2026-04-02" },
      { _id: "sem-3", sessionNumber: 3, seminarType: "two_day", startDate: "2026-05-01", endDate: "2026-05-02" },
      { _id: "sem-4", sessionNumber: 4, seminarType: "two_day", startDate: "2026-06-01", endDate: "2026-06-02" },
      { _id: "sem-5", sessionNumber: 5, seminarType: "two_day", startDate: "2026-07-01", endDate: "2026-07-02" },
      { _id: "sem-6", sessionNumber: 6, seminarType: "two_day", startDate: "2026-08-01", endDate: "2026-08-02" },
    ];

    it("12개 모든 슬롯에 출석한 경우 출석률 100% 및 수료 기준 충족", () => {
      const records: AttendanceRecordInfo[] = [];
      for (const sem of mockSeminars) {
        records.push(
          { seminarId: sem._id!, date: sem.startDate, status: "present" },
          { seminarId: sem._id!, date: sem.endDate, status: "present" }
        );
      }

      const result = calculateAttendanceMetrics(mockSeminars, records);
      expect(result.totalSlots).toBe(12);
      expect(result.attendedSlots).toBe(12);
      expect(result.attendanceRate).toBe(100);
      expect(result.sessionAbsenceViolation).toBe(false);
      expect(result.isAttendanceMet).toBe(true);
    });

    it("지각(late) 및 공결(excused)도 출석 슬롯으로 인정", () => {
      const records: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "late" },
        { seminarId: "sem-2", date: "2026-04-01", status: "excused" },
        { seminarId: "sem-2", date: "2026-04-02", status: "present" },
      ];
      const seminars = mockSeminars.slice(0, 2);

      const result = calculateAttendanceMetrics(seminars, records);
      expect(result.totalSlots).toBe(4);
      expect(result.present).toBe(2);
      expect(result.late).toBe(1);
      expect(result.excused).toBe(1);
      expect(result.attendedSlots).toBe(4);
      expect(result.attendanceRate).toBe(100);
      expect(result.isAttendanceMet).toBe(true);
    });

    it("80% 경계값: 10개 슬롯 중 8개 출석(80%)은 합격, 7개 출석(70%)은 불합격", () => {
      // 5개 2일 세미나 (총 10슬롯)
      const seminars = mockSeminars.slice(0, 5);

      // 8슬롯 출석: 2,3,4,5차는 각 1일 결석(1일 출석) -> session violation 없음
      const passRecords: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "present" },
        { seminarId: "sem-2", date: "2026-04-01", status: "present" },
        { seminarId: "sem-2", date: "2026-04-02", status: "present" },
        { seminarId: "sem-3", date: "2026-05-01", status: "present" },
        { seminarId: "sem-3", date: "2026-05-02", status: "present" },
        { seminarId: "sem-4", date: "2026-06-01", status: "present" },
        { seminarId: "sem-4", date: "2026-06-02", status: "present" },
        { seminarId: "sem-5", date: "2026-07-01", status: "absent" },
        { seminarId: "sem-5", date: "2026-07-02", status: "absent" },
      ];
      // sem-5(5차)가 전일 결석이므로 violation 발생을 피하기 위해 분산 결석으로 테스트:
      const distributedPassRecords: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "present" },
        { seminarId: "sem-2", date: "2026-04-01", status: "present" },
        { seminarId: "sem-2", date: "2026-04-02", status: "absent" }, // 1일 결석
        { seminarId: "sem-3", date: "2026-05-01", status: "present" },
        { seminarId: "sem-3", date: "2026-05-02", status: "absent" }, // 1일 결석
        { seminarId: "sem-4", date: "2026-06-01", status: "present" },
        { seminarId: "sem-4", date: "2026-06-02", status: "present" },
        { seminarId: "sem-5", date: "2026-07-01", status: "present" },
        { seminarId: "sem-5", date: "2026-07-02", status: "present" },
      ];

      const passResult = calculateAttendanceMetrics(seminars, distributedPassRecords);
      expect(passResult.totalSlots).toBe(10);
      expect(passResult.attendedSlots).toBe(8);
      expect(passResult.attendanceRate).toBe(80);
      expect(passResult.sessionAbsenceViolation).toBe(false);
      expect(passResult.isAttendanceMet).toBe(true);

      // 7슬롯 출석 (70%): 불합격
      const failRecords = [
        ...distributedPassRecords.slice(0, 8), // 8개 중 6개 present
        { seminarId: "sem-5", date: "2026-07-01", status: "present" as const },
        { seminarId: "sem-5", date: "2026-07-02", status: "absent" as const },
      ];
      const failResult = calculateAttendanceMetrics(seminars, failRecords);
      expect(failResult.attendedSlots).toBe(7);
      expect(failResult.attendanceRate).toBe(70);
      expect(failResult.isAttendanceMet).toBe(false);
    });

    it("결석 탈락 규칙 (핵심): 2~6차 세미나 중 특정 회차의 양일(2일) 모두 결석하면 출석률 83%여도 실격", () => {
      // 12개 슬롯 중 10개 출석 (83%), 하지만 3차 세미나(sem-3) 토/일 모두 결석
      const violationRecords: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "present" },
        { seminarId: "sem-2", date: "2026-04-01", status: "present" },
        { seminarId: "sem-2", date: "2026-04-02", status: "present" },
        // sem-3 전일 결석!
        { seminarId: "sem-3", date: "2026-05-01", status: "absent" },
        { seminarId: "sem-3", date: "2026-05-02", status: "absent" },
        { seminarId: "sem-4", date: "2026-06-01", status: "present" },
        { seminarId: "sem-4", date: "2026-06-02", status: "present" },
        { seminarId: "sem-5", date: "2026-07-01", status: "present" },
        { seminarId: "sem-5", date: "2026-07-02", status: "present" },
        { seminarId: "sem-6", date: "2026-08-01", status: "present" },
        { seminarId: "sem-6", date: "2026-08-02", status: "present" },
      ];

      const result = calculateAttendanceMetrics(mockSeminars, violationRecords);
      expect(result.attendedSlots).toBe(10);
      expect(result.attendanceRate).toBe(83); // 83% >= 80%
      expect(result.sessionAbsenceViolation).toBe(true); // 하지만 3차 전일 결석
      expect(result.isAttendanceMet).toBe(false); // 최종 불합격!
    });

    it("세미나 3차에서 하루만 결석하고 하루는 출석한 경우 결석 탈락에 해당하지 않음", () => {
      const halfDayRecords: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "present" },
        { seminarId: "sem-2", date: "2026-04-01", status: "present" },
        { seminarId: "sem-2", date: "2026-04-02", status: "present" },
        { seminarId: "sem-3", date: "2026-05-01", status: "present" }, // 하루 출석
        { seminarId: "sem-3", date: "2026-05-02", status: "absent" },  // 하루 결석
        { seminarId: "sem-4", date: "2026-06-01", status: "present" },
        { seminarId: "sem-4", date: "2026-06-02", status: "present" },
        { seminarId: "sem-5", date: "2026-07-01", status: "present" },
        { seminarId: "sem-5", date: "2026-07-02", status: "present" },
        { seminarId: "sem-6", date: "2026-08-01", status: "present" },
        { seminarId: "sem-6", date: "2026-08-02", status: "present" },
      ];

      const result = calculateAttendanceMetrics(mockSeminars, halfDayRecords);
      expect(result.attendedSlots).toBe(11);
      expect(result.attendanceRate).toBe(92);
      expect(result.sessionAbsenceViolation).toBe(false);
      expect(result.isAttendanceMet).toBe(true);
    });

    it("타 기수 보강(Makeup) 출석 시 전일 결석 탈락 위반 구제 확인", () => {
      // 본 기수에서 sem-3 전일 결석
      const originalRecords: AttendanceRecordInfo[] = [
        { seminarId: "sem-1", date: "2026-03-01", status: "present" },
        { seminarId: "sem-1", date: "2026-03-02", status: "present" },
        { seminarId: "sem-2", date: "2026-04-01", status: "present" },
        { seminarId: "sem-2", date: "2026-04-02", status: "present" },
        { seminarId: "sem-3", date: "2026-05-01", status: "absent" },
        { seminarId: "sem-3", date: "2026-05-02", status: "absent" },
        { seminarId: "sem-4", date: "2026-06-01", status: "present" },
        { seminarId: "sem-4", date: "2026-06-02", status: "present" },
        { seminarId: "sem-5", date: "2026-07-01", status: "present" },
        { seminarId: "sem-5", date: "2026-07-02", status: "present" },
        { seminarId: "sem-6", date: "2026-08-01", status: "present" },
        { seminarId: "sem-6", date: "2026-08-02", status: "present" },
      ];

      // 다른 기수(cohort-2)의 3차 세미나에서 보강 출석함
      const makeupLookup = new Map<string, MakeupSeminarMatch>();
      makeupLookup.set("other-sem-3", {
        seminarId: "other-sem-3",
        sessionNumber: 3,
        seminarType: "two_day",
        startDate: "2026-05-15",
        endDate: "2026-05-16",
      });

      const makeupRecords: AttendanceRecordInfo[] = [
        { seminarId: "other-sem-3", date: "2026-05-15", status: "present" },
        { seminarId: "other-sem-3", date: "2026-05-16", status: "present" },
      ];

      const result = calculateAttendanceMetrics(mockSeminars, originalRecords, {
        makeups: {
          records: makeupRecords,
          seminarLookup: makeupLookup,
        },
      });

      expect(result.attendedSlots).toBe(12);
      expect(result.attendanceRate).toBe(100);
      expect(result.sessionAbsenceViolation).toBe(false); // 보강으로 실격 위반 해제!
      expect(result.isAttendanceMet).toBe(true);
    });
  });

  describe("2. 코칭 5대 쿼터 사정 검증 (calculateCoachingQuotas)", () => {
    it("수료 쿼터 (총 15건: 스포츠8, 일반2, 버디2, 멘토2, 수퍼비전1) 정확성", () => {
      const standardCompletion = calculateCoachingQuotas({
        sportsCount: 8,
        generalCount: 2,
        buddyCount: 2,
        mentorCount: 2,
        svCount: 1,
        totalApprovedMinutes: 900,
      });

      expect(standardCompletion.totalCount).toBe(15);
      expect(standardCompletion.coachingHours).toBe(15);
      expect(standardCompletion.completion.isMet).toBe(true);
      expect(standardCompletion.certification.isMet).toBe(false); // 인증은 20건(일반7) 필요하므로 미달
    });

    it("스포츠선수 코칭 1건 부족 시 수료 불합격", () => {
      const lackingSports = calculateCoachingQuotas({
        sportsCount: 7, // 8건 필수인데 7건
        generalCount: 3,
        buddyCount: 2,
        mentorCount: 2,
        svCount: 1,
      });

      expect(lackingSports.totalCount).toBe(15);
      expect(lackingSports.completion.sports.met).toBe(false);
      expect(lackingSports.completion.isMet).toBe(false);
    });

    it("수퍼비전(SVP) 1회 누락 시 수료 불합격", () => {
      const lackingSv = calculateCoachingQuotas({
        sportsCount: 8,
        generalCount: 3,
        buddyCount: 2,
        mentorCount: 2,
        svCount: 0, // 수퍼비전 없음
      });

      expect(lackingSv.totalCount).toBe(15);
      expect(lackingSv.completion.sv.met).toBe(false);
      expect(lackingSv.completion.isMet).toBe(false);
    });

    it("인증 쿼터 (총 20건: 스포츠8, 일반7, 버디2, 멘토2, 수퍼비전1) 완전 충족", () => {
      const standardCert = calculateCoachingQuotas({
        sportsCount: 8,
        generalCount: 7,
        buddyCount: 2,
        mentorCount: 2,
        svCount: 1,
        totalApprovedMinutes: 1200,
      });

      expect(standardCert.totalCount).toBe(20);
      expect(standardCert.coachingHours).toBe(20);
      expect(standardCert.completion.isMet).toBe(true);
      expect(standardCert.certification.isMet).toBe(true);
    });

    it("인증 쿼터에서 일반인 코칭 6회(1회 부족) 시 인증 불합격", () => {
      const lackingGeneral = calculateCoachingQuotas({
        sportsCount: 9, // 스포츠는 초과
        generalCount: 6, // 7건 필수인데 6건
        buddyCount: 2,
        mentorCount: 2,
        svCount: 1,
      });

      expect(lackingGeneral.totalCount).toBe(20);
      expect(lackingGeneral.completion.isMet).toBe(true);
      expect(lackingGeneral.certification.general.met).toBe(false);
      expect(lackingGeneral.certification.isMet).toBe(false);
    });
  });

  describe("3. 3단계 라이프사이클 종합 사정 검증 (evaluateLifecycleStage)", () => {
    const perfectAttendance = {
      totalSlots: 12,
      attendedSlots: 12,
      present: 12,
      late: 0,
      excused: 0,
      absent: 0,
      attendanceRate: 100,
      sessionAbsenceViolation: false,
      isAttendanceMet: true,
    };

    const completionCoaching = calculateCoachingQuotas({
      sportsCount: 8,
      generalCount: 2,
      buddyCount: 2,
      mentorCount: 2,
      svCount: 1,
    });

    const certCoaching = calculateCoachingQuotas({
      sportsCount: 8,
      generalCount: 7,
      buddyCount: 2,
      mentorCount: 2,
      svCount: 1,
    });

    it("1단계 수료 완료 조건: 출석80% + 교육50h + 코칭15회 쿼터", () => {
      const result = evaluateLifecycleStage({
        attendance: perfectAttendance,
        educationHours: 50,
        requiredEducationHours: 50,
        coaching: completionCoaching,
        bookReportCount: 0,
        essayCount: 0,
      });

      expect(result.isCompleted).toBe(true);
      expect(result.isCertEligible).toBe(false); // 과제 미제출이므로 인증자격은 아직 미충족
      expect(result.isCertified).toBe(false);
    });

    it("교육 이수 시간 미달(45시간) 시 1단계 수료 실패", () => {
      const result = evaluateLifecycleStage({
        attendance: perfectAttendance,
        educationHours: 45,
        requiredEducationHours: 50,
        coaching: completionCoaching,
        bookReportCount: 2,
        essayCount: 1,
      });

      expect(result.isCompleted).toBe(false);
      expect(result.isCertEligible).toBe(false);
    });

    it("2단계 인증시험 응시자격 완료 조건: 1단계 수료 + 코칭20회 + 독후감2편 + 에세이1편", () => {
      const result = evaluateLifecycleStage({
        attendance: perfectAttendance,
        educationHours: 50,
        coaching: certCoaching,
        bookReportCount: 2,
        essayCount: 1,
      });

      expect(result.isCompleted).toBe(true);
      expect(result.isCertEligible).toBe(true);
      expect(result.progressRate).toBe(100);
    });

    it("독후감이 1편(부족)인 경우 인증자격 미부여", () => {
      const result = evaluateLifecycleStage({
        attendance: perfectAttendance,
        educationHours: 50,
        coaching: certCoaching,
        bookReportCount: 1, // 2편 필요
        essayCount: 1,
      });

      expect(result.isCompleted).toBe(true);
      expect(result.isCertEligible).toBe(false);
      expect(result.progressRate).toBeLessThan(100);
    });

    it("3단계 공식 자격 취득(Certified) 연동", () => {
      const activeCertResult = evaluateLifecycleStage({
        attendance: perfectAttendance,
        educationHours: 50,
        coaching: certCoaching,
        bookReportCount: 2,
        essayCount: 1,
        hasActiveCert: true,
      });

      expect(activeCertResult.isCertified).toBe(true);
      expect(activeCertResult.isCertEligible).toBe(true);
      expect(activeCertResult.isCompleted).toBe(true);
    });
  });
});
