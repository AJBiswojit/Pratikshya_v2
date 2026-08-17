/**
 * PRATIKSHYA FASHON — Phase 22.1 Kids reconciliation tests.
 *
 * Locks the Kids catalogue finish-line in place:
 *
 *   · the 21 Kids media assets have one deterministic KID draft each, with
 *     metadata hydrated from the existing published owner (never guessed
 *     from images)
 *   · filename grouping keeps 21 standalone groups — no visual merging
 *   · the five reconciliation decisions behave exactly as specified and
 *     are logged in the shared activity diary
 *   · publish validation blocks drafts with unresolved flags, conflicts
 *     and group decisions
 *   · only PUBLISHED Kids products reach the storefront
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { buildMediaGroups } from "../src/services/media/mediaGroups.js";
import {
  KIDS_CONFLICT_ACTIONS,
  approveProduct,
  clearReviewFlags,
  flagsSatisfiedByProduct,
  getKidsReconciliationRows,
  getWorkflowMetrics,
  isReadyToPublish,
  publishProduct,
  reconcileKidsConflict,
  submitProductForReview,
} from "../src/services/productWorkflow.js";
import {
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  ensureKidsDraftRecords,
  kidsDraftRecords,
} from "../src/services/productDraftMigration.js";
import {
  GROUP_DECISIONS,
  createGroup,
  resetGroups,
  setGroupDecision,
} from "../src/services/media/productMediaGroups.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import {
  REVIEW_FLAGS,
  blockingReviewFlags,
  isPlaceholderProductName,
} from "../src/services/productReviewFlags.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const fileOf = (source) =>
  source?.fileName ||
  source?.currentFilename ||
  (source?.src || source?.url || "").split("/").pop() ||
  source?.id ||
  null;

const mediaByFile = (fileName) =>
  mediaRepository
    .getAll()
    .find((item) => fileOf(item)?.toLowerCase() === fileName.toLowerCase());

/* ------------------------------------------------------------------ */
/* 1. Inventory & deterministic grouping                               */
/* ------------------------------------------------------------------ */


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("21 kids assets → 21 deterministic standalone groups, never merged", () => {
  const kidsMedia = mediaRepository
    .getAll()
    .filter((item) => /^kids-\d{3}\.\w+$/i.test(fileOf(item)));
  assert.equal(kidsMedia.length, 21);

  const groups = buildMediaGroups(
    kidsMedia.map((item) => ({ ...item, fileName: fileOf(item) }))
  );
  assert.equal(groups.length, 21, "each asset keeps its own group");
  assert.ok(groups.every((group) => !group.isGrouped), "no filename-driven multi-view merge");
  assert.ok(groups.every((group) => group.isStandalone));

  /* Different files must never share a groupKey — similar is not same. */
  const keys = new Set(groups.map((group) => group.groupKey));
  assert.equal(keys.size, 21);
});

test("kids reconciliation rows expose the full review state", () => {
  const rows = getKidsReconciliationRows();
  assert.equal(rows.length, 21);
  rows.forEach((row) => {
    assert.match(row.product.id, /^KID-\d{3}$/);
    assert.equal(row.product.status, "DRAFT");
    assert.equal(row.conflicts.length, 1, "every kids asset is contested by its existing owner");
    assert.equal(row.conflicts[0].reason, "MEDIA_ALREADY_ASSIGNED");
    assert.ok(row.blockers.includes(REVIEW_FLAGS.CONFLICT_UNRESOLVED));
    assert.equal(row.ready, false);
    assert.ok(row.issues.length > 0);
  });
});

test("hydrated metadata comes from the owning published product — never a guess", () => {
  KIDS_MEDIA_FILENAMES.forEach((fileName, index) => {
    const media = mediaByFile(fileName);
    const owner = catalogRepository.find(media.productId);
    const draft = catalogRepository.find(KIDS_PRODUCT_IDS[index]);
    assert.equal(owner.status, "PUBLISHED");
    assert.equal(owner.category, "kidswear");
    /* Name, subcategory and price are copied from the explicit mapping. */
    assert.equal(draft.name, owner.name);
    assert.equal(draft.subcategory, owner.subcategory);
    assert.equal(Number(draft.price), Number(owner.price));
    assert.ok(Number(draft.price) > 0, "hydrated drafts carry a realistic editable price");
    assert.ok(!isPlaceholderProductName(draft.name), "names are real catalogue metadata");
  });
});

test("v1 placeholder drafts are upgraded by the v2 migration — human edits survive", () => {
  const owner = catalogRepository.find("pf-079");
  const media = mediaByFile(KIDS_MEDIA_FILENAMES[0]);

  const upgraded = ensureKidsDraftRecords([
    owner,
    {
      id: "KID-001",
      productId: "KID-001",
      name: "Untitled Kids Product",
      category: "kidswear",
      price: 0,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      status: "DRAFT",
      reviewFlags: [REVIEW_FLAGS.KIDS_MIGRATION_REVIEW],
    },
  ]);

  const draft = upgraded.find((record) => record.id === "KID-001");
  assert.equal(draft.name, owner.name, "placeholder name is hydrated");
  assert.equal(Number(draft.price), Number(owner.price), "placeholder price is hydrated");
  assert.ok(!draft.reviewFlags.includes(REVIEW_FLAGS.KIDS_MIGRATION_REVIEW));
  assert.ok(draft.reviewFlags.includes(REVIEW_FLAGS.CONFLICT_UNRESOLVED));

  /* A human-edited name is never overwritten. */
  const humanEdited = ensureKidsDraftRecords([
    owner,
    {
      ...draft,
      name: "Human-curated Kids Name",
      price: 777,
    },
  ]).find((record) => record.id === "KID-001");
  assert.equal(humanEdited.name, "Human-curated Kids Name");
  assert.equal(Number(humanEdited.price), 777);

  /* No owner metadata → safe fallback name + review flags, never a guess. */
  const fallback = kidsDraftRecords([]).find((record) => record.id === "KID-001");
  /* Phase 22.2 renamed the safe fallback; both spellings stay placeholders. */
  assert.equal(fallback.name, "Kids Product · KID-001");
  assert.ok(isPlaceholderProductName(fallback.name));
  assert.ok(isPlaceholderProductName("Kids Piece · KID-001"));
  assert.ok(fallback.reviewFlags.includes(REVIEW_FLAGS.NAME_REVIEW_REQUIRED));
  assert.ok(fallback.reviewFlags.includes(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED));
  assert.ok(fallback.reviewFlags.includes(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED));
  assert.equal(fallback.price, 0);
});

/* ------------------------------------------------------------------ */
/* 2. Reconciliation decisions (scratch data — the real catalogue is    */
/*    never touched)                                                   */
/* ------------------------------------------------------------------ */

let pairCounter = 0;
const createConflictPair = () => {
  pairCounter += 1;
  const n = String(pairCounter).padStart(2, "0");
  const media = mediaRepository.create({
    url: `/library/scratch-kids-recon-${n}.webp`,
    title: `Scratch kids reconciliation ${n}`,
    status: "ACTIVE",
  });
  const owner = catalogRepository.upsert(
    {
      id: `pf-recon-${n}`,
      name: `Scratch Published Kids ${n}`,
      category: "kidswear",
      subcategory: "Boys Casual Set",
      price: 800,
      pricing: { sellingPrice: 800, mrp: 1000 },
      description: "Scratch owner for reconciliation tests.",
      image: media.url,
      status: "PUBLISHED",
    },
    ADMIN
  );
  assert.ok(assignMediaToProduct({
    mediaId: media.id,
    productId: owner.id,
    principal: ADMIN,
    actor: ADMIN,
  }).ok);
  const draft = catalogRepository.createDraftProduct(
    {
      id: `KID-9${n}`,
      name: "Scratch Reconciliation Draft",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      price: 950,
      pricing: { sellingPrice: 950, mrp: 1200 },
      compareAtPrice: 1200,
      description: "Scratch draft for reconciliation tests.",
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      stock: 5,
      reviewFlags: [REVIEW_FLAGS.CONFLICT_UNRESOLVED],
    },
    ADMIN
  );
  return { media, owner, draft: draft.product };
};

const cleanupPair = ({ media, owner, draft }) => {
  catalogRepository.archiveProduct(owner.id, ADMIN);
  catalogRepository.archiveProduct(draft.id, ADMIN);
  mediaRepository.remove(media.id);
};

test("KEEP EXISTING — ownership stays, the draft retires", () => {
  const pair = createConflictPair();
  const result = reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.KEEP_EXISTING, ADMIN);
  assert.ok(result.ok);
  assert.equal(result.archivedDraft, pair.draft.id);

  const media = mediaRepository.getById(pair.media.id);
  assert.equal(media.productId, pair.owner.id, "media ownership is untouched");
  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(draft.status, "ARCHIVED");
  assert.equal((draft.mediaIds ?? []).length, 0, "claims are cleared");
  const owner = catalogRepository.find(pair.owner.id);
  assert.equal(owner.status, "PUBLISHED", "the existing product keeps serving the storefront");

  assert.ok(
    loadActivity().some(
      (entry) =>
        entry.action === "PRODUCT_CONFLICT_RESOLVED" &&
        entry.summary.includes("KEEP_EXISTING")
    ),
    "decision logged in the shared diary"
  );
  cleanupPair({ ...pair, draft: catalogRepository.find(pair.draft.id) });
});

test("TRANSFER — media moves to the KID product, the empty owner retires", () => {
  const pair = createConflictPair();
  const result = reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.TRANSFER, ADMIN);
  assert.ok(result.ok);
  assert.deepEqual(result.archivedOwners, [pair.owner.id]);

  const media = mediaRepository.getById(pair.media.id);
  assert.equal(media.productId, pair.draft.id, "ownership moved to the KID product");
  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(draft.status, "DRAFT");
  assert.ok(!draft.reviewFlags.includes(REVIEW_FLAGS.CONFLICT_UNRESOLVED));
  const set = getProductMediaSet(draft);
  assert.ok(set.primary, "the KID product now owns its media");
  const owner = catalogRepository.find(pair.owner.id);
  assert.equal(owner.status, "ARCHIVED", "media-less published owner is retired");

  assert.ok(
    loadActivity().some(
      (entry) =>
        entry.action === "PRODUCT_MEDIA_TRANSFERRED" &&
        entry.targetProductId === pair.draft.id
    ),
    "ownership change logged"
  );
  cleanupPair({ ...pair, draft: catalogRepository.find(pair.draft.id) });
});

test("MERGE — draft content lands on the existing product", () => {
  const pair = createConflictPair();
  const result = reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.MERGE, ADMIN);
  assert.ok(result.ok);
  assert.equal(result.mergedInto, pair.owner.id);

  const owner = catalogRepository.find(pair.owner.id);
  assert.equal(owner.name, "Scratch Reconciliation Draft", "draft name merged into the owner");
  assert.equal(Number(owner.price), 950, "draft price merged into the owner");
  assert.equal(owner.status, "PUBLISHED");

  const media = mediaRepository.getById(pair.media.id);
  assert.equal(media.productId, pair.owner.id, "media stays with the existing product");
  assert.equal(catalogRepository.find(pair.draft.id).status, "ARCHIVED");
  cleanupPair(pair);
});

test("CREATE SEPARATE PRODUCT — draft keeps its identity, needs new media", () => {
  const pair = createConflictPair();
  const result = reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.SEPARATE, ADMIN);
  assert.ok(result.ok);

  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(draft.status, "DRAFT");
  assert.equal((draft.mediaIds ?? []).length, 0, "conflicting claim removed");
  assert.ok(draft.reviewFlags.includes(REVIEW_FLAGS.NEEDS_MEDIA));
  assert.equal(mediaRepository.getById(pair.media.id).productId, pair.owner.id);
  cleanupPair(pair);
});

test("REVIEW LATER — deferred, conflict kept, nothing moves", () => {
  const pair = createConflictPair();
  const result = reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.REVIEW_LATER, ADMIN);
  assert.ok(result.ok);

  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(draft.status, "DRAFT");
  assert.ok(draft.reviewFlags.includes(REVIEW_FLAGS.CONFLICT_REVIEW_LATER));
  assert.ok(draft.reviewFlags.includes(REVIEW_FLAGS.CONFLICT_UNRESOLVED));
  assert.equal(mediaRepository.getById(pair.media.id).productId, pair.owner.id);
  cleanupPair(pair);
});

/* ------------------------------------------------------------------ */
/* 3. Publish validation                                               */
/* ------------------------------------------------------------------ */

test("a fully resolved scratch KID product becomes ready and publishes", () => {
  const pair = createConflictPair();
  /* Resolve ownership, then everything else falls into place. */
  reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.TRANSFER, ADMIN);
  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(isReadyToPublish(draft), true, "resolved draft is ready");

  /* Phase 2 canonical lifecycle: submit → approve → publish. Approving
     must NOT publish; publishing requires approval. */
  const submitted = submitProductForReview(draft.id, ADMIN);
  assert.ok(submitted.ok, "resolved draft submits for review");
  const approved = approveProduct(draft.id, ADMIN);
  assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join(" ")}`);
  assert.equal(catalogRepository.find(draft.id).status, "PENDING_REVIEW", "approval does not publish");
  assert.equal(catalogRepository.find(draft.id).review.state, "APPROVED");

  const published = publishProduct(draft.id, ADMIN);
  assert.ok(published.ok, `publish must succeed: ${(published.errors ?? []).join(" ")}`);
  assert.equal(catalogRepository.find(draft.id).status, "PUBLISHED");
  assert.ok(
    getLiveStorefrontProducts().some((product) => product.id === draft.id),
    "published KID product appears in the storefront"
  );
  cleanupPair({ ...pair, draft: catalogRepository.find(pair.draft.id) });
});

test("blocking review flags stop publication until a human clears them", () => {
  const pair = createConflictPair();
  reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.TRANSFER, ADMIN);
  let draft = catalogRepository.find(pair.draft.id);
  assert.equal(isReadyToPublish(draft), true);

  /* A required flag blocks approval (and therefore publication). */
  catalogRepository.updateDraft(
    draft.id,
    { reviewFlags: [REVIEW_FLAGS.NAME_REVIEW_REQUIRED] },
    ADMIN
  );
  draft = catalogRepository.find(draft.id);
  assert.equal(isReadyToPublish(draft), false);
  assert.ok(submitProductForReview(draft.id, ADMIN).ok, "submission is allowed with a flag");
  let result = approveProduct(draft.id, ADMIN);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /flag/i.test(error)));

  /* flagsSatisfiedByProduct retires the flag once the field is real. */
  const satisfied = flagsSatisfiedByProduct(draft);
  assert.ok(satisfied.includes(REVIEW_FLAGS.NAME_REVIEW_REQUIRED));
  clearReviewFlags(draft.id, satisfied, ADMIN);
  draft = catalogRepository.find(draft.id);
  assert.equal(blockingReviewFlags(draft.reviewFlags).length, 0);
  assert.ok(approveProduct(draft.id, ADMIN).ok, "approval passes once the flag is cleared");
  result = publishProduct(draft.id, ADMIN);
  assert.ok(result.ok);
  cleanupPair({ ...pair, draft: catalogRepository.find(pair.draft.id) });
});

test("an open group decision blocks publication", () => {
  const pair = createConflictPair();
  reconcileKidsConflict(pair.draft.id, KIDS_CONFLICT_ACTIONS.TRANSFER, ADMIN);

  createGroup(
    { id: "grp-kids-test", mediaIds: [pair.media.id], reason: "Open identity question" },
    "House Admin"
  );
  const draft = catalogRepository.find(pair.draft.id);
  assert.equal(isReadyToPublish(draft), false);
  assert.ok(submitProductForReview(draft.id, ADMIN).ok);
  let result = approveProduct(draft.id, ADMIN);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => /grouping review/i.test(error)));

  /* A human decision closes it. */
  setGroupDecision("grp-kids-test", GROUP_DECISIONS.SEPARATE_PRODUCTS, "House Admin");
  assert.ok(approveProduct(draft.id, ADMIN).ok, "decided groups no longer block approval");
  result = publishProduct(draft.id, ADMIN);
  assert.ok(result.ok, "decided groups no longer block publish");

  resetGroups();
  cleanupPair({ ...pair, draft: catalogRepository.find(pair.draft.id) });
});

/* ------------------------------------------------------------------ */
/* 4. Storefront safety                                                */
/* ------------------------------------------------------------------ */

test("draft KID products never reach the storefront; published Kids products remain", () => {
  const storefront = getLiveStorefrontProducts();
  const kids = storefront.filter((product) => product.category === "kidswear");
  assert.equal(kids.length, 21, "the 21 existing published Kids products keep serving");
  kids.forEach((product) => {
    assert.match(String(product.image?.src ?? ""), /kids-\d{3}\.webp$/);
  });
  assert.ok(
    !storefront.some((product) => /^KID-\d{3}$/.test(String(product.id))),
    "no draft KID product is customer-visible"
  );
});

/* ------------------------------------------------------------------ */
/* 5. Metrics                                                          */
/* ------------------------------------------------------------------ */

test("kids workflow metrics match the reconciled reality", () => {
  const metrics = getWorkflowMetrics();
  assert.equal(metrics.kids.totalMedia, 21);
  assert.equal(metrics.kids.totalGroups, 21);
  assert.equal(metrics.kids.singleImageProducts, 21);
  assert.equal(metrics.kids.multiViewProducts, 0);
  assert.equal(metrics.kids.existingProductConflicts, 21);
  assert.equal(metrics.kids.potentialSameProductGroups, 0);
  assert.equal(metrics.kids.unassignedMedia, 0);
  assert.equal(metrics.media.duplicateOwnership, 0);
  assert.equal(metrics.media.invalidProductIds.length, 0);
  assert.equal(metrics.media.orphaned, 0);
});
