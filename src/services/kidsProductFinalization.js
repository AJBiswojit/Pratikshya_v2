/**
 * PRATIKSHYA FASHON — Kids product finalization (Phase 22.2).
 *
 * Phase 22 built the review architecture. Phase 22.1 reconciled ownership.
 * Phase 22.2 FINALIZES the 21 confirmed Kids products through that same
 * architecture — no second product database, no second permission model,
 * no second activity log, no second status system.
 *
 * What lives here:
 *   · the 21-product admin checklist (section 20)
 *   · the finalization row model the admin & employee desks read
 *   · the staged lifecycle on top of the EXISTING statuses:
 *         DRAFT → (assign) EMPLOYEE REVIEW → SUBMITTED (PENDING_REVIEW)
 *              → ADMIN REVIEW → APPROVED (review.state) → PUBLISHED
 *   · Kids-specific media-ownership auditing (one product ↔ its own plate)
 *
 * Everything writes through `catalogRepository` / `mediaRepository` /
 * `productWorkflow` and is signed in the shared activity diary.
 *
 * Nothing here publishes automatically. Ever.
 */

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
  getPublishIssues,
} from "./catalogRepository";
import { commands as workflowCommands } from "./workflow/productWorkflowCommands";
import mediaRepository from "./media/mediaRepository";
import { getProductMediaSet } from "./media/productMediaSet";
import taxonomyRepository from "./taxonomyRepository";
import { blockingReviewFlags, isPlaceholderProductName } from "./productReviewFlags";
import {
  GROUP_DECISIONS,
  createGroup,
  getGroupById,
  setGroupDecision,
  setGroupProduct,
} from "./media/productMediaGroups";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "./employees/activityService";
import { getEmployee, loadEmployees } from "./employees/employeeService";
import { employeeFullName } from "../utils/employee";
import {
  CONFIRMED_KIDS_IDENTITIES,
  KIDS_GROUP_DECISION,
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  confirmedKidsIdentityFor,
  isConfirmedKidsProductId,
  isKidsProductId,
  kidsFileNameOf,
  kidsMediaFileForProductId,
  kidsNameLooksForeign,
  kidsProductIdForFile,
  kidsSubcategoryLooksForeign,
} from "./kidsProductIdentity";

/* ------------------------------------------------------------------ */
/* Activity — reuse the shared diary, never a second log               */
/* ------------------------------------------------------------------ */

/**
 * The Kids lifecycle events of section 19 mapped onto the Phase 22 actions
 * that already exist. Reuse, never duplicate: `KIDS_PRODUCT_PUBLISHED` is
 * `PRODUCT_PUBLISHED` with a KID target, and so on. The map is exported so
 * the report and the audit can name the events the phase asks for.
 */
export const KIDS_ACTIVITY_ACTIONS = {
  KIDS_PRODUCT_CREATED: ACTIVITY_ACTIONS.PRODUCT_DRAFT_CREATED,
  KIDS_PRODUCT_UPDATED: ACTIVITY_ACTIONS.PRODUCT_UPDATED,
  KIDS_PRODUCT_ASSIGNED: ACTIVITY_ACTIONS.PRODUCT_ASSIGNED,
  KIDS_PRODUCT_SUBMITTED: ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW,
  KIDS_PRODUCT_APPROVED: ACTIVITY_ACTIONS.PRODUCT_APPROVED,
  KIDS_PRODUCT_PUBLISHED: ACTIVITY_ACTIONS.PRODUCT_PUBLISHED,
  KIDS_MEDIA_TRANSFERRED: ACTIVITY_ACTIONS.PRODUCT_MEDIA_TRANSFERRED,
  KIDS_MEDIA_GROUP_CONFIRMED: ACTIVITY_ACTIONS.PRODUCT_GROUP_DECIDED,
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

const employeeLabel = (employeeId) => {
  if (!employeeId) return null;
  try {
    const employee = getEmployee(loadEmployees(), employeeId);
    return employee ? employeeFullName(employee) : String(employeeId);
  } catch {
    return String(employeeId);
  }
};

/* ------------------------------------------------------------------ */
/* 1. Confirmed identity — recorded as an explicit group decision      */
/* ------------------------------------------------------------------ */

export const kidsGroupIdFor = (productId) => `kids-confirmed-${String(productId).toLowerCase()}`;

/**
 * Records SEPARATE_PRODUCT for every confirmed Kids asset in the existing
 * group-decision register. Idempotent: an already-confirmed identity is
 * left exactly as it is, so the decision is written once and then simply
 * re-read forever.
 *
 * This is what makes the similarity-review mechanism unable to override
 * the confirmation: the group carries a closed human decision, and
 * `decideProductGroup` refuses to merge two confirmed Kids identities.
 */
export const confirmKidsProductIdentities = (actor = null) => {
  const actorName =
    typeof actor === "string" ? actor : actor?.label ?? actor?.name ?? null;

  const byFile = new Map();
  mediaRepository.getAll().forEach((media) => {
    const file = kidsFileNameOf(media);
    if (file && !byFile.has(file)) byFile.set(file, media);
  });

  const confirmed = [];
  const missingMedia = [];

  CONFIRMED_KIDS_IDENTITIES.forEach((identity) => {
    const media = byFile.get(identity.file) ?? null;
    if (!media) {
      missingMedia.push(identity.file);
      return;
    }
    const groupId = kidsGroupIdFor(identity.productId);
    const existing = getGroupById(groupId);
    if (existing?.decision === GROUP_DECISIONS.SEPARATE_PRODUCTS) {
      confirmed.push({ ...identity, mediaId: media.id, alreadyConfirmed: true });
      return;
    }
    if (!existing) {
      createGroup(
        {
          id: groupId,
          groupKey: identity.groupKey,
          label: `${identity.productId} · ${identity.file}`,
          mediaIds: [media.id],
          productId: identity.productId,
          source: "MANUAL",
          reason:
            "Phase 22.2 — confirmed by the house: one Kids media asset is one separate Kids product.",
        },
        actorName
      );
    }
    setGroupDecision(groupId, GROUP_DECISIONS.SEPARATE_PRODUCTS, actorName);
    setGroupProduct(groupId, identity.productId, actorName);
    note(
      KIDS_ACTIVITY_ACTIONS.KIDS_MEDIA_GROUP_CONFIRMED,
      `${identity.productId} · ${KIDS_GROUP_DECISION} — ${identity.file} is its own product`,
      actor,
      identity.productId
    );
    confirmed.push({ ...identity, mediaId: media.id, alreadyConfirmed: false });
  });

  return { ok: missingMedia.length === 0, confirmed, missingMedia };
};

/**
 * Idempotent bootstrap. The confirmation is a house decision, not a user
 * preference, so it is (re)written into the decision register the first
 * time this session reads the Kids workspace — exactly once, and never
 * again while the decisions stand.
 */
let identitiesEnsured = false;

/**
 * Records the SEPARATE_PRODUCT decision for all 21 confirmed identities if it
 * is not already on file.
 *
 * The decision is a system-owned invariant — it is what the house has already
 * confirmed, not a task an admin must remember to perform — so this runs
 * lazily wherever identity is asserted. The `identitiesEnsured` latch keeps
 * the common case to a single pass per session, but it is only trusted while
 * the register still agrees: if a decision goes missing (a reset, a cleared
 * store, a failed write) the latch is dropped and the decision re-recorded,
 * so a publish can never be blocked by bookkeeping the system owns.
 *
 * @param {object|string|null} actor
 * @param {{ force?: boolean }} [options]
 * @returns {boolean} whether anything new was confirmed
 */
export const ensureKidsIdentitiesConfirmed = (actor = null, { force = false } = {}) => {
  if (identitiesEnsured && !force) {
    const intact = KIDS_PRODUCT_IDS.every((productId) => kidsIdentityConfirmed(productId));
    if (intact) return false;
    identitiesEnsured = false;
  }
  identitiesEnsured = true;
  const result = confirmKidsProductIdentities(actor ?? "Phase 22.2 confirmation");
  return result.confirmed.some((entry) => !entry.alreadyConfirmed);
};

/** Is the confirmed SEPARATE_PRODUCT decision on record for this product? */
export const kidsIdentityConfirmed = (productId) => {
  if (!isConfirmedKidsProductId(productId)) return false;
  const group = getGroupById(kidsGroupIdFor(productId));
  return group?.decision === GROUP_DECISIONS.SEPARATE_PRODUCTS;
};

/* ------------------------------------------------------------------ */
/* 2. Media ownership — one product, only its own plate                */
/* ------------------------------------------------------------------ */

const mediaRecordsFor = (product) => {
  const ids = new Set(
    [
      ...(Array.isArray(product?.mediaIds) ? product.mediaIds : []),
      ...(Array.isArray(product?.galleryMediaIds) ? product.galleryMediaIds : []),
      product?.primaryMediaId,
    ]
      .filter(Boolean)
      .map(String)
  );
  return [...ids].map((id) => mediaRepository.getById(id)).filter(Boolean);
};

/**
 * The Kids ownership rule (sections 11 & 13):
 *   KID-001 → kids-001.webp   ·   KID-002 → kids-002.webp
 * A KID product may never reference, claim or own another KID's plate.
 */
export const kidsMediaOwnershipIssues = (product) => {
  if (!product || !isConfirmedKidsProductId(product.id)) return [];
  const expected = kidsMediaFileForProductId(product.id);
  const issues = [];

  const claimed = mediaRecordsFor(product);
  claimed.forEach((media) => {
    const file = kidsFileNameOf(media);
    const belongsTo = kidsProductIdForFile(file);
    if (belongsTo && belongsTo !== product.id) {
      issues.push({
        kind: "CROSS_PRODUCT_MEDIA",
        mediaId: media.id,
        file,
        belongsTo,
        message: `${product.id} references ${file}, which is the confirmed media of ${belongsTo}.`,
      });
    }
  });

  /* The register side: any Kids plate owned by the wrong KID product. */
  mediaRepository
    .getAll()
    .filter((media) => String(media.productId ?? "") === String(product.id))
    .forEach((media) => {
      const file = kidsFileNameOf(media);
      const belongsTo = kidsProductIdForFile(file);
      if (belongsTo && belongsTo !== product.id) {
        issues.push({
          kind: "CROSS_PRODUCT_OWNERSHIP",
          mediaId: media.id,
          file,
          belongsTo,
          message: `${product.id} owns ${file}, which is the confirmed media of ${belongsTo}.`,
        });
      }
    });

  const set = getProductMediaSet(product);
  (set.gallery ?? []).forEach((item) => {
    const file = kidsFileNameOf(item);
    const belongsTo = kidsProductIdForFile(file);
    if (belongsTo && belongsTo !== product.id) {
      issues.push({
        kind: "CROSS_PRODUCT_GALLERY",
        mediaId: item.id ?? null,
        file,
        belongsTo,
        message: `${product.id} resolves ${file} in its gallery, which belongs to ${belongsTo}.`,
      });
    }
  });

  if (set.primary) {
    const primaryFile = kidsFileNameOf(set.primary);
    if (expected && primaryFile && primaryFile !== expected) {
      const belongsTo = kidsProductIdForFile(primaryFile);
      if (belongsTo) {
        issues.push({
          kind: "WRONG_PRIMARY",
          mediaId: set.primary.id ?? null,
          file: primaryFile,
          belongsTo,
          message: `${product.id} shows ${primaryFile} as its primary image; its confirmed plate is ${expected}.`,
        });
      }
    }
  }

  /* Deduplicate by kind+file so the desk shows one line per real problem. */
  const seen = new Set();
  return issues.filter((issue) => {
    const key = `${issue.kind}:${issue.file}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** Hover rule (section 12): a standalone plate must never swap on hover. */
export const kidsHoverState = (product) => {
  const set = getProductMediaSet(product);
  const alternates = (set.gallery ?? []).filter(
    (item) => kidsFileNameOf(item) !== kidsFileNameOf(set.primary)
  );
  return {
    primaryFile: kidsFileNameOf(set.primary) || null,
    hoverFile: set.hasAlternate ? kidsFileNameOf(set.hover) || null : null,
    hasAlternate: Boolean(set.hasAlternate) && alternates.length > 0,
    changesOnHover: Boolean(set.hasAlternate) && alternates.length > 0,
  };
};

/* ------------------------------------------------------------------ */
/* 3. Inventory                                                        */
/* ------------------------------------------------------------------ */

/**
 * A Kids product may only publish with a deliberate inventory state:
 * a positive stock count, or an explicit made-to-order availability.
 * "Nobody set it yet" (0 units, in-stock) is not a valid published state.
 */
export const kidsInventoryValid = (product) => {
  if (!product) return false;
  const stock = Number(product.stock ?? 0);
  if (!Number.isFinite(stock) || stock < 0) return false;
  if (product.availability === "made-to-order") return true;
  return stock > 0;
};

/* ------------------------------------------------------------------ */
/* 4. Publish validation (section 15)                                  */
/* ------------------------------------------------------------------ */

const validKidsSubcategory = (product) => {
  const value = String(product?.subcategory ?? "").trim();
  if (!value) return false;
  if (kidsSubcategoryLooksForeign(value)) return false;
  try {
    const options = taxonomyRepository.subcategoryOptionsFor("kidswear") ?? [];
    if (!options.length) return true;
    return options.some((option) => String(option).toLowerCase() === value.toLowerCase());
  } catch {
    return true;
  }
};

/**
 * The complete BLOCK PUBLISH list for a confirmed Kids product, with the
 * exact reason for every failing condition. The shared repository rules
 * (Product ID, name, category, price, media, ownership, group decisions,
 * review flags) come first; the Kids rules of Phase 22.2 follow.
 */
/**
 * A product the Kids finalization desk is responsible for: one of the 21
 * confirmed identities, any further KID-xxx record, or any product filed
 * under the existing Kids Wear category.
 */
export const isKidsWorkflowProduct = (product) =>
  Boolean(
    product &&
      (isConfirmedKidsProductId(product.id) ||
        isKidsProductId(product.id) ||
        product.category === "kidswear")
  );

export const getKidsPublishBlockers = (product) => {
  if (!product) return ["Product not found."];
  const reasons = [...getPublishIssues(product)];

  /* The Kids rules apply to every Kids product — the 21 confirmed ones and
     any further KID-xxx record created later. Non-Kids products keep the
     shared catalogue validation only. */
  const confirmed = isConfirmedKidsProductId(product.id);
  if (!isKidsWorkflowProduct(product)) return reasons;

  if (product.category !== "kidswear") {
    reasons.push(`Category must be Kids Wear — ${product.id} is currently “${product.category || "unset"}”.`);
  }
  if (kidsNameLooksForeign(product.name)) {
    reasons.push(
      `NAME REVIEW REQUIRED — “${product.name}” reads like another department's product, not a Kids product.`
    );
  }
  if (!validKidsSubcategory(product)) {
    reasons.push(
      "SUBCATEGORY REVIEW REQUIRED — choose a valid Kids Wear subcategory from the existing taxonomy."
    );
  }
  if (confirmed && !kidsIdentityConfirmed(product.id)) {
    /* The SEPARATE_PRODUCT decision for the 21 is a system-owned invariant,
       not something an admin has to discover and perform by hand. Record it
       now — then only a genuine failure to persist it can block publishing. */
    ensureKidsIdentitiesConfirmed();
    if (!kidsIdentityConfirmed(product.id)) {
      reasons.push(
        `Confirmed product identity missing — record the ${KIDS_GROUP_DECISION} decision for ${product.id} first.`
      );
    }
  }
  const expected = kidsMediaFileForProductId(product.id);
  const set = getProductMediaSet(product);
  if (expected && !set.primary) {
    reasons.push(`Primary media missing — ${product.id} must own ${expected}.`);
  }
  kidsMediaOwnershipIssues(product).forEach((issue) => reasons.push(issue.message));
  if (!kidsInventoryValid(product)) {
    reasons.push(
      "Inventory state invalid — set a stock quantity (or mark the piece made-to-order) before publishing."
    );
  }

  return [...new Set(reasons)];
};

export const canPublishKidsProduct = (product) => getKidsPublishBlockers(product).length === 0;

/* ------------------------------------------------------------------ */
/* 5. The 21-product checklist (section 20)                            */
/* ------------------------------------------------------------------ */

export const KIDS_CHECKLIST_ITEMS = [
  { id: "media", label: "Correct media" },
  { id: "name", label: "Correct name" },
  { id: "category", label: "Correct category" },
  { id: "subcategory", label: "Correct subcategory" },
  { id: "price", label: "Correct price" },
  { id: "employeeReviewed", label: "Employee reviewed" },
  { id: "adminReviewed", label: "Admin reviewed" },
  { id: "readyToPublish", label: "Ready to publish" },
  { id: "published", label: "Published" },
];

const checklistFor = (product) => {
  const expected = kidsMediaFileForProductId(product.id);
  const set = getProductMediaSet(product);
  const ownership = kidsMediaOwnershipIssues(product);
  const primaryFile = kidsFileNameOf(set.primary);

  const mediaDone =
    Boolean(set.primary) &&
    ownership.length === 0 &&
    (!expected || primaryFile === expected) &&
    (set.ownershipConflicts ?? []).length === 0;

  const nameDone =
    Boolean(product.name?.trim()) &&
    !isPlaceholderProductName(product.name) &&
    !kidsNameLooksForeign(product.name);

  const categoryDone = product.category === "kidswear";
  const subcategoryDone = validKidsSubcategory(product);
  const priceDone =
    Number(product.price) > 0 &&
    (!(Number(product.compareAtPrice) > 0) || Number(product.compareAtPrice) >= Number(product.price));

  const employeeReviewed = Boolean(product.review?.submittedAt);
  const adminReviewed =
    product.review?.state === REVIEW_STATE.APPROVED || product.status === PRODUCT_STATUS.PUBLISHED;
  const published = product.status === PRODUCT_STATUS.PUBLISHED;
  const readyToPublish = published || canPublishKidsProduct(product);

  const reason = {
    media: mediaDone
      ? null
      : ownership.length
        ? ownership[0].message
        : !set.primary
          ? `No primary image owned by ${product.id}${expected ? ` (expected ${expected})` : ""}.`
          : (set.ownershipConflicts ?? []).length
            ? "Media ownership is still contested."
            : `Primary image should be ${expected}.`,
    name: nameDone
      ? null
      : kidsNameLooksForeign(product.name)
        ? "NAME REVIEW REQUIRED — the name belongs to another department."
        : "NAME REVIEW REQUIRED — give the product a real Kids name.",
    category: categoryDone ? null : "Category must be Kids Wear.",
    subcategory: subcategoryDone ? null : "SUBCATEGORY REVIEW REQUIRED.",
    price: priceDone ? null : "Set a valid price (and a compare-at price above it, if used).",
    employeeReviewed: employeeReviewed ? null : "Awaiting the assigned employee's submission.",
    adminReviewed: adminReviewed ? null : "Awaiting admin approval.",
    readyToPublish: readyToPublish ? null : "Publishing is still blocked — see the reasons.",
    published: published ? null : "Not published yet.",
  };

  const state = {
    media: mediaDone,
    name: nameDone,
    category: categoryDone,
    subcategory: subcategoryDone,
    price: priceDone,
    employeeReviewed,
    adminReviewed,
    readyToPublish,
    published,
  };

  const items = KIDS_CHECKLIST_ITEMS.map((entry) => ({
    id: entry.id,
    label: entry.label,
    done: Boolean(state[entry.id]),
    reason: reason[entry.id] ?? null,
  }));

  return {
    items,
    state,
    doneCount: items.filter((item) => item.done).length,
    total: items.length,
    complete: items.every((item) => item.done),
  };
};

/* ------------------------------------------------------------------ */
/* 6. Finalization rows — the model both workspaces read               */
/* ------------------------------------------------------------------ */

/** The lifecycle stage, expressed with the EXISTING status vocabulary. */
export const KIDS_STAGES = {
  DRAFT: "DRAFT",
  EMPLOYEE_REVIEW: "EMPLOYEE_REVIEW",
  SUBMITTED: "SUBMITTED",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

export const KIDS_STAGE_LABELS = {
  [KIDS_STAGES.DRAFT]: "Draft",
  [KIDS_STAGES.EMPLOYEE_REVIEW]: "Employee review",
  [KIDS_STAGES.SUBMITTED]: "Submitted",
  [KIDS_STAGES.APPROVED]: "Approved",
  [KIDS_STAGES.PUBLISHED]: "Published",
  [KIDS_STAGES.ARCHIVED]: "Archived",
};

export const kidsStageOf = (product) => {
  if (!product) return KIDS_STAGES.DRAFT;
  if (product.status === PRODUCT_STATUS.PUBLISHED) return KIDS_STAGES.PUBLISHED;
  if (product.status === PRODUCT_STATUS.ARCHIVED) return KIDS_STAGES.ARCHIVED;
  if (product.review?.state === REVIEW_STATE.APPROVED) return KIDS_STAGES.APPROVED;
  if (product.status === PRODUCT_STATUS.PENDING_REVIEW) return KIDS_STAGES.SUBMITTED;
  if (product.assignedEmployeeId) return KIDS_STAGES.EMPLOYEE_REVIEW;
  return KIDS_STAGES.DRAFT;
};

let finalizationCache = {
  catalogVersion: -1,
  mediaVersion: -1,
  rows: null,
};

const getFinalizationFingerprint = () => {
  const catV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const medV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  return `${catV}|${medV}`;
};

/**
 * One finalization row per confirmed Kids product, always 21 rows —
 * a missing record is reported rather than silently skipped.
 * CACHED against catalogVersion + mediaVersion.
 */
export const getKidsFinalizationRowsUncached = () => {
  ensureKidsIdentitiesConfirmed();
  const byFile = new Map();
  const allMedia = mediaRepository.getAll();
  for (let i = 0; i < allMedia.length; i += 1) {
    const media = allMedia[i];
    const file = kidsFileNameOf(media);
    if (file && !byFile.has(file)) byFile.set(file, media);
  }

  const rows = [];
  for (let idx = 0; idx < CONFIRMED_KIDS_IDENTITIES.length; idx += 1) {
    const identity = CONFIRMED_KIDS_IDENTITIES[idx];
    const product = catalogRepository.find(identity.productId);
    const media = byFile.get(identity.file) ?? null;

    if (!product) {
      rows.push({
        identity,
        productId: identity.productId,
        mediaFile: identity.file,
        product: null,
        missing: true,
        media,
        mediaSet: null,
        conflicts: [],
        ownershipIssues: [],
        hover: null,
        blockers: [`${identity.productId} is missing from the product register.`],
        reviewFlags: [],
        checklist: { items: [], state: {}, doneCount: 0, total: KIDS_CHECKLIST_ITEMS.length, complete: false },
        stage: KIDS_STAGES.DRAFT,
        assignedEmployeeId: null,
        assignedEmployeeName: null,
        identityConfirmed: kidsIdentityConfirmed(identity.productId),
        ready: false,
      });
      continue;
    }

    const mediaSet = getProductMediaSet(product);
    const blockers = getKidsPublishBlockers(product);
    const checklist = checklistFor(product);

    rows.push({
      identity,
      productId: product.id,
      mediaFile: identity.file,
      product,
      missing: false,
      media,
      mediaSet,
      conflicts: mediaSet.ownershipConflicts ?? [],
      ownershipIssues: kidsMediaOwnershipIssues(product),
      hover: kidsHoverState(product),
      blockers,
      reviewFlags: product.reviewFlags ?? [],
      blockingFlags: blockingReviewFlags(product.reviewFlags),
      checklist,
      stage: kidsStageOf(product),
      assignedEmployeeId: product.assignedEmployeeId ?? null,
      assignedEmployeeName: employeeLabel(product.assignedEmployeeId),
      identityConfirmed: kidsIdentityConfirmed(product.id),
      ready: product.status !== PRODUCT_STATUS.PUBLISHED && blockers.length === 0,
    });
  }
  return rows;
};

export const getKidsFinalizationRows = () => {
  const catV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const medV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  if (finalizationCache.rows && finalizationCache.catalogVersion === catV && finalizationCache.mediaVersion === medV) {
    return finalizationCache.rows;
  }
  const rows = getKidsFinalizationRowsUncached();
  finalizationCache = { catalogVersion: catV, mediaVersion: medV, rows };
  return rows;
};

/** The admin's one-glance summary of the 21 products. */
export const getKidsFinalizationSummary = (rows = getKidsFinalizationRows()) => {
  const stage = (id) => rows.filter((row) => row.stage === id).length;
  return {
    total: rows.length,
    productIds: rows.map((row) => row.productId),
    missingRecords: rows.filter((row) => row.missing).length,
    draft: stage(KIDS_STAGES.DRAFT) + stage(KIDS_STAGES.EMPLOYEE_REVIEW),
    review: stage(KIDS_STAGES.SUBMITTED) + stage(KIDS_STAGES.APPROVED),
    submitted: stage(KIDS_STAGES.SUBMITTED),
    approved: stage(KIDS_STAGES.APPROVED),
    published: stage(KIDS_STAGES.PUBLISHED),
    archived: stage(KIDS_STAGES.ARCHIVED),
    assigned: rows.filter((row) => row.assignedEmployeeId).length,
    ready: rows.filter((row) => row.ready).length,
    needsReview: rows.filter((row) => !row.ready && row.stage !== KIDS_STAGES.PUBLISHED).length,
    identityConfirmed: rows.filter((row) => row.identityConfirmed).length,
    checklistComplete: rows.filter((row) => row.checklist.complete).length,
    missingInformation: rows.filter((row) => !row.checklist.state.name || !row.checklist.state.price || !row.checklist.state.subcategory).length,
    ownershipConflicts: rows.reduce((sum, row) => sum + row.conflicts.length, 0),
    crossProductMedia: rows.reduce((sum, row) => sum + row.ownershipIssues.length, 0),
    withoutMedia: rows.filter((row) => !row.mediaSet?.primary).length,
    hoverSwaps: rows.filter((row) => row.hover?.changesOnHover).length,
    unresolvedReviewFlags: rows.filter((row) => (row.blockingFlags ?? []).length > 0).length,
  };
};

/* ------------------------------------------------------------------ */
/* 7. Lifecycle actions                                                */
/* ------------------------------------------------------------------ */

/**
 * ADMIN REVIEW → APPROVED — COMPATIBILITY WRAPPER.
 *
 * Phase 2 FIX: Kids no longer has a separate lifecycle. This wrapper
 * delegates to the UNIVERSAL workflow command, which requires the
 * submitted/Admin-review stage, runs the universal + Kids category
 * validation, records approval and NEVER publishes. The Kids-specific
 * checks are invoked automatically by the universal validator's category
 * registry (kidswear → validateKidsProduct).
 */
export const approveKidsProduct = (productId, actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) {
    return { ok: false, error: "Product not found.", errors: ["Product not found."] };
  }
  if (!isKidsWorkflowProduct(product)) {
    return { ok: false, error: "Not a Kids product.", errors: ["Not a Kids product."] };
  }
  return workflowCommands.approveProduct(productId, actor);
};

/**
 * APPROVED → PUBLISHED — COMPATIBILITY WRAPPER.
 *
 * Delegates to the UNIVERSAL publish command: requires the APPROVED stage
 * and revalidates the product, media ownership, taxonomy, price and the
 * Kids category validator atomically. A confirmed Kids product only reaches
 * the storefront after an explicit approval AND an explicit publish.
 */
export const publishKidsProduct = (productId, actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) {
    return { ok: false, error: "Product not found.", errors: ["Product not found."] };
  }
  if (!isKidsWorkflowProduct(product)) {
    return { ok: false, error: "Not a Kids product.", errors: ["Not a Kids product."] };
  }
  return workflowCommands.publishProduct(productId, actor);
};

/** Return a submitted/approved Kids product — COMPATIBILITY WRAPPER around
    the universal returnProduct command (Admin only, reason required). */
export const returnKidsProductToDraft = (productId, reason = "", actor = null) => {
  const product = catalogRepository.find(productId);
  if (!product) {
    return { ok: false, error: "Product not found.", errors: ["Product not found."] };
  }
  if (!isKidsWorkflowProduct(product)) {
    return { ok: false, error: "Not a Kids product.", errors: ["Not a Kids product."] };
  }
  return workflowCommands.returnProduct(productId, reason || "Returned for further review.", actor);
};

export default {
  KIDS_ACTIVITY_ACTIONS,
  KIDS_CHECKLIST_ITEMS,
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  KIDS_STAGES,
  KIDS_STAGE_LABELS,
  approveKidsProduct,
  canPublishKidsProduct,
  confirmKidsProductIdentities,
  confirmedKidsIdentityFor,
  getKidsFinalizationRows,
  getKidsFinalizationSummary,
  getKidsPublishBlockers,
  isKidsWorkflowProduct,
  kidsGroupIdFor,
  kidsHoverState,
  kidsIdentityConfirmed,
  kidsInventoryValid,
  kidsMediaOwnershipIssues,
  kidsStageOf,
  publishKidsProduct,
  returnKidsProductToDraft,
};
