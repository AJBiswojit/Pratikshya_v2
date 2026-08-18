/**
 * PRATIKSHYA FASHON — Canonical Product Media set.
 *
 * Product cards and product-detail galleries share this one helper.
 * It returns ONLY media that can be proved to belong to the given product.
 *
 * Ownership (strongest first):
 *   1. Explicit media.productId === productId
 *   2. Explicit entry on the product's authored gallery / additionalImages
 *   3. Explicit persisted Product Media claims (already stored as productId)
 *
 * Never selected merely because:
 *   · category / subcategory / taxonomy matches
 *   · filename looks similar
 *   · usage is CATEGORY_COVER or FEATURED
 *   · the file lives in the same folder
 *   · an authored hover image is not explicitly Product-owned
 *
 * Hover is deterministic:
 *   BACK → SIDE → LEFT/RIGHT → DETAIL/CLOSE → other product-owned gallery
 *   If no alternate exists, hover === primary and the card must not swap.
 *
 * The register is indexed once (productId → media set). Card lookup is O(1).
 * Nothing here writes. Nothing here imports React.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · Index is cached against mediaVersion, not recomputed via fingerprint loop.
 *   · Per-product mediaSet cached against mediaVersion and product claims.
 */

import {
  DUPLICATE_STATUS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
} from "../../config/mediaTypes";
import { imageRef } from "../../data/mediaPlaceholder";
import { getAll, getById, getMediaVersion } from "./mediaRepository";
import { getViewOrderScore, parseMediaFilename } from "./mediaNaming";
import { isCanonicalMediaUrl, resolveMediaUrl } from "./mediaPaths";

export const PRODUCT_MEDIA_STATUS = {
  OK: "OK",
  NO_ALTERNATE: "NO_ALTERNATE",
  NEEDS_REVIEW: "NEEDS_REVIEW",
  CROSS_PRODUCT_REFERENCE: "CROSS_PRODUCT_REFERENCE",
};

/** Hover prefers a meaningful other view, not another copy of the front. */
export const HOVER_VIEW_PRIORITY = [
  "back",
  "side",
  "left-side",
  "right-side",
  "left",
  "right",
  "detail",
  "close",
  "closeup",
  "close-up",
  "front-close",
  "front-detail",
  "left-side-detail",
  "right-side-detail",
];

const SIDE_VIEWS = new Set(["side", "left-side", "right-side", "left", "right"]);
const DETAIL_VIEWS = new Set([
  "detail",
  "close",
  "closeup",
  "close-up",
  "front-close",
  "front-detail",
  "left-side-detail",
  "right-side-detail",
]);

const emptySet = (productId) => ({
  productId: productId ? String(productId) : null,
  primary: null,
  front: null,
  side: null,
  back: null,
  detail: null,
  gallery: [],
  hover: null,
  hasAlternate: false,
  groupKey: null,
  source: "none",
  match: "none",
  status: PRODUCT_MEDIA_STATUS.NEEDS_REVIEW,
  items: [],
  /** Phase 22 — media this product claims but does not own (yet). */
  ownershipConflicts: [],
});

const isUrl = (value) =>
  typeof value === "string" &&
  (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));

/** Stable identity for an image source or media record. */
export const mediaIdentity = (entry) => {
  if (!entry) return "";
  if (typeof entry === "string") return entry;
  return String(
    entry.id ||
      entry.fileName ||
      entry.currentFilename ||
      entry.src ||
      entry.url ||
      entry.optimizedPath ||
      ""
  );
};

export const sameMedia = (a, b) => {
  if (!a || !b) return false;
  if (a === b) return true;
  const idA = a.id != null ? String(a.id) : "";
  const idB = b.id != null ? String(b.id) : "";
  if (idA && idB && idA === idB) return true;
  const srcA = a.src || a.url || "";
  const srcB = b.src || b.url || "";
  if (srcA && srcB && srcA === srcB) return true;
  const nameA = (a.fileName || a.currentFilename || "").toLowerCase();
  const nameB = (b.fileName || b.currentFilename || "").toLowerCase();
  return Boolean(nameA && nameB && nameA === nameB);
};

const fileNameOf = (entry) => {
  if (!entry) return null;
  if (typeof entry === "string") {
    if (entry.includes("/")) return entry.split("/").pop() || entry;
    return entry;
  }
  return (
    entry.fileName ||
    entry.currentFilename ||
    (entry.src || entry.url || entry.optimizedPath || "").split("/").pop() ||
    null
  );
};

const parseEntry = (entry) => {
  const fileName = fileNameOf(entry);
  return fileName ? parseMediaFilename(fileName) : null;
};

const viewOf = (entry) => {
  if (!entry) return null;
  if (entry.view) return String(entry.view).toLowerCase();
  return parseEntry(entry)?.view || null;
};

const groupKeyOf = (entry, fallback = null) => {
  if (!entry) return fallback;
  if (entry.groupKey) return entry.groupKey;
  return parseEntry(entry)?.groupKey || fallback;
};

const isUsableImage = (media) =>
  Boolean(
    media &&
      media.type !== MEDIA_TYPES.VIDEO &&
      media.status === MEDIA_STATUS.ACTIVE &&
      (media.url || media.thumbnail || media.src) &&
      !media.broken &&
      media.duplicateStatus !== DUPLICATE_STATUS.DUPLICATE
  );

/**
 * A media record is product-owned only when it carries this product's id.
 * Category, folder, filename prefix and usage role are never enough.
 */
export const isProductOwnedMedia = (media, productId) => {
  if (!media || !productId) return false;
  if (media.productId == null || media.productId === "") return false;
  return String(media.productId) === String(productId);
};

const asImageSource = (media, product) => {
  if (!media) return null;
  if (typeof media === "string") {
    if (isUrl(media)) {
      const src = resolveMediaUrl(media);
      return {
        id: media,
        src,
        alt: product?.name || "",
        category: product?.category || "default",
        productId: product?.id || null,
        fileName: src.split("/").pop() || media,
      };
    }
    const referenced = imageRef(media);
    return referenced
      ? {
          ...referenced,
          src: resolveMediaUrl(referenced.src) || referenced.src,
          productId: product?.id || null,
          fileName: referenced.src ? referenced.src.split("/").pop() : referenced.id,
        }
      : null;
  }
  if (media.src) {
    return {
      ...media,
      src: resolveMediaUrl(media.src) || media.src,
      productId: media.productId || product?.id || null,
      fileName: media.fileName || fileNameOf(media),
    };
  }
  const src = resolveMediaUrl(media.url || media.thumbnail);
  if (!src) return null;
  return {
    id: media.id,
    src,
    alt: media.alt || media.title || product?.name || "",
    category: media.categoryId || media.tags?.[0] || product?.category || "default",
    width: media.width || undefined,
    height: media.height || undefined,
    productId: media.productId || product?.id || null,
    view: viewOf(media),
    groupKey: groupKeyOf(media),
    fileName: fileNameOf(media),
    role: media.role || null,
    fromRepository: media.scope === MEDIA_SCOPES.PRODUCT || Boolean(media.fromRepository),
  };
};

const authoredOwnedPlates = (product) => {
  if (!product) return [];
  const plates = [];
  const seen = new Set();
  const push = (value, metadata = {}) => {
    const source = asImageSource(value, product);
    if (!source?.src) return;
    const key = mediaIdentity(source);
    if (!key || seen.has(key)) return;
    seen.add(key);
    plates.push({
      ...source,
      ...metadata,
      productId: product.id,
      fromRepository: false,
    });
  };

  /* Canonical authored associations carry their role explicitly. The primary
     must not lose to a gallery filename merely because lexical sorting places
     `01` before `primary`. Shared authored hoverImage values are still ignored. */
  push(product.media?.primary || product.image, {
    role: PRODUCT_MEDIA_ROLES.COVER,
    view: "front",
  });

  const gallery = Array.isArray(product.media?.gallery) && product.media.gallery.length
    ? product.media.gallery
    : Array.isArray(product.additionalImages)
      ? product.additionalImages
      : [];
  gallery.forEach((value) => push(value, { role: PRODUCT_MEDIA_ROLES.GALLERY }));

  return plates;
};

const classifyViewBucket = (view) => {
  if (!view) return "other";
  const lower = String(view).toLowerCase();
  if (lower === "front" || (lower.includes("front") && !DETAIL_VIEWS.has(lower) && lower !== "multiple-front")) {
    return "front";
  }
  if (lower === "back" || lower.includes("back")) return "back";
  if (SIDE_VIEWS.has(lower) || lower.includes("side") || lower === "left" || lower === "right") return "side";
  if (DETAIL_VIEWS.has(lower) || lower.includes("close") || lower.includes("detail")) return "detail";
  return "other";
};

const primaryRank = (item) => {
  if (item.role === PRODUCT_MEDIA_ROLES.COVER) return 0;
  const view = viewOf(item);
  if (view === "front") return 1;
  if (classifyViewBucket(view) === "front") return 2;
  const score = item.viewScore ?? getViewOrderScore(view);
  return 10 + score;
};

const pickHover = (owned, primary) => {
  if (!owned.length || !primary) return primary;
  const byView = new Map();
  owned.forEach((item) => {
    const view = viewOf(item);
    if (!view) return;
    if (!byView.has(view)) byView.set(view, item);
  });

  for (const view of HOVER_VIEW_PRIORITY) {
    const candidate = byView.get(view);
    if (candidate && !sameMedia(candidate, primary)) return candidate;
  }

  const other = owned.find((item) => !sameMedia(item, primary));
  return other || primary;
};

const describeSource = (owned) => {
  const fromManagedRepository = owned.some((item) => item.fromRepository);
  const fromCanonicalProduct = owned.some((item) => !item.fromRepository && isCanonicalMediaUrl(item.src));
  const fromOtherAuthoredSource = owned.some(
    (item) => !item.fromRepository && !isCanonicalMediaUrl(item.src)
  );
  const sourceCount = [fromManagedRepository, fromCanonicalProduct, fromOtherAuthoredSource].filter(Boolean).length;
  if (sourceCount > 1) return "mixed";
  if (fromManagedRepository) return "managed";
  if (fromCanonicalProduct) return "canonical";
  if (fromOtherAuthoredSource) return "authored";
  return "none";
};

const describeMatch = (owned) => {
  if (owned.some((item) => item.fromRepository && item.productId)) return "exact";
  if (owned.length) return "gallery";
  return "none";
};

/**
 * Assemble a media set from already-owned items. Exported so tests can
 * feed synthetic front/side/back lists without touching the register.
 *
 * `ownershipConflicts` is carried through so callers can show exactly
 * which media is contested and by whom.
 */
export const assembleProductMediaSet = (
  productId,
  ownedItems = [],
  product = null,
  ownershipConflicts = []
) => {
  const id = productId ? String(productId) : product?.id ? String(product.id) : null;
  if (!id) return emptySet(null);

  const owned = [];
  const seen = new Set();
  let crossed = false;

  (ownedItems || []).forEach((raw) => {
    if (!raw) return;
    if (raw.productId != null && raw.productId !== "" && String(raw.productId) !== id) {
      crossed = true;
      return;
    }
    const source = asImageSource(raw, product ? { ...product, id } : { id });
    if (!source?.src) return;
    const key = mediaIdentity(source);
    if (!key || seen.has(key)) return;
    seen.add(key);
    owned.push({
      ...source,
      productId: id,
      view: viewOf(raw) || source.view,
      groupKey: groupKeyOf(raw, source.groupKey),
      fromRepository: Boolean(raw.fromRepository || raw.scope === MEDIA_SCOPES.PRODUCT),
      role: raw.role || source.role,
      viewScore: raw.viewScore ?? getViewOrderScore(viewOf(raw)),
    });
  });

  if (!owned.length) {
    const blank = emptySet(id);
    blank.ownershipConflicts = ownershipConflicts ?? [];
    if (crossed) blank.status = PRODUCT_MEDIA_STATUS.CROSS_PRODUCT_REFERENCE;
    return blank;
  }

  owned.sort((a, b) => {
    const rank = primaryRank(a) - primaryRank(b);
    if (rank) return rank;
    return mediaIdentity(a).localeCompare(mediaIdentity(b));
  });

  const front =
    owned.find((item) => viewOf(item) === "front") ||
    owned.find((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ||
    null;
  const back = owned.find((item) => viewOf(item) === "back") || null;
  const side =
    owned.find((item) => viewOf(item) === "side") ||
    owned.find((item) => SIDE_VIEWS.has(viewOf(item))) ||
    null;
  const detail = owned.find((item) => DETAIL_VIEWS.has(viewOf(item))) || null;

  const primary =
    owned.find((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ||
    front ||
    owned[0];

  const hover = pickHover(owned, primary);
  const hasAlternate = Boolean(hover && primary && !sameMedia(hover, primary));

  const groupKeys = [...new Set(owned.map((item) => item.groupKey).filter(Boolean))];
  const groupKey = groupKeyOf(primary) || groupKeys[0] || id;

  const source = describeSource(owned);
  const match = describeMatch(owned);

  let status = hasAlternate ? PRODUCT_MEDIA_STATUS.OK : PRODUCT_MEDIA_STATUS.NO_ALTERNATE;
  if (crossed) status = PRODUCT_MEDIA_STATUS.CROSS_PRODUCT_REFERENCE;

  return {
    productId: id,
    primary,
    front: front || (primary && classifyViewBucket(viewOf(primary)) === "front" ? primary : front),
    side,
    back,
    detail,
    gallery: owned,
    hover: hasAlternate ? hover : primary,
    hasAlternate,
    groupKey,
    source,
    match,
    status,
    items: owned,
    ownershipConflicts: ownershipConflicts ?? [],
  };
};

/* ------------------------------------------------------------------ */
/* Cached product-scoped index                                         */
/* ------------------------------------------------------------------ */

let indexCache = {
  version: -1,
  byProductId: null,
};

let mediaSetCache = {
  version: -1,
  map: new Map(), // productId -> { claimsKey, set }
};

const buildIndex = (items) => {
  const byProductId = new Map();
  (items || []).forEach((item) => {
    if (!item?.productId) return;
    if (item.scope && item.scope !== MEDIA_SCOPES.PRODUCT) return;
    if (!isUsableImage(item)) return;
    const key = String(item.productId);
    if (!byProductId.has(key)) byProductId.set(key, []);
    byProductId.get(key).push(item);
  });
  return byProductId;
};

/** One pass over the register. Safe to call from every card — cached. */
export const getProductMediaIndex = () => {
  const version = getMediaVersion();
  if (indexCache.byProductId && indexCache.version === version) {
    return indexCache.byProductId;
  }
  const items = getAll();
  const byProductId = buildIndex(items);
  indexCache = { version, byProductId };
  // Invalidate mediaSet cache when index version changes
  if (mediaSetCache.version !== version) {
    mediaSetCache = { version, map: new Map() };
  }
  return byProductId;
};

/**
 * Canonical helper. `product` is optional but required for authored
 * fallback — the register alone cannot invent an owned plate.
 *
 * Accepts either a product id or a product record as the first argument.
 */
export const getProductMediaSet = (productIdOrProduct, productHint = null) => {
  const product =
    productIdOrProduct && typeof productIdOrProduct === "object"
      ? productIdOrProduct
      : productHint;
  const productId =
    product?.id ??
    (productIdOrProduct && typeof productIdOrProduct !== "object" ? productIdOrProduct : null);

  if (!productId) return emptySet(null);

  const id = String(productId);
  const mediaVersion = getMediaVersion();

  // Build claims fingerprint for per-product cache
  const claimsKey = product
    ? [
        (product.mediaIds || []).join(","),
        product.primaryMediaId || "",
        (product.galleryMediaIds || []).join(","),
        product.media?.primary || "",
        (product.media?.gallery || []).join(","),
        product.image
          ? typeof product.image === "string"
            ? product.image
            : product.image.id || product.image.src || ""
          : "",
        (product.additionalImages || []).map(mediaIdentity).join(","),
      ].join("|")
    : "no-product";

  const cached = mediaSetCache.map.get(id);
  if (cached && cached.version === mediaVersion && cached.claimsKey === claimsKey) {
    return cached.set;
  }

  const index = getProductMediaIndex();
  const registered = index.get(id) || [];

  const owned = [];
  for (let i = 0; i < registered.length; i += 1) {
    const item = registered[i];
    if (!isProductOwnedMedia(item, id)) continue;
    owned.push({
      ...item,
      fromRepository: true,
      view: viewOf(item),
      groupKey: groupKeyOf(item),
    });
  }

  /* Phase 23.2 — authored plates are a FALLBACK, never a gallery peer. */
  if (owned.length === 0) {
    const fallbackPlates = authoredOwnedPlates(product);
    for (let i = 0; i < fallbackPlates.length; i += 1) {
      const plate = fallbackPlates[i];
      let exists = false;
      for (let j = 0; j < owned.length; j += 1) if (sameMedia(owned[j], plate)) { exists = true; break; }
      if (!exists) owned.push(plate);
    }
  }

  /* Phase 22 — the record's own media claims */
  const { claims, conflicts } = resolveProductMediaClaims(product, id);
  for (let i = 0; i < claims.length; i += 1) {
    const item = claims[i];
    let exists = false;
    for (let j = 0; j < owned.length; j += 1) if (sameMedia(owned[j], item)) { exists = true; break; }
    if (!exists) owned.push(item);
  }

  const assembled = assembleProductMediaSet(id, owned, product, conflicts);
  mediaSetCache.map.set(id, { version: mediaVersion, claimsKey, set: assembled });
  return assembled;
};

/**
 * Card-facing decoration: primary + hover, never a cross-product plate.
 * When there is no alternate, hoverImage is omitted so the frame stays still.
 */
export const getProductCardMedia = (product) => {
  const set = getProductMediaSet(product);
  const primary = set.primary || product?.image || null;
  return {
    image: primary,
    hoverImage: set.hasAlternate ? set.hover : undefined,
    mediaSet: set,
  };
};

/**
 * Phase 22 — resolve a product's OWN media claims (mediaIds /
 * primaryMediaId / galleryMediaIds on the record).
 */
export const resolveProductMediaClaims = (product, productId) => {
  const claims = [];
  const conflicts = [];
  if (!product) return { claims, conflicts };

  const id = productId ? String(productId) : product?.id ? String(product.id) : null;
  const claimIds = new Set();
  (Array.isArray(product.mediaIds) ? product.mediaIds : []).forEach((entry) => {
    if (entry) claimIds.add(String(entry));
  });
  if (product.primaryMediaId) claimIds.add(String(product.primaryMediaId));
  (Array.isArray(product.galleryMediaIds) ? product.galleryMediaIds : []).forEach((entry) => {
    if (entry) claimIds.add(String(entry));
  });

  claimIds.forEach((mediaId) => {
    const record = getById(mediaId);
    if (!record) {
      conflicts.push({
        mediaId,
        file: mediaId,
        src: null,
        ownerProductId: null,
        reason: "MEDIA_NOT_FOUND",
      });
      return;
    }
    const source = asImageSource(record, id ? { ...product, id } : product);
    if (!source?.src) {
      conflicts.push({
        mediaId: record.id,
        file: fileNameOf(record) || record.id,
        src: null,
        ownerProductId: record.productId || null,
        reason: "MEDIA_MISSING_FILE",
      });
      return;
    }
    const owner = record.productId;
    if (owner && String(owner) !== id) {
      conflicts.push({
        mediaId: record.id,
        file: fileNameOf(record) || record.id,
        src: source.src,
        ownerProductId: owner,
        reason: "MEDIA_ALREADY_ASSIGNED",
      });
      return;
    }
    claims.push({
      ...source,
      productId: id,
      view: viewOf(record),
      groupKey: groupKeyOf(record),
      fromRepository: false,
      claimed: true,
      role: record.role || null,
    });
  });

  return { claims, conflicts };
};

/** Apply the canonical set onto a product row (image + hoverImage + images). */
export const applyProductMediaSet = (product) => {
  if (!product) return product;
  const set = getProductMediaSet(product);
  const primary = set.primary || product.image || null;
  return {
    ...product,
    image: primary,
    hoverImage: set.hasAlternate ? set.hover : undefined,
    images: set.gallery.length ? set.gallery : primary ? [primary] : [],
    mediaSet: set,
  };
};

export default {
  getProductMediaSet,
  getProductCardMedia,
  applyProductMediaSet,
  getProductMediaIndex,
  assembleProductMediaSet,
  isProductOwnedMedia,
  resolveProductMediaClaims,
  HOVER_VIEW_PRIORITY,
  PRODUCT_MEDIA_STATUS,
};
