/** Canonical Product Media is deterministic and department-agnostic. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getProductCardMedia, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok);
  assert.ok(commands.approveProduct(id, ADMIN).ok);
  assert.ok(commands.publishProduct(id, ADMIN).ok);
};

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("authored primary media is unique and scoped to its canonical Product ID", () => {
  const owners = new Map();
  catalogRepository.all().forEach((product) => {
    const set = getProductMediaSet(product);
    assert.ok(set.primary?.src, `${product.id} needs a primary`);
    assert.equal(String(set.primary.productId), String(product.id));
    assert.ok(set.primary.src.startsWith("/images/products/"));

    const previous = owners.get(set.primary.src);
    assert.equal(previous, undefined, `${set.primary.src} belongs to both ${previous} and ${product.id}`);
    owners.set(set.primary.src, product.id);
  });
  assert.equal(owners.size, catalogRepository.all().length);
});

test("multiple authored views remain one product rather than extra catalogue records", () => {
  const product = catalogRepository.all().find((entry) => (entry.media?.gallery || []).length >= 2);
  assert.ok(product);
  const set = getProductMediaSet(product);
  assert.ok(set.gallery.length >= 2);
  set.gallery.forEach((item) => assert.equal(String(item.productId), String(product.id)));
  assert.equal(catalogRepository.all().filter((entry) => entry.id === product.id).length, 1);
});

test("published department representatives render through the same generic card resolver", () => {
  const representatives = new Map();
  catalogRepository.all().forEach((product) => {
    if (!representatives.has(product.department)) representatives.set(product.department, product);
  });
  representatives.forEach((product) => publish(product.id));

  const live = getLiveStorefrontProducts();
  assert.equal(live.length, representatives.size);
  live.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image?.src);
    assert.equal(String(card.image.productId), String(product.id));
    card.mediaSet.gallery.forEach((item) =>
      assert.equal(String(item.productId), String(product.id))
    );
  });
});

test("Product IDs stay stable across media reads", () => {
  const before = catalogRepository.all().map(({ id }) => id);
  catalogRepository.all().forEach((product) => {
    getProductMediaSet(product);
    getProductCardMedia(product);
  });
  const after = catalogRepository.all().map(({ id }) => id);
  assert.deepEqual(after, before);
});

test("fresh managed media has no duplicate or cross-product ownership", () => {
  assert.deepEqual(mediaRepository.getAll(), []);
  catalogRepository.all().forEach((product) => {
    const set = getProductMediaSet(product);
    set.gallery.forEach((item) =>
      assert.equal(String(item.productId), String(product.id), `${item.src} crossed ownership`)
    );
  });
});
