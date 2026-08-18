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
 *   · Media inbox, potential groups and workflow metrics are memoized against
 *     catalogue, media and group versions.
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


/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

export const mediaFileName = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.url || media?.thumbnail || "").split("/").pop() ||
      media?.id ||
      ""
  );

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
 * authenticates the actor, enforces marketing isolation, requires explicit confirmation for contested
 * reassignment, cleans stale previous-owner references and revalidates both
 * products. This function is kept so existing callers keep working.
 */
export const transferMediaOwnership = (mediaId, targetProductId, actor = null, { confirm = false } = {}) =>
  safeTransferOwnership({ mediaId, targetProductId, principal: actor, confirm });

/** Detaches media from its product — COMPATIBILITY WRAPPER around the
    authorized media ownership service. */
export const unassignProductMedia = (mediaId, actor = null) =>
  safeUnassignMedia({ mediaId, principal: actor });

/** Assign a product draft to an authorized employee — COMPATIBILITY WRAPPER
    around the universal workflow command (Super Admin only). */
export const assignProductToEmployee = (productId, employeeId, actor = null) =>
  workflowCommands.assignProduct(productId, employeeId, actor);

/** Submit a draft for review — COMPATIBILITY WRAPPER around the universal
    workflow command. Publishing stays with the approver. */
export const submitProductForReview = (productId, actor = null) =>
  workflowCommands.submitProduct(productId, actor);

/** Bulk submit — per-ID delegation to the canonical individual Submit. */
export const bulkSubmitProducts = (productIds = [], actor = null) =>
  workflowCommands.bulkSubmit(productIds, actor);

/** Approve — COMPATIBILITY WRAPPER around the universal workflow command.
    Phase 2 FIX: approval does NOT publish; the product moves to APPROVED and
    requires a separate explicit publish. */
export const approveProduct = (productId, actor = null) =>
  workflowCommands.approveProduct(productId, actor);

/** Bulk approve — COMPATIBILITY WRAPPER around the universal workflow command.
    Per product this runs the exact same approveProduct path (authorization,
    lifecycle stage, canonical validation). APPROVAL DOES NOT PUBLISH. */
export const bulkApproveProducts = (productIds = [], actor = null) =>
  workflowCommands.bulkApprove(productIds, actor);

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

/** Bulk publish — per-ID delegation to the canonical individual Publish. */
export const bulkPublishProducts = (productIds = [], actor = null) =>
  workflowCommands.bulkPublish(productIds, actor);

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
 * so marketing isolation and contested-ownership rules apply to a rename exactly as they apply to any other
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
 *   · import-review flags (NEEDS_REVIEW / POSSIBLE_DUPLICATE)
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
        ? `The naming convention groups these ${group.files.length} views as one product, and import review flagged ${flaggedCount} asset(s). Confirm: one product, or separate products?`
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
      return {
        ok: false,
        error: "Select an existing canonical Product before assigning this media group.",
      };
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
/* Review readiness and corrections                                    */
/* ------------------------------------------------------------------ */

/** A draft is ready when nothing — flags, conflicts or validation — stands between it and the storefront. */
export const isReadyToPublish = (product) => {
  if (!product || product.status !== PRODUCT_STATUS.DRAFT) return false;
  const view = getProductWorkflowView(product);
  if (!view.mediaSet.primary) return false;
  if (view.conflicts.length) return false;
  if (blockingReviewFlags(product.reviewFlags).length) return false;
  return getPublishIssues(product).length === 0;
};

/**
 * Which review flags a product's CURRENT state has already satisfied —
 * used by the admin desk to retire flags the moment their field is real.
 */
export const flagsSatisfiedByProduct = (product) => {
  if (!product) return [];
  const cleared = [];
  if (!isPlaceholderProductName(product.name)) {
    cleared.push(REVIEW_FLAGS.NAME_REVIEW_REQUIRED);
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

  const ownershipPool = media.filter((item) => item.scope === MEDIA_SCOPES.PRODUCT);
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
  validateMediaAssignment,
  transferMediaOwnership,
  unassignProductMedia,
  assignProductToEmployee,
  submitProductForReview,
  bulkSubmitProducts,
  approveProduct,
  bulkApproveProducts,
  returnProduct,
  publishProduct,
  bulkPublishProducts,
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
  isReadyToPublish,
  flagsSatisfiedByProduct,
  clearReviewFlags,
  setPrimaryMedia,
  updateMediaViewLabel,
  getWorkflowMetrics,
};
