/** Canonical unified Product Review audit. Run with npm run audit:unified-review. */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { getUnifiedReviewQueue } from "../src/services/unifiedProductReview.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { workflowRegistryLoaded } from "../src/services/workflow/workflowCommandRegistry.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ROOT = process.cwd();
const failures = [];
let checks = 0;
const check = (label, condition) => {
  checks += 1;
  const ok = Boolean(condition);
  console.log(`${ok ? "PASS" : "FAIL"}: ${label}`);
  if (!ok) failures.push(label);
};

const walk = (path, result = []) => {
  if (!existsSync(path)) return result;
  const stat = statSync(path);
  if (stat.isFile()) {
    if ([".js", ".jsx"].includes(extname(path))) result.push(path);
    return result;
  }
  readdirSync(path).forEach((entry) => walk(join(path, entry), result));
  return result;
};
const read = (path) => readFileSync(join(ROOT, path), "utf8");

console.log("# CANONICAL UNIFIED PRODUCT REVIEW AUDIT\n");
setupCanonicalState();

const appSource = read("src/App.jsx");
const navigationSource = read("src/config/adminNavigation.js");
check(
  "App defines exactly one canonical Admin Product Review route",
  (appSource.match(/path=["']\/admin\/products\/review["']/g) || []).length === 1
);
check(
  "Admin navigation defines exactly one canonical Product Review destination",
  (navigationSource.match(/to:\s*["']\/admin\/products\/review["']/g) || []).length === 1
);
check("Product Review route remains admin-protected", appSource.includes("AdminProtectedRoute"));
check("Employee Product Review remains a separate route", appSource.includes('path="/employee/products/review"'));

const departmentLabel = "Kids";
const departmentProductStem = "kids" + "Product";
const retiredSurfaces = [
  `src/components/admin/Admin${departmentLabel}FinalizationPanel.jsx`,
  `src/components/admin/Admin${departmentLabel}ReviewPanel.jsx`,
  `src/services/${departmentProductStem}Identity.js`,
  `src/services/${departmentProductStem}Finalization.js`,
  `src/services/workflow/${"kids" + "Validator"}.js`,
];
check("retired Kids-only review and workflow files do not exist", retiredSurfaces.every((path) => !existsSync(join(ROOT, path))));

const products = catalogRepository.all();
const queue = getUnifiedReviewQueue();
const registerIds = products.map((product) => String(product.id)).sort();
const queueIds = queue.map((row) => String(row.productId)).sort();
check(
  "the unified queue projects every canonical product exactly once",
  queueIds.length === registerIds.length && queueIds.every((id, index) => id === registerIds[index])
);

const kidsIds = products
  .filter((product) => product.department === "kids")
  .map((product) => product.id)
  .sort();
const queuedKidsIds = queue
  .filter((row) => kidsIds.includes(row.productId))
  .map((row) => row.productId)
  .sort();
check("Kids products are ordinary rows in the same queue", JSON.stringify(queuedKidsIds) === JSON.stringify(kidsIds));
check("queue selections use Product IDs", queue.every((row) => row.productId && registerIds.includes(String(row.productId))));
check("queue projection is memoized", getUnifiedReviewQueue() === queue);

check("workflow command registry is loaded", workflowRegistryLoaded());
check(
  "the universal validator validates every canonical Kids record without a special validator",
  kidsIds.length > 0 && kidsIds.every((id) => validateProductForPublish(catalogRepository.find(id)).ok)
);

const reviewFiles = [
  "src/pages/admin/AdminProductReview.jsx",
  "src/components/admin/ProductReviewDetail.jsx",
  "src/components/admin/UnifiedReviewQueue.jsx",
];
check(
  "review workspace does not call legacy repository status adapters",
  reviewFiles.every((path) => !/catalogRepository\s*\.\s*(updateStatus|bulkUpdate)\s*\(/.test(read(path)))
);
check(
  "review workspace does not write media ownership directly",
  reviewFiles.every((path) => !/mediaRepository\s*\.\s*(assignToProduct|unassignFromProduct)\s*\(/.test(read(path)))
);

const uiFiles = ["src/pages", "src/components", "src/hooks"].flatMap((path) => walk(join(ROOT, path)));
const directWorkflowWrites = uiFiles.filter((path) =>
  /\.(?:status|workflowState|lifecycle)\s*=\s*["'](?:DRAFT|SUBMITTED|APPROVED|PUBLISHED)["']|\bwriteProduct\s*\(/.test(
    readFileSync(path, "utf8")
  )
);
check("UI performs no direct lifecycle state write", directWorkflowWrites.length === 0);

const product = kidsIds.length ? catalogRepository.find(kidsIds[0]) : products[0];
const before = JSON.stringify(product);
check("anonymous approve is refused", commands.approveProduct(product.id, null).ok === false);
check(
  "customer publish is refused",
  commands.publishProduct(product.id, { customerId: "CUSTOMER", name: "Customer" }).ok === false
);
check("refused commands leave the product unchanged", JSON.stringify(catalogRepository.find(product.id)) === before);

const unifiedSource = read("src/services/unifiedProductReview.js");
check(
  "the queue is a read-only projection over the canonical repository",
  unifiedSource.includes("catalogRepository.all()") &&
    !/writeProduct|persistCanonicalCatalogueState|localStorage|sessionStorage|setItem/.test(unifiedSource)
);

setupCanonicalState();
console.log(`\nChecks: ${checks} | Failures: ${failures.length}`);
console.log(`RESULT: ${failures.length ? "FAIL" : "PASS"} — one Product Review workspace over one canonical lifecycle.`);
if (failures.length) process.exitCode = 1;
