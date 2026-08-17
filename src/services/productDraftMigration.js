/**
 * PRATIKSHYA FASHON — Product draft migration (Phase 22 + 22.1).
 *
 * The 21 Kids media assets in `public/library/kids-001.webp … kids-021.webp`
 * become 21 reviewable product DRAFT records with permanent Product IDs
 * (KID-001 … KID-021).
 *
 * Phase 22.1 reconciliation:
 *   · draft commercial metadata (name, subcategory, price, compare-at,
 *     collections, colours, sizes, fabric, material, occasion) is hydrated
 *     from the EXISTING published product the media is explicitly mapped to
 *     (the ingestion manifest maps kids-001 → pf-079 and so on). This is
 *     catalogue metadata, never an image guess.
 *   · when no usable owner exists, the draft keeps a safe metadata-derived
 *     name ("Kids Piece · KID-001") and carries NAME_REVIEW_REQUIRED /
 *     PRICE_REVIEW_REQUIRED / TAXONOMY_REVIEW_REQUIRED.
 *   · every draft whose media is owned by another product carries
 *     CONFLICT_UNRESOLVED — the admin desk resolves it with the five
 *     reconciliation actions. Ownership is never moved here.
 *   · field-level hydration: only placeholder-state fields of existing
 *     drafts are filled, so anything a human edited is never touched.
 *
 * IDs stay KID-001 … KID-021 forever. Nothing is auto-published.
 */

import mediaRepository from "./media/mediaRepository";
import {
  REVIEW_FLAGS,
  isPlaceholderProductName,
} from "./productReviewFlags";
import {
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  kidsNameLooksForeign,
} from "./kidsProductIdentity";

export const PRODUCT_DRAFT_SYNC_VERSION = 4;
export const PRODUCT_DRAFT_SYNC_KEY = "pratikshya_product_drafts_sync_version";

export const KIDS_DRAFT_MIGRATED_AT = "2026-08-13T00:00:00.000Z";
export const KIDS_DRAFT_AUTHOR = "Product draft migration";

/**
 * Phase 22.2 — the confirmed identity table is the single source of truth
 * for which plate belongs to which permanent Product ID. Re-exported so
 * every existing importer of this module keeps working unchanged.
 */
export { KIDS_MEDIA_FILENAMES, KIDS_PRODUCT_IDS };

const fileNameOf = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.url || media?.thumbnail || "").split("/").pop() ||
      ""
  ).toLowerCase();

const kidsNumberFrom = (fileName) => {
  const match = String(fileName || "").match(/^kids-(\d+)\.\w+$/i);
  return match ? Number(match[1]) : null;
};

/**
 * Hydrate one draft's commercial metadata from the published product that
 * currently owns the media — the explicit mapping already stored in the
 * media register. Returns a full draft record template.
 */
const hydrateFromOwner = (owner, media, id) => {
  const usable =
    owner &&
    String(owner.category) === "kidswear" &&
    String(owner.status) === "PUBLISHED";

  const flags = [];
  /* Phase 22.2 — the safe initial name. Never an invented, highly specific
     product name guessed from the image; the employee/admin edits it. */
  let name = `Kids Product · ${id}`;
  let subcategory = "";
  let price = 0;
  let compareAtPrice = null;
  let description = "";
  let shortDescription = "";
  let collections = [];
  let colors = [];
  let sizes = [];
  let fabric = "";
  let material = "";
  let occasion = [];

  if (usable) {
    /* Phase 22.2 — carry over the verified catalogue name only when it
       genuinely describes a Kids product. An unrelated Women's / Men's /
       Bridal name is never inherited: the draft keeps its safe name and
       asks for NAME REVIEW instead. */
    if (owner.name?.trim() && !kidsNameLooksForeign(owner.name)) {
      name = owner.name;
    } else {
      flags.push(REVIEW_FLAGS.NAME_REVIEW_REQUIRED);
    }

    subcategory = owner.subcategory ?? "";
    if (!subcategory) flags.push(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED);

    if (Number(owner.price) > 0) price = Number(owner.price);
    else flags.push(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED);

    const compare = Number(owner.originalPrice ?? owner.compareAtPrice) || 0;
    compareAtPrice = compare > price ? compare : null;

    description = owner.description ?? "";
    shortDescription = owner.shortDescription ?? "";
    collections = owner.collections?.length
      ? [...owner.collections]
      : owner.collection
        ? [owner.collection]
        : [];
    colors = [...(owner.colors ?? [])];
    sizes = [...(owner.sizes ?? [])];
    fabric = owner.fabric ?? "";
    material = owner.material ?? "";
    occasion = [...(owner.occasion ?? [])];
  } else {
    flags.push(
      REVIEW_FLAGS.NAME_REVIEW_REQUIRED,
      REVIEW_FLAGS.PRICE_REVIEW_REQUIRED,
      REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED
    );
  }

  if (media?.productId && String(media.productId) !== id) {
    flags.push(REVIEW_FLAGS.CONFLICT_UNRESOLVED);
  }

  return {
    id,
    productId: id,
    name,
    /* Phase 22.2 — the storefront route is keyed on the permanent Product ID,
       never on the image filename and never on the editable name. Two Kids
       products that happen to share a name still resolve to two distinct
       URLs, and renaming a product never breaks or steals a link. */
    slug: String(id).toLowerCase(),
    sku: `KID-${String(id).replace(/\D/g, "") || "001"}-SKU`,
    category: "kidswear",
    subcategory,
    gender: "Kids",
    description,
    shortDescription,
    collection: collections[0] ?? "",
    collections,
    colors,
    sizes,
    fabric,
    material,
    occasion,
    mediaIds: media ? [media.id] : [],
    primaryMediaId: media ? media.id : null,
    galleryMediaIds: media ? [media.id] : [],
    price,
    compareAtPrice,
    currency: "INR",
    pricing: { sellingPrice: price, mrp: Math.max(price, compareAtPrice ?? 0) },
    stock: 0,
    status: "DRAFT",
    assignedEmployeeId: null,
    createdAt: KIDS_DRAFT_MIGRATED_AT,
    updatedAt: KIDS_DRAFT_MIGRATED_AT,
    createdBy: KIDS_DRAFT_AUTHOR,
    updatedBy: KIDS_DRAFT_AUTHOR,
    reviewedAt: null,
    publishedAt: null,
    reviewFlags: flags,
  };
};

/**
 * The 21 deterministic draft records, one per Kids library plate.
 * `owners` is the product register, used to resolve the media's current
 * published owner for metadata hydration.
 */
export const kidsDraftRecords = (owners = null) => {
  const byFile = new Map();
  mediaRepository.getAll().forEach((media) => {
    const name = fileNameOf(media);
    if (name && !byFile.has(name)) byFile.set(name, media);
  });

  const ownerById = new Map(
    (Array.isArray(owners) ? owners : []).map((product) => [String(product.id), product])
  );

  return KIDS_MEDIA_FILENAMES.map((fileName, index) => {
    const media = byFile.get(fileName) ?? null;
    const number = kidsNumberFrom(fileName) ?? index + 1;
    const id = `KID-${String(number).padStart(3, "0")}`;
    const owner = media?.productId ? ownerById.get(String(media.productId)) ?? null : null;
    return hydrateFromOwner(owner, media, id);
  });
};

/** True when a draft row is still in its untouched migration state. */
const isMigrationPlaceholder = (row) => {
  if (!row || typeof row !== "object") return false;
  if (String(row.status ?? "") !== "DRAFT") return false;
  if (!isPlaceholderProductName(row.name)) return false;
  return true;
};

/**
 * Fill only the placeholder-state fields of an existing KID draft from its
 * template. Anything a human has already set is left alone.
 */
const upgradeKidsDraft = (current, template) => {
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
  if (!(Number(next.price) > 0) && Number(template.price) > 0) {
    next.price = template.price;
    next.pricing = {
      ...(next.pricing ?? {}),
      sellingPrice: template.price,
      mrp: Math.max(template.price, Number(template.compareAtPrice) || 0),
    };
    changed = true;
  }
  if (next.compareAtPrice == null && template.compareAtPrice != null) {
    next.compareAtPrice = template.compareAtPrice;
    changed = true;
  }
  if (
    !next.description &&
    !next.shortDescription &&
    (template.description || template.shortDescription)
  ) {
    if (template.description) next.description = template.description;
    if (template.shortDescription) next.shortDescription = template.shortDescription;
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

  /* Flags — the v1 marker is retired; untouched placeholder rows adopt the
     template's flags, human-managed flag lists only lose the marker. */
  const before = [...(next.reviewFlags ?? [])];
  let flags = before.filter((flag) => flag !== REVIEW_FLAGS.KIDS_MIGRATION_REVIEW);
  const untouchedFlags =
    before.length === 0 || before.every((flag) => flag === REVIEW_FLAGS.KIDS_MIGRATION_REVIEW);
  if (isMigrationPlaceholder(current) && untouchedFlags) {
    flags = [...flags, ...(template.reviewFlags ?? [])];
  }
  next.reviewFlags = [...new Set(flags)];
  if (JSON.stringify(before) !== JSON.stringify(next.reviewFlags)) changed = true;

  return changed ? next : current;
};

/**
 * Appends missing Kids draft records and upgrades placeholder-state KID
 * drafts already in the register. Idempotent: edits by humans are never
 * touched, and KID ids are never regenerated.
 */
export const ensureKidsDraftRecords = (items) => {
  const register = Array.isArray(items) ? items : [];
  const templates = kidsDraftRecords(register);
  const byId = new Map(templates.map((template) => [template.id, template]));
  const present = new Set();

  const upgraded = register.map((row) => {
    const id = String(row?.id ?? "");
    const template = byId.get(id);
    if (!template) return row;
    present.add(id);
    return upgradeKidsDraft(row, template);
  });

  const missing = templates.filter((template) => !present.has(template.id));
  const merged = missing.length ? [...upgraded, ...missing] : upgraded;

  /* Phase 22.2 — a Kids draft must never share a storefront route with the
     published product it was migrated from. A KID row whose slug is claimed
     by another record falls back to its permanent Product ID, which is the
     stable route key for these 21 products. */
  const claimedByOthers = new Set(
    merged
      .filter((row) => !byId.has(String(row?.id ?? "")))
      .map((row) => String(row?.slug ?? ""))
      .filter(Boolean)
  );
  const seenKidSlugs = new Set();

  return merged.map((row) => {
    const id = String(row?.id ?? "");
    if (!byId.has(id)) return row;
    const slug = String(row?.slug ?? "");
    const idSlug = id.toLowerCase();
    if (slug && !claimedByOthers.has(slug) && !seenKidSlugs.has(slug)) {
      seenKidSlugs.add(slug);
      return row;
    }
    seenKidSlugs.add(idSlug);
    return { ...row, slug: idSlug };
  });
};

/**
 * Storage-aware sync. A stored version marker guarantees the migration
 * applies at most once per browser version; the pure migration is
 * idempotent, so re-running is harmless.
 */
export const syncProductDraftRecords = (items) => {
  const storage = typeof localStorage !== "undefined" ? localStorage : null;

  let appliedVersion = PRODUCT_DRAFT_SYNC_VERSION;
  if (storage) {
    try {
      appliedVersion = Number(storage.getItem(PRODUCT_DRAFT_SYNC_KEY) || 0);
    } catch {
      /* storage read failure — fall through and re-apply the pure migration */
    }
  }
  if (appliedVersion >= PRODUCT_DRAFT_SYNC_VERSION && storage) {
    return ensureKidsDraftRecords(items);
  }

  const next = ensureKidsDraftRecords(items);

  if (storage) {
    try {
      storage.setItem(PRODUCT_DRAFT_SYNC_KEY, String(PRODUCT_DRAFT_SYNC_VERSION));
    } catch {
      /* storage failure must never reset products */
    }
  }
  return next;
};

export default {
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  kidsDraftRecords,
  ensureKidsDraftRecords,
  syncProductDraftRecords,
};
