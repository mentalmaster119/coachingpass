import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useDebounce } from "@/hooks/use-debounce.ts";
import { Input } from "@/components/ui/input.tsx";
import { Badge } from "@/components/ui/badge.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  Search,
  ClipboardList,
  NotebookPen,
  BookOpen,
  Megaphone,
  FolderOpen,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";

type Category = "all" | "coaching" | "reflection" | "education" | "announcement" | "resource";

const CATEGORIES: { value: Category; label: string; icon: React.ReactNode }[] = [
  { value: "all", label: "전체", icon: <Search className="w-3.5 h-3.5" /> },
  { value: "coaching", label: "코칭 로그", icon: <ClipboardList className="w-3.5 h-3.5" /> },
  { value: "reflection", label: "성찰 일지", icon: <NotebookPen className="w-3.5 h-3.5" /> },
  { value: "education", label: "교육 기록", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { value: "announcement", label: "공지사항", icon: <Megaphone className="w-3.5 h-3.5" /> },
  { value: "resource", label: "자료실", icon: <FolderOpen className="w-3.5 h-3.5" /> },
];

const CATEGORY_CONFIG: Record<
  Exclude<Category, "all">,
  { label: string; icon: React.ReactNode; color: string }
> = {
  coaching: { label: "코칭 로그", icon: <ClipboardList className="w-4 h-4" />, color: "text-blue-500" },
  reflection: { label: "성찰 일지", icon: <NotebookPen className="w-4 h-4" />, color: "text-purple-500" },
  education: { label: "교육 기록", icon: <BookOpen className="w-4 h-4" />, color: "text-green-500" },
  announcement: { label: "공지사항", icon: <Megaphone className="w-4 h-4" />, color: "text-orange-500" },
  resource: { label: "자료실", icon: <FolderOpen className="w-4 h-4" />, color: "text-teal-500" },
};

export default function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [inputValue, setInputValue] = useState(searchParams.get("q") ?? "");
  const [category, setCategory] = useState<Category>(
    (searchParams.get("cat") as Category) ?? "all",
  );

  const [debouncedQuery] = useDebounce(inputValue, 350);

  // Keep URL in sync with search state
  useEffect(() => {
    const params: Record<string, string> = {};
    if (debouncedQuery) params.q = debouncedQuery;
    if (category !== "all") params.cat = category;
    setSearchParams(params, { replace: true });
  }, [debouncedQuery, category, setSearchParams]);

  const results = useQuery(
    api.search.unifiedSearch,
    debouncedQuery.trim().length >= 1
      ? { q: debouncedQuery, category }
      : "skip",
  );

  const isSearching = debouncedQuery.trim().length >= 1 && results === undefined;

  // Flatten results for "all" category display
  const allResults =
    results && category === "all"
      ? [
          ...results.coaching.map((r) => ({ ...r, cat: "coaching" as const })),
          ...results.reflection.map((r) => ({ ...r, cat: "reflection" as const })),
          ...results.education.map((r) => ({ ...r, cat: "education" as const })),
          ...results.announcement.map((r) => ({ ...r, cat: "announcement" as const })),
          ...results.resource.map((r) => ({ ...r, cat: "resource" as const })),
        ]
      : null;

  const totalCount = allResults?.length ?? 0;

  const renderResultItem = (
    item: { _id: string; title: string; subtitle: string; date: string; href: string },
    cat: Exclude<Category, "all">,
  ) => {
    const config = CATEGORY_CONFIG[cat];
    return (
      <button
        key={item._id}
        type="button"
        onClick={() => navigate(item.href)}
        className="w-full flex items-start gap-3 px-4 py-3 rounded-lg hover:bg-muted/60 transition-colors cursor-pointer text-left group"
      >
        <div className={cn("mt-0.5 flex-shrink-0", config.color)}>{config.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {item.title}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{item.subtitle}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <span className="text-[10px] text-muted-foreground">{item.date}</span>
          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />
        </div>
      </button>
    );
  };

  const renderCategoryResults = (cat: Exclude<Category, "all">) => {
    if (!results) return null;
    const items = results[cat];
    const config = CATEGORY_CONFIG[cat];
    if (items.length === 0) return null;

    return (
      <div key={cat}>
        <div className={cn("flex items-center gap-1.5 px-4 py-2 text-xs font-semibold", config.color)}>
          {config.icon}
          <span>{config.label}</span>
          <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">{items.length}</Badge>
        </div>
        <div className="space-y-0.5">
          {items.map((item) => renderResultItem(item, cat))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground mb-1">통합 검색</h1>
        <p className="text-sm text-muted-foreground">
          코칭 로그, 성찰 일지, 교육 기록, 공지사항, 자료실을 한 번에 검색합니다.
        </p>
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          autoFocus
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="검색어를 입력하세요…"
          className="pl-9 h-11 text-base"
        />
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            type="button"
            onClick={() => setCategory(cat.value)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer",
              category === cat.value
                ? "bg-primary text-primary-foreground border-primary"
                : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground",
            )}
          >
            {cat.icon}
            {cat.label}
          </button>
        ))}
      </div>

      {/* Results */}
      {isSearching && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="w-4 h-4 rounded flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-3 w-16" />
            </div>
          ))}
        </div>
      )}

      {!isSearching && debouncedQuery.trim().length >= 1 && results && (
        <>
          {/* Summary */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">&ldquo;{debouncedQuery}&rdquo;</span> 검색 결과{" "}
              {category === "all" ? `${totalCount}건` : ""}
            </p>
          </div>

          {/* Results list */}
          <div className="rounded-xl border bg-card overflow-hidden divide-y divide-border">
            {category === "all" ? (
              allResults && allResults.length > 0 ? (
                <div className="divide-y divide-border">
                  {(["coaching", "reflection", "education", "announcement", "resource"] as const).map(
                    (cat) => renderCategoryResults(cat),
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">검색 결과가 없습니다</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">다른 검색어를 입력해 보세요.</p>
                </div>
              )
            ) : (
              <>
                {results[category].length > 0 ? (
                  <div className="space-y-0.5 py-1">
                    {results[category].map((item) =>
                      renderResultItem(item, category as Exclude<Category, "all">),
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <Search className="w-8 h-8 text-muted-foreground/40 mb-3" />
                    <p className="text-sm font-medium text-muted-foreground">검색 결과가 없습니다</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">다른 검색어를 입력해 보세요.</p>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Empty state (no query) */}
      {debouncedQuery.trim().length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <Search className="w-6 h-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">검색어를 입력하세요</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            코칭 로그, 성찰 일지, 교육 기록 등을 검색할 수 있습니다
          </p>
        </div>
      )}
    </div>
  );
}
