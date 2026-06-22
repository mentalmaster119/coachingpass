import { v } from "convex/values";
import { mutation, query } from "./mockAuth";
import { ConvexError } from "convex/values";
import { getAuthenticatedUser } from "./helpers";
import type { Doc } from "./_generated/dataModel.d.ts";
import type { QueryCtx } from "./_generated/server.d.ts";

// List all bookings (can optionally filter by date range)
export const list = query({
  args: {
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Doc<"classroomBookings">[]> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "로그인이 필요합니다", code: "UNAUTHENTICATED" });

    let bookings = await ctx.db.query("classroomBookings").collect();

    if (args.startDate) {
      bookings = bookings.filter((b) => b.date >= args.startDate!);
    }
    if (args.endDate) {
      bookings = bookings.filter((b) => b.date <= args.endDate!);
    }

    return bookings.sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.timeSlot.localeCompare(b.timeSlot);
    });
  },
});

// Get bookings made by the current user
export const getMyBookings = query({
  args: {},
  handler: async (ctx): Promise<Doc<"classroomBookings">[]> => {
    const user = await getAuthenticatedUser(ctx);
    const bookings = await ctx.db
      .query("classroomBookings")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    return bookings.sort((a, b) => b.date.localeCompare(a.date));
  },
});

// Create a classroom booking
export const book = mutation({
  args: {
    date: v.string(), // YYYY-MM-DD
    timeSlot: v.union(v.literal("10:00-12:00"), v.literal("13:00-15:00"), v.literal("16:00-18:00")),
    coachingType: v.union(v.literal("buddy"), v.literal("mentor"), v.literal("supervision")),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    // 1. Validate day of week (Monday to Thursday only)
    // Parse as KST specifically
    const dateObj = new Date(args.date + "T00:00:00+09:00");
    const day = dateObj.getDay(); // 0: Sun, 1: Mon, 2: Tue, 3: Wed, 4: Thu, 5: Fri, 6: Sat
    if (day === 0 || day === 5 || day === 6) {
      throw new ConvexError({
        message: "월, 화, 수, 목요일에만 예약이 가능합니다. (금, 토, 일 예약 불가능)",
        code: "BAD_REQUEST",
      });
    }

    // 2. Validate double booking (exclusive reservation per slot)
    const existing = await ctx.db
      .query("classroomBookings")
      .withIndex("by_date_and_slot", (q) => q.eq("date", args.date).eq("timeSlot", args.timeSlot))
      .first();

    if (existing) {
      throw new ConvexError({
        message: "선택하신 날짜와 시간대는 이미 다른 사용자가 예약했습니다.",
        code: "CONFLICT",
      });
    }

    // 3. Insert reservation
    await ctx.db.insert("classroomBookings", {
      userId: user._id,
      bookerName: user.name ?? "이름 없음",
      date: args.date,
      timeSlot: args.timeSlot,
      coachingType: args.coachingType,
      notes: args.notes,
      createdAt: new Date().toISOString(),
    });
  },
});

// Cancel a classroom booking
export const cancel = mutation({
  args: {
    bookingId: v.id("classroomBookings"),
  },
  handler: async (ctx, args) => {
    const user = await getAuthenticatedUser(ctx);

    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new ConvexError({ message: "예약 내역을 찾을 수 없습니다.", code: "NOT_FOUND" });
    }

    // Admins can cancel any booking, normal users can only cancel their own
    if (user.role !== "admin" && booking.userId !== user._id) {
      throw new ConvexError({ message: "예약을 취소할 권한이 없습니다.", code: "FORBIDDEN" });
    }

    await ctx.db.delete(args.bookingId);
  },
});
