import { useState } from "react";
import { usePaginatedQuery } from "convex/react";
import { motion } from "motion/react";
import { Plus, Users, Search, Bookmark, ArrowUpDown, TrendingUp, Clock } from "lucide-react";
import { api } from "@/convex/_generated/api.js";
import type { Id } from "@/convex/_generated/dataModel.d.ts";
import { Button } from "@/components/ui/button.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu.tsx";
import {
  Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent,
} from "@/components/ui/empty.tsx";
import PostCard from "./_components/post-card.tsx";
import PostFormDialog from "./_components/post-form-dialog.tsx";
import PostDetailDialog from "./_components/post-detail-dialog.tsx";

type Category = "all" | "general" | "question" | "sharing" | "resource";
type ViewMode = "all" | "mine" | "bookmarks";
type SortBy = "recent" | "popular";

const CATEGORY_TABS: { value: Category; label: string }[] = [
  { value: "all", label: "전체" },
  { value: "question", label: "질문/답변" },
  { value: "sharing", label: "경험 나눔" },
  { value: "resource", label: "자료 공유" },
  { value: "general", label: "자유게시판" },
];

export default function CommunityPage() {
  const [category, setCategory] = useState<Category>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [writeOpen, setWriteOpen] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState<Id<"communityPosts"> | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Main feed (all / by category)
  const feed = usePaginatedQuery(
    api.community.listPosts,
    viewMode === "all"
      ? { ...(category !== "all" ? { category } : {}), sortBy }
      : "skip",
    { initialNumItems: 20 },
  );

  // My posts
  const myPosts = usePaginatedQuery(
    api.community.getMyPosts,
    viewMode === "mine" ? {} : "skip",
    { initialNumItems: 20 },
  );

  // Bookmarks
  const bookmarks = usePaginatedQuery(
    api.community.getMyBookmarks,
    viewMode === "bookmarks" ? {} : "skip",
    { initialNumItems: 20 },
  );

  // Select active data source
  const activeData = viewMode === "mine" ? myPosts : viewMode === "bookmarks" ? bookmarks : feed;
  const results = activeData.results ?? [];
  const status = activeData.status;
  const loadMore = activeData.loadMore;

  const filtered = search.trim()
    ? results.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.content.toLowerCase().includes(search.toLowerCase()),
      )
    : results;

  const handlePostClick = (postId: Id<"communityPosts">) => {
    setSelectedPostId(postId);
    setDetailOpen(true);
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">커뮤니티</h1>
            <p className="text-muted-foreground text-xs md:text-sm hidden sm:block">
              교육생·슈퍼바이저가 함께 소통하는 공간입니다.
            </p>
          </div>
        </div>
        <Button onClick={() => setWriteOpen(true)} size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          글쓰기
        </Button>
      </motion.div>

      {/* View mode tabs */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.03 }}
      >
        <div className="flex items-center gap-2 border-b pb-3">
          {(
            [
              { value: "all", label: "전체 게시글" },
              { value: "mine", label: "내 글" },
              { value: "bookmarks", label: "북마크", icon: <Bookmark className="w-3.5 h-3.5" /> },
            ] as { value: ViewMode; label: string; icon?: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.value}
              onClick={() => { setViewMode(tab.value); setSearch(""); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                viewMode === tab.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Search + filters (only in all mode) */}
      {viewMode === "all" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          className="space-y-3"
        >
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="제목 또는 내용으로 검색..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 flex-shrink-0">
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{sortBy === "recent" ? "최신순" : "인기순"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortBy("recent")} className={sortBy === "recent" ? "font-semibold" : ""}>
                  <Clock className="w-4 h-4 mr-2" /> 최신순
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortBy("popular")} className={sortBy === "popular" ? "font-semibold" : ""}>
                  <TrendingUp className="w-4 h-4 mr-2" /> 인기순
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <Tabs value={category} onValueChange={(v) => { setCategory(v as Category); setSearch(""); }}>
            <TabsList className="flex-wrap h-auto gap-1">
              {CATEGORY_TABS.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </motion.div>
      )}

      {/* Post list */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-3"
      >
        {status === "LoadingFirstPage" ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))
        ) : filtered.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                {viewMode === "bookmarks" ? <Bookmark /> : <Users />}
              </EmptyMedia>
              <EmptyTitle>
                {viewMode === "bookmarks"
                  ? "북마크한 게시글이 없습니다"
                  : viewMode === "mine"
                  ? "작성한 게시글이 없습니다"
                  : search
                  ? "검색 결과가 없습니다"
                  : "아직 게시글이 없습니다"}
              </EmptyTitle>
              <EmptyDescription>
                {viewMode === "bookmarks"
                  ? "마음에 드는 게시글에 북마크를 해보세요."
                  : viewMode === "mine"
                  ? "첫 번째 게시글을 작성해 보세요!"
                  : search
                  ? "다른 검색어를 입력해 보세요."
                  : "첫 번째 게시글을 작성해 보세요!"}
              </EmptyDescription>
            </EmptyHeader>
            {(viewMode === "mine" || (!search && viewMode === "all")) && (
              <EmptyContent>
                <Button size="sm" onClick={() => setWriteOpen(true)}>
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  글쓰기
                </Button>
              </EmptyContent>
            )}
          </Empty>
        ) : (
          <>
            {filtered.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                onClick={() => handlePostClick(post._id)}
              />
            ))}

            {status === "CanLoadMore" && (
              <div className="flex justify-center pt-2">
                <Button variant="ghost" onClick={() => loadMore(20)}>
                  더 보기
                </Button>
              </div>
            )}
            {status === "LoadingMore" && (
              <div className="flex justify-center pt-2">
                <Skeleton className="h-9 w-24 rounded-lg" />
              </div>
            )}
          </>
        )}
      </motion.div>

      <PostFormDialog open={writeOpen} onOpenChange={setWriteOpen} />
      <PostDetailDialog
        postId={selectedPostId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDeleted={() => setSelectedPostId(null)}
      />
    </div>
  );
}
