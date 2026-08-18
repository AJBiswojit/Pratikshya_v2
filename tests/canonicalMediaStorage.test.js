/** Canonical product-media storage regression coverage. */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { products } from "../src/data/catalog/products.js";
import { toStorefrontProduct } from "../src/data/products/index.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { resolveCategoryCover, resolveProductCover } from "../src/services/media/mediaResolver.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const publicFile = (url) => join(process.cwd(), "public", String(url).replace(/^\//, ""));

test("the retired flat media root is absent", () => {
  assert.equal(existsSync(join(process.cwd(), "public", "library")), false);
});

test("every authored product points to its own existing canonical media directory", () => {
  for (const product of products) {
    const urls = [product.media.primary, ...(product.media.gallery || [])];
    assert.ok(urls.length > 0, product.id);
    for (const url of urls) {
      assert.ok(url.startsWith("/images/products/"), `${product.id}: ${url}`);
      assert.ok(url.includes(`/${product.id}/`), `${product.id} must own ${url}`);
      assert.ok(existsSync(publicFile(url)), `missing ${url}`);
    }
  }
});

test("fresh state does not seed a parallel media catalogue", () => {
  setupCanonicalState();
  assert.deepEqual(mediaRepository.getAll(), []);
});

test("product and category covers resolve canonical authored product media", () => {
  for (const product of products) {
    assert.equal(resolveProductCover(toStorefrontProduct(product)).src, product.media.primary);
  }
  for (const category of taxonomyRepository.activeCategories()) {
    const member = products.find((product) => product.category === category.id);
    assert.equal(resolveCategoryCover(category).src, member.media.primary);
  }
});
