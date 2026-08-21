/**
 * PRATIKSHYA FASHON — Checkout configuration.
 *
 * The single home for checkout-level demo rules: delivery methods and
 * pricing, the cash-on-delivery fee, payment method metadata and the demo
 * payment scenarios. Values live here so they can never scatter through
 * JSX, and every consumer (the delivery selector, the order summary, the
 * pricing utilities) reads the same source of truth.
 *
 * Shipping thresholds deliberately reference `COMMERCE_DEFAULTS` so
 * checkout, bag and Admin Settings share one authored default. Runtime
 * fees resolve through `readShippingRules` / `readPaymentRules`.
 */

import { COMMERCE_DEFAULTS } from "./commerceDefaults";

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

/**
 * The delivery methods offered at checkout. Demo rules only.
 *
 * `freeAtThreshold` keeps the Phase 6 shipping agreement: standard
 * delivery is complimentary at or above the free-shipping threshold and
 * carries the flat bag fee below it. Express is a premium lane that never
 * drops below its own fee.
 */
export const DELIVERY_METHODS = [
  {
    id: "standard",
    label: "Standard Delivery",
    caption: "3–5 business days",
    fee: COMMERCE_DEFAULTS.defaultShippingFee,
    freeAtThreshold: true,
  },
  {
    id: "express",
    label: "Express Delivery",
    caption: "1–2 business days",
    fee: COMMERCE_DEFAULTS.expressDeliveryFee,
    freeAtThreshold: false,
  },
];

/** Resolves a delivery method id, falling back to standard. */
export const getDeliveryMethod = (id) =>
  DELIVERY_METHODS.find((method) => method.id === id) ?? DELIVERY_METHODS[0];

/** The flat surcharge carried by cash-on-delivery orders, when applicable. */
export const COD_FEE = COMMERCE_DEFAULTS.codFee;

/* ------------------------------------------------------------------ */
/* Payment methods                                                     */
/* ------------------------------------------------------------------ */

/**
 * The payment methods offered at checkout. These are UI/demo options only —
 * no real payment service is connected at this phase.
 */
export const PAYMENT_METHODS = [
  {
    id: "upi",
    label: "UPI",
    description: "Google Pay · PhonePe · Paytm",
  },
  {
    id: "card",
    label: "Credit / Debit Card",
    description: "Visa · Mastercard · RuPay",
  },
  {
    id: "netbanking",
    label: "Net Banking",
    description: "All major Indian banks",
  },
  {
    id: "qr",
    label: "Sandbox QR",
    description: "Scan to pay · Test environment",
  },
  {
    id: "cod",
    label: "Cash on Delivery",
    description: `Pay on arrival · ${`₹${COD_FEE.toLocaleString("en-IN")}`} fee`,
  },
];

/** Demo UPI app choices — visual selection only. */
export const UPI_APPS = ["Google Pay", "PhonePe", "Paytm", "BHIM"];

/** Demo bank list for the net-banking selector. */
export const NET_BANKING_BANKS = [
  "State Bank of India",
  "HDFC Bank",
  "ICICI Bank",
  "Axis Bank",
  "Kotak Mahindra Bank",
  "Punjab National Bank",
  "Bank of Baroda",
  "Canara Bank",
];

/* ------------------------------------------------------------------ */
/* Demo payment scenarios                                              */
/* ------------------------------------------------------------------ */

/**
 * The deterministic test scenarios behind the clearly-labelled demo
 * payment controls. Each scenario resolves the mock payment session to a
 * different outcome so client demos can walk every state without a real
 * gateway.
 */
export const DEMO_SCENARIOS = [
  { id: "success", label: "Test Success" },
  { id: "failure", label: "Test Failure" },
  { id: "cancelled", label: "Test Cancellation" },
  { id: "pending", label: "Test Pending" },
];

/* ------------------------------------------------------------------ */
/* Steps                                                               */
/* ------------------------------------------------------------------ */

/** The checkout journey in order. Confirmation is a separate page. */
export const CHECKOUT_STEPS = ["customer", "delivery", "review", "payment"];

export default {
  DELIVERY_METHODS,
  getDeliveryMethod,
  COD_FEE,
  PAYMENT_METHODS,
  UPI_APPS,
  NET_BANKING_BANKS,
  DEMO_SCENARIOS,
  CHECKOUT_STEPS,
};
