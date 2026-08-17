/**
 * PRATIKSHYA FASHON — AI Business Assistant, brand copy (Phase 21.1).
 *
 * Language and quick questions only. Every number the business assistant
 * speaks is read from the existing analytics/order/inventory/returns/
 * offers/workforce services at answer time — never hardcoded here.
 */

export const AI_BUSINESS_BRAND = {
  name: "PRATIKSHYA AI",
  tagline: "Business intelligence, in conversation",
  demoNote: "Demo assistant · reads live business repositories",
};

export const AI_BUSINESS_GREETING = (name = null) =>
  `Good day${name ? `, ${name}` : ""}. I read the house's live orders, inventory, returns, offers, customers and workforce records, and answer in plain numbers. Ask me for a summary, or about any area of the business.`;

export const AI_BUSINESS_QUICK_QUESTIONS = [
  { id: "summary", label: "Today's summary", question: "Give me today's business summary." },
  { id: "sales", label: "Sales performance", question: "How are sales performing this month?" },
  { id: "top-products", label: "Top products", question: "Which products are selling the most?" },
  { id: "low-stock", label: "Low stock", question: "Which products are low in stock?" },
  { id: "returns", label: "Returns", question: "Which products have high returns?" },
  { id: "offers", label: "Offer performance", question: "Which offers are performing best?" },
  { id: "fulfillment", label: "Fulfillment status", question: "How is fulfillment performing?" },
  { id: "customers", label: "Customer insights", question: "Which customers are high value?" },
  { id: "workforce", label: "Workforce performance", question: "How is attendance and performance this month?" },
  { id: "attention", label: "What needs attention?", question: "What should I focus on today?" },
];

/** Calm, operational thinking stages. */
export const AI_BUSINESS_STAGES = {
  understanding: { step: "understanding", message: "Understanding your question" },
  reading: { step: "reading", message: "Reading business records" },
  comparing: { step: "comparing", message: "Comparing current performance" },
  preparing: { step: "preparing", message: "Preparing the insight" },
};

export const AI_BUSINESS_COPY = {
  noData: "Not enough data is available for this insight.",
  noDataPeriod: (label) => `Not enough data is available for ${label}. As orders arrive, this insight will fill in.`,
  unclear: "I can summarise the business, or look into sales, products, categories, customers, inventory, returns, offers, fulfillment or the workforce. Ask me about any of those.",
  accessDenied: "The Business Assistant is available to authorised administration roles only.",
};

/** Operational actions — all resolve to existing admin surfaces. */
export const AI_BUSINESS_ACTIONS = {
  orders: { label: "View Orders", to: "/admin/orders" },
  inventory: { label: "View Inventory", to: "/admin/inventory" },
  lowStock: { label: "View Low Stock", to: "/admin/inventory/low-stock" },
  returns: { label: "View Returns", to: "/admin/returns" },
  customers: { label: "View Customers", to: "/admin/customers" },
  offers: { label: "View Offers", to: "/admin/offers" },
  analytics: { label: "View Analytics", to: "/admin/analytics" },
  products: { label: "View Products", to: "/admin/products" },
};

export const AI_BUSINESS_SUGGESTIONS = {
  summary: ["What needs attention?", "Which products are low in stock?", "How is fulfillment performing?"],
  sales: ["Which products are selling the most?", "Which category generates the most revenue?", "How are offers performing?"],
  products: ["Which products should I restock?", "Which products have high returns?", "Show today's summary"],
  inventory: ["Which products should I restock?", "How is fulfillment performing?", "Give me today's summary"],
  returns: ["Which products have high returns?", "How are sales performing?", "What should I focus on today?"],
  offers: ["How are sales performing?", "Give me today's summary", "Which customers are high value?"],
  fulfillment: ["How many orders are currently delayed?", "Which products are low in stock?", "Give me today's summary"],
  customers: ["Which offers are performing best?", "How are sales performing?", "Give me today's summary"],
  workforce: ["What should I focus on today?", "How is attendance this month?", "Give me today's summary"],
};

export default {
  AI_BUSINESS_BRAND,
  AI_BUSINESS_GREETING,
  AI_BUSINESS_QUICK_QUESTIONS,
  AI_BUSINESS_STAGES,
  AI_BUSINESS_COPY,
  AI_BUSINESS_ACTIONS,
  AI_BUSINESS_SUGGESTIONS,
};
