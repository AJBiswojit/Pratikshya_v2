/** Product-first canonical workflow and Product Media ownership coverage. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository, { PRODUCT_STATUS } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import * as productWorkflow from "../src/services/productWorkflow.js";
import {
  buildProductIdPrefix,
  nextCanonicalProductId,
} from "../src/config/productIdPrefixes.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  getProductWorkflowState,
  WORKFLOW_STAGES,
} from "../src/services/workflow/productWorkflowState.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const taxonomyTemplate = () => {
  const product = catalogRepository.all().find(
    (candidate) => candidate.department && candidate.category && candidate.subcategory
  );
  assert.ok(product, "the canonical catalogue provides a complete taxonomy path");
  return product;
};

const createProductFirst = () => {
  const template = taxonomyTemplate();
  const expectedId = nextCanonicalProductId(
    catalogRepository.all(),
    template.department,
    template.category,
    template.subcategory
  );
  const result = catalogRepository.createDraftProduct(
    {
      department: template.department,
      category: template.category,
      subcategory: template.subcategory,
      name: "Canonical product-first workflow test piece",
      description:
        "A complete temporary catalogue Product used to verify Product-first media ownership and the unchanged canonical review lifecycle.",
      shortDescription: "Temporary canonical Product used by workflow regression coverage.",
      pricing: { sellingPrice: 1500, mrp: 1900 },
      price: 1500,
      compareAtPrice: 1900,
      currency: "INR",
      stock: 4,
      availability: "in-stock",
      colors: ["Test"],
      sizes: ["Free Size"],
      fabric: "Test fabric",
      material: "Test material",
      occasion: ["Test occasion"],
      reviewFlags: [],
    },
    ADMIN
  );
  assert.equal(result.ok, true, result.error);
  assert.equal(result.product.id, expectedId);
  assert.equal(result.product.status, PRODUCT_STATUS.DRAFT);

  const updated = catalogRepository.updateDraft(
    result.product.id,
    { sku: `${result.product.id}-SKU` },
    ADMIN
  );
  assert.equal(updated.ok, true, updated.error);
  return catalogRepository.find(result.product.id);
};

const attachMedia = (product) => {
  const media = mediaRepository.create({
    url: `/images/products/.test/${product.id}/primary.avif`,
    title: "Canonical product-first test media",
    status: "ACTIVE",
  });
  const assigned = assignMediaToProduct({
    mediaId: media.id,
    productId: product.id,
    principal: ADMIN,
    actor: ADMIN,
  });
  assert.equal(assigned.ok, true, assigned.error);
  return mediaRepository.getById(media.id);
};

test("a new Product ID is allocated only from its complete canonical taxonomy", () => {
  const product = createProductFirst();
  const expectedPrefix = buildProductIdPrefix(
    product.department,
    product.category,
    product.subcategory
  );

  assert.match(product.id, new RegExp(`^${expectedPrefix}-\\d{4}$`));
  assert.equal(catalogRepository.all().filter((entry) => entry.id === product.id).length, 1);
});

test("Product creation rejects incomplete taxonomy instead of minting a fallback identity", () => {
  const products = catalogRepository.all();
  const template = taxonomyTemplate();
  const beforeIds = products.map((product) => product.id);
  const result = catalogRepository.createDraftProduct(
    {
      name: "Incomplete Product",
      department: template.department,
      category: template.category,
    },
    ADMIN
  );

  assert.equal(result.ok, false);
  assert.match(result.error, /department, category, and subcategory/i);
  assert.deepEqual(catalogRepository.all().map((product) => product.id), beforeIds);
});

test("media cannot create a Product and remains unassigned until an explicit Product ID is chosen", () => {
  const beforeIds = catalogRepository.all().map((product) => product.id);
  const media = mediaRepository.create({
    url: "/images/products/.test/unassigned/primary.avif",
    title: "Unassigned workflow test media",
    status: "ACTIVE",
    groupKey: "unassigned-9876",
  });

  const reverseCreationName = "createProductDraft" + "FromMedia";
  assert.equal(typeof productWorkflow[reverseCreationName], "undefined");
  assert.equal(mediaRepository.getById(media.id).productId, null);
  assert.deepEqual(catalogRepository.all().map((product) => product.id), beforeIds);
});

test("Product Media is attached after Product creation by explicit stable Product ID", () => {
  const product = createProductFirst();
  const countAfterProductCreation = catalogRepository.all().length;
  const media = attachMedia(product);

  assert.equal(media.productId, product.id);
  assert.equal(catalogRepository.all().length, countAfterProductCreation);
  assert.equal(catalogRepository.find(product.id).id, product.id);
});

test("filename, group metadata, Product name edits, and repeated reads never change Product identity", () => {
  const product = createProductFirst();
  const media = attachMedia(product);
  mediaRepository.update(media.id, {
    currentFilename: "completely-different-name-9999-primary.avif",
    groupKey: "different-media-group-9999",
  });
  const renamed = catalogRepository.updateDraft(
    product.id,
    { name: "A renamed catalogue piece" },
    ADMIN
  );

  assert.equal(renamed.ok, true, renamed.error);
  assert.equal(renamed.product.id, product.id);
  assert.equal(catalogRepository.find(product.id).id, product.id);
  assert.equal(mediaRepository.getById(media.id).productId, product.id);
});

test("grouping media as one Product requires an existing canonical Product", () => {
  const first = mediaRepository.create({
    url: "/images/products/.test/group/primary.avif",
    title: "Grouped primary",
    status: "ACTIVE",
  });
  const second = mediaRepository.create({
    url: "/images/products/.test/group/detail.avif",
    title: "Grouped detail",
    status: "ACTIVE",
  });
  const beforeIds = catalogRepository.all().map((product) => product.id);

  const rejected = productWorkflow.decideProductGroup({
    groupId: "product-first-group",
    mediaIds: [first.id, second.id],
    decision: "SAME_PRODUCT",
    actor: ADMIN,
  });

  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /existing canonical Product/i);
  assert.deepEqual(catalogRepository.all().map((product) => product.id), beforeIds);
});

test("the universal lifecycle remains DRAFT → SUBMITTED → APPROVED → PUBLISHED", () => {
  const product = createProductFirst();
  attachMedia(product);
  assert.equal(getLiveStorefrontProducts().some((entry) => entry.id === product.id), false);

  const submitted = commands.submitProduct(product.id, ADMIN);
  assert.equal(submitted.ok, true, submitted.error);
  assert.equal(
    getProductWorkflowState(catalogRepository.find(product.id)).stage,
    WORKFLOW_STAGES.SUBMITTED
  );
  assert.equal(getLiveStorefrontProducts().some((entry) => entry.id === product.id), false);

  const approved = commands.approveProduct(product.id, ADMIN);
  assert.equal(approved.ok, true, approved.error);
  assert.equal(
    getProductWorkflowState(catalogRepository.find(product.id)).stage,
    WORKFLOW_STAGES.APPROVED
  );
  assert.equal(getLiveStorefrontProducts().some((entry) => entry.id === product.id), false);

  const published = commands.publishProduct(product.id, ADMIN);
  assert.equal(published.ok, true, published.error);
  assert.equal(catalogRepository.find(product.id).status, PRODUCT_STATUS.PUBLISHED);
  assert.equal(getLiveStorefrontProducts().some((entry) => entry.id === product.id), true);
});

test("the source exposes no filename/media-group Product identity allocator", () => {
  const source = readFileSync(
    join(process.cwd(), "src/services/productWorkflow.js"),
    "utf8"
  );
  const retiredNames = [
    "createProductDraft" + "FromMedia",
    "preferredProductId" + "ForMedia",
    "numberFrom" + "GroupKey",
  ];
  retiredNames.forEach((name) => assert.equal(source.includes(name), false, `${name} is retired`));
});
