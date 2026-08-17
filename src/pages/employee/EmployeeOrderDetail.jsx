/**
 * Employee Order Detail — operational processing
 */

import { useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Package, MapPin, Check } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import OrderTimeline from "../../components/orders/OrderTimeline";
import { useOrder } from "../../context/OrderContext";
import { useInventory } from "../../context/InventoryContext";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { ORDER_STATUS, CARRIERS } from "../../config/orderConfig";
import { formatINR } from "../../utils/shopping";
import { formatOrderDate } from "../../utils/orders";

export default function EmployeeOrderDetail() {
  const { orderId } = useParams();
  const { getOrderByIdAdmin, markItemPicked, markPacked, markReadyToDispatch, dispatchOrder, markOutForDelivery, markDelivered, addInternalNote } = useOrder();
  const inventory = useInventory();
  const { employee, hasPermission } = useEmployeeAuth();

  const order = getOrderByIdAdmin(orderId);
  const [notice, setNotice] = useState("");
  const [carrier, setCarrier] = useState("Delhivery");
  const [tracking, setTracking] = useState("");
  const [note, setNote] = useState("");

  const canPick = hasPermission("orders.pick") || hasPermission("orders.fulfill") || hasPermission("warehouse.pick");
  const canPack = hasPermission("orders.pack") || hasPermission("orders.fulfill");
  const canDispatch = hasPermission("orders.dispatch") || hasPermission("orders.fulfill");
  const canViewInventoryPlacement = hasPermission("inventory.view") || hasPermission("warehouse.view");

  const inventoryDetails = useMemo(() => {
    if (!order) return [];
    return order.items.map((item) => {
      const records = inventory.records.filter((r) => r.productId === item.productId);
      const first = records[0];
      return {
        ...item,
        placement: first ? `${first.location?.name} · ${first.placementLabel}` : "—",
        rack: first?.placement?.rack || "—",
        shelf: first?.placement?.shelf || "—",
        bin: first?.placement?.bin || "—",
        zone: first?.placement?.zone || first?.placement?.section || "—",
        available: first?.quantity?.available ?? "—",
      };
    });
  }, [order, inventory.records]);

  if (!order) {
    return (
      <EmployeePage eyebrow="Orders" title="Order not found" description="No such order in this browser.">
        <Link to="/employee/orders" className="font-ui text-sm text-brass hover:text-accent">Back to orders</Link>
      </EmployeePage>
    );
  }

  const handle = (fn, payload, msg) => {
    const res = fn(order.id, payload);
    setNotice(res?.ok ? msg || "Updated" : res?.message || "Failed");
  };

  return (
    <EmployeePage
      eyebrow={`Orders / ${order.id}`}
      title={<><span className="font-mono">{order.id}</span> · {order.customer?.fullName}</>}
      description={`${order.items.length} items · ${formatINR(order.pricing.total)} · ${order.status.replace(/_/g, " ")}`}
      actions={<Link to="/employee/orders" className="inline-flex items-center gap-2 border border-mist bg-canvas px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em]"><ArrowLeft size={12} /> Back</Link>}
    >
      {notice && <p className="mb-4 border border-accent/30 bg-accent/5 px-4 py-2 font-ui text-[11px] text-accent">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <div className="border border-mist/70 bg-surface/30 p-5">
            <div className="flex flex-wrap gap-2 items-center">
              <OrderStatusBadge status={order.status} />
              <OrderStatusBadge status={order.paymentStatus} kind="payment" />
              <span className="font-ui text-[11px] text-taupe">{formatOrderDate(order.createdAt)}</span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Customer</p>
                <p className="mt-1 font-ui text-sm">{order.customer.fullName} · {order.customer.phone}</p>
                <p className="font-ui text-xs text-taupe">{order.customer.email}</p>
                <p className="mt-2 font-ui text-xs flex gap-1"><MapPin size={12} /> {order.address?.city}, {order.address?.pincode}</p>
              </div>
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Fulfillment</p>
                <p className="mt-1 font-ui text-sm">{order.fulfillment?.assignedEmployeeName || "Unassigned"} · {order.fulfillment?.sourceLocationId}</p>
                <p className="font-ui text-[11px] text-taupe">{order.fulfillment?.fulfillmentType} · {order.fulfillment?.status}</p>
              </div>
            </div>
          </div>

          <div className="border border-mist/70 bg-surface/20 p-5">
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-accent mb-3">Picking — Physical placement</h3>
            <p className="font-ui text-[11px] text-taupe mb-3">Pick each item from its rack. Data from Phase 14 inventory placement.</p>
            <div className="space-y-3">
              {inventoryDetails.map((item) => (
                <div key={item.lineId} className="flex gap-3 border border-mist/50 bg-canvas p-3">
                  <div className="h-12 w-12 bg-mist/20 grid place-items-center"><Package size={14} /></div>
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-sm">{item.name} ×{item.quantity}</p>
                    {canViewInventoryPlacement ? (
                      <p className="font-ui text-[11px] text-taupe">Zone {item.zone} · Rack {item.rack} · Shelf {item.shelf} · Bin {item.bin} · {item.placement}</p>
                    ) : (
                      <p className="font-ui text-[11px] text-taupe">Location: {order.fulfillment?.sourceLocationId} · Qty {item.quantity}</p>
                    )}
                    <p className="font-ui text-[10px] mt-1">{order.fulfillment?.picking?.[item.lineId]?.picked ? <span className="text-accent inline-flex gap-1 items-center"><Check size={10} /> Picked</span> : "Pending"}</p>
                  </div>
                  {canPick && order.status === ORDER_STATUS.ALLOCATED || order.status === ORDER_STATUS.PICKING ? (
                    <button onClick={() => handle(markItemPicked, { lineId: item.lineId, actor: { name: employee?.name, employeeId: employee?.employeeId } }, "Item picked")} className="self-center border border-accent text-accent px-3 py-1 font-ui text-[11px]">Pick</button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          <div className="border border-mist/70 bg-surface/20 p-5">
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-accent mb-3">Items & Pricing</h3>
            <div className="divide-y divide-mist/50">
              {order.items.map((it) => (
                <div key={it.lineId} className="flex justify-between py-2 font-ui text-sm">
                  <span>{it.name} ×{it.quantity}</span>
                  <span>{formatINR(it.lineTotal)}</span>
                </div>
              ))}
            </div>
            {order.pricing.couponCode ? (
              <div className="mt-3 flex justify-between font-ui text-sm text-taupe">
                <span>Offer · {order.pricing.couponCode}</span>
                <span>{order.pricing.couponDiscount > 0 ? `− ${formatINR(order.pricing.couponDiscount)}` : "Applied"}</span>
              </div>
            ) : null}
            <div className="mt-3 flex justify-between font-medium border-t border-mist/60 pt-2"><span>Total</span><span>{formatINR(order.pricing.total)}</span></div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="border border-mist/70 bg-surface/30 p-5">
            <h3 className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe mb-3">Operations</h3>
            <div className="space-y-3">
              {order.status === ORDER_STATUS.PICKING && canPack && (
                <button onClick={() => handle(markPacked, { packageCount: 1, notes: "Packed securely", actor: { name: employee?.name } }, "Packed")} className="w-full bg-ink text-ivory py-2 font-ui text-[11px] uppercase">Mark as Packed</button>
              )}
              {order.status === ORDER_STATUS.PACKED && (
                <button onClick={() => handle(markReadyToDispatch, { actor: { name: employee?.name } }, "Ready to dispatch")} className="w-full bg-ink text-ivory py-2 font-ui text-[11px] uppercase">Ready to Dispatch</button>
              )}
              {order.status === ORDER_STATUS.READY_TO_DISPATCH && canDispatch && (
                <div className="space-y-2">
                  <select value={carrier} onChange={(e) => setCarrier(e.target.value)} className="h-9 w-full border border-mist bg-canvas px-2 font-ui text-xs">
                    {CARRIERS.map((c) => <option key={c.id} value={c.label}>{c.label}</option>)}
                  </select>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Tracking number" className="h-9 w-full border border-mist bg-canvas px-2 font-ui text-xs" />
                  <button onClick={() => handle(dispatchOrder, { carrier, trackingNumber: tracking || `TRK-${Date.now().toString(36).toUpperCase()}`, shippingMethod: carrier, actor: { name: employee?.name }, estimatedDelivery: "15–17 Aug 2026" }, "Dispatched")} className="w-full bg-ink text-ivory py-2 font-ui text-[11px] uppercase">Dispatch</button>
                </div>
              )}
              {order.status === ORDER_STATUS.SHIPPED && canDispatch && (
                <button onClick={() => handle(markOutForDelivery, { actor: { name: "Courier" } }, "Out for delivery")} className="w-full bg-ink text-ivory py-2 font-ui text-[11px] uppercase">Out for Delivery</button>
              )}
              {order.status === ORDER_STATUS.OUT_FOR_DELIVERY && canDispatch && (
                <button onClick={() => handle(markDelivered, { actor: { name: "Courier" } }, "Delivered")} className="w-full bg-ink text-ivory py-2 font-ui text-[11px] uppercase">Delivered</button>
              )}
              {!["DELIVERED", "CANCELLED", "RETURNED", "REFUNDED"].includes(order.status) && (
                <p className="font-ui text-[11px] text-taupe">Use status actions above. Inventory quantity is not re-deducted on picking — reservation already handled at checkout.</p>
              )}
            </div>
          </div>

          <div className="border border-mist/70 bg-surface/30 p-5">
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-3">Timeline</h3>
            <OrderTimeline events={(order.timeline && order.timeline.length ? order.timeline.map((t) => ({ status: t.status, title: t.status?.replace(/_/g, " ") || t.type, description: t.note, timestamp: t.at, state: "done" })) : order.statusHistory.map((h) => ({ status: h.status, title: h.status.replace(/_/g, " "), timestamp: h.at, state: "done" })))} />
          </div>

          <div className="border border-mist/70 bg-surface/30 p-5">
            <h3 className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-2">Internal notes (not visible to customer)</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto mb-3">
              {(order.notes?.internal || []).map((n, i) => (
                <div key={i} className="border-l-2 border-brass bg-canvas px-2 py-1">
                  <p className="font-ui text-xs">{n.text}</p>
                  <p className="font-ui text-[10px] text-taupe">{n.by}</p>
                </div>
              ))}
              {!(order.notes?.internal?.length) && <p className="font-ui text-xs text-taupe">No notes.</p>}
            </div>
            <div className="flex gap-2">
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add note — e.g. evening delivery" className="flex-1 h-9 border border-mist bg-canvas px-2 font-ui text-xs" />
              <button onClick={() => { if (!note.trim()) return; handle(addInternalNote, { text: note, actor: { name: employee?.name } }, "Note added"); setNote(""); }} className="px-3 bg-ink text-ivory font-ui text-[11px] uppercase">Add</button>
            </div>
          </div>
        </div>
      </div>
    </EmployeePage>
  );
}
