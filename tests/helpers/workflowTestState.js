/**
 * Deterministic workflow fixture states for Node tests.
 *
 * BASE is the authored 99-product register plus the seeded media/activity
 * registers. MIGRATED is always produced from a fresh BASE by the explicit
 * migration command. Nothing in this helper changes production read paths.
 */

import catalogRepository, { persistCatalogueState } from "../../src/services/catalogRepository.js";
import mediaRepository from "../../src/services/media/mediaRepository.js";
import { resetGroups } from "../../src/services/media/productMediaGroups.js";
import { loadActivity, saveActivity } from "../../src/services/employees/activityService.js";
import { runExplicitMigrations } from "../../src/services/workflow/explicitMigrations.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

/* Captured before any test body executes. Every test file runs in its own
 * Node test worker, so this is the original authored repository state. */
const BASE_PRODUCTS = clone(catalogRepository.all());
const BASE_ACTIVITY = clone(loadActivity());

const PRODUCT_STORAGE_KEY = "pratikshya_products";
const MIGRATION_STORAGE_KEYS = [
  "pratikshya_catalogue_sync_version",
  "pratikshya_draft_sync_version",
  "pratikshya_product_drafts_sync_version",
  "pratikshya_catalogue_reconciliation_version",
];

const availableStorages = () => {
  const stores = new Set();
  try {
    if (typeof globalThis.localStorage !== "undefined" && globalThis.localStorage) {
      stores.add(globalThis.localStorage);
    }
  } catch {
    /* Storage is optional in Node. */
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) stores.add(window.localStorage);
  } catch {
    /* Storage is optional in Node. */
  }
  return stores;
};

const clearMigrationMarkers = () => {
  availableStorages().forEach((storage) => {
    MIGRATION_STORAGE_KEYS.forEach((key) => storage.removeItem(key));
  });
};

/* mediaRepository.resetMedia() clears its own caches. A create/remove pair
 * advances the media version as well, invalidating dependent caches such as
 * productMediaSet, workflow inbox, Kids rows and metrics. The buster is gone
 * before setup returns and can never leak into a test. */
const restoreSeededMedia = () => {
  mediaRepository.resetMedia();
  const buster = mediaRepository.create({
    id: "test-fixture-cache-buster",
    url: "/library/test-fixture-cache-buster.webp",
    title: "Test fixture cache buster",
    status: "DRAFT",
  });
  if (buster) mediaRepository.remove(buster.id);
};

export const setupBaseState = () => {
  clearMigrationMarkers();
  persistCatalogueState(clone(BASE_PRODUCTS), "test-base-state");
  restoreSeededMedia();
  resetGroups();
  saveActivity(clone(BASE_ACTIVITY));

  return {
    state: "BASE",
    products: catalogRepository.all(),
    media: mediaRepository.getAll(),
  };
};

export const setupMigratedState = () => {
  setupBaseState();
  const migration = runExplicitMigrations();
  return {
    state: "MIGRATED",
    migration,
    products: catalogRepository.all(),
    media: mediaRepository.getAll(),
  };
};

export const getBaseFixtureSnapshot = () => ({
  products: clone(BASE_PRODUCTS),
  activity: clone(BASE_ACTIVITY),
});

export const WORKFLOW_TEST_STORAGE_KEYS = {
  products: PRODUCT_STORAGE_KEY,
  migrations: [...MIGRATION_STORAGE_KEYS],
};
