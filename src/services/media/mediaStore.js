/**
 * PRATIKSHYA FASHON — Media storage layer.
 *
 * The lowest level of the media system: it reads, normalises and writes the
 * `pratikshya_media` register and nothing else. No product knowledge, no
 * React, no UI. Keeping it this thin is what lets both the product access
 * layer and the repository read media without importing each other.
 *
 * Corrupted storage is never allowed to crash the application: a broken
 * payload falls back to the seeded register, and unusable rows are dropped
 * rather than rendered.
 *
 * DEMO / FRONTEND ONLY. A real media service replaces this file; the record
 * shape it returns is the contract the rest of the house is written against.
 */

import {
  DUPLICATE_STATUS,
  MAPPING_STATUS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  defaultRoleForType,
  isValidUsageRole,
} from "../../config/mediaTypes";
import { SEED_MEDIA } from "../../data/media/seedMedia";
import { getIngestedRecords } from "./ingestedMedia";
import { resolveLegacyMediaUrl } from "./mediaPaths";

/** Namespaced, in line with every other PRATIKSHYA FASHON storage key. */
export const MEDIA_STORAGE_KEY = "pratikshya_media";

/** Broadcast so every open surface re-reads after a write. */
export const MEDIA_CHANGED_EVENT = "pratikshya-media-changed";

/**
 * A preview URL minted by the browser for a chosen file. It is valid for
 * this tab only, so it must never be written to the register as though it
 * were a production address.
 */
export const isEphemeralUrl = (url) =>
  typeof url === "string" && (url.startsWith("blob:") || url.startsWith("data:"));

const nowIso = () => new Date().toISOString();

const cleanString = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
};

const cleanList = (value) =>
  Array.isArray(value) ? value.map((entry) => cleanString(entry)).filter(Boolean) : [];

/** `pm-lx8f2k-417` — readable, sortable enough, and unique in practice. */
export const createMediaId = () =>
  `pm-${Date.now().toString(36)}-${Math.floor(Math.random() * 9999)
    .toString(36)
    .padStart(3, "0")}`;

/**
 * Brings any candidate row up to the full record shape.
 *
 * Returns `null` for anything that cannot be a media record at all, which
 * is how a corrupted or half-written row is discarded.
 */
export const normaliseMedia = (entry) => {
  if (!entry || typeof entry !== "object") return null;

  const id = cleanString(entry.id);
  if (!id) return null;

  const type = entry.type === MEDIA_TYPES.VIDEO ? MEDIA_TYPES.VIDEO : MEDIA_TYPES.IMAGE;

  /* An ephemeral preview address is dropped on the way in and on the way
     out — the record survives as metadata with a house fallback plate. */
  const url = isEphemeralUrl(entry.url) ? "" : resolveLegacyMediaUrl(cleanString(entry.url));
  const poster = isEphemeralUrl(entry.poster) ? "" : resolveLegacyMediaUrl(cleanString(entry.poster));
  const thumbnail = isEphemeralUrl(entry.thumbnail) ? "" : resolveLegacyMediaUrl(cleanString(entry.thumbnail));

  const productId = cleanString(entry.productId) || null;
  const placement = cleanString(entry.placement) || null;

  let scope = entry.scope;
  if (scope !== MEDIA_SCOPES.PRODUCT && scope !== MEDIA_SCOPES.MARKETING) {
    scope = productId
      ? MEDIA_SCOPES.PRODUCT
      : placement
        ? MEDIA_SCOPES.MARKETING
        : MEDIA_SCOPES.UNASSIGNED;
  }
  if (scope === MEDIA_SCOPES.PRODUCT && !productId) scope = MEDIA_SCOPES.UNASSIGNED;
  if (scope === MEDIA_SCOPES.MARKETING && !placement) scope = MEDIA_SCOPES.UNASSIGNED;

  const status = Object.values(MEDIA_STATUS).includes(entry.status)
    ? entry.status
    : MEDIA_STATUS.DRAFT;

  const role =
    scope === MEDIA_SCOPES.PRODUCT
      ? Object.values(PRODUCT_MEDIA_ROLES).includes(entry.role)
        ? entry.role
        : defaultRoleForType(type)
      : null;

  const sortOrder = Number.isFinite(Number(entry.sortOrder)) ? Number(entry.sortOrder) : 0;

  return {
    /* Identity */
    id,
    type,

    /* Address — `url` empty means "record without a file behind it yet". */
    url,
    poster,
    thumbnail,

    /* Description */
    title: cleanString(entry.title, "Untitled media"),
    alt: cleanString(entry.alt),
    caption: cleanString(entry.caption),
    tags: cleanList(entry.tags),

    /* Placement */
    scope,
    status,
    productId,
    role,
    sortOrder,
    placement,
    campaign: cleanString(entry.campaign) || null,
    campaignStart: cleanString(entry.campaignStart) || null,
    campaignEnd: cleanString(entry.campaignEnd) || null,
    section: cleanString(entry.section) || null,

    /* Provenance */
    source: cleanString(entry.source, "URL"),
    fileName: cleanString(entry.fileName) || null,
    fileSize: Number.isFinite(Number(entry.fileSize)) ? Number(entry.fileSize) : null,
    uploadedBy: cleanString(entry.uploadedBy) || null,
    uploadedByEmployeeId: cleanString(entry.uploadedByEmployeeId) || null,
    uploadedByType:
      entry.uploadedByType === "ADMIN"
        ? "ADMIN"
        : entry.uploadedByType === "EMPLOYEE"
          ? "EMPLOYEE"
          : entry.uploadedByEmployeeId
            ? "EMPLOYEE"
            : "ADMIN",
    reviewStatus: cleanString(entry.reviewStatus) || null,
    reviewedBy: cleanString(entry.reviewedBy) || null,
    reviewedAt: cleanString(entry.reviewedAt) || null,
    rejectionReason: cleanString(entry.rejectionReason) || null,
    /** True when the file was only ever previewed in a browser session. */
    demoPlaceholder: Boolean(entry.demoPlaceholder),

    /**
     * Reserved for a later phase. Structured now so automatic tagging or
     * captioning can be added without a migration — nothing writes it yet.
     */
    ai: {
      tags: cleanList(entry.ai?.tags),
      caption: cleanString(entry.ai?.caption) || null,
      analysedAt: cleanString(entry.ai?.analysedAt) || null,
    },

    /* Phase 21.4 — ingestion provenance. Optional on older records. */
    originalPath: cleanString(entry.originalPath) || null,
    optimizedPath: cleanString(entry.optimizedPath) || null,
    originalFilename: cleanString(entry.originalFilename) || null,
    currentFilename: cleanString(entry.currentFilename) || null,
    checksum: cleanString(entry.checksum) || null,
    categoryId: cleanString(entry.categoryId) || null,
    subcategoryId: cleanString(entry.subcategoryId) || null,
    collectionId: cleanString(entry.collectionId) || null,
    variantId: cleanString(entry.variantId) || null,
    usageRoles: cleanList(entry.usageRoles).filter(isValidUsageRole),
    mappingStatus: Object.values(MAPPING_STATUS).includes(entry.mappingStatus)
      ? entry.mappingStatus
      : null,
    mappingMethod: cleanString(entry.mappingMethod) || null,
    mappingNote: cleanString(entry.mappingNote) || null,
    duplicateStatus: Object.values(DUPLICATE_STATUS).includes(entry.duplicateStatus)
      ? entry.duplicateStatus
      : null,
    duplicateOf: cleanString(entry.duplicateOf) || null,
    featured: Boolean(entry.featured),
    width: Number.isFinite(Number(entry.width)) ? Number(entry.width) : null,
    height: Number.isFinite(Number(entry.height)) ? Number(entry.height) : null,
    aspectRatio: Number.isFinite(Number(entry.aspectRatio)) ? Number(entry.aspectRatio) : null,
    ingested: Boolean(entry.ingested),
    large: Boolean(entry.large),
    lowResolution: Boolean(entry.lowResolution),
    broken: Boolean(entry.broken),

    /* Phase 21.6 — normalized naming & grouping */
    groupKey: cleanString(entry.groupKey) || null,
    view: cleanString(entry.view) || null,
    viewScore: Number.isFinite(Number(entry.viewScore)) ? Number(entry.viewScore) : null,
    isStandalone: entry.isStandalone !== undefined ? Boolean(entry.isStandalone) : null,
    filePath:
      resolveLegacyMediaUrl(
        cleanString(entry.filePath) || cleanString(entry.optimizedPath) || cleanString(entry.url)
      ) || null,

    /* Lifecycle */
    createdAt: cleanString(entry.createdAt, nowIso()),
    updatedAt: cleanString(entry.updatedAt, cleanString(entry.createdAt, nowIso())),
  };
};

/** Drops duplicate identifiers, keeping the first occurrence. */
export const dedupeMedia = (items) => {
  const seen = new Set();
  const unique = [];
  items.forEach((item) => {
    if (!item || seen.has(item.id)) return;
    seen.add(item.id);
    unique.push(item);
  });
  return unique;
};

let memoryMedia = null;

/**
 * The seeded register is the Phase 12 house seed *plus* the Phase 21.4
 * ingested library, so every customer-facing surface reads one list. The
 * ingested adapter turns the build-time manifest into the same record shape
 * `normaliseMedia` already accepts; product-slotted assets become PRODUCT
 * scope, everything else stays UNASSIGNED but remains queryable by
 * categoryId / collectionId / usageRoles through the resolver.
 */
const seeded = () =>
  dedupeMedia([...SEED_MEDIA, ...getIngestedRecords()].map(normaliseMedia).filter(Boolean));

/**
 * Reconcile a persisted register with the canonical seed.
 *
 * The seeded register (Phase 12 seed + Phase 21.4 ingested library) is the
 * single source of truth for baseline media. A browser that holds an OLDER
 * persisted copy in localStorage — snapshotted before a library asset was
 * added or corrected in the manifest — must not silently shadow the new
 * records. Otherwise the resolver (and therefore the homepage hero) keeps
 * serving stale data even though the manifest on disk is correct.
 *
 * We merge the persisted register UNDER the canonical seed:
 *   · canonical seed records that are missing from the persisted copy are
 *     added back (this is what restores hero001–hero005 after a library
 *     update), and
 *   · any record the operator created or edited — one that is not part of
 *     the canonical seed — is preserved as-is.
 *
 * `dedupeMedia` keeps the first occurrence by id, so the persisted copy wins
 * on id collision. That deliberately protects operator edits to existing
 * records; the only records we ever re-introduce are ones the persisted
 * register is missing entirely. Returns a fresh, de-duplicated array and
 * never mutates the inputs.
 */
const reconcileWithCanonical = (persisted) => {
  const canonical = seeded();
  return dedupeMedia([...persisted, ...canonical]);
};

/**
 * Persist the register, tolerating storage that is unavailable (private
 * mode / quota). The in-memory mirror still holds, so the session continues.
 */
const persistMedia = (items) => {
  try {
    window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* Non-fatal — the register stays in memory for this session. */
  }
};

/**
 * Every media record, normalised and de-duplicated.
 *
 * An empty or unreadable register seeds itself from the house media so the
 * admin surfaces are never a blank page on a fresh browser.
 *
 * A persisted register that is out of date relative to the canonical seed
 * (e.g. it predates a library addition such as the hero001–hero005
 * replacement) is reconciled on read so stale storage can never shadow the
 * current manifest. The reconciled register is persisted once, which means a
 * browser carrying an older snapshot self-heals on the next load — no
 * manual cache clear required.
 */
export const readMedia = () => {
  if (typeof window === "undefined") {
    if (!memoryMedia) memoryMedia = seeded();
    return memoryMedia;
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(MEDIA_STORAGE_KEY));
    if (!Array.isArray(stored)) {
      const seededOnce = seeded();
      memoryMedia = seededOnce;
      persistMedia(seededOnce);
      return memoryMedia;
    }
    const persisted = dedupeMedia(stored.map(normaliseMedia).filter(Boolean));
    if (!persisted.length) {
      const seededOnce = seeded();
      memoryMedia = seededOnce;
      persistMedia(seededOnce);
      return memoryMedia;
    }
    const reconciled = reconcileWithCanonical(persisted);
    /* Only write back when something was actually added (a stale snapshot
       has been repaired). Once reconciled, the persisted copy matches the
       canonical baseline and no further writes are needed. */
    if (reconciled.length !== persisted.length) {
      memoryMedia = reconciled;
      persistMedia(reconciled);
    } else {
      memoryMedia = reconciled;
    }
    return memoryMedia;
  } catch {
    return memoryMedia || seeded();
  }
};

/**
 * Persists the register and tells the application it changed.
 *
 * Persistence is an enhancement: if storage is unavailable the write is
 * skipped, the event still fires, and the session continues in memory.
 */
export const writeMedia = (items) => {
  const clean = dedupeMedia((Array.isArray(items) ? items : []).map(normaliseMedia).filter(Boolean));
  memoryMedia = clean;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MEDIA_STORAGE_KEY, JSON.stringify(clean));
    } catch {
      /* Quota or private mode — the register stays in memory for this session. */
    }
    window.dispatchEvent(new Event(MEDIA_CHANGED_EVENT));
  }
  return clean;
};

/** Drops the in-memory register so the next read reseeds (seed + ingested). */
export const clearMediaMemory = () => {
  memoryMedia = null;
};

export default { readMedia, writeMedia, normaliseMedia, createMediaId, MEDIA_STORAGE_KEY };
