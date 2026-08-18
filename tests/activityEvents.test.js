/**
 * PRATIKSHYA FASHON — Phase 3E activity event tests.
 *
 *   ONE USER ACTION → ONE CANONICAL COMMAND → ONE APPROPRIATE ACTIVITY EVENT
 *
 * Phase 3E fixed two duplicate-event classes:
 *
 *   1. Every lifecycle command (submit / approve / return / publish /
 *      archive / restore / unpublish) records its OWN lifecycle event, but
 *      the repository writer used to add a generic PRODUCT_EDITED beside it.
 *      The commands now pass `{ activity: null }` so the writer stays quiet.
 *
 *   2. A Product ID rename logged PRODUCT_RENAMED_ID twice — once in the
 *      repository persistence primitive and once in the canonical workflow
 *      command that owns the rename. The primitive no longer logs; the
 *      command layer is the single producer.
 *
 * Field-level facts (price change, variant change) are NOT lifecycle events
 * and still come from the writer — they describe the data, not the action.
 *
 * Historical events are never rewritten: these tests only assert on events
 * recorded AFTER their own marker.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository, { PRODUCT_STATUS } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { changeProductId } from "../src/services/productWorkflow.js";
import { nextCanonicalProductId } from "../src/config/productIdPrefixes.js";
import {
  assignMediaToProduct,
  transferMediaOwnership,
  unassignMediaFromProduct,
} from "../src/services/media/mediaOwnershipService.js";
import { loadActivity, ACTIVITY_ACTIONS } from "../src/services/employees/activityService.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

beforeEach(() => {
  setupCanonicalState();
});

afterEach(() => {
  setupCanonicalState();
});

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const EMPLOYEE_ID = "PF-MGR-00008";

let scratchCounter = 0;

const createScratch = () => {
  scratchCounter += 1;
  const created = catalogRepository.createDraftProduct(
    {
      name: `Activity Events Scratch Piece ${scratchCounter}`,
      department: "women",
      category: "essentials",
      subcategory: "dupattas-stoles",
      description: "Scratch product for the Phase 3E activity event tests.",
      sku: `ACTIVITY-${String(scratchCounter).padStart(3, "0")}-SKU`,
      price: 1500,
      compareAtPrice: 1900,
      pricing: { sellingPrice: 1500, mrp: 1900 },
      stock: 3,
      availability: "in-stock",
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(created.ok, `scratch product must be created: ${created.error ?? ""}`);
  const id = created.product.id;
  const media = mediaRepository.create({
    url: `/images/products/.test/${id}/primary.webp`,
    title: "Activity events scratch",
    status: "ACTIVE",
  });
  assert.ok(
    assignMediaToProduct({ mediaId: media.id, productId: id, principal: ADMIN, actor: ADMIN }).ok
  );
  return { media, product: catalogRepository.find(id) };
};

const cleanup = ({ media, product }) => {
  const current = catalogRepository.find(product.id);
  if (current && current.status !== PRODUCT_STATUS.ARCHIVED) {
    catalogRepository.archiveProduct(product.id, ADMIN);
  }
  if (media) mediaRepository.remove(media.id);
};

/** Marker + diff: only the events recorded during the measured action. */
const marker = () => new Set(loadActivity().map((entry) => entry.id));
const eventsSince = (mark) => loadActivity().filter((entry) => !mark.has(entry.id));

/** Lifecycle event actions — the vocabulary the "one event" rule covers. */
const LIFECYCLE_ACTIONS = new Set([
  ACTIVITY_ACTIONS.PRODUCT_DRAFT_CREATED,
  ACTIVITY_ACTIONS.PRODUCT_CREATED,
  ACTIVITY_ACTIONS.PRODUCT_EDITED,
  ACTIVITY_ACTIONS.PRODUCT_UPDATED,
  ACTIVITY_ACTIONS.PRODUCT_ASSIGNED,
  ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW,
  ACTIVITY_ACTIONS.PRODUCT_SUBMITTED,
  ACTIVITY_ACTIONS.PRODUCT_APPROVED,
  ACTIVITY_ACTIONS.PRODUCT_REJECTED,
  ACTIVITY_ACTIONS.PRODUCT_PUBLISHED,
  ACTIVITY_ACTIONS.PRODUCT_UNPUBLISHED,
  ACTIVITY_ACTIONS.PRODUCT_ARCHIVED,
  ACTIVITY_ACTIONS.PRODUCT_RESTORED,
  ACTIVITY_ACTIONS.PRODUCT_RENAMED_ID,
  ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED,
  ACTIVITY_ACTIONS.PRODUCT_MEDIA_UNASSIGNED,
]);

const lifecycleEvents = (events) => events.filter((entry) => LIFECYCLE_ACTIONS.has(entry.action));

const assertOneLifecycleEvent = (events, expectedAction, label) => {
  const relevant = lifecycleEvents(events);
  assert.equal(
    relevant.length,
    1,
    `${label} must record exactly ONE lifecycle event, got: ${relevant
      .map((entry) => entry.action)
      .join(", ") || "none"}`
  );
  assert.equal(relevant[0].action, expectedAction, `${label} records ${expectedAction}`);
};

/* ================================================================== */
/* 17. Rename → one event                                             */
/* ================================================================== */

test("17. renaming a Product ID records exactly one PRODUCT_RENAMED_ID event", () => {
  const scratch = createScratch();
  const oldId = scratch.product.id;
  const newId = nextCanonicalProductId(
    catalogRepository.all(),
    scratch.product.department,
    scratch.product.category,
    scratch.product.subcategory
  );

  const mark = marker();
  const result = changeProductId(oldId, newId, ADMIN);
  assert.ok(result.ok, result.error);

  const events = eventsSince(mark);
  const renames = events.filter((entry) => entry.action === ACTIVITY_ACTIONS.PRODUCT_RENAMED_ID);
  assert.equal(renames.length, 1, "exactly one rename event — the known double-log is fixed");
  /* The rename moves media ownership through the canonical service; those
     PRODUCT_MEDIA_TRANSFERRED entries describe the ownership move the rename
     command performs — but no generic PRODUCT_EDITED may appear. */
  assert.equal(
    events.filter((entry) => entry.action === ACTIVITY_ACTIONS.PRODUCT_EDITED).length,
    0,
    "no generic edit event beside the rename"
  );

  cleanup({ media: scratch.media, product: catalogRepository.find(newId) });
});

/* ================================================================== */
/* 18. Approve → one event                                            */
/* ================================================================== */

test("18. approving records exactly one PRODUCT_APPROVED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  const mark = marker();
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_APPROVED, "approve");

  cleanup(scratch);
});

/* ================================================================== */
/* 19. Return → one event                                             */
/* ================================================================== */

test("19. returning records exactly one PRODUCT_REJECTED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);

  const mark = marker();
  assert.ok(commands.returnProduct(id, "Needs a better description.", ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_REJECTED, "return");

  cleanup(scratch);
});

/* ================================================================== */
/* 20. Publish → one event                                            */
/* ================================================================== */

test("20. publishing records exactly one PRODUCT_PUBLISHED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.ok(commands.approveProduct(id, ADMIN).ok);

  const mark = marker();
  assert.ok(commands.publishProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_PUBLISHED, "publish");

  cleanup(scratch);
});

/* ================================================================== */
/* 21. Archive → one event (and restore / unpublish likewise)         */
/* ================================================================== */

test("21. archiving records exactly one PRODUCT_ARCHIVED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const mark = marker();
  assert.ok(commands.archiveProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_ARCHIVED, "archive");

  /* Restore is the mirror action — same rule. */
  const restoreMark = marker();
  assert.ok(commands.restoreProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(restoreMark), ACTIVITY_ACTIONS.PRODUCT_RESTORED, "restore");

  cleanup(scratch);
});

test("21b. unpublishing records exactly one PRODUCT_UNPUBLISHED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.ok(commands.publishProduct(id, ADMIN).ok);

  const mark = marker();
  assert.ok(commands.unpublishProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_UNPUBLISHED, "unpublish");

  cleanup(scratch);
});

/* ================================================================== */
/* 22. Assign → one event                                             */
/* ================================================================== */

test("22. assigning records exactly one PRODUCT_ASSIGNED event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const mark = marker();
  assert.ok(commands.assignProduct(id, EMPLOYEE_ID, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(mark), ACTIVITY_ACTIONS.PRODUCT_ASSIGNED, "assign");

  /* Unassign follows the same rule. */
  const unassignMark = marker();
  assert.ok(commands.assignProduct(id, null, ADMIN).ok);
  assertOneLifecycleEvent(eventsSince(unassignMark), ACTIVITY_ACTIONS.PRODUCT_ASSIGNED, "unassign");

  cleanup(scratch);
});

/* ================================================================== */
/* 23. Submit → one event                                             */
/* ================================================================== */

test("23. submitting records exactly one PRODUCT_SUBMITTED_FOR_REVIEW event", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const mark = marker();
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assertOneLifecycleEvent(
    eventsSince(mark),
    ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW,
    "submit"
  );

  cleanup(scratch);
});

/* ================================================================== */
/* 24. Media transfer → one appropriate event                         */
/* ================================================================== */

test("24. a media ownership transfer records exactly one PRODUCT_MEDIA_TRANSFERRED event", () => {
  const a = createScratch();
  const b = createScratch();

  /* Point the source product's catalogue plate at the media so the strip
     path (the historical double-log source) runs during the transfer. */
  catalogRepository.updateDraft(a.product.id, { image: a.media.url }, ADMIN);

  const mark = marker();
  const moved = transferMediaOwnership({
    mediaId: a.media.id,
    targetProductId: b.product.id,
    principal: ADMIN,
    confirm: true,
    actor: ADMIN,
  });
  assert.ok(moved.ok, moved.error);
  assert.ok(moved.previousOwnerStripped, "the strip path ran");

  const events = eventsSince(mark);
  assertOneLifecycleEvent(events, ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED, "media transfer");

  /* Unassign likewise: one PRODUCT_MEDIA_UNASSIGNED, no PRODUCT_EDITED. */
  const unassignMark = marker();
  const detached = unassignMediaFromProduct({ mediaId: a.media.id, principal: ADMIN, actor: ADMIN });
  assert.ok(detached.ok);
  const unassignEvents = eventsSince(unassignMark);
  if (!detached.alreadyUnassigned) {
    assertOneLifecycleEvent(
      unassignEvents,
      ACTIVITY_ACTIONS.PRODUCT_MEDIA_UNASSIGNED,
      "media unassign"
    );
  }

  cleanup(a);
  cleanup(b);
});

/* ================================================================== */
/* Producer discipline                                                */
/* ================================================================== */

test("field-level facts still log (price change is a data fact, not a lifecycle duplicate)", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const mark = marker();
  assert.ok(
    catalogRepository.updateDraft(
      id,
      { price: 1800, pricing: { sellingPrice: 1800, mrp: 2100 } },
      ADMIN
    ).ok
  );
  const events = eventsSince(mark);
  assert.ok(
    events.some((entry) => entry.action === ACTIVITY_ACTIONS.PRODUCT_PRICE_CHANGED),
    "the price change fact is recorded"
  );
  assert.ok(
    events.some((entry) => entry.action === ACTIVITY_ACTIONS.PRODUCT_UPDATED),
    "the edit action is recorded once as PRODUCT_UPDATED"
  );
  assert.equal(
    events.filter((entry) => entry.action === ACTIVITY_ACTIONS.PRODUCT_EDITED).length,
    0,
    "no generic PRODUCT_EDITED beside the explicit PRODUCT_UPDATED"
  );

  cleanup(scratch);
});

test("historical activity remains readable — markers never rewrite old entries", () => {
  const before = loadActivity();
  assert.ok(Array.isArray(before), "the diary loads");

  const scratch = createScratch();
  assert.ok(commands.submitProduct(scratch.product.id, ADMIN).ok);

  const after = loadActivity();
  /* Every pre-existing entry is still present, byte-identical. */
  const afterById = new Map(after.map((entry) => [entry.id, entry]));
  before.slice(0, 50).forEach((entry) => {
    const kept = afterById.get(entry.id);
    if (kept) {
      assert.deepEqual(kept, entry, "an old entry is never rewritten");
    }
    /* Entries can age out of the 200-entry window; that is retention,
       not rewriting. */
  });

  cleanup(scratch);
});
