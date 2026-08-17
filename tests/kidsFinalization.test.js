/**
 * PRATIKSHYA FASHON — Phase 22.2 Kids finalization tests.
 *
 * Proves the confirmed decision and the finalization pipeline:
 *
 *   · exactly 21 confirmed Kids product identities
 *   · KID-001 … KID-021 remain separate — similarity cannot merge them
 *   · each KID owns only its own media; no KID uses another KID's plate
 *   · a standalone image has no hover replacement
 *   · draft / review products are invisible to the storefront
 *   · published products appear correctly
 *   · employee & admin authorization, preview, name/price/category editing
 *   · publish validation blocks with exact reasons; nothing auto-publishes
 *   · every lifecycle event lands in the shared activity diary
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { getProductMediaSet, getProductCardMedia } from "../src/services/media/productMediaSet.js";
import {
  CONFIRMED_KIDS_IDENTITIES,
  KIDS_GROUP_DECISION,
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  confirmedKidsProductIdsIn,
  foreignNameTokens,
  isConfirmedKidsMediaFile,
  isConfirmedKidsProductId,
  kidsFileNameOf,
  kidsMediaFileForProductId,
  kidsNameLooksForeign,
  kidsProductIdForFile,
  wouldMergeConfirmedKids,
} from "../src/services/kidsProductIdentity.js";
import {
  KIDS_ACTIVITY_ACTIONS,
  ensureKidsIdentitiesConfirmed,
  KIDS_CHECKLIST_ITEMS,
  KIDS_STAGES,
  approveKidsProduct,
  canPublishKidsProduct,
  confirmKidsProductIdentities,
  getKidsFinalizationRows,
  getKidsFinalizationSummary,
  getKidsPublishBlockers,
  kidsHoverState,
  kidsIdentityConfirmed,
  kidsInventoryValid,
  kidsMediaOwnershipIssues,
  kidsStageOf,
  publishKidsProduct,
} from "../src/services/kidsProductFinalization.js";
import {
  KIDS_CONFLICT_ACTIONS,
  assignProductToEmployee,
  createProductDraftFromMedia,
  decideProductGroup,
  employeeAssignedProducts,
  employeeCanEditProduct,
  reconcileKidsConflict,
  saveEmployeeDraft,
  submitProductForReview,
  transferMediaOwnership,
} from "../src/services/productWorkflow.js";
import { GROUP_DECISIONS } from "../src/services/media/productMediaGroups.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { getEmployee, loadEmployees } from "../src/services/employees/employeeService.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const MANAGER_ID = "PF-MGR-00008";
const SALES_ID = "PF-SLS-00124";
const manager = () => getEmployee(loadEmployees(), MANAGER_ID);
const salesperson = () => getEmployee(loadEmployees(), SALES_ID);

const mediaByFile = (fileName) =>
  mediaRepository.getAll().find((item) => kidsFileNameOf(item) === fileName.toLowerCase());

/* ------------------------------------------------------------------ */
/* 1. Confirmed identity — 21 separate products                        */
/* ------------------------------------------------------------------ */


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("exactly 21 confirmed Kids product identities, one media each", () => {
  assert.equal(CONFIRMED_KIDS_IDENTITIES.length, 21);
  assert.equal(KIDS_MEDIA_FILENAMES.length, 21);
  assert.equal(KIDS_PRODUCT_IDS.length, 21);
  assert.equal(new Set(KIDS_PRODUCT_IDS).size, 21, "21 distinct Product IDs");
  assert.equal(new Set(KIDS_MEDIA_FILENAMES).size, 21, "21 distinct media assets");

  CONFIRMED_KIDS_IDENTITIES.forEach((identity, index) => {
    const number = String(index + 1).padStart(3, "0");
    assert.equal(identity.file, `kids-${number}.webp`);
    assert.equal(identity.productId, `KID-${number}`);
    assert.equal(identity.decision, KIDS_GROUP_DECISION);
    assert.equal(kidsProductIdForFile(identity.file), identity.productId);
    assert.equal(kidsMediaFileForProductId(identity.productId), identity.file);
  });
});

test("KID-001 … KID-021 exist as separate product records — never merged", () => {
  const records = KIDS_PRODUCT_IDS.map((id) => catalogRepository.find(id));
  records.forEach((product, index) => {
    assert.ok(product, `${KIDS_PRODUCT_IDS[index]} must exist`);
    assert.equal(product.id, KIDS_PRODUCT_IDS[index]);
    assert.equal(product.productId, KIDS_PRODUCT_IDS[index], "Product ID is permanent");
    assert.equal(product.category, "kidswear");
  });
  assert.equal(new Set(records.map((product) => product.id)).size, 21);
});

test("the confirmed SEPARATE_PRODUCT decision is recorded for all 21", () => {
  const result = confirmKidsProductIdentities(ADMIN);
  assert.ok(result.ok, "every confirmed plate must exist in the media register");
  assert.equal(result.confirmed.length, 21);
  KIDS_PRODUCT_IDS.forEach((id) => {
    assert.equal(kidsIdentityConfirmed(id), true, `${id} identity must be confirmed`);
  });

  /* Idempotent — re-running changes nothing. */
  const again = confirmKidsProductIdentities(ADMIN);
  assert.ok(again.confirmed.every((entry) => entry.alreadyConfirmed));
});

/* ------------------------------------------------------------------ */
/* 2. Similarity can never merge two confirmed Kids products           */
/* ------------------------------------------------------------------ */

test("similarity cannot merge confirmed Kids products", () => {
  assert.equal(wouldMergeConfirmedKids(["kids-001.webp", "kids-002.webp"]), true);
  assert.equal(wouldMergeConfirmedKids(["kids-001.webp", "kids-001.webp"]), false);
  assert.deepEqual(confirmedKidsProductIdsIn(["kids-003.webp", "kids-004.webp"]), [
    "KID-003",
    "KID-004",
  ]);

  const first = mediaByFile("kids-001.webp");
  const second = mediaByFile("kids-002.webp");
  assert.ok(first && second);

  const merged = decideProductGroup({
    groupId: "grp-kids-similarity-attempt",
    mediaIds: [first.id, second.id],
    decision: GROUP_DECISIONS.SAME_PRODUCT,
    actor: ADMIN,
  });
  assert.equal(merged.ok, false, "SAME_PRODUCT must be refused for two confirmed Kids assets");
  assert.match(merged.error, /CONFIRMED separate products/i);
  assert.deepEqual(merged.confirmedKidsProductIds, ["KID-001", "KID-002"]);

  /* A draft built from two confirmed Kids plates is refused too. */
  const draft = createProductDraftFromMedia({
    mediaIds: [first.id, second.id],
    categoryId: "kidswear",
    actor: ADMIN,
  });
  assert.equal(draft.ok, false);
  assert.match(draft.error, /CONFIRMED separate products/i);

  /* KEEP AS SEPARATE remains available and harmless. */
  const separate = decideProductGroup({
    groupId: "grp-kids-similarity-attempt",
    mediaIds: [first.id, second.id],
    decision: GROUP_DECISIONS.SEPARATE_PRODUCTS,
    actor: ADMIN,
  });
  assert.ok(separate.ok);
  assert.equal(separate.product, null, "separate decisions never create a product");
  assert.equal(mediaRepository.getById(first.id).productId, first.productId);
  assert.equal(mediaRepository.getById(second.id).productId, second.productId);
});

test("a confirmed Kids plate cannot be transferred to another KID product", () => {
  const second = mediaByFile("kids-002.webp");
  const moved = transferMediaOwnership(second.id, "KID-001", ADMIN, { confirm: true });
  assert.equal(moved.ok, false);
  assert.equal(moved.confirmedOwnerProductId, "KID-002");
  assert.equal(
    mediaRepository.getById(second.id).productId,
    second.productId,
    "ownership is untouched"
  );
});

/* ------------------------------------------------------------------ */
/* 3. Media ownership — one product, only its own plate                */
/* ------------------------------------------------------------------ */

test("each KID claims its own media; cross-product media is detected and reported", () => {
  const rows = getKidsFinalizationRows();
  assert.equal(rows.length, 21);
  rows.forEach((row) => {
    assert.equal(row.missing, false);
    assert.equal(row.mediaFile, kidsMediaFileForProductId(row.productId));
    assert.deepEqual(row.ownershipIssues, [], `${row.productId} must own only its own media`);
    const claimed = (row.product.mediaIds ?? []).map((id) =>
      kidsFileNameOf(mediaRepository.getById(id))
    );
    claimed.forEach((file) => {
      if (!isConfirmedKidsMediaFile(file)) return;
      assert.equal(kidsProductIdForFile(file), row.productId);
    });
  });

  const summary = getKidsFinalizationSummary(rows);
  assert.equal(summary.crossProductMedia, 0);
  assert.equal(summary.total, 21);
  assert.equal(summary.identityConfirmed, 21);
});

test("a KID product referencing another KID's plate is flagged, never accepted", () => {
  const foreign = mediaByFile("kids-002.webp");
  const issues = kidsMediaOwnershipIssues({
    id: "KID-001",
    category: "kidswear",
    mediaIds: [foreign.id],
    primaryMediaId: foreign.id,
    galleryMediaIds: [foreign.id],
  });
  assert.ok(issues.length > 0, "cross-product media must be reported");
  assert.ok(issues.some((issue) => issue.belongsTo === "KID-002"));
  assert.ok(issues.every((issue) => /KID-002/.test(issue.message)));
});

/* ------------------------------------------------------------------ */
/* 4. Hover — standalone images never swap                             */
/* ------------------------------------------------------------------ */

test("standalone Kids images have no hover replacement", () => {
  const published = getLiveStorefrontProducts().filter(
    (product) => product.category === "kidswear"
  );
  assert.ok(published.length >= 21);
  published.forEach((product) => {
    const set = getProductMediaSet(product);
    if (set.gallery.length > 1) return; // a genuine alternate view may hover
    const card = getProductCardMedia(product);
    assert.equal(card.hoverImage, undefined, `${product.id} must not swap on hover`);
    assert.equal(set.hasAlternate, false);
  });

  getKidsFinalizationRows().forEach((row) => {
    const hover = kidsHoverState(row.product);
    if ((row.mediaSet.gallery ?? []).length > 1) return;
    assert.equal(hover.changesOnHover, false, `${row.productId} hover must be NO CHANGE`);
  });
});

/* ------------------------------------------------------------------ */
/* 5. Product information & names                                      */
/* ------------------------------------------------------------------ */

test("Kids names are never carried over from another department", () => {
  assert.deepEqual(foreignNameTokens("Boys' Casual Shirt & Shorts Set in Blue"), []);
  assert.equal(kidsNameLooksForeign("Boys' Casual Shirt & Shorts Set"), false);
  assert.equal(kidsNameLooksForeign("Women's Silk Saree"), true);
  assert.equal(kidsNameLooksForeign("Bridal Lehenga Choli"), true);
  assert.equal(kidsNameLooksForeign("Men's Kurta"), true);

  getKidsFinalizationRows().forEach((row) => {
    assert.equal(
      kidsNameLooksForeign(row.product.name),
      false,
      `${row.productId} must not carry “${row.product.name}”`
    );
  });
});

test("every KID product carries the editable product information fields", () => {
  const product = catalogRepository.find("KID-001");
  [
    "id",
    "productId",
    "name",
    "category",
    "subcategory",
    "gender",
    "description",
    "price",
    "compareAtPrice",
    "stock",
    "status",
    "primaryMediaId",
    "galleryMediaIds",
    "assignedEmployeeId",
  ].forEach((field) => {
    assert.ok(field in product, `${field} must exist on the product record`);
  });
  assert.equal(product.gender, "Kids");
});

test("Kids products use the existing Kids Wear taxonomy, never a duplicate", () => {
  const options = taxonomyRepository.subcategoryOptionsFor("kidswear");
  assert.ok(options.length > 0);
  assert.equal(taxonomyRepository.getCategoryLabel("kidswear"), "Kids Wear");
  getKidsFinalizationRows().forEach((row) => {
    assert.equal(row.product.category, "kidswear");
    if (row.product.subcategory) {
      assert.ok(
        options.some((option) => option.toLowerCase() === row.product.subcategory.toLowerCase()),
        `${row.productId} subcategory “${row.product.subcategory}” must exist in the taxonomy`
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* 6. The 21-product checklist                                         */
/* ------------------------------------------------------------------ */

test("the admin checklist reports 9 explicit conditions for every product", () => {
  const rows = getKidsFinalizationRows();
  rows.forEach((row) => {
    assert.equal(row.checklist.items.length, KIDS_CHECKLIST_ITEMS.length);
    row.checklist.items.forEach((item) => {
      assert.equal(typeof item.done, "boolean");
      if (!item.done) assert.ok(item.reason, `${row.productId} · ${item.label} needs a reason`);
    });
  });
  const summary = getKidsFinalizationSummary(rows);
  assert.equal(summary.total, 21);
  assert.equal(summary.missingRecords, 0);
});

/* ------------------------------------------------------------------ */
/* 7. Storefront safety                                                */
/* ------------------------------------------------------------------ */

test("draft and review Kids products are invisible to the storefront", () => {
  const storefront = getLiveStorefrontProducts();
  const drafts = getKidsFinalizationRows().filter(
    (row) => row.stage !== KIDS_STAGES.PUBLISHED
  );
  assert.ok(drafts.length > 0);
  drafts.forEach((row) => {
    assert.equal(
      storefront.some((product) => product.id === row.productId),
      false,
      `${row.productId} (${row.stage}) must not reach customers`
    );
  });
});

test("no storefront surface can reach an unpublished Kids product", async () => {
  const { queryCatalogue } = await import("../src/data/products/query.js");
  const { getProductById, getProductByIdentifier, getProductBySlug, products } = await import(
    "../src/data/products/index.js"
  );

  const drafts = getKidsFinalizationRows().filter((row) => row.stage !== KIDS_STAGES.PUBLISHED);
  assert.ok(drafts.length > 0);

  drafts.forEach((row) => {
    const id = row.productId;
    /* Listing, category, search. */
    assert.equal(
      queryCatalogue({ filters: { category: ["kidswear"] } }).results.some(
        (product) => product.id === id
      ),
      false,
      `${id} must not appear in the Kids category listing`
    );
    assert.equal(
      queryCatalogue({ search: id }).results.some((product) => product.id === id),
      false,
      `${id} must not be searchable`
    );
    assert.equal(
      queryCatalogue({ search: row.product.name }).results.some((product) => product.id === id),
      false,
      `${id} must not surface by name either`
    );
    /* Direct lookups used by wishlist, cart, recommendations and the AI desks. */
    assert.equal(getProductById(id), null);
    assert.equal(getProductByIdentifier(id), null);
    assert.equal(getProductBySlug(row.product.slug ?? id), null);
    assert.equal(products.some((product) => product.id === id), false);
  });
});

/* ------------------------------------------------------------------ */
/* 8. The finalization lifecycle, on scratch data                      */
/* ------------------------------------------------------------------ */

let scratchCounter = 0;

/** A complete scratch Kids product that owns its own confirmed-style plate. */
const createScratchKid = () => {
  scratchCounter += 1;
  const n = String(scratchCounter).padStart(2, "0");
  const media = mediaRepository.create({
    url: `/library/scratch-kids-final-${n}.webp`,
    title: `Scratch kids finalization ${n}`,
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id: `KID-8${n}`,
      name: `Boys' Scratch Casual Set ${n}`,
      category: "kidswear",
      subcategory: "Boys Casual Set",
      gender: "Kids",
      description: "Scratch product for the Phase 22.2 finalization tests.",
      sku: `KID-8${n}-SKU`,
      price: 1290,
      compareAtPrice: 1690,
      pricing: { sellingPrice: 1290, mrp: 1690 },
      stock: 12,
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
  return { media, product: catalogRepository.find(created.product.id) };
};

const cleanupScratch = ({ media, product }) => {
  catalogRepository.archiveProduct(product.id, ADMIN);
  mediaRepository.remove(media.id);
};

test("publishing validation blocks with the exact reason, per condition", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;

  /* Missing name. */
  catalogRepository.updateDraft(id, { name: "Untitled Kids Product" }, ADMIN);
  let blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /name/i.test(reason)));

  /* A foreign name. */
  catalogRepository.updateDraft(id, { name: "Women's Silk Saree" }, ADMIN);
  blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /NAME REVIEW REQUIRED/.test(reason)));

  /* Wrong category. */
  catalogRepository.updateDraft(
    id,
    { name: "Boys' Scratch Casual Set", category: "sarees" },
    ADMIN
  );
  blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /Kids Wear/.test(reason)));

  /* Missing subcategory. */
  catalogRepository.updateDraft(id, { category: "kidswear", subcategory: "" }, ADMIN);
  blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /SUBCATEGORY REVIEW REQUIRED/.test(reason)));

  /* Zero price. */
  catalogRepository.updateDraft(
    id,
    { subcategory: "Boys Casual Set", price: 0, pricing: { sellingPrice: 0, mrp: 0 } },
    ADMIN
  );
  blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /price/i.test(reason)));

  /* Invalid inventory. */
  catalogRepository.updateDraft(
    id,
    { price: 1290, pricing: { sellingPrice: 1290, mrp: 1690 }, stock: 0, availability: "in-stock" },
    ADMIN
  );
  blockers = getKidsPublishBlockers(catalogRepository.find(id));
  assert.ok(blockers.some((reason) => /Inventory state invalid/.test(reason)));
  assert.equal(kidsInventoryValid(catalogRepository.find(id)), false);

  /* Everything satisfied → no blockers. */
  catalogRepository.updateDraft(id, { stock: 8 }, ADMIN);
  const ready = catalogRepository.find(id);
  assert.deepEqual(getKidsPublishBlockers(ready), []);
  assert.equal(canPublishKidsProduct(ready), true);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("nothing publishes automatically — DRAFT → SUBMITTED → APPROVED → PUBLISHED", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;

  assert.equal(kidsStageOf(catalogRepository.find(id)), KIDS_STAGES.DRAFT);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "a DRAFT must never reach customers"
  );

  /* Publishing before approval is refused, even when everything is valid. */
  let attempt = publishKidsProduct(id, ADMIN);
  assert.equal(attempt.ok, false);
  assert.ok(attempt.errors.some((reason) => /Admin review incomplete/.test(reason)));

  /* Assign → employee stage. */
  assignProductToEmployee(id, MANAGER_ID, ADMIN);
  assert.equal(kidsStageOf(catalogRepository.find(id)), KIDS_STAGES.EMPLOYEE_REVIEW);

  /* Submit → review stage, still invisible. */
  assert.ok(submitProductForReview(id, ADMIN).ok);
  assert.equal(kidsStageOf(catalogRepository.find(id)), KIDS_STAGES.SUBMITTED);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "a SUBMITTED product must never reach customers"
  );

  /* Approve → approved, still invisible. */
  const approved = approveKidsProduct(id, ADMIN);
  assert.ok(approved.ok, (approved.errors ?? []).join(" "));
  assert.equal(kidsStageOf(catalogRepository.find(id)), KIDS_STAGES.APPROVED);
  assert.equal(catalogRepository.find(id).review.state, REVIEW_STATE.APPROVED);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === id),
    false,
    "an APPROVED product is still not published"
  );

  /* Publish → visible. */
  const published = publishKidsProduct(id, ADMIN);
  assert.ok(published.ok, (published.errors ?? []).join(" "));
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PUBLISHED);
  const live = getLiveStorefrontProducts().find((product) => product.id === id);
  assert.ok(live, "a PUBLISHED product appears in the storefront");
  assert.equal(live.category, "kidswear");
  assert.equal(live.slug, catalogRepository.find(id).slug, "stable product route");

  /* The card image comes from this product's OWN media set — never from a
     category pool, a sibling product or a random pick. */
  const liveSet = getProductMediaSet(catalogRepository.find(id));
  assert.equal(liveSet.primary?.id, scratch.media.id);
  assert.equal(liveSet.gallery.length, 1);

  /* Its own image, its own name, its own price — and no hover swap. */
  const card = getProductCardMedia(catalogRepository.find(id));
  assert.equal(card.hoverImage, undefined);
  assert.equal(live.name, catalogRepository.find(id).name);
  assert.equal(live.price, catalogRepository.find(id).price);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("the product route stays stable when the name changes", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;
  const before = catalogRepository.find(id);
  catalogRepository.updateDraft(id, { name: "Boys' Renamed Casual Set" }, ADMIN);
  const after = catalogRepository.find(id);
  assert.equal(after.id, before.id, "the Product ID is the identity, not the name");
  assert.equal(after.productId, before.productId);
  assert.notEqual(after.name, before.name);
  cleanupScratch({ ...scratch, product: after });
});

test("a real KID product walks the whole path: conflict → edit → approve → publish", () => {
  const ID = "KID-002";
  const before = catalogRepository.find(ID);
  assert.equal(kidsStageOf(before), KIDS_STAGES.DRAFT);
  assert.ok(getKidsPublishBlockers(before).length > 0, "starts blocked");

  /* The prior owner is a real published product. */
  const priorOwnerId = mediaRepository.getById(before.mediaIds?.[0] ?? "")?.productId
    ?? catalogRepository.all().find((p) => p.id === "pf-080")?.id;

  /* 1 — the ownership conflict is resolved explicitly. */
  const decided = reconcileKidsConflict(ID, KIDS_CONFLICT_ACTIONS.TRANSFER, ADMIN);
  assert.ok(decided.ok, decided.error);
  assert.equal(mediaByFile("kids-002.webp").productId, ID, "the plate now belongs to KID-002");

  /* An emptied prior owner is archived, never left live without an image. */
  if (priorOwnerId && priorOwnerId !== ID) {
    const prior = catalogRepository.find(priorOwnerId);
    if (prior && !(prior.mediaIds ?? []).length) {
      assert.notEqual(prior.status, PRODUCT_STATUS.PUBLISHED, "a media-less product must not stay live");
    }
  }

  /* 2 — the remaining information is supplied. */
  catalogRepository.updateDraft(
    ID,
    { description: "A soft cotton casual set for everyday wear.", stock: 10 },
    ADMIN
  );

  /* 3 — the identity decision is the system's job, not a manual chore: it
     must never be the thing standing between an admin and publishing. */
  const blockers = getKidsPublishBlockers(catalogRepository.find(ID));
  assert.equal(
    blockers.some((reason) => /Confirmed product identity missing/.test(reason)),
    false,
    "the SEPARATE_PRODUCT decision self-heals; it must not block an admin"
  );
  assert.deepEqual(blockers, [], "everything required is now satisfied");

  /* 4 — approval is still mandatory before publishing. */
  const early = publishKidsProduct(ID, ADMIN);
  assert.equal(early.ok, false);
  assert.ok(early.errors.some((reason) => /Admin review incomplete/.test(reason)));

  /* 5 — the full lifecycle. */
  assignProductToEmployee(ID, MANAGER_ID, ADMIN);
  submitProductForReview(ID, ADMIN);
  assert.ok(approveKidsProduct(ID, ADMIN).ok);
  const published = publishKidsProduct(ID, ADMIN);
  assert.ok(published.ok, (published.errors ?? []).join("; "));

  const live = getLiveStorefrontProducts().find((product) => product.id === ID);
  assert.ok(live, "the product is now on the storefront");
  assert.equal(live.slug, "kid-002", "routed on the permanent Product ID");

  /* 6 — the other twenty are untouched by one product's publication. */
  const others = getKidsFinalizationRows().filter((row) => row.productId !== ID);
  assert.equal(others.length, 20);
  assert.equal(
    others.every((row) => row.stage !== KIDS_STAGES.PUBLISHED),
    true,
    "publishing one Kids product must never publish another"
  );

  /* Restore, so ordering between tests cannot matter. */
  catalogRepository.updateProduct(ID, { status: PRODUCT_STATUS.DRAFT }, ADMIN);
});

test("the confirmed identity decision self-heals after the register is reset", async () => {
  const { resetGroups } = await import("../src/services/media/productMediaGroups.js");

  /* Simulate the register being wiped — a reset, a cleared store, a browser
     with no history. The 21 identities are a house decision, not user data:
     the system must put them back rather than block on their absence. */
  resetGroups();
  assert.equal(kidsIdentityConfirmed("KID-003"), false, "precondition: the decision is gone");

  const healed = ensureKidsIdentitiesConfirmed(ADMIN);
  assert.equal(healed, true, "the decision is re-recorded");
  KIDS_PRODUCT_IDS.forEach((id) => {
    assert.equal(kidsIdentityConfirmed(id), true, `${id} is confirmed again`);
  });

  /* And it must never be the reason a publish is refused. */
  resetGroups();
  const blockers = getKidsPublishBlockers(catalogRepository.find("KID-003"));
  assert.equal(
    blockers.some((reason) => /Confirmed product identity missing/.test(reason)),
    false,
    "reading the blockers heals the decision instead of reporting it"
  );
  assert.equal(kidsIdentityConfirmed("KID-003"), true);
});

/* ------------------------------------------------------------------ */
/* 9. Authorization & employee editing                                 */
/* ------------------------------------------------------------------ */

test("employee authorization: only the assigned employee may edit", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;
  assignProductToEmployee(id, MANAGER_ID, ADMIN);
  const product = catalogRepository.find(id);

  assert.equal(employeeCanEditProduct(manager(), product), true);
  assert.equal(employeeCanEditProduct(salesperson(), product), false);

  const mine = employeeAssignedProducts(MANAGER_ID).map((entry) => entry.id);
  assert.ok(mine.includes(id), "the employee sees only their authorized products");

  const refused = saveEmployeeDraft(
    id,
    { name: "Unauthorized edit" },
    salesperson(),
    { employeeId: SALES_ID, label: "Ananya Sharma" }
  );
  assert.equal(refused.ok, false);
  assert.match(refused.error, /not authorized/i);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("employee editing: name, price, category, subcategory and inventory save", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;
  assignProductToEmployee(id, MANAGER_ID, ADMIN);

  const saved = saveEmployeeDraft(
    id,
    {
      name: "Girls' Cotton Summer Dress in Peach",
      price: 1490,
      compareAtPrice: 1990,
      category: "kidswear",
      subcategory: "Girls Dress",
      description: "Soft cotton summer dress with a gathered waist.",
      stock: 24,
      /* Protected fields must be ignored. */
      id: "HACKED",
      status: PRODUCT_STATUS.PUBLISHED,
      assignedEmployeeId: SALES_ID,
      mediaIds: [],
    },
    manager(),
    { employeeId: MANAGER_ID, label: "Vikram Iyer" }
  );
  assert.ok(saved.ok);

  const product = catalogRepository.find(id);
  assert.equal(product.name, "Girls' Cotton Summer Dress in Peach");
  assert.equal(Number(product.price), 1490);
  assert.equal(Number(product.compareAtPrice), 1990);
  assert.equal(product.subcategory, "Girls Dress");
  assert.equal(Number(product.stock), 24);
  assert.equal(product.id, id, "employees cannot change the Product ID");
  assert.equal(product.status, PRODUCT_STATUS.DRAFT, "employees cannot publish");
  assert.equal(product.assignedEmployeeId, MANAGER_ID, "employees cannot reassign");
  assert.ok((product.mediaIds ?? []).length > 0, "employees cannot strip media");
  assert.ok(product.updatedAt, "updatedAt is written");
  assert.match(product.updatedBy, /Vikram Iyer/, "updatedBy is signed");

  /* The employee preview resolves the product's OWN image. */
  const set = getProductMediaSet(product);
  assert.ok(set.primary);
  assert.equal(kidsFileNameOf(set.primary), kidsFileNameOf(scratch.media));

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("admin authorization: assignment, approval and publishing stay with the admin", () => {
  const scratch = createScratchKid();
  const id = scratch.product.id;

  const assigned = assignProductToEmployee(id, MANAGER_ID, ADMIN);
  assert.ok(assigned.ok);
  assert.equal(assigned.product.assignedEmployeeId, MANAGER_ID);

  /* An employee cannot approve or publish — those helpers are admin paths
     and the workflow refuses an unapproved publish. */
  assert.equal(publishKidsProduct(id, ADMIN).ok, false, "publish requires approval first");

  submitProductForReview(id, ADMIN);
  assert.ok(approveKidsProduct(id, ADMIN).ok);
  assert.ok(publishKidsProduct(id, ADMIN).ok);

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

/* ------------------------------------------------------------------ */
/* 10. Activity logging                                                */
/* ------------------------------------------------------------------ */

test("every Kids lifecycle event is logged in the shared activity diary", () => {
  /* This assertion covers both the identity decision and lifecycle events,
     so establish the decision explicitly instead of relying on an earlier test. */
  confirmKidsProductIdentities(ADMIN);
  const scratch = createScratchKid();
  const id = scratch.product.id;

  assignProductToEmployee(id, MANAGER_ID, ADMIN);
  saveEmployeeDraft(
    id,
    { name: "Boys' Logged Casual Set" },
    manager(),
    { employeeId: MANAGER_ID, label: "Vikram Iyer" }
  );
  submitProductForReview(id, ADMIN);
  approveKidsProduct(id, ADMIN);
  publishKidsProduct(id, ADMIN);

  const entries = loadActivity().filter((entry) => entry.targetProductId === id);
  const actions = new Set(entries.map((entry) => entry.action));

  [
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_CREATED,
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_UPDATED,
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_ASSIGNED,
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_SUBMITTED,
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_APPROVED,
    KIDS_ACTIVITY_ACTIONS.KIDS_PRODUCT_PUBLISHED,
  ].forEach((action) => {
    assert.ok(actions.has(action), `${action} must be logged`);
  });

  /* Group confirmation is logged against the confirmed identities. */
  assert.ok(
    loadActivity().some(
      (entry) =>
        entry.action === KIDS_ACTIVITY_ACTIONS.KIDS_MEDIA_GROUP_CONFIRMED &&
        /SEPARATE_PRODUCT/.test(entry.summary)
    ),
    "the confirmed identity decision is logged"
  );

  cleanupScratch({ ...scratch, product: catalogRepository.find(id) });
});

test("media transfers are explicit and logged — never silent", () => {
  scratchCounter += 1;
  const n = String(scratchCounter).padStart(2, "0");
  const media = mediaRepository.create({
    url: `/library/scratch-kids-transfer-${n}.webp`,
    title: `Scratch kids transfer ${n}`,
  });
  const owner = catalogRepository.upsert(
    {
      id: `pf-kidstransfer-${n}`,
      name: `Scratch Existing Kids ${n}`,
      category: "kidswear",
      subcategory: "Boys Casual Set",
      price: 900,
      pricing: { sellingPrice: 900, mrp: 1200 },
      description: "Scratch existing owner.",
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
      id: `KID-7${n}`,
      name: "Boys' Scratch Transfer Set",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      description: "Scratch draft claiming contested media.",
      price: 990,
      pricing: { sellingPrice: 990, mrp: 1290 },
      stock: 5,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: ["CONFLICT_UNRESOLVED"],
    },
    ADMIN
  );

  /* The conflict blocks publication until a human decides. */
  assert.ok(
    getKidsPublishBlockers(catalogRepository.find(draft.product.id)).length > 0,
    "an unresolved ownership conflict blocks publishing"
  );

  const decided = reconcileKidsConflict(
    draft.product.id,
    KIDS_CONFLICT_ACTIONS.TRANSFER,
    ADMIN
  );
  assert.ok(decided.ok);
  assert.equal(mediaRepository.getById(media.id).productId, draft.product.id);
  assert.ok(
    loadActivity().some(
      (entry) =>
        entry.action === KIDS_ACTIVITY_ACTIONS.KIDS_MEDIA_TRANSFERRED &&
        entry.targetProductId === draft.product.id
    ),
    "the transfer is logged"
  );

  catalogRepository.archiveProduct(draft.product.id, ADMIN);
  catalogRepository.archiveProduct(owner.id, ADMIN);
  mediaRepository.remove(media.id);
});

/* ------------------------------------------------------------------ */
/* 11. Other categories are untouched                                  */
/* ------------------------------------------------------------------ */

test("no other category is affected by the Kids finalization", () => {
  const storefront = getLiveStorefrontProducts();
  const flagship = storefront.find((product) => product.id === "pf-001");
  assert.ok(flagship);
  assert.equal(flagship.name, "Sambalpuri Pato Silk Saree");
  assert.equal(flagship.status, "PUBLISHED");

  const nonKids = storefront.filter((product) => product.category !== "kidswear");
  assert.ok(nonKids.length > 50);
  nonKids.forEach((product) => {
    assert.equal(isConfirmedKidsProductId(product.id), false);
  });
});
