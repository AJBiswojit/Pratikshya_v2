/**
 * PRATIKSHYA FASHON — Recently viewed (Phase 19).
 *
 * Isolated namespace. Stores only productId + timestamp.
 * Customer-scoped when authenticated; guest namespace otherwise.
 * On login, guest history merges into the customer history.
 */

import { getProductById } from "../../data/products";
import { readStorage, writeStorage } from "../../utils/shopping";

export const RECENTLY_VIEWED_STORAGE_KEY = "pratikshya_recently_viewed";
export const RECENTLY_VIEWED_CHANGED_EVENT = "pratikshya-recently-viewed-changed";
export const RECENTLY_VIEWED_LIMIT = 12;

const GUEST_SCOPE = "guest";

const announce = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RECENTLY_VIEWED_CHANGED_EVENT));
  }
};

const emptyStore = () => ({ version: 1, scopes: {} });

const readStore = () => {
  const stored = readStorage(RECENTLY_VIEWED_STORAGE_KEY, null);
  if (!stored || typeof stored !== "object" || !stored.scopes || typeof stored.scopes !== "object") {
    return emptyStore();
  }
  return { version: 1, scopes: stored.scopes };
};

const writeStore = (store) => {
  writeStorage(RECENTLY_VIEWED_STORAGE_KEY, store);
  announce();
};

const sanitiseList = (list) => {
  if (!Array.isArray(list)) return [];
  const seen = new Set();
  const cleaned = [];
  list.forEach((entry) => {
    if (!entry || typeof entry !== "object") return;
    const productId = typeof entry.productId === "string" ? entry.productId : null;
    const viewedAt = Number(entry.viewedAt);
    if (!productId || !Number.isFinite(viewedAt)) return;
    if (!getProductById(productId)) return;
    if (seen.has(productId)) return;
    seen.add(productId);
    cleaned.push({ productId, viewedAt });
  });
  return cleaned.sort((a, b) => b.viewedAt - a.viewedAt).slice(0, RECENTLY_VIEWED_LIMIT);
};

const scopeKey = (customerId) => (customerId ? String(customerId) : GUEST_SCOPE);

export const listRecentlyViewed = (customerId = null) => {
  const store = readStore();
  return sanitiseList(store.scopes[scopeKey(customerId)]);
};

export const recordRecentlyViewed = (productId, customerId = null) => {
  const id = typeof productId === "string" ? productId : productId?.id;
  if (!id || !getProductById(id)) return listRecentlyViewed(customerId);

  const store = readStore();
  const key = scopeKey(customerId);
  const next = [
    { productId: id, viewedAt: Date.now() },
    ...sanitiseList(store.scopes[key]).filter((entry) => entry.productId !== id),
  ].slice(0, RECENTLY_VIEWED_LIMIT);

  store.scopes[key] = next;
  writeStore(store);
  return next;
};

export const resolveRecentlyViewedProducts = (customerId = null, limit = 8) =>
  listRecentlyViewed(customerId)
    .map((entry) => getProductById(entry.productId))
    .filter(Boolean)
    .slice(0, limit);

/**
 * Merge guest browsing into the authenticated customer history.
 * Guest entries that the customer already has are skipped.
 */
export const mergeGuestRecentlyViewed = (customerId) => {
  if (!customerId) return listRecentlyViewed(customerId);
  const store = readStore();
  const guest = sanitiseList(store.scopes[GUEST_SCOPE]);
  if (!guest.length) return sanitiseList(store.scopes[scopeKey(customerId)]);

  const customer = sanitiseList(store.scopes[scopeKey(customerId)]);
  const seen = new Set(customer.map((entry) => entry.productId));
  const merged = [...customer];
  guest.forEach((entry) => {
    if (seen.has(entry.productId)) return;
    seen.add(entry.productId);
    merged.push(entry);
  });

  store.scopes[scopeKey(customerId)] = sanitiseList(merged);
  store.scopes[GUEST_SCOPE] = [];
  writeStore(store);
  return store.scopes[scopeKey(customerId)];
};

export default {
  listRecentlyViewed,
  recordRecentlyViewed,
  resolveRecentlyViewedProducts,
  mergeGuestRecentlyViewed,
};
