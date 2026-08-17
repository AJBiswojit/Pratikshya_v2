/**
 * PRATIKSHYA FASHON — Employee Order Desk (Phase 15)
 *
 * Role-aware operational workspace.
 * Warehouse sees warehouse orders, Store Manager sees store + warehouse,
 * Sales sees customer view, Support sees issues, Inventory sees stock-linked.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import { useOrder } from "../../context/OrderContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { ORDER_STATUS } from "../../config/orderConfig";
import { formatINR } from "../../utils/shopping";
import { formatOrderDate } from "../../utils/orders";

function Metric({ label, value, hint }) {
  return (
    <div className="border border-mist/70 bg-surface/30 p-4">
      <p className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">{label}</p>
      <p className="mt-2 font-display text-2xl font-light text-ink">{value}</p>
      {hint && <p className="mt-1 font-ui text-[10px] text-taupe">{hint}</p>}
    </div>
  );
}

export default function EmployeeOrders() {
  const { allOrders } = useOrder();
  const { employee } = useEmployeeAuth();
  const role = employee?.role;

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const roleFiltered = useMemo(() => {
    let orders = allOrders;

    if (role === "WAREHOUSE_STAFF") {
      orders = orders.filter((o) => o.fulfillment?.fulfillmentType === "WAREHOUSE" || o.fulfillment?.sourceLocationId === "loc-main-warehouse");
      // Further filter to assigned to current employee if possible
      const assigned = orders.filter((o) => o.fulfillment?.assignedEmployeeId === employee.employeeId);
      if (assigned.length) orders = assigned;
    } else if (role === "INVENTORY_MANAGER" || role === "INVENTORY_STAFF") {
      // Inventory-linked: show orders with reservations, stock exceptions
      orders = orders.filter((o) => o.inventoryReservationId || o.fulfillment?.status);
    } else if (role === "CUSTOMER_SUPPORT") {
      // Payment issues, cancellation, returns
      orders = orders.filter((o) => [ORDER_STATUS.PENDING_PAYMENT, ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED, ORDER_STATUS.REFUND_PENDING].includes(o.status) || o.paymentStatus === "FAILED" || o.paymentStatus === "PENDING");
      if (orders.length === 0) orders = allOrders.slice(0, 8); // fallback to show something in demo
    } else if (role === "SALES_EXECUTIVE") {
      // Customer orders view only, no internal fulfillment deep details
      // Show recent orders
      orders = allOrders.slice(0, 12);
    }
    // Store Manager, Super Admin see all
    return orders;
  }, [allOrders, role, employee]);

  const filtered = useMemo(() => {
    return roleFiltered.filter((order) => {
      if (search) {
        const q = search.toLowerCase();
        const hay = [order.id, order.customer?.fullName, order.customer?.email, order.customer?.phone, ...(order.items?.map((i) => i.name) || [])].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      return true;
    });
  }, [roleFiltered, search, statusFilter]);

  // Metrics based on roleFiltered
  const metrics = useMemo(() => {
    const count = (statuses) => roleFiltered.filter((o) => statuses.includes(o.status)).length;
    if (role === "WAREHOUSE_STAFF") {
      return [
        { label: "Assigned Orders", value: roleFiltered.length },
        { label: "Picking", value: count([ORDER_STATUS.PICKING, ORDER_STATUS.ALLOCATED]) },
        { label: "Packing", value: count([ORDER_STATUS.PACKED]) },
        { label: "Ready to Dispatch", value: count([ORDER_STATUS.READY_TO_DISPATCH]) },
      ];
    }
    if (role === "STORE_MANAGER") {
      return [
        { label: "Orders", value: roleFiltered.length },
        { label: "Pending Fulfillment", value: count([ORDER_STATUS.PROCESSING, ORDER_STATUS.ALLOCATED]) },
        { label: "Picking", value: count([ORDER_STATUS.PICKING]) },
        { label: "Packed", value: count([ORDER_STATUS.PACKED]) },
        { label: "Ready to Dispatch", value: count([ORDER_STATUS.READY_TO_DISPATCH]) },
        { label: "Today's Fulfillment", value: roleFiltered.filter((o) => o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length },
      ];
    }
    if (role === "CUSTOMER_SUPPORT") {
      return [
        { label: "Customer Orders", value: roleFiltered.length },
        { label: "Payment Issues", value: allOrders.filter((o) => o.paymentStatus === "FAILED" || o.paymentStatus === "PENDING").length },
        { label: "Cancellation Requests", value: allOrders.filter((o) => o.status === ORDER_STATUS.CANCELLED).length },
        { label: "Return Requests", value: allOrders.filter((o) => [ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED].includes(o.status)).length },
      ];
    }
    if (role === "INVENTORY_MANAGER") {
      return [
        { label: "Inventory-linked Orders", value: roleFiltered.length },
        { label: "Reservations", value: roleFiltered.filter((o) => o.inventoryReservationId).length },
        { label: "Stock Exceptions", value: roleFiltered.filter((o) => o.fulfillment?.status === "PENDING").length },
      ];
    }
    return [
      { label: "Orders Assisted", value: "12", hint: "Demo" },
      { label: "Customer Orders", value: roleFiltered.length },
      { label: "Today", value: roleFiltered.filter((o) => o.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length },
    ];
  }, [roleFiltered, role, allOrders]);

  const queueSections = useMemo(() => {
    return [
      { id: "pending", label: "Pending Allocation", statuses: [ORDER_STATUS.PROCESSING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED], orders: roleFiltered.filter((o) => [ORDER_STATUS.PROCESSING, ORDER_STATUS.ORDER_CONFIRMED, ORDER_STATUS.CONFIRMED].includes(o.status)) },
      { id: "picking", label: "Picking", statuses: [ORDER_STATUS.ALLOCATED, ORDER_STATUS.PICKING], orders: roleFiltered.filter((o) => [ORDER_STATUS.ALLOCATED, ORDER_STATUS.PICKING].includes(o.status)) },
      { id: "packing", label: "Packing", statuses: [ORDER_STATUS.PACKED], orders: roleFiltered.filter((o) => o.status === ORDER_STATUS.PACKED) },
      { id: "ready", label: "Ready to Dispatch", statuses: [ORDER_STATUS.READY_TO_DISPATCH], orders: roleFiltered.filter((o) => o.status === ORDER_STATUS.READY_TO_DISPATCH) },
      { id: "shipped", label: "Shipped", statuses: [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY], orders: roleFiltered.filter((o) => [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY].includes(o.status)) },
    ];
  }, [roleFiltered]);

  return (
    <EmployeePage
      eyebrow={`${employee?.roleLabel || role} / Orders`}
      title={
        <>
          Orders <span className="italic text-accent">desk.</span>
        </>
      }
      description={
        role === "WAREHOUSE_STAFF"
          ? "Warehouse fulfillment queue — pick, pack and ready to dispatch."
          : role === "STORE_MANAGER"
          ? "Store operational orders — allocation through dispatch."
          : role === "CUSTOMER_SUPPORT"
          ? "Customer care order queue — payment, cancellation and returns."
          : role === "INVENTORY_MANAGER"
          ? "Inventory-linked orders — reservations and stock exceptions."
          : "Customer orders for assisted selling."
      }
    >
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((m) => (
          <Metric key={m.label} label={m.label} value={m.value} hint={m.hint} />
        ))}
      </div>

      {/* Search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search order, customer, phone" className="h-9 w-full border border-mist bg-canvas pl-9 pr-3 font-ui text-xs outline-none focus:border-accent" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 border border-mist bg-canvas px-3 font-ui text-xs">
          <option value="all">All statuses</option>
          {Object.values(ORDER_STATUS).map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <span className="font-ui text-[11px] text-taupe">{filtered.length} orders</span>
      </div>

      {/* Queues */}
      <div className="mb-8 grid gap-6 lg:grid-cols-5">
        {queueSections.map((section) => (
          <div key={section.id} className="border border-mist/60 bg-surface/20 p-3">
            <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{section.label}</p>
            <p className="mt-1 font-display text-xl">{section.orders.length}</p>
            <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
              {section.orders.slice(0, 6).map((o) => (
                <Link key={o.id} to={`/employee/orders/${o.id}`} className="block border border-mist/40 bg-canvas px-2 py-2 hover:border-accent/40">
                  <p className="font-mono text-[11px]">{o.id}</p>
                  <p className="font-ui text-[11px] truncate">{o.customer?.fullName} · {o.items.length} pcs</p>
                </Link>
              ))}
              {section.orders.length === 0 && <p className="font-ui text-[11px] text-taupe">No orders</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="border border-mist/80 bg-surface/30 overflow-x-auto">
        <table className="min-w-full text-left hidden md:table">
          <thead className="border-b border-mist/70 bg-canvas/60">
            <tr>
              {["Order", "Customer", "Items", "Total", "Status", "Location", "Created", ""].map((h) => (
                <th key={h} className="px-4 py-3 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id} className="border-b border-mist/40">
                <td className="px-4 py-3 font-mono text-xs"><Link to={`/employee/orders/${order.id}`} className="text-brass hover:text-accent">{order.id}</Link></td>
                <td className="px-4 py-3 font-ui text-sm">{order.customer?.fullName}</td>
                <td className="px-4 py-3 font-ui text-xs">{order.items.length} items</td>
                <td className="px-4 py-3 font-ui text-xs">{formatINR(order.pricing?.total)}</td>
                <td className="px-4 py-3"><OrderStatusBadge status={order.status} /></td>
                <td className="px-4 py-3 font-ui text-[11px]">{order.fulfillment?.sourceLocationId || "—"}</td>
                <td className="px-4 py-3 font-ui text-[11px] text-taupe">{formatOrderDate(order.createdAt)}</td>
                <td className="px-4 py-3"><Link to={`/employee/orders/${order.id}`} className="inline-flex items-center gap-1 font-ui text-[11px] text-brass"><Eye size={12} /> Open</Link></td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid gap-3 p-3 md:hidden">
          {filtered.map((order) => (
            <Link key={order.id} to={`/employee/orders/${order.id}`} className="border border-mist/60 bg-canvas p-3">
              <div className="flex justify-between">
                <span className="font-mono text-xs">{order.id}</span>
                <OrderStatusBadge status={order.status} />
              </div>
              <p className="mt-1 font-ui text-sm">{order.customer?.fullName} · {formatINR(order.pricing?.total)}</p>
              <p className="font-ui text-[11px] text-taupe">{formatOrderDate(order.createdAt)}</p>
            </Link>
          ))}
        </div>
      </div>
    </EmployeePage>
  );
}
