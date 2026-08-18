/**
 * PRATIKSHYA FASHON — Media repository.
 *
 * The one door to product and marketing media. Admin pages, the product
 * gallery, the landing page and the metrics tiles all read through this
 * module; none of them touch storage, and none of them keep a media list of
 * their own. That is what keeps media logic in one place.
 *
 * Every mutating method returns the record it acted on (or `null`), writes
 * through `mediaStore` and lets the store announce the change. Callers
 * re-read rather than patching their own copy.
 *
 * Ordering rules enforced here, not in the UI:
 *   · a product has at most one COVER, and promoting one demotes the other
 *   · `sortOrder` is always a dense 0..n-1 sequence per product
 *   · marketing records order within their placement
 *
 * PERFORMANCE OPTIMIZATION:
 *   · readMedia result is cached with version counter.
 *   · Indexes by productId and by Id for O(1) lookups.
 *   · Sorted all array cached.
 *   · Summaries cached.
 */

import {
  DUPLICATE_STATUS,
  MAPPING_STATUS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  defaultRoleForType,
  isLivePlacement,
} from "../../config/mediaTypes";
import {
  MEDIA_CHANGED_EVENT,
  MEDIA_STORAGE_KEY,
  clearMediaMemory,
  createMediaId,
  isEphemeralUrl,
  normaliseMedia,
  readMedia as readMediaRaw,
  writeMedia as writeMediaRaw,
} from "./mediaStore";

export { MEDIA_CHANGED_EVENT, MEDIA_STORAGE_KEY, isEphemeralUrl };

const nowIso = () => new Date().toISOString();

/** Newest first — the order the library reads best in. */
const byRecency = (a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0);

/** Cover first, then authored order, then recency as a tie-break. */
const byDisplayOrder = (a, b) => {
  const coverA = a.role === PRODUCT_MEDIA_ROLES.COVER ? 0 : 1;
  const coverB = b.role === PRODUCT_MEDIA_ROLES.COVER ? 0 : 1;
  if (coverA !== coverB) return coverA - coverB;
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return byRecency(a, b);
};

/** Rewrites `sortOrder` as 0..n-1 in the given order. */
const resequence = (items) =>
  items.map((item, index) => (item.sortOrder === index ? item : { ...item, sortOrder: index }));

/* ------------------------------------------------------------------ */
/* Caching layer                                                       */
/* ------------------------------------------------------------------ */

let mediaVersion = 0;
let cachedAll = null;
let cachedSorted = null;
let cachedById = null;
let cachedByProduct = null;
let cachedSummary = new Map();
let lastRawRef = null;

const ensureCache = () => {
  const raw = readMediaRaw();
  if (cachedAll && lastRawRef === raw && cachedById) {
    return;
  }
  lastRawRef = raw;
  cachedAll = raw;
  cachedSorted = raw.slice().sort(byRecency);
  const byId = new Map();
  const byProduct = new Map();
  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i];
    byId.set(String(item.id), item);
    const pid = item.productId ? String(item.productId) : null;
    if (!pid) continue;
    if (!byProduct.has(pid)) byProduct.set(pid, []);
    byProduct.get(pid).push(item);
  }
  for (const [pid, arr] of byProduct) {
    byProduct.set(pid, arr.slice().sort(byDisplayOrder));
  }
  cachedById = byId;
  cachedByProduct = byProduct;
  cachedSummary = new Map();
  if (mediaVersion === 0) mediaVersion = 1;
};

const readMedia = () => {
  ensureCache();
  return cachedAll;
};

const writeMedia = (items) => {
  const result = writeMediaRaw(items);
  // Invalidate our layer caches so next ensureCache rebuilds, and bump version immediately
  // so downstream caches (productMediaSet index) invalidate even before ensureCache rebuild
  mediaVersion += 1;
  lastRawRef = null;
  cachedAll = null;
  cachedSorted = null;
  cachedById = null;
  cachedByProduct = null;
  cachedSummary = new Map();
  return result;
};

export const getMediaVersion = () => mediaVersion;
export const getMediaFingerprint = () => `${mediaVersion}:${cachedAll ? cachedAll.length : 0}`;

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/** Every media record, newest first. */
export const getAll = () => {
  ensureCache();
  return cachedSorted ? cachedSorted.slice() : [];
};

export const getById = (mediaId) => {
  if (!mediaId) return null;
  ensureCache();
  return cachedById.get(String(mediaId)) ?? null;
};

/**
 * All media attached to a product, in display order.
 *
 * `options.publicOnly` narrows to what a customer may see — the storefront
 * always passes it, the Admin Portal never does.
 */
export const getProductMedia = (productId, options = {}) => {
  if (!productId) return [];
  const { publicOnly = false, type = null } = options;
  ensureCache();
  const bucket = cachedByProduct.get(String(productId));
  let items = bucket ? bucket.slice() : [];
  // If bucket doesn't exist, fallback to scanning? No, bucket is exhaustive for product scope
  // But need to filter scope already (bucket only contains productId entries which are product scope)
  // Still filter publicOnly/type
  if (publicOnly) {
    items = items.filter((item) => item.status === MEDIA_STATUS.ACTIVE && Boolean(item.url));
  }
  if (type) {
    items = items.filter((item) => item.type === type);
  }
  // Already sorted by display order, but if filtered publicOnly we keep order
  return items;
};

/**
 * Marketing media, optionally for one placement.
 *
 * `options.publicOnly` restricts to ACTIVE records on placements the
 * storefront actually reads, which is exactly what the landing page wants.
 */
export const getMarketingMedia = (placement = null, options = {}) => {
  const { publicOnly = false, status = null } = options;
  ensureCache();
  let items = cachedAll.filter((item) => item.scope === MEDIA_SCOPES.MARKETING);
  if (placement) items = items.filter((item) => item.placement === placement);
  if (status) items = items.filter((item) => item.status === status);
  if (publicOnly) {
    items = items.filter(
      (item) => item.status === MEDIA_STATUS.ACTIVE && Boolean(item.url) && isLivePlacement(item.placement)
    );
  }
  return items.slice().sort((a, b) => a.sortOrder - b.sortOrder || byRecency(a, b));
};

/** Managed media that has not been given a scope yet. */
export const getUnassignedMedia = () => {
  ensureCache();
  return cachedAll.filter((item) => item.scope === MEDIA_SCOPES.UNASSIGNED).sort(byRecency);
};

/** Media awaiting manager / admin approval. */
export const getPendingReview = () => {
  ensureCache();
  return cachedAll.filter((item) => item.status === MEDIA_STATUS.PENDING_REVIEW).sort(byRecency);
};

/** Media submitted by a specific employee. */
export const getByEmployee = (employeeId) => {
  if (!employeeId) return [];
  ensureCache();
  return cachedAll.filter((item) => item.uploadedByEmployeeId === employeeId).sort(byRecency);
};

/** Assets that could not be confidently mapped to taxonomy or a product. */
export const getUnmappedMedia = () => {
  ensureCache();
  return cachedAll.filter((item) => item.mappingStatus === MAPPING_STATUS.UNMAPPED).sort(byRecency);
};

/** Exact or possible duplicates — never auto-deleted. */
export const getDuplicateMedia = () => {
  ensureCache();
  return cachedAll
    .filter(
      (item) =>
        item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE ||
        item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE
    )
    .sort(byRecency);
};

/** Unmapped, duplicate, or explicitly flagged for review. */
export const getNeedsReviewMedia = () => {
  ensureCache();
  return cachedAll
    .filter(
      (item) =>
        item.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
        item.mappingStatus === MAPPING_STATUS.UNMAPPED ||
        item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE ||
        item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE ||
        item.broken ||
        item.lowResolution
    )
    .sort(byRecency);
};

/** Active media for one taxonomy category. */
export const getMediaByCategory = (categoryId, options = {}) => {
  if (!categoryId) return [];
  const { publicOnly = false } = options;
  ensureCache();
  let items = cachedAll.filter((item) => item.categoryId === categoryId);
  if (publicOnly) items = items.filter((item) => item.status === MEDIA_STATUS.ACTIVE && Boolean(item.url));
  return items.sort(byRecency);
};

/** Active media carrying a usage role. */
export const getMediaByUsageRole = (role, options = {}) => {
  if (!role) return [];
  const { publicOnly = false, categoryId = null } = options;
  ensureCache();
  let items = cachedAll.filter((item) => (item.usageRoles || []).includes(role));
  if (categoryId) items = items.filter((item) => item.categoryId === categoryId);
  if (publicOnly) items = items.filter((item) => item.status === MEDIA_STATUS.ACTIVE && Boolean(item.url));
  return items.sort(byRecency);
};

/** The cover a product page and every product card should use. */
export const getProductCover = (productId) =>
  getProductMedia(productId, { publicOnly: true }).find(
    (item) => item.role === PRODUCT_MEDIA_ROLES.COVER && item.type === MEDIA_TYPES.IMAGE
  ) ?? null;

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Adds a record.
 *
 * A blob or data URL is refused as a production address: the record is kept
 * as metadata and flagged `demoPlaceholder`, so a demo upload never leaves a
 * dead link behind once the tab closes.
 */
export const create = (draft = {}) => {
  ensureCache();
  const items = cachedAll;
  const timestamp = nowIso();
  const ephemeral = isEphemeralUrl(draft.url);

  const type = draft.type === MEDIA_TYPES.VIDEO ? MEDIA_TYPES.VIDEO : MEDIA_TYPES.IMAGE;
  const productId = draft.productId ?? null;

  const sortOrder = Number.isFinite(Number(draft.sortOrder))
    ? Number(draft.sortOrder)
    : productId
      ? getProductMedia(productId).length
      : draft.placement
        ? getMarketingMedia(draft.placement).length
        : 0;

  const record = normaliseMedia({
    ...draft,
    id: draft.id && !items.some((item) => item.id === draft.id) ? draft.id : createMediaId(),
    type,
    url: ephemeral ? (draft.sampleUrl || "") : (draft.url || draft.sampleUrl || ""),
    poster: isEphemeralUrl(draft.poster) ? (draft.samplePoster || "") : (draft.poster || draft.samplePoster || ""),
    thumbnail: isEphemeralUrl(draft.thumbnail) ? (draft.sampleThumbnail || "") : (draft.thumbnail || draft.sampleThumbnail || ""),
    role: productId ? (draft.role ?? defaultRoleForType(type)) : null,
    status: draft.status || MEDIA_STATUS.DRAFT,
    uploadedBy: draft.uploadedBy || null,
    uploadedByEmployeeId: draft.uploadedByEmployeeId || null,
    uploadedByType: draft.uploadedByType || "ADMIN",
    sortOrder,
    demoPlaceholder: ephemeral || Boolean(draft.demoPlaceholder),
    createdAt: timestamp,
    updatedAt: timestamp,
  });

  if (!record) return null;

  /* A product's first image becomes its cover unless one already exists. */
  if (record.scope === MEDIA_SCOPES.PRODUCT && record.type === MEDIA_TYPES.IMAGE) {
    const hasCover = items.some(
      (item) =>
        item.productId === record.productId && item.role === PRODUCT_MEDIA_ROLES.COVER
    );
    if (!hasCover) record.role = PRODUCT_MEDIA_ROLES.COVER;
  }

  /* Only one cover may stand. */
  const next =
    record.role === PRODUCT_MEDIA_ROLES.COVER
      ? items.map((item) =>
          item.productId === record.productId && item.role === PRODUCT_MEDIA_ROLES.COVER
            ? { ...item, role: PRODUCT_MEDIA_ROLES.GALLERY, updatedAt: timestamp }
            : item
        )
      : items;

  writeMedia([...next, record]);
  return record;
};

/** Adds several records in one write, returning those that were created. */
export const createMany = (drafts = []) =>
  (Array.isArray(drafts) ? drafts : []).map((draft) => create(draft)).filter(Boolean);

/**
 * Applies a partial change.
 *
 * Identity, scope and creation time are not editable through this door —
 * assignment goes through `assignToProduct` / `assignToPlacement`, and the
 * cover goes through `setCover`, so the invariants stay in one place.
 */
export const update = (mediaId, changes = {}) => {
  ensureCache();
  const items = cachedAll;
  const current = cachedById.get(String(mediaId));
  if (!current) return null;

  const { id: _id, scope: _scope, createdAt: _createdAt, ...editable } = changes;

  const merged = normaliseMedia({
    ...current,
    ...editable,
    url: isEphemeralUrl(editable.url) ? current.url : (editable.url ?? current.url),
    id: current.id,
    scope: current.scope,
    productId: current.productId,
    placement: current.placement,
    createdAt: current.createdAt,
    updatedAt: nowIso(),
  });
  if (!merged) return null;

  /* A role change to COVER still has to demote the incumbent. */
  const promoting =
    merged.role === PRODUCT_MEDIA_ROLES.COVER && current.role !== PRODUCT_MEDIA_ROLES.COVER;

  writeMedia(
    items.map((item) => {
      if (item.id === merged.id) return merged;
      if (
        promoting &&
        item.productId === merged.productId &&
        item.role === PRODUCT_MEDIA_ROLES.COVER
      ) {
        return { ...item, role: PRODUCT_MEDIA_ROLES.GALLERY, updatedAt: merged.updatedAt };
      }
      return item;
    })
  );
  return merged;
};

/** Sets status. Kept separate so activate/archive read clearly at the call site. */
export const setStatus = (mediaId, status) =>
  Object.values(MEDIA_STATUS).includes(status) ? update(mediaId, { status }) : null;

export const activate = (mediaId) => setStatus(mediaId, MEDIA_STATUS.ACTIVE);
export const archive = (mediaId) => setStatus(mediaId, MEDIA_STATUS.ARCHIVED);

/**
 * Approves a pending media asset, making it ACTIVE.
 */
export const approve = (mediaId, reviewerInfo = {}) => {
  const reviewer =
    typeof reviewerInfo === "string"
      ? reviewerInfo
      : reviewerInfo.actorName || reviewerInfo.name || reviewerInfo.employeeId || "Administrator";

  return update(mediaId, {
    status: MEDIA_STATUS.ACTIVE,
    reviewStatus: "APPROVED",
    reviewedBy: reviewer,
    reviewedAt: nowIso(),
    rejectionReason: null,
  });
};

/**
 * Rejects a pending media asset, with optional rejection reason.
 */
export const reject = (mediaId, reason = "", reviewerInfo = {}) => {
  const reviewer =
    typeof reviewerInfo === "string"
      ? reviewerInfo
      : reviewerInfo.actorName || reviewerInfo.name || reviewerInfo.employeeId || "Administrator";

  return update(mediaId, {
    status: MEDIA_STATUS.REJECTED,
    reviewStatus: "REJECTED",
    rejectionReason: reason || "Asset does not meet quality or catalogue standards.",
    reviewedBy: reviewer,
    reviewedAt: nowIso(),
  });
};

export const approveMany = (mediaIds = [], reviewerInfo = {}) =>
  (Array.isArray(mediaIds) ? mediaIds : []).map((id) => approve(id, reviewerInfo)).filter(Boolean);

export const rejectMany = (mediaIds = [], reason = "", reviewerInfo = {}) =>
  (Array.isArray(mediaIds) ? mediaIds : [])
    .map((id) => reject(id, reason, reviewerInfo))
    .filter(Boolean);

/**
 * Deletes a record.
 *
 * Removing a cover promotes the next image in order, so a product that has
 * media never sits without a cover by accident.
 */
export const remove = (mediaId) => {
  ensureCache();
  const items = cachedAll;
  const target = cachedById.get(String(mediaId));
  if (!target) return null;

  let survivors = items.filter((item) => item.id !== mediaId);

  if (target.scope === MEDIA_SCOPES.PRODUCT) {
    const siblings = survivors
      .filter((item) => item.productId === target.productId)
      .sort(byDisplayOrder);

    if (target.role === PRODUCT_MEDIA_ROLES.COVER) {
      const heir = siblings.find((item) => item.type === MEDIA_TYPES.IMAGE);
      if (heir) {
        survivors = survivors.map((item) =>
          item.id === heir.id
            ? { ...item, role: PRODUCT_MEDIA_ROLES.COVER, updatedAt: nowIso() }
            : item
        );
      }
    }

    const ordered = resequence(
      survivors.filter((item) => item.productId === target.productId).sort(byDisplayOrder)
    );
    const orderedById = new Map(ordered.map((item) => [item.id, item]));
    survivors = survivors.map((item) => orderedById.get(item.id) ?? item);
  }

  writeMedia(survivors);
  return target;
};

/** Deletes several records in one pass, returning those actually removed. */
export const removeMany = (mediaIds = []) =>
  (Array.isArray(mediaIds) ? mediaIds : []).map((id) => remove(id)).filter(Boolean);

/**
 * Re-orders a product's media.
 *
 * `orderedIds` is the new sequence; anything omitted keeps its relative
 * position after the listed records, so a partial list is safe.
 */
export const reorder = (productId, orderedIds = []) => {
  if (!productId) return [];
  ensureCache();
  const items = cachedAll;
  const owned = cachedByProduct.get(String(productId)) || [];
  if (!owned.length) return [];

  const byId = new Map(owned.map((item) => [item.id, item]));
  const sequence = [];
  orderedIds.forEach((id) => {
    const found = byId.get(id);
    if (found && !sequence.includes(found)) sequence.push(found);
  });
  owned
    .filter((item) => !sequence.includes(item))
    .sort(byDisplayOrder)
    .forEach((item) => sequence.push(item));

  /* The cover always leads, whatever sequence was asked for, so the stored
     `sortOrder` matches the order the product page will actually render. */
  const coverIndex = sequence.findIndex((item) => item.role === PRODUCT_MEDIA_ROLES.COVER);
  if (coverIndex > 0) sequence.unshift(...sequence.splice(coverIndex, 1));

  const timestamp = nowIso();
  const ordered = resequence(sequence).map((item) => ({ ...item, updatedAt: timestamp }));
  const orderedById = new Map(ordered.map((item) => [item.id, item]));

  writeMedia(items.map((item) => orderedById.get(item.id) ?? item));
  return ordered;
};

/**
 * Moves one record one step within its product's order.
 *
 * The cover holds the first slot by definition, so nothing may be moved
 * above it and it cannot itself be moved down — use `setCover` to change
 * which image leads.
 */
export const moveWithinProduct = (productId, mediaId, direction) => {
  const items = getProductMedia(productId);
  const current = items.map((item) => item.id);
  const index = current.indexOf(mediaId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= current.length) return items;
  if (items[index].role === PRODUCT_MEDIA_ROLES.COVER) return items;
  if (items[target].role === PRODUCT_MEDIA_ROLES.COVER) return items;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return reorder(productId, next);
};

/**
 * Promotes one image to cover, demoting whichever image held the role.
 * Videos cannot be a cover: every card surface expects a still plate.
 */
export const setCover = (productId, mediaId) => {
  ensureCache();
  const items = cachedAll;
  const target = cachedById.get(String(mediaId));
  if (!target || String(target.productId) !== String(productId) || target.type !== MEDIA_TYPES.IMAGE) return null;

  const timestamp = nowIso();
  const promoted = { ...target, role: PRODUCT_MEDIA_ROLES.COVER, updatedAt: timestamp };

  const swapped = items.map((item) => {
    if (item.id === mediaId) return promoted;
    if (String(item.productId) === String(productId) && item.role === PRODUCT_MEDIA_ROLES.COVER) {
      return { ...item, role: PRODUCT_MEDIA_ROLES.GALLERY, updatedAt: timestamp };
    }
    return item;
  });

  /* The new cover has moved to the front of the display order, so the
     stored sequence is rewritten to match what the page will render. */
  const ordered = resequence(
    swapped.filter((item) => String(item.productId) === String(productId)).sort(byDisplayOrder)
  );
  const orderedById = new Map(ordered.map((item) => [item.id, item]));

  writeMedia(swapped.map((item) => orderedById.get(item.id) ?? item));
  return orderedById.get(mediaId) ?? promoted;
};

/**
 * Phase 22 — who owns a media asset right now, if anyone.
 * Ownership is the register's productId; the product name is resolved by
 * callers that can see the catalogue (the repository itself stays free of
 * product knowledge).
 */
export const getMediaOwner = (mediaId) => {
  ensureCache();
  const current = cachedById.get(String(mediaId));
  if (!current?.productId) return null;
  return { mediaId, productId: current.productId };
};

/**
 * Attaches media to a product — or detaches it when `productId` is null,
 * which returns the record to the unassigned library.
 *
 * Phase 22 — deterministic ownership validation. A media asset belongs to
 * ONE product. Assigning an asset that already belongs to a DIFFERENT
 * product is refused (returns null — "MEDIA ALREADY ASSIGNED") unless the
 * caller explicitly confirms the reassignment with
 * `{ confirmReassign: true }`. Media is never silently reassigned.
 */
export const assignToProduct = (mediaId, productId, role = null, options = {}) => {
  ensureCache();
  const items = cachedAll;
  const current = cachedById.get(String(mediaId));
  if (!current) return null;

  const confirmReassign = Boolean(options?.confirmReassign);
  if (
    productId &&
    current.productId &&
    String(current.productId) !== String(productId) &&
    !confirmReassign
  ) {
    return null;
  }

  const timestamp = nowIso();

  if (!productId) {
    const detached = normaliseMedia({
      ...current,
      scope: MEDIA_SCOPES.UNASSIGNED,
      productId: null,
      role: null,
      sortOrder: 0,
      updatedAt: timestamp,
    });
    writeMedia(items.map((item) => (item.id === mediaId ? detached : item)));
    return detached;
  }

  const siblings = (cachedByProduct.get(String(productId)) || []).filter((item) => item.id !== mediaId);
  const hasCover = siblings.some((item) => item.role === PRODUCT_MEDIA_ROLES.COVER);
  const nextRole =
    role ??
    (!hasCover && current.type === MEDIA_TYPES.IMAGE
      ? PRODUCT_MEDIA_ROLES.COVER
      : defaultRoleForType(current.type));

  const attached = normaliseMedia({
    ...current,
    scope: MEDIA_SCOPES.PRODUCT,
    productId,
    placement: null,
    campaign: null,
    role: nextRole,
    sortOrder: siblings.length,
    updatedAt: timestamp,
  });

  writeMedia(
    items.map((item) => {
      if (item.id === mediaId) return attached;
      if (
        nextRole === PRODUCT_MEDIA_ROLES.COVER &&
        String(item.productId) === String(productId) &&
        item.role === PRODUCT_MEDIA_ROLES.COVER
      ) {
        return { ...item, role: PRODUCT_MEDIA_ROLES.GALLERY, updatedAt: timestamp };
      }
      return item;
    })
  );
  return attached;
};

/**
 * Assigns media to a marketing placement — or clears it when `placement`
 * is null, returning the record to the unassigned library.
 */
export const assignToPlacement = (mediaId, placement, meta = {}) => {
  ensureCache();
  const items = cachedAll;
  const current = cachedById.get(String(mediaId));
  if (!current) return null;

  const timestamp = nowIso();

  const next = normaliseMedia(
    placement
      ? {
          ...current,
          scope: MEDIA_SCOPES.MARKETING,
          placement,
          productId: null,
          role: null,
          campaign: meta.campaign ?? current.campaign,
          campaignStart: meta.campaignStart ?? current.campaignStart,
          campaignEnd: meta.campaignEnd ?? current.campaignEnd,
          section: meta.section ?? current.section,
          sortOrder: getMarketingMedia(placement).filter((item) => item.id !== mediaId).length,
          updatedAt: timestamp,
        }
      : {
          ...current,
          scope: MEDIA_SCOPES.UNASSIGNED,
          placement: null,
          sortOrder: 0,
          updatedAt: timestamp,
        }
  );

  writeMedia(items.map((item) => (item.id === mediaId ? next : item)));
  return next;
};

/* ------------------------------------------------------------------ */
/* Summaries                                                           */
/* ------------------------------------------------------------------ */

/** Counts for one product — what the manager header and the tiles show. */
export const getProductMediaSummary = (productId) => {
  if (!productId) return { total: 0, images: 0, videos: 0, active: 0, cover: null, hasCover: false, needsCover: false, isEmpty: true };
  ensureCache();
  const key = String(productId);
  if (cachedSummary.has(key)) return cachedSummary.get(key);
  const items = cachedByProduct.get(key) || [];
  const images = items.filter((item) => item.type === MEDIA_TYPES.IMAGE);
  const videos = items.filter((item) => item.type === MEDIA_TYPES.VIDEO);
  const cover = items.find((item) => item.role === PRODUCT_MEDIA_ROLES.COVER) ?? null;
  const summary = {
    total: items.length,
    images: images.length,
    videos: videos.length,
    active: items.filter((item) => item.status === MEDIA_STATUS.ACTIVE).length,
    cover,
    hasCover: Boolean(cover),
    needsCover: items.length > 0 && !cover,
    isEmpty: items.length === 0,
  };
  cachedSummary.set(key, summary);
  return summary;
};

/** Library-wide figures for the media dashboard tiles. */
export const getMediaMetrics = () => {
  ensureCache();
  const items = cachedAll;
  const marketing = items.filter((item) => item.scope === MEDIA_SCOPES.MARKETING);
  const product = items.filter((item) => item.scope === MEDIA_SCOPES.PRODUCT);

  const productIds = [...new Set(product.map((item) => item.productId))];
  const needsCover = productIds.filter(
    (id) => !product.some((item) => String(item.productId) === String(id) && item.role === PRODUCT_MEDIA_ROLES.COVER)
  );

  return {
    total: items.length,
    images: items.filter((item) => item.type === MEDIA_TYPES.IMAGE).length,
    videos: items.filter((item) => item.type === MEDIA_TYPES.VIDEO).length,
    productMedia: product.length,
    marketingMedia: marketing.length,
    unassigned: items.filter((item) => item.scope === MEDIA_SCOPES.UNASSIGNED).length,
    pendingReview: items.filter((item) => item.status === MEDIA_STATUS.PENDING_REVIEW).length,
    active: items.filter((item) => item.status === MEDIA_STATUS.ACTIVE).length,
    rejected: items.filter((item) => item.status === MEDIA_STATUS.REJECTED).length,
    draft: items.filter((item) => item.status === MEDIA_STATUS.DRAFT).length,
    archived: items.filter((item) => item.status === MEDIA_STATUS.ARCHIVED).length,
    activeMarketing: marketing.filter((item) => item.status === MEDIA_STATUS.ACTIVE).length,
    productsWithMedia: productIds.length,
    productsNeedingCover: needsCover.length,
    unmapped: items.filter((item) => item.mappingStatus === MAPPING_STATUS.UNMAPPED).length,
    needsReview: items.filter(
      (item) =>
        item.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
        item.mappingStatus === MAPPING_STATUS.UNMAPPED
    ).length,
    duplicates: items.filter(
      (item) =>
        item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE ||
        item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE
    ).length,
    large: items.filter((item) => item.large).length,
    optimized: items.filter((item) => item.optimizedPath).length,
    lowResolution: items.filter((item) => item.lowResolution).length,
    broken: items.filter((item) => item.broken).length,
  };
};

/** Clears persisted managed media and restores the authored seed (currently empty). */
export const resetMedia = () => {
  clearMediaMemory();
  lastRawRef = null;
  cachedAll = null;
  cachedSorted = null;
  cachedById = null;
  cachedByProduct = null;
  cachedSummary = new Map();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MEDIA_STORAGE_KEY);
    } catch {
      /* Storage unavailable — the seeded register is returned regardless. */
    }
    window.dispatchEvent(new Event(MEDIA_CHANGED_EVENT));
  }
  return readMedia();
};

const mediaRepository = {
  getAll,
  getById,
  getMediaOwner,
  getProductMedia,
  getMarketingMedia,
  getUnassignedMedia,
  getPendingReview,
  getByEmployee,
  getUnmappedMedia,
  getDuplicateMedia,
  getNeedsReviewMedia,
  getMediaByCategory,
  getMediaByUsageRole,
  getProductCover,
  create,
  createMany,
  update,
  setStatus,
  activate,
  archive,
  approve,
  reject,
  approveMany,
  rejectMany,
  remove,
  removeMany,
  reorder,
  moveWithinProduct,
  setCover,
  assignToProduct,
  assignToPlacement,
  getProductMediaSummary,
  getMediaMetrics,
  resetMedia,
  getVersion: getMediaVersion,
  getFingerprint: getMediaFingerprint,
};

export default mediaRepository;
