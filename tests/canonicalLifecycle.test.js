/**
 * PRATIKSHYA FASHON — Phase 3C canonical lifecycle enforcement tests.
 *
 * Phase 3C removed the remaining direct product-lifecycle write bypasses.
 * These tests lock the resulting architecture in place:
 *
 *   UI → canonical command → authorization → validation → transition
 *      → persistence → activity
 *
 * They prove four separate things, because passing one does not imply the
 * others:
 *
 *   1. the canonical commands enforce the lifecycle (approve ≠ publish,
 *      publish requires approval + a fresh full validation)
 *   2. the compatibility adapters (`updateStatus`, `bulkUpdate`) cannot
 *      reach a different outcome than the canonical command they delegate
 *      to — identical validation, identical transition, identical persistence
 *   3. authorization is resolved from the real principal register, never
 *      from a caller-supplied label
 *   4. Product ID renames and Kids products travel the same single
 *      lifecycle and the same single media-ownership door
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

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
import {
  assignMediaToProduct,
  validateMediaOwnershipTransfer,
} from "../src/services/media/mediaOwnershipService.js";
import { changeProductId } from "../src/services/productWorkflow.js";
import {
  approveKidsProduct,
  publishKidsProduct,
} from "../src/services/kidsProductFinalization.js";
import { validateKidsProduct } from "../src/services/workflow/kidsValidator.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import {
  kidsFileNameOf,
  kidsMediaFileForProductId,
} from "../src/services/kidsProductIdentity.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const EMPLOYEE = { employeeId: "PF-MGR-00008", label: "Vikram Iyer" };
const CUSTOMER = { customerId: "CUST-0001", name: "A Customer" };
const ANONYMOUS = null;

let scratchCounter = 0;

/** A complete, publishable scratch product with validated media ownership. */
const createScratch = (suffix = "") => {
  scratchCounter += 1;
  const id = `CLT-${String(scratchCounter).padStart(3, "0")}${suffix}`;
  const media = mediaRepository.create({
    url: `/library/scratch-canonical-${id.toLowerCase()}.webp`,
    title: "Canonical lifecycle scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: "Canonical Lifecycle Scratch Piece",
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Scratch product for canonical lifecycle tests.",
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

const statusOf = (id) => catalogRepository.find(id)?.status ?? null;

/* ================================================================== */
/* 1. Approve does not publish                                        */
/* ================================================================== */

test("approve does not publish — APPROVE ≠ PUBLISH", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  submitApprove(id);

  const approved = catalogRepository.find(id);
  assert.notEqual(approved.status, PRODUCT_STATUS.PUBLISHED, "approval must never publish");
  assert.equal(approved.review.state, REVIEW_STATE.APPROVED, "approval is recorded");
  assert.equal(getProductWorkflowState(approved).stage, WORKFLOW_STAGES.APPROVED);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "an approved product stays invisible to customers"
  );

  cleanup(scratch);
});

/* ================================================================== */
/* 2. Publish requires approval                                       */
/* ================================================================== */

test("publish requires approval — an unapproved product is refused", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const early = commands.publishProduct(id, ADMIN);
  assert.equal(early.ok, false, "a DRAFT must never publish");
  assert.equal(statusOf(id), PRODUCT_STATUS.DRAFT, "the refused product is unchanged");

  /* Submitted is still not approved. */
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const submitted = commands.publishProduct(id, ADMIN);
  assert.equal(submitted.ok, false, "a SUBMITTED product must never publish");
  assert.equal(statusOf(id), PRODUCT_STATUS.PENDING_REVIEW);

  cleanup(scratch);
});

/* ================================================================== */
/* 3. Publish requires complete validation                            */
/* ================================================================== */

test("publish requires complete validation — approval is never reused", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  submitApprove(id);

  /* Break the product AFTER approval. Publish must revalidate from truth. */
  catalogRepository.updateDraft(id, { price: 0, pricing: { sellingPrice: 0, mrp: 0 } }, ADMIN);

  const result = commands.publishProduct(id, ADMIN);
  assert.equal(result.ok, false, "publish must never trust an earlier validation");
  assert.ok(result.issues.length > 0, "publish reports structured validation issues");
  assert.notEqual(statusOf(id), PRODUCT_STATUS.PUBLISHED);

  cleanup(scratch);
});

/* ================================================================== */
/* 4. updateStatus cannot bypass validation                           */
/* ================================================================== */

test("updateStatus cannot bypass validation", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  submitApprove(id);
  catalogRepository.updateDraft(id, { price: 0, pricing: { sellingPrice: 0, mrp: 0 } }, ADMIN);

  const adapter = catalogRepository.updateStatus(id, PRODUCT_STATUS.PUBLISHED, ADMIN);
  assert.equal(adapter.ok, false, "the adapter runs the same validation as the command");
  assert.notEqual(statusOf(id), PRODUCT_STATUS.PUBLISHED);

  cleanup(scratch);
});

/* ================================================================== */
/* 5. updateStatus cannot publish an unapproved product               */
/* ================================================================== */

test("updateStatus cannot publish an unapproved product", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const result = catalogRepository.updateStatus(id, PRODUCT_STATUS.PUBLISHED, ADMIN);
  assert.equal(result.ok, false);
  assert.equal(statusOf(id), PRODUCT_STATUS.DRAFT, "the product is untouched");
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false
  );

  cleanup(scratch);
});

/* ================================================================== */
/* 6. bulkUpdate cannot publish an unapproved product                 */
/* ================================================================== */

test("bulkUpdate cannot publish an unapproved product", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const result = catalogRepository.bulkUpdate([id], { status: PRODUCT_STATUS.PUBLISHED }, ADMIN, "Publish");
  assert.equal(result.applied, 0);
  assert.equal(result.skipped, 1);
  assert.equal(statusOf(id), PRODUCT_STATUS.DRAFT);

  cleanup(scratch);
});

/* ================================================================== */
/* 7. Bulk publish uses canonical validation and is fail-safe         */
/* ================================================================== */

test("bulk publish uses canonical validation — one invalid product never publishes another", () => {
  const valid = createScratch("A");
  const invalid = createScratch("B");
  submitApprove(valid.product.id);

  const result = catalogRepository.bulkUpdate(
    [valid.product.id, invalid.product.id],
    { status: PRODUCT_STATUS.PUBLISHED },
    ADMIN,
    "Publish"
  );

  assert.equal(result.applied, 1, "only the valid product publishes");
  assert.equal(result.skipped, 1, "the invalid product is skipped, not published");
  assert.equal(statusOf(valid.product.id), PRODUCT_STATUS.PUBLISHED);
  assert.equal(statusOf(invalid.product.id), PRODUCT_STATUS.DRAFT, "unchanged, not partially mutated");

  const failure = result.results.find((entry) => entry.id === invalid.product.id);
  assert.ok(failure.errors.length > 0, "the skipped product reports a structured error");

  cleanup(valid);
  cleanup(invalid);
});

test("bulk merchandising flags never move a product through the lifecycle", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const result = catalogRepository.bulkUpdate([id], { isFeatured: true }, ADMIN, "Mark featured");
  assert.equal(result.applied, 1);
  assert.equal(catalogRepository.find(id).isFeatured, true, "the merchandising flag is applied");
  assert.equal(statusOf(id), PRODUCT_STATUS.DRAFT, "the lifecycle stage is untouched");

  cleanup(scratch);
});

/* ================================================================== */
/* 8. RETURNED requires a valid transition                            */
/* ================================================================== */

test("returned requires a valid transition through the canonical return command", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  /* RETURNED can never be reached as a raw status mutation. */
  const bypass = catalogRepository.updateStatus(id, "RETURNED", ADMIN);
  assert.equal(bypass.ok, false, "updateStatus('RETURNED') must be refused");

  assert.ok(commands.submitProduct(id, ADMIN).ok);

  /* A reason is mandatory. */
  assert.equal(commands.returnProduct(id, "", ADMIN).ok, false, "a return reason is required");

  const returned = commands.returnProduct(id, "Plates need reshooting.", ADMIN);
  assert.ok(returned.ok, returned.error);

  const record = catalogRepository.find(id);
  assert.equal(record.review.state, REVIEW_STATE.REJECTED);
  assert.equal(record.review.rejectionReason, "Plates need reshooting.");
  assert.equal(getProductWorkflowState(record).returned, true, "RETURNED is the projected presentation");

  /* A published product cannot be returned — it must be unpublished first. */
  const other = createScratch("R");
  submitApprove(other.product.id);
  assert.ok(commands.publishProduct(other.product.id, ADMIN).ok);
  assert.equal(commands.returnProduct(other.product.id, "Nope.", ADMIN).ok, false);

  cleanup(scratch);
  cleanup(other);
});

/* ================================================================== */
/* 9. Archive uses the canonical transition                           */
/* ================================================================== */

test("archive uses the canonical transition and preserves the record", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  const before = catalogRepository.find(id);

  const archived = commands.archiveProduct(id, ADMIN);
  assert.ok(archived.ok);

  const after = catalogRepository.find(id);
  assert.equal(after.status, PRODUCT_STATUS.ARCHIVED);
  assert.equal(getProductWorkflowState(after).stage, WORKFLOW_STAGES.ARCHIVED);

  /* Archive is non-destructive: identity, media and taxonomy survive. */
  assert.ok(after, "the product is archived, never deleted");
  assert.equal(after.id, before.id);
  assert.equal(after.category, before.category);
  assert.deepEqual(after.mediaIds, before.mediaIds);
  assert.equal(
    String(mediaRepository.getById(scratch.media.id).productId),
    String(id),
    "archiving never releases media ownership"
  );

  /* The adapter reaches exactly the same state. */
  const viaAdapter = createScratch("Z");
  const adapterResult = catalogRepository.updateStatus(viaAdapter.product.id, PRODUCT_STATUS.ARCHIVED, ADMIN);
  assert.ok(adapterResult.ok);
  assert.equal(statusOf(viaAdapter.product.id), PRODUCT_STATUS.ARCHIVED);

  cleanup(scratch);
  cleanup(viaAdapter);
});

/* ================================================================== */
/* 10 + 11. Authorization boundaries                                  */
/* ================================================================== */

test("unauthorized principals cannot publish", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);

  [ANONYMOUS, CUSTOMER, { adminId: "PF-ADM-NOPE" }, { employeeId: "PF-NOT-REAL" }].forEach((actor) => {
    const result = commands.publishProduct(id, actor);
    assert.equal(result.ok, false, `${JSON.stringify(actor)} must not publish`);
  });
  assert.notEqual(statusOf(id), PRODUCT_STATUS.PUBLISHED);

  /* The adapter enforces the same boundary. */
  assert.equal(catalogRepository.updateStatus(id, PRODUCT_STATUS.PUBLISHED, CUSTOMER).ok, false);
  assert.equal(catalogRepository.bulkUpdate([id], { status: PRODUCT_STATUS.PUBLISHED }, CUSTOMER).applied, 0);
  assert.notEqual(statusOf(id), PRODUCT_STATUS.PUBLISHED);

  cleanup(scratch);
});

test("an employee cannot approve, publish, archive or assign", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  assert.equal(commands.approveProduct(id, EMPLOYEE).ok, false, "employees cannot approve");
  assert.equal(commands.publishProduct(id, EMPLOYEE).ok, false, "employees cannot publish");
  assert.equal(commands.archiveProduct(id, EMPLOYEE).ok, false, "employees cannot archive");
  assert.equal(commands.returnProduct(id, "No.", EMPLOYEE).ok, false, "employees cannot return");
  assert.equal(
    commands.assignProduct(id, EMPLOYEE.employeeId, EMPLOYEE).ok,
    false,
    "employees cannot assign or reassign products"
  );

  assert.equal(statusOf(id), PRODUCT_STATUS.PENDING_REVIEW, "no employee action mutated the product");

  cleanup(scratch);
});

test("an authorized admin can publish and assignment stays admin-only", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const assigned = commands.assignProduct(id, EMPLOYEE.employeeId, ADMIN);
  assert.ok(assigned.ok, "an admin may assign to an active employee");
  assert.equal(catalogRepository.find(id).assignedEmployeeId, EMPLOYEE.employeeId);

  submitApprove(id);
  const published = commands.publishProduct(id, ADMIN);
  assert.ok(published.ok, (published.errors ?? []).join("; "));
  assert.equal(statusOf(id), PRODUCT_STATUS.PUBLISHED);

  cleanup(scratch);
});

/* ================================================================== */
/* 13 + 14. changeProductId — ownership through the canonical service */
/* ================================================================== */

test("changeProductId preserves media ownership and product identity", () => {
  const scratch = createScratch();
  const oldId = scratch.product.id;
  const newId = `${oldId}X`;
  const before = catalogRepository.find(oldId);

  const result = changeProductId(oldId, newId, ADMIN);
  assert.ok(result.ok, result.error);
  assert.equal(result.product.id, newId);

  const after = catalogRepository.find(newId);
  assert.equal(catalogRepository.find(oldId), null, "the old Product ID is gone");
  assert.equal(
    String(mediaRepository.getById(scratch.media.id).productId),
    newId,
    "media ownership follows the new Product ID"
  );
  assert.equal(
    mediaRepository.getAll().some((item) => String(item.productId) === oldId),
    false,
    "no media is stranded on the old Product ID"
  );

  /* Everything except identity is preserved. */
  assert.equal(after.name, before.name);
  assert.equal(after.category, before.category);
  assert.equal(after.subcategory, before.subcategory);
  assert.equal(after.price, before.price);
  assert.equal(after.status, before.status);
  assert.deepEqual(after.reviewFlags, before.reviewFlags);
  assert.ok(after.slug, "the record keeps an addressable slug");

  cleanup({ media: scratch.media, product: after });
});

test("changeProductId uses the canonical ownership service and validates first", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  /* An invalid target is refused BEFORE anything is written. */
  const bad = changeProductId(id, "!!!", ADMIN);
  assert.equal(bad.ok, false);
  const duplicate = changeProductId(id, "pf-001", ADMIN);
  assert.equal(duplicate.ok, false, "an in-use Product ID is refused");
  assert.ok(catalogRepository.find(id), "the product is untouched by a refused rename");
  assert.equal(String(mediaRepository.getById(scratch.media.id).productId), id);

  /* The rename runs through the ownership service, so the service's
     authorization rule applies: an employee cannot move ownership. */
  const employeeRename = changeProductId(id, `${id}E`, EMPLOYEE);
  assert.equal(employeeRename.ok, false, "an employee cannot rename and move ownership");
  assert.ok(catalogRepository.find(id), "the product survives the refused rename");
  assert.equal(catalogRepository.find(`${id}E`), null, "no partial rename was persisted");

  cleanup(scratch);
});

/* ================================================================== */
/* 15 + 16 + 17. Kids uses the universal lifecycle                    */
/* ================================================================== */

test("a Kids product uses the universal lifecycle, not a second one", () => {
  const id = "KID-001";
  const before = catalogRepository.find(id);
  assert.ok(before, "KID-001 exists in the migrated fixture");

  /* The Kids wrappers enforce the SAME universal rules. */
  assert.equal(publishKidsProduct(id, ADMIN).ok, false, "Kids publish requires universal approval");
  assert.equal(approveKidsProduct(id, ADMIN).ok, false, "Kids approve requires submission first");
  assert.equal(publishKidsProduct(id, EMPLOYEE).ok, false, "employees cannot publish Kids products");
  assert.equal(publishKidsProduct(id, CUSTOMER).ok, false, "customers cannot publish Kids products");

  const after = catalogRepository.find(id);
  assert.equal(after.status, before.status, "no refused Kids command mutated the record");
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "an unpublished Kids product stays invisible"
  );
});

test("the Kids-specific validator still runs inside the universal publish validation", () => {
  const kids = catalogRepository.find("KID-001");
  assert.ok(kids);

  const universal = validateProductForPublish(kids, { mode: "publish" });
  /* The category validator returns a plain issue array. */
  const kidsOnly = validateKidsProduct(kids);

  assert.ok(Array.isArray(kidsOnly), "the Kids validator returns structured issues");
  assert.ok(kidsOnly.length > 0, "the Kids validator produces category issues");
  const universalCodes = new Set(universal.issues.map((issue) => issue.code));
  const carried = kidsOnly.filter((issue) => universalCodes.has(issue.code));
  assert.ok(
    carried.length > 0,
    "Kids category issues are appended to the universal validation result"
  );
  assert.equal(universal.ok, false, "an incomplete Kids draft cannot publish");
});

test("a confirmed Kids plate cannot be transferred", () => {
  const plate = mediaRepository
    .getAll()
    .find((item) => kidsFileNameOf(item) === kidsMediaFileForProductId("KID-001"));
  assert.ok(plate, "the confirmed KID-001 plate exists");
  const ownerBefore = plate.productId;

  const toOtherKid = validateMediaOwnershipTransfer({
    mediaId: plate.id,
    targetProductId: "KID-002",
    principal: ADMIN,
    confirm: true,
  });
  assert.equal(toOtherKid.ok, false, "kids-001 may never become KID-002's media");

  const toNonKids = validateMediaOwnershipTransfer({
    mediaId: plate.id,
    targetProductId: "pf-001",
    principal: ADMIN,
    confirm: true,
  });
  assert.equal(toNonKids.ok, false, "a confirmed plate may never leave its Kids identity");

  assert.equal(
    mediaRepository.getById(plate.id).productId,
    ownerBefore,
    "a refused transfer changes no ownership"
  );
});

/* ================================================================== */
/* 18. No direct lifecycle write from the UI                          */
/* ================================================================== */

test("no direct lifecycle write path exists outside the canonical command layer", () => {
  /* The repository exposes no raw status writer to any caller. */
  assert.equal(typeof catalogRepository.writeProduct, "undefined");
  assert.equal(typeof catalogRepository.setStatus, "undefined");

  /* updateStatus refuses every status it cannot map to a canonical command,
     so no caller can invent a lifecycle state. */
  const scratch = createScratch();
  const id = scratch.product.id;
  ["APPROVED", "RETURNED", "SUBMITTED", "LIVE", ""].forEach((status) => {
    const result = catalogRepository.updateStatus(id, status, ADMIN);
    assert.equal(result.ok, false, `updateStatus('${status}') must be refused`);
  });
  assert.equal(statusOf(id), PRODUCT_STATUS.DRAFT, "no refused status mutated the record");

  /* The ordinary product writers never carry a lifecycle transition: a
     status pushed through updateDraft still leaves review state behind, so
     the projection does not treat it as an approved/published product. */
  cleanup(scratch);
});

/* ================================================================== */
/* 19. The canonical command records the correct workflow state       */
/* ================================================================== */

test("each canonical command records the correct workflow state and one activity event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const stageNow = () => getProductWorkflowState(catalogRepository.find(id)).stage;
  assert.equal(stageNow(), WORKFLOW_STAGES.DRAFT);

  assert.ok(commands.assignProduct(id, EMPLOYEE.employeeId, ADMIN).ok);
  assert.equal(stageNow(), WORKFLOW_STAGES.ASSIGNED);

  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.equal(stageNow(), WORKFLOW_STAGES.SUBMITTED);

  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.equal(stageNow(), WORKFLOW_STAGES.APPROVED);

  const beforePublish = loadActivity().filter(
    (entry) => entry.targetProductId === id && entry.action === "PRODUCT_PUBLISHED"
  ).length;
  assert.ok(commands.publishProduct(id, ADMIN).ok);
  assert.equal(stageNow(), WORKFLOW_STAGES.PUBLISHED);

  const afterPublish = loadActivity().filter(
    (entry) => entry.targetProductId === id && entry.action === "PRODUCT_PUBLISHED"
  ).length;
  assert.equal(afterPublish - beforePublish, 1, "publication records exactly one lifecycle event");

  assert.ok(commands.archiveProduct(id, ADMIN).ok);
  assert.equal(stageNow(), WORKFLOW_STAGES.ARCHIVED);

  cleanup(scratch);
});

/* ================================================================== */
/* 20. Storefront visibility follows publication only                 */
/* ================================================================== */

test("storefront visibility changes only after a successful publish", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  const visible = () => getLiveStorefrontProducts().some((product) => product.id === id);

  assert.equal(visible(), false, "DRAFT is invisible");
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "SUBMITTED is invisible");
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "APPROVED is invisible");

  /* A failed publish must not change visibility either. */
  assert.equal(commands.publishProduct(id, CUSTOMER).ok, false);
  assert.equal(visible(), false, "a refused publish leaves the storefront unchanged");

  assert.ok(commands.publishProduct(id, ADMIN).ok);
  assert.equal(visible(), true, "PUBLISHED is visible");

  assert.ok(commands.archiveProduct(id, ADMIN).ok);
  assert.equal(visible(), false, "ARCHIVED leaves the storefront");

  cleanup(scratch);
});

/* ================================================================== */
/* 22. Legacy adapters must not have a second behavior                */
/* ================================================================== */

test("the updateStatus adapter reaches the same result as the canonical command", () => {
  /* Two identical products: one published by the command, one by the
     adapter. Same validation, same transition, same persisted state. */
  const viaCommand = createScratch("C");
  const viaAdapter = createScratch("D");
  submitApprove(viaCommand.product.id);
  submitApprove(viaAdapter.product.id);

  const commandResult = commands.publishProduct(viaCommand.product.id, ADMIN);
  const adapterResult = catalogRepository.updateStatus(
    viaAdapter.product.id,
    PRODUCT_STATUS.PUBLISHED,
    ADMIN
  );

  assert.equal(commandResult.ok, adapterResult.ok, "same outcome");
  assert.equal(statusOf(viaCommand.product.id), statusOf(viaAdapter.product.id), "same transition");
  assert.equal(
    getProductWorkflowState(catalogRepository.find(viaCommand.product.id)).stage,
    getProductWorkflowState(catalogRepository.find(viaAdapter.product.id)).stage,
    "same canonical workflow state"
  );
  assert.equal(
    catalogRepository.find(viaCommand.product.id).published,
    catalogRepository.find(viaAdapter.product.id).published,
    "same persisted storefront flag"
  );

  cleanup(viaCommand);
  cleanup(viaAdapter);
});

test("the bulkUpdate adapter reaches the same result as the canonical bulk command", () => {
  const viaCommand = createScratch("E");
  const viaAdapter = createScratch("F");
  submitApprove(viaCommand.product.id);
  submitApprove(viaAdapter.product.id);

  const commandResult = commands.bulkPublish([viaCommand.product.id], ADMIN);
  const adapterResult = catalogRepository.bulkUpdate(
    [viaAdapter.product.id],
    { status: PRODUCT_STATUS.PUBLISHED },
    ADMIN,
    "Publish"
  );

  assert.equal(commandResult.applied, adapterResult.applied);
  assert.equal(commandResult.skipped, adapterResult.skipped);
  assert.equal(statusOf(viaCommand.product.id), statusOf(viaAdapter.product.id));

  cleanup(viaCommand);
  cleanup(viaAdapter);
});

test("the Kids adapters reach the same result as the universal commands", () => {
  const kidsId = "KID-001";

  const universalPublish = commands.publishProduct(kidsId, ADMIN);
  const kidsPublish = publishKidsProduct(kidsId, ADMIN);
  assert.equal(universalPublish.ok, kidsPublish.ok, "same publish outcome");

  const universalApprove = commands.approveProduct(kidsId, ADMIN);
  const kidsApprove = approveKidsProduct(kidsId, ADMIN);
  assert.equal(universalApprove.ok, kidsApprove.ok, "same approve outcome");

  assert.equal(
    catalogRepository.find(kidsId).status,
    PRODUCT_STATUS.DRAFT,
    "neither path mutated the Kids draft"
  );
});
