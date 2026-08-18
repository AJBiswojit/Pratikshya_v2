/**
 * PRATIKSHYA FASHON — Universal publish validator (Phase 2, Step B).
 *
 * The ONE validation orchestration layer for publication. It determines the
 * ACTUAL current truth from the data — it does not copy legacy flags.
 *
 *   validateProductForPublish(product, context)
 *     → { ok, issues: [{ code, section, message, severity, blocksPublish, source }] }
 *
 * Coverage (universal):
 *   · identity, name, SKU, price + pricing engine, taxonomy + active category
 *   · required product information (description)
 *   · primary media, media ownership, media status, missing media
 *   · cross-product media, duplicate primary, video-as-primary
 *   · unresolved grouping, unresolved mapping
 *   · review/lifecycle requirements (approval before publication)
 *   · legacy review flags — mapped to structured issues WITHOUT duplicating
 *     a condition the data already proves (data truth is authoritative)
 *
 * Severity: "error" blocks publish; "warning" does not (e.g. publishing into
 * an inactive category is allowed but the product will be invisible).
 */

import { computePricing } from "../../utils/pricing.js";
import { isVideo } from "../../config/mediaTypes.js";
import taxonomyRepository from "../taxonomyRepository.js";
import {
  DEPARTMENT_OPTIONS,
  categoriesForDepartment,
  subcategoriesForDepartmentCategory,
} from "../../data/products/departments.js";
import mediaRepository from "../media/mediaRepository.js";
import { getProductMediaSet, resolveProductMediaClaims } from "../media/productMediaSet.js";
import { unresolvedGroupConflictsFor } from "../media/productMediaGroups.js";
import { REVIEW_FLAGS, REVIEW_FLAG_LABELS } from "../productReviewFlags.js";
import { WORKFLOW_STAGES, getProductWorkflowState } from "./productWorkflowState.js";

export const ISSUE_SEVERITY = {
  ERROR: "error",
  WARNING: "warning",
};

export const ISSUE_SOURCES = {
  UNIVERSAL: "UNIVERSAL",
  REVIEW_FLAG: "REVIEW_FLAG",
  PRICING: "PRICING",
  TAXONOMY: "TAXONOMY",
  MEDIA: "MEDIA",
  GROUPING: "GROUPING",
  LIFECYCLE: "LIFECYCLE",
  CATEGORY: "CATEGORY",
};

const error = (code, section, message, source = ISSUE_SOURCES.UNIVERSAL) => ({
  code,
  section,
  message,
  severity: ISSUE_SEVERITY.ERROR,
  blocksPublish: true,
  source,
});

const warning = (code, section, message, source = ISSUE_SOURCES.UNIVERSAL) => ({
  code,
  section,
  message,
  severity: ISSUE_SEVERITY.WARNING,
  blocksPublish: false,
  source,
});

const isPlaceholderName = (name) => {
  const clean = String(name ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return true;
  if (clean.startsWith("untitled")) return true;
  if (clean === "not yet defined" || clean === "undefined") return true;
  if (clean.startsWith("uncatalogued")) return true;
  return false;
};

/** A product identity that is stable and usable as a permanent ID. */
const validProductIdentity = (id) => {
  const value = String(id ?? "").trim();
  return Boolean(value) && /^[A-Za-z0-9][A-Za-z0-9-]{1,20}$/.test(value);
};

/**
 * Maps legacy review flags into structured issues only where the data does
 * NOT already prove the same problem (no duplicate blocking conditions).
 *
 *   · PRICE_REVIEW_REQUIRED + invalid price      → the PRICE issue only
 *   · PRICE_REVIEW_REQUIRED + valid price        → the flag issue (manual)
 *   · NEEDS_MEDIA + no primary                   → PRIMARY_MEDIA_REQUIRED only
 *   · NEEDS_MEDIA + primary present              → the flag issue
 *   · GROUP_REVIEW_REQUIRED + unresolved group   → GROUP_UNRESOLVED only
 *   · MEDIA_OWNERSHIP_REVIEW + computed conflict → the conflict issue only
 */
export const reviewFlagIssues = (product, context = {}) => {
  const issues = [];
  const flags = new Set(Array.isArray(product.reviewFlags) ? product.reviewFlags : []);
  if (!flags.size) return issues;

  const mediaSet = getProductMediaSet(product);
  const hasOwnershipConflict =
    (mediaSet.ownershipConflicts ?? []).length > 0 ||
    resolveProductMediaClaims(product, product.id).conflicts.length > 0;
  const groupIds = new Set([
    ...(Array.isArray(product.mediaIds) ? product.mediaIds : []).map(String),
    ...(mediaSet.gallery ?? []).map((item) => String(item.id ?? "")).filter(Boolean),
  ]);
  const hasUnresolvedGroup = unresolvedGroupConflictsFor([...groupIds]).length > 0;
  const priceValid = priceStatus(product).valid;

  const addFlag = (flag, messageOverride = null) => {
    issues.push(
      error(
        "REVIEW_FLAG_BLOCKING",
        "review",
        messageOverride ?? `Review flag must be resolved before publishing: ${REVIEW_FLAG_LABELS[flag] ?? flag}.`,
        ISSUE_SOURCES.REVIEW_FLAG
      )
    );
  };

  if (flags.has(REVIEW_FLAGS.NAME_REVIEW_REQUIRED) && nameStatus(product).valid) {
    addFlag(REVIEW_FLAGS.NAME_REVIEW_REQUIRED);
  }
  if (flags.has(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED) && priceValid) {
    addFlag(REVIEW_FLAGS.PRICE_REVIEW_REQUIRED);
  }
  if (flags.has(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED) && taxonomyStatus(product).valid) {
    addFlag(REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED);
  }
  if (flags.has(REVIEW_FLAGS.GROUP_REVIEW_REQUIRED) && !hasUnresolvedGroup) {
    addFlag(REVIEW_FLAGS.GROUP_REVIEW_REQUIRED);
  }
  if (flags.has(REVIEW_FLAGS.VARIANT_REVIEW_REQUIRED)) {
    addFlag(REVIEW_FLAGS.VARIANT_REVIEW_REQUIRED);
  }
  if (flags.has(REVIEW_FLAGS.NEEDS_MEDIA) && mediaStatus(product).primaryValid) {
    addFlag(REVIEW_FLAGS.NEEDS_MEDIA);
  }
  if (flags.has(REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW) && !hasOwnershipConflict) {
    addFlag(REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW);
  }
  if (flags.has(REVIEW_FLAGS.CONFLICT_UNRESOLVED) && !hasOwnershipConflict) {
    addFlag(REVIEW_FLAGS.CONFLICT_UNRESOLVED);
  }
  return issues;
};

const nameStatus = (product) => {
  const name = String(product.name ?? "").trim();
  if (!name) return { valid: false, issues: [error("NAME_REQUIRED", "name", "Product name is required.")] };
  if (isPlaceholderName(name)) {
    return {
      valid: false,
      issues: [error("NAME_PLACEHOLDER", "name", "Product name must be real product information, not a placeholder.")],
    };
  }
  return { valid: true, issues: [] };
};

const priceStatus = (product) => {
  const computed = computePricing(product.pricing);
  if (computed.errors.length) {
    return {
      valid: false,
      issues: computed.errors.map((message) =>
        error("PRICING_ENGINE_ERROR", "price", message, ISSUE_SOURCES.PRICING)
      ),
    };
  }
  if (!(Number(product.price) > 0) && !(computed.finalPrice > 0)) {
    return { valid: false, issues: [error("PRICE_MISSING", "price", "Selling price must be greater than zero.")] };
  }
  return { valid: true, issues: [] };
};

const taxonomyStatus = (product) => {
  const issues = [];
  const departmentId = String(product.department ?? "").trim();
  const categoryId = String(product.category ?? "").trim();
  const subcategoryId = String(product.subcategory ?? "").trim();

  const department = DEPARTMENT_OPTIONS.find((entry) => entry.value === departmentId);
  if (!departmentId) {
    issues.push(error("DEPARTMENT_REQUIRED", "taxonomy", "Department is required."));
  } else if (!department) {
    issues.push(
      error(
        "DEPARTMENT_INVALID",
        "taxonomy",
        `Department “${departmentId}” does not exist in the canonical taxonomy.`,
        ISSUE_SOURCES.TAXONOMY
      )
    );
  }

  const category = department
    ? categoriesForDepartment(departmentId).find((entry) => entry.value === categoryId)
    : null;
  if (!categoryId) {
    issues.push(error("CATEGORY_REQUIRED", "taxonomy", "Category is required."));
  } else if (department && !category) {
    issues.push(
      error(
        "CATEGORY_INVALID",
        "taxonomy",
        `Category “${categoryId}” does not belong to department “${departmentId}”.`,
        ISSUE_SOURCES.TAXONOMY
      )
    );
  } else if (category) {
    const managedCategory = taxonomyRepository.findCategory(categoryId);
    if (managedCategory?.status !== "ACTIVE") {
      issues.push(
        warning(
          "CATEGORY_INACTIVE",
          "taxonomy",
          `Category “${category.label}” is not ACTIVE — publishing now will keep the product hidden from the storefront.`,
          ISSUE_SOURCES.TAXONOMY
        )
      );
    }
  }

  const subcategory = category
    ? subcategoriesForDepartmentCategory(departmentId, categoryId).find(
        (entry) => entry.value === subcategoryId
      )
    : null;
  if (!subcategoryId) {
    issues.push(error("SUBCATEGORY_REQUIRED", "taxonomy", "Subcategory is required."));
  } else if (category && !subcategory) {
    issues.push(
      error(
        "SUBCATEGORY_INVALID",
        "taxonomy",
        `Subcategory “${subcategoryId}” does not belong to ${departmentId}/${categoryId}.`,
        ISSUE_SOURCES.TAXONOMY
      )
    );
  }

  return { valid: issues.length === 0, issues };
};

const mediaStatus = (product) => {
  const issues = [];
  const set = getProductMediaSet(product);
  const claims = resolveProductMediaClaims(product, product.id);

  /* Missing / missing-file / cross-product claims. */
  claims.conflicts.forEach((conflict) => {
    if (conflict.reason === "MEDIA_NOT_FOUND") {
      issues.push(
        error("MEDIA_NOT_FOUND", "media", `Claimed media ${conflict.mediaId} does not exist in the media register.`, ISSUE_SOURCES.MEDIA)
      );
    } else if (conflict.reason === "MEDIA_MISSING_FILE") {
      issues.push(
        error("MEDIA_MISSING_FILE", "media", `Claimed media ${conflict.mediaId} has no usable file.`, ISSUE_SOURCES.MEDIA)
      );
    } else if (conflict.reason === "MEDIA_ALREADY_ASSIGNED") {
      issues.push(
        error(
          "CROSS_PRODUCT_MEDIA",
          "media",
          `Media ${conflict.mediaId} is owned by ${conflict.ownerProductId} — ownership must be resolved before publishing.`,
          ISSUE_SOURCES.MEDIA
        )
      );
    }
  });

  /* Primary media. */
  const primary = set.primary;
  if (!primary) {
    const hasCataloguePlate =
      Boolean(product.image) || Boolean(mediaRepository.getProductMediaSummary(product.id).hasCover);
    if (!hasCataloguePlate) {
      issues.push(error("PRIMARY_MEDIA_REQUIRED", "media", "At least one primary/cover image is required before publishing.", ISSUE_SOURCES.MEDIA));
    }
  } else {
    /* The resolved set is image-oriented and may drop `type`; the register
       record is the authoritative type source. */
    const record = primary.id ? mediaRepository.getById(String(primary.id)) : null;
    if (isVideo(primary) || isVideo(record)) {
      issues.push(error("PRIMARY_MEDIA_INVALID", "media", "A video cannot be the primary image.", ISSUE_SOURCES.MEDIA));
    }
    if (record) {
      if (record.status !== "ACTIVE") {
        issues.push(
          error(
            "MEDIA_STATUS_INVALID",
            "media",
            `Primary media ${record.id} is not ACTIVE (${record.status}) — activate it before publishing.`,
            ISSUE_SOURCES.MEDIA
          )
        );
      }
      if (record.scope === "MARKETING") {
        issues.push(
          error(
            "MEDIA_MARKETING_ISOLATION",
            "media",
            `Primary media ${record.id} is marketing-scoped and cannot become product media.`,
            ISSUE_SOURCES.MEDIA
          )
        );
      }
    }
  }

  /* Duplicate primary: more than one COVER role owned by this product. */
  const ownedByProduct = mediaRepository
    .getProductMedia(product.id)
    .filter((item) => item.role === "COVER");
  if (ownedByProduct.length > 1) {
    issues.push(
      error(
        "DUPLICATE_PRIMARY",
        "media",
        `Duplicate primary detected — ${ownedByProduct.length} media assets carry the cover role for ${product.id}.`,
        ISSUE_SOURCES.MEDIA
      )
    );
  }

  return {
    valid: issues.length === 0,
    primaryValid: Boolean(primary) && !isVideo(primary),
    issues,
  };
};

const identityStatus = (product) => {
  const id = product.id ?? product.productId;
  if (!id) return { valid: false, issues: [error("IDENTITY_REQUIRED", "identity", "Product ID is required.")] };
  if (!validProductIdentity(id)) {
    return { valid: false, issues: [error("IDENTITY_INVALID", "identity", `Product ID “${id}” is not a valid permanent identity.`)] };
  }
  return { valid: true, issues: [] };
};

/**
 * The universal validation result for a product.
 *
 * @param {object} product  normalized product record
 * @param {object} context  { requireApproved?: boolean, includeWarnings?: boolean }
 * @returns {{ ok: boolean, issues: object[], blocking: object[], warnings: object[], stage: string|null, category: string|null }}
 */
export const validateProductForPublish = (product, context = {}) => {
  const issues = [];
  if (!product || typeof product !== "object") {
    return {
      ok: false,
      issues: [error("PRODUCT_NOT_FOUND", "identity", "Product not found.")],
      blocking: [error("PRODUCT_NOT_FOUND", "identity", "Product not found.")],
      warnings: [],
      stage: null,
      category: null,
    };
  }

  /* 1. Identity */
  issues.push(...identityStatus(product).issues);

  /* 2. Name */
  issues.push(...nameStatus(product).issues);

  /* 3. SKU */
  if (!String(product.sku ?? "").trim()) {
    issues.push(error("SKU_REQUIRED", "product", "SKU is required."));
  }

  /* 4. Price + pricing engine */
  issues.push(...priceStatus(product).issues);

  /* 5. Taxonomy + active category */
  issues.push(...taxonomyStatus(product).issues);

  /* 6. Required product information */
  if (!String(product.description ?? "").trim() && !String(product.shortDescription ?? "").trim()) {
    issues.push(error("DESCRIPTION_REQUIRED", "product", "A description is required."));
  }

  /* 7. Media */
  issues.push(...mediaStatus(product).issues);

  /* 8. Grouping */
  const claimedIds = [
    ...(Array.isArray(product.mediaIds) ? product.mediaIds : []),
    ...(Array.isArray(product.galleryMediaIds) ? product.galleryMediaIds : []),
    product.primaryMediaId,
  ]
    .filter(Boolean)
    .map(String);
  const groupConflicts = unresolvedGroupConflictsFor([...new Set(claimedIds)]);
  groupConflicts.forEach((group) => {
    issues.push(
      error(
        "GROUP_UNRESOLVED",
        "grouping",
        `Grouping review must be resolved before publishing (${group.id}).`,
        ISSUE_SOURCES.GROUPING
      )
    );
  });

  /* 9. Legacy review flags → structured issues, no duplicates */
  issues.push(...reviewFlagIssues(product, context));

  /* 10. Lifecycle: publication requires the APPROVED stage */
  const state = getProductWorkflowState(product);
  const requireApproved =
    context.requireApproved === true ||
    (Array.isArray(context.modes) && context.modes.includes("publish"));
  if (requireApproved && state.stage !== WORKFLOW_STAGES.PUBLISHED && state.stage !== WORKFLOW_STAGES.APPROVED) {
    issues.push(
      error(
        "LIFECYCLE_REVIEW_REQUIRED",
        "lifecycle",
        `Admin review incomplete — approve ${product.id} before publishing (DRAFT → SUBMITTED → APPROVED → PUBLISHED).`,
        ISSUE_SOURCES.LIFECYCLE
      )
    );
  }

  const category = String(product.category ?? "").trim();

  /* Deduplicate (code, message). */
  const seen = new Set();
  const unique = issues.filter((issue) => {
    const key = `${issue.code}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const blocking = unique.filter((issue) => issue.blocksPublish);
  const warnings = unique.filter((issue) => !issue.blocksPublish);
  return {
    ok: blocking.length === 0,
    issues: unique,
    blocking,
    warnings,
    stage: state.stage,
    category,
  };
};

export default {
  ISSUE_SEVERITY,
  ISSUE_SOURCES,
  validateProductForPublish,
  reviewFlagIssues,
};
