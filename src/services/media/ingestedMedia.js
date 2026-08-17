/**
 * PRATIKSHYA FASHON — Ingested media adapter (Phase 21.4 + 21.6).
 *
 * Turns the build-time ingestion manifest into the same record shape the
 * media store already understands. Phase 21.6 extends records with the
 * deterministic filename parser (groupKey, view) so the storefront can
 * build product galleries from the new naming convention.
 */

import {
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
} from "../../config/mediaTypes";
import ingestedManifest from "../../data/media/ingestedManifest.json";
import { parseMediaFilename, getViewOrderScore } from "./mediaNaming.js";
import { resolveLegacyMediaUrl } from "./mediaPaths.js";

const INGESTED_AT = "2026-08-12T12:00:00.000Z";

const publicUrl = (rel) => {
  if (!rel) return "";
  const prefixed = rel.startsWith("/") ? rel : `/${rel}`;
  return resolveLegacyMediaUrl(prefixed) || prefixed;
};

const titleFrom = (asset) => {
  if (asset.title) return asset.title;
  if (asset.house) return asset.originalFilename?.replace(/\.[a-z0-9]+$/i, "") || "House plate";
  const parts = [
    asset.gender,
    asset.subcategoryName || asset.categoryId,
    asset.productId,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : asset.currentFilename || "Ingested media";
};

const altFrom = (asset) => {
  if (asset.alt) return asset.alt;
  const category = asset.subcategoryName || asset.categoryId || "atelier";
  return `PRATIKSHYA FASHON ${String(category).replace(/-/g, " ")}`;
};

/**
 * One ingested asset → a media-register record.
 * Extended in Phase 21.6 with normalized fields: groupKey, view, filePath
 */
export const assetToRecord = (asset) => {
  if (!asset?.id) return null;
  const url = publicUrl(asset.optimizedPath || asset.originalPath);
  const productId = asset.productId || null;
  const placement = asset.placement || null;
  const role = productId
    ? asset.role === PRODUCT_MEDIA_ROLES.COVER
      ? PRODUCT_MEDIA_ROLES.COVER
      : PRODUCT_MEDIA_ROLES.GALLERY
    : null;

  // Phase 21.6: parse filename for grouping
  const parsed = parseMediaFilename(asset.currentFilename || asset.originalFilename || asset.optimizedPath || "");
  const groupKey = asset.groupKey || parsed?.groupKey || null;
  const view = asset.view || parsed?.view || null;
  const isStandalone = parsed?.isStandalone ?? true;
  const viewScore = getViewOrderScore(view);

  return {
    id: asset.id,
    type: MEDIA_TYPES.IMAGE,
    url,
    poster: "",
    thumbnail: url,
    title: titleFrom(asset),
    alt: altFrom(asset),
    caption: asset.mappingNote || "",
    tags: [
      "ingested",
      asset.categoryId,
      asset.subcategoryName,
      asset.collectionId,
      asset.house ? "house" : null,
      groupKey ? `group:${groupKey}` : null,
      view ? `view:${view}` : null,
    ].filter(Boolean),
    scope: productId
      ? MEDIA_SCOPES.PRODUCT
      : placement
        ? MEDIA_SCOPES.MARKETING
        : MEDIA_SCOPES.UNASSIGNED,
    status: asset.broken || asset.duplicateStatus === "DUPLICATE" ? MEDIA_STATUS.DRAFT : MEDIA_STATUS.ACTIVE,
    productId,
    role,
    sortOrder:
      placement && Number.isFinite(Number(asset.sortOrder))
        ? Number(asset.sortOrder)
        : Number(asset.sortOrder) || viewScore,
    placement,
    campaign: null,
    campaignStart: null,
    campaignEnd: null,
    section: null,
    source: asset.house ? "House artwork" : "Ingested library",
    fileName: asset.currentFilename || asset.originalFilename || null,
    fileSize: Number(asset.optimizedSizeBytes ?? asset.originalSizeBytes) || null,
    uploadedBy: "Media ingestion",
    uploadedByEmployeeId: null,
    uploadedByType: "ADMIN",
    reviewStatus: asset.mappingStatus === "UNMAPPED" || asset.mappingStatus === "NEEDS_REVIEW" ? "PENDING" : "APPROVED",
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    demoPlaceholder: false,
    originalPath: asset.originalPath || null,
    optimizedPath: asset.optimizedPath || null,
    originalFilename: asset.originalFilename || null,
    currentFilename: asset.currentFilename || null,
    checksum: asset.checksum || null,
    categoryId: asset.categoryId || null,
    subcategoryId: asset.subcategoryName || null,
    collectionId: asset.collectionId || null,
    variantId: asset.variantId || null,
    usageRoles: Array.isArray(asset.usageRoles) ? asset.usageRoles : [],
    mappingStatus: asset.mappingStatus || null,
    mappingMethod: asset.mappingMethod || null,
    mappingNote: asset.mappingNote || null,
    duplicateStatus: asset.duplicateStatus || "UNIQUE",
    duplicateOf: asset.duplicateOf || null,
    featured: Boolean(asset.featured),
    width: Number(asset.width) || null,
    height: Number(asset.height) || null,
    aspectRatio: Number(asset.aspectRatio) || null,
    ingested: true,
    large: Boolean(asset.large),
    lowResolution: Boolean(asset.lowResolution),
    broken: Boolean(asset.broken),
    createdAt: INGESTED_AT,
    updatedAt: INGESTED_AT,
    // Phase 21.6 normalized fields
    groupKey,
    view,
    viewScore,
    isStandalone,
    filePath: asset.optimizedPath ? publicUrl(asset.optimizedPath) : url,
  };
};

let cachedRecords = null;
let cachedFingerprint = null;

export const getIngestedManifest = () => ingestedManifest || { assets: [] };

export const getIngestedRecords = () => {
  const assets = Array.isArray(ingestedManifest?.assets) ? ingestedManifest.assets : [];
  const fingerprint = `${assets.length}:${ingestedManifest?.generatedAt || ""}`;
  if (cachedRecords && cachedFingerprint === fingerprint) return cachedRecords;
  cachedRecords = assets.map(assetToRecord).filter(Boolean);
  cachedFingerprint = fingerprint;
  return cachedRecords;
};

export const getIngestionReport = () => ingestedManifest?.report ?? null;

export default {
  getIngestedManifest,
  getIngestedRecords,
  getIngestionReport,
  assetToRecord,
};
