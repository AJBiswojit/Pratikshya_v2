/**
 * PRATIKSHYA FASHON — Performance periods, metrics and scoring.
 *
 * Role-aware target catalogues live here so warehouse staff are never
 * handed a sales target. Scoring weights are transparent and central.
 */

import { ROLES } from "./employeeRoles";

export const PERFORMANCE_STORAGE_KEY = "pratikshya_performance";

export const PERFORMANCE_PERIOD_TYPE = {
  MONTHLY: "MONTHLY",
  QUARTERLY: "QUARTERLY",
  YEARLY: "YEARLY",
};

export const PERFORMANCE_STATUS = {
  NOT_STARTED: "NOT_STARTED",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW_PENDING: "REVIEW_PENDING",
  REVIEWED: "REVIEWED",
  FINALIZED: "FINALIZED",
};

export const PERFORMANCE_STATUS_DEFINITIONS = {
  [PERFORMANCE_STATUS.NOT_STARTED]: {
    id: PERFORMANCE_STATUS.NOT_STARTED,
    label: "Not started",
    tone: "muted",
  },
  [PERFORMANCE_STATUS.IN_PROGRESS]: {
    id: PERFORMANCE_STATUS.IN_PROGRESS,
    label: "In progress",
    tone: "quiet",
  },
  [PERFORMANCE_STATUS.REVIEW_PENDING]: {
    id: PERFORMANCE_STATUS.REVIEW_PENDING,
    label: "Review pending",
    tone: "brass",
  },
  [PERFORMANCE_STATUS.REVIEWED]: {
    id: PERFORMANCE_STATUS.REVIEWED,
    label: "Reviewed",
    tone: "accent",
  },
  [PERFORMANCE_STATUS.FINALIZED]: {
    id: PERFORMANCE_STATUS.FINALIZED,
    label: "Finalized",
    tone: "ink",
  },
};

export const PERFORMANCE_STATUS_OPTIONS = Object.values(PERFORMANCE_STATUS_DEFINITIONS);

export const METRIC = {
  SALES: "SALES",
  ORDERS_ASSISTED: "ORDERS_ASSISTED",
  CUSTOMERS_SERVED: "CUSTOMERS_SERVED",
  STORE_REVENUE: "STORE_REVENUE",
  ORDERS_FULFILLED: "ORDERS_FULFILLED",
  TEAM_ACHIEVEMENT: "TEAM_ACHIEVEMENT",
  STOCK_ACCURACY: "STOCK_ACCURACY",
  RECEIVING_ACCURACY: "RECEIVING_ACCURACY",
  INVENTORY_ADJUSTMENTS: "INVENTORY_ADJUSTMENTS",
  ORDERS_PICKED: "ORDERS_PICKED",
  ORDERS_PACKED: "ORDERS_PACKED",
  DISPATCH_ACCURACY: "DISPATCH_ACCURACY",
  STYLING_SESSIONS: "STYLING_SESSIONS",
  STYLING_CONVERSION: "STYLING_CONVERSION",
  TICKETS_ASSISTED: "TICKETS_ASSISTED",
  RESOLUTION_RATE: "RESOLUTION_RATE",
};

export const METRIC_UNIT = {
  INR: "INR",
  COUNT: "COUNT",
  PERCENT: "PERCENT",
};

export const METRIC_DEFINITIONS = {
  [METRIC.SALES]: { id: METRIC.SALES, label: "Monthly sales", unit: METRIC_UNIT.INR },
  [METRIC.ORDERS_ASSISTED]: {
    id: METRIC.ORDERS_ASSISTED,
    label: "Orders assisted",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.CUSTOMERS_SERVED]: {
    id: METRIC.CUSTOMERS_SERVED,
    label: "Customers served",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.STORE_REVENUE]: {
    id: METRIC.STORE_REVENUE,
    label: "Store revenue",
    unit: METRIC_UNIT.INR,
  },
  [METRIC.ORDERS_FULFILLED]: {
    id: METRIC.ORDERS_FULFILLED,
    label: "Orders fulfilled",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.TEAM_ACHIEVEMENT]: {
    id: METRIC.TEAM_ACHIEVEMENT,
    label: "Team achievement",
    unit: METRIC_UNIT.PERCENT,
  },
  [METRIC.STOCK_ACCURACY]: {
    id: METRIC.STOCK_ACCURACY,
    label: "Stock accuracy",
    unit: METRIC_UNIT.PERCENT,
  },
  [METRIC.RECEIVING_ACCURACY]: {
    id: METRIC.RECEIVING_ACCURACY,
    label: "Receiving accuracy",
    unit: METRIC_UNIT.PERCENT,
  },
  [METRIC.INVENTORY_ADJUSTMENTS]: {
    id: METRIC.INVENTORY_ADJUSTMENTS,
    label: "Inventory adjustments",
    unit: METRIC_UNIT.COUNT,
    invert: true,
  },
  [METRIC.ORDERS_PICKED]: {
    id: METRIC.ORDERS_PICKED,
    label: "Orders picked",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.ORDERS_PACKED]: {
    id: METRIC.ORDERS_PACKED,
    label: "Orders packed",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.DISPATCH_ACCURACY]: {
    id: METRIC.DISPATCH_ACCURACY,
    label: "Dispatch accuracy",
    unit: METRIC_UNIT.PERCENT,
  },
  [METRIC.STYLING_SESSIONS]: {
    id: METRIC.STYLING_SESSIONS,
    label: "Styling sessions",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.STYLING_CONVERSION]: {
    id: METRIC.STYLING_CONVERSION,
    label: "Styling conversion",
    unit: METRIC_UNIT.PERCENT,
  },
  [METRIC.TICKETS_ASSISTED]: {
    id: METRIC.TICKETS_ASSISTED,
    label: "Tickets assisted",
    unit: METRIC_UNIT.COUNT,
  },
  [METRIC.RESOLUTION_RATE]: {
    id: METRIC.RESOLUTION_RATE,
    label: "Resolution rate",
    unit: METRIC_UNIT.PERCENT,
  },
};

/**
 * Default monthly targets. Values are demo operating targets calibrated
 * to the volume of existing order / inventory / care data — they are not
 * hardcoded inside UI components.
 */
export const ROLE_TARGET_TEMPLATES = {
  [ROLES.SALES_EXECUTIVE]: [
    { metric: METRIC.SALES, targetValue: 75000, unit: METRIC_UNIT.INR },
    { metric: METRIC.ORDERS_ASSISTED, targetValue: 8, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.CUSTOMERS_SERVED, targetValue: 10, unit: METRIC_UNIT.COUNT },
  ],
  [ROLES.STORE_MANAGER]: [
    { metric: METRIC.STORE_REVENUE, targetValue: 450000, unit: METRIC_UNIT.INR },
    { metric: METRIC.ORDERS_FULFILLED, targetValue: 18, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.TEAM_ACHIEVEMENT, targetValue: 80, unit: METRIC_UNIT.PERCENT },
  ],
  [ROLES.INVENTORY_MANAGER]: [
    { metric: METRIC.STOCK_ACCURACY, targetValue: 97, unit: METRIC_UNIT.PERCENT },
    { metric: METRIC.RECEIVING_ACCURACY, targetValue: 98, unit: METRIC_UNIT.PERCENT },
    { metric: METRIC.INVENTORY_ADJUSTMENTS, targetValue: 6, unit: METRIC_UNIT.COUNT },
  ],
  [ROLES.INVENTORY_STAFF]: [
    { metric: METRIC.STOCK_ACCURACY, targetValue: 96, unit: METRIC_UNIT.PERCENT },
    { metric: METRIC.RECEIVING_ACCURACY, targetValue: 97, unit: METRIC_UNIT.PERCENT },
    { metric: METRIC.INVENTORY_ADJUSTMENTS, targetValue: 4, unit: METRIC_UNIT.COUNT },
  ],
  [ROLES.WAREHOUSE_STAFF]: [
    { metric: METRIC.ORDERS_PICKED, targetValue: 12, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.ORDERS_PACKED, targetValue: 10, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.DISPATCH_ACCURACY, targetValue: 98, unit: METRIC_UNIT.PERCENT },
  ],
  [ROLES.FASHION_STYLIST]: [
    { metric: METRIC.CUSTOMERS_SERVED, targetValue: 12, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.STYLING_SESSIONS, targetValue: 8, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.STYLING_CONVERSION, targetValue: 70, unit: METRIC_UNIT.PERCENT },
  ],
  [ROLES.CUSTOMER_SUPPORT]: [
    { metric: METRIC.TICKETS_ASSISTED, targetValue: 16, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.CUSTOMERS_SERVED, targetValue: 20, unit: METRIC_UNIT.COUNT },
    { metric: METRIC.RESOLUTION_RATE, targetValue: 80, unit: METRIC_UNIT.PERCENT },
  ],
};

/** Transparent house scoring model. */
export const PERFORMANCE_WEIGHTS = {
  targetAchievement: 0.5,
  attendance: 0.25,
  operationalQuality: 0.25,
};

export const getPerformanceStatus = (status) =>
  PERFORMANCE_STATUS_DEFINITIONS[status] ??
  PERFORMANCE_STATUS_DEFINITIONS[PERFORMANCE_STATUS.NOT_STARTED];

export const getPerformanceStatusLabel = (status) => getPerformanceStatus(status).label;

export const getMetric = (metricId) =>
  METRIC_DEFINITIONS[metricId] ?? {
    id: metricId || "UNKNOWN",
    label: metricId ? String(metricId).replaceAll("_", " ") : "Metric",
    unit: METRIC_UNIT.COUNT,
  };

export const getMetricLabel = (metricId) => getMetric(metricId).label;

export const targetsForRole = (roleId) =>
  (ROLE_TARGET_TEMPLATES[roleId] || ROLE_TARGET_TEMPLATES[ROLES.SALES_EXECUTIVE]).map((item) => ({
    ...item,
  }));

export default {
  PERFORMANCE_STORAGE_KEY,
  PERFORMANCE_PERIOD_TYPE,
  PERFORMANCE_STATUS,
  PERFORMANCE_STATUS_DEFINITIONS,
  PERFORMANCE_STATUS_OPTIONS,
  METRIC,
  METRIC_UNIT,
  METRIC_DEFINITIONS,
  ROLE_TARGET_TEMPLATES,
  PERFORMANCE_WEIGHTS,
  getPerformanceStatus,
  getPerformanceStatusLabel,
  getMetric,
  getMetricLabel,
  targetsForRole,
};
