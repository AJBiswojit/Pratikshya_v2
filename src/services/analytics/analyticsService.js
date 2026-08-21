/**
 * PRATIKSHYA FASHON — Central analytics read-model (Phase 19).
 *
 * Aggregates the existing business systems. It does not own orders,
 * products, customers, inventory, returns, offers or employees.
 *
 * Same repositories + same date range → identical result.
 */

import {
  ORDER_PAYMENT_STATUS,
  ORDER_STATUS,
  RETURN_REASONS,
  RETURN_STATUS,
  getReturnReason,
} from "../../config/orderConfig";
import { loadCustomerRegistry } from "../customer/customerRegistry";
import { getRoleLabel } from "../../config/employeeRoles";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import { PERFORMANCE_STATUS } from "../../config/performanceConfig";
import catalogRepository from "../catalogRepository";
import taxonomyRepository from "../taxonomyRepository";
import {
  LOCATION_TYPES,
  MOVEMENT_TYPES,
  STOCK_STATUS,
  loadLocations,
  loadMovements,
  loadTransfers,
  queryInventory,
  getInventoryMetrics,
  TRANSFER_STATES,
} from "../inventory/inventoryRepository";
import offerRepository from "../offers/offerRepository";
import { loadOrders } from "../orders/orderService";
import { getReturnMetrics } from "../orders/returnService";
import { loadEmployees } from "../employees/employeeService";
import { employeeFullName } from "../../utils/employee";
import {
  hydrateDay,
  summarizeRecords,
  todayHouseSummary,
} from "../workforce/attendanceService";
import { housePerformanceSummary } from "../workforce/performanceService";
import { loadAttendance } from "../workforce/attendanceRepository";
import { loadLeave } from "../workforce/leaveRepository";
import { loadAttendanceSettings } from "../workforce/settings";
import { eachDateInRange, formatMinutes, todayKey } from "../workforce/dateUtils";
import {
  bucketKeyFor,
  bucketLabel,
  bucketShortLabel,
  isInRange,
  percentChange,
  resolveAnalyticsPeriod,
} from "./dateRange";

export const HIGH_VALUE_THRESHOLD = 40000;

export const CUSTOMER_SEGMENTS = {
  NEW: "NEW",
  ACTIVE: "ACTIVE",
  RETURNING: "RETURNING",
  HIGH_VALUE: "HIGH_VALUE",
};

export const CUSTOMER_SEGMENT_LABELS = {
  [CUSTOMER_SEGMENTS.NEW]: "New",
  [CUSTOMER_SEGMENTS.ACTIVE]: "Active",
  [CUSTOMER_SEGMENTS.RETURNING]: "Returning",
  [CUSTOMER_SEGMENTS.HIGH_VALUE]: "High Value",
};

const FAILED_PAYMENTS = new Set([
  ORDER_PAYMENT_STATUS.FAILED,
  ORDER_PAYMENT_STATUS.CANCELLED,
]);

const REVENUE_EXCLUDED_STATUSES = new Set([ORDER_STATUS.CANCELLED]);

const COMPLETED_STATUSES = new Set([
  ORDER_STATUS.DELIVERED,
  ORDER_STATUS.RETURN_REQUESTED,
  ORDER_STATUS.RETURNED,
  ORDER_STATUS.REFUND_PENDING,
  ORDER_STATUS.REFUNDED,
]);

const RETURNED_STATUSES = new Set([
  ORDER_STATUS.RETURN_REQUESTED,
  ORDER_STATUS.RETURNED,
]);

const REFUNDED_STATUSES = new Set([
  ORDER_STATUS.REFUND_PENDING,
  ORDER_STATUS.REFUNDED,
]);

const STATUS_GROUPS = [
  {
    id: "PENDING_PAYMENT",
    label: "Pending Payment",
    statuses: [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.PLACED],
  },
  {
    id: "CONFIRMED",
    label: "Confirmed",
    statuses: [
      ORDER_STATUS.PAYMENT_CONFIRMED,
      ORDER_STATUS.ORDER_CONFIRMED,
      ORDER_STATUS.CONFIRMED,
    ],
  },
  { id: "PROCESSING", label: "Processing", statuses: [ORDER_STATUS.PROCESSING] },
  { id: "ALLOCATED", label: "Allocated", statuses: [ORDER_STATUS.ALLOCATED] },
  { id: "PICKING", label: "Picking", statuses: [ORDER_STATUS.PICKING] },
  { id: "PACKED", label: "Packed", statuses: [ORDER_STATUS.PACKED] },
  {
    id: "READY_TO_DISPATCH",
    label: "Ready to Dispatch",
    statuses: [ORDER_STATUS.READY_TO_DISPATCH],
  },
  { id: "SHIPPED", label: "Shipped", statuses: [ORDER_STATUS.SHIPPED] },
  {
    id: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    statuses: [ORDER_STATUS.OUT_FOR_DELIVERY],
  },
  { id: "DELIVERED", label: "Delivered", statuses: [ORDER_STATUS.DELIVERED] },
  { id: "CANCELLED", label: "Cancelled", statuses: [ORDER_STATUS.CANCELLED] },
  {
    id: "RETURN_REQUESTED",
    label: "Return Requested",
    statuses: [ORDER_STATUS.RETURN_REQUESTED],
  },
  { id: "RETURNED", label: "Returned", statuses: [ORDER_STATUS.RETURNED] },
  {
    id: "REFUNDED",
    label: "Refunded",
    statuses: [ORDER_STATUS.REFUND_PENDING, ORDER_STATUS.REFUNDED],
  },
];

const FULFILLMENT_PIPELINE = [
  { id: "PROCESSING", label: "Processing", statuses: [ORDER_STATUS.PROCESSING] },
  { id: "ALLOCATED", label: "Allocated", statuses: [ORDER_STATUS.ALLOCATED] },
  { id: "PICKING", label: "Picking", statuses: [ORDER_STATUS.PICKING] },
  { id: "PACKED", label: "Packing", statuses: [ORDER_STATUS.PACKED] },
  {
    id: "READY_TO_DISPATCH",
    label: "Ready to Dispatch",
    statuses: [ORDER_STATUS.READY_TO_DISPATCH],
  },
  { id: "SHIPPED", label: "Shipped", statuses: [ORDER_STATUS.SHIPPED] },
  {
    id: "OUT_FOR_DELIVERY",
    label: "Out for Delivery",
    statuses: [ORDER_STATUS.OUT_FOR_DELIVERY],
  },
  { id: "DELIVERED", label: "Delivered", statuses: [ORDER_STATUS.DELIVERED] },
];

const BOTTLENECKS = [
  {
    id: "allocation",
    label: "Waiting for allocation",
    statuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED],
  },
  { id: "picking", label: "Waiting for picking", statuses: [ORDER_STATUS.ALLOCATED] },
  { id: "packing", label: "Waiting for packing", statuses: [ORDER_STATUS.PICKING] },
  {
    id: "dispatch",
    label: "Waiting for dispatch",
    statuses: [ORDER_STATUS.PACKED, ORDER_STATUS.READY_TO_DISPATCH],
  },
];

const MOVEMENT_GROUPS = [
  { id: "received", label: "Received", types: [MOVEMENT_TYPES.RECEIVE, MOVEMENT_TYPES.OPENING_BALANCE, MOVEMENT_TYPES.RESTOCK] },
  { id: "sold", label: "Sold", types: [MOVEMENT_TYPES.SALE] },
  { id: "returned", label: "Returned", types: [MOVEMENT_TYPES.RETURN] },
  { id: "adjusted", label: "Adjusted", types: [MOVEMENT_TYPES.ADJUST] },
  { id: "damaged", label: "Damaged", types: [MOVEMENT_TYPES.DAMAGE] },
  { id: "transferred", label: "Transferred", types: [MOVEMENT_TYPES.TRANSFER_IN, MOVEMENT_TYPES.TRANSFER_OUT] },
];

const asNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const hoursBetween = (start, end) => {
  if (!start || !end) return null;
  const from = new Date(start);
  const to = new Date(end);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;
  return (to.getTime() - from.getTime()) / 3600000;
};

const average = (values) => {
  const clean = values.filter((value) => Number.isFinite(value));
  if (!clean.length) return null;
  return Math.round((clean.reduce((sum, value) => sum + value, 0) / clean.length) * 10) / 10;
};

const rate = (part, whole) => {
  if (!whole) return null;
  return Math.round((part / whole) * 1000) / 10;
};

/* ------------------------------------------------------------------ */
/* Revenue rule — one definition for every page                        */
/* ------------------------------------------------------------------ */

export const isFailedPayment = (order) =>
  FAILED_PAYMENTS.has(order?.paymentStatus);

export const isRevenueEligible = (order) => {
  if (!order) return false;
  if (REVENUE_EXCLUDED_STATUSES.has(order.status)) return false;
  if (isFailedPayment(order)) return false;
  return true;
};

export const orderGross = (order) => asNumber(order?.pricing?.total, 0);

export const completedRefundAmount = (order) => {
  if (!order) return 0;
  const fromReturns = (order.returns || []).reduce((sum, record) => {
    if (record.status !== RETURN_STATUS.REFUNDED) return sum;
    return sum + asNumber(record.refund?.amount, 0);
  }, 0);
  if (fromReturns > 0) return fromReturns;
  const paymentRefunded =
    order.paymentStatus === ORDER_PAYMENT_STATUS.REFUNDED ||
    order.status === ORDER_STATUS.REFUNDED;
  if (paymentRefunded) {
    return asNumber(order.refund?.amount, orderGross(order));
  }
  return 0;
};

export const orderRevenue = (order) => {
  if (!isRevenueEligible(order)) return 0;
  return Math.max(0, orderGross(order) - completedRefundAmount(order));
};

export const orderUnits = (order) =>
  (order?.items || []).reduce((sum, item) => sum + Math.max(0, asNumber(item.quantity, 0)), 0);

export const lineRevenue = (item) => {
  if (asNumber(item?.lineTotal, 0) > 0) return asNumber(item.lineTotal, 0);
  return asNumber(item?.price, 0) * Math.max(0, asNumber(item?.quantity, 0));
};

/* ------------------------------------------------------------------ */
/* Customer segmentation — same rules as the customer directory        */
/* ------------------------------------------------------------------ */

export const segmentCustomer = ({ lifetimeSpend = 0, lifetimeOrders = 0 } = {}) => {
  if (lifetimeSpend > HIGH_VALUE_THRESHOLD) return CUSTOMER_SEGMENTS.HIGH_VALUE;
  if (lifetimeOrders > 1) return CUSTOMER_SEGMENTS.RETURNING;
  if (lifetimeOrders > 0) return CUSTOMER_SEGMENTS.ACTIVE;
  return CUSTOMER_SEGMENTS.NEW;
};

export { loadCustomerRegistry };

const customerIdentity = (order) => {
  const email = String(order?.customer?.email || "").trim().toLowerCase();
  if (order?.customerId) return String(order.customerId);
  if (email) return `email:${email}`;
  return `guest:${order?.id || "unknown"}`;
};

const splitName = (fullName = "") => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "Guest", lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

/* ------------------------------------------------------------------ */
/* Compared metric                                                     */
/* ------------------------------------------------------------------ */

const compared = (current, previous, { currency = false } = {}) => {
  const change = percentChange(current, previous);
  return {
    current,
    previous,
    change: change.value,
    direction: change.direction,
    changeLabel: change.label,
    comparable: change.value != null,
    currency,
  };
};

/* ------------------------------------------------------------------ */
/* Section builders                                                    */
/* ------------------------------------------------------------------ */

const ordersInRange = (orders, start, end) =>
  orders.filter((order) => isInRange(order.createdAt, start, end));

const collectReturns = (orders) =>
  orders.flatMap((order) =>
    (order.returns || []).map((record) => ({
      ...record,
      orderId: order.id,
      order,
      createdAt: record.createdAt || order.createdAt,
    }))
  );

const buildTrend = (orders, period) => {
  const buckets = period.buckets.map((key) => ({
    key,
    label: bucketLabel(key, period.granularity),
    shortLabel: bucketShortLabel(key, period.granularity),
    day: bucketShortLabel(key, period.granularity),
    date: bucketShortLabel(key, period.granularity),
    revenue: 0,
    orders: 0,
    sales: 0,
  }));
  const index = new Map(buckets.map((bucket, position) => [bucket.key, position]));

  orders.forEach((order) => {
    if (!isRevenueEligible(order)) return;
    const key = bucketKeyFor(order.createdAt, period.granularity);
    const position = index.get(key);
    if (position == null) return;
    const revenue = orderRevenue(order);
    buckets[position].revenue += revenue;
    buckets[position].sales += revenue;
    buckets[position].orders += 1;
  });

  return {
    granularity: period.granularity,
    series: buckets,
    hasData: buckets.some((bucket) => bucket.orders > 0 || bucket.revenue > 0),
  };
};

const buildOrderSummary = (orders) => {
  const total = orders.length;
  const eligible = orders.filter(isRevenueEligible);
  const cancelled = orders.filter((order) => order.status === ORDER_STATUS.CANCELLED);
  const completed = orders.filter((order) => COMPLETED_STATUSES.has(order.status));
  const returned = orders.filter((order) => RETURNED_STATUSES.has(order.status));
  const refunded = orders.filter((order) => REFUNDED_STATUSES.has(order.status));
  const revenue = eligible.reduce((sum, order) => sum + orderRevenue(order), 0);
  const gross = eligible.reduce((sum, order) => sum + orderGross(order), 0);
  const refunds = orders.reduce((sum, order) => sum + completedRefundAmount(order), 0);
  const units = eligible.reduce((sum, order) => sum + orderUnits(order), 0);
  const discounts = eligible.reduce(
    (sum, order) =>
      sum +
      asNumber(order.pricing?.productDiscount, 0) +
      asNumber(order.pricing?.couponDiscount, 0),
    0
  );

  const distribution = STATUS_GROUPS.map((group) => {
    const count = orders.filter((order) => group.statuses.includes(order.status)).length;
    return {
      id: group.id,
      label: group.label,
      count,
      percentage: rate(count, total),
    };
  });

  return {
    total,
    eligible: eligible.length,
    revenue,
    gross,
    refunds,
    discounts,
    units,
    aov: eligible.length ? Math.round(revenue / eligible.length) : 0,
    completed: completed.length,
    cancelled: cancelled.length,
    returned: returned.length,
    refunded: refunded.length,
    completionRate: rate(completed.length, total),
    cancellationRate: rate(cancelled.length, total),
    returnRate: rate(returned.length, total),
    refundRate: rate(refunded.length, total),
    distribution,
    hasData: total > 0,
  };
};

const productLookup = () => {
  const products = catalogRepository.all();
  return new Map(products.map((product) => [String(product.id), product]));
};

const inventoryByProduct = () => {
  const map = new Map();
  queryInventory().forEach((row) => {
    const current = map.get(row.productId) || {
      available: 0,
      onHand: 0,
      reserved: 0,
      returned: 0,
      damaged: 0,
      locations: [],
      low: false,
      out: false,
    };
    current.available += row.quantity.available;
    current.onHand += row.quantity.onHand;
    current.reserved += row.quantity.reserved;
    current.returned += row.quantity.returned;
    current.damaged += row.quantity.damaged;
    if (row.status === STOCK_STATUS.LOW_STOCK) current.low = true;
    if (row.status === STOCK_STATUS.OUT_OF_STOCK) current.out = true;
    current.locations.push(row);
    map.set(row.productId, current);
  });
  return map;
};

const buildProductPerformance = (periodOrders, filters = {}) => {
  const products = productLookup();
  const stock = inventoryByProduct();
  const rows = new Map();

  const ensure = (productId, fallbackName = "Unknown piece") => {
    const id = String(productId || "");
    if (!id) return null;
    if (rows.has(id)) return rows.get(id);
    const product = products.get(id) || null;
    const inventory = stock.get(id) || null;
    const row = {
      productId: id,
      name: product?.name || fallbackName,
      sku: product?.sku || "—",
      categoryId: product?.category || "",
      category: product ? taxonomyRepository.getCategoryLabel(product.category) : "Unassigned",
      collections: product
        ? taxonomyRepository.collectionsForProduct(product).map((collection) => collection.id)
        : [],
      unitsSold: 0,
      revenue: 0,
      orderIds: new Set(),
      returnUnits: 0,
      returnCount: 0,
      available: inventory?.available ?? null,
      product,
    };
    rows.set(id, row);
    return row;
  };

  periodOrders.forEach((order) => {
    if (!isRevenueEligible(order)) return;
    if (filters.category && order.items.every((item) => {
      const product = products.get(String(item.productId));
      return product?.category !== filters.category;
    })) {
      return;
    }
    order.items.forEach((item) => {
      const row = ensure(item.productId, item.name);
      if (!row) return;
      if (filters.category && row.categoryId !== filters.category) return;
      if (filters.collection && !row.collections.includes(filters.collection)) return;
      if (filters.product && row.productId !== filters.product) return;
      row.unitsSold += Math.max(0, asNumber(item.quantity, 0));
      row.revenue += lineRevenue(item);
      row.orderIds.add(order.id);
    });
  });

  collectReturns(periodOrders).forEach((record) => {
    record.items.forEach((item) => {
      const row = ensure(item.productId, item.name);
      if (!row) return;
      row.returnUnits += Math.max(0, asNumber(item.quantity, 0));
      row.returnCount += 1;
    });
  });

  const list = [...rows.values()].map((row) => ({
    ...row,
    orders: row.orderIds.size,
    returnRate: rate(row.returnUnits, row.unitsSold + row.returnUnits),
    orderIds: undefined,
  }));

  const sold = list.filter((row) => row.unitsSold > 0 || row.revenue > 0);
  const rank = (key) => [...sold].sort((a, b) => (b[key] || 0) - (a[key] || 0));

  return {
    all: list,
    sold,
    topByRevenue: rank("revenue").slice(0, 8),
    topByUnits: rank("unitsSold").slice(0, 8),
    topByOrders: rank("orders").slice(0, 8),
    slowest: [...sold].sort((a, b) => (a.unitsSold || 0) - (b.unitsSold || 0)).slice(0, 8),
    hasData: sold.length > 0,
    marginAvailable: false,
  };
};

const buildCategoryPerformance = (productRows) => {
  const map = new Map();
  productRows.sold.forEach((row) => {
    const id = row.categoryId || "unassigned";
    const current = map.get(id) || {
      id,
      label: row.category || "Unassigned",
      revenue: 0,
      unitsSold: 0,
      orders: 0,
      productsSold: 0,
      returnUnits: 0,
    };
    current.revenue += row.revenue;
    current.unitsSold += row.unitsSold;
    current.orders += row.orders;
    current.productsSold += 1;
    current.returnUnits += row.returnUnits;
    map.set(id, current);
  });

  const categories = taxonomyRepository.categories().map((category) => {
    const stats = map.get(category.id) || {
      id: category.id,
      label: category.name,
      revenue: 0,
      unitsSold: 0,
      orders: 0,
      productsSold: 0,
      returnUnits: 0,
    };
    return {
      ...stats,
      label: category.name,
      returnRate: rate(stats.returnUnits, stats.unitsSold + stats.returnUnits),
    };
  });

  map.forEach((stats, id) => {
    if (!categories.some((category) => category.id === id)) {
      categories.push({
        ...stats,
        returnRate: rate(stats.returnUnits, stats.unitsSold + stats.returnUnits),
      });
    }
  });

  return categories
    .filter((category) => category.revenue > 0 || category.unitsSold > 0)
    .sort((a, b) => b.revenue - a.revenue);
};

const buildCollectionPerformance = (productRows) => {
  const collections = taxonomyRepository.collections();
  return collections
    .map((collection) => {
      const members = productRows.sold.filter((row) => row.collections.includes(collection.id));
      const revenue = members.reduce((sum, row) => sum + row.revenue, 0);
      const unitsSold = members.reduce((sum, row) => sum + row.unitsSold, 0);
      const orders = members.reduce((sum, row) => sum + row.orders, 0);
      return {
        id: collection.id,
        label: collection.name,
        productsSold: members.length,
        revenue,
        unitsSold,
        orders,
      };
    })
    .filter((row) => row.productsSold > 0 || row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);
};

const buildCustomerRows = (allOrders, periodOrders, period) => {
  const registry = loadCustomerRegistry();
  const byId = new Map();

  const ensure = ({ id, email, name, createdAt, phone }) => {
    const key = id || (email ? `email:${email}` : null);
    if (!key) return null;
    if (byId.has(key)) return byId.get(key);
    const split = splitName(name);
    const row = {
      id: id || key,
      firstName: split.firstName,
      lastName: split.lastName,
      email: email || "",
      phone: phone || "",
      createdAt: createdAt || null,
      lifetimeOrders: 0,
      lifetimeSpend: 0,
      periodOrders: 0,
      periodSpend: 0,
      periodReturns: 0,
      lastOrder: null,
      firstOrder: null,
      registry: false,
    };
    byId.set(key, row);
    return row;
  };

  registry.forEach((customer) => {
    const row = ensure({
      id: customer.id,
      email: customer.email,
      name: `${customer.firstName || ""} ${customer.lastName || ""}`.trim(),
      createdAt: customer.createdAt,
      phone: customer.phone,
    });
    if (row) {
      row.firstName = customer.firstName || row.firstName;
      row.lastName = customer.lastName || row.lastName;
      row.registry = true;
      row.createdAt = customer.createdAt || row.createdAt;
    }
  });

  allOrders.forEach((order) => {
    const email = order.customer?.email || "";
    const key = order.customerId || (email ? `email:${email.toLowerCase()}` : customerIdentity(order));
    const existing = byId.get(order.customerId) || byId.get(`email:${email.toLowerCase()}`);
    const row =
      existing ||
      ensure({
        id: order.customerId || key,
        email,
        name: order.customer?.fullName,
        createdAt: order.createdAt,
        phone: order.customer?.phone,
      });
    if (!row) return;
    if (isRevenueEligible(order)) {
      row.lifetimeOrders += 1;
      row.lifetimeSpend += orderRevenue(order);
    }
    if (!row.firstOrder || order.createdAt < row.firstOrder) row.firstOrder = order.createdAt;
    if (!row.lastOrder || order.createdAt > row.lastOrder) row.lastOrder = order.createdAt;
    if (!row.createdAt) row.createdAt = order.createdAt;
    if (!row.email) row.email = email;
  });

  periodOrders.forEach((order) => {
    const email = String(order.customer?.email || "").toLowerCase();
    const row =
      byId.get(order.customerId) ||
      byId.get(`email:${email}`) ||
      byId.get(customerIdentity(order));
    if (!row) return;
    if (isRevenueEligible(order)) {
      row.periodOrders += 1;
      row.periodSpend += orderRevenue(order);
    }
    (order.returns || []).forEach((record) => {
      if (isInRange(record.createdAt || order.createdAt, period.start, period.end)) {
        row.periodReturns += 1;
      }
    });
  });

  const customers = [...byId.values()].map((row) => ({
    ...row,
    name: `${row.firstName} ${row.lastName}`.trim(),
    segment: segmentCustomer({
      lifetimeSpend: row.lifetimeSpend,
      lifetimeOrders: row.lifetimeOrders,
    }),
    aov: row.periodOrders ? Math.round(row.periodSpend / row.periodOrders) : 0,
  }));

  const newInPeriod = customers.filter((row) => {
    const created = row.createdAt || row.firstOrder;
    return created && isInRange(created, period.start, period.end);
  });
  const returningInPeriod = customers.filter((row) => {
    if (!row.periodOrders) return false;
    const first = row.firstOrder;
    return first && first < period.start;
  });
  const activeInPeriod = customers.filter((row) => row.periodOrders > 0);
  const highValue = customers.filter((row) => row.segment === CUSTOMER_SEGMENTS.HIGH_VALUE);

  const segments = Object.values(CUSTOMER_SEGMENTS).map((id) => {
    const members = customers.filter((row) => row.segment === id);
    const periodMembers = members.filter((row) => row.periodOrders > 0);
    const revenue = periodMembers.reduce((sum, row) => sum + row.periodSpend, 0);
    const orders = periodMembers.reduce((sum, row) => sum + row.periodOrders, 0);
    return {
      id,
      label: CUSTOMER_SEGMENT_LABELS[id],
      customers: members.length,
      activeInPeriod: periodMembers.length,
      revenue,
      orders,
      aov: orders ? Math.round(revenue / orders) : 0,
    };
  });

  const growthMap = new Map(period.buckets.map((key) => [key, { key, newCustomers: 0, returningCustomers: 0 }]));
  customers.forEach((row) => {
    const created = row.createdAt || row.firstOrder;
    if (created && isInRange(created, period.start, period.end)) {
      const key = bucketKeyFor(created, period.granularity);
      if (growthMap.has(key)) growthMap.get(key).newCustomers += 1;
    }
    if (row.periodOrders > 0 && row.firstOrder && row.firstOrder < period.start) {
      const firstPeriodOrder = periodOrders.find((order) => {
        const email = String(order.customer?.email || "").toLowerCase();
        return (
          order.customerId === row.id ||
          (email && `email:${email}` === row.id) ||
          (email && email === String(row.email || "").toLowerCase())
        );
      });
      const stamp = firstPeriodOrder?.createdAt || period.start;
      const key = bucketKeyFor(stamp, period.granularity);
      if (growthMap.has(key)) growthMap.get(key).returningCustomers += 1;
    }
  });

  const growth = period.buckets.map((key) => {
    const point = growthMap.get(key);
    return {
      key,
      label: bucketShortLabel(key, period.granularity),
      newCustomers: point?.newCustomers || 0,
      returningCustomers: point?.returningCustomers || 0,
    };
  });

  const top = [...activeInPeriod]
    .sort((a, b) => b.periodSpend - a.periodSpend)
    .slice(0, 8);

  const periodSpenders = activeInPeriod.filter((row) => row.periodSpend > 0);
  const averageSpend = periodSpenders.length
    ? Math.round(
        periodSpenders.reduce((sum, row) => sum + row.periodSpend, 0) / periodSpenders.length
      )
    : 0;

  return {
    total: customers.length,
    newCustomers: newInPeriod.length,
    returningCustomers: returningInPeriod.length,
    activeCustomers: activeInPeriod.length,
    highValueCustomers: highValue.length,
    averageSpend,
    ordersPerCustomer: activeInPeriod.length
      ? Math.round(
          (activeInPeriod.reduce((sum, row) => sum + row.periodOrders, 0) / activeInPeriod.length) * 10
        ) / 10
      : 0,
    segments,
    growth,
    top,
    customers,
    hasData: customers.length > 0,
    hasPeriodActivity: activeInPeriod.length > 0,
  };
};

const buildInventorySummary = (period) => {
  const rows = queryInventory();
  const metrics = getInventoryMetrics(rows);
  const locations = loadLocations();
  const movements = loadMovements().filter((movement) =>
    isInRange(movement.timestamp, period.start, period.end)
  );
  const transfers = loadTransfers();

  const movementTotals = MOVEMENT_GROUPS.map((group) => {
    const matching = movements.filter((movement) => group.types.includes(movement.type));
    const quantity = matching.reduce((sum, movement) => sum + Math.abs(asNumber(movement.quantity, 0)), 0);
    return { id: group.id, label: group.label, count: matching.length, quantity };
  });

  const lowStock = rows
    .filter((row) => row.status === STOCK_STATUS.LOW_STOCK || row.status === STOCK_STATUS.OUT_OF_STOCK)
    .map((row) => ({
      id: row.id,
      productId: row.productId,
      product: row.productName,
      sku: row.sku,
      available: row.quantity.available,
      threshold: row.lowStockThreshold,
      location: row.location?.name || "—",
      locationId: row.locationId,
      status: row.status,
    }))
    .sort((a, b) => a.available - b.available);

  const hasCost = rows.some((row) => Number(row.product?.pricing?.cost) > 0);
  const retailValue = metrics.estimatedValue;

  const locationRows = locations.map((location) => {
    const stockRows = rows.filter((row) => row.locationId === location.id);
    const available = stockRows.reduce((sum, row) => sum + row.quantity.available, 0);
    const moved = movements
      .filter((movement) => movement.locationId === location.id)
      .reduce((sum, movement) => sum + Math.abs(asNumber(movement.quantity, 0)), 0);
    const transferCount = transfers.filter(
      (transfer) =>
        transfer.sourceLocationId === location.id || transfer.destinationLocationId === location.id
    ).length;
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      typeLabel: location.type === LOCATION_TYPES.WAREHOUSE ? "Warehouse" : "Store",
      available,
      unitsMoved: moved,
      transfers: transferCount,
      ordersFulfilled: 0,
    };
  });

  return {
    totalOnHand: metrics.totalUnits,
    available: metrics.availableUnits,
    reserved: metrics.reservedUnits,
    returned: metrics.returnedUnits,
    damaged: metrics.damagedUnits,
    lowStock: metrics.lowStock,
    outOfStock: metrics.outOfStock,
    overstocked: rows.filter((row) => row.status === STOCK_STATUS.OVERSTOCKED).length,
    retailValue,
    costConfigured: hasCost,
    costValue: null,
    movements: movementTotals,
    movementCount: movements.length,
    lowStockRows: lowStock,
    locations: locationRows,
    pendingTransfers: transfers.filter(
      (transfer) => ![TRANSFER_STATES.RECEIVED, TRANSFER_STATES.CANCELLED].includes(transfer.status)
    ).length,
    hasData: rows.length > 0,
  };
};

const buildReturnSummary = (allOrders, period) => {
  const allReturns = collectReturns(allOrders);
  const periodReturns = allReturns.filter((record) =>
    isInRange(record.createdAt, period.start, period.end)
  );
  const metrics = getReturnMetrics(periodReturns);
  const refunded = periodReturns.filter((record) => record.status === RETURN_STATUS.REFUNDED);
  const refundValue = refunded.reduce((sum, record) => sum + asNumber(record.refund?.amount, 0), 0);
  const returnValue = periodReturns.reduce((sum, record) => {
    const items = record.items || [];
    return sum + items.reduce((line, item) => line + lineRevenue(item), 0);
  }, 0);

  const eligibleOrders = ordersInRange(allOrders, period.start, period.end);
  const reasons = RETURN_REASONS.map((reason) => {
    const count = periodReturns.filter((record) => record.reason === reason.id).length;
    return {
      id: reason.id,
      label: reason.label,
      count,
      percentage: rate(count, periodReturns.length),
    };
  }).filter((row) => row.count > 0);

  const unknown = periodReturns.filter((record) => !getReturnReason(record.reason));
  if (unknown.length) {
    reasons.push({
      id: "unspecified",
      label: "Unspecified",
      count: unknown.length,
      percentage: rate(unknown.length, periodReturns.length),
    });
  }

  return {
    ...metrics,
    returnRequests: periodReturns.length,
    refundValue,
    averageReturnValue: periodReturns.length ? Math.round(returnValue / periodReturns.length) : 0,
    returnRate: rate(periodReturns.length, eligibleOrders.length),
    refundRate: rate(refunded.length, eligibleOrders.length),
    reasons,
    hasData: periodReturns.length > 0,
  };
};

const buildOfferPerformance = (periodOrders) => {
  const offers = offerRepository.all();
  const rows = offers.map((offer) => {
    const redemptions = periodOrders.filter((order) => {
      const code = String(order.pricing?.couponCode || "").toUpperCase();
      const offerId = order.pricing?.offerId;
      return (code && code === offer.code) || (offerId && String(offerId) === String(offer.id));
    });
    const eligible = redemptions.filter(isRevenueEligible);
    const revenue = eligible.reduce((sum, order) => sum + orderRevenue(order), 0);
    const discount = redemptions.reduce((sum, order) => sum + asNumber(order.pricing?.couponDiscount, 0), 0);
    return {
      id: offer.id,
      name: offer.name,
      code: offer.code,
      status: offer.displayStatus,
      redemptions: redemptions.length,
      orders: eligible.length,
      revenue,
      discount,
      averageDiscount: redemptions.length ? Math.round(discount / redemptions.length) : 0,
    };
  });

  return {
    rows: [...rows].sort((a, b) => b.redemptions - a.redemptions || b.revenue - a.revenue),
    byRedemptions: [...rows].sort((a, b) => b.redemptions - a.redemptions).slice(0, 8),
    byRevenue: [...rows].sort((a, b) => b.revenue - a.revenue).slice(0, 8),
    byDiscount: [...rows].sort((a, b) => b.discount - a.discount).slice(0, 8),
    hasData: rows.some((row) => row.redemptions > 0),
  };
};

const buildFulfillmentSummary = (allOrders, periodOrders, period) => {
  const pipeline = FULFILLMENT_PIPELINE.map((stage) => ({
    id: stage.id,
    label: stage.label,
    count: allOrders.filter((order) => stage.statuses.includes(order.status)).length,
  }));

  const bottlenecks = BOTTLENECKS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    count: allOrders.filter((order) => stage.statuses.includes(order.status)).length,
  }));
  const bottleneck = [...bottlenecks].sort((a, b) => b.count - a.count)[0] || null;

  const fulfillmentHours = [];
  const dispatchHours = [];
  const deliveryHours = [];

  allOrders.forEach((order) => {
    const fulfillment = order.fulfillment || {};
    const start = fulfillment.allocatedAt || order.createdAt;
    const packed = fulfillment.packedAt || fulfillment.readyToDispatchAt;
    const dispatched = fulfillment.dispatchedAt;
    const delivered = fulfillment.deliveredAt;
    const fulfill = hoursBetween(start, packed);
    const dispatch = hoursBetween(fulfillment.readyToDispatchAt || packed, dispatched);
    const delivery = hoursBetween(dispatched, delivered);
    if (fulfill != null && isInRange(packed, period.start, period.end)) fulfillmentHours.push(fulfill);
    if (dispatch != null && isInRange(dispatched, period.start, period.end)) dispatchHours.push(dispatch);
    if (delivery != null && isInRange(delivered, period.start, period.end)) deliveryHours.push(delivery);
  });

  const locations = loadLocations().map((location) => {
    const fulfilled = allOrders.filter(
      (order) =>
        order.fulfillment?.sourceLocationId === location.id &&
        [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED].includes(order.status)
    );
    const inPeriod = fulfilled.filter((order) =>
      isInRange(order.fulfillment?.dispatchedAt || order.createdAt, period.start, period.end)
    );
    return {
      id: location.id,
      name: location.name,
      type: location.type,
      ordersFulfilled: inPeriod.length,
      activity: allOrders.filter((order) => order.fulfillment?.sourceLocationId === location.id).length,
    };
  });

  const hasDurations =
    fulfillmentHours.length > 0 || dispatchHours.length > 0 || deliveryHours.length > 0;

  return {
    pipeline,
    bottlenecks,
    bottleneck: bottleneck && bottleneck.count > 0 ? bottleneck : null,
    averageFulfillmentHours: average(fulfillmentHours),
    averageDispatchHours: average(dispatchHours),
    averageDeliveryHours: average(deliveryHours),
    hasDurations,
    locations,
    periodOrders: periodOrders.length,
  };
};

const buildEmployeeAnalytics = (period, filters = {}) => {
  const actor = { adminId: "system", name: "Analytics" };
  const employees = loadEmployees().filter((person) => {
    if (filters.role && person.role !== filters.role) return false;
    if (filters.department && person.department !== filters.department) return false;
    return true;
  });
  const attendanceToday = todayHouseSummary(actor);
  const performance = housePerformanceSummary(actor);
  const records = loadAttendance();
  const leaves = loadLeave();
  const settings = loadAttendanceSettings();
  const days = eachDateInRange(period.start, period.end > todayKey() ? todayKey() : period.end);

  const attendanceRows = employees.map((person) => {
    const hydrated = days
      .filter((day) => day >= (person.joiningDate || day))
      .map((day) => hydrateDay(person, day, records, leaves, settings));
    return {
      employeeId: person.employeeId,
      name: employeeFullName(person),
      role: getRoleLabel(person.role),
      department: getDepartmentLabel(person.department),
      summary: summarizeRecords(hydrated),
    };
  });
  const attendance = summarizeRecords(
    employees.flatMap((person) =>
      days
        .filter((day) => day >= (person.joiningDate || day))
        .map((day) => hydrateDay(person, day, records, leaves, settings))
    )
  );

  const performanceRows = (performance.rows || []).filter((row) => {
    if (filters.role && row.employee?.role !== filters.role) return false;
    if (filters.department && row.employee?.department !== filters.department) return false;
    return true;
  });

  const assisted = performanceRows.reduce((sum, row) => {
    const metric = (row.metrics || []).find((item) => item.metric === "ORDERS_ASSISTED");
    return sum + asNumber(metric?.actualValue, 0);
  }, 0);
  const served = performanceRows.reduce((sum, row) => {
    const metric = (row.metrics || []).find((item) => item.metric === "CUSTOMERS_SERVED");
    return sum + asNumber(metric?.actualValue, 0);
  }, 0);

  return {
    employees: employees.length,
    attendancePercent: attendance.attendancePercent,
    averageHours: attendance.averageMinutes,
    hoursLabel: formatMinutes(attendance.workMinutes),
    present: attendance.present,
    late: attendance.late,
    absent: attendance.absent,
    leave: attendance.leave,
    halfDay: attendance.halfDay,
    performancePercent: performance.averageScore,
    targetAchievement: performance.averageAchievement,
    ordersAssisted: assisted,
    customersServed: served,
    topPerformers: performance.topPerformers || [],
    needsAttention: performance.needsAttention || [],
    reviewPending: performanceRows.filter((row) => row.status === PERFORMANCE_STATUS.REVIEW_PENDING),
    attendanceToday,
    attendanceRows,
    performanceRows,
    hasAttendance: attendance.workingDays > 0 || attendance.present + attendance.absent + attendance.leave > 0,
    hasPerformance: performanceRows.length > 0,
  };
};

const overviewFrom = (orderSummary, customers, returns) => ({
  revenue: orderSummary.revenue,
  orders: orderSummary.total,
  eligibleOrders: orderSummary.eligible,
  aov: orderSummary.aov,
  customers: customers.total,
  newCustomers: customers.newCustomers,
  returningCustomers: customers.returningCustomers,
  unitsSold: orderSummary.units,
  returns: returns.returnRequests,
  refunds: orderSummary.refunds,
});

/* ------------------------------------------------------------------ */
/* Public snapshot                                                     */
/* ------------------------------------------------------------------ */

export const getAnalyticsSnapshot = ({
  orders = null,
  period: periodInput = {},
  filters = {},
  now = new Date(),
} = {}) => {
  const period = resolveAnalyticsPeriod({ ...periodInput, now });
  const allOrders = Array.isArray(orders) ? orders : loadOrders();

  let scoped = ordersInRange(allOrders, period.start, period.end);
  if (filters.status && filters.status !== "ALL") {
    const group = STATUS_GROUPS.find((entry) => entry.id === filters.status);
    const statuses = group?.statuses || [filters.status];
    scoped = scoped.filter((order) => statuses.includes(order.status));
  }
  if (filters.offer) {
    scoped = scoped.filter((order) => String(order.pricing?.offerId || "") === String(filters.offer));
  }

  const previousOrders = period.comparison
    ? ordersInRange(allOrders, period.comparison.start, period.comparison.end)
    : [];

  const currentOrders = buildOrderSummary(scoped);
  const previousSummary = buildOrderSummary(previousOrders);
  const products = buildProductPerformance(scoped, filters);
  const categories = buildCategoryPerformance(products);
  const collections = buildCollectionPerformance(products);
  const customers = buildCustomerRows(allOrders, scoped, period);
  const previousCustomers = period.comparison
    ? buildCustomerRows(allOrders, previousOrders, {
        ...period,
        start: period.comparison.start,
        end: period.comparison.end,
      })
    : null;
  const inventory = buildInventorySummary(period);
  const returns = buildReturnSummary(allOrders, period);
  const previousReturns = period.comparison
    ? buildReturnSummary(allOrders, {
        ...period,
        start: period.comparison.start,
        end: period.comparison.end,
      })
    : null;
  const offers = buildOfferPerformance(scoped);
  const fulfillment = buildFulfillmentSummary(allOrders, scoped, period);
  const employees = buildEmployeeAnalytics(period, filters);

  fulfillment.locations.forEach((location) => {
    const inventoryLocation = inventory.locations.find((entry) => entry.id === location.id);
    if (inventoryLocation) inventoryLocation.ordersFulfilled = location.ordersFulfilled;
  });

  const currentOverview = overviewFrom(currentOrders, customers, returns);
  const previousOverview = previousCustomers
    ? overviewFrom(previousSummary, previousCustomers, previousReturns)
    : null;

  const overview = {
    revenue: compared(currentOverview.revenue, previousOverview?.revenue, { currency: true }),
    orders: compared(currentOverview.orders, previousOverview?.orders),
    aov: compared(currentOverview.aov, previousOverview?.aov, { currency: true }),
    customers: compared(currentOverview.customers, previousOverview?.customers),
    newCustomers: compared(currentOverview.newCustomers, previousOverview?.newCustomers),
    returningCustomers: compared(
      currentOverview.returningCustomers,
      previousOverview?.returningCustomers
    ),
    unitsSold: compared(currentOverview.unitsSold, previousOverview?.unitsSold),
    returns: compared(currentOverview.returns, previousOverview?.returns),
    refunds: compared(currentOverview.refunds, previousOverview?.refunds, { currency: true }),
    gross: currentOrders.gross,
    discounts: currentOrders.discounts,
    eligibleOrders: currentOrders.eligible,
  };

  return {
    period,
    filters,
    overview,
    sales: {
      ...buildTrend(scoped, period),
      gross: currentOrders.gross,
      revenue: currentOrders.revenue,
      discounts: currentOrders.discounts,
      refunds: currentOrders.refunds,
    },
    orders: currentOrders,
    products,
    categories,
    collections,
    customers,
    inventory,
    returns,
    offers,
    fulfillment,
    employees,
    tax: {
      configured: false,
      message: "Tax analytics is not configured. Orders do not store GST separately.",
    },
    generatedAt: new Date(now).toISOString(),
  };
};

export const getSalesSummary = (options) => getAnalyticsSnapshot(options).overview;
export const getOrderSummary = (options) => getAnalyticsSnapshot(options).orders;
export const getCustomerSummary = (options) => getAnalyticsSnapshot(options).customers;
export const getProductPerformance = (options) => getAnalyticsSnapshot(options).products;
export const getCategoryPerformance = (options) => getAnalyticsSnapshot(options).categories;
export const getInventorySummary = (options) => getAnalyticsSnapshot(options).inventory;
export const getReturnSummary = (options) => getAnalyticsSnapshot(options).returns;
export const getOfferPerformance = (options) => getAnalyticsSnapshot(options).offers;
export const getEmployeePerformance = (options) => getAnalyticsSnapshot(options).employees;
export const getAttendanceSummary = (options) => getAnalyticsSnapshot(options).employees;
export const getFulfillmentSummary = (options) => getAnalyticsSnapshot(options).fulfillment;

export const ANALYTICS_STATUS_FILTERS = [
  { id: "ALL", label: "All statuses" },
  ...STATUS_GROUPS.map((group) => ({ id: group.id, label: group.label })),
];

export default {
  HIGH_VALUE_THRESHOLD,
  CUSTOMER_SEGMENTS,
  CUSTOMER_SEGMENT_LABELS,
  isRevenueEligible,
  isFailedPayment,
  orderGross,
  orderRevenue,
  completedRefundAmount,
  segmentCustomer,
  loadCustomerRegistry,
  getAnalyticsSnapshot,
  getSalesSummary,
  getOrderSummary,
  getCustomerSummary,
  getProductPerformance,
  getCategoryPerformance,
  getInventorySummary,
  getReturnSummary,
  getOfferPerformance,
  getEmployeePerformance,
  getAttendanceSummary,
  getFulfillmentSummary,
  ANALYTICS_STATUS_FILTERS,
};
