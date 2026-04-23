import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installGlobalModuleRecovery } from "./lib/module-recovery";
import { initSentry, Sentry } from "./lib/sentry";
import "./index.css";

initSentry();
installGlobalModuleRecovery();

// Capture unhandled promise rejections + uncaught errors so prod issues
// surface in Sentry instead of being silently swallowed.
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason;
    try {
      if (reason instanceof Error) {
        Sentry.captureException(reason, { tags: { source: "unhandledrejection" } });
      } else {
        Sentry.captureMessage(
          `Unhandled rejection: ${typeof reason === "string" ? reason : JSON.stringify(reason)}`,
          { level: "error", tags: { source: "unhandledrejection" } },
        );
      }
    } catch {
      // Never let monitoring code crash the app
    }
  });

  window.addEventListener("error", (event) => {
    try {
      if (event.error instanceof Error) {
        Sentry.captureException(event.error, { tags: { source: "window.onerror" } });
      }
    } catch {
      /* noop */
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
