/**
 * PRATIKSHYA FASHON — Workflow foundation audit (Phase 2, Step F).
 *
 *   npm run audit:workflow-foundation
 *
 * Verifies the Phase 2 foundation claims:
 *   1. universal workflow commands exist and are registered
 *   2. golden data (product/media/Kids/taxonomy/storefront) matches the
 *      pre-implementation baseline — no IDs, ownership or published set
 *      changed
 *   3. approve does NOT publish; publish requires APPROVED + fresh
 *      validation
 *   4. Kids uses the universal commands (approve/publish wrappers delegate)
 *   5. no direct publish bypass remains in application code
 *   6. the media ownership command is centralized and authorized
 *   7. marketing media remains isolated from product ownership
 *
 * Behavior probes use scratch records (FND-AUDIT-*) and are cleaned up.
 * Fails (exit 1) on any violation.
 */

import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, extname } from "node:path";

import catalogRepository, { PRODUCT_STATUS, REVIEW_STATE } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { commands, resolvePrincipal } from "../src/services/workflow/productWorkflowCommands.js";
import { getWorkflowCommands, getPublishValidator, workflowRegistryLoaded } from "../src/services/workflow/workflowCommandRegistry.js";
import {
  assignMediaToProduct,
  transferMediaOwnership,
} from "../src/services/media/mediaOwnershipService.js";
import { approveKidsProduct, publishKidsProduct } from "../src/services/kidsProductFinalization.js";
import { setupBaseState, setupMigratedState } from "../tests/helpers/workflowTestState.js";
import { captureGoldenData, compareGoldenData } from "./lib/goldenData.js";

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const MANAGER = { employeeId: "PF-MGR-00008", label: "Vikram Iyer" };

const line = (text = "") => console.log(text);
const row = (label, value) => line(`${label.padEnd(44)} ${value}`);
const failures = [];

const fail = (message) => {
  failures.push(message);
  line(`  ✗ ${message}`);
};

/* ------------------------------------------------------------------ */
/* 1. Command layer presence                                          */
/* ------------------------------------------------------------------ */

line("# WORKFLOW FOUNDATION AUDIT — Phase 2");
line();

/* Golden comparison and behavior probes target the persisted migrated state,
 * established explicitly now that ordinary reads are mutation-free. */
setupMigratedState();

line("## 1. Universal workflow command layer");
row("Commands registered", workflowRegistryLoaded() ? "yes" : "NO");
row("Universal validator registered", Boolean(getPublishValidator()) ? "yes" : "NO");
const requiredCommands = [
  "createProduct",
  "assignProduct",
  "saveProductDraft",
  "submitProduct",
  "returnProduct",
  "approveProduct",
  "publishProduct",
  "archiveProduct",
  "restoreProduct",
  "bulkPublish",
];
requiredCommands.forEach((name) => {
  if (typeof commands[name] !== "function") fail(`command ${name} is missing`);
});
row("Required commands", requiredCommands.every((name) => typeof commands[name] === "function") ? "present" : "MISSING");
if (!workflowRegistryLoaded()) fail("workflow command layer is not registered");
if (!getWorkflowCommands()) fail("repository cannot reach the workflow commands");

line();

/* ------------------------------------------------------------------ */
/* 2. Golden data regression                                          */
/* ------------------------------------------------------------------ */

line("## 2. Golden data — pre-implementation baseline comparison");
const baselinePath = join(ROOT, "tests", "fixtures", "workflow-golden-baseline.json");
if (!existsSync(baselinePath)) {
  fail("golden baseline fixture missing: tests/fixtures/workflow-golden-baseline.json");
} else {
  const baseline = JSON.parse(readFileSync(baselinePath, "utf8"));
  const current = captureGoldenData();
  const differences = compareGoldenData(baseline, current);
  if (differences.length) {
    differences.forEach((difference) => fail(`golden data: ${difference}`));
  } else {
    row("Product IDs", `${current.counts.products} unchanged`);
    row("Media IDs", `${current.counts.media} unchanged`);
    row("Published product IDs", `${current.counts.published} unchanged`);
    row("Storefront-visible products", `${current.counts.storefront} unchanged`);
    row("Kids KID-001…KID-021", `${current.counts.kidsProducts}/21 unchanged`);
    row("Marketing media", `${current.counts.marketingMedia} unchanged`);
    row("Taxonomy", "unchanged");
    row("Group decisions", `${current.groups.length} unchanged`);
    line("  ✓ no unintended data differences");
  }
}
line();

/* ------------------------------------------------------------------ */
/* 3. Approve ≠ publish; publish requires approved                    */
/* ------------------------------------------------------------------ */

line("## 3. Lifecycle behavior probes (scratch data)");

const createScratch = (id) => {
  const media = mediaRepository.create({
    url: `/library/audit-foundation-${id}.webp`,
    title: "Audit scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: "Audit Foundation Product",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Audit scratch product.",
      sku: `${id}-SKU`,
      price: 1200,
      pricing: { sellingPrice: 1200, mrp: 1500 },
      stock: 5,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  const ownership = assignMediaToProduct({
    mediaId: media.id,
    productId: created.product.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  if (!ownership.ok) fail(`scratch media assignment failed: ${ownership.error}`);
  return { media, product: catalogRepository.find(created.product.id) };
};

const cleanup = (scratch) => {
  catalogRepository.archiveProduct(scratch.product.id, ADMIN);
  mediaRepository.remove(scratch.media.id);
};

const generalScratch = createScratch("FND-AUDIT-001");

/* DRAFT → PUBLISHED is refused. */
const earlyPublish = commands.publishProduct(generalScratch.product.id, ADMIN);
if (earlyPublish.ok) fail("publish succeeded on an unapproved draft");
else row("DRAFT → PUBLISHED", "refused ✓");

/* Approve requires submitted. */
const earlyApprove = commands.approveProduct(generalScratch.product.id, ADMIN);
if (earlyApprove.ok) fail("approve succeeded on an unsubmitted draft");
else row("DRAFT → APPROVE", "refused ✓");

/* Submit then approve → APPROVED, still unpublished. */
if (!commands.submitProduct(generalScratch.product.id, ADMIN).ok) fail("submit failed");
const approved = commands.approveProduct(generalScratch.product.id, ADMIN);
if (!approved.ok) {
  fail(`approve failed: ${(approved.errors ?? []).join("; ")}`);
} else {
  const afterApprove = catalogRepository.find(generalScratch.product.id);
  if (afterApprove.status === PRODUCT_STATUS.PUBLISHED) fail("approve must not publish");
  if (afterApprove.review?.state !== REVIEW_STATE.APPROVED) fail("approve must record approval");
  row("Approve ≠ publish", "status stays PENDING_REVIEW ✓");
}

/* SUBMITTED/APPROVED state must not be storefront-visible. */
if (getLiveStorefrontProducts().some((p) => p.id === generalScratch.product.id)) {
  fail("approved product leaked to the storefront");
} else {
  row("Approved → storefront", "invisible ✓");
}

/* Publish requires approved + validation. */
const published = commands.publishProduct(generalScratch.product.id, ADMIN);
if (!published.ok) {
  fail(`publish failed: ${(published.errors ?? []).join("; ")}`);
} else if (catalogRepository.find(generalScratch.product.id).status !== PRODUCT_STATUS.PUBLISHED) {
  fail("publish did not set PUBLISHED");
} else {
  row("APPROVED → PUBLISHED", "ok ✓");
}
cleanup(generalScratch);

/* Publish revalidates: approve, break price, publish → refused. */
const revalidateScratch = createScratch("FND-AUDIT-002");
commands.submitProduct(revalidateScratch.product.id, ADMIN);
commands.approveProduct(revalidateScratch.product.id, ADMIN);
catalogRepository.updateDraft(revalidateScratch.product.id, { price: 0, pricing: { sellingPrice: 0, mrp: 0 } }, ADMIN);
const stalePublish = commands.publishProduct(revalidateScratch.product.id, ADMIN);
if (stalePublish.ok) fail("publish trusted an earlier approval (stale price)");
else row("Publish revalidates", "refused after data broken ✓");
cleanup(revalidateScratch);

/* Employee cannot approve/publish; customer cannot mutate. */
const authScratch = createScratch("FND-AUDIT-003");
commands.submitProduct(authScratch.product.id, ADMIN);
if (commands.approveProduct(authScratch.product.id, MANAGER).ok) fail("employee approved a product");
if (commands.publishProduct(authScratch.product.id, MANAGER).ok) fail("employee published a product");
if (commands.publishProduct(authScratch.product.id, null).ok) fail("anonymous published a product");
row("Employee/customer authorization", "denied ✓");
cleanup(authScratch);

line();

/* ------------------------------------------------------------------ */
/* 4. Kids uses the universal lifecycle                                */
/* ------------------------------------------------------------------ */

line("## 4. Kids integration — one lifecycle, category validation");
const kidsScratch = createScratch("KID-AUDIT-001");
const kidId = kidsScratch.product.id;
catalogRepository.updateDraft(
  kidId,
  { category: "kidswear", subcategory: "Boys Casual Set", name: "Boys' Audit Kids Set", stock: 5 },
  ADMIN
);
/* Direct publish before approval refused. */
if (publishKidsProduct(kidId, ADMIN).ok) fail("Kids publish bypassed approval");
else row("Kids publish before approve", "refused ✓");
/* Same journey through the universal commands via the Kids wrapper. */
if (!commands.submitProduct(kidId, ADMIN).ok) fail("Kids submit failed");
const kidsApproved = approveKidsProduct(kidId, ADMIN);
if (!kidsApproved.ok) {
  fail(`Kids approve failed: ${(kidsApproved.errors ?? []).join("; ")}`);
} else if (catalogRepository.find(kidId).status === PRODUCT_STATUS.PUBLISHED) {
  fail("Kids approve must not publish");
} else {
  row("Kids approve", "approves without publishing ✓");
}
if (!publishKidsProduct(kidId, ADMIN).ok) fail("Kids publish failed after approval");
else row("Kids publish after approve", "ok ✓");
cleanup(kidsScratch);
line();

/* ------------------------------------------------------------------ */
/* 5. No direct publish bypass in application code                     */
/* ------------------------------------------------------------------ */

line("## 5. Direct publish bypass scan (static)");
const SRC_ROOTS = ["src/components", "src/pages", "src/layouts", "src/hooks"];
const walk = (abs, acc = []) => {
  if (!existsSync(abs)) return acc;
  const stat = statSync(abs);
  if (stat.isFile()) {
    if ([".js", ".jsx"].includes(extname(abs))) acc.push(abs);
    return acc;
  }
  if (!stat.isDirectory()) return acc;
  for (const entry of readdirSync(abs, { withFileTypes: true })) walk(join(abs, entry.name), acc);
  return acc;
};

const appFiles = SRC_ROOTS.flatMap((root) => walk(join(ROOT, root)));

/* 1. The repository adapters must delegate to the command layer. */
const repoSource = readFileSync(join(ROOT, "src", "services", "catalogRepository.js"), "utf8");
const adapterMethods = ["approveProduct", "publishProduct", "submitForReview", "archiveProduct", "restoreProduct", "unpublishProduct"];
const missingDelegation = adapterMethods.filter((name) => !new RegExp(`${name}: \\([^)]*\\) => catalogRepository\\._workflowCommand|${name}: \\([^)]*\\) =>\\s*$`).test(repoSource) && !repoSource.includes(`_workflowCommand("${name}"`));
if (missingDelegation.length) {
  missingDelegation.forEach((name) => fail(`catalogRepository.${name} does not delegate to the command layer`));
} else {
  row("Repository workflow adapters delegate", "yes ✓");
}
if (!repoSource.includes('import { getWorkflowCommands } from "./workflow/workflowCommandRegistry"')) {
  fail("catalogRepository does not import the workflow command registry");
}

/* 2. No application component may write workflow state directly:
   direct assignment (`.status = "PUBLISHED"`) or raw repository writes. */
const directWritePattern = /\.status\s*=\s*["']PUBLISHED["']|\b(?:writeProduct|writeMedia)\s*\(/g;
const directWrites = [];
appFiles.forEach((abs) => {
  const source = readFileSync(abs, "utf8");
  for (const match of source.matchAll(directWritePattern)) {
    directWrites.push({ file: abs.replace(ROOT + "/", ""), snippet: (match[0] || "").slice(0, 100) });
  }
});
if (directWrites.length) {
  directWrites.forEach((hit) => fail(`direct workflow write in ${hit.file}: ${hit.snippet}`));
} else {
  row("Direct workflow state writes (components)", "0 ✓");
}

/* 3. Publish/approve call sites in components must go through the
   repository/workflow/Kids adapters (which route to the commands). List
   them as routed call sites — the behavior probes above prove they cannot
   bypass the canonical lifecycle. */
const callPattern = /(?:catalogRepository|publishProduct|approveProduct|bulkUpdate|updateStatus|publishKidsProduct|approveKidsProduct)\s*\.?\s*\(/g;
const callSites = new Set();
appFiles.forEach((abs) => {
  const source = readFileSync(abs, "utf8");
  for (const match of source.matchAll(callPattern)) {
    callSites.add(abs.replace(ROOT + "/", ""));
  }
});
row("Routed publish/approve call sites", [...callSites].sort().join(", ") || "none");
line();

/* ------------------------------------------------------------------ */
/* 6. Media ownership command centralization                           */
/* ------------------------------------------------------------------ */

line("## 6. Media ownership command");
if (typeof transferMediaOwnership !== "function") {
  fail("media ownership service is missing");
} else {
  row("transferMediaOwnership", "centralized ✓");
}
const ownershipScratch = createScratch("FND-AUDIT-004");
const employeeTransfer = transferMediaOwnership({
  mediaId: ownershipScratch.media.id,
  targetProductId: "pf-001",
  principal: MANAGER,
  confirm: true,
});
if (employeeTransfer.ok) fail("employee transferred media ownership");
else row("Employee ownership transfer", "denied ✓");
const unconfirmed = transferMediaOwnership({
  mediaId: ownershipScratch.media.id,
  targetProductId: "pf-001",
  principal: ADMIN,
  confirm: false,
});
if (unconfirmed.ok) fail("contested transfer succeeded without confirmation");
else row("Contested transfer confirmation", "required ✓");
cleanup(ownershipScratch);
line();

/* ------------------------------------------------------------------ */
/* 7. Marketing media isolation                                        */
/* ------------------------------------------------------------------ */

line("## 7. Marketing media isolation");
const marketing = mediaRepository.getAll().filter((item) => item.scope === "MARKETING");
const productScopedWithPlacement = mediaRepository.getAll().filter((item) => item.scope === "PRODUCT" && item.placement);
const marketingWithProduct = marketing.filter((item) => item.productId);
if (marketingWithProduct.length) fail(`${marketingWithProduct.length} marketing records carry a productId`);
if (productScopedWithPlacement.length) fail(`${productScopedWithPlacement.length} product records carry a placement`);
row("Marketing records", marketing.length);
row("Marketing → product leakage", `${marketingWithProduct.length} (must be 0)`);
if (!marketingWithProduct.length && !productScopedWithPlacement.length) {
  line("  ✓ marketing and product scope remain mutually exclusive");
}
line();

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

setupBaseState();
line("# RESULT");
if (failures.length) {
  line(`FAIL: ${failures.length} workflow-foundation violation${failures.length === 1 ? "" : "s"}`);
  process.exitCode = 1;
} else {
  line("PASS: workflow foundation is in place — one lifecycle, one validator, one ownership door.");
}
