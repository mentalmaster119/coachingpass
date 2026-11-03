import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api.js";

const convexUrl = import.meta.env.VITE_CONVEX_URL || "";
let convexClient: ConvexHttpClient | null = null;
if (convexUrl) {
  try {
    convexClient = new ConvexHttpClient(convexUrl);
  } catch (err) {
    console.error("Failed to initialize ConvexHttpClient for error tracking:", err);
  }
}

// In-memory cache to deduplicate errors in 60s window
const recentErrors = new Map<string, number>();
const DEDUPE_WINDOW_MS = 60 * 1000;

// Filter out noise from browser extensions and benign browser events
function isIgnorableError(message: string, url: string): boolean {
  const lowerMsg = (message || "").toLowerCase();
  const lowerUrl = (url || "").toLowerCase();

  return (
    lowerMsg.includes("resizeobserver loop limit exceeded") ||
    lowerMsg.includes("resizeobserver loop completed with undelivered notifications") ||
    lowerMsg.includes("script error.") ||
    lowerUrl.includes("chrome-extension://") ||
    lowerUrl.includes("moz-extension://") ||
    lowerUrl.includes("safari-extension://")
  );
}

export interface ErrorReportOptions {
  componentStack?: string;
  severity?: "error" | "warning" | "fatal";
}

export async function reportClientError(
  error: Error | string,
  options?: ErrorReportOptions
) {
  try {
    const message = typeof error === "string" ? error : error.message || String(error);
    const stack = typeof error === "object" && error !== null ? error.stack : undefined;
    const url = typeof window !== "undefined" ? window.location.href : "";
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    if (isIgnorableError(message, url)) {
      return;
    }

    // Deduplication key
    const dedupeKey = `${message}:${url}`;
    const now = Date.now();
    const lastSent = recentErrors.get(dedupeKey);
    if (lastSent && now - lastSent < DEDUPE_WINDOW_MS) {
      return; // Skip duplicate
    }
    recentErrors.set(dedupeKey, now);

    const payload = {
      message,
      stack,
      componentStack: options?.componentStack,
      url,
      userAgent,
      severity: options?.severity ?? ("error" as const),
    };

    // If offline, queue in sessionStorage for later flush
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        const queue = JSON.parse(sessionStorage.getItem("mcci_error_queue") || "[]");
        queue.push(payload);
        sessionStorage.setItem("mcci_error_queue", JSON.stringify(queue.slice(-10))); // keep max 10
      } catch {}
      return;
    }

    // Send to Convex backend
    if (convexClient) {
      await convexClient.mutation(api.clientErrors.logError, payload);
    }
  } catch (err) {
    // Fail silently so error reporter never crashes the app
    console.warn("Failed to report client error:", err);
  }
}

// Flush any errors stored while offline
export async function flushOfflineErrors() {
  if (typeof window === "undefined" || !convexClient) return;
  try {
    const queueStr = sessionStorage.getItem("mcci_error_queue");
    if (!queueStr) return;
    const queue = JSON.parse(queueStr);
    sessionStorage.removeItem("mcci_error_queue");

    for (const item of queue) {
      await convexClient.mutation(api.clientErrors.logError, item).catch(() => {});
    }
  } catch {}
}

// Global window unhandled error and rejection listeners
let isInitialized = false;

export function initGlobalErrorListeners() {
  if (typeof window === "undefined" || isInitialized) return;
  isInitialized = true;

  window.addEventListener("error", (event) => {
    reportClientError(event.error || event.message, { severity: "error" });
  });

  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "Unhandled Promise Rejection";
    reportClientError(reason instanceof Error ? reason : message, { severity: "error" });
  });

  window.addEventListener("online", () => {
    flushOfflineErrors();
  });
}
