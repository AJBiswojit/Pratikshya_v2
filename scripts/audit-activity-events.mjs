/** Audit one canonical workflow command → one canonical activity event. */

import { readFileSync, readdirSync } from "node:fs";
import { extname, join, relative } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { ACTIVITY_ACTIONS, loadActivity } from "../src/services/employees/activityService.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
setupCanonicalState();

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if ([".js", ".jsx"].includes(extname(path))) files.push(path);
  }
  return files;
};

const lifecycleActions = [
  "PRODUCT_SUBMITTED_FOR_REVIEW",
  "PRODUCT_REJECTED",
  "PRODUCT_APPROVED",
  "PRODUCT_PUBLISHED",
  "PRODUCT_UNPUBLISHED",
  "PRODUCT_ARCHIVED",
  "PRODUCT_RESTORED",
];
const directLifecycleActivity = new RegExp(
  `action\\s*:\\s*ACTIVITY_ACTIONS\\.(?:${lifecycleActions.join("|")})`
);
const uiWriters = ["src/pages", "src/components"]
  .flatMap((root) => walk(root))
  .filter((path) => directLifecycleActivity.test(readFileSync(path, "utf8")));
const selected = catalogRepository.all().find((product) => product.department === "kids");
const checks = [];
const check = (label, pass, detail) => checks.push([label, Boolean(pass), detail]);

check("UI does not write lifecycle activity directly", uiWriters.length === 0, uiWriters.map((path) => relative(process.cwd(), path)).join(", ") || "none");
check("Canonical Product is discovered dynamically", selected, selected?.id || "none");

if (selected) {
  const count = (action) =>
    loadActivity().filter(
      (event) => event.action === action && String(event.targetProductId) === String(selected.id)
    ).length;
  const run = (label, action, command) => {
    const before = count(action);
    const result = command();
    const delta = count(action) - before;
    check(label, result.ok && delta === 1, `${result.ok ? "command ok" : result.error}; events +${delta}`);
  };

  run("Submit emits one submission event", ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW, () => commands.submitProduct(selected.id, ADMIN));
  run("Return emits one return event", ACTIVITY_ACTIONS.PRODUCT_REJECTED, () => commands.returnProduct(selected.id, "Verify canonical activity handling.", ADMIN));
  run("Re-submit emits one submission event", ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW, () => commands.submitProduct(selected.id, ADMIN));
  run("Approve emits one approval event", ACTIVITY_ACTIONS.PRODUCT_APPROVED, () => commands.approveProduct(selected.id, ADMIN));
  run("Publish emits one publication event", ACTIVITY_ACTIONS.PRODUCT_PUBLISHED, () => commands.publishProduct(selected.id, ADMIN));
  run("Unpublish emits one unpublish event", ACTIVITY_ACTIONS.PRODUCT_UNPUBLISHED, () => commands.unpublishProduct(selected.id, ADMIN));
  run("Archive emits one archive event", ACTIVITY_ACTIONS.PRODUCT_ARCHIVED, () => commands.archiveProduct(selected.id, ADMIN));
  run("Restore emits one restore event", ACTIVITY_ACTIONS.PRODUCT_RESTORED, () => commands.restoreProduct(selected.id, ADMIN));
}

console.log("# CANONICAL ACTIVITY EVENT AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`));
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
