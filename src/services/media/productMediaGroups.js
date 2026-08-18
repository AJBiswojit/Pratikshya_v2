/**
 * PRATIKSHYA FASHON — Product media groups (Phase 22).
 *
 * Human decisions about which media assets form ONE product. This registry
 * stores decisions only — media lives in the one media register and product
 * truth lives in the one catalogue repository. It is not a second media
 * system.
 *
 * Deterministic filename groups (women-saree-001-front / women-saree-001-side → one
 * groupKey) are computed by the existing mediaNaming parser; this registry
 * records the human part:
 *   · GROUP AS ONE PRODUCT   (SAME_PRODUCT)
 *   · KEEP AS SEPARATE       (SEPARATE_PRODUCTS)
 *   · REVIEW LATER           (REVIEW_LATER)
 *   · variant review flags
 *
 * Visual similarity is NEVER a deciding input here — it is at most a review
 * signal a human confirms.
 */

export const MEDIA_GROUPS_STORAGE_KEY = "pratikshya_media_groups";
export const MEDIA_GROUPS_CHANGED_EVENT = "pratikshya-media-groups-changed";

export const GROUP_DECISIONS = {
  SAME_PRODUCT: "SAME_PRODUCT",
  SEPARATE_PRODUCTS: "SEPARATE_PRODUCTS",
  REVIEW_LATER: "REVIEW_LATER",
};

export const GROUP_STATUS = {
  PENDING: "PENDING",
  CONFIRMED: "CONFIRMED",
  SPLIT: "SPLIT",
  ARCHIVED: "ARCHIVED",
};

export const GROUP_SOURCES = {
  FILENAME: "FILENAME",
  MANUAL: "MANUAL",
  REVIEW_FLAG: "REVIEW_FLAG",
};

const nowIso = () => new Date().toISOString();

let memory = null;

const read = () => {
  if (memory) return memory;
  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem(MEDIA_GROUPS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          memory = parsed.map(normaliseGroup).filter(Boolean);
          return memory;
        }
      }
    } catch {
      /* corrupted storage falls back to an empty decision register */
    }
  }
  memory = [];
  return memory;
};

const write = (groups) => {
  memory = groups;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MEDIA_GROUPS_STORAGE_KEY, JSON.stringify(groups));
    } catch {
      /* storage unavailable — decisions live for this session only */
    }
    window.dispatchEvent(new Event(MEDIA_GROUPS_CHANGED_EVENT));
  }
  return groups;
};

export const normaliseGroup = (entry) => {
  if (!entry || typeof entry !== "object") return null;
  return {
    id: String(entry.id || ""),
    groupKey: entry.groupKey || null,
    label: entry.label || null,
    mediaIds: Array.isArray(entry.mediaIds) ? entry.mediaIds.map(String).filter(Boolean) : [],
    productId: entry.productId || null,
    source: Object.values(GROUP_SOURCES).includes(entry.source) ? entry.source : GROUP_SOURCES.MANUAL,
    status: Object.values(GROUP_STATUS).includes(entry.status) ? entry.status : GROUP_STATUS.PENDING,
    decision: Object.values(GROUP_DECISIONS).includes(entry.decision) ? entry.decision : null,
    reason: entry.reason || null,
    variantReviewRequired: Boolean(entry.variantReviewRequired),
    createdBy: entry.createdBy || null,
    createdAt: entry.createdAt || nowIso(),
    updatedBy: entry.updatedBy || null,
    updatedAt: entry.updatedAt || nowIso(),
    decidedBy: entry.decidedBy || null,
    decidedAt: entry.decidedAt || null,
  };
};

export const getAllGroups = () => read().slice().sort((a, b) => String(a.id).localeCompare(String(b.id)));

export const getGroupById = (groupId) => read().find((entry) => entry.id === groupId) ?? null;

export const createGroup = (draft = {}, actorLabel = null) => {
  const groups = read();
  const at = nowIso();
  const entry = normaliseGroup({
    ...draft,
    id: draft.id || `grp-${Date.now().toString(36)}-${Math.floor(Math.random() * 999)}`,
    createdAt: at,
    updatedAt: at,
    createdBy: actorLabel,
    updatedBy: actorLabel,
  });
  if (!entry) return null;
  write([entry, ...groups]);
  return entry;
};

export const updateGroup = (groupId, patch = {}, actorLabel = null) => {
  const groups = read();
  const index = groups.findIndex((entry) => entry.id === groupId);
  if (index < 0) return null;
  const entry = normaliseGroup({
    ...groups[index],
    ...patch,
    id: groups[index].id,
    updatedBy: actorLabel,
    updatedAt: nowIso(),
  });
  const next = [...groups];
  next[index] = entry;
  write(next);
  return entry;
};

export const addMediaToGroup = (groupId, mediaIds = [], actorLabel = null) => {
  const group = getGroupById(groupId);
  if (!group) return null;
  const merged = [...new Set([...group.mediaIds, ...mediaIds.map(String)])];
  return updateGroup(groupId, { mediaIds: merged }, actorLabel);
};

export const removeMediaFromGroup = (groupId, mediaIds = [], actorLabel = null) => {
  const group = getGroupById(groupId);
  if (!group) return null;
  const removing = new Set(mediaIds.map(String));
  return updateGroup(groupId, { mediaIds: group.mediaIds.filter((id) => !removing.has(id)) }, actorLabel);
};

export const mergeGroups = (groupIds = [], actorLabel = null) => {
  const groups = read();
  /* Respect the caller's order — the first id listed wins as the surviving
     group and its media lead the merged sequence. */
  const targets = (groupIds ?? [])
    .map((id) => groups.find((entry) => entry.id === id))
    .filter(Boolean);
  if (targets.length < 2) return null;
  const first = targets[0];
  const mediaIds = [...new Set(targets.flatMap((entry) => entry.mediaIds))];
  const merged = normaliseGroup({
    ...first,
    mediaIds,
    updatedBy: actorLabel,
    updatedAt: nowIso(),
  });
  const removing = new Set(targets.map((entry) => entry.id));
  const survivors = groups.filter((entry) => !removing.has(entry.id));
  write([merged, ...survivors]);
  return merged;
};

export const splitGroup = (groupId, mediaIds = [], actorLabel = null) => {
  const group = getGroupById(groupId);
  if (!group) return null;
  const moving = new Set(mediaIds.map(String));
  const remaining = group.mediaIds.filter((id) => !moving.has(id));
  if (!remaining.length) return null;
  updateGroup(groupId, { mediaIds: remaining }, actorLabel);
  return createGroup(
    {
      groupKey: group.groupKey ? `${group.groupKey}-split-${Date.now().toString(36)}` : null,
      label: group.label ? `${group.label} (split)` : "Split group",
      mediaIds: [...moving],
      productId: null,
      source: GROUP_SOURCES.MANUAL,
      status: GROUP_STATUS.PENDING,
      reason: group.reason,
    },
    actorLabel
  );
};

export const setGroupDecision = (groupId, decision, actorLabel = null) => {
  const at = nowIso();
  return updateGroup(
    groupId,
    {
      decision,
      status: decision === GROUP_DECISIONS.REVIEW_LATER ? GROUP_STATUS.PENDING : GROUP_STATUS.CONFIRMED,
      decidedBy: actorLabel,
      decidedAt: at,
    },
    actorLabel
  );
};

export const setGroupProduct = (groupId, productId, actorLabel = null) =>
  updateGroup(groupId, { productId: productId || null }, actorLabel);

/**
 * Phase 22.1 — groups whose identity decision is still open for the given
 * media. A group blocks publication until a human decides SAME_PRODUCT or
 * SEPARATE_PRODUCTS; REVIEW_LATER keeps it open on purpose.
 */
export const unresolvedGroupConflictsFor = (mediaIds = []) => {
  const set = new Set((Array.isArray(mediaIds) ? mediaIds : []).map(String).filter(Boolean));
  if (!set.size) return [];
  return read().filter((group) => {
    if (group.status === GROUP_STATUS.ARCHIVED) return false;
    if (group.decision === GROUP_DECISIONS.SAME_PRODUCT) return false;
    if (group.decision === GROUP_DECISIONS.SEPARATE_PRODUCTS) return false;
    return group.mediaIds.some((id) => set.has(String(id)));
  });
};

export const resetGroups = () => {
  memory = [];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(MEDIA_GROUPS_STORAGE_KEY);
    } catch {
      /* nothing to clean */
    }
    window.dispatchEvent(new Event(MEDIA_GROUPS_CHANGED_EVENT));
  }
  return [];
};

export default {
  GROUP_DECISIONS,
  GROUP_STATUS,
  GROUP_SOURCES,
  getAllGroups,
  getGroupById,
  createGroup,
  updateGroup,
  addMediaToGroup,
  removeMediaFromGroup,
  mergeGroups,
  splitGroup,
  setGroupDecision,
  setGroupProduct,
  resetGroups,
};
