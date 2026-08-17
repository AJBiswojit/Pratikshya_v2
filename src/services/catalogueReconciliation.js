/**
 * PRATIKSHYA FASHON — Catalogue reconciliation (Phase 23).
 *
 * The canonical media library (`public/library`) contains far more legitimate
 * product photography than the authored catalogue describes. Phase 22 built
 * the MEDIA → DRAFT → REVIEW → PUBLISH pipeline and finalised the 21 Kids
 * products. Phase 23 extends that same architecture to every other product
 * category: each legitimate product-media group that has NO product record
 * becomes ONE reviewable DRAFT product with a permanent Product ID
 * (SAR-001, LEH-001, BRD-001, MEN-001, JEW-001, BAN-001, INN-001, …).
 *
 * The rules this module enforces, in one place:
 *   · ONE PHYSICAL PRODUCT = ONE PRODUCT ID — a multi-view filename group
 *     (women-saree-cotton-005-front / -side / -back) is ONE product, never
 *     three. Deterministic filename grouping (`mediaGroups`) decides this;
 *     visual similarity is never an identity input.
 *   · SIMILAR ≠ SAME — groups with different groupKeys are never merged,
 *     whatever the similarity signal says.
 *   · The 21 Kids products (KID-001 … KID-021) are CONFIRMED separate and
 *     are never re-migrated, regrouped, renamed or merged here.
 *   · New drafts start in DRAFT, carry a safe name ("Uncategorised Saree ·
 *     SAR-001") and the review flags that keep them out of the storefront
 *     until a human names, prices and classifies them. Nothing auto-publishes.
 *   · Media ownership is expressed as the product's OWN claims (mediaIds /
 *     primaryMediaId / galleryMediaIds). Register-level ownership is never
 *     silently transferred here — that is the productWorkflow's job.
 *
 * This is a leaf module (no import of catalogRepository or taxonomyRepository)
 * so the catalogue repository can import it without an import cycle, exactly
 * like `productDraftMigration`. It reads the one media register and the one
 * taxonomy vocabulary (Product ID prefixes) only.
 */

import mediaRepository from "./media/mediaRepository";
import { getIngestedRecords } from "./media/ingestedMedia";
import { buildMediaGroups } from "./media/mediaGroups";
import {
  MEDIA_SCOPES,
  MAPPING_STATUS,
  DUPLICATE_STATUS,
  PRODUCT_MEDIA_ROLES,
} from "../config/mediaTypes";
import { DEFAULT_PRODUCT_ID_PREFIX, PRODUCT_ID_PREFIXES } from "../config/productIdPrefixes";
import { REVIEW_FLAGS, isPlaceholderProductName } from "./productReviewFlags";

export const CATALOGUE_RECONCILIATION_VERSION = 2;
export const CATALOGUE_RECONCILIATION_KEY = "pratikshya_catalogue_reconciliation_version";
export const CATALOGUE_RECONCILIATED_AT = "2026-08-13T00:00:00.000Z";
export const CATALOGUE_RECONCILIATION_AUTHOR = "Catalogue reconciliation";

/* ------------------------------------------------------------------ */
/* Vocabulary                                                          */
/* ------------------------------------------------------------------ */

/**
 * The draft-label a category uses in its safe name. These are presentation
 * labels for a placeholder name only — taxonomy truth stays in the taxonomy
 * repository, and no taxonomy record is invented here.
 */
export const CATEGORY_DRAFT_LABELS = {
  sarees: "Saree",
  lehengas: "Lehenga",
  "bridal-couture": "Bridal",
  menswear: "Men's Wear",
  jewellery: "Jewellery",
  bangles: "Bangles",
  innerwear: "Innerwear",
  dupattas: "Dupatta",
  "kurtis-and-suits": "Kurti / Suit",
};

/**
 * Filename-prefix → category, used ONLY when the explicit media metadata
 * (categoryId) is absent. This is the "filename/view convention" grouping
 * signal, never a visual guess.
 */
const FILENAME_CATEGORY_RULES = [
  { pattern: /^women-saree-/, category: "sarees" },
  { pattern: /^women-lehenga-/, category: "lehengas" },
  { pattern: /^women-bridal-/, category: "bridal-couture" },
  { pattern: /^women-innerwear-/, category: "innerwear" },
  { pattern: /^jewellery-bangle-/, category: "bangles" },
  { pattern: /^jewellery-/, category: "jewellery" },
  { pattern: /^men-/, category: "menswear" },
  { pattern: /^kids-/, category: "kidswear" },
];

/** The filename a media record is known by, however it is shaped. */
export const reconciliationFileName = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.url || media?.thumbnail || "").split("/").pop() ||
      ""
  ).toLowerCase();

/** True for the house artwork — never product photography. */
export const isHouseMedia = (media) =>
  Boolean(media && (media.source === "House artwork" || (media.tags || []).includes("house")));

/** True for the confirmed Kids plates — Phase 23 never touches these. */
export const isKidsMedia = (media) => /^kids-\d{3}\.\w+$/i.test(reconciliationFileName(media));

/**
 * `buildMediaGroups` only copies a few fields onto each group file; the rest
 * live on `file.original`. This reads a field from either place.
 */
const fieldOf = (file, key) => file?.[key] ?? file?.original?.[key] ?? null;

/** Deterministic category for a group, explicit metadata first. */
export const categoryForGroup = (group) => {
  const cats = [...new Set((group.files || []).map((file) => fieldOf(file, "categoryId")).filter(Boolean))];
  if (cats.length === 1) return { category: cats[0], inferred: false };
  const key = String(group.groupKey || "");
  for (const rule of FILENAME_CATEGORY_RULES) {
    if (rule.pattern.test(key)) return { category: rule.category, inferred: true };
  }
  return { category: "", inferred: true };
};

/** The subcategory name carried on the group's media, if any. */
export const subcategoryForGroup = (group) => {
  const subs = [...new Set((group.files || []).map((file) => fieldOf(file, "subcategoryId")).filter(Boolean))];
  return subs.length === 1 ? subs[0] : "";
};

/** The collection slug carried on the group's media, if any. */
export const collectionForGroup = (group) => {
  const cols = [...new Set((group.files || []).map((file) => fieldOf(file, "collectionId")).filter(Boolean))];
  return cols.length === 1 ? cols[0] : "";
};

/**
 * Whether a group's identity needs a human decision: any ingestion flag
 * (NEEDS_REVIEW / UNMAPPED) or duplicate signal marks it for review. This is
 * a review signal, never an automatic merge or split.
 */
export const groupNeedsReview = (group) =>
  (group.files || []).some((file) => {
    const mappingStatus = fieldOf(file, "mappingStatus");
    const duplicateStatus = fieldOf(file, "duplicateStatus");
    return (
      mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
      mappingStatus === MAPPING_STATUS.UNMAPPED ||
      duplicateStatus === DUPLICATE_STATUS.DUPLICATE ||
      duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE
    );
  });

/* ------------------------------------------------------------------ */
/* Media groups                                                        */
/* ------------------------------------------------------------------ */

/**
 * Every ingested product-photography group (non-house, non-kids), grouped by
 * the deterministic filename convention. One physical product = one group.
 */
export const reconciliationMediaGroups = () => {
  const photography = mediaRepository
    .getAll()
    .filter((media) => media.ingested || media.source === "Ingested library")
    .filter((media) => !isHouseMedia(media))
    .filter((media) => !isKidsMedia(media))
    .filter(
      (media) => media.scope === MEDIA_SCOPES.PRODUCT || media.scope === MEDIA_SCOPES.UNASSIGNED
    );

  return buildMediaGroups(
    photography.map((media) => ({ ...media, fileName: reconciliationFileName(media) }))
  );
};

/** Groups that already carry a productId (already catalogued). */
export const cataloguedGroups = (groups = null) =>
  (groups ?? reconciliationMediaGroups()).filter((group) =>
    (group.files || []).some((file) => file.productId)
  );

/** Groups with no productId anywhere — the uncatalogued product media. */
export const uncataloguedGroups = (groups = null) =>
  (groups ?? reconciliationMediaGroups()).filter(
    (group) => !(group.files || []).some((file) => file.productId)
  );

/* ------------------------------------------------------------------ */
/* Stable (manifest-derived) groups                                    */
/* ------------------------------------------------------------------ */

/**
 * The ingestion manifest's productId mapping is STATIC — it never changes at
 * runtime. Phase 23.2 assigns media to published products through the live
 * register, which would otherwise shift `uncataloguedGroups()` and renumber
 * Product IDs. These stable helpers derive groups from the manifest so the
 * Product IDs — and the assignment map — stay fixed forever.
 */
export const staticReconciliationGroups = () => {
  const photography = getIngestedRecords()
    .filter((media) => !isHouseMedia(media))
    .filter((media) => !isKidsMedia(media))
    .filter(
      (media) => media.scope === MEDIA_SCOPES.PRODUCT || media.scope === MEDIA_SCOPES.UNASSIGNED
    );
  return buildMediaGroups(
    photography.map((media) => ({ ...media, fileName: reconciliationFileName(media) }))
  );
};

/** Stable uncatalogued groups — manifest productId is null (always 61). */
export const staticUncataloguedGroups = () =>
  staticReconciliationGroups().filter((group) => !(group.files || []).some((file) => file.productId));

/** Does the static manifest give this product its own photography? */
export const hasStaticMedia = (productId) =>
  getIngestedRecords().some(
    (media) =>
      !isHouseMedia(media) &&
      !isKidsMedia(media) &&
      String(media.productId) === String(productId)
  );

/* ------------------------------------------------------------------ */
/* Phase 23.2 — canonical media → published product assignment         */
/* ------------------------------------------------------------------ */

/**
 * Deterministically maps uncatalogued library media groups to EXISTING
 * published products that have no register-owned media, so the storefront
 * renders the canonical product photography instead of the legacy shared
 * house / category plates those products were authored with.
 *
 * The mapping is the same deterministic-by-filename convention the Kids
 * reconciliation already uses — never visual similarity, never a guess of
 * physical identity beyond "same category, same subcategory, ordered".
 *
 *   · bangles   — published bangles ↔ jewellery-bangle-* (by id order)
 *   · jewellery — published Earrings ↔ jewellery-earring-* (subcategory match)
 *   · innerwear — published innerwear ↔ women-innerwear-* (by id order)
 *
 * Groups left over (more library photos than published products, or a
 * subcategory with no published match) remain NEW product drafts.
 *
 * The result is a Map<groupKey, productId>. It is read-only: ownership is
 * applied by `syncCanonicalMediaAssignment` through the media repository.
 */
export const assignedProductMediaMap = (products = []) => {
  const assignment = new Map();
  const published = (Array.isArray(products) ? products : []).filter(
    (product) => product && product.status === "PUBLISHED"
  );
  if (!published.length) return assignment;

  const groups = staticUncataloguedGroups();
  const byCategory = new Map();
  groups.forEach((group) => {
    const { category } = categoryForGroup(group);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(group);
  });

  const pair = (categoryId, { subcategory = null } = {}) => {
    const products = published
      .filter((product) => product.category === categoryId)
      .filter((product) => !hasStaticMedia(product.id))
      .filter((product) => (subcategory ? product.subcategory === subcategory : true))
      .sort((a, b) => String(a.id).localeCompare(String(b.id)));

    const categoryGroups = (byCategory.get(categoryId) || [])
      .filter((group) => (subcategory ? subcategoryForGroup(group) === subcategory : true))
      .sort((a, b) => a.groupKey.localeCompare(b.groupKey));

    const count = Math.min(products.length, categoryGroups.length);
    for (let index = 0; index < count; index += 1) {
      assignment.set(categoryGroups[index].groupKey, products[index].id);
    }
  };

  pair("bangles");
  pair("jewellery", { subcategory: "Earrings" });
  pair("innerwear");

  return assignment;
};

/**
 * Applies the canonical-media assignment to the media register, idempotently.
 * Each mapped group's files become PRODUCT media owned by the target product
 * (first view COVER, the rest GALLERY). Existing ownership is never stolen:
 * a file already owned by a different product is left alone.
 */
export const syncCanonicalMediaAssignment = (products = []) => {
  const assignment = assignedProductMediaMap(products);
  if (!assignment.size) return 0;

  const groups = new Map(staticUncataloguedGroups().map((group) => [group.groupKey, group]));
  let changed = 0;

  assignment.forEach((productId, groupKey) => {
    const group = groups.get(groupKey);
    if (!group) return;
    (group.files || []).forEach((file, index) => {
      const media = mediaRepository.getById(file.id);
      if (!media) return;
      if (media.productId && String(media.productId) === String(productId)) return;
      if (media.productId) return; // owned elsewhere — never reassign silently
      const role = index === 0 ? PRODUCT_MEDIA_ROLES.COVER : PRODUCT_MEDIA_ROLES.GALLERY;
      const assigned = mediaRepository.assignToProduct(file.id, productId, role);
      if (assigned) changed += 1;
    });
  });

  return changed;
};

/* ------------------------------------------------------------------ */
/* Deterministic Product IDs                                           */
/* ------------------------------------------------------------------ */

/**
 * Assigns a permanent Product ID to every uncatalogued group. Deterministic:
 * groups are ordered by category (fixed order) then groupKey, and numbered
 * sequentially within each category using the existing Product ID prefixes
 * (SAR, LEH, BRD, MEN, JEW, BAN, INN). The IDs are stable because the media
 * library is fixed — a refresh never renumbers a product.
 */
export const assignReconciliationIds = (groups = []) => {
  const assignment = new Map();
  const byCategory = new Map();
  groups.forEach((group) => {
    const { category } = categoryForGroup(group);
    if (!byCategory.has(category)) byCategory.set(category, []);
    byCategory.get(category).push(group);
  });

  [...byCategory.keys()].sort().forEach((category) => {
    const prefix = PRODUCT_ID_PREFIXES[category] ?? DEFAULT_PRODUCT_ID_PREFIX;
    const list = byCategory.get(category).sort((a, b) => a.groupKey.localeCompare(b.groupKey));
    list.forEach((group, index) => {
      assignment.set(group.groupKey, `${prefix}-${String(index + 1).padStart(3, "0")}`);
    });
  });

  return assignment;
};

/* ------------------------------------------------------------------ */
/* Draft records                                                       */
/* ------------------------------------------------------------------ */

/** The safe placeholder name a draft keeps until a human names it. */
export const reconciliationDraftName = (category, id) =>
  `Uncatalogued ${CATEGORY_DRAFT_LABELS[category] ?? "Product"} · ${id}`;

const groupKeyNumber = (groupKey) => {
  const match = String(groupKey || "").match(/(\d+)$/);
  return match ? Number(match[1]) : null;
};

/** One draft record for one uncatalogued media group. */
export const draftRecordForGroup = (group, id) => {
  const { category, inferred } = categoryForGroup(group);
  const subcategory = subcategoryForGroup(group);
  const collection = collectionForGroup(group);
  const number = groupKeyNumber(group.groupKey);

  /* The primary view is front-first, per the existing grouping convention. */
  const primaryFile =
    group.primary ?? (group.files || []).find((file) => file.view === "front") ?? group.files?.[0];
  const mediaIds = (group.files || []).map((file) => file.id).filter(Boolean);
  const primaryMediaId = primaryFile?.id ?? mediaIds[0] ?? null;

  const flags = new Set([REVIEW_FLAGS.NAME_REVIEW_REQUIRED, REVIEW_FLAGS.PRICE_REVIEW_REQUIRED]);
  if (!category || inferred || !subcategory) flags.add(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED);
  if (groupNeedsReview(group)) flags.add(REVIEW_FLAGS.GROUP_REVIEW_REQUIRED);

  return {
    id,
    productId: id,
    name: reconciliationDraftName(category, id),
    /* The permanent Product ID is the stable route key — never the editable
       name and never the filename. */
    slug: String(id).toLowerCase(),
    sku: `${String(id).replace(/[^A-Z0-9]/g, "")}-SKU`,
    category,
    subcategory,
    gender: category === "menswear" ? "Men" : "Women",
    description: "",
    shortDescription: "",
    collection: collection || "",
    collections: collection ? [collection] : [],
    colors: [],
    sizes: [],
    fabric: "",
    material: "",
    occasion: [],
    /* The product's OWN media claims. The media stays unassigned in the
       register; ownership transfer is a workflow action, never silent. */
    mediaIds,
    primaryMediaId,
    galleryMediaIds: mediaIds,
    price: 0,
    compareAtPrice: null,
    currency: "INR",
    pricing: { sellingPrice: 0, mrp: 0 },
    stock: 0,
    availability: "in-stock",
    status: "DRAFT",
    assignedEmployeeId: null,
    createdAt: CATALOGUE_RECONCILIATED_AT,
    updatedAt: CATALOGUE_RECONCILIATED_AT,
    createdBy: CATALOGUE_RECONCILIATION_AUTHOR,
    updatedBy: CATALOGUE_RECONCILIATION_AUTHOR,
    reviewedAt: null,
    publishedAt: null,
    reviewFlags: [...flags],
    /* Audit provenance — the media group this product was reconciled from. */
    sourceGroupKey: group.groupKey,
    sourceGroupNumber: number,
    sourceViewCount: (group.files || []).length,
  };
};

/**
 * All reconciliation draft records, deterministically. Groups whose media is
 * assigned to an existing published product (Phase 23.2) are NOT drafted —
 * they are already represented by that published product.
 */
export const reconciliationDraftRecords = (products = []) => {
  const assigned = assignedProductMediaMap(products);
  /* IDs are assigned over the FULL static uncatalogued group set (always 61),
     so a group's Product ID never renumbers when another group is assigned to
     a published product — bangle-009 stays BAN-009, innerwear-004 stays
     INN-004, earring-003 stays JEW-008, forever. */
  const groups = staticUncataloguedGroups();
  const ids = assignReconciliationIds(groups);
  return groups
    .filter((group) => !assigned.has(group.groupKey))
    .map((group) => draftRecordForGroup(group, ids.get(group.groupKey)))
    .sort((a, b) => String(a.id).localeCompare(String(b.id)));
};

/* ------------------------------------------------------------------ */
/* Idempotent sync                                                     */
/* ------------------------------------------------------------------ */

/**
 * Fill only the placeholder-state fields of an existing reconciliation draft.
 * Anything a human has already set (name, price, subcategory, collections)
 * is left exactly as it is.
 */
const upgradeReconciliationDraft = (current, template) => {
  if (!current || typeof current !== "object") return current;
  const next = { ...current };
  let changed = false;

  if (isPlaceholderProductName(next.name) && template.name) {
    next.name = template.name;
    changed = true;
  }
  if (!next.subcategory && template.subcategory) {
    next.subcategory = template.subcategory;
    changed = true;
  }
  if (!next.category && template.category) {
    next.category = template.category;
    changed = true;
  }
  if (!(Number(next.price) > 0) && Number(template.price) > 0) {
    next.price = template.price;
    next.pricing = {
      ...(next.pricing ?? {}),
      sellingPrice: template.price,
      mrp: Math.max(Number(template.price), Number(template.compareAtPrice) || 0),
    };
    changed = true;
  }
  if (!(next.collections ?? []).length && template.collections.length) {
    next.collections = [...template.collections];
    if (!next.collection) next.collection = template.collections[0];
    changed = true;
  }
  if (!next.sku) {
    next.sku = template.sku;
    changed = true;
  }
  if (!(next.mediaIds ?? []).length && (template.mediaIds ?? []).length) {
    next.mediaIds = [...template.mediaIds];
    if (!next.primaryMediaId) next.primaryMediaId = template.primaryMediaId;
    if (!(next.galleryMediaIds ?? []).length) next.galleryMediaIds = [...template.galleryMediaIds];
    changed = true;
  }

  return changed ? next : current;
};

/**
 * Appends missing reconciliation drafts and upgrades placeholder-state drafts
 * already in the register. Idempotent: human edits are never touched, and
 * Product IDs are never regenerated. Kids records (KID-…) are never matched
 * by a reconciliation template, so they are never upgraded here.
 */
export const ensureCatalogueReconciliation = (items) => {
  const register = Array.isArray(items) ? items : [];
  const assigned = assignedProductMediaMap(items);
  const templates = reconciliationDraftRecords(items);
  const byId = new Map(templates.map((template) => [template.id, template]));
  const present = new Set();

  const upgraded = register.map((row) => {
    const id = String(row?.id ?? "");
    const template = byId.get(id);
    if (!template) return row;
    present.add(id);
    return upgradeReconciliationDraft(row, template);
  });

  const missing = templates.filter((template) => !present.has(template.id));
  const merged = missing.length ? [...upgraded, ...missing] : upgraded;

  /* Phase 23.2 — a draft whose media group is now assigned to a published
     product is redundant: the published product owns that media, so the
     draft is retired (ARCHIVED) rather than left to claim another product's
     media forever. */
  const reconciled = merged.map((row) => {
    if (
      row &&
      typeof row === "object" &&
      row.sourceGroupKey &&
      assigned.has(row.sourceGroupKey) &&
      row.status !== "ARCHIVED" &&
      row.status !== "PUBLISHED"
    ) {
      return {
        ...row,
        status: "ARCHIVED",
        reviewFlags: [...new Set([...(row.reviewFlags ?? []), REVIEW_FLAGS.MEDIA_OWNERSHIP_MOVED])],
      };
    }
    return row;
  });

  /* A reconciliation draft never shares a route with another record. Its
     stable slug is its Product ID. */
  const claimedByOthers = new Set(
    reconciled
      .filter((row) => !byId.has(String(row?.id ?? "")))
      .map((row) => String(row?.slug ?? ""))
      .filter(Boolean)
  );
  const seenSlugs = new Set();

  return reconciled.map((row) => {
    const id = String(row?.id ?? "");
    if (!byId.has(id)) return row;
    const slug = String(row?.slug ?? "");
    const idSlug = id.toLowerCase();
    if (slug && !claimedByOthers.has(slug) && !seenSlugs.has(slug)) {
      seenSlugs.add(slug);
      return row;
    }
    seenSlugs.add(idSlug);
    return { ...row, slug: idSlug };
  });
};

/** Storage-aware sync. Versioned like the Kids draft migration. */
export const syncCatalogueReconciliation = (items) => {
  const storage = typeof localStorage !== "undefined" ? localStorage : null;

  let appliedVersion = CATALOGUE_RECONCILIATION_VERSION;
  if (storage) {
    try {
      appliedVersion = Number(storage.getItem(CATALOGUE_RECONCILIATION_KEY) || 0);
    } catch {
      /* storage read failure — fall through and re-apply the pure migration */
    }
  }
  if (appliedVersion >= CATALOGUE_RECONCILIATION_VERSION && storage) {
    return ensureCatalogueReconciliation(items);
  }

  const next = ensureCatalogueReconciliation(items);

  if (storage) {
    try {
      storage.setItem(CATALOGUE_RECONCILIATION_KEY, String(CATALOGUE_RECONCILIATION_VERSION));
    } catch {
      /* storage failure must never reset products */
    }
  }
  return next;
};

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

/** The reconciliation snapshot the audits and reports read. */
export const getCatalogueReconciliationSummary = (products = []) => {
  const groups = staticReconciliationGroups();
  const uncatalogued = staticUncataloguedGroups();
  const assigned = assignedProductMediaMap(products);
  const drafts = reconciliationDraftRecords(products);

  const byCategory = new Map();
  groups.forEach((group) => {
    const { category } = categoryForGroup(group);
    if (!byCategory.has(category)) {
      byCategory.set(category, {
        category,
        mediaGroups: 0,
        cataloguedGroups: 0,
        assignedToPublished: 0,
        newDrafts: 0,
        needsReviewGroups: 0,
      });
    }
    const entry = byCategory.get(category);
    entry.mediaGroups += 1;
    const hasProduct = (group.files || []).some((file) => file.productId);
    if (hasProduct) entry.cataloguedGroups += 1;
    else if (assigned.has(group.groupKey)) entry.assignedToPublished += 1;
    else entry.newDrafts += 1;
    if (groupNeedsReview(group)) entry.needsReviewGroups += 1;
  });

  return {
    totalMediaGroups: groups.length,
    cataloguedGroups: groups.length - uncatalogued.length,
    uncataloguedGroups: uncatalogued.length,
    assignedToPublished: assigned.size,
    newProductCandidates: uncatalogued.length - assigned.size,
    draftRecords: drafts.length,
    needsReviewGroups: groups.filter(groupNeedsReview).length,
    byCategory: [...byCategory.values()].sort((a, b) => a.category.localeCompare(b.category)),
  };
};

export default {
  CATEGORY_DRAFT_LABELS,
  CATALOGUE_RECONCILIATION_VERSION,
  reconciliationFileName,
  isHouseMedia,
  isKidsMedia,
  categoryForGroup,
  subcategoryForGroup,
  collectionForGroup,
  groupNeedsReview,
  reconciliationMediaGroups,
  staticReconciliationGroups,
  staticUncataloguedGroups,
  hasStaticMedia,
  cataloguedGroups,
  uncataloguedGroups,
  assignedProductMediaMap,
  syncCanonicalMediaAssignment,
  assignReconciliationIds,
  reconciliationDraftName,
  draftRecordForGroup,
  reconciliationDraftRecords,
  ensureCatalogueReconciliation,
  syncCatalogueReconciliation,
  getCatalogueReconciliationSummary,
};
