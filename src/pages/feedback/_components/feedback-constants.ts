// Shared constants for coach feedback – separate file to satisfy fast-refresh rules

export const CATEGORY_LABELS: Record<string, string> = {
  coaching_skills: "코칭 기술",
  communication: "소통 능력",
  self_development: "자기 개발 노력",
  overall: "종합 평가",
};

export const CATEGORY_COLORS: Record<string, string> = {
  coaching_skills: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  communication: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  self_development: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  overall: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

export type FeedbackCategory = "coaching_skills" | "communication" | "self_development" | "overall";
