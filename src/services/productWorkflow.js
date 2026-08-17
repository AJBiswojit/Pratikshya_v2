/**
 * PRATIKSHYA FASHON — Media-to-product workflow (Phase 22).
 *
 * The deterministic MEDIA → PRODUCT DRAFT → REVIEW → PUBLISH pipeline.
 *
 * This module extends the existing architecture — it never replaces it:
 *   · product truth  → catalogRepository (one register)
 *   · media truth    → mediaRepository + mediaResolver (one register)
 *   · media sets     → productMediaSet (getProductMediaSet)
 *   · groups         → mediaNaming (deterministic filename parsing)
 *   · authorization  → employees/authorization (one permission model)
 *   · logging        → employees/activityService (one diary)
 *
 * The rules this layer enforces:
 *   · a media asset belongs to ONE product; a conflicting assignment is
 *     reported as MEDIA_ALREADY_ASSIGNED and never silently reassigned
 *   · Product IDs are permanent, deterministic and never derived from names
 *   · drafts stay invisible to customers until PUBLISHED
 *   · employees edit only their assigned products, only the allowed fields
 *   · visual similarity is a review signal, never automatic identity
 *
 * PERFORMANCE OPTIMIZATION:
 *   · getMediaInbox, getPotentialProductGroups, getKidsReconciliationRows,
 *     getKidsFinalizationRows (via finalization module), and getWorkflowMetrics
 *     are memoized against catalogVersion + mediaVersion + groupsVersion.
 *   · Employee-assigned products uses index instead of full scan when possible.
 *   · Heavy group building is cached.
 */

import catalogRepository, { PRODUCT_STATUS, getPublishIssues } from "./catalogRepository";
import { commands as workflowCommands } from "./workflow/productWorkflowCommands";
import {
  transferMediaOwnership as safeTransferOwnership,
  unassignMediaFromProduct as safeUnassignMedia,
  validateMediaOwnershipTransfer as validateOwnershipTransfer,
} from "./media/mediaOwnershipService";
import mediaRepository from "./media/mediaRepository";
import { getProductMediaSet, resolveProductMediaClaims } from "./media/productMediaSet";
import { buildMediaGroups } from "./media/mediaGroups";
import {
  GROUP_DECISIONS,
  getAllGroups,
  getGroupById,
  createGroup,
  setGroupDecision,
  setGroupProduct,
} from "./media/productMediaGroups";
import { MEDIA_SCOPES, MEDIA_STATUS, MAPPING_STATUS, DUPLICATE_STATUS } from "../config/mediaTypes";
import { DEFAULT_PRODUCT_ID_PREFIX, PRODUCT_ID_PREFIXES } from "../config/productCatalogConfig";
import { PERMISSIONS } from "../config/employeePermissions";
import { EMPLOYEE_STATUS, canEmployeeLogin } from "../config/employeeStatus";
import { hasPermission } from "./employees/authorization";
import { getEmployee, loadEmployees } from "./employees/employeeService";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "./employees/activityService";
import { employeeFullName } from "../utils/employee";
import {
  REVIEW_FLAGS,
  blockingReviewFlags,
  isPlaceholderProductName,
} from "./productReviewFlags";
import {
  KIDS_MERGE_REFUSED_ERROR,
  confirmedKidsProductIdsIn,
  isConfirmedKidsProductId,
  kidsProductIdForFile,
  wouldMergeConfirmedKids,
} from "./kidsProductIdentity";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const productIdPrefixFor = (categoryId) =>
  PRODUCT_ID_PREFIXES[categoryId] ?? DEFAULT_PRODUCT_ID_PREFIX;

export const genderForCategory = (categoryId) => {
  if (categoryId === "kidswear") return "Kids";
  if (categoryId === "menswear") return "Men";
  return "Women";
};

export const mediaFileName = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.url || media?.thumbnail || "").split("/").pop() ||
      media?.id ||
      ""
  );

const identityMatcher = (identityKeys) => (value) => {
  if (!value) return false;
  const id = typeof value === "string" ? value : value?.id ?? value?.src ?? "";
  return identityKeys.has(String(id));
};

const numberFromGroupKey = (groupKey) => {
  const match = String(groupKey || "").match(/(\d+)$/);
  return match ? Number(match[1]) : null;
};

const note = (action, summary, actor, productId = null) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetProductId: productId,
      action,
      summary,
    });
  } catch {
    /* The diary is an enhancement; a failure never blocks the workflow. */
  }
};

const employeeName = (employeeId) => {
  if (!employeeId) return null;
  try {
    const employee = getEmployee(loadEmployees(), employeeId);
    return employee ? employeeFullName(employee) : null;
  } catch {
    return null;
  }
};

/* ------------------------------------------------------------------ */
/* Version caching helpers                                             */
/* ------------------------------------------------------------------ */

let workflowCache = {
  catalogVersion: -1,
  mediaVersion: -1,
  groupsFingerprint: null,
  inbox: null,
  inboxFingerprint: null,
  potentialGroups: null,
  potentialGroupsFingerprint: null,
  kidsReconciliation: null,
  kidsReconciliationFingerprint: null,
};

const getGroupsFingerprint = () => {
  try {
    const groups = getAllGroups();
    return `${groups.length}:${groups.map(g=>g.id).join(",").length}`;
  } catch {
    return "0";
  }
};

const makeFingerprint = (catalogV, mediaV, extra = "") => `${catalogV}|${mediaV}|${extra}`;

/* ------------------------------------------------------------------ */
/* Stable Product IDs                                                  */
/* ------------------------------------------------------------------ */

/**
 * The next permanent Product ID for a category: KID-001, MEN-001, …
 * Deterministic — scans the register, never random, never regenerated,
 * never derived from a product name.
 */
export const nextStableProductId = (categoryId, preferredNumber = null) => {
  const prefix = productIdPrefixFor(categoryId);
  const all = catalogRepository.all();
  const taken = new Set(all.map((product) => String(product.id)));

  if (preferredNumber != null && Number.isFinite(Number(preferredNumber))) {
    const candidate = `${prefix}-${String(preferredNumber).padStart(3, "0")}`;
    if (!taken.has(candidate)) return candidate;
  }

  let number = 1;
  while (taken.has(`${prefix}-${String(number).padStart(3, "0")}`)) number += 1;
  return `${prefix}-${String(number).padStart(3, "0")}`;
};

/** The preferred Product ID for a set of media, derived from its group. */
export const preferredProductIdForMedia = (mediaItems = [], categoryId = null) => {
  const numbers = [...new Set(mediaItems.map((media) => numberFromGroupKey(media?.groupKey)).filter((n) => n != null))];
  const preferredNumber = numbers.length === 1 ? numbers[0] : null;
  const prefixCategory = categoryId || mediaItems[0]?.categoryId || null;
  return nextStableProductId(prefixCategory, preferredNumber);
};

/* ------------------------------------------------------------------ */
/* Ownership validation                                                */
/* ------------------------------------------------------------------ */

/**
 * Deterministic ownership check. Returns:
 *   { ok: true }                                  — media unassigned / same owner
 *   { ok: false, error: "MEDIA_ALREADY_ASSIGNED", ownerProductId, ownerProductName }
 */
export const validateMediaAssignment = (mediaId, targetProductId) => {
  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };
  if (!media.productId) return { ok: true, media };
  if (String(media.productId) === String(targetProductId)) return { ok: true, media, alreadyOwned: true };
  const owner = catalogRepository.find(media.productId);
  return {
    ok: false,
    error: "MEDIA_ALREADY_ASSIGNED",
    media,
    ownerProductId: media.productId,
    ownerProductName: owner?.name ?? null,
    ownerProductStatus: owner?.status ?? null,
  };
};

/**
 * Moves media ownership to another product — COMPATIBILITY WRAPPER.
 *
 * The authoritative, authorized ownership command is now the media
 * ownership service (`mediaOwnershipService.transferMediaOwnership`), which
 * authenticates the actor, applies the confirmed Kids plate lock, enforces
 * marketing isolation, requires explicit confirmation for contested
 * reassignment, cleans stale previous-owner references and revalidates both
 * products. This function is kept so existing callers keep working.
 */
export const transferMediaOwnership = (mediaId, targetProductId, actor = null, { confirm = false } = {}) =>
  safeTransferOwnership({ mediaId, targetProductId, principal: actor, confirm });

/** Detaches media from its product — COMPATIBILITY WRAPPER around the
    authorized media ownership service. */
export const unassignProductMedia = (mediaId, actor = null) =>
  safeUnassignMedia({ mediaId, principal: actor });

/* ------------------------------------------------------------------ */
/* Product drafts                                                      */
/* ------------------------------------------------------------------ */

/**
 * CREATE PRODUCT FROM MEDIA — the controlled action.
 *
 * 1. resolves a stable Product ID from the media group
 * 2. creates a DRAFT product (never auto-published)
 * 3. attaches the media as claims (primary + gallery)
 * 4. never guesses a name, price or classification
 * 5. reports any contested ownership instead of reassigning anything
 */
export const createProductDraftFromMedia = ({
  mediaIds,
  categoryId = null,
  subcategory = "",
  employeeId = null,
  actor = null,
} = {}) => {
  if (employeeId) {
    const employee = getEmployee(loadEmployees(), employeeId);
    if (!employee) return { ok: false, error: "Employee not found." };
    if (employee.status !== EMPLOYEE_STATUS.ACTIVE) {
      return { ok: false, error: "Only active employees can receive new product assignments." };
    }
  }
  const ids = (Array.isArray(mediaIds) ? mediaIds : [mediaIds]).filter(Boolean);
  const mediaItems = ids.map((id) => mediaRepository.getById(id)).filter(Boolean);
  if (!mediaItems.length) return { ok: false, error: "Select at least one media asset." };

  /* Phase 22.2 — never fold two confirmed Kids products into one draft. */
  if (wouldMergeConfirmedKids(mediaItems.map(mediaFileName))) {
    return {
      ok: false,
      error: KIDS_MERGE_REFUSED_ERROR,
      confirmedKidsProductIds: confirmedKidsProductIdsIn(mediaItems.map(mediaFileName)),
    };
  }

  const category = categoryId || mediaItems[0].categoryId || "";
  const id = preferredProductIdForMedia(mediaItems, category);
  const conflicts = [];
  mediaItems.forEach((media) => {
    const check = validateMediaAssignment(media.id, id);
    if (!check.ok) {
      conflicts.push({
        mediaId: media.id,
        file: mediaFileName(media),
        ownerProductId: check.ownerProductId,
        ownerProductName: check.ownerProductName,
      });
    }
  });

  const result = catalogRepository.createDraftProduct(
    {
      id,
      name: "",
      category,
      subcategory,
      gender: genderForCategory(category),
      description: "",
      shortDescription: "",
      mediaIds: mediaItems.map((media) => media.id),
      primaryMediaId: mediaItems[0].id,
      galleryMediaIds: mediaItems.map((media) => media.id),
      price: 0,
      compareAtPrice: null,
      currency: "INR",
      stock: 0,
      status: PRODUCT_STATUS.DRAFT,
      assignedEmployeeId: employeeId || null,
      reviewFlags: conflicts.length ? ["MEDIA_OWNERSHIP_REVIEW"] : [],
    },
    actor
  );

  return { ok: true, product: result.product, conflicts };
};

/** Assign a product draft to an authorized employee — COMPATIBILITY WRAPPER
    around the universal workflow command (Super Admin only). */
export const assignProductToEmployee = (productId, employeeId, actor = null) =>
  workflowCommands.assignProduct(productId, employeeId, actor);

/** Submit a draft for review — COMPATIBILITY WRAPPER around the universal
    workflow command. Publishing stays with the approver. */
export const submitProductForReview = (productId, actor = null) =>
  workflowCommands.submitProduct(productId, actor);

/** Approve — COMPATIBILITY WRAPPER around the universal workflow command.
    Phase 2 FIX: approval does NOT publish; the product moves to APPROVED and
    requires a separate explicit publish. */
export const approveProduct = (productId, actor = null) =>
  workflowCommands.approveProduct(productId, actor);

/** Return — COMPATIBILITY WRAPPER around the universal workflow command.
    Phase 3D: the unified Admin review workspace returns products through the
    same canonical command every category uses. A reason is REQUIRED — the
    command refuses an empty one. Never a raw `status = RETURNED` write. */
export const returnProduct = (productId, reason = "", actor = null) =>
  workflowCommands.returnProduct(productId, reason, actor);

/** Publish — COMPATIBILITY WRAPPER around the universal workflow command.
    Requires the APPROVED stage and a full fresh validation. */
export const publishProduct = (productId, actor = null) =>
  workflowCommands.publishProduct(productId, actor);

/** Archive — COMPATIBILITY WRAPPER around the universal workflow command. */
export const archiveProduct = (productId, actor = null) =>
  workflowCommands.archiveProduct(productId, actor);

/**
 * Admin-only Product ID change — Phase 3C canonical ownership path.
 *
 *   validate new Product ID (pure)
 *     ↓
 *   canonical media ownership service — preflight EVERY owned asset
 *     ↓  (any refusal aborts before a single byte is written)
 *   persist the new Product ID
 *     ↓
 *   canonical media ownership service — transfer each asset
 *     ↓
 *   activity event
 *
 * The workflow no longer calls `mediaRepository.assignToProduct` directly,
 * so the confirmed Kids plate lock, marketing isolation and contested-
 * ownership rules apply to a rename exactly as they apply to any other
 * ownership change. Old-ID media can never end up silently attached to an
 * unrelated product: the transfer target is the renamed record itself, and
 * the rename is rolled back if any asset refuses to follow.
 */
export const changeProductId = (productId, newProductId, actor = null) => {
  /* 1. Validate the rename itself WITHOUT writing anything. */
  const check = catalogRepository.validateProductIdChange(productId, newProductId);
  if (!check.ok) return check;
  const targetId = check.target;

  const owned = mediaRepository
    .getAll()
    .filter((media) => String(media.productId) === String(productId));

  /* 2. Preflight every asset through the canonical ownership service. The
     target record does not exist yet, so product existence is checked by
     step 1 instead of the service's own target lookup. */
  for (const media of owned) {
    const preflight = validateOwnershipTransfer({
      mediaId: media.id,
      targetProductId: targetId,
      principal: actor,
      confirm: true,
      requireTargetProduct: false,
    });
    if (!preflight.ok) {
      return {
        ok: false,
        error: preflight.message ?? preflight.error,
        code: preflight.code ?? null,
        mediaId: media.id,
        blockedBy: "MEDIA_OWNERSHIP",
      };
    }
  }

  /* 3. Persist the new Product ID. */
  const result = catalogRepository.changeProductId(productId, newProductId, actor);
  if (!result.ok) return result;

  /* 4. Move ownership through the canonical service — validated again there. */
  const moved = [];
  const refused = [];
  owned.forEach((media) => {
    const transfer = safeTransferOwnership({
      mediaId: media.id,
      targetProductId: result.product.id,
      principal: actor,
      confirm: true,
      actor,
    });
    if (transfer.ok) moved.push(media.id);
    else refused.push({ mediaId: media.id, error: transfer.message ?? transfer.error });
  });

  if (refused.length) {
    /* Never leave media stranded on a Product ID that no longer exists. */
    catalogRepository.changeProductId(result.product.id, productId, actor);
    moved.forEach((mediaId) => {
      safeTransferOwnership({
        mediaId,
        targetProductId: productId,
        principal: actor,
        confirm: true,
        actor,
      });
    });
    return {
      ok: false,
      error: refused[0].error ?? "Media ownership could not follow the new Product ID.",
      blockedBy: "MEDIA_OWNERSHIP",
      refused,
    };
  }

  note(
    ACTIVITY_ACTIONS.PRODUCT_RENAMED_ID,
    `Changed Product ID ${productId} → ${result.product.id}`,
    actor,
    result.product.id
  );
  return { ...result, mediaTransferred: moved.length };
};

/* ------------------------------------------------------------------ */
/* Employee authorization for the workflow                             */
/* ------------------------------------------------------------------ */

/** Fields an assigned employee may edit — never identity or ownership.
    Single source of truth: src/services/workflow/employeeEditableFields.js
    (shared with the universal workflow command layer). */
import { EMPLOYEE_EDITABLE_FIELDS, pickEmployeeEditableFields } from "./workflow/employeeEditableFields.js";
export { EMPLOYEE_EDITABLE_FIELDS, pickEmployeeEditableFields };

/**
 * May this employee edit this product?
 * The existing authorization model requires products.manage AND assignment of
 * the product. Admin identities never authenticate through this employee path.
 */
export const employeeCanEditProduct = (employee, product) => {
  if (!employee || !product) return false;
  if (!canEmployeeLogin(employee.status)) return false;
  if (!hasPermission(employee, PERMISSIONS.PRODUCTS_MANAGE)) return false;
  return Boolean(product.assignedEmployeeId) && product.assignedEmployeeId === employee.employeeId;
};

/** The products an employee is authorized to work on. */
export const employeeAssignedProducts = (employeeId) => {
  if (!employeeId) return [];
  // Optimized: use cached snapshot instead of all() that re-normalizes? all() is now cached anyway.
  // Filter by assignedEmployeeId
  const snap = catalogRepository._getSnapshot ? catalogRepository._getSnapshot() : null;
  const list = snap ? snap.list : catalogRepository.all();
  const result = [];
  for (let i = 0; i < list.length; i += 1) {
    const p = list[i];
    if (p.assignedEmployeeId === employeeId && p.status !== PRODUCT_STATUS.ARCHIVED) result.push(p);
  }
  return result;
};

/** Save an employee's draft edits — COMPATIBILITY WRAPPER around the
    universal workflow command (whitelist + assignment + editable-stage
    enforcement + principal lookup all live in the command). */
export const saveEmployeeDraft = (productId, patch, employee = null, actor = null) =>
  workflowCommands.saveProductDraft(productId, patch, employee ?? actor, { actor });

/* ------------------------------------------------------------------ */
/* Review workspace views                                              */
/* ------------------------------------------------------------------ */

/** Everything the admin/employee review surfaces need for one product. */
export const getProductWorkflowView = (product) => {
  if (!product) return null;
  const mediaSet = getProductMediaSet(product);
  const { conflicts } = resolveProductMediaClaims(product, product.id);
  return {
    product,
    mediaSet,
    conflicts: mediaSet.ownershipConflicts ?? conflicts,
    issues: getPublishIssues(product),
  };
};

/**
 * The MEDIA INBOX — every media asset that is UNASSIGNED, DRAFT, REVIEW,
 * NEEDS_REVIEW, or claimed by / owned by a non-published product.
 * Never mutates; reads the one media register.
 */
export const getMediaInboxUncached = () => {
  const products = catalogRepository.all();
  const productById = new Map();
  for (let i = 0; i < products.length; i += 1) productById.set(String(products[i].id), products[i]);

  const claimsByMediaId = new Map();
  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    if (product.status === PRODUCT_STATUS.ARCHIVED) continue;
    const mediaIds = product.mediaIds ?? [];
    for (let j = 0; j < mediaIds.length; j += 1) {
      const mid = String(mediaIds[j]);
      if (!claimsByMediaId.has(mid)) claimsByMediaId.set(mid, []);
      claimsByMediaId.get(mid).push(product);
    }
  }

  const isOpenOwner = (media) => {
    if (!media.productId) return false;
    const owner = productById.get(String(media.productId));
    if (!owner) return true;
    return owner.status === PRODUCT_STATUS.DRAFT || owner.status === PRODUCT_STATUS.PENDING_REVIEW;
  };

  const allMedia = mediaRepository.getAll();
  const rows = [];
  for (let i = 0; i < allMedia.length; i += 1) {
    const media = allMedia[i];
    const inScope =
      media.scope === MEDIA_SCOPES.UNASSIGNED ||
      media.status === MEDIA_STATUS.DRAFT ||
      media.status === MEDIA_STATUS.PENDING_REVIEW ||
      media.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
      media.mappingStatus === MAPPING_STATUS.UNMAPPED ||
      media.duplicateStatus === DUPLICATE_STATUS.DUPLICATE ||
      media.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE ||
      claimsByMediaId.has(String(media.id)) ||
      isOpenOwner(media);
    if (!inScope) continue;
    const owner = media.productId ? productById.get(String(media.productId)) ?? null : null;
    const claimedByRaw = claimsByMediaId.get(String(media.id)) ?? [];
    const claimedBy = [];
    for (let k = 0; k < claimedByRaw.length; k += 1) {
      if (String(claimedByRaw[k].id) !== String(media.productId ?? "")) claimedBy.push(claimedByRaw[k]);
    }
    const claimedDrafts = [];
    for (let k = 0; k < claimedBy.length; k += 1) {
      const p = claimedBy[k];
      if (p.status === PRODUCT_STATUS.DRAFT || p.status === PRODUCT_STATUS.PENDING_REVIEW) claimedDrafts.push(p);
    }
    rows.push({
      media,
      groupKey: media.groupKey,
      view: media.view,
      isStandalone: media.isStandalone !== false,
      ownerProduct: owner ?? null,
      claimedByDrafts: claimedDrafts,
      categoryId: media.categoryId ?? owner?.category ?? null,
      assignedEmployeeId: owner?.assignedEmployeeId ?? claimedDrafts[0]?.assignedEmployeeId ?? null,
      assignedEmployeeName: employeeName(
        owner?.assignedEmployeeId ?? claimedDrafts[0]?.assignedEmployeeId ?? null
      ),
      tags: media.status === MEDIA_STATUS.DRAFT
        ? ["DRAFT"]
        : media.status === MEDIA_STATUS.PENDING_REVIEW
          ? ["REVIEW"]
          : media.scope === MEDIA_SCOPES.UNASSIGNED
            ? ["UNASSIGNED"]
            : media.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
                media.mappingStatus === MAPPING_STATUS.UNMAPPED
              ? ["NEEDS_REVIEW"]
              : owner && (owner.status === PRODUCT_STATUS.DRAFT || owner.status === PRODUCT_STATUS.PENDING_REVIEW)
                ? ["REVIEW"]
                : claimedDrafts.length
                  ? ["CLAIMED_BY_DRAFT"]
                  : ["OPEN"],
    });
  }

  rows.sort((a, b) => {
    const rank = (row) =>
      row.tags.includes("DRAFT") ? 0 : row.tags.includes("REVIEW") ? 1 : row.tags.includes("UNASSIGNED") ? 2 : row.tags.includes("NEEDS_REVIEW") ? 3 : 4;
    return rank(a) - rank(b) || String(mediaFileName(a.media)).localeCompare(String(mediaFileName(b.media)));
  });

  return rows;
};

export const getMediaInbox = () => {
  const catalogV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const mediaV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  const fingerprint = makeFingerprint(catalogV, mediaV, "inbox");
  if (workflowCache.inbox && workflowCache.inboxFingerprint === fingerprint) {
    return workflowCache.inbox;
  }
  const result = getMediaInboxUncached();
  workflowCache.inbox = result;
  workflowCache.inboxFingerprint = fingerprint;
  return result;
};

/* ------------------------------------------------------------------ */
/* Group review                                                        */
/* ------------------------------------------------------------------ */

/**
 * Candidate groups for the group-review desk.
 *
 * Deterministic signals only:
 *   · filename multi-view groups (the existing naming/grouping system)
 *   · ingestion flags (NEEDS_REVIEW / POSSIBLE_DUPLICATE)
 *   · the human decision register
 *
 * Visual similarity alone never proves identity — every candidate asks a
 * human: SAME PRODUCT or SEPARATE PRODUCTS.
 */
export const getPotentialProductGroupsUncached = () => {
  const products = catalogRepository.all();
  const productById = new Map();
  for (let i = 0; i < products.length; i += 1) productById.set(String(products[i].id), products[i]);
  const allMedia = mediaRepository.getAll();

  const toRow = (media) => ({
    mediaId: media.id,
    file: mediaFileName(media),
    src: media.url || media.thumbnail || media.optimizedPath || null,
    groupKey: media.groupKey,
    view: media.view,
    ownerProductId: media.productId ?? null,
    ownerProductName: media.productId ? productById.get(String(media.productId))?.name ?? null : null,
  });

  const flaggedStatus = (media) =>
    media.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW ||
    media.mappingStatus === MAPPING_STATUS.UNMAPPED ||
    media.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE ||
    media.duplicateStatus === DUPLICATE_STATUS.DUPLICATE;

  /* 1. Deterministic filename groups. */
  const productMedia = [];
  for (let i = 0; i < allMedia.length; i += 1) {
    const m = allMedia[i];
    if (m.scope === MEDIA_SCOPES.PRODUCT || m.scope === MEDIA_SCOPES.UNASSIGNED) productMedia.push(m);
  }
  const filenameGroups = buildMediaGroups(
    productMedia.map((media) => ({ ...media, fileName: mediaFileName(media) }))
  ).filter((group) => group.files.length > 1);

  const filenameGroupRows = [];
  for (let g = 0; g < filenameGroups.length; g += 1) {
    const group = filenameGroups[g];
    const rows = [];
    for (let f = 0; f < group.files.length; f += 1) {
      const file = group.files[f];
      let foundMedia = null;
      for (let pm = 0; pm < productMedia.length; pm += 1) if (productMedia[pm].id === file.id) { foundMedia = productMedia[pm]; break; }
      rows.push(toRow(foundMedia ?? file));
    }
    let flagged = false;
    let flaggedCount = 0;
    for (let f = 0; f < group.files.length; f += 1) {
      const file = group.files[f];
      let rec = null;
      for (let pm = 0; pm < productMedia.length; pm += 1) if (productMedia[pm].id === file.id) { rec = productMedia[pm]; break; }
      if (rec && flaggedStatus(rec)) { flagged = true; flaggedCount += 1; }
    }
    filenameGroupRows.push({
      id: `filename-${group.groupKey}`,
      kind: "FILENAME_GROUP",
      reason: flagged
        ? `The naming convention groups these ${group.files.length} views as one product, and ingestion flagged ${flaggedCount} asset(s) for review. Confirm: one product, or separate products?`
        : `One product, ${group.files.length} views (${[...new Set(group.files.map((file) => file.view).filter(Boolean))].join(", ")})`,
      media: rows,
      existingProductId: group.productId ?? null,
      confirmed: !flagged,
      decision: flagged ? null : GROUP_DECISIONS.SAME_PRODUCT,
      variantReviewRequired: false,
    });
  }

  /* 2. Duplicate signals */
  const duplicatePairs = [];
  const paired = new Set();
  const mediaByIdForDup = new Map();
  for (let i = 0; i < allMedia.length; i += 1) mediaByIdForDup.set(allMedia[i].id, allMedia[i]);
  for (let i = 0; i < allMedia.length; i += 1) {
    const media = allMedia[i];
    if (paired.has(media.id)) continue;
    if (!media.duplicateOf) continue;
    const target = mediaByIdForDup.get(media.duplicateOf);
    if (!target) continue;
    paired.add(media.id);
    paired.add(target.id);
    duplicatePairs.push({
      id: `duplicate-${media.id}`,
      kind: "REVIEW_FLAG",
      reason:
        media.duplicateStatus === DUPLICATE_STATUS.DUPLICATE
          ? "Exact duplicate detected. Confirm whether both files belong to one product."
          : "Possible duplicate detected. These may be photographs of the same product — a human decides.",
      media: [media, target].map(toRow),
      existingProductId: media.productId ?? null,
      confirmed: false,
      decision: null,
      variantReviewRequired: false,
    });
  }

  /* 3. Stored human decisions still pending. */
  const stored = getAllGroups()
    .filter((group) => group.status !== "ARCHIVED")
    .filter((group) => group.decision !== GROUP_DECISIONS.SEPARATE_PRODUCTS)
    .map((group) => ({
      id: `stored-${group.id}`,
      kind: "MANUAL",
      reason: group.reason || "Group created by hand in the review desk.",
      media: group.mediaIds
        .map((mediaId) => mediaRepository.getById(mediaId))
        .filter(Boolean)
        .map(toRow),
      existingProductId: group.productId ?? null,
      confirmed: group.decision === GROUP_DECISIONS.SAME_PRODUCT,
      decision: group.decision,
      variantReviewRequired: group.variantReviewRequired,
    }))
    .filter((group) => group.media.length > 0);

  return [...stored, ...duplicatePairs, ...filenameGroupRows];
};

export const getPotentialProductGroups = () => {
  const catalogV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const mediaV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  const groupsFp = getGroupsFingerprint();
  const fingerprint = makeFingerprint(catalogV, mediaV, groupsFp);
  if (workflowCache.potentialGroups && workflowCache.potentialGroupsFingerprint === fingerprint) {
    return workflowCache.potentialGroups;
  }
  const result = getPotentialProductGroupsUncached();
  workflowCache.potentialGroups = result;
  workflowCache.potentialGroupsFingerprint = fingerprint;
  return result;
};

/**
 * The human decision on a group.
 *   SAME_PRODUCT      → one Product ID for all the group's media
 *   SEPARATE_PRODUCTS → each asset keeps its own identity
 *   REVIEW_LATER      → stays in the queue
 */
export const decideProductGroup = ({
  groupId,
  mediaIds,
  decision,
  existingProductId = null,
  actor = null,
} = {}) => {
  if (![GROUP_DECISIONS.SAME_PRODUCT, GROUP_DECISIONS.SEPARATE_PRODUCTS, GROUP_DECISIONS.REVIEW_LATER].includes(decision)) {
    return { ok: false, error: "Unknown group decision." };
  }

  const ids = (Array.isArray(mediaIds) ? mediaIds : []).filter(Boolean);
  const mediaItems = ids.map((id) => mediaRepository.getById(id)).filter(Boolean);
  if (!mediaItems.length) return { ok: false, error: "The group has no media assets." };

  /* Phase 22.2 — the 21 Kids assets are CONFIRMED separate products. No
     similarity signal, and no group decision, may merge two of them. */
  if (decision === GROUP_DECISIONS.SAME_PRODUCT && wouldMergeConfirmedKids(mediaItems.map(mediaFileName))) {
    return {
      ok: false,
      error: KIDS_MERGE_REFUSED_ERROR,
      confirmedKidsProductIds: confirmedKidsProductIdsIn(mediaItems.map(mediaFileName)),
    };
  }

  let product = null;
  let conflictCount = 0;

  if (decision === GROUP_DECISIONS.SAME_PRODUCT) {
    if (existingProductId) {
      product = catalogRepository.find(existingProductId);
      if (!product) return { ok: false, error: "Existing product not found." };
      mediaItems.forEach((media) => {
        const moved = transferMediaOwnership(media.id, existingProductId, actor, { confirm: true });
        if (!moved.ok) conflictCount += 1;
      });
    } else {
      const created = createProductDraftFromMedia({ mediaIds: ids, actor });
      if (!created.ok) return created;
      product = created.product;
      conflictCount = created.conflicts.length;
    }
  }

  /* Record the decision in the group register. */
  const stored = getGroupById(groupId);
  const entry =
    stored ??
    createGroup(
      {
        id: groupId,
        mediaIds: ids,
        reason: "Decided in the product review desk.",
        source: "MANUAL",
      },
      typeof actor === "string" ? actor : actor?.label ?? actor?.name ?? null
    );
  setGroupDecision(entry.id, decision, typeof actor === "string" ? actor : actor?.label ?? actor?.name ?? null);
  if (product) setGroupProduct(entry.id, product.id);

  note(
    ACTIVITY_ACTIONS.PRODUCT_GROUP_DECIDED,
    `Group ${entry.id} · ${decision}${product ? ` · ${product.id}` : ""}`,
    actor,
    product?.id ?? null
  );

  // Invalidate potential groups cache
  workflowCache.potentialGroups = null;
  workflowCache.potentialGroupsFingerprint = null;

  return { ok: true, decision, product, conflicts: conflictCount };
};

/* ------------------------------------------------------------------ */
/* Phase 22.1 — Kids reconciliation                                    */
/* ------------------------------------------------------------------ */

/** The five human decisions for a Kids ownership conflict. */
export const KIDS_CONFLICT_ACTIONS = {
  KEEP_EXISTING: "KEEP_EXISTING",
  TRANSFER: "TRANSFER",
  MERGE: "MERGE",
  SEPARATE: "SEPARATE",
  REVIEW_LATER: "REVIEW_LATER",
};

export const KIDS_CONFLICT_ACTION_LABELS = {
  [KIDS_CONFLICT_ACTIONS.KEEP_EXISTING]: "Keep Existing Product",
  [KIDS_CONFLICT_ACTIONS.TRANSFER]: "Transfer to KID Product",
  [KIDS_CONFLICT_ACTIONS.MERGE]: "Merge into Existing Product",
  [KIDS_CONFLICT_ACTIONS.SEPARATE]: "Create Separate Product",
  [KIDS_CONFLICT_ACTIONS.REVIEW_LATER]: "Review Later",
};

/** A draft is ready when nothing — flags, conflicts or validation — stands between it and the storefront. */
export const isReadyToPublish = (product) => {
  if (!product || product.status !== PRODUCT_STATUS.DRAFT) return false;
  const view = getProductWorkflowView(product);
  if (!view.mediaSet.primary) return false;
  if (view.conflicts.length) return false;
  if (blockingReviewFlags(product.reviewFlags).length) return false;
  return getPublishIssues(product).length === 0;
};

/** KID-001 … KID-021 with their full workflow view, for the admin desk. */
export const getKidsReconciliationRowsUncached = () => {
  const products = catalogRepository
    .all()
    .filter((product) => /^KID-\d{3}$/.test(String(product.id)))
    .filter((product) => product.status !== PRODUCT_STATUS.ARCHIVED);

  const rows = [];
  for (let i = 0; i < products.length; i += 1) {
    const product = products[i];
    const view = getProductWorkflowView(product);
    rows.push({
      product,
      mediaSet: view.mediaSet,
      conflicts: view.conflicts,
      issues: view.issues,
      blockers: blockingReviewFlags(product.reviewFlags),
      ready: isReadyToPublish(product),
    });
  }
  rows.sort((a, b) => a.product.id.localeCompare(b.product.id));
  return rows;
};

export const getKidsReconciliationRows = () => {
  const catalogV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const mediaV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  const fingerprint = makeFingerprint(catalogV, mediaV, "kids-recon");
  if (workflowCache.kidsReconciliation && workflowCache.kidsReconciliationFingerprint === fingerprint) {
    return workflowCache.kidsReconciliation;
  }
  const result = getKidsReconciliationRowsUncached();
  workflowCache.kidsReconciliation = result;
  workflowCache.kidsReconciliationFingerprint = fingerprint;
  return result;
};

/**
 * The five reconciliation actions for a KID draft whose media is owned by
 * an existing published product. Every ownership-changing action is logged
 * through the shared activity diary.
 */
export const reconcileKidsConflict = (productId, action, actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) return { ok: false, error: "Product not found." };
  if (!Object.values(KIDS_CONFLICT_ACTIONS).includes(action)) {
    return { ok: false, error: "Unknown reconciliation action." };
  }

  const { conflicts } = resolveProductMediaClaims(product, product.id);
  const owners = [...new Set(conflicts.map((conflict) => conflict.ownerProductId).filter(Boolean))];

  const clearClaims = () =>
    catalogRepository.updateDraft(
      productId,
      { mediaIds: [], primaryMediaId: null, galleryMediaIds: [] },
      actor
    );

  const removeConflictFlags = () => {
    const flags = (product.reviewFlags ?? []).filter(
      (flag) =>
        flag !== REVIEW_FLAGS.CONFLICT_UNRESOLVED &&
        flag !== REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW
    );
    return catalogRepository.updateDraft(productId, { reviewFlags: flags }, actor);
  };

  const resolvedNote = (summary, targetId = productId) =>
    note(ACTIVITY_ACTIONS.PRODUCT_CONFLICT_RESOLVED, summary, actor, targetId);

  switch (action) {
    case KIDS_CONFLICT_ACTIONS.REVIEW_LATER: {
      if (!conflicts.length) return { ok: false, error: "No ownership conflict to defer." };
      const flags = [
        ...new Set([...(product.reviewFlags ?? []), REVIEW_FLAGS.CONFLICT_REVIEW_LATER]),
      ];
      catalogRepository.updateDraft(productId, { reviewFlags: flags }, actor);
      resolvedNote(
        `${productId}: REVIEW_LATER — conflict with ${owners.join(", ")} deferred for a future session`
      );
      workflowCache.kidsReconciliation = null;
      return { ok: true, action, owners };
    }

    case KIDS_CONFLICT_ACTIONS.KEEP_EXISTING: {
      if (!owners.length) return { ok: false, error: "No ownership conflict to resolve." };
      clearClaims();
      catalogRepository.archiveProduct(productId, actor);
      resolvedNote(
        `${productId}: KEEP_EXISTING — media stays with ${owners.join(", ")}; draft archived`
      );
      workflowCache.kidsReconciliation = null;
      return { ok: true, action, owners, archivedDraft: productId };
    }

    case KIDS_CONFLICT_ACTIONS.TRANSFER: {
      if (!conflicts.length) return { ok: false, error: "No conflicting media to transfer." };
      const archivedOwners = [];
      for (const conflict of conflicts) {
        const moved = transferMediaOwnership(conflict.mediaId, productId, actor, {
          confirm: true,
        });
        if (!moved.ok) {
          return { ok: false, error: `Could not transfer ${conflict.file}: ${moved.error}` };
        }
        const previousId = moved.previousOwnerId;
        if (previousId) {
          const owner = catalogRepository.find(previousId);
          if (
            owner &&
            owner.category === "kidswear" &&
            owner.status === PRODUCT_STATUS.PUBLISHED
          ) {
            const ownerSet = getProductMediaSet(owner);
            if (!ownerSet.primary && !owner.image) {
              catalogRepository.archiveProduct(previousId, actor);
              archivedOwners.push(previousId);
            }
          }
        }
      }
      removeConflictFlags();
      resolvedNote(
        `${productId}: TRANSFER — media moved to the KID product${
          archivedOwners.length ? `; retired ${archivedOwners.join(", ")}` : ""
        }`
      );
      workflowCache.kidsReconciliation = null;
      workflowCache.inbox = null;
      return { ok: true, action, owners, archivedOwners };
    }

    case KIDS_CONFLICT_ACTIONS.MERGE: {
      if (owners.length !== 1) {
        return {
          ok: false,
          error: "Merge needs exactly one owning product — resolve one conflict at a time.",
        };
      }
      const owner = catalogRepository.find(owners[0]);
      if (!owner) return { ok: false, error: "Owning product not found." };

      const patch = {};
      if (product.name && !isPlaceholderProductName(product.name)) patch.name = product.name;
      if (Number(product.price) > 0) {
        patch.price = Number(product.price);
        patch.pricing = {
          ...(owner.pricing ?? {}),
          sellingPrice: Number(product.price),
          mrp: Math.max(Number(product.price), Number(product.compareAtPrice) || 0),
        };
      }
      if (Number(product.compareAtPrice) > 0) patch.compareAtPrice = Number(product.compareAtPrice);
      if (product.subcategory) patch.subcategory = product.subcategory;
      if (product.description) patch.description = product.description;
      if (product.shortDescription) patch.shortDescription = product.shortDescription;
      catalogRepository.updateProduct(owners[0], patch, actor);

      clearClaims();
      catalogRepository.archiveProduct(productId, actor);
      resolvedNote(
        `${productId}: MERGE — draft content merged into ${owners[0]}; draft archived`,
        owners[0]
      );
      workflowCache.kidsReconciliation = null;
      return { ok: true, action, owners, mergedInto: owners[0] };
    }

    case KIDS_CONFLICT_ACTIONS.SEPARATE: {
      if (!owners.length) return { ok: false, error: "No ownership conflict to resolve." };
      clearClaims();
      const flags = [
        ...new Set([
          ...(product.reviewFlags ?? []).filter(
            (flag) => flag !== REVIEW_FLAGS.CONFLICT_UNRESOLVED
          ),
          REVIEW_FLAGS.NEEDS_MEDIA,
        ]),
      ];
      catalogRepository.updateDraft(productId, { reviewFlags: flags }, actor);
      resolvedNote(`${productId}: SEPARATE — draft keeps its identity and needs new media`);
      workflowCache.kidsReconciliation = null;
      return { ok: true, action, owners };
    }

    default:
      return { ok: false, error: "Unknown reconciliation action." };
  }
};

/**
 * Which review flags a product's CURRENT state has already satisfied —
 * used by the admin desk to retire flags the moment their field is real.
 */
export const flagsSatisfiedByProduct = (product) => {
  if (!product) return [];
  const cleared = [];
  if (!isPlaceholderProductName(product.name)) {
    cleared.push(REVIEW_FLAGS.NAME_REVIEW_REQUIRED, REVIEW_FLAGS.KIDS_MIGRATION_REVIEW);
  }
  if (Number(product.price) > 0) cleared.push(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED);
  if (product.category && product.subcategory) cleared.push(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED);
  const view = getProductWorkflowView(product);
  if (view.mediaSet.primary) cleared.push(REVIEW_FLAGS.NEEDS_MEDIA);
  if (view.mediaSet.primary && !view.conflicts.length) {
    cleared.push(REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW, REVIEW_FLAGS.CONFLICT_UNRESOLVED);
  }
  return [...new Set(cleared)];
};

/** Admin-only: explicitly resolve review flags. Logged in the shared diary. */
export const clearReviewFlags = (productId, flags = [], actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) return { ok: false, error: "Product not found." };
  const removing = new Set((Array.isArray(flags) ? flags : []).map(String));
  const next = (product.reviewFlags ?? []).filter((flag) => !removing.has(flag));
  const result = catalogRepository.updateDraft(productId, { reviewFlags: next }, actor);
  note(
    ACTIVITY_ACTIONS.PRODUCT_REVIEW_FLAGS_CLEARED,
    `Cleared review flags on ${productId}: ${[...removing].join(", ") || "none"}`,
    actor,
    productId
  );
  workflowCache.kidsReconciliation = null;
  return { ok: true, product: result.product };
};

/** Set the primary image — register cover when owned, claim when claimed. */
export const setPrimaryMedia = (productId, mediaId, actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) return { ok: false, error: "Product not found." };
  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };

  if (media.productId && String(media.productId) === String(productId)) {
    const cover = mediaRepository.setCover(productId, mediaId);
    if (!cover) return { ok: false, error: "Could not set the cover." };
    note(
      ACTIVITY_ACTIONS.MEDIA_COVER_CHANGED,
      `Primary image for ${productId} set to ${mediaFileName(media)}`,
      actor,
      productId
    );
    return { ok: true, product: catalogRepository.find(productId) };
  }

  const claimed = (product.mediaIds ?? []).map(String);
  const mediaIds = claimed.includes(String(mediaId))
    ? claimed
    : [...claimed, String(mediaId)];
  const result = catalogRepository.updateDraft(
    productId,
    { primaryMediaId: String(mediaId), mediaIds, galleryMediaIds: mediaIds },
    actor
  );
  note(
    ACTIVITY_ACTIONS.MEDIA_COVER_CHANGED,
    `Primary image for ${productId} set to ${mediaFileName(media)}`,
    actor,
    productId
  );
  workflowCache.kidsReconciliation = null;
  return { ok: true, product: result.product };
};

/** Admin-only: correct the detected view label of a media asset. */
export const updateMediaViewLabel = (mediaId, view, actor = null) => {
  const media = mediaRepository.getById(mediaId);
  if (!media) return { ok: false, error: "Media not found." };
  const clean = view ? String(view).toLowerCase().trim() : null;
  const updated = mediaRepository.update(mediaId, { view: clean });
  if (!updated) return { ok: false, error: "Could not update the view label." };
  note(
    ACTIVITY_ACTIONS.MEDIA_EDITED,
    `View label for ${mediaFileName(media)} set to ${clean ?? "unlabelled"}`,
    actor,
    media.productId ?? null
  );
  return { ok: true, media: updated };
};

/* ------------------------------------------------------------------ */
/* Workflow metrics — the single snapshot for audits and the report    */
/* ------------------------------------------------------------------ */

let metricsCache = {
  fingerprint: null,
  value: null,
};

export const getWorkflowMetricsUncached = () => {
  const products = catalogRepository.all();
  const media = mediaRepository.getAll();
  const productIds = new Set(products.map((product) => String(product.id)));

  const byStatus = (status) => {
    let count = 0;
    for (let i = 0; i < products.length; i += 1) if (products[i].status === status) count += 1;
    return count;
  };
  const published = byStatus(PRODUCT_STATUS.PUBLISHED);
  const draft = byStatus(PRODUCT_STATUS.DRAFT);
  const review = byStatus(PRODUCT_STATUS.PENDING_REVIEW);
  const archived = byStatus(PRODUCT_STATUS.ARCHIVED);

  let assignedMediaCount = 0;
  let unassignedMediaCount = 0;
  let marketingCount = 0;
  let mediaDraft = 0;
  let mediaReview = 0;
  let mediaActive = 0;
  for (let i = 0; i < media.length; i += 1) {
    const m = media[i];
    if (m.scope === MEDIA_SCOPES.PRODUCT) assignedMediaCount += 1;
    if (m.scope === MEDIA_SCOPES.UNASSIGNED) unassignedMediaCount += 1;
    if (m.scope === MEDIA_SCOPES.MARKETING) marketingCount += 1;
    if (m.status === MEDIA_STATUS.DRAFT) mediaDraft += 1;
    if (m.status === MEDIA_STATUS.PENDING_REVIEW) mediaReview += 1;
    if (m.status === MEDIA_STATUS.ACTIVE) mediaActive += 1;
  }

  const ownershipPool = [];
  for (let i = 0; i < media.length; i += 1) {
    const m = media[i];
    if (m.ingested || m.source === "Ingested library") ownershipPool.push(m);
  }
  const byFile = new Map();
  for (let i = 0; i < ownershipPool.length; i += 1) {
    const item = ownershipPool[i];
    const file = mediaFileName(item).toLowerCase();
    if (!file) continue;
    if (!byFile.has(file)) byFile.set(file, []);
    byFile.get(file).push(item);
  }
  const duplicateOwnership = [];
  for (const records of byFile.values()) {
    const owners = new Set(records.map((record) => String(record.productId ?? "")));
    if (owners.size > 1) duplicateOwnership.push(records);
  }
  const orphaned = [];
  for (let i = 0; i < media.length; i += 1) {
    const item = media[i];
    if (item.productId && !productIds.has(String(item.productId))) orphaned.push(item);
  }

  const groups = buildMediaGroups(
    media
      .filter((item) => item.scope === MEDIA_SCOPES.PRODUCT || item.scope === MEDIA_SCOPES.UNASSIGNED)
      .map((item) => ({ ...item, fileName: mediaFileName(item) }))
  );
  let multiViewGroups = 0;
  let unassignedGroups = 0;
  let confirmedGroups = 0;
  for (let i = 0; i < groups.length; i += 1) {
    const g = groups[i];
    if (g.isGrouped) multiViewGroups += 1;
    let hasProduct = false;
    for (let f = 0; f < g.files.length; f += 1) if (g.files[f].productId) { hasProduct = true; break; }
    if (!hasProduct) unassignedGroups += 1;
    let allHaveProduct = true;
    if (!g.isGrouped) allHaveProduct = false;
    else {
      for (let f = 0; f < g.files.length; f += 1) if (!g.files[f].productId) { allHaveProduct = false; break; }
    }
    if (allHaveProduct) confirmedGroups += 1;
  }
  let exactDuplicates = 0;
  let potentialDuplicates = 0;
  for (let i = 0; i < media.length; i += 1) {
    const m = media[i];
    if (m.duplicateStatus === DUPLICATE_STATUS.DUPLICATE) exactDuplicates += 1;
    if (m.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE) potentialDuplicates += 1;
  }
  const storedGroups = getAllGroups().filter((group) => group.status !== "ARCHIVED");
  let variantCandidates = 0;
  for (let i = 0; i < media.length; i += 1) if (media[i].variantId) variantCandidates += 1;
  for (let i = 0; i < storedGroups.length; i += 1) if (storedGroups[i].variantReviewRequired) variantCandidates += 1;

  const potentialSameProductGroups = getPotentialProductGroups().filter((group) => !group.confirmed).length;

  const kidsMedia = [];
  for (let i = 0; i < media.length; i += 1) if (/^kids-\d{3}\.\w+$/i.test(mediaFileName(media[i]))) kidsMedia.push(media[i]);

  const kidsDrafts = [];
  const kidsPublished = [];
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    if (/^KID-\d{3}$/.test(String(p.id)) && (p.status === PRODUCT_STATUS.DRAFT || p.status === PRODUCT_STATUS.PENDING_REVIEW)) kidsDrafts.push(p);
    if (p.category === "kidswear" && p.status === PRODUCT_STATUS.PUBLISHED) kidsPublished.push(p);
  }

  const kidsGroupPool = kidsMedia.map((item) => ({ ...item, fileName: mediaFileName(item) }));
  const kidsMediaGroups = buildMediaGroups(kidsGroupPool);
  const kidsRows = getKidsReconciliationRows();
  let kidsConflictRows = 0;
  let kidsNeedsReviewRows = 0;
  let kidsReadyRows = 0;
  for (let i = 0; i < kidsRows.length; i += 1) {
    const r = kidsRows[i];
    if (r.conflicts.length) kidsConflictRows += 1;
    if (r.product.status === PRODUCT_STATUS.DRAFT && (r.conflicts.length || r.blockers.length || r.issues.length)) kidsNeedsReviewRows += 1;
    if (r.ready) kidsReadyRows += 1;
  }
  const kidsPotentialSameProductGroups = getPotentialProductGroups().filter(
    (group) =>
      !group.confirmed && group.media.every((row) => /^kids-\d{3}\.\w+$/i.test(String(row.file ?? "")))
  ).length;

  let publishedKidDrafts = 0;
  for (let i = 0; i < kidsRows.length; i += 1) if (kidsRows[i].product.status === PRODUCT_STATUS.PUBLISHED) publishedKidDrafts += 1;

  let unassignedKidsMedia = 0;
  let mediaWithValidOwnership = 0;
  let mediaClaimedByDrafts = 0;
  for (let i = 0; i < kidsMedia.length; i += 1) {
    const item = kidsMedia[i];
    if (item.scope === MEDIA_SCOPES.UNASSIGNED) unassignedKidsMedia += 1;
    if (item.productId && productIds.has(String(item.productId))) {
      let dup = false;
      for (let d = 0; d < duplicateOwnership.length; d += 1) {
        const records = duplicateOwnership[d];
        for (let r = 0; r < records.length; r += 1) if (records[r].id === item.id) { dup = true; break; }
        if (dup) break;
      }
      if (!dup) mediaWithValidOwnership += 1;
    }
    for (let kd = 0; kd < kidsDrafts.length; kd += 1) {
      const kdMediaIds = kidsDrafts[kd].mediaIds ?? [];
      for (let mId = 0; mId < kdMediaIds.length; mId += 1) if (String(kdMediaIds[mId]) === String(item.id)) { mediaClaimedByDrafts += 1; break; }
    }
  }

  return {
    products: {
      total: products.length,
      published,
      draft,
      review,
      archived,
      assigned: products.filter((product) => Boolean(product.assignedEmployeeId)).length,
    },
    media: {
      total: media.length,
      assigned: assignedMediaCount,
      unassigned: unassignedMediaCount,
      marketing: marketingCount,
      draft: mediaDraft,
      review: mediaReview,
      active: mediaActive,
      orphaned: orphaned.length,
      duplicateOwnership: duplicateOwnership.length,
      invalidProductIds: orphaned.map((item) => ({ mediaId: item.id, productId: item.productId })),
      exactDuplicates,
      potentialDuplicates,
      variantCandidates,
    },
    groups: {
      multiView: multiViewGroups,
      potentialSameProduct: potentialSameProductGroups,
      unassigned: unassignedGroups,
      confirmed: confirmedGroups,
      stored: storedGroups.length,
    },
    kids: {
      totalMedia: kidsMedia.length,
      totalGroups: kidsMediaGroups.length,
      singleImageProducts: kidsMediaGroups.filter((group) => !group.isGrouped).length,
      multiViewProducts: kidsMediaGroups.filter((group) => group.isGrouped).length,
      existingProductConflicts: kidsConflictRows,
      potentialSameProductGroups: kidsPotentialSameProductGroups,
      needsReview: kidsNeedsReviewRows,
      readyToPublish: kidsReadyRows,
      publishedKidDrafts,
      draftProducts: kidsDrafts.length,
      publishedProducts: kidsPublished.length,
      unassignedMedia: unassignedKidsMedia,
      mediaWithValidOwnership,
      mediaClaimedByDrafts,
    },
  };
};

export const getWorkflowMetrics = () => {
  const catalogV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const mediaV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  const groupsFp = getGroupsFingerprint();
  const fingerprint = makeFingerprint(catalogV, mediaV, `${groupsFp}|metrics`);
  if (metricsCache.value && metricsCache.fingerprint === fingerprint) {
    return metricsCache.value;
  }
  const result = getWorkflowMetricsUncached();
  metricsCache = { fingerprint, value: result };
  return result;
};

export default {
  productIdPrefixFor,
  genderForCategory,
  nextStableProductId,
  preferredProductIdForMedia,
  validateMediaAssignment,
  transferMediaOwnership,
  unassignProductMedia,
  createProductDraftFromMedia,
  assignProductToEmployee,
  submitProductForReview,
  approveProduct,
  returnProduct,
  publishProduct,
  archiveProduct,
  changeProductId,
  employeeCanEditProduct,
  employeeAssignedProducts,
  saveEmployeeDraft,
  pickEmployeeEditableFields,
  EMPLOYEE_EDITABLE_FIELDS,
  getProductWorkflowView,
  getMediaInbox,
  getPotentialProductGroups,
  decideProductGroup,
  KIDS_CONFLICT_ACTIONS,
  KIDS_CONFLICT_ACTION_LABELS,
  isReadyToPublish,
  getKidsReconciliationRows,
  reconcileKidsConflict,
  flagsSatisfiedByProduct,
  clearReviewFlags,
  setPrimaryMedia,
  updateMediaViewLabel,
  getWorkflowMetrics,
};
