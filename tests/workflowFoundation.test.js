/**
 * PRATIKSHYA FASHON — Phase 2 workflow foundation regression tests.
 *
 * Locks the canonical workflow foundation in place:
 *
 *   · the canonical workflow projection (state table for every
 *     status × review × assignment × Kids combination)
 *   · the universal publish validator (issue codes, no duplicate blockers)
 *   · the Kids category validator (21 identities, wrong plate, no-merge,
 *     no plate lock for future non-confirmed Kids products)
 *   · the universal authorized lifecycle commands (transitions, invalid
 *     transitions, approve ≠ publish, publish requires approved)
 *   · authorization (employee cannot approve/publish; customer cannot
 *     mutate; admin required for ownership)
 *   · the media ownership service (one owner, marketing isolation,
 *     confirmed-transfer confirmation)
 *   · storefront visibility matrix (DRAFT/SUBMITTED/APPROVED/ARCHIVED
 *     invisible; PUBLISHED visible; PUBLISHED + inactive category hidden)
 *   · golden-data regression (the pre-implementation snapshot)
 *   · read side-effect proof (ordinary reads do not mutate workflow data)
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getEmployee, loadEmployees } from "../src/services/employees/employeeService.js";
import {
  commands,
  resolvePrincipal,
} from "../src/services/workflow/productWorkflowCommands.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../src/services/workflow/productWorkflowState.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { validateKidsProduct } from "../src/services/workflow/kidsValidator.js";
import {
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  CONFIRMED_KIDS_IDENTITIES,
  kidsMediaFileForProductId,
  kidsProductIdForFile,
  wouldMergeConfirmedKids,
} from "../src/services/kidsProductIdentity.js";
import {
  transferMediaOwnership,
  assignMediaToProduct,
} from "../src/services/media/mediaOwnershipService.js";
import { runExplicitMigrations } from "../src/services/workflow/explicitMigrations.js";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { captureGoldenData, compareGoldenData } from "../scripts/lib/goldenData.js";

/* Every foundation test starts from a fresh explicitly migrated fixture. */
beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});



const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const MANAGER_ID = "PF-MGR-00008";
const manager = () => getEmployee(loadEmployees(), MANAGER_ID);
const salesperson = () => getEmployee(loadEmployees(), "PF-SLS-00124");

const fileOf = (source) =>
  source?.fileName ||
  source?.currentFilename ||
  (source?.src || source?.url || "").split("/").pop() ||
  source?.id ||
  null;

const mediaByFile = (fileName) =>
  mediaRepository.getAll().find((item) => fileOf(item)?.toLowerCase() === fileName.toLowerCase());

let scratchCounter = 0;

const createScratchMedia = (patch = {}) =>
  mediaRepository.create({
    url: `/library/scratch-foundation-${String(++scratchCounter).padStart(3, "0")}.webp`,
    title: "Scratch foundation media",
    status: "ACTIVE",
    ...patch,
  });

const createScratchProduct = ({ id, category = "dupattas", subcategory = "Printed Dupatta", kids = false } = {}) => {
  const media = createScratchMedia();
  const product = catalogRepository.createDraftProduct(
    {
      id,
      name: kids ? "Boys' Foundation Casual Set" : "Foundation Scratch Product",
      category,
      subcategory,
      description: "Scratch product for workflow foundation tests.",
      sku: `${id}-SKU`,
      price: 1200,
      compareAtPrice: 1500,
      pricing: { sellingPrice: 1200, mrp: 1500 },
      stock: 6,
      availability: "in-stock",
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(product.ok, `scratch product must be created: ${product.error ?? ""}`);
  const ownership = assignMediaToProduct({
    mediaId: media.id,
    productId: product.product.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.ok(ownership.ok, `scratch ownership must be assigned: ${ownership.error ?? ""}`);
  return { media, product: catalogRepository.find(product.product.id) };
};

const cleanupScratch = ({ media, product }) => {
  if (product) catalogRepository.archiveProduct(product.id, ADMIN);
  if (media) mediaRepository.remove(media.id);
};

const submitApprove = (id, actor = ADMIN) => {
  assert.ok(commands.submitProduct(id, actor).ok, "submit must succeed");
  const approved = commands.approveProduct(id, actor);
  assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join("; ")}`);
  return approved.product;
};

/* ------------------------------------------------------------------ */
/* 0. Golden-data regression — the pre-implementation snapshot         */
/* ------------------------------------------------------------------ */

test("golden data: product/media/Kids/taxonomy/storefront state matches the pre-implementation baseline", () => {
  const baseline = JSON.parse(
    readFileSync(join(__dirname, "fixtures", "workflow-golden-baseline.json"), "utf8")
  );
  const current = captureGoldenData();
  const differences = compareGoldenData(baseline, current);
  assert.deepEqual(differences, [], "no unintended data differences vs the baseline");
  assert.equal(current.counts.kidsProducts, 21);
  assert.equal(current.kids.filter((row) => row.mediaId && row.ownerProductId).length, 21);
});

/* ------------------------------------------------------------------ */
/* 1. Canonical workflow projection                                    */
/* ------------------------------------------------------------------ */

test("the canonical projection maps every status × review × assignment combination", () => {
  const cases = [
    // status, review.state, assigned, employeeEditStarted, expected stage, returned?
    ["DRAFT", "NONE", null, null, WORKFLOW_STAGES.DRAFT, false],
    ["DRAFT", "NONE", "PF-MGR-00008", null, WORKFLOW_STAGES.ASSIGNED, false],
    ["DRAFT", "NONE", "PF-MGR-00008", "2026-08-01T00:00:00.000Z", WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW, false],
    ["DRAFT", "REJECTED", "PF-MGR-00008", null, WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW, true],
    ["DRAFT", "REJECTED", null, null, WORKFLOW_STAGES.DRAFT, true],
    ["PENDING_REVIEW", "PENDING", null, null, WORKFLOW_STAGES.SUBMITTED, false],
    ["PENDING_REVIEW", "PENDING", null, null, WORKFLOW_STAGES.IN_ADMIN_REVIEW, false, { adminReviewStartedAt: "2026-08-01T00:00:00.000Z" }],
    ["PENDING_REVIEW", "NONE", null, null, WORKFLOW_STAGES.SUBMITTED, false],
    ["PENDING_REVIEW", "APPROVED", null, null, WORKFLOW_STAGES.APPROVED, false],
    ["REVIEW", "PENDING", null, null, WORKFLOW_STAGES.SUBMITTED, false],
    ["PUBLISHED", "APPROVED", null, null, WORKFLOW_STAGES.PUBLISHED, false],
    ["PUBLISHED", "NONE", null, null, WORKFLOW_STAGES.PUBLISHED, false],
    ["ARCHIVED", "NONE", null, null, WORKFLOW_STAGES.ARCHIVED, false],
  ];

  cases.forEach(([status, review, assigned, employeeEditStarted, expected, returned, reviewExtra = {}], index) => {
    const state = getProductWorkflowState({
      id: `PF-STATE-${String(index).padStart(3, "0")}`,
      status,
      review: { state: review, ...reviewExtra },
      assignedEmployeeId: assigned,
      workflow: employeeEditStarted ? { employeeReviewStartedAt: employeeEditStarted } : undefined,
      category: "sarees",
    });
    assert.equal(state.stage, expected, `case ${index} (${status}/${review}/${assigned})`);
    assert.equal(state.returned, returned, `case ${index} returned flag`);
    if (returned) assert.equal(state.presentation, "RETURNED");
  });

  /* Existing published and archived records keep their canonical stage. */
  const published = catalogRepository.find("pf-001");
  assert.equal(getProductWorkflowState(published).stage, WORKFLOW_STAGES.PUBLISHED);
  assert.ok(getProductWorkflowState(published).label);
  assert.ok(getProductWorkflowState(null).stage === null);
});

test("Kids records map through the same canonical projection", () => {
  const draft = catalogRepository.find("KID-001");
  assert.equal(getProductWorkflowState(draft).stage, WORKFLOW_STAGES.DRAFT);
  assert.equal(getProductWorkflowState(draft).isKids, true);
});

/* ------------------------------------------------------------------ */
/* 2. Universal publish validator                                      */
/* ------------------------------------------------------------------ */

test("the universal validator returns structured issues and flags real blockers", () => {
  const draft = catalogRepository.find("KID-001");
  const result = validateProductForPublish(draft, { requireApproved: true });
  assert.equal(typeof result.ok, "boolean");
  assert.ok(Array.isArray(result.issues));
  result.issues.forEach((issue) => {
    assert.ok(issue.code, "issue has a code");
    assert.ok(issue.section, "issue has a section");
    assert.ok(issue.message, "issue has a message");
    assert.ok(["error", "warning"].includes(issue.severity), "issue has a severity");
    assert.equal(typeof issue.blocksPublish, "boolean");
    assert.ok(issue.source, "issue has a source");
  });
  /* The KID draft's media is still owned by the legacy published product —
     that is the CURRENT data truth and must be reported. */
  assert.ok(
    result.issues.some((issue) => issue.code === "CROSS_PRODUCT_MEDIA"),
    "contested media must be reported from the data, not from flags"
  );
  assert.ok(
    result.issues.some((issue) => issue.code === "LIFECYCLE_REVIEW_REQUIRED"),
    "lifecycle requirement must be reported when required"
  );
});

test("the validator reports data truth even when the matching flag is missing", () => {
  /* A draft with an invalid price but NO PRICE_REVIEW_REQUIRED flag must
     still be blocked on the price problem — flags are not the authority. */
  const scratch = createScratchProduct({ id: "FND-101", category: "sarees", subcategory: "Silk Saree" });
  catalogRepository.updateDraft(
    scratch.product.id,
    { price: 0, pricing: { sellingPrice: 0, mrp: 0 }, reviewFlags: [] },
    ADMIN
  );
  const result = validateProductForPublish(catalogRepository.find(scratch.product.id), {});
  assert.ok(!result.ok);
  assert.ok(
    result.blocking.some((issue) => issue.code === "PRICING_ENGINE_ERROR"),
    "the pricing engine error is the data truth"
  );
  cleanupScratch(scratch);
});

test("the validator does not duplicate a blocking condition the data already proves", () => {
  const scratch = createScratchProduct({ id: "FND-102", category: "sarees", subcategory: "Silk Saree" });
  catalogRepository.updateDraft(
    scratch.product.id,
    { price: 0, pricing: { sellingPrice: 0, mrp: 0 }, reviewFlags: ["PRICE_REVIEW_REQUIRED"] },
    ADMIN
  );
  const result = validateProductForPublish(catalogRepository.find(scratch.product.id), {});
  const priceCodes = result.issues.filter((issue) => issue.section === "price").map((issue) => issue.code);
  assert.ok(priceCodes.includes("PRICING_ENGINE_ERROR"));
  assert.ok(!priceCodes.includes("REVIEW_FLAG_BLOCKING"), "flag must not duplicate the price issue");
  cleanupScratch(scratch);
});

test("a review flag that is the ONLY signal of a real problem still blocks", () => {
  const scratch = createScratchProduct({ id: "FND-103", category: "sarees", subcategory: "Silk Saree" });
  catalogRepository.updateDraft(
    scratch.product.id,
    { reviewFlags: ["VARIANT_REVIEW_REQUIRED"] },
    ADMIN
  );
  const result = validateProductForPublish(catalogRepository.find(scratch.product.id), {});
  assert.ok(result.blocking.some((issue) => issue.code === "REVIEW_FLAG_BLOCKING"));
  cleanupScratch(scratch);
});

test("publishing into an inactive category is a warning, not a silent pass", () => {
  const scratch = createScratchProduct({ id: "FND-104", category: "sarees", subcategory: "Silk Saree" });
  taxonomyRepository.archiveCategory("sarees", ADMIN);
  const result = validateProductForPublish(catalogRepository.find(scratch.product.id), {});
  taxonomyRepository.restoreCategory("sarees", ADMIN);
  assert.ok(result.warnings.some((issue) => issue.code === "CATEGORY_INACTIVE"));
  cleanupScratch(scratch);
});

/* ------------------------------------------------------------------ */
/* 3. Universal lifecycle commands                                     */
/* ------------------------------------------------------------------ */

test("full canonical journey: DRAFT → ASSIGNED → EMPLOYEE_REVIEW → SUBMITTED → ADMIN_REVIEW → APPROVED → PUBLISHED", () => {
  const scratch = createScratchProduct({ id: "FND-201" });
  const id = scratch.product.id;

  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.DRAFT);

  /* Assign → ASSIGNED */
  assert.ok(commands.assignProduct(id, MANAGER_ID, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.ASSIGNED);

  /* Employee saves → IN_EMPLOYEE_REVIEW */
  const saved = commands.saveProductDraft(id, { name: "Foundation Journey Product" }, manager());
  assert.ok(saved.ok, `employee save must succeed: ${saved.error ?? ""}`);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW);

  /* Employee submits → SUBMITTED */
  assert.ok(commands.submitProduct(id, manager()).ok, "assigned employee can submit");
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.SUBMITTED);

  /* Admin begins review → IN_ADMIN_REVIEW */
  assert.ok(commands.beginAdminReview(id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.IN_ADMIN_REVIEW);

  /* Approve → APPROVED (still invisible) */
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  let product = catalogRepository.find(id);
  assert.equal(getProductWorkflowState(product).stage, WORKFLOW_STAGES.APPROVED);
  assert.equal(product.status, PRODUCT_STATUS.PENDING_REVIEW, "approval must not publish");
  assert.equal(product.review.state, REVIEW_STATE.APPROVED);

  /* Publish → PUBLISHED */
  assert.ok(commands.publishProduct(id, ADMIN).ok);
  product = catalogRepository.find(id);
  assert.equal(getProductWorkflowState(product).stage, WORKFLOW_STAGES.PUBLISHED);
  assert.equal(product.status, PRODUCT_STATUS.PUBLISHED);

  cleanupScratch({ ...scratch, product });
});

test("invalid transitions are refused", () => {
  const scratch = createScratchProduct({ id: "FND-202" });
  const id = scratch.product.id;

  /* DRAFT → PUBLISHED fails. */
  let result = commands.publishProduct(id, ADMIN);
  assert.equal(result.ok, false);
  assert.match(result.error, /Admin review incomplete/);

  /* Submit → SUBMITTED → PUBLISHED still fails (not approved). */
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  result = commands.publishProduct(id, ADMIN);
  assert.equal(result.ok, false);

  /* SUBMITTED → employee edit fails (submission freezes employee editing). */
  assert.equal(commands.saveProductDraft(id, { name: "Late edit" }, manager()).ok, false);

  /* SUBMITTED → approve works, then publish works. */
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.ok(commands.publishProduct(id, ADMIN).ok);

  /* PUBLISHED → employee edit fails. */
  assert.equal(commands.saveProductDraft(id, { name: "Post-publish edit" }, manager()).ok, false);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("return requires an admin and a reason, and returns to an editable stage", () => {
  const scratch = createScratchProduct({ id: "FND-203" });
  const id = scratch.product.id;

  /* Reason required. */
  let result = commands.returnProduct(id, "", ADMIN);
  assert.equal(result.ok, false);
  assert.match(result.error, /reason/);

  /* Employee cannot return. */
  assert.equal(commands.returnProduct(id, "because", manager()).ok, false);

  /* Submit then return → RETURNED presentation, editable operational stage. */
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  result = commands.returnProduct(id, "Fix the description.", ADMIN);
  assert.ok(result.ok);
  const state = getProductWorkflowState(result.product);
  assert.equal(state.returned, true);
  assert.equal(state.presentation, "RETURNED");
  assert.equal(state.rejectionReason, "Fix the description.");
  assert.equal(result.product.review.state, REVIEW_STATE.REJECTED);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("archive and restore are admin commands that preserve the record", () => {
  const scratch = createScratchProduct({ id: "FND-204" });
  const id = scratch.product.id;

  /* Employee cannot archive. */
  assert.equal(commands.archiveProduct(id, manager()).ok, false);

  assert.ok(commands.archiveProduct(id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.ARCHIVED);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "archived products are invisible"
  );

  /* Restore back to DRAFT. */
  assert.ok(commands.restoreProduct(id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(id)).stage, WORKFLOW_STAGES.DRAFT);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

/* ------------------------------------------------------------------ */
/* 4. Authorization                                                    */
/* ------------------------------------------------------------------ */

test("employees cannot approve, publish, archive, assign or transfer ownership", () => {
  const scratch = createScratchProduct({ id: "FND-301" });
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  assert.equal(commands.approveProduct(id, manager()).ok, false, "employee cannot approve");
  assert.equal(commands.publishProduct(id, manager()).ok, false, "employee cannot publish");
  assert.equal(commands.archiveProduct(id, manager()).ok, false, "employee cannot archive");
  assert.equal(commands.assignProduct(id, MANAGER_ID, manager()).ok, false, "employee cannot assign");
  assert.equal(
    commands.returnProduct(id, "reason", manager()).ok,
    false,
    "employee cannot return"
  );
  assert.equal(
    transferMediaOwnership({ mediaId: scratch.media.id, targetProductId: "pf-001", principal: manager(), confirm: true }).ok,
    false,
    "employee cannot transfer ownership"
  );

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("customer / anonymous principals cannot mutate the workflow", () => {
  const scratch = createScratchProduct({ id: "FND-302" });
  const id = scratch.product.id;

  assert.equal(commands.publishProduct(id, null).ok, false, "null principal denied");
  assert.equal(commands.approveProduct(id, { customerId: "cust-1", name: "A shopper" }).ok, false);
  assert.equal(commands.submitProduct(id, { customerId: "cust-1" }).ok, false);
  assert.equal(commands.archiveProduct(id, {}).ok, false);
  assert.equal(resolvePrincipal({ customerId: "cust-1" }).ok, false);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("approval does not publish; publish requires approved + fresh validation", () => {
  const scratch = createScratchProduct({ id: "FND-303" });
  const id = scratch.product.id;
  const storefrontBefore = getLiveStorefrontProducts().some((product) => product.id === id);
  assert.equal(storefrontBefore, false);

  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const approved = commands.approveProduct(id, ADMIN);
  assert.ok(approved.ok);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "approve must not publish"
  );

  const published = commands.publishProduct(id, ADMIN);
  assert.ok(published.ok);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    true,
    "publish makes the product visible"
  );

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("publish revalidates: breaking the product after approval blocks publish", () => {
  const scratch = createScratchProduct({ id: "FND-304" });
  const id = scratch.product.id;

  submitApprove(id);

  /* Break the price AFTER approval — publish must revalidate and refuse. */
  catalogRepository.updateDraft(
    id,
    { price: 0, pricing: { sellingPrice: 0, mrp: 0 } },
    ADMIN
  );
  const result = commands.publishProduct(id, ADMIN);
  assert.equal(result.ok, false, "publish must never trust an earlier validation");
  assert.ok(result.issues.some((issue) => issue.code === "PRICING_ENGINE_ERROR"));

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("bulk publish uses the canonical command per product and never publishes unapproved products", () => {
  const approvedScratch = createScratchProduct({ id: "FND-305" });
  const draftScratch = createScratchProduct({ id: "FND-306" });
  submitApprove(approvedScratch.product.id);

  const result = commands.bulkPublish([approvedScratch.product.id, draftScratch.product.id], ADMIN);
  assert.equal(result.applied, 1);
  assert.equal(result.skipped, 1);
  assert.equal(catalogRepository.find(approvedScratch.product.id).status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(catalogRepository.find(draftScratch.product.id).status, PRODUCT_STATUS.DRAFT);
  assert.ok(result.results.find((entry) => entry.id === draftScratch.product.id).errors.length > 0);

  cleanupScratch({ ...approvedScratch, product: catalogRepository.find(approvedScratch.product.id) });
  cleanupScratch({ ...draftScratch, product: catalogRepository.find(draftScratch.product.id) });
});

/* ------------------------------------------------------------------ */
/* 5. Kids — category validation, not a second lifecycle               */
/* ------------------------------------------------------------------ */

test("all 21 confirmed Kids identities keep their exact plate mapping", () => {
  assert.equal(CONFIRMED_KIDS_IDENTITIES.length, 21);
  KIDS_PRODUCT_IDS.forEach((productId, index) => {
    assert.equal(kidsMediaFileForProductId(productId), KIDS_MEDIA_FILENAMES[index]);
    const product = catalogRepository.find(productId);
    assert.ok(product, `${productId} exists in the register`);
    const media = mediaByFile(KIDS_MEDIA_FILENAMES[index]);
    assert.ok(media, `${KIDS_MEDIA_FILENAMES[index]} exists in the media register`);
    assert.equal(product.primaryMediaId, media.id, `${productId} claims its own plate`);
    assert.equal(kidsProductIdForFile(media), productId, `${media.id} maps back to ${productId}`);
  });
});

test("a confirmed Kids product cannot use another Kids product's plate", () => {
  /* Build the scenario with scratch COPIES of the confirmed filenames so the
     wrong plate genuinely resolves as the primary. The low-level register
     write is test-only and the scratch records are removed afterwards. */
  const wrongPlate = mediaRepository.create({
    url: "/library/kids-002.webp",
    title: "Scratch wrong-plate copy",
    status: "ACTIVE",
  });
  assert.ok(wrongPlate);
  mediaRepository.assignToProduct(wrongPlate.id, "KID-001", null, { confirmReassign: true });
  const kid1 = catalogRepository.find("KID-001");
  const tampered = {
    ...kid1,
    primaryMediaId: wrongPlate.id,
    mediaIds: [wrongPlate.id],
    galleryMediaIds: [],
  };
  try {
    const issues = validateKidsProduct(tampered, {});
    assert.ok(
      issues.some((issue) => issue.code === "KIDS_WRONG_PRIMARY"),
      "wrong primary plate must be refused"
    );
    const universal = validateProductForPublish(tampered, {});
    assert.ok(
      universal.blocking.some(
        (issue) => issue.code === "KIDS_WRONG_PRIMARY" || issue.code === "CROSS_PRODUCT_MEDIA"
      ),
      "the universal validator integrates the Kids rule"
    );
  } finally {
    mediaRepository.remove(wrongPlate.id);
  }
});

test("a confirmed Kids product cannot merge with another confirmed Kids product", () => {
  const kid2Media = mediaByFile("kids-002.webp");
  const kid3Media = mediaByFile("kids-003.webp");
  assert.equal(
    wouldMergeConfirmedKids([kid2Media, kid3Media]),
    true,
    "two confirmed plates in one product is a merge"
  );

  /* Two scratch copies of confirmed plates assigned to KID-001 — the
     validator must refuse the resulting merged media set. */
  const plate2 = mediaRepository.create({ url: "/library/kids-002.webp", title: "Scratch merge 2", status: "ACTIVE" });
  const plate3 = mediaRepository.create({ url: "/library/kids-003.webp", title: "Scratch merge 3", status: "ACTIVE" });
  assert.ok(plate2 && plate3);
  mediaRepository.assignToProduct(plate2.id, "KID-001", null, { confirmReassign: true });
  mediaRepository.assignToProduct(plate3.id, "KID-001", null, { confirmReassign: true });
  const kid1 = catalogRepository.find("KID-001");
  const tampered = {
    ...kid1,
    mediaIds: [kid1.primaryMediaId, plate2.id, plate3.id],
    galleryMediaIds: [plate2.id, plate3.id],
  };
  try {
    const issues = validateKidsProduct(tampered, {});
    assert.ok(
      issues.some((issue) => issue.code === "KIDS_MERGE_REFUSED"),
      "no-merge must be enforced"
    );
  } finally {
    mediaRepository.remove(plate2.id);
    mediaRepository.remove(plate3.id);
  }
});

test("Kids uses the same approve/publish lifecycle as every category", () => {
  const media = createScratchMedia();
  const created = catalogRepository.createDraftProduct(
    {
      id: "KID-801",
      name: "Boys' Foundation Kids Set",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      description: "Kids foundation lifecycle check.",
      sku: "KID-801-SKU",
      price: 1100,
      pricing: { sellingPrice: 1100, mrp: 1400 },
      stock: 5,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(assignMediaToProduct({
    mediaId: media.id,
    productId: created.product.id,
    principal: ADMIN,
    actor: ADMIN,
  }).ok);
  const id = created.product.id;

  /* Direct publish before approval is refused. */
  assert.equal(commands.publishProduct(id, ADMIN).ok, false);

  /* Same journey: submit → approve → publish. */
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const approved = commands.approveProduct(id, ADMIN);
  assert.ok(approved.ok, `Kids approve must succeed: ${(approved.errors ?? []).join("; ")}`);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PENDING_REVIEW);
  assert.ok(commands.publishProduct(id, ADMIN).ok);
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PUBLISHED);

  cleanupScratch({ media, product: catalogRepository.find(id) });
});

test("future non-confirmed Kids products do NOT inherit the 21-plate lock", () => {
  const media = createScratchMedia();
  const created = catalogRepository.createDraftProduct(
    {
      id: "KID-802",
      name: "Boys' Future Kids Set",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      description: "Future Kids product without a confirmed plate.",
      sku: "KID-802-SKU",
      price: 1100,
      pricing: { sellingPrice: 1100, mrp: 1400 },
      stock: 5,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  const id = created.product.id;
  assert.ok(assignMediaToProduct({
    mediaId: media.id,
    productId: id,
    principal: ADMIN,
    actor: ADMIN,
  }).ok);
  const product = catalogRepository.find(id);

  /* The Kids validator applies category rules… */
  const issues = validateKidsProduct(product, {});
  assert.deepEqual(issues, [], "a well-formed future Kids product has no Kids issues");

  /* …but NOT the immutable plate lock (kids-002.webp is not its plate). */
  const foreign = { ...product, primaryMediaId: mediaByFile("kids-002.webp").id, mediaIds: [mediaByFile("kids-002.webp").id] };
  const foreignIssues = validateKidsProduct(foreign, {});
  assert.ok(
    !foreignIssues.some((issue) => issue.code.startsWith("KIDS_") && (issue.code.includes("PLATE") || issue.code.includes("PRIMARY") || issue.code.includes("MERGE") || issue.code.includes("OWNERSHIP"))),
    "future non-confirmed Kids products have no plate lock"
  );

  cleanupScratch({ media, product });
});

/* ------------------------------------------------------------------ */
/* 6. Media ownership service                                          */
/* ------------------------------------------------------------------ */

test("one media asset has exactly one owner", () => {
  const scratch = createScratchProduct({ id: "FND-401" });
  const media = mediaRepository.getById(scratch.media.id);
  assert.equal(media.productId, scratch.product.id);

  /* Assigning to another product without confirmation is refused. */
  const other = createScratchProduct({ id: "FND-402" });
  const refused = mediaRepository.assignToProduct(scratch.media.id, other.product.id, null);
  assert.equal(refused, null, "cross-product assignment must be refused without confirmation");

  /* The ownership service enforces the same rule at the command boundary. */
  const check = transferMediaOwnership({
    mediaId: scratch.media.id,
    targetProductId: other.product.id,
    principal: ADMIN,
    confirm: false,
  });
  assert.equal(check.ok, false);
  assert.equal(check.error, "MEDIA_ALREADY_ASSIGNED");

  cleanupScratch(scratch);
  cleanupScratch(other);
});

test("marketing media cannot become product media through the ownership service", () => {
  const marketing = mediaRepository.create({ url: "/library/scratch-marketing-foundation.webp", title: "Scratch marketing" });
  mediaRepository.assignToPlacement(marketing.id, "HERO");
  assert.equal(mediaRepository.getById(marketing.id).scope, "MARKETING");

  const scratch = createScratchProduct({ id: "FND-403" });
  const result = assignMediaToProduct({
    mediaId: marketing.id,
    productId: scratch.product.id,
    principal: ADMIN,
  });
  assert.equal(result.ok, false, "marketing media must never be assigned to a product by accident");
  assert.match(result.error, /marketing/i);

  cleanupScratch(scratch);
  mediaRepository.remove(marketing.id);
});

test("ownership transfer requires admin authorization and explicit confirmation", () => {
  const scratch = createScratchProduct({ id: "FND-404" });
  const target = createScratchProduct({ id: "FND-405" });

  const moved = transferMediaOwnership({
    mediaId: scratch.media.id,
    targetProductId: target.product.id,
    principal: ADMIN,
    confirm: true,
  });
  assert.ok(moved.ok);
  assert.equal(mediaRepository.getById(scratch.media.id).productId, target.product.id);

  cleanupScratch({ ...scratch, media: null });
  cleanupScratch(target);
});

test("duplicate primary is rejected at the write boundary", () => {
  const scratch = createScratchProduct({ id: "FND-406" });
  const second = createScratchMedia();
  mediaRepository.assignToProduct(second.id, scratch.product.id, "COVER", { confirmReassign: true });

  const covers = mediaRepository
    .getProductMedia(scratch.product.id)
    .filter((item) => item.role === "COVER");
  assert.equal(covers.length, 1, "only one cover may stand — the incumbent is demoted");

  mediaRepository.remove(second.id);
  cleanupScratch(scratch);
});

test("a video cannot become the primary image", () => {
  const video = mediaRepository.create({
    url: "/library/scratch-foundation-video.mp4",
    title: "Scratch foundation video",
    type: "VIDEO",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id: "FND-407",
      name: "Foundation Video Product",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Video-primary rejection check.",
      sku: "FND-407-SKU",
      price: 900,
      pricing: { sellingPrice: 900, mrp: 1100 },
      mediaIds: [video.id],
      primaryMediaId: video.id,
      galleryMediaIds: [],
      reviewFlags: [],
    },
    ADMIN
  );
  const result = validateProductForPublish(created.product, {});
  assert.ok(
    result.blocking.some((issue) => issue.code === "PRIMARY_MEDIA_INVALID"),
    "video primary must be rejected"
  );
  mediaRepository.remove(video.id);
  catalogRepository.archiveProduct(created.product.id, ADMIN);
});

/* ------------------------------------------------------------------ */
/* 7. Storefront visibility matrix                                     */
/* ------------------------------------------------------------------ */

test("storefront visibility: DRAFT/SUBMITTED/APPROVED/ARCHIVED invisible, PUBLISHED visible", () => {
  const scratch = createScratchProduct({ id: "FND-501" });
  const id = scratch.product.id;
  const visible = () => getLiveStorefrontProducts().some((product) => product.id === id);

  assert.equal(visible(), false, "DRAFT is invisible");

  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "SUBMITTED is invisible");

  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "APPROVED is invisible");

  assert.ok(commands.publishProduct(id, ADMIN).ok);
  assert.equal(visible(), true, "PUBLISHED is visible");

  assert.ok(commands.archiveProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "ARCHIVED is invisible");

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("PUBLISHED product in an inactive category is invisible", () => {
  const scratch = createScratchProduct({ id: "FND-502", category: "dupattas", subcategory: "Printed Dupatta" });
  const id = scratch.product.id;
  submitApprove(id);

  taxonomyRepository.archiveCategory("dupattas", ADMIN);
  try {
    const result = commands.publishProduct(id, ADMIN);
    assert.ok(result.ok, "publishing into an inactive category is allowed (with warning)");
    assert.equal(
      getLiveStorefrontProducts().some((product) => product.id === id),
      false,
      "PUBLISHED + inactive category must be invisible"
    );
  } finally {
    taxonomyRepository.restoreCategory("dupattas", ADMIN);
  }

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

/* ------------------------------------------------------------------ */
/* 8. Read side effects and explicit migrations                       */
/* ------------------------------------------------------------------ */

test("ordinary reads do not mutate workflow records", () => {
  const capture = () => ({
    products: catalogRepository
      .all()
      .map((p) => `${p.id}|${p.status}|${p.review?.state}|${p.assignedEmployeeId}|${(p.reviewFlags ?? []).join(",")}`)
      .sort(),
    media: mediaRepository
      .getAll()
      .map((m) => `${m.id}|${m.productId ?? ""}|${m.scope}|${m.role ?? ""}`)
      .sort(),
  });

  const before = capture();
  for (let i = 0; i < 3; i += 1) {
    catalogRepository.all();
    mediaRepository.getAll();
    getLiveStorefrontProducts();
  }
  const after = capture();
  assert.deepEqual(after, before, "repeated ordinary reads must not change workflow records");
});

test("the explicit migration entry point is idempotent and safe", () => {
  const first = runExplicitMigrations();

  const second = runExplicitMigrations();

  assert.equal(second.productCount, first.productCount);
  /* The 21 CONFIRMED identities are always present; scratch KID records in
     this file may add extra KID-xxx rows, so count the confirmed set. */
  KIDS_PRODUCT_IDS.forEach((id) => {
    assert.ok(catalogRepository.find(id), `${id} present after explicit migration`);
  });
  assert.ok(first.kidsDrafts >= 21);
  assert.equal(typeof first.reconciliation.totalMediaGroups, "number");
});
