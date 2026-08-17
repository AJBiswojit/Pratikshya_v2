/**
 * PRATIKSHYA FASHON — Explore advertisement placements (Phase 24).
 *
 * Promotional and editorial inserts on Explore resolve through the existing
 * mediaResolver. They never use a product's primary / gallery / hover plate
 * as an advertisement.
 */

import { MEDIA_SCOPES, USAGE_ROLES } from "../../config/mediaTypes";
import {
  resolveEditorialFrame,
  resolveMediaSource,
  resolveSaleBackdrop,
  selectMedia,
} from "../media/mediaResolver";

const isMarketingPlate = (media) => {
  if (!media) return false;
  if (media.scope === MEDIA_SCOPES.PRODUCT) return false;
  if (media.productId) return false;
  return true;
};

const pickRoleMedia = (roles, usedIds) => {
  const selected = selectMedia({
    roles,
    usedIds,
    limit: 4,
    excludeHouse: true,
  });
  const marketing = selected.find(isMarketingPlate) || null;
  return marketing ? resolveMediaSource(marketing) : null;
};

/** Wide promotional banner — SALE / BANNER / HERO marketing media. */
export const resolveExplorePromoMedia = (usedIds = null) => {
  const used = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
  const direct = pickRoleMedia(
    [USAGE_ROLES.SALE, USAGE_ROLES.BANNER, USAGE_ROLES.HERO],
    used
  );
  if (direct) return { ...direct, placement: "promo", role: "SALE" };
  const fallback = resolveSaleBackdrop(null, used);
  return fallback ? { ...fallback, placement: "promo", role: "SALE" } : null;
};

/** Editorial / collection insert — EDITORIAL / LOOKBOOK / COLLECTION. */
export const resolveExploreEditorialMedia = (usedIds = null) => {
  const used = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
  const direct = pickRoleMedia(
    [USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK, USAGE_ROLES.COLLECTION_COVER, USAGE_ROLES.HERO],
    used
  );
  if (direct) return { ...direct, placement: "editorial", role: "EDITORIAL" };
  const fallback = resolveEditorialFrame("heritage", used);
  return fallback ? { ...fallback, placement: "editorial", role: "EDITORIAL" } : null;
};

export default {
  resolveExplorePromoMedia,
  resolveExploreEditorialMedia,
};
