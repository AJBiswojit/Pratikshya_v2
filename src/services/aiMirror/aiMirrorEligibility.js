/**
 * PRATIKSHYA AI MIRROR — catalogue eligibility.
 *
 * This is deliberately the one gate used by the mirror selector, the product
 * detail CTA and the mock provider. It is taxonomy-aware so a product cannot
 * accidentally become eligible merely because a card happens to look like
 * clothing. New categories can be supported later without touching screens.
 */

import {
  categoriesForDepartment,
  categoryLabel,
  departmentForProduct,
} from "../../data/products/departments";

/**
 * These are intentionally checked first. A future taxonomy name such as
 * "bridal accessories" must never pass because it contains "bridal".
 */
const EXCLUDED_TERMS = [
  "jewellery",
  "jewelry",
  "earring",
  "necklace",
  "bangle",
  "bracelet",
  "ring",
  "watch",
  "handbag",
  "hand bag",
  "bag",
  "shoe",
  "sandal",
  "footwear",
  "accessory",
  "innerwear",
  "undergarment",
  "under garment",
  "lingerie",
  "beauty",
  "cosmetic",
  "makeup",
  "dupatta",
  "stole",
  "petticoat",
  "shapewear",
  "blouse",
];

const normalise = (value) => String(value || "").toLowerCase().replace(/[-_/]+/g, " ");

const taxonomyFor = (product) => {
  const department = departmentForProduct(product);
  const category = categoriesForDepartment(department).find(
    (entry) => entry.value === product?.category
  ) ?? null;
  return { department, category };
};

/** The product fields used for taxonomy-safe intent matching. */
export const virtualTryOnEligibilityText = (product) => {
  const { department, category } = taxonomyFor(product);
  return normalise(
    [
      product?.category,
      product?.categoryLabel,
      department,
      category?.value,
      category?.label,
      product?.subcategory,
      product?.productType,
      product?.name,
      ...(product?.tags ?? []),
    ]
      .filter(Boolean)
      .join(" ")
  );
};

/** True for categories and products that must never enter the mirror rail. */
export const isVirtualTryOnExcludedProduct = (product) => {
  const text = virtualTryOnEligibilityText(product);
  return EXCLUDED_TERMS.some((term) => text.includes(term));
};

/**
 * The source of truth for the experience.
 *
 * A product must be a named catalogue item, must not be in an excluded
 * taxonomy, and must resolve to a recognised apparel category/shape. This is
 * intentionally not a visual-only UI filter: the mock provider calls this
 * exact function too.
 */
export const isVirtualTryOnEligibleProduct = (product) => {
  if (!product?.id) return false;
  if (isVirtualTryOnExcludedProduct(product)) return false;

  const { department, category } = taxonomyFor(product);
  return Boolean(department && category);
};

/** A customer-facing filter label resolved through the existing taxonomy. */
export const getVirtualTryOnCategoryLabel = (product) => {
  const department = departmentForProduct(product);
  return product?.categoryLabel || categoryLabel(department, product?.category) || "Apparel";
};

/** Stable, presentation-safe category id for selector filter buttons. */
export const getVirtualTryOnCategoryKey = (product) =>
  String(product?.category || "apparel").toLowerCase();

export default isVirtualTryOnEligibleProduct;
