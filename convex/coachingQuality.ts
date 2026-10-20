import { ConvexError, v } from "convex/values";
import { query } from "./mockAuth";
import { getAuthenticatedUser } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";

export interface LogScore {
  completeness: number; // 완결성 (20)
  specificity: number;  // 구체성 (20)
  processTracking: number; // 과정추적 (20)
  selfReflection: number;  // 자기성찰 (20)
  learningTransfer: number; // 학습전이 (20)
  total: number; // 총점 (100)
}

export interface UnifiedPracticeLog {
  id: string;
  sourceType: "coaching" | "bcp" | "mentor" | "sv";
  typeLabel: string;
  date: string;
  topic: string;
  partner?: string;
  durationMinutes: number;
  coachingGoal?: string;
  coachingContent?: string;
  clientInsight?: string;
  coachReflection?: string;
  actionPlan?: string;
}

// ── 5-Dimension Evaluation Scoring Engine ──────────────────────────────────────

export function evaluateLog(log: UnifiedPracticeLog): LogScore {
  // 1. 완결성 (Completeness, 20점 만점)
  // 5대 항목: 목표, 내용, 고객통찰, 코치성찰, 다음계획
  let completeness = 20;
  const fields = [
    Boolean(log.coachingGoal && log.coachingGoal.trim().length >= 4),
    Boolean(log.coachingContent && log.coachingContent.trim().length >= 10),
    Boolean(log.clientInsight && log.clientInsight.trim().length >= 4),
    Boolean(log.coachReflection && log.coachReflection.trim().length >= 6),
    Boolean(log.actionPlan && log.actionPlan.trim().length >= 4),
  ];
  const filledCount = fields.filter(Boolean).length;
  if (filledCount === 5) completeness = 19;
  else if (filledCount === 4) completeness = 15;
  else if (filledCount === 3) completeness = 12;
  else if (filledCount === 2) completeness = 8;
  else completeness = 5;

  // 글자수 보너스/감점
  const totalLength =
    (log.coachingGoal?.length || 0) +
    (log.coachingContent?.length || 0) +
    (log.clientInsight?.length || 0) +
    (log.coachReflection?.length || 0) +
    (log.actionPlan?.length || 0);
  if (totalLength >= 250 && completeness < 20) completeness += 1;
  if (totalLength < 50 && completeness > 8) completeness -= 2;

  // 2. 구체성 (Specificity, 20점 만점)
  // 기법, 도구, 인용문, 장면 묘사
  let specificity = 12;
  const fullText = `${log.coachingContent || ""} ${log.clientInsight || ""} ${log.coachReflection || ""} ${log.actionPlan || ""}`;
  
  const toolKeywords = [
    "포스트잇", "타임라인", "VAK", "시각화", "심상", "루틴", "호흡", "이완",
    "자기대화", "스케일링", "척도", "감정카드", "9F", "HPPC", "TL", "HI",
    "질문", "GROW", "피드백", "마인드", "스마트", "신체화", "앵커링", "목표"
  ];
  const matchedTools = toolKeywords.filter((k) => fullText.includes(k));
  if (matchedTools.length >= 3) specificity += 4;
  else if (matchedTools.length >= 1) specificity += 2;

  // 고객 인용부호 (" " or ' ')
  if (fullText.includes('"') || fullText.includes("'") || fullText.includes("“") || fullText.includes("”")) {
    specificity += 2;
  }
  // 상황적 디테일 (숫자 또는 시간 언급)
  if (/\d+분|\d+점|\d+회|\d+초/.test(fullText)) {
    specificity += 1;
  }
  if (log.coachingContent && log.coachingContent.length > 120) {
    specificity += 1;
  }
  specificity = Math.min(20, Math.max(8, specificity));

  // 3. 과정추적 (Process Tracking, 20점 만점)
  // 관찰 -> 판단 -> 개입 -> 반응 인과적 구조화
  let processTracking = 12;
  const processKeywords = ["목표", "탐색", "현실", "대안", "실행", "시작", "마무리", "합의", "선택"];
  const matchedProcess = processKeywords.filter((k) => fullText.includes(k));
  if (matchedProcess.length >= 4) processTracking += 3;
  else if (matchedProcess.length >= 2) processTracking += 1;

  // 인과 접속 및 대화 전개 흐름
  const causalKeywords = ["때문에", "하여", "질문하자", "답변", "반응", "발견", "이끌", "동의", "전환"];
  const matchedCausal = causalKeywords.filter((k) => fullText.includes(k));
  if (matchedCausal.length >= 3) processTracking += 3;
  else if (matchedCausal.length >= 1) processTracking += 1;

  // 일방적 지시/판단과 고객 발견의 혼재 여부 감점
  if (fullText.includes("욕심이 많다") || fullText.includes("문제를 모른다") || fullText.includes("지시했다")) {
    processTracking -= 2;
  }
  processTracking = Math.min(20, Math.max(8, processTracking));

  // 4. 자기성찰 (Self-Reflection, 20점 만점)
  // 코치 자신의 개입에 대한 객관적 메타인지
  let selfReflection = 11;
  const metaKeywords = [
    "내가", "나의", "서둘렀", "조급", "기다리지", "놓쳤", "부족했", "성급",
    "개입", "의식하여", "반성", "배운 점", "답을 주려", "기다려주", "머무르지",
    "에고", "자신감", "인식하게", "흉내", "어려웠다", "실수"
  ];
  const matchedMeta = metaKeywords.filter((k) => (log.coachReflection || "").includes(k));
  if (matchedMeta.length >= 4) selfReflection += 7;
  else if (matchedMeta.length >= 2) selfReflection += 4;
  else if (matchedMeta.length >= 1) selfReflection += 2;

  // 단순 기법 감상 또는 고객 탓 감점
  if (log.coachReflection && (log.coachReflection.includes("코칭은 참 좋다") || log.coachReflection.includes("좋은 도구다"))) {
    selfReflection -= 1;
  }
  if (!log.coachReflection || log.coachReflection.trim().length < 10) {
    selfReflection = 7;
  }
  selfReflection = Math.min(20, Math.max(6, selfReflection));

  // 5. 학습전이 (Learning Transfer, 20점 만점)
  // 다음 적용 계획에 코치 본인의 구체적 행동 규칙이 수립되었는가?
  let learningTransfer = 10;
  const actionPlanText = (log.actionPlan || "").trim();

  if (!actionPlanText || actionPlanText.length < 5) {
    learningTransfer = 6;
  } else {
    const coachActionKeywords = [
      "다음에는", "다음 세션", "질문하겠다", "기다리겠다", "경청하겠다",
      "시도하겠다", "의식하겠다", "적용하겠다", "코치로서", "연습하겠다",
      "멈춤", "체크하겠다", "준비하겠다"
    ];
    const clientActionKeywords = ["고객이", "선수가", "매일 연습", "훈련", "루틴 수행", "경기 준비"];

    const isCoachAction = coachActionKeywords.some((k) => actionPlanText.includes(k));
    const isClientAction = clientActionKeywords.some((k) => actionPlanText.includes(k));

    if (isCoachAction && !isClientAction) {
      // 코치 본인의 Action Rule 수립 (우수)
      learningTransfer = 18;
    } else if (isCoachAction && isClientAction) {
      // 코치 행동과 고객 계획 혼재
      learningTransfer = 14;
    } else if (isClientAction) {
      // 전형적 감점 요인: 고객의 행동계획만 적음
      learningTransfer = 11;
    } else {
      // 일반적인 기술
      learningTransfer = 13;
    }
  }
  learningTransfer = Math.min(20, Math.max(5, learningTransfer));

  const total = completeness + specificity + processTracking + selfReflection + learningTransfer;

  return {
    completeness,
    specificity,
    processTracking,
    selfReflection,
    learningTransfer,
    total,
  };
}

export function getGroupClassification(totalScore: number) {
  if (totalScore >= 80) {
    return {
      groupNumber: 1,
      name: "1그룹",
      label: "수퍼비전 즉시 활용 가능 수준",
      description: "목표·과정·고객 통찰·코치 성찰이 유기적으로 연결되며, 표준 리포트 양식을 훌륭하게 준수하고 있습니다.",
      badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
    };
  } else if (totalScore >= 65) {
    return {
      groupNumber: 2,
      name: "2그룹",
      label: "좋은 역량이 있으나 일관성/구조화 보완 필요",
      description: "현장 경험과 성찰의 깊이가 우수하나, 미기재 항목이 있거나 고객 통찰과 코치 해석의 구분이 일부 필요합니다.",
      badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
    };
  } else {
    return {
      groupNumber: 3,
      name: "3그룹",
      label: "표준 리포트 양식 훈련 필요",
      description: "현장 경험의 진정성은 높으나, '관찰-판단-개입-반응-성찰'의 전문 리포트 구조화 훈련이 우선적으로 요구됩니다.",
      badgeColor: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300",
    };
  }
}

// ── Convex Query: getMyCoachingQualityReport ───────────────────────────────────

export const getMyCoachingQualityReport = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    let targetUser;
    const currentUser = await getAuthenticatedUser(ctx);

    if (args.userId && (currentUser.role === "admin" || currentUser.role === "senior_coach" || currentUser.role === "admin3")) {
      targetUser = await ctx.db.get(args.userId);
      if (!targetUser) throw new ConvexError({ message: "사용자를 찾을 수 없습니다.", code: "NOT_FOUND" });
    } else {
      targetUser = currentUser;
    }

    // 1. Collect all practice logs
    const [coachingLogs, bcpLogs, mentorLogs] = await Promise.all([
      ctx.db.query("coachingLogs").withIndex("by_user", (q) => q.eq("userId", targetUser._id)).collect(),
      ctx.db.query("bcpLogs").withIndex("by_user", (q) => q.eq("userId", targetUser._id)).collect(),
      ctx.db.query("mentorCoachingLogs").withIndex("by_user", (q) => q.eq("userId", targetUser._id)).collect(),
    ]);

    // Unify all logs
    const unifiedLogs: UnifiedPracticeLog[] = [
      ...coachingLogs.map((l) => ({
        id: l._id,
        sourceType: (l.coachingType === "sv" ? "sv" : l.coachingType === "buddy" ? "bcp" : "coaching") as any,
        typeLabel: l.coachingType === "sv" ? "수퍼비전 실습" : l.coachingType === "buddy" ? "버디 코칭" : "1:1 코칭 리포트",
        date: l.coachingDate,
        topic: l.topic,
        partner: l.coacheeInfo,
        durationMinutes: l.durationMinutes,
        coachingGoal: l.goals,
        coachingContent: l.summary,
        clientInsight: l.clientInsight,
        coachReflection: l.svReflectionLearning || l.reflection,
        actionPlan: l.actionPlan || l.nextSessionPractice,
      })),
      ...bcpLogs.map((b) => ({
        id: b._id,
        sourceType: "bcp" as const,
        typeLabel: "버디코칭 (BCP)",
        date: b.sessionDate,
        topic: b.topic,
        partner: b.myRole === "coach" ? "버디 고객" : "버디 코치",
        durationMinutes: b.durationMinutes,
        coachingGoal: b.topic,
        coachingContent: b.content,
        clientInsight: b.clientInsight,
        coachReflection: b.reflection || b.bestOfSession,
        actionPlan: b.actionPlan || b.improvementForNext,
      })),
      ...mentorLogs.map((m) => ({
        id: m._id,
        sourceType: "mentor" as const,
        typeLabel: m.sessionType === "coder_co" ? "코더코 (Coder-Co)" : "멘토코칭",
        date: m.sessionDate,
        topic: m.topic,
        partner: m.coachName ? `멘토: ${m.coachName}` : "멘토코치",
        durationMinutes: m.durationMinutes,
        coachingGoal: m.coacheeGoal || m.topic,
        coachingContent: m.content,
        clientInsight: m.reflection,
        coachReflection: m.learnedAsCoach || m.reflection,
        actionPlan: m.actionPlan,
      })),
    ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Chronological order: 1st, 2nd, ...

    // Evaluate each log and calculate cumulative progression
    let runComp = 0;
    let runSpec = 0;
    let runProc = 0;
    let runRefl = 0;
    let runTran = 0;

    const evaluatedLogs = unifiedLogs.map((log, index) => {
      const score = evaluateLog(log);
      runComp += score.completeness;
      runSpec += score.specificity;
      runProc += score.processTracking;
      runRefl += score.selfReflection;
      runTran += score.learningTransfer;

      const count = index + 1;
      const cumulativeScore: LogScore = {
        completeness: Math.round((runComp / count) * 10) / 10,
        specificity: Math.round((runSpec / count) * 10) / 10,
        processTracking: Math.round((runProc / count) * 10) / 10,
        selfReflection: Math.round((runRefl / count) * 10) / 10,
        learningTransfer: Math.round((runTran / count) * 10) / 10,
        total: Math.round((runComp + runSpec + runProc + runRefl + runTran) / count),
      };

      return {
        index: count,
        log,
        score,
        cumulativeScore,
        group: getGroupClassification(cumulativeScore.total),
      };
    });

    const totalLogs = evaluatedLogs.length;

    // Overall current cumulative average score
    const currentScores: LogScore =
      totalLogs > 0
        ? evaluatedLogs[totalLogs - 1].cumulativeScore
        : {
            completeness: 0,
            specificity: 0,
            processTracking: 0,
            selfReflection: 0,
            learningTransfer: 0,
            total: 0,
          };

    const currentGroup = getGroupClassification(currentScores.total);

    // ── Milestone Segments (1~5건, 6~10건, 11~15건, 16~20건) ──
    const milestoneDefs = [
      {
        key: "1-5",
        title: "1~5회 구간",
        stageName: "기초 적응 및 표준 양식 체득 단계",
        minCount: 1,
        maxCount: 5,
        target: 5,
        focusTheme: "5대 항목(목표·내용·통찰·성찰·계획)의 누락 없는 작성 습관 및 표준 용어 체득",
      },
      {
        key: "6-10",
        title: "6~10회 구간",
        stageName: "고객 통찰 유도 및 자기 메타인지 확장 단계",
        minCount: 6,
        maxCount: 10,
        target: 10,
        focusTheme: "코치의 일방적 조언을 배제하고, 고객의 깨달음(Aha-moment)과 코치 자신의 내적 성찰을 분리하여 기록",
      },
      {
        key: "11-15",
        title: "11~15회 구간",
        stageName: "현장 도구 접목 및 개입 패턴 전환 단계",
        minCount: 11,
        maxCount: 15,
        target: 15,
        focusTheme: "VAK, 타임라인, 루틴 등 멘탈코칭 기법의 유연한 활용 및 '코치 자신의 다음 행동 규칙' 수립",
      },
      {
        key: "16-20",
        title: "16~20회 구간",
        stageName: "프로 코치 수준의 구조화 및 자가 수퍼비전 단계",
        minCount: 16,
        maxCount: 20,
        target: 20,
        focusTheme: "관찰-판단-개입-반응의 정밀한 인과 추적 및 수퍼바이저와 대등하게 토론할 수 있는 포트폴리오 완성",
      },
    ];

    const milestones = milestoneDefs.map((def) => {
      const logsInSegment = evaluatedLogs.filter(
        (item) => item.index >= def.minCount && item.index <= def.maxCount,
      );
      const actualCount = logsInSegment.length;
      const isCompleted = actualCount >= def.maxCount - def.minCount + 1;
      const isInProgress = actualCount > 0 && !isCompleted;
      const isLocked = actualCount === 0;

      let segScore: LogScore = {
        completeness: 0,
        specificity: 0,
        processTracking: 0,
        selfReflection: 0,
        learningTransfer: 0,
        total: 0,
      };

      if (actualCount > 0) {
        const sum = logsInSegment.reduce(
          (acc, item) => ({
            comp: acc.comp + item.score.completeness,
            spec: acc.spec + item.score.specificity,
            proc: acc.proc + item.score.processTracking,
            refl: acc.refl + item.score.selfReflection,
            tran: acc.tran + item.score.learningTransfer,
          }),
          { comp: 0, spec: 0, proc: 0, refl: 0, tran: 0 },
        );
        segScore = {
          completeness: Math.round((sum.comp / actualCount) * 10) / 10,
          specificity: Math.round((sum.spec / actualCount) * 10) / 10,
          processTracking: Math.round((sum.proc / actualCount) * 10) / 10,
          selfReflection: Math.round((sum.refl / actualCount) * 10) / 10,
          learningTransfer: Math.round((sum.tran / actualCount) * 10) / 10,
          total: Math.round(
            (sum.comp + sum.spec + sum.proc + sum.refl + sum.tran) / actualCount,
          ),
        };
      }

      const group = getGroupClassification(segScore.total);

      // Section-specific narrative advice
      const narrative = {
        summary:
          actualCount === 0
            ? "아직 해당 구간의 실습 일지가 등록되지 않았습니다."
            : segScore.total >= 80
            ? `총점 ${segScore.total}점으로 매우 우수합니다. 목표에서 성찰까지 논리적 흐름이 탄탄하며 수퍼비전에 즉시 활용하기 좋은 리포트입니다.`
            : segScore.total >= 65
            ? `총점 ${segScore.total}점으로 준수한 기반을 갖추었습니다. 구체적인 도구 묘사와 다음 적용 계획의 코치 행동 규칙을 보완하면 80점 이상으로 도약할 수 있습니다.`
            : `총점 ${segScore.total}점으로, 현장 경험의 진정성은 높으나 5대 항목의 표준화된 구조화 훈련이 우선적으로 요구됩니다.`,
        keyStrengths:
          actualCount > 0 && segScore.selfReflection >= 15
            ? "코치 자신의 실패나 부족했던 순간(조급함, 서두름 등)을 숨기지 않고 솔직하게 들여다보는 높은 메타인지가 최대 강점입니다."
            : actualCount > 0 && segScore.specificity >= 15
            ? "포스트잇, VAK 등 현장에서 사용한 도구와 고객의 대화 장면이 구체적으로 잘 묘사되어 있습니다."
            : "현장 코칭 실습에 성실하게 임하고 기록을 남기려는 열정과 진솔함이 돋보입니다.",
        criticalImprovement:
          actualCount > 0 && segScore.learningTransfer < 14
            ? "가장 중요한 개선점: '다음 코칭 적용 계획'에 고객의 훈련 과제가 아닌, 코치 자신이 다음 세션에서 실천할 구체적 행동 규칙(질문, 3초 침묵 등)을 기재하세요."
            : actualCount > 0 && segScore.completeness < 15
            ? "미기재 항목이 발생하지 않도록 5대 항목을 누락 없이 균일하게 작성하는 일관성이 필요합니다."
            : "코칭 내용에 코치의 주관적 평가나 지시가 섞이지 않도록, 고객의 실제 반응과 코치의 개입을 명확히 구분해 보세요.",
      };

      return {
        ...def,
        actualCount,
        isCompleted,
        isInProgress,
        isLocked,
        scores: segScore,
        group,
        narrative,
      };
    });

    // ── Generate Overall Narrative Feedback & Motivation ──
    const narrativeFeedback = {
      strengths: [
        currentScores.selfReflection >= 15
          ? "높은 메타인지 성찰: 자신의 서두름이나 질문 실수를 감추지 않고 솔직하게 기록하여 학습으로 전환함"
          : "진솔한 현장 경험: 어려운 상황이나 당황했던 순간을 가감 없이 기록하여 수퍼비전 자산화 기반 마련",
        currentScores.specificity >= 15
          ? "구체적 도구 활용: 멘탈코칭 기법(포스트잇, VAK, 심상, 루틴 등)의 활용 장면이 생생하게 묘사됨"
          : "세션 현장 기록성: 고객과의 상호작용 맥락을 기록으로 복기하려는 성실성이 우수함",
        currentScores.completeness >= 16
          ? "포트폴리오 완결성: 5대 핵심 항목을 고르게 충실히 작성하여 표준 리포트 양식에 근접함"
          : "지속적인 실습 축적: 회차를 거듭하며 코칭 실습 데이터베이스를 체계적으로 구축 중",
      ],
      improvements: [
        currentScores.learningTransfer < 15
          ? "다음 적용 계획의 주어 전환: 고객의 실행계획이 아닌 '코치 본인의 다음 행동 규칙(Action Rule)'으로 명시"
          : "다음 적용 계획의 정밀화: 다음 세션에서 시도할 1가지 핵심 질문과 침묵 대기 시간 등을 구체화",
        currentScores.completeness < 16
          ? "미기재 항목 최소화: 바쁘더라도 5대 항목(목표·내용·통찰·성찰·계획)을 빠짐없이 채워 기록의 일관성 확보"
          : "항목별 고유 기능 준수: 고객 통찰란에 문제를 반복 서술하지 않고, 고객의 '새로운 발견'만 압축 기록",
        "관찰과 판단의 분리: 코치의 주관적 해석('욕심이 많다' 등)을 사실처럼 적지 않고 객관적 반응 위주로 기술",
      ],
      supervisorAdvice:
        totalLogs === 0
          ? "첫 번째 코칭 실습일지를 작성해 보세요. 1건만 등록해도 5대 항목 품질 점수와 맞춤형 피드백이 즉시 제공됩니다!"
          : currentScores.total >= 80
          ? "현재 표준 리포트에 가장 가까운 우수한 수준입니다. 다음 적용 계획에 코치 본인의 개입 룰을 더욱 정밀하게 다듬으면 최고 수준의 수퍼비전 포트폴리오가 완성됩니다."
          : currentScores.total >= 65
          ? "기록의 재료와 진솔성은 매우 훌륭합니다. 미기재를 없애고 '고객 반응에 근거한 코치 자기성찰'을 일정하게 유지하면 점수가 크게 도약할 것입니다."
          : "경험의 양은 충분하므로 '관찰–판단–개입–반응–성찰'의 표준 구조 매뉴얼을 염두에 두고 작성하시면 리포트 품질이 비약적으로 향상됩니다.",
    };

    // ── Motivation Section: 왜 코칭실습일지를 잘 작성해야 하는가? ──
    const motivationSection = {
      title: "왜 코칭실습일지를 잘 작성해야 하는가?",
      subtitle: "단순한 과제 제출이 아닌, 위대한 프로 코치로 성장하기 위한 4대 핵심 자산",
      pillars: [
        {
          no: "01",
          title: "메타인지의 거울 (Mirror of Self-Reflection)",
          summary: "흘러간 대화의 무의식적 습관을 객관화하여 자신의 코칭 패턴을 직시하게 합니다.",
          detail: "세션이 끝나면 코칭 내용은 기억에서 빠르게 왜곡되거나 사라집니다. 기록으로 옮겨 적는 순간, 내가 언제 성급했는지, 언제 침묵을 견디지 못하고 답을 주려 했는지를 제3자의 시선에서 마주하게 됩니다.",
        },
        {
          no: "02",
          title: "수퍼비전의 핵심 자산 (Foundation of Supervision)",
          summary: "기록의 디테일이 수퍼비전의 깊이를 결정합니다.",
          detail: "리포트가 부실하면 최고 수준의 멘토코치라도 '열심히 하셨네요'라는 표면적 칭찬밖에 해줄 수 없습니다. 현장의 질문과 고객 반응이 생생해야만 코칭의 결정적 약점을 짚어주는 날카로운 처방이 가능합니다.",
        },
        {
          no: "03",
          title: "고객 통찰과 코치 해석의 분리 (Pure Partnership)",
          summary: "코치의 섣부른 조언 대신 고객 스스로의 깨달음(Aha-moment)을 기록하는 훈련입니다.",
          detail: "'실력에 비해 욕심이 많다'는 코치의 자의적 판단입니다. 고객이 실제로 어떤 말을 듣고 어떤 표정으로 새로운 통찰을 얻었는지를 적는 훈련을 통해, 고객의 자율성을 존중하는 진정한 코칭 파트너십이 완성됩니다.",
        },
        {
          no: "04",
          title: "학습의 현장 전이 (Creation of Action Rules)",
          summary: "'다음 세션에서 코치인 내가 실천할 1가지 행동 규칙'을 정의하는 장입니다.",
          detail: "많은 초보 코치가 '다음 적용 계획'에 고객의 숙제를 적는 실수를 범합니다. 프로 코치는 '다음엔 고객의 답이 끝난 뒤 마음속으로 3초를 세겠다'처럼 코치 자신의 학습 행동을 계획하고 실행합니다.",
        },
      ],
    };

    // Cohort lookup
    const cohortMember = await ctx.db
      .query("cohortMembers")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .first();
    const cohort = cohortMember ? await ctx.db.get(cohortMember.cohortId) : null;

    return {
      trainee: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
        cohortName: cohort?.name ?? null,
      },
      totalLogs,
      currentScores,
      currentGroup,
      milestones,
      evaluatedLogs: evaluatedLogs.reverse(), // latest first for log history view
      narrativeFeedback,
      motivationSection,
    };
  },
});
