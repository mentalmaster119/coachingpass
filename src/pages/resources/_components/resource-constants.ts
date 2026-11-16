// Shared constants for resource categories – split from resource-card.tsx
// to satisfy fast-refresh rules (no non-component exports in component files).

export const CATEGORY_LABELS: Record<string, string> = {
  education: "교육자료",
  form: "양식/서식",
  guideline: "가이드라인",
  reference: "참고자료",
  other: "기타",
};

export const CATEGORY_COLORS: Record<string, string> = {
  education: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  form: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  guideline: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  reference: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  other: "bg-muted text-muted-foreground",
};

const NEW_RESOURCE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

export function isNewResource(creationTime: number): boolean {
  return Date.now() - creationTime <= NEW_RESOURCE_WINDOW_MS;
}

export function formatResourceDate(creationTime: number): string {
  const d = new Date(creationTime);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}
