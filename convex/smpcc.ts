import { ConvexError, v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { requireAdmin } from "./helpers";
import { calculateUserCohortAttendance } from "./attendance";

// ── SMPCC 자격 취득 기록 ────────────────────────────────────────────────────

/** 수강생 본인의 SMPCC 자격 현황 조회 */
export const getMyCertification = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return null;

    const certs = await ctx.db
      .query("smpccCertifications")
      .withIndex("by_user", (q) => q.eq("userId", me._id))
      .collect();

    const active = certs.find((c) => c.status === "active");
    return { cert: active ?? null, history: certs };
  },
});

/** 관리자: 모든 SMPCC 자격 목록 */
export const getAllCertifications = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const certs = await ctx.db.query("smpccCertifications").collect();
    return await Promise.all(
      certs.map(async (c) => {
        const user = await ctx.db.get(c.userId);
        return { ...c, userName: user?.name ?? "알 수 없음", userEmail: user?.email ?? "" };
      })
    );
  },
});

/** 관리자: 수료 기준 통과 수강생 목록 (기수 포함, SMPCC 자격 현황용) */
export const getCompletedTraineesWithCohort = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const cohorts = await ctx.db.query("cohorts").collect();

    // 모든 기수 멤버십 수집
    const allMemberships = await ctx.db.query("cohortMembers").collect();

    // 승인된 trainee 목록
    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();
    const approvedTrainees = trainees.filter((u) => u.approvalStatus === "approved");

    const results = await Promise.all(
      approvedTrainees.map(async (user) => {
        // 수료 기준 확인: 코칭 10건 이상 + 기수 출석 80% 이상 (모든 기수 중 하나라도 통과하면 됨)
        const approvedLogs = await ctx.db
          .query("coachingLogs")
          .withIndex("by_user_and_status", (q) => q.eq("userId", user._id).eq("approvalStatus", "approved"))
          .collect();
        const coachingOk = approvedLogs.length >= 10;

        // 이 사용자가 속한 기수 찾기
        const memberships = allMemberships.filter((m) => m.userId === user._id);
        let isCompleted = false;
        let cohortNumber: number | null = null;
        let cohortName: string | null = null;

        for (const membership of memberships) {
          const cohort = cohorts.find((c) => c._id === membership.cohortId);
          if (!cohort) continue;

          const stats = await calculateUserCohortAttendance(ctx, membership.cohortId, user._id);
          const attendanceOk = stats.attendanceRate >= 80 && !stats.sessionAbsenceViolation;

          if (coachingOk && attendanceOk) {
            isCompleted = true;
            cohortNumber = cohort.number;
            cohortName = cohort.name;
            break;
          }

          // 기수 정보는 첫 번째 기수로 기본 설정
          if (cohortNumber === null) {
            cohortNumber = cohort.number;
            cohortName = cohort.name;
          }
        }

        // 기수 없는 경우도 포함 (수료 여부와 무관하게 반환, 필터링은 프론트에서)
        const cert = await ctx.db
          .query("smpccCertifications")
          .withIndex("by_user", (q) => q.eq("userId", user._id))
          .collect();
        const activeCert = cert.find((c) => c.status === "active") ?? null;

        return {
          userId: user._id,
          name: user.name ?? "이름 미설정",
          email: user.email ?? "",
          cohortNumber,
          cohortName,
          isCompleted,
          hasActiveCert: activeCert !== null,
          certExpiresAt: activeCert?.expiresAt ?? null,
          certIssuedAt: activeCert?.issuedAt ?? null,
          certId: activeCert?._id ?? null,
        };
      })
    );

    // 수료 기준 통과한 수강생만 반환
    return results.filter((r) => r.isCompleted);
  },
});

/** 관리자: 특정 사용자 SMPCC 자격 기록 */
export const getUserCertification = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    return await ctx.db
      .query("smpccCertifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

/** 관리자: SMPCC 자격 발급 (인증시험 통과 후) */
export const issueCertification = mutation({
  args: {
    userId: v.id("users"),
    issuedAt: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin) throw new ConvexError({ message: "Admin not found", code: "NOT_FOUND" });

    // 기존 active 자격 → renewed
    const existing = await ctx.db
      .query("smpccCertifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    for (const cert of existing.filter((c) => c.status === "active")) {
      await ctx.db.patch(cert._id, { status: "renewed" });
    }

    const issued = new Date(args.issuedAt);
    const expires = new Date(issued);
    expires.setFullYear(expires.getFullYear() + 3);
    const expiresAt = expires.toISOString().slice(0, 10);

    return await ctx.db.insert("smpccCertifications", {
      userId: args.userId,
      issuedAt: args.issuedAt,
      expiresAt,
      status: "active",
      issuedBy: admin._id,
      notes: args.notes,
    });
  },
});

/** 관리자: SMPCC 자격 갱신 */
export const renewCertification = mutation({
  args: {
    certId: v.id("smpccCertifications"),
    renewedAt: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin) throw new ConvexError({ message: "Admin not found", code: "NOT_FOUND" });

    const oldCert = await ctx.db.get(args.certId);
    if (!oldCert) throw new ConvexError({ message: "자격 기록을 찾을 수 없습니다.", code: "NOT_FOUND" });

    await ctx.db.patch(args.certId, { status: "renewed" });

    const renewed = new Date(args.renewedAt);
    const expires = new Date(renewed);
    expires.setFullYear(expires.getFullYear() + 3);
    const expiresAt = expires.toISOString().slice(0, 10);

    return await ctx.db.insert("smpccCertifications", {
      userId: oldCert.userId,
      issuedAt: args.renewedAt,
      expiresAt,
      status: "active",
      issuedBy: admin._id,
      notes: args.notes,
      renewedFromId: args.certId,
    });
  },
});

/** 관리자: 만료된 자격 일괄 처리 */
export const expireOldCertifications = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const today = new Date().toISOString().slice(0, 10);
    const activeCerts = await ctx.db
      .query("smpccCertifications")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    let count = 0;
    for (const cert of activeCerts) {
      if (cert.expiresAt < today) {
        await ctx.db.patch(cert._id, { status: "expired" });
        count++;
      }
    }
    return { expired: count };
  },
});

// ── 멘탈 포럼 ────────────────────────────────────────────────────────────────

export const listForums = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const forums = await ctx.db.query("mentalForums").order("desc").collect();
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return forums.map((f) => ({ ...f, myStatus: null as string | null, attendeeCount: 0 }));

    return await Promise.all(
      forums.map(async (f) => {
        const attendance = await ctx.db
          .query("forumAttendances")
          .withIndex("by_forum_and_user", (q) => q.eq("forumId", f._id).eq("userId", me._id))
          .unique();
        const allAttendees = await ctx.db
          .query("forumAttendances")
          .withIndex("by_forum", (q) => q.eq("forumId", f._id))
          .collect();
        return {
          ...f,
          myStatus: attendance?.status ?? null,
          attendeeCount: allAttendees.filter((a) => a.status === "approved").length,
        };
      })
    );
  },
});

export const createForum = mutation({
  args: {
    title: v.string(),
    forumDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    creditHours: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me || (me.role !== "admin" && me.role !== "senior_coach")) {
      throw new ConvexError({ message: "관리자 권한이 필요합니다.", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("mentalForums", { ...args, createdBy: me._id });
  },
});

export const updateForum = mutation({
  args: {
    forumId: v.id("mentalForums"),
    title: v.optional(v.string()),
    forumDate: v.optional(v.string()),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    location: v.optional(v.string()),
    description: v.optional(v.string()),
    creditHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const { forumId, ...fields } = args;
    await ctx.db.patch(forumId, fields);
  },
});

export const deleteForum = mutation({
  args: { forumId: v.id("mentalForums") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.delete(args.forumId);
  },
});

// ── 포럼 참석 신청 ────────────────────────────────────────────────────────────

export const applyForForum = mutation({
  args: { forumId: v.id("mentalForums") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const existing = await ctx.db
      .query("forumAttendances")
      .withIndex("by_forum_and_user", (q) => q.eq("forumId", args.forumId).eq("userId", me._id))
      .unique();
    if (existing) throw new ConvexError({ message: "이미 신청하셨습니다.", code: "CONFLICT" });

    await ctx.db.insert("forumAttendances", {
      forumId: args.forumId,
      userId: me._id,
      appliedAt: new Date().toISOString(),
      status: "pending",
    });
  },
});

export const cancelForumApplication = mutation({
  args: { forumId: v.id("mentalForums") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const attendance = await ctx.db
      .query("forumAttendances")
      .withIndex("by_forum_and_user", (q) => q.eq("forumId", args.forumId).eq("userId", me._id))
      .unique();
    if (!attendance) throw new ConvexError({ message: "신청 기록이 없습니다.", code: "NOT_FOUND" });
    if (attendance.status === "approved") {
      throw new ConvexError({ message: "이미 승인된 신청은 취소할 수 없습니다.", code: "BAD_REQUEST" });
    }
    await ctx.db.delete(attendance._id);
  },
});

export const getForumAttendees = query({
  args: { forumId: v.id("mentalForums") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const attendances = await ctx.db
      .query("forumAttendances")
      .withIndex("by_forum", (q) => q.eq("forumId", args.forumId))
      .collect();
    return await Promise.all(
      attendances.map(async (a) => {
        const user = await ctx.db.get(a.userId);
        return { ...a, userName: user?.name ?? "알 수 없음", userEmail: user?.email ?? "" };
      })
    );
  },
});

export const approveForumAttendance = mutation({
  args: { attendanceId: v.id("forumAttendances") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin || admin.role !== "admin") {
      throw new ConvexError({ message: "관리자 권한이 필요합니다.", code: "FORBIDDEN" });
    }
    await ctx.db.patch(args.attendanceId, {
      status: "approved",
      approvedBy: admin._id,
      approvedAt: new Date().toISOString(),
    });
  },
});

export const rejectForumAttendance = mutation({
  args: {
    attendanceId: v.id("forumAttendances"),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.db.patch(args.attendanceId, {
      status: "rejected",
      rejectionReason: args.reason,
    });
  },
});

// ── 누적 인증 시간 ────────────────────────────────────────────────────────────

/** 수강생 본인의 인정 교육시간 누적 조회 */
export const getMyCreditHours = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const me = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!me) return null;

    const forumAttendances = await ctx.db
      .query("forumAttendances")
      .withIndex("by_user_and_status", (q) => q.eq("userId", me._id).eq("status", "approved"))
      .collect();
    let forumHours = 0;
    for (const fa of forumAttendances) {
      const forum = await ctx.db.get(fa.forumId);
      forumHours += forum?.creditHours ?? 0;
    }

    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user_and_status", (q) => q.eq("userId", me._id).eq("approvalStatus", "approved"))
      .collect();
    const educationHours = educationRecords.reduce((sum: number, r) => sum + (r.hours ?? 0), 0);

    const breakdown = [
      { key: "mental_forum", label: "멘탈 포럼", hours: forumHours, count: forumAttendances.length },
      { key: "education_record", label: "교육 이수 기록", hours: educationHours, count: educationRecords.length },
    ];
    return { totalHours: forumHours + educationHours, breakdown };
  },
});

/** 관리자: 특정 사용자의 인정 교육시간 */
export const getUserCreditHours = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const forumAttendances = await ctx.db
      .query("forumAttendances")
      .withIndex("by_user_and_status", (q) => q.eq("userId", args.userId).eq("status", "approved"))
      .collect();
    let forumHours = 0;
    for (const fa of forumAttendances) {
      const forum = await ctx.db.get(fa.forumId);
      forumHours += forum?.creditHours ?? 0;
    }

    const educationRecords = await ctx.db
      .query("educationRecords")
      .withIndex("by_user_and_status", (q) => q.eq("userId", args.userId).eq("approvalStatus", "approved"))
      .collect();
    const educationHours = educationRecords.reduce((sum: number, r) => sum + (r.hours ?? 0), 0);

    const breakdown = [
      { key: "mental_forum", label: "멘탈 포럼", hours: forumHours, count: forumAttendances.length },
      { key: "education_record", label: "교육 이수 기록", hours: educationHours, count: educationRecords.length },
    ];
    return { totalHours: forumHours + educationHours, breakdown };
  },
});

// ── 과정별 인정시간 설정 ─────────────────────────────────────────────────────

export const listCourseCredits = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    return await ctx.db.query("courseCredits").collect();
  },
});

export const upsertCourseCredit = mutation({
  args: {
    courseKey: v.string(),
    courseName: v.string(),
    creditHours: v.number(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    const admin = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!admin || admin.role !== "admin") {
      throw new ConvexError({ message: "관리자 권한이 필요합니다.", code: "FORBIDDEN" });
    }

    const existing = await ctx.db
      .query("courseCredits")
      .withIndex("by_key", (q) => q.eq("courseKey", args.courseKey))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        courseName: args.courseName,
        creditHours: args.creditHours,
        description: args.description,
        updatedBy: admin._id,
      });
    } else {
      await ctx.db.insert("courseCredits", { ...args, updatedBy: admin._id });
    }
  },
});
