/** Performance regressions for generic canonical product paths. */

import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { getProductMediaIndex, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { getMediaInbox, getPotentialProductGroups } from "../src/services/productWorkflow.js";
import { getUnifiedReviewQueue } from "../src/services/unifiedProductReview.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("catalogue lookup uses the stable Product-ID index", () => {
  const product = catalogRepository.all()[0];
  assert.ok(product);
  assert.equal(catalogRepository.find(product.id)?.id, product.id);

  const start = performance.now();
  for (let index = 0; index < 1_000; index += 1) catalogRepository.find(product.id);
  const duration = performance.now() - start;
  assert.ok(duration < 100, `1,000 indexed lookups took ${duration.toFixed(2)}ms`);
});

test("canonical media sets are cached for the complete catalogue", () => {
  const products = catalogRepository.all();
  products.forEach((product) => getProductMediaSet(product));
  const start = performance.now();
  products.forEach((product) => getProductMediaSet(product));
  const duration = performance.now() - start;
  assert.ok(duration < 50, `${products.length} media-set lookups took ${duration.toFixed(2)}ms`);

  const index = getProductMediaIndex();
  assert.ok(index instanceof Map);
});

test("generic workflow inbox and potential groups stay inexpensive", () => {
  getMediaInbox();
  getPotentialProductGroups();
  const start = performance.now();
  getMediaInbox();
  getPotentialProductGroups();
  const duration = performance.now() - start;
  assert.ok(duration < 50, `cached workflow projections took ${duration.toFixed(2)}ms`);
});

test("the unified review queue projects the canonical register without a parallel department path", () => {
  const queue = getUnifiedReviewQueue();
  const catalogueIds = new Set(catalogRepository.all().map((product) => product.id));
  assert.equal(queue.length, catalogueIds.size);
  assert.ok(queue.every((row) => catalogueIds.has(row.productId)));
});

test("product cards and previews never select media randomly", () => {
  const paths = [
    join(process.cwd(), "src/design-system/components/ProductCard.jsx"),
    join(process.cwd(), "src/components/product/ProductPreview.jsx"),
    join(process.cwd(), "src/services/media/productMediaSet.js"),
  ];
  for (const path of paths) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(source, /\bMath\.random\s*\(\)/, `random selection in ${path}`);
    if (/Product(Card|Preview)/.test(path)) assert.doesNotMatch(source, /\bshuffle\b/i, path);
  }
});

test("large product-list components retain their memoization safeguards", () => {
  const card = readFileSync(join(process.cwd(), "src/design-system/components/ProductCard.jsx"), "utf8");
  const inbox = readFileSync(join(process.cwd(), "src/components/admin/MediaInboxCard.jsx"), "utf8");
  const adminProducts = readFileSync(join(process.cwd(), "src/pages/admin/AdminProducts.jsx"), "utf8");
  assert.match(card, /memo/);
  assert.match(inbox, /memo/);
  assert.match(adminProducts, /debounced|setTimeout.*setDebouncedQuery|useMemo.*filtered/);
});
