/**
 * PRATIKSHYA FASHON — Unified media library audit (Phase 21.11).
 *
 * Read-only measurement over the existing register + resolver. This is not
 * a second media system: it asks mediaRepository / mediaResolver /
 * productMediaSet for the same answers the storefront uses.
 */

import { existsSync } from "node:fs";
import { join } from "node:path";

import { getLiveStorefrontProducts } from "../../data/products";
import taxonomyRepository from "../taxonomyRepository";
import { auditMediaExposure } from "./mediaExposure";
import mediaRepository from "./mediaRepository";
import {
  HOUSE_PLATE_MIGRATION,
  isCanonicalMediaUrl,
  isHousePlateUrl,
  isIngestedPhotographyUrl,
  isLegacyImagesUrl,
} from "./mediaPaths";
import { validateMedia } from "./mediaValidation";
import { getProductMediaSet } from "./productMediaSet";

const publicFileOf = (url) => {
  const clean = String(url || "").split("?")[0];
  if (!clean.startsWith("/")) return null;
  return join(process.cwd(), "public", clean.replace(/^\//, ""));
};

const localExists = (url) => {
  if (!url) return false;
  if (/^https?:\/\//i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return true;
  const abs = publicFileOf(url);
  return abs ? existsSync(abs) : false;
};

export const auditMediaLibrary = () => {
  const all = mediaRepository.getAll();
  const ingested = all.filter((media) => media.ingested);
  const house = all.filter(
    (media) =>
      Boolean(media.house) ||
      (media.tags || []).includes("house") ||
      media.source === "House artwork" ||
      isHousePlateUrl(media.url || media.optimizedPath)
  );
  const canonical = all.filter((media) => isCanonicalMediaUrl(media.url || media.optimizedPath || media.filePath));
  const legacy = all.filter((media) => isLegacyImagesUrl(media.url || media.originalPath || media.optimizedPath));
  const migrated = HOUSE_PLATE_MIGRATION.filter((entry) =>
    all.some((media) => media.id === entry.id && isCanonicalMediaUrl(media.url || media.optimizedPath))
  );
  const unused = all.filter(
    (media) => media.mappingStatus === "MAPPED" && media.status !== "ACTIVE" && !media.productId
  );
  const duplicates = all.filter((media) => media.duplicateStatus === "DUPLICATE");
  const needsReview = all.filter((media) => media.mappingStatus === "NEEDS_REVIEW");
  const brokenRecords = all.filter((media) => media.broken);
  const missingFiles = all.filter((media) => {
    const url = media.url || media.optimizedPath;
    if (!url || media.demoPlaceholder) return false;
    if (/^https?:\/\//i.test(url)) return false;
    return !localExists(url);
  });

  const products = getLiveStorefrontProducts();
  const productsWithMedia = [];
  const productsWithoutMedia = [];
  products.forEach((product) => {
    const set = getProductMediaSet(product);
    if (set.primary) productsWithMedia.push(product.id);
    else productsWithoutMedia.push(product.id);
  });

  const categories = taxonomyRepository.activeCategories();
  const collections = taxonomyRepository.activeCollections();
  const categoriesWithMedia = categories.filter((category) =>
    all.some((media) => media.categoryId === category.id && isIngestedPhotographyUrl(media.url))
  );
  const collectionsWithMedia = collections.filter((collection) =>
    all.some((media) => media.collectionId === collection.id && isIngestedPhotographyUrl(media.url))
  );

  const exposure = auditMediaExposure();
  const validation = validateMedia(all);

  const productStatuses = products.reduce((acc, product) => {
    const status = getProductMediaSet(product).status;
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});

  return {
    inventory: {
      total: all.length,
      canonical: canonical.length,
      ingested: ingested.length,
      house: house.length,
      legacy: legacy.length,
      migrated: migrated.length,
      unused: unused.length,
      duplicates: duplicates.length,
      needsReview: needsReview.length,
      broken: brokenRecords.length + missingFiles.length,
    },
    coverage: {
      productsWithMedia: productsWithMedia.length,
      productsWithoutMedia: productsWithoutMedia.length,
      categoriesWithMedia: categoriesWithMedia.length,
      categoriesTotal: categories.length,
      collectionsWithMedia: collectionsWithMedia.length,
      collectionsTotal: collections.length,
    },
    productStatuses,
    missingFiles: missingFiles.map((media) => ({
      id: media.id,
      url: media.url,
      fileName: media.currentFilename || media.fileName,
    })),
    housePlates: HOUSE_PLATE_MIGRATION.map((entry) => ({
      ...entry,
      resolved: all.some((media) => media.id === entry.id && isCanonicalMediaUrl(media.url)),
    })),
    exposure: exposure.inventory,
    validation,
  };
};

export default { auditMediaLibrary };
