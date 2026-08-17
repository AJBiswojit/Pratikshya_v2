/**
 * PRATIKSHYA FASHON — Analytics CSV export.
 *
 * Native browser generation via the existing workforce CSV helper.
 * No extra dependency. Writes only the filtered snapshot the operator sees.
 */

import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";
import { downloadCsv } from "../workforce/dateUtils";
import { formatINR } from "../../utils/shopping";

const money = (value) => Math.round(Number(value) || 0);

export const exportAnalyticsCsv = (snapshot, view = "overview", actor = null) => {
  if (!snapshot) return { ok: false };
  const period = snapshot.period;
  const stamp = `${period.start}_to_${period.end}`;
  const filename = `pratikshya-analytics-${view.toLowerCase()}-${stamp}.csv`;

  let headers = [];
  let rows = [];

  if (view === "products") {
    headers = ["Product", "SKU", "Category", "Units sold", "Revenue", "Orders", "Returns", "Available stock"];
    rows = (snapshot.products.sold || []).map((row) => [
      row.name,
      row.sku,
      row.category,
      row.unitsSold,
      money(row.revenue),
      row.orders,
      row.returnUnits,
      row.available ?? "",
    ]);
  } else if (view === "customers") {
    headers = ["Customer", "Email", "Segment", "Orders", "Revenue", "Returns", "Last order"];
    rows = (snapshot.customers.top || []).map((row) => [
      row.name,
      row.email,
      row.segment,
      row.periodOrders,
      money(row.periodSpend),
      row.periodReturns,
      row.lastOrder || "",
    ]);
  } else if (view === "inventory") {
    headers = ["Product", "SKU", "Available", "Threshold", "Location", "Status"];
    rows = (snapshot.inventory.lowStockRows || []).map((row) => [
      row.product,
      row.sku,
      row.available,
      row.threshold,
      row.location,
      row.status,
    ]);
  } else if (view === "returns") {
    headers = ["Reason", "Count", "Percentage"];
    rows = (snapshot.returns.reasons || []).map((row) => [row.label, row.count, row.percentage ?? ""]);
  } else if (view === "offers") {
    headers = ["Offer", "Code", "Status", "Redemptions", "Revenue influenced", "Discount given", "Orders"];
    rows = (snapshot.offers.rows || []).map((row) => [
      row.name,
      row.code,
      row.status,
      row.redemptions,
      money(row.revenue),
      money(row.discount),
      row.orders,
    ]);
  } else if (view === "employees") {
    headers = ["Employee", "Role", "Department", "Attendance %", "Present", "Late", "Absent", "Leave"];
    rows = (snapshot.employees.attendanceRows || []).map((row) => [
      row.name,
      row.role,
      row.department,
      row.summary.attendancePercent ?? "",
      row.summary.present,
      row.summary.late,
      row.summary.absent,
      row.summary.leave,
    ]);
  } else if (view === "sales") {
    headers = ["Date", "Revenue", "Orders"];
    rows = (snapshot.sales.series || []).map((row) => [row.label, money(row.revenue), row.orders]);
  } else {
    headers = ["Metric", "Current", "Previous", "Change"];
    rows = [
      ["Revenue", money(snapshot.overview.revenue.current), money(snapshot.overview.revenue.previous), snapshot.overview.revenue.changeLabel || ""],
      ["Orders", snapshot.overview.orders.current, snapshot.overview.orders.previous, snapshot.overview.orders.changeLabel || ""],
      ["Average order value", money(snapshot.overview.aov.current), money(snapshot.overview.aov.previous), snapshot.overview.aov.changeLabel || ""],
      ["Customers", snapshot.overview.customers.current, snapshot.overview.customers.previous, snapshot.overview.customers.changeLabel || ""],
      ["New customers", snapshot.overview.newCustomers.current, snapshot.overview.newCustomers.previous, snapshot.overview.newCustomers.changeLabel || ""],
      ["Units sold", snapshot.overview.unitsSold.current, snapshot.overview.unitsSold.previous, snapshot.overview.unitsSold.changeLabel || ""],
      ["Returns", snapshot.overview.returns.current, snapshot.overview.returns.previous, snapshot.overview.returns.changeLabel || ""],
      ["Refunds", money(snapshot.overview.refunds.current), money(snapshot.overview.refunds.previous), snapshot.overview.refunds.changeLabel || ""],
    ];
  }

  downloadCsv(filename, headers, rows);

  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      action: ACTIVITY_ACTIONS.ANALYTICS_EXPORT,
      summary: `Exported ${view} analytics · ${period.label}`,
    });
  } catch {
    /* Export still succeeds if the diary is unavailable. */
  }

  return { ok: true, filename };
};

export const formatChangeHint = (metric, comparisonLabel) => {
  if (!metric?.comparable || !metric.changeLabel) return comparisonLabel || "";
  return `${metric.changeLabel} ${comparisonLabel || "vs previous period"}`;
};

export const moneyOrDash = (value, hasData = true) => {
  if (!hasData) return "—";
  return formatINR(value);
};

export default { exportAnalyticsCsv, formatChangeHint, moneyOrDash };
