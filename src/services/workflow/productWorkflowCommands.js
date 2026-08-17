/**
 * PRATIKSHYA FASHON — Universal authorized lifecycle commands (Phase 2, Step D).
 *
 * THE ONE authoritative product workflow command layer. Every transition —
 * create, assign, employee save, submit, admin review, return, approve,
 * publish, archive, restore, bulk publish — runs through this module and
 * only this module. Existing services (`catalogRepository`, `productWorkflow`,
 * Kids finalization) remain as COMPATIBILITY ADAPTERS that delegate here.
 *
 * Commands enforce, in order:
 *   1. an authenticated principal (never a UI flag, route, or label)
 *   2. action-level authorization (employee vs Super Admin vs none)
 *   3. the canonical lifecycle transition table
 *   4. universal + category validation at approval and publication
 *
 * SECURITY NOTE — this is a frontend/localStorage demo. A backend MUST
 * re-verify the principal and re-run every check when the backend is
 * introduced. Nothing in this module claims production-grade security; it
 * provides the enforcement boundary the backend will reuse.
 *
 * Principal model:
 *   admin    — a record found in the admin register with role SUPER_ADMIN
 *              and an ACTIVE status (looked up, never taken from the caller)
 *   employee — a record found in the employee register with a login-allowed
 *              status; permission and assignment are checked per action
 *   none     — anonymous/customer principals can never mutate workflow
 *
 * Canonical lifecycle:
 *   DRAFT → ASSIGNED → IN_EMPLOYEE_REVIEW → SUBMITTED → IN_ADMIN_REVIEW
 *         → APPROVED → PUBLISHED → ARCHIVED
 *   RETURNED is a result back to an editable stage (with reason).
 */

import catalogRepository, {
  PRODUCT_STATUS,
  REVIEW_STATE,
} from "../catalogRepository.js";
import {
  registerWorkflowCommands,
  registerPublishValidator,
} from "./workflowCommandRegistry.js";
import { EMPLOYEE_EDITABLE_FIELDS, pickEmployeeEditableFields } from "./employeeEditableFields.js";
import { loadAdmins } from "../admin/adminAuthService.js";
import { loadEmployees, getEmployee } from "../employees/employeeService.js";
import { canEmployeeLogin } from "../../config/employeeStatus.js";
import { PERMISSIONS } from "../../config/employeePermissions.js";
import { hasPermission } from "../employees/authorization.js";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
  isEditableStage,
  isSubmittableStage,
  isApprovableStage,
} from "./productWorkflowState.js";
import { validateProductForPublish } from "./productPublishValidator.js";

export { EMPLOYEE_EDITABLE_FIELDS };

/* ------------------------------------------------------------------ */
/* Principal resolution                                               */
/* ------------------------------------------------------------------ */

export const PRINCIPAL_ERRORS = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
};

export const principalError = (code, message) => ({ ok: false, code, message });

/**
 * Resolves an authenticated principal from the caller-supplied actor.
 *
 * The caller's labels are NEVER trusted: an admin principal is only
 * accepted when the admin register contains the same adminId with the
 * SUPER_ADMIN role and an ACTIVE status; an employee principal is only
 * accepted when the employee register contains the same employeeId with a
 * login-allowed status.
 */
export const resolvePrincipal = (actor) => {
  if (!actor || typeof actor !== "object") {
    return principalError(PRINCIPAL_ERRORS.UNAUTHENTICATED, "An authenticated principal is required.");
  }
  if (actor.adminId) {
    const admins = loadAdmins();
    const match = (admins ?? []).find(
      (admin) => String(admin.adminId).toUpperCase() === String(actor.adminId).toUpperCase()
    );
    if (match && match.role === "SUPER_ADMIN" && match.status === "ACTIVE") {
      return { ok: true, principal: { kind: "admin", ...match, actor } };
    }
    return principalError(
      PRINCIPAL_ERRORS.FORBIDDEN,
      "This admin account is not authorized to run workflow commands."
    );
  }
  if (actor.employeeId) {
    const employees = loadEmployees();
    const employee = getEmployee(employees, actor.employeeId);
    if (employee && canEmployeeLogin(employee.status)) {
      return { ok: true, principal: { kind: "employee", employee, actor } };
    }
    return principalError(
      PRINCIPAL_ERRORS.FORBIDDEN,
      "This employee account is not authorized to run workflow commands."
    );
  }
  return principalError(
    PRINCIPAL_ERRORS.UNAUTHENTICATED,
    "Anonymous/customer principals cannot mutate the product workflow."
  );
};

/** The error shape workflow commands return for authorization failures. */
export const authorizationFailure = (error) => ({
  ok: false,
  error: error.message,
  code: error.code,
});

const requireAdmin = (actor) => {
  const resolved = resolvePrincipal(actor);
  if (!resolved.ok) {
    return { ok: false, resolved, error: { code: resolved.code, message: resolved.message } };
  }
  if (resolved.principal.kind !== "admin") {
    return {
      ok: false,
      resolved,
      error: principalError(
        PRINCIPAL_ERRORS.FORBIDDEN,
        "Employee identities cannot run this workflow command."
      ),
    };
  }
  return { ok: true, resolved };
};

const requireEmployee = (actor) => {
  const resolved = resolvePrincipal(actor);
  if (!resolved.ok) {
    return { ok: false, resolved, error: { code: resolved.code, message: resolved.message } };
  }
  if (resolved.principal.kind !== "employee") {
    return {
      ok: false,
      resolved,
      error: principalError(
        PRINCIPAL_ERRORS.FORBIDDEN,
        "An employee principal is required for this workflow command."
      ),
    };
  }
  return { ok: true, resolved };
};

/** Admin OR an employee with the given permission. */
const requireAdminOrEmployee = (actor, permission) => {
  const admin = requireAdmin(actor);
  if (admin.ok) return admin;
  const employee = requireEmployee(actor);
  if (employee.ok) {
    const { employee: record } = employee.resolved.principal;
    if (permission && !hasPermission(record, permission)) {
      return {
        ok: false,
        error: principalError(
          PRINCIPAL_ERRORS.FORBIDDEN,
          "You are not authorized to edit this product."
        ),
      };
    }
    return employee;
  }
  return employee;
};

/* ------------------------------------------------------------------ */
/* Result helpers                                                     */
/* ------------------------------------------------------------------ */

const notFound = () => ({ ok: false, error: "Product not found." });

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

const nowIso = () => new Date().toISOString();

const validationFailure = (validation, actor) => ({
  ok: false,
  error: validation.issues[0]?.message ?? "Validation failed.",
  errors: validation.issues.map((issue) => issue.message),
  issues: validation.issues,
});

const runValidation = (product, mode) => validateProductForPublish(product, { mode });

/* ------------------------------------------------------------------ */
/* Commands                                                           */
/* ------------------------------------------------------------------ */

/**
 * createProduct — authorized product creation.
 * Allowed: Super Admin, or an ACTIVE employee with products.manage.
 * Always creates a DRAFT; never publishes.
 */
export const createProduct = (draft, actor = null, options = {}) => {
  const auth = requireAdminOrEmployee(actor, PERMISSIONS.PRODUCTS_MANAGE);
  if (!auth.ok) return authorizationFailure(auth.error);
  const result = catalogRepository.createDraftProduct({ ...(draft ?? {}) }, auth.resolved.principal.actor ?? actor);
  return result.ok ? { ok: true, product: result.product } : result;
};

/**
 * assignProduct — Super Admin assigns (or unassigns) an employee.
 * Only ACTIVE employees can receive assignments.
 */
export const assignProduct = (productId, employeeId, actor = null) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  if (employeeId) {
    const employees = loadEmployees();
    const employee = getEmployee(employees, employeeId);
    if (!employee) return { ok: false, error: "Employee not found." };
    if (!canEmployeeLogin(employee.status)) {
      return { ok: false, error: "Only active employees can receive new product assignments." };
    }
  }
  const result = catalogRepository.assignToEmployee(productId, employeeId || null, auth.resolved.principal.actor ?? actor);
  return { ok: true, product: result.product };
};

/**
 * saveProductDraft — edit allowed fields on an editable, authorized product.
 * Allowed: Super Admin, or the ASSIGNED employee with products.manage.
 * Blocks edits while the product is submitted/approved/published/archived.
 */
export const saveProductDraft = (productId, patch = {}, actor = null, options = {}) => {
  const auth = requireAdminOrEmployee(actor, PERMISSIONS.PRODUCTS_MANAGE);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();

  const state = getProductWorkflowState(product);
  if (!isEditableStage(state.stage)) {
    return {
      ok: false,
      error: `This product is ${state.label.toLowerCase()} and cannot be edited — return it to an editable stage first.`,
    };
  }

  if (auth.resolved.principal.kind === "employee") {
    const employee = auth.resolved.principal.employee;
    if (!product.assignedEmployeeId || String(product.assignedEmployeeId) !== String(employee.employeeId)) {
      return { ok: false, error: "You are not authorized to edit this product." };
    }
    if (!hasPermission(employee, PERMISSIONS.PRODUCTS_MANAGE)) {
      return { ok: false, error: "You are not authorized to edit this product." };
    }
    const clean = pickEmployeeEditableFields(patch);
    const pricingPatch = {};
    if (clean.price != null) {
      const selling = Math.max(0, Number(clean.price) || 0);
      const mrp = Math.max(selling, Number(clean.compareAtPrice) || 0);
      pricingPatch.pricing = { ...(product.pricing ?? {}), sellingPrice: selling, mrp };
    }
    const result = catalogRepository.updateDraft(
      productId,
      {
        ...clean,
        ...pricingPatch,
        workflow: {
          ...(product.workflow ?? {}),
          employeeReviewStartedAt: product.workflow?.employeeReviewStartedAt ?? nowIso(),
        },
      },
      auth.resolved.principal.actor ?? actor
    );
    return result.ok ? { ok: true, product: result.product } : result;
  }

  /* Admin edits route through the repository's updateDraft too. */
  const result = catalogRepository.updateDraft(productId, { ...(patch ?? {}) }, auth.resolved.principal.actor ?? actor);
  return result.ok ? { ok: true, product: result.product } : result;
};

/**
 * submitProduct — move an editable product into Admin review.
 * Allowed: Super Admin, or the assigned employee.
 */
export const submitProduct = (productId, actor = null) => {
  const auth = requireAdminOrEmployee(actor, PERMISSIONS.PRODUCTS_MANAGE);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();

  if (auth.resolved.principal.kind === "employee") {
    const employee = auth.resolved.principal.employee;
    if (!product.assignedEmployeeId || String(product.assignedEmployeeId) !== String(employee.employeeId)) {
      return { ok: false, error: "You can only submit products assigned to you." };
    }
  }

  const state = getProductWorkflowState(product);
  if (!isSubmittableStage(state.stage)) {
    return {
      ok: false,
      error:
        state.stage === WORKFLOW_STAGES.PUBLISHED
          ? "This product is already published."
          : state.stage === WORKFLOW_STAGES.ARCHIVED
            ? "Archived products cannot be submitted."
            : `Products in the ${state.label.toLowerCase()} stage cannot be submitted for review.`,
    };
  }

  const result = catalogRepository.updateProduct(
    productId,
    {
      status: PRODUCT_STATUS.PENDING_REVIEW,
      review: {
        ...product.review,
        state: REVIEW_STATE.PENDING,
        submittedBy: describeActor(actor).actorName,
        submittedAt: nowIso(),
        rejectionReason: "",
      },
    },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(
    ACTIVITY_ACTIONS.PRODUCT_SUBMITTED_FOR_REVIEW,
    `Submitted ${product.name} for review`,
    actor,
    productId
  );
  return { ok: true, product: result.product };
};

/**
 * beginAdminReview — Super Admin marks a submission as under active review.
 * Additive: records review.adminReviewStartedAt so the canonical projection
 * shows IN_ADMIN_REVIEW. Optional but explicit.
 */
export const beginAdminReview = (productId, actor = null) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  const state = getProductWorkflowState(product);
  if (state.stage !== WORKFLOW_STAGES.SUBMITTED) {
    return {
      ok: false,
      error: `Only submitted products can enter admin review (current stage: ${state.label}).`,
    };
  }
  const result = catalogRepository.updateProduct(
    productId,
    {
      workflow: {
        ...(product.workflow ?? {}),
        adminReviewStartedAt: product.workflow?.adminReviewStartedAt ?? nowIso(),
      },
    },
    auth.resolved.principal.actor ?? actor
  );
  return { ok: true, product: result.product };
};

/**
 * returnProduct — Super Admin returns a submitted product to the employee
 * with a required reason. Result: editable employee stage (RETURNED).
 */
export const returnProduct = (productId, reason = "", actor = null) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  if (!String(reason ?? "").trim()) {
    return { ok: false, error: "A return reason is required." };
  }
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  const state = getProductWorkflowState(product);
  if (state.stage === WORKFLOW_STAGES.PUBLISHED) {
    return { ok: false, error: "Published products cannot be returned — unpublish them first." };
  }
  if (state.stage === WORKFLOW_STAGES.ARCHIVED) {
    return { ok: false, error: "Archived products cannot be returned — restore them first." };
  }
  const result = catalogRepository.updateProduct(
    productId,
    {
      status: PRODUCT_STATUS.DRAFT,
      review: {
        ...product.review,
        state: REVIEW_STATE.REJECTED,
        reviewedBy: describeActor(actor).actorName,
        reviewedAt: nowIso(),
        rejectionReason: reason,
      },
    },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(ACTIVITY_ACTIONS.PRODUCT_REJECTED, `Returned ${product.name} — ${reason}`, actor, productId);
  return { ok: true, product: result.product };
};

/**
 * approveProduct — Super Admin approval. APPROVAL DOES NOT PUBLISH.
 * Requires the SUBMITTED / IN_ADMIN_REVIEW stage plus a passing universal
 * and category validation. Records review.state APPROVED; the product stays
 * customer-invisible until an explicit publishProduct.
 */
export const approveProduct = (productId, actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();

  const state = getProductWorkflowState(product);
  if (state.stage === WORKFLOW_STAGES.PUBLISHED) {
    return { ok: true, product, alreadyPublished: true };
  }
  if (state.stage === WORKFLOW_STAGES.APPROVED) {
    return { ok: true, product, alreadyApproved: true };
  }
  if (!isApprovableStage(state.stage)) {
    return {
      ok: false,
      error: `Only submitted products can be approved (current stage: ${state.label}).`,
    };
  }

  const validation = runValidation(product, "approve");
  if (!validation.ok) return validationFailure(validation, actor);

  const result = catalogRepository.updateProduct(
    productId,
    {
      status: product.status || PRODUCT_STATUS.PENDING_REVIEW,
      review: {
        ...product.review,
        state: REVIEW_STATE.APPROVED,
        reviewedBy: describeActor(actor).actorName,
        reviewedAt: nowIso(),
        rejectionReason: "",
      },
      workflow: {
        ...(product.workflow ?? {}),
        approvedAt: nowIso(),
      },
    },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(
    ACTIVITY_ACTIONS.PRODUCT_APPROVED,
    `Approved ${product.id} — awaiting publication`,
    actor,
    productId
  );
  return { ok: true, product: result.product, approved: true };
};

/**
 * publishProduct — Super Admin publication. REQUIRES APPROVED, then
 * re-runs the ENTIRE validation (product, media ownership, taxonomy, price,
 * category validator) atomically. Never trusts an earlier validation.
 */
export const publishProduct = (productId, actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();

  const state = getProductWorkflowState(product);
  if (state.stage === WORKFLOW_STAGES.PUBLISHED) {
    return { ok: true, product, alreadyPublished: true };
  }
  if (state.stage !== WORKFLOW_STAGES.APPROVED) {
    return {
      ok: false,
      error: `Admin review incomplete — approve ${product.id} before publishing (DRAFT → SUBMITTED → APPROVED → PUBLISHED).`,
      errors: [
        `Admin review incomplete — approve ${product.id} before publishing (DRAFT → SUBMITTED → APPROVED → PUBLISHED).`,
      ],
    };
  }

  /* Full revalidation at publish time — approval results are never reused. */
  const validation = runValidation(product, "publish");
  if (!validation.ok) return validationFailure(validation, actor);

  const result = catalogRepository.updateProduct(
    productId,
    { status: PRODUCT_STATUS.PUBLISHED },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(
    ACTIVITY_ACTIONS.PRODUCT_PUBLISHED,
    `Published ${product.name}`,
    actor,
    productId
  );
  return { ok: true, product: result.product, published: true };
};

/**
 * archiveProduct — Super Admin archive. Non-destructive; ownership and
 * assignment are preserved (no automatic media release).
 */
export const archiveProduct = (productId, actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  if (product.status === PRODUCT_STATUS.ARCHIVED) return { ok: true, product, alreadyArchived: true };
  const result = catalogRepository.updateProduct(
    productId,
    { status: PRODUCT_STATUS.ARCHIVED },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(ACTIVITY_ACTIONS.PRODUCT_ARCHIVED, `Archived ${product.name}`, actor, productId);
  return { ok: true, product: result.product };
};

/** restoreProduct — Super Admin restores an archived product to DRAFT. */
export const restoreProduct = (productId, actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  if (product.status !== PRODUCT_STATUS.ARCHIVED) {
    return { ok: false, error: "Only archived products can be restored." };
  }
  const result = catalogRepository.updateProduct(
    productId,
    {
      status: PRODUCT_STATUS.DRAFT,
      review: { ...(product.review ?? {}), state: REVIEW_STATE.NONE },
    },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(ACTIVITY_ACTIONS.PRODUCT_RESTORED, `Restored ${product.name} from the archive`, actor, productId);
  return { ok: true, product: result.product };
};

/** unpublishProduct — Super Admin demotes a published product to DRAFT. */
export const unpublishProduct = (productId, actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const product = catalogRepository.find(productId);
  if (!product) return notFound();
  if (product.status !== PRODUCT_STATUS.PUBLISHED) {
    return { ok: false, error: "Only published products can be unpublished." };
  }
  const result = catalogRepository.updateProduct(
    productId,
    {
      status: PRODUCT_STATUS.DRAFT,
      review: { ...(product.review ?? {}), state: REVIEW_STATE.NONE },
      workflow: { ...(product.workflow ?? {}), approvedAt: null },
    },
    auth.resolved.principal.actor ?? actor,
    /* Phase 3E — this command records its own lifecycle event below. */
    { activity: null }
  );
  if (!result.ok) return result;
  note(ACTIVITY_ACTIONS.PRODUCT_UNPUBLISHED, `Unpublished ${product.name} to draft`, actor, productId);
  return { ok: true, product: result.product };
};

/**
 * bulkPublish — the ONE bulk publishing implementation. Per product:
 * authorize → validate lifecycle → validate product → validate media →
 * validate category → publish. A product that is not APPROVED is never
 * published; its errors are collected.
 */
export const bulkPublish = (productIds = [], actor = null, options = {}) => {
  const auth = requireAdmin(actor);
  if (!auth.ok) return authorizationFailure(auth.error);
  const ids = [...new Set((Array.isArray(productIds) ? productIds : []).map(String))];
  const results = [];
  let applied = 0;
  let skipped = 0;
  ids.forEach((id) => {
    const result = publishProduct(id, auth.resolved.principal.actor ?? actor, options);
    results.push({ id, ok: result.ok, product: result.product ?? null, errors: result.errors ?? (result.error ? [result.error] : []) });
    if (result.ok) applied += 1;
    else skipped += 1;
  });
  if (applied > 0) {
    try {
      recordActivity(loadActivity(), {
        ...describeActor(actor),
        targetProductId: ids[0] ?? null,
        action: ACTIVITY_ACTIONS.PRODUCT_BULK_UPDATED,
        summary: `Bulk publish · ${applied} product${applied === 1 ? "" : "s"}${skipped ? `, ${skipped} skipped (not approved / validation unmet)` : ""}`,
      });
    } catch {
      /* Diary failures never block. */
    }
  }
  return { ok: true, applied, skipped, results };
};

export const commands = {
  createProduct,
  assignProduct,
  saveProductDraft,
  submitProduct,
  beginAdminReview,
  returnProduct,
  approveProduct,
  publishProduct,
  archiveProduct,
  restoreProduct,
  unpublishProduct,
  bulkPublish,
};

/* ------------------------------------------------------------------ */
/* Registration — loaded on import; repository adapters read these     */
/* ------------------------------------------------------------------ */

registerWorkflowCommands(commands);
registerPublishValidator(validateProductForPublish);

export default commands;
