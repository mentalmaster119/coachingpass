import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import type { QueryCtx, MutationCtx } from "./_generated/server.d.ts";
import type { Id, Doc } from "./_generated/dataModel.d.ts";

type AttendanceStatus = "present" | "absent" | "late" | "excused";

type AttendanceWithUser = Doc<"attendances"> & {
  user: { _id: Id<"users">; name?: string; email?: string; certificationGoal: "SMPCC" } | null;
};

async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user || user.role !== "admin")
    throw new ConvexError({ message: "관리자 권한이 필요합니다", code: "FORBIDDEN" });
  return user;
}

// Get attendance records for a seminar (with user info)
export const getBySeminar = query({
  args: { seminarId: v.id("seminars") },
  handler: async (ctx, args): Promise<AttendanceWithUser[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const records = await ctx.db
      .query("attendances")
      .withIndex("by_seminar", (q) => q.eq("seminarId", args.seminarId))
      .collect();
    return await Promise.all(
      records.map(async (r) => {
        const user = await ctx.db.get(r.userId);
        return {
          ...r,
          user: user
            ? { _id: user._id, name: user.name, email: user.email, certificationGoal: "SMPCC" as const }
            : null,
        };
      })
    );
  },
});

// Helper function to calculate a user's attendance stats for a cohort, accounting for make-up classes
export async function calculateUserCohortAttendance(
  ctx: QueryCtx,
  cohortId: Id<"cohorts">,
  userId: Id<"users">,
  twoDayOnly?: boolean
) {
  // 1. Get all seminars for this cohort
  let seminars = await ctx.db
    .query("seminars")
    .withIndex("by_cohort", (q) => q.eq("cohortId", cohortId))
    .collect();
  if (twoDayOnly) {
    seminars = seminars.filter((s) => s.seminarType === "two_day");
  }
  
  // 2. Get attendance records for this user in this cohort
  const attendanceRecords = await ctx.db
    .query("attendances")
    .withIndex("by_cohort_and_user", (q) =>
      q.eq("cohortId", cohortId).eq("userId", userId)
    )
    .collect();

  // 3. Find other cohorts and makeup sessions
  const memberships = await ctx.db
    .query("cohortMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  const otherCohortIds = memberships
    .map((m) => m.cohortId)
    .filter((id) => id !== cohortId);
  
  // Build a list of all other attendances
  let allAttendances = [...attendanceRecords];
  for (const otherId of otherCohortIds) {
    const otherCohortAttendances = await ctx.db
      .query("attendances")
      .withIndex("by_cohort_and_user", (q) => q.eq("cohortId", otherId).eq("userId", userId))
      .collect();
    allAttendances.push(...otherCohortAttendances);
  }

  // Cache other seminars to check their session number and type
  const seminarCache = new Map<string, Doc<"seminars">>();
  for (const s of seminars) {
    seminarCache.set(s._id, s);
  }

  const getCachedSeminar = async (seminarId: Id<"seminars">) => {
    const key = seminarId;
    if (seminarCache.has(key)) return seminarCache.get(key)!;
    const s = await ctx.db.get(seminarId);
    if (s) seminarCache.set(key, s);
    return s;
  };

  let totalSlots = 0;
  let present = 0;
  let late = 0;
  let excused = 0;
  let absent = 0;
  let sessionAbsenceViolation = false;

  for (const seminar of seminars) {
    const dates = seminar.startDate === seminar.endDate 
      ? [seminar.startDate] 
      : [seminar.startDate, seminar.endDate];
    
    let attendedSessionSlots = 0;
    
    for (let dayIndex = 0; dayIndex < dates.length; dayIndex++) {
      totalSlots++;
      const targetDate = dates[dayIndex];
      
      // Check if there's a record for this seminar and date in this cohort
      let record = attendanceRecords.find(
        (r) => r.seminarId === seminar._id && r.date === targetDate
      );
      
      // If not found or absent, check if there is a makeup in another cohort
      if (!record || record.status === "absent") {
        for (const r of allAttendances) {
          if (r.cohortId === cohortId) continue;
          if (r.status === "absent") continue;
          
          const otherSem = await getCachedSeminar(r.seminarId);
          if (otherSem && otherSem.sessionNumber === seminar.sessionNumber && otherSem.seminarType === seminar.seminarType) {
            const otherDates = otherSem.startDate === otherSem.endDate
              ? [otherSem.startDate]
              : [otherSem.startDate, otherSem.endDate];
            if (r.date === otherDates[dayIndex]) {
              record = r;
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

    // Violation check: absent from ALL slots of a seminar session between session 2 and 6
    if (attendedSessionSlots === 0 && seminar.sessionNumber >= 2 && seminar.sessionNumber <= 6) {
      sessionAbsenceViolation = true;
    }
  }

  const attended = present + late + excused;
  const attendanceRate = totalSlots > 0 ? Math.round((attended / totalSlots) * 100) : 0;
  
  return {
    total: totalSlots,
    attendedSlots: attended,
    present,
    late,
    excused,
    absent,
    attendanceRate,
    sessionAbsenceViolation,
    records: attendanceRecords,
  };
}

// Get attendance summary for a user across a cohort
export const getUserSummary = query({
  args: { cohortId: v.id("cohorts"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    return await calculateUserCohortAttendance(ctx, args.cohortId, args.userId);
  },
});

// Get attendance summary for all members of a cohort
export const getCohortSummary = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    // Get all members
    const members = await ctx.db
      .query("cohortMembers")
      .withIndex("by_cohort", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    const activeMembers = members.filter((m) => m.status === "active");

    return await Promise.all(
      activeMembers.map(async (m) => {
        const user = await ctx.db.get(m.userId);
        const stats = await calculateUserCohortAttendance(ctx, args.cohortId, m.userId);
        return {
          userId: m.userId,
          memberStatus: m.status,
          name: user?.name,
          email: user?.email,
          certificationGoal: "SMPCC" as const,
          totalSeminars: stats.total,
          recorded: stats.records.length,
          present: stats.present,
          late: stats.late,
          excused: stats.excused,
          absent: stats.absent,
          attendanceRate: stats.attendanceRate,
        };
      })
    );
  },
});

// Upsert (create or update) a single attendance record
export const upsert = mutation({
  args: {
    seminarId: v.id("seminars"),
    cohortId: v.id("cohorts"),
    userId: v.id("users"),
    date: v.string(),
    status: v.union(
      v.literal("present"),
      v.literal("absent"),
      v.literal("late"),
      v.literal("excused"),
    ),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db
      .query("attendances")
      .withIndex("by_seminar_and_user_and_date", (q) =>
        q.eq("seminarId", args.seminarId).eq("userId", args.userId).eq("date", args.date)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        note: args.note,
        recordedBy: admin._id,
      });
    } else {
      await ctx.db.insert("attendances", {
        seminarId: args.seminarId,
        cohortId: args.cohortId,
        userId: args.userId,
        date: args.date,
        status: args.status,
        note: args.note,
        recordedBy: admin._id,
      });
    }
  },
});

// Bulk upsert for an entire seminar session (admin)
export const bulkUpsert = mutation({
  args: {
    seminarId: v.id("seminars"),
    cohortId: v.optional(v.id("cohorts")),
    records: v.array(
      v.object({
        userId: v.id("users"),
        date: v.string(),
        status: v.union(
          v.literal("present"),
          v.literal("absent"),
          v.literal("late"),
          v.literal("excused"),
        ),
        note: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    for (const rec of args.records) {
      const existing = await ctx.db
        .query("attendances")
        .withIndex("by_seminar_and_user_and_date", (q) =>
          q.eq("seminarId", args.seminarId).eq("userId", rec.userId).eq("date", rec.date)
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, {
          status: rec.status,
          note: rec.note,
          recordedBy: admin._id,
        });
      } else {
        let cohortId = args.cohortId;
        if (!cohortId) {
          const membership = await ctx.db
            .query("cohortMembers")
            .withIndex("by_user", (q) => q.eq("userId", rec.userId))
            .first();
          if (membership) {
            cohortId = membership.cohortId;
          }
        }

        await ctx.db.insert("attendances", {
          seminarId: args.seminarId,
          cohortId,
          userId: rec.userId,
          date: rec.date,
          status: rec.status,
          note: rec.note,
          recordedBy: admin._id,
        });
      }
    }
  },
});

// ── Trainee self check-in ─────────────────────────────────────────────────────

export const selfCheckIn = mutation({
  args: { 
    seminarId: v.id("seminars"),
    date: v.string()
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "사용자를 찾을 수 없습니다", code: "NOT_FOUND" });

    const seminar = await ctx.db.get(args.seminarId);
    if (!seminar) throw new ConvexError({ message: "세미나를 찾을 수 없습니다", code: "NOT_FOUND" });

    // Validate date
    const validDates = seminar.startDate === seminar.endDate
      ? [seminar.startDate]
      : [seminar.startDate, seminar.endDate];
    if (!validDates.includes(args.date)) {
      throw new ConvexError({ message: "세미나 일정이 아닌 날짜에는 출석할 수 없습니다.", code: "BAD_REQUEST" });
    }

    const existing = await ctx.db
      .query("attendances")
      .withIndex("by_seminar_and_user_and_date", (q) =>
        q.eq("seminarId", args.seminarId).eq("userId", user._id).eq("date", args.date)
      )
      .unique();

    const now = new Date().toISOString();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: "present",
        selfCheckedIn: true,
        checkedInAt: now,
        recordedBy: user._id,
      });
    } else {
      let cohortId = seminar.cohortId;
      if (!cohortId) {
        const membership = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .first();
        if (membership) {
          cohortId = membership.cohortId;
        }
      }

      await ctx.db.insert("attendances", {
        seminarId: args.seminarId,
        cohortId,
        userId: user._id,
        date: args.date,
        status: "present",
        selfCheckedIn: true,
        checkedInAt: now,
        recordedBy: user._id,
      });
    }
  },
});

// Get ALL seminars across all cohorts the user belongs to (for combined view)
export const getAllMySeminars = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[]; cohortName: string; cohortNumber: number }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const result: Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[]; cohortName: string; cohortNumber: number }> = [];

    // Fetch common seminars (where cohortId is undefined or null)
    const allSeminars = await ctx.db.query("seminars").collect();
    const commonSeminars = allSeminars.filter((s) => s.cohortId === undefined || s.cohortId === null);
    for (const s of commonSeminars) {
      const existing = await ctx.db
        .query("attendances")
        .withIndex("by_seminar_and_user", (q) => q.eq("seminarId", s._id).eq("userId", user._id))
        .collect();
      result.push({ ...s, myAttendances: existing, cohortName: "공통", cohortNumber: 0 });
    }

    for (const m of memberships) {
      const cohort = await ctx.db.get(m.cohortId);
      if (!cohort) continue;

      const seminars = await ctx.db
        .query("seminars")
        .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", m.cohortId))
        .collect();

      for (const s of seminars) {
        const existing = await ctx.db
          .query("attendances")
          .withIndex("by_seminar_and_user", (q) => q.eq("seminarId", s._id).eq("userId", user._id))
          .collect();
        result.push({ ...s, myAttendances: existing, cohortName: cohort.name, cohortNumber: cohort.number });
      }
    }

    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

// Get the list of cohorts the current user belongs to
export const getMyCohorts = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"cohorts">>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const cohorts: Doc<"cohorts">[] = [];
    for (const m of memberships) {
      const cohort = await ctx.db.get(m.cohortId);
      if (cohort) cohorts.push(cohort);
    }
    return cohorts.sort((a, b) => b.number - a.number);
  },
});

// Get seminars for a specific cohort with my attendance
export const getSeminarsByCohort = query({
  args: { cohortId: v.id("cohorts") },
  handler: async (ctx, args): Promise<Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[] }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const cohortSeminars = await ctx.db
      .query("seminars")
      .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", args.cohortId))
      .collect();

    const allSeminars = await ctx.db.query("seminars").collect();
    const commonSeminars = allSeminars.filter((s) => s.cohortId === undefined || s.cohortId === null);
    const seminars = [...cohortSeminars, ...commonSeminars];

    const result: Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[] }> = [];
    for (const s of seminars) {
      const existing = await ctx.db
        .query("attendances")
        .withIndex("by_seminar_and_user", (q) => q.eq("seminarId", s._id).eq("userId", user._id))
        .collect();
      result.push({ ...s, myAttendances: existing });
    }
    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});

// Get seminars for the trainee's cohort (upcoming + recent)
export const getMyUpcomingSeminars = query({
  args: {},
  handler: async (ctx): Promise<Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[] }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const memberships = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const activeMemberships = memberships.filter((m) => m.status === "active");
    if (activeMemberships.length === 0) return [];

    const today = new Date().toISOString().slice(0, 10);
    const result: Array<Doc<"seminars"> & { myAttendances: Doc<"attendances">[] }> = [];

    // Fetch common seminars
    const allSeminars = await ctx.db.query("seminars").collect();
    const commonSeminars = allSeminars.filter((s) => s.cohortId === undefined || s.cohortId === null);
    for (const s of commonSeminars) {
      const existing = await ctx.db
        .query("attendances")
        .withIndex("by_seminar_and_user", (q) =>
          q.eq("seminarId", s._id).eq("userId", user._id)
        )
        .collect();
      result.push({ ...s, myAttendances: existing });
    }

    for (const m of activeMemberships) {
      const seminars = await ctx.db
        .query("seminars")
        .withIndex("by_cohort_and_date", (q) => q.eq("cohortId", m.cohortId))
        .collect();
      for (const s of seminars) {
        const existing = await ctx.db
          .query("attendances")
          .withIndex("by_seminar_and_user", (q) =>
            q.eq("seminarId", s._id).eq("userId", user._id)
          )
          .collect();
        result.push({ ...s, myAttendances: existing });
      }
    }

    return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
  },
});
