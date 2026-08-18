/** Read-only audit over authored canonical Product Media and managed media records. */

import { existsSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../catalogRepository";
import taxonomyRepository from "../taxonomyRepository";
import { auditMediaExposure } from "./mediaExposure";
import mediaRepository from "./mediaRepository";
import { isCanonicalMediaUrl } from "./mediaPaths";
import { validateMedia } from "./mediaValidation";
import { getProductMediaSet } from "./productMediaSet";
import { resolveCategoryCover, resolveCollectionCover } from "./mediaResolver";

const localExists = (url) => {
  const clean = String(url || "").split("?")[0];
  if (!clean) return false;
  if (/^(?:https?:|data:|blob:)/i.test(clean)) return true;
  if (!clean.startsWith("/")) return false;
  return existsSync(join(process.cwd(), "public", clean.slice(1)));
};

export const auditMediaLibrary = () => {
  const managed = mediaRepository.getAll();
  const products = catalogRepository.all();
  const productSets = products.map((product) => ({ product, set: getProductMediaSet(product) }));
  const missingManagedFiles = managed.filter((media) => {
    const url = media.url || media.optimizedPath;
    return Boolean(url && !media.demoPlaceholder && !localExists(url));
  });
  const missingAuthoredFiles = productSets.flatMap(({ product, set }) =>
    (set.gallery || [])
      .filter((media) => media.src && !localExists(media.src))
      .map((media) => ({ id: media.id || product.id, url: media.src }))
  );
  const categories = taxonomyRepository.activeCategories();
  const collections = taxonomyRepository.activeCollections();
  const validation = validateMedia(managed);

  const productStatuses = productSets.reduce((counts, { set }) => {
    counts[set.status] = (counts[set.status] || 0) + 1;
    return counts;
  }, {});

  return {
    inventory: {
      total: managed.length,
      canonical: managed.filter((media) => isCanonicalMediaUrl(media.url || media.filePath)).length,
      unused: managed.filter(
        (media) => media.mappingStatus === "MAPPED" && media.status !== "ACTIVE" && !media.productId
      ).length,
      duplicates: managed.filter((media) => media.duplicateStatus === "DUPLICATE").length,
      needsReview: managed.filter((media) => media.mappingStatus === "NEEDS_REVIEW").length,
      broken: managed.filter((media) => media.broken).length + missingManagedFiles.length + missingAuthoredFiles.length,
    },
    coverage: {
      productsWithMedia: productSets.filter(({ set }) => Boolean(set.primary)).length,
      productsWithoutMedia: productSets.filter(({ set }) => !set.primary).length,
      categoriesWithMedia: categories.filter((category) => isCanonicalMediaUrl(resolveCategoryCover(category)?.src)).length,
      categoriesTotal: categories.length,
      collectionsWithMedia: collections.filter((collection) => Boolean(resolveCollectionCover(collection)?.src)).length,
      collectionsTotal: collections.length,
    },
    productStatuses,
    missingFiles: [...missingManagedFiles.map((media) => ({ id: media.id, url: media.url })), ...missingAuthoredFiles],
    exposure: auditMediaExposure().inventory,
    validation,
  };
};

export default { auditMediaLibrary };
