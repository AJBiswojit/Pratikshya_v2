/**
 * PRATIKSHYA FASHON — Media resolver (Phase 21.4).
 *
 * The single distribution door. Homepage, category pages, product cards,
 * AI Shopping and AI Mirror ask this module for a plate; they never scan
 * the filesystem or hard-code a hundred paths.
 *
 * Selection is deterministic:
 *   featured → matching usage role → category/product relevance →
 *   active → quality/resolution → stable id order.
 *
 * A page refresh never reshuffles imagery. An image is never used for a
 * category it does not belong to. Jewellery / innerwear never reach AI Mirror.
 */

import {
  AI_MIRROR_ELIGIBLE_CATEGORIES,
  AI_MIRROR_EXCLUDED_CATEGORIES,
  MARKETING_PLACEMENTS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  USAGE_ROLES,
} from "../../config/mediaTypes";
import { imageRef } from "../../data/pratikshyaImageManifest";
import { getLiveStorefrontProducts, productHref } from "../../data/products";
import taxonomyRepository from "../taxonomyRepository";
import { getAll, getById, getMarketingMedia, getProductMedia } from "./mediaRepository";
import { placementImageSource } from "./marketingMediaSource";
import {
  isIngestedPhotographyUrl,
  resolveLegacyMediaUrl,
} from "./mediaPaths";
import { getProductCoverImage } from "./productMediaSource";
import {
  applyProductMediaSet,
  getProductMediaSet,
  PRODUCT_MEDIA_STATUS,
} from "./productMediaSet";

const asSource = (media, fallbackCategory = "default") => {
  if (!media) return null;
  const src = resolveLegacyMediaUrl(media.url || media.thumbnail || media.poster);
  if (!src) return null;
  return {
    id: media.id,
    src,
    alt: media.alt || media.title || "PRATIKSHYA FASHON",
    category: media.categoryId || media.tags?.[0] || fallbackCategory,
    width: media.width || undefined,
    height: media.height || undefined,
    fallback: undefined,
  };
};

const isUsable = (media) =>
  Boolean(
    media &&
      media.status === MEDIA_STATUS.ACTIVE &&
      (media.url || media.thumbnail) &&
      !media.broken &&
      media.duplicateStatus !== "DUPLICATE"
  );

const qualityScore = (media) => {
  const width = Number(media.width) || 0;
  const height = Number(media.height) || 0;
  const pixels = width * height;
  if (pixels >= 1600 * 2000) return 5;
  if (pixels >= 1000 * 1400) return 4;
  if (pixels >= 800 * 1000) return 3;
  if (width >= 400) return 2;
  return 1;
};

const roleRank = (media, preferredRoles = []) => {
  const roles = media.usageRoles || [];
  const index = preferredRoles.findIndex((role) => roles.includes(role));
  return index === -1 ? preferredRoles.length + 1 : index;
};

/**
 * The Phase 21.4 house plates are the *existing* fallback artwork (the old
 * `images/*` manifest plates re-ingested as `dump` records). They must never
 * outrank the new library photography for the same category — they exist to
 * catch the case where a category has no library media at all.
 */
const isHousePlate = (media) =>
  Boolean(media && ((media.tags || []).includes("house") || media.source === "House artwork"));

/**
 * Phase 21.8 — why a plate was chosen. Every customer-facing cover now
 * carries a reason so the audit can prove *what* was selected, not just that
 * a resolver ran. The values describe the fallback chain travelled:
 *
 *   DIRECT            a dedicated role asset (CATEGORY_COVER / COLLECTION_COVER /
 *                     PRODUCT_PRIMARY / HERO / SALE …) from the real library
 *   PRODUCT_GALLERY   a product's own gallery media, used when it has no COVER
 *   TAXONOMY_PRODUCT  a member product's primary media standing in for a
 *                     category / collection that has no dedicated cover
 *   RELATED_TAXONOMY  library media tagged to the same taxonomy, any role
 *   HOUSE_FALLBACK    the existing premium house artwork
 *   NO_SOURCE_MEDIA   no relevant source photography exists — house artwork
 */
export const FALLBACK_REASONS = {
  DIRECT: "DIRECT",
  PRODUCT_GALLERY: "PRODUCT_GALLERY",
  TAXONOMY_PRODUCT: "TAXONOMY_PRODUCT",
  RELATED_TAXONOMY: "RELATED_TAXONOMY",
  HOUSE_FALLBACK: "HOUSE_FALLBACK",
  NO_SOURCE_MEDIA: "NO_SOURCE_MEDIA",
};

const withReason = (source, reason) => (source ? { ...source, reason } : null);

/**
 * Rank a candidate list. Higher is better; ties break on id so the order
 * is stable across renders.
 *
 * Order mirrors the Phase 21.5 selection rules:
 *   1. real library photography over house fallback plates
 *   2. explicit usage role (CATEGORY_COVER > EDITORIAL > HERO > …)
 *   3. featured
 *   4. quality / resolution
 *   5. portrait preference
 *   6. stable id order
 */
export const compareMedia = (a, b, { preferredRoles = [], preferPortrait = false } = {}) => {
  const house = Number(isHousePlate(a)) - Number(isHousePlate(b));
  if (house) return house;
  const role = roleRank(a, preferredRoles) - roleRank(b, preferredRoles);
  if (role) return role;
  const featured = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
  if (featured) return featured;
  const quality = qualityScore(b) - qualityScore(a);
  if (quality) return quality;
  if (preferPortrait) {
    const aPortrait = (a.height || 0) >= (a.width || 0) ? 1 : 0;
    const bPortrait = (b.height || 0) >= (b.width || 0) ? 1 : 0;
    if (aPortrait !== bPortrait) return bPortrait - aPortrait;
  }
  return String(a.id).localeCompare(String(b.id));
};

/**
 * Pick up to `limit` usable records matching the query.
 * `usedIds` prevents the same plate appearing twice in one viewport.
 */
export const selectMedia = ({
  role = null,
  roles = null,
  categoryId = null,
  collectionId = null,
  productId = null,
  usedIds = null,
  limit = 1,
  preferPortrait = false,
  allowUnmapped = false,
  excludeHouse = false,
} = {}) => {
  const preferredRoles = roles || (role ? [role] : []);
  const used = usedIds instanceof Set ? usedIds : new Set(usedIds || []);

  const pool = getAll()
    .filter(isUsable)
    .filter((item) => (allowUnmapped ? true : item.mappingStatus !== "UNMAPPED"))
    .filter((item) => (excludeHouse ? !isHousePlate(item) : true))
    .filter((item) => (categoryId ? item.categoryId === categoryId : true))
    .filter((item) => (collectionId ? item.collectionId === collectionId : true))
    .filter((item) => (productId ? item.productId === productId : true))
    .filter((item) => (preferredRoles.length ? preferredRoles.some((entry) => (item.usageRoles || []).includes(entry)) : true))
    .filter((item) => !used.has(item.id));

  pool.sort((a, b) => compareMedia(a, b, { preferredRoles, preferPortrait }));
  const chosen = pool.slice(0, Math.max(1, limit));
  chosen.forEach((item) => used.add(item.id));
  return chosen;
};

export const resolveMediaSource = (media, fallback) => asSource(media) ?? fallback ?? null;

/**
 * Ergonomic entry point for the single distribution strategy (Phase 21.5).
 * Thin alias over `selectMedia` so callers and the exposure audit speak one
 * vocabulary (`usage`, `excludeIds`) without introducing a second resolver.
 */
export const resolveMedia = ({
  usage = null,
  roles = null,
  categoryId = null,
  collectionId = null,
  productId = null,
  limit = 1,
  excludeIds = null,
  preferPortrait = false,
  allowUnmapped = false,
} = {}) =>
  selectMedia({
    role: usage && !roles ? usage : null,
    roles,
    categoryId,
    collectionId,
    productId,
    usedIds: excludeIds,
    limit,
    preferPortrait,
    allowUnmapped,
  });

/** The best real-library image a product owns — COVER preferred, never house. */
const libraryProductImage = (product, usedIds = null) => {
  if (!product?.id) return null;
  const images = getProductMedia(product.id, { publicOnly: true, type: MEDIA_TYPES.IMAGE })
    .filter(isUsable)
    .filter((item) => !isHousePlate(item))
    .filter((item) => !(usedIds && usedIds.has(item.id)));
  if (!images.length) return null;
  return images.find((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ?? images[0];
};

/**
 * Highest-ranked library image across a set of products — the fallback a
 * category/collection uses when it has no dedicated cover. The image always
 * belongs to a product inside that category/collection, never an unrelated
 * one.
 */
const bestMemberProductImage = (products = [], usedIds = null) => {
  const candidates = [];
  (products || []).forEach((product) => {
    const media = libraryProductImage(product, usedIds);
    if (media) candidates.push(media);
  });
  if (!candidates.length) return null;
  candidates.sort((a, b) => compareMedia(a, b, { preferPortrait: true }));
  const chosen = candidates[0];
  usedIds?.add(chosen.id);
  return chosen;
};

/** One pass over the register → productId → its library media coverage. */
export const buildProductLibraryIndex = () => {
  const index = new Map();
  getAll().forEach((item) => {
    if (item.scope !== MEDIA_SCOPES.PRODUCT || !item.productId) return;
    if (!isUsable(item) || isHousePlate(item)) return;
    const entry = index.get(item.productId) || { hasCover: false, hasAny: false };
    entry.hasAny = true;
    if (item.role === PRODUCT_MEDIA_ROLES.COVER) entry.hasCover = true;
    index.set(item.productId, entry);
  });
  return index;
};

/**
 * Library coverage tier for one product:
 *   0 = dedicated library COVER/PRIMARY media
 *   1 = library gallery media (no COVER)
 *   2 = authored fallback only
 * A product never borrows another product's image — only its own published
 * media is consulted.
 */
export const productMediaTier = (product) => {
  const images = getProductMedia(product?.id, { publicOnly: true, type: MEDIA_TYPES.IMAGE })
    .filter(isUsable)
    .filter((item) => !isHousePlate(item));
  if (!images.length) return 2;
  return images.some((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ? 0 : 1;
};

/**
 * Ranks candidates so products with real library primary media come first,
 * then library gallery, then authored — recency breaks ties within a tier.
 * Single source for the New Arrivals section and the audit, so the report
 * always mirrors what the customer sees.
 */
export const rankNewArrivalProducts = (products = []) => {
  const index = buildProductLibraryIndex();
  const tierOf = (product) => {
    const entry = index.get(String(product?.id));
    if (!entry) return 2;
    return entry.hasCover ? 0 : 1;
  };
  return [...products]
    .map((product) => ({ product, tier: tierOf(product) }))
    .sort(
      (a, b) =>
        a.tier - b.tier ||
        (Number(b.product.addedOrder) || 0) - (Number(a.product.addedOrder) || 0)
    )
    .map((entry) => entry.product);
};

/**
 * The New Arrivals selection: flagged arrivals first (ranked library-first),
 * then the newest remaining pieces to fill the rail. Qualification is
 * unchanged — only the ordering within the new-arrival pool prefers real
 * product photography.
 */
export const selectNewArrivalProducts = (products = [], count = 5) => {
  const list = products || [];
  const flagged = rankNewArrivalProducts(list.filter((product) => product.isNew));
  const rest = list
    .filter((product) => !product.isNew)
    .sort((a, b) => (Number(b.addedOrder) || 0) - (Number(a.addedOrder) || 0));
  return [...flagged, ...rest].slice(0, Math.max(0, count));
};

/* ------------------------------------------------------------------ */
/* Homepage Saree Edit                                                 */
/* ------------------------------------------------------------------ */

/** A deliberately edited rail rather than an unbounded catalogue dump. */
export const SAREE_EDIT_PRODUCT_COUNT = 8;

const sourcePath = (source) => source?.src || source?.url || source?.thumbnail || "";

const sourceFilename = (source) =>
  source?.fileName ||
  source?.currentFilename ||
  sourcePath(source).split("?")[0].split("/").pop() ||
  null;

/**
 * Explain which product-owned rung supplied a Saree Edit cover. This is
 * audit metadata only; the image itself always comes from getProductMediaSet.
 */
const sareeEditMediaSource = (primary, registered) => {
  const isLibraryAsset = isIngestedPhotographyUrl(sourcePath(primary));
  const role = registered?.role || primary?.role;
  if (isLibraryAsset && role === PRODUCT_MEDIA_ROLES.COVER) return "PRODUCT_LIBRARY_COVER";
  if (isLibraryAsset) return "PRODUCT_LIBRARY_GALLERY";
  if (registered && role === PRODUCT_MEDIA_ROLES.COVER) return "PRODUCT_OWNED_COVER";
  if (registered) return "PRODUCT_OWNED_GALLERY";
  return "AUTHORED_PRODUCT_IMAGE";
};

/**
 * Deterministic homepage edit:
 *
 *   ACTIVE Sarees taxonomy → PUBLISHED Saree products → exact product media
 *   set → primary/cover → stable editorial ranking.
 *
 * Ownership is checked twice. The canonical set must mark the primary with
 * the same product id and, when the primary is a repository record, that
 * record must also name the same owner. Category media and another product's
 * gallery can therefore never enter the carousel. Generic category/editorial
 * manifest plates are ineligible; a dedicated library asset or genuinely
 * product-authored source is required. Repeated source files are dropped as
 * well, preserving the visual variety of the edit.
 */
export const selectSareeEditProducts = (
  products = getLiveStorefrontProducts(),
  count = SAREE_EDIT_PRODUCT_COUNT
) => {
  const category = taxonomyRepository.findCategory("sarees");
  if (!category || category.status !== "ACTIVE") return [];

  const candidates = (products || [])
    .filter(
      (product) =>
        product?.category === category.id &&
        product.status === "PUBLISHED" &&
        Boolean(product.slug)
    )
    .map((product) => {
      const mediaSet = getProductMediaSet(product);
      const image = mediaSet.primary;
      const registered = image?.id ? getById(image.id) : null;
      const imageOwner = image?.productId == null ? null : String(image.productId);
      const registeredOwner = registered?.productId == null ? null : String(registered.productId);
      const ownsImage = imageOwner === String(product.id);
      const registeredOwnershipIsValid = !registered || registeredOwner === String(product.id);
      const path = sourcePath(image);
      const dedicatedLibrary = isIngestedPhotographyUrl(path);
      const sourceLabel = String(registered?.source || "").toLowerCase();
      const isGenericEditorial =
        !dedicatedLibrary &&
        (Boolean(image?.purpose) ||
          sourceLabel.includes("house") ||
          (registered?.tags || []).includes("house"));

      if (
        !image ||
        !path ||
        !ownsImage ||
        !registeredOwnershipIsValid ||
        isGenericEditorial ||
        mediaSet.status === PRODUCT_MEDIA_STATUS.CROSS_PRODUCT_REFERENCE
      ) {
        return null;
      }

      const rankingTier = product.isFeatured ? 0 : dedicatedLibrary ? 1 : product.isNew ? 2 : 3;

      return {
        product,
        image,
        mediaSet,
        mediaId: image.id || null,
        filename: sourceFilename(image),
        fallbackSource: sareeEditMediaSource(image, registered),
        route: productHref(product),
        rankingTier,
      };
    })
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.rankingTier - b.rankingTier ||
        String(a.product.id).localeCompare(String(b.product.id))
    );

  const seenProducts = new Set();
  const seenImages = new Set();
  const selected = [];
  const limit = Math.max(0, Number(count) || 0);

  for (const candidate of candidates) {
    const productKey = String(candidate.product.id);
    const imageKey = sourcePath(candidate.image).split("?")[0];
    if (seenProducts.has(productKey) || !imageKey || seenImages.has(imageKey)) continue;
    seenProducts.add(productKey);
    seenImages.add(imageKey);
    selected.push(candidate);
    if (selected.length >= limit) break;
  }

  return selected;
};

/* ------------------------------------------------------------------ */
/* Homepage Bride & Groom                                              */
/* ------------------------------------------------------------------ */

/** A short editorial rotation — not a catalogue dump. */
export const BRIDE_GROOM_LOOK_COUNT = 4;

/** Women's wedding taxonomy the Bride plate may draw from. */
export const BRIDE_CATEGORY_IDS = ["bridal-couture", "lehengas", "sarees"];

/** Men's wedding / ceremonial taxonomy the Groom plate may draw from. */
export const GROOM_CATEGORY_IDS = ["menswear"];

const BRIDE_WEDDING_OCCASIONS = ["Bridal", "Wedding", "Reception", "Sangeet"];
const GROOM_WEDDING_OCCASIONS = ["Wedding", "Reception", "Sangeet"];
const GROOM_CEREMONIAL_SUBCATEGORIES = ["Sherwani", "Kurta Pajama", "Kurta", "Nehru Jacket"];

const BRIDE_GROOM_ROLES = [
  USAGE_ROLES.EDITORIAL,
  USAGE_ROLES.LOOKBOOK,
  USAGE_ROLES.HERO,
  USAGE_ROLES.CATEGORY_COVER,
];

const asIdSet = (value) => {
  if (value instanceof Set) return value;
  return new Set(value || []);
};

const occasionList = (product) =>
  Array.isArray(product?.occasion) ? product.occasion : [];

const hasOccasion = (product, allowed) =>
  occasionList(product).some((entry) => allowed.includes(entry));

const activeCategory = (id) => {
  const category = taxonomyRepository.findCategory(id);
  return category && category.status === "ACTIVE" ? category : null;
};

const isPublishedProduct = (product) =>
  Boolean(product && product.status === "PUBLISHED" && product.slug);

/** Bride products: women's wedding silhouettes only — never menswear or kids. */
export const isBrideWeddingProduct = (product) => {
  if (!isPublishedProduct(product)) return false;
  if (!BRIDE_CATEGORY_IDS.includes(product.category)) return false;
  if (product.gender && product.gender !== "Women") return false;
  if (product.category === "bridal-couture") return true;
  return hasOccasion(product, BRIDE_WEDDING_OCCASIONS);
};

/** Groom products: men's ceremonial wear only — never women's or kids imagery. */
export const isGroomWeddingProduct = (product) => {
  if (!isPublishedProduct(product)) return false;
  if (!GROOM_CATEGORY_IDS.includes(product.category)) return false;
  if (product.gender && product.gender !== "Men") return false;
  if (GROOM_CEREMONIAL_SUBCATEGORIES.includes(product.subcategory)) return true;
  return hasOccasion(product, GROOM_WEDDING_OCCASIONS);
};

const brideGroomMediaSource = (primary, registered, ownership) => {
  if (ownership === "taxonomy") {
    return isIngestedPhotographyUrl(sourcePath(primary))
      ? "TAXONOMY_LIBRARY"
      : "TAXONOMY_OWNED";
  }
  return sareeEditMediaSource(primary, registered);
};

const productLookFromSet = (product, side, usedIds) => {
  const mediaSet = getProductMediaSet(product);
  const image = mediaSet.primary;
  const registered = image?.id ? getById(image.id) : null;
  const imageOwner = image?.productId == null ? null : String(image.productId);
  const registeredOwner = registered?.productId == null ? null : String(registered.productId);
  const ownsImage = imageOwner === String(product.id);
  const registeredOwnershipIsValid = !registered || registeredOwner === String(product.id);
  const path = sourcePath(image);
  const dedicatedLibrary = isIngestedPhotographyUrl(path);
  const sourceLabel = String(registered?.source || "").toLowerCase();
  const isGenericEditorial =
    !dedicatedLibrary &&
    (Boolean(image?.purpose) ||
      sourceLabel.includes("house") ||
      (registered?.tags || []).includes("house"));

  if (
    !image ||
    !path ||
    !ownsImage ||
    !registeredOwnershipIsValid ||
    isGenericEditorial ||
    mediaSet.status === PRODUCT_MEDIA_STATUS.CROSS_PRODUCT_REFERENCE
  ) {
    return null;
  }

  if (image.id && usedIds.has(image.id)) return null;
  if (registered?.categoryId && registered.categoryId !== product.category) return null;

  const categoryRank =
    side === "bride"
      ? { "bridal-couture": 0, lehengas: 1, sarees: 2 }[product.category] ?? 3
      : { Sherwani: 0, "Kurta Pajama": 1, Kurta: 2, "Nehru Jacket": 3 }[product.subcategory] ?? 4;

  const rankingTier =
    categoryRank * 10 + (product.isFeatured ? 0 : dedicatedLibrary ? 1 : product.isNew ? 2 : 3);

  return {
    side,
    product,
    image: {
      ...image,
      alt: image.alt || product.name,
      category: product.category,
      productId: product.id,
    },
    mediaSet,
    mediaId: image.id || null,
    filename: sourceFilename(image),
    fallbackSource: brideGroomMediaSource(image, registered, "product"),
    categoryId: product.category,
    productId: product.id,
    groupKey: mediaSet.groupKey || String(product.id),
    rankingTier,
    ownership: "product",
  };
};

const taxonomyLookFromMedia = (media, side, categoryId) => {
  const source = asSource(media, categoryId);
  if (!source) return null;
  return {
    side,
    product: null,
    image: {
      ...source,
      productId: media.productId || null,
      fileName: media.currentFilename || media.fileName || sourceFilename(source),
    },
    mediaSet: null,
    mediaId: media.id || null,
    filename: sourceFilename(source) || media.currentFilename || media.fileName || null,
    fallbackSource: brideGroomMediaSource(source, media, "taxonomy"),
    categoryId,
    productId: media.productId || null,
    groupKey: media.groupKey || media.id,
    rankingTier: 40,
    ownership: "taxonomy",
  };
};

const collectProductLooks = (products, side, predicate, usedIds) =>
  (products || [])
    .filter(predicate)
    .map((product) => productLookFromSet(product, side, usedIds))
    .filter(Boolean)
    .sort(
      (a, b) =>
        a.rankingTier - b.rankingTier || String(a.product.id).localeCompare(String(b.product.id))
    );

const collectTaxonomyLooks = (categoryIds, side, productsById, usedIds) => {
  const looks = [];
  categoryIds.forEach((categoryId) => {
    if (!activeCategory(categoryId)) return;
    const selected = selectMedia({
      categoryId,
      roles: BRIDE_GROOM_ROLES,
      preferPortrait: true,
      usedIds,
      limit: 4,
      excludeHouse: true,
    });
    selected.forEach((media) => {
      if (media.productId) {
        const owner = productsById.get(String(media.productId));
        const eligible =
          side === "bride" ? isBrideWeddingProduct(owner) : isGroomWeddingProduct(owner);
        if (!eligible) return;
      } else if (side === "bride" && categoryId === "sarees") {
        /* A saree plate with no product owner cannot be proved to be wedding wear. */
        return;
      }
      const look = taxonomyLookFromMedia(media, side, categoryId);
      if (look) looks.push(look);
    });
  });
  return looks;
};

const admitLook = (candidate, selected, seenProducts, seenImages, seenGroups, usedIds) => {
  const imageKey = sourcePath(candidate.image).split("?")[0];
  const productKey = candidate.productId ? String(candidate.productId) : null;
  const groupKey = candidate.groupKey ? String(candidate.groupKey) : null;
  if (!imageKey || seenImages.has(imageKey)) return false;
  if (productKey && seenProducts.has(productKey)) return false;
  if (groupKey && seenGroups.has(groupKey)) return false;
  if (candidate.mediaId && usedIds.has(candidate.mediaId) && candidate.ownership !== "product") {
    return false;
  }
  seenImages.add(imageKey);
  if (productKey) seenProducts.add(productKey);
  if (groupKey) seenGroups.add(groupKey);
  if (candidate.mediaId) usedIds.add(candidate.mediaId);
  selected.push(candidate);
  return true;
};

/**
 * Prefer one look from each represented taxonomy before repeating a category,
 * so the Bride plate can show couture, lehenga and saree wedding silhouettes
 * rather than four plates from a single folder.
 */
const takeLooks = (candidates, limit, usedIds, diversifyByCategory = false) => {
  const selected = [];
  const seenProducts = new Set();
  const seenImages = new Set();
  const seenGroups = new Set();
  const admit = (candidate) =>
    admitLook(candidate, selected, seenProducts, seenImages, seenGroups, usedIds);

  if (diversifyByCategory) {
    const firstOfCategory = [];
    const remainder = [];
    const seenCategories = new Set();
    candidates.forEach((candidate) => {
      if (!seenCategories.has(candidate.categoryId)) {
        seenCategories.add(candidate.categoryId);
        firstOfCategory.push(candidate);
      } else {
        remainder.push(candidate);
      }
    });
    [...firstOfCategory, ...remainder].forEach((candidate) => {
      if (selected.length < limit) admit(candidate);
    });
    return selected;
  }

  for (const candidate of candidates) {
    if (selected.length >= limit) break;
    admit(candidate);
  }

  return selected;
};

/**
 * Deterministic Bride & Groom editorial looks.
 *
 *   ACTIVE women's wedding taxonomy (bridal couture, lehengas, sarees)
 *     → PUBLISHED wedding products → exact product media set
 *     → taxonomy-owned editorial plates for the same categories
 *
 *   ACTIVE menswear taxonomy
 *     → PUBLISHED ceremonial products → exact product media set
 *     → taxonomy-owned menswear editorial plates
 *
 * Ownership is checked before a plate is admitted. A bride look can never
 * carry menswear / kids imagery; a groom look can never carry women's
 * imagery. Another product's gallery can never stand in. Selection is
 * stable — a refresh never reshuffles the wedding story.
 */
export const selectBrideGroomLooks = (
  products = getLiveStorefrontProducts(),
  { count = BRIDE_GROOM_LOOK_COUNT, excludeIds = null } = {}
) => {
  const limit = Math.max(0, Number(count) || 0);
  const usedIds = asIdSet(excludeIds);
  const list = products || [];
  const productsById = new Map(list.map((product) => [String(product.id), product]));

  const brideActive = BRIDE_CATEGORY_IDS.some((id) => activeCategory(id));
  const groomActive = GROOM_CATEGORY_IDS.some((id) => activeCategory(id));

  const brideProducts = brideActive
    ? collectProductLooks(list, "bride", isBrideWeddingProduct, usedIds)
    : [];
  const groomProducts = groomActive
    ? collectProductLooks(list, "groom", isGroomWeddingProduct, usedIds)
    : [];

  const bride = takeLooks(brideProducts, limit, usedIds, true);
  const groom = takeLooks(groomProducts, limit, usedIds, true);

  if (bride.length < limit && brideActive) {
    bride.push(
      ...takeLooks(
        collectTaxonomyLooks(BRIDE_CATEGORY_IDS, "bride", productsById, usedIds),
        limit - bride.length,
        usedIds
      )
    );
  }

  if (groom.length < limit && groomActive) {
    groom.push(
      ...takeLooks(
        collectTaxonomyLooks(GROOM_CATEGORY_IDS, "groom", productsById, usedIds),
        limit - groom.length,
        usedIds
      )
    );
  }

  return { bride, groom };
};

/**
 * Category card / listing hero.
 *
 * Fallback chain (Phase 21.8):
 *   1. ACTIVE managed banner                     → DIRECT
 *   2. dedicated CATEGORY_COVER library media     → DIRECT
 *   3. member product library media (same category) → TAXONOMY_PRODUCT
 *   4. related taxonomy library media (any role)  → RELATED_TAXONOMY
 *   5. authored house artwork                      → NO_SOURCE_MEDIA
 *
 * House re-ingested plates never satisfy tiers 2–4, so a category with no
 * real photography falls through to its own authored artwork rather than a
 * mismatched plate.
 */
export const resolveCategoryCover = (category, usedIds = null) => {
  if (!category) return imageRef("hero-atelier");
  if (category.bannerMediaId) {
    const managed = getById(category.bannerMediaId);
    const source = asSource(managed, category.id);
    if (source && managed.status === MEDIA_STATUS.ACTIVE) {
      usedIds?.add(managed.id);
      return withReason(source, FALLBACK_REASONS.DIRECT);
    }
  }
  const selected = selectMedia({
    categoryId: category.id,
    roles: [USAGE_ROLES.CATEGORY_COVER, USAGE_ROLES.EDITORIAL, USAGE_ROLES.HERO],
    preferPortrait: true,
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (selected) return withReason(asSource(selected, category.id), FALLBACK_REASONS.DIRECT);

  const member = bestMemberProductImage(
    getLiveStorefrontProducts().filter((product) => product.category === category.id),
    usedIds
  );
  if (member) return withReason(asSource(member, category.id), FALLBACK_REASONS.TAXONOMY_PRODUCT);

  const related = selectMedia({
    categoryId: category.id,
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (related) return withReason(asSource(related, category.id), FALLBACK_REASONS.RELATED_TAXONOMY);

  return withReason(imageRef(category.image || "hero-atelier"), FALLBACK_REASONS.NO_SOURCE_MEDIA);
};

export const resolveCollectionCover = (collection, usedIds = null) => {
  if (!collection) return imageRef("hero-atelier");
  const heroId = collection.heroMediaId || collection.thumbnailMediaId;
  if (heroId) {
    const managed = getById(heroId);
    const source = asSource(managed, collection.id);
    if (source && managed.status === MEDIA_STATUS.ACTIVE) {
      usedIds?.add(managed.id);
      return withReason(source, FALLBACK_REASONS.DIRECT);
    }
  }
  const selected = selectMedia({
    collectionId: collection.id,
    roles: [USAGE_ROLES.COLLECTION_COVER, USAGE_ROLES.EDITORIAL, USAGE_ROLES.HERO, USAGE_ROLES.CATEGORY_COVER],
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (selected) return withReason(asSource(selected, collection.id), FALLBACK_REASONS.DIRECT);

  const specific = selectMedia({
    collectionId: collection.id,
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (specific) return withReason(asSource(specific, collection.id), FALLBACK_REASONS.RELATED_TAXONOMY);

  const member = bestMemberProductImage(
    getLiveStorefrontProducts().filter((product) => taxonomyRepository.isProductInCollection(product, collection.id)),
    usedIds
  );
  if (member) return withReason(asSource(member, collection.id), FALLBACK_REASONS.TAXONOMY_PRODUCT);

  return withReason(imageRef(collection.image || "hero-atelier"), FALLBACK_REASONS.NO_SOURCE_MEDIA);
};

const HERO_THEMES = {
  festive: {
    roles: [USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK],
    categoryId: "lehengas",
    fallback: "editorial-hero",
  },
  bridal: {
    roles: [USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK],
    categoryId: "lehengas",
    fallback: "lehenga-bridal",
  },
  groom: {
    roles: [USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK],
    categoryId: "menswear",
    fallback: "groom-sherwani",
  },
  heritage: {
    roles: [USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK],
    categoryId: "sarees",
    fallback: "saree-ivory-silk",
  },
  celebration: {
    roles: [USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK],
    categoryId: "bridal-couture",
    fallback: "commerce-hero",
  },
  arrivals: {
    roles: [USAGE_ROLES.NEW_ARRIVAL, USAGE_ROLES.HERO, USAGE_ROLES.EDITORIAL],
    categoryId: "lehengas",
    fallback: "lehenga-wine",
  },
};

export const resolveThemeImage = (theme, usedIds = null) => {
  const config = HERO_THEMES[theme] || HERO_THEMES.festive;
  const selected = selectMedia({
    categoryId: config.categoryId,
    roles: config.roles,
    preferPortrait: true,
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (selected) return withReason(asSource(selected, config.categoryId), FALLBACK_REASONS.DIRECT);
  return withReason(imageRef(config.fallback), FALLBACK_REASONS.HOUSE_FALLBACK);
};

/** The carousel's authored copy themes, paired to HOME_HERO media by index. */
export const HOMEPAGE_HERO_THEMES = [
  "festive",
  "bridal",
  "heritage",
  "celebration",
  "arrivals",
];

const HOMEPAGE_HERO_MAPPING_METHOD = "HOMEPAGE_HERO_REGISTER";

/**
 * The canonical HOME_HERO register, in authored `sortOrder`.
 *
 * Requiring the dedicated placement, HERO usage role and ingestion marker
 * keeps product/category photography (and legacy one-off hero overrides) out
 * of this set. The resolver receives records from `mediaRepository`; no file
 * address is authored in the carousel or in this module.
 */
export const resolveHomepageHeroMedia = (heroMedia = null) => {
  const candidates = Array.isArray(heroMedia)
    ? heroMedia
    : getMarketingMedia(MARKETING_PLACEMENTS.HOME_HERO, { publicOnly: true });

  return candidates
    .filter(isUsable)
    .filter((media) => media.placement === MARKETING_PLACEMENTS.HOME_HERO)
    .filter((media) => (media.usageRoles || []).includes(USAGE_ROLES.HERO))
    .filter((media) => media.mappingMethod === HOMEPAGE_HERO_MAPPING_METHOD)
    .filter((media) => !media.productId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || String(a.id).localeCompare(String(b.id)));
};

/**
 * Safe outage fallback: an ACTIVE, non-product HERO record only. Product,
 * category and AI imagery can never be substituted into the homepage hero.
 */
const resolveSafeHeroFallback = (usedIds = null) => {
  const used = usedIds instanceof Set ? usedIds : new Set(usedIds || []);
  const fallback = getAll()
    .filter(isUsable)
    .filter((media) => !media.productId)
    .filter((media) => (media.usageRoles || []).includes(USAGE_ROLES.HERO))
    .filter((media) => !used.has(media.id))
    .sort((a, b) => compareMedia(a, b, { preferredRoles: [USAGE_ROLES.HERO] }))[0];

  return fallback
    ? withReason(asSource(fallback), FALLBACK_REASONS.HOUSE_FALLBACK)
    : withReason(imageRef("hero-atelier"), FALLBACK_REASONS.HOUSE_FALLBACK);
};

/**
 * Resolve one carousel plate from the canonical HOME_HERO register. Theme is
 * used only to retain the existing copy/slide API; its fixed index determines
 * hero001 → hero005 order. Legacy theme media remains available to editorial
 * sections through `resolveThemeImage`, but is no longer assigned here.
 */
export const resolveHeroSlideImage = (theme, { heroMedia = null, usedIds = null } = {}) => {
  const registered = resolveHomepageHeroMedia(heroMedia);
  const themeIndex = HOMEPAGE_HERO_THEMES.indexOf(theme);
  const index = themeIndex >= 0 ? themeIndex : 0;
  const selected = registered[index];

  if (!selected) return resolveSafeHeroFallback(usedIds);

  usedIds?.add(selected.id);
  const source = asSource(selected);
  const nextHero = registered.find((media, candidateIndex) => candidateIndex !== index && media.id !== selected.id);
  const fallback = asSource(nextHero)?.src || resolveSafeHeroFallback(usedIds)?.src;
  return withReason({ ...source, fallback }, FALLBACK_REASONS.DIRECT);
};

/** Resolve all five homepage plates in their deterministic register order. */
export const resolveHeroSlideImages = (heroMedia = null) => {
  const usedIds = new Set();
  return HOMEPAGE_HERO_THEMES.map((theme) =>
    resolveHeroSlideImage(theme, { heroMedia, usedIds })
  );
};

/**
 * The ids the hero carousel reserves, in slide order. Later homepage sections
 * seed their exclusion set from this so the hero, editorial and category
 * cards do not all show the same photograph at once (Phase 21.5 reuse rule).
 */
export const resolveHeroImageIds = (heroMedia = null) =>
  resolveHeroSlideImages(heroMedia)
    .map((source) => source?.id)
    .filter(Boolean);

export const resolveEditorialFrame = (theme, usedIds = null) => resolveThemeImage(theme, usedIds);

/**
 * Sale / festive campaign backdrop. Placement first, then SALE / BANNER
 * role media, then the house festive plate. Never invents a discount.
 */
export const resolveSaleBackdrop = (festiveMedia = null, usedIds = null) => {
  const override = placementImageSource(festiveMedia);
  if (override) return withReason(override, FALLBACK_REASONS.DIRECT);
  const selected = selectMedia({
    roles: [USAGE_ROLES.SALE, USAGE_ROLES.BANNER, USAGE_ROLES.EDITORIAL],
    categoryId: "lehengas",
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (selected) return withReason(asSource(selected, "lehengas"), FALLBACK_REASONS.DIRECT);
  return withReason(imageRef("lehenga-party"), FALLBACK_REASONS.HOUSE_FALLBACK);
};

/**
 * The Festive Edit campaign's editorial plate.
 *
 * The premium festive band leads with a real library editorial — festive
 * lehenga photography — resolved through the same deterministic `selectMedia`
 * rules as the rest of the homepage (featured → preferred role → quality →
 * stable id order; never random). When no festive library photography can
 * stand, it falls back through the existing sale/offer chain so the section
 * can never render empty. The selected image is always semantically festive
 * (lehenga / saree / bridal), never a texture, kids, jewellery or menswear
 * plate.
 */
export const resolveFestiveCampaignImage = (festiveMedia = null, usedIds = null) => {
  const selected = selectMedia({
    roles: [USAGE_ROLES.SALE, USAGE_ROLES.BANNER, USAGE_ROLES.EDITORIAL],
    categoryId: "lehengas",
    preferPortrait: true,
    usedIds,
    limit: 1,
    excludeHouse: true,
  })[0];
  if (selected) return withReason(asSource(selected, "lehengas"), FALLBACK_REASONS.DIRECT);
  return resolveSaleBackdrop(festiveMedia, usedIds);
};

/**
 * Product cover for any customer surface.
 *
 * Priority (Phase 21.8): the product's own library COVER/PRIMARY media,
 * then its own library gallery media, then its authored plate. An image is
 * only ever taken from the product itself — never from another product.
 */
export const resolveProductCover = (product) => {
  if (!product) return null;
  const images = getProductMedia(product.id, { publicOnly: true, type: MEDIA_TYPES.IMAGE })
    .filter(isUsable)
    .filter((item) => !isHousePlate(item));
  if (images.length) {
    const cover = images.find((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ?? images[0];
    return withReason(
      asSource(cover, product.category),
      cover.role === PRODUCT_MEDIA_ROLES.COVER ? FALLBACK_REASONS.DIRECT : FALLBACK_REASONS.PRODUCT_GALLERY
    );
  }
  const authored = getProductCoverImage(product);
  return authored ? withReason(authored, FALLBACK_REASONS.NO_SOURCE_MEDIA) : null;
};

export const decorateProductWithMedia = (product) => applyProductMediaSet(product);

export const decorateProductsWithMedia = (products = []) =>
  (products || []).map(decorateProductWithMedia);

/**
 * AI Mirror may only receive eligible apparel. This function never
 * loosens `aiMirrorEligibility` — it only refuses jewellery, innerwear
 * and other excluded taxonomy even if a usage role was mis-tagged.
 */
export const isAiMirrorSafeMedia = (media) => {
  if (!media) return false;
  if ((media.usageRoles || []).includes(USAGE_ROLES.AI_MIRROR) === false) return false;
  if (AI_MIRROR_EXCLUDED_CATEGORIES.includes(media.categoryId)) return false;
  if (media.categoryId && !AI_MIRROR_ELIGIBLE_CATEGORIES.includes(media.categoryId)) return false;
  return isUsable(media);
};

export const resolveAiMirrorImage = (product) => {
  if (!product) return null;
  if (AI_MIRROR_EXCLUDED_CATEGORIES.includes(product.category)) return null;
  const cover = getProductCoverImage(product);
  return cover || null;
};

export const resolveAiShoppingImage = (product) => decorateProductWithMedia(product)?.image ?? null;

/** Gallery plates for a product page — the same product-owned set the card uses. */
export const resolveProductGallery = (product) => {
  if (!product?.id) return [];
  return getProductMediaSet(product).gallery;
};

export default {
  FALLBACK_REASONS,
  selectMedia,
  resolveMedia,
  compareMedia,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveThemeImage,
  resolveHomepageHeroMedia,
  resolveHeroSlideImage,
  resolveHeroSlideImages,
  resolveHeroImageIds,
  resolveEditorialFrame,
  resolveSaleBackdrop,
  resolveFestiveCampaignImage,
  resolveProductCover,
  buildProductLibraryIndex,
  productMediaTier,
  rankNewArrivalProducts,
  selectNewArrivalProducts,
  selectSareeEditProducts,
  decorateProductWithMedia,
  decorateProductsWithMedia,
  isAiMirrorSafeMedia,
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveProductGallery,
};
