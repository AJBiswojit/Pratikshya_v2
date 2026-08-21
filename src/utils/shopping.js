/**
 * PRATIKSHYA FASHON — Shopping utilities.
 *
 * The single home for cart-line identity, quantity/stock rules, storage
 * safety and every price calculation the bag performs. Components never do
 * this arithmetic themselves — the cart page, the mini-cart and the product
 * detail panel all read the same numbers from here.
 *
 * Everything in this file is frontend demo logic over the mock catalogue.
 * Each function is the seam a real pricing, inventory or shipping service
 * would replace without touching the UI.
 */

import {
  COMMERCE_DEFAULTS,
  readShippingRules,
} from "../config/commerceDefaults";

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

/** Namespaced keys — never generic `cart` / `wishlist`. */
export const CART_STORAGE_KEY = "pratikshya_cart";
export const WISHLIST_STORAGE_KEY = "pratikshya_wishlist";

/**
 * Reads and parses a localStorage key, returning the fallback on any
 * failure. Corrupted storage must never crash the application.
 */
export const readStorage = (key, fallback) => {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === null) return fallback;
    return JSON.parse(stored);
  } catch {
    return fallback;
  }
};

/** Serialises a value into localStorage; persistence is an enhancement only. */
export const writeStorage = (key, value) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage being unavailable (private mode, quota) never breaks the bag.
  }
};

/* ------------------------------------------------------------------ */
/* Currency                                                            */
/* ------------------------------------------------------------------ */

/** Indian currency formatting for every customer-facing amount: ₹14,999. */
export const formatINR = (value) =>
  `₹${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

/* ------------------------------------------------------------------ */
/* Cart line identity                                                  */
/* ------------------------------------------------------------------ */

/**
 * Deterministic identity for a cart line: the product plus its selected
 * variant attributes. `Product-ID · Red · M` and `Product-ID · Red · L` are
 * different lines; adding `Product-ID · Red · M` twice merges into one.
 */
export const cartLineId = (productId, selection = {}) =>
  [productId, selection.color ?? "", selection.size ?? ""].join("::");

/* ------------------------------------------------------------------ */
/* Quantity + mock stock                                               */
/* ------------------------------------------------------------------ */

/** Cap applied to made-to-order pieces, which carry no counted stock. */
const MADE_TO_ORDER_LIMIT = 5;

/**
 * The most units of a product a customer may hold, from the mock catalogue.
 * The same rule serves the product detail panel, the mini-cart and the
 * cart page, so the constraint can never disagree with itself.
 */
export const getMaxQuantity = (product) => {
  if (!product || product.availability === "unavailable") return 0;
  if (Number(product.stock) > 0) return Number(product.stock);
  return product.availability === "made-to-order" ? MADE_TO_ORDER_LIMIT : 1;
};

/** Clamps a requested quantity into [1, available stock]. */
export const clampQuantity = (product, quantity) => {
  const maximum = getMaxQuantity(product);
  if (maximum === 0) return 0;
  return Math.min(maximum, Math.max(1, Math.floor(Number(quantity) || 1)));
};

/** True when the piece needs a deliberate size choice before it can be bagged. */
export const requiresVariantChoice = (product) => {
  const sizes = product?.sizes ?? [];
  return sizes.length > 1 || (sizes.length === 1 && sizes[0] !== "Free Size");
};

/** The default selection for a product added without visiting its detail page. */
export const defaultSelection = (product) => ({
  color:
    (product?.colors ?? []).find(
      (color) => !(product?.unavailableColors ?? []).includes(color)
    ) ?? null,
  size: product?.sizes?.[0] ?? null,
});

/* ------------------------------------------------------------------ */
/* Price calculation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Mock shipping rule, deliberately isolated: order value at or above the
 * threshold ships free, everything below carries a flat fee. A shipping
 * service replaces this one function later.
 */
export const FREE_SHIPPING_THRESHOLD = COMMERCE_DEFAULTS.freeShippingThreshold;
export const FLAT_SHIPPING_FEE = COMMERCE_DEFAULTS.defaultShippingFee;
export { readShippingRules };

/** Sum of current selling prices × quantities. */
export const calculateCartSubtotal = (items) =>
  items.reduce((total, item) => total + item.product.price * item.quantity, 0);

/** What the pieces would have cost before their product discounts. */
export const calculateProductDiscounts = (items) =>
  items.reduce((total, item) => {
    const { price, originalPrice } = item.product;
    if (typeof originalPrice === "number" && originalPrice > price) {
      return total + (originalPrice - price) * item.quantity;
    }
    return total;
  }, 0);

/** The portion of the subtotal a coupon may act on. */
export const calculateEligibleSubtotal = (items, coupon) =>
  items.reduce(
    (total, item) =>
      coupon && coupon.appliesTo(item.product)
        ? total + item.product.price * item.quantity
        : total,
    0
  );

/**
 * Coupon value. Applied once, after product discounts (which are already
 * folded into `price`), and only across the pieces the offer covers —
 * discounts never stack or repeat.
 *
 * Phase 17 extends the same function for fixed-amount offers and an
 * optional maximum discount. It does not become a second pricing engine.
 */
export const calculateCouponDiscount = (items, coupon) => {
  if (!coupon) return 0;
  const eligible = calculateEligibleSubtotal(items, coupon);
  if (eligible <= 0) return 0;

  const type = coupon.type || (coupon.percent ? "PERCENTAGE" : "FIXED_AMOUNT");
  let discount = 0;
  if (type === "FIXED_AMOUNT") {
    discount = Math.round(Number(coupon.discountValue ?? coupon.fixedAmount) || 0);
  } else {
    const percent = Number(coupon.percent ?? coupon.discountValue) || 0;
    discount = Math.round((eligible * percent) / 100);
  }

  const maximum = Number(coupon.maximumDiscount);
  if (Number.isFinite(maximum) && maximum > 0) {
    discount = Math.min(discount, maximum);
  }
  return Math.min(Math.max(0, discount), eligible);
};

/** Demo shipping: free at the threshold, a flat fee below it, nothing on an empty bag. */
export const calculateShipping = (payableSubtotal) => {
  if (payableSubtotal <= 0) return 0;
  const shipping = readShippingRules();
  if (shipping.enabled === false) return 0;
  return payableSubtotal >= shipping.freeShippingThreshold ? 0 : shipping.defaultShippingFee;
};

/**
 * The one calculation order the whole experience obeys:
 * products → product discount → coupon → shipping → total.
 */
export const calculateCartTotals = (items, coupon = null) => {
  const subtotal = calculateCartSubtotal(items);
  const productDiscount = calculateProductDiscounts(items);
  const couponDiscount = Math.min(calculateCouponDiscount(items, coupon), subtotal);
  const payable = subtotal - couponDiscount;
  const shipping = calculateShipping(payable);
  const total = payable + shipping;

  return {
    subtotal,
    productDiscount,
    couponDiscount,
    shipping,
    total,
    saved: productDiscount + couponDiscount,
    freeShippingRemainder: (() => {
      const threshold = readShippingRules().freeShippingThreshold;
      return payable > 0 && payable < threshold ? threshold - payable : 0;
    })(),
  };
};

export default {
  CART_STORAGE_KEY,
  WISHLIST_STORAGE_KEY,
  readStorage,
  writeStorage,
  formatINR,
  cartLineId,
  getMaxQuantity,
  clampQuantity,
  requiresVariantChoice,
  defaultSelection,
  FREE_SHIPPING_THRESHOLD,
  FLAT_SHIPPING_FEE,
  calculateCartSubtotal,
  calculateProductDiscounts,
  calculateEligibleSubtotal,
  calculateCouponDiscount,
  calculateShipping,
  calculateCartTotals,
};
