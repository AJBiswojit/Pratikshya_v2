/**
 * PRATIKSHYA FASHON — Explore catalogue (Phase 24).
 *
 * The unified product-discovery dataset. Explore never scans files, never
 * invents cards from gallery views, and never keeps a second catalogue.
 *
 *   CANONICAL CATALOGUE → PRODUCT ID → PRODUCT MEDIA → PUBLISHED
 *        → getLiveStorefrontProducts() → dedupe by Product ID → EXPLORE
 *
 * One Product ID is one Explore card. Front / side / back of the same
 * product stay on that one card.
 */

import { getLiveStorefrontProducts } from "./index";
import { queryCatalogue } from "./query";
import { getProductCardMedia, getProductMediaSet } from "../../services/media/productMediaSet";
import offerRepository from "../../services/offers/offerRepository";

/** Products revealed by one press of Load More on Explore. */
export const EXPLORE_PAGE_SIZE = 20;

/** Advertisement cadence — after two desktop rows, then two more. */
export const EXPLORE_PROMO_AFTER = 8;
export const EXPLORE_EDITORIAL_AFTER = 16;

/**
 * Distinct published products Explore may render.
 *
 * Dedupes by permanent Product ID so a multi-view media group can never
 * become three cards. Draft / review / unpublished rows never reach this
 * list because `getLiveStorefrontProducts()` already excludes them.
 */
export const getExploreProducts = (source = null) => {
  const live = Array.isArray(source) ? source : getLiveStorefrontProducts();
  const seen = new Set();
  const unique = [];

  live.forEach((product) => {
    if (!product) return;
    const id = String(product.id || product.productId || "");
    if (!id || seen.has(id)) return;
    seen.add(id);
    unique.push(product);
  });

  return unique;
};

export const getExploreProductIds = (source = null) =>
  getExploreProducts(source).map((product) => String(product.id));

/**
 * Prove Explore completeness against the live storefront source.
 *
 * The page must not claim "all products are shown" merely because the
 * catalogue query ran — the ID sets have to be equal.
 */
export const compareExploreCoverage = (source = null) => {
  const live = Array.isArray(source) ? source : getLiveStorefrontProducts();
  const liveIds = [];
  const seenLive = new Set();
  live.forEach((product) => {
    const id = String(product?.id || "");
    if (!id) return;
    liveIds.push(id);
    seenLive.add(id);
  });

  const exploreIds = getExploreProductIds(live);
  const exploreSet = new Set(exploreIds);

  const liveDupes = liveIds.filter((id, index) => liveIds.indexOf(id) !== index);
  const exploreDupes = exploreIds.filter((id, index) => exploreIds.indexOf(id) !== index);

  return {
    liveCount: seenLive.size,
    exploreCount: exploreSet.size,
    liveIds: [...seenLive].sort(),
    exploreIds: [...exploreSet].sort(),
    missing: [...seenLive].filter((id) => !exploreSet.has(id)).sort(),
    extra: [...exploreSet].filter((id) => !seenLive.has(id)).sort(),
    liveDuplicates: [...new Set(liveDupes)],
    exploreDuplicates: [...new Set(exploreDupes)],
  };
};

/** The same query engine every other listing uses, scoped to Explore. */
export const queryExplore = ({
  filters = {},
  search = "",
  sort,
  source = null,
} = {}) =>
  queryCatalogue({
    source: getExploreProducts(source),
    filters,
    search,
    sort,
  });

export const paginateExplore = (products, page = 1, pageSize = EXPLORE_PAGE_SIZE) => {
  const size = Math.max(1, Number(pageSize) || EXPLORE_PAGE_SIZE);
  const pages = Math.max(1, Number(page) || 1);
  const list = Array.isArray(products) ? products : [];
  return {
    visible: list.slice(0, pages * size),
    hasMore: pages * size < list.length,
    remaining: Math.max(0, list.length - pages * size),
    page: pages,
    pageSize: size,
  };
};

/**
 * Interleave promotional / editorial placements between product groups.
 * Ads never become products and never replace a product card.
 */
export const buildExploreStream = (products = []) => {
  const stream = [];
  (products || []).forEach((product, index) => {
    stream.push({ type: "product", product, key: `product-${product.id}` });
    const shown = index + 1;
    if (shown === EXPLORE_PROMO_AFTER) {
      stream.push({ type: "promo", key: "explore-promo" });
    } else if (shown === EXPLORE_EDITORIAL_AFTER) {
      stream.push({ type: "editorial", key: "explore-editorial" });
    } else if (shown > EXPLORE_EDITORIAL_AFTER && shown % 24 === 0) {
      stream.push({ type: "promo", key: `explore-promo-${shown}` });
    }
  });
  return stream;
};

export const getExploreOffers = () => offerRepository.listCustomerVisible().slice(0, 4);

export const inspectExploreMedia = (product) => {
  const set = getProductMediaSet(product);
  const card = getProductCardMedia(product);
  const owned = (item) => !item?.productId || String(item.productId) === String(product.id);
  return {
    productId: String(product.id),
    primaryId: set.primary?.id || null,
    hoverId: set.hasAlternate ? set.hover?.id || null : null,
    galleryIds: (set.gallery || []).map((item) => item.id).filter(Boolean),
    hasAlternate: Boolean(set.hasAlternate),
    hoverSwaps: Boolean(card.hoverImage),
    primaryOwned: owned(set.primary),
    hoverOwned: !set.hasAlternate || owned(set.hover),
    galleryOwned: (set.gallery || []).every(owned),
    status: set.status,
  };
};

export default {
  EXPLORE_PAGE_SIZE,
  getExploreProducts,
  getExploreProductIds,
  compareExploreCoverage,
  queryExplore,
  paginateExplore,
  buildExploreStream,
  getExploreOffers,
};
