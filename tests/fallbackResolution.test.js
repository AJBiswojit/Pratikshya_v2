/** Canonical authored-media fallback tests. */

import test from "node:test";
import assert from "node:assert/strict";

import { products as authoredProducts } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import {
  FALLBACK_REASONS,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveProductCover,
} from "../src/services/media/mediaResolver.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";

const storefrontProducts = authoredProducts.map(toStorefrontProduct);

test("every canonical category falls back to media from its own catalogue scope", () => {
  for (const category of taxonomyRepository.activeCategories()) {
    const cover = resolveCategoryCover(category);
    const member = authoredProducts.find((product) => product.category === category.id);
    assert.ok(member, `${category.id} has a canonical product`);
    assert.equal(cover.reason, FALLBACK_REASONS.STATIC_CATALOG);
    assert.equal(cover.src, member.media.primary);
  }
});

test("an authored product keeps its own primary and gallery", () => {
  for (const product of storefrontProducts) {
    const cover = resolveProductCover(product);
    const set = getProductMediaSet(product);
    assert.equal(cover.src, product.image.src);
    assert.equal(set.productId, product.id);
    assert.equal(set.primary.src, product.image.src);
    assert.ok(set.gallery.every((image) => image.productId === product.id));
  }
});

test("different products never borrow each other's authored media", () => {
  const [first, second] = storefrontProducts;
  const firstSet = getProductMediaSet(first);
  const secondSet = getProductMediaSet(second);
  assert.notEqual(first.id, second.id);
  assert.notEqual(firstSet.primary.src, secondSet.primary.src);
  assert.ok(!firstSet.gallery.some((image) => image.src === secondSet.primary.src));
});

test("collection resolution never invents a product or legacy library fallback", () => {
  for (const collection of taxonomyRepository.activeCollections()) {
    const cover = resolveCollectionCover(collection);
    assert.ok(Object.values(FALLBACK_REASONS).includes(cover.reason));
    if (!cover.src) continue;
    assert.ok(
      cover.src.startsWith("/images/products/") || cover.src.startsWith("/images/collections/"),
      `${collection.id} must use canonical Product or editorial collection media`
    );
  }
});
