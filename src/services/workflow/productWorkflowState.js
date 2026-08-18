/**
 * PRATIKSHYA FASHON — Canonical workflow projection (Phase 2, Step A).
 *
 * The repository still persists the compatibility fields:
 *
 *   product.status            DRAFT | PENDING_REVIEW | PUBLISHED | ARCHIVED
 *   product.review.state      NONE | PENDING | APPROVED | REJECTED
 *   product.assignedEmployeeId
 *
 * This module derives ONE canonical workflow stage from those fields WITHOUT
 * mutating them. It is a read-only adapter/projection:
 *
 *   DRAFT → ASSIGNED → IN_EMPLOYEE_REVIEW → SUBMITTED → IN_ADMIN_REVIEW
 *         → APPROVED → PUBLISHED → ARCHIVED
 *
 * RETURNED is not a long-lived stage — it is a presentation/result that maps
 * back to the editable DRAFT / IN_EMPLOYEE_REVIEW operational stage, carrying
 * the rejection reason for the UI.
 *
 * Precedence (highest first):
 *   1. ARCHIVED                → ARCHIVED
 *   2. PUBLISHED               → PUBLISHED   (existing published records are
 *                                            grandfathered — never demoted)
 *   3. review.state APPROVED   → APPROVED    (approved but NOT yet published)
 *   4. pending status          → SUBMITTED   (review PENDING, awaiting Admin)
 *                              → IN_ADMIN_REVIEW (Admin began the review)
 *   5. rejected review         → RETURNED presentation, operational stage
 *                                IN_EMPLOYEE_REVIEW when assigned, else DRAFT
 *   6. assigned + employee work→ IN_EMPLOYEE_REVIEW
 *   7. assigned                → ASSIGNED
 *   8. otherwise               → DRAFT
 *
 * Rules:
 *   · existing PUBLISHED records MUST remain PUBLISHED
 *   · existing ARCHIVED records MUST remain ARCHIVED
 *   · every department maps through the same projection
 *   · nothing here writes — projection is pure
 */

export const WORKFLOW_STAGES = {
  DRAFT: "DRAFT",
  ASSIGNED: "ASSIGNED",
  IN_EMPLOYEE_REVIEW: "IN_EMPLOYEE_REVIEW",
  SUBMITTED: "SUBMITTED",
  IN_ADMIN_REVIEW: "IN_ADMIN_REVIEW",
  APPROVED: "APPROVED",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

export const WORKFLOW_STAGE_LABELS = {
  [WORKFLOW_STAGES.DRAFT]: "Draft",
  [WORKFLOW_STAGES.ASSIGNED]: "Assigned",
  [WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW]: "Employee review",
  [WORKFLOW_STAGES.SUBMITTED]: "Submitted",
  [WORKFLOW_STAGES.IN_ADMIN_REVIEW]: "Admin review",
  [WORKFLOW_STAGES.APPROVED]: "Approved",
  [WORKFLOW_STAGES.PUBLISHED]: "Published",
  [WORKFLOW_STAGES.ARCHIVED]: "Archived",
};

/** Presentation value for a returned product (not a long-lived stage). */
export const RETURNED_PRESENTATION = "RETURNED";

/**
 * The persisted statuses the repository actually writes (compatibility
 * vocabulary — mirrors catalogRepository.PRODUCT_STATUS / REVIEW_STATE).
 */
const STATUS_PUBLISHED = "PUBLISHED";
const STATUS_ARCHIVED = "ARCHIVED";
const PENDING_STATUSES = new Set(["PENDING_REVIEW", "REVIEW", "IN_REVIEW", "UNDER_REVIEW"]);

const REVIEW_APPROVED = "APPROVED";
const REVIEW_REJECTED = "REJECTED";
const REVIEW_PENDING = "PENDING";

const isPendingStatus = (status) => PENDING_STATUSES.has(String(status ?? "").toUpperCase());

/** Stages an employee may keep editing. */
export const EMPLOYEE_EDITABLE_STAGES = new Set([
  WORKFLOW_STAGES.DRAFT,
  WORKFLOW_STAGES.ASSIGNED,
  WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW,
]);

/** Stages that may be submitted for Admin review. */
export const SUBMITTABLE_STAGES = new Set([
  WORKFLOW_STAGES.DRAFT,
  WORKFLOW_STAGES.ASSIGNED,
  WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW,
]);

/** Stages an Admin may approve (submitted / under admin review). */
export const APPROVABLE_STAGES = new Set([
  WORKFLOW_STAGES.SUBMITTED,
  WORKFLOW_STAGES.IN_ADMIN_REVIEW,
]);

/**
 * Optional additive marker the workflow commands write when the assigned
 * employee first saves a draft edit. Kept OFF the compatibility fields; the
 * projection only consults it when present. Absent → ASSIGNED stays ASSIGNED.
 */
export const employeeReviewStartedAtOf = (product) =>
  product?.workflow?.employeeReviewStartedAt ?? product?.review?.employeeReviewStartedAt ?? null;

/**
 * Derives the canonical workflow state for a product record.
 *
 * @param {object|null} product a normalized product record (compat shape)
 * @returns {object} {
 *   stage, label, presentation, returned, rejectionReason,
 *   editable, assignee, pendingStatus, reviewState
 * }
 */
export const getProductWorkflowState = (product) => {
  if (!product || typeof product !== "object") {
    return {
      stage: null,
      label: "Unknown",
      presentation: null,
      returned: false,
      rejectionReason: null,
      editable: false,
      assignee: null,
      pendingStatus: false,
      reviewState: null,
    };
  }

  const status = String(product.status ?? "").toUpperCase();
  const reviewState = String(product.review?.state ?? "NONE").toUpperCase();
  const assignee = product.assignedEmployeeId ?? null;
  const rejectionReason = product.review?.rejectionReason ?? null;

  const base = {
    pendingStatus: isPendingStatus(status),
    reviewState,
    assignee,
    rejectionReason,
    label: null,
    stage: null,
    presentation: null,
    returned: false,
    editable: false,
  };

  if (status === STATUS_ARCHIVED) {
    return { ...base, stage: WORKFLOW_STAGES.ARCHIVED, label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.ARCHIVED] };
  }

  if (status === STATUS_PUBLISHED) {
    /* Grandfathered — an existing published product stays PUBLISHED. */
    return { ...base, stage: WORKFLOW_STAGES.PUBLISHED, label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.PUBLISHED] };
  }

  if (reviewState === REVIEW_APPROVED) {
    /* Approved but explicitly NOT published (the Phase 2 decoupling). */
    return { ...base, stage: WORKFLOW_STAGES.APPROVED, label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.APPROVED] };
  }

  if (isPendingStatus(status)) {
    if (product.workflow?.adminReviewStartedAt || product.review?.adminReviewStartedAt) {
      /* An Admin has explicitly begun reviewing this submission. */
      return {
        ...base,
        stage: WORKFLOW_STAGES.IN_ADMIN_REVIEW,
        label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.IN_ADMIN_REVIEW],
      };
    }
    if (reviewState === REVIEW_PENDING) {
      /* Submitted, waiting for the Admin to pick it up. */
      return {
        ...base,
        stage: WORKFLOW_STAGES.SUBMITTED,
        label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.SUBMITTED],
      };
    }
    /* Legacy pending rows without a review state are treated as submitted. */
    return {
      ...base,
      stage: WORKFLOW_STAGES.SUBMITTED,
      label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.SUBMITTED],
    };
  }

  if (reviewState === REVIEW_REJECTED) {
    /* RETURNED is a result, not a stage: the record is back in an editable
       operational state with the reason preserved. */
    const operational = assignee ? WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW : WORKFLOW_STAGES.DRAFT;
    return {
      ...base,
      stage: operational,
      presentation: RETURNED_PRESENTATION,
      returned: true,
      label: WORKFLOW_STAGE_LABELS[operational],
    };
  }

  if (assignee) {
    if (employeeReviewStartedAtOf(product)) {
      return {
        ...base,
        stage: WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW,
        label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW],
      };
    }
    return { ...base, stage: WORKFLOW_STAGES.ASSIGNED, label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.ASSIGNED] };
  }

  return { ...base, stage: WORKFLOW_STAGES.DRAFT, label: WORKFLOW_STAGE_LABELS[WORKFLOW_STAGES.DRAFT] };
};

/** True when the canonical stage accepts employee edits. */
export const isEditableStage = (stage) => EMPLOYEE_EDITABLE_STAGES.has(stage);

/** True when the canonical stage may be submitted for Admin review. */
export const isSubmittableStage = (stage) => SUBMITTABLE_STAGES.has(stage);

/** True when the canonical stage may be approved by an Admin. */
export const isApprovableStage = (stage) => APPROVABLE_STAGES.has(stage);

/** True when the canonical stage is already published. */
export const isPublishedStage = (stage) => stage === WORKFLOW_STAGES.PUBLISHED;

/** Human label for a stage id. */
export const workflowStageLabel = (stage) => WORKFLOW_STAGE_LABELS[stage] ?? String(stage ?? "");

export default {
  WORKFLOW_STAGES,
  WORKFLOW_STAGE_LABELS,
  RETURNED_PRESENTATION,
  EMPLOYEE_EDITABLE_STAGES,
  SUBMITTABLE_STAGES,
  APPROVABLE_STAGES,
  getProductWorkflowState,
  isEditableStage,
  isSubmittableStage,
  isApprovableStage,
  isPublishedStage,
  workflowStageLabel,
};
