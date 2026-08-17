/**
 * PRATIKSHYA FASHON — AI assistants, response envelope (Phase 21.1).
 *
 * Every assistant answer leaves the provider as one of these envelopes.
 * The UI renders the envelope, never raw provider internals, so a future
 * real provider only has to honour this shape.
 */

let sequence = 0;

/** Short, collision-safe ids for demo messages. */
export const aiMessageId = (prefix = "ai") => {
  sequence += 1;
  return `${prefix}-${Date.now().toString(36)}-${sequence}`;
};

/* ------------------------------------------------------------------ */
/* Response vocabularies                                               */
/* ------------------------------------------------------------------ */

export const AI_SHOPPING_RESPONSE_TYPES = {
  TEXT: "TEXT",
  PRODUCT_RECOMMENDATIONS: "PRODUCT_RECOMMENDATIONS",
  PRODUCT_COMPARISON: "PRODUCT_COMPARISON",
  OUTFIT_SUGGESTION: "OUTFIT_SUGGESTION",
  PRICE_FILTER: "PRICE_FILTER",
  NO_RESULTS: "NO_RESULTS",
  FOLLOW_UP: "FOLLOW_UP",
  CART_ACTION: "CART_ACTION",
  WISHLIST_ACTION: "WISHLIST_ACTION",
  PRODUCT_CONTEXT: "PRODUCT_CONTEXT",
};

export const AI_BUSINESS_INSIGHT_TYPES = {
  BUSINESS_SUMMARY: "BUSINESS_SUMMARY",
  SALES_INSIGHT: "SALES_INSIGHT",
  PRODUCT_INSIGHT: "PRODUCT_INSIGHT",
  CATEGORY_INSIGHT: "CATEGORY_INSIGHT",
  CUSTOMER_INSIGHT: "CUSTOMER_INSIGHT",
  INVENTORY_INSIGHT: "INVENTORY_INSIGHT",
  RETURN_INSIGHT: "RETURN_INSIGHT",
  OFFER_INSIGHT: "OFFER_INSIGHT",
  FULFILLMENT_INSIGHT: "FULFILLMENT_INSIGHT",
  WORKFORCE_INSIGHT: "WORKFORCE_INSIGHT",
  RECOMMENDATION: "RECOMMENDATION",
  ALERT: "ALERT",
  TREND: "TREND",
  NO_DATA: "NO_DATA",
};

/** Where an insight came from — shown quietly under the answer. */
export const AI_SOURCES = {
  CATALOGUE: "Based on current catalogue data",
  ORDERS: "Based on the latest order activity",
  INVENTORY: "Based on inventory records",
  ANALYTICS_PERIOD: "Based on the selected analytics period",
  RETURNS: "Based on return records",
  OFFERS: "Based on offer activity",
  WORKFORCE: "Based on attendance and performance records",
  CUSTOMERS: "Based on the customer registry",
};

/* ------------------------------------------------------------------ */
/* Builders                                                            */
/* ------------------------------------------------------------------ */

/**
 * The shopping envelope. `products` always carry a human-readable `reason`;
 * the UI never invents one.
 */
export const buildShoppingResponse = ({
  type,
  text,
  products = [],
  outfit = null,
  comparison = null,
  product = null,
  suggestions = [],
  source = AI_SOURCES.CATALOGUE,
  kind = "assistant",
}) => ({
  id: aiMessageId("shop"),
  role: kind,
  assistant: "shopping",
  type,
  text,
  products,
  outfit,
  comparison,
  product,
  suggestions,
  source,
  createdAt: new Date().toISOString(),
});

/** The business envelope: narrative + optional metrics, rows and actions. */
export const buildBusinessResponse = ({
  type,
  headline = "",
  text,
  metrics = [],
  rows = [],
  actions = [],
  suggestions = [],
  periodLabel = "",
  source = AI_SOURCES.ANALYTICS_PERIOD,
}) => ({
  id: aiMessageId("biz"),
  role: "assistant",
  assistant: "business",
  type,
  headline,
  text,
  metrics,
  rows,
  actions,
  suggestions,
  periodLabel,
  source,
  createdAt: new Date().toISOString(),
});

/* ------------------------------------------------------------------ */
/* Privacy guard                                                       */
/* ------------------------------------------------------------------ */

/**
 * Fields only the business assistant may ever carry. The customer shopping
 * envelope is built exclusively through `buildShoppingResponse`, which never
 * sets them — this guard lets tests prove that boundary holds.
 */
export const BUSINESS_ONLY_FIELDS = [
  "revenue",
  "orders",
  "metrics",
  "actions",
  "rows",
  "periodLabel",
  "inventory",
  "employees",
  "attendance",
];

/**
 * Returns a list of violations when a shopping envelope carries business
 * data. An empty list means the customer surface stays clean.
 */
export const auditShoppingResponseForBusinessData = (response) => {
  if (!response || typeof response !== "object") return [];
  const violations = [];
  BUSINESS_ONLY_FIELDS.forEach((field) => {
    const value = response[field];
    if (value === undefined || value === null) return;
    if (Array.isArray(value) && value.length === 0) return;
    if (typeof value === "string" && value === "") return;
    violations.push(field);
  });
  return violations;
};

export default {
  aiMessageId,
  AI_SHOPPING_RESPONSE_TYPES,
  AI_BUSINESS_INSIGHT_TYPES,
  AI_SOURCES,
  buildShoppingResponse,
  buildBusinessResponse,
  auditShoppingResponseForBusinessData,
};
