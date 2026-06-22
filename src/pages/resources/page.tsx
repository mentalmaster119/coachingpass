import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { Authenticated } from "@/components/providers/convex.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty.tsx";
import { FolderOpen, Search } from "lucide-react";
import ResourceCard from "./_components/resource-card.tsx";
import { CATEGORY_LABELS } from "./_components/resource-constants.ts";

const CATEGORIES = ["all", "education", "form", "guideline", "reference", "other"] as const;
type Category = (typeof CATEGORIES)[number];

function ResourcesPageInner() {
  const [activeCategory, setActiveCategory] = useState<Category>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const resources = useQuery(
    api.resources.listPublished,
    activeCategory === "all" ? {} : { category: activeCategory },
  );

  const filtered = (resources ?? []).filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.description?.toLowerCase().includes(q) ||
      r.fileName.toLowerCase().includes(q) ||
      r.tags?.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">자료실</h1>
        <p className="text-muted-foreground mt-1">코칭 실습과 자격증 준비에 필요한 자료를 내려받으세요</p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="자료 검색..."
          className="pl-9"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Category tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <Button
            key={cat}
            size="sm"
            variant={activeCategory === cat ? "default" : "secondary"}
            onClick={() => setActiveCategory(cat)}
          >
            {cat === "all" ? "전체" : CATEGORY_LABELS[cat]}
          </Button>
        ))}
      </div>

      {/* Content */}
      {resources === undefined ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FolderOpen />
            </EmptyMedia>
            <EmptyTitle>자료가 없습니다</EmptyTitle>
            <EmptyDescription>
              {searchQuery
                ? "검색 결과가 없습니다. 다른 키워드로 검색해 보세요."
                : "아직 등록된 자료가 없습니다. 나중에 다시 확인해 주세요."}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">총 {filtered.length}개 자료</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((resource) => (
              <ResourceCard key={resource._id} resource={resource} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function ResourcesPage() {
  return (
    <Authenticated>
      <ResourcesPageInner />
    </Authenticated>
  );
}
