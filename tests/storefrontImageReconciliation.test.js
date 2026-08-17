/**
 * PRATIKSHYA FASHON — Storefront image reconciliation tests (Phase 23.2).
 *
 * Proves the canonical product photography actually renders on the customer
 * facing cards for the categories that previously showed shared house plates:
 *
 *   · bangles / jewellery (earrings) / innerwear resolve their own
 *     /library photograph — never the shared house-bridal-bangles.jpg
 *   · the canonical → published assignment is deterministic and stable
 *   · authored house plates never leak into a product's gallery or hover
 *     once it owns canonical media
 *   · Product IDs stay stable (a group never renumbers when another group
 *     is assigned to a published product)
 *   · no cross-product / duplicate media results from the assignment
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getProductCardMedia, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  assignedProductMediaMap,
  reconciliationDraftRecords,
  staticUncataloguedGroups,
} from "../src/services/catalogueReconciliation.js";

const products = () => catalogRepository.all();


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("the canonical assignment is deterministic and category-scoped", () => {
  const map = assignedProductMediaMap(products());
  assert.equal(map.size, 13, "8 bangles + 2 earrings + 3 innerwear");

  /* Deterministic: same inputs, same map. */
  const again = assignedProductMediaMap(products());
  assert.deepEqual([...map.entries()], [...again.entries()]);

  /* Only the flagged categories are assigned — never sarees / menswear. */
  [...map.values()].forEach((productId) => {
    const product = catalogRepository.find(productId);
    assert.ok(["bangles", "jewellery", "innerwear"].includes(product.category));
  });
});

test("published bangles render their own canonical library photograph", () => {
  const bangles = getLiveStorefrontProducts()
    .filter((product) => product.category === "bangles")
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.equal(bangles.length, 8);

  const files = new Set();
  bangles.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} must have a primary`);
    const file = card.image.fileName || card.image.src?.split("/").pop();
    assert.match(String(file ?? ""), /^jewellery-bangle-\d{3}\.webp$/, `${product.id} shows ${file}`);
    files.add(file);
    /* A single-view product must not swap on hover. */
    assert.equal(card.hoverImage, undefined, `${product.id} has no alternate view`);
  });
  assert.equal(files.size, 8, "8 distinct bangle photographs — no repeats");
});

test("published innerwear and jewellery earrings render canonical media", () => {
  const innerwear = getLiveStorefrontProducts().filter((product) => product.category === "innerwear");
  assert.equal(innerwear.length, 3);
  innerwear.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.match(String(card.image?.fileName ?? ""), /^women-innerwear-\d{3}\.webp$/);
  });

  const earrings = getLiveStorefrontProducts()
    .filter((product) => product.category === "jewellery" && product.subcategory === "Earrings");
  assert.equal(earrings.length, 2);
  earrings.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.match(String(card.image?.fileName ?? ""), /^jewellery-earring-\d{3}\.webp$/);
  });
});

test("canonical media never coexists with an authored house plate in gallery/hover", () => {
  const bangles = getLiveStorefrontProducts().filter((product) => product.category === "bangles");
  bangles.forEach((product) => {
    const set = getProductMediaSet(product);
    assert.equal(set.gallery.length, 1, `${product.id} shows only its own photograph`);
    set.gallery.forEach((item) => {
      assert.equal(String(item.productId), String(product.id), "gallery owned by this product");
      assert.ok(!String(item.fileName || "").startsWith("house-"), "no house plate in the gallery");
    });
    assert.equal(set.hasAlternate, false, "no invented hover from an authored plate");
  });
});

test("Product IDs stay stable — a group never renumbers after assignment", () => {
  const drafts = reconciliationDraftRecords(products());
  const byGroup = new Map(drafts.map((draft) => [draft.sourceGroupKey, draft.id]));

  /* The 9th bangle photo is the only uncatalogued bangle → it keeps BAN-009,
     never renumbered to BAN-001. */
  assert.equal(byGroup.get("jewellery-bangle-009"), "BAN-009");
  /* Innerwear keeps its original numbers (004..019 remain drafts). */
  assert.equal(byGroup.get("women-innerwear-004"), "INN-004");
  /* Earrings keep the anklet-first ordering (anklets 001..005 → JEW-001..005,
     earrings 003..014 → JEW-008..019). */
  assert.equal(byGroup.get("jewellery-earring-003"), "JEW-008");
  assert.equal(byGroup.get("jewellery-anklet-001"), "JEW-001");
});

test("assigned + drafted partition every uncatalogued group (no double-count)", () => {
  const map = assignedProductMediaMap(products());
  const drafts = reconciliationDraftRecords(products());
  assert.equal(map.size + drafts.length, staticUncataloguedGroups().length);
});

test("no cross-product or duplicate media is introduced by the assignment", () => {
  /* One canonical photograph is owned by exactly one product. */
  const byFile = new Map();
  mediaRepository
    .getAll()
    .filter((item) => item.ingested || item.source === "Ingested library")
    .forEach((item) => {
      const file = (item.currentFilename || item.fileName || "").toLowerCase();
      if (!file || file.startsWith("house-")) return;
      if (!byFile.has(file)) byFile.set(file, new Set());
      byFile.get(file).add(String(item.productId ?? ""));
    });
  const duplicates = [...byFile.values()].filter((owners) => new Set([...owners].filter(Boolean)).size > 1);
  assert.equal(duplicates.length, 0, "no ingested photograph is owned by two products");

  /* Every published product's card media belongs to itself. */
  getLiveStorefrontProducts().forEach((product) => {
    const card = getProductCardMedia(product);
    if (card.image?.productId) {
      assert.equal(String(card.image.productId), String(product.id), `${product.id} cross-product primary`);
    }
    if (card.hoverImage) {
      assert.equal(String(card.hoverImage.productId), String(product.id), `${product.id} cross-product hover`);
    }
  });
});
