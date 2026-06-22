/**
 * KCA(한국코치협회) 핵심역량 체계 - 2023년 이후 8가지 역량 기준
 * 심사항목은 역량별 행동지표를 기반으로 구성됨
 */

export type CompetencyArea =
  | "전문계발"
  | "관계구축"
  | "적극경청"
  | "의식확장"
  | "성장지원";

export type CompetencyItem = {
  id: string;
  area: CompetencyArea;
  label: string;
  description: string;
  /** KAC 심사항목 포함 여부 */
  kac: boolean;
  /** KPC 심사항목 포함 여부 */
  kpc: boolean;
};

export const COMPETENCY_AREAS: CompetencyArea[] = [
  "전문계발",
  "관계구축",
  "적극경청",
  "의식확장",
  "성장지원",
];

export const AREA_COLORS: Record<CompetencyArea, string> = {
  전문계발: "hsl(220 70% 55%)",
  관계구축: "hsl(280 65% 55%)",
  적극경청: "hsl(160 60% 45%)",
  의식확장: "hsl(35 80% 55%)",
  성장지원: "hsl(340 65% 55%)",
};

export const ALL_COMPETENCY_ITEMS: CompetencyItem[] = [
  // ── 전문계발 ─────────────────────────────────────────────────────────────
  {
    id: "pro_coaching_agreement",
    area: "전문계발",
    label: "코칭 합의",
    description:
      "고객과 코칭 목표 및 기대 성과에 대해 충분히 대화하고 합의하며, 코칭 동의서를 작성하고 성과 측정 기준을 사전에 공유한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "pro_outcome_management",
    area: "전문계발",
    label: "성과 관리",
    description:
      "코칭 성과를 코치와 고객 및 이해관계자가 공감하고 인정할 수 있는 객관적 지표로 관리한다.",
    kac: true,
    kpc: true,
  },

  // ── 관계구축 ─────────────────────────────────────────────────────────────
  {
    id: "rel_rapport",
    area: "관계구축",
    label: "라포 형성",
    description:
      "코칭 시작 시 진정성과 일관성을 바탕으로 고객이 편안하게 대화를 나눌 수 있는 분위기를 형성한다.",
    kac: true,
    kpc: false,
  },
  {
    id: "rel_partnership",
    area: "관계구축",
    label: "수평적 파트너십",
    description:
      "코치와 고객이 동등한 입장에서 소통하고 변화와 성장의 주체로서 고객이 선택과 결정을 주도하도록 지원한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "rel_trust_safety",
    area: "관계구축",
    label: "신뢰감과 안전감",
    description:
      "고객에게 긍정반응, 인정, 칭찬, 지지, 격려, 신뢰 등의 언어를 상황에 맞게 사용하여 심리적 안전감을 제공한다.",
    kac: true,
    kpc: true,
  },

  // ── 적극경청 ─────────────────────────────────────────────────────────────
  {
    id: "lis_reflection",
    area: "적극경청",
    label: "반영",
    description:
      "어조 높낮이, 속도 맞추기, 추임새 등을 하면서 고객의 이야기를 재진술·요약하고, 침묵(space)을 활용하며 경청한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "lis_empathy",
    area: "적극경청",
    label: "공감",
    description:
      "고객의 생각이나 감정, 의도나 욕구를 이해하며 이해한 것을 고객에게 진심으로 표현한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "lis_expression_support",
    area: "적극경청",
    label: "고객의 표현지원",
    description:
      "판단하지 않고 끝까지 들으며 고객이 자신의 생각, 감정, 의도, 욕구를 자유롭게 표현하도록 심리적 안전감을 제공한다.",
    kac: true,
    kpc: true,
  },

  // ── 의식확장 ─────────────────────────────────────────────────────────────
  {
    id: "awa_questioning",
    area: "의식확장",
    label: "질문",
    description:
      "고객의 관심과 사고를 따라가는 질문을 통해 고객의 성찰을 돕고 의식 확장으로 이어지게 한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "awa_technique",
    area: "의식확장",
    label: "기법 활용",
    description:
      "침묵, 비유, 은유 등 다양한 코칭 기법을 활용하여 고객의 의식 확장을 촉진한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "awa_meaning_expansion",
    area: "의식확장",
    label: "의미확장과 구체화",
    description:
      "청크업과 청크다운을 활용하여 고객 이야기의 의미를 확장하거나 구체화하고, 가치와 정체성 탐색으로 연결한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "awa_insight",
    area: "의식확장",
    label: "통찰",
    description:
      "고객이 자신과 주변 환경에 대한 자각·인식에서 나아가 새로운 깨달음(아하!)을 얻도록 돕는다.",
    kac: true,
    kpc: true,
  },
  {
    id: "awa_curiosity",
    area: "의식확장",
    label: "호기심",
    description:
      "'알지 못함'의 자세로 고객의 주제와 존재에 대해 깊은 관심과 호기심을 가지고 대한다.",
    kac: false,
    kpc: true,
  },

  // ── 성장지원 ─────────────────────────────────────────────────────────────
  {
    id: "gro_autonomy",
    area: "성장지원",
    label: "자율성과 책임 고취",
    description:
      "자극과 반응 사이의 선택 자유를 인식하게 하여 고객이 스스로 목표를 확인하고 주도적으로 책임지도록 고취한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "gro_action_support",
    area: "성장지원",
    label: "행동전환 지원",
    description:
      "학습과 통찰이 실천으로 연결되고 성공 경험이 지속적 변화로 이어지도록 후원 환경 조성과 실행 지원을 한다.",
    kac: true,
    kpc: true,
  },
  {
    id: "gro_celebrate",
    area: "성장지원",
    label: "변화와 성장 축하",
    description:
      "코칭 과정 전반에 걸친 고객의 언어·행동·태도·가치관 등 내재적·외재적 변화와 성장을 알아차리고 축하하며 마무리한다.",
    kac: true,
    kpc: false,
  },
  {
    id: "gro_perspective_shift",
    area: "성장지원",
    label: "관점전환과 재구성",
    description:
      "고객이 주제와 관련하여 현재 가진 관점을 전환·재구성하여 목표와 한 방향으로 정렬되도록 돕는다.",
    kac: false,
    kpc: true,
  },
  {
    id: "gro_identity_integration",
    area: "성장지원",
    label: "정체성과의 통합 지원",
    description:
      "코칭에서 얻은 통찰을 고객의 가치관 및 정체성(Who)과 통합하도록 지원하여 존재적 수준의 변화를 이끈다.",
    kac: false,
    kpc: true,
  },
];

/** 자격증 목표에 맞는 항목만 반환 */
export function getItemsForGoal(goal: "KAC" | "KPC" | "SMPCC"): CompetencyItem[] {
  if (goal === "KAC") return ALL_COMPETENCY_ITEMS.filter((item) => item.kac);
  if (goal === "KPC") return ALL_COMPETENCY_ITEMS.filter((item) => item.kpc);
  // SMPCC: 전체 항목 반환
  return ALL_COMPETENCY_ITEMS;
}

/** 역량 영역별로 그룹화 */
export function groupByArea(
  items: CompetencyItem[],
): Record<CompetencyArea, CompetencyItem[]> {
  const result = {} as Record<CompetencyArea, CompetencyItem[]>;
  for (const area of COMPETENCY_AREAS) {
    result[area] = items.filter((i) => i.area === area);
  }
  return result;
}

export const SCORE_LABELS: Record<number, string> = {
  1: "매우 부족",
  2: "부족",
  3: "보통",
  4: "우수",
  5: "매우 우수",
};
