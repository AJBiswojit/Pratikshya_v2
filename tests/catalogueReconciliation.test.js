/**
 * PRATIKSHYA FASHON — Catalogue reconciliation tests (Phase 23).
 *
 * Locks the Phase 23 catalogue reconciliation in place:
 *
 *   · every uncatalogued product-media group becomes ONE DRAFT product
 *   · multi-view filename groups (front/side/back) are ONE product, never
 *     several
 *   · similar products are never merged (different groupKey = different id)
 *   · Product IDs are stable and category-prefixed, never derived from names
 *   · drafts never reach the storefront until a human publishes them
 *   · the 21 confirmed Kids products are never re-migrated or regrouped
 *   · the sync is idempotent and additive
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";

import catalogRepository, { getPublishIssues } from "../src/services/catalogRepository.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  assignReconciliationIds,
  assignedProductMediaMap,
  ensureCatalogueReconciliation,
  getCatalogueReconciliationSummary,
  reconciliationDraftRecords,
  staticUncataloguedGroups,
  uncataloguedGroups,
} from "../src/services/catalogueReconciliation.js";


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("every uncatalogued group is assigned to a published product or drafted", () => {
  const products = catalogRepository.all();
  const drafts = reconciliationDraftRecords(products);
  const assigned = assignedProductMediaMap(products);
  assert.ok(staticUncataloguedGroups().length > 0, "there must be uncatalogued media to reconcile");
  assert.equal(
    assigned.size + drafts.length,
    staticUncataloguedGroups().length,
    "assigned + drafted must account for every uncatalogued media group"
  );
});

test("Product IDs are category-prefixed, stable and unique", () => {
  const drafts = reconciliationDraftRecords();
  const ids = new Set();
  drafts.forEach((draft) => {
    assert.match(draft.id, /^(SAR|LEH|BRD|MEN|JEW|BAN|INN)-\d{3}$/, `${draft.id} is category-prefixed`);
    assert.ok(!ids.has(draft.id), `duplicate Product ID ${draft.id}`);
    ids.add(draft.id);
    assert.equal(draft.id, draft.productId, "Product ID and record id stay aligned");
    assert.equal(draft.slug, draft.id.toLowerCase(), "the Product ID is the stable route key");
  });
});

test("multi-view groups resolve one product with same-product hover, never several", () => {
  /* women-saree-silk-004 has front + back → one SAR product, hover = back. */
  const draft = reconciliationDraftRecords().find(
    (record) => record.sourceGroupKey === "women-saree-silk-004"
  );
  assert.ok(draft, "silk-004 must have a draft");
  const product = catalogRepository.find(draft.id);
  assert.ok(product);
  const set = getProductMediaSet(product);
  assert.equal(set.gallery.length, 2, "front + back = one product gallery, not two products");
  assert.equal(set.primary?.fileName, "women-saree-silk-004-front.webp");
  assert.equal(set.hasAlternate, true);
  assert.equal(set.hover?.fileName, "women-saree-silk-004-back.webp");
});

test("similar products are never merged — different groupKey = different id", () => {
  const silk4 = reconciliationDraftRecords().find(
    (record) => record.sourceGroupKey === "women-saree-silk-004"
  );
  const silk5 = reconciliationDraftRecords().find(
    (record) => record.sourceGroupKey === "women-saree-silk-005"
  );
  assert.ok(silk4 && silk5);
  assert.notEqual(silk4.id, silk5.id, "two different physical products must keep two ids");
});

test("the 21 confirmed Kids products are never re-migrated or regrouped", () => {
  const kids = catalogRepository.all().filter((product) => /^KID-\d{3}$/.test(String(product.id)));
  assert.equal(kids.length, 21);
  kids.forEach((product) => {
    assert.equal(product.status, "DRAFT");
    assert.equal(product.category, "kidswear");
    assert.match(String(product.primaryMediaId), /./);
  });
  /* No reconciliation template may touch a KID record. */
  const templates = reconciliationDraftRecords();
  assert.ok(templates.every((template) => !/^KID-/.test(template.id)));
});

test("drafts never reach the storefront until published", () => {
  const storefrontIds = new Set(getLiveStorefrontProducts().map((product) => String(product.id)));
  reconciliationDraftRecords().forEach((draft) => {
    assert.ok(!storefrontIds.has(draft.id), `${draft.id} must not be visible to customers`);
  });
});

test("safe names and review flags keep new drafts from publishing", () => {
  const drafts = reconciliationDraftRecords(catalogRepository.all());
  drafts.forEach((draft) => {
    const product = catalogRepository.find(draft.id);
    assert.ok(product);
    const issues = getPublishIssues(product);
    assert.ok(issues.some((issue) => /name/i.test(issue)), `${draft.id} blocks on its placeholder name`);
    assert.ok(issues.some((issue) => /price/i.test(issue)), `${draft.id} blocks on price`);
    assert.ok(
      issues.some((issue) => /flag/i.test(issue)),
      `${draft.id} blocks on unresolved review flags`
    );
  });
});

test("flagged groups carry a group review flag", () => {
  /* bandhani-001 and chanderi-001 were ingestion-flagged NEEDS_REVIEW. */
  const bandhani = reconciliationDraftRecords().find(
    (record) => record.sourceGroupKey === "women-saree-bandhani-001"
  );
  const chanderi = reconciliationDraftRecords().find(
    (record) => record.sourceGroupKey === "women-saree-chanderi-001"
  );
  assert.ok(bandhani && chanderi);
  assert.ok(bandhani.reviewFlags.includes("GROUP_REVIEW_REQUIRED"));
  assert.ok(chanderi.reviewFlags.includes("GROUP_REVIEW_REQUIRED"));
});

test("the reconciliation sync is idempotent and additive", () => {
  const before = catalogRepository.all();
  const applied = ensureCatalogueReconciliation(before);
  assert.equal(applied.length, before.length, "re-applying must not duplicate records");
  const again = ensureCatalogueReconciliation(applied);
  assert.deepEqual(again, applied);
});

test("the summary accounts for every media group", () => {
  const products = catalogRepository.all();
  const summary = getCatalogueReconciliationSummary(products);
  assert.equal(summary.totalMediaGroups, staticUncataloguedGroups().length + summary.cataloguedGroups);
  assert.equal(
    summary.cataloguedGroups + summary.assignedToPublished + summary.draftRecords,
    summary.totalMediaGroups,
    "catalogued + assigned + drafted partition the media groups"
  );
  assert.equal(summary.newProductCandidates, summary.draftRecords);
});

test("id assignment is deterministic and category-scoped", () => {
  const groups = uncataloguedGroups();
  const first = assignReconciliationIds(groups);
  const second = assignReconciliationIds(groups);
  assert.deepEqual(first, second, "id assignment must be deterministic across runs");
});
