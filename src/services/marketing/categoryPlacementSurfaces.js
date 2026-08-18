/**
 * PRATIKSHYA FASHON — Category listing placement surfaces.
 *
 * The pure bridge between a category listing page's locked scope filters and
 * the PRODUCT marketing placements whose documented surface is that page
 * (`listingSurface: true` in `src/config/mediaTypes.js`).
 *
 * The matcher is data-driven end to end: a placement participates on a
 * listing page only when the page's scope filters carry exactly the
 * placement's recommended Department → Category → Subcategory path. No route
 * is hardcoded here, and no component keeps its own placement list — a new
 * listing placement only has to declare its recommended taxonomy in the
 * placement vocabulary to be wired.
 *
 * The rails themselves resolve through the same register + canonical
 * catalogue path as every other product placement (see
 * `marketingPlacementResolver`); nothing here stores product data.
 *
 * No React, no storage, no writes.
 */

import {
  MARKETING_PLACEMENT_OPTIONS,
  PLACEMENT_MODES,
} from "../../config/mediaTypes";

/**
 * Every live PRODUCT placement whose documented surface is a category
 * listing page. Each must declare a complete recommended taxonomy path —
 * that triple is both the selector's opening arrangement and the route
 * matcher's key.
 */
export const listingProductPlacements = () =>
  MARKETING_PLACEMENT_OPTIONS.filter(
    (placement) =>
      placement.live &&
      placement.mode === PLACEMENT_MODES.PRODUCT &&
      placement.listingSurface === true &&
      placement.recommendedDepartment &&
      placement.recommendedCategory &&
      placement.recommendedSubcategory
  );

/**
 * True when a listing placement's recommended taxonomy is exactly the scope
 * a listing page locked onto (e.g. the bangles subcategory page). Scope
 * filters may be more specific than the placement (a style filter) — the
 * placement still stands on that page.
 */
export const placementMatchesScope = (placement, filters = {}) => {
  if (!placement || typeof filters !== "object" || !filters) return false;
  return (
    filters.department === placement.recommendedDepartment &&
    filters.category === placement.recommendedCategory &&
    filters.subcategory === placement.recommendedSubcategory
  );
};

/**
 * The listing placements whose curated rail renders on a listing page with
 * these scope filters, in vocabulary order. Empty for every page that is no
 * placement's documented surface — nothing is invented.
 */
export const listingPlacementsForScope = (filters = {}) =>
  listingProductPlacements().filter((placement) => placementMatchesScope(placement, filters));

export default {
  listingProductPlacements,
  placementMatchesScope,
  listingPlacementsForScope,
};
