/** Unified Product Review and workflow-aware bulk action tests. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import {
  bulkApproveProducts,
  bulkPublishProducts,
  bulkSubmitProducts,
  submitProductForReview,
} from "../src/services/productWorkflow.js";
import {
  UNIFIED_FILTER_DEFAULTS,
  departmentsInUnifiedQueue,
  filterUnifiedReviewQueue,
  getUnifiedReviewQueue,
  getUnifiedReviewRow,
} from "../src/services/unifiedProductReview.js";
import { WORKFLOW_STAGES, getProductWorkflowState } from "../src/services/workflow/productWorkflowState.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const stage = (id) => getProductWorkflowState(catalogRepository.find(id)).stage;

test("one review queue projects the one canonical product register", () => {
  const queue = getUnifiedReviewQueue();
  assert.equal(queue.length, catalogRepository.all().length);
  assert.deepEqual(
    queue.map((row) => row.productId),
    catalogRepository.all().map((product) => product.id).sort((a, b) => a.localeCompare(b))
  );
  assert.ok(queue.every((row) => row.product.id === catalogRepository.find(row.productId).id));
});

test("department filtering is data-driven and preserves stable Product IDs", () => {
  const queue = getUnifiedReviewQueue();
  const department = catalogRepository.all().find((product) => product.department === "kids")?.department;
  assert.ok(department);
  const filtered = filterUnifiedReviewQueue(queue, {
    ...UNIFIED_FILTER_DEFAULTS,
    department,
  });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every((row) => row.department === department));
  assert.deepEqual(
    filtered.map((row) => row.productId),
    catalogRepository.all().filter((product) => product.department === department).map((product) => product.id)
  );
  assert.deepEqual(
    departmentsInUnifiedQueue(queue).find((option) => option.id === department),
    { id: department, label: "Kids" }
  );
});

test("bulk Submit delegates per Product ID and preserves exact blocker messages", () => {
  const [ready, blocked] = catalogRepository.all();
  catalogRepository.updateDraft(blocked.id, { description: "" }, ADMIN);
  const individual = submitProductForReview(blocked.id, ADMIN);
  assert.equal(individual.ok, false);

  const result = bulkSubmitProducts([ready.id, blocked.id, ready.id], ADMIN);
  assert.equal(result.applied, 1);
  assert.equal(result.skipped, 1);
  assert.equal(stage(ready.id), WORKFLOW_STAGES.SUBMITTED);
  assert.equal(stage(blocked.id), WORKFLOW_STAGES.DRAFT);
  assert.deepEqual(result.results.find((entry) => entry.id === blocked.id).errors, individual.errors);
});

test("bulk Approve and Publish never skip stages and allow independent partial success", () => {
  const [ready, wrongStage] = catalogRepository.all();
  assert.equal(bulkSubmitProducts([ready.id], ADMIN).applied, 1);

  const approved = bulkApproveProducts([ready.id, wrongStage.id], ADMIN);
  assert.equal(approved.applied, 1);
  assert.equal(approved.skipped, 1);
  assert.equal(stage(ready.id), WORKFLOW_STAGES.APPROVED);
  assert.equal(stage(wrongStage.id), WORKFLOW_STAGES.DRAFT);
  assert.ok(!getLiveStorefrontProducts().some((product) => product.id === ready.id));

  const published = bulkPublishProducts([ready.id, wrongStage.id], ADMIN);
  assert.equal(published.applied, 1);
  assert.equal(published.skipped, 1);
  assert.equal(stage(ready.id), WORKFLOW_STAGES.PUBLISHED);
  assert.equal(stage(wrongStage.id), WORKFLOW_STAGES.DRAFT);
  assert.ok(getLiveStorefrontProducts().some((product) => product.id === ready.id));
});

test("review readiness comes from universal validation", () => {
  const product = catalogRepository.all()[0];
  const before = getUnifiedReviewRow(product.id);
  assert.equal(before.validationOk, true);
  catalogRepository.updateDraft(product.id, { pricing: { sellingPrice: 0, mrp: 0 }, price: 0 }, ADMIN);
  const after = getUnifiedReviewRow(product.id);
  assert.equal(after.validationOk, false);
  assert.ok(after.blockingIssues.some((issue) => issue.section === "price"));
});

test("the queue UI keeps selection filter-aware and uses canonical service actions", () => {
  const source = readFileSync(join(ROOT, "src/components/admin/UnifiedReviewQueue.jsx"), "utf8");
  assert.match(source, /Select all visible products/);
  assert.match(source, /String\(row\.productId\)/);
  assert.match(source, /bulkSubmitProducts/);
  assert.match(source, /bulkApproveProducts/);
  assert.match(source, /bulkPublishProducts/);
  assert.match(source, /workflowComposition/);
  assert.match(source, /Blocker details by Product ID/);
  assert.doesNotMatch(source, /status\s*[:=]\s*["'](?:DRAFT|PUBLISHED|APPROVED)["']/);
});
