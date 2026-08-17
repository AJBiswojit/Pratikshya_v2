/**
 * PRATIKSHYA FASHON — Tracking service (Phase 15)
 *
 * Generates demo shipment timeline from status history.
 * Supports both legacy and new extended journey.
 */

import {
  FULFILMENT_ORIGIN,
  ORDER_JOURNEY,
  CUSTOMER_JOURNEY,
  ORDER_STATUS,
  ORDER_STATUSES,
  getOrderStatus,
} from "../../config/orderConfig";

const LEG_HOURS = {
  [ORDER_STATUS.PENDING_PAYMENT]: 0,
  [ORDER_STATUS.PLACED]: 0,
  [ORDER_STATUS.PAYMENT_CONFIRMED]: 0.5,
  [ORDER_STATUS.ORDER_CONFIRMED]: 1,
  [ORDER_STATUS.CONFIRMED]: 1,
  [ORDER_STATUS.PROCESSING]: 4,
  [ORDER_STATUS.ALLOCATED]: 6,
  [ORDER_STATUS.PICKING]: 10,
  [ORDER_STATUS.PACKED]: 14,
  [ORDER_STATUS.READY_TO_DISPATCH]: 18,
  [ORDER_STATUS.SHIPPED]: 24,
  [ORDER_STATUS.OUT_FOR_DELIVERY]: 48,
  [ORDER_STATUS.DELIVERED]: 60,
};

const addHours = (iso, hours) =>
  new Date(new Date(iso).getTime() + hours * 3600 * 1000).toISOString();

const legLocation = (status, order) => {
  const city = order.address?.city ? `${order.address.city}` : "Your city";
  switch (status) {
    case ORDER_STATUS.SHIPPED:
      return order.tracking?.origin ?? FULFILMENT_ORIGIN;
    case ORDER_STATUS.OUT_FOR_DELIVERY:
    case ORDER_STATUS.DELIVERED:
      return city;
    default:
      return order.tracking?.origin ?? FULFILMENT_ORIGIN;
  }
};

export const getTracking = (order, { customerView = false } = {}) => {
  if (!order) return null;

  const journey = customerView ? CUSTOMER_JOURNEY : ORDER_JOURNEY;

  const history = new Map(
    (order.statusHistory ?? []).map((entry) => [entry.status, entry.at])
  );
  const currentStage = getOrderStatus(order.status).stage;
  const isCancelled = order.status === ORDER_STATUS.CANCELLED;
  const isReturnFlow =
    order.status === ORDER_STATUS.RETURN_REQUESTED ||
    order.status === ORDER_STATUS.RETURNED ||
    order.status === ORDER_STATUS.REFUND_PENDING ||
    order.status === ORDER_STATUS.REFUNDED;

  const reachedStage = isReturnFlow
    ? ORDER_STATUSES[ORDER_STATUS.DELIVERED].stage
    : currentStage;

  const events = journey.map((status) => {
    const definition = ORDER_STATUSES[status];
    if (!definition) return null;
    const recorded = history.get(status);
    // Also check legacy mapping
    const legacyMap = definition.mapsTo ? history.get(definition.mapsTo) : null;
    const timestamp = recorded || legacyMap || null;
    const projected = addHours(order.createdAt, LEG_HOURS[status] ?? 0);
    const done = reachedStage !== null && definition.stage !== null && definition.stage < reachedStage;
    const current = reachedStage !== null && definition.stage === reachedStage;

    return {
      status,
      title: definition.label,
      description: definition.narrative,
      timestamp: timestamp ?? (done || current ? projected : null),
      projected: !timestamp,
      location: legLocation(status, order),
      state: isCancelled ? "upcoming" : done ? "done" : current ? "current" : "upcoming",
    };
  }).filter(Boolean);

  return {
    orderId: order.id,
    status: getOrderStatus(order.status),
    trackingId: order.tracking?.trackingId ?? order.shipment?.trackingNumber ?? null,
    carrier: order.shipment?.carrier || order.tracking?.carrier || null,
    origin: order.tracking?.origin ?? FULFILMENT_ORIGIN,
    estimatedDelivery: order.shipment?.estimatedDelivery || order.estimatedDelivery || order.deliveryMethod?.estimate || "",
    deliveryMethod: order.deliveryMethod,
    cancelled: isCancelled,
    delivered: reachedStage === ORDER_STATUSES[ORDER_STATUS.DELIVERED].stage,
    events,
  };
};

export default { getTracking };
