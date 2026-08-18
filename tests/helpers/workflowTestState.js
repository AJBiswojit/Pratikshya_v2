/** Deterministic isolation for tests that exercise the canonical product workflow. */

import catalogRepository, { persistCanonicalCatalogueState } from "../../src/services/catalogRepository.js";
import mediaRepository from "../../src/services/media/mediaRepository.js";
import { resetGroups } from "../../src/services/media/productMediaGroups.js";
import { loadActivity, saveActivity } from "../../src/services/employees/activityService.js";

const clone = (value) => JSON.parse(JSON.stringify(value));

// Each Node test worker captures the authored repository state before test mutation.
const CANONICAL_PRODUCTS = clone(catalogRepository.all());
const CANONICAL_ACTIVITY = clone(loadActivity());

export const setupCanonicalState = () => {
  persistCanonicalCatalogueState(clone(CANONICAL_PRODUCTS), "test-canonical-state");
  mediaRepository.resetMedia();
  // Advance the media version so dependent indexes cannot retain a prior test's ownership.
  const cacheBuster = mediaRepository.create({
    id: "test-fixture-cache-buster",
    url: "/images/products/.test/cache-buster.avif",
    title: "Test fixture cache buster",
    status: "DRAFT",
  });
  if (cacheBuster) mediaRepository.remove(cacheBuster.id);
  resetGroups();
  saveActivity(clone(CANONICAL_ACTIVITY));

  return {
    state: "CANONICAL",
    products: catalogRepository.all(),
    media: mediaRepository.getAll(),
  };
};

export const getCanonicalFixtureSnapshot = () => ({
  products: clone(CANONICAL_PRODUCTS),
  activity: clone(CANONICAL_ACTIVITY),
});
