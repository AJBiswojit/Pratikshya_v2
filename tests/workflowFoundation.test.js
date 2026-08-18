/** Universal validation and media-ownership foundation tests. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import {
  assignMediaToProduct,
  transferMediaOwnership,
  unassignMediaFromProduct,
} from "../src/services/media/mediaOwnershipService.js";
import { buildProductIdPrefix } from "../src/config/productIdPrefixes.js";
import {
  approveProduct,
  publishProduct,
  submitProduct,
} from "../src/services/workflow/productWorkflowCommands.js";
import { departments } from "../src/data/catalog/taxonomy.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("all authored products use the same universal validator", () => {
  const products = catalogRepository.all();
  assert.ok(products.length > 0);
  const representedDepartments = new Set();
  for (const product of products) {
    representedDepartments.add(product.department);
    const result = validateProductForPublish(product);
    assert.equal(result.ok, true, `${product.id}: ${result.issues.map((issue) => issue.message).join("; ")}`);
  }
  assert.deepEqual(representedDepartments, new Set(departments.map((department) => department.id)));
});

test("taxonomy validation enforces the full canonical chain", () => {
  const products = catalogRepository.all();
  const product = products[0];
  const otherDepartment = products.find((candidate) => candidate.department !== product.department);
  assert.ok(otherDepartment, "the canonical catalogue represents more than one department");
  const invalidTaxonomy = {
    ...product,
    department: otherDepartment.department,
  };
  const result = validateProductForPublish(invalidTaxonomy);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code === "CATEGORY_INVALID"));

  const refused = catalogRepository.updateDraft(
    product.id,
    { department: otherDepartment.department },
    ADMIN
  );
  assert.equal(refused.ok, false);
  assert.deepEqual(
    {
      department: catalogRepository.find(product.id).department,
      category: catalogRepository.find(product.id).category,
      subcategory: catalogRepository.find(product.id).subcategory,
    },
    {
      department: product.department,
      category: product.category,
      subcategory: product.subcategory,
    }
  );
});

test("canonical Kids Product ID prefixes are derived from their complete taxonomy path", () => {
  for (const product of catalogRepository.all().filter((entry) => entry.department === "kids")) {
    assert.equal(
      product.id.replace(/-\d{4}$/, ""),
      buildProductIdPrefix(product.department, product.category, product.subcategory),
      product.id
    );
  }
});

test("one media record cannot silently belong to two products", () => {
  const [owner, target] = catalogRepository.all();
  const media = mediaRepository.create({
    url: "/images/products/.test/universal-ownership-test.webp",
    title: "Universal ownership test",
    status: "ACTIVE",
  });
  assert.ok(media);
  assert.ok(assignMediaToProduct({ mediaId: media.id, productId: owner.id, principal: ADMIN }).ok);

  const refused = assignMediaToProduct({ mediaId: media.id, productId: target.id, principal: ADMIN });
  assert.equal(refused.ok, false);
  assert.equal(mediaRepository.getById(media.id).productId, owner.id);
});

test("authorized transfer changes stable Product-ID ownership atomically", () => {
  const [owner, target] = catalogRepository.all();
  const media = mediaRepository.create({
    url: "/images/products/.test/universal-transfer-test.webp",
    title: "Universal transfer test",
    status: "ACTIVE",
  });
  assignMediaToProduct({ mediaId: media.id, productId: owner.id, principal: ADMIN });

  const transferred = transferMediaOwnership({
    mediaId: media.id,
    targetProductId: target.id,
    principal: ADMIN,
    confirm: true,
  });
  assert.ok(transferred.ok, transferred.error);
  assert.equal(mediaRepository.getById(media.id).productId, target.id);
  assert.equal(catalogRepository.find(owner.id).id, owner.id);
  assert.equal(catalogRepository.find(target.id).id, target.id);
});

test("media transfer and unassignment cannot mutate protected-stage Products", () => {
  const products = catalogRepository.all();
  const scenarios = [
    { label: "submitted", advance: (id) => submitProduct(id, ADMIN) },
    {
      label: "approved",
      advance: (id) => {
        assert.ok(submitProduct(id, ADMIN).ok);
        return approveProduct(id, ADMIN);
      },
    },
    {
      label: "published",
      advance: (id) => {
        assert.ok(submitProduct(id, ADMIN).ok);
        assert.ok(approveProduct(id, ADMIN).ok);
        return publishProduct(id, ADMIN);
      },
    },
  ];

  scenarios.forEach(({ label, advance }, index) => {
    const owner = products[index * 2];
    const target = products[index * 2 + 1];
    const media = mediaRepository.create({
      url: `/images/products/.test/${label}-ownership-test.webp`,
      title: `${label} ownership test`,
      status: "ACTIVE",
    });
    assert.ok(
      assignMediaToProduct({ mediaId: media.id, productId: owner.id, principal: ADMIN }).ok
    );
    assert.ok(advance(owner.id).ok);

    const beforeOwner = catalogRepository.find(owner.id);
    const beforeTarget = catalogRepository.find(target.id);
    const beforeMedia = mediaRepository.getById(media.id);
    const expectedError = `This product is ${label} and cannot be edited — return it to an editable stage first.`;

    const refusedTransfer = transferMediaOwnership({
      mediaId: media.id,
      targetProductId: target.id,
      principal: ADMIN,
      confirm: true,
    });
    assert.deepEqual(
      { ok: refusedTransfer.ok, code: refusedTransfer.code, error: refusedTransfer.error },
      { ok: false, code: "PRODUCT_NOT_EDITABLE", error: expectedError }
    );

    const refusedUnassignment = unassignMediaFromProduct({
      mediaId: media.id,
      principal: ADMIN,
    });
    assert.deepEqual(
      {
        ok: refusedUnassignment.ok,
        code: refusedUnassignment.code,
        error: refusedUnassignment.error,
      },
      { ok: false, code: "PRODUCT_NOT_EDITABLE", error: expectedError }
    );

    assert.deepEqual(mediaRepository.getById(media.id), beforeMedia);
    assert.deepEqual(catalogRepository.find(owner.id), beforeOwner);
    assert.deepEqual(catalogRepository.find(target.id), beforeTarget);
  });
});
