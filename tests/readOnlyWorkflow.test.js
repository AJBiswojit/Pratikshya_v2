/** Canonical catalogue reads are side-effect free. */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import { setupCanonicalState } from "./helpers/workflowTestState.js";
import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const stableProductProjection = () =>
  catalogRepository.all().map(({ id, department, category, subcategory, status }) => ({
    id,
    department,
    category,
    subcategory,
    status,
  }));

describe("canonical reads are read-only", () => {
  it("catalogRepository.all() does not change catalogue state", () => {
    const before = stableProductProjection();
    catalogRepository.all();
    catalogRepository.all();
    assert.deepEqual(stableProductProjection(), before);
  });

  it("catalogRepository.find() does not mutate the selected record", () => {
    const id = catalogRepository.all()[0].id;
    const before = catalogRepository.find(id);
    catalogRepository.find(id);
    assert.deepEqual(catalogRepository.find(id), before);
  });

  it("repeated reads produce identical results", () => {
    const reads = Array.from({ length: 3 }, stableProductProjection);
    assert.deepEqual(reads[1], reads[0]);
    assert.deepEqual(reads[2], reads[0]);
  });

  it("catalogue reads never assign media", () => {
    const original = mediaRepository.assignToProduct;
    let called = false;
    mediaRepository.assignToProduct = (...args) => {
      called = true;
      return original.apply(mediaRepository, args);
    };
    try {
      catalogRepository.all();
      catalogRepository.all().forEach((product) => catalogRepository.find(product.id));
    } finally {
      mediaRepository.assignToProduct = original;
    }
    assert.equal(called, false);
  });

  it("department-filtered canonical records stay unchanged after reads", () => {
    const before = stableProductProjection().filter((product) => product.department === "kids");
    catalogRepository.all();
    const after = stableProductProjection().filter((product) => product.department === "kids");
    assert.ok(before.length > 0);
    assert.deepEqual(after, before);
  });
});
