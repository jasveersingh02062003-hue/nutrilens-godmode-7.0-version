import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installGlobalModuleRecovery } from "./lib/module-recovery";
import { initSentry } from "./lib/sentry";
import "./index.css";

initSentry();
installGlobalModuleRecovery();

createRoot(document.getElementById("root")!).render(<App />);
