/**
 * PRATIKSHYA FASHON — Return service.
 *
 * Return eligibility, validation, record creation, operational lifecycle,
 * and the demo return timeline. Kept away from the UI so the return form
 * only collects a request and the rules live in exactly one place.
 *
 * Phase 16.1 adds the full operational workflow: approval, rejection,
 * pickup scheduling, receiving, inspection, and refund processing.
 *
 * Everything here is mock. No refund is ever processed, no payment
 * gateway is contacted, and refund states are clearly presented as demo
 * status. A backend returns API replaces this module later without the
 * return UI changing.
 */

import {
  ORDER_PAYMENT_STATUS,
  ORDER_STATUS,
  RETURN_JOURNEY,
  RETURN_STATUS,
  RETURN_STATUSES,
  canTransitionReturn,
  getReturnReason,
  getReturnResolution,
} from "../../config/orderConfig";
import {
  buildReturnId,
  canReturnOrder,
  refundAmountFor,
  refundMethodLabel,
  returnedLineIds,
} from "../../utils/orders";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";

/* ------------------------------------------------------------------ */
/* Eligibility                                                         */
/* ------------------------------------------------------------------ */

/**
 * The order lines a customer may still return, each carrying whether it
 * is already part of an existing request.
 */
export const returnableItems = (order) => {
  if (!order) return [];
  const covered = returnedLineIds(order);
  return order.items.map((item) => ({
    ...item,
    alreadyRequested: covered.has(item.lineId),
  }));
};

export const isReturnEligible = (order) => canReturnOrder(order);

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Return request rules: at least one selectable item, a reason and a
 * resolution. The note is always optional. An empty request can never be
 * submitted.
 */
export const validateReturnRequest = ({
  order,
  lineIds = [],
  reason = "",
  resolution = "",
} = {}) => {
  const covered = returnedLineIds(order ?? {});
  const selectable = lineIds.filter(
    (lineId) =>
      !covered.has(lineId) && (order?.items ?? []).some((item) => item.lineId === lineId)
  );

  const errors = {
    items: selectable.length > 0 ? "" : "Please select at least one piece to return.",
    reason: getReturnReason(reason) ? "" : "Please choose a reason for the return.",
    resolution: getReturnResolution(resolution)
      ? ""
      : "Please choose how you would like this resolved.",
  };

  return {
    errors,
    ok: Object.values(errors).every((value) => !value),
    lineIds: selectable,
  };
};

/* ------------------------------------------------------------------ */
/* Creation                                                            */
/* ------------------------------------------------------------------ */

/**
 * Composes a return record for an order. Returns `{ ok, record, errors }`
 * — the caller (the order context) persists it; this function never
 * touches storage.
 */
export const createReturnRecord = ({
  order,
  lineIds = [],
  reason = "",
  resolution = "refund",
  note = "",
  at = new Date(),
}) => {
  if (!order) {
    return { ok: false, record: null, errors: {}, message: "Order not found." };
  }
  if (!isReturnEligible(order)) {
    return {
      ok: false,
      record: null,
      errors: {},
      message: "This order is not eligible for a return.",
    };
  }

  const validation = validateReturnRequest({ order, lineIds, reason, resolution });
  if (!validation.ok) {
    return {
      ok: false,
      record: null,
      errors: validation.errors,
      message: "Please complete your return request.",
    };
  }

  const items = order.items.filter((item) => validation.lineIds.includes(item.lineId));
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const sequence = (order.returns?.length ?? 0) + 1;
  const wantsRefund = resolution === "refund";
  const amount = refundAmountFor(items);

  const record = {
    id: buildReturnId(order.id, sequence),
    orderId: order.id,
    sequence,
    items: items.map((item) => ({ ...item })),
    reason,
    reasonLabel: getReturnReason(reason)?.label ?? "Other",
    resolution,
    note: String(note ?? "").trim().slice(0, 500),
    status: RETURN_STATUS.RETURN_REQUESTED,
    createdAt: stamped,
    history: [{ status: RETURN_STATUS.RETURN_REQUESTED, at: stamped }],
    refund: wantsRefund
      ? {
          amount,
          method: refundMethodLabel(order),
          status: ORDER_PAYMENT_STATUS.REFUND_INITIATED,
        }
      : null,
  };

  /* Every piece requested → the order itself enters the return flow. */
  const covered = returnedLineIds(order);
  const remaining = order.items.filter(
    (item) => !covered.has(item.lineId) && !validation.lineIds.includes(item.lineId)
  );

  return {
    ok: true,
    record,
    errors: {},
    orderStatus: remaining.length === 0 ? ORDER_STATUS.RETURN_REQUESTED : null,
    message: "Return requested.",
  };
};

/* ------------------------------------------------------------------ */
/* Progression                                                         */
/* ------------------------------------------------------------------ */

/** Moves a return record forward, refusing invalid transitions. */
export const advanceReturnRecord = (record, nextStatus, at = new Date()) => {
  if (!record) return { ok: false, record: null, message: "Return not found." };
  if (!canTransitionReturn(record.status, nextStatus)) {
    return {
      ok: false,
      record,
      message: "That is not a valid step for this return.",
    };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const refund = record.refund
    ? {
        ...record.refund,
        status:
          nextStatus === RETURN_STATUS.REFUNDED
            ? ORDER_PAYMENT_STATUS.REFUNDED
            : record.refund.status,
      }
    : null;

  return {
    ok: true,
    record: {
      ...record,
      status: nextStatus,
      history: [...record.history, { status: nextStatus, at: stamped }],
      refund,
    },
    message: "",
  };
};

/* ------------------------------------------------------------------ */
/* Timeline                                                            */
/* ------------------------------------------------------------------ */

/**
 * The return timeline, built the same way the shipment timeline is: one
 * generator, driven by the record's status and its own history.
 */
export const getReturnTimeline = (record) => {
  if (!record) return [];
  const history = new Map(record.history.map((entry) => [entry.status, entry.at]));
  const currentStage = RETURN_STATUSES[record.status]?.stage ?? null;
  const rejected = record.status === RETURN_STATUS.REJECTED;

  return RETURN_JOURNEY.map((status) => {
    const definition = RETURN_STATUSES[status];
    const done = currentStage !== null && definition.stage < currentStage;
    const current = currentStage !== null && definition.stage === currentStage;
    return {
      status,
      title: definition.label,
      description: definition.narrative,
      timestamp: history.get(status) ?? null,
      state: rejected ? "upcoming" : done ? "done" : current ? "current" : "upcoming",
    };
  });
};

/* ------------------------------------------------------------------ */
/* Activity logging                                                     */
/* ------------------------------------------------------------------ */

/** Records a return event to the shared activity diary. */
const recordReturnActivity = (action, returnId, summary, actor) => {
  try {
    const entries = loadActivity();
    recordActivity(entries, {
      ...describeActor(actor),
      action,
      summary: `${summary} · ${returnId}`,
    });
  } catch {
    /* Activity diary is supplementary — never blocks the return flow. */
  }
};

/* ------------------------------------------------------------------ */
/* Transition guards                                                    */
/* ------------------------------------------------------------------ */

/**
 * Can this return be reviewed? Only requests awaiting review may be acted
 * on by the care team.
 */
export const canReviewReturn = (record) =>
  Boolean(record) &&
  record.status === RETURN_STATUS.RETURN_REQUESTED ||
  record.status === RETURN_STATUS.UNDER_REVIEW;

export const canApproveReturn = (record) =>
  Boolean(record) &&
  (record.status === RETURN_STATUS.RETURN_REQUESTED ||
    record.status === RETURN_STATUS.UNDER_REVIEW);

export const canRejectReturn = (record) =>
  Boolean(record) &&
  (record.status === RETURN_STATUS.RETURN_REQUESTED ||
    record.status === RETURN_STATUS.UNDER_REVIEW);

export const canSchedulePickup = (record) =>
  Boolean(record) && record.status === RETURN_STATUS.APPROVED;

export const canReceiveReturn = (record) =>
  Boolean(record) && record.status === RETURN_STATUS.PICKUP_SCHEDULED;

export const canInspectReturn = (record) =>
  Boolean(record) &&
  (record.status === RETURN_STATUS.RECEIVED ||
    record.status === RETURN_STATUS.ITEM_RECEIVED);

export const canInitiateRefund = (record) =>
  Boolean(record) &&
  record.status === RETURN_STATUS.INSPECTED &&
  Boolean(record.refund);

export const canCompleteRefund = (record) =>
  Boolean(record) &&
  record.status === RETURN_STATUS.REFUND_INITIATED &&
  Boolean(record.refund);

/* ------------------------------------------------------------------ */
/* Operational mutations                                                */
/* ------------------------------------------------------------------ */

/**
 * Approve a return request. Records reviewer, approved at, and advances
 * to APPROVED. Does not touch inventory or issue refund.
 */
export const approveReturnRecord = (record, { actor = null, note = "", at = new Date() } = {}) => {
  if (!canApproveReturn(record)) {
    return { ok: false, record, message: "This return cannot be approved right now." };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.APPROVED, at);
  if (!advanced.ok) return advanced;
  const next = {
    ...advanced.record,
    reviewedBy: actorInfo.actorName,
    reviewedAt: stamped,
    approvedBy: actorInfo.actorName,
    approvedAt: stamped,
    approvalNote: String(note || "").trim().slice(0, 500),
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_APPROVED,
    record.id,
    "Return approved",
    actor
  );
  return { ok: true, record: next, message: "Return approved." };
};

/**
 * Reject a return request. Requires a rejection reason. Does not modify
 * inventory or create a refund.
 */
export const rejectReturnRecord = (
  record,
  { actor = null, reason = "", note = "", at = new Date() } = {}
) => {
  if (!canRejectReturn(record)) {
    return { ok: false, record, message: "This return cannot be rejected right now." };
  }
  if (!reason) {
    return { ok: false, record, message: "Please select a rejection reason." };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const next = {
    ...record,
    status: RETURN_STATUS.REJECTED,
    history: [
      ...record.history,
      { status: RETURN_STATUS.REJECTED, at: stamped },
    ],
    reviewedBy: actorInfo.actorName,
    reviewedAt: stamped,
    rejectedBy: actorInfo.actorName,
    rejectedAt: stamped,
    rejectionReason: reason,
    rejectionNote: String(note || "").trim().slice(0, 500),
    refund: record.refund ? { ...record.refund, status: ORDER_PAYMENT_STATUS.CANCELLED } : null,
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_REJECTED,
    record.id,
    `Return rejected — ${reason}`,
    actor
  );
  return { ok: true, record: next, message: "Return rejected." };
};

/**
 * Schedule a pickup for an approved return.
 */
export const schedulePickupRecord = (
  record,
  {
    actor = null,
    pickupDate = "",
    pickupMethod = "",
    pickupReference = "",
    note = "",
    at = new Date(),
  } = {}
) => {
  if (!canSchedulePickup(record)) {
    return { ok: false, record, message: "Pickup can only be scheduled for approved returns." };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.PICKUP_SCHEDULED, at);
  if (!advanced.ok) return advanced;
  const next = {
    ...advanced.record,
    pickupDate: String(pickupDate || "").trim(),
    pickupMethod: String(pickupMethod || "").trim(),
    pickupReference: String(pickupReference || "").trim(),
    pickupScheduledAt: stamped,
    pickupNote: String(note || "").trim().slice(0, 500),
    scheduledBy: actorInfo.actorName,
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_PICKUP_SCHEDULED,
    record.id,
    `Pickup scheduled — ${pickupMethod || "Courier"}`,
    actor
  );
  return { ok: true, record: next, message: "Pickup scheduled." };
};

/**
 * Mark a return as received at the warehouse. This does NOT immediately
 * add stock — inventory remains quarantined until inspection.
 */
export const receiveReturnRecord = (
  record,
  {
    actor = null,
    receivedDate = "",
    packageCondition = "",
    note = "",
    at = new Date(),
  } = {}
) => {
  if (!canReceiveReturn(record)) {
    return { ok: false, record, message: "This return cannot be marked as received right now." };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.RECEIVED, at);
  if (!advanced.ok) return advanced;
  const next = {
    ...advanced.record,
    receivedAt: stamped,
    receivedDate: String(receivedDate || stamped).trim(),
    receivedBy: actorInfo.actorName,
    packageCondition: String(packageCondition || "Good").trim(),
    receiveNote: String(note || "").trim().slice(0, 500),
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_RECEIVED,
    record.id,
    `Return received — ${packageCondition || "Good"} condition`,
    actor
  );
  return { ok: true, record: next, message: "Return marked as received." };
};

/**
 * Complete the inspection of a received return. Each item gets an
 * inspection result (SELLABLE, DAMAGED, QUARANTINE). After completion
 * the return moves to INSPECTED.
 */
export const inspectReturnRecord = (
  record,
  {
    actor = null,
    inspections = [],
    at = new Date(),
  } = {}
) => {
  if (!canInspectReturn(record)) {
    return { ok: false, record, message: "This return cannot be inspected right now." };
  }
  if (!Array.isArray(inspections) || inspections.length === 0) {
    return { ok: false, record, message: "Please inspect every item before completing." };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.INSPECTED, at);
  if (!advanced.ok) return advanced;

  /* Mark each item with its inspection outcome. */
  const inspectedItems = (record.items || []).map((item) => {
    const result = inspections.find((entry) => entry.lineId === item.lineId);
    if (!result) return item;
    return {
      ...item,
      inspectionResult: result.condition || "SELLABLE",
      inspectionNotes: String(result.notes || "").trim().slice(0, 500),
    };
  });

  const overallConditions = inspections.map((entry) => entry.condition).filter(Boolean);
  const primaryResult = overallConditions.includes("DAMAGED") ? "DAMAGED" : "SELLABLE";

  const next = {
    ...advanced.record,
    items: inspectedItems,
    inspectedAt: stamped,
    inspectedBy: actorInfo.actorName,
    inspectionResult: primaryResult,
    inspections,
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_INSPECTED,
    record.id,
    `Inspection completed — ${primaryResult}`,
    actor
  );
  return { ok: true, record: next, message: "Inspection completed." };
};

/**
 * Initiate a refund after inspection. Sets the return to REFUND_INITIATED.
 */
export const initiateRefundRecord = (record, { actor = null, at = new Date() } = {}) => {
  if (!canInitiateRefund(record)) {
    return {
      ok: false,
      record,
      message: "Refund can only be initiated after inspection is complete.",
    };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.REFUND_INITIATED, at);
  if (!advanced.ok) return advanced;
  const refund = {
    ...(record.refund || {}),
    status: ORDER_PAYMENT_STATUS.REFUND_INITIATED,
    refundRequestedAt: stamped,
    refundRequestedBy: actorInfo.actorName,
  };
  const next = {
    ...advanced.record,
    refund,
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_REFUND_REQUESTED,
    record.id,
    `Refund initiated — ₹${Math.round(refund.amount || 0)}`,
    actor
  );
  return { ok: true, record: next, message: "Refund initiated." };
};

/**
 * Complete the refund. Demo mode only — no real payment movement.
 */
export const completeRefundRecord = (record, { actor = null, at = new Date() } = {}) => {
  if (!canCompleteRefund(record)) {
    return {
      ok: false,
      record,
      message: "Refund can only be completed after initiation.",
    };
  }
  const stamped = at instanceof Date ? at.toISOString() : String(at);
  const actorInfo = describeActor(actor);
  const advanced = advanceReturnRecord(record, RETURN_STATUS.REFUNDED, at);
  if (!advanced.ok) return advanced;
  const refund = {
    ...(record.refund || {}),
    status: ORDER_PAYMENT_STATUS.REFUNDED,
    refundCompletedAt: stamped,
    refundProcessedBy: actorInfo.actorName,
  };
  const next = {
    ...advanced.record,
    refund,
  };
  recordReturnActivity(
    ACTIVITY_ACTIONS.RETURN_REFUNDED,
    record.id,
    `Refund completed — ₹${Math.round(refund.amount || 0)}`,
    actor
  );
  return { ok: true, record: next, message: "Refund completed." };
};

/* ------------------------------------------------------------------ */
/* Rejection reasons                                                    */
/* ------------------------------------------------------------------ */

export const REJECTION_REASONS = [
  { id: "outside_window", label: "Outside Return Window" },
  { id: "non_returnable", label: "Non-Returnable Item" },
  { id: "used_product", label: "Used Product" },
  { id: "missing_tags", label: "Missing Tags" },
  { id: "final_sale", label: "Final Sale" },
  { id: "invalid_request", label: "Invalid Request" },
  { id: "other", label: "Other" },
];

export const getRejectionReason = (id) =>
  REJECTION_REASONS.find((entry) => entry.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Pickup methods                                                       */
/* ------------------------------------------------------------------ */

export const PICKUP_METHODS = [
  { id: "courier", label: "Courier", demo: true },
  { id: "store_dropoff", label: "Store Drop-off", demo: true },
  { id: "home_pickup", label: "Home Pickup", demo: true },
  { id: "store_collection", label: "Store Collection", demo: true },
];

export const getPickupMethod = (id) =>
  PICKUP_METHODS.find((entry) => entry.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Package conditions                                                   */
/* ------------------------------------------------------------------ */

export const PACKAGE_CONDITIONS = [
  { id: "good", label: "Good" },
  { id: "opened", label: "Opened" },
  { id: "damaged", label: "Damaged" },
  { id: "incomplete", label: "Incomplete" },
];

export const getPackageCondition = (id) =>
  PACKAGE_CONDITIONS.find((entry) => entry.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Inspection conditions                                                 */
/* ------------------------------------------------------------------ */

export const INSPECTION_CONDITIONS = [
  { id: "SELLABLE", label: "Sellable" },
  { id: "DAMAGED", label: "Damaged" },
  { id: "QUARANTINE", label: "Quarantine" },
];

export const getInspectionCondition = (id) =>
  INSPECTION_CONDITIONS.find((entry) => entry.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Return metrics helper                                                */
/* ------------------------------------------------------------------ */

/** Compute metrics from all returns for the admin dashboard. */
export const getReturnMetrics = (allReturns = []) => {
  const count = (status) => allReturns.filter((r) => r.status === status).length;
  return {
    pendingReview:
      count(RETURN_STATUS.RETURN_REQUESTED) +
      count(RETURN_STATUS.UNDER_REVIEW),
    approved: count(RETURN_STATUS.APPROVED),
    pickupScheduled: count(RETURN_STATUS.PICKUP_SCHEDULED),
    received:
      count(RETURN_STATUS.RECEIVED) +
      count(RETURN_STATUS.ITEM_RECEIVED),
    inspected: count(RETURN_STATUS.INSPECTED),
    refundPending: count(RETURN_STATUS.REFUND_INITIATED),
    refunded: count(RETURN_STATUS.REFUNDED),
    rejected: count(RETURN_STATUS.REJECTED),
    total: allReturns.length,
  };
};

/**
 * Find a customer-safe rejection message. Internal rejection reasons are
 * never shown to customers.
 */
export const customerFacingRejection = (record) => {
  if (!record || record.status !== RETURN_STATUS.REJECTED) return null;
  return "Your return request could not be approved. Please contact our care team for more information.";
};

export default {
  returnableItems,
  isReturnEligible,
  validateReturnRequest,
  createReturnRecord,
  advanceReturnRecord,
  getReturnTimeline,
  canReviewReturn,
  canApproveReturn,
  canRejectReturn,
  canSchedulePickup,
  canReceiveReturn,
  canInspectReturn,
  canInitiateRefund,
  canCompleteRefund,
  approveReturnRecord,
  rejectReturnRecord,
  schedulePickupRecord,
  receiveReturnRecord,
  inspectReturnRecord,
  initiateRefundRecord,
  completeRefundRecord,
  REJECTION_REASONS,
  getRejectionReason,
  PICKUP_METHODS,
  getPickupMethod,
  PACKAGE_CONDITIONS,
  getPackageCondition,
  INSPECTION_CONDITIONS,
  getInspectionCondition,
  getReturnMetrics,
  customerFacingRejection,
};
