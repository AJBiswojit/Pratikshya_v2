/**
 * PRATIKSHYA FASHON — Offer repository (Phase 17).
 *
 * The ONE authoritative source for offers, coupons and promotions.
 * Admin, employee, cart, checkout and the order ledger all resolve
 * offer truth through this module. There is no adminOffers, no
 * customerOffers, no checkoutOffers — one `pratikshya_offers` register.
 *
 * Responsibilities:
 *   create · read · update · activate · pause · archive
 *   validate · eligibility · usage · safe persistence
 *
 * Discount arithmetic for a live bag still runs through the Phase 6
 * cart engine (`utils/shopping.js`). This module decides whether an
 * offer applies and how large the discount should be; it does not
 * invent a second totals pipeline.
 *
 * Historical order pricing is never rewritten from here.
 */

import { SEED_OFFERS } from "../../data/offers/seedOffers";
import { collectionLabels, categoryLabels } from "../../data/products/taxonomy";
import taxonomyRepository from "../taxonomyRepository";
import { loadOrders } from "../orders/orderService";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";
import { readStorage, writeStorage, formatINR } from "../../utils/shopping";

export const OFFER_STORAGE_KEY = "pratikshya_offers";
export const OFFERS_CHANGED_EVENT = "pratikshya-offers-changed";

export const OFFER_TYPES = {
  PERCENTAGE: "PERCENTAGE",
  FIXED_AMOUNT: "FIXED_AMOUNT",
};

export const OFFER_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
};

export const CUSTOMER_ELIGIBILITY = {
  ALL_CUSTOMERS: "ALL_CUSTOMERS",
  NEW_CUSTOMERS: "NEW_CUSTOMERS",
  RETURNING_CUSTOMERS: "RETURNING_CUSTOMERS",
  SPECIFIC_CUSTOMERS: "SPECIFIC_CUSTOMERS",
};

export const PRODUCT_ELIGIBILITY = {
  ALL_PRODUCTS: "ALL_PRODUCTS",
  SPECIFIC_PRODUCTS: "SPECIFIC_PRODUCTS",
  CATEGORY: "CATEGORY",
  COLLECTION: "COLLECTION",
};

export const OFFER_TYPE_OPTIONS = [
  { id: OFFER_TYPES.PERCENTAGE, label: "Percentage (%)" },
  { id: OFFER_TYPES.FIXED_AMOUNT, label: "Fixed amount (₹)" },
];

export const OFFER_STATUS_OPTIONS = [
  { id: OFFER_STATUS.DRAFT, label: "Draft", tone: "quiet" },
  { id: OFFER_STATUS.SCHEDULED, label: "Scheduled", tone: "brass" },
  { id: OFFER_STATUS.ACTIVE, label: "Active", tone: "ink" },
  { id: OFFER_STATUS.PAUSED, label: "Paused", tone: "alert" },
  { id: OFFER_STATUS.EXPIRED, label: "Expired", tone: "muted" },
  { id: OFFER_STATUS.ARCHIVED, label: "Archived", tone: "muted" },
];

export const CUSTOMER_ELIGIBILITY_OPTIONS = [
  { id: CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS, label: "All customers" },
  { id: CUSTOMER_ELIGIBILITY.NEW_CUSTOMERS, label: "New customers" },
  { id: CUSTOMER_ELIGIBILITY.RETURNING_CUSTOMERS, label: "Returning customers" },
  { id: CUSTOMER_ELIGIBILITY.SPECIFIC_CUSTOMERS, label: "Specific customers" },
];

export const PRODUCT_ELIGIBILITY_OPTIONS = [
  { id: PRODUCT_ELIGIBILITY.ALL_PRODUCTS, label: "All products" },
  { id: PRODUCT_ELIGIBILITY.SPECIFIC_PRODUCTS, label: "Specific products" },
  { id: PRODUCT_ELIGIBILITY.CATEGORY, label: "Category" },
  { id: PRODUCT_ELIGIBILITY.COLLECTION, label: "Collection" },
];

export const OFFER_MESSAGES = {
  UNAVAILABLE: "This offer isn't available for this collection.",
  EXPIRED: "This offer has expired.",
  INVALID: "This offer is not valid for this order.",
  USAGE_LIMIT: "This offer has reached its usage limit.",
  CUSTOMER_LIMIT: "This offer is limited to one use per customer.",
  ALREADY_APPLIED: "This offer is already part of your order.",
  NOT_OPEN: "This offer isn't open yet.",
};

const CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

const nowIso = () => new Date().toISOString();

const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const actorLabel = (actor) => {
  if (!actor) return "System";
  if (actor.adminId) return actor.name ? `${actor.name} (${actor.adminId})` : actor.adminId;
  if (actor.employeeId) {
    return actor.label
      ? `${actor.label} (${actor.employeeId})`
      : `${actor.firstName ?? ""} ${actor.lastName ?? ""}`.trim() + ` (${actor.employeeId})`;
  }
  return actor.label || actor.name || "System";
};

/* ------------------------------------------------------------------ */
/* Code                                                                */
/* ------------------------------------------------------------------ */

export const normalizeCode = (code) =>
  String(code ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");

export const isValidCodeFormat = (code) => {
  const normalised = normalizeCode(code);
  return normalised.length >= 2 && normalised.length <= 24 && CODE_PATTERN.test(normalised);
};

/* ------------------------------------------------------------------ */
/* Dates + derived status                                              */
/* ------------------------------------------------------------------ */

const startOfDay = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
};

const endOfDay = (value) => {
  if (!value) return null;
  const date = new Date(`${String(value).slice(0, 10)}T23:59:59`);
  return Number.isNaN(date.getTime()) ? null : date;
};

/**
 * Display status is derived from the stored lifecycle + the current time.
 * DRAFT / PAUSED / ARCHIVED always win. An ACTIVE record becomes
 * SCHEDULED before its start and EXPIRED after its end — no background job.
 */
export const deriveStatus = (offer, now = new Date()) => {
  const stored = offer?.status || OFFER_STATUS.DRAFT;
  if (stored === OFFER_STATUS.DRAFT) return OFFER_STATUS.DRAFT;
  if (stored === OFFER_STATUS.ARCHIVED) return OFFER_STATUS.ARCHIVED;
  if (stored === OFFER_STATUS.PAUSED) return OFFER_STATUS.PAUSED;

  const start = startOfDay(offer.startDate);
  const end = endOfDay(offer.endDate);
  if (start && now < start) return OFFER_STATUS.SCHEDULED;
  if (end && now > end) return OFFER_STATUS.EXPIRED;
  return OFFER_STATUS.ACTIVE;
};

export const isRedeemableStatus = (status) => status === OFFER_STATUS.ACTIVE;

/* ------------------------------------------------------------------ */
/* Collection compatibility                                            */
/* ------------------------------------------------------------------ */

const collectionById = () => Object.fromEntries(taxonomyRepository.collections().map((entry) => [entry.id, entry]));

const productCollectionValues = (product) =>
  [product?.collection, ...(Array.isArray(product?.collections) ? product.collections : [])]
    .filter(Boolean)
    .map(String);

const matchesNamedCollection = (product, id, label) => {
  const values = productCollectionValues(product);
  const targets = [id, label, collectionLabels[id]].filter(Boolean).map((value) => String(value).toLowerCase());
  return values.some((value) => targets.includes(value.toLowerCase()));
};

/**
 * Minimum compatibility layer over the existing taxonomy. Collection
 * modules are not activated here — we only resolve the ids the catalogue
 * already understands, plus a few storefront slugs (silk, new-arrivals).
 */
const collectionMatcher = (collectionId) => {
  const id = String(collectionId || "");
  switch (id) {
    case "festive-edit":
    case "festive":
      return (product) =>
        matchesNamedCollection(product, "festive-edit", "Festive Edit") ||
        (product.occasion ?? []).includes("Festive");
    case "bridal-trousseau":
    case "bridal":
      return (product) =>
        matchesNamedCollection(product, "bridal-trousseau", "Bridal Trousseau") ||
        product.category === "bridal-couture" ||
        (product.occasion ?? []).includes("Bridal");
    case "new-arrivals":
      return (product) => Boolean(product.isNew || product.flags?.newArrival);
    case "silk":
      return (product) =>
        /silk/i.test(product.fabric || "") ||
        /silk/i.test(product.collection || "") ||
        (product.collections ?? []).some((entry) => /silk/i.test(entry));
    case "wedding":
      return (product) =>
        (product.occasion ?? []).includes("Wedding") ||
        matchesNamedCollection(product, "wedding", "Wedding");
    default: {
      const known = collectionById()[id] || taxonomyRepository.findCollection(id);
      return (product) => taxonomyRepository.isProductInCollection(product, id) || matchesNamedCollection(product, id, known?.name || known?.label || id);
    }
  }
};

export const isProductInCollection = (product, collectionId) =>
  Boolean(product && collectionId && collectionMatcher(collectionId)(product));

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export const isProductExcluded = (offer, product) => {
  if (!product) return true;
  if ((offer.excludedProducts ?? []).includes(String(product.id))) return true;
  if ((offer.excludedCategories ?? []).includes(product.category)) return true;
  return (offer.excludedCollections ?? []).some((collectionId) =>
    isProductInCollection(product, collectionId)
  );
};

export const isProductEligible = (offer, product) => {
  if (!offer || !product) return false;
  if (isProductExcluded(offer, product)) return false;

  const kind = offer.productEligibility || PRODUCT_ELIGIBILITY.ALL_PRODUCTS;
  if (kind === PRODUCT_ELIGIBILITY.ALL_PRODUCTS) return true;

  if (kind === PRODUCT_ELIGIBILITY.SPECIFIC_PRODUCTS) {
    return (offer.includedProducts ?? []).includes(String(product.id));
  }

  if (kind === PRODUCT_ELIGIBILITY.CATEGORY) {
    const categories = offer.includedCategories ?? [];
    if (categories.length === 0) return false;
    return categories.includes(product.category);
  }

  if (kind === PRODUCT_ELIGIBILITY.COLLECTION) {
    const collections = offer.includedCollections ?? [];
    if (collections.length === 0) return false;
    return collections.some((collectionId) => isProductInCollection(product, collectionId));
  }

  return false;
};

const ordersForCustomer = (customerId, email) => {
  let orders = [];
  try {
    orders = loadOrders();
  } catch {
    orders = [];
  }
  const id = customerId ? String(customerId) : "";
  const mail = email ? String(email).trim().toLowerCase() : "";
  return orders.filter((order) => {
    if (id && String(order.customerId) === id) return true;
    if (mail && String(order.customer?.email || "").trim().toLowerCase() === mail) return true;
    return false;
  });
};

export const isNewCustomer = (customerId, email) =>
  ordersForCustomer(customerId, email).length === 0;

export const isCustomerEligible = (offer, { customerId = null, customerEmail = null } = {}) => {
  const kind = offer.customerEligibility || CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS;
  if (kind === CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS) return true;

  if (kind === CUSTOMER_ELIGIBILITY.SPECIFIC_CUSTOMERS) {
    if (!customerId) return false;
    return (offer.specificCustomerIds ?? []).includes(String(customerId));
  }

  if (kind === CUSTOMER_ELIGIBILITY.NEW_CUSTOMERS) {
    return isNewCustomer(customerId, customerEmail);
  }

  if (kind === CUSTOMER_ELIGIBILITY.RETURNING_CUSTOMERS) {
    return !isNewCustomer(customerId, customerEmail);
  }

  return true;
};

/* ------------------------------------------------------------------ */
/* Discount                                                            */
/* ------------------------------------------------------------------ */

export const previewOfferDiscount = (offer, sampleAmount = 10000) => {
  const amount = Math.max(0, asNumber(sampleAmount, 0));
  const minimum = asNumber(offer?.minimumOrderValue, 0);
  if (minimum > 0 && amount < minimum) {
    return { available: false, discount: 0, final: amount, sampleAmount: amount };
  }

  let discount = 0;
  if (offer?.type === OFFER_TYPES.FIXED_AMOUNT) {
    discount = Math.round(asNumber(offer.discountValue, 0));
  } else {
    discount = Math.round((amount * asNumber(offer?.discountValue, 0)) / 100);
  }
  const maximum = asNumber(offer?.maximumDiscount, 0);
  if (maximum > 0) discount = Math.min(discount, maximum);
  discount = Math.min(Math.max(0, discount), amount);
  return { available: true, discount, final: amount - discount, sampleAmount: amount };
};

export const formatOfferDiscount = (offer) => {
  if (!offer) return "—";
  if (offer.type === OFFER_TYPES.FIXED_AMOUNT) {
    return `${formatINR(offer.discountValue)} off`;
  }
  return `${asNumber(offer.discountValue, 0)}% off`;
};

export const describeEligibility = (offer) => {
  if (!offer) return "—";
  const kind = offer.productEligibility || PRODUCT_ELIGIBILITY.ALL_PRODUCTS;
  if (kind === PRODUCT_ELIGIBILITY.ALL_PRODUCTS) return "Full collection";
  if (kind === PRODUCT_ELIGIBILITY.SPECIFIC_PRODUCTS) {
    const count = (offer.includedProducts ?? []).length;
    return count ? `${count} selected piece${count === 1 ? "" : "s"}` : "Selected pieces";
  }
  if (kind === PRODUCT_ELIGIBILITY.CATEGORY) {
    const labels = (offer.includedCategories ?? [])
      .map((id) => categoryLabels[id] || id)
      .filter(Boolean);
    return labels.length ? labels.join(", ") : "Selected categories";
  }
  if (kind === PRODUCT_ELIGIBILITY.COLLECTION) {
    const labels = (offer.includedCollections ?? [])
      .map((id) => collectionLabels[id] || collectionById()[id]?.name || id)
      .filter(Boolean);
    return labels.length ? labels.join(", ") : "Selected collections";
  }
  return "—";
};

export const describeCustomerEligibility = (offer) => {
  const option = CUSTOMER_ELIGIBILITY_OPTIONS.find(
    (entry) => entry.id === (offer?.customerEligibility || CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS)
  );
  return option?.label || "All customers";
};

export const getStatusMeta = (status) =>
  OFFER_STATUS_OPTIONS.find((entry) => entry.id === status) ?? {
    id: status,
    label: status || "—",
    tone: "quiet",
  };

/* ------------------------------------------------------------------ */
/* Checkout coupon shape                                               */
/* ------------------------------------------------------------------ */

/** The record the existing cart engine already understands. */
export const toCheckoutCoupon = (offer) => {
  if (!offer) return null;
  return {
    id: offer.id,
    offerId: offer.id,
    code: offer.code,
    title: offer.name,
    summary: offer.description,
    percent: offer.type === OFFER_TYPES.PERCENTAGE ? asNumber(offer.discountValue, 0) : 0,
    type: offer.type,
    discountValue: asNumber(offer.discountValue, 0),
    maximumDiscount: asNumber(offer.maximumDiscount, 0),
    minSubtotal: asNumber(offer.minimumOrderValue, 0),
    expiresAt: offer.endDate,
    scopeLabel: describeEligibility(offer),
    appliesTo: (product) => isProductEligible(offer, product),
    stackable: Boolean(offer.stackable),
    priority: asNumber(offer.priority, 0),
  };
};

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

export const normaliseOffer = (raw = {}) => {
  const type =
    raw.type === OFFER_TYPES.FIXED_AMOUNT ? OFFER_TYPES.FIXED_AMOUNT : OFFER_TYPES.PERCENTAGE;
  const storedStatus = Object.values(OFFER_STATUS).includes(raw.status)
    ? raw.status === OFFER_STATUS.SCHEDULED || raw.status === OFFER_STATUS.EXPIRED
      ? OFFER_STATUS.ACTIVE
      : raw.status
    : OFFER_STATUS.DRAFT;

  const offer = {
    id: raw.id || `off-${Date.now().toString(36)}`,
    code: normalizeCode(raw.code),
    name: String(raw.name || "").trim(),
    description: String(raw.description || "").trim(),
    type,
    discountValue: Math.max(0, asNumber(raw.discountValue, 0)),
    minimumOrderValue: Math.max(0, asNumber(raw.minimumOrderValue, 0)),
    maximumDiscount: Math.max(0, asNumber(raw.maximumDiscount, 0)),
    startDate: raw.startDate ? String(raw.startDate).slice(0, 10) : "",
    endDate: raw.endDate ? String(raw.endDate).slice(0, 10) : "",
    status: storedStatus,
    usageLimit: Math.max(0, Math.floor(asNumber(raw.usageLimit, 0))),
    usageCount: Math.max(0, Math.floor(asNumber(raw.usageCount, 0))),
    perCustomerLimit: Math.max(0, Math.floor(asNumber(raw.perCustomerLimit, 0))),
    customerEligibility: Object.values(CUSTOMER_ELIGIBILITY).includes(raw.customerEligibility)
      ? raw.customerEligibility
      : CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS,
    specificCustomerIds: asArray(raw.specificCustomerIds),
    productEligibility: Object.values(PRODUCT_ELIGIBILITY).includes(raw.productEligibility)
      ? raw.productEligibility
      : PRODUCT_ELIGIBILITY.ALL_PRODUCTS,
    includedProducts: asArray(raw.includedProducts),
    includedCategories: asArray(raw.includedCategories),
    includedCollections: asArray(raw.includedCollections),
    excludedProducts: asArray(raw.excludedProducts),
    excludedCategories: asArray(raw.excludedCategories),
    excludedCollections: asArray(raw.excludedCollections),
    stackable: Boolean(raw.stackable),
    priority: Math.max(0, Math.floor(asNumber(raw.priority, 0))),
    createdBy: raw.createdBy || null,
    createdAt: raw.createdAt || nowIso(),
    updatedBy: raw.updatedBy || null,
    updatedAt: raw.updatedAt || nowIso(),
    redeemedOrderIds: asArray(raw.redeemedOrderIds),
  };

  return {
    ...offer,
    displayStatus: deriveStatus(offer),
  };
};

/* ------------------------------------------------------------------ */
/* Storage                                                             */
/* ------------------------------------------------------------------ */

let memoryStorage = null;

const readRaw = () => {
  try {
    const stored = readStorage(OFFER_STORAGE_KEY, null);
    if (Array.isArray(stored) && stored.length > 0) {
      return stored;
    }
    if (typeof window === "undefined" && memoryStorage) {
      const parsed = JSON.parse(memoryStorage);
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* recover below */
  }
  return null;
};

const persist = (items, { quiet = false } = {}) => {
  const payload = Array.isArray(items) ? items : [];
  writeStorage(OFFER_STORAGE_KEY, payload);
  try {
    memoryStorage = JSON.stringify(payload);
  } catch {
    /* ignore */
  }
  if (!quiet && typeof window !== "undefined") {
    window.dispatchEvent(new Event(OFFERS_CHANGED_EVENT));
  }
  return payload;
};

const allNormalised = () => {
  const stored = readRaw();
  if (stored) {
    const recovered = stored
      .map((entry) => {
        try {
          return normaliseOffer(entry);
        } catch {
          return null;
        }
      })
      .filter((offer) => offer && offer.id && offer.code);
    if (recovered.length) return recovered;
    /* A stored empty array is a deliberate clear. Garbage records recover. */
    if (stored.length === 0) return [];
  }
  const seeded = SEED_OFFERS.map((entry) => normaliseOffer(entry));
  /* First read seeds the demo desk. That is a backfill, not an edit, so it
     stays quiet: announcing here would update subscribers mid-render. */
  persist(seeded, { quiet: true });
  return seeded;
};

const findNormalised = (id) =>
  allNormalised().find((offer) => String(offer.id) === String(id)) ?? null;

const findByCodeInternal = (code) => {
  const needle = normalizeCode(code);
  if (!needle) return null;
  return allNormalised().find((offer) => offer.code === needle) ?? null;
};

/* ------------------------------------------------------------------ */
/* Activity                                                            */
/* ------------------------------------------------------------------ */

const noteOffer = (action, offer, actor, summary) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetOfferId: offer?.id || null,
      action,
      summary,
    });
  } catch {
    /* diary is an enhancement */
  }
};

/* ------------------------------------------------------------------ */
/* Usage + redemptions                                                 */
/* ------------------------------------------------------------------ */

const orderMatchesOffer = (order, offer) => {
  const code = normalizeCode(order?.pricing?.couponCode);
  if (code && code === offer.code) return true;
  if (order?.pricing?.offerId && String(order.pricing.offerId) === String(offer.id)) return true;
  return false;
};

export const getOfferRedemptions = (offerId) => {
  const offer = findNormalised(offerId);
  if (!offer) return [];
  let orders = [];
  try {
    orders = loadOrders();
  } catch {
    orders = [];
  }
  return orders
    .filter((order) => orderMatchesOffer(order, offer))
    .map((order) => ({
      orderId: order.id,
      customer: order.customer?.fullName || "Customer",
      customerId: order.customerId || null,
      discount: asNumber(order.pricing?.couponDiscount, 0),
      date: order.createdAt,
      status: order.status || "CONFIRMED",
    }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const effectiveUsageCount = (offer) => {
  if (!offer) return 0;
  const fromOrders = getOfferRedemptions(offer.id).length;
  return Math.max(asNumber(offer.usageCount, 0), fromOrders);
};

const customerRedemptionCount = (offer, { customerId = null, customerEmail = null } = {}) => {
  if (!customerId && !customerEmail) return 0;
  const redemptions = getOfferRedemptions(offer.id);
  const id = customerId ? String(customerId) : "";
  const mail = customerEmail ? String(customerEmail).trim().toLowerCase() : "";
  if (id) {
    const byId = redemptions.filter((entry) => entry.customerId && String(entry.customerId) === id);
    if (byId.length) return byId.length;
  }
  const orders = ordersForCustomer(customerId, customerEmail);
  return orders.filter((order) => orderMatchesOffer(order, offer)).length ||
    (mail
      ? redemptions.filter((entry) => String(entry.customer || "").toLowerCase().includes(mail)).length
      : 0);
};

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

export const validateOfferDraft = (draft, { ignoreId = null } = {}) => {
  const errors = {};
  if (!String(draft.name || "").trim()) errors.name = "Offer name is required.";

  const code = normalizeCode(draft.code);
  if (!code) errors.code = "Coupon code is required.";
  else if (!isValidCodeFormat(code)) {
    errors.code = "Use letters, numbers and hyphens only (2–24 characters).";
  } else if (findByCodeInternal(code) && findByCodeInternal(code).id !== ignoreId) {
    errors.code = "That coupon code is already in use.";
  }

  const type =
    draft.type === OFFER_TYPES.FIXED_AMOUNT ? OFFER_TYPES.FIXED_AMOUNT : OFFER_TYPES.PERCENTAGE;
  const value = asNumber(draft.discountValue, NaN);
  if (!Number.isFinite(value) || value <= 0) {
    errors.discountValue = "Enter a discount greater than zero.";
  } else if (type === OFFER_TYPES.PERCENTAGE && value > 100) {
    errors.discountValue = "Percentage discount cannot exceed 100.";
  }

  if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) {
    errors.endDate = "End date cannot be before the start date.";
  }

  if (asNumber(draft.minimumOrderValue, 0) < 0) {
    errors.minimumOrderValue = "Minimum order cannot be negative.";
  }
  if (asNumber(draft.maximumDiscount, 0) < 0) {
    errors.maximumDiscount = "Maximum discount cannot be negative.";
  }

  if (
    draft.productEligibility === PRODUCT_ELIGIBILITY.SPECIFIC_PRODUCTS &&
    !(draft.includedProducts ?? []).length
  ) {
    errors.includedProducts = "Select at least one product.";
  }
  if (
    draft.productEligibility === PRODUCT_ELIGIBILITY.CATEGORY &&
    !(draft.includedCategories ?? []).length
  ) {
    errors.includedCategories = "Select at least one category.";
  }
  if (
    draft.productEligibility === PRODUCT_ELIGIBILITY.COLLECTION &&
    !(draft.includedCollections ?? []).length
  ) {
    errors.includedCollections = "Select at least one collection.";
  }
  if (
    draft.customerEligibility === CUSTOMER_ELIGIBILITY.SPECIFIC_CUSTOMERS &&
    !(draft.specificCustomerIds ?? []).length
  ) {
    errors.specificCustomerIds = "Select at least one customer.";
  }

  return { ok: Object.keys(errors).length === 0, errors };
};

/**
 * The one checkout gate. Every coupon application — cart, checkout,
 * restore — passes through here. Messages are customer-facing.
 */
export const validateOffer = (code, context = {}) => {
  const {
    items = [],
    appliedCode = null,
    customerId = null,
    customerEmail = null,
  } = context;

  const offer = findByCodeInternal(code);
  if (!offer) {
    return { ok: false, message: OFFER_MESSAGES.UNAVAILABLE };
  }

  if (appliedCode && normalizeCode(appliedCode) === offer.code) {
    return { ok: false, message: OFFER_MESSAGES.ALREADY_APPLIED };
  }

  const status = deriveStatus(offer);
  if (status === OFFER_STATUS.EXPIRED) {
    return { ok: false, message: OFFER_MESSAGES.EXPIRED };
  }
  if (status === OFFER_STATUS.SCHEDULED) {
    return { ok: false, message: OFFER_MESSAGES.NOT_OPEN };
  }
  if (!isRedeemableStatus(status)) {
    return { ok: false, message: OFFER_MESSAGES.INVALID };
  }

  if (!isCustomerEligible(offer, { customerId, customerEmail })) {
    return { ok: false, message: OFFER_MESSAGES.INVALID };
  }

  const usage = effectiveUsageCount(offer);
  if (offer.usageLimit > 0 && usage >= offer.usageLimit) {
    return { ok: false, message: OFFER_MESSAGES.USAGE_LIMIT };
  }

  if (offer.perCustomerLimit > 0 && (customerId || customerEmail)) {
    const used = customerRedemptionCount(offer, { customerId, customerEmail });
    if (used >= offer.perCustomerLimit) {
      return { ok: false, message: OFFER_MESSAGES.CUSTOMER_LIMIT };
    }
  }

  const eligibleItems = (items ?? []).filter((item) =>
    isProductEligible(offer, item.product ?? item)
  );
  if (!eligibleItems.length) {
    return { ok: false, message: OFFER_MESSAGES.UNAVAILABLE };
  }

  const subtotal = (items ?? []).reduce((total, item) => {
    const product = item.product ?? item;
    const price = Number(product.price ?? item.price) || 0;
    return total + price * (Number(item.quantity) || 1);
  }, 0);

  if (offer.minimumOrderValue > 0 && subtotal < offer.minimumOrderValue) {
    return {
      ok: false,
      message: `This offer opens at ${formatINR(offer.minimumOrderValue)}.`,
    };
  }

  const coupon = toCheckoutCoupon(offer);
  return { ok: true, offer, coupon, message: "" };
};

/* ------------------------------------------------------------------ */
/* Writes                                                              */
/* ------------------------------------------------------------------ */

const writeOffer = (draft, actor, { activity = null, preserveUsage = true } = {}) => {
  const items = allNormalised();
  const index = items.findIndex((offer) => String(offer.id) === String(draft.id));
  const existing = index >= 0 ? items[index] : null;
  const label = actorLabel(actor);
  const at = nowIso();

  const merged = normaliseOffer({
    ...(existing ?? {}),
    ...draft,
    id: draft.id || existing?.id,
    usageCount: preserveUsage && existing ? existing.usageCount : asNumber(draft.usageCount, existing?.usageCount ?? 0),
    redeemedOrderIds:
      preserveUsage && existing ? existing.redeemedOrderIds : asArray(draft.redeemedOrderIds),
  });

  merged.updatedBy = label;
  merged.updatedAt = at;
  if (!existing) {
    merged.createdBy = merged.createdBy || label;
    merged.createdAt = merged.createdAt || at;
  }

  const next = [...items];
  if (index >= 0) next[index] = merged;
  else next.unshift(merged);
  persist(next);

  if (activity) noteOffer(activity.action, merged, actor, activity.summary);
  return merged;
};

/* ------------------------------------------------------------------ */
/* Public repository                                                   */
/* ------------------------------------------------------------------ */

export const offerRepository = {
  all: allNormalised,

  list: (filters = {}) => {
    const term = String(filters.query || "").trim().toLowerCase();
    return allNormalised().filter((offer) => {
      if (filters.status && filters.status !== "ALL" && offer.displayStatus !== filters.status) {
        return false;
      }
      if (filters.type && filters.type !== "ALL" && offer.type !== filters.type) return false;
      if (filters.category && filters.category !== "ALL") {
        const matchesCategory =
          offer.productEligibility === PRODUCT_ELIGIBILITY.ALL_PRODUCTS ||
          (offer.includedCategories ?? []).includes(filters.category);
        if (!matchesCategory) return false;
      }
      if (filters.collection && filters.collection !== "ALL") {
        const matchesCollection =
          offer.productEligibility === PRODUCT_ELIGIBILITY.ALL_PRODUCTS ||
          (offer.includedCollections ?? []).includes(filters.collection);
        if (!matchesCollection) return false;
      }
      if (filters.usage === "LIMITED" && !(offer.usageLimit > 0)) return false;
      if (filters.usage === "UNLIMITED" && offer.usageLimit > 0) return false;
      if (filters.usage === "EXHAUSTED") {
        if (!(offer.usageLimit > 0) || effectiveUsageCount(offer) < offer.usageLimit) return false;
      }
      if (filters.from && offer.endDate && offer.endDate < filters.from) return false;
      if (filters.to && offer.startDate && offer.startDate > filters.to) return false;
      if (!term) return true;
      return [offer.code, offer.name, offer.description].join(" ").toLowerCase().includes(term);
    });
  },

  find: findNormalised,

  findByCode: findByCodeInternal,

  getCheckoutCoupon: (code) => {
    const offer = findByCodeInternal(code);
    return offer ? toCheckoutCoupon(offer) : null;
  },

  isCodeTaken: (code, ignoreId = null) => {
    const existing = findByCodeInternal(code);
    if (!existing) return false;
    return String(existing.id) !== String(ignoreId);
  },

  create: (draft, actor = null) => {
    const validation = validateOfferDraft(draft);
    if (!validation.ok) return { ok: false, errors: validation.errors };
    const id = `off-${Date.now().toString(36)}`;
    const offer = writeOffer(
      {
        ...draft,
        id,
        code: normalizeCode(draft.code),
        usageCount: 0,
        redeemedOrderIds: [],
        createdAt: nowIso(),
        createdBy: actorLabel(actor),
      },
      actor,
      {
        preserveUsage: false,
        activity: {
          action: ACTIVITY_ACTIONS.OFFER_CREATED,
          summary: `Created offer ${normalizeCode(draft.code)} · ${String(draft.name || "").trim()}`,
        },
      }
    );
    return { ok: true, offer };
  },

  update: (id, patch, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Offer not found." };
    const nextCode = patch.code !== undefined ? normalizeCode(patch.code) : existing.code;
    const validation = validateOfferDraft({ ...existing, ...patch, code: nextCode }, { ignoreId: id });
    if (!validation.ok) return { ok: false, errors: validation.errors };

    const locked = { ...patch, id: existing.id };
    if (existing.usageCount > 0) {
      locked.code = existing.code;
      locked.usageCount = existing.usageCount;
      locked.redeemedOrderIds = existing.redeemedOrderIds;
    }

    const offer = writeOffer(locked, actor, {
      activity: {
        action: ACTIVITY_ACTIONS.OFFER_UPDATED,
        summary: `Updated offer ${existing.code}`,
      },
    });
    return { ok: true, offer };
  },

  activate: (id, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Offer not found." };
    const offer = writeOffer(
      { id, status: OFFER_STATUS.ACTIVE },
      actor,
      {
        activity: {
          action: ACTIVITY_ACTIONS.OFFER_ACTIVATED,
          summary: `Activated offer ${existing.code}`,
        },
      }
    );
    return { ok: true, offer };
  },

  pause: (id, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Offer not found." };
    const offer = writeOffer(
      { id, status: OFFER_STATUS.PAUSED },
      actor,
      {
        activity: {
          action: ACTIVITY_ACTIONS.OFFER_PAUSED,
          summary: `Paused offer ${existing.code}`,
        },
      }
    );
    return { ok: true, offer };
  },

  archive: (id, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Offer not found." };
    const offer = writeOffer(
      { id, status: OFFER_STATUS.ARCHIVED },
      actor,
      {
        activity: {
          action: ACTIVITY_ACTIONS.OFFER_ARCHIVED,
          summary: `Archived offer ${existing.code}`,
        },
      }
    );
    return { ok: true, offer };
  },

  remove: (id, actor = null) => {
    const existing = findNormalised(id);
    if (!existing) return { ok: false, error: "Offer not found." };
    if (existing.status !== OFFER_STATUS.DRAFT || existing.usageCount > 0) {
      return { ok: false, error: "Only unused drafts can be removed. Archive the offer instead." };
    }
    persist(allNormalised().filter((offer) => offer.id !== id));
    noteOffer(ACTIVITY_ACTIONS.OFFER_UPDATED, existing, actor, `Removed draft ${existing.code}`);
    return { ok: true };
  },

  /**
   * Increments usage exactly once per order id. Payment retries and
   * duplicate success callbacks cannot double-count.
   */
  recordRedemption: ({
    offerId = null,
    code = null,
    orderId,
    customerId = null,
    customerEmail = null,
    discountAmount = 0,
    actor = null,
  } = {}) => {
    if (!orderId) return { ok: false, error: "Order id is required." };
    const offer = (offerId && findNormalised(offerId)) || findByCodeInternal(code);
    if (!offer) return { ok: false, error: "Offer not found." };
    if ((offer.redeemedOrderIds ?? []).includes(String(orderId))) {
      return { ok: true, alreadyRecorded: true, offer };
    }

    const next = writeOffer(
      {
        id: offer.id,
        usageCount: asNumber(offer.usageCount, 0) + 1,
        redeemedOrderIds: [...(offer.redeemedOrderIds ?? []), String(orderId)],
      },
      actor,
      {
        preserveUsage: false,
        activity: {
          action: ACTIVITY_ACTIONS.OFFER_REDEEMED,
          summary: `Redeemed ${offer.code} on ${orderId}${customerId ? ` · ${customerId}` : ""}`,
        },
      }
    );
    return { ok: true, alreadyRecorded: false, offer: next, discountAmount, customerEmail };
  },

  listCustomerVisible: ({ customerId = null, customerEmail = null } = {}) =>
    allNormalised()
      .filter((offer) => deriveStatus(offer) === OFFER_STATUS.ACTIVE)
      .filter((offer) => isCustomerEligible(offer, { customerId, customerEmail }))
      .sort((a, b) => asNumber(b.priority, 0) - asNumber(a.priority, 0)),

  getProductOfferBadge: (product) => {
    if (!product) return null;
    const candidates = allNormalised()
      .filter((offer) => deriveStatus(offer) === OFFER_STATUS.ACTIVE)
      .filter((offer) => offer.customerEligibility === CUSTOMER_ELIGIBILITY.ALL_CUSTOMERS)
      .filter((offer) => isProductEligible(offer, product));

    if (!candidates.length) return null;

    const scoped = candidates.filter(
      (offer) => offer.productEligibility !== PRODUCT_ELIGIBILITY.ALL_PRODUCTS
    );
    const pool = scoped.length ? scoped : candidates;
    const best = [...pool].sort((a, b) => asNumber(b.priority, 0) - asNumber(a.priority, 0))[0];
    if (!best) return null;

    return {
      code: best.code,
      label:
        best.type === OFFER_TYPES.FIXED_AMOUNT
          ? `${formatINR(best.discountValue)} OFF`
          : `${asNumber(best.discountValue, 0)}% OFF`,
    };
  },

  metrics: () => {
    const items = allNormalised();
    const today = new Date().toISOString().slice(0, 10);
    let usageToday = 0;
    let totalRedemptions = 0;
    try {
      const orders = loadOrders();
      orders.forEach((order) => {
        if (!order.pricing?.couponCode) return;
        totalRedemptions += 1;
        if (String(order.createdAt || "").slice(0, 10) === today) usageToday += 1;
      });
    } catch {
      /* ignore */
    }
    const seededUsage = items.reduce((sum, offer) => sum + asNumber(offer.usageCount, 0), 0);
    return {
      total: items.length,
      active: items.filter((offer) => offer.displayStatus === OFFER_STATUS.ACTIVE).length,
      scheduled: items.filter((offer) => offer.displayStatus === OFFER_STATUS.SCHEDULED).length,
      draft: items.filter((offer) => offer.displayStatus === OFFER_STATUS.DRAFT).length,
      expired: items.filter((offer) => offer.displayStatus === OFFER_STATUS.EXPIRED).length,
      paused: items.filter((offer) => offer.displayStatus === OFFER_STATUS.PAUSED).length,
      archived: items.filter((offer) => offer.displayStatus === OFFER_STATUS.ARCHIVED).length,
      usageToday,
      totalRedemptions: Math.max(seededUsage, totalRedemptions),
    };
  },

  get categories() {
    return taxonomyRepository.categories().map((category) => ({ ...category, label: category.name }));
  },
  get collections() {
    return taxonomyRepository.collections().map((collection) => ({ ...collection, label: collection.name }));
  },
};

export default offerRepository;
