/**
 * PRATIKSHYA FASHON — Employee operations reads.
 *
 * Role portals read mall-floor mock data here. Customer checkout orders
 * are pulled from the existing order service when present so sales and
 * support are not working from a disconnected dataset.
 */

import {
  MOCK_APPOINTMENTS,
  MOCK_FEEDBACK,
  MOCK_FOLLOW_UPS,
  MOCK_OFFERS,
  MOCK_PERFORMANCE,
  MOCK_SUPPORT_CASES,
  MOCK_STYLING_REQUESTS,
  MOCK_WALKIN_CUSTOMERS,
} from "../../data/employees/operations";
import { loadCustomerRegistry } from "../customer/customerRegistry";
import { products } from "../../data/products";
import { isAssistedOrder, loadOrders } from "../orders/orderService";
import offerRepository, {
  describeEligibility,
  formatOfferDiscount,
} from "../offers/offerRepository";
import { readStorage } from "../../utils/shopping";
import { formatEmployeeDateTime, todayKey } from "../../utils/employee";
import inventoryRepository from "../inventory/inventoryRepository";

export const getRegisteredCustomers = () => loadCustomerRegistry();

export const getDirectoryCustomers = () => {
  const registered = getRegisteredCustomers().map((customer) => ({
    id: customer.id,
    name: [customer.firstName, customer.lastName].filter(Boolean).join(" "),
    phone: customer.phone,
    email: customer.email,
    interest: "Atelier account",
    lastVisit: "Account",
    associate: "—",
    source: "account",
  }));
  const walkins = MOCK_WALKIN_CUSTOMERS.map((customer) => ({
    ...customer,
    source: "floor",
  }));
  return [...walkins, ...registered];
};

export const getBusinessOrders = () => loadOrders();

const projectAssistedOrder = (order) => ({
  id: order.id,
  employeeId: order.createdBy || order.employeeId || null,
  associate: order.associate || order.fulfillment?.assignedEmployeeName || "",
  customer: order.customer?.fullName || "",
  phone: order.customer?.phone || "",
  department: order.items?.[0]?.name || "",
  pieces: (order.items || []).map((item) => item.name).join(" · "),
  amount: Number(order.pricing?.total || order.amount || 0),
  status: order.floorStatus || order.status,
  createdAt: order.createdAt,
  channel: "ASSISTED",
  createdBy: order.createdBy || order.employeeId || null,
  productId: order.items?.[0]?.productId || null,
});

export const getAssistedOrders = (employeeId = null) => {
  const all = loadOrders().filter(isAssistedOrder).map(projectAssistedOrder);
  if (!employeeId) return all;
  return all.filter((order) => order.employeeId === employeeId || order.createdBy === employeeId);
};

export const getFollowUps = (employeeId = null) =>
  employeeId
    ? MOCK_FOLLOW_UPS.filter((item) => item.employeeId === employeeId)
    : MOCK_FOLLOW_UPS;

export const getOffers = () => {
  try {
    return offerRepository.all().map((offer) => ({
      id: offer.id,
      name: offer.name,
      code: offer.code,
      applies: describeEligibility(offer),
      value: formatOfferDiscount(offer),
      status: offer.displayStatus,
      until: offer.endDate
        ? new Date(`${offer.endDate}T00:00:00`).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })
        : "—",
    }));
  } catch {
    return MOCK_OFFERS;
  }
};

export const getStockMovements = () =>
  inventoryRepository.loadMovements().map(inventoryRepository.resolveMovement).map((movement) => ({
    id: movement.id,
    type: movement.type.replaceAll("_", " "),
    sku: movement.product?.sku || "—",
    piece: movement.productName,
    qty: movement.quantity,
    location: movement.location?.name || "—",
    at: movement.timestamp,
    by: movement.employeeName,
  }));

export const getTransfers = () =>
  inventoryRepository.loadTransfers().map(inventoryRepository.resolveTransfer).map((transfer) => ({
    ...transfer,
    piece: transfer.productName,
    from: transfer.source?.name || "—",
    to: transfer.destination?.name || "—",
    qty: transfer.quantity,
    status: transfer.status.replaceAll("_", " "),
  }));

export const getWarehouseTasks = (kind = null) => {
  const transfers = inventoryRepository.loadTransfers().map(inventoryRepository.resolveTransfer);
  const openTransfers = transfers.filter((transfer) => !["RECEIVED", "CANCELLED"].includes(transfer.status));
  const incoming = openTransfers
    .filter((transfer) => transfer.destination?.type === "WAREHOUSE")
    .map((transfer) => ({
      id: `incoming-${transfer.id}`,
      kind: "Incoming",
      ref: transfer.id,
      detail: `${transfer.productName} · ${transfer.quantity} units from ${transfer.source?.name || "source"}`,
      status: transfer.status.replaceAll("_", " "),
      eta: formatEmployeeDateTime(transfer.updatedAt),
    }));
  const outgoing = openTransfers
    .filter((transfer) => transfer.source?.type === "WAREHOUSE")
    .map((transfer) => ({
      id: `outgoing-${transfer.id}`,
      kind: "Outgoing",
      ref: transfer.id,
      detail: `${transfer.productName} · ${transfer.quantity} units to ${transfer.destination?.name || "destination"}`,
      status: transfer.status.replaceAll("_", " "),
      eta: formatEmployeeDateTime(transfer.updatedAt),
    }));
  const picks = inventoryRepository.loadMovements()
    .map(inventoryRepository.resolveMovement)
    .filter((movement) =>
      movement.location?.type === "WAREHOUSE" && ["RESERVE", "SALE"].includes(movement.type)
    )
    .slice(0, 12)
    .map((movement) => ({
      id: `pick-${movement.id}`,
      kind: "Pick",
      ref: movement.reference,
      detail: `${movement.productName} · ${Math.abs(movement.quantity)} units`,
      status: movement.type === "SALE" ? "Issued" : "Reserved",
      eta: formatEmployeeDateTime(movement.timestamp),
    }));
  const damaged = inventoryRepository.query({ locationType: "WAREHOUSE", hasDamaged: true })
    .map((record) => ({
      id: `damaged-${record.id}`,
      kind: "Damaged",
      ref: record.sku,
      detail: `${record.productName} · ${record.quantity.damaged} quarantined`,
      status: "Quarantine",
      eta: formatEmployeeDateTime(record.updatedAt),
    }));
  const tasks = [...incoming, ...outgoing, ...picks, ...damaged];
  return kind ? tasks.filter((task) => task.kind === kind) : tasks;
};

export const getSupportCases = () => MOCK_SUPPORT_CASES;

export const getFeedback = () => MOCK_FEEDBACK;

export const getStylingRequests = () => MOCK_STYLING_REQUESTS;

export const getAppointments = () => MOCK_APPOINTMENTS;

export const getPerformance = (employeeId) =>
  MOCK_PERFORMANCE[employeeId] ?? {
    monthlyTarget: 0,
    achievement: 0,
    customersServed: 0,
    ordersAssisted: 0,
    conversion: 0,
    averageTicket: 0,
    followUps: 0,
  };

export const getCatalogueStock = () => {
  const rows = inventoryRepository.query();
  const byProduct = (status) => {
    const ids = new Set(rows.filter((row) => row.status === status).map((row) => row.productId));
    return products.filter((product) => ids.has(product.id));
  };
  const low = byProduct("LOW_STOCK");
  const out = byProduct("OUT_OF_STOCK");
  const availableIds = new Set(rows.filter((row) => row.quantity.available > 0).map((row) => row.productId));
  const available = products.filter((product) => availableIds.has(product.id));
  return {
    total: new Set(rows.map((row) => row.productId)).size,
    available: available.length,
    low: rows.filter((row) => row.status === "LOW_STOCK").length,
    out: rows.filter((row) => row.status === "OUT_OF_STOCK").length,
    lowItems: low.slice(0, 12),
    outItems: out.slice(0, 12),
    availableItems: available.slice(0, 16),
  };
};

export const searchProducts = (term = "") => {
  const query = String(term).trim().toLowerCase();
  if (!query) return products.slice(0, 16);
  return products
    .filter((product) => product.searchText.includes(query) || product.sku.toLowerCase().includes(query))
    .slice(0, 24);
};

/** Compatibility shim — prefer workforce/attendanceService. */
export const attendanceFor = (employeeId) => {
  try {
    const { getTodayAttendance } = requireCompatibility();
    const record = getTodayAttendance(employeeId);
    if (!record) {
      return {
        employeeId,
        date: todayKey(),
        status: "NOT_CHECKED_IN",
        checkedInAt: null,
        checkedOutAt: null,
      };
    }
    return {
      ...record,
      checkedInAt: record.checkIn,
      checkedOutAt: record.checkOut,
    };
  } catch {
    return {
      employeeId,
      date: todayKey(),
      status: "NOT_CHECKED_IN",
      checkedInAt: null,
      checkedOutAt: null,
    };
  }
};

function requireCompatibility() {
  return {
    getTodayAttendance: (id) => {
      const stored = readStorage("pratikshya_attendance", []);
      const today = todayKey();
      const record = Array.isArray(stored)
        ? stored.find((entry) => entry.employeeId === id && entry.date === today)
        : null;
      return record || {
        employeeId: id,
        date: today,
        status: "NOT_CHECKED_IN",
        checkIn: null,
        checkOut: null,
      };
    },
  };
}

export const defaultDashboardMetrics = (role) => {
  const stock = getCatalogueStock();
  const cases = getSupportCases();
  const styling = getStylingRequests();
  const appointments = getAppointments();
  const transfers = getTransfers();
  const warehouseTasks = getWarehouseTasks();

  if (role === "SALES_EXECUTIVE") {
    return {
      primary: [
        { label: "Today's sales", value: "₹1,24,850", hint: "Floor billed · demo" },
        { label: "Orders assisted", value: "18", hint: "This month" },
        { label: "Customers served", value: "42", hint: "This month" },
        { label: "Pending follow-ups", value: "6", hint: "Open" },
      ],
    };
  }
  if (role === "INVENTORY_MANAGER" || role === "INVENTORY_STAFF") {
    return {
      primary: [
        { label: "Available stock", value: String(stock.available), hint: "SKUs on hand" },
        { label: "Low stock", value: String(stock.low), hint: "Needs reorder" },
        { label: "Out of stock", value: String(stock.out), hint: "Unavailable" },
        { label: "Pending transfers", value: String(transfers.filter((item) => !["RECEIVED", "CANCELLED"].includes(item.status)).length), hint: "Open" },
      ],
    };
  }
  if (role === "WAREHOUSE_STAFF") {
    return {
      primary: [
        { label: "Incoming", value: String(warehouseTasks.filter((task) => task.kind === "Incoming").length), hint: "Transfer receipts" },
        { label: "Outgoing", value: String(warehouseTasks.filter((task) => task.kind === "Outgoing").length), hint: "Dispatch queue" },
        { label: "Pick & pack", value: String(warehouseTasks.filter((task) => task.kind === "Pick").length), hint: "Reserved or issued" },
        { label: "Damaged", value: String(warehouseTasks.filter((task) => task.kind === "Damaged").length), hint: "Quarantine" },
      ],
    };
  }
  if (role === "CUSTOMER_SUPPORT") {
    return {
      primary: [
        { label: "Open cases", value: String(cases.filter((item) => item.status !== "Resolved").length), hint: "Care desk" },
        { label: "Pending returns", value: "4", hint: "Awaiting review" },
        { label: "Customers assisted", value: "27", hint: "This month" },
        { label: "Response queue", value: "5", hint: "Unanswered" },
      ],
    };
  }
  if (role === "FASHION_STYLIST") {
    return {
      primary: [
        { label: "Appointments", value: String(appointments.length), hint: "This week" },
        { label: "Styling requests", value: String(styling.length), hint: "Open book" },
        { label: "Bridal consultations", value: "3", hint: "Active" },
        { label: "Recommendations", value: "16", hint: "This month" },
      ],
    };
  }
  if (role === "STORE_MANAGER") {
    return {
      primary: [
        { label: "Store sales", value: "₹8,42,600", hint: "Today · demo" },
        { label: "Team on floor", value: "14", hint: "Checked in" },
        { label: "Conversion", value: "28%", hint: "This week" },
        { label: "Low stock alerts", value: String(stock.low), hint: "Needs attention" },
      ],
    };
  }
  return { primary: [] };
};

export default {
  getRegisteredCustomers,
  getDirectoryCustomers,
  getBusinessOrders,
  getAssistedOrders,
  getFollowUps,
  getOffers,
  getStockMovements,
  getTransfers,
  getWarehouseTasks,
  getSupportCases,
  getFeedback,
  getStylingRequests,
  getAppointments,
  getPerformance,
  getCatalogueStock,
  searchProducts,
  attendanceFor,
  defaultDashboardMetrics,
};
