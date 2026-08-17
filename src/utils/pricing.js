/**
 * PRATIKSHYA FASHON — Pricing engine (Phase 13).
 *
 * Every price calculation the house performs lives here: the product
 * editor, the admin tables, the review queue and (later) a backend all
 * read the same numbers from one module. Components never do this
 * arithmetic themselves.
 *
 * Model:
 *   mrp            list price, the struck-through figure
 *   sellingPrice   the house price, never above MRP
 *   discount       type (percentage | fixed) + value, applied to the
 *                  selling price
 *   finalPrice     what the customer pays — sellingPrice minus discount
 *
 * The storefront keeps reading `product.price` / `product.originalPrice`;
 * the repository maps `finalPrice → price` and `mrp → originalPrice` when
 * a product is saved, so one engine serves both worlds.
 *
 * Demo business logic only — structured for a future backend, never a
 * legal GST claim.
 */

export const DISCOUNT_TYPES = {
  NONE: "none",
  PERCENTAGE: "percentage",
  FIXED: "fixed",
};

export const DISCOUNT_TYPE_OPTIONS = [
  { id: DISCOUNT_TYPES.NONE, label: "No discount" },
  { id: DISCOUNT_TYPES.PERCENTAGE, label: "Percentage (%)" },
  { id: DISCOUNT_TYPES.FIXED, label: "Fixed amount (₹)" },
];

/**
 * Selling above MRP is not permitted in this house. A future backend may
 * raise this flag for special categories; the rule stays in one place.
 */
export const ALLOW_SELLING_ABOVE_MRP = false;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

export const roundINR = (value) => Math.round(Number(value) || 0);

/**
 * Computes the complete pricing picture for a product.
 *
 * Returns `{ mrp, sellingPrice, discountType, discountValue,
 * discountAmount, finalPrice, savings, errors }`. `errors` is empty when
 * every rule holds; the editor shows them inline and refuses to publish
 * while any remain.
 */
export const computePricing = (pricing = {}) => {
  const mrp = toNumber(pricing.mrp);
  const sellingPrice = toNumber(pricing.sellingPrice);
  const discountType = pricing.discountType || DISCOUNT_TYPES.NONE;
  const discountValue = toNumber(pricing.discountValue ?? 0);
  const taxRate = toNumber(pricing.taxRate ?? 0);
  const taxMode = pricing.taxMode || "INCLUSIVE";

  const errors = [];

  if (!Number.isFinite(mrp) || mrp <= 0) {
    errors.push("MRP must be greater than zero.");
  }
  if (!Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    errors.push("Selling price must be greater than zero.");
  }
  if (
    !ALLOW_SELLING_ABOVE_MRP &&
    Number.isFinite(mrp) &&
    Number.isFinite(sellingPrice) &&
    sellingPrice > mrp
  ) {
    errors.push("Selling price cannot be above MRP.");
  }

  let discountAmount = 0;
  if (discountType === DISCOUNT_TYPES.PERCENTAGE) {
    if (!Number.isFinite(discountValue) || discountValue < 0 || discountValue > 100) {
      errors.push("Percentage discount must be between 0 and 100.");
    } else if (Number.isFinite(sellingPrice)) {
      discountAmount = (sellingPrice * discountValue) / 100;
    }
  } else if (discountType === DISCOUNT_TYPES.FIXED) {
    if (!Number.isFinite(discountValue) || discountValue < 0) {
      errors.push("Fixed discount cannot be negative.");
    } else if (Number.isFinite(sellingPrice) && discountValue > sellingPrice) {
      errors.push("Fixed discount cannot exceed the selling price.");
    } else {
      discountAmount = discountValue;
    }
  }

  if (Number.isFinite(taxRate) && (taxRate < 0 || taxRate > 100)) {
    errors.push("GST rate must be between 0% and 100%.");
  }

  const base = Number.isFinite(sellingPrice) ? sellingPrice : 0;
  const finalPrice = Math.max(0, roundINR(base - discountAmount));

  if (finalPrice < 0) {
    errors.push("Final price must never be negative.");
  }

  const mrpVal = Number.isFinite(mrp) ? roundINR(mrp) : 0;
  const savings = mrpVal > 0 ? Math.max(0, mrpVal - finalPrice) : 0;
  const effectiveDiscountPercent =
    mrpVal > 0 && savings > 0
      ? Number(((savings / mrpVal) * 100).toFixed(2))
      : 0;

  return {
    mrp: mrpVal,
    sellingPrice: Number.isFinite(sellingPrice) ? roundINR(sellingPrice) : 0,
    discountType,
    discountValue: Number.isFinite(discountValue) ? discountValue : 0,
    discountAmount: roundINR(discountAmount),
    finalPrice,
    savings,
    effectiveDiscountPercent,
    taxMode,
    taxRate: Number.isFinite(taxRate) ? taxRate : 0,
    errors,
  };
};

/** True when every pricing rule holds. */
export const isPricingValid = (pricing) => computePricing(pricing).errors.length === 0;

/**
 * Maps the pricing model onto the fields the storefront reads.
 * `originalPrice` is only carried when there is a genuine saving to show.
 */
export const toStorefrontPricing = (pricing) => {
  const computed = computePricing(pricing);
  return {
    price: computed.finalPrice,
    originalPrice: computed.mrp > computed.finalPrice ? computed.mrp : undefined,
    discount:
      computed.mrp > computed.finalPrice
        ? Math.round(((computed.mrp - computed.finalPrice) / computed.mrp) * 100)
        : null,
  };
};

/**
 * The price a variant charges. An override wins; otherwise the product's
 * final selling price stands.
 */
export const resolveVariantPrice = (variant, productPricing) => {
  const override = toNumber(variant?.priceOverride);
  if (Number.isFinite(override) && override > 0) return roundINR(override);
  return computePricing(productPricing).finalPrice;
};

/** Human-readable discount summary for tables: `10% off` / `₹500 off`. */
export const describeDiscount = (pricing) => {
  const { discountType, discountValue, discountAmount, effectiveDiscountPercent, savings } =
    computePricing(pricing);
  if (discountType === DISCOUNT_TYPES.PERCENTAGE && discountValue > 0) {
    return `${roundINR(discountValue)}% off`;
  }
  if (discountType === DISCOUNT_TYPES.FIXED && discountValue > 0) {
    return `₹${roundINR(discountValue)} off`;
  }
  if (discountAmount > 0) return `₹${discountAmount} off`;
  if (effectiveDiscountPercent > 0) return `${effectiveDiscountPercent}% off`;
  if (savings > 0) return `₹${savings} off`;
  return "—";
};

export default {
  DISCOUNT_TYPES,
  DISCOUNT_TYPE_OPTIONS,
  ALLOW_SELLING_ABOVE_MRP,
  computePricing,
  isPricingValid,
  toStorefrontPricing,
  resolveVariantPrice,
  describeDiscount,
  roundINR,
};
