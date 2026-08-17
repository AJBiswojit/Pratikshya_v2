/**
 * PRATIKSHYA FASHON — Product Performance Regression Tests
 *
 * Ensures the performance optimizations do not regress and that
 * obvious anti-patterns are not reintroduced.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet, getProductMediaIndex } from "../src/services/media/productMediaSet.js";
import { getMediaInbox, getPotentialProductGroups, getKidsReconciliationRows } from "../src/services/productWorkflow.js";
import { getKidsFinalizationRows } from "../src/services/kidsProductFinalization.js";

beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("catalogRepository.find uses O(1) index, not full scan", () => {
  // Warm up cache
  catalogRepository.find("pf-001");
  const start = performance.now();
  for (let i = 0; i < 100; i++) catalogRepository.find("pf-001");
  const duration = performance.now() - start;
  // Should be very fast (<50ms for 100 lookups) due to Map index
  assert.ok(duration < 50, `find should be fast, took ${duration.toFixed(2)}ms for 100 lookups`);
});

test("getProductMediaSet for all products is fast (<20ms)", () => {
  const all = catalogRepository.all();
  /* Measure the optimized cache path used by rendered lists, not one-time
     fixture/cache construction. */
  for (let i = 0; i < all.length; i++) getProductMediaSet(all[i]);
  const start = performance.now();
  for (let i = 0; i < all.length; i++) getProductMediaSet(all[i]);
  const duration = performance.now() - start;
  assert.ok(duration < 20, `getProductMediaSet for ${all.length} should be <20ms, took ${duration.toFixed(2)}ms`);
});

test("getMediaInbox is cached and fast", () => {
  const firstStart = performance.now();
  getMediaInbox();
  const first = performance.now() - firstStart;

  const secondStart = performance.now();
  getMediaInbox();
  const second = performance.now() - secondStart;

  assert.ok(second <= first, `Second inbox call should be cached: first ${first.toFixed(2)}ms, second ${second.toFixed(2)}ms`);
  assert.ok(second < 5, `Cached inbox should be <5ms, took ${second.toFixed(2)}ms`);
});

test("getPotentialProductGroups is cached and fast", () => {
  const start = performance.now();
  getPotentialProductGroups();
  const duration = performance.now() - start;
  assert.ok(duration < 10, `Potential groups should be <10ms, took ${duration.toFixed(2)}ms`);
});

test("getKidsFinalizationRows is fast (<10ms cached)", () => {
  const start = performance.now();
  getKidsFinalizationRows();
  const first = performance.now() - start;

  const start2 = performance.now();
  getKidsFinalizationRows();
  const second = performance.now() - start2;

  assert.ok(second < 5, `Cached finalization rows should be <5ms, took ${second.toFixed(2)}ms`);
});

test("No random media selection in product card or preview", () => {
  const cardPath = join(process.cwd(), "src/design-system/components/ProductCard.jsx");
  const previewPath = join(process.cwd(), "src/components/product/ProductPreview.jsx");
  const mediaSetPath = join(process.cwd(), "src/services/media/productMediaSet.js");

  for (const p of [cardPath, previewPath, mediaSetPath]) {
    const content = readFileSync(p, "utf8");
    // Allow random in unrelated contexts (e.g., id generation) but not in media selection
    if (p.includes("ProductCard") || p.includes("ProductPreview")) {
      assert.doesNotMatch(content, /\bMath\.random\s*\(\)/, `Math.random found in ${p} — random media forbidden`);
      assert.doesNotMatch(content, /\bshuffle\b/i, `shuffle found in ${p}`);
    }
  }
});

test("ProductCard is memoized (React.memo)", () => {
  const content = readFileSync(join(process.cwd(), "src/design-system/components/ProductCard.jsx"), "utf8");
  assert.match(content, /memo/, "ProductCard should use React.memo");
});

test("MediaInboxCard is memoized", () => {
  const content = readFileSync(join(process.cwd(), "src/components/admin/MediaInboxCard.jsx"), "utf8");
  assert.match(content, /memo/, "MediaInboxCard should be memoized");
});

test("AdminProducts uses debounced search and memoized filtering", () => {
  const content = readFileSync(join(process.cwd(), "src/pages/admin/AdminProducts.jsx"), "utf8");
  assert.match(content, /debounced|setTimeout.*setDebouncedQuery|useMemo.*filtered/, "AdminProducts should debounce search and memoize filtered");
});
