import { internalMutation } from "../_generated/server";
import { mutation } from "../_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

export const deleteAllTestData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = [
      "announcements",
      "attendances",
      "bookReports",
      "calendarEvents",
      "certificationApplications",
      "coachFeedbacks",
      "coachLicenses",
      "coachingEssays",
      "coachingGroups",
      "coachingLogs",
      "cohortMembers",
      "cohorts",
      "communityComments",
      "communityLikes",
      "communityPosts",
      "competencyAssessments",
      "courseCredits",
      "educationRecords",
      "forumAttendances",
      "mentalForums",
      "mentorCoachingLogs",
      "notifications",
      "reflectionJournals",
      "resources",
      "seminars",
      "smpccCertifications",
      "trainingHistory",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    // Delete all non-admin users
    const allUsers = await ctx.db.query("users").collect();
    for (const user of allUsers) {
      if (user.role !== "admin") {
        await ctx.db.delete(user._id);
      }
    }

    return { success: true };
  },
});

// Public mutation callable from admin UI
export const resetAllData = mutation({
  args: {},
  handler: async (ctx): Promise<{ success: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ message: "Unauthenticated", code: "UNAUTHENTICATED" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!user || user.role !== "admin") {
      throw new ConvexError({ message: "Admin only", code: "FORBIDDEN" });
    }

    const tables = [
      "announcements",
      "attendances",
      "bookReports",
      "calendarEvents",
      "certificationApplications",
      "coachFeedbacks",
      "coachLicenses",
      "coachingEssays",
      "coachingGroups",
      "coachingLogs",
      "cohortMembers",
      "cohorts",
      "communityComments",
      "communityLikes",
      "communityPosts",
      "competencyAssessments",
      "courseCredits",
      "educationRecords",
      "forumAttendances",
      "mentalForums",
      "mentorCoachingLogs",
      "notifications",
      "reflectionJournals",
      "resources",
      "seminars",
      "smpccCertifications",
      "trainingHistory",
    ] as const;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    // Delete all non-admin users
    const allUsers = await ctx.db.query("users").collect();
    for (const u of allUsers) {
      if (u.role !== "admin") {
        await ctx.db.delete(u._id);
      }
    }

    return { success: true };
  },
});
