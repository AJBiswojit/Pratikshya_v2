/**
 * Deterministic, frontend-only recommendation utilities.
 *
 * The scorer is deliberately transparent: shared attributes establish
 * relevance and catalogue reception breaks ties. These functions are the
 * seam a future recommendation service can replace without touching the PDP.
 */

import { products as catalogue } from "./index";

const overlap = (left = [], right = []) => left.filter((value) => right.includes(value)).length;
const reception = (product) => (product.rating ?? 0) * 2 + Math.min(product.reviewCount ?? 0, 250) / 100;
const withoutProduct = (product, source) => source.filter((candidate) => candidate.id !== product.id);
const takeRanked = (source, score, limit) =>
  [...source]
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .slice(0, limit);

export function getRelatedProducts(product, { source = catalogue, limit = 4 } = {}) {
  if (!product) return [];
  const candidates = withoutProduct(product, source).filter(
    (candidate) => candidate.category === product.category
  );

  return takeRanked(
    candidates,
    (candidate) =>
      (candidate.subcategory === product.subcategory ? 12 : 0) +
      (candidate.collection === product.collection ? 7 : 0) +
      (candidate.fabric === product.fabric ? 6 : 0) +
      (candidate.material === product.material ? 3 : 0) +
      overlap(candidate.occasion, product.occasion) * 4 +
      overlap(candidate.colors, product.colors) * 2 +
      reception(candidate),
    limit
  );
}

export function getCompleteTheLook(
  product,
  { source = catalogue, limit = 3, exclude = [] } = {}
) {
  if (!product) return [];
  const excluded = new Set(exclude.map((item) => (typeof item === "string" ? item : item.id)));
  const candidates = withoutProduct(product, source).filter(
    (candidate) =>
      !excluded.has(candidate.id) &&
      Boolean(product.department) &&
      candidate.department === product.department
  );

  const ranked = takeRanked(
    candidates,
    (candidate) =>
      (candidate.category !== product.category ? 8 : 0) +
      (candidate.subcategory !== product.subcategory ? 4 : 0) +
      overlap(candidate.occasion, product.occasion) * 8 +
      overlap(candidate.colors, product.colors) * 3 +
      (candidate.collection === product.collection ? 4 : 0) +
      reception(candidate),
    Math.max(limit * 3, limit)
  );

  // Prefer a composed edit over three near-identical accessories.
  const selected = [];
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.category === candidate.category) || selected.length + 1 === limit) {
      selected.push(candidate);
    }
  }
  for (const candidate of ranked) {
    if (selected.length >= limit) break;
    if (!selected.some((item) => item.id === candidate.id)) selected.push(candidate);
  }
  return selected;
}

export function getRecommendedProducts(
  product,
  { source = catalogue, limit = 4, exclude = [] } = {}
) {
  if (!product) return [];
  const excluded = new Set([product.id, ...exclude.map((item) => (typeof item === "string" ? item : item.id))]);
  const candidates = source.filter((candidate) => !excluded.has(candidate.id));

  return takeRanked(
    candidates,
    (candidate) => {
      const ratio = Math.min(candidate.price, product.price) / Math.max(candidate.price, product.price);
      return (
        (candidate.category === product.category ? 9 : 0) +
        (candidate.gender === product.gender ? 4 : 0) +
        overlap(candidate.occasion, product.occasion) * 6 +
        overlap(candidate.colors, product.colors) * 2 +
        ratio * 8 +
        reception(candidate)
      );
    },
    limit
  );
}

export function getProductRecommendations(product, options = {}) {
  const related = getRelatedProducts(product, options);
  const completeTheLook = getCompleteTheLook(product, { ...options, exclude: related });
  const recommended = getRecommendedProducts(product, {
    ...options,
    exclude: [...related, ...completeTheLook],
  });

  return { related, completeTheLook, recommended };
}

/**
 * The bag's cross-sell edit.
 *
 * Deterministic, catalogue-only mock logic: each piece in the bag proposes
 * same-department companion candidates, pools and
 * ranked, and anything already in the bag is excluded. The same seam a
 * future recommendation service would replace.
 */
export function getCartRecommendations(cartProducts, { limit = 4 } = {}) {
  if (!cartProducts?.length) return [];
  const exclude = cartProducts.map((product) => product.id);
  const scores = new Map();
  const byId = new Map();

  cartProducts.forEach((product) => {
    getCompleteTheLook(product, { limit: limit * 2, exclude }).forEach(
      (candidate, index) => {
        byId.set(candidate.id, candidate);
        scores.set(
          candidate.id,
          (scores.get(candidate.id) ?? 0) + (limit * 2 - index)
        );
      }
    );
  });

  const ranked = [...byId.values()].sort(
    (a, b) => scores.get(b.id) - scores.get(a.id) || a.id.localeCompare(b.id)
  );

  // Fill any remaining places from the wider recommendation pool.
  if (ranked.length < limit) {
    const chosen = new Set([...exclude, ...ranked.map((product) => product.id)]);
    getRecommendedProducts(cartProducts[0], {
      limit: limit - ranked.length,
      exclude: [...chosen],
    }).forEach((candidate) => ranked.push(candidate));
  }

  return ranked.slice(0, limit);
}

