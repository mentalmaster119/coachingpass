import type { QueryCtx } from "./mockAuth";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

export const DEFAULT_COURSE_CREDITS: Record<string, number> = {
  expert: 60,
  mspe: 16,
  sp_cp: 15,
  kac: 20,
  kpc: 40,
};

function resolveCourseCode(
  seminar: Doc<"seminars">,
  cohort?: Doc<"cohorts"> | null
): string {
  if (seminar.courseCode) return seminar.courseCode;
  if (cohort?.courseCode) return cohort.courseCode;

  const text = `${cohort?.name || ""} ${seminar.title} ${seminar.description || ""}`.toLowerCase();
  if (text.includes("mspe") || text.includes("명상")) return "mspe";
  if (text.includes("심리학") || text.includes("강독") || text.includes("sp") || text.includes("cp")) return "sp_cp";
  if (text.includes("kac")) return "kac";
  if (text.includes("kpc")) return "kpc";
  if (text.includes("트레이닝") || text.includes("멘탈트레이닝")) return "course_1791683370051";
  return "expert";
}

export interface EducationCalculationResult {
  approvedEducationHours: number;
  educationRecordsHours: number;
  bcpHours: number;
  buddyHours: number;
  seminarAttendanceHours: number;
  forumHours: number;
  educationPendingCount: number;
  byDate: Map<string, number>;
  attendanceActivityItems: {
    type: "education";
    date: string;
    title: string;
    hours: number;
    status: "approved";
  }[];
  educationRecords: Doc<"educationRecords">[];
  coachingLogs: Doc<"coachingLogs">[];
  bcpLogs: Doc<"bcpLogs">[];
}

export async function calculateUserEducation(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<EducationCalculationResult> {
  const [educationRecords, coachingLogs, bcpLogs, attendances, forumAttendances, courseCreditsList] =
    await Promise.all([
      ctx.db.query("educationRecords").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("attendances").withIndex("by_user", (q) => q.eq("userId", userId)).collect(),
      ctx.db.query("forumAttendances").withIndex("by_user_and_status", (q) => q.eq("userId", userId).eq("status", "approved")).collect(),
      ctx.db.query("courseCredits").collect(),
    ]);

  const courseCreditsMap = new Map<string, number>();
  for (const cc of courseCreditsList) {
    if (cc.courseKey && typeof cc.creditHours === "number") {
      courseCreditsMap.set(cc.courseKey, cc.creditHours);
    }
  }

  const getCourseCreditHours = (code: string) => {
    return courseCreditsMap.get(code) ?? DEFAULT_COURSE_CREDITS[code] ?? 60;
  };

  const byDate = new Map<string, number>();
  const attendanceActivityItems: {
    type: "education";
    date: string;
    title: string;
    hours: number;
    status: "approved";
  }[] = [];

  // 1. Process Seminar Attendances
  const validAttendances = attendances.filter(
    (a) => a.status === "present" || a.status === "late" || a.status === "excused"
  );

  const seminarCache = new Map<string, Doc<"seminars"> | null>();
  const cohortCache = new Map<string, Doc<"cohorts"> | null>();
  const cohortTotalDaysCache = new Map<string, number>();

  const getSeminar = async (id: Id<"seminars">): Promise<Doc<"seminars"> | null> => {
    if (!seminarCache.has(id)) {
      seminarCache.set(id, await ctx.db.get(id));
    }
    return seminarCache.get(id) ?? null;
  };

  const getCohort = async (id: Id<"cohorts">): Promise<Doc<"cohorts"> | null> => {
    if (!cohortCache.has(id)) {
      cohortCache.set(id, await ctx.db.get(id));
    }
    return cohortCache.get(id) ?? null;
  };

  const getCohortTotalDays = async (cohortId: Id<"cohorts">) => {
    if (!cohortTotalDaysCache.has(cohortId)) {
      const cohortSeminars = await ctx.db
        .query("seminars")
        .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
        .collect();
      let days = 0;
      for (const s of cohortSeminars) {
        days += s.startDate === s.endDate ? 1 : 2;
      }
      cohortTotalDaysCache.set(cohortId, days);
    }
    return cohortTotalDaysCache.get(cohortId)!;
  };

  // Dedup seminar attendance days (in case multiple records exist for same seminar date)
  const seenSeminarDates = new Set<string>();
  const uniqueAttendances: {
    seminarId: Id<"seminars">;
    cohortId?: Id<"cohorts">;
    date: string;
  }[] = [];

  for (const a of validAttendances) {
    const sem = await getSeminar(a.seminarId);
    if (!sem) continue;
    const attDate = a.date || sem.startDate;
    const key = `${a.seminarId}_${attDate}`;
    if (!seenSeminarDates.has(key)) {
      seenSeminarDates.add(key);
      uniqueAttendances.push({
        seminarId: a.seminarId,
        cohortId: a.cohortId || sem.cohortId,
        date: attDate,
      });
    }
  }

  uniqueAttendances.sort((a, b) => a.date.localeCompare(b.date));

  const earnedByQuotaKey = new Map<string, number>();
  let seminarAttendanceHours = 0;

  for (const att of uniqueAttendances) {
    const sem = await getSeminar(att.seminarId);
    if (!sem) continue;
    const cohort = att.cohortId ? await getCohort(att.cohortId) : null;
    const courseCode = resolveCourseCode(sem, cohort);
    const courseTotalHours = getCourseCreditHours(courseCode);
    const quotaKey = att.cohortId ? String(att.cohortId) : courseCode;

    const currentEarned = earnedByQuotaKey.get(quotaKey) ?? 0;
    if (currentEarned >= courseTotalHours) {
      continue;
    }

    let dailyHours = 5;
    if (att.cohortId) {
      const totalCohortDays = await getCohortTotalDays(att.cohortId);
      if (totalCohortDays > 0) {
        dailyHours = courseTotalHours / totalCohortDays;
      } else {
        dailyHours = sem.seminarType === "two_day" ? courseTotalHours / 12 : courseTotalHours;
      }
    } else {
      dailyHours = sem.seminarType === "two_day" ? courseTotalHours / 12 : courseTotalHours;
    }

    const hoursToGrant = Math.min(dailyHours, courseTotalHours - currentEarned);
    const roundedHours = Math.round(hoursToGrant * 10) / 10;
    earnedByQuotaKey.set(quotaKey, currentEarned + roundedHours);
    seminarAttendanceHours += roundedHours;

    const prevDateHours = byDate.get(att.date) ?? 0;
    byDate.set(att.date, prevDateHours + roundedHours);

    attendanceActivityItems.push({
      type: "education",
      date: att.date,
      title: `${sem.title} 출석`,
      hours: roundedHours,
      status: "approved",
    });
  }

  // 2. Process Forum Attendances
  let forumHours = 0;
  for (const fa of forumAttendances) {
    const forum = await ctx.db.get(fa.forumId);
    if (forum) {
      const hours = forum.creditHours ?? 2;
      forumHours += hours;
      const prevDateHours = byDate.get(forum.forumDate) ?? 0;
      byDate.set(forum.forumDate, prevDateHours + hours);

      attendanceActivityItems.push({
        type: "education",
        date: forum.forumDate,
        title: `${forum.title} (멘탈포럼)`,
        hours,
        status: "approved",
      });
    }
  }

  // 3. Process Education Records
  const approvedEduRecords = educationRecords.filter((r) => r.approvalStatus === "approved");
  const educationRecordsHours = approvedEduRecords.reduce((sum, r) => sum + r.hours, 0);
  for (const r of approvedEduRecords) {
    const prevDateHours = byDate.get(r.educationDate) ?? 0;
    byDate.set(r.educationDate, prevDateHours + r.hours);
  }

  // 4. Process BCP Logs
  const approvedBcp = bcpLogs.filter((b) => b.approvalStatus === "approved");
  const bcpHours = approvedBcp.reduce((sum, b) => sum + b.durationMinutes, 0) / 60;
  for (const b of approvedBcp) {
    const prevDateHours = byDate.get(b.sessionDate) ?? 0;
    byDate.set(b.sessionDate, prevDateHours + b.durationMinutes / 60);
  }

  // 5. Process Buddy Coaching
  const approvedBuddy = coachingLogs.filter((l) => l.coachingType === "buddy" && l.approvalStatus === "approved");
  const buddyHours = approvedBuddy.reduce((sum, l) => sum + l.durationMinutes, 0) / 60;
  for (const l of approvedBuddy) {
    const prevDateHours = byDate.get(l.coachingDate) ?? 0;
    byDate.set(l.coachingDate, prevDateHours + l.durationMinutes / 60);
  }

  const approvedEducationHours =
    Math.round(
      (educationRecordsHours +
        bcpHours +
        buddyHours +
        seminarAttendanceHours +
        forumHours) *
        10
    ) / 10;

  return {
    approvedEducationHours,
    educationRecordsHours,
    bcpHours,
    buddyHours,
    seminarAttendanceHours: Math.round(seminarAttendanceHours * 10) / 10,
    forumHours,
    educationPendingCount: educationRecords.filter((r) => r.approvalStatus === "pending").length,
    byDate,
    attendanceActivityItems,
    educationRecords,
    coachingLogs,
    bcpLogs,
  };
}
