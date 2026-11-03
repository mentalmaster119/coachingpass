import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { initGlobalErrorListeners } from "./lib/error-tracker.ts";

// Initialize global unhandled error and rejection observability listeners
initGlobalErrorListeners();

createRoot(document.getElementById("root")!).render(<App />);
