/**
 * PRATIKSHYA FASHON — Product & merchandising vocabulary (Phase 13).
 *
 * The single configuration the product editor, the review queue and the
 * admin tables read their option lists from. Categories and their labels
 * come straight from the storefront taxonomy — this file never redeclares
 * them, it only extends the *choices offered to the editor* (subcategories,
 * fabrics, occasions, collections, tags…) so the customer-facing taxonomy
 * stays the single source of truth for discovery.
 *
 * Data only. No React, no presentation.
 */

import {
  colors,
  fabrics,
  materials,
  occasions,
} from "../data/products/taxonomy";
import taxonomyRepository from "../services/taxonomyRepository";
import {
  DEPARTMENT_OPTIONS,
  categoriesForDepartment,
  subcategoriesForDepartmentCategory,
} from "../data/products/departments";

/* ------------------------------------------------------------------ */
/* Product type                                                        */
/* ------------------------------------------------------------------ */

export const PRODUCT_TYPES = [
  { id: "fashion", label: "Fashion" },
  { id: "textile", label: "Textile / Fabric" },
  { id: "jewellery", label: "Jewellery" },
  { id: "accessory", label: "Accessory" },
];

export const getProductTypeLabel = (id) =>
  PRODUCT_TYPES.find((entry) => entry.id === id)?.label ?? id ?? "Fashion";

/* ------------------------------------------------------------------ */
/* Product status & review                                             */
/* ------------------------------------------------------------------ */

export const PRODUCT_STATUSES = {
  DRAFT: "DRAFT",
  /* Phase 22 — "REVIEW" is the human-facing name of the review state.
     The canonical stored value stays PENDING_REVIEW so every existing
     consumer (review queue, metrics, status badges) keeps working. */
  REVIEW: "PENDING_REVIEW",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

export const PRODUCT_STATUS_OPTIONS = [
  { id: "DRAFT", label: "Draft", tone: "quiet" },
  { id: "PENDING_REVIEW", label: "Review", tone: "alert" },
  { id: "PUBLISHED", label: "Published", tone: "ink" },
  { id: "ARCHIVED", label: "Archived", tone: "muted" },
];

export const getProductStatusLabel = (status) =>
  PRODUCT_STATUS_OPTIONS.find((entry) => entry.id === status)?.label ?? status ?? "—";

export const REVIEW_STATES = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/* ------------------------------------------------------------------ */
/* Categories — from the storefront taxonomy, never redeclared         */
/* ------------------------------------------------------------------ */

export const CATEGORY_OPTIONS = taxonomyRepository.categoryOptions().map((category) => ({
  id: category.id,
  label: category.label,
}));

/**
 * Subcategory choices offered per category. Authored subcategories already
 * in the catalogue continue to work; these extend the editor's palette
 * across the full Phase 13 merchandising range.
 */
export const SUBCATEGORY_OPTIONS = {};

export const subcategoryOptionsFor = (categoryId) =>
  [...new Set([...(taxonomyRepository.subcategoryOptionsFor(categoryId) ?? []), ...(SUBCATEGORY_OPTIONS[categoryId] ?? [])])];

/* ------------------------------------------------------------------ */
/* Gender                                                              */
/* ------------------------------------------------------------------ */

export const GENDER_OPTIONS = ["Women", "Men", "Kids", "Unisex"];

/* ------------------------------------------------------------------ */
/* Departments — the generic product system uses the same components   */
/* for Women, Bridal, Men and Kids. Department is DATA, not logic.     */
/* ------------------------------------------------------------------ */

export const DEPARTMENT_SELECT_OPTIONS = DEPARTMENT_OPTIONS;

export const departmentCategoriesFor = categoriesForDepartment;
export const departmentSubcategoriesFor = subcategoriesForDepartmentCategory;

/* ------------------------------------------------------------------ */
/* Stable Product IDs (Phase 22)                                       */
/* ------------------------------------------------------------------ */

/**
 * Deterministic taxonomy-based Product ID prefixes. A new Product draft
 * receives a permanent canonical id after its full taxonomy path is selected —
 * never a random id and never an array index. The id is persisted in the product
 * register and is never derived from the editable product name.
 *
 * The builder lives in the leaf module `./productIdPrefixes` so every draft
 * source shares the same full taxonomy-path identity convention.
 */
export { buildProductIdPrefix } from "./productIdPrefixes";

/* ------------------------------------------------------------------ */
/* Fabric & material — taxonomy list extended, never contradicted      */
/* ------------------------------------------------------------------ */

const mergeUnique = (...lists) => [...new Set(lists.flat().filter(Boolean))];

/** Product attributes are populated from the product data source, not frontend presets. */
export const FABRIC_OPTIONS = [];
export const MATERIAL_OPTIONS = [];
export const COLOR_OPTIONS = [];
export const SIZE_OPTIONS = [];
export const PATTERN_OPTIONS = [];
export const WORK_OPTIONS = [];
export const SEASON_OPTIONS = [];
export const OCCASION_OPTIONS = [];
export const COLLECTION_OPTIONS = [];
export const TAG_SUGGESTIONS = [];

export const TAX_MODES = {
  INCLUSIVE: "INCLUSIVE",
  EXCLUSIVE: "EXCLUSIVE",
};

export const TAX_MODE_OPTIONS = [
  { id: TAX_MODES.INCLUSIVE, label: "Tax inclusive" },
  { id: TAX_MODES.EXCLUSIVE, label: "Tax exclusive" },
];

export const GST_RATES = [0, 5, 12, 18, 28];

/* ------------------------------------------------------------------ */
/* Merchandising flags                                                 */
/* ------------------------------------------------------------------ */

export const PRODUCT_FLAG_OPTIONS = [
  { key: "featured", label: "Featured", field: "isFeatured", hint: "House selection on the landing page" },
  { key: "bestseller", label: "Bestseller", field: "isBestseller", hint: "Proven favourites" },
  { key: "newArrival", label: "New arrival", field: "isNew", hint: "Just-in edit" },
  { key: "limitedEdition", label: "Limited edition", field: "isLimitedEdition", hint: "Considered numbers only" },
  { key: "trending", label: "Trending", field: "isTrending", hint: "Rising demand" },
];

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

export const VARIANT_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

/* ------------------------------------------------------------------ */
/* Returns                                                             */
/* ------------------------------------------------------------------ */

export const RETURN_ELIGIBILITY_OPTIONS = [
  { id: "eligible", label: "Returnable" },
  { id: "exchange-only", label: "Exchange only" },
  { id: "non-returnable", label: "Non-returnable" },
];

/* ------------------------------------------------------------------ */
/* Availability — same vocabulary as the storefront taxonomy           */
/* ------------------------------------------------------------------ */

export const AVAILABILITY_OPTIONS = [
  { id: "in-stock", label: "In Stock" },
  { id: "low-stock", label: "Only a Few Left" },
  { id: "made-to-order", label: "Made to Order" },
  { id: "unavailable", label: "Currently Unavailable" },
];

export default {
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_OPTIONS,
  REVIEW_STATES,
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
  GENDER_OPTIONS,
  FABRIC_OPTIONS,
  MATERIAL_OPTIONS,
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  PATTERN_OPTIONS,
  WORK_OPTIONS,
  SEASON_OPTIONS,
  OCCASION_OPTIONS,
  COLLECTION_OPTIONS,
  TAG_SUGGESTIONS,
  TAX_MODES,
  TAX_MODE_OPTIONS,
  GST_RATES,
  PRODUCT_FLAG_OPTIONS,
  VARIANT_STATUSES,
  RETURN_ELIGIBILITY_OPTIONS,
  AVAILABILITY_OPTIONS,
};
