export type EducationCategoryKey = "expert" | "common" | "kca";

export interface CourseDefinition {
  key: string;              // e.g. "expert", "mspe", "sp_cp", "kac", "kpc"
  name: string;             // e.g. "멘탈전문가과정", "MSPE과정", "SP/CP과정", "KAC과정", "KPC과정"
  fullName: string;         // e.g. "MCCI 멘탈코칭전문가과정", "MSPE명상기본과정", "스포츠심리학 / 코칭심리학 강독 과정"
  educationCategory: EducationCategoryKey;
  isLongTerm: boolean;      // true for expert (장기), false for short-term (단기)
  creditHours: number;
  description: string;
  badgeLabel?: string;
  pdfUrl?: string;
  landingPageUrl?: string;
  aliases?: string[];
}

export interface EducationCategory {
  key: EducationCategoryKey;
  name: string;             // "멘탈전문가과정", "멘탈공통교육", "KCA교육"
  badge: string;            // "정규 장기과정", "단기 과정", "인증 단기과정"
  description: string;
  isLongTerm: boolean;
  courses: CourseDefinition[];
}

export const EDUCATION_CATEGORIES: EducationCategory[] = [
  {
    key: "expert",
    name: "멘탈전문가과정",
    badge: "정규 장기과정",
    description: "한국스포츠멘탈코칭협회(MCCI) 정규 전문가 자격 취득 과정 (장기간 진행, 기수별 6회차 세미나 및 실습)",
    isLongTerm: true,
    courses: [
      {
        key: "expert",
        name: "멘탈전문가과정",
        fullName: "MCCI 스포츠멘탈코칭 전문가과정 (정규 본과정)",
        educationCategory: "expert",
        isLongTerm: true,
        creditHours: 60,
        description: "MCCI 정규 전문가 자격 취득 과정으로, 기수별 온/오프라인 6회차 세미나와 실습 및 코칭 수련이 장기간 진행됩니다.",
        badgeLabel: "장기 정규과정",
        aliases: ["전문가과정", "멘탈코칭전문가", "SMPCC", "본과정"],
      },
    ],
  },
  {
    key: "common",
    name: "멘탈공통교육",
    badge: "단기 과정",
    description: "스포츠멘탈코칭 공통 핵심 역량 교육 (단기 집중 과정)",
    isLongTerm: false,
    courses: [
      {
        key: "mspe",
        name: "MSPE과정",
        fullName: "MSPE명상기본과정 (Mindfulness-Sport Performance Enhancement)",
        educationCategory: "common",
        isLongTerm: false,
        creditHours: 16,
        description: "스포츠 선수의 몰입과 감정 조절, 심리적 안정감을 위한 마인드풀니스(MSPE) 기반 명상 기초 단기 과정입니다.",
        badgeLabel: "단기 집중",
        aliases: ["MSPE", "mspe", "MSPE명상기본과정", "MSPE명상", "명상"],
      },
      {
        key: "sp_cp",
        name: "SP/CP과정",
        fullName: "스포츠심리학 / 코칭심리학 강독 과정",
        educationCategory: "common",
        isLongTerm: false,
        creditHours: 15,
        description: "스포츠심리학(Sport Psychology) 및 코칭심리학(Coaching Psychology) 최신 이론 강독 및 현장 적용 실습 단기 과정입니다.",
        badgeLabel: "단기 강독",
        aliases: [
          "스포츠심리학",
          "코칭심리학",
          "스포츠심리학 / 코칭심리학 강독",
          "스포츠심리학강독기본과정",
          "스포츠심리학강독심화과정",
          "SP/CP",
          "SP",
          "CP",
          "강독",
        ],
      },
    ],
  },
  {
    key: "kca",
    name: "KCA교육",
    badge: "단기 과정",
    description: "사단법인 한국코치협회(KCA) 공인 코치 자격 인증 교육 (단기 과정)",
    isLongTerm: false,
    courses: [
      {
        key: "kac",
        name: "KAC과정",
        fullName: "KAC기본과정 (한국코치협회 인증 KAC 취득 과정)",
        educationCategory: "kca",
        isLongTerm: false,
        creditHours: 20,
        description: "한국코치협회 인증 KAC 자격 취득을 위한 기초 코칭 역량 및 이론 실습 단기 교육과정입니다.",
        badgeLabel: "KCA 인증",
        aliases: ["KAC", "kac", "KAC기본과정", "KAC과정"],
      },
      {
        key: "kpc",
        name: "KPC과정",
        fullName: "KPC심화/개발과정 (한국코치협회 인증 KPC 도약 과정)",
        educationCategory: "kca",
        isLongTerm: false,
        creditHours: 40,
        description: "전문 코치로서의 역량 심화 및 KPC 단계 도약을 위한 전문 코칭 심화 교육과정입니다. (향후 추가 및 확장)",
        badgeLabel: "KCA 인증",
        aliases: ["KPC", "kpc", "KPC심화과정", "KPC개발과정", "KPC과정"],
      },
    ],
  },
];

/**
 * Dynamically merges DB-stored courseCredits into the static EDUCATION_CATEGORIES.
 * Custom courses added by admins (e.g. 멘탈트레이닝기본과정, 멘탈 포럼) are attached to their
 * respective educationCategory, and existing course overrides (creditHours, description, URLs)
 * are cleanly applied.
 */
export function getMergedCurriculum(
  courseCredits?: Array<{
    courseKey: string;
    courseName: string;
    creditHours: number;
    description?: string;
    pdfUrl?: string;
    landingPageUrl?: string;
    educationCategory?: string;
    isLongTerm?: boolean;
  }> | null
): EducationCategory[] {
  const categories: EducationCategory[] = EDUCATION_CATEGORIES.map((cat) => ({
    ...cat,
    courses: cat.courses.map((c) => ({ ...c })),
  }));

  if (!courseCredits || courseCredits.length === 0) {
    return categories;
  }

  for (const cc of courseCredits) {
    // 1. Determine target education category
    let targetCatKey: EducationCategoryKey = "common";
    if (
      cc.educationCategory === "expert" ||
      cc.educationCategory === "common" ||
      cc.educationCategory === "kca"
    ) {
      targetCatKey = cc.educationCategory;
    } else {
      const name = (cc.courseName || "").trim();
      if (
        name.includes("KAC") ||
        name.includes("KPC") ||
        name.includes("코치협회") ||
        name.includes("KCA")
      ) {
        targetCatKey = "kca";
      } else if (
        (name.includes("전문가") || name.includes("SMPCC")) &&
        !name.includes("기본과정")
      ) {
        targetCatKey = "expert";
      } else {
        targetCatKey = "common";
      }
    }

    const cat = categories.find((c) => c.key === targetCatKey);
    if (!cat) continue;

    // 2. Check if it matches an existing predefined course
    const existingIdx = cat.courses.findIndex(
      (c) =>
        c.key === cc.courseKey ||
        c.name === cc.courseName ||
        c.fullName === cc.courseName ||
        (c.aliases &&
          c.aliases.some((a) => cc.courseName.includes(a) || a.includes(cc.courseName)))
    );

    if (existingIdx >= 0) {
      const existing = cat.courses[existingIdx];
      cat.courses[existingIdx] = {
        ...existing,
        fullName: existing.fullName || cc.courseName,
        creditHours: cc.creditHours || existing.creditHours,
        description: cc.description || existing.description,
        pdfUrl: cc.pdfUrl || existing.pdfUrl,
        landingPageUrl: cc.landingPageUrl || existing.landingPageUrl,
      };
    } else {
      // 3. Insert as a new custom course in this category!
      cat.courses.push({
        key: cc.courseKey,
        name: cc.courseName,
        fullName: cc.courseName,
        educationCategory: targetCatKey,
        isLongTerm:
          cc.isLongTerm !== undefined
            ? cc.isLongTerm
            : targetCatKey === "expert",
        creditHours: cc.creditHours ?? 0,
        description: cc.description || "",
        badgeLabel: cc.creditHours ? `${cc.creditHours}시간` : "단기 과정",
        pdfUrl: cc.pdfUrl,
        landingPageUrl: cc.landingPageUrl,
      });
    }
  }

  return categories;
}

/**
 * Determine the Education Category and Course for a Cohort.
 * If cohort was created with an explicit educationCategory, use it.
 * Otherwise, fall back cleanly using its name so existing DB data (e.g. 18기, 심리학강독)
 * maps to the right category without requiring manual DB updates.
 */
export function resolveCohortCategory(cohort: {
  name: string;
  educationCategory?: string;
  courseCode?: string;
}): {
  category: EducationCategoryKey;
  courseKey: string;
  isLongTerm: boolean;
} {
  if (
    cohort.educationCategory === "expert" ||
    cohort.educationCategory === "common" ||
    cohort.educationCategory === "kca"
  ) {
    const courseKey =
      cohort.courseCode ||
      (cohort.educationCategory === "expert"
        ? "expert"
        : cohort.educationCategory === "common"
        ? "mspe"
        : "kac");
    return {
      category: cohort.educationCategory,
      courseKey,
      isLongTerm: cohort.educationCategory === "expert",
    };
  }

  const name = cohort.name.trim();

  // 1. Check SP/CP or 심리학 강독
  if (
    name.includes("심리학") ||
    name.includes("강독") ||
    name.includes("SP") ||
    name.includes("CP")
  ) {
    return { category: "common", courseKey: "sp_cp", isLongTerm: false };
  }

  // 2. Check MSPE
  if (name.includes("MSPE") || name.includes("mspe") || name.includes("명상")) {
    return { category: "common", courseKey: "mspe", isLongTerm: false };
  }

  // 3. Check KAC
  if (name.includes("KAC") || name.includes("kac")) {
    return { category: "kca", courseKey: "kac", isLongTerm: false };
  }

  // 4. Check KPC
  if (name.includes("KPC") || name.includes("kpc")) {
    return { category: "kca", courseKey: "kpc", isLongTerm: false };
  }

  // 5. Check Mental Training
  if (name.includes("트레이닝") || name.includes("멘탈트레이닝")) {
    return { category: "common", courseKey: "course_1791683370051", isLongTerm: false };
  }

  // Default: Regular Expert Cohort (18기, 19기, 17기, 16기...)
  return { category: "expert", courseKey: "expert", isLongTerm: true };
}

/**
 * Determine the Education Category and Course for a Seminar.
 * If linked to a cohort, uses that cohort's category.
 * If stand-alone seminar (common), inspects title/description.
 */
export function resolveSeminarCategory(
  seminar: {
    title: string;
    description?: string;
    cohortId?: string | null;
    educationCategory?: string;
    courseCode?: string;
  },
  cohortMap?: Map<string, { name: string; educationCategory?: string; courseCode?: string }>
): {
  category: EducationCategoryKey;
  courseKey: string;
  isLongTerm: boolean;
} {
  if (
    seminar.educationCategory === "expert" ||
    seminar.educationCategory === "common" ||
    seminar.educationCategory === "kca"
  ) {
    const courseKey =
      seminar.courseCode ||
      (seminar.educationCategory === "expert"
        ? "expert"
        : seminar.educationCategory === "common"
        ? "mspe"
        : "kac");
    return {
      category: seminar.educationCategory,
      courseKey,
      isLongTerm: seminar.educationCategory === "expert",
    };
  }

  if (seminar.cohortId && cohortMap && cohortMap.has(seminar.cohortId)) {
    const cohort = cohortMap.get(seminar.cohortId)!;
    return resolveCohortCategory(cohort);
  }

  const text = `${seminar.title} ${seminar.description || ""}`;

  // KCA check
  if (text.includes("KAC") || text.includes("kac")) {
    return { category: "kca", courseKey: "kac", isLongTerm: false };
  }
  if (text.includes("KPC") || text.includes("kpc")) {
    return { category: "kca", courseKey: "kpc", isLongTerm: false };
  }

  // Common check
  if (text.includes("MSPE") || text.includes("mspe") || text.includes("명상")) {
    return { category: "common", courseKey: "mspe", isLongTerm: false };
  }
  if (
    text.includes("심리학") ||
    text.includes("강독") ||
    text.includes("SP") ||
    text.includes("CP")
  ) {
    return { category: "common", courseKey: "sp_cp", isLongTerm: false };
  }
  if (text.includes("트레이닝") || text.includes("멘탈트레이닝")) {
    return { category: "common", courseKey: "course_1791683370051", isLongTerm: false };
  }

  // Forum check
  if (text.includes("포럼") || text.includes("멘탈 포럼")) {
    return { category: "common", courseKey: "mspe", isLongTerm: false };
  }

  // Numbered seminar sessions like "1차 세미나" without explicit cohort
  if (seminar.cohortId) {
    return { category: "expert", courseKey: "expert", isLongTerm: true };
  }

  return { category: "expert", courseKey: "expert", isLongTerm: true };
}
