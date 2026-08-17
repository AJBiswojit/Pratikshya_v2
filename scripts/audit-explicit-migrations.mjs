/** Phase 3B — explicit migration architecture and behavior audit. */

import { readFileSync } from "node:fs";

import { productsRegisterRaw } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { runExplicitMigrations } from "../src/services/workflow/explicitMigrations.js";
import { setupBaseState } from "../tests/helpers/workflowTestState.js";

const migrationSource = readFileSync("src/services/workflow/explicitMigrations.js", "utf8");
const repositorySource = readFileSync("src/services/catalogRepository.js", "utf8");
const checks = [];

const check = (label, condition) => {
  const ok = Boolean(condition);
  checks.push({ label, ok });
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
};

const extractArrowBody = (source, declaration) => {
  const start = source.indexOf(declaration);
  if (start < 0) return null;
  const brace = source.indexOf("{", start + declaration.length);
  if (brace < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, index);
    }
  }
  return null;
};

const snapshot = () =>
  JSON.stringify({
    products: productsRegisterRaw(),
    media: mediaRepository
      .getAll()
      .map((media) => [media.id, media.productId, media.scope, media.role])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    activity: loadActivity(),
  });

check(
  "Explicit migration entry point exists",
  typeof runExplicitMigrations === "function" && migrationSource.includes("export const runExplicitMigrations")
);
check(
  "Migration uses mediaOwnershipService",
  migrationSource.includes("mediaOwnershipService.assignMediaToProduct")
);
check(
  "Migration persists through persistCatalogueState",
  migrationSource.includes("persistCatalogueState(reconciled")
);
check(
  "Migration has explicit discovery and versioned idempotency state",
  migrationSource.includes("discoverCatalogueReconciliation") && migrationSource.includes("CATALOGUE_SYNC_KEY")
);

const readBody = extractArrowBody(repositorySource, "const read = () =>") ?? "";
const executableReadBody = readBody
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/\/\/.*$/gm, "");
check("catalogRepository.read() does not call runExplicitMigrations", !executableReadBody.includes("runExplicitMigrations"));
check("catalogRepository.read() performs no direct media assignment", !executableReadBody.includes("assignToProduct"));

setupBaseState();
const first = runExplicitMigrations();
const afterFirst = snapshot();
const second = runExplicitMigrations();
const afterSecond = snapshot();
check(
  "Migration writes, persists and is state-idempotent",
  first.ok &&
    first.productCount === 168 &&
    first.canonicalAssignments === 13 &&
    second.ok &&
    second.changed === false &&
    afterSecond === afterFirst
);
setupBaseState();

const failures = checks.filter((entry) => !entry.ok);
console.log(`\nAudited: ${checks.length} | Pass: ${checks.length - failures.length} | Fail: ${failures.length}`);
if (failures.length) {
  console.log("RESULT: FAIL — see above.");
  process.exitCode = 1;
} else {
  console.log("RESULT: PASS — explicit migration architecture verified.");
}
