/**
 * PRATIKSHYA FASHON — Checkout coupon adapter (Phase 17).
 *
 * The Phase 6 bag still talks in coupon language: `getCoupon`,
 * `validateCoupon`, `appliesTo`. Those functions now resolve against the
 * single offer repository rather than a second hardcoded list.
 *
 * WELCOME10, FESTIVE15 and BRIDAL20 continue to work — they were migrated
 * into the offer register as first-class records. Components must not
 * grow a second coupon lookup.
 */

import offerRepository, {
  OFFER_MESSAGES,
  toCheckoutCoupon,
  validateOffer,
} from "../../services/offers/offerRepository";

/** @deprecated Read live offers through `getCoupons()` — this export stays for older imports. */
export const coupons = [];

export const COUPON_UNAVAILABLE_MESSAGE = OFFER_MESSAGES.UNAVAILABLE;

export const getCoupons = (customer = {}) =>
  offerRepository.listCustomerVisible(customer).map(toCheckoutCoupon);

export const getCoupon = (code) => offerRepository.getCheckoutCoupon(code);

/**
 * Validates a code against the central offer register and the current bag.
 * Always answers in customer language.
 */
export function validateCoupon(code, items, options = {}) {
  const result = validateOffer(code, {
    items,
    appliedCode: options.appliedCode,
    customerId: options.customerId,
    customerEmail: options.customerEmail,
  });
  if (!result.ok) return { ok: false, message: result.message };
  return { ok: true, coupon: result.coupon, offer: result.offer };
}

export default {
  coupons,
  getCoupons,
  getCoupon,
  validateCoupon,
  COUPON_UNAVAILABLE_MESSAGE,
};
