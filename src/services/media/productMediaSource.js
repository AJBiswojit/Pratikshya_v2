/**
 * PRATIKSHYA FASHON — Product media resolution.
 *
 * The bridge between the media repository and the storefront. A product's
 * pictures may come from two places: the catalogue plates authored in
 * `data/products` (Phases 1–5) and the media register managed in the Admin
 * Portal (Phase 12). This module decides which wins, and hands back one
 * ordered list the gallery can render without knowing the difference.
 *
 * The rule is simple and premium-safe:
 *   · media the Admin Portal has published for a product takes precedence
 *   · anything the register does not cover falls back to the catalogue
 *   · a product with no media at all still shows its authored plates
 *
 * Nothing here writes. Nothing here imports React.
 */

import { MEDIA_TYPES, PRODUCT_MEDIA_ROLES } from "../../config/mediaTypes";
import { imageRef } from "../../data/mediaPlaceholder";
import { getProductMedia } from "./mediaRepository";
import { resolveMediaUrl } from "./mediaPaths";
import { getProductMediaSet } from "./productMediaSet";

/**
 * Media records and manifest images are both accepted by `PratikshyaImage`,
 * but only the manifest form carries a fallback plate. This shapes a record
 * into that form so a broken remote address still resolves to house artwork.
 */
const asImageSource = (media) => ({
  id: media.id,
  src: resolveMediaUrl(media.url || media.thumbnail),
  alt: media.alt || media.title,
  category: media.categoryId || media.tags?.[0] || "default",
  width: media.width || undefined,
  height: media.height || undefined,
});

/** A gallery slide, in the single shape the gallery renders. Phase 21.6 adds view/groupKey. */
const slide = (media) => ({
  id: media.id,
  type: media.type,
  title: media.title,
  alt: media.alt || media.title,
  caption: media.caption || "",
  image:
    media.type === MEDIA_TYPES.VIDEO
      ? media.poster
        ? { id: `${media.id}-poster`, src: media.poster, alt: media.alt || media.title }
        : null
      : asImageSource(media),
  src: media.type === MEDIA_TYPES.VIDEO ? media.url : null,
  poster: media.poster || "",
  role: media.role,
  fromRepository: true,
  view: media.view || null,
  groupKey: media.groupKey || null,
  viewScore: media.viewScore ?? 99,
  isStandalone: Boolean(media.isStandalone),
  fileName: media.fileName || media.currentFilename || null,
});

/** A catalogue plate, in the same shape. */
const catalogueSlide = (image, index, product) => ({
  id: image?.id ?? `${product.id}-plate-${index}`,
  type: MEDIA_TYPES.IMAGE,
  title: `${product.name} — view ${index + 1}`,
  alt: image?.alt || `${product.name}, view ${index + 1}`,
  caption: "",
  image,
  src: null,
  poster: "",
  role: image?.role || (index === 0 ? PRODUCT_MEDIA_ROLES.COVER : PRODUCT_MEDIA_ROLES.GALLERY),
  fromRepository: Boolean(image?.fromRepository),
  view: image?.view || (index === 0 ? "front" : `view-${index + 1}`),
  groupKey: image?.groupKey || product.id,
  viewScore: image?.viewScore ?? index,
  isStandalone: Boolean(image?.isStandalone),
  fileName: image?.fileName || null,
});

/** Product-owned plates only — never a category-wide gallery pad. */
const cataloguePlates = (product) => {
  if (!product) return [];
  const set = getProductMediaSet(product);
  const authored = set.gallery.length ? set.gallery : product.image ? [product.image] : [];
  return authored.filter(Boolean).map((image, index) => catalogueSlide(image, index, product));
};

/**
 * Every slide the product page should show, images first, then video.
 *
 * Images come from the canonical product media set: register media whose
 * productId matches, plus the product's own authored primary. Category
 * galleries and another product's plates are never mixed in.
 */
export const getProductSlides = (product) => {
  if (!product) return [];

  const set = getProductMediaSet(product);
  const published = getProductMedia(product.id, { publicOnly: true });
  const publishedById = new Map(published.map((item) => [item.id, item]));
  const videos = published.filter((item) => item.type === MEDIA_TYPES.VIDEO);

  const imageSlides = set.gallery.length
    ? set.gallery.map((entry, index) => {
        const match = entry.id ? publishedById.get(entry.id) : null;
        if (match && match.type === MEDIA_TYPES.IMAGE) return slide(match);
        return catalogueSlide(entry, index, product);
      })
    : cataloguePlates(product);

  return [...imageSlides, ...videos.map(slide)];
};

/**
 * The single plate every card, listing and search result uses.
 *
 * Cards never show video. Resolved through the product media set so a
 * product never borrows another product's cover.
 */
export const getProductCoverImage = (product) => {
  if (!product) return null;
  const set = getProductMediaSet(product);
  return set.primary || product.image || null;
};

/** True when a product has published film — used to badge the gallery. */
export const hasProductVideo = (product) =>
  Boolean(product) &&
  getProductMedia(product.id, { publicOnly: true, type: MEDIA_TYPES.VIDEO }).length > 0;

/**
 * Always-shaped cover for operational surfaces (admin tables, the product
 * record). Handles manifest ids, stored addresses and authored objects
 * alike, so callers can simply render `cover.src`.
 */
export const resolveProductCover = (product) => {
  const cover = getProductCoverImage(product);
  if (!cover) return null;
  if (typeof cover === "object") return cover.src ? cover : null;
  if (typeof cover === "string") {
    if (cover.startsWith("http") || cover.startsWith("/") || cover.startsWith("data:")) {
      return { id: cover, src: cover, alt: product?.name ?? "" };
    }
    const referenced = imageRef(cover);
    return referenced?.src ? referenced : null;
  }
  return null;
};

export default { getProductSlides, getProductCoverImage, hasProductVideo, resolveProductCover };
