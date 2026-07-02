/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as admin_resetData from "../admin/resetData.js";
import type * as announcements from "../announcements.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as authUtils from "../authUtils.js";
import type * as bcp from "../bcp.js";
import type * as calendar from "../calendar.js";
import type * as certification from "../certification.js";
import type * as classroomBookings from "../classroomBookings.js";
import type * as coachFeedback from "../coachFeedback.js";
import type * as coaching from "../coaching.js";
import type * as coachingGroups from "../coachingGroups.js";
import type * as cohorts from "../cohorts.js";
import type * as community from "../community.js";
import type * as competencyAssessments from "../competencyAssessments.js";
import type * as completion from "../completion.js";
import type * as crons from "../crons.js";
import type * as dailyCheckIn from "../dailyCheckIn.js";
import type * as dashboard from "../dashboard.js";
import type * as education from "../education.js";
import type * as export_ from "../export.js";
import type * as helpers from "../helpers.js";
import type * as http from "../http.js";
import type * as mentorCoaching from "../mentorCoaching.js";
import type * as mockAuth from "../mockAuth.js";
import type * as notifications from "../notifications.js";
import type * as progress from "../progress.js";
import type * as pushIdentities from "../pushIdentities.js";
import type * as pushNotifications from "../pushNotifications.js";
import type * as realUser from "../realUser.js";
import type * as reflections from "../reflections.js";
import type * as reminderQueries from "../reminderQueries.js";
import type * as reminders from "../reminders.js";
import type * as resources from "../resources.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as seminars from "../seminars.js";
import type * as smpcc from "../smpcc.js";
import type * as submissions from "../submissions.js";
import type * as trainingHistory from "../trainingHistory.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  "admin/resetData": typeof admin_resetData;
  announcements: typeof announcements;
  attendance: typeof attendance;
  auth: typeof auth;
  authUtils: typeof authUtils;
  bcp: typeof bcp;
  calendar: typeof calendar;
  certification: typeof certification;
  classroomBookings: typeof classroomBookings;
  coachFeedback: typeof coachFeedback;
  coaching: typeof coaching;
  coachingGroups: typeof coachingGroups;
  cohorts: typeof cohorts;
  community: typeof community;
  competencyAssessments: typeof competencyAssessments;
  completion: typeof completion;
  crons: typeof crons;
  dailyCheckIn: typeof dailyCheckIn;
  dashboard: typeof dashboard;
  education: typeof education;
  export: typeof export_;
  helpers: typeof helpers;
  http: typeof http;
  mentorCoaching: typeof mentorCoaching;
  mockAuth: typeof mockAuth;
  notifications: typeof notifications;
  progress: typeof progress;
  pushIdentities: typeof pushIdentities;
  pushNotifications: typeof pushNotifications;
  realUser: typeof realUser;
  reflections: typeof reflections;
  reminderQueries: typeof reminderQueries;
  reminders: typeof reminders;
  resources: typeof resources;
  search: typeof search;
  seed: typeof seed;
  seminars: typeof seminars;
  smpcc: typeof smpcc;
  submissions: typeof submissions;
  trainingHistory: typeof trainingHistory;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
