/** Universal product lifecycle regression suite. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { WORKFLOW_STAGES, getProductWorkflowState } from "../src/services/workflow/productWorkflowState.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const productFrom = (department = null) => {
  const product = catalogRepository.all().find((entry) => !department || entry.department === department);
  assert.ok(product);
  return product;
};

const stage = (id) => getProductWorkflowState(catalogRepository.find(id)).stage;

test("the exact lifecycle is DRAFT → SUBMITTED → APPROVED → PUBLISHED", () => {
  const product = productFrom("kids");
  assert.equal(stage(product.id), WORKFLOW_STAGES.DRAFT);
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.equal(stage(product.id), WORKFLOW_STAGES.SUBMITTED);
  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.equal(stage(product.id), WORKFLOW_STAGES.APPROVED);
  assert.ok(commands.publishProduct(product.id, ADMIN).ok);
  assert.equal(stage(product.id), WORKFLOW_STAGES.PUBLISHED);
});

test("approval and publication cannot skip an earlier lifecycle stage", () => {
  const product = productFrom();
  assert.equal(commands.approveProduct(product.id, ADMIN).ok, false);
  assert.equal(commands.publishProduct(product.id, ADMIN).ok, false);
  assert.equal(stage(product.id), WORKFLOW_STAGES.DRAFT);

  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.equal(commands.publishProduct(product.id, ADMIN).ok, false);
  assert.equal(stage(product.id), WORKFLOW_STAGES.SUBMITTED);
});

test("the first transition runs the complete universal validator", () => {
  const product = productFrom();
  catalogRepository.updateDraft(
    product.id,
    {
      name: "",
      description: "",
      image: "",
      imageUrl: "",
      images: [],
      additionalImages: [],
      mediaIds: [],
      media: null,
      price: 0,
      pricing: { sellingPrice: 0, mrp: 0 },
    },
    ADMIN
  );
  const current = catalogRepository.find(product.id);
  const validation = validateProductForPublish(current);
  const submitted = commands.submitProduct(product.id, ADMIN);
  assert.equal(validation.ok, false);
  assert.equal(submitted.ok, false);
  assert.deepEqual(submitted.errors, validation.issues.map((issue) => issue.message));
  assert.deepEqual(
    new Set(validation.issues.map((issue) => issue.code)),
    new Set([
      "NAME_REQUIRED",
      "PRICING_ENGINE_ERROR",
      "PRIMARY_MEDIA_REQUIRED",
      "DESCRIPTION_REQUIRED",
    ])
  );
  assert.equal(stage(product.id), WORKFLOW_STAGES.DRAFT);
});

test("draft and submitted records remain invisible until publication", () => {
  const product = productFrom("kids");
  const visible = () => getLiveStorefrontProducts().some((entry) => entry.id === product.id);
  assert.equal(visible(), false);
  commands.submitProduct(product.id, ADMIN);
  assert.equal(visible(), false);
  commands.approveProduct(product.id, ADMIN);
  assert.equal(visible(), false);
  commands.publishProduct(product.id, ADMIN);
  assert.equal(visible(), true);
});

test("unauthenticated and customer identities cannot mutate workflow", () => {
  const product = productFrom();
  assert.equal(commands.submitProduct(product.id, null).ok, false);
  assert.equal(commands.submitProduct(product.id, { customerId: "customer" }).ok, false);
  assert.equal(stage(product.id), WORKFLOW_STAGES.DRAFT);
});

test("returning a submitted product requires a reason and never publishes it", () => {
  const product = productFrom();
  commands.submitProduct(product.id, ADMIN);
  assert.equal(commands.returnProduct(product.id, "", ADMIN).ok, false);
  const returned = commands.returnProduct(product.id, "Correct the product details.", ADMIN);
  assert.ok(returned.ok);
  assert.equal(stage(product.id), WORKFLOW_STAGES.DRAFT);
  assert.ok(!getLiveStorefrontProducts().some((entry) => entry.id === product.id));
});
