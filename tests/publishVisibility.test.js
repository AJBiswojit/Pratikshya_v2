/** Storefront publication-boundary regression tests. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  getLiveStorefrontProducts,
  getProductById,
  getProductBySlug,
} from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getProductCardMedia } from "../src/services/media/productMediaSet.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const current = (department = null) => {
  const product = catalogRepository.all().find((entry) => !department || entry.department === department);
  assert.ok(product);
  return product;
};

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.ok(commands.publishProduct(id, ADMIN).ok);
};

test("fresh authored DRAFT products are not customer-visible", () => {
  assert.ok(catalogRepository.all().every((product) => product.status === "DRAFT"));
  assert.deepEqual(getLiveStorefrontProducts(), []);
});

test("a product appears only after submit, approval and publication", () => {
  const product = current("kids");
  const visible = () => getLiveStorefrontProducts().some((entry) => entry.id === product.id);
  assert.equal(visible(), false);
  commands.submitProduct(product.id, ADMIN);
  assert.equal(visible(), false);
  commands.approveProduct(product.id, ADMIN);
  assert.equal(visible(), false);
  commands.publishProduct(product.id, ADMIN);
  assert.equal(visible(), true);
});

test("published records resolve through listing, search and PDP helpers", () => {
  const product = current();
  publish(product.id);
  assert.ok(queryCatalogue({ search: product.name }).results.some((entry) => entry.id === product.id));
  assert.equal(getProductById(product.id)?.id, product.id);
  assert.equal(getProductBySlug(product.slug)?.id, product.id);
  assert.equal(getProductCardMedia(getProductById(product.id)).image?.productId, product.id);
});

test("generic department and taxonomy filters use the same live source", () => {
  const product = current("kids");
  publish(product.id);
  const filtered = queryCatalogue({
    scopeFilters: {
      department: product.department,
      category: product.category,
      subcategory: product.subcategory,
    },
  }).results;
  assert.deepEqual(filtered.map((entry) => entry.id), [product.id]);
});

test("unpublish immediately removes a product without deleting it", () => {
  const product = current();
  publish(product.id);
  assert.ok(getProductById(product.id));
  assert.ok(commands.unpublishProduct(product.id, ADMIN).ok);
  assert.equal(getProductById(product.id), null);
  assert.ok(catalogRepository.find(product.id));
});

test("publication never changes the canonical authored media association", () => {
  const product = current("kids");
  const before = { image: product.image, additionalImages: [...product.additionalImages] };
  publish(product.id);
  const after = catalogRepository.find(product.id);
  assert.equal(after.image, before.image);
  assert.deepEqual(after.additionalImages, before.additionalImages);
});
