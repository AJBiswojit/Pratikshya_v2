/**
 * PRATIKSHYA FASHON — Marketing placement product assignments.
 *
 * The one door for "which products appear in which marketing section".
 *
 * The Marketing Media desk curates PRODUCT placements by pointing at pieces
 * that already exist in the canonical product catalogue. This repository
 * stores ONLY the product references — a placement record is an ordered list
 * of product ids, nothing else. Product names, taxonomy, media and pricing
 * always resolve from the catalogue at read time, so a rename or a new plate
 * in the catalogue is reflected everywhere automatically.
 *
 *   Marketing Placement
 *        ↓  productId
 *   Canonical Product Catalogue   (src/services/catalogRepository)
 *        ↓
 *   Product data + media
 *
 * The storage follows the exact pattern of `mediaStore`: a namespaced
 * localStorage register with an in-memory mirror, tolerant of unavailable
 * storage, and an event every surface subscribes to. Frontend-only — there
 * is no backend and no database.
 *
 * Ordering: the stored sequence IS the display order. Remove only drops the
 * reference; the product record, its folder and its images are untouched and
 * remain available in the Product Catalog Selector.
 */

import { getPlacement } from "../../config/mediaTypes";

/** Namespaced, in line with every other PRATIKSHYA FASHON storage key. */
export const MARKETING_PLACEMENTS_STORAGE_KEY = "pratikshya_marketing_placements";

/** Broadcast so every open surface re-reads after a write. */
export const MARKETING_PLACEMENTS_CHANGED_EVENT = "pratikshya-marketing-placements-changed";

const nowIso = () => new Date().toISOString();

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const cleanId = (value) => (typeof value === "string" ? value.trim() : "");

const cleanProductIds = (value) => {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const unique = [];
  value.forEach((entry) => {
    const id = cleanId(entry);
    if (!id || seen.has(id)) return;
    seen.add(id);
    unique.push(id);
  });
  return unique;
};

/** Brings any stored payload up to the record shape; corrupt rows are dropped. */
const normalisePlacement = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  const placementId = cleanId(entry.placementId || entry.id);
  if (!placementId || !getPlacement(placementId)) return null;
  return {
    placementId,
    productIds: cleanProductIds(entry.productIds),
    createdAt: cleanId(entry.createdAt) || nowIso(),
    updatedAt: cleanId(entry.updatedAt) || nowIso(),
  };
};

/* ------------------------------------------------------------------ */
/* Storage layer                                                       */
/* ------------------------------------------------------------------ */

let memoryState = null;

const emptyState = () => ({});

const persistState = (state) => {
  try {
    window.localStorage.setItem(MARKETING_PLACEMENTS_STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* Non-fatal — the register stays in memory for this session. */
  }
};

/**
 * Reads the register as a placementId → record map.
 *
 * In Node / SSR (no window) the in-memory mirror is used so tests and the
 * audit scripts can exercise the repository exactly like a browser session.
 */
export const readPlacementState = () => {
  if (typeof window === "undefined") {
    if (!memoryState) memoryState = emptyState();
    return memoryState;
  }
  try {
    const stored = JSON.parse(window.localStorage.getItem(MARKETING_PLACEMENTS_STORAGE_KEY));
    if (!stored || typeof stored !== "object" || Array.isArray(stored)) {
      const seeded = emptyState();
      memoryState = seeded;
      persistState(seeded);
      return memoryState;
    }
    const normalised = {};
    Object.keys(stored).forEach((key) => {
      const record = normalisePlacement(stored[key]);
      if (record) normalised[record.placementId] = record;
    });
    memoryState = normalised;
    return memoryState;
  } catch {
    if (!memoryState) memoryState = emptyState();
    return memoryState;
  }
};

const writePlacementState = (state) => {
  memoryState = state;
  persistState(state);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MARKETING_PLACEMENTS_CHANGED_EVENT));
  }
};

/* ------------------------------------------------------------------ */
/* Reading                                                             */
/* ------------------------------------------------------------------ */

/** The product ids assigned to one placement, in display order. */
export const getPlacementProductIds = (placementId) => {
  if (!placementId) return [];
  const state = readPlacementState();
  const record = state[placementId];
  return record ? record.productIds.slice() : [];
};

/** Every assignment, keyed by placement id (only placements with records). */
export const getAllAssignments = () => {
  const state = readPlacementState();
  return Object.fromEntries(
    Object.keys(state)
      .filter((placementId) => getPlacement(placementId))
      .map((placementId) => [placementId, state[placementId].productIds.slice()])
  );
};

/** How many placements have at least one product assigned. */
export const getAssignedPlacementCount = () => {
  const state = readPlacementState();
  return Object.keys(state).filter(
    (placementId) => getPlacement(placementId) && state[placementId].productIds.length > 0
  ).length;
};

/* ------------------------------------------------------------------ */
/* Writing                                                             */
/* ------------------------------------------------------------------ */

/** Replaces the full ordered assignment for one placement. */
export const setPlacementProductIds = (placementId, productIds = []) => {
  if (!placementId || !getPlacement(placementId)) return [];
  const state = readPlacementState();
  const timestamp = nowIso();
  const next = {
    ...state,
    [placementId]: {
      placementId,
      productIds: cleanProductIds(productIds),
      createdAt: state[placementId]?.createdAt || timestamp,
      updatedAt: timestamp,
    },
  };
  writePlacementState(next);
  return next[placementId].productIds.slice();
};

/**
 * Appends product ids to a placement, preserving display order and skipping
 * ids already assigned. Returns the new ordered list.
 */
export const addPlacementProductIds = (placementId, productIds = []) => {
  if (!placementId || !getPlacement(placementId)) return [];
  const current = getPlacementProductIds(placementId);
  const additions = cleanProductIds(productIds).filter((id) => !current.includes(id));
  if (!additions.length) return current;
  return setPlacementProductIds(placementId, [...current, ...additions]);
};

/** Drops one product reference from a placement. The product is untouched. */
export const removePlacementProductId = (placementId, productId) => {
  if (!placementId) return [];
  const current = getPlacementProductIds(placementId);
  if (!current.includes(productId)) return current;
  return setPlacementProductIds(
    placementId,
    current.filter((id) => id !== productId)
  );
};

/** Clears a placement entirely — references only, never products. */
export const clearPlacement = (placementId) => {
  if (!placementId) return [];
  const state = readPlacementState();
  if (!state[placementId]) return [];
  const next = { ...state };
  delete next[placementId];
  writePlacementState(next);
  return [];
};

/**
 * Moves one assigned product one step up or down in display order.
 * `direction` is "up" or "down". Returns the new ordered list.
 */
export const movePlacementProductId = (placementId, productId, direction) => {
  const current = getPlacementProductIds(placementId);
  const index = current.indexOf(productId);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= current.length) return current;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  return setPlacementProductIds(placementId, next);
};

/** Removes the register (used by tests and the reset flow). */
export const resetPlacementAssignments = () => {
  memoryState = null;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MARKETING_PLACEMENTS_STORAGE_KEY);
    } catch {
      /* Storage unavailable — the empty register is returned regardless. */
    }
    window.dispatchEvent(new Event(MARKETING_PLACEMENTS_CHANGED_EVENT));
  }
  return readPlacementState();
};

const marketingPlacementRepository = {
  getPlacementProductIds,
  getAllAssignments,
  getAssignedPlacementCount,
  setPlacementProductIds,
  addPlacementProductIds,
  removePlacementProductId,
  clearPlacement,
  movePlacementProductId,
  resetPlacementAssignments,
};

export default marketingPlacementRepository;
