/**
 * PRATIKSHYA AI MIRROR — customer-safe service helpers.
 *
 * Catalogue truth remains in `catalogRepository` / `data/products`; this
 * module only derives a mirror-safe view and stores lightweight, customer-
 * scoped UI history. It never stores photos, frames or generated images.
 */

import catalogRepository from "../catalogRepository";
import { getLiveStorefrontProducts } from "../../data/products";
import { getProductCoverImage } from "../media/productMediaSource";
import { getProductCover } from "../media/mediaRepository";
import { readStorage, writeStorage } from "../../utils/shopping";
import {
  getVirtualTryOnCategoryKey,
  getVirtualTryOnCategoryLabel,
  isVirtualTryOnEligibleProduct,
} from "./aiMirrorEligibility";

export const AI_MIRROR_HISTORY_PREFIX = "pratikshya_ai_mirror_recent_";
export const AI_MIRROR_HISTORY_LIMIT = 8;

const historyKey = (customerId) => `${AI_MIRROR_HISTORY_PREFIX}${String(customerId || "guest")}`;

/**
 * Reads live, customer-visible products through the existing catalogue
 * access layer. The repository touch makes this function align with current
 * shared catalogue data while `getLiveStorefrontProducts` preserves the
 * storefront's existing published/taxonomy visibility rules.
 */
export const getVirtualTryOnProducts = () => {
  const repositoryProducts = new Set(catalogRepository.all().map((product) => String(product.id)));

  return getLiveStorefrontProducts()
    .filter((product) => repositoryProducts.has(String(product.id)))
    .filter(isVirtualTryOnEligibleProduct)
    .filter(hasVirtualTryOnUsableMedia)
    .map((product) => ({
      ...product,
      mirrorCategoryKey: getVirtualTryOnCategoryKey(product),
      mirrorCategoryLabel: getVirtualTryOnCategoryLabel(product),
    }))
    .sort((left, right) => {
      const merchandisingPriority = (product) =>
        (product.isFeatured ? 2 : 0) + (product.isNew ? 1 : 0);
      return (
        merchandisingPriority(right) - merchandisingPriority(left) ||
        String(left.id).localeCompare(String(right.id))
      );
    });
};

/**
 * Product media follows the Phase 12 rule: active repository cover first,
 * then the existing authored catalogue plate. Pending, rejected and archived
 * records never reach `getProductCoverImage`, so the mirror never uses them.
 */
export const hasVirtualTryOnUsableMedia = (product) => {
  if (!product?.id) return false;
  const sourceRecord = catalogRepository.find(product.id);
  const activeCover = getProductCover(product.id);
  /** An authored plate is valid; managed media must be active before it is valid. */
  return Boolean(sourceRecord?.image || activeCover?.url);
};

export const getVirtualTryOnProductImage = (product) => {
  if (!hasVirtualTryOnUsableMedia(product)) return null;
  const image = getProductCoverImage(product);
  if (!image) return null;
  if (typeof image === "object" && image.src) return image;
  return null;
};

const normaliseHistory = (value) => {
  if (!Array.isArray(value)) return [];

  const seen = new Set();
  return value
    .filter((entry) => entry && typeof entry.productId === "string")
    .map((entry) => ({
      productId: entry.productId,
      triedAt: Number(entry.triedAt) || 0,
    }))
    .sort((a, b) => b.triedAt - a.triedAt)
    .filter((entry) => {
      if (seen.has(entry.productId)) return false;
      seen.add(entry.productId);
      return true;
    })
    .slice(0, AI_MIRROR_HISTORY_LIMIT);
};

/** Lightweight history only: product ids and timestamps, never media. */
export const getRecentTryOns = (customerId) =>
  normaliseHistory(readStorage(historyKey(customerId), []));

/** Moves a product to the top of the customer's recent demo try-ons. */
export const recordRecentTryOn = (customerId, productId) => {
  if (!productId) return getRecentTryOns(customerId);

  const next = [
    { productId: String(productId), triedAt: Date.now() },
    ...getRecentTryOns(customerId).filter((entry) => entry.productId !== String(productId)),
  ].slice(0, AI_MIRROR_HISTORY_LIMIT);

  writeStorage(historyKey(customerId), next);
  return next;
};

export default {
  getVirtualTryOnProducts,
  getVirtualTryOnProductImage,
  hasVirtualTryOnUsableMedia,
  getRecentTryOns,
  recordRecentTryOn,
};
