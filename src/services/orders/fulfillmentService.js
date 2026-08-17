/**
 * PRATIKSHYA FASHON — Fulfillment service (Phase 15)
 *
 * Attached to the existing order — never a second order dataset.
 * Every order has exactly one fulfillment record (future split fulfillment
 * possible via `shipments[]` array, but Phase 15 uses single source).
 *
 * No inventory quantity is mutated here — reservation/sale/restock already
 * handled by inventoryRepository via checkout/payment/cancellation.
 * This service only tracks operational state: where, who, when, packages.
 */

import { ORDER_STATUS, FULFILLMENT_STATUS } from "../../config/orderConfig";

export const FULFILLMENT_TYPES = {
  STORE: "STORE",
  WAREHOUSE: "WAREHOUSE",
};

export const buildFulfillmentRecord = ({
  orderId,
  sourceLocationId = null,
  fulfillmentType = null,
  assignedEmployeeId = null,
  assignedEmployeeName = null,
  status = FULFILLMENT_STATUS.PENDING,
  createdAt = new Date().toISOString(),
} = {}) => ({
  orderId,
  sourceLocationId,
  fulfillmentType,
  assignedEmployeeId,
  assignedEmployeeName,
  status,
  // Operational timestamps
  allocatedAt: null,
  pickingStartedAt: null,
  packedAt: null,
  readyToDispatchAt: null,
  dispatchedAt: null,
  deliveredAt: null,
  // Packing details
  packedBy: null,
  packageCount: 1,
  packagingNotes: "",
  // Picking details: map of lineId -> { picked, at, by }
  picking: {},
  // History of fulfillment state changes
  history: [{ status, at: createdAt, by: "System" }],
  createdAt,
  updatedAt: createdAt,
});

export const normaliseFulfillment = (raw, orderId = null) => {
  if (!raw || typeof raw !== "object") {
    return buildFulfillmentRecord({ orderId });
  }
  const at = raw.createdAt || new Date().toISOString();
  return {
    orderId: raw.orderId || orderId,
    sourceLocationId: raw.sourceLocationId || null,
    fulfillmentType: raw.fulfillmentType || null,
    assignedEmployeeId: raw.assignedEmployeeId || null,
    assignedEmployeeName: raw.assignedEmployeeName || null,
    status: raw.status || FULFILLMENT_STATUS.PENDING,
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
    history: Array.isArray(raw.history) ? raw.history : [{ status: raw.status || FULFILLMENT_STATUS.PENDING, at }],
    createdAt: at,
    updatedAt: raw.updatedAt || at,
  };
};

/** Resolve fulfillment type from location */
export const fulfillmentTypeForLocation = (location) => {
  if (!location) return null;
  return location.type === "STORE" ? FULFILLMENT_TYPES.STORE : FULFILLMENT_TYPES.WAREHOUSE;
};

export const mapOrderStatusToFulfillmentStatus = (orderStatus) => {
  switch (orderStatus) {
    case ORDER_STATUS.ALLOCATED:
      return FULFILLMENT_STATUS.ALLOCATED;
    case ORDER_STATUS.PICKING:
      return FULFILLMENT_STATUS.PICKING;
    case ORDER_STATUS.PACKED:
      return FULFILLMENT_STATUS.PACKED;
    case ORDER_STATUS.READY_TO_DISPATCH:
      return FULFILLMENT_STATUS.READY_TO_DISPATCH;
    case ORDER_STATUS.SHIPPED:
      return FULFILLMENT_STATUS.SHIPPED;
    case ORDER_STATUS.OUT_FOR_DELIVERY:
      return FULFILLMENT_STATUS.OUT_FOR_DELIVERY;
    case ORDER_STATUS.DELIVERED:
      return FULFILLMENT_STATUS.DELIVERED;
    case ORDER_STATUS.CANCELLED:
      return FULFILLMENT_STATUS.CANCELLED;
    default:
      return FULFILLMENT_STATUS.PENDING;
  }
};

/** Check if order can be allocated */
export const canAllocate = (order) => {
  if (!order) return false;
  return [ORDER_STATUS.PROCESSING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED].includes(order.status);
};

export const isFullyPicked = (order) => {
  if (!order?.fulfillment?.picking) return false;
  const items = order.items || [];
  return items.every(( item ) => {
    const pick = order.fulfillment.picking[item.lineId];
    return pick?.picked === true;
  });
};

export default {
  FULFILLMENT_TYPES,
  buildFulfillmentRecord,
  normaliseFulfillment,
  fulfillmentTypeForLocation,
  mapOrderStatusToFulfillmentStatus,
  canAllocate,
  isFullyPicked,
};
