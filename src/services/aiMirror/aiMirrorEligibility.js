/**
 * PRATIKSHYA AI MIRROR — catalogue eligibility.
 *
 * This is deliberately the one gate used by the mirror selector, the product
 * detail CTA and the mock provider. It is taxonomy-aware so a product cannot
 * accidentally become eligible merely because a card happens to look like
 * clothing. New categories can be supported later without touching screens.
 */

import taxonomyRepository from "../taxonomyRepository";

/** Categories that are known, full-look apparel in the current catalogue. */
const APPAREL_CATEGORY_IDS = new Set([
  "sarees",
  "lehengas",
  "bridal-couture",
  "kurtis-and-suits",
  "menswear",
  "kidswear",
]);

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

/** Category names an operator may use when they add future apparel taxonomy. */
const APPAREL_TERMS = [
  "saree",
  "sari",
  "lehenga",
  "kurta",
  "kurti",
  "suit",
  "dress",
  "gown",
  "apparel",
  "ethnic wear",
  "ethnicwear",
  "women's clothing",
  "womens clothing",
  "men's ethnic",
  "mens ethnic",
  "sherwani",
  "anarkali",
  "sharara",
  "clothing",
  "kids wear",
  "kidswear",
];

const normalise = (value) => String(value || "").toLowerCase().replace(/[-_/]+/g, " ");

const categoryFor = (product) =>
  taxonomyRepository.findCategory(product?.category) ??
  taxonomyRepository.findCategory(product?.categoryLabel) ??
  null;

/** The product fields used for taxonomy-safe intent matching. */
export const virtualTryOnEligibilityText = (product) => {
  const category = categoryFor(product);
  return normalise(
    [
      product?.category,
      product?.categoryLabel,
      category?.id,
      category?.name,
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

  const category = categoryFor(product);
  if (APPAREL_CATEGORY_IDS.has(String(category?.id || product.category || "").toLowerCase())) {
    return true;
  }

  const text = virtualTryOnEligibilityText(product);
  return APPAREL_TERMS.some((term) => text.includes(term));
};

/** A customer-facing filter label resolved through the existing taxonomy. */
export const getVirtualTryOnCategoryLabel = (product) => {
  const category = categoryFor(product);
  return category?.name || product?.categoryLabel || product?.category || "Apparel";
};

/** Stable, presentation-safe category id for selector filter buttons. */
export const getVirtualTryOnCategoryKey = (product) =>
  String(categoryFor(product)?.id || product?.category || "apparel").toLowerCase();

export default isVirtualTryOnEligibleProduct;
