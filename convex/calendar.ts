import { query, mutation } from "./mockAuth";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

// List events for a user in a given month (their own + shared events)
export const listEventsForMonth = query({
  args: {
    year: v.number(),
    month: v.number(), // 1-indexed
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Build date range strings for the month
    const paddedMonth = String(args.month).padStart(2, "0");
    const startDate = `${args.year}-${paddedMonth}-01`;
    // Last day of month
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

    // Fetch user's own events
    const allUserEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const userEventsInMonth = allUserEvents.filter(
      (e) => e.eventDate >= startDate && e.eventDate <= endDate
    );

    // Fetch shared events
    const allSharedEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_shared", (q) => q.eq("isShared", true))
      .collect();

    const sharedEventsInMonth = allSharedEvents.filter(
      (e) => e.eventDate >= startDate && e.eventDate <= endDate && e.userId !== user._id
    );

    // Merge and deduplicate
    const combined = [...userEventsInMonth, ...sharedEventsInMonth];

    return combined;
  },
});

// List all calendar events for a user (for admin view)
export const listAllEventsForAdmin = query({
  args: {
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    if (user.role !== "admin" && user.role !== "senior_coach") {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }

    const paddedMonth = String(args.month).padStart(2, "0");
    const startDate = `${args.year}-${paddedMonth}-01`;
    const lastDay = new Date(args.year, args.month, 0).getDate();
    const endDate = `${args.year}-${paddedMonth}-${String(lastDay).padStart(2, "0")}`;

    const allEvents = await ctx.db.query("calendarEvents").collect();
    return allEvents.filter((e) => e.eventDate >= startDate && e.eventDate <= endDate);
  },
});

// Get events for a specific date
export const listEventsForDate = query({
  args: { eventDate: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const userEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user_and_date", (q) =>
        q.eq("userId", user._id).eq("eventDate", args.eventDate)
      )
      .collect();

    const sharedEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_date", (q) => q.eq("eventDate", args.eventDate))
      .filter((q) => q.eq(q.field("isShared"), true))
      .collect();

    const sharedFromOthers = sharedEvents.filter((e) => e.userId !== user._id);

    return [...userEvents, ...sharedFromOthers];
  },
});

// Create a calendar event
export const createEvent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    eventType: v.union(
      v.literal("personal"),
      v.literal("coaching"),
      v.literal("education"),
      v.literal("mentor_coaching"),
      v.literal("shared"),
    ),
    isShared: v.boolean(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Only admin can create calendar events
    if (user.role !== "admin") {
      throw new ConvexError({ message: "Forbidden: Only admins can create calendar events", code: "FORBIDDEN" });
    }

    return await ctx.db.insert("calendarEvents", {
      userId: user._id,
      title: args.title,
      description: args.description,
      eventDate: args.eventDate,
      startTime: args.startTime,
      endTime: args.endTime,
      eventType: args.eventType,
      isShared: args.isShared,
      color: args.color,
    });
  },
});

// Update a calendar event
export const updateEvent = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    title: v.string(),
    description: v.optional(v.string()),
    eventDate: v.string(),
    startTime: v.optional(v.string()),
    endTime: v.optional(v.string()),
    eventType: v.union(
      v.literal("personal"),
      v.literal("coaching"),
      v.literal("education"),
      v.literal("mentor_coaching"),
      v.literal("shared"),
    ),
    isShared: v.boolean(),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError({ message: "Event not found", code: "NOT_FOUND" });
    if (user.role !== "admin") {
      throw new ConvexError({ message: "Forbidden: Only admins can update calendar events", code: "FORBIDDEN" });
    }

    await ctx.db.patch(args.eventId, {
      title: args.title,
      description: args.description,
      eventDate: args.eventDate,
      startTime: args.startTime,
      endTime: args.endTime,
      eventType: args.eventType,
      isShared: args.isShared,
      color: args.color,
    });
  },
});

// Delete a calendar event
export const deleteEvent = mutation({
  args: { eventId: v.id("calendarEvents") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const event = await ctx.db.get(args.eventId);
    if (!event) throw new ConvexError({ message: "Event not found", code: "NOT_FOUND" });
    if (user.role !== "admin") {
      throw new ConvexError({ message: "Forbidden: Only admins can delete calendar events", code: "FORBIDDEN" });
    }

    await ctx.db.delete(args.eventId);
  },
});

// Get upcoming events for the current user (next 7 days)
export const getUpcomingEvents = query({
  args: {},
  handler: async (ctx): Promise<Array<{
    _id: Id<"calendarEvents">;
    _creationTime: number;
    userId: Id<"users">;
    title: string;
    description?: string;
    eventDate: string;
    startTime?: string;
    endTime?: string;
    eventType: "personal" | "coaching" | "education" | "mentor_coaching" | "shared";
    isShared: boolean;
    color?: string;
  }>> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + 14);
    const futureDateStr = futureDate.toISOString().slice(0, 10);

    const allUserEvents = await ctx.db
      .query("calendarEvents")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const upcoming = allUserEvents.filter(
      (e) => e.eventDate >= todayStr && e.eventDate <= futureDateStr
    );

    const allShared = await ctx.db
      .query("calendarEvents")
      .withIndex("by_shared", (q) => q.eq("isShared", true))
      .collect();

    const upcomingShared = allShared.filter(
      (e) => e.eventDate >= todayStr && e.eventDate <= futureDateStr && e.userId !== user._id
    );

    const combined = [...upcoming, ...upcomingShared];
    combined.sort((a, b) => a.eventDate.localeCompare(b.eventDate));
    return combined.slice(0, 10);
  },
});
