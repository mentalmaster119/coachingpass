import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import type { Doc } from "@/convex/_generated/dataModel.d.ts";
import { Megaphone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty.tsx";
import AnnouncementCard from "./_components/announcement-card.tsx";
import AnnouncementDetailDialog from "./_components/announcement-detail-dialog.tsx";

type CategoryFilter = "all" | "general" | "important" | "event";

export default function AnnouncementsPage() {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [selected, setSelected] = useState<Doc<"announcements"> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const announcements = useQuery(
    api.announcements.listPublished,
    categoryFilter === "all" ? {} : { category: categoryFilter },
  );

  const tabs: { value: CategoryFilter; label: string }[] = [
    { value: "all", label: "전체" },
    { value: "important", label: "중요" },
    { value: "event", label: "행사" },
    { value: "general", label: "일반" },
  ];

  const handleCardClick = (ann: Doc<"announcements">) => {
    setSelected(ann);
    setDetailOpen(true);
  };

  const isLoading = announcements === undefined;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Megaphone className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold">공지사항</h1>
          <p className="text-sm text-muted-foreground">협회 및 교육 관련 공지사항을 확인하세요</p>
        </div>
      </div>

      {/* Category Tabs */}
      <Tabs value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as CategoryFilter)}>
        <TabsList>
          {tabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : announcements.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Megaphone />
            </EmptyMedia>
            <EmptyTitle>공지사항이 없습니다</EmptyTitle>
            <EmptyDescription>
              {categoryFilter === "all"
                ? "아직 등록된 공지사항이 없습니다"
                : "해당 카테고리의 공지사항이 없습니다"}
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-2">
          {announcements.map((ann) => (
            <AnnouncementCard
              key={ann._id}
              announcement={ann}
              onClick={() => handleCardClick(ann)}
            />
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <AnnouncementDetailDialog
        announcement={selected}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
