/**
 * PRATIKSHYA FASHON — Phase 3D unified Admin Product Review tests.
 *
 * Phase 3D consolidated the three Admin review surfaces
 * (AdminKidsFinalizationPanel, AdminKidsReviewPanel, ProductDraftReviewPanel)
 * into ONE Admin Product Review Workspace:
 *
 *   catalogue → workflow projection → review query → UNIFIED REVIEW QUEUE
 *                                              → ONE product review detail
 *                                              → canonical commands
 *
 * These tests lock the consolidation in place:
 *
 *   · one queue over one lifecycle — Kids included, Kids filterable
 *   · canonical validation output drives flags/readiness (no duplicated rules)
 *   · approve / return / publish remain canonical, separate and authorized
 *   · Kids rules (KID-001 … KID-021) are unchanged and still enforced
 *   · authorization, Employee Portal, media ownership and golden data intact
 *   · the retired surfaces are gone and legacy deep links redirect safely
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../src/services/workflow/productWorkflowState.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import {
  CATEGORY_VALIDATORS,
  validateKidsProduct,
} from "../src/services/workflow/kidsValidator.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import {
  approveProduct,
  returnProduct,
  publishProduct,
  submitProductForReview,
  assignProductToEmployee,
  transferMediaOwnership,
} from "../src/services/productWorkflow.js";
import {
  getUnifiedReviewQueue,
  getUnifiedReviewQueueUncached,
  filterUnifiedReviewQueue,
  countUnifiedQuickFilters,
  matchesQuickFilter,
} from "../src/services/unifiedProductReview.js";
import { blockingReviewFlags } from "../src/services/productReviewFlags.js";
import { CONFIRMED_KIDS_IDENTITIES, kidsFileNameOf } from "../src/services/kidsProductIdentity.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

const ROOT = process.cwd();
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const EMPLOYEE = { employeeId: "PF-MGR-00008", label: "Vikram Iyer" };
const CUSTOMER = { customerId: "CUST-0001", name: "A Customer" };
const ANONYMOUS = null;

let scratchCounter = 0;

/** A complete, publishable scratch product with validated media ownership. */
const createScratch = (overrides = {}) => {
  scratchCounter += 1;
  const id = `URW-${String(scratchCounter).padStart(3, "0")}`;
  const media = mediaRepository.create({
    url: `/library/scratch-unified-${id.toLowerCase()}.webp`,
    title: "Unified review scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: "Unified Review Scratch Piece",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Scratch product for unified review workspace tests.",
      sku: `${id}-SKU`,
      price: 1300,
      compareAtPrice: 1600,
      pricing: { sellingPrice: 1300, mrp: 1600 },
      stock: 5,
      availability: "in-stock",
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
      ...overrides,
    },
    ADMIN
  );
  assert.ok(created.ok, `scratch product must be created: ${created.error ?? ""}`);
  const ownership = assignMediaToProduct({
    mediaId: media.id,
    productId: created.product.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.ok(ownership.ok, `scratch ownership must be assigned: ${ownership.error ?? ""}`);
  return { media, product: catalogRepository.find(created.product.id) };
};

const cleanup = ({ media, product }) => {
  const current = product ? catalogRepository.find(product.id) : null;
  if (current && current.status !== PRODUCT_STATUS.ARCHIVED) {
    commands.archiveProduct(current.id, ADMIN);
  }
  if (media) mediaRepository.remove(media.id);
};

const submitApprove = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, "submit must succeed");
  const approved = commands.approveProduct(id, ADMIN);
  assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join("; ")}`);
  return approved.product;
};

/**
 * String-aware comment stripper — the naive regex mistakes the route
 * wildcard string `"/admin/*"` in App.jsx for a block comment and would
 * swallow the employee routes below it.
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

const readCode = (relative) => stripComments(readFileSync(join(ROOT, relative), "utf8"));

const detailSource = () => readCode("src/components/admin/ProductReviewDetail.jsx");
const queueSource = () => readCode("src/components/admin/UnifiedReviewQueue.jsx");
const pageSource = () => readCode("src/pages/admin/AdminProductReview.jsx");
const appSource = () => readCode("src/App.jsx");

/* ================================================================== */
/* 1. All reviewable products appear in the unified queue             */
/* ================================================================== */

test("1. every product in the canonical register appears in the unified queue exactly once", () => {
  const rows = getUnifiedReviewQueue();
  const registerIds = catalogRepository.all().map((product) => String(product.id)).sort();
  const queueIds = rows.map((row) => String(row.productId)).sort();

  assert.equal(queueIds.length, registerIds.length, "one row per product, no more, no less");
  queueIds.forEach((id, index) => assert.equal(id, registerIds[index]));
  assert.equal(new Set(queueIds).size, queueIds.length, "no duplicate rows");
});

/* ================================================================== */
/* 2. Kids products appear in the SAME queue                          */
/* ================================================================== */

test("2. Kids products are rows in the same unified queue — no separate Kids queue", async () => {
  const rows = getUnifiedReviewQueue();
  CONFIRMED_KIDS_IDENTITIES.forEach((identity) => {
    const row = rows.find((candidate) => candidate.productId === identity.productId);
    assert.ok(row, `${identity.productId} must be a unified queue row`);
    assert.equal(row.isKids, true, `${identity.productId} is flagged as Kids`);
  });
  /* The service exposes ONE queue API — no Kids-specific queue structure. */
  assert.equal(typeof getUnifiedReviewQueueUncached, "function");
  const kidsQueueExports = Object.keys(await import("../src/services/unifiedProductReview.js"))
    .filter((name) => /kids/i.test(name) && /queue/i.test(name));
  assert.deepEqual(kidsQueueExports, [], "no separate Kids queue exists in the service");
});

/* ================================================================== */
/* 3. Kids can be filtered                                            */
/* ================================================================== */

test("3. Kids is a filter over the unified queue", () => {
  const rows = getUnifiedReviewQueue();
  const kidsViaFilter = filterUnifiedReviewQueue(rows, { kids: "KIDS" });
  const expectedKids = rows.filter((row) => row.isKids);
  assert.equal(kidsViaFilter.length, expectedKids.length, "the Kids filter returns exactly the Kids rows");
  kidsViaFilter.forEach((row) => assert.equal(row.isKids, true));

  const kidsViaQuick = rows.filter((row) => matchesQuickFilter(row, "KIDS"));
  assert.equal(kidsViaQuick.length, expectedKids.length, "the Kids quick lens matches the filter");

  const counts = countUnifiedQuickFilters(rows);
  assert.equal(counts.KIDS, expectedKids.length);
});

/* ================================================================== */
/* 4. Non-Kids products remain available                              */
/* ================================================================== */

test("4. non-Kids products remain available in the same queue", () => {
  const rows = getUnifiedReviewQueue();
  const nonKids = filterUnifiedReviewQueue(rows, { kids: "NON_KIDS" });
  const expected = rows.filter((row) => !row.isKids);
  assert.equal(nonKids.length, expected.length);
  assert.ok(nonKids.length > 0, "the queue is not only Kids");
  nonKids.forEach((row) => assert.equal(row.isKids, false));
  assert.equal(nonKids.length + filterUnifiedReviewQueue(rows, { kids: "KIDS" }).length, rows.length);
});

/* ================================================================== */
/* 5. Review flags appear correctly                                   */
/* ================================================================== */

test("5. review flags appear correctly in the unified queue", () => {
  /* Every register product's flags surface on its row, unchanged. */
  const rows = getUnifiedReviewQueue();
  catalogRepository.all().forEach((product) => {
    const row = rows.find((candidate) => candidate.productId === product.id);
    assert.deepEqual([...row.reviewFlags].sort(), [...(product.reviewFlags ?? [])].sort());
    assert.deepEqual(
      [...row.blockingFlags].sort(),
      [...blockingReviewFlags(product.reviewFlags)].sort(),
      `${product.id} blocking flags come from the canonical flag vocabulary`
    );
  });

  /* A flagged product is visible through the flag filter. */
  const scratch = createScratch({ reviewFlags: ["PRICE_REVIEW_REQUIRED"] });
  const flagged = filterUnifiedReviewQueue(getUnifiedReviewQueue(), { flag: "PRICE_REVIEW_REQUIRED" });
  assert.ok(flagged.some((row) => row.productId === scratch.product.id));
  const anyFlag = filterUnifiedReviewQueue(getUnifiedReviewQueue(), { flag: "ANY" });
  assert.ok(anyFlag.some((row) => row.productId === scratch.product.id));
  cleanup(scratch);
});

/* ================================================================== */
/* 6–9. Each review-flag family blocks publishing                     */
/* ================================================================== */

const flagBlocksPublish = (flag) => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id); /* approved cleanly BEFORE the flag appears */

  catalogRepository.updateDraft(id, { reviewFlags: [flag] }, ADMIN);

  const validation = validateProductForPublish(catalogRepository.find(id));
  assert.equal(validation.ok, false, `${flag} must block validation`);
  assert.ok(
    validation.blocking.some((issue) => issue.code === "REVIEW_FLAG_BLOCKING"),
    `${flag} surfaces as the canonical REVIEW_FLAG_BLOCKING issue`
  );

  const publishAttempt = commands.publishProduct(id, ADMIN);
  assert.equal(publishAttempt.ok, false, `${flag} must block publishing`);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW, "the product stays unpublished");

  /* The queue reports the flag and the missing information. */
  const row = getUnifiedReviewQueue().find((candidate) => candidate.productId === id);
  assert.ok(row.blockingFlags.includes(flag));
  assert.equal(row.missingInformation, true);
  assert.equal(row.readyToPublish, false);

  cleanup(scratch);
};

test("6. name review blocks publishing", () => flagBlocksPublish("NAME_REVIEW_REQUIRED"));
test("7. price review blocks publishing", () => flagBlocksPublish("PRICE_REVIEW_REQUIRED"));
test("8. taxonomy review blocks publishing", () => flagBlocksPublish("TAXONOMY_REVIEW_REQUIRED"));
test("9. grouping review blocks publishing", () => flagBlocksPublish("GROUP_REVIEW_REQUIRED"));

/* ================================================================== */
/* 10. Kids-specific validation still runs                            */
/* ================================================================== */

test("10. Kids-specific validation still runs inside the universal validator", () => {
  assert.equal(CATEGORY_VALIDATORS.kidswear, validateKidsProduct, "the Kids validator is the registered category plug-in");

  const kid = catalogRepository.find("KID-001");
  const validation = validateProductForPublish(kid);
  const kidsIssues = validation.issues.filter((issue) => issue.source === "KIDS");
  assert.ok(kidsIssues.length > 0, "KID-001 yields KIDS-sourced issues");
  assert.ok(
    kidsIssues.some((issue) => ["KIDS_INVENTORY_INVALID", "KIDS_PRIMARY_MISSING"].includes(issue.code)),
    "the known KID-001 blockers (inventory / primary plate) remain enforced"
  );

  /* The Kids rule set itself is intact (no silent simplification). */
  const kidsSource = readCode("src/services/workflow/kidsValidator.js");
  ["KIDS_MERGE_REFUSED", "KIDS_CROSS_PRODUCT_OWNERSHIP", "KIDS_WRONG_PRIMARY", "KIDS_IDENTITY_UNCONFIRMED"].forEach(
    (code) => assert.ok(kidsSource.includes(code), `${code} rule remains in the Kids validator`)
  );
  assert.equal(CONFIRMED_KIDS_IDENTITIES.length, 21, "KID-001 … KID-021 identities unchanged");
});

/* ================================================================== */
/* 11. Approval uses the canonical approve command                    */
/* ================================================================== */

test("11. approval uses the canonical approve command", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  /* The same entry point the unified review detail imports. */
  const result = approveProduct(id, ADMIN);
  assert.ok(result.ok, `canonical approve must succeed: ${(result.errors ?? []).join(" ")}`);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.APPROVED);
  assert.ok(
    loadActivity().some((entry) => entry.targetProductId === id && entry.action === "PRODUCT_APPROVED"),
    "the canonical approval event is recorded"
  );

  /* The UI imports the canonical service boundary, never the repository. */
  const source = detailSource();
  assert.ok(/from\s+"..\/..\/services\/productWorkflow"/.test(source));
  assert.ok(source.includes("approveProduct"));
  assert.ok(!source.includes("catalogRepository"), "the review detail never touches the repository writers");

  cleanup(scratch);
});

/* ================================================================== */
/* 12. Approval does not publish                                      */
/* ================================================================== */

test("12. approval does not publish — APPROVE ≠ PUBLISH", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.ok(approveProduct(id, ADMIN).ok);

  const approved = catalogRepository.find(id);
  assert.notEqual(approved.status, PRODUCT_STATUS.PUBLISHED, "approval never publishes");
  assert.equal(approved.review.state, REVIEW_STATE.APPROVED);
  assert.equal(getLiveStorefrontProducts().some((product) => product.id === id), false);
  cleanup(scratch);
});

/* ================================================================== */
/* 13. Return uses the canonical return command                       */
/* ================================================================== */

test("13. return uses the canonical return command", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  const result = returnProduct(id, "Price needs a second look.", ADMIN);
  assert.ok(result.ok, `canonical return must succeed: ${result.error ?? ""}`);

  const returned = catalogRepository.find(id);
  assert.equal(returned.status, PRODUCT_STATUS.DRAFT, "a returned product is editable again");
  assert.equal(returned.review.state, REVIEW_STATE.REJECTED);
  assert.equal(returned.review.rejectionReason, "Price needs a second look.");
  assert.ok(
    loadActivity().some((entry) => entry.targetProductId === id && entry.action === "PRODUCT_REJECTED"),
    "the canonical return event is recorded"
  );

  assert.ok(detailSource().includes("returnProduct"), "the unified detail uses the canonical return entry point");
  cleanup(scratch);
});

/* ================================================================== */
/* 14. Return requires a reason                                       */
/* ================================================================== */

test("14. return requires a reason", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  assert.equal(returnProduct(id, "", ADMIN).ok, false, "an empty reason is refused");
  assert.equal(returnProduct(id, "   ", ADMIN).ok, false, "a whitespace reason is refused");
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW, "no reason, no transition");

  /* The unified detail disables the confirmation until a reason exists. */
  const source = detailSource();
  assert.ok(source.includes("!returnReason.trim()"), "the UI requires a reason before returning");
  cleanup(scratch);
});

/* ================================================================== */
/* 15. Publish uses the canonical publish command                     */
/* ================================================================== */

test("15. publish uses the canonical publish command", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);

  const result = publishProduct(id, ADMIN);
  assert.ok(result.ok, `canonical publish must succeed: ${(result.errors ?? []).join(" ")}`);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PUBLISHED);
  assert.ok(getLiveStorefrontProducts().some((product) => product.id === id));
  assert.ok(
    loadActivity().some((entry) => entry.targetProductId === id && entry.action === "PRODUCT_PUBLISHED")
  );
  assert.ok(detailSource().includes("publishProduct"));
  cleanup(scratch);
});

/* ================================================================== */
/* 16. Publish still requires approval                                */
/* ================================================================== */

test("16. publish still requires approval", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  assert.equal(publishProduct(id, ADMIN).ok, false, "a DRAFT cannot publish");
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const early = publishProduct(id, ADMIN);
  assert.equal(early.ok, false, "a SUBMITTED product cannot publish");
  assert.ok(/approve/i.test(early.error ?? (early.errors ?? []).join(" ")), "the refusal names approval");
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW);
  cleanup(scratch);
});

/* ================================================================== */
/* 17. Unauthorized users cannot perform Admin review actions         */
/* ================================================================== */

test("17. unauthorized users cannot perform Admin review actions", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const statusBefore = catalogRepository.find(id).status;

  [ANONYMOUS, CUSTOMER, EMPLOYEE].forEach((actor) => {
    assert.equal(approveProduct(id, actor).ok, false, "approve refused");
    assert.equal(returnProduct(id, "nope", actor).ok, false, "return refused");
    assert.equal(publishProduct(id, actor).ok, false, "publish refused");
  });

  assert.equal(catalogRepository.find(id).status, statusBefore, "refused actions mutated nothing");
  cleanup(scratch);
});

/* ================================================================== */
/* 18. Employee review flow remains intact                            */
/* ================================================================== */

test("18. the Employee review flow remains intact (EDIT → SUBMIT)", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(assignProductToEmployee(id, EMPLOYEE.employeeId, ADMIN).ok);

  const saved = commands.saveProductDraft(id, { name: "Employee-polished scratch piece" }, EMPLOYEE);
  assert.ok(saved.ok, `assigned employee can edit: ${saved.error ?? ""}`);
  assert.equal(catalogRepository.find(id).name, "Employee-polished scratch piece");

  const submitted = commands.submitProduct(id, EMPLOYEE);
  assert.ok(submitted.ok, `assigned employee can submit: ${submitted.error ?? ""}`);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW);

  assert.equal(approveProduct(id, EMPLOYEE).ok, false, "employees still cannot approve");

  /* The Employee Portal keeps its own review destination. */
  assert.ok(appSource().includes('path="/employee/products/review"'));
  cleanup(scratch);
});

/* ================================================================== */
/* 19. Media ownership remains canonical                              */
/* ================================================================== */

test("19. media ownership remains canonical — confirmed Kids plate locked", () => {
  /* The review workspace never writes ownership itself. */
  [detailSource(), queueSource(), pageSource()].forEach((source) => {
    assert.ok(!/mediaRepository\s*\.\s*assignToProduct/.test(source));
  });

  /* Runtime: the confirmed plate of KID-001 cannot be transferred away,
     even by an admin, through the canonical ownership service. */
  const plate = mediaRepository.getAll().find((media) => kidsFileNameOf(media) === "kids-001.webp");
  assert.ok(plate, "the kids-001.webp plate exists");
  const scratch = createScratch();
  const moved = transferMediaOwnership(plate.id, scratch.product.id, ADMIN, { confirm: true });
  assert.equal(moved.ok, false, "the 21-plate lock refuses the transfer");
  assert.equal(
    String(mediaRepository.getById(plate.id).productId ?? "") || null,
    String(plate.productId ?? "") || null,
    "plate ownership is unchanged"
  );
  cleanup(scratch);
});

/* ================================================================== */
/* 20. Golden data remains unchanged                                  */
/* ================================================================== */

test("20. product/media/Kids golden data remains unchanged", async () => {
  const { captureGoldenData, compareGoldenData } = await import("../scripts/lib/goldenData.js");
  const baseline = JSON.parse(readFileSync(join(ROOT, "tests/fixtures/workflow-golden-baseline.json"), "utf8"));
  const current = captureGoldenData();
  const differences = compareGoldenData(baseline, current);
  assert.deepEqual(differences, [], `golden data must be identical: ${differences.join(" | ")}`);
  assert.deepEqual(current.counts, {
    products: 168,
    media: 205,
    published: 99,
    storefront: 99,
    marketingMedia: 10,
    kidsProducts: 21,
  });
});

/* ================================================================== */
/* 21. Old Kids review route redirects safely                         */
/* ================================================================== */

test("21. old Kids review surfaces are retired and the legacy deep link redirects safely", () => {
  /* There was never a dedicated Kids route; there must still be none. */
  const source = appSource();
  ["/admin/kids", "/admin/kids-review", "/admin/kids/finalization"].forEach((route) => {
    assert.ok(!source.includes(`path="${route}"`), `${route} must not exist`);
  });
  const reviewRoutes = source.match(/path="\/admin\/products\/review"/g) ?? [];
  assert.equal(reviewRoutes.length, 1, "exactly one canonical Admin review route");

  /* The retired components are gone, and nothing imports them. */
  assert.equal(existsSync(join(ROOT, "src/components/admin/AdminKidsFinalizationPanel.jsx")), false);
  assert.equal(existsSync(join(ROOT, "src/components/admin/AdminKidsReviewPanel.jsx")), false);

  /* The historical ?draft= deep link redirects to ?product=. */
  const page = pageSource();
  assert.ok(page.includes('searchParams.get("draft")'));
  assert.ok(/setSearchParams\(\s*\{\s*product:\s*legacyDraft\s*\}/.test(page));
});

/* ================================================================== */
/* 22. Old draft-review route redirects safely                        */
/* ================================================================== */

test("22. old draft-review surfaces are consolidated behind the same redirect", () => {
  const source = appSource();
  ["/admin/products/draft-review", "/admin/products/drafts", "/admin/draft-review"].forEach((route) => {
    assert.ok(!source.includes(`path="${route}"`), `${route} must not exist`);
  });

  /* A ?draft=ID deep link (the old draft-review focus) lands on the
     unified detail through the ?product= alias — covered by the same
     redirect mechanism. */
  const page = pageSource();
  assert.ok(page.includes('searchParams.get("product")'));
  assert.ok(page.includes("legacyDraft"), "the legacy alias is retained and redirected");
});

/* ================================================================== */
/* 23. No duplicate review queues are created                         */
/* ================================================================== */

test("23. no duplicate review queue exists — one memoized projection", () => {
  /* The service persists nothing: no storage keys, no register of its own. */
  const serviceSource = readCode("src/services/unifiedProductReview.js");
  assert.ok(!/localStorage|sessionStorage|setItem/.test(serviceSource), "the projection never persists");
  assert.ok(!/pratikshya_/.test(serviceSource), "no second register key");

  /* Queue identity equals register identity — before and after a change.
     Warm-up: the first Kids validation may one-time self-heal the confirmed
     Kids group decisions (existing house invariant behaviour — the legacy
     finalization desk did the same on render), which legitimately bumps the
     group fingerprint once. */
  getUnifiedReviewQueue();
  const first = getUnifiedReviewQueue();
  const second = getUnifiedReviewQueue();
  assert.equal(first, second, "the queue is memoized, not rebuilt per render");

  const scratch = createScratch();
  submitApprove(scratch.product.id);
  const afterChange = getUnifiedReviewQueue();
  assert.notEqual(afterChange, first, "a catalogue change invalidates the cache");
  const row = afterChange.find((candidate) => candidate.productId === scratch.product.id);
  assert.equal(row.stage, WORKFLOW_STAGES.APPROVED, "the projection reflects the canonical stage");
  cleanup(scratch);
});

/* ================================================================== */
/* 24. No direct workflow writes exist in UI components               */
/* ================================================================== */

test("24. no direct workflow writes exist in UI components", () => {
  const LIFECYCLE_LITERALS = ["PUBLISHED", "APPROVED", "ARCHIVED", "RETURNED", "SUBMITTED"];
  const walk = (dir, out = []) => {
    readdirSync(dir).forEach((entry) => {
      const abs = join(dir, entry);
      if (statSync(abs).isDirectory()) walk(abs, out);
      else if (abs.endsWith(".js") || abs.endsWith(".jsx")) out.push(abs);
    });
    return out;
  };
  const uiFiles = [...walk(join(ROOT, "src/pages")), ...walk(join(ROOT, "src/components")), ...walk(join(ROOT, "src/hooks"))];

  const violations = [];
  uiFiles.forEach((abs) => {
    const relative = abs.replace(`${ROOT}/`, "");
    const source = stripComments(readFileSync(abs, "utf8"));
    if (/\bwriteProduct\s*\(/.test(source)) violations.push(`${relative}: writeProduct()`);
    if (/persistCatalogueState\s*\(/.test(source)) violations.push(`${relative}: persistCatalogueState()`);
    LIFECYCLE_LITERALS.forEach((literal) => {
      const assign = new RegExp(`\\.(status|workflowState|lifecycle)\\s*=\\s*["']${literal}["']`);
      if (assign.test(source)) violations.push(`${relative}: direct .status = "${literal}"`);
    });
    if (/catalogRepository\s*\.\s*(updateStatus|bulkUpdate)\s*\(/.test(source) && relative.includes("admin/ProductReview")) {
      violations.push(`${relative}: legacy status adapter in the review workspace`);
    }
  });
  assert.deepEqual(violations, [], violations.join(" | "));

  /* The unified detail routes every lifecycle action through the canonical
     service boundary. */
  ["approveProduct", "returnProduct", "publishProduct", "submitProductForReview", "archiveProduct", "assignProductToEmployee"].forEach(
    (name) => assert.ok(detailSource().includes(name), `the unified detail uses ${name}`)
  );
});
