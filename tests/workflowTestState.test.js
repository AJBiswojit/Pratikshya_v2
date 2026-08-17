/** Phase 3B.2 — regression coverage for workflow fixture isolation. */

import test, { afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository, { productsRegisterRaw } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { loadAdmins } from "../src/services/admin/adminAuthService.js";
import { assignMediaToProduct } from "../src/services/media/mediaOwnershipService.js";
import { runExplicitMigrations } from "../src/services/workflow/explicitMigrations.js";
import {
  getBaseFixtureSnapshot,
  setupBaseState,
  setupMigratedState,
} from "./helpers/workflowTestState.js";

const confirmedKidsIds = (products) =>
  products.filter((product) => /^KID-\d{3}$/.test(String(product.id))).map((product) => product.id);

const migrationSnapshot = () => ({
  products: JSON.parse(productsRegisterRaw()),
  media: mediaRepository
    .getAll()
    .map((media) => ({ id: media.id, productId: media.productId, scope: media.scope, role: media.role }))
    .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  activity: loadActivity(),
});

const migrationAdmin = () =>
  loadAdmins().find((admin) => admin.status === "ACTIVE" && ["SUPER_ADMIN", "ADMIN"].includes(admin.role));

afterEach(() => {
  setupBaseState();
});

test("fixture BASE isolation restores the original persisted catalogue", () => {
  const base = setupBaseState();
  const captured = getBaseFixtureSnapshot();

  assert.equal(base.state, "BASE");
  assert.equal(base.products.length, captured.products.length);
  assert.deepEqual(confirmedKidsIds(base.products), []);
  assert.ok(catalogRepository.find("pf-001"));
});

test("fixture MIGRATED isolation runs the explicit persisted migration", () => {
  const migrated = setupMigratedState();

  assert.equal(migrated.state, "MIGRATED");
  assert.equal(migrated.migration.ok, true);
  assert.equal(migrated.migration.productCount, 168);
  assert.equal(confirmedKidsIds(migrated.products).length, 21);
  assert.equal(JSON.parse(productsRegisterRaw()).length, 168);
});

test("a migrated test cannot contaminate a later BASE test", () => {
  setupMigratedState();
  assert.ok(catalogRepository.find("KID-001"));

  const base = setupBaseState();
  assert.equal(base.products.length, getBaseFixtureSnapshot().products.length);
  assert.equal(catalogRepository.find("KID-001"), null);
});

test("fixture reset removes scratch products", () => {
  setupMigratedState();
  const created = catalogRepository.createDraftProduct(
    { id: "FIXTURE-PRODUCT-001", name: "Fixture scratch product", category: "sarees" },
    migrationAdmin()
  );
  assert.equal(created.ok, true);
  assert.ok(catalogRepository.find("FIXTURE-PRODUCT-001"));

  setupBaseState();
  assert.equal(catalogRepository.find("FIXTURE-PRODUCT-001"), null);
});

test("fixture reset removes scratch media assigned through the ownership service", () => {
  setupMigratedState();
  catalogRepository.createDraftProduct(
    { id: "FIXTURE-MEDIA-OWNER", name: "Fixture media owner", category: "sarees" },
    migrationAdmin()
  );
  const media = mediaRepository.create({
    id: "fixture-media-001",
    url: "/library/fixture-media-001.webp",
    title: "Fixture scratch media",
    status: "ACTIVE",
  });
  const assigned = assignMediaToProduct({
    mediaId: media.id,
    productId: "FIXTURE-MEDIA-OWNER",
    principal: migrationAdmin(),
    actor: migrationAdmin(),
  });
  assert.equal(assigned.ok, true);
  assert.equal(mediaRepository.getById(media.id).productId, "FIXTURE-MEDIA-OWNER");

  setupBaseState();
  assert.equal(mediaRepository.getById(media.id), null);
  assert.equal(catalogRepository.find("FIXTURE-MEDIA-OWNER"), null);
});

test("fixture reset invalidates catalogue and product-media caches", () => {
  setupMigratedState();
  const migratedBangle = catalogRepository.find("pf-046");
  const migratedSet = getProductMediaSet(migratedBangle);
  assert.match(
    String(migratedSet.primary?.fileName ?? ""),
    /^jewellery-bangle-\d{3}\.webp$/,
    "migrated record populates the canonical media-set cache"
  );

  setupBaseState();
  assert.equal(catalogRepository.find("KID-001"), null, "catalogue cache must expose fresh BASE data");
  const baseSet = getProductMediaSet(catalogRepository.find("pf-046"));
  assert.doesNotMatch(
    String(baseSet.primary?.fileName ?? ""),
    /^jewellery-bangle-\d{3}\.webp$/,
    "product-media cache must not retain the migrated ownership view"
  );
});

test("explicit migration is state-idempotent after a fresh BASE setup", () => {
  setupBaseState();
  const first = runExplicitMigrations();
  const afterFirst = migrationSnapshot();
  const second = runExplicitMigrations();
  const afterSecond = migrationSnapshot();

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(second.changed, false);
  assert.deepEqual(afterSecond, afterFirst);
});
