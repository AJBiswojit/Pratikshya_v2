/**
 * PRATIKSHYA FASHON — AI Business Assistant pure-logic tests (Phase 21.1).
 *
 * Run with `npm test` (node --test). Every insight builder is exercised
 * against a fixture analytics snapshot shaped exactly like the output of
 * the existing `getAnalyticsSnapshot`, proving that the assistant only
 * ever narrates repository truth — and says so when there is none.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  buildBusinessAnswer,
  buildSummaryInsight,
  buildSalesInsight,
  buildProductInsight,
  buildCategoryInsight,
  buildCustomerInsight,
  buildInventoryInsight,
  buildReturnInsight,
  buildOfferInsight,
  buildFulfillmentInsight,
  buildWorkforceInsight,
  buildAttentionInsight,
  canUseBusinessAssistant,
  formatINRCompact,
  resolveBusinessTopic,
} from "../src/services/ai/business/aiBusinessService.js";
import catalogRepository from "../src/services/catalogRepository.js";

const [PRODUCT_A, PRODUCT_B, PRODUCT_C] = catalogRepository.all().slice(0, 3);
assert.ok(PRODUCT_A && PRODUCT_B && PRODUCT_C, "canonical Product fixtures are available");

/* ------------------------------------------------------------------ */
/* Fixture snapshot — same shape as getAnalyticsSnapshot output        */
/* ------------------------------------------------------------------ */

const compared = (current, previous = null) => ({
  current,
  previous,
  change: previous ? Math.round(((current - previous) / previous) * 1000) / 10 : null,
  direction: previous == null ? "flat" : current >= previous ? "up" : "down",
  changeLabel: previous ? `${current >= previous ? "+" : ""}${Math.round(((current - previous) / previous) * 1000) / 10}%` : null,
  comparable: previous != null,
  currency: true,
});

const makeSnapshot = (overrides = {}) => ({
  period: { preset: "TODAY", presetLabel: "Today", start: "2026-08-12", end: "2026-08-12" },
  overview: {
    revenue: compared(184000, 150000),
    orders: compared(27, 22),
    aov: compared(6815),
    customers: compared(19),
    newCustomers: compared(4),
    returningCustomers: compared(15),
    unitsSold: compared(41),
    returns: compared(3),
    refunds: compared(2500),
    gross: 190000,
    discounts: 6000,
    eligibleOrders: 27,
  },
  orders: { total: 30, eligible: 27, cancelled: 2, returned: 1, refunded: 1, hasData: true },
  categories: [
    { id: "sarees", label: "Sarees", revenue: 84600, unitsSold: 9, orders: 9, returnUnits: 1 },
    { id: "lehengas", label: "Lehengas", revenue: 62000, unitsSold: 2, orders: 2, returnUnits: 0 },
  ],
  products: {
    hasData: true,
    sold: [
      { productId: PRODUCT_A.id, name: PRODUCT_A.name, revenue: 37000, unitsSold: 2, orders: 2, returnUnits: 0 },
      { productId: PRODUCT_B.id, name: PRODUCT_B.name, revenue: 42000, unitsSold: 1, orders: 1, returnUnits: 2 },
    ],
    topByRevenue: [
      { productId: PRODUCT_B.id, name: PRODUCT_B.name, revenue: 42000, unitsSold: 1, orders: 1, returnUnits: 2 },
      { productId: PRODUCT_A.id, name: PRODUCT_A.name, revenue: 37000, unitsSold: 2, orders: 2, returnUnits: 0 },
    ],
    topByUnits: [
      { productId: PRODUCT_A.id, name: PRODUCT_A.name, revenue: 37000, unitsSold: 2, orders: 2, returnUnits: 0 },
    ],
  },
  customers: {
    total: 214,
    newCustomers: 4,
    returningCustomers: 15,
    activeCustomers: 19,
    highValueCustomers: 11,
    averageSpend: 9684,
    top: [
      { id: "cus-1", name: "Ananya Das", email: "ananya@example.com", periodSpend: 42000, periodOrders: 2 },
    ],
    hasData: true,
    hasPeriodActivity: true,
  },
  inventory: {
    hasData: true,
    totalOnHand: 642,
    available: 590,
    reserved: 12,
    lowStock: 3,
    outOfStock: 1,
    retailValue: 5240000,
    lowStockRows: [
      { id: "inv-1", productId: PRODUCT_C.id, product: PRODUCT_C.name, sku: PRODUCT_C.sku, available: 1, threshold: 4, location: "Main Warehouse", status: "LOW_STOCK" },
      { id: "inv-2", productId: PRODUCT_B.id, product: PRODUCT_B.name, sku: PRODUCT_B.sku, available: 2, threshold: 5, location: "Boutique Floor", status: "LOW_STOCK" },
    ],
  },
  returns: {
    hasData: true,
    returnRequests: 3,
    returnRate: 11.1,
    refundValue: 2500,
    refunded: 1,
    averageReturnValue: 8333,
    pendingReview: 2,
    reasons: [{ id: "size-fit", label: "Size & fit", count: 2, percentage: 66.7 }],
  },
  offers: {
    hasData: true,
    byRedemptions: [
      { id: "off-1", name: "Festive Silk Offer", code: "SILK10", redemptions: 9, revenue: 96000, discount: 9600 },
    ],
  },
  fulfillment: {
    pipeline: [
      { id: "processing", label: "Processing", count: 4 },
      { id: "ready", label: "Ready to Dispatch", count: 8 },
      { id: "shipped", label: "Shipped", count: 6 },
    ],
    bottleneck: { id: "ready", label: "Ready to Dispatch", count: 8 },
    averageFulfillmentHours: 6.2,
    averageDispatchHours: 11.4,
    averageDeliveryHours: 64.3,
    hasDurations: true,
  },
  employees: {
    employees: 14,
    attendancePercent: 93,
    present: 118,
    late: 4,
    absent: 6,
    leave: 3,
    performancePercent: 81,
    targetAchievement: 87.4,
    ordersAssisted: 31,
    customersServed: 52,
    topPerformers: [{ name: "Meera Behera", targetPercent: 96 }],
    needsAttention: [{ name: "Ravi Sahu", targetPercent: 48 }],
    hasAttendance: true,
    hasPerformance: true,
  },
  ...overrides,
});

const ACCESS = { isAuthenticated: true, isSuperAdmin: true };

/* ------------------------------------------------------------------ */
/* Access control                                                      */
/* ------------------------------------------------------------------ */

test("business assistant access follows the existing admin authorization", () => {
  assert.equal(canUseBusinessAssistant({ isAuthenticated: true, isSuperAdmin: true }), true);
  assert.equal(canUseBusinessAssistant({ isAuthenticated: true, isSuperAdmin: false }), false);
  assert.equal(canUseBusinessAssistant({ isAuthenticated: false, isSuperAdmin: true }), false);
  assert.equal(canUseBusinessAssistant({}), false);

  const denied = buildBusinessAnswer({
    question: "Give me today's business summary",
    snapshot: makeSnapshot(),
    access: { isAuthenticated: true, isSuperAdmin: false },
  });
  assert.match(denied.text, /authorised administration/i);
});

/* ------------------------------------------------------------------ */
/* Question routing                                                    */
/* ------------------------------------------------------------------ */

test("business questions route to the right insight topic", () => {
  assert.equal(resolveBusinessTopic("Give me today's business summary."), "SUMMARY");
  assert.equal(resolveBusinessTopic("How are sales performing this month?"), "SALES");
  assert.equal(resolveBusinessTopic("Which products are selling the most?"), "PRODUCTS");
  assert.equal(resolveBusinessTopic("Which category generates the most revenue?"), "CATEGORIES");
  assert.equal(resolveBusinessTopic("Which products are low in stock?"), "INVENTORY");
  assert.equal(resolveBusinessTopic("Which products have high returns?"), "RETURNS");
  assert.equal(resolveBusinessTopic("Which offers are performing best?"), "OFFERS");
  assert.equal(resolveBusinessTopic("How many orders are currently delayed?"), "FULFILLMENT");
  assert.equal(resolveBusinessTopic("Which customers are high value?"), "CUSTOMERS");
  assert.equal(resolveBusinessTopic("How is attendance this month?"), "WORKFORCE");
  assert.equal(resolveBusinessTopic("Which products should I restock?"), "RESTOCK");
  assert.equal(resolveBusinessTopic("What should I focus on today?"), "ATTENTION");
  assert.equal(resolveBusinessTopic("tell me a poem"), "UNCLEAR");
});

/* ------------------------------------------------------------------ */
/* Numbers originate from the snapshot — never invented                */
/* ------------------------------------------------------------------ */

test("INR narration uses lakh/crore shorthand", () => {
  assert.equal(formatINRCompact(184000), "₹1.84 lakh");
  assert.equal(formatINRCompact(25000000), "₹2.5 crore");
  assert.equal(formatINRCompact(9500), "₹9,500");
});

test("the business summary narrates only repository figures", () => {
  const snapshot = makeSnapshot();
  const insight = buildSummaryInsight(snapshot);
  assert.equal(insight.type, "BUSINESS_SUMMARY");
  assert.ok(insight.text.includes(formatINRCompact(snapshot.overview.revenue.current)));
  assert.ok(insight.text.includes("27 orders"));
  /* Top category share computed from fixture numbers: 84600 / 184000. */
  assert.ok(insight.text.includes("Sarees"));
  assert.ok(insight.text.includes(`${Math.round((84600 / 184000) * 100)}%`));
  assert.ok(insight.text.includes("3 products are below the configured stock threshold"));
  assert.ok(insight.text.includes("Ready to Dispatch"));
  assert.equal(insight.metrics[0].value, "₹1.84 lakh");
  assert.equal(insight.metrics[1].value, 27);
});

test("the sales insight quotes the snapshot's revenue, AOV and units", () => {
  const snapshot = makeSnapshot();
  const insight = buildSalesInsight(snapshot);
  assert.equal(insight.type, "SALES_INSIGHT");
  assert.ok(insight.text.includes(formatINRCompact(snapshot.overview.revenue.current)));
  assert.ok(insight.text.includes(formatINRCompact(snapshot.overview.aov.current)));
  assert.ok(insight.text.includes("41"));
  assert.equal(insight.metrics[0].value, "₹1.84 lakh");
});

test("the product insight names the fixture's top revenue piece", () => {
  const insight = buildProductInsight(makeSnapshot());
  assert.equal(insight.type, "PRODUCT_INSIGHT");
  assert.ok(insight.text.includes(PRODUCT_B.name));
  assert.ok(insight.text.includes(formatINRCompact(42000)));
  assert.ok(insight.text.includes("2 returned units") || insight.text.includes("2 returned unit"));
});

test("the category insight computes share from fixture revenue", () => {
  const insight = buildCategoryInsight(makeSnapshot());
  assert.equal(insight.type, "CATEGORY_INSIGHT");
  assert.ok(insight.text.includes("Sarees"));
  const total = 84600 + 62000;
  assert.ok(insight.text.includes(`${Math.round((84600 / total) * 100)}%`));
});

test("customer insight exposes names and aggregates but never contact details", () => {
  const snapshot = makeSnapshot();
  const insight = buildCustomerInsight(snapshot);
  assert.equal(insight.type, "CUSTOMER_INSIGHT");
  assert.ok(insight.text.includes("Ananya Das"));
  assert.ok(insight.text.includes(formatINRCompact(42000)));
  assert.ok(!insight.text.includes("ananya@example.com"), "email must stay out of the conversation");
  assert.ok(!JSON.stringify(insight).includes("ananya@example.com"), "email must stay out of the envelope");
});

test("inventory insight lists low-stock rows straight from the register", () => {
  const snapshot = makeSnapshot();
  const insight = buildInventoryInsight(snapshot);
  assert.equal(insight.type, "INVENTORY_INSIGHT");
  assert.equal(insight.metrics[1].value, 3);
  assert.equal(insight.metrics[2].value, 1);
  assert.equal(insight.rows.length, 2);
  assert.equal(insight.rows[0].label, PRODUCT_C.name);
  assert.equal(insight.rows[0].value, "1 left");

  const restock = buildInventoryInsight(snapshot, { restock: true });
  assert.equal(restock.type, "RECOMMENDATION");
});

test("return insight carries request counts, reasons and pending reviews", () => {
  const snapshot = makeSnapshot();
  const insight = buildReturnInsight(snapshot);
  assert.equal(insight.type, "RETURN_INSIGHT");
  assert.ok(insight.text.includes("3 return requests"));
  assert.ok(insight.text.includes("Size & fit"));
  assert.equal(insight.metrics[0].value, 3);
  assert.equal(insight.metrics[3].value, 2);
});

test("offer insight names the fixture's strongest offer and code", () => {
  const insight = buildOfferInsight(makeSnapshot());
  assert.equal(insight.type, "OFFER_INSIGHT");
  assert.ok(insight.text.includes("Festive Silk Offer"));
  assert.ok(insight.text.includes("SILK10"));
  assert.ok(insight.text.includes("9"));
});

test("fulfillment insight reports pipeline queues and durations from orders", () => {
  const insight = buildFulfillmentInsight(makeSnapshot());
  assert.equal(insight.type, "FULFILLMENT_INSIGHT");
  assert.ok(insight.text.includes("Ready to Dispatch"));
  assert.ok(insight.text.includes("8"));
  assert.ok(insight.text.includes("6.2"));
});

test("workforce insight quotes attendance and performance registers", () => {
  const insight = buildWorkforceInsight(makeSnapshot());
  assert.equal(insight.type, "WORKFORCE_INSIGHT");
  assert.ok(insight.text.includes("93%"));
  assert.ok(insight.text.includes("Meera Behera"));
  assert.ok(insight.text.includes("Ravi Sahu"));
});

test("attention insight escalates only the fixture's real alerts", () => {
  const insight = buildAttentionInsight(makeSnapshot());
  assert.equal(insight.type, "ALERT");
  assert.ok(insight.text.includes("out of stock"));
  assert.ok(insight.text.includes("Ready to Dispatch"));
  assert.ok(insight.text.includes("returns await"));
});

/* ------------------------------------------------------------------ */
/* Insufficient data is said, never covered up                         */
/* ------------------------------------------------------------------ */

test("empty periods answer with NO_DATA instead of invented numbers", () => {
  const empty = makeSnapshot({
    overview: {
      revenue: compared(0), orders: compared(0), aov: compared(0), customers: compared(0),
      newCustomers: compared(0), returningCustomers: compared(0), unitsSold: compared(0),
      returns: compared(0), refunds: compared(0), gross: 0, discounts: 0, eligibleOrders: 0,
    },
    orders: { total: 0, eligible: 0, cancelled: 0, returned: 0, refunded: 0, hasData: false },
    categories: [],
    products: { hasData: false, sold: [], topByRevenue: [], topByUnits: [] },
    returns: { hasData: false, returnRequests: 0, reasons: [] },
    offers: { hasData: false, byRedemptions: [] },
  });

  assert.equal(buildSummaryInsight(empty).type, "NO_DATA");
  assert.equal(buildSalesInsight(empty).type, "NO_DATA");
  assert.equal(buildProductInsight(empty).type, "NO_DATA");
  assert.equal(buildReturnInsight(empty).type, "NO_DATA");
  assert.equal(buildOfferInsight(empty).type, "NO_DATA");
  assert.match(buildSalesInsight(empty).text, /Not enough data/i);
});

/* ------------------------------------------------------------------ */
/* End-to-end orchestration                                            */
/* ------------------------------------------------------------------ */

test("buildBusinessAnswer routes a full question to the matching insight", () => {
  const response = buildBusinessAnswer({
    question: "Which products are low in stock?",
    snapshot: makeSnapshot(),
    access: ACCESS,
  });
  assert.equal(response.type, "INVENTORY_INSIGHT");
  assert.ok(response.actions.some((action) => action.to === "/admin/inventory/low-stock"));
});

test("unmapped questions ask for direction instead of guessing", () => {
  const response = buildBusinessAnswer({
    question: "tell me a poem about silk",
    snapshot: makeSnapshot(),
    access: ACCESS,
  });
  assert.equal(response.type, "NO_DATA");
  assert.match(response.text, /sales, products, categories/i);
});
