/**
 * Marketing placement product assignment — repository, resolver and selector
 * query contracts.
 *
 * These tests exercise the pure modules behind the Marketing Media product
 * curation flow. They use the canonical catalogue exactly as the selector
 * does, and never maintain a parallel product list.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { products as catalogueProducts } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";
import catalogRepository from "../src/services/catalogRepository.js";
import marketingPlacementRepository, {
  MARKETING_PLACEMENTS_STORAGE_KEY,
  resetPlacementAssignments,
} from "../src/services/media/marketingPlacementRepository.js";
import {
  resolvePlacementProducts,
  resolvePlacementEntries,
  hasPlacementAssignments,
} from "../src/services/media/marketingPlacementResolver.js";
import {
  filterCatalogProducts,
  matchesQuery,
  departmentOptions,
  categoryOptionsFor,
  subcategoryOptionsFor,
} from "../src/services/marketing/productCatalogQuery.js";
import {
  MARKETING_PLACEMENT_OPTIONS,
  MARKETING_PLACEMENTS,
  PLACEMENT_MODES,
  isProductPlacement,
  getPlacement,
} from "../src/config/mediaTypes.js";

/* ------------------------------------------------------------------ */
/* Fixture helpers                                                     */
/* ------------------------------------------------------------------ */

const storageBackends = () => {
  const stores = [];
  try {
    if (typeof globalThis.localStorage !== "undefined" && globalThis.localStorage) {
      stores.push(globalThis.localStorage);
    }
  } catch {
    /* optional */
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) stores.push(window.localStorage);
  } catch {
    /* optional */
  }
  return stores;
};

const clearStorage = () => {
  storageBackends().forEach((storage) => storage.removeItem(MARKETING_PLACEMENTS_STORAGE_KEY));
  resetPlacementAssignments();
};

test.beforeEach(clearStorage);
test.afterEach(clearStorage);

const SAREE_A = "PF-W-SAR-BAN-0001";
const SAREE_B = "PF-W-SAR-COT-0001";
const SAREE_C = "PF-W-SAR-SIL-0001";
const KIDS_A = catalogueProducts.find((product) => product.department === "kids")?.id;
assert.ok(KIDS_A, "the canonical catalogue must provide a Kids Product for placement coverage");

/* ------------------------------------------------------------------ */
/* Placement configuration                                             */
/* ------------------------------------------------------------------ */

test("product placements carry structured recommended taxonomy; generic placements do not", () => {
  const saree = getPlacement(MARKETING_PLACEMENTS.SAREE_SECTION);
  const lehenga = getPlacement(MARKETING_PLACEMENTS.LEHENGA_SECTION);
  const kids = getPlacement(MARKETING_PLACEMENTS.KIDS_SECTION);
  const hero = getPlacement(MARKETING_PLACEMENTS.HOME_HERO);

  assert.equal(saree.mode, PLACEMENT_MODES.PRODUCT);
  assert.deepEqual(
    { department: saree.recommendedDepartment, category: saree.recommendedCategory },
    { department: "women", category: "sarees" }
  );

  assert.equal(lehenga.mode, PLACEMENT_MODES.PRODUCT);
  assert.equal(lehenga.recommendedDepartment, "women");
  assert.equal(lehenga.recommendedCategory, "lehengas");

  assert.equal(kids.mode, PLACEMENT_MODES.PRODUCT);
  assert.equal(kids.recommendedDepartment, "kids");

  assert.equal(hero.mode, PLACEMENT_MODES.GENERIC);
  assert.equal(hero.recommendedDepartment, undefined);

  /* Every PRODUCT placement has a mode; every placement in the vocabulary
     declares one explicitly (PRODUCT or GENERIC) — none may be undefined. */
  MARKETING_PLACEMENT_OPTIONS.forEach((placement) => {
    assert.ok(
      placement.mode === PLACEMENT_MODES.PRODUCT || placement.mode === PLACEMENT_MODES.GENERIC,
      `${placement.id} must declare a mode`
    );
    assert.ok(isProductPlacement(placement.id) === (placement.mode === PLACEMENT_MODES.PRODUCT));
  });
});

/* ------------------------------------------------------------------ */
/* Repository                                                          */
/* ------------------------------------------------------------------ */

test("set/add/remove/move/clear operate on product references only", () => {
  const placement = MARKETING_PLACEMENTS.SAREE_SECTION;

  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement), []);

  marketingPlacementRepository.setPlacementProductIds(placement, [SAREE_A, SAREE_B, SAREE_C]);
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement), [
    SAREE_A,
    SAREE_B,
    SAREE_C,
  ]);

  /* add appends, skipping duplicates */
  const afterAdd = marketingPlacementRepository.addPlacementProductIds(placement, [SAREE_A, "PF-W-SAR-SIL-0002"]);
  assert.deepEqual(afterAdd, [SAREE_A, SAREE_B, SAREE_C, "PF-W-SAR-SIL-0002"]);

  /* move up/down preserves the rest of the order */
  assert.deepEqual(marketingPlacementRepository.movePlacementProductId(placement, SAREE_C, "down"), [
    SAREE_A,
    SAREE_B,
    "PF-W-SAR-SIL-0002",
    SAREE_C,
  ]);
  assert.deepEqual(marketingPlacementRepository.movePlacementProductId(placement, SAREE_A, "up"), [
    SAREE_A,
    SAREE_B,
    "PF-W-SAR-SIL-0002",
    SAREE_C,
  ]);

  /* remove drops the reference only */
  assert.deepEqual(marketingPlacementRepository.removePlacementProductId(placement, SAREE_B), [
    SAREE_A,
    "PF-W-SAR-SIL-0002",
    SAREE_C,
  ]);

  /* the catalogue is untouched by any of the above */
  const remaining = catalogRepository.all().filter((product) =>
    [SAREE_A, SAREE_B, SAREE_C, "PF-W-SAR-SIL-0002"].includes(product.id)
  );
  assert.equal(remaining.length, 4);

  assert.deepEqual(marketingPlacementRepository.clearPlacement(placement), []);
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement), []);
});

test("assignments survive a re-read and unknown placements are refused", () => {
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION, [KIDS_A]);

  /* Reading again (a page refresh equivalent) returns the same register. */
  assert.deepEqual(
    marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION),
    [KIDS_A]
  );

  /* A placement id outside the vocabulary is never stored. */
  assert.deepEqual(marketingPlacementRepository.setPlacementProductIds("NOT_A_PLACEMENT", ["X"]), []);
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds("NOT_A_PLACEMENT"), []);
});

/* ------------------------------------------------------------------ */
/* Resolver — canonical catalogue is the source of truth                */
/* ------------------------------------------------------------------ */

test("resolver returns assigned products from the supplied catalogue in placement order", () => {
  const live = catalogueProducts.filter((product) => [SAREE_A, SAREE_B, SAREE_C].includes(product.id));

  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION, [
    SAREE_C,
    SAREE_A,
    SAREE_B,
  ]);

  const resolved = resolvePlacementProducts(MARKETING_PLACEMENTS.SAREE_SECTION, live);
  assert.deepEqual(
    resolved.map((product) => product.id),
    [SAREE_C, SAREE_A, SAREE_B]
  );

  /* Ids missing from the supplied list (unpublished / retired) are skipped,
     never invented. */
  const narrowed = resolvePlacementProducts(MARKETING_PLACEMENTS.SAREE_SECTION, live.slice(0, 1));
  assert.deepEqual(
    narrowed.map((product) => product.id),
    [SAREE_A]
  );

  assert.equal(hasPlacementAssignments(MARKETING_PLACEMENTS.SAREE_SECTION), true);
});

test("entries resolve the canonical product primary image and route", () => {
  /* The storefront passes live catalogue rows (published products shaped by
     `toStorefrontProduct`); the entries resolver uses exactly those. */
  const live = catalogueProducts
    .filter((product) => [SAREE_A, SAREE_B].includes(product.id))
    .map((product, index) => toStorefrontProduct(product, index));
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION, [SAREE_A]);

  const entries = resolvePlacementEntries(MARKETING_PLACEMENTS.SAREE_SECTION, live);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].productId, SAREE_A);
  assert.equal(entries[0].product.id, SAREE_A);
  assert.equal(entries[0].route, `/product/${SAREE_A}`);
  assert.ok(entries[0].image.src.includes(`/${SAREE_A}/primary.avif`));

  /* The entry's image is the authored primary — no duplicate URL is created. */
  const authored = catalogueProducts.find((product) => product.id === SAREE_A);
  assert.equal(entries[0].image.src, authored.media.primary);

  /* Product media folders exist on disk — nothing is re-uploaded or copied. */
  const filePath = entries[0].image.src.split("?")[0];
  assert.ok(filePath.startsWith("/"));
  assert.equal(existsSync(join(process.cwd(), "public", filePath.replace(/^\//, ""))), true);
});

test("an empty placement resolves to nothing", () => {
  const live = catalogueProducts.slice(0, 5);
  assert.deepEqual(resolvePlacementProducts(MARKETING_PLACEMENTS.SAREE_SECTION, live), []);
  assert.deepEqual(resolvePlacementEntries(MARKETING_PLACEMENTS.SAREE_SECTION, live), []);
  assert.equal(hasPlacementAssignments(MARKETING_PLACEMENTS.SAREE_SECTION), false);
});

/* ------------------------------------------------------------------ */
/* Selector query                                                      */
/* ------------------------------------------------------------------ */

test("search covers name, id, sku, department, category and subcategory", () => {
  const all = catalogueProducts;
  const byName = filterCatalogProducts(all, { query: "Crimson" });
  const byId = filterCatalogProducts(all, { query: "PF-W-SAR" });
  const bySku = filterCatalogProducts(all, { query: "PFS-W-SAR-COT" });
  const byCategory = filterCatalogProducts(all, { query: "sarees" });
  const byDepartment = filterCatalogProducts(all, { query: "kids" });

  assert.ok(byName.length > 0);
  assert.ok(byName.every((product) => matchesQuery(product, "Crimson")));

  assert.ok(byId.length >= 14, "every saree id matches PF-W-SAR");
  assert.ok(byId.every((product) => product.id.startsWith("PF-W-SAR")));

  assert.ok(bySku.length > 0);
  assert.ok(bySku.every((product) => String(product.sku).includes("PFS-W-SAR-COT")));

  /* "sarees" matches the category, and any product whose subcategory is
     literally "sarees" (e.g. bridal the-bride sarees) — all are saree wear. */
  assert.ok(byCategory.length >= 14);
  assert.ok(
    byCategory.every(
      (product) =>
        product.category === "sarees" ||
        product.subcategory === "sarees" ||
        matchesQuery(product, "sarees")
    )
  );
  assert.ok(byCategory.some((product) => product.category === "sarees"));

  assert.ok(byDepartment.length === 10);
  assert.ok(byDepartment.every((product) => product.department === "kids"));
});

test("department / category / subcategory filters derive from taxonomy and narrow correctly", () => {
  const all = catalogueProducts;

  const departments = departmentOptions();
  assert.deepEqual(
    departments.map((entry) => entry.id),
    ["women", "bridal", "men", "kids"]
  );

  const sareeCategories = categoryOptionsFor(all, "women");
  assert.ok(sareeCategories.some((entry) => entry.id === "sarees"));
  assert.ok(sareeCategories.some((entry) => entry.id === "lehengas"));

  const kidsCategories = categoryOptionsFor(all, "kids");
  assert.deepEqual(
    kidsCategories.map((entry) => entry.id).sort(),
    ["boys", "girls"]
  );

  const sareeSubcategories = subcategoryOptionsFor(all, "women", "sarees");
  assert.deepEqual(
    sareeSubcategories.map((entry) => entry.id).sort(),
    ["banarasi", "cotton", "silk"]
  );

  const byDepartment = filterCatalogProducts(all, { department: "kids" });
  assert.equal(byDepartment.length, 10);
  assert.ok(byDepartment.every((product) => product.department === "kids"));

  const byCategory = filterCatalogProducts(all, { department: "women", category: "lehengas" });
  assert.equal(byCategory.length, 7);
  assert.ok(byCategory.every((product) => product.category === "lehengas"));

  const bySubcategory = filterCatalogProducts(all, {
    department: "women",
    category: "sarees",
    subcategory: "cotton",
  });
  assert.equal(bySubcategory.length, 5);
  assert.ok(bySubcategory.every((product) => product.subcategory === "cotton"));
});

test("combined search + filters intersect, and the full catalogue is always reachable", () => {
  const all = catalogueProducts;

  const combined = filterCatalogProducts(all, {
    department: "women",
    category: "sarees",
    query: "cotton",
  });
  assert.ok(combined.length > 0);
  assert.ok(
    combined.every(
      (product) => product.department === "women" && product.category === "sarees"
    )
  );
  assert.ok(combined.every((product) => matchesQuery(product, "cotton")));

  /* No filters at all returns the entire canonical catalogue — nothing is
     hidden because of an unrelated status field. */
  assert.equal(filterCatalogProducts(all).length, all.length);
  assert.equal(all.length, 128);
});
