/**
 * PRATIKSHYA FASHON — Unified Admin Product Review projection (Phase 3D).
 *
 * ONE product lifecycle has ONE Admin review workspace. This module is the
 * read-only projection that turns the canonical catalogue into the unified
 * review queue:
 *
 *     catalogue (catalogRepository)
 *        ↓
 *     workflow projection (productWorkflowState — pure)
 *        ↓
 *     canonical validation (productPublishValidator — universal + category)
 *        ↓
 *     review query (filters below)
 *        ↓
 *     UNIFIED REVIEW QUEUE
 *
 * Rules this module obeys:
 *   · it is a PROJECTION — it never persists anything. There is no second
 *     product register, no second review register, no storage key.
 *   · products from every department are rows in the same queue and use the
 *     same validator and canonical commands.
 *   · every readiness/flag/status value comes from the canonical validator
 *     output or the canonical workflow projection — no duplicated rules.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · the queue is memoized against catalogVersion + mediaVersion + the
 *     group-decision fingerprint, the same cache pattern the other workflow
 *     projections use. It is rebuilt once per catalogue change, never once
 *     per render.
 */

import catalogRepository, { PRODUCT_STATUS } from "./catalogRepository";
import mediaRepository from "./media/mediaRepository";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
  isApprovableStage,
} from "./workflow/productWorkflowState";
import { validateProductForPublish } from "./workflow/productPublishValidator";
import { departmentForProduct, DEPARTMENT_OPTIONS } from "../data/products/departments";
import {
  REVIEW_FLAGS,
  blockingReviewFlags,
} from "./productReviewFlags";
import { getAllGroups } from "./media/productMediaGroups";
import { getEmployee, loadEmployees } from "./employees/employeeService";
import { employeeFullName } from "../utils/employee";
import { categoryLabels } from "../data/products/taxonomy";

/* ------------------------------------------------------------------ */
/* Section labels — the canonical validator's sections, named for UI   */
/* ------------------------------------------------------------------ */

export const UNIFIED_REVIEW_SECTIONS = {
  name: "Name",
  price: "Price",
  taxonomy: "Taxonomy",
  media: "Media",
  grouping: "Grouping",
  category: "Category rules",
};

/* ------------------------------------------------------------------ */
/* Row builder — one canonical product → one review queue row          */
/* ------------------------------------------------------------------ */

const assignedEmployeeName = (employeeId) => {
  if (!employeeId) return null;
  try {
    const employee = getEmployee(loadEmployees(), employeeId);
    return employee ? employeeFullName(employee) : String(employeeId);
  } catch {
    return String(employeeId);
  }
};

/**
 * Build the unified review row for one canonical product record.
 * Pure: reads the workflow projection and the canonical validator only.
 */
export const buildUnifiedReviewRow = (product) => {
  const state = getProductWorkflowState(product);
  const validation = validateProductForPublish(product);
  const blocking = validation.blocking;
  const department = departmentForProduct(product);

  const sectionValid = (section) => !blocking.some((issue) => issue.section === section);
  const sections = {
    name: sectionValid("name"),
    price: sectionValid("price"),
    taxonomy: sectionValid("taxonomy"),
    media: sectionValid("media"),
    grouping: sectionValid("grouping"),
    category: sectionValid("category"),
  };

  const blockingFlags = blockingReviewFlags(product.reviewFlags);
  const reviewFlags = [...(product.reviewFlags ?? [])];

  return {
    /* identity — the canonical record itself, never a copy */
    product,
    productId: product.id,
    name: product.name ?? "",
    sku: product.sku ?? "",
    category: product.category ?? "",
    subcategory: product.subcategory ?? "",

    /* department — generic, treats all departments equally */
    department,

    /* canonical workflow projection */
    status: product.status ?? null,
    stage: state.stage,
    stageLabel: state.label,
    presentation: state.presentation,
    returned: state.returned,
    rejectionReason: state.rejectionReason,
    editable: state.editable,

    /* submission / approval / publication facts */
    reviewState: product.review?.state ?? "NONE",
    submittedBy: product.review?.submittedBy ?? null,
    submittedAt: product.review?.submittedAt ?? null,
    reviewedBy: product.review?.reviewedBy ?? null,
    reviewedAt: product.review?.reviewedAt ?? null,
    published: product.status === PRODUCT_STATUS.PUBLISHED,
    archived: product.status === PRODUCT_STATUS.ARCHIVED,

    /* assignment */
    assignedEmployeeId: product.assignedEmployeeId ?? null,
    assignedEmployeeName: assignedEmployeeName(product.assignedEmployeeId),

    /* review flags — canonical vocabulary */
    reviewFlags,
    blockingFlags,

    /* canonical validation output */
    blockingIssues: blocking,
    warnings: validation.warnings,
    validationOk: validation.ok,
    sections,
    invalidSections: Object.keys(sections).filter((key) => !sections[key]),

    /* readiness — derived from projection + validation, nothing else */
    canApprove: isApprovableStage(state.stage) && validation.ok,
    readyToPublish: state.stage === WORKFLOW_STAGES.APPROVED && blocking.length === 0,
    missingInformation: blocking.length > 0,
  };
};

/* ------------------------------------------------------------------ */
/* The unified queue — one projection over the one register            */
/* ------------------------------------------------------------------ */

let queueCache = { fingerprint: null, rows: null };

const groupsFingerprint = () => {
  try {
    return getAllGroups()
      .map((group) => `${group.id}:${group.decision ?? ""}:${group.productId ?? ""}:${group.status ?? ""}`)
      .join("|");
  } catch {
    return "";
  }
};

const queueFingerprint = () => {
  const catalogV = catalogRepository.getVersion ? catalogRepository.getVersion() : 0;
  const mediaV = mediaRepository.getVersion ? mediaRepository.getVersion() : 0;
  return `${catalogV}|${mediaV}|${groupsFingerprint()}`;
};

/**
 * Every product in the canonical register, projected for review — the ONE
 * unified review queue. Uncached variant for tests and audits.
 */
export const getUnifiedReviewQueueUncached = () => {
  const products = catalogRepository.all();
  const rows = products.map((product) => buildUnifiedReviewRow(product));
  rows.sort((a, b) => String(a.productId).localeCompare(String(b.productId)));
  return rows;
};

/** Memoized unified review queue — rebuilt only when the catalogue, the
    media register or a group decision changes. */
export const getUnifiedReviewQueue = () => {
  const fingerprint = queueFingerprint();
  if (queueCache.rows && queueCache.fingerprint === fingerprint) {
    return queueCache.rows;
  }
  const rows = getUnifiedReviewQueueUncached();
  queueCache = { fingerprint, rows };
  return rows;
};

/** One row by Product ID — read from the same single queue. */
export const getUnifiedReviewRow = (productId) =>
  getUnifiedReviewQueue().find((row) => String(row.productId) === String(productId)) ?? null;

/* ------------------------------------------------------------------ */
/* Filters — every criterion is backed by existing canonical data      */
/* ------------------------------------------------------------------ */

/**
 * Quick lenses — the top-level tabs of the workspace. Each maps onto a
 * canonical fact; none invents new state:
 *   ALL               everything in the register
 *   DRAFT             editable operational stage (status DRAFT)
 *   SUBMITTED         status PENDING_REVIEW (in the Admin's court)
 *   PENDING_APPROVAL  submitted and still waiting for an Admin decision
 *   REVIEW_FLAGS      carries at least one publish-blocking review flag
 *   READY_TO_PUBLISH  APPROVED and every canonical validation passes
 */
export const UNIFIED_QUICK_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "DRAFT", label: "Draft" },
  { id: "SUBMITTED", label: "Submitted" },
  { id: "PENDING_APPROVAL", label: "Pending approval" },
  { id: "REVIEW_FLAGS", label: "Review flags" },
  { id: "READY_TO_PUBLISH", label: "Ready to publish" },
];

export const matchesQuickFilter = (row, quick) => {
  switch (quick) {
    case "DRAFT":
      return row.status === PRODUCT_STATUS.DRAFT;
    case "SUBMITTED":
      return row.status === PRODUCT_STATUS.PENDING_REVIEW;
    case "PENDING_APPROVAL":
      return row.stage === WORKFLOW_STAGES.SUBMITTED;
    case "REVIEW_FLAGS":
      return row.blockingFlags.length > 0;
    case "READY_TO_PUBLISH":
      return row.readyToPublish;
    case "ALL":
    default:
      return true;
  }
};

/**
 * The full filter model. Every field is optional; `"ALL"` disables a
 * criterion. `filterUnifiedReviewQueue` is pure — the queue itself is
 * never mutated, and no second register is created.
 */
export const UNIFIED_FILTER_DEFAULTS = {
  quick: "ALL",
  stage: "ALL", // any WORKFLOW_STAGES value
  department: "ALL", // ALL or any canonical department id
  category: "ALL", // any taxonomy category id
  assignment: "ALL", // ALL | ASSIGNED | UNASSIGNED
  flag: "ALL", // ALL | ANY | a specific REVIEW_FLAGS value
  media: "ALL", // ALL | READY | BLOCKED
  name: "ALL", // ALL | VALID | INVALID
  price: "ALL", // ALL | VALID | INVALID
  taxonomy: "ALL", // ALL | VALID | INVALID
  grouping: "ALL", // ALL | VALID | INVALID
  missing: "ALL", // ALL | MISSING | COMPLETE
  query: "",
};

const SECTION_FILTERS = { name: "name", price: "price", taxonomy: "taxonomy", grouping: "grouping" };

export const matchesUnifiedFilters = (row, filters = {}) => {
  const f = { ...UNIFIED_FILTER_DEFAULTS, ...filters };

  if (!matchesQuickFilter(row, f.quick)) return false;

  if (f.stage !== "ALL" && row.stage !== f.stage) return false;
  if (f.category !== "ALL" && row.category !== f.category) return false;

  /* Department filter — generic, all departments treated equally */
  if (f.department !== "ALL" && row.department !== f.department) return false;

  if (f.assignment === "ASSIGNED" && !row.assignedEmployeeId) return false;
  if (f.assignment === "UNASSIGNED" && row.assignedEmployeeId) return false;

  if (f.flag === "ANY" && row.blockingFlags.length === 0) return false;
  if (f.flag !== "ALL" && f.flag !== "ANY" && !row.reviewFlags.includes(f.flag)) return false;

  if (f.media === "READY" && !row.sections.media) return false;
  if (f.media === "BLOCKED" && row.sections.media) return false;

  for (const [key, section] of Object.entries(SECTION_FILTERS)) {
    const value = f[key];
    if (value === "VALID" && !row.sections[section]) return false;
    if (value === "INVALID" && row.sections[section]) return false;
  }

  if (f.missing === "MISSING" && !row.missingInformation) return false;
  if (f.missing === "COMPLETE" && row.missingInformation) return false;

  const term = String(f.query ?? "").trim().toLowerCase();
  if (term) {
    const haystack = [row.productId, row.name, row.sku, row.subcategory, row.assignedEmployeeName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    if (!haystack.some((value) => value.includes(term))) return false;
  }

  return true;
};

/** Apply a filter model to the unified queue. Pure. */
export const filterUnifiedReviewQueue = (rows = getUnifiedReviewQueue(), filters = {}) =>
  rows.filter((row) => matchesUnifiedFilters(row, filters));

/** Count rows per quick lens — one pass over the single queue. */
export const countUnifiedQuickFilters = (rows = getUnifiedReviewQueue()) => {
  const counts = {};
  UNIFIED_QUICK_FILTERS.forEach((entry) => {
    counts[entry.id] = 0;
  });
  rows.forEach((row) => {
    UNIFIED_QUICK_FILTERS.forEach((entry) => {
      if (matchesQuickFilter(row, entry.id)) counts[entry.id] += 1;
    });
  });
  return counts;
};

/** The categories actually present in the queue, for the category filter. */
export const categoriesInUnifiedQueue = (rows = getUnifiedReviewQueue()) => {
  const present = [...new Set(rows.map((row) => row.category).filter(Boolean))];
  present.sort();
  return present.map((id) => ({ id, label: categoryLabels[id] ?? id }));
};

/** The review flags actually present in the queue, for the flag filter. */
export const flagsInUnifiedQueue = (rows = getUnifiedReviewQueue()) =>
  [...new Set(rows.flatMap((row) => row.reviewFlags))].sort();

/** Department options for the department filter. */
export const departmentsInUnifiedQueue = (rows = getUnifiedReviewQueue()) => {
  const present = new Set(rows.map((row) => row.department).filter(Boolean));
  return DEPARTMENT_OPTIONS
    .filter((department) => present.has(department.value))
    .map((department) => ({ id: department.value, label: department.label }));
};

export { REVIEW_FLAGS, WORKFLOW_STAGES };

export default {
  UNIFIED_REVIEW_SECTIONS,
  UNIFIED_QUICK_FILTERS,
  UNIFIED_FILTER_DEFAULTS,
  buildUnifiedReviewRow,
  getUnifiedReviewQueue,
  getUnifiedReviewQueueUncached,
  getUnifiedReviewRow,
  filterUnifiedReviewQueue,
  matchesQuickFilter,
  matchesUnifiedFilters,
  countUnifiedQuickFilters,
  categoriesInUnifiedQueue,
  departmentsInUnifiedQueue,
  flagsInUnifiedQueue,
};
