/**
 * PRATIKSHYA FASHON — Order configuration (Phase 15)
 *
 * The single home for every order-level definition:
 * order statuses, payment statuses, fulfillment statuses, transitions,
 * return flows, carriers, cancellation reasons, activity types.
 *
 * Backward compatible with Phase 7-14 statuses: PLACED and CONFIRMED
 * remain valid and are mapped to the richer Phase 15 journey.
 *
 * Nothing here talks to a network. Status strings never appear as literals
 * inside JSX — components read labels/tone/stage from here.
 */

/* ------------------------------------------------------------------ */
/* Order status — extended Phase 15 lifecycle                          */
/* ------------------------------------------------------------------ */

export const ORDER_STATUS = {
  // New Phase 15 granular lifecycle
  PENDING_PAYMENT: "PENDING_PAYMENT",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  PROCESSING: "PROCESSING",
  ALLOCATED: "ALLOCATED",
  PICKING: "PICKING",
  PACKED: "PACKED",
  READY_TO_DISPATCH: "READY_TO_DISPATCH",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  RETURNED: "RETURNED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
  // Legacy — retained for migration, maps to new stages
  PLACED: "PLACED",
  CONFIRMED: "CONFIRMED",
};

export const ORDER_STATUSES = {
  [ORDER_STATUS.PENDING_PAYMENT]: {
    id: ORDER_STATUS.PENDING_PAYMENT,
    label: "Pending Payment",
    stage: 0,
    tone: "quiet",
    summary: "Awaiting payment confirmation.",
    narrative: "Your order is awaiting payment confirmation.",
  },
  [ORDER_STATUS.PLACED]: {
    id: ORDER_STATUS.PLACED,
    label: "Placed",
    stage: 0,
    tone: "quiet",
    summary: "Your order has been received.",
    narrative: "Your order was received at the atelier.",
    legacy: true,
    mapsTo: ORDER_STATUS.PENDING_PAYMENT,
  },
  [ORDER_STATUS.PAYMENT_CONFIRMED]: {
    id: ORDER_STATUS.PAYMENT_CONFIRMED,
    label: "Payment Confirmed",
    stage: 1,
    tone: "accent",
    summary: "Payment confirmed.",
    narrative: "Your payment has been confirmed — the atelier is preparing your order.",
  },
  [ORDER_STATUS.ORDER_CONFIRMED]: {
    id: ORDER_STATUS.ORDER_CONFIRMED,
    label: "Order Confirmed",
    stage: 2,
    tone: "accent",
    summary: "Your order is confirmed.",
    narrative: "Your order is confirmed and queued for the atelier floor.",
  },
  [ORDER_STATUS.CONFIRMED]: {
    id: ORDER_STATUS.CONFIRMED,
    label: "Confirmed",
    stage: 2,
    tone: "accent",
    summary: "Your order is confirmed.",
    narrative: "Your order is confirmed and queued for the atelier floor.",
    legacy: true,
    mapsTo: ORDER_STATUS.ORDER_CONFIRMED,
  },
  [ORDER_STATUS.PROCESSING]: {
    id: ORDER_STATUS.PROCESSING,
    label: "Processing",
    stage: 3,
    tone: "accent",
    summary: "Your pieces are being prepared.",
    narrative: "Your pieces are being checked, pressed and prepared.",
  },
  [ORDER_STATUS.ALLOCATED]: {
    id: ORDER_STATUS.ALLOCATED,
    label: "Allocated",
    stage: 4,
    tone: "accent",
    summary: "Allocated for fulfillment.",
    narrative: "Your order has been allocated to our fulfillment centre.",
  },
  [ORDER_STATUS.PICKING]: {
    id: ORDER_STATUS.PICKING,
    label: "Picking",
    stage: 5,
    tone: "accent",
    summary: "Being picked from the racks.",
    narrative: "Our team is picking your pieces from the racks.",
  },
  [ORDER_STATUS.PACKED]: {
    id: ORDER_STATUS.PACKED,
    label: "Packed",
    stage: 6,
    tone: "accent",
    summary: "Your order is packed.",
    narrative: "Your order has been wrapped and sealed for dispatch.",
  },
  [ORDER_STATUS.READY_TO_DISPATCH]: {
    id: ORDER_STATUS.READY_TO_DISPATCH,
    label: "Ready to Dispatch",
    stage: 7,
    tone: "ink",
    summary: "Ready for the courier.",
    narrative: "Your package is ready and awaiting courier pickup.",
  },
  [ORDER_STATUS.SHIPPED]: {
    id: ORDER_STATUS.SHIPPED,
    label: "Shipped",
    stage: 8,
    tone: "ink",
    summary: "Your order is on its way.",
    narrative: "Your package has left our fulfilment centre.",
  },
  [ORDER_STATUS.OUT_FOR_DELIVERY]: {
    id: ORDER_STATUS.OUT_FOR_DELIVERY,
    label: "Out for Delivery",
    stage: 9,
    tone: "ink",
    summary: "Arriving today.",
    narrative: "Your package is out for delivery in your area.",
  },
  [ORDER_STATUS.DELIVERED]: {
    id: ORDER_STATUS.DELIVERED,
    label: "Delivered",
    stage: 10,
    tone: "ink",
    summary: "Delivered — we hope you love it.",
    narrative: "Your order was delivered.",
  },
  [ORDER_STATUS.CANCELLED]: {
    id: ORDER_STATUS.CANCELLED,
    label: "Cancelled",
    stage: null,
    tone: "muted",
    summary: "This order was cancelled.",
    narrative: "This order was cancelled.",
  },
  [ORDER_STATUS.RETURN_REQUESTED]: {
    id: ORDER_STATUS.RETURN_REQUESTED,
    label: "Return Requested",
    stage: null,
    tone: "accent",
    summary: "A return has been requested.",
    narrative: "A return was requested for this order.",
  },
  [ORDER_STATUS.RETURNED]: {
    id: ORDER_STATUS.RETURNED,
    label: "Returned",
    stage: null,
    tone: "muted",
    summary: "This order has been returned.",
    narrative: "The returned pieces are back with the atelier.",
  },
  [ORDER_STATUS.REFUND_PENDING]: {
    id: ORDER_STATUS.REFUND_PENDING,
    label: "Refund Pending",
    stage: null,
    tone: "accent",
    summary: "Refund is being processed.",
    narrative: "Your refund is being processed — demo status only.",
  },
  [ORDER_STATUS.REFUNDED]: {
    id: ORDER_STATUS.REFUNDED,
    label: "Refunded",
    stage: null,
    tone: "accent",
    summary: "Refund completed.",
    narrative: "Your refund has been completed — demo status only.",
  },
};

/** The fulfilment journey, in order — the spine of the tracking timeline. */
export const ORDER_JOURNEY = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PAYMENT_CONFIRMED,
  ORDER_STATUS.ORDER_CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.ALLOCATED,
  ORDER_STATUS.PICKING,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_TO_DISPATCH,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

/** Customer-facing journey (without internal PENDING_PAYMENT) */
export const CUSTOMER_JOURNEY = [
  ORDER_STATUS.ORDER_CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

/** Legacy journey kept for migration of older demo orders */
export const LEGACY_JOURNEY = [
  ORDER_STATUS.PLACED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.OUT_FOR_DELIVERY,
  ORDER_STATUS.DELIVERED,
];

/**
 * The only transitions the Phase 15 state machine allows.
 * Every transition is explicit — jumping from PROCESSING to DELIVERED
 * is blocked unless an admin override is used via forceTransition.
 */
export const ORDER_TRANSITIONS = {
  [ORDER_STATUS.PENDING_PAYMENT]: [ORDER_STATUS.PAYMENT_CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PLACED]: [
    ORDER_STATUS.PAYMENT_CONFIRMED,
    ORDER_STATUS.ORDER_CONFIRMED,
    ORDER_STATUS.CONFIRMED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PAYMENT_CONFIRMED]: [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ORDER_CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.CONFIRMED]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.ALLOCATED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.ALLOCATED]: [ORDER_STATUS.PICKING, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PICKING]: [ORDER_STATUS.PACKED, ORDER_STATUS.CANCELLED],
  [ORDER_STATUS.PACKED]: [ORDER_STATUS.READY_TO_DISPATCH],
  [ORDER_STATUS.READY_TO_DISPATCH]: [ORDER_STATUS.SHIPPED],
  [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.OUT_FOR_DELIVERY],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [ORDER_STATUS.DELIVERED],
  [ORDER_STATUS.DELIVERED]: [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.REFUND_PENDING],
  [ORDER_STATUS.RETURN_REQUESTED]: [ORDER_STATUS.RETURNED, ORDER_STATUS.DELIVERED, ORDER_STATUS.REFUND_PENDING],
  [ORDER_STATUS.RETURNED]: [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUND_PENDING]: [ORDER_STATUS.REFUNDED],
  [ORDER_STATUS.REFUNDED]: [],
  [ORDER_STATUS.CANCELLED]: [],
};

/** Statuses a customer may cancel from — business rule, demo only. */
export const CANCELLABLE_STATUSES = [
  ORDER_STATUS.PENDING_PAYMENT,
  ORDER_STATUS.PLACED,
  ORDER_STATUS.PAYMENT_CONFIRMED,
  ORDER_STATUS.ORDER_CONFIRMED,
  ORDER_STATUS.CONFIRMED,
  ORDER_STATUS.PROCESSING,
  ORDER_STATUS.ALLOCATED,
  ORDER_STATUS.PICKING,
];

/** Statuses where admin may still cancel with override */
export const ADMIN_CANCELLABLE_STATUSES = [
  ...CANCELLABLE_STATUSES,
  ORDER_STATUS.PACKED,
  ORDER_STATUS.READY_TO_DISPATCH,
];

/** Statuses a return may be raised from — demo rule. */
export const RETURNABLE_STATUSES = [ORDER_STATUS.DELIVERED];

/** Terminal states — no outgoing transitions (except forced admin override) */
export const TERMINAL_STATUSES = [
  ORDER_STATUS.CANCELLED,
  ORDER_STATUS.REFUNDED,
  ORDER_STATUS.RETURNED, // return itself may transition to refund, so not strictly terminal, but listed
];

/** True when `next` is a legal move from `current`. */
export const canTransition = (current, next) =>
  Boolean(ORDER_TRANSITIONS[current]?.includes(next));

/** Alias for broader validation centralization */
export const isValidTransition = canTransition;

export const nextJourneyStatus = (current) => {
  // Resolve legacy aliases to new journey
  const mapped = ORDER_STATUSES[current]?.mapsTo || current;
  const journey = ORDER_JOURNEY.includes(mapped) ? ORDER_JOURNEY : ORDER_JOURNEY;
  const index = journey.indexOf(mapped);
  if (index === -1 || index === journey.length - 1) return null;
  return journey[index + 1];
};

/** Safe status definition lookup — an unknown status never breaks a page. */
export const getOrderStatus = (status) =>
  ORDER_STATUSES[status] ?? ORDER_STATUSES[ORDER_STATUS.ORDER_CONFIRMED];

/* ------------------------------------------------------------------ */
/* Fulfillment status — operational view                               */
/* ------------------------------------------------------------------ */

export const FULFILLMENT_STATUS = {
  PENDING: "PENDING",
  ALLOCATED: "ALLOCATED",
  PICKING: "PICKING",
  PACKED: "PACKED",
  READY_TO_DISPATCH: "READY_TO_DISPATCH",
  SHIPPED: "SHIPPED",
  OUT_FOR_DELIVERY: "OUT_FOR_DELIVERY",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
};

export const FULFILLMENT_STATUSES = {
  [FULFILLMENT_STATUS.PENDING]: { id: "PENDING", label: "Pending Allocation", tone: "quiet", stage: 0 },
  [FULFILLMENT_STATUS.ALLOCATED]: { id: "ALLOCATED", label: "Allocated", tone: "accent", stage: 1 },
  [FULFILLMENT_STATUS.PICKING]: { id: "PICKING", label: "Picking", tone: "accent", stage: 2 },
  [FULFILLMENT_STATUS.PACKED]: { id: "PACKED", label: "Packed", tone: "accent", stage: 3 },
  [FULFILLMENT_STATUS.READY_TO_DISPATCH]: { id: "READY_TO_DISPATCH", label: "Ready to Dispatch", tone: "ink", stage: 4 },
  [FULFILLMENT_STATUS.SHIPPED]: { id: "SHIPPED", label: "Shipped", tone: "ink", stage: 5 },
  [FULFILLMENT_STATUS.OUT_FOR_DELIVERY]: { id: "OUT_FOR_DELIVERY", label: "Out for Delivery", tone: "ink", stage: 6 },
  [FULFILLMENT_STATUS.DELIVERED]: { id: "DELIVERED", label: "Delivered", tone: "ink", stage: 7 },
  [FULFILLMENT_STATUS.CANCELLED]: { id: "CANCELLED", label: "Cancelled", tone: "muted", stage: null },
};

export const getFulfillmentStatus = (status) =>
  FULFILLMENT_STATUSES[status] ?? FULFILLMENT_STATUSES[FULFILLMENT_STATUS.PENDING];

/* ------------------------------------------------------------------ */
/* Order history filters — admin & customer                            */
/* ------------------------------------------------------------------ */

export const ORDER_FILTERS = [
  { id: "all", label: "All", statuses: null },
  {
    id: "pending",
    label: "Pending",
    statuses: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PLACED, ORDER_STATUS.PAYMENT_CONFIRMED],
  },
  {
    id: "confirmed",
    label: "Confirmed",
    statuses: [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PROCESSING, ORDER_STATUS.ALLOCATED],
  },
  {
    id: "picking",
    label: "Picking/Packed",
    statuses: [ORDER_STATUS.PICKING, ORDER_STATUS.PACKED, ORDER_STATUS.READY_TO_DISPATCH],
  },
  {
    id: "shipped",
    label: "Shipped",
    statuses: [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY],
  },
  { id: "delivered", label: "Delivered", statuses: [ORDER_STATUS.DELIVERED] },
  { id: "cancelled", label: "Cancelled", statuses: [ORDER_STATUS.CANCELLED] },
  {
    id: "returned",
    label: "Returns",
    statuses: [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED, ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED],
  },
];

/** Admin extended filters using same ids but with more granularity */
export const ADMIN_ORDER_FILTERS = [
  { id: "all", label: "All Orders", statuses: null, countKey: "total" },
  { id: "pending_payment", label: "Pending Payment", statuses: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PLACED] },
  { id: "confirmed", label: "Confirmed", statuses: [ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED, ORDER_STATUS.PAYMENT_CONFIRMED] },
  { id: "processing", label: "Processing", statuses: [ORDER_STATUS.PROCESSING] },
  { id: "allocated", label: "Allocated", statuses: [ORDER_STATUS.ALLOCATED] },
  { id: "picking", label: "Picking", statuses: [ORDER_STATUS.PICKING] },
  { id: "packed", label: "Packed", statuses: [ORDER_STATUS.PACKED] },
  { id: "ready", label: "Ready to Dispatch", statuses: [ORDER_STATUS.READY_TO_DISPATCH] },
  { id: "shipped", label: "Shipped", statuses: [ORDER_STATUS.SHIPPED] },
  { id: "out_for_delivery", label: "Out for Delivery", statuses: [ORDER_STATUS.OUT_FOR_DELIVERY] },
  { id: "delivered", label: "Delivered", statuses: [ORDER_STATUS.DELIVERED] },
  { id: "cancelled", label: "Cancelled", statuses: [ORDER_STATUS.CANCELLED] },
  { id: "returns", label: "Return Requests", statuses: [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED] },
];

/* ------------------------------------------------------------------ */
/* Payment status                                                      */
/* ------------------------------------------------------------------ */

export const ORDER_PAYMENT_STATUS = {
  PENDING: "PENDING",
  AUTHORIZED: "AUTHORIZED",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  NOT_CAPTURED: "NOT_CAPTURED",
  REFUND_INITIATED: "REFUND_INITIATED",
  REFUND_PENDING: "REFUND_PENDING",
  REFUNDED: "REFUNDED",
};

export const PAYMENT_STATUSES = {
  [ORDER_PAYMENT_STATUS.PENDING]: { id: "PENDING", label: "Payment Pending", tone: "quiet" },
  [ORDER_PAYMENT_STATUS.AUTHORIZED]: { id: "AUTHORIZED", label: "Authorized", tone: "accent" },
  [ORDER_PAYMENT_STATUS.PAID]: { id: "PAID", label: "Paid", tone: "ink" },
  [ORDER_PAYMENT_STATUS.FAILED]: { id: "FAILED", label: "Failed", tone: "muted" },
  [ORDER_PAYMENT_STATUS.CANCELLED]: { id: "CANCELLED", label: "Payment Cancelled", tone: "muted" },
  [ORDER_PAYMENT_STATUS.NOT_CAPTURED]: { id: "NOT_CAPTURED", label: "Not Captured", tone: "muted" },
  [ORDER_PAYMENT_STATUS.REFUND_INITIATED]: { id: "REFUND_INITIATED", label: "Refund Initiated", tone: "accent" },
  [ORDER_PAYMENT_STATUS.REFUND_PENDING]: { id: "REFUND_PENDING", label: "Refund Pending", tone: "accent" },
  [ORDER_PAYMENT_STATUS.REFUNDED]: { id: "REFUNDED", label: "Refunded", tone: "accent" },
};

export const getPaymentStatus = (status) =>
  PAYMENT_STATUSES[status] ?? PAYMENT_STATUSES[ORDER_PAYMENT_STATUS.PENDING];

/* ------------------------------------------------------------------ */
/* Cancellation                                                        */
/* ------------------------------------------------------------------ */

export const CANCELLATION_REASONS = [
  { id: "customer_request", label: "Customer Request" },
  { id: "payment_issue", label: "Payment Issue" },
  { id: "inventory_issue", label: "Inventory Issue" },
  { id: "duplicate_order", label: "Duplicate Order" },
  { id: "operational_issue", label: "Operational Issue" },
  { id: "other", label: "Other" },
];

export const getCancellationReason = (id) =>
  CANCELLATION_REASONS.find((r) => r.id === id) ?? null;

/* ------------------------------------------------------------------ */
/* Return status                                                       */
/* ------------------------------------------------------------------ */

export const RETURN_STATUS = {
  RETURN_REQUESTED: "RETURN_REQUESTED",
  UNDER_REVIEW: "UNDER_REVIEW",
  APPROVED: "APPROVED",
  PICKUP_SCHEDULED: "PICKUP_SCHEDULED",
  RECEIVED: "RECEIVED",
  ITEM_RECEIVED: "ITEM_RECEIVED",
  INSPECTED: "INSPECTED",
  REFUND_INITIATED: "REFUND_INITIATED",
  REFUNDED: "REFUNDED",
  REJECTED: "REJECTED",
};

export const RETURN_STATUSES = {
  [RETURN_STATUS.RETURN_REQUESTED]: {
    id: RETURN_STATUS.RETURN_REQUESTED,
    label: "Return Requested",
    stage: 0,
    tone: "accent",
    narrative: "Your return request has been received.",
  },
  [RETURN_STATUS.UNDER_REVIEW]: {
    id: RETURN_STATUS.UNDER_REVIEW,
    label: "Under Review",
    stage: 1,
    tone: "accent",
    narrative: "Our care team is reviewing your request.",
  },
  [RETURN_STATUS.APPROVED]: {
    id: RETURN_STATUS.APPROVED,
    label: "Approved",
    stage: 2,
    tone: "accent",
    narrative: "Your return has been approved.",
  },
  [RETURN_STATUS.PICKUP_SCHEDULED]: {
    id: RETURN_STATUS.PICKUP_SCHEDULED,
    label: "Pickup Scheduled",
    stage: 3,
    tone: "accent",
    narrative: "A pickup has been scheduled from your delivery address.",
  },
  [RETURN_STATUS.RECEIVED]: {
    id: RETURN_STATUS.RECEIVED,
    label: "Received",
    stage: 4,
    tone: "ink",
    narrative: "Your pieces are back with the atelier and have been inspected.",
  },
  [RETURN_STATUS.ITEM_RECEIVED]: {
    id: RETURN_STATUS.ITEM_RECEIVED,
    label: "Item Received",
    stage: 4,
    tone: "ink",
    narrative: "Returned pieces received at warehouse — awaiting inspection.",
  },
  [RETURN_STATUS.INSPECTED]: {
    id: RETURN_STATUS.INSPECTED,
    label: "Inspected",
    stage: 5,
    tone: "ink",
    narrative: "Returned pieces inspected — sellable / damaged classified.",
  },
  [RETURN_STATUS.REFUND_INITIATED]: {
    id: RETURN_STATUS.REFUND_INITIATED,
    label: "Refund Initiated",
    stage: 6,
    tone: "ink",
    narrative: "Your refund has been initiated to the original payment method.",
  },
  [RETURN_STATUS.REFUNDED]: {
    id: RETURN_STATUS.REFUNDED,
    label: "Refunded",
    stage: 7,
    tone: "ink",
    narrative: "Your refund is complete.",
  },
  [RETURN_STATUS.REJECTED]: {
    id: RETURN_STATUS.REJECTED,
    label: "Not Approved",
    stage: null,
    tone: "muted",
    narrative: "This return could not be approved.",
  },
};

export const RETURN_JOURNEY = [
  RETURN_STATUS.RETURN_REQUESTED,
  RETURN_STATUS.UNDER_REVIEW,
  RETURN_STATUS.APPROVED,
  RETURN_STATUS.PICKUP_SCHEDULED,
  RETURN_STATUS.RECEIVED,
  RETURN_STATUS.INSPECTED,
  RETURN_STATUS.REFUND_INITIATED,
  RETURN_STATUS.REFUNDED,
];

export const RETURN_TRANSITIONS = {
  [RETURN_STATUS.RETURN_REQUESTED]: [RETURN_STATUS.UNDER_REVIEW, RETURN_STATUS.REJECTED],
  [RETURN_STATUS.UNDER_REVIEW]: [RETURN_STATUS.APPROVED, RETURN_STATUS.REJECTED],
  [RETURN_STATUS.APPROVED]: [RETURN_STATUS.PICKUP_SCHEDULED],
  [RETURN_STATUS.PICKUP_SCHEDULED]: [RETURN_STATUS.RECEIVED, RETURN_STATUS.ITEM_RECEIVED],
  [RETURN_STATUS.RECEIVED]: [RETURN_STATUS.INSPECTED, RETURN_STATUS.REFUND_INITIATED],
  [RETURN_STATUS.ITEM_RECEIVED]: [RETURN_STATUS.INSPECTED],
  [RETURN_STATUS.INSPECTED]: [RETURN_STATUS.REFUND_INITIATED],
  [RETURN_STATUS.REFUND_INITIATED]: [RETURN_STATUS.REFUNDED],
  [RETURN_STATUS.REFUNDED]: [],
  [RETURN_STATUS.REJECTED]: [],
};

export const ACTIVE_RETURN_STATUSES = [
  RETURN_STATUS.RETURN_REQUESTED,
  RETURN_STATUS.UNDER_REVIEW,
  RETURN_STATUS.APPROVED,
  RETURN_STATUS.PICKUP_SCHEDULED,
  RETURN_STATUS.RECEIVED,
  RETURN_STATUS.ITEM_RECEIVED,
  RETURN_STATUS.INSPECTED,
  RETURN_STATUS.REFUND_INITIATED,
  RETURN_STATUS.REFUNDED,
];

export const canTransitionReturn = (current, next) =>
  Boolean(RETURN_TRANSITIONS[current]?.includes(next));

export const nextReturnStatus = (current) => {
  const index = RETURN_JOURNEY.indexOf(current);
  if (index === -1 || index === RETURN_JOURNEY.length - 1) return null;
  return RETURN_JOURNEY[index + 1];
};

export const getReturnStatus = (status) =>
  RETURN_STATUSES[status] ?? RETURN_STATUSES[RETURN_STATUS.RETURN_REQUESTED];

/* ------------------------------------------------------------------ */
/* Return request vocabulary                                           */
/* ------------------------------------------------------------------ */

export const RETURN_REASONS = [
  { id: "wrong_item", label: "Wrong Item" },
  { id: "damaged", label: "Damaged" },
  { id: "size", label: "Size Issue" },
  { id: "quality", label: "Quality Issue" },
  { id: "changed_mind", label: "Changed Mind" },
  { id: "colour", label: "Colour different from expectation" },
  { id: "other", label: "Other" },
];

export const RETURN_RESOLUTIONS = [
  { id: "refund", label: "Refund", description: "Refunded to the original payment method." },
  { id: "exchange", label: "Exchange", description: "Exchanged for another size or colour, subject to availability." },
];

export const getReturnReason = (id) =>
  RETURN_REASONS.find((reason) => reason.id === id) ?? null;

export const getReturnResolution = (id) =>
  RETURN_RESOLUTIONS.find((resolution) => resolution.id === id) ?? null;

export const RETURN_POLICY_SUMMARY =
  "Eligible items can be returned within the applicable return window. Pieces should be unworn, with their original tags and packaging intact.";

/* ------------------------------------------------------------------ */
/* Refund status                                                       */
/* ------------------------------------------------------------------ */

export const REFUND_STATUS = {
  NOT_REQUESTED: "NOT_REQUESTED",
  REQUESTED: "REQUESTED",
  APPROVED: "APPROVED",
  PROCESSING: "PROCESSING",
  REFUNDED: "REFUNDED",
  FAILED: "FAILED",
};

export const REFUND_STATUSES = {
  [REFUND_STATUS.NOT_REQUESTED]: { id: "NOT_REQUESTED", label: "Not Requested", tone: "quiet" },
  [REFUND_STATUS.REQUESTED]: { id: "REQUESTED", label: "Refund Requested", tone: "accent" },
  [REFUND_STATUS.APPROVED]: { id: "APPROVED", label: "Approved", tone: "accent" },
  [REFUND_STATUS.PROCESSING]: { id: "PROCESSING", label: "Processing", tone: "accent" },
  [REFUND_STATUS.REFUNDED]: { id: "REFUNDED", label: "Refunded", tone: "ink" },
  [REFUND_STATUS.FAILED]: { id: "FAILED", label: "Failed", tone: "muted" },
};

/* ------------------------------------------------------------------ */
/* Mock courier vocabulary — Phase 15 uses real Indian carriers as demo */
/* ------------------------------------------------------------------ */

export const MOCK_CARRIERS = [
  "Atelier Express",
  "Meridian Courier",
  "Saffron Logistics",
  "Indus Freight Line",
  "Delhivery",
  "Blue Dart",
  "DTDC",
  "India Post",
  "Store Delivery",
];

export const CARRIERS = [
  { id: "delhivery", label: "Delhivery", demo: true },
  { id: "bluedart", label: "Blue Dart", demo: true },
  { id: "dtdc", label: "DTDC", demo: true },
  { id: "india_post", label: "India Post", demo: true },
  { id: "store_delivery", label: "Store Delivery", demo: true },
  { id: "atelier_express", label: "Atelier Express", demo: true },
];

export const FULFILMENT_ORIGIN = "Bhubaneswar, Odisha";
export const TRACKING_ID_LABEL = "Tracking ID";

/* ------------------------------------------------------------------ */
/* Order activity types                                                */
/* ------------------------------------------------------------------ */

export const ORDER_ACTIVITY_TYPES = {
  ORDER_CREATED: "ORDER_CREATED",
  PAYMENT_CONFIRMED: "PAYMENT_CONFIRMED",
  ORDER_CONFIRMED: "ORDER_CONFIRMED",
  ORDER_ALLOCATED: "ORDER_ALLOCATED",
  ORDER_PICK_STARTED: "ORDER_PICK_STARTED",
  ORDER_ITEM_PICKED: "ORDER_ITEM_PICKED",
  ORDER_PACKED: "ORDER_PACKED",
  ORDER_READY_TO_DISPATCH: "ORDER_READY_TO_DISPATCH",
  ORDER_DISPATCHED: "ORDER_DISPATCHED",
  ORDER_OUT_FOR_DELIVERY: "ORDER_OUT_FOR_DELIVERY",
  ORDER_DELIVERED: "ORDER_DELIVERED",
  ORDER_CANCELLED: "ORDER_CANCELLED",
  RETURN_REQUESTED: "RETURN_REQUESTED",
  REFUND_REQUESTED: "REFUND_REQUESTED",
  REFUND_PROCESSED: "REFUND_PROCESSED",
  NOTE_ADDED: "NOTE_ADDED",
  FULFILLMENT_ASSIGNED: "FULFILLMENT_ASSIGNED",
};

export default {
  ORDER_STATUS,
  ORDER_STATUSES,
  ORDER_JOURNEY,
  CUSTOMER_JOURNEY,
  LEGACY_JOURNEY,
  ORDER_TRANSITIONS,
  ORDER_FILTERS,
  ADMIN_ORDER_FILTERS,
  CANCELLABLE_STATUSES,
  ADMIN_CANCELLABLE_STATUSES,
  RETURNABLE_STATUSES,
  TERMINAL_STATUSES,
  canTransition,
  isValidTransition,
  nextJourneyStatus,
  getOrderStatus,
  FULFILLMENT_STATUS,
  FULFILLMENT_STATUSES,
  getFulfillmentStatus,
  ORDER_PAYMENT_STATUS,
  PAYMENT_STATUSES,
  getPaymentStatus,
  CANCELLATION_REASONS,
  getCancellationReason,
  RETURN_STATUS,
  RETURN_STATUSES,
  RETURN_JOURNEY,
  RETURN_TRANSITIONS,
  ACTIVE_RETURN_STATUSES,
  canTransitionReturn,
  nextReturnStatus,
  getReturnStatus,
  RETURN_REASONS,
  RETURN_RESOLUTIONS,
  RETURN_POLICY_SUMMARY,
  REFUND_STATUS,
  REFUND_STATUSES,
  MOCK_CARRIERS,
  CARRIERS,
  FULFILMENT_ORIGIN,
  TRACKING_ID_LABEL,
  ORDER_ACTIVITY_TYPES,
};
