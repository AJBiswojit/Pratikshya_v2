/**
 * Deterministic personalization for My PRATIKSHYA.
 * No AI. Ranking uses wishlist, recently viewed, orders and optional preferences.
 */

import { getLiveStorefrontProducts, getProductById } from "../../data/products";
import taxonomyRepository from "../taxonomyRepository";

const countMap = (values) => {
  const map = new Map();
  values.filter(Boolean).forEach((value) => {
    const key = String(value);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
};

const topKeys = (map, limit = 4) =>
  [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([key]) => key);

export const deriveStyleSignals = ({
  wishlistProducts = [],
  recentlyViewed = [],
  orders = [],
  preferences = null,
} = {}) => {
  const categories = [];
  const collections = [];
  const fabrics = [];
  const occasions = [];

  const consider = (product, weight = 1) => {
    if (!product) return;
    for (let i = 0; i < weight; i += 1) {
      categories.push(product.category);
      if (product.collection) collections.push(product.collection);
      if (product.fabric) fabrics.push(product.fabric);
      (product.occasion ?? []).forEach((entry) => occasions.push(entry));
    }
  };

  wishlistProducts.forEach((product) => consider(product, 3));
  recentlyViewed.forEach((product) => consider(product, 2));
  orders.forEach((order) => {
    (order.items ?? []).forEach((item) => {
      const product = item.productId ? getProductById(item.productId) : null;
      if (product) consider(product, 2);
    });
  });

  (preferences?.categories ?? []).forEach((id) => categories.push(id));
  (preferences?.fabrics ?? []).forEach((id) => fabrics.push(id));
  (preferences?.occasions ?? []).forEach((id) => occasions.push(id));

  const categoryCounts = countMap(categories);
  const collectionCounts = countMap(collections);
  const fabricCounts = countMap(fabrics);
  const occasionCounts = countMap(occasions);

  const favouriteCategories = topKeys(categoryCounts, 4)
    .map((id) => ({ id, label: taxonomyRepository.getCategoryLabel(id) }))
    .filter((entry) => entry.label);
  const favouriteCollections = topKeys(collectionCounts, 4).map((name) => ({ id: name, label: name }));
  const favouriteFabrics = topKeys(fabricCounts, 4).map((name) => ({ id: name, label: name }));
  const favouriteOccasions = topKeys(occasionCounts, 4).map((name) => ({ id: name, label: name }));

  const signalCount =
    favouriteCategories.length +
    favouriteCollections.length +
    favouriteFabrics.length +
    favouriteOccasions.length;

  return {
    favouriteCategories,
    favouriteCollections,
    favouriteFabrics,
    favouriteOccasions,
    topCategoryId: favouriteCategories[0]?.id ?? null,
    sufficient: signalCount >= 2,
    reason: favouriteCategories[0]
      ? `Picked around your style.`
      : favouriteFabrics[0]
        ? `Because you explored ${favouriteFabrics[0].label.toLowerCase()}.`
        : "Pieces selected around what you explore.",
    categoryCounts,
    fabricCounts,
    occasionCounts,
  };
};

export const getPersonalizedProducts = ({
  wishlistProducts = [],
  recentlyViewed = [],
  orders = [],
  preferences = null,
  excludeIds = [],
  limit = 4,
} = {}) => {
  const catalogue = getLiveStorefrontProducts();
  const excluded = new Set([
    ...excludeIds,
    ...wishlistProducts.map((p) => p.id),
    ...recentlyViewed.map((p) => p.id),
  ]);

  const signals = deriveStyleSignals({ wishlistProducts, recentlyViewed, orders, preferences });
  const preferredCategories = new Set([
    ...signals.favouriteCategories.map((entry) => entry.id),
    ...(preferences?.categories ?? []),
  ]);
  const preferredFabrics = new Set(
    [...signals.favouriteFabrics.map((entry) => entry.id.toLowerCase()), ...(preferences?.fabrics ?? []).map((v) => v.toLowerCase())]
  );
  const preferredOccasions = new Set([
    ...signals.favouriteOccasions.map((entry) => entry.label),
    ...(preferences?.occasions ?? []),
  ]);

  const score = (product) => {
    let value = product.score ?? 0;
    if (preferredCategories.has(product.category)) value += 40;
    if (product.fabric && preferredFabrics.has(String(product.fabric).toLowerCase())) value += 18;
    if ((product.occasion ?? []).some((entry) => preferredOccasions.has(entry))) value += 14;
    if (product.isFeatured) value += 8;
    if (product.isNew) value += 6;
    return value;
  };

  const ranked = catalogue
    .filter((product) => !excluded.has(product.id))
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .slice(0, limit);

  return { products: ranked, signals };
};

export default { deriveStyleSignals, getPersonalizedProducts };
