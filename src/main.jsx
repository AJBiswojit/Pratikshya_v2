import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

/*
 * Phase 3E — canonical workflow command layer registration.
 *
 * catalogRepository's workflow adapters (publishProduct, approveProduct,
 * archiveProduct, …) late-bind to the universal command service through the
 * workflowCommandRegistry to avoid an ESM evaluation-order hazard. The
 * command service registers itself when imported — but before this line,
 * only routes whose chunk happened to import productWorkflow (the review
 * workspace) loaded it. A direct full-page load of /admin/products or
 * /admin/products/:id then failed every lifecycle action with "The workflow
 * command layer is not loaded", which is exactly the reported
 * publish-visibility bug.
 *
 * Importing the command service here — AFTER the App graph, so
 * catalogRepository and the taxonomy data modules are already evaluated —
 * guarantees registration for every route in every browser session. The
 * production build is a single file (vite-plugin-singlefile), so this adds
 * no extra network cost.
 */
import "./services/workflow/productWorkflowCommands";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
