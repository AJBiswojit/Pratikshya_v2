/**
 * Phase 3A — Read-Only Workflow Tests (Node built-in test runner)
 */

import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { setupBaseState } from "./helpers/workflowTestState.js";
import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { runExplicitMigrations } from "../src/services/workflow/explicitMigrations.js";

beforeEach(() => {
  setupBaseState();
});

afterEach(() => {
  setupBaseState();
});

describe("Phase 3A — READ = READ ONLY", () => {
  it("catalogRepository.all() does not change product count on repeated reads", () => {
    const first = catalogRepository.all();
    const second = catalogRepository.all();
    assert.strictEqual(second.length, first.length);
  });

  it("catalogRepository.find() does not mutate state", () => {
    const product = catalogRepository.find("pf-001");
    assert.ok(product);
    const after = catalogRepository.find("pf-001");
    assert.strictEqual(after.status, product.status);
  });

  it("repeated reads produce identical results", () => {
    const counts = [];
    for (let i = 0; i < 3; i++) counts.push(catalogRepository.all().length);
    const unique = new Set(counts);
    assert.strictEqual(unique.size, 1);
  });

  it("runExplicitMigrations is idempotent (same counts)", () => {
    const r1 = runExplicitMigrations();
    const r2 = runExplicitMigrations();
    assert.strictEqual(typeof r1.productCount, "number");
    assert.strictEqual(r2.productCount, r1.productCount);
    assert.strictEqual(r2.kidsDrafts, r1.kidsDrafts);
  });

  it("no media assignment triggered by catalog read", () => {
    const orig = mediaRepository.assignToProduct;
    let called = false;
    mediaRepository.assignToProduct = (...args) => { called = true; return orig.apply(mediaRepository, args); };
    try {
      catalogRepository.all();
    } finally {
      mediaRepository.assignToProduct = orig;
    }
    assert.strictEqual(called, false, "assignToProduct must not be called during read");
  });

  it("Kids data unchanged after reads", () => {
    const kidsBefore = catalogRepository.all().filter((p) => String(p.id).startsWith("KID-"));
    catalogRepository.all();
    const kidsAfter = catalogRepository.all().filter((p) => String(p.id).startsWith("KID-"));
    assert.strictEqual(kidsAfter.length, kidsBefore.length);
  });
});
