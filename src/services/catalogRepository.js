/**
 * PRATIKSHYA FASHON — Catalogue repository (Phase 13).
 *
 * The ONE product repository. Customer storefront, admin portal, employee
 * portal, media, cart, wishlist, orders and (later) inventory, analytics
 * and AI all resolve product truth through this module. There is no admin
 * catalogue, no employee catalogue — one `pratikshya_products` register.
 *
 * Phase 13 upgrades the Phase 11 CRUD into a complete merchandising model:
 * identity, category & attributes, centralised pricing, variants, content,
 * SEO, flags, publishing status and an approval workflow — while every
 * existing product id, slug and field keeps working untouched.
 *
 * Rules honoured here, not in the UI:
 *   · existing ids are never regenerated
 *   · slugs are preserved and unique
 *   · SKUs are unique across products AND variants
 *   · final price is computed by the shared pricing engine, never locally
 *   · every mutation is signed (actor) and recorded in the shared diary
 *   · nothing is hard-deleted; retirement is ARCHIVED
 *
 * PERFORMANCE OPTIMIZATION:
 *   · Normalized list is cached with fingerprint; repeated all()/find()
 *     no longer re-normalizes 168 records each time.
 *   · Indexes by id/slug for O(1) lookups.
 *   · Product version counter for downstream memoization.
 */

import { products as catalogueSeedProducts } from "../data/catalog/products";
import { getProductMediaSummary } from "./media/mediaRepository";
import { getProductMediaSet } from "./media/productMediaSet";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "./employees/activityService";
import { DISCOUNT_TYPES, computePricing } from "../utils/pricing";
import { formatINR } from "../utils/shopping";
import {
  REVIEW_FLAG_LABELS,
  blockingReviewFlags,
  isPlaceholderProductName,
} from "./productReviewFlags";
import { unresolvedGroupConflictsFor } from "./media/productMediaGroups";
import { getWorkflowCommands } from "./workflow/workflowCommandRegistry";
import {
  buildProductIdPrefix,
  isCanonicalTaxonomyPath,
  nextCanonicalProductId,
} from "../config/productIdPrefixes";

export const slugify = (value) =>
  String(value)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const KEY = "pratikshya_products";
export const PRODUCTS_CHANGED_EVENT = "pratikshya-products-changed";

/* ------------------------------------------------------------------ */
/* Frontend catalogue seed                                             */
/* ------------------------------------------------------------------ */

/**
 * The static frontend catalogue — `src/data/catalog/products.js` — is the
 * authored product source. It supplies every record while the register is
 * empty (or missing entries), and is the seam a future product API replaces
 * without touching a single consumer. Stored workspace records always win
 * over the seed for the same id, so admin edits can never be overwritten.
 */
const CATALOGUE_SEED_RAW = JSON.stringify(catalogueSeedProducts);

/** Fingerprint of the authored catalogue — invalidates read-only caches. */
export const catalogueSeedFingerprint = () =>
  `${catalogueSeedProducts.length}:${CATALOGUE_SEED_RAW.length}`;

const hasCanonicalIdentity = (record) => {
  if (
    !record?.id ||
    !isCanonicalTaxonomyPath(record.department, record.category, record.subcategory)
  ) return false;
  try {
    const prefix = buildProductIdPrefix(
      record.department,
      record.category,
      record.subcategory
    );
    return new RegExp(`^${prefix}(?:-[A-Z0-9]+)*-\\d{4}$`).test(String(record.id));
  } catch {
    return false;
  }
};

const mergeCatalogueSeed = (stored) => {
  const canonicalStored = Array.isArray(stored) ? stored.filter(hasCanonicalIdentity) : [];
  if (canonicalStored.length === 0) return healRead(CATALOGUE_SEED_RAW);

  const present = new Set(canonicalStored.map((record) => String(record.id)));
  const missing = healRead(CATALOGUE_SEED_RAW).filter(
    (record) => !present.has(String(record.id))
  );
  return missing.length ? [...canonicalStored, ...missing] : canonicalStored;
};

export const PRODUCT_STATUS = {
  DRAFT: "DRAFT",
  /** Phase 22 — the review state. `REVIEW` is the canonical name in the
      workflow vocabulary; it is stored as PENDING_REVIEW so every existing
      consumer keeps working. Both strings are accepted on read/write. */
  REVIEW: "PENDING_REVIEW",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

/** Normalises any status spelling a record may carry into one value. */
export const normaliseProductStatus = (value) => {
  if (!value) return null;
  const upper = String(value).toUpperCase();
  if (upper === "REVIEW" || upper === "IN_REVIEW" || upper === "UNDER_REVIEW") {
    return PRODUCT_STATUS.PENDING_REVIEW;
  }
  if (Object.values(PRODUCT_STATUS).includes(upper)) return upper;
  return null;
};

export const REVIEW_STATE = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

const nowIso = () => new Date().toISOString();

const actorLabel = (actor) => {
  if (!actor) return "System";
  if (actor.adminId) return actor.name ? `${actor.name} (${actor.adminId})` : actor.adminId;
  if (actor.employeeId) {
    return actor.label
      ? `${actor.label} (${actor.employeeId})`
      : `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() + ` (${actor.employeeId})`;
  }
  return actor.label || actor.name || "System";
};

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/** Authored plates arrive as rich manifest objects; the register stores ids. */
const imageIdOf = (value) => {
  if (!value) return value;
  if (typeof value === "object") return value.id ?? value.src ?? null;
  return value;
};

let memoryStorage = null;
let productVersion = 0;

/*
 * Parse cache — Phase 21.1 performance guard.
 *
 * `read()` is called from many hot paths (inventory resolution, analytics,
 * AI assistants) and healing the register on every call meant re-parsing
 * the whole JSON tens of thousands of times per analytics snapshot. The
 * healed output is a deterministic function of the stored string, so it is
 * cached against that exact string: any write — this tab or another —
 * changes the string and invalidates the cache automatically.
 */
let readCache = null;

/* Normalized cache — avoids re-normalizing 168 products on every all()/find() */
let normalizedCache = {
  raw: null,
  parsedRef: null,
  list: null,
  byId: null,
  bySlug: null,
};

const read = () => {
  try {
    let raw = null;
    if (typeof localStorage !== "undefined") {
      raw = localStorage.getItem(KEY);
    } else {
      raw = memoryStorage;
    }
    if (readCache && readCache.raw === raw && readCache.parsed) {
      return readCache.parsed;
    }
    const healed = mergeCatalogueSeed(healRead(raw));
    /* READ = READ ONLY. The authored catalogue seed is merged here so the
       persisted register and authored catalogue stay one canonical product
       source; media ownership and workflow transitions use explicit commands. */
    readCache = { raw: raw ?? null, parsed: healed };
    return healed;
  } catch {
    return mergeCatalogueSeed(healRead(null));
  }
};

const getNormalizedSnapshot = () => {
  const rawData = read();
  const rawKey = readCache?.raw ?? null;
  if (
    normalizedCache.list &&
    normalizedCache.raw === rawKey &&
    normalizedCache.parsedRef === rawData
  ) {
    return normalizedCache;
  }
  const list = rawData.map((record, index) => normaliseProductRecord(record, index));
  const byId = new Map();
  const bySlug = new Map();
  for (let i = 0; i < list.length; i += 1) {
    const product = list[i];
    byId.set(String(product.id), product);
    if (product.slug) bySlug.set(String(product.slug), product);
  }
  normalizedCache = {
    raw: rawKey,
    parsedRef: rawData,
    list,
    byId,
    bySlug,
  };
  return normalizedCache;
};

export const getCatalogVersion = () => productVersion;
export const getCatalogFingerprint = () => {
  const raw = productsRegisterRaw();
  const snap = getNormalizedSnapshot();
  return `${raw ? raw.length : 0}:${snap.list.length}:${productVersion}`;
};

const healRead = (raw) => {
  try {
    const value = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(value)) return [];
    return value.map((record, index) => {
      if (!record || typeof record !== "object") return record;
      const id = record.id || `product-${String(index + 1).padStart(3, "0")}`;
      return {
        ...record,
        id,
        image: imageIdOf(record.image),
        hoverImage: imageIdOf(record.hoverImage),
        variants: Array.isArray(record.variants)
          ? record.variants.map((variant, variantIndex) => ({
              ...variant,
              id: variant.id || `${id}-var-${String(variantIndex + 1).padStart(2, "0")}`,
            }))
          : record.variants,
      };
    });
  } catch {
    return [];
  }
};

/**
 * The raw register string, exposed so read-only consumers can memoise
 * derived views against it (Phase 21.1). Any save() writes a new string,
 * so fingerprint-keyed caches invalidate automatically.
 */
export const productsRegisterRaw = () => {
  try {
    return typeof localStorage !== "undefined" ? localStorage.getItem(KEY) : memoryStorage;
  } catch {
    return null;
  }
};

const save = (items) => {
  try {
    const json = JSON.stringify(items);
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(KEY, json);
    } else {
      memoryStorage = json;
    }
  } catch {
    /* Storage failure never breaks the register. */
  }
  productVersion += 1;
  // Invalidate normalized cache on save (parsedRef will differ anyway, but bump version)
  // keep readCache in sync
  readCache = { raw: productsRegisterRaw() ?? null, parsed: items };
  normalizedCache = { raw: null, parsedRef: null, list: null, byId: null, bySlug: null };
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(PRODUCTS_CHANGED_EVENT));
  }
  return items;
};

/* ------------------------------------------------------------------ */
/* Normalisation — merge the full model with safe defaults             */
/* ------------------------------------------------------------------ */

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const normalisePricing = (raw) => {
  const pricing = raw.pricing && typeof raw.pricing === "object" ? raw.pricing : {};
  const selling = Number(pricing.sellingPrice ?? raw.price ?? 0) || 0;
  const mrp = Number(pricing.mrp ?? (raw.originalPrice > selling ? raw.originalPrice : selling)) || 0;
  return {
    mrp,
    sellingPrice: selling,
    discountType: pricing.discountType || DISCOUNT_TYPES.NONE,
    discountValue: Number(pricing.discountValue ?? 0) || 0,
    taxMode: pricing.taxMode || "INCLUSIVE",
    taxRate: Number(pricing.taxRate ?? 0) || 0,
    customTaxRate: Boolean(pricing.customTaxRate),
  };
};

const normaliseVariant = (variant, index, productId) => ({
  /* Variant identity must be stable before inventory can reference it. */
  id: variant.id || `${productId}-var-${String(index + 1).padStart(2, "0")}`,
  sku: variant.sku || "",
  color: variant.color || "",
  size: variant.size || "",
  priceOverride:
    variant.priceOverride === "" || variant.priceOverride == null
      ? null
      : Number(variant.priceOverride) || null,
  stock: Number(variant.stock ?? 0) || 0,
  barcode: variant.barcode || "",
  status: variant.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
  createdAt: variant.createdAt || nowIso(),
});

/**
 * Merges a stored canonical Product record into the complete editor shape.
 * Identity is never inferred or regenerated: every Product must already
 * carry the ID allocated by the canonical taxonomy-aware ID builder.
 */
export const normaliseProductRecord = (raw = {}, index = 0) => {
  const id = raw.id || "";
  const name = raw.name || "";
  const slug = raw.slug || slugify(name || id);
  const pricing = normalisePricing(raw);
  const computed = computePricing(pricing);

  const variants = asArray(raw.variants).map((variant, variantIndex) =>
    normaliseVariant(variant, variantIndex, id)
  );

  /* Collections: authored single label + Phase 13 multi-select. */
  const collections = asArray(raw.collections);
  const collection = raw.collection || collections[0] || "";

  const flags = raw.flags && typeof raw.flags === "object" ? raw.flags : {};
  const isFeatured = Boolean(raw.isFeatured ?? flags.featured);
  const isBestseller = Boolean(raw.isBestseller ?? flags.bestseller);
  const isNew = Boolean(raw.isNew ?? flags.newArrival);
  const isLimitedEdition = Boolean(raw.isLimitedEdition ?? flags.limitedEdition);
  const isTrending = Boolean(raw.isTrending ?? flags.trending);

  const review = raw.review && typeof raw.review === "object" ? raw.review : {};
  const status = normaliseProductStatus(raw.status) || PRODUCT_STATUS.DRAFT;

  /* Canonical authored Product Media also feeds the editor's flat image
     fields; no media path is used to infer Product identity or taxonomy. */
  const authoredMedia = raw.media && typeof raw.media === "object" ? raw.media : null;
  const image = raw.image ?? authoredMedia?.primary ?? undefined;
  const additionalImages = asArray(raw.additionalImages).length
    ? asArray(raw.additionalImages)
    : asArray(authoredMedia?.gallery);

  return {
    ...raw,

    /* Identity */
    id,
    /** Phase 22 — the permanent Product ID. `productId` mirrors `id`; the
        Product ID never changes when the editable name changes. */
    productId: raw.productId || id,
    name,
    slug,
    sku: raw.sku || "",
    brand: raw.brand || "Pratikshya Fashon",
    productType: raw.productType || "fashion",
    productCode: raw.productCode || "",
    barcode: raw.barcode || "",
    internalReference: raw.internalReference || "",

    /* Placement */
    category: raw.category || "",
    subcategory: raw.subcategory || "",
    gender: raw.gender ?? "",

    /* Content */
    shortDescription: raw.shortDescription || "",
    description: raw.description || "",
    highlights: asArray(raw.highlights),
    specifications:
      raw.specifications && typeof raw.specifications === "object" && !Array.isArray(raw.specifications)
        ? raw.specifications
        : {},
    careInstructions: Array.isArray(raw.careInstructions)
      ? raw.careInstructions
      : raw.careInstructions
        ? [String(raw.careInstructions)]
        : [],
    deliveryInfo: raw.deliveryInfo || "",
    returnInfo: raw.returnInfo || "",
    returnPolicy:
      raw.returnPolicy && typeof raw.returnPolicy === "object"
        ? raw.returnPolicy
        : { eligibility: "", window: "", notes: "" },

    /* Attributes */
    fabric: raw.fabric || "",
    material: raw.material || "",
    primaryColor: raw.primaryColor || "",
    secondaryColor: raw.secondaryColor || "",
    colors: asArray(raw.colors),
    patterns: asArray(raw.patterns),
    work: asArray(raw.work),
    occasion: asArray(raw.occasion),
    sizes: asArray(raw.sizes),
    unavailableColors: asArray(raw.unavailableColors),
    unavailableSizes: asArray(raw.unavailableSizes),
    season: raw.season || "",
    fit: raw.fit || "",
    length: raw.length || "",

    /* Merchandising */
    collection,
    collections: collections.length ? collections : collection ? [collection] : [],
    tags: asArray(raw.tags),
    badges: asArray(raw.badges),
    isFeatured,
    isBestseller,
    isNew,
    isLimitedEdition,
    isTrending,
    flags: {
      featured: isFeatured,
      bestseller: isBestseller,
      newArrival: isNew,
      limitedEdition: isLimitedEdition,
      trending: isTrending,
    },

    /* Pricing — storefront fields stay authoritative for the customer. */
    price: typeof raw.price === "number" ? raw.price : computed.finalPrice,
    originalPrice:
      typeof raw.originalPrice === "number" && raw.originalPrice > 0
        ? raw.originalPrice
        : computed.mrp > computed.finalPrice
          ? computed.mrp
          : undefined,
    /** Phase 22 — compare-at price for the draft editor, mirroring the
        storefront originalPrice. One field, one meaning. */
    compareAtPrice:
      raw.compareAtPrice != null && Number(raw.compareAtPrice) > 0
        ? Number(raw.compareAtPrice)
        : null,
    currency: raw.currency || "INR",
    pricing,
    priceHistory: asArray(raw.priceHistory),

    /* Variants */
    variants,

    /* Inventory preparation — stock movements arrive with Phase 14. */
    stock: Number(raw.stock ?? 0) || 0,
    availability: raw.availability || "in-stock",
    inventoryTracked: Boolean(raw.inventoryTracked),
    lowStockThreshold: Number(raw.lowStockThreshold ?? 5) || 5,

    /* SEO */
    seo:
      raw.seo && typeof raw.seo === "object"
        ? { title: raw.seo.title || "", description: raw.seo.description || "" }
        : { title: "", description: "" },

    /* Publishing & approval */
    status,
    published: status === "PUBLISHED",
    review: {
      state: review.state || REVIEW_STATE.NONE,
      submittedBy: review.submittedBy || null,
      submittedAt: review.submittedAt || null,
      reviewedBy: review.reviewedBy || null,
      reviewedAt: review.reviewedAt || null,
      rejectionReason: review.rejectionReason || "",
    },
    reviewedAt: raw.reviewedAt || review.reviewedAt || null,

    /* Phase 22 — media-to-product workflow.
       mediaIds / primaryMediaId / galleryMediaIds are the product's OWN
       media claims. Register-level ownership (media.productId) remains the
       single ownership truth; a claim that conflicts with the register is
       reported, never silently resolved. */
    image,
    additionalImages,
    mediaIds: asArray(raw.mediaIds),
    primaryMediaId: raw.primaryMediaId || null,
    galleryMediaIds: asArray(raw.galleryMediaIds),
    assignedEmployeeId: raw.assignedEmployeeId || null,

    /** Phase 22 — deterministic review flags, never a second status system. */
    reviewFlags: asArray(raw.reviewFlags),

    /* History */
    createdBy: raw.createdBy || null,
    createdAt: raw.createdAt || raw.updatedAt || nowIso(),
    updatedBy: raw.updatedBy || null,
    updatedAt: raw.updatedAt || nowIso(),
    publishedBy: raw.publishedBy || null,
    publishedAt: raw.publishedAt || null,

    /** Phase 22 — field-level audit trail: who changed what, when. */
    history: asArray(raw.history),
  };
};

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

const allNormalised = () => getNormalizedSnapshot().list;

const findNormalised = (id) => {
  const snap = getNormalizedSnapshot();
  return snap.byId.get(String(id)) ?? null;
};

const findBySlugNormalised = (slug) => {
  const snap = getNormalizedSnapshot();
  return snap.bySlug.get(String(slug)) ?? null;
};

/* ------------------------------------------------------------------ */
/* Uniqueness                                                          */
/* ------------------------------------------------------------------ */

const slugTaken = (slug, ignoreId = null) => {
  const snap = getNormalizedSnapshot();
  if (!slug) return false;
  for (const product of snap.list) {
    if (String(product.id) === String(ignoreId)) continue;
    if (product.slug === slug) return true;
  }
  return false;
};

/** Unique slug: the name's slug, suffixed with the product's own id on collision. */
const ensureUniqueSlug = (slug, ignoreId = null) => {
  if (!slugTaken(slug, ignoreId)) return slug;
  const candidate = `${slug}-${String(ignoreId ?? Date.now()).slice(-4)}`;
  let attempt = candidate;
  let counter = 2;
  while (slugTaken(attempt, ignoreId)) {
    attempt = `${candidate}-${counter}`;
    counter += 1;
  }
  return attempt;
};

/** SKU uniqueness across products AND variants. */
const skuTaken = (sku, ignoreProductId = null) => {
  if (!sku) return false;
  const target = String(sku).toLowerCase();
  const snap = getNormalizedSnapshot();
  for (const product of snap.list) {
    if (String(product.id) === String(ignoreProductId)) continue;
    if (product.sku?.toLowerCase() === target) return true;
    if (product.variants.some((variant) => variant.sku?.toLowerCase() === target)) return true;
  }
  return false;
};

/* ------------------------------------------------------------------ */
/* Publishing readiness                                                */
/* ------------------------------------------------------------------ */

/**
 * What still stands between a product and publication. One quality cover
 * is enough — video is never required.
 *
 * Phase 22 adds the workflow rules: a product cannot publish without a
 * Product ID, a real name, a category, a positive price and primary media
 * whose ownership is not in dispute. Nothing publishes silently.
 */
export const getPublishIssues = (product) => {
  if (!product) return ["Product not found."];
  const issues = [];
  if (!product.id && !product.productId) issues.push("Product ID is required.");
  if (!product.name?.trim()) {
    issues.push("Product name is required.");
  } else if (isPlaceholderProductName(product.name)) {
    issues.push("Product name must be real product information, not a placeholder.");
  }
  if (!product.sku?.trim()) issues.push("SKU is required.");
  if (!product.category) issues.push("Category is required.");
  const computed = computePricing(product.pricing);
  if (!(Number(product.price) > 0) && !(computed.finalPrice > 0)) {
    issues.push("Selling price must be greater than zero.");
  }
  if (!product.description?.trim() && !product.shortDescription?.trim()) {
    issues.push("A description is required.");
  }
  /* Phase 22 — the primary media must belong to THIS product. A claim
     contested by another product's ownership blocks publication. */
  const mediaSet = getProductMediaSet(product);
  const summary = getProductMediaSummary(product.id);
  const hasCataloguePlate =
    Boolean(product.image) || Boolean(summary.hasCover) || Boolean(mediaSet.primary);
  if (!hasCataloguePlate) {
    issues.push("At least one cover image is required before publishing.");
  }
  if (mediaSet.ownershipConflicts?.length) {
    issues.push(
      `Media ownership must be resolved before publishing (${mediaSet.ownershipConflicts.length} conflict${
        mediaSet.ownershipConflicts.length === 1 ? "" : "s"
      }).`
    );
  }
  if (!mediaSet.primary && !hasCataloguePlate) {
    issues.push("A primary image owned by this product is required before publishing.");
  }

  /* Phase 22.1 — no required review flag may stand, and no group identity
     decision may be open, when a product publishes. */
  const blockers = blockingReviewFlags(product.reviewFlags);
  if (blockers.length) {
    issues.push(
      `Review flags must be resolved before publishing: ${blockers
        .map((flag) => REVIEW_FLAG_LABELS[flag] ?? flag)
        .join(", ")}.`
    );
  }

  const claimedIds = (Array.isArray(product.mediaIds) ? product.mediaIds : []).map(String);
  const galleryIds = (mediaSet.gallery ?? []).map((item) => String(item.id ?? "")).filter(Boolean);
  const groupConflicts = unresolvedGroupConflictsFor([...claimedIds, ...galleryIds]);
  if (groupConflicts.length) {
    issues.push(
      `Grouping review must be resolved before publishing (${groupConflicts
        .map((group) => group.id)
        .join(", ")}).`
    );
  }

  issues.push(...computed.errors);
  return [...new Set(issues)];
};

/* ------------------------------------------------------------------ */
/* Activity — the shared house diary, never a second log               */
/* ------------------------------------------------------------------ */

const noteProduct = (action, product, actor, summary) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetProductId: product.id,
      action,
      summary,
    });
  } catch {
    /* The diary is an enhancement; a failure never blocks the save. */
  }
};

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/**
 * The single writer. Merges a draft onto the stored record, computes
 * derived truth (price mapping, flags, history) and signs the change.
 *
 * Phase 3E — ONE USER ACTION → ONE ACTIVITY EVENT. The `activity` option
 * now has three meanings:
 *   · undefined (not passed)  → default diary event (created / edited)
 *   · null (passed explicitly)→ SUPPRESSED — the calling canonical command
 *                               owns and records the lifecycle event itself,
 *                               so the writer must not add a generic
 *                               PRODUCT_EDITED beside it
 *   · { action, summary }     → the caller's explicit event replaces the
 *                               default one (unchanged behaviour)
 * Field-level events (price change, variants) are facts about the data and
 * still fire regardless — they are not lifecycle events.
 */
const writeProduct = (draft, actor, options = {}) => {
  const { activity, existingId = null } = options;
  const suppressDefaultActivity =
    Object.prototype.hasOwnProperty.call(options, "activity") && activity == null;
  const items = read();
  const lookupId = existingId ?? draft.id;
  const index = items.findIndex((p) => String(p.id) === String(lookupId));
  const existing = index >= 0 ? normaliseProductRecord(items[index], index) : null;
  const label = actorLabel(actor);
  const at = nowIso();

  const merged = normaliseProductRecord(
    { ...(existing ?? {}), ...draft, id: draft.id ?? undefined },
    index >= 0 ? index : items.length
  );

  /* Pricing — the engine decides; storefront fields follow. */
  const computed = computePricing(merged.pricing);
  if (!computed.errors.length && computed.finalPrice > 0) {
    merged.price = computed.finalPrice;
    merged.originalPrice = computed.mrp > computed.finalPrice ? computed.mrp : undefined;
  }
  merged.pricing = { ...merged.pricing, finalPrice: computed.finalPrice };

  /* Slug — preserved where it exists, unique always. A draft with no name
     and no slug falls back to the Product ID so the record always has a
     stable, addressable slug; renaming later regenerates it. */
  merged.slug = ensureUniqueSlug(
    draft.slug || merged.slug || slugify(merged.name || merged.id),
    merged.id
  );

  /* Flags mirror the flat fields the storefront already reads. */
  merged.flags = {
    featured: merged.isFeatured,
    bestseller: merged.isBestseller,
    newArrival: merged.isNew,
    limitedEdition: merged.isLimitedEdition,
    trending: merged.isTrending,
  };
  merged.published = merged.status === PRODUCT_STATUS.PUBLISHED;

  /* History */
  merged.updatedBy = label;
  merged.updatedAt = at;
  if (!existing) {
    merged.createdBy = merged.createdBy || label;
    merged.createdAt = merged.createdAt || at;
  }
  if (merged.status === PRODUCT_STATUS.PUBLISHED && existing?.status !== PRODUCT_STATUS.PUBLISHED) {
    merged.publishedBy = label;
    merged.publishedAt = at;
  }

  /* Lightweight price-change history for the demo. */
  if (existing && Number(existing.price) !== Number(merged.price) && Number(merged.price) > 0) {
    merged.priceHistory = [
      { at, by: label, from: Number(existing.price), to: Number(merged.price) },
      ...merged.priceHistory,
    ].slice(0, 24);
  }

  /* Phase 22 — field-level audit trail. Captures who changed what, when,
     for the fields the house cares about: identity, name, media, category,
     assignment, price and status. Sensitive data is never recorded. */
  if (existing) {
    const changed = [];
    const noteField = (field, before, after) => {
      if (String(before ?? "") === String(after ?? "")) return;
      changed.push({ at, by: label, field, from: before ?? null, to: after ?? null });
    };
    noteField("id", existing.id, merged.id);
    noteField("name", existing.name, merged.name);
    noteField("category", existing.category, merged.category);
    noteField("subcategory", existing.subcategory, merged.subcategory);
    noteField("price", Number(existing.price) || null, Number(merged.price) || null);
    noteField("assignedEmployeeId", existing.assignedEmployeeId, merged.assignedEmployeeId);
    noteField("status", existing.status, merged.status);
    const mediaBefore =
      existing.primaryMediaId ||
      (typeof existing.image === "string" ? existing.image : existing.image?.id || existing.image?.src) ||
      null;
    const mediaAfter =
      merged.primaryMediaId ||
      (typeof merged.image === "string" ? merged.image : merged.image?.id || merged.image?.src) ||
      null;
    noteField("media", mediaBefore, mediaAfter);
    const claimedBefore = (existing.mediaIds ?? []).join(",");
    const claimedAfter = (merged.mediaIds ?? []).join(",");
    noteField("mediaClaims", claimedBefore, claimedAfter);
    if (changed.length) {
      merged.history = [...changed, ...merged.history].slice(0, 60);
    }
  }

  const next = [...items];
  if (index >= 0) next[index] = merged;
  else next.unshift(merged);
  save(next);

  /* Diary entries. */
  if (existing && Number(existing.price) !== Number(merged.price) && Number(merged.price) > 0) {
    noteProduct(
      ACTIVITY_ACTIONS.PRODUCT_PRICE_CHANGED,
      merged,
      actor,
      `${merged.name} · price ${formatINR(existing.price)} → ${formatINR(merged.price)}`
    );
  }
  const variantsBefore = existing?.variants.length ?? 0;
  if (merged.variants.length > variantsBefore) {
    noteProduct(
      ACTIVITY_ACTIONS.PRODUCT_VARIANT_ADDED,
      merged,
      actor,
      `${merged.name} · ${merged.variants.length - variantsBefore} variant${merged.variants.length - variantsBefore === 1 ? "" : "s"} added`
    );
  } else if (existing && JSON.stringify(existing.variants) !== JSON.stringify(merged.variants)) {
    noteProduct(ACTIVITY_ACTIONS.PRODUCT_VARIANT_UPDATED, merged, actor, `${merged.name} · variants updated`);
  }
  if (activity) noteProduct(activity.action, merged, actor, activity.summary);
  else if (suppressDefaultActivity) {
    /* Phase 3E — the calling canonical command owns the lifecycle event.
       Recording a generic PRODUCT_EDITED here would double-log the action. */
  } else if (!existing) {
    noteProduct(ACTIVITY_ACTIONS.PRODUCT_CREATED, merged, actor, `Created product ${merged.name}`);
  } else {
    noteProduct(ACTIVITY_ACTIONS.PRODUCT_EDITED, merged, actor, `Edited product ${merged.name}`);
  }

  return merged;
};

/* ------------------------------------------------------------------ */
/* Legacy status → canonical command map (Phase 3C)                    */
/* ------------------------------------------------------------------ */

/**
 * The compatibility `updateStatus(id, status)` adapter owns no workflow
 * rules of its own — it only names the canonical command that implements
 * the requested transition.
 *
 * DRAFT is deliberately absent: reaching DRAFT is not one transition but
 * three distinct, separately authorized commands (restoreProduct from the
 * archive, unpublishProduct from the storefront, returnProduct with a
 * mandatory reason). A legacy caller must choose the right one instead of
 * silently mutating a product back to DRAFT.
 */
const LEGACY_STATUS_COMMANDS = {
  [PRODUCT_STATUS.PUBLISHED]: "publishProduct",
  [PRODUCT_STATUS.ARCHIVED]: "archiveProduct",
  [PRODUCT_STATUS.PENDING_REVIEW]: "submitProduct",
};

/* ------------------------------------------------------------------ */
/* Product ID rename validation (pure)                                 */
/* ------------------------------------------------------------------ */

/**
 * Phase 3C — the ONE Product ID rename rule. Pure: reads the register and
 * returns either the resolved { existing, target } pair or a structured
 * error. Both the repository writer and the workflow ownership path use it,
 * so a rename can be fully validated BEFORE any media ownership moves.
 */
const validateProductIdChange = (id, newProductId) => {
  const existing = findNormalised(id);
  if (!existing) return { ok: false, error: "Product not found." };
  const target = String(newProductId || "").trim().toUpperCase();
  const familyPrefix = String(existing.id).replace(/-\d{4}$/, "");
  if (!new RegExp(`^${familyPrefix}-\\d{4}$`).test(target)) {
    return {
      ok: false,
      error: `Product ID must remain in its canonical taxonomy family (${familyPrefix}-0001).`,
    };
  }
  if (findNormalised(target) || findNormalised(String(newProductId).trim())) {
    return { ok: false, error: "That Product ID is already in use." };
  }
  return { ok: true, existing, target };
};

/* ------------------------------------------------------------------ */
/* Public repository                                                   */
/* ------------------------------------------------------------------ */

const allocateCanonicalProductId = (draft = {}) =>
  nextCanonicalProductId(read(), draft.department, draft.category, draft.subcategory);

const missingIdentityResult = () => ({
  ok: false,
  error: "Select a canonical department, category, and subcategory before creating the Product.",
});

const validateCanonicalIdentityMutation = (existing, patch = {}) => {
  const candidate = { ...existing, ...patch, id: existing.id };
  if (hasCanonicalIdentity(candidate)) return null;
  return {
    ok: false,
    error:
      "A Product's canonical taxonomy family cannot be changed after its Product ID is allocated. Create a new Product in the intended taxonomy path.",
  };
};

export const catalogRepository = {
  /** Every product, in the complete Phase 13 shape. */
  all: allNormalised,

  find: findNormalised,

  findBySlug: (slug) => findBySlugNormalised(slug),

  /** Persist an existing Product, or allocate a canonical ID for a new draft. */
  upsert: (product, actor = null) => {
    const draft = { ...product };
    if (!draft.id) draft.id = allocateCanonicalProductId(draft);
    if (!draft.id) return missingIdentityResult();
    const existing = findNormalised(draft.id);
    const invalid = existing
      ? validateCanonicalIdentityMutation(existing, draft)
      : hasCanonicalIdentity(draft)
        ? null
        : missingIdentityResult();
    if (invalid) return invalid;
    draft.status = draft.status || PRODUCT_STATUS.DRAFT;
    return writeProduct(draft, actor);
  },

  /** Create a brand-new DRAFT with a taxonomy-derived canonical Product ID. */
  createProduct: (draft, actor = null) => {
    const id = allocateCanonicalProductId(draft);
    if (!id) return missingIdentityResult();
    const product = writeProduct(
      {
        ...draft,
        id,
        status: PRODUCT_STATUS.DRAFT,
        createdAt: nowIso(),
        createdBy: actorLabel(actor),
      },
      actor
    );
    return { ok: true, product };
  },

  /** Create a Product DRAFT; it remains storefront-hidden until publication. */
  createDraftProduct: (draft, actor = null) => {
    const id = allocateCanonicalProductId(draft);
    if (!id) return missingIdentityResult();
    const product = writeProduct(
      { ...draft, id, status: PRODUCT_STATUS.DRAFT },
      actor,
      {
        activity: {
          action: ACTIVITY_ACTIONS.PRODUCT_DRAFT_CREATED,
          summary: `Created product draft ${id}${draft.name ? ` · ${draft.name}` : ""}`,
        },
      }
    );
    return { ok: true, product };
  },

  /**
   * Update an existing product by id. Returns `{ ok, product }`.
   *
   * Phase 3E — a canonical workflow command that records its own lifecycle
   * event passes `{ activity: null }` so the writer does not add a generic
   * PRODUCT_EDITED beside it (one user action → one activity event).
   */
  updateProduct: (id, patch, actor = null, options = undefined) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Product not found." };
    const invalid = validateCanonicalIdentityMutation(existing, patch);
    if (invalid) return invalid;
    const product = writeProduct({ ...patch, id: existing.id }, actor, options ?? {});
    return { ok: true, product };
  },

  /** Phase 22 — employee/admin edits to a draft, signed as PRODUCT_UPDATED. */
  updateDraft: (id, patch, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Product not found." };
    const invalid = validateCanonicalIdentityMutation(existing, patch);
    if (invalid) return invalid;
    const product = writeProduct({ ...patch, id: existing.id }, actor, {
      activity: {
        action: ACTIVITY_ACTIONS.PRODUCT_UPDATED,
        summary: `Updated draft ${existing.name || existing.id}`,
      },
    });
    return { ok: true, product };
  },

  /** Phase 22 — assign (or unassign) the employee working on a product. */
  assignToEmployee: (id, employeeId, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Product not found." };
    const product = writeProduct(
      { id, assignedEmployeeId: employeeId || null },
      actor,
      {
        activity: {
          action: ACTIVITY_ACTIONS.PRODUCT_ASSIGNED,
          summary: employeeId
            ? `Assigned ${existing.name || existing.id} to ${employeeId}`
            : `Unassigned ${existing.name || existing.id}`,
        },
      }
    );
    return { ok: true, product };
  },

  /**
   * Phase 3C — the Product ID validation rule, exposed read-only so the
   * workflow layer can validate a rename BEFORE it moves media ownership.
   * Pure: it inspects the register and never writes.
   */
  validateProductIdChange: (id, newProductId) => validateProductIdChange(id, newProductId),

  /**
   * Phase 22 — change the permanent Product ID. Admin-only, requires the
   * new id to be free and well-formed; history records the change and the
   * media register is kept in sync by the workflow layer.
   *
   * Phase 3C: this is the PERSISTENCE primitive for a rename. Media
   * ownership is NOT touched here — `productWorkflow.changeProductId`
   * validates and moves ownership through `mediaOwnershipService` around
   * this call.
   */
  changeProductId: (id, newProductId, actor = null) => {
    const check = validateProductIdChange(id, newProductId);
    if (!check.ok) return check;
    const { existing, target } = check;
    const product = writeProduct(
      { ...existing, id: target, productId: target },
      actor,
      {
        existingId: existing.id,
        /* Phase 3E — the PRODUCT_RENAMED_ID lifecycle event is owned by the
           canonical workflow command (productWorkflow.changeProductId),
           which validates and moves media ownership around this persistence
           primitive. Recording it here too double-logged every rename (and
           logged a spurious rename on the workflow's rollback path). The
           field-level history entry ("id" changed) is still written above. */
        activity: null,
      }
    );
    return { ok: true, product };
  },

  /* ---------------- workflow -------------------------------------- */
  /**
   * Compatibility adapters — every canonical transition lives in the
   * universal workflow command service (productWorkflowCommands). These
   * methods fail loudly if the command layer is not loaded rather than
   * bypassing the lifecycle.
   */
  _workflowCommand: (name, ...args) => {
    const commands = getWorkflowCommands();
    if (!commands?.[name]) {
      return {
        ok: false,
        error: `The workflow command layer is not loaded — ${name} cannot run.`,
      };
    }
    return commands[name](...args);
  },

  submitForReview: (id, actor = null) => catalogRepository._workflowCommand("submitProduct", id, actor),

  /**
   * Compatibility adapter — the canonical transition lives in the universal
   * workflow command service (productWorkflowCommands.approveProduct).
   *
   * Phase 2 FIX: approval no longer publishes. Approving moves the product
   * to the APPROVED canonical stage; an explicit, separately authorized
   * publishProduct is required to reach the storefront (same rule for every
   * department and category).
   */
  approveProduct: (id, actor = null) => catalogRepository._workflowCommand("approveProduct", id, actor),

  /**
   * Compatibility adapter — the canonical transition lives in the universal
   * workflow command service (productWorkflowCommands.returnProduct).
   * A return reason is required.
   */
  rejectProduct: (id, reason = "", actor = null) =>
    catalogRepository._workflowCommand("returnProduct", id, reason || "Returned for further review.", actor),

  /**
   * Compatibility adapter — the canonical transition lives in the universal
   * workflow command service (productWorkflowCommands.publishProduct).
   * Publishing requires the APPROVED stage plus a full fresh validation.
   */
  publishProduct: (id, actor = null) => catalogRepository._workflowCommand("publishProduct", id, actor),

  /** Compatibility adapter — the canonical transition lives in the universal
      workflow command service (productWorkflowCommands.unpublishProduct). */
  unpublishProduct: (id, actor = null) => catalogRepository._workflowCommand("unpublishProduct", id, actor),

  /** Compatibility adapter — the canonical transition lives in the universal
      workflow command service (productWorkflowCommands.archiveProduct). */
  archiveProduct: (id, actor = null) => catalogRepository._workflowCommand("archiveProduct", id, actor),

  /** Compatibility adapter — the canonical transition lives in the universal
      workflow command service (productWorkflowCommands.restoreProduct). */
  restoreProduct: (id, actor = null) => catalogRepository._workflowCommand("restoreProduct", id, actor),

  /**
   * Legacy status switch — Phase 11 compatibility ADAPTER only.
   *
   * Phase 3C: this method owns NO workflow rules. Every lifecycle status is
   * mapped to the canonical command that already implements authorization,
   * validation, the transition and the activity event. There is no residual
   * `writeProduct({ status })` branch, so a caller can no longer publish,
   * approve, archive, return or submit a product without the canonical
   * lifecycle. An unknown status is refused rather than written blindly.
   */
  updateStatus: (id, status, actor = null) => {
    const target = normaliseProductStatus(status);
    if (!target) {
      return {
        ok: false,
        error: `Unknown product status "${status}" — use a canonical workflow command.`,
      };
    }
    const command = LEGACY_STATUS_COMMANDS[target];
    if (!command) {
      return {
        ok: false,
        error: `Status ${target} is not a direct transition — use the canonical workflow command for it.`,
      };
    }
    return catalogRepository._workflowCommand(command, id, actor);
  },

  /**
   * Duplicate a product. New id, new SKU, new slug, deep-copied variants —
   * no shared mutable state. Media stays with the original; attach plates
   * through the media manager.
   */
  duplicateProduct: (id, actor = null) => {
    const source = findNormalised(id);
    if (!source) return { ok: false, error: "Product not found." };
    const at = nowIso();
    const label = actorLabel(actor);
    const newId = allocateCanonicalProductId(source);
    if (!newId) return missingIdentityResult();

    let sku = `${source.sku}-COPY`;
    let counter = 2;
    while (skuTaken(sku)) {
      sku = `${source.sku}-COPY-${counter}`;
      counter += 1;
    }

    const copy = {
      ...source,
      id: newId,
      name: `${source.name} (Copy)`,
      slug: "",
      sku,
      status: PRODUCT_STATUS.DRAFT,
      published: false,
      variants: source.variants.map((variant, index) => {
        let variantSku = variant.sku ? `${variant.sku}-COPY` : "";
        let variantCounter = 2;
        while (variantSku && skuTaken(variantSku, newId)) {
          variantSku = `${variant.sku}-COPY-${variantCounter}`;
          variantCounter += 1;
        }
        return {
          ...variant,
          id: `var-${Date.now().toString(36)}-${index}`,
          sku: variantSku,
          createdAt: at,
        };
      }),
      review: {
        state: REVIEW_STATE.NONE,
        submittedBy: null,
        submittedAt: null,
        reviewedBy: null,
        reviewedAt: null,
        rejectionReason: "",
      },
      priceHistory: [],
      createdBy: label,
      createdAt: at,
      updatedBy: label,
      updatedAt: at,
      publishedBy: null,
      publishedAt: null,
    };
    copy.slug = ensureUniqueSlug(slugify(copy.name), newId);

    const product = writeProduct(copy, actor, {
      activity: {
        action: ACTIVITY_ACTIONS.PRODUCT_DUPLICATED,
        summary: `Duplicated ${source.name} as ${copy.name}`,
      },
    });
    return { ok: true, product };
  },

  /**
   * Phase 3F — the low-level register removal PRIMITIVE.
   *
   * This is NOT the safe-delete command. It owns no dependency rules, no
   * authorization and no activity event — those live in ONE place, the
   * productDeletionService (`deleteProductPermanently`), which authorizes
   * the Super Admin, verifies the product is a dependency-free draft,
   * requires the re-typed Product ID and releases owned media back to the
   * library BEFORE calling this. UI code must never call this directly.
   *
   * The one register rule enforced here regardless of caller: a PUBLISHED
   * product can never be removed from the register — the storefront count
   * must not change through deletion.
   */
  removeProductRecord: (id) => {
    const items = read();
    const index = items.findIndex((p) => String(p.id) === String(id));
    if (index < 0) return { ok: false, error: "Product not found." };
    const record = normaliseProductRecord(items[index], index);
    if (record.status === PRODUCT_STATUS.PUBLISHED) {
      return {
        ok: false,
        error: "A published product cannot be removed — unpublish or archive it first.",
      };
    }
    const next = items.filter((_, i) => i !== index);
    save(next);
    return { ok: true, removedId: record.id };
  },

  /**
   * Bulk merchandising — publish, archive, flag. Applies only to products
   * that can legally take the change; returns what happened.
   *
   * Phase 2 FIX: bulk PUBLISH executes the SAME canonical command per
   * product (authorize → lifecycle → product/media/category validation →
   * publish). A product that is not APPROVED is skipped with its errors —
   * there is no second, faster publishing implementation.
   *
   * Phase 3C: EVERY lifecycle status in the patch — not just PUBLISHED —
   * now runs the canonical command per product, and the lifecycle key is
   * stripped from the merchandising patch so no direct status write can
   * survive alongside it. A product is only mutated after its own command
   * authorized and validated it, so one invalid product can never cause
   * another to transition incorrectly. Non-lifecycle merchandising fields
   * (featured / bestseller / new arrival) keep using the ordinary writer.
   */
  bulkUpdate: (ids, patch, actor = null, summary = "Bulk product update") => {
    const snap = getNormalizedSnapshot();
    const targets = snap.list.filter((product) => ids.includes(product.id));
    const requested = patch && Object.prototype.hasOwnProperty.call(patch, "status")
      ? normaliseProductStatus(patch.status)
      : null;

    /* A lifecycle status is never written through the merchandising path. */
    const { status: _lifecycleStatus, ...merchandising } = patch ?? {};
    const lifecycleCommand = requested ? LEGACY_STATUS_COMMANDS[requested] : null;
    if (requested && !lifecycleCommand) {
      return {
        ok: false,
        applied: 0,
        skipped: targets.length,
        error: `Status ${requested} is not a bulk transition — use the canonical workflow command for it.`,
      };
    }
    const hasMerchandising = Object.keys(merchandising).length > 0;

    /* Bulk publication has exactly ONE implementation: the canonical
       bulkPublish command. It authorizes once, then runs the canonical
       publishProduct per product (lifecycle + full revalidation) and emits
       the single bulk activity event — this adapter adds none of its own. */
    if (requested === PRODUCT_STATUS.PUBLISHED) {
      const bulk = catalogRepository._workflowCommand(
        "bulkPublish",
        targets.map((product) => product.id),
        actor
      );
      if (!bulk.ok) return { ok: false, applied: 0, skipped: targets.length, error: bulk.error };
      if (hasMerchandising) {
        (bulk.results ?? [])
          .filter((entry) => entry.ok)
          .forEach((entry) => writeProduct({ ...merchandising, id: entry.id }, actor, { activity: null }));
      }
      return { ok: true, applied: bulk.applied, skipped: bulk.skipped, results: bulk.results ?? [] };
    }

    let applied = 0;
    let skipped = 0;
    const results = [];
    targets.forEach((product) => {
      if (lifecycleCommand) {
        const result = catalogRepository._workflowCommand(lifecycleCommand, product.id, actor);
        results.push({
          id: product.id,
          ok: Boolean(result.ok),
          errors: result.errors ?? (result.error ? [result.error] : []),
        });
        if (!result.ok) {
          /* INVALID → the product stays exactly as it was. */
          skipped += 1;
          return;
        }
        /* Only a successfully transitioned product takes the rest of the
           merchandising patch; the transition itself already persisted. */
        if (hasMerchandising) writeProduct({ ...merchandising, id: product.id }, actor, { activity: null });
        applied += 1;
        return;
      }
      writeProduct({ ...merchandising, id: product.id }, actor, { activity: null });
      results.push({ id: product.id, ok: true, errors: [] });
      applied += 1;
    });
    if (applied > 0) {
      const first = targets[0];
      try {
        recordActivity(loadActivity(), {
          ...describeActor(actor),
          targetProductId: first?.id ?? null,
          action: ACTIVITY_ACTIONS.PRODUCT_BULK_UPDATED,
          summary: `${summary} · ${applied} product${applied === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped` : ""}`,
        });
      } catch {
        /* Diary failures never block. */
      }
    }
    return { ok: true, applied, skipped, results };
  },

  /* ---------------- validation helpers ----------------------------- */

  /** Legacy signature kept; now also checks variant SKUs. */
  skuTaken: (sku, ignoreProductId = null) => skuTaken(sku, ignoreProductId),

  slugTaken: (slug, ignoreId = null) => Boolean(slug) && slugTaken(slug, ignoreId),

  suggestSlug: (name, ignoreId = null) => ensureUniqueSlug(slugify(name || ""), ignoreId),

  getVersion: () => getCatalogVersion(),
  getFingerprint: () => getCatalogFingerprint(),
  _getSnapshot: () => getNormalizedSnapshot(),
};

/* ------------------------------------------------------------------ */
/* Metrics — computed from the repository, never stored                */
/* ------------------------------------------------------------------ */

export const catalogMetrics = (items) => {
  const list = (items ?? []).map((item, index) =>
    item.status || item.pricing ? item : normaliseProductRecord(item, index)
  );
  const needsPricingReview = (product) => {
    const computed = computePricing(product.pricing);
    return computed.errors.length > 0 || !(Number(product.price) > 0);
  };
  const needsMedia = (product) => {
    if (product.image) return false;
    const summary = getProductMediaSummary(product.id);
    return !summary.hasCover;
  };

  return {
    total: list.length,
    published: list.filter((p) => p.status === "PUBLISHED").length,
    drafts: list.filter((p) => p.status === "DRAFT").length,
    pendingReview: list.filter((p) => p.status === "PENDING_REVIEW").length,
    /** Phase 22 — "Review" is the workflow name for the review state. */
    review: list.filter((p) => p.status === "PENDING_REVIEW").length,
    archived: list.filter((p) => p.status === "ARCHIVED").length,
    featured: list.filter((p) => p.isFeatured).length,
    bestsellers: list.filter((p) => p.isBestseller).length,
    newArrivals: list.filter((p) => p.isNew).length,
    needsMedia: list.filter(needsMedia).length,
    needsPricingReview: list.filter(needsPricingReview).length,
  };
};

export default catalogRepository;

/** Test/support boundary for replacing the persisted canonical Product register. */
export const persistCanonicalCatalogueState = (products, source = "canonical-state") => {
  try {
    const payload = JSON.stringify(products);
    if (typeof localStorage !== "undefined" && localStorage) {
      localStorage.setItem(KEY, payload);
    } else {
      memoryStorage = payload;
    }
    return { ok: true, source };
  } catch (e) {
    return { ok: false, error: String(e && e.message ? e.message : e), source };
  }
};

