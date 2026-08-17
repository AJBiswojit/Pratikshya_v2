/**
 * PRATIKSHYA FASHON — Marketing placement hooks.
 *
 * Small subscriptions over `marketingPlacementRepository`, mirroring the
 * `useMedia` hooks: a page reads through one of these, so a curation made in
 * the Admin Portal reaches the marketing board and the storefront sections
 * in the same tick. The repository is the source of truth; the hooks only
 * re-read it when the register announces a write.
 */

import { useCallback, useEffect, useState } from "react";
import marketingPlacementRepository, {
  MARKETING_PLACEMENTS_CHANGED_EVENT,
} from "../services/media/marketingPlacementRepository";
import {
  resolvePlacementProducts,
  resolvePlacementEntries,
} from "../services/media/marketingPlacementResolver";

const usePlacementSelector = (read, deps = []) => {
  const [value, setValue] = useState(read);

  useEffect(() => {
    const sync = () => setValue(read());
    sync();
    window.addEventListener(MARKETING_PLACEMENTS_CHANGED_EVENT, sync);
    /* Another tab curating marketing media should be reflected here too. */
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(MARKETING_PLACEMENTS_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  return value;
};

/** The ordered product ids assigned to one placement. */
export const usePlacementProductIds = (placementId) =>
  usePlacementSelector(
    () => marketingPlacementRepository.getPlacementProductIds(placementId),
    [placementId]
  );

/** The assigned ids, resolved through a caller-provided product list. */
export const usePlacementProducts = (placementId, products = []) => {
  const key = Array.isArray(products) ? products.map((product) => product?.id).join("|") : "";
  return usePlacementSelector(
    () => resolvePlacementProducts(placementId, products),
    [placementId, key] // eslint-disable-line react-hooks/exhaustive-deps
  );
};

/** Assigned products shaped for editorial carousels / plates. */
export const usePlacementEntries = (placementId, products = []) => {
  const key = Array.isArray(products) ? products.map((product) => product?.id).join("|") : "";
  return usePlacementSelector(
    () => resolvePlacementEntries(placementId, products),
    [placementId, key] // eslint-disable-line react-hooks/exhaustive-deps
  );
};

/** True when a placement has at least one assigned product. */
export const usePlacementHasAssignments = (placementId) =>
  usePlacementSelector(
    () => marketingPlacementRepository.getPlacementProductIds(placementId).length > 0,
    [placementId]
  );

/**
 * The write side of marketing placement curation. Pages call these methods;
 * they never import the repository's write methods directly, mirroring the
 * `useMediaActions` convention.
 */
export const marketingPlacementActions = {
  add: marketingPlacementRepository.addPlacementProductIds,
  set: marketingPlacementRepository.setPlacementProductIds,
  remove: marketingPlacementRepository.removePlacementProductId,
  move: marketingPlacementRepository.movePlacementProductId,
  clear: marketingPlacementRepository.clearPlacement,
};

export default usePlacementProductIds;
