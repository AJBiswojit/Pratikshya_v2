/**
 * PRATIKSHYA FASHON — Marketing placement product resolution.
 *
 * The storefront side of a marketing placement. A placement stores product
 * ids only (see `marketingPlacementRepository`); this module resolves those
 * ids through the CANONICAL product catalogue and returns the exact products
 * in the placement's display order.
 *
 * The catalogue is the single source of truth: if a product's name, taxonomy
 * or media changes, the marketing section picks it up automatically. No
 * product data is duplicated here, and no storefront product array is ever
 * authored.
 *
 * Two resolutions exist because two kinds of surfaces consume placements:
 *
 *   · `resolvePlacementProducts` — the product itself, for rails/grids that
 *     render through the shared ProductCard.
 *
 *   · `resolvePlacementEntries` — a product + its canonical primary image +
 *     its product route, for editorial carousels and plates that paint the
 *     piece directly.
 *
 * Both take the caller's product list so the approval workflow is respected
 * by the caller: the storefront passes `getLiveStorefrontProducts()`, which
 * only contains PUBLISHED products on ACTIVE taxonomy. A product that is not
 * eligible for the storefront simply does not resolve here; the Admin Portal
 * still shows it (with its status) when curating.
 */

import { getPlacement } from "../../config/mediaTypes";
import { getPlacementProductIds } from "./marketingPlacementRepository";
import { getProductMediaSet } from "./productMediaSet";
import { productHref } from "../../data/products";

/** Product ids assigned to a placement, in display order. */
const assignedIds = (placementId) => {
  if (!placementId || !getPlacement(placementId)) return [];
  return getPlacementProductIds(placementId);
};

/**
 * The assigned products that exist in `products`, in placement order.
 *
 * `products` is the caller's authoritative list (the storefront passes the
 * live published catalogue). Ids that are not in the list — unpublished,
 * archived or retired pieces — are skipped, never invented.
 */
export const resolvePlacementProducts = (placementId, products = []) => {
  const ids = assignedIds(placementId);
  if (!ids.length || !Array.isArray(products)) return [];
  const byId = new Map(products.map((product) => [String(product?.id), product]));
  const resolved = [];
  ids.forEach((id) => {
    const product = byId.get(String(id));
    if (product) resolved.push(product);
  });
  return resolved;
};

/**
 * Assigned products shaped for editorial carousels / plates:
 * `{ product, image, route, productId }`, where `image` is the canonical
 * product media set primary. Products without a resolvable primary plate
 * are dropped — a marketing seam never renders an empty frame.
 */
export const resolvePlacementEntries = (placementId, products = []) => {
  const rows = resolvePlacementProducts(placementId, products);
  const entries = [];
  rows.forEach((product) => {
    const mediaSet = getProductMediaSet(product);
    const image = mediaSet.primary;
    if (!image || !image.src) return;
    entries.push({
      product,
      productId: product.id,
      image: {
        ...image,
        alt: image.alt || product.name,
        category: product.category,
        productId: product.id,
      },
      mediaSet,
      route: productHref(product),
    });
  });
  return entries;
};

/** True when a placement currently holds at least one assigned product. */
export const hasPlacementAssignments = (placementId) =>
  assignedIds(placementId).length > 0;

export default {
  resolvePlacementProducts,
  resolvePlacementEntries,
  hasPlacementAssignments,
};
