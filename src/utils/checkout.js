/**
 * PRATIKSHYA FASHON — Checkout utilities.
 *
 * The pure-logic layer of the Phase 8 transaction experience: delivery
 * pricing, checkout totals, delivery estimates, validation composition,
 * demo card formatting and the mock order snapshot. Everything here is
 * frontend demo logic over mock data — each function is the seam a real
 * shipping, tax or order service would replace without touching the UI.
 *
 * All arithmetic is a consumer of the Phase 6 pricing engine
 * (`utils/shopping.js`); nothing is re-derived here.
 */

import {
  DELIVERY_METHODS,
  getDeliveryMethod,
} from "../config/checkoutConfig";
import { readPaymentRules, readShippingRules } from "../config/commerceDefaults";
import {
  readStorage,
  writeStorage,
} from "./shopping";
import {
  isValidEmail,
  isValidPhone,
  isValidPincode,
} from "./validation";

/* ------------------------------------------------------------------ */
/* Delivery pricing                                                    */
/* ------------------------------------------------------------------ */

/**
 * The delivery fee for a method against the payable order value, following
 * the Phase 6 agreement: standard is complimentary at/above the threshold
 * and carries the flat bag fee below it; express carries its own premium
 * fee at every value.
 */
export const calculateDeliveryFee = (methodId, payableSubtotal) => {
  const method = getDeliveryMethod(methodId);
  if (payableSubtotal <= 0) return 0;
  const shipping = readShippingRules();
  if (shipping.enabled === false) return 0;
  if (method.freeAtThreshold && payableSubtotal >= shipping.freeShippingThreshold) return 0;
  if (method.freeAtThreshold) return shipping.defaultShippingFee;
  if (method.id === "express") return shipping.expressDeliveryFee;
  return method.fee;
};

/**
 * Checkout totals = the Phase 6 totals with the bag shipping replaced by
 * the chosen delivery lane, plus any cash-on-delivery surcharge.
 */
export const calculateCheckoutTotals = (
  cartTotals,
  deliveryMethodId,
  paymentMethodId
) => {
  const payable = cartTotals.total - cartTotals.shipping;
  const shipping = calculateDeliveryFee(deliveryMethodId, payable);
  const payments = readPaymentRules();
  const codFee = paymentMethodId === "cod" ? payments.codFee : 0;
  const total = payable + shipping + codFee;
  const threshold = readShippingRules().freeShippingThreshold;

  return {
    ...cartTotals,
    shipping,
    codFee,
    total,
    freeShippingRemainder:
      payable > 0 && payable < threshold ? threshold - payable : 0,
  };
};

/* ------------------------------------------------------------------ */
/* Delivery estimate                                                   */
/* ------------------------------------------------------------------ */

/** Adds whole calendar days, skipping Saturdays and Sundays. */
const addBusinessDays = (date, days) => {
  const result = new Date(date);
  let remaining = days;
  while (remaining > 0) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();
    if (day !== 0 && day !== 6) remaining -= 1;
  }
  return result;
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "18 August" — the day and month of a date. */
const dayMonth = (date) => `${date.getDate()} ${MONTHS[date.getMonth()]}`;

/**
 * Deterministic frontend delivery estimate for a method, anchored to the
 * current date. No shipping API is involved — the same order placed on the
 * same day always shows the same window.
 */
export const getDeliveryEstimate = (methodId, from = new Date()) => {
  const method = getDeliveryMethod(methodId);
  const [startDays, endDays] = method.caption
    .split("–")
    .map((part) => Number(part.match(/\d+/)?.[0]) || 3);
  const start = addBusinessDays(from, startDays);
  const end = addBusinessDays(from, endDays);
  return { start, end, methodId };
};

/** "18–20 August 2026" across months: "30 August – 2 September 2026". */
export const formatDeliveryEstimate = ({ start, end }) => {
  const year = start.getFullYear();
  if (start.getMonth() === end.getMonth()) {
    return `${start.getDate()}–${end.getDate()} ${MONTHS[end.getMonth()]} ${year}`;
  }
  return `${dayMonth(start)} – ${dayMonth(end)} ${year}`;
};

/* ------------------------------------------------------------------ */
/* Order identity                                                      */
/* ------------------------------------------------------------------ */

const ORDER_SEQUENCE_KEY = "pratikshya_order_sequence";

/** Reads the demo order sequence counter, never throwing. */
const readOrderSequence = () => {
  const stored = readStorage(ORDER_SEQUENCE_KEY, null);
  const value = Number(stored?.sequence);
  return Number.isFinite(value) && value > 0 ? value : 100;
};

/**
 * The next mock order sequence, persisted so demo QA is deterministic
 * within a browser. `PF-2026-000184` shaped, never `12345`.
 */
export const nextOrderSequence = () => {
  const sequence = readOrderSequence() + 1;
  writeStorage(ORDER_SEQUENCE_KEY, { sequence, at: Date.now() });
  return sequence;
};

/** Builds the order id from a year and sequence: PF-2026-000184. */
export const buildOrderId = (year, sequence) =>
  `PF-${year}-${String(sequence).padStart(6, "0")}`;

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/** Composes a field error object; `ok` is true only when every field passes. */
const composeValidation = (errors) => ({
  errors,
  ok: Object.values(errors).every((value) => !value),
});

/**
 * Customer information rules shared by guest and authenticated checkout.
 * Uses the Phase 7 validation primitives — one regex per rule, one voice.
 */
export const validateCustomer = ({ fullName = "", email = "", phone = "" } = {}) =>
  composeValidation({
    fullName: fullName.trim() ? "" : "Please enter your full name.",
    email: email.trim() ? (isValidEmail(email) ? "" : "Please enter a valid email address.") : "Please enter your email address.",
    phone: phone.trim() ? (isValidPhone(phone) ? "" : "Please enter a valid 10-digit mobile number.") : "Please enter your mobile number.",
  });

/**
 * Delivery address rules — the same composition the Phase 7 address book
 * uses (name, phone, address, city, state, pincode), so checkout and the
 * account pages can never disagree about what an address is.
 */
export const validateAddress = (address = {}) =>
  composeValidation({
    fullName: address.fullName?.trim() ? "" : "Full name is required.",
    phone: address.phone?.trim()
      ? isValidPhone(address.phone)
        ? ""
        : "Enter a valid 10-digit phone number."
      : "Phone number is required.",
    addressLine: address.addressLine?.trim() ? "" : "Flat, street or house name is required.",
    city: address.city?.trim() ? "" : "City is required.",
    state: address.state?.trim() ? "" : "State is required.",
    pincode: address.pincode?.trim()
      ? isValidPincode(address.pincode)
        ? ""
        : "Enter a valid 6-digit Indian PIN code."
      : "Pincode is required.",
  });

/** True when the customer fields form a complete, valid customer. */
export const isCustomerComplete = (customer) => validateCustomer(customer).ok;

/* ------------------------------------------------------------------ */
/* Demo card helpers                                                   */
/* ------------------------------------------------------------------ */

/**
 * Frontend demo formatting and validation only. These functions never
 * imply payment verification — they shape input and check shape.
 */

/** Groups digits into 4s: "1234 5678 9012 3456", capped at 16 digits. */
export const formatCardNumber = (value) =>
  String(value)
    .replace(/\D/g, "")
    .slice(0, 16)
    .replace(/(\d{4})(?=\d)/g, "$1 ");

/** "1226" → "12/26". */
export const formatExpiry = (value) => {
  const digits = String(value).replace(/\D/g, "").slice(0, 4);
  if (digits.length <= 2) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

/** Luhn checksum — a shape check used by every card demo, nothing more. */
export const isValidCardNumber = (value) => {
  const digits = String(value).replace(/\D/g, "");
  if (!/^\d{16}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let digit = Number(digits[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  return sum % 10 === 0;
};

/** "12/26" — a future month, not expired. */
export const isValidExpiry = (value, now = new Date()) => {
  const match = String(value).match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  if (month < 1 || month > 12) return false;
  const endOfMonth = new Date(year, month, 0, 23, 59, 59);
  return endOfMonth >= now;
};

/** Generic CVV shape: 3–4 digits. */
export const isValidCvv = (value) => /^\d{3,4}$/.test(String(value).trim());

/** Generic UPI handle shape: name@provider. */
export const isValidUpiId = (value) =>
  /^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(String(value).trim());

/**
 * Demo card form validation. Explicitly a frontend shape check — it never
 * verifies a payment, and the UI says so.
 */
export const validateCardForm = ({ number = "", expiry = "", cvv = "", name = "" } = {}) =>
  composeValidation({
    number: number.replace(/\s/g, "")
      ? isValidCardNumber(number)
        ? ""
        : "Enter a valid 16-digit card number."
      : "Card number is required.",
    expiry: expiry
      ? isValidExpiry(expiry)
        ? ""
        : "Enter a valid future expiry (MM/YY)."
      : "Expiry is required.",
    cvv: cvv
      ? isValidCvv(cvv)
        ? ""
        : "CVV must be 3–4 digits."
      : "CVV is required.",
    name: name.trim() ? "" : "Cardholder name is required.",
  });

/* ------------------------------------------------------------------ */
/* Bag fingerprint                                                     */
/* ------------------------------------------------------------------ */

/**
 * A stable fingerprint of the bag contents + applied offer. Checkout uses
 * it to notice when the bag changes after the customer reviewed their
 * order, so totals never silently drift under a confirmed review.
 */
export const cartFingerprint = (items, couponCode = null) =>
  items
    .map((item) => `${item.id}:${item.quantity}`)
    .sort()
    .join("|") + (couponCode ? `#${couponCode}` : "");

/* ------------------------------------------------------------------ */
/* Order snapshot                                                      */
/* ------------------------------------------------------------------ */

/**
 * The lightweight mock order snapshot captured at the moment of a
 * successful demo payment. Frontend state only — the record is shaped for
 * a future order service (history, tracking, invoice) without pretending
 * one exists yet.
 */
export const buildOrderSnapshot = ({
  orderId,
  customer,
  items,
  address,
  deliveryMethodId,
  paymentMethodId,
  totals,
  coupon = null,
  deliveryEstimate,
  customerId = null,
  inventoryReservationId = null,
  createdAt = new Date(),
}) => ({
  id: orderId,
  customerId,
  inventoryReservationId,
  customer: {
    fullName: customer.fullName,
    email: customer.email,
    phone: customer.phone,
  },
  items: items.map((item) => ({
    lineId: item.id,
    productId: item.productId,
    name: item.product.name,
    image: item.product.image,
    color: item.color,
    size: item.size,
    quantity: item.quantity,
    price: item.product.price,
    originalPrice: item.product.originalPrice ?? null,
    lineTotal: item.product.price * item.quantity,
  })),
  address: {
    fullName: address.fullName,
    phone: address.phone,
    addressLine: address.addressLine,
    landmark: address.landmark ?? "",
    city: address.city,
    state: address.state,
    pincode: address.pincode,
    type: address.type ?? "Home",
  },
  deliveryMethod: {
    id: deliveryMethodId,
    label: getDeliveryMethod(deliveryMethodId).label,
    estimate: deliveryEstimate,
  },
  /** Mirrored at the top level so the order experience reads one field. */
  estimatedDelivery: deliveryEstimate,
  paymentMethod: {
    id: paymentMethodId,
    label: getPaymentMethodLabel(paymentMethodId),
  },
  pricing: {
    subtotal: totals.subtotal,
    productDiscount: totals.productDiscount,
    couponDiscount: totals.couponDiscount,
    couponCode: coupon?.code ?? null,
    offerId: coupon?.id ?? coupon?.offerId ?? null,
    shipping: totals.shipping,
    codFee: totals.codFee ?? 0,
    total: totals.total,
    saved: totals.saved,
  },
  currency: "INR",
  createdAt: createdAt.toISOString(),
  status: "CONFIRMED",
  /**
   * Cash on delivery is not captured at checkout; every other demo method
   * settles at the moment of a successful mock payment.
   */
  paymentStatus: paymentMethodId === "cod" ? "PENDING" : "PAID",
});

/** Customer-facing label for a payment method id. */
export const getPaymentMethodLabel = (paymentMethodId) => {
  const labels = {
    upi: "UPI",
    card: "Credit / Debit Card",
    netbanking: "Net Banking",
    cod: "Cash on Delivery",
  };
  return labels[paymentMethodId] ?? "Payment";
};

/* ------------------------------------------------------------------ */

export default {
  calculateDeliveryFee,
  calculateCheckoutTotals,
  getDeliveryEstimate,
  formatDeliveryEstimate,
  nextOrderSequence,
  buildOrderId,
  validateCustomer,
  validateAddress,
  isCustomerComplete,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  isValidExpiry,
  isValidCvv,
  isValidUpiId,
  validateCardForm,
  cartFingerprint,
  buildOrderSnapshot,
  getPaymentMethodLabel,
  DELIVERY_METHODS,
};
