import { ConvexError, v } from "convex/values";
import { query } from "./mockAuth";
import { getAuthenticatedUser } from "./helpers";
import type { Id } from "./_generated/dataModel.d.ts";

export interface LogPrescription {
  dimension: string;
  guideClause: string;
  advice: string;
}

export interface LogScore {
  completeness: number; // 완결성 (20)
  specificity: number;  // 구체성 (20)
  processTracking: number; // 과정추적 (20)
  selfReflection: number;  // 자기성찰 (20)
  learningTransfer: number; // 학습전이 (20)
  total: number; // 총점 (100)
  prescriptions?: LogPrescription[];
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

  // ── MCCI Guide Prescriptions for this individual log ──
  const prescriptions: LogPrescription[] = [];
  if (completeness < 17) {
    prescriptions.push({
      dimension: "완결성",
      guideClause: "가이드 5대 항목 연결성",
      advice: "목표·내용·고객통찰·코치성찰·적용계획 중 미기재 항목을 보완하여 포트폴리오의 일관성을 높이세요.",
    });
  }
  if (specificity < 15) {
    prescriptions.push({
      dimension: "구체성",
      guideClause: "가이드 2번 코칭 내용",
      advice: "단순 기법 나열을 지양하고 현장 대화 인용(\" \"), 시간/숫자, 도구 적용 맥락을 구체적으로 기술하세요.",
    });
  }
  if (processTracking < 15) {
    prescriptions.push({
      dimension: "과정추적",
      guideClause: "가이드 2번 4단계 구조화",
      advice: "[고객 상태 ➔ 탐색 ➔ 개입 ➔ 고객 반응 및 변화] 4단계 흐름을 따라 코치 개입의 이유와 고객의 변화를 기록하세요.",
    });
  }
  if (selfReflection < 15) {
    prescriptions.push({
      dimension: "자기성찰",
      guideClause: "가이드 4번 코치 성찰 및 배움",
      advice: "단순 소감이나 고객 평가를 피하고, 코치 자신의 수행(서두름, 침묵 대기 부족, 에고, 기법 집착)을 메타인지적으로 돌아보세요.",
    });
  }
  if (learningTransfer < 15) {
    prescriptions.push({
      dimension: "학습전이",
      guideClause: "가이드 5-2 코치 다음 실습 적용계획",
      advice: "고객 과제(5-1)만 적지 말고, '코치 자신이 다음 세션에서 실천할 1가지 행동 규칙(Action Rule)'을 명확히 분리 작성하세요.",
    });
  }

  return {
    completeness,
    specificity,
    processTracking,
    selfReflection,
    learningTransfer,
    total,
    prescriptions,
  };
}

export interface GroupLevelInfo {
  groupNumber: number;
  name: string;
  scoreRange: string;
  minScore: number;
  maxScore: number;
  label: string;
  description: string;
  characteristics: string[];
  prescription: string;
  badgeColor: string;
  bgLight: string;
  borderColor: string;
}

export const GROUP_LEVELS: GroupLevelInfo[] = [
  {
    groupNumber: 1,
    name: "1그룹",
    scoreRange: "80점 ~ 100점",
    minScore: 80,
    maxScore: 100,
    label: "수퍼비전 즉시 활용 가능 수준 (우수 표준)",
    description: "목표·과정·고객 통찰·코치 성찰이 하나의 흐름으로 유기적으로 연결되며, 수퍼비전에 즉시 활용하기 가장 좋은 완성도 높은 리포트입니다.",
    characteristics: [
      "목표와 코칭 내용, 고객 통찰, 코치 성찰이 일관된 맥락으로 연결됨",
      "자신의 부족한 점이나 실수(조급함, 서두름 등)를 객관적으로 직시하는 솔직한 메타성찰",
      "5대 항목의 누락 없이 높은 일관성과 완결성을 유지",
    ],
    prescription: "‘다음 코칭 적용 계획’에 고객 과제(5-1) 외에 ‘코치 자신의 다음 실습 행동 규칙(5-2 Action Rules)’을 더욱 정밀하게 다듬으면 최고 수준의 프로 리포트 완성",
    badgeColor: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300",
    bgLight: "bg-emerald-50/40 dark:bg-emerald-950/20",
    borderColor: "border-emerald-200 dark:border-emerald-800",
  },
  {
    groupNumber: 2,
    name: "2그룹",
    scoreRange: "65점 ~ 79점",
    minScore: 65,
    maxScore: 79,
    label: "좋은 역량이 있으나 일관성/구조화 보완 필요",
    description: "현장 경험과 성찰의 깊이가 매우 우수하나, 미기재 항목이 발생하여 일관성이 떨어지거나 고객 통찰과 기존 문제 서술의 구분이 다소 약한 단계입니다.",
    characteristics: [
      "현장 경험을 솔직하게 기록하고 자기 실패를 숨기지 않는 훌륭한 태도",
      "그러나 특정 사례에서 일부 항목(통찰, 성찰, 다음계획)이 비어 있어 포트폴리오 완결성이 저하됨",
      "고객 통찰 항목이 새로운 깨달음이 아닌 기존 문제의 반복 서술에 머무는 경우가 있음",
    ],
    prescription: "표준 리포트 양식을 바탕으로 미기재 항목을 없애고, ‘고객 반응에 근거한 코치 자기성찰’을 일관되게 채우면 80점 이상 1그룹으로 즉시 도약 가능",
    badgeColor: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300",
    bgLight: "bg-amber-50/40 dark:bg-amber-950/20",
    borderColor: "border-amber-200 dark:border-amber-800",
  },
  {
    groupNumber: 3,
    name: "3그룹",
    scoreRange: "64점 이하",
    minScore: 0,
    maxScore: 64,
    label: "표준 리포트 양식 구조화 훈련 필요",
    description: "현장 실습의 열정과 진솔함은 충분하나, 코치의 자의적 판단/지시와 고객 발견이 혼재되거나 지나치게 축약되어 수퍼비전을 위한 인과적 근거 확인이 어려운 단계입니다.",
    characteristics: [
      "기법이나 활동 기록은 있으나, 왜 그 도구를 선택했고 고객에게 어떤 반응이 일어났는지 인과 흐름이 약함",
      "코치의 주관적 해석('욕심이 많다' 등)이나 지시가 사실처럼 섞여 있음",
      "지나치게 축약되어 수퍼바이저가 현장 맥락을 파악하고 지도하기 어려움",
    ],
    prescription: "MCCI 가이드의 ‘고객 상태 ➔ 탐색 ➔ 개입 ➔ 고객 반응 및 변화’ 4단계 구조화와 5대 자기점검 체크리스트를 연습하여 리포트의 뼈대를 세우는 훈련 필요",
    badgeColor: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300",
    bgLight: "bg-rose-50/40 dark:bg-rose-950/20",
    borderColor: "border-rose-200 dark:border-rose-800",
  },
];

export function getGroupClassification(totalScore: number): GroupLevelInfo {
  if (totalScore >= 80) return GROUP_LEVELS[0];
  if (totalScore >= 65) return GROUP_LEVELS[1];
  return GROUP_LEVELS[2];
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
            ? "가이드 5-2 원칙 보완: '다음 코칭 적용 계획'에 고객의 훈련 과제(5-1)만 적지 말고, 코치 자신이 다음 세션에서 실천할 1가지 행동 규칙(Action Rule, 3초 침묵·특정 질문 등)을 분리 기재하세요."
            : actualCount > 0 && segScore.completeness < 15
            ? "가이드 5대 항목 연결성: 목표·내용·통찰·성찰·계획이 누락 없이 균일하게 작성되어야 수퍼비전 포트폴리오로서 일관성을 갖춥니다."
            : "가이드 2번 4단계 구조화: 코칭 내용에 코치의 주관적 평가나 지시를 섞지 말고, [고객 상태 ➔ 탐색 ➔ 개입 ➔ 반응] 인과 흐름으로 기술하세요.",
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
          ? "높은 메타인지 성찰 (가이드 4번 부합): 자신의 서두름이나 질문 실수를 감추지 않고 솔직하게 기록하여 학습으로 전환함"
          : "진솔한 현장 경험: 어려운 상황이나 당황했던 순간을 가감 없이 기록하여 수퍼비전 자산화 기반 마련",
        currentScores.specificity >= 15
          ? "구체적 도구 활용 (가이드 2번 부합): 멘탈코칭 기법(포스트잇, VAK, 심상, 루틴 등)의 활용 장면이 생생하게 묘사됨"
          : "세션 현장 기록성: 고객과의 상호작용 맥락을 기록으로 복기하려는 성실성이 우수함",
        currentScores.completeness >= 16
          ? "포트폴리오 완결성 (5대 항목 연결성 우수): 5대 핵심 항목을 고르게 충실히 작성하여 표준 리포트 양식에 근접함"
          : "지속적인 실습 축적: 회차를 거듭하며 코칭 실습 데이터베이스를 체계적으로 구축 중",
      ],
      improvements: [
        currentScores.learningTransfer < 15
          ? "가이드 5-2 원칙 준수: 고객의 실행계획(5-1)과 별개로 '코치 본인의 다음 실습 행동 규칙(Action Rule)'을 명확히 분리 기재"
          : "다음 적용 계획 정밀화: 다음 세션에서 시도할 핵심 질문 1가지와 침묵 대기 시간 등 코치 행동 룰 유지",
        currentScores.processTracking < 15
          ? "가이드 2번 4단계 구조화: 단순 도구 나열을 피하고 '고객 상태 ➔ 탐색 ➔ 개입 ➔ 고객 반응 및 변화'의 인과 흐름으로 기술"
          : "관찰과 판단의 분리: 코치의 주관적 해석('욕심이 많다' 등)을 사실처럼 적지 않고 객관적 반응 위주로 기술",
        currentScores.completeness < 16
          ? "가이드 5대 항목 누락 방지: 바쁘더라도 5대 항목(목표·내용·통찰·성찰·계획)을 빠짐없이 채워 일관된 포트폴리오 완성"
          : "가이드 3번 고객 통찰 준수: 고객 통찰란에 문제를 반복 서술하지 않고, 고객의 '새로운 발견(Aha-moment)'만 압축 기록",
      ],
      supervisorAdvice:
        totalLogs === 0
          ? "첫 번째 코칭 실습일지를 작성해 보세요. MCCI 공식 가이드 기준 5대 항목 품질 점수와 맞춤형 피드백이 즉시 제공됩니다!"
          : currentScores.total >= 80
          ? "현재 MCCI 표준 리포트에 가장 가까운 우수한 수준입니다. 가이드 5-2 항목에 따라 다음 적용 계획에 코치 본인의 구체적 개입 룰(침묵 대기, 특정 질문 등)을 더욱 정밀하게 다듬으면 최고 수준의 수퍼비전 포트폴리오가 완성됩니다."
          : currentScores.total >= 65
          ? "현장 기록의 재료와 진솔성은 매우 훌륭합니다. 미기재를 없애고 가이드 4번(메타성찰) 및 5-2번(코치 행동규칙 분리)을 체계적으로 보완하면 80점 이상으로 크게 도약할 것입니다."
          : "경험의 양과 열정은 충분하므로, MCCI 가이드의 '관찰–판단–개입–반응–성찰' 4단계 구조와 5대 자기점검 체크리스트를 염두에 두고 작성하시면 리포트 품질이 비약적으로 향상됩니다.",
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
      mcciGuide: MCCI_WRITING_GUIDE,
      groupLevels: GROUP_LEVELS,
    };
  },
});

// ── MCCI Official 5-Dimension Writing Guide & Best Practices ──────────────────

export interface McciGuideItem {
  id: string;
  itemNumber: number;
  name: string;
  englishName: string;
  coreRole: string;
  keyQuestions: string[];
  badExample: {
    description: string;
    exampleText: string;
    whyBad: string;
  };
  goodExample: {
    description: string;
    exampleText: string;
    whyGood: string;
  };
  specialTips: string[];
}

export interface McciWritingGuide {
  title: string;
  organization: string;
  subtitle: string;
  philosophy: string;
  items: McciGuideItem[];
  continuityPrinciple: {
    title: string;
    description: string;
    flow: { step: string; label: string; question: string }[];
    caution: string;
  };
  selfChecklist: {
    title: string;
    subtitle: string;
    questions: { no: number; targetItem: string; question: string; tip: string }[];
  };
}

export const MCCI_WRITING_GUIDE: McciWritingGuide = {
  title: "MCCI 코칭실습 리포트 5개 항목별 작성 가이드",
  organization: "국제멘탈코칭센터 (MCCI)",
  subtitle: "프로 멘탈코치 도약을 위한 표준 리포트 작성 & 자가 수퍼비전 매뉴얼",
  philosophy:
    "코칭실습 리포트는 단순한 과제 제출이나 대화 녹취록이 아닙니다. 코치가 자신의 무의식적 세션 수행을 객관화(메타성찰)하고, 다음 세션의 질을 높이기 위한 '자기 수퍼비전 도구'이자 '수퍼바이저가 코치의 성장을 돕는 핵심 근거 자산'입니다.",
  items: [
    {
      id: "goal",
      itemNumber: 1,
      name: "코칭 목표",
      englishName: "Coaching Goal",
      coreRole: "큰 결과(목적)를 오늘 세션에서 실제로 다룰 수 있는 현실적이고 구체적인 변화로 1단계 구체화",
      keyQuestions: [
        "고객이 이번 코칭을 통해 구체적으로 무엇을 해결하거나 얻고자 했는가?",
        "오늘 50분 세션이 끝났을 때 도달하고자 하는 관찰 가능한 상태는 무엇인가?",
      ],
      badExample: {
        description: "지나치게 거대하고 추상적인 장기 결과만 기재",
        exampleText: "‘국가대표 되기’, ‘16강 진출하기’, ‘자신감 높이기’",
        whyBad:
          "한 번의 코칭 세션에서 직접 통제하거나 즉각 다룰 수 없는 거대 목표이므로, 세션의 초점이 흐려지고 코칭 진행 과정과 연결되지 않습니다.",
      },
      goodExample: {
        description: "오늘 세션에서 다룰 수 있는 현실적 작업 단위(Working Unit)로 좁힌 목표",
        exampleText:
          "‘새로운 훈련 환경에서의 낯섦과 시합 불안을 점검하고, 1세트 초반에 시도할 나만의 루틴 1가지 수립하기’",
        whyGood:
          "세션 내에서 코치와 고객이 원인을 탐색하고 구체적 대안을 만들어낼 수 있는 명확한 세션 목표가 확립됩니다.",
      },
      specialTips: [
        "고객이 '자신감 향상'처럼 큰 결과를 말하면, '그 결과를 위해 오늘 50분 동안 무엇을 다룰 것인가?'로 질문하여 1단계 좁히세요.",
      ],
    },
    {
      id: "content",
      itemNumber: 2,
      name: "코칭 내용",
      englishName: "Coaching Process",
      coreRole: "대화 녹취가 아닌 [고객 상태 ➔ 탐색 ➔ 개입 ➔ 고객 반응 및 변화] 4단계 인과 구조화",
      keyQuestions: [
        "고객의 초기 상태와 호소는 어떠했는가?",
        "내가 왜 그 질문이나 개입 도구를 선택했는가?",
        "그 개입 이후 고객에게 어떤 구체적 반응이나 인식 변화가 일어났는가?",
      ],
      badExample: {
        description: "단순 기법 명칭 나열 또는 코치의 일방적 판단/지시",
        exampleText:
          "‘Hero Interview를 진행했다. 포스트잇을 붙이고 타임라인을 그렸다. 고객이 욕심이 많아 문제를 몰라서 지시했다.’",
        whyBad:
          "도구를 왜 썼는지 맥락을 알 수 없고, 고객의 실제 반응 대신 코치의 자의적 판단과 지시가 기록되어 수퍼비전 가치가 없습니다.",
      },
      goodExample: {
        description: "4단계 인과 흐름(상태 ➔ 탐색 ➔ 개입 ➔ 반응)으로 선명하게 구조화",
        exampleText:
          "‘고객이 시합 중 불안으로 몸이 굳는다고 호소 ➔ 불안이 발생하는 순간을 탐색 ➔ 포스트잇으로 주제를 세분화하여 핵심 원인 분리 ➔ 고객이 \"생각보다 주변 시선 때문이었다\"며 표정이 밝아지고 긴장이 완화됨’",
        whyGood:
          "도구 자체가 주인공이 아니라 '도구를 통한 고객의 반응과 변화'가 주인공으로 기록되어 개입의 효과를 명확히 검증할 수 있습니다.",
      },
      specialTips: [
        "기법 이름(포스트잇, VAK 등)을 쓸 때는 반드시 '그 도구를 선택한 이유'와 '고객의 실제 표정/신체/언어 반응'을 함께 적으세요.",
      ],
    },
    {
      id: "insight",
      itemNumber: 3,
      name: "고객 통찰 및 깨달음",
      englishName: "Client Insight",
      coreRole: "코치의 설명이나 조언이 아닌, 고객 스스로 발견한 인식의 전환 (Aha-moment / Cognitive Shift)",
      keyQuestions: [
        "고객이 이전과 다르게 새롭게 알아차리거나 발견한 것은 무엇인가?",
        "고객의 실제 표현(말, 표정, 제스처)은 어떠했는가?",
      ],
      badExample: {
        description: "기존 문제의 단순 반복 서술 또는 코치의 자의적 해석",
        exampleText:
          "‘집중력이 부족해서 친구와 갈등이 생긴다는 것을 알았음’, ‘코치가 설명해 준 마인드셋 원리를 이해함’",
        whyBad:
          "새로운 통찰이 아니라 기존 문제를 다시 적은 것에 불과하거나, 코치의 강의를 들었다는 수준에 머물러 있습니다.",
      },
      goodExample: {
        description: "고객 자신의 무의식적 패턴을 깨닫고 시각이 전환된 순간의 생생한 인용",
        exampleText:
          "‘완벽하게 해내야 한다는 생각이 오히려 나를 압박하고 있었다는 것을 깨달음 (고객 발언: \"아, 내가 잘하려고 할수록 몸에 힘이 들어갔네요\")’",
        whyGood:
          "고객의 내적 자각(Aha-moment)이 직접 인용구와 함께 기록되어 고객의 자율적 성장이 검증됩니다.",
      },
      specialTips: [
        "뚜렷한 대형 통찰이 없었더라도 억지로 꾸며내지 말고, '자신의 불안 신체 반응을 있는 그대로 알아차리기 시작함'처럼 관찰된 사실대로 솔직히 기술하세요.",
      ],
    },
    {
      id: "reflection",
      itemNumber: 4,
      name: "코치로서의 성찰 및 배움",
      englishName: "Coach Reflection",
      coreRole: "고객 평가나 단순 감상 지양. 코치 자신의 수행(서두름, 침묵 대기, 기법 집착 등)을 돌아보는 메타인지",
      keyQuestions: [
        "이번 코칭에서 코치로서 나의 수행은 어떠했는가?",
        "어떤 순간에 조급했거나 침묵을 견디지 못했는가? 어떤 한계를 경험하고 무엇을 배웠는가?",
      ],
      badExample: {
        description: "단순한 기법 감상평 또는 세션의 어려움을 고객 탓으로 돌림",
        exampleText:
          "‘코칭은 참 파워풀하다. 고객이 잘 따라와 주어 뿌듯했다. 고객이 말을 잘 안 해서 힘들었다.’",
        whyBad:
          "단순 감상에 그치거나 고객 탓을 하여 코치 자신의 개입에 대한 성찰과 역량 성장이 일어나지 않습니다.",
      },
      goodExample: {
        description: "자신의 개입 실수, 조급함, 에고, 기법 집착을 숨김없이 직시한 메타성찰",
        exampleText:
          "‘고객이 침묵할 때 조급해져서 내가 먼저 유도 질문을 던졌다. 고객의 속도를 기다려주지 못하고 답을 제시하려 했던 나의 에고를 발견했다. 인증시험을 의식해 기법 순서에 집착하느라 고객이 새로운 발견을 한 순간에 충분히 머물러주지 못했다.’",
        whyGood:
          "실패와 서두름을 감추지 않고 솔직히 직시하여, 수퍼바이저로부터 가장 깊이 있는 맞춤 지도를 받을 수 있는 최상의 수퍼비전 자산이 됩니다.",
      },
      specialTips: [
        "‘내가 언제 조급했는가?’, ‘언제 고객의 말을 끊거나 답을 주려 했는가?’를 솔직하게 돌아볼수록 프로 코치로 빠르게 도약합니다.",
      ],
    },
    {
      id: "actionPlan",
      itemNumber: 5,
      name: "다음 코칭 적용 계획",
      englishName: "Action Plan & Rules",
      coreRole: "5-1(고객 실행계획)과 5-2(코치의 다음 실습 적용계획 / Action Rules)의 명확한 분리 수립",
      keyQuestions: [
        "5-1: 고객이 다음 세션 전까지 실천하기로 합의한 구체적 과제는 무엇인가?",
        "5-2: 코치인 내가 다음 세션에서 다르게 시도할 구체적 행동 규칙(Action Rule)은 무엇인가?",
      ],
      badExample: {
        description: "고객의 과제만 나열하고 코치 자신의 적용 계획이 전무",
        exampleText: "‘매일 저녁 30분 달리기, 훈련 일지 작성, 긍정 확언 읽기’",
        whyBad:
          "초보 코치가 가장 많이 범하는 오류입니다. 리포트의 본래 목적인 코치 자신의 학습 전이와 다음 실습 개입 규칙이 완전히 빠져 있습니다.",
      },
      goodExample: {
        description: "5-1 고객 과제와 5-2 코치 행동 규칙(Action Rule)을 명확히 분리",
        exampleText:
          "【5-1. 고객 실행계획】: 다음 주 훈련 시작 전 5분간 호흡 루틴 및 긍정 자기대화 3문장 실천\n【5-2. 코치의 다음 실습 적용계획 (Action Rules)】: ① 고객이 답을 고민할 때 마음속으로 3초를 세며 침묵을 온전히 기다리기, ② 감정 단어가 나왔을 때 다음 단계로 서두르지 않고 그 감정에 머무는 질문 1가지 던지기",
        whyGood:
          "고객의 실천 과제와 함께, 코치가 이전 실습 성찰에서 배운 점을 다음 실습에서 즉각 교정할 수 있는 구체적 행동 규칙이 수립됩니다.",
      },
      specialTips: [
        "5-2는 반드시 '코치인 내가 다음 세션에서 다르게 행동할 1가지 구체적 규칙' 형태로 작성하세요.",
      ],
    },
  ],
  continuityPrinciple: {
    title: "5개 항목의 유기적 연결성 (Organic Flow)",
    description:
      "좋은 코칭 리포트는 5개 항목이 각각 따로 노는 것이 아니라, 하나의 스토리라인으로 일관되게 관통됩니다.",
    flow: [
      { step: "1. 목표", label: "원한 것", question: "고객이 원했던 변화는 무엇인가?" },
      { step: "2. 내용", label: "일어난 것", question: "그 목표를 위해 어떤 탐색과 개입이 일어났는가?" },
      { step: "3. 통찰", label: "발견한 것", question: "그 과정에서 고객이 새롭게 깨달은 것은 무엇인가?" },
      { step: "4. 성찰", label: "배운 것", question: "그 상호작용 속에서 코치로서 나는 무엇을 배웠는가?" },
      { step: "5. 계획", label: "다음에 할 것", question: "고객은 무엇을 실천하고, 코치는 다음에 무엇을 다르게 할 것인가?" },
    ],
    caution:
      "목표는 '자신감'인데, 내용은 '진로 탐색', 통찰은 '부모와의 관계', 실행계획은 '체력 운동'처럼 항목마다 주제가 흩어지지 않도록, 하나의 세션 흐름이 유기적으로 연결되는지 점검하세요.",
  },
  selfChecklist: {
    title: "작성 완료 전 5대 자기점검 체크리스트",
    subtitle: "리포트를 최종 제출하기 전, 다음 5가지 질문에 '그렇다'라고 답할 수 있는지 확인하세요.",
    questions: [
      {
        no: 1,
        targetItem: "1. 코칭 목표",
        question: "고객이 무엇을 원했는지 제3자가 읽어도 명확히 알 수 있는가?",
        tip: "단순히 '자신감'이 아니라, 오늘 세션에서 다루기로 한 구체적 작업 단위가 보이는지 확인하세요.",
      },
      {
        no: 2,
        targetItem: "2. 코칭 내용",
        question: "고객에게 실제로 무엇이 일어났는지 인과적 흐름이 보이는가?",
        tip: "고객 상태 ➔ 탐색 ➔ 개입 ➔ 반응 순서로 기술되었는지 확인하세요.",
      },
      {
        no: 3,
        targetItem: "2. 코칭 내용",
        question: "내가 왜 그 질문이나 개입 도구를 선택했는지 이유를 알 수 있는가?",
        tip: "단순 도구 이름 나열이 아닌, 그 순간 그 도구를 꺼낸 코치의 의도가 담겨 있는지 확인하세요.",
      },
      {
        no: 4,
        targetItem: "2 & 3. 내용 및 통찰",
        question: "내 개입 이후 고객에게 어떤 반응이나 인식의 변화가 있었는지 알 수 있는가?",
        tip: "고객의 표정, 말투, 신체 반응 및 스스로 깨달은 발화가 기록되어 있는지 확인하세요.",
      },
      {
        no: 5,
        targetItem: "5. 적용 계획",
        question: "이번 경험을 통해 고객의 실천(5-1)과 코치의 다음 행동 규칙(5-2)이 모두 명확한가?",
        tip: "고객 숙제만 적혀 있지 않고, 코치 자신이 다음 세션에서 실천할 Action Rule이 있는지 확인하세요.",
      },
    ],
  },
};
