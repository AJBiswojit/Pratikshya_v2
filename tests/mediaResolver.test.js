/** Canonical resolver-facing media rules. */

import test from "node:test";
import assert from "node:assert/strict";

import { products as authoredProducts } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import {
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveCategoryCover,
  resolveProductCover,
} from "../src/services/media/mediaResolver.js";

const products = authoredProducts.map(toStorefrontProduct);

test("category covers remain isolated to their canonical taxonomy scope", () => {
  for (const category of taxonomyRepository.activeCategories()) {
    const member = authoredProducts.find((product) => product.category === category.id);
    const cover = resolveCategoryCover(category);
    assert.ok(member, `${category.id} has an authored product`);
    assert.equal(cover.src, member.media.primary);
    assert.ok(cover.src.includes(`/${category.departmentId}/${category.id}/`));
  }
});

test("AI Mirror refuses excluded taxonomy while AI Shopping keeps product-owned media", () => {
  const excluded = products.filter(
    (product) => product.subcategory === "jewellery" || product.subcategory === "bangles" || product.subcategory === "innerwear"
  );
  assert.ok(excluded.length > 0);

  for (const product of excluded) {
    assert.equal(resolveAiMirrorImage(product), null, product.id);
    assert.equal(resolveAiShoppingImage(product)?.src, resolveProductCover(product)?.src, product.id);
  }
});

test("eligible apparel resolves the same canonical product cover for shopping and mirror", () => {
  const product = products.find((candidate) => resolveAiMirrorImage(candidate));
  assert.ok(product);
  assert.equal(resolveAiMirrorImage(product)?.src, resolveProductCover(product)?.src);
  assert.equal(resolveAiShoppingImage(product)?.src, resolveProductCover(product)?.src);
  assert.ok(resolveProductCover(product)?.src.startsWith("/images/products/"));
});
