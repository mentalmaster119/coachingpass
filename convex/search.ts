import { query } from "./mockAuth";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

// Unified search across coaching logs, reflection journals, education records,
// announcements, and resources. Results are filtered to the current user's data
// (or all data for admin/senior_coach).
export const unifiedSearch = query({
  args: {
    q: v.string(),
    category: v.optional(
      v.union(
        v.literal("all"),
        v.literal("coaching"),
        v.literal("reflection"),
        v.literal("education"),
        v.literal("announcement"),
        v.literal("resource"),
      ),
    ),
  },
  handler: async (ctx, args): Promise<{
    coaching: Array<{ _id: string; title: string; subtitle: string; date: string; href: string }>;
    reflection: Array<{ _id: string; title: string; subtitle: string; date: string; href: string }>;
    education: Array<{ _id: string; title: string; subtitle: string; date: string; href: string }>;
    announcement: Array<{ _id: string; title: string; subtitle: string; date: string; href: string }>;
    resource: Array<{ _id: string; title: string; subtitle: string; date: string; href: string }>;
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "로그인이 필요합니다.", code: "UNAUTHENTICATED" });
    }

    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!currentUser) {
      throw new ConvexError({ message: "사용자를 찾을 수 없습니다.", code: "NOT_FOUND" });
    }

    const q = args.q.trim().toLowerCase();
    const cat = args.category ?? "all";
    const isAdminOrCoach = currentUser.role === "admin" || currentUser.role === "senior_coach";

    type SearchItem = { _id: string; title: string; subtitle: string; date: string; href: string };
    type SearchResults = {
      coaching: SearchItem[];
      reflection: SearchItem[];
      education: SearchItem[];
      announcement: SearchItem[];
      resource: SearchItem[];
    };

    const emptyResults: SearchResults = { coaching: [], reflection: [], education: [], announcement: [], resource: [] };
    if (q.length < 1) return emptyResults;

    const results: SearchResults = { ...emptyResults };

    // ── Coaching logs ──────────────────────────────────────────────────────────
    if (cat === "all" || cat === "coaching") {
      const logs = isAdminOrCoach
        ? await ctx.db.query("coachingLogs").take(500)
        : await ctx.db.query("coachingLogs")
            .withIndex("by_user", (idx) => idx.eq("userId", currentUser._id))
            .take(200);

      results.coaching = logs
        .filter(
          (l) =>
            l.topic.toLowerCase().includes(q) ||
            l.coacheeInfo.toLowerCase().includes(q) ||
            l.summary.toLowerCase().includes(q) ||
            l.goals.toLowerCase().includes(q) ||
            (l.clientInsight ?? "").toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((l) => ({
          _id: l._id,
          title: l.topic,
          subtitle: `${l.coacheeInfo} · ${l.coachingDate}`,
          date: l.coachingDate,
          href: "/coaching-log",
        }));
    }

    // ── Reflection journals ────────────────────────────────────────────────────
    if (cat === "all" || cat === "reflection") {
      const journals = isAdminOrCoach
        ? await ctx.db.query("reflectionJournals").take(500)
        : await ctx.db.query("reflectionJournals")
            .withIndex("by_user", (idx) => idx.eq("userId", currentUser._id))
            .take(200);

      results.reflection = journals
        .filter(
          (j) =>
            j.title.toLowerCase().includes(q) ||
            j.content.toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((j) => ({
          _id: j._id,
          title: j.title,
          subtitle: j.content.slice(0, 60) + (j.content.length > 60 ? "…" : ""),
          date: j.entryDate,
          href: "/reflection",
        }));
    }

    // ── Education records ──────────────────────────────────────────────────────
    if (cat === "all" || cat === "education") {
      const edu = isAdminOrCoach
        ? await ctx.db.query("educationRecords").take(500)
        : await ctx.db.query("educationRecords")
            .withIndex("by_user", (idx) => idx.eq("userId", currentUser._id))
            .take(200);

      results.education = edu
        .filter(
          (e) =>
            e.educationName.toLowerCase().includes(q) ||
            e.institution.toLowerCase().includes(q) ||
            (e.notes ?? "").toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((e) => ({
          _id: e._id,
          title: e.educationName,
          subtitle: `${e.institution} · ${e.educationDate}`,
          date: e.educationDate,
          href: "/education",
        }));
    }

    // ── Announcements ──────────────────────────────────────────────────────────
    if (cat === "all" || cat === "announcement") {
      const announcements = await ctx.db
        .query("announcements")
        .withIndex("by_published", (idx) => idx.eq("isPublished", true))
        .take(200);

      results.announcement = announcements
        .filter(
          (a) =>
            a.title.toLowerCase().includes(q) ||
            a.content.toLowerCase().includes(q),
        )
        .slice(0, 10)
        .map((a) => ({
          _id: a._id,
          title: a.title,
          subtitle: a.content.slice(0, 60) + (a.content.length > 60 ? "…" : ""),
          date: new Date(a._creationTime).toISOString().slice(0, 10),
          href: "/announcements",
        }));
    }

    // ── Resources ──────────────────────────────────────────────────────────────
    if (cat === "all" || cat === "resource") {
      const resources = await ctx.db
        .query("resources")
        .withIndex("by_published", (idx) => idx.eq("isPublished", true))
        .take(200);

      results.resource = resources
        .filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            (r.description ?? "").toLowerCase().includes(q) ||
            (r.tags ?? []).some((t) => t.toLowerCase().includes(q)),
        )
        .slice(0, 10)
        .map((r) => ({
          _id: r._id,
          title: r.title,
          subtitle: r.description?.slice(0, 60) ?? r.fileName,
          date: new Date(r._creationTime).toISOString().slice(0, 10),
          href: "/resources",
        }));
    }

    return results;
  },
});
