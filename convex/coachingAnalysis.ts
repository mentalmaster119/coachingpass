import { v } from "convex/values";
import { query } from "./mockAuth.ts";
import { ConvexError } from "convex/values";
import { requireRole } from "./helpers.ts";
import type { Id } from "./_generated/dataModel.d.ts";

export const listTraineesForAnalysis = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, ["admin", "senior_coach", "admin3"]);

    const trainees = await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", "trainee"))
      .collect();

    const results = await Promise.all(
      trainees.map(async (t) => {
        // Get cohort
        const cohortMember = await ctx.db
          .query("cohortMembers")
          .withIndex("by_user", (q) => q.eq("userId", t._id))
          .first();
        const cohort = cohortMember ? await ctx.db.get(cohortMember.cohortId) : null;

        // Get supervisor name
        const coach = t.assignedCoachId ? await ctx.db.get(t.assignedCoachId) : null;

        // Count logs
        const [coachingLogs, bcpLogs, mentorLogs] = await Promise.all([
          ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", t._id)).collect(),
          ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", t._id)).collect(),
          ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", t._id)).collect(),
        ]);

        const svCount = coachingLogs.filter((l) => l.coachingType === "sv").length;
        const regularCount = coachingLogs.filter((l) => l.coachingType !== "sv").length;
        const totalCount = coachingLogs.length + bcpLogs.length + mentorLogs.length;

        const approvedMinutes =
          coachingLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0) +
          bcpLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0) +
          mentorLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0);

        return {
          _id: t._id,
          name: t.name,
          email: t.email,
          avatarStorageId: t.avatarStorageId,
          cohortName: cohort?.name ?? null,
          certificationGoal: t.certificationGoal ?? null,
          coachName: coach?.name ?? null,
          approvalStatus: t.approvalStatus,
          coachingCount: regularCount,
          bcpCount: bcpLogs.length,
          mentorCount: mentorLogs.length,
          svCount,
          totalCount,
          approvedHours: Math.round((approvedMinutes / 60) * 10) / 10,
        };
      }),
    );

    // Sort by name
    return results.sort((a, b) => (a.name ?? "").localeCompare(b.name ?? "", "ko"));
  },
});

export const getTraineeCoachingDeepAnalysis = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireRole(ctx, ["admin", "senior_coach", "admin3"]);

    const trainee = await ctx.db.get(args.userId);
    if (!trainee) {
      throw new ConvexError({ message: "교육생을 찾을 수 없습니다.", code: "NOT_FOUND" });
    }

    // Cohort & Coaches
    const cohortMember = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", trainee._id))
      .first();
    const cohort = cohortMember ? await ctx.db.get(cohortMember.cohortId) : null;
    const coach = trainee.assignedCoachId ? await ctx.db.get(trainee.assignedCoachId) : null;
    const coach2 = trainee.assignedCoachId2 ? await ctx.db.get(trainee.assignedCoachId2) : null;

    // Collect all related records
    const [coachingLogs, bcpLogs, mentorLogs, coachFeedbacks, rawJournals] = await Promise.all([
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", trainee._id)).collect(),
      ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", trainee._id)).collect(),
      ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", trainee._id)).collect(),
      ctx.db.query("coachFeedbacks").withIndex("by_trainee", (q) => q.eq("traineeId", trainee._id)).collect(),
      ctx.db.query("supervisionJournals").withIndex("by_trainee_name", (q) => q.eq("traineeName", trainee.name ?? "")).collect(),
    ]);

    // Also check if any journals matched traineeId
    const allJournals = rawJournals;

    // ── 1. Group coachingLogs by type ──
    const svLogs = coachingLogs.filter((l) => l.coachingType === "sv");
    const buddyCoachingLogs = coachingLogs.filter((l) => l.coachingType === "buddy");
    const regularCoachingLogs = coachingLogs.filter((l) => l.coachingType !== "sv");

    // ── 2. Statistics Breakdown ──
    const calcStats = (items: { durationMinutes: number; approvalStatus: string }[]) => {
      const count = items.length;
      const approvedCount = items.filter((i) => i.approvalStatus === "approved").length;
      const pendingCount = items.filter((i) => i.approvalStatus === "pending").length;
      const rejectedCount = items.filter((i) => i.approvalStatus === "rejected").length;
      const totalMinutes = items.reduce((s, i) => s + i.durationMinutes, 0);
      const approvedMinutes = items
        .filter((i) => i.approvalStatus === "approved")
        .reduce((s, i) => s + i.durationMinutes, 0);
      return { count, approvedCount, pendingCount, rejectedCount, totalMinutes, approvedMinutes };
    };

    const regularStats = calcStats(regularCoachingLogs);
    const bcpCombined = [...bcpLogs, ...buddyCoachingLogs];
    const bcpStats = calcStats(bcpCombined);
    const mentorStats = calcStats(mentorLogs);
    const svStats = calcStats(svLogs);

    // Total stats
    const totalCount = coachingLogs.length + bcpLogs.length + mentorLogs.length;
    const totalMinutes =
      coachingLogs.reduce((s, l) => s + l.durationMinutes, 0) +
      bcpLogs.reduce((s, l) => s + l.durationMinutes, 0) +
      mentorLogs.reduce((s, l) => s + l.durationMinutes, 0);
    const approvedMinutes =
      coachingLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0) +
      bcpLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0) +
      mentorLogs.filter((l) => l.approvalStatus === "approved").reduce((s, l) => s + l.durationMinutes, 0);

    // Athlete coaching count
    const athleteCount = coachingLogs.filter(
      (l) =>
        l.approvalStatus === "approved" &&
        (l.ncpClientCategory === "athlete" ||
          l.coacheeType?.includes("선수") ||
          (l.coacheeField && (l.coacheeField.includes("선수") || l.coacheeField.includes("스포츠")))),
    ).length;

    // ── 3. Techniques / Tools Analysis ──
    const techniqueMap = new Map<string, number>();
    const countTechnique = (tech: string) => {
      if (!tech || !tech.trim()) return;
      const trimmed = tech.trim();
      techniqueMap.set(trimmed, (techniqueMap.get(trimmed) ?? 0) + 1);
    };

    coachingLogs.forEach((l) => {
      l.techniquesUsed?.forEach(countTechnique);
    });
    bcpLogs.forEach((l) => {
      l.techniquesUsed?.forEach(countTechnique);
      if (l.techniqueOther) countTechnique(l.techniqueOther);
    });
    mentorLogs.forEach((l) => {
      if (l.coachingTool) countTechnique(l.coachingTool);
    });
    allJournals.forEach((j) => {
      j.toolsUsed?.forEach(countTechnique);
      if (j.toolOther) countTechnique(j.toolOther);
    });

    const totalTechniqueUses = Array.from(techniqueMap.values()).reduce((a, b) => a + b, 0);
    const sortedTechniques = Array.from(techniqueMap.entries())
      .map(([name, count]) => ({
        name,
        count,
        percentage: totalTechniqueUses > 0 ? Math.round((count / totalTechniqueUses) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // ── 4. Client Demographics & Categories ──
    let athleteClients = 0;
    let generalClients = 0;
    let maleClients = 0;
    let femaleClients = 0;
    const fieldMap = new Map<string, number>();

    coachingLogs.forEach((l) => {
      if (l.ncpClientCategory === "athlete") athleteClients++;
      else if (l.ncpClientCategory === "general") generalClients++;

      if (l.coacheeGender === "male") maleClients++;
      else if (l.coacheeGender === "female") femaleClients++;

      if (l.coacheeField && l.coacheeField.trim()) {
        const f = l.coacheeField.trim();
        fieldMap.set(f, (fieldMap.get(f) ?? 0) + 1);
      }
    });

    const sortedFields = Array.from(fieldMap.entries())
      .map(([field, count]) => ({ field, count }))
      .sort((a, b) => b.count - a.count);

    // ── 5. Topics & Keywords Analysis ──
    const keywordMap = new Map<string, number>();
    const commonStopwords = new Set(["코칭", "실습", "세션", "진행", "대화", "관련", "대한", "통한", "및", "등", "1회차", "2회차", "3회차", "4회차", "5회차", "1차", "2차", "3차", "4차", "5차"]);

    const allTopics = [
      ...coachingLogs.map((l) => l.topic),
      ...bcpLogs.map((l) => l.topic),
      ...mentorLogs.map((l) => l.topic),
    ];

    allTopics.forEach((topicStr) => {
      if (!topicStr) return;
      const tokens = topicStr
        .replace(/[[\](),:;~!?]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 2 && !commonStopwords.has(w));

      tokens.forEach((token) => {
        keywordMap.set(token, (keywordMap.get(token) ?? 0) + 1);
      });
    });

    const topKeywords = Array.from(keywordMap.entries())
      .map(([keyword, count]) => ({ keyword, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 15);

    // MCCI Domain Distribution
    const domainMap = new Map<string, number>();
    coachingLogs.forEach((l) => {
      if (l.mcciDomain) {
        domainMap.set(l.mcciDomain, (domainMap.get(l.mcciDomain) ?? 0) + 1);
      }
    });
    const domainDistribution = Array.from(domainMap.entries()).map(([domain, count]) => ({ domain, count }));

    // ── 6. Self-Reflection & Insight Collection (실상 파악 - 내면/성찰) ──
    const reflections: {
      id: string;
      type: "coaching" | "bcp" | "mentor" | "sv";
      date: string;
      topic: string;
      clientInsight?: string;
      coachReflection?: string;
      actionPlan?: string;
      coachPattern?: string;
      learnedAsCoach?: string;
    }[] = [];

    coachingLogs.forEach((l) => {
      if (l.clientInsight || l.reflection || l.actionPlan || l.svReflectionLearning) {
        reflections.push({
          id: l._id,
          type: l.coachingType === "sv" ? "sv" : "coaching",
          date: l.coachingDate,
          topic: l.topic,
          clientInsight: l.clientInsight,
          coachReflection: l.svReflectionLearning || l.reflection,
          actionPlan: l.actionPlan,
        });
      }
    });

    bcpLogs.forEach((l) => {
      if (l.clientInsight || l.reflection || l.actionPlan || l.coachPattern) {
        reflections.push({
          id: l._id,
          type: "bcp",
          date: l.sessionDate,
          topic: l.topic,
          clientInsight: l.clientInsight,
          coachReflection: l.reflection,
          actionPlan: l.actionPlan,
          coachPattern: l.coachPattern,
        });
      }
    });

    mentorLogs.forEach((l) => {
      if (l.content || l.learnedAsCoach || l.actionPlan || l.reflection) {
        reflections.push({
          id: l._id,
          type: "mentor",
          date: l.sessionDate,
          topic: l.topic,
          coachReflection: l.content || l.reflection,
          learnedAsCoach: l.learnedAsCoach,
          actionPlan: l.actionPlan,
        });
      }
    });

    // Sort reflections by date descending
    reflections.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── 7. Supervisor & Peer Feedback Collection ──
    const feedbackList: {
      id: string;
      source: "svLog" | "journal" | "coachFeedback" | "mentorLog";
      date: string;
      author: string;
      topic?: string;
      strengths?: string;
      improvements?: string;
      nextActionPlan?: string;
      rating?: number;
      averageScore?: number;
    }[] = [];

    // From coaching logs SV
    svLogs.forEach((l) => {
      if (l.supervisorStrengths || l.supervisorImprovements || l.svSupervisorFeedback || l.peerStrengths || l.peerImprovements) {
        feedbackList.push({
          id: l._id,
          source: "svLog",
          date: l.coachingDate,
          author: l.coacheeInfo ? `수퍼바이저 (참관: ${l.coacheeInfo})` : "수퍼바이저",
          topic: l.topic,
          strengths: [l.supervisorStrengths, l.peerStrengths ? `(동료) ${l.peerStrengths}` : ""].filter(Boolean).join("\n"),
          improvements: [l.supervisorImprovements, l.peerImprovements ? `(동료) ${l.peerImprovements}` : ""].filter(Boolean).join("\n"),
        });
      }
    });

    // From supervisionJournals
    allJournals.forEach((j) => {
      feedbackList.push({
        id: j._id,
        source: "journal",
        date: j.coachingDate,
        author: "수퍼바이저 현장 관찰평가",
        topic: j.topic,
        strengths: j.strengths,
        improvements: j.improvements,
        nextActionPlan: j.nextActionPlan,
        averageScore: j.averageScore,
      });
    });

    // From coachFeedbacks table
    coachFeedbacks.forEach((fb) => {
      feedbackList.push({
        id: fb._id,
        source: "coachFeedback",
        date: fb.feedbackDate,
        author: coach?.name ?? "담당 코치",
        strengths: fb.strengths,
        improvements: fb.improvements,
        rating: fb.rating,
      });
    });

    feedbackList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // ── 8. Supervision Competencies Averages (from journals) ──
    const compTotals: Record<string, { sum: number; count: number }> = {
      topicClarity: { sum: 0, count: 0 },
      goalQuantification: { sum: 0, count: 0 },
      toolSelection: { sum: 0, count: 0 },
      toolProficiency: { sum: 0, count: 0 },
      toolStandardAdherence: { sum: 0, count: 0 },
      selfTalkQuality: { sum: 0, count: 0 },
      questionAppropriateness: { sum: 0, count: 0 },
      activeListening: { sum: 0, count: 0 },
      praiseEnergy: { sum: 0, count: 0 },
    };

    allJournals.forEach((j) => {
      if (j.competencies) {
        Object.entries(j.competencies).forEach(([k, vStr]) => {
          const num = parseFloat(vStr);
          if (!isNaN(num) && compTotals[k]) {
            compTotals[k].sum += num;
            compTotals[k].count += 1;
          }
        });
      }
    });

    const competencyAverages: Record<string, number | null> = {};
    Object.entries(compTotals).forEach(([k, item]) => {
      competencyAverages[k] = item.count > 0 ? Math.round((item.sum / item.count) * 10) / 10 : null;
    });

    // ── 9. All Reports Unified Timeline ──
    const allReports = [
      ...coachingLogs.map((l) => ({
        id: l._id,
        category: l.coachingType === "sv" ? ("sv" as const) : l.coachingType === "buddy" ? ("buddy" as const) : ("coaching" as const),
        date: l.coachingDate,
        topic: l.topic,
        partner: l.coacheeInfo,
        partnerLabel: l.coachingType === "sv" ? "수퍼바이저/동료" : l.coachingType === "mentor" ? "멘토코치" : "고객",
        durationMinutes: l.durationMinutes,
        approvalStatus: l.approvalStatus,
        goals: l.goals,
        summary: l.summary,
        techniquesUsed: l.techniquesUsed,
        clientInsight: l.clientInsight,
        actionPlan: l.actionPlan,
        reflection: l.svReflectionLearning || l.reflection,
        supervisorFeedback: l.svSupervisorFeedback || l.supervisorStrengths,
        peerFeedback: l.svPeerFeedback || l.peerStrengths,
        coachingProcess: l.coachingProcess,
        toolUsageDetail: l.toolUsageDetail,
        evidenceStorageId: l.evidenceStorageId,
      })),
      ...bcpLogs.map((b) => ({
        id: b._id,
        category: "bcp" as const,
        date: b.sessionDate,
        topic: b.topic,
        partner: b.myRole === "coach" ? "버디 고객" : "버디 코치",
        partnerLabel: "버디 파트너",
        durationMinutes: b.durationMinutes,
        approvalStatus: b.approvalStatus,
        goals: undefined,
        summary: b.content,
        techniquesUsed: b.techniquesUsed,
        clientInsight: b.clientInsight,
        actionPlan: b.actionPlan,
        reflection: b.reflection,
        supervisorFeedback: undefined,
        peerFeedback: b.bestOfSession ? `잘한점: ${b.bestOfSession}` : undefined,
        coachingProcess: undefined,
        toolUsageDetail: b.coachPattern ? `코치패턴: ${b.coachPattern}` : undefined,
        evidenceStorageId: b.evidenceStorageId,
      })),
      ...mentorLogs.map((m) => ({
        id: m._id,
        category: "mentor" as const,
        date: m.sessionDate,
        topic: m.topic,
        partner: m.coachName,
        partnerLabel: m.sessionType === "mentor_coaching" ? "멘토코치" : "그룹 코치",
        durationMinutes: m.durationMinutes,
        approvalStatus: m.approvalStatus,
        goals: m.coacheeGoal,
        summary: m.content,
        techniquesUsed: m.coachingTool ? [m.coachingTool] : undefined,
        clientInsight: m.powerfulQuestion ? `강력했던 질문: ${m.powerfulQuestion}` : undefined,
        actionPlan: m.actionPlan,
        reflection: m.learnedAsCoach ? `코치로서 배운 점: ${m.learnedAsCoach}` : m.reflection,
        supervisorFeedback: undefined,
        peerFeedback: undefined,
        coachingProcess: undefined,
        toolUsageDetail: undefined,
        evidenceStorageId: m.evidenceStorageId,
      })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return {
      trainee: {
        _id: trainee._id,
        name: trainee.name,
        email: trainee.email,
        phone: trainee.phone ?? null,
        cohortName: cohort?.name ?? null,
        certificationGoal: trainee.certificationGoal ?? null,
        coachName: coach?.name ?? null,
        coachName2: coach2?.name ?? null,
        joinedAt: trainee.joinedAt ?? null,
        bio: trainee.bio ?? null,
        specializations: trainee.specializations ?? [],
        coachingStyle: trainee.coachingStyle ?? null,
        mbti: trainee.mbti ?? null,
        avatarStorageId: trainee.avatarStorageId ?? null,
      },
      stats: {
        totalCount,
        totalHours: Math.round((totalMinutes / 60) * 10) / 10,
        approvedHours: Math.round((approvedMinutes / 60) * 10) / 10,
        athleteCoachingCount: athleteCount,
        regularCoaching: {
          ...regularStats,
          hours: Math.round((regularStats.totalMinutes / 60) * 10) / 10,
          approvedHours: Math.round((regularStats.approvedMinutes / 60) * 10) / 10,
        },
        bcp: {
          ...bcpStats,
          hours: Math.round((bcpStats.totalMinutes / 60) * 10) / 10,
          approvedHours: Math.round((bcpStats.approvedMinutes / 60) * 10) / 10,
        },
        mentor: {
          ...mentorStats,
          hours: Math.round((mentorStats.totalMinutes / 60) * 10) / 10,
          approvedHours: Math.round((mentorStats.approvedMinutes / 60) * 10) / 10,
        },
        sv: {
          ...svStats,
          hours: Math.round((svStats.totalMinutes / 60) * 10) / 10,
          approvedHours: Math.round((svStats.approvedMinutes / 60) * 10) / 10,
        },
        journalCount: allJournals.length,
      },
      techniques: {
        list: sortedTechniques,
        uniqueCount: sortedTechniques.length,
      },
      demographics: {
        athleteClients,
        generalClients,
        maleClients,
        femaleClients,
        fields: sortedFields,
      },
      topics: {
        keywords: topKeywords,
        domains: domainDistribution,
      },
      reflections,
      feedbackList,
      competencyAverages,
      allReports,
    };
  },
});
