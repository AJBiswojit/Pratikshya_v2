/** Regression coverage for canonical workflow fixture isolation. */

import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository, { productsRegisterRaw } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { loadAdmins } from "../src/services/admin/adminAuthService.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import {
  getCanonicalFixtureSnapshot,
  setupCanonicalState,
} from "./helpers/workflowTestState.js";

const admin = () =>
  loadAdmins().find((candidate) => candidate.status === "ACTIVE" && ["SUPER_ADMIN", "ADMIN"].includes(candidate.role));

const stateSnapshot = () => ({
  products: JSON.parse(productsRegisterRaw()),
  media: mediaRepository
    .getAll()
    .map((media) => ({ id: media.id, productId: media.productId, scope: media.scope, role: media.role }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  activity: loadActivity(),
});

afterEach(setupCanonicalState);

test("canonical isolation restores the authored persisted catalogue", () => {
  const state = setupCanonicalState();
  const captured = getCanonicalFixtureSnapshot();

  assert.equal(state.state, "CANONICAL");
  assert.equal(state.products.length, captured.products.length);
  assert.deepEqual(
    state.products.map((product) => product.id),
    captured.products.map((product) => product.id)
  );
  assert.ok(state.products.some((product) => product.department === "kids"));
  assert.ok(state.products.every((product) => catalogRepository.find(product.id)?.id === product.id));
});

test("a mutated test cannot contaminate the next canonical state", () => {
  setupCanonicalState();
  const template = catalogRepository.all()[0];
  const created = catalogRepository.createDraftProduct(
    {
      name: "Fixture scratch product",
      department: template.department,
      category: template.category,
      subcategory: template.subcategory,
    },
    admin()
  );
  assert.equal(created.ok, true, created.error);
  assert.ok(catalogRepository.find(created.product.id));

  const restored = setupCanonicalState();
  assert.equal(catalogRepository.find(created.product.id), null);
  assert.equal(restored.products.length, getCanonicalFixtureSnapshot().products.length);
});

test("canonical reset removes scratch media and ownership", () => {
  setupCanonicalState();
  const owner = catalogRepository.all()[0];
  const media = mediaRepository.create({
    id: "fixture-media-001",
    url: `/images/products/test/${owner.id}/fixture.avif`,
    title: "Fixture scratch media",
    status: "ACTIVE",
  });
  const assigned = assignMediaToProduct({
    mediaId: media.id,
    productId: owner.id,
    principal: admin(),
    actor: admin(),
  });
  assert.equal(assigned.ok, true);
  assert.equal(mediaRepository.getById(media.id).productId, owner.id);

  setupCanonicalState();
  assert.equal(mediaRepository.getById(media.id), null);
});

test("canonical reset invalidates product-media caches", () => {
  setupCanonicalState();
  const owner = catalogRepository.all()[0];
  const authored = getProductMediaSet(owner).primary.src;
  const media = mediaRepository.create({
    id: "fixture-cover-001",
    url: `/images/products/test/${owner.id}/cover.avif`,
    title: "Fixture cover",
    status: "ACTIVE",
    productId: owner.id,
    role: "COVER",
  });
  assert.ok(media);
  assert.equal(getProductMediaSet(owner).primary.src, media.url);

  setupCanonicalState();
  assert.equal(getProductMediaSet(catalogRepository.find(owner.id)).primary.src, authored);
});

test("canonical reset is state-idempotent", () => {
  setupCanonicalState();
  const first = stateSnapshot();
  setupCanonicalState();
  const second = stateSnapshot();
  setupCanonicalState();
  const third = stateSnapshot();

  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
});
