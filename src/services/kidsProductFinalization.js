/**
 * PRATIKSHYA FASHON — Kids product finalization (generic delegation).
 *
 * Kids uses the SAME product-management architecture as Women, Bridal and
 * Men. This module delegates all lifecycle actions to the generic workflow
 * commands. There is no separate Kids-specific checklist, lifecycle, or
 * status system.
 *
 * The generic workflow handles:
 *   DRAFT → PENDING_REVIEW → APPROVED → PUBLISHED
 *   PENDING_REVIEW → REJECTED → DRAFT
 *
 * Kids products travel this exact same path with the same validation,
 * the same review, the same publishing, and the same activity log.
 *
 * Legacy compatibility exports are kept so existing import sites continue
 * to work without changes.
 */

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "./catalogRepository";
import { commands as workflowCommands } from "./workflow/productWorkflowCommands";
import {
  isConfirmedKidsProductId,
  isKidsProductId,
} from "./kidsProductIdentity";

/* ------------------------------------------------------------------ */
/* Activity actions — reuse the shared diary                           */
/* ------------------------------------------------------------------ */

export const KIDS_ACTIVITY_ACTIONS = {};

/* ------------------------------------------------------------------ */
/* Checklist — generic, not Kids-specific                              */
/* ------------------------------------------------------------------ */

export const KIDS_CHECKLIST_ITEMS = [
  { id: "media", label: "Primary media assigned" },
  { id: "name", label: "Product name" },
  { id: "category", label: "Category" },
  { id: "subcategory", label: "Subcategory" },
  { id: "price", label: "Price" },
  { id: "employeeReviewed", label: "Employee reviewed" },
  { id: "adminReviewed", label: "Admin reviewed" },
  { id: "readyToPublish", label: "Ready to publish" },
  { id: "published", label: "Published" },
];

/* ------------------------------------------------------------------ */
/* Stages — same vocabulary as the generic workflow                    */
/* ------------------------------------------------------------------ */

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

/* ------------------------------------------------------------------ */
/* Is this a Kids workflow product?                                    */
/* ------------------------------------------------------------------ */

export const isKidsWorkflowProduct = (product) => {
  if (!product) return false;
  if (product.category === "kidswear") return true;
  if (isConfirmedKidsProductId(product.id)) return true;
  if (isKidsProductId(product.id)) return true;
  return false;
};

/* ------------------------------------------------------------------ */
/* Publish readiness — generic checks                                    */
/* ------------------------------------------------------------------ */

export const canPublishKidsProduct = (product) => {
  if (!product) return { ok: false, issues: ["Product not found."] };
  const issues = [];
  if (!product.name?.trim()) issues.push("Product name is required.");
  if (!product.category) issues.push("Category is required.");
  if (!product.subcategory) issues.push("Subcategory is required.");
  if (!(Number(product.price) > 0)) issues.push("Price must be greater than zero.");
  return { ok: issues.length === 0, issues };
};

export const getKidsPublishBlockers = (product) => {
  const result = canPublishKidsProduct(product);
  return result.issues || [];
};

/* ------------------------------------------------------------------ */
/* Lifecycle actions — delegate to generic workflow commands           */
/* ------------------------------------------------------------------ */

export const approveKidsProduct = (productId, actor = null) => {
  return workflowCommands.approveProduct(productId, actor);
};

export const publishKidsProduct = (productId, actor = null) => {
  return workflowCommands.publishProduct(productId, actor);
};

export const returnKidsProductToDraft = (productId, reason = "", actor = null) => {
  return workflowCommands.returnProduct(productId, reason || "Returned for further review.", actor);
};

/* ------------------------------------------------------------------ */
/* Finalization rows — empty when no products exist                    */
/* ------------------------------------------------------------------ */

export const getKidsFinalizationRows = () => {
  /* Products are dynamically discovered from the catalog repository.
     No hardcoded KID-001…KID-021 identity table. */
  const allProducts = catalogRepository.all();
  const kidsProducts = allProducts.filter((p) =>
    p.category === "kidswear" || isKidsProductId(p.id)
  );

  return kidsProducts.map((product) => ({
    productId: product.id,
    product,
    missing: false,
    stage: kidsStageOf(product),
    ready: product.status !== PRODUCT_STATUS.PUBLISHED && !getKidsPublishBlockers(product).length,
    identityConfirmed: true,
    checklist: {
      items: [],
      state: {},
      doneCount: 0,
      total: KIDS_CHECKLIST_ITEMS.length,
      complete: false,
    },
    blockers: getKidsPublishBlockers(product),
    reviewFlags: product.reviewFlags ?? [],
    conflicts: [],
    ownershipIssues: [],
  }));
};

export const getKidsFinalizationSummary = (rows = getKidsFinalizationRows()) => {
  const stage = (id) => rows.filter((row) => row.stage === id).length;
  return {
    total: rows.length,
    productIds: rows.map((row) => row.productId),
    missingRecords: 0,
    draft: stage(KIDS_STAGES.DRAFT) + stage(KIDS_STAGES.EMPLOYEE_REVIEW),
    review: stage(KIDS_STAGES.SUBMITTED) + stage(KIDS_STAGES.APPROVED),
    submitted: stage(KIDS_STAGES.SUBMITTED),
    approved: stage(KIDS_STAGES.APPROVED),
    published: stage(KIDS_STAGES.PUBLISHED),
    archived: stage(KIDS_STAGES.ARCHIVED),
    assigned: rows.filter((row) => row.product?.assignedEmployeeId).length,
    ready: rows.filter((row) => row.ready).length,
    needsReview: rows.filter((row) => !row.ready && row.stage !== KIDS_STAGES.PUBLISHED).length,
    identityConfirmed: rows.length,
    checklistComplete: 0,
    missingInformation: 0,
    ownershipConflicts: 0,
    crossProductMedia: 0,
    withoutMedia: 0,
    hoverSwaps: 0,
    unresolvedReviewFlags: 0,
  };
};

/* ------------------------------------------------------------------ */
/* Identity confirmation — no-op (identity is data-driven)             */
/* ------------------------------------------------------------------ */

export const kidsIdentityConfirmed = () => true;
export const confirmKidsProductIdentities = () => ({ ok: true, confirmed: [], missingMedia: [] });
export const ensureKidsIdentitiesConfirmed = () => false;
export const kidsGroupIdFor = (productId) => `kids-${String(productId).toLowerCase()}`;

/* ------------------------------------------------------------------ */
/* Media ownership — generic (no hardcoded plate rules)                */
/* ------------------------------------------------------------------ */

export const kidsMediaOwnershipIssues = () => [];
export const kidsHoverState = () => ({ changesOnHover: false, primary: null, hover: null });
export const kidsInventoryValid = (product) => {
  if (!product) return false;
  const stock = Number(product.stock ?? 0);
  if (!Number.isFinite(stock) || stock < 0) return false;
  if (product.availability === "made-to-order") return true;
  return stock > 0;
};

export const checklistFor = () => ({
  items: [],
  state: {},
  doneCount: 0,
  total: KIDS_CHECKLIST_ITEMS.length,
  complete: false,
});

/* Legacy re-exports for import compatibility */
export { KIDS_MEDIA_FILENAMES, KIDS_PRODUCT_IDS } from "./kidsProductIdentity";

export default {
  KIDS_ACTIVITY_ACTIONS,
  KIDS_CHECKLIST_ITEMS,
  KIDS_STAGES,
  KIDS_STAGE_LABELS,
  approveKidsProduct,
  canPublishKidsProduct,
  confirmKidsProductIdentities,
  getKidsFinalizationRows,
  getKidsFinalizationSummary,
  getKidsPublishBlockers,
  isKidsWorkflowProduct,
  kidsGroupIdFor,
  kidsHoverState,
  kidsIdentityConfirmed,
  kidsInventoryValid,
  kidsStageOf,
  publishKidsProduct,
  returnKidsProductToDraft,
};
