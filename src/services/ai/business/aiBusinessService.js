/**
 * PRATIKSHYA FASHON — AI Business Assistant intelligence (Phase 21.1).
 *
 * The assistant behaves like a business analyst: it reads the existing
 * analytics snapshot (which itself reads the order, catalogue, inventory,
 * returns, offers, customer and workforce repositories) and narrates what
 * it finds. It never invents a number — when the repositories have
 * nothing to say, the answer says exactly that.
 *
 * Every builder here is a pure function of the analytics snapshot, so the
 * logic is fully testable with fixtures and the UI can never drift away
 * from the repository truth.
 */

import { normaliseText } from "../shared/aiIntentResolver.js";
import {
  AI_BUSINESS_INSIGHT_TYPES as TYPES,
  AI_SOURCES,
  buildBusinessResponse,
} from "../shared/aiResponseBuilder.js";
import {
  AI_BUSINESS_ACTIONS as ACTIONS,
  AI_BUSINESS_COPY as COPY,
  AI_BUSINESS_SUGGESTIONS as SUGGESTIONS,
} from "./aiBusinessMockData.js";

/* ------------------------------------------------------------------ */
/* Access control                                                      */
/* ------------------------------------------------------------------ */

/**
 * The Business Assistant sits behind the existing Admin boundary. This
 * guard mirrors `AdminProtectedRoute` so the service itself can refuse a
 * caller even if a UI forgets to.
 */
export const canUseBusinessAssistant = ({ isSuperAdmin = false, isAuthenticated = true } = {}) =>
  Boolean(isAuthenticated && isSuperAdmin);

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

/** Compact INR for narrative sentences: ₹1.84 lakh, ₹2.5 crore, ₹9,500. */
export const formatINRCompact = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  const trim = (number) =>
    number.toFixed(2).replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
  if (Math.abs(amount) >= 10000000) {
    return `₹${trim(amount / 10000000)} crore`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${trim(amount / 100000)} lakh`;
  }
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
};

export const formatCount = (value, singular, plural) => {
  const count = Number(value) || 0;
  return `${count} ${count === 1 ? singular : plural}`;
};

const percentLabel = (value) => (value == null ? null : `${value}%`);

/* ------------------------------------------------------------------ */
/* Topic resolution                                                    */
/* ------------------------------------------------------------------ */

export const BUSINESS_TOPICS = {
  SUMMARY: "SUMMARY",
  SALES: "SALES",
  PRODUCTS: "PRODUCTS",
  CATEGORIES: "CATEGORIES",
  CUSTOMERS: "CUSTOMERS",
  INVENTORY: "INVENTORY",
  RESTOCK: "RESTOCK",
  RETURNS: "RETURNS",
  OFFERS: "OFFERS",
  FULFILLMENT: "FULFILLMENT",
  WORKFORCE: "WORKFORCE",
  ATTENTION: "ATTENTION",
  UNCLEAR: "UNCLEAR",
};

/** Deterministic question → topic matching. */
export const resolveBusinessTopic = (rawText) => {
  const flat = normaliseText(rawText);
  if (!flat) return BUSINESS_TOPICS.UNCLEAR;

  const rules = [
    { topic: BUSINESS_TOPICS.RESTOCK, patterns: ["restock", "replenish", "reorder"] },
    { topic: BUSINESS_TOPICS.ATTENTION, patterns: ["focus on", "needs attention", "need attention", "priorit", "what should i do", "where should i"] },
    { topic: BUSINESS_TOPICS.SUMMARY, patterns: ["summary", "overview", "how is the business", "how is business", "today s business", "recap", "status of the business", "daily report"] },
    { topic: BUSINESS_TOPICS.RETURNS, patterns: ["return", "returns", "refund", "refunds", "exchanged"] },
    { topic: BUSINESS_TOPICS.OFFERS, patterns: ["offer", "offers", "coupon", "promo", "discount code", "campaign"] },
    { topic: BUSINESS_TOPICS.INVENTORY, patterns: ["stock", "inventory", "low in stock", "out of stock", "warehouse"] },
    { topic: BUSINESS_TOPICS.FULFILLMENT, patterns: ["fulfil", "fulfill", "dispatch", "delayed", "delivery performance", "shipping", "queue", "packed", "picked"] },
    { topic: BUSINESS_TOPICS.CUSTOMERS, patterns: ["customer", "customers", "high value", "repeat purchase", "retention", "shoppers", "clients"] },
    { topic: BUSINESS_TOPICS.WORKFORCE, patterns: ["attendance", "employee", "employees", "staff", "workforce", "performing strongly", "team performance", "absent", "present", "leave"] },
    { topic: BUSINESS_TOPICS.CATEGORIES, patterns: ["category", "categories", "segment generates", "which category"] },
    { topic: BUSINESS_TOPICS.PRODUCTS, patterns: ["product", "products", "selling the most", "top seller", "best selling", "pieces are selling", "which piece"] },
    { topic: BUSINESS_TOPICS.SALES, patterns: ["sales", "revenue", "turnover", "selling", "business performance", "aov", "average order"] },
  ];

  for (const rule of rules) {
    if (rule.patterns.some((pattern) => flat.includes(pattern))) return rule.topic;
  }
  return BUSINESS_TOPICS.UNCLEAR;
};

/* ------------------------------------------------------------------ */
/* Insight builders — all figures come from the snapshot               */
/* ------------------------------------------------------------------ */

const metric = (label, value, hint = "", tone = "default") => ({ label, value, hint, tone });

const periodName = (snapshot) => snapshot?.period?.presetLabel || "the selected period";

export const buildSummaryInsight = (snapshot) => {
  const { overview, categories, inventory, fulfillment, returns } = snapshot;
  if (!overview || (!overview.eligibleOrders && !snapshot.orders?.total)) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No activity in this period",
      text: COPY.noDataPeriod(periodName(snapshot)),
      actions: [ACTIONS.orders, ACTIONS.analytics],
      suggestions: SUGGESTIONS.summary,
      periodLabel: periodName(snapshot),
    });
  }

  const topCategory = categories?.[0] ?? null;
  const categoryShare =
    topCategory && overview.revenue?.current
      ? Math.round((topCategory.revenue / overview.revenue.current) * 100)
      : null;

  const lowStockCount = inventory?.lowStock ?? 0;
  const outOfStock = inventory?.outOfStock ?? 0;
  const bottleneck = fulfillment?.bottleneck ?? null;
  const returnRequests = returns?.returnRequests ?? 0;

  const paragraphs = [
    `${periodName(snapshot)}: revenue stands at ${formatINRCompact(overview.revenue?.current)} across ${formatCount(overview.orders?.current, "order", "orders")}, with an average order value of ${formatINRCompact(overview.aov?.current)}.`,
  ];
  if (topCategory) {
    paragraphs.push(
      `The strongest category is ${topCategory.label}${categoryShare != null ? `, contributing ${categoryShare}% of period revenue` : ""}.`
    );
  }
  if (lowStockCount + outOfStock > 0) {
    paragraphs.push(
      `${formatCount(lowStockCount, "product is", "products are")} below the configured stock threshold${outOfStock ? `, and ${formatCount(outOfStock, "is", "are")} out of stock entirely` : ""}.`
    );
  }
  if (bottleneck) {
    paragraphs.push(
      `The largest operational concern is the ${bottleneck.label} queue, which holds ${formatCount(bottleneck.count, "order", "orders")}.`
    );
  }
  if (returnRequests > 0) {
    paragraphs.push(`${formatCount(returnRequests, "return request", "return requests")} were raised in this period.`);
  }
  paragraphs.push(
    `Recommended action: ${bottleneck ? "review the dispatch queue" : "keep the fulfillment pipeline moving"}${lowStockCount ? " and replenish the low-stock pieces before they stall sales" : ""}.`
  );

  return buildBusinessResponse({
    type: TYPES.BUSINESS_SUMMARY,
    headline: `Business summary — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Revenue", formatINRCompact(overview.revenue?.current), overview.revenue?.changeLabel || ""),
      metric("Orders", overview.orders?.current ?? 0, `${overview.unitsSold?.current ?? 0} units sold`),
      metric("Avg order value", formatINRCompact(overview.aov?.current), ""),
      metric("Returns", returnRequests, returns?.returnRate != null ? `${returns.returnRate}% of orders` : ""),
    ],
    actions: [ACTIONS.orders, ACTIONS.analytics, ...(lowStockCount ? [ACTIONS.lowStock] : [])],
    suggestions: SUGGESTIONS.summary,
    periodLabel: periodName(snapshot),
  });
};

export const buildSalesInsight = (snapshot) => {
  const { overview, sales } = snapshot;
  if (!overview?.eligibleOrders) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No sales in this period",
      text: COPY.noDataPeriod(periodName(snapshot)),
      actions: [ACTIONS.orders, ACTIONS.analytics],
      suggestions: SUGGESTIONS.sales,
      periodLabel: periodName(snapshot),
    });
  }

  const paragraphs = [
    `Revenue for ${periodName(snapshot)} is ${formatINRCompact(overview.revenue?.current)} from ${formatCount(overview.orders?.current, "eligible order", "eligible orders")} (gross ${formatINRCompact(sales?.gross ?? overview.revenue?.current)}, discounts ${formatINRCompact(sales?.discounts ?? 0)}).`,
  ];
  if (overview.revenue?.comparable && overview.revenue.change != null) {
    paragraphs.push(
      `That is ${overview.revenue.direction === "down" ? "down" : "up"} ${Math.abs(overview.revenue.change)}% against the previous period (${formatINRCompact(overview.revenue.previous)}).`
    );
  }
  paragraphs.push(
    `Average order value sits at ${formatINRCompact(overview.aov?.current)}, with ${formatCount(overview.unitsSold?.current, "unit", "units")} sold and refunds of ${formatINRCompact(overview.refunds?.current ?? 0)}.`
  );
  if (sales?.hasData && Array.isArray(sales.series) && sales.series.length > 1) {
    const best = [...sales.series].sort((a, b) => b.revenue - a.revenue)[0];
    if (best?.revenue > 0) {
      paragraphs.push(`The strongest ${sales.granularity === "DAILY" ? "day" : sales.granularity === "WEEKLY" ? "week" : "month"} in the window was ${best.label} at ${formatINRCompact(best.revenue)}.`);
    }
  }

  return buildBusinessResponse({
    type: TYPES.SALES_INSIGHT,
    headline: `Sales performance — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Revenue", formatINRCompact(overview.revenue?.current), overview.revenue?.changeLabel || ""),
      metric("Orders", overview.orders?.current ?? 0, ""),
      metric("AOV", formatINRCompact(overview.aov?.current), ""),
      metric("Units sold", overview.unitsSold?.current ?? 0, ""),
    ],
    actions: [ACTIONS.orders, ACTIONS.analytics],
    suggestions: SUGGESTIONS.sales,
    periodLabel: periodName(snapshot),
  });
};

export const buildProductInsight = (snapshot) => {
  const products = snapshot.products;
  if (!products?.hasData) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No product sales in this period",
      text: COPY.noDataPeriod(periodName(snapshot)),
      actions: [ACTIONS.products, ACTIONS.analytics],
      suggestions: SUGGESTIONS.products,
      periodLabel: periodName(snapshot),
    });
  }

  const topRevenue = products.topByRevenue?.[0];
  const topUnits = products.topByUnits?.[0];
  const paragraphs = [
    topRevenue
      ? `${topRevenue.name} leads on revenue with ${formatINRCompact(topRevenue.revenue)} across ${formatCount(topRevenue.orders, "order", "orders")}.`
      : "Product sales are spread evenly in this period.",
  ];
  if (topUnits && topUnits.productId !== topRevenue?.productId) {
    paragraphs.push(`By units, ${topUnits.name} moves the most — ${formatCount(topUnits.unitsSold, "unit", "units")} sold.`);
  }
  const highReturn = products.sold?.filter((row) => row.returnUnits > 0).sort((a, b) => b.returnUnits - a.returnUnits)[0];
  if (highReturn) {
    paragraphs.push(`${highReturn.name} also carries the heaviest return load (${formatCount(highReturn.returnUnits, "returned unit", "returned units")}).`);
  }

  return buildBusinessResponse({
    type: TYPES.PRODUCT_INSIGHT,
    headline: `Top products — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    rows: (products.topByRevenue || []).slice(0, 5).map((row) => ({
      label: row.name,
      value: formatINRCompact(row.revenue),
      detail: `${row.unitsSold} units · ${row.orders} orders${row.returnUnits ? ` · ${row.returnUnits} returned` : ""}`,
    })),
    actions: [ACTIONS.products, ACTIONS.analytics],
    suggestions: SUGGESTIONS.products,
    periodLabel: periodName(snapshot),
  });
};

export const buildCategoryInsight = (snapshot) => {
  const categories = snapshot.categories;
  if (!Array.isArray(categories) || !categories.length) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No category sales in this period",
      text: COPY.noDataPeriod(periodName(snapshot)),
      actions: [ACTIONS.analytics],
      suggestions: SUGGESTIONS.sales,
      periodLabel: periodName(snapshot),
    });
  }

  const total = categories.reduce((sum, row) => sum + row.revenue, 0);
  const leader = categories[0];
  const share = total ? Math.round((leader.revenue / total) * 100) : null;

  return buildBusinessResponse({
    type: TYPES.CATEGORY_INSIGHT,
    headline: `Category performance — ${periodName(snapshot)}`,
    text: `${leader.label} generates the most revenue in ${periodName(snapshot)}${share != null ? ` — ${formatINRCompact(leader.revenue)}, ${share}% of the total` : ""}. ` +
      (categories[1] ? `${categories[1].label} follows at ${formatINRCompact(categories[1].revenue)}.` : ""),
    rows: categories.slice(0, 5).map((row) => ({
      label: row.label,
      value: formatINRCompact(row.revenue),
      detail: `${row.unitsSold} units · ${row.orders} orders`,
    })),
    actions: [ACTIONS.analytics, ACTIONS.products],
    suggestions: SUGGESTIONS.sales,
    periodLabel: periodName(snapshot),
  });
};

export const buildCustomerInsight = (snapshot) => {
  const customers = snapshot.customers;
  if (!customers?.hasData) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No customer data",
      text: COPY.noData,
      actions: [ACTIONS.customers],
      suggestions: SUGGESTIONS.customers,
      periodLabel: periodName(snapshot),
    });
  }

  const paragraphs = [
    `The registry holds ${formatCount(customers.total, "customer", "customers")}. In ${periodName(snapshot)}, ${formatCount(customers.activeCustomers, "customer", "customers")} ordered (${formatCount(customers.newCustomers, "new", "new")}, ${formatCount(customers.returningCustomers, "returning", "returning")}).`,
  ];
  if (customers.highValueCustomers) {
    paragraphs.push(`${formatCount(customers.highValueCustomers, "customer sits", "customers sit")} in the high-value segment (lifetime spend above the house threshold).`);
  }
  const top = customers.top?.[0];
  if (top?.periodSpend) {
    /* Names only — private contact details never enter the conversation. */
    paragraphs.push(`${top.name} leads this period at ${formatINRCompact(top.periodSpend)} across ${formatCount(top.periodOrders, "order", "orders")}.`);
  }

  return buildBusinessResponse({
    type: TYPES.CUSTOMER_INSIGHT,
    headline: `Customers — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Active customers", customers.activeCustomers ?? 0, `${customers.newCustomers ?? 0} new · ${customers.returningCustomers ?? 0} returning`),
      metric("High value", customers.highValueCustomers ?? 0, "lifetime spend threshold"),
      metric("Avg period spend", formatINRCompact(customers.averageSpend ?? 0), ""),
    ],
    actions: [ACTIONS.customers],
    suggestions: SUGGESTIONS.customers,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.CUSTOMERS,
  });
};

export const buildInventoryInsight = (snapshot, { restock = false } = {}) => {
  const inventory = snapshot.inventory;
  if (!inventory?.hasData) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No inventory records",
      text: COPY.noData,
      actions: [ACTIONS.inventory],
      suggestions: SUGGESTIONS.inventory,
      periodLabel: periodName(snapshot),
      source: AI_SOURCES.INVENTORY,
    });
  }

  const lowRows = inventory.lowStockRows || [];
  const paragraphs = [
    `On hand today: ${formatCount(inventory.totalOnHand, "unit", "units")} across locations, of which ${formatCount(inventory.available, "is", "are")} available for sale (${formatCount(inventory.reserved, "unit", "units")} reserved against orders).`,
  ];
  if (lowRows.length) {
    paragraphs.push(
      `${formatCount(inventory.lowStock, "product is", "products are")} below threshold and ${formatCount(inventory.outOfStock, "is", "are")} out of stock. ${restock ? "Restock candidates, lowest cover first:" : "Lowest cover first:"}`
    );
  } else if (inventory.lowStock + inventory.outOfStock === 0) {
    paragraphs.push("Every tracked product currently sits at or above its stock threshold — no replenishment is needed right now.");
  }

  return buildBusinessResponse({
    type: restock ? TYPES.RECOMMENDATION : TYPES.INVENTORY_INSIGHT,
    headline: restock ? "Restock recommendations" : `Inventory health`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Units on hand", inventory.totalOnHand ?? 0, `${inventory.available ?? 0} available`),
      metric("Low stock", inventory.lowStock ?? 0, "below threshold", lowRows.length ? "alert" : "default"),
      metric("Out of stock", inventory.outOfStock ?? 0, "", inventory.outOfStock ? "alert" : "default"),
      metric("Retail value", formatINRCompact(inventory.retailValue ?? 0), ""),
    ],
    rows: lowRows.slice(0, 6).map((row) => ({
      label: row.product || row.sku,
      value: `${row.available} left`,
      detail: `threshold ${row.threshold} · ${row.location}`,
    })),
    actions: lowRows.length ? [ACTIONS.lowStock, ACTIONS.inventory] : [ACTIONS.inventory],
    suggestions: SUGGESTIONS.inventory,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.INVENTORY,
  });
};

export const buildReturnInsight = (snapshot) => {
  const returns = snapshot.returns;
  if (!returns?.hasData) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No returns in this period",
      text: `No return requests were raised in ${periodName(snapshot).toLowerCase()} — nothing needs review.`,
      actions: [ACTIONS.returns],
      suggestions: SUGGESTIONS.returns,
      periodLabel: periodName(snapshot),
      source: AI_SOURCES.RETURNS,
    });
  }

  const topReason = returns.reasons?.[0] ?? null;
  const highReturnProduct = (snapshot.products?.sold || [])
    .filter((row) => row.returnUnits > 0)
    .sort((a, b) => b.returnUnits - a.returnUnits)[0];

  const paragraphs = [
    `${formatCount(returns.returnRequests, "return request", "return requests")} in ${periodName(snapshot)} — a ${percentLabel(returns.returnRate) ?? "—"} return rate against period orders, with refunds of ${formatINRCompact(returns.refundValue)} processed.`,
  ];
  if (topReason) {
    paragraphs.push(`The most common reason is “${topReason.label}” (${formatCount(topReason.count, "request", "requests")}${topReason.percentage != null ? `, ${topReason.percentage}%` : ""}).`);
  }
  if (highReturnProduct) {
    paragraphs.push(`${highReturnProduct.name} accounts for the most returned units (${highReturnProduct.returnUnits}) — worth a quality and sizing look.`);
  }
  if (returns.pendingReview) {
    paragraphs.push(`${formatCount(returns.pendingReview, "request is", "requests are")} still awaiting review.`);
  }

  return buildBusinessResponse({
    type: TYPES.RETURN_INSIGHT,
    headline: `Returns — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Return requests", returns.returnRequests ?? 0, percentLabel(returns.returnRate) ? `${returns.returnRate}% of orders` : ""),
      metric("Refunded", formatINRCompact(returns.refundValue ?? 0), `${returns.refunded ?? 0} refunds completed`),
      metric("Avg return value", formatINRCompact(returns.averageReturnValue ?? 0), ""),
      metric("Awaiting review", returns.pendingReview ?? 0, "", returns.pendingReview ? "alert" : "default"),
    ],
    rows: (returns.reasons || []).slice(0, 4).map((reason) => ({
      label: reason.label,
      value: `${reason.count}`,
      detail: reason.percentage != null ? `${reason.percentage}% of requests` : "",
    })),
    actions: [ACTIONS.returns],
    suggestions: SUGGESTIONS.returns,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.RETURNS,
  });
};

export const buildOfferInsight = (snapshot) => {
  const offers = snapshot.offers;
  if (!offers?.hasData) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No offer redemptions",
      text: `No offer was redeemed in ${periodName(snapshot).toLowerCase()}. Active codes may need visibility, or the calendar may simply be quiet.`,
      actions: [ACTIONS.offers],
      suggestions: SUGGESTIONS.offers,
      periodLabel: periodName(snapshot),
      source: AI_SOURCES.OFFERS,
    });
  }

  const leader = offers.byRedemptions?.[0];
  const revenueLeader = offers.byRevenue?.[0];
  const paragraphs = [
    leader
      ? `${leader.name} (${leader.code}) is the strongest performer — ${formatCount(leader.redemptions, "redemption", "redemptions")} contributing ${formatINRCompact(leader.revenue)} in revenue against ${formatINRCompact(leader.discount)} of discount given.`
      : "Offers are active but none stands out yet.",
  ];
  if (revenueLeader && revenueLeader.id !== leader?.id) {
    paragraphs.push(`By revenue, ${revenueLeader.name} contributes ${formatINRCompact(revenueLeader.revenue)}.`);
  }

  return buildBusinessResponse({
    type: TYPES.OFFER_INSIGHT,
    headline: `Offer performance — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    rows: (offers.byRedemptions || []).slice(0, 5).map((row) => ({
      label: `${row.name} (${row.code})`,
      value: `${row.redemptions} uses`,
      detail: `${formatINRCompact(row.revenue)} revenue · ${formatINRCompact(row.discount)} discount`,
    })),
    actions: [ACTIONS.offers],
    suggestions: SUGGESTIONS.offers,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.OFFERS,
  });
};

export const buildFulfillmentInsight = (snapshot) => {
  const fulfillment = snapshot.fulfillment;
  if (!fulfillment) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No fulfillment data",
      text: COPY.noData,
      actions: [ACTIONS.orders],
      suggestions: SUGGESTIONS.fulfillment,
      periodLabel: periodName(snapshot),
      source: AI_SOURCES.ORDERS,
    });
  }

  const activeStages = (fulfillment.pipeline || []).filter((stage) => stage.count > 0);
  const paragraphs = [];
  if (activeStages.length) {
    paragraphs.push(
      `The pipeline currently holds: ${activeStages.map((stage) => `${stage.label} ${stage.count}`).join(" · ")}.`
    );
  } else {
    paragraphs.push("The fulfillment pipeline is clear — no order is waiting on the floor.");
  }
  if (fulfillment.bottleneck) {
    paragraphs.push(`The slowest stage is ${fulfillment.bottleneck.label} with ${formatCount(fulfillment.bottleneck.count, "order", "orders")} waiting.`);
  }
  if (fulfillment.hasDurations) {
    const durations = [
      fulfillment.averageFulfillmentHours != null ? `pack in ~${fulfillment.averageFulfillmentHours}h` : null,
      fulfillment.averageDispatchHours != null ? `dispatch in ~${fulfillment.averageDispatchHours}h` : null,
      fulfillment.averageDeliveryHours != null ? `deliver in ~${fulfillment.averageDeliveryHours}h` : null,
    ].filter(Boolean);
    if (durations.length) paragraphs.push(`Orders typically ${durations.join(", ")}.`);
  }

  return buildBusinessResponse({
    type: TYPES.FULFILLMENT_INSIGHT,
    headline: "Fulfillment status",
    text: paragraphs.join("\n\n"),
    rows: (fulfillment.pipeline || []).map((stage) => ({
      label: stage.label,
      value: `${stage.count}`,
      detail: stage.count ? "orders in stage" : "clear",
    })),
    actions: [ACTIONS.orders],
    suggestions: SUGGESTIONS.fulfillment,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.ORDERS,
  });
};

export const buildWorkforceInsight = (snapshot) => {
  const employees = snapshot.employees;
  if (!employees || (!employees.hasAttendance && !employees.hasPerformance)) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "No workforce records",
      text: COPY.noData,
      actions: [ACTIONS.analytics],
      suggestions: SUGGESTIONS.workforce,
      periodLabel: periodName(snapshot),
      source: AI_SOURCES.WORKFORCE,
    });
  }

  const paragraphs = [];
  if (employees.hasAttendance) {
    paragraphs.push(
      `Attendance in ${periodName(snapshot).toLowerCase()}: ${employees.attendancePercent ?? 0}% overall — ${employees.present ?? 0} present marks, ${employees.late ?? 0} late, ${employees.absent ?? 0} absent and ${employees.leave ?? 0} on leave across ${formatCount(employees.employees, "team member", "team members")}.`
    );
  }
  if (employees.hasPerformance) {
    paragraphs.push(
      `Performance sits at ${employees.targetAchievement ?? 0}% average target achievement${employees.performancePercent != null ? ` with an average review score of ${employees.performancePercent}` : ""}.`
    );
    if (employees.topPerformers?.length) {
      paragraphs.push(`Performing strongly: ${employees.topPerformers.map((row) => row.name).join(", ")}.`);
    }
    if (employees.needsAttention?.length) {
      paragraphs.push(`Needing attention: ${employees.needsAttention.map((row) => row.name).join(", ")}.`);
    }
  }

  return buildBusinessResponse({
    type: TYPES.WORKFORCE_INSIGHT,
    headline: `Workforce — ${periodName(snapshot)}`,
    text: paragraphs.join("\n\n"),
    metrics: [
      metric("Attendance", `${employees.attendancePercent ?? 0}%`, `${employees.present ?? 0} present · ${employees.absent ?? 0} absent`),
      metric("Target achievement", `${employees.targetAchievement ?? 0}%`, ""),
      metric("Orders assisted", employees.ordersAssisted ?? 0, `${employees.customersServed ?? 0} customers served`),
    ],
    actions: [ACTIONS.analytics],
    suggestions: SUGGESTIONS.workforce,
    periodLabel: periodName(snapshot),
    source: AI_SOURCES.WORKFORCE,
  });
};

/** Composite — what deserves the operator's attention right now. */
export const buildAttentionInsight = (snapshot) => {
  const alerts = [];
  const inventory = snapshot.inventory;
  const fulfillment = snapshot.fulfillment;
  const returns = snapshot.returns;

  if (inventory?.outOfStock) alerts.push(`${formatCount(inventory.outOfStock, "product is", "products are")} out of stock`);
  if (inventory?.lowStock) alerts.push(`${formatCount(inventory.lowStock, "product is", "products are")} below the stock threshold`);
  if (fulfillment?.bottleneck) alerts.push(`the ${fulfillment.bottleneck.label} queue holds ${formatCount(fulfillment.bottleneck.count, "order", "orders")}`);
  if (returns?.pendingReview) alerts.push(`${formatCount(returns.pendingReview, "return awaits", "returns await")} review`);
  if (snapshot.orders?.cancelled) alerts.push(`${formatCount(snapshot.orders.cancelled, "order is", "orders are")} cancelled in the period`);

  const type = alerts.length ? TYPES.ALERT : TYPES.RECOMMENDATION;
  const text = alerts.length
    ? `Here is what needs attention right now:\n\n${alerts.map((entry) => `• ${entry[0].toUpperCase()}${entry.slice(1)}`).join("\n")}\n\nSuggested first move: ${inventory?.lowStock || inventory?.outOfStock ? "open the low-stock register and plan replenishment" : "clear the oldest queue in fulfillment"}.`
    : "Nothing is on fire. The registers are healthy — a good moment to review the analytics trend or refresh an offer.";

  return buildBusinessResponse({
    type,
    headline: "What needs attention",
    text,
    metrics: [
      metric("Low stock", inventory?.lowStock ?? 0, "", inventory?.lowStock ? "alert" : "default"),
      metric("Out of stock", inventory?.outOfStock ?? 0, "", inventory?.outOfStock ? "alert" : "default"),
      metric("Queue bottleneck", fulfillment?.bottleneck ? `${fulfillment.bottleneck.count}` : "0", fulfillment?.bottleneck?.label || "clear"),
      metric("Returns pending", returns?.pendingReview ?? 0, "", returns?.pendingReview ? "alert" : "default"),
    ],
    actions: [ACTIONS.lowStock, ACTIONS.orders, ACTIONS.returns, ACTIONS.analytics],
    suggestions: SUGGESTIONS.summary,
    periodLabel: periodName(snapshot),
  });
};

/* ------------------------------------------------------------------ */
/* Orchestration                                                       */
/* ------------------------------------------------------------------ */

const TOPIC_BUILDERS = {
  [BUSINESS_TOPICS.SUMMARY]: (snapshot) => buildSummaryInsight(snapshot),
  [BUSINESS_TOPICS.SALES]: (snapshot) => buildSalesInsight(snapshot),
  [BUSINESS_TOPICS.PRODUCTS]: (snapshot) => buildProductInsight(snapshot),
  [BUSINESS_TOPICS.CATEGORIES]: (snapshot) => buildCategoryInsight(snapshot),
  [BUSINESS_TOPICS.CUSTOMERS]: (snapshot) => buildCustomerInsight(snapshot),
  [BUSINESS_TOPICS.INVENTORY]: (snapshot) => buildInventoryInsight(snapshot),
  [BUSINESS_TOPICS.RESTOCK]: (snapshot) => buildInventoryInsight(snapshot, { restock: true }),
  [BUSINESS_TOPICS.RETURNS]: (snapshot) => buildReturnInsight(snapshot),
  [BUSINESS_TOPICS.OFFERS]: (snapshot) => buildOfferInsight(snapshot),
  [BUSINESS_TOPICS.FULFILLMENT]: (snapshot) => buildFulfillmentInsight(snapshot),
  [BUSINESS_TOPICS.WORKFORCE]: (snapshot) => buildWorkforceInsight(snapshot),
  [BUSINESS_TOPICS.ATTENTION]: (snapshot) => buildAttentionInsight(snapshot),
};

/**
 * Answers one business question against a snapshot that the caller built
 * with the existing `getAnalyticsSnapshot`. Pure and testable. `access`
 * carries the existing authorization verdict ({ isAuthenticated, isSuperAdmin }).
 */
export const buildBusinessAnswer = ({ question, snapshot, access = {} }) => {
  if (!canUseBusinessAssistant(access)) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "Access restricted",
      text: COPY.accessDenied,
    });
  }

  const topic = resolveBusinessTopic(question);
  const builder = TOPIC_BUILDERS[topic];
  if (!builder) {
    return buildBusinessResponse({
      type: TYPES.NO_DATA,
      headline: "Let me point you in the right direction",
      text: COPY.unclear,
      suggestions: ["Give me today's business summary.", "Which products are selling the most?", "What should I focus on today?"],
      periodLabel: periodName(snapshot),
    });
  }
  return builder(snapshot);
};

export default {
  canUseBusinessAssistant,
  formatINRCompact,
  resolveBusinessTopic,
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
};
