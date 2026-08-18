/**
 * PRATIKSHYA FASHON — Marketing media resolution.
 *
 * The storefront's landing seams (hero, collection panels, campaign
 * backdrop) were authored against the image manifest in Phases 1–4. Phase 12
 * lets the Admin Portal override any of them with an ACTIVE marketing
 * record, without changing a single line of layout.
 *
 * The rule is deliberately conservative: an override is used only when it
 * resolves to a real address. Anything else — no record, a draft, an
 * archived record, a demo placeholder with no file — leaves the house
 * artwork exactly where it is. The landing page can therefore never end up
 * with an empty frame.
 */

import { MEDIA_TYPES } from "../../config/mediaTypes";
import { resolveMediaUrl } from "./mediaPaths";

/**
 * A marketing record shaped for `PratikshyaImage`, or null when it cannot
 * stand in for artwork.
 *
 * Video placements resolve to their poster: the landing seams are still
 * plates by design, and Phase 12 does not change that treatment.
 */
export const placementImageSource = (media) => {
  if (!media) return null;
  const src = resolveMediaUrl(
    media.type === MEDIA_TYPES.VIDEO ? media.poster : media.url || media.thumbnail
  );
  if (!src) return null;

  return {
    id: media.id,
    src,
    alt: media.alt || media.title,
    category: media.tags?.[0] ?? "default",
  };
};

/** The artwork a seam should draw: the override when usable, else `fallback`. */
export const resolvePlacementImage = (media, fallback) => placementImageSource(media) ?? fallback;

export default { placementImageSource, resolvePlacementImage };
