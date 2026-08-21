/**
 * PRATIKSHYA FASHON — Order utilities (Phase 15 extended)
 *
 * Pure-logic layer: normalisation, ownership, eligibility, formatting,
 * identity generation. Now preserves fulfillment, shipment, timeline,
 * internal notes, cancellation with reason, etc.
 */

import {
  ACTIVE_RETURN_STATUSES,
  CANCELLABLE_STATUSES,
  MOCK_CARRIERS,
  ORDER_PAYMENT_STATUS,
  ORDER_STATUS,
  ORDER_STATUSES,
  RETURNABLE_STATUSES,
  RETURN_STATUS,
  RETURN_STATUSES,
  FULFILMENT_ORIGIN,
} from "../config/orderConfig";
import { getProductById, productHref } from "../data/products";
import { getMaxQuantity } from "./shopping";

/* ------------------------------------------------------------------ */
/* Identity                                                            */
/* ------------------------------------------------------------------ */

const hash = (value) => {
  let total = 0;
  const text = String(value ?? "");
  for (let index = 0; index < text.length; index += 1) {
    total = (total * 31 + text.charCodeAt(index)) % 100000;
  }
  return total;
};

const pad = (value, length = 2) => String(value).padStart(length, "0");

export const buildTrackingId = (orderId, createdAt) => {
  const date = new Date(createdAt);
  const stamp = Number.isNaN(date.getTime())
    ? "000000"
    : `${pad(date.getDate())}${pad(date.getMonth() + 1)}${pad(date.getFullYear() % 100)}`;
  return `PFX${stamp}${pad(hash(orderId) % 10000, 4)}`;
};

export const pickCarrier = (orderId) =>
  MOCK_CARRIERS[hash(orderId) % MOCK_CARRIERS.length];

export const buildInvoiceNumber = (orderId) => `INV-${orderId}`;

export const buildReturnId = (orderId, sequence = 1) =>
  sequence <= 1 ? `RET-${orderId}` : `RET-${orderId}-${sequence}`;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const formatOrderDate = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatEventTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${time}`;
};

export const orderItemCount = (order) =>
  (order?.items ?? []).reduce((total, item) => total + (Number(item.quantity) || 0), 0);

/* ------------------------------------------------------------------ */
/* Normalisation                                                       */
/* ------------------------------------------------------------------ */

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normaliseItem = (item, index) => {
  if (!item || typeof item !== "object") return null;
  const quantity = Math.max(1, Math.floor(asNumber(item.quantity, 1)));
  const price = asNumber(item.price, 0);
  const product = item.productId ? getProductById(item.productId) : null;
  return {
    lineId: String(item.lineId ?? `line-${index}`),
    productId: item.productId ?? null,
    productSlug: product?.slug ?? item.productSlug ?? null,
    name: String(item.name ?? product?.name ?? "Atelier piece"),
    image: item.image ?? product?.image ?? null,
    color: item.color ?? null,
    size: item.size ?? null,
    quantity,
    price,
    originalPrice:
      typeof item.originalPrice === "number" && item.originalPrice > price
        ? item.originalPrice
        : null,
    lineTotal: asNumber(item.lineTotal, price * quantity),
  };
};

const normaliseReturnItem = (item, index) => {
  const line = normaliseItem(item, index);
  if (!line) return null;
  return { ...line, quantity: Math.max(1, Math.floor(asNumber(item.quantity, 1))) };
};

const normaliseReturn = (record, index) => {
  if (!record || typeof record !== "object" || !record.id) return null;
  const items = (Array.isArray(record.items) ? record.items : [])
    .map(normaliseReturnItem)
    .filter(Boolean);
  if (items.length === 0) return null;

  const status = RETURN_STATUSES[record.status]
    ? record.status
    : RETURN_STATUS.RETURN_REQUESTED;

  return {
    id: String(record.id),
    orderId: record.orderId ? String(record.orderId) : null,
    sequence: Math.max(1, Math.floor(asNumber(record.sequence, index + 1))),
    items,
    reason: record.reason ?? "other",
    reasonLabel: record.reasonLabel ?? "Other",
    resolution: record.resolution === "exchange" ? "exchange" : "refund",
    note: typeof record.note === "string" ? record.note.slice(0, 500) : "",
    status,
    createdAt: record.createdAt ?? new Date().toISOString(),
    history: Array.isArray(record.history)
      ? record.history.filter(
          (entry) => entry && RETURN_STATUSES[entry.status] && entry.at
        )
      : [],
    refund:
      record.refund && typeof record.refund === "object"
        ? {
            amount: asNumber(record.refund.amount, 0),
            method: String(record.refund.method ?? "Original payment method"),
            status: record.refund.status ?? ORDER_PAYMENT_STATUS.REFUND_INITIATED,
          }
        : null,
  };
};

const normaliseFulfillment = (raw, orderId) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    orderId: raw.orderId || orderId,
    sourceLocationId: raw.sourceLocationId || null,
    fulfillmentType: raw.fulfillmentType || null,
    assignedEmployeeId: raw.assignedEmployeeId || null,
    assignedEmployeeName: raw.assignedEmployeeName || null,
    status: raw.status || "PENDING",
    allocatedAt: raw.allocatedAt || null,
    pickingStartedAt: raw.pickingStartedAt || null,
    packedAt: raw.packedAt || null,
    readyToDispatchAt: raw.readyToDispatchAt || null,
    dispatchedAt: raw.dispatchedAt || null,
    deliveredAt: raw.deliveredAt || null,
    packedBy: raw.packedBy || null,
    packageCount: Math.max(1, Number(raw.packageCount) || 1),
    packagingNotes: raw.packagingNotes || "",
    picking: raw.picking && typeof raw.picking === "object" ? raw.picking : {},
    history: Array.isArray(raw.history) ? raw.history : [],
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,
  };
};

const normaliseShipment = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  return {
    carrier: raw.carrier || "",
    trackingNumber: raw.trackingNumber || raw.trackingId || "",
    shippingMethod: raw.shippingMethod || "",
    dispatchedAt: raw.dispatchedAt || null,
    estimatedDelivery: raw.estimatedDelivery || "",
    dispatchedBy: raw.dispatchedBy || null,
  };
};

const normaliseTimeline = (raw) => {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && e.at)
    .map((e) => ({
      id: e.id || String(Math.random()).slice(2),
      type: e.type || "STATUS_CHANGED",
      status: e.status || null,
      at: e.at,
      actor: e.actor || null,
      actorName: e.actorName || "System",
      note: e.note || "",
      meta: e.meta || {},
    }))
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
};

const normaliseNotes = (raw) => {
  if (!raw) return { customer: "", internal: [] };
  if (typeof raw === "string") return { customer: raw, internal: [] };
  return {
    customer: raw.customer || "",
    internal: Array.isArray(raw.internal) ? raw.internal : [],
  };
};

export const normaliseOrder = (raw) => {
  if (!raw || typeof raw !== "object" || !raw.id) return null;

  const items = (Array.isArray(raw.items) ? raw.items : [])
    .map(normaliseItem)
    .filter(Boolean);
  if (items.length === 0) return null;

  const createdAt = raw.createdAt ?? new Date().toISOString();
  const status = ORDER_STATUSES[raw.status] ? raw.status : ORDER_STATUS.ORDER_CONFIRMED;
  const paymentMethodId = raw.paymentMethod?.id ?? "upi";
  const paymentStatus =
    raw.paymentStatus && ORDER_PAYMENT_STATUS[raw.paymentStatus]
      ? raw.paymentStatus
      : paymentMethodId === "cod"
        ? ORDER_PAYMENT_STATUS.PENDING
        : ORDER_PAYMENT_STATUS.PAID;

  const pricing = raw.pricing ?? {};
  const returns = (Array.isArray(raw.returns) ? raw.returns : [])
    .map(normaliseReturn)
    .filter(Boolean);

  return {
    id: String(raw.id),
    customerId: raw.customerId ?? null,
    inventoryReservationId: raw.inventoryReservationId
      ? String(raw.inventoryReservationId)
      : null,
    customer: {
      fullName: raw.customer?.fullName ?? "Guest",
      email: raw.customer?.email ?? "",
      phone: raw.customer?.phone ?? "",
    },
    items,
    currency: raw.currency ?? "INR",
    pricing: {
      subtotal: asNumber(pricing.subtotal, 0),
      productDiscount: asNumber(pricing.productDiscount, 0),
      couponDiscount: asNumber(pricing.couponDiscount, 0),
      couponCode: pricing.couponCode ?? null,
      offerId: pricing.offerId ?? null,
      shipping: asNumber(pricing.shipping, 0),
      codFee: asNumber(pricing.codFee, 0),
      total: asNumber(pricing.total, 0),
      saved: asNumber(pricing.saved, 0),
    },
    address: raw.address ?? null,
    deliveryMethod: {
      id: raw.deliveryMethod?.id ?? "standard",
      label: raw.deliveryMethod?.label ?? "Standard Delivery",
      estimate: raw.deliveryMethod?.estimate ?? "",
    },
    estimatedDelivery: raw.estimatedDelivery ?? raw.deliveryMethod?.estimate ?? "",
    paymentMethod: {
      id: paymentMethodId,
      label: raw.paymentMethod?.label ?? "Payment",
    },
    paymentStatus,
    status,
    statusHistory: (Array.isArray(raw.statusHistory) ? raw.statusHistory : [])
      .filter((entry) => entry && ORDER_STATUSES[entry.status] && entry.at)
      .map((entry) => ({ status: entry.status, at: entry.at })),
    tracking: {
      trackingId: raw.tracking?.trackingId ?? buildTrackingId(raw.id, createdAt),
      carrier: raw.tracking?.carrier ?? pickCarrier(raw.id),
      origin: raw.tracking?.origin ?? FULFILMENT_ORIGIN,
    },
    returns,
    refund:
      raw.refund && typeof raw.refund === "object"
        ? {
            amount: asNumber(raw.refund.amount, 0),
            method: String(raw.refund.method ?? "Original payment method"),
            status: raw.refund.status ?? ORDER_PAYMENT_STATUS.REFUND_INITIATED,
            initiatedAt: raw.refund.initiatedAt ?? createdAt,
            note: raw.refund.note ?? "",
          }
        : null,
    invoice: {
      number: raw.invoice?.number ?? buildInvoiceNumber(raw.id),
      issuedAt: raw.invoice?.issuedAt ?? createdAt,
    },
    cancellation:
      raw.cancellation && typeof raw.cancellation === "object"
        ? {
            at: raw.cancellation.at ?? createdAt,
            reason: raw.cancellation.reason ?? "customer_request",
            note: raw.cancellation.note ?? "",
            actor: raw.cancellation.actor ?? null,
          }
        : null,
    fulfillment: normaliseFulfillment(raw.fulfillment, raw.id),
    shipment: normaliseShipment(raw.shipment),
    timeline: normaliseTimeline(raw.timeline),
    notes: normaliseNotes(raw.notes),
    createdAt,
    updatedAt: raw.updatedAt ?? createdAt,
    channel:
      raw.channel === "ASSISTED" || raw.source === "employee_assisted"
        ? "ASSISTED"
        : raw.channel || "STOREFRONT",
    createdBy: raw.createdBy || raw.employeeId || null,
    source: raw.source || null,
    associate: raw.associate || null,
    floorStatus: raw.floorStatus || null,
  };
};

export const normaliseOrders = (raw) => {
  if (!Array.isArray(raw)) return [];
  const byId = new Map();
  raw.forEach((entry) => {
    const order = normaliseOrder(entry);
    if (!order || byId.has(order.id)) return;
    byId.set(order.id, order);
  });
  return [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

export const isOrderOwnedBy = (order, customerId = null) => {
  if (!order) return false;
  if (customerId) return order.customerId === customerId;
  return !order.customerId;
};

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

export const returnedLineIds = (order) => {
  const ids = new Set();
  (order?.returns ?? []).forEach((record) => {
    if (!ACTIVE_RETURN_STATUSES.includes(record.status)) return;
    record.items.forEach((item) => ids.add(item.lineId));
  });
  return ids;
};

export const latestReturn = (order) => {
  const records = order?.returns ?? [];
  if (records.length === 0) return null;
  return [...records].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )[0];
};

export const canCancelOrder = (order) =>
  Boolean(order) && CANCELLABLE_STATUSES.includes(order.status);

export const canReturnOrder = (order) => {
  if (!order) return false;
  if (!RETURNABLE_STATUSES.includes(order.status)) return false;
  const covered = returnedLineIds(order);
  return order.items.some((item) => !covered.has(item.lineId));
};

export const returnBlockedReason = (order) => {
  if (!order) return "That order could not be found in your account.";
  if (order.status === ORDER_STATUS.CANCELLED) {
    return "This order was cancelled, so there is nothing to return.";
  }
  if (
    order.status === ORDER_STATUS.RETURNED ||
    (order.status === ORDER_STATUS.RETURN_REQUESTED && !canReturnOrder(order))
  ) {
    return "A return has already been requested for the pieces in this order.";
  }
  if (!RETURNABLE_STATUSES.includes(order.status)) {
    return "Returns open once your order has been delivered.";
  }
  if (!canReturnOrder(order)) {
    return "Every piece in this order is already part of a return request.";
  }
  return "";
};

export const canTrackOrder = (order) =>
  Boolean(order) && order.status !== ORDER_STATUS.CANCELLED;

export const refundMethodLabel = (order) => {
  if (!order) return "Original payment method";
  if (order.paymentMethod.id === "cod") {
    return "Bank transfer to your registered details";
  }
  return `Refund to original ${order.paymentMethod.label}`;
};

export const refundAmountFor = (items = []) =>
  items.reduce(
    (total, item) => total + (Number(item.price) || 0) * (Number(item.quantity) || 0),
    0
  );

export const buyAgainAvailability = (item) => {
  const product = item?.productId ? getProductById(item.productId) : null;
  if (!product) return { state: "unavailable", product: null, href: null };
  if (getMaxQuantity(product) === 0) {
    return { state: "unavailable", product, href: productHref(product) };
  }
  const colourGone =
    item.color && (product.unavailableColors ?? []).includes(item.color);
  const sizeGone = item.size && (product.unavailableSizes ?? []).includes(item.size);
  if (colourGone || sizeGone) {
    return { state: "variant", product, href: productHref(product) };
  }
  return { state: "available", product, href: productHref(product) };
};

export const orderItemHref = (item) => {
  const product = item?.productId ? getProductById(item.productId) : null;
  return product ? productHref(product) : null;
};

/* ------------------------------------------------------------------ */
/* Search helpers for admin                                            */
/* ------------------------------------------------------------------ */

export const matchesOrderSearch = (order, term) => {
  if (!term) return true;
  const q = term.toLowerCase();
  const haystack = [
    order.id,
    order.customer?.fullName,
    order.customer?.email,
    order.customer?.phone,
    order.address?.city,
    order.tracking?.trackingId,
    order.shipment?.trackingNumber,
    ...(order.items?.map((i) => i.name) || []),
    ...(order.items?.map((i) => i.productId) || []),
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
};

export default {
  buildTrackingId,
  pickCarrier,
  buildInvoiceNumber,
  buildReturnId,
  formatOrderDate,
  formatEventTime,
  orderItemCount,
  normaliseOrder,
  normaliseOrders,
  isOrderOwnedBy,
  returnedLineIds,
  latestReturn,
  canCancelOrder,
  canReturnOrder,
  returnBlockedReason,
  canTrackOrder,
  refundMethodLabel,
  refundAmountFor,
  buyAgainAvailability,
  orderItemHref,
  matchesOrderSearch,
};
