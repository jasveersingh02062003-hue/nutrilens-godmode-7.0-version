import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import { installGlobalModuleRecovery } from "./lib/module-recovery";
import "./index.css";

installGlobalModuleRecovery();

createRoot(document.getElementById("root")!).render(<App />);
