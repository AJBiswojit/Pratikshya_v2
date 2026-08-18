/** Canonical catalogue → Product Media discovery coverage. */

import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts, toStorefrontProduct } from "../src/data/products/index.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const publicFile = (url) => join(process.cwd(), "public", String(url).replace(/^\//, ""));

test("media discovery starts from canonical products, not a flat filesystem catalogue", () => {
  assert.equal(existsSync(join(process.cwd(), "public", "library")), false);
  const products = catalogRepository.all();
  assert.ok(products.length > 0);
  assert.ok(products.every((product) => product.id && product.media?.primary));
});

test("every canonical Product ID owns one deterministic media set", () => {
  for (const product of catalogRepository.all()) {
    const set = getProductMediaSet(toStorefrontProduct(product));
    assert.equal(set.productId, product.id);
    assert.equal(set.primary.productId, product.id);
    assert.equal(set.primary.src, product.media.primary);
    assert.ok(set.gallery.every((media) => media.productId === product.id));
    assert.ok([set.primary, ...set.gallery].every((media) => media.src.includes(`/${product.id}/`)));
  }
});

test("all canonical media references exist under public/images/products", () => {
  for (const product of catalogRepository.all()) {
    for (const url of [product.media.primary, ...(product.media.gallery || [])]) {
      assert.ok(url.startsWith("/images/products/"), `${product.id}: ${url}`);
      assert.ok(existsSync(publicFile(url)), `missing ${url}`);
    }
  }
});

test("multiple views remain one product and are never separate catalogue records", () => {
  const product = catalogRepository.all().find((candidate) => (candidate.media?.gallery || []).length > 0);
  assert.ok(product);
  const set = getProductMediaSet(toStorefrontProduct(product));
  assert.ok(set.gallery.length > 0);
  assert.ok([set.primary, ...set.gallery].every((media) => media.productId === product.id));
  assert.equal(catalogRepository.all().filter((candidate) => candidate.id === product.id).length, 1);
});

test("department discovery is a normal data filter with stable Product IDs", () => {
  const departments = new Set(catalogRepository.all().map((product) => product.department));
  for (const department of departments) {
    const found = catalogRepository.all().filter((product) => product.department === department);
    assert.ok(found.length > 0, department);
    assert.equal(new Set(found.map((product) => product.id)).size, found.length);
  }
});

test("discovery is read-only and does not publish draft products", () => {
  const before = catalogRepository.all().map((product) => `${product.id}:${product.status}`);
  catalogRepository.all().forEach((product) => getProductMediaSet(toStorefrontProduct(product)));
  const after = catalogRepository.all().map((product) => `${product.id}:${product.status}`);
  assert.deepEqual(after, before);
  assert.deepEqual(getLiveStorefrontProducts(), []);
});
