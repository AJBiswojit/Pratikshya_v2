/**
 * PRATIKSHYA FASHON — Order service (Phase 15)
 *
 * Single source for order persistence + operational transitions.
 * Extensions preserve Phase 7-14 behaviour and add fulfillment workflow.
 *
 *   OrderContext → orderService → localStorage (now) → API (later)
 *
 * Components never touch localStorage — context only.
 */

import {
  ORDER_PAYMENT_STATUS,
  ORDER_STATUS,
  ORDER_STATUSES,
  canTransition,
  FULFILLMENT_STATUS,
  ORDER_ACTIVITY_TYPES,
} from "../../config/orderConfig";
import {
  buildInvoiceNumber,
  buildTrackingId,
  isOrderOwnedBy,
  normaliseOrder,
  normaliseOrders,
  pickCarrier,
  refundMethodLabel,
} from "../../utils/orders";
import { readStorage, writeStorage } from "../../utils/shopping";
import { EMPLOYEE_STORAGE_KEYS } from "../employees/storage";
import { buildFulfillmentRecord, normaliseFulfillment, mapOrderStatusToFulfillmentStatus } from "./fulfillmentService";
import { buildTimelineEvent, appendTimeline } from "./orderTimelineService";
import { generateDemoOrders } from "./demoOrders";

export const ORDERS_STORAGE_KEY = "pratikshya_orders";
export const CURRENT_ORDER_KEY = "pratikshya_current_order";
export const LEGACY_ASSISTED_ORDERS_KEY = EMPLOYEE_STORAGE_KEYS.ASSISTED_ORDERS;

const removeStorageKey = (key) => {
  try {
    if (typeof window !== "undefined") window.localStorage.removeItem(key);
    else if (typeof localStorage !== "undefined") localStorage.removeItem(key);
  } catch {
    /* Persistence is an enhancement only. */
  }
};

/**
 * Lift a floor ticket from the legacy assisted-order store into a canonical
 * order record. Product IDs, customer details, totals, timestamps, status
 * and employee attribution are preserved.
 */
export const transformAssistedOrder = (raw) => {
  if (!raw || typeof raw !== "object" || !raw.id) return null;
  const amount = Number(raw.amount ?? raw.pricing?.total ?? 0) || 0;
  const items =
    Array.isArray(raw.items) && raw.items.length
      ? raw.items
      : [
          {
            lineId: "line-0",
            productId: raw.productId || null,
            name: raw.pieces || "Assisted piece",
            quantity: 1,
            price: amount,
            lineTotal: amount,
          },
        ];
  const customer =
    raw.customer && typeof raw.customer === "object"
      ? raw.customer
      : {
          fullName: raw.customer || "Walk-in",
          email: raw.email || "",
          phone: raw.phone || "",
        };

  return {
    id: String(raw.id),
    customerId: raw.customerId || null,
    customer,
    items,
    pricing: raw.pricing || {
      subtotal: amount,
      productDiscount: 0,
      couponDiscount: 0,
      shipping: 0,
      codFee: 0,
      total: amount,
      saved: 0,
    },
    paymentMethod: raw.paymentMethod || { id: "cod", label: "Floor ticket" },
    deliveryMethod: raw.deliveryMethod || { id: "standard", label: "Store / Floor" },
    status: ORDER_STATUSES[raw.status] ? raw.status : ORDER_STATUS.ORDER_CONFIRMED,
    channel: "ASSISTED",
    source: "employee_assisted",
    createdBy: raw.createdBy || raw.employeeId || null,
    associate: raw.associate || "",
    floorStatus: typeof raw.status === "string" && !ORDER_STATUSES[raw.status] ? raw.status : raw.floorStatus || null,
    createdAt: raw.createdAt || new Date().toISOString(),
    notes: {
      customer: "",
      internal: raw.note
        ? [{ text: raw.note, at: raw.createdAt || new Date().toISOString(), by: raw.associate || "Associate" }]
        : [],
    },
  };
};

/**
 * Idempotent merge of `pratikshya_employee_assisted_orders` into the
 * canonical order register. Safe to run more than once. When there is
 * nothing to migrate, this is a no-op.
 */
export const migrateAssistedOrders = (existing = []) => {
  const stored = readStorage(LEGACY_ASSISTED_ORDERS_KEY, null);
  if (!Array.isArray(stored) || stored.length === 0) {
    if (stored !== null) removeStorageKey(LEGACY_ASSISTED_ORDERS_KEY);
    return existing;
  }

  const byId = new Map(existing.map((order) => [order.id, order]));
  stored.forEach((raw) => {
    const transformed = transformAssistedOrder(raw);
    const order = transformed ? normaliseOrder(transformed) : null;
    if (!order || byId.has(order.id)) return;
    byId.set(order.id, order);
  });
  const merged = [...byId.values()].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  writeStorage(ORDERS_STORAGE_KEY, merged);
  removeStorageKey(LEGACY_ASSISTED_ORDERS_KEY);
  return merged;
};

export const isAssistedOrder = (order) =>
  Boolean(order) && (order.channel === "ASSISTED" || order.source === "employee_assisted");

/* ------------------------------------------------------------------ */
/* Persistence                                                         */
/* ------------------------------------------------------------------ */

export const loadOrders = () => {
  const stored = readStorage(ORDERS_STORAGE_KEY, null);
  let orders = migrateAssistedOrders(normaliseOrders(stored));
  if (orders.length === 0) {
    // Seed demo orders only when browser has no orders — never overwrites real orders
    try {
      const demo = generateDemoOrders();
      if (demo.length) {
        writeStorage(ORDERS_STORAGE_KEY, demo);
        orders = migrateAssistedOrders(normaliseOrders(demo));
      }
    } catch (e) {
      // Seeding is best-effort, never breaks order loading
      console.warn("Demo order seeding failed", e);
    }
  }
  return orders;
};

export const saveOrders = (orders) => {
  writeStorage(ORDERS_STORAGE_KEY, Array.isArray(orders) ? orders : []);
};

export const loadCurrentOrderId = () => {
  const stored = readStorage(CURRENT_ORDER_KEY, null);
  if (typeof stored === "string") return stored;
  if (stored && typeof stored === "object" && stored.id) return String(stored.id);
  return null;
};

export const saveCurrentOrderId = (orderId) => {
  if (orderId) {
    writeStorage(CURRENT_ORDER_KEY, orderId);
    return;
  }
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(CURRENT_ORDER_KEY);
    }
  } catch {}
};

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

export const buildOrderRecord = (snapshot) => {
  const base = normaliseOrder(snapshot);
  if (!base) return null;

  const isCod = base.paymentMethod.id === "cod";
  const now = new Date();
  const nowIso = now.toISOString();

  // Determine initial fulfillment location deterministically: prefer Main Store if available
  // For real checkout, allocation happens later; create pending fulfillment
  const fulfillment = buildFulfillmentRecord({
    orderId: base.id,
    status: FULFILLMENT_STATUS.PENDING,
    createdAt: nowIso,
  });

  const timeline = [
    buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_CREATED,
      status: ORDER_STATUS.PENDING_PAYMENT,
      at: nowIso,
      actorName: "Customer",
      note: "Order placed via checkout",
    }),
    buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.PAYMENT_CONFIRMED,
      status: ORDER_STATUS.PAYMENT_CONFIRMED,
      at: nowIso,
      actorName: "Payment Gateway (Demo)",
      note: "Payment confirmed",
    }),
    buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_CONFIRMED,
      status: ORDER_STATUS.ORDER_CONFIRMED,
      at: nowIso,
      actorName: "System",
    }),
  ];

  return {
    ...base,
    status: ORDER_STATUS.ORDER_CONFIRMED,
    paymentStatus: isCod ? ORDER_PAYMENT_STATUS.PENDING : ORDER_PAYMENT_STATUS.PAID,
    statusHistory: [
      { status: ORDER_STATUS.PENDING_PAYMENT, at: nowIso },
      { status: ORDER_STATUS.PAYMENT_CONFIRMED, at: nowIso },
      { status: ORDER_STATUS.ORDER_CONFIRMED, at: nowIso },
    ],
    tracking: {
      trackingId: buildTrackingId(base.id, base.createdAt),
      carrier: pickCarrier(base.id),
      origin: base.tracking.origin,
    },
    invoice: {
      number: buildInvoiceNumber(base.id),
      issuedAt: base.createdAt,
    },
    returns: [],
    refund: null,
    cancellation: null,
    fulfillment,
    shipment: null,
    timeline,
    notes: { customer: snapshot.customerNote || "", internal: [] },
    updatedAt: nowIso,
  };
};

export const CUSTOMER_AUTH_REQUIRED = "CUSTOMER_AUTH_REQUIRED";

/** Customer storefront orders must always carry a real authenticated identity.
 * Employee-assisted orders explicitly opt into the existing employee path. */
export const addOrder = (orders, snapshot) => {
  if (!snapshot?.customerId && snapshot?.source !== "employee_assisted") {
    return { ok: false, orders, order: null, code: CUSTOMER_AUTH_REQUIRED, message: CUSTOMER_AUTH_REQUIRED };
  }
  const record = buildOrderRecord(snapshot);
  if (!record) return { ok: false, orders, order: null, message: "" };
  if (orders.some((order) => order.id === record.id)) {
    return {
      ok: true,
      orders,
      order: orders.find((order) => order.id === record.id),
      message: "",
    };
  }
  return {
    ok: true,
    orders: [record, ...orders],
    order: record,
    message: "Order placed.",
  };
};

/* ------------------------------------------------------------------ */
/* Reads                                                               */
/* ------------------------------------------------------------------ */

export const findOrder = (orders, orderId) =>
  orders.find((order) => order.id === orderId) ?? null;

export const ordersForCustomer = (orders, customerId = null) =>
  orders.filter((order) => isOrderOwnedBy(order, customerId));

export const findOwnedOrder = (orders, orderId, customerId = null) => {
  const order = findOrder(orders, orderId);
  return order && isOrderOwnedBy(order, customerId) ? order : null;
};

/** All orders — admin view (no ownership filter) */
export const getAllOrders = (orders) => orders;

export const searchOrders = (orders, term) => {
  if (!term) return orders;
  const q = String(term).trim().toLowerCase();
  if (!q) return orders;
  return orders.filter((order) => {
    const hay = [
      order.id,
      order.customer?.fullName,
      order.customer?.email,
      order.customer?.phone,
      order.tracking?.trackingId,
      order.shipment?.trackingNumber,
      order.shipment?.carrier,
      order.fulfillment?.assignedEmployeeName,
      order.fulfillment?.sourceLocationId,
      ...(order.items?.map((i) => i.name) || []),
      ...(order.items?.map((i) => i.productId) || []),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
};

/* ------------------------------------------------------------------ */
/* Writes — status machine                                             */
/* ------------------------------------------------------------------ */

const replaceOrder = (orders, next) =>
  orders.map((order) => (order.id === next.id ? next : order));

export const applyStatus = (orders, orderId, nextStatus, at = new Date(), actor = null) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  if (!canTransition(order.status, nextStatus)) {
    return {
      ok: false,
      orders,
      order,
      message: "That is not a valid step for this order.",
    };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorName = actor?.name || actor?.actorName || actor?.employeeName || "System";

  const timelineEvent = buildTimelineEvent({
    status: nextStatus,
    at: stamped,
    actorName,
    note: "",
  });

  // Update fulfillment status in sync
  const fulfillmentStatus = mapOrderStatusToFulfillmentStatus(nextStatus);
  let fulfillment = order.fulfillment ? normaliseFulfillment(order.fulfillment, order.id) : buildFulfillmentRecord({ orderId, createdAt: stamped });
  const fulfillmentHistory = [...(fulfillment.history || []), { status: fulfillmentStatus, at: stamped, by: actorName }];

  const timestampMap = {
    [ORDER_STATUS.ALLOCATED]: "allocatedAt",
    [ORDER_STATUS.PICKING]: "pickingStartedAt",
    [ORDER_STATUS.PACKED]: "packedAt",
    [ORDER_STATUS.READY_TO_DISPATCH]: "readyToDispatchAt",
    [ORDER_STATUS.SHIPPED]: "dispatchedAt",
    [ORDER_STATUS.DELIVERED]: "deliveredAt",
  };

  const timeField = timestampMap[nextStatus];

  fulfillment = {
    ...fulfillment,
    status: fulfillmentStatus,
    ...(timeField ? { [timeField]: stamped } : {}),
    history: fulfillmentHistory,
    updatedAt: stamped,
  };

  const next = {
    ...order,
    status: nextStatus,
    statusHistory: [...order.statusHistory, { status: nextStatus, at: stamped }],
    fulfillment,
    timeline: appendTimeline(order.timeline || [], timelineEvent),
    updatedAt: stamped,
  };

  return { ok: true, orders: replaceOrder(orders, next), order: next, message: "" };
};

/** Force transition for admin override — bypasses normal state machine */
export const forceTransition = (orders, orderId, nextStatus, { at = new Date(), actor = null, reason = "" } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorName = actor?.name || "Admin";
  const timelineEvent = buildTimelineEvent({
    type: "FORCED_TRANSITION",
    status: nextStatus,
    at: stamped,
    actorName,
    note: reason || "Admin override",
  });

  const next = {
    ...order,
    status: nextStatus,
    statusHistory: [...order.statusHistory, { status: nextStatus, at: stamped }],
    timeline: appendTimeline(order.timeline || [], timelineEvent),
    updatedAt: stamped,
  };
  return { ok: true, orders: replaceOrder(orders, next), order: next, message: "Override applied." };
};

export const cancelOrder = (orders, orderId, { at = new Date(), reason = "customer_request", note = "Cancelled by the customer.", actor = null } = {}) => {
  const moved = applyStatus(orders, orderId, ORDER_STATUS.CANCELLED, at, actor);
  if (!moved.ok) return moved;

  const order = moved.order;
  const wasCaptured = [ORDER_PAYMENT_STATUS.PAID, ORDER_PAYMENT_STATUS.AUTHORIZED].includes(order.paymentStatus);
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorName = actor?.name || "Customer";

  const next = {
    ...order,
    paymentStatus: wasCaptured ? ORDER_PAYMENT_STATUS.REFUND_PENDING : ORDER_PAYMENT_STATUS.CANCELLED,
    refund: wasCaptured
      ? {
          amount: order.pricing.total,
          method: refundMethodLabel(order),
          status: ORDER_PAYMENT_STATUS.REFUND_PENDING,
          initiatedAt: stamped,
          note: "Demo refund status — no real payment movement has taken place.",
        }
      : null,
    cancellation: { at: stamped, reason, note, actor: actorName },
    timeline: appendTimeline(order.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_CANCELLED,
      status: ORDER_STATUS.CANCELLED,
      at: stamped,
      actorName,
      note,
      meta: { reason },
    })),
  };

  // Update fulfillment to cancelled
  if (next.fulfillment) {
    next.fulfillment = {
      ...next.fulfillment,
      status: FULFILLMENT_STATUS.CANCELLED,
      history: [...(next.fulfillment.history || []), { status: FULFILLMENT_STATUS.CANCELLED, at: stamped, by: actorName }],
    };
  }

  return {
    ok: true,
    orders: replaceOrder(moved.orders, next),
    order: next,
    message: wasCaptured
      ? "Order cancelled. A refund has been initiated for this demo order."
      : "Order cancelled. Nothing was captured for this demo order.",
  };
};

/* ------------------------------------------------------------------ */
/* Fulfillment operations                                              */
/* ------------------------------------------------------------------ */

export const allocateOrder = (orders, orderId, { locationId, employeeId, employeeName, at = new Date(), actor = null } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };

  // Must be in allocatable state
  const allowed = [ORDER_STATUS.PROCESSING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED];
  if (!allowed.includes(order.status)) {
    return { ok: false, orders, order, message: "Order is not ready for allocation." };
  }

  // Apply ALLOCATED status via state machine (PROCESSING → ALLOCATED)
  let result;
  if (order.status === ORDER_STATUS.PROCESSING) {
    result = applyStatus(orders, orderId, ORDER_STATUS.ALLOCATED, at, actor);
  } else {
    // From CONFIRMED → need intermediate PROCESSING then ALLOCATED
    // For demo, force if needed via two steps
    const step1 = applyStatus(orders, orderId, ORDER_STATUS.PROCESSING, at, actor);
    if (!step1.ok) return step1;
    result = applyStatus(step1.orders, orderId, ORDER_STATUS.ALLOCATED, at, actor);
  }
  if (!result.ok) return result;

  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const fulfillmentType = locationId?.includes("store") ? "STORE" : "WAREHOUSE";

  next = {
    ...next,
    fulfillment: {
      ...next.fulfillment,
      sourceLocationId: locationId || next.fulfillment.sourceLocationId,
      fulfillmentType,
      assignedEmployeeId: employeeId || next.fulfillment.assignedEmployeeId,
      assignedEmployeeName: employeeName || next.fulfillment.assignedEmployeeName,
      allocatedAt: stamped,
    },
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_ALLOCATED,
      status: ORDER_STATUS.ALLOCATED,
      at: stamped,
      actorName: actor?.name || employeeName || "System",
      note: locationId ? `Allocated to ${locationId}` : "Allocated",
      meta: { locationId, employeeId },
    })),
  };

  return { ok: true, orders: replaceOrder(result.orders, next), order: next, message: "Order allocated." };
};

export const startPicking = (orders, orderId, { at = new Date(), actor = null } = {}) => {
  const result = applyStatus(orders, orderId, ORDER_STATUS.PICKING, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  next = {
    ...next,
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_PICK_STARTED,
      status: ORDER_STATUS.PICKING,
      at: stamped,
      actorName: actor?.name || "Warehouse",
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next };
};

export const markItemPicked = (orders, orderId, lineId, { at = new Date(), actor = null, picked = true } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  if (![ORDER_STATUS.ALLOCATED, ORDER_STATUS.PICKING].includes(order.status)) {
    return { ok: false, orders, order, message: "Order is not in picking state." };
  }
  // If not yet picking, start picking first
  let workingOrders = orders;
  let workingOrder = order;
  if (order.status === ORDER_STATUS.ALLOCATED) {
    const pickStart = startPicking(orders, orderId, { at, actor });
    if (!pickStart.ok) return pickStart;
    workingOrders = pickStart.orders;
    workingOrder = pickStart.order;
  }

  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorName = actor?.name || "Picker";

  const picking = {
    ...(workingOrder.fulfillment?.picking || {}),
    [lineId]: { picked, at: stamped, by: actor?.employeeId || actorName },
  };

  let next = {
    ...workingOrder,
    fulfillment: {
      ...workingOrder.fulfillment,
      picking,
    },
    timeline: appendTimeline(workingOrder.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_ITEM_PICKED,
      status: workingOrder.status,
      at: stamped,
      actorName,
      note: `Item ${lineId} picked`,
      meta: { lineId },
    })),
  };

  // Auto advance to packed if all picked? No, require explicit pack step, but we record
  return { ok: true, orders: replaceOrder(workingOrders, next), order: next, message: "Item marked picked." };
};

export const markPacked = (orders, orderId, { at = new Date(), actor = null, packageCount = 1, notes = "" } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  // Must be fully picked
  const picking = order.fulfillment?.picking || {};
  const allPicked = order.items.every((item) => picking[item.lineId]?.picked);
  if (!allPicked && order.status === ORDER_STATUS.PICKING) {
    return { ok: false, orders, order, message: "All items must be picked before packing." };
  }

  const result = applyStatus(orders, orderId, ORDER_STATUS.PACKED, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorName = actor?.name || "Packer";
  next = {
    ...next,
    fulfillment: {
      ...next.fulfillment,
      packedAt: stamped,
      packedBy: actorName,
      packageCount,
      packagingNotes: notes,
    },
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_PACKED,
      status: ORDER_STATUS.PACKED,
      at: stamped,
      actorName,
      note: notes,
      meta: { packageCount },
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next, message: "Order marked packed." };
};

export const markReadyToDispatch = (orders, orderId, { at = new Date(), actor = null } = {}) => {
  const result = applyStatus(orders, orderId, ORDER_STATUS.READY_TO_DISPATCH, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  next = {
    ...next,
    fulfillment: {
      ...next.fulfillment,
      readyToDispatchAt: stamped,
    },
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_READY_TO_DISPATCH,
      status: ORDER_STATUS.READY_TO_DISPATCH,
      at: stamped,
      actorName: actor?.name || "System",
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next };
};

export const dispatchOrder = (orders, orderId, { carrier, trackingNumber, shippingMethod, at = new Date(), actor = null, estimatedDelivery = "" } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  if (order.status !== ORDER_STATUS.READY_TO_DISPATCH) {
    return { ok: false, orders, order, message: "Order must be ready to dispatch." };
  }
  if (!carrier || !trackingNumber) {
    return { ok: false, orders, order, message: "Carrier and tracking number required." };
  }
  const result = applyStatus(orders, orderId, ORDER_STATUS.SHIPPED, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  next = {
    ...next,
    fulfillment: {
      ...next.fulfillment,
      dispatchedAt: stamped,
    },
    shipment: {
      carrier,
      trackingNumber,
      shippingMethod: shippingMethod || carrier,
      dispatchedAt: stamped,
      estimatedDelivery,
      dispatchedBy: actor?.employeeId || actor?.name || null,
    },
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_DISPATCHED,
      status: ORDER_STATUS.SHIPPED,
      at: stamped,
      actorName: actor?.name || "Dispatcher",
      note: `${carrier} · ${trackingNumber}`,
      meta: { carrier, trackingNumber },
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next, message: "Order dispatched." };
};

export const markOutForDelivery = (orders, orderId, { at = new Date(), actor = null } = {}) => {
  const result = applyStatus(orders, orderId, ORDER_STATUS.OUT_FOR_DELIVERY, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  next = {
    ...next,
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_OUT_FOR_DELIVERY,
      status: ORDER_STATUS.OUT_FOR_DELIVERY,
      at: stamped,
      actorName: actor?.name || "Courier",
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next };
};

export const markDelivered = (orders, orderId, { at = new Date(), actor = null } = {}) => {
  const result = applyStatus(orders, orderId, ORDER_STATUS.DELIVERED, at, actor);
  if (!result.ok) return result;
  let next = result.order;
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  next = {
    ...next,
    fulfillment: {
      ...next.fulfillment,
      deliveredAt: stamped,
    },
    timeline: appendTimeline(next.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.ORDER_DELIVERED,
      status: ORDER_STATUS.DELIVERED,
      at: stamped,
      actorName: actor?.name || "Courier",
    })),
  };
  return { ok: true, orders: replaceOrder(result.orders, next), order: next };
};

export const addInternalNote = (orders, orderId, { text, at = new Date(), actor = null } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const note = { at: stamped, by: actor?.name || "System", text: String(text || "").slice(0, 1000) };
  const next = {
    ...order,
    notes: {
      customer: order.notes?.customer || "",
      internal: [...(order.notes?.internal || []), note],
    },
    timeline: appendTimeline(order.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.NOTE_ADDED,
      at: stamped,
      actorName: note.by,
      note: text,
    })),
    updatedAt: stamped,
  };
  return { ok: true, orders: replaceOrder(orders, next), order: next };
};

export const assignFulfillment = (orders, orderId, { locationId, employeeId, employeeName, at = new Date(), actor = null } = {}) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null, message: "Order not found." };
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const fulfillmentType = locationId?.includes("store") ? "STORE" : "WAREHOUSE";
  let fulfillment = order.fulfillment ? normaliseFulfillment(order.fulfillment, order.id) : buildFulfillmentRecord({ orderId, createdAt: stamped });
  fulfillment = {
    ...fulfillment,
    sourceLocationId: locationId || fulfillment.sourceLocationId,
    fulfillmentType,
    assignedEmployeeId: employeeId || fulfillment.assignedEmployeeId,
    assignedEmployeeName: employeeName || fulfillment.assignedEmployeeName,
    updatedAt: stamped,
    history: [...(fulfillment.history || []), { status: fulfillment.status, at: stamped, by: actor?.name || "System", note: "Assignment updated" }],
  };
  const next = {
    ...order,
    fulfillment,
    timeline: appendTimeline(order.timeline || [], buildTimelineEvent({
      type: ORDER_ACTIVITY_TYPES.FULFILLMENT_ASSIGNED,
      at: stamped,
      actorName: actor?.name || "Admin",
      note: `Assigned to ${employeeName || employeeId} at ${locationId}`,
      meta: { locationId, employeeId },
    })),
    updatedAt: stamped,
  };
  return { ok: true, orders: replaceOrder(orders, next), order: next };
};

/* ------------------------------------------------------------------ */
/* Returns & refunds                                                   */
/* ------------------------------------------------------------------ */

export const attachReturn = (orders, orderId, record, orderStatus = null) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null };

  let next = { ...order, returns: [...order.returns, record] };
  if (orderStatus && canTransition(order.status, orderStatus)) {
    next = {
      ...next,
      status: orderStatus,
      statusHistory: [
        ...order.statusHistory,
        { status: orderStatus, at: record.createdAt },
      ],
    };
  }
  return { ok: true, orders: replaceOrder(orders, next), order: next };
};

export const updateReturn = (orders, orderId, record) => {
  const order = findOrder(orders, orderId);
  if (!order) return { ok: false, orders, order: null };
  const next = {
    ...order,
    returns: order.returns.map((entry) => (entry.id === record.id ? record : entry)),
  };
  return { ok: true, orders: replaceOrder(orders, next), order: next };
};

export const claimGuestOrders = (orders, customerId) => {
  if (!customerId) return { orders, claimed: 0 };
  let claimed = 0;
  const next = orders.map((order) => {
    if (order.customerId) return order;
    claimed += 1;
    return { ...order, customerId };
  });
  return { orders: claimed > 0 ? next : orders, claimed };
};

export default {
  ORDERS_STORAGE_KEY,
  CURRENT_ORDER_KEY,
  loadOrders,
  saveOrders,
  loadCurrentOrderId,
  saveCurrentOrderId,
  buildOrderRecord,
  addOrder,
  findOrder,
  findOwnedOrder,
  ordersForCustomer,
  getAllOrders,
  searchOrders,
  applyStatus,
  forceTransition,
  cancelOrder,
  allocateOrder,
  startPicking,
  markItemPicked,
  markPacked,
  markReadyToDispatch,
  dispatchOrder,
  markOutForDelivery,
  markDelivered,
  addInternalNote,
  assignFulfillment,
  attachReturn,
  updateReturn,
  claimGuestOrders,
};
