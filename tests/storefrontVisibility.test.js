/**
 * PRATIKSHYA FASHON — Storefront visibility flow tests (Phase 23.1).
 *
 * Proves the COMPLETE customer-facing data flow for a reconciled product —
 * not just that a record exists, but that once a human fills and publishes it
 * through the existing workflow, it flows all the way to the storefront:
 *
 *   MEDIA → PRODUCT → PUBLISHED → getLiveStorefrontProducts()
 *   → category filter → product grid → ProductCard (primary/hover/gallery)
 *   → product detail route.
 *
 * The publication here is a CONTROLLED, in-memory fixture: publish validation
 * is never weakened, and the product is archived at the end so no customer
 * surface is altered for any other test.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, { getPublishIssues } from "../src/services/catalogRepository.js";
import {
  approveProduct,
  publishProduct,
  submitProductForReview,
} from "../src/services/productWorkflow.js";
import {
  getLiveStorefrontProducts,
  getProductBySlug,
  productHref,
} from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getProductCardMedia } from "../src/services/media/productMediaSet.js";
import { reconciliationDraftRecords } from "../src/services/catalogueReconciliation.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

/** Fill a reconciliation draft the way the admin editor does (pricing engine). */
const fillDraft = (id, patch = {}) =>
  catalogRepository.updateDraft(
    id,
    {
      name: "Mulberry Silk Saree in Rose Quartz",
      subcategory: "Silk Saree",
      description: "Handwoven mulberry silk saree with a rose quartz ground and zari border.",
      sku: `${id}-SKU`,
      colors: ["Rose", "Gold"],
      sizes: ["Free Size"],
      fabric: "Mulberry Silk",
      material: "Zari Work",
      occasion: ["Festive", "Wedding"],
      stock: 8,
      availability: "in-stock",
      pricing: { sellingPrice: 21900, mrp: 26800 },
      reviewFlags: [],
      ...patch,
    },
    ADMIN
  );


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("a reconciled draft is DRAFT and invisible until published", () => {
  const drafts = reconciliationDraftRecords();
  assert.ok(drafts.length > 0, "reconciliation must have produced drafts");
  const id = drafts.find((draft) => draft.sourceGroupKey === "women-saree-silk-004")?.id;
  assert.ok(id, "the silk-004 group must have a draft");

  const product = catalogRepository.find(id);
  assert.equal(product.status, "DRAFT");
  assert.equal(
    getLiveStorefrontProducts().some((entry) => entry.id === id),
    false,
    "a DRAFT must never reach the storefront source"
  );
});

test("a filled + published reconciled product flows the whole storefront pipeline", () => {
  const draft = reconciliationDraftRecords().find(
    (entry) => entry.sourceGroupKey === "women-saree-silk-004"
  );
  assert.ok(draft);
  const id = draft.id;
  const baseline = getLiveStorefrontProducts().length;

  try {
    /* Fill through the canonical editor-shaped payload. */
    fillDraft(id);

    const issues = getPublishIssues(catalogRepository.find(id));
    assert.deepEqual(issues, [], `publish blockers should clear: ${issues.join("; ")}`);

    /* Phase 2 canonical lifecycle: submit → approve → publish. */
    assert.ok(submitProductForReview(id, ADMIN).ok, "submission succeeds");
    const approved = approveProduct(id, ADMIN);
    assert.ok(approved.ok, `approve must succeed: ${(approved.errors ?? []).join("; ")}`);
    assert.equal(
      getLiveStorefrontProducts().some((entry) => entry.id === id),
      false,
      "approved-but-unpublished products stay invisible"
    );

    const result = publishProduct(id, ADMIN);
    assert.ok(result.ok, `publish must succeed: ${(result.errors ?? []).join("; ")}`);

    const product = catalogRepository.find(id);
    assert.equal(product.status, "PUBLISHED");

    /* 1. Storefront source. */
    const storefront = getLiveStorefrontProducts();
    assert.equal(storefront.length, baseline + 1, "published product joins the storefront source");
    assert.ok(storefront.some((entry) => entry.id === id));

    /* 2. Category filter (the canonical query the category page runs). */
    const sarees = queryCatalogue({ scopeFilters: { category: "sarees" } }).results;
    assert.ok(sarees.some((entry) => entry.id === id), "appears on its category page");
    assert.equal(
      new Set(sarees.map((entry) => entry.id)).size,
      sarees.length,
      "category results dedupe by Product ID"
    );

    /* 3. Product card media: primary front, hover back, gallery = own views. */
    const card = getProductCardMedia(product);
    assert.equal(card.image?.fileName, "women-saree-silk-004-front.webp");
    assert.equal(card.hoverImage?.fileName, "women-saree-silk-004-back.webp");
    assert.equal(card.mediaSet.gallery.length, 2);
    card.mediaSet.gallery.forEach((item) => {
      assert.equal(String(item.productId), id, "gallery media must belong to this product");
    });

    /* 4. Product detail route. */
    const href = productHref(product);
    assert.equal(href, `/product/${id.toLowerCase()}`);
    const bySlug = getProductBySlug(product.slug);
    assert.ok(bySlug, "PDP route resolves");
    assert.equal(bySlug.id, id);
  } finally {
    /* Roll back: archive the fixture so no other test sees a new published row. */
    catalogRepository.archiveProduct(id, ADMIN);
    assert.equal(getLiveStorefrontProducts().length, baseline, "storefront count restored");
  }
});

test("every published product resolves an owned card image and a PDP route", () => {
  const storefront = getLiveStorefrontProducts();
  assert.ok(storefront.length > 0);
  const seenSlugs = new Set();
  storefront.forEach((product) => {
    assert.ok(!seenSlugs.has(product.slug), `duplicate slug ${product.slug}`);
    seenSlugs.add(product.slug);

    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} must have a primary`);
    if (card.image.productId) {
      assert.equal(
        String(card.image.productId),
        String(product.id),
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
    assert.equal(getProductBySlug(product.slug)?.id, product.id, `${product.id} PDP route`);
  });
});

test("the Kids category renders 21 distinct published products with owned media", () => {
  const kids = queryCatalogue({ scopeFilters: { category: "kidswear" } }).results;
  assert.equal(kids.length, 21);
  assert.equal(new Set(kids.map((entry) => entry.id)).size, 21, "21 distinct Product IDs");

  const primaryFiles = new Set();
  kids.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} must have a primary`);
    const file = card.image.fileName || card.image.src?.split("/").pop();
    primaryFiles.add(file);
    assert.match(String(file ?? ""), /^kids-\d{3}\.webp$/, "each kid shows its own plate");
    if (card.hoverImage) {
      assert.equal(
        String(card.hoverImage.productId),
        String(product.id),
        "kids hover must come from the same product"
      );
    }
  });
  assert.equal(primaryFiles.size, 21, "no repeated primary image across the 21 kids");
});

test("category pages derive from the canonical catalogue — no hardcoded product arrays", () => {
  const files = [
    "src/pages/CatalogueListing.jsx",
    "src/components/storefront/CatalogueBrowser.jsx",
    "src/components/storefront/ProductGrid.jsx",
    "src/components/storefront/NewArrivals.jsx",
    "src/components/storefront/SareeEditCarousel.jsx",
    "src/components/storefront/HeroCarousel.jsx",
    "src/components/storefront/ShopByCategory.jsx",
    "src/components/storefront/SaleBanner.jsx",
    "src/pages/AtelierDesign.jsx",
    "src/pages/Explore.jsx",
    "src/components/explore/ExploreBrowser.jsx",
    "src/components/explore/ExploreProductGrid.jsx",
  ];
  files.forEach((rel) => {
    const path = join(__dirname, "..", rel);
    if (!existsSync(path)) return;
    const source = readFileSync(path, "utf8");
    /* No literal catalogue arrays of product objects in storefront components. */
    assert.ok(
      !/const\s+(products|sarees|lehengas|kids|menProducts|bridalProducts)\s*=\s*\[/i.test(source),
      `${rel} must not hardcode a product array`
    );
    assert.ok(!/Math\.random|shuffle\(/i.test(source), `${rel} must not randomise imagery`);
  });
});
