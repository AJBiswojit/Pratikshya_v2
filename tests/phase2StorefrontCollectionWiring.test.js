/**
 * PRATIKSHYA FASHON — Phase 2 Storefront Discovery & Collection Wiring Tests.
 *
 * Covers:
 *   1. Explore page runtime, shipping rules, query data and stream integrity.
 *   2. New Arrivals canonical collection resolution and Admin -> Storefront synchronization.
 *   3. Collection architecture unification through taxonomyRepository.
 *   4. Collection URL normalization and backward compatibility.
 *   5. Architecture guards against hardcoded collection arrays and fragmented logic.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, {
  persistCanonicalCatalogueState,
} from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import {
  hasNavigationScope,
  resolveNavigationScope,
  collectionRoutes,
} from "../src/data/products/taxonomy.js";
import {
  getExploreProducts,
  getExploreOffers,
  buildExploreStream,
  queryExplore,
} from "../src/data/products/explore.js";
import { readShippingRules } from "../src/config/commerceDefaults.js";
import { collectionPath, collectionHref, resolveCollectionRoute } from "../src/services/taxonomyRouting.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const readSource = (relative) => readFileSync(join(__dirname, "..", relative), "utf8");

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const publishAllProducts = () => {
  persistCanonicalCatalogueState(
    catalogRepository.all().map((record) => ({ ...record, status: "PUBLISHED" })),
    "phase2-test-publish"
  );
  return getLiveStorefrontProducts();
};

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

/* ------------------------------------------------------------------ */
/* 1. Explore Page & Commerce Configuration                           */
/* ------------------------------------------------------------------ */

test("ExploreOfferStrip source references readShippingRules without undeclared FREE_SHIPPING_THRESHOLD", () => {
  const source = readSource("src/components/explore/ExploreOfferStrip.jsx");
  assert.equal(
    /FREE_SHIPPING_THRESHOLD\b/.test(source),
    false,
    "ExploreOfferStrip must not reference undeclared FREE_SHIPPING_THRESHOLD"
  );
  assert.match(
    source,
    /readShippingRules\s*\(\)/,
    "ExploreOfferStrip must consume readShippingRules()"
  );
});

test("readShippingRules provides the runtime shipping threshold", () => {
  const rules = readShippingRules();
  assert.ok(typeof rules.freeShippingThreshold === "number");
  assert.ok(rules.freeShippingThreshold > 0);
});

test("Explore queries live published products and generates valid stream inserts", () => {
  publishAllProducts();
  const live = getLiveStorefrontProducts();
  const exploreProducts = getExploreProducts();

  assert.ok(live.length > 0, "published catalogue is available");
  assert.equal(exploreProducts.length, live.length, "explore products match live storefront count");

  const stream = buildExploreStream(exploreProducts);
  assert.ok(stream.length >= exploreProducts.length, "stream contains products and inserts");
  const promoInserts = stream.filter((item) => item.type === "promo");
  const editorialInserts = stream.filter((item) => item.type === "editorial");
  assert.ok(promoInserts.length > 0, "promo inserts are generated");
  assert.ok(editorialInserts.length > 0, "editorial inserts are generated");
});

test("Explore offer repository integration resolves visible customer offers", () => {
  const offers = getExploreOffers();
  assert.ok(Array.isArray(offers));
  offers.forEach((offer) => {
    assert.ok(offer.code, "offer has a code");
  });
});

/* ------------------------------------------------------------------ */
/* 2. New Arrivals & Collection Synchronization                       */
/* ------------------------------------------------------------------ */

test("/collections/new-arrivals scope delegates to collectionId: 'new-arrivals'", () => {
  assert.ok(hasNavigationScope("/collections/new-arrivals"));
  const scope = resolveNavigationScope("/collections/new-arrivals");
  assert.deepEqual(scope.filters, { collectionId: "new-arrivals" });
});

test("Published product with isNew: true appears in New Arrivals collection query", () => {
  publishAllProducts();
  const query = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  assert.ok(query.total > 0, "New arrivals query returns pieces");
  assert.equal(query.total, 14, "Exact 14 seed products with isNew: true are found");
  query.results.forEach((product) => {
    assert.equal(product.isNew, true, "Each member has isNew: true");
    assert.equal(product.status, "PUBLISHED", "Each member is PUBLISHED");
  });
});

test("Admin manual assignment to New Arrivals immediately reflects in storefront collection query", () => {
  publishAllProducts();
  const initialQuery = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  const initialTotal = initialQuery.total;

  /* Select a published product that does NOT have isNew */
  const nonNewProduct = getLiveStorefrontProducts().find((p) => !p.isNew);
  assert.ok(nonNewProduct, "found candidate non-new product");

  /* Admin assigns product to new-arrivals */
  const assignResult = taxonomyRepository.addProductsToCollection(
    "new-arrivals",
    [nonNewProduct.id],
    ADMIN
  );
  assert.ok(assignResult.ok, "assignment succeeds");

  /* Storefront query now includes the manually assigned product */
  const updatedQuery = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  assert.equal(updatedQuery.total, initialTotal + 1, "product count increases by 1");
  assert.ok(
    updatedQuery.results.some((p) => p.id === nonNewProduct.id),
    "assigned product appears in storefront New Arrivals"
  );

  /* Admin removes product from new-arrivals */
  const removeResult = taxonomyRepository.removeProductsFromCollection(
    "new-arrivals",
    [nonNewProduct.id],
    ADMIN
  );
  assert.ok(removeResult.ok, "removal succeeds");

  const finalQuery = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  assert.equal(finalQuery.total, initialTotal, "product count returns to baseline");
  assert.equal(
    finalQuery.results.some((p) => p.id === nonNewProduct.id),
    false,
    "removed product no longer appears in storefront New Arrivals"
  );
});

test("Draft product assigned to New Arrivals remains hidden on storefront", () => {
  /* Leave all products in default DRAFT status */
  const draftProduct = catalogRepository.all()[0];
  taxonomyRepository.addProductsToCollection("new-arrivals", [draftProduct.id], ADMIN);

  const query = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  assert.equal(query.total, 0, "DRAFT products must never appear on storefront");
});

test("Archived product assigned to New Arrivals remains hidden on storefront", () => {
  publishAllProducts();
  const target = getLiveStorefrontProducts()[0];
  taxonomyRepository.addProductsToCollection("new-arrivals", [target.id], ADMIN);

  /* Archive target product */
  persistCanonicalCatalogueState(
    catalogRepository.all().map((p) =>
      p.id === target.id ? { ...p, status: "ARCHIVED" } : { ...p, status: "PUBLISHED" }
    ),
    "archive-test"
  );

  const query = queryCatalogue({ scopeFilters: { collectionId: "new-arrivals" } });
  assert.equal(
    query.results.some((p) => p.id === target.id),
    false,
    "ARCHIVED product must not appear on storefront"
  );
});

/* ------------------------------------------------------------------ */
/* 3. Canonical Collection Architecture                               */
/* ------------------------------------------------------------------ */

test("all managed collections in taxonomyRepository resolve through { collectionId }", () => {
  const active = taxonomyRepository.activeCollections();
  assert.ok(active.length >= 8);

  for (const collection of active) {
    const scope = resolveNavigationScope(`/collections/${collection.id}`);
    assert.ok(scope, `/collections/${collection.id} has navigation scope`);
    assert.deepEqual(
      scope.filters,
      { collectionId: collection.id },
      `${collection.id} scope uses canonical { collectionId: "${collection.id}" }`
    );
  }
});

test("collectionRoutes helper uses canonical collectionId filters", () => {
  for (const [slug, route] of Object.entries(collectionRoutes)) {
    assert.ok(route.filters.collectionId, `collectionRoutes[${slug}] uses collectionId`);
  }
});

test("unknown collection returns zero results without inventing products", () => {
  publishAllProducts();
  const query = queryCatalogue({ scopeFilters: { collectionId: "non-existent-collection" } });
  assert.equal(query.total, 0);
  assert.deepEqual(query.results, []);
});

/* ------------------------------------------------------------------ */
/* 4. Collection Routing & Backward Compatibility                     */
/* ------------------------------------------------------------------ */

test("taxonomyRouting collectionPath generates /collections/:slug (plural)", () => {
  assert.equal(collectionPath("new-arrivals"), "/collections/new-arrivals");
  assert.equal(collectionPath("festive-edit"), "/collections/festive-edit");
});

test("taxonomyRouting collectionHref generates /collections/:slug for ACTIVE collections", () => {
  const newArrivals = taxonomyRepository.findCollection("new-arrivals");
  assert.equal(collectionHref(newArrivals), "/collections/new-arrivals");

  const heritage = taxonomyRepository.findCollection("heritage-weaves");
  assert.equal(collectionHref(heritage), "/collections/heritage-weaves");
});

test("resolveCollectionRoute resolves active collection destination", () => {
  const resolved = resolveCollectionRoute("new-arrivals");
  assert.ok(resolved);
  assert.equal(resolved.href, "/collections/new-arrivals");
});

/* ------------------------------------------------------------------ */
/* 5. Architecture Guards                                             */
/* ------------------------------------------------------------------ */

test("source files do not contain hardcoded collection product arrays or obsolete routes", () => {
  const filesToCheck = [
    "src/pages/Shop.jsx",
    "src/pages/Cart.jsx",
    "src/components/account/AccountHero.jsx",
    "src/pages/account/AccountOrders.jsx",
    "src/pages/account/AccountDashboard.jsx",
    "src/components/storefront/CatalogueBrowser.jsx",
    "src/components/storefront/NewArrivals.jsx",
    "src/services/taxonomyRouting.js",
  ];

  for (const relPath of filesToCheck) {
    const content = readSource(relPath);
    assert.equal(
      /\/collection\/new-arrivals/.test(content),
      false,
      `${relPath} must not contain legacy /collection/new-arrivals link`
    );
  }
});
