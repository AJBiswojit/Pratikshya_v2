/**
 * PRATIKSHYA FASHON — Phase 22 media-to-product workflow tests.
 *
 * Locks the deterministic MEDIA → PRODUCT DRAFT → REVIEW → PUBLISH
 * pipeline in place:
 *
 *   · 21 Kids media assets become draft records with stable Product IDs
 *   · media ownership is single and validated — never silently reassigned
 *   · standalone media has no hover; multi-view media resolves correctly
 *   · product-card imagery never uses random or cross-product sources
 *   · employees preview only their assigned products
 *   · drafts and review products never reach the storefront
 *   · published products and the existing catalogue are untouched
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, {
  PRODUCT_STATUS,
  getPublishIssues,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { assignMediaToProduct as assignMediaOwnership } from "../src/services/media/mediaOwnershipService.js";
import {
  getProductCardMedia,
  getProductMediaSet,
} from "../src/services/media/productMediaSet.js";
import {
  approveProduct,
  assignProductToEmployee,
  changeProductId,
  createProductDraftFromMedia,
  decideProductGroup,
  employeeAssignedProducts,
  employeeCanEditProduct,
  getMediaInbox,
  getPotentialProductGroups,
  getWorkflowMetrics,
  nextStableProductId,
  preferredProductIdForMedia,
  publishProduct,
  saveEmployeeDraft,
  submitProductForReview,
  transferMediaOwnership,
  unassignProductMedia,
  validateMediaAssignment,
} from "../src/services/productWorkflow.js";
import {
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  ensureKidsDraftRecords,
  kidsDraftRecords,
} from "../src/services/productDraftMigration.js";
import {
  GROUP_DECISIONS,
  getAllGroups,
  resetGroups,
} from "../src/services/media/productMediaGroups.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { getEmployee, loadEmployees } from "../src/services/employees/employeeService.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

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

const kidsProductIds = () => KIDS_PRODUCT_IDS;

/* ------------------------------------------------------------------ */
/* 1. Kids migration — 21 drafts with stable Product IDs               */
/* ------------------------------------------------------------------ */


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("all 21 kids media assets exist in the media register", () => {
  KIDS_MEDIA_FILENAMES.forEach((fileName) => {
    assert.ok(mediaByFile(fileName), `${fileName} missing from the media register`);
  });
});

test("the 21 kids media assets become 21 DRAFT product records", () => {
  const drafts = catalogRepository
    .all()
    .filter((product) => kidsProductIds().includes(String(product.id)));
  assert.equal(drafts.length, 21);
  drafts.forEach((product) => {
    assert.equal(product.status, PRODUCT_STATUS.DRAFT, `${product.id} must be DRAFT`);
    assert.equal(product.category, "kidswear");
  });
});

test("each kids draft has a stable Product ID matching its media", () => {
  KIDS_MEDIA_FILENAMES.forEach((fileName, index) => {
    const media = mediaByFile(fileName);
    const product = catalogRepository.find(KIDS_PRODUCT_IDS[index]);
    assert.ok(product, `missing draft ${KIDS_PRODUCT_IDS[index]}`);
    assert.equal(product.id, product.productId, "Product ID and record id stay aligned");
    assert.equal(product.primaryMediaId, media.id, `${fileName} must be the primary claim`);
    assert.ok(product.mediaIds.includes(media.id), `${fileName} must be claimed by ${product.id}`);
  });
});

test("Product ID never changes when the editable name changes", () => {
  const id = KIDS_PRODUCT_IDS[0];
  const result = catalogRepository.updateDraft(
    id,
    { name: "Boys Cotton Casual Set in Yellow" },
    ADMIN
  );
  assert.ok(result.ok);
  assert.equal(result.product.id, id, "Product ID must survive a name edit");
  const history = result.product.history ?? [];
  assert.ok(
    history.some((entry) => entry.field === "name" && entry.to === "Boys Cotton Casual Set in Yellow"),
    "name change must be recorded in the audit trail"
  );
});

test("the kids draft migration is idempotent and additive", () => {
  const before = catalogRepository.all();
  const applied = ensureKidsDraftRecords(before);
  assert.equal(applied.length, before.length, "re-applying must not duplicate records");
  const again = ensureKidsDraftRecords(applied);
  assert.deepEqual(again, applied);
  const records = kidsDraftRecords();
  assert.equal(records.length, 21);
  records.forEach((record) => assert.match(record.id, /^KID-\d{3}$/));
});

/* ------------------------------------------------------------------ */
/* 2. Media ownership — one product per asset                          */
/* ------------------------------------------------------------------ */

test("every kids media asset is owned by exactly one product in the register", () => {
  const owners = new Map();
  KIDS_MEDIA_FILENAMES.forEach((fileName) => {
    const media = mediaByFile(fileName);
    if (media.productId) owners.set(media.id, media.productId);
  });
  /* Ownership is single by construction — one record per file here. */
  const distinctOwners = new Set(owners.values());
  assert.equal(owners.size, 21);
  assert.equal(distinctOwners.size, 21, "no two kids assets may share one owner set entry");
});

test("no kids media asset is claimed by two drafts", () => {
  const claims = new Map();
  catalogRepository
    .all()
    .filter((product) => /^KID-\d{3}$/.test(String(product.id)))
    .forEach((product) => {
      (product.mediaIds ?? []).forEach((mediaId) => {
        assert.ok(
          !claims.has(mediaId),
          `media ${mediaId} claimed by ${claims.get(mediaId)} and ${product.id}`
        );
        claims.set(mediaId, product.id);
      });
    });
  assert.equal(claims.size, 21);
});

test("ingested photography has no duplicate ownership", () => {
  const byFile = new Map();
  mediaRepository
    .getAll()
    .filter((item) => item.ingested || item.source === "Ingested library")
    .forEach((item) => {
      const file = fileOf(item);
      if (!file) return;
      if (!byFile.has(file)) byFile.set(file, new Set());
      byFile.get(file).add(String(item.productId ?? ""));
    });
  const duplicates = [...byFile.values()].filter((owners) => owners.size > 1);
  assert.equal(duplicates.length, 0, "duplicate ownership must be zero");
});

test("assigning already-owned media is refused unless confirmed", () => {
  const media = mediaByFile(KIDS_MEDIA_FILENAMES[0]);
  const other = catalogRepository
    .all()
    .find((product) => product.id !== media.productId && product.status === "PUBLISHED");

  const refused = mediaRepository.assignToProduct(media.id, other.id, null);
  assert.equal(refused, null, "MEDIA ALREADY ASSIGNED — must not silently reassign");

  const check = validateMediaAssignment(media.id, other.id);
  assert.equal(check.ok, false);
  assert.equal(check.error, "MEDIA_ALREADY_ASSIGNED");
  assert.equal(check.ownerProductId, media.productId);

  const confirmed = mediaRepository.assignToProduct(media.id, other.id, null, {
    confirmReassign: true,
  });
  assert.ok(confirmed);
  assert.equal(confirmed.productId, other.id);

  /* Restore the original ownership for the remaining tests. */
  mediaRepository.assignToProduct(media.id, media.productId, null, { confirmReassign: true });
});

test("transferMediaOwnership moves ownership and strips stale references", () => {
  /* Build a scratch product that owns an authored plate, then transfer. */
  const scratchMedia = mediaRepository.create({
    url: "/library/women-saree-cotton-006-front.webp",
    title: "Scratch transfer plate",
  });
  assert.ok(scratchMedia);

  const created = catalogRepository.createDraftProduct(
    {
      id: "SAR-901",
      name: "Scratch Ownership Test",
      category: "sarees",
      price: 1000,
      description: "Scratch product for ownership transfer.",
      image: "/library/women-saree-cotton-006-front.webp",
    },
    ADMIN
  );
  assert.ok(created.ok);
  assert.ok(assignMediaOwnership({
    mediaId: scratchMedia.id,
    productId: "SAR-901",
    principal: ADMIN,
    actor: ADMIN,
  }).ok);

  const target = catalogRepository.createDraftProduct(
    { id: "SAR-902", name: "Transfer Target", category: "sarees" },
    ADMIN
  );
  assert.ok(target.ok);

  const moved = transferMediaOwnership(scratchMedia.id, "SAR-902", ADMIN, { confirm: true });
  assert.ok(moved.ok);
  assert.equal(moved.previousOwnerId, "SAR-901");
  assert.equal(moved.previousOwnerStripped, true);

  const previous = catalogRepository.find("SAR-901");
  assert.equal(previous.image, undefined, "stale authored plate must be removed");
  assert.ok((previous.reviewFlags ?? []).includes("MEDIA_OWNERSHIP_MOVED"));

  const diary = loadActivity();
  assert.ok(
    diary.some(
      (entry) => entry.action === "PRODUCT_MEDIA_TRANSFERRED" && entry.targetProductId === "SAR-902"
    ),
    "transfer must be recorded in the shared activity diary"
  );

  /* Cleanup — archive the scratch records. */
  catalogRepository.archiveProduct("SAR-901", ADMIN);
  catalogRepository.archiveProduct("SAR-902", ADMIN);
  mediaRepository.remove(scratchMedia.id);
});

test("unassignProductMedia returns media to the library and flags the owner", () => {
  const scratchMedia = mediaRepository.create({ url: "/library/women-saree-silk-006-front.webp" });
  assert.ok(
    catalogRepository.createDraftProduct(
      { id: "SAR-903", name: "Unassign Scratch", category: "sarees", image: scratchMedia.url },
      ADMIN
    ).ok
  );
  assert.ok(assignMediaOwnership({
    mediaId: scratchMedia.id,
    productId: "SAR-903",
    principal: ADMIN,
    actor: ADMIN,
  }).ok);

  const result = unassignProductMedia(scratchMedia.id, ADMIN);
  assert.ok(result.ok);
  assert.equal(result.media.productId, null);
  const owner = catalogRepository.find("SAR-903");
  assert.ok((owner.reviewFlags ?? []).includes("MEDIA_UNASSIGNED"));

  catalogRepository.archiveProduct("SAR-903", ADMIN);
  mediaRepository.remove(scratchMedia.id);
});

/* ------------------------------------------------------------------ */
/* 3. Hover rule — deterministic, never random, never cross-product    */
/* ------------------------------------------------------------------ */

test("standalone media has no hover — hover equals primary", () => {
  const media = mediaByFile(KIDS_MEDIA_FILENAMES[0]);
  const set = getProductMediaSet(media.productId);
  assert.ok(set.primary, "the owning product has a primary");
  assert.equal(set.hasAlternate, false, "standalone plates must not invent an alternate");
  assert.equal(fileOf(set.hover), fileOf(set.primary));
});

test("multi-view media resolves front primary, side/back gallery, same-product hover", () => {
  const media = mediaByFile("men-sherwani-001-front.webp");
  assert.ok(media?.productId, "sherwani plate must be product-owned");
  const set = getProductMediaSet(media.productId);
  assert.equal(set.gallery.length, 3, "front + side + back = one product gallery");
  assert.equal(set.front?.view, "front");
  assert.equal(set.primary?.view, "front");
  assert.equal(set.hasAlternate, true);
  assert.ok(["side", "back"].includes(set.hover?.view), "hover must come from this product's own views");
  assert.equal(set.hover?.productId, media.productId);
});

test("every storefront product card's primary and hover belong to that product", () => {
  getLiveStorefrontProducts().forEach((product) => {
    const card = getProductCardMedia(product);
    if (card.image) {
      assert.ok(
        !card.image.productId || String(card.image.productId) === String(product.id),
        `${product.id} resolves another product's primary`
      );
    }
    if (card.hoverImage) {
      assert.equal(
        String(card.hoverImage.productId),
        String(product.id),
        `${product.id} resolves another product's hover`
      );
    }
  });
});

test("product-card imagery contains no random, shuffle or fallback sources", () => {
  const cardSource = readFileSync(
    join(__dirname, "..", "src", "design-system", "components", "ProductCard.jsx"),
    "utf8"
  );
  const previewSource = readFileSync(
    join(__dirname, "..", "src", "components", "product", "ProductPreview.jsx"),
    "utf8"
  );
  [cardSource, previewSource].forEach((source) => {
    assert.ok(!/Math\.random|\.sort\([^)]*random|shuffle\(/i.test(source), "no random imagery selection");
  });
  /* The preview must resolve through getProductMediaSet, never hardcoded plates. */
  assert.ok(previewSource.includes("getProductMediaSet"));
  assert.ok(!/\/library\/kids-\d+\.webp/.test(previewSource), "no hardcoded library plates in ProductPreview");
});

/* ------------------------------------------------------------------ */
/* 4. Draft creation from media                                        */
/* ------------------------------------------------------------------ */

test("createProductDraftFromMedia makes a stable draft and reports conflicts", () => {
  const media = mediaByFile("kids-007.webp");
  const result = createProductDraftFromMedia({ mediaIds: [media.id], actor: ADMIN });
  /* kids-007 already has a KID-007 draft, so the next free id is taken. */
  assert.ok(result.ok);
  assert.match(result.product.id, /^KID-\d{3}$/);
  assert.equal(result.product.status, PRODUCT_STATUS.DRAFT);
  assert.equal(result.product.primaryMediaId, media.id);
  /* The media is already owned by the published kids product → conflict. */
  assert.equal(result.conflicts.length, 1);
  assert.equal(result.conflicts[0].ownerProductId, media.productId);

  /* Cleanup the scratch draft. */
  catalogRepository.archiveProduct(result.product.id, ADMIN);
});

test("stable ids are deterministic — same inputs, same id, never random", () => {
  const idA = nextStableProductId("kidswear", 7);
  const idB = nextStableProductId("kidswear", 7);
  assert.equal(idA, idB, "same inputs must yield the same id");
  assert.match(idA, /^KID-\d{3}$/, "category-prefixed stable id");
  const taken = new Set(catalogRepository.all().map((product) => String(product.id)));
  assert.ok(!taken.has(idA), "the generated id must be free in the register");

  const media = mediaByFile("men-sherwani-002-front.webp");
  const preferredA = preferredProductIdForMedia([media], "menswear");
  const preferredB = preferredProductIdForMedia([media], "menswear");
  assert.equal(preferredA, preferredB, "same inputs must yield the same id");
  assert.match(preferredA, /^MEN-\d{3}$/, "category-prefixed stable id");
  assert.ok(!taken.has(preferredA), "the preferred id must be free in the register");
});

test("the media inbox includes kids drafts' claims and identifies owners", () => {
  const inbox = getMediaInbox();
  const kidsRow = inbox.find((row) => fileOf(row.media) === KIDS_MEDIA_FILENAMES[0]);
  assert.ok(kidsRow, "kids media claimed by a draft must appear in the inbox");
  assert.equal(kidsRow.ownerProduct.id, kidsRow.media.productId);
  assert.ok(
    kidsRow.claimedByDrafts.some((draft) => kidsProductIds().includes(draft.id)),
    "the draft claim must be visible"
  );
});

/* ------------------------------------------------------------------ */
/* 5. Employee workflow                                                */
/* ------------------------------------------------------------------ */

/* Real seeded employees: a store manager with products.manage, a sales
   executive without it, and a suspended sales executive. */
const MANAGER_ID = "PF-MGR-00008";
const SALES_ID = "PF-SLS-00124";
const SUSPENDED_ID = "PF-SLS-00140";

const manager = () => getEmployee(loadEmployees(), MANAGER_ID);
const salesperson = () => getEmployee(loadEmployees(), SALES_ID);
const suspended = () => getEmployee(loadEmployees(), SUSPENDED_ID);

test("admin can assign a draft to an employee, who alone may edit it", () => {
  const assigned = assignProductToEmployee(KIDS_PRODUCT_IDS[1], MANAGER_ID, ADMIN);
  assert.ok(assigned.ok);
  assert.equal(assigned.product.assignedEmployeeId, MANAGER_ID);

  const product = catalogRepository.find(KIDS_PRODUCT_IDS[1]);
  assert.equal(employeeCanEditProduct(manager(), product), true, "assigned employee may edit");
  assert.equal(employeeCanEditProduct(salesperson(), product), false, "unassigned employee may not edit");
  assert.equal(
    employeeCanEditProduct(salesperson(), { ...product, assignedEmployeeId: SALES_ID }),
    false,
    "products.manage permission is required"
  );
  assert.equal(
    employeeCanEditProduct(suspended(), { ...product, assignedEmployeeId: SUSPENDED_ID }),
    false,
    "suspended employees may not edit"
  );

  const mine = employeeAssignedProducts(MANAGER_ID).map((entry) => entry.id);
  assert.ok(mine.includes(KIDS_PRODUCT_IDS[1]), "assigned products appear for the employee");
  assert.ok(!mine.includes(KIDS_PRODUCT_IDS[2]), "unassigned products do not");

  /* Unassign to leave the register clean for other tests. */
  assignProductToEmployee(KIDS_PRODUCT_IDS[1], null, ADMIN);
});

test("an employee cannot edit protected fields through the workflow", () => {
  const assigned = assignProductToEmployee(KIDS_PRODUCT_IDS[2], MANAGER_ID, ADMIN);
  assert.ok(assigned.ok);

  const saved = saveEmployeeDraft(
    KIDS_PRODUCT_IDS[2],
    {
      name: "Employee-named Kids Set",
      price: 999,
      status: PRODUCT_STATUS.PUBLISHED, // must be ignored
      id: "HACKED-ID", // must be ignored
      assignedEmployeeId: "EMP-999", // must be ignored
      mediaIds: [], // must be ignored
    },
    manager(),
    { employeeId: MANAGER_ID, label: "Vikram Iyer" }
  );
  assert.ok(saved.ok);
  const product = catalogRepository.find(KIDS_PRODUCT_IDS[2]);
  assert.equal(product.name, "Employee-named Kids Set");
  assert.equal(product.status, PRODUCT_STATUS.DRAFT, "employees cannot publish");
  assert.equal(product.id, KIDS_PRODUCT_IDS[2], "employees cannot change the Product ID");
  assert.equal(product.assignedEmployeeId, MANAGER_ID, "employees cannot reassign");

  catalogRepository.updateDraft(
    KIDS_PRODUCT_IDS[2],
    { name: "Untitled Kids Product", price: 0, pricing: { sellingPrice: 0, mrp: 0 } },
    ADMIN
  );
  assignProductToEmployee(KIDS_PRODUCT_IDS[2], null, ADMIN);
});

test("saveEmployeeDraft refuses unauthorized employees", () => {
  const result = saveEmployeeDraft(
    KIDS_PRODUCT_IDS[3],
    { name: "Sneaky edit" },
    salesperson(),
    { employeeId: SALES_ID, label: "Ananya Sharma" }
  );
  assert.equal(result.ok, false);
  assert.match(result.error, /not authorized/i);
});

/* ------------------------------------------------------------------ */
/* 6. Storefront safety                                                */
/* ------------------------------------------------------------------ */

test("draft and review products never appear in the storefront", () => {
  const baseline = getLiveStorefrontProducts().length;

  /* A scratch media asset — the published catalogue is never touched. */
  const scratchMedia = mediaRepository.create({
    url: "/library/scratch-publish-test.webp",
    title: "Scratch publish test plate",
    status: "ACTIVE",
  });
  assert.ok(scratchMedia);

  /* Draft */
  const draft = createProductDraftFromMedia({
    mediaIds: [scratchMedia.id],
    categoryId: "kidswear",
    actor: ADMIN,
  });
  assert.ok(draft.ok);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === draft.product.id),
    false,
    "a DRAFT must not reach customers"
  );

  /* Review */
  catalogRepository.updateDraft(
    draft.product.id,
    {
      name: "Review-ready Kids Product",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      price: 1290,
      pricing: { sellingPrice: 1290, mrp: 1590 },
      description: "Complete commercial information.",
      sku: "KID-TEST-SKU",
      stock: 5,
    },
    ADMIN
  );
  const submitted = submitProductForReview(draft.product.id, ADMIN);
  assert.ok(submitted.ok);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === draft.product.id),
    false,
    "a REVIEW product must not reach customers"
  );

  /* Approve — must NOT publish (Phase 2 canonical lifecycle). */
  const approved = approveProduct(draft.product.id, ADMIN);
  assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join(" ")}`);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === draft.product.id),
    false,
    "an APPROVED product must not reach customers"
  );

  /* Publish */
  const published = publishProduct(draft.product.id, ADMIN);
  assert.ok(published.ok, `publish must succeed: ${(published.errors ?? []).join(" ")}`);
  assert.equal(
    getLiveStorefrontProducts().some((product) => product.id === draft.product.id),
    true,
    "a PUBLISHED product appears normally"
  );

  /* Cleanup — archive the scratch product and remove its media. */
  catalogRepository.archiveProduct(draft.product.id, ADMIN);
  mediaRepository.remove(scratchMedia.id);
  assert.equal(getLiveStorefrontProducts().length, baseline, "storefront count must be restored");
});

test("existing published products remain unaffected by the workflow", () => {
  const storefront = getLiveStorefrontProducts();
  assert.ok(storefront.length >= 99);
  const flagship = storefront.find((product) => product.id === "pf-001");
  assert.ok(flagship, "pf-001 must still exist");
  assert.equal(flagship.status, "PUBLISHED");
  assert.equal(flagship.name, "Sambalpuri Pato Silk Saree");
  /* The 21 published kids products keep their plates. */
  const kids = storefront.filter((product) => product.category === "kidswear");
  assert.equal(kids.length, 21);
  kids.forEach((product) => {
    assert.match(String(product.image?.src ?? ""), /kids-\d{3}\.webp$/);
  });
});

/* ------------------------------------------------------------------ */
/* 7. Validation & workflow rules                                      */
/* ------------------------------------------------------------------ */

test("incomplete drafts cannot publish — clear validation errors", () => {
  /* A hydrated KID draft is still blocked: contested ownership, a review
     flag and the missing description must all be reported. */
  const draft = catalogRepository.find(KIDS_PRODUCT_IDS[4]);
  const issues = getPublishIssues(draft);
  assert.ok(issues.some((issue) => /ownership|media/i.test(issue)), "contested media must block publishing");
  assert.ok(issues.some((issue) => /description/i.test(issue)), "missing description must block publishing");
  assert.ok(issues.some((issue) => /flag/i.test(issue)), "unresolved review flags must block publishing");
  const result = publishProduct(draft.id, ADMIN);
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);

  /* Placeholder names are still caught by validation. */
  const placeholder = catalogRepository.createDraftProduct(
    {
      id: "KID-901",
      name: "Kids Piece · KID-901",
      category: "kidswear",
      price: 100,
      pricing: { sellingPrice: 100, mrp: 150 },
      description: "Scratch placeholder-name check.",
      sku: "KID-901-SKU",
    },
    ADMIN
  );
  assert.ok(placeholder.ok);
  const placeholderIssues = getPublishIssues(placeholder.product);
  assert.ok(
    placeholderIssues.some((issue) => /name/i.test(issue)),
    "placeholder draft names must block publishing"
  );
  catalogRepository.archiveProduct("KID-901", ADMIN);
});

test("history captures who changed what, when — price, name, media, status", () => {
  const id = "KID-TEST-HISTORY";
  const created = catalogRepository.createDraftProduct(
    { id, name: "History Test", category: "kidswear" },
    ADMIN
  );
  assert.ok(created.ok);
  catalogRepository.updateDraft(id, { name: "History Test v2", price: 100, pricing: { sellingPrice: 100, mrp: 150 } }, ADMIN);
  const product = catalogRepository.find(id);
  const fields = new Set((product.history ?? []).map((entry) => entry.field));
  assert.ok(fields.has("name"), "name change recorded");
  assert.ok(fields.has("price"), "price change recorded");
  const entry = product.history.find((item) => item.field === "price");
  assert.equal(entry.by, "House Admin (PF-ADM-00001)");
  assert.ok(entry.at);
  catalogRepository.archiveProduct(id, ADMIN);
});

test("admin can change a Product ID; the media register follows", () => {
  const media = mediaRepository.create({ url: "/library/jewellery-earring-014.webp" });
  assert.ok(
    catalogRepository.createDraftProduct(
      { id: "JEW-901", name: "ID change scratch", category: "jewellery" },
      ADMIN
    ).ok
  );
  assert.ok(assignMediaOwnership({
    mediaId: media.id,
    productId: "JEW-901",
    principal: ADMIN,
    actor: ADMIN,
  }).ok);

  const result = changeProductId("JEW-901", "JEW-902", ADMIN);
  assert.ok(result.ok);
  assert.equal(result.product.id, "JEW-902");
  assert.equal(catalogRepository.find("JEW-901"), null);
  assert.equal(catalogRepository.find("JEW-902")?.productId, "JEW-902");
  const moved = mediaRepository.getById(media.id);
  assert.equal(moved.productId, "JEW-902", "media ownership must follow the new Product ID");

  /* Reject duplicates and bad formats. */
  const duplicate = changeProductId("JEW-902", "pf-001", ADMIN);
  assert.equal(duplicate.ok, false);
  const bad = changeProductId("JEW-902", "!!!", ADMIN);
  assert.equal(bad.ok, false);

  catalogRepository.archiveProduct("JEW-902", ADMIN);
  mediaRepository.remove(media.id);
});

/* ------------------------------------------------------------------ */
/* 8. Group review                                                     */
/* ------------------------------------------------------------------ */

test("potential same-product groups are deterministic review signals", () => {
  const groups = getPotentialProductGroups();
  const pending = groups.filter((group) => !group.confirmed);
  assert.ok(pending.length >= 1, "flagged assets must produce review candidates");
  /* Deterministic reasons only — never bare visual similarity. */
  pending.forEach((group) => {
    assert.ok(group.reason, "every candidate carries a reason");
  });
});

test("GROUP AS ONE PRODUCT creates one draft for the group's media", () => {
  const groups = getPotentialProductGroups();
  const flaggedGroup = groups.find((group) => group.id.startsWith("filename-women-saree-bandhani"));
  assert.ok(flaggedGroup, "the bandhani group must exist");
  assert.equal(flaggedGroup.confirmed, false);

  const decision = decideProductGroup({
    groupId: flaggedGroup.id,
    mediaIds: flaggedGroup.media.map((row) => row.mediaId),
    decision: GROUP_DECISIONS.SAME_PRODUCT,
    actor: ADMIN,
  });
  assert.ok(decision.ok);
  assert.equal(decision.conflicts, 0, "unassigned group media must transfer cleanly");
  assert.match(decision.product.id, /^SAR-\d{3}$/);
  const product = catalogRepository.find(decision.product.id);
  assert.equal(product.mediaIds.length, 3, "one product owns all three views");
  /* Claims resolve through the product RECORD (as every workspace view
     passes it) — the set must show the complete group. */
  const set = getProductMediaSet(product);
  assert.equal(set.gallery.length, 3);
  assert.equal(set.hasAlternate, true, "front/side/close gives a real alternate hover");
  assert.ok(["side", "front-close"].includes(set.hover?.view));

  /* KEEP AS SEPARATE leaves media untouched. */
  const separate = groups.find((group) => group.id.startsWith("duplicate-"));
  if (separate) {
    const kept = decideProductGroup({
      groupId: separate.id,
      mediaIds: separate.media.map((row) => row.mediaId),
      decision: GROUP_DECISIONS.SEPARATE_PRODUCTS,
      actor: ADMIN,
    });
    assert.ok(kept.ok);
    assert.equal(kept.product, null, "separate products must not create a product");
  }

  /* Cleanup. */
  catalogRepository.archiveProduct(decision.product.id, ADMIN);
  resetGroups();
});

test("group registry supports merge and split decisions", async () => {
  const { createGroup, mergeGroups, splitGroup, addMediaToGroup } = await import(
    "../src/services/media/productMediaGroups.js"
  );
  const a = createGroup({ mediaIds: ["m1", "m2"], reason: "hand-made group" }, "Admin");
  const b = createGroup({ mediaIds: ["m3"], reason: "second group" }, "Admin");
  assert.ok(a && b);
  const merged = mergeGroups([a.id, b.id], "Admin");
  assert.equal(merged.mediaIds.length, 3);
  const split = splitGroup(merged.id, ["m1"], "Admin");
  assert.ok(split);
  const remaining = merged.id;
  assert.deepEqual(getAllGroups().find((entry) => entry.id === remaining).mediaIds, ["m2", "m3"]);
  assert.deepEqual(split.mediaIds, ["m1"]);
  addMediaToGroup(remaining, ["m4"], "Admin");
  assert.equal(getAllGroups().find((entry) => entry.id === remaining).mediaIds.length, 3);
  resetGroups();
});

/* ------------------------------------------------------------------ */
/* 9. Metrics snapshot                                                 */
/* ------------------------------------------------------------------ */

test("workflow metrics are internally consistent", () => {
  const metrics = getWorkflowMetrics();
  assert.equal(
    metrics.products.total,
    metrics.products.published + metrics.products.draft + metrics.products.review + metrics.products.archived,
    "product statuses must partition the register"
  );
  assert.equal(metrics.media.duplicateOwnership, 0);
  assert.equal(metrics.media.invalidProductIds.length, 0);
  assert.equal(metrics.media.orphaned, 0);
  assert.equal(metrics.kids.totalMedia, 21);
  assert.equal(metrics.kids.draftProducts, 21);
  assert.equal(metrics.kids.mediaWithValidOwnership, 21);
});
