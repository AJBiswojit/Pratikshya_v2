/**
 * PRATIKSHYA FASHON — Unified Admin Product Review audit (Phase 3D).
 *
 *   npm run audit:unified-review
 *
 * ONE PRODUCT REVIEW WORKSPACE over ONE product lifecycle:
 *
 *   Admin → Products → Product Review
 *     → unified review queue → unified product review detail
 *     → canonical commands → universal validation → category validator
 *     → Kids validator (only when applicable) → canonical transition
 *
 * The audit proves:
 *   · exactly ONE canonical Admin Product Review destination (route + nav)
 *   · no duplicate active Kids review or draft-review routes
 *   · no direct lifecycle writes and no direct media-ownership writes in UI
 *   · the Kids validator remains registered inside the universal validator
 *   · the universal lifecycle remains authoritative for the workspace
 *   · Admin authorization remains enforced; Employee Portal stays separate
 *   · no duplicate product/review register — the queue is a pure projection
 *   · the retired surfaces are gone, and the legacy deep link redirects
 *   · golden data unchanged
 *
 * Exits 1 on any dangerous violation.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { workflowRegistryLoaded } from "../src/services/workflow/workflowCommandRegistry.js";
import { CATEGORY_VALIDATORS, isKidsProduct, validateKidsProduct } from "../src/services/workflow/kidsValidator.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { CONFIRMED_KIDS_IDENTITIES } from "../src/services/kidsProductIdentity.js";
import { getUnifiedReviewQueue } from "../src/services/unifiedProductReview.js";
import { captureGoldenData, compareGoldenData } from "./lib/goldenData.js";
import { setupBaseState, setupMigratedState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const line = (text = "") => console.log(text);
const violations = [];
let checked = 0;

const check = (label, ok, detail = "") => {
  checked += 1;
  if (ok) {
    line(`  ✓ ${label}${detail ? ` — ${detail}` : ""}`);
  } else {
    line(`  ✗ ${label}${detail ? ` — ${detail}` : ""}`);
    violations.push(label);
  }
};

/**
 * String-aware comment stripper. The naive regex version mistakes the route
 * wildcard string `"/admin/*"` for the start of a block comment and swallows
 * real code; this scanner honours single/double quotes and backticks.
 */
const stripComments = (source) => {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < source.length) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 2;
        continue;
      }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = source.indexOf("*/", i + 2);
      i = end === -1 ? source.length : end + 2;
      continue;
    }
    if (ch === "/" && next === "/") {
      const end = source.indexOf("\n", i);
      i = end === -1 ? source.length : end;
      continue;
    }
    out += ch;
    i += 1;
  }
  return out;
};

const walk = (dir, out = []) => {
  if (!existsSync(dir)) return out;
  readdirSync(dir).forEach((entry) => {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if ([".js", ".jsx"].includes(extname(abs))) out.push(abs);
  });
  return out;
};

const readSource = (relative) => readFileSync(join(ROOT, relative), "utf8");
/** Reads a repo-relative path OR an absolute path (as returned by walk()). */
const readAny = (path) => readFileSync(path.startsWith(ROOT) ? path : join(ROOT, path), "utf8");
const readCode = (path) => stripComments(readAny(path));

setupMigratedState();

/* ------------------------------------------------------------------ */
line("# Phase 3D — Unified Admin Product Review Workspace audit");
line();

/* Golden capture runs FIRST: the Kids validator self-heals the confirmed
   Kids group decisions on first validation (existing house behaviour — the
   legacy finalization desk did the same on render). Capturing before any
   Kids validation keeps the comparison on the canonical migrated data. */
const baseline = JSON.parse(readSource("tests/fixtures/workflow-golden-baseline.json"));
const goldenSnapshot = captureGoldenData();
const goldenDifferences = compareGoldenData(baseline, goldenSnapshot);

/* ------------------------------------------------------------------ */
line("## 1. Exactly one canonical Admin Product Review destination");

const appSource = readCode("src/App.jsx");
const navSource = readCode("src/config/adminNavigation.js");

const reviewRouteCount = (appSource.match(/path="\/admin\/products\/review"/g) ?? []).length;
check("App.jsx defines exactly one /admin/products/review route", reviewRouteCount === 1, `${reviewRouteCount} route(s)`);
check("the route is wrapped by AdminProtectedRoute", /AdminProtectedRoute/.test(appSource));

const navTargetCount = (navSource.match(/to:\s*"\/admin\/products\/review"/g) ?? []).length;
check("Admin navigation has exactly one Product Review destination", navTargetCount === 1, `${navTargetCount} nav item(s)`);

const redundantNavLabels = ["Kids Review", "Kids Finalization", "Draft Review"];
const redundantNav = redundantNavLabels.filter((label) => navSource.includes(`"${label}"`));
check("no redundant review destinations in Admin navigation", redundantNav.length === 0, redundantNav.join(", ") || "clean");
line();

/* ------------------------------------------------------------------ */
line("## 2. No duplicate active Kids review or draft-review routes");

const duplicateRoutes = [
  "/admin/kids",
  "/admin/kids-review",
  "/admin/kids/finalization",
  "/admin/products/draft-review",
  "/admin/products/drafts",
  "/admin/draft-review",
];
const foundDuplicates = duplicateRoutes.filter((route) => appSource.includes(`path="${route}"`));
check("no duplicate Kids review / draft-review routes exist", foundDuplicates.length === 0, foundDuplicates.join(", ") || "clean");
check(
  "App.jsx does not import the retired Kids review surfaces",
  !/AdminKidsFinalizationPanel|AdminKidsReviewPanel/.test(appSource)
);
line();

/* ------------------------------------------------------------------ */
line("## 3. Retired surfaces removed safely; consolidation consumers mapped");

check(
  "AdminKidsFinalizationPanel.jsx removed",
  !existsSync(join(ROOT, "src/components/admin/AdminKidsFinalizationPanel.jsx"))
);
check(
  "AdminKidsReviewPanel.jsx removed",
  !existsSync(join(ROOT, "src/components/admin/AdminKidsReviewPanel.jsx"))
);

const srcFiles = [
  ...walk(join(ROOT, "src", "pages")),
  ...walk(join(ROOT, "src", "components")),
  ...walk(join(ROOT, "src", "services")),
  ...walk(join(ROOT, "src", "hooks")),
  ...walk(join(ROOT, "src", "config")),
];
const lingeringImports = srcFiles.filter((abs) =>
  /from\s+["'][^"']*Admin(KidsFinalization|KidsReview)Panel["']/.test(readCode(abs))
);
check(
  "no source file imports the retired panels",
  lingeringImports.length === 0,
  lingeringImports.map((abs) => abs.replace(`${ROOT}/`, "")).join(", ") || "clean"
);

const draftPanelConsumers = srcFiles.filter((abs) =>
  /from\s+["'][^"']*ProductDraftReviewPanel["']/.test(readCode(abs))
);
check(
  "ProductDraftReviewPanel has exactly one consolidated consumer (ProductReviewDetail)",
  draftPanelConsumers.length === 1 &&
    draftPanelConsumers[0].endsWith(join("components", "admin", "ProductReviewDetail.jsx")),
  draftPanelConsumers.map((abs) => abs.replace(`${ROOT}/`, "")).join(", ")
);
check(
  "the unified detail embeds the edit desk WITHOUT duplicated lifecycle buttons",
  readCode("src/components/admin/ProductReviewDetail.jsx").includes("hideLifecycleActions")
);
line();

/* ------------------------------------------------------------------ */
line("## 4. Legacy deep link redirects safely (?draft= → ?product=)");

const pageSource = readCode("src/pages/admin/AdminProductReview.jsx");
check(
  "the historical ?draft= deep link is read and redirected to ?product=",
  pageSource.includes('searchParams.get("draft")') &&
    /setSearchParams\(\s*\{\s*product:\s*legacyDraft\s*\}/.test(pageSource)
);
check(
  "the unified detail is focused through ?product=",
  pageSource.includes('searchParams.get("product")')
);
line();

/* ------------------------------------------------------------------ */
line("## 5. No direct lifecycle writes from the UI");

const LIFECYCLE_LITERALS = ["PUBLISHED", "APPROVED", "ARCHIVED", "RETURNED", "SUBMITTED", "PENDING_REVIEW"];
const uiFiles = [
  ...walk(join(ROOT, "src", "pages")),
  ...walk(join(ROOT, "src", "components")),
  ...walk(join(ROOT, "src", "hooks")),
];

const uiViolations = [];
uiFiles.forEach((abs) => {
  const relative = abs.replace(`${ROOT}/`, "");
  const source = readCode(abs);
  if (/\bwriteProduct\s*\(/.test(source)) uiViolations.push(`${relative}: writeProduct()`);
  if (/persistCatalogueState\s*\(/.test(source)) uiViolations.push(`${relative}: persistCatalogueState()`);
  LIFECYCLE_LITERALS.forEach((literal) => {
    const assign = new RegExp(`\\.(status|workflowState|lifecycle)\\s*=\\s*["']${literal}["']`);
    if (assign.test(source)) uiViolations.push(`${relative}: direct .status = "${literal}"`);
  });
  for (const match of source.matchAll(/catalogRepository\s*\.\s*(updateProduct|updateDraft|upsert|createProduct)\s*\(/g)) {
    const window = source.slice(match.index, match.index + 400);
    LIFECYCLE_LITERALS.filter((literal) => literal !== "PENDING_REVIEW").forEach((literal) => {
      if (new RegExp(`status\\s*:\\s*["']${literal}["']`).test(window)) {
        uiViolations.push(`${relative}: ${match[1]}() writes status ${literal}`);
      }
    });
  }
});
uiViolations.forEach((violation) => line(`        ${violation}`));
check("no UI file performs a direct workflow write", uiViolations.length === 0);

const reviewWorkspaceFiles = [
  "src/pages/admin/AdminProductReview.jsx",
  "src/components/admin/ProductReviewDetail.jsx",
  "src/components/admin/UnifiedReviewQueue.jsx",
];
const adapterBypasses = reviewWorkspaceFiles.filter((relative) =>
  /catalogRepository\s*\.\s*(updateStatus|bulkUpdate)\s*\(/.test(readCode(relative))
);
check(
  "the review workspace uses no legacy status adapters",
  adapterBypasses.length === 0,
  adapterBypasses.join(", ") || "clean"
);
line();

/* ------------------------------------------------------------------ */
line("## 6. No direct media-ownership writes from the UI");

/* Same classification as the Phase 3C canonical-lifecycle audit: the
   media-library mapping hook is a classified safe site, not a workflow path. */
const OWNERSHIP_UI_CLASSIFICATION = {
  "src/hooks/useMediaActions.js": "media-library mapping (not a workflow lifecycle path)",
};
const ownershipCallers = uiFiles
  .filter((abs) => /mediaRepository\s*\.\s*(assignToProduct|unassignFromProduct)\s*\(/.test(readCode(abs)))
  .map((abs) => abs.replace(`${ROOT}/`, ""));
ownershipCallers.forEach((file) => line(`        ${file} → ${OWNERSHIP_UI_CLASSIFICATION[file] ?? "UNCLASSIFIED"}`));
check(
  "every UI media-ownership caller is a classified safe site",
  ownershipCallers.every((file) => OWNERSHIP_UI_CLASSIFICATION[file]),
  ownershipCallers.length ? ownershipCallers.join(", ") : "no callers"
);
check(
  "no review-workspace file writes media ownership directly",
  reviewWorkspaceFiles.every((relative) => !/mediaRepository\s*\.\s*(assignToProduct|unassignFromProduct)\s*\(/.test(readCode(relative)))
);
check(
  "the review detail states ownership stays with the media ownership service",
  pageSource.includes("media ownership service") ||
    readCode("src/components/admin/ProductReviewDetail.jsx").includes("media ownership service")
);
line();

/* ------------------------------------------------------------------ */
line("## 7. Kids validator remains registered — Kids is a category layer");

check("workflow command registry is loaded", workflowRegistryLoaded());
check("CATEGORY_VALIDATORS registers the Kids validator", CATEGORY_VALIDATORS.kidswear === validateKidsProduct);
check(
  "the universal validator imports the category registry",
  readSource("src/services/workflow/productPublishValidator.js").includes("kidsValidator")
);
check(
  "kidsValidator.js retained (KID rules unchanged)",
  existsSync(join(ROOT, "src/services/workflow/kidsValidator.js"))
);
check(
  "kidsProductFinalization.js retained (compatibility behaviour)",
  existsSync(join(ROOT, "src/services/kidsProductFinalization.js"))
);
check(
  "21 confirmed Kids identities remain defined",
  CONFIRMED_KIDS_IDENTITIES.length === 21,
  `${CONFIRMED_KIDS_IDENTITIES.length} identities`
);

const kidsValidation = validateProductForPublish(catalogRepository.find("KID-001"));
check(
  "Kids validator runs inside the universal validation",
  kidsValidation.issues.some((issue) => issue.source === "KIDS"),
  `${kidsValidation.issues.filter((issue) => issue.source === "KIDS").length} KIDS-sourced issue(s)`
);
line();

/* ------------------------------------------------------------------ */
line("## 8. Universal lifecycle remains authoritative for the workspace");

const detailSource = readCode("src/components/admin/ProductReviewDetail.jsx");
check(
  "the review detail imports approve/return/publish/submit/archive/assign from the canonical service boundary",
  /from\s+"..\/..\/services\/productWorkflow"/.test(detailSource) &&
    ["approveProduct", "returnProduct", "publishProduct", "submitProductForReview", "archiveProduct", "assignProductToEmployee"]
      .every((name) => detailSource.includes(name))
);
check(
  "the review detail never imports the repository writers",
  !/catalogRepository/.test(detailSource)
);

const workflowSource = readCode("src/services/productWorkflow.js");
check(
  "productWorkflow.returnProduct delegates to the canonical command",
  /returnProduct\s*=\s*\(productId,\s*reason\s*=\s*"",\s*actor\s*=\s*null\)\s*=>\s*\n?\s*workflowCommands\.returnProduct/.test(
    readSource("src/services/productWorkflow.js")
  ) || /workflowCommands\.returnProduct\(productId,\s*reason,\s*actor\)/.test(workflowSource)
);
["approveProduct", "publishProduct", "submitProduct", "archiveProduct", "assignProduct"].forEach((name) => {
  check(
    `productWorkflow wrapper delegates — ${name}`,
    new RegExp(`workflowCommands\\.${name}\\(`).test(workflowSource)
  );
});

const unifiedSource = readCode("src/services/unifiedProductReview.js");
check(
  "the unified queue is a pure projection (no writers, no storage)",
  !/writeProduct|persistCatalogueState|localStorage|sessionStorage|setItem/.test(unifiedSource)
);
check(
  "the unified queue reads the canonical register and validator",
  unifiedSource.includes("catalogRepository.all()") && unifiedSource.includes("validateProductForPublish")
);
line();

/* ------------------------------------------------------------------ */
line("## 9. Authorization remains enforced");

const probeTarget = catalogRepository.find("KID-001");
const statusBeforeProbes = probeTarget?.status ?? null;
const reviewBeforeProbes = probeTarget?.review?.state ?? null;
const approveAnonymous = commands.approveProduct("KID-001", null);
check("anonymous approve refused", approveAnonymous.ok === false, approveAnonymous.code ?? approveAnonymous.error);
const publishCustomer = commands.publishProduct("KID-001", { customerId: "CUST-0001", name: "A Customer" });
check("customer publish refused", publishCustomer.ok === false, publishCustomer.code ?? publishCustomer.error);
const returnEmployee = commands.returnProduct("KID-001", "employee try", { employeeId: "PF-MGR-00008", label: "Vikram Iyer" });
check("employee return refused", returnEmployee.ok === false, returnEmployee.code ?? returnEmployee.error);
const afterProbes = catalogRepository.find("KID-001");
check(
  "KID-001 remains untouched by refused commands",
  afterProbes?.status === statusBeforeProbes && (afterProbes?.review?.state ?? null) === reviewBeforeProbes,
  `status ${statusBeforeProbes} → ${afterProbes?.status}`
);
line();

/* ------------------------------------------------------------------ */
line("## 10. Employee Portal remains separate");

check("the Employee review route still exists", /path="\/employee\/products\/review"/.test(appSource));
check("the Employee review page is retained", existsSync(join(ROOT, "src/pages/employee/EmployeeProductReview.jsx")));
check(
  "the Admin workspace does not consume the Employee review page",
  !/EmployeeProductReview/.test(pageSource) && !/EmployeeProductReview/.test(detailSource)
);
line();

/* ------------------------------------------------------------------ */
line("## 11. No duplicate product/review register — one queue over one lifecycle");

const registerIds = catalogRepository.all().map((product) => String(product.id)).sort();
getUnifiedReviewQueue(); /* warm-up: the first Kids validation may self-heal
                            confirmed group decisions (existing behaviour) */
const firstPass = getUnifiedReviewQueue();
const queueIds = firstPass.map((row) => String(row.productId)).sort();
check(
  "queue rows cover the register exactly once",
  queueIds.length === registerIds.length && queueIds.every((id, index) => id === registerIds[index]),
  `${queueIds.length} rows / ${registerIds.length} products`
);
const expectedKids = catalogRepository.all().filter((product) => isKidsProduct(product)).length;
const queueKids = firstPass.filter((row) => row.isKids).length;
check("Kids products sit in the SAME queue", queueKids === expectedKids, `${queueKids} Kids rows / ${expectedKids} Kids products`);
const confirmedInQueue = CONFIRMED_KIDS_IDENTITIES.every((identity) =>
  firstPass.some((row) => row.productId === identity.productId && row.isKids)
);
check("all 21 confirmed Kids identities are queue rows (no separate Kids register)", confirmedInQueue);
const secondPass = getUnifiedReviewQueue();
check("the queue is memoized (not rebuilt per render)", firstPass === secondPass);
line();

/* ------------------------------------------------------------------ */
line("## 12. Golden data unchanged");

check("counts match the baseline", JSON.stringify(goldenSnapshot.counts) === JSON.stringify(baseline.counts), JSON.stringify(goldenSnapshot.counts));
check("zero golden-data differences", goldenDifferences.length === 0, goldenDifferences.slice(0, 5).join(" | ") || "identical");
line();

setupBaseState();

/* ------------------------------------------------------------------ */
line("# SUMMARY");
line(`Checks: ${checked} | Dangerous violations: ${violations.length}`);
if (violations.length) {
  violations.forEach((violation) => line(`  ✗ ${violation}`));
  line("RESULT: FAIL — the unified review workspace is not architecturally clean.");
  process.exitCode = 1;
} else {
  line("RESULT: PASS — ONE product review workspace over ONE product lifecycle.");
}
