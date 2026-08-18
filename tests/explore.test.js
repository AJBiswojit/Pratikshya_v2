/** Explore uses the canonical published-product query and stable Product IDs. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  EXPLORE_EDITORIAL_AFTER,
  EXPLORE_PROMO_AFTER,
  buildExploreStream,
  compareExploreCoverage,
  getExploreProductIds,
  getExploreProducts,
  paginateExplore,
  queryExplore,
} from "../src/data/products/explore.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const publish = (product) => {
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.ok(commands.publishProduct(product.id, ADMIN).ok);
  return catalogRepository.find(product.id);
};

test("Explore contains only the canonical live storefront projection", () => {
  assert.deepEqual(getExploreProductIds(), getLiveStorefrontProducts().map((product) => String(product.id)));
  const coverage = compareExploreCoverage();
  assert.deepEqual(coverage.missing, []);
  assert.deepEqual(coverage.extra, []);
  assert.deepEqual(coverage.exploreDuplicates, []);
});

test("Explore discovers a department through the same generic publication path", () => {
  const source = catalogRepository.all().find((product) => product.department === "kids");
  assert.ok(source, "the canonical catalogue currently contains the department");
  publish(source);

  const live = getLiveStorefrontProducts();
  const queried = queryExplore({ filters: { department: source.department } }).results;
  assert.deepEqual(queried.map((product) => product.id), [source.id]);
  assert.deepEqual(getExploreProductIds(), live.map((product) => String(product.id)));
});

test("draft records never appear in Explore", () => {
  const draft = catalogRepository.all().find((product) => product.status === "DRAFT");
  assert.ok(draft);
  assert.ok(!getExploreProductIds().includes(draft.id));
  assert.ok(!queryExplore({ search: draft.id }).results.some((product) => product.id === draft.id));
});

test("Explore deduplicates source rows by permanent Product ID", () => {
  const product = catalogRepository.all()[0];
  assert.deepEqual(getExploreProducts([product, product]).map((entry) => entry.id), [product.id]);
});

test("Explore pagination is deterministic", () => {
  const source = catalogRepository.all().slice(0, 5);
  const page = paginateExplore(source, 2, 2);
  assert.deepEqual(page.visible.map((product) => product.id), source.slice(0, 4).map((product) => product.id));
  assert.equal(page.hasMore, true);
  assert.equal(page.remaining, 1);
});

test("Explore placements remain separate stream items, never products", () => {
  const source = catalogRepository.all().slice(0, EXPLORE_EDITORIAL_AFTER + 1);
  const stream = buildExploreStream(source);
  assert.equal(stream.filter((item) => item.type === "product").length, source.length);
  assert.equal(stream[EXPLORE_PROMO_AFTER].type, "promo");
  assert.ok(stream.some((item) => item.type === "editorial"));
});
