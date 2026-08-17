/**
 * PRATIKSHYA FASHON — Phase 3E publish visibility tests.
 *
 * The publish button must have a VERIFIED end-to-end path:
 *
 *   ADMIN ACTION → CANONICAL COMMAND → PERSISTED PRODUCT
 *     → CACHE/QUERY INVALIDATION → STOREFRONT VISIBILITY
 *
 * These tests lock the service-level path in place. The browser-level
 * behaviour (real Admin UI in Chromium against the dev server) was verified
 * separately during Phase 3E and produced the root-cause fix these tests
 * guard: the canonical workflow command layer MUST be registered from the
 * application entry module, not only from routes whose chunk happens to
 * import the review workspace.
 *
 * Rules proven here, because passing one does not imply the others:
 *   · DRAFT / SUBMITTED / APPROVED products never reach the storefront
 *   · APPROVE ≠ PUBLISH — approval alone never publishes
 *   · publish persists to the register (survives a re-read of the raw store)
 *   · publish invalidates the catalogue caches (version + fingerprint)
 *   · the published product appears on the storefront, in its category
 *     query, in search and on the PDP lookup
 *   · blocking review flags stop publication until resolved
 *   · media is unchanged by publication
 *   · Kids products publish through the SAME canonical path
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository, {
  PRODUCT_STATUS,
  productsRegisterRaw,
  getCatalogVersion,
  getCatalogFingerprint,
} from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { workflowRegistryLoaded } from "../src/services/workflow/workflowCommandRegistry.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../src/services/workflow/productWorkflowState.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import {
  getLiveStorefrontProducts,
  getProductBySlug,
  getProductById,
} from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getExploreProducts } from "../src/data/products/explore.js";
import {
  approveKidsProduct,
  publishKidsProduct,
} from "../src/services/kidsProductFinalization.js";
import {
  CONFIRMED_KIDS_IDENTITIES,
  kidsFileNameOf,
} from "../src/services/kidsProductIdentity.js";
import { clearReviewFlags, flagsSatisfiedByProduct } from "../src/services/productWorkflow.js";
import { REVIEW_FLAGS } from "../src/services/productReviewFlags.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

let scratchCounter = 0;

/** A complete, publishable scratch product that owns its own media. */
const createScratch = (overrides = {}) => {
  scratchCounter += 1;
  const id = `PVT-${String(scratchCounter).padStart(3, "0")}`;
  const media = mediaRepository.create({
    url: `/library/scratch-publish-visibility-${id.toLowerCase()}.webp`,
    title: "Publish visibility scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id,
      name: `Publish Visibility Scratch Piece ${scratchCounter}`,
      category: "dupattas",
      subcategory: "Printed Dupatta",
      description: "Scratch product for the Phase 3E publish visibility tests.",
      sku: `${id}-SKU`,
      price: 1400,
      compareAtPrice: 1700,
      pricing: { sellingPrice: 1400, mrp: 1700 },
      stock: 4,
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
  const current = catalogRepository.find(product.id);
  if (current && current.status !== PRODUCT_STATUS.ARCHIVED) {
    catalogRepository.archiveProduct(product.id, ADMIN);
  }
  if (media) mediaRepository.remove(media.id);
};

const submitApprove = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, "submit must succeed");
  const approved = commands.approveProduct(id, ADMIN);
  assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join("; ")}`);
};

const onStorefront = (id) =>
  getLiveStorefrontProducts().some((product) => String(product.id) === String(id));

const inCategory = (id, category) =>
  queryCatalogue({ scopeFilters: { category } }).results.some(
    (product) => String(product.id) === String(id)
  );

const inSearch = (id, term) =>
  queryCatalogue({ search: term }).results.some((product) => String(product.id) === String(id));

const persistedRow = (id) => {
  const raw = productsRegisterRaw();
  const items = raw ? JSON.parse(raw) : [];
  return items.find((record) => String(record.id) === String(id)) ?? null;
};

/* ================================================================== */
/* 1–3. Complete valid product · approve · verify NOT published       */
/* ================================================================== */

test("1-3. a complete valid product approves without publishing", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  assert.equal(scratch.product.status, PRODUCT_STATUS.DRAFT, "starts as DRAFT");
  assert.equal(onStorefront(id), false, "DRAFT is customer-invisible");

  submitApprove(id);

  const approved = catalogRepository.find(id);
  assert.equal(getProductWorkflowState(approved).stage, WORKFLOW_STAGES.APPROVED);
  assert.notEqual(approved.status, PRODUCT_STATUS.PUBLISHED, "APPROVE ≠ PUBLISH");
  assert.equal(approved.published, false);
  assert.equal(onStorefront(id), false, "APPROVED is still customer-invisible");
  assert.equal(inCategory(id, "dupattas"), false, "APPROVED is not in its category query");

  cleanup(scratch);
});

/* ================================================================== */
/* 4–6. Publish · repository status · persistence                     */
/* ================================================================== */

test("4-6. publish persists PUBLISHED to the register", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);

  const published = commands.publishProduct(id, ADMIN);
  assert.ok(published.ok, `publish must succeed: ${(published.errors ?? []).join("; ")}`);
  assert.ok(published.published, "the command reports publication");

  /* Repository read. */
  const record = catalogRepository.find(id);
  assert.equal(record.status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(record.published, true);
  assert.ok(record.publishedAt, "publishedAt is recorded");
  assert.ok(record.publishedBy, "publishedBy is recorded");

  /* Raw persistence — what a browser refresh would re-read. */
  const row = persistedRow(id);
  assert.ok(row, "the row is in the persisted register");
  assert.equal(row.status, PRODUCT_STATUS.PUBLISHED, "the persisted status is PUBLISHED");

  cleanup(scratch);
});

/* ================================================================== */
/* 7–9. Storefront · category · PDP visibility                        */
/* ================================================================== */

test("7-9. a published product is visible on every relevant storefront surface", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);
  assert.ok(commands.publishProduct(id, ADMIN).ok);

  assert.equal(onStorefront(id), true, "getLiveStorefrontProducts includes the product");
  assert.equal(inCategory(id, "dupattas"), true, "the category query includes the product");
  assert.equal(getExploreProducts().some((p) => String(p.id) === id), true, "Explore includes the product");
  assert.equal(inSearch(id, "publish visibility scratch"), true, "search finds the product");

  const slug = catalogRepository.find(id).slug;
  const pdp = getProductBySlug(slug);
  assert.ok(pdp, "the PDP lookup resolves the published product");
  assert.equal(String(pdp.id), id);
  assert.ok(getProductById(id), "the id lookup resolves too");

  cleanup(scratch);
});

/* ================================================================== */
/* 10. Refresh persistence — a fresh read sees the same truth         */
/* ================================================================== */

test("10. publication survives a fresh read of the persisted register", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);
  assert.ok(commands.publishProduct(id, ADMIN).ok);

  /* A browser refresh re-parses the stored JSON string. Simulate exactly
     that: the raw string alone must carry the publication. */
  const raw = productsRegisterRaw();
  assert.ok(raw, "the register is persisted as a string");
  const parsed = JSON.parse(raw);
  const row = parsed.find((record) => String(record.id) === id);
  assert.equal(row.status, PRODUCT_STATUS.PUBLISHED, "the string alone proves publication");

  /* And the repository read built on that string agrees. */
  assert.equal(catalogRepository.find(id).status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(onStorefront(id), true);

  cleanup(scratch);
});

/* ================================================================== */
/* 11. Cache invalidation                                             */
/* ================================================================== */

test("11. publish invalidates the catalogue caches", () => {
  const scratch = createScratch();
  const id = scratch.product.id;
  submitApprove(id);

  const versionBefore = getCatalogVersion();
  const fingerprintBefore = getCatalogFingerprint();
  const storefrontBefore = getLiveStorefrontProducts();
  assert.equal(storefrontBefore.some((p) => String(p.id) === id), false);

  assert.ok(commands.publishProduct(id, ADMIN).ok);

  assert.ok(getCatalogVersion() > versionBefore, "the product version counter advanced");
  assert.notEqual(getCatalogFingerprint(), fingerprintBefore, "the fingerprint changed");

  const storefrontAfter = getLiveStorefrontProducts();
  assert.notEqual(storefrontAfter, storefrontBefore, "the memoised storefront list was rebuilt");
  assert.equal(storefrontAfter.some((p) => String(p.id) === id), true);

  cleanup(scratch);
});

/* ================================================================== */
/* 12. Review flag resolution — each blocking flag                    */
/* ================================================================== */

const FLAG_FIXTURES = [
  {
    flag: REVIEW_FLAGS.NAME_REVIEW_REQUIRED,
    overrides: {},
    fix: (id) => {
      /* The name is already real; the flag is a manual review marker the
         admin resolves after checking the field. */
      const satisfied = flagsSatisfiedByProduct(catalogRepository.find(id));
      assert.ok(satisfied.includes(REVIEW_FLAGS.NAME_REVIEW_REQUIRED));
      clearReviewFlags(id, [REVIEW_FLAGS.NAME_REVIEW_REQUIRED], ADMIN);
    },
  },
  {
    flag: REVIEW_FLAGS.PRICE_REVIEW_REQUIRED,
    overrides: {},
    fix: (id) => {
      const satisfied = flagsSatisfiedByProduct(catalogRepository.find(id));
      assert.ok(satisfied.includes(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED));
      clearReviewFlags(id, [REVIEW_FLAGS.PRICE_REVIEW_REQUIRED], ADMIN);
    },
  },
  {
    flag: REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED,
    overrides: {},
    fix: (id) => {
      const satisfied = flagsSatisfiedByProduct(catalogRepository.find(id));
      assert.ok(satisfied.includes(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED));
      clearReviewFlags(id, [REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED], ADMIN);
    },
  },
  {
    flag: REVIEW_FLAGS.GROUP_REVIEW_REQUIRED,
    overrides: {},
    fix: (id) => {
      clearReviewFlags(id, [REVIEW_FLAGS.GROUP_REVIEW_REQUIRED], ADMIN);
    },
  },
];

for (const fixture of FLAG_FIXTURES) {
  test(`12. ${fixture.flag} blocks publication until resolved`, () => {
    const scratch = createScratch({ reviewFlags: [fixture.flag], ...fixture.overrides });
    const id = scratch.product.id;
    assert.ok(commands.submitProduct(id, ADMIN).ok, "submit must succeed");

    /* 1. The flag stands → the validator blocks; the canonical lifecycle
       stops at the FIRST gate that runs the validation (approve), and a
       direct publish attempt is equally refused. */
    const validation = validateProductForPublish(catalogRepository.find(id));
    assert.equal(validation.ok, false, "the validator reports a blocking issue");
    assert.ok(
      validation.issues.some((issue) => issue.blocksPublish),
      "the issue blocks publication"
    );
    const refusedApprove = commands.approveProduct(id, ADMIN);
    assert.equal(refusedApprove.ok, false, "approval is blocked while the flag stands");
    const refused = commands.publishProduct(id, ADMIN);
    assert.equal(refused.ok, false, "publish is blocked while the flag stands");
    assert.equal(catalogRepository.find(id).status, "PENDING_REVIEW", "the product did not move");
    assert.equal(onStorefront(id), false);

    /* 2. The admin fixes/reviews the field and the flag is resolved. */
    fixture.fix(id);
    assert.equal(
      (catalogRepository.find(id).reviewFlags ?? []).includes(fixture.flag),
      false,
      "the flag is gone"
    );

    /* 3. The validator returns no blocking issue for that flag any more. */
    const revalidation = validateProductForPublish(catalogRepository.find(id));
    assert.equal(
      revalidation.issues.some(
        (issue) => issue.code === "REVIEW_FLAG_BLOCKING" && issue.message.includes(fixture.flag)
      ),
      false,
      "no blocking issue remains for the resolved flag"
    );

    /* 4. Approval and publish now succeed; the storefront reflects it. */
    const approved = commands.approveProduct(id, ADMIN);
    assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join("; ")}`);
    const published = commands.publishProduct(id, ADMIN);
    assert.ok(published.ok, `publish must succeed: ${(published.errors ?? []).join("; ")}`);
    assert.equal(onStorefront(id), true, "the storefront reflects the product");

    cleanup(scratch);
  });
}

/* ================================================================== */
/* 13. Invalid publish remains blocked                                */
/* ================================================================== */

test("13. an unapproved or invalid product can never publish", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  /* DRAFT → publish refused. */
  const draftPublish = commands.publishProduct(id, ADMIN);
  assert.equal(draftPublish.ok, false, "a DRAFT cannot publish");
  assert.equal(onStorefront(id), false);

  /* SUBMITTED (not approved) → publish refused. */
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  const submittedPublish = commands.publishProduct(id, ADMIN);
  assert.equal(submittedPublish.ok, false, "a SUBMITTED product cannot publish");
  assert.equal(onStorefront(id), false);

  /* Approved but re-flagged → the fresh publish validation refuses. */
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  catalogRepository.updateDraft(id, { reviewFlags: [REVIEW_FLAGS.NEEDS_MEDIA] }, ADMIN);
  const flaggedPublish = commands.publishProduct(id, ADMIN);
  assert.equal(flaggedPublish.ok, false, "publish revalidates — approval is never reused");
  assert.equal(catalogRepository.find(id).status, "PENDING_REVIEW");
  assert.equal(onStorefront(id), false);

  cleanup(scratch);
});

/* ================================================================== */
/* 14. Media remains correct after publication                        */
/* ================================================================== */

test("14. publishing does not change the product's media", () => {
  const scratch = createScratch();
  const id = scratch.product.id;

  const before = getProductMediaSet(catalogRepository.find(id));
  assert.ok(before.primary, "the scratch product owns a primary");
  const primaryBefore = String(before.primary.id);
  const galleryBefore = (before.gallery ?? []).map((item) => String(item.id));

  submitApprove(id);
  assert.ok(commands.publishProduct(id, ADMIN).ok);

  const after = getProductMediaSet(catalogRepository.find(id));
  assert.equal(String(after.primary?.id), primaryBefore, "the primary is unchanged");
  assert.deepEqual(
    (after.gallery ?? []).map((item) => String(item.id)),
    galleryBefore,
    "the gallery is unchanged"
  );
  assert.equal(
    String(mediaRepository.getById(scratch.media.id).productId),
    id,
    "register ownership is unchanged"
  );
  assert.equal((after.ownershipConflicts ?? []).length, 0, "no conflict appeared");

  cleanup(scratch);
});

/* ================================================================== */
/* 15. Kids publish path — same canonical lifecycle                   */
/* ================================================================== */

test("15. a Kids product publishes through the same canonical path and reaches the storefront", () => {
  const media = mediaRepository.create({
    url: "/library/scratch-kids-publish-visibility-01.webp",
    title: "Kids publish visibility scratch",
    status: "ACTIVE",
  });
  const created = catalogRepository.createDraftProduct(
    {
      id: "KID-871",
      name: "Boys' Publish Visibility Casual Set",
      category: "kidswear",
      subcategory: "Boys Casual Set",
      gender: "Kids",
      description: "Scratch Kids product for the Phase 3E publish visibility tests.",
      sku: "KID-871-SKU",
      price: 1190,
      compareAtPrice: 1590,
      pricing: { sellingPrice: 1190, mrp: 1590 },
      stock: 9,
      mediaIds: [media.id],
      primaryMediaId: media.id,
      galleryMediaIds: [media.id],
      reviewFlags: [],
    },
    ADMIN
  );
  assert.ok(created.ok);
  assert.ok(
    assignMediaToProduct({ mediaId: media.id, productId: "KID-871", principal: ADMIN, actor: ADMIN }).ok
  );

  assert.ok(commands.submitProduct("KID-871", ADMIN).ok);

  /* The Kids wrappers delegate to the universal commands. */
  const approved = approveKidsProduct("KID-871", ADMIN);
  assert.ok(approved.ok, `Kids approve must succeed: ${(approved.errors ?? []).join("; ")}`);
  assert.notEqual(catalogRepository.find("KID-871").status, PRODUCT_STATUS.PUBLISHED, "Kids approval does not publish");
  assert.equal(onStorefront("KID-871"), false);

  const published = publishKidsProduct("KID-871", ADMIN);
  assert.ok(published.ok, `Kids publish must succeed: ${(published.errors ?? []).join("; ")}`);
  assert.equal(catalogRepository.find("KID-871").status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(onStorefront("KID-871"), true, "the Kids product reaches the storefront");
  assert.equal(inCategory("KID-871", "kidswear"), true, "the kids category query includes it");
  assert.equal(persistedRow("KID-871").status, PRODUCT_STATUS.PUBLISHED, "persisted");

  cleanup({ media, product: catalogRepository.find("KID-871") });
});

/* ================================================================== */
/* 16. Kids media remains unchanged                                   */
/* ================================================================== */

test("16. the 21 confirmed Kids products and their media are untouched by publish activity", () => {
  const kidsOwnershipBefore = new Map(
    mediaRepository
      .getAll()
      .filter((item) => /^kids-\d{3}\.webp$/.test(kidsFileNameOf(item)))
      .map((item) => [kidsFileNameOf(item), String(item.productId ?? "")])
  );
  assert.equal(kidsOwnershipBefore.size, 21, "all 21 kids plates present");

  /* Run a complete non-Kids publish cycle. */
  const scratch = createScratch();
  submitApprove(scratch.product.id);
  assert.ok(commands.publishProduct(scratch.product.id, ADMIN).ok);

  const kidsOwnershipAfter = new Map(
    mediaRepository
      .getAll()
      .filter((item) => /^kids-\d{3}\.webp$/.test(kidsFileNameOf(item)))
      .map((item) => [kidsFileNameOf(item), String(item.productId ?? "")])
  );
  assert.deepEqual(
    [...kidsOwnershipAfter.entries()].sort(),
    [...kidsOwnershipBefore.entries()].sort(),
    "kids media ownership is byte-identical"
  );

  /* And every confirmed plate file still has exactly one owner — the same
     owner it had before (the seeded register keeps the confirmed identities
     under their historical product ids; the mapping itself is the lock). */
  CONFIRMED_KIDS_IDENTITIES.forEach((identity) => {
    assert.ok(
      kidsOwnershipAfter.has(identity.file),
      `${identity.file} is still an owned plate`
    );
    assert.ok(kidsOwnershipAfter.get(identity.file), `${identity.file} still has an owner`);
  });

  cleanup(scratch);
});

/* ================================================================== */
/* Regression guard — the browser bug's root cause                    */
/* ================================================================== */

test("the canonical workflow command layer is registered from the application entry", () => {
  /* Runtime: importing the command layer registered it for this process. */
  assert.ok(workflowRegistryLoaded(), "the registry is loaded");

  /* Static: the browser entry module registers it for EVERY route. The
     Phase 3E browser verification proved that without this import a direct
     full-page load of /admin/products or /admin/products/:id left the
     registry empty, and every lifecycle button (Publish included) failed
     with "The workflow command layer is not loaded". */
  const mainSource = readFileSync(join(ROOT, "src", "main.jsx"), "utf8");
  assert.ok(
    /import\s+["']\.\/services\/workflow\/productWorkflowCommands["']/.test(mainSource),
    "src/main.jsx must import the workflow command service so the registry is loaded on every route"
  );
});
