/**
 * PRATIKSHYA FASHON — Admin Return Detail (Phase 16.1)
 *
 * Premium operational return management interface.
 * Shows return details, provides context-sensitive actions based on status,
 * and displays the full return timeline.
 *
 * Actions: Approve, Reject, Schedule Pickup, Receive, Inspect, Initiate Refund, Complete Refund
 */

import { useMemo, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import { useOrder } from "../../context/OrderContext";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { RETURN_STATUS, RETURN_STATUSES } from "../../config/orderConfig";
import {
  getReturnTimeline,
  canApproveReturn,
  canRejectReturn,
  canSchedulePickup,
  canReceiveReturn,
  canInspectReturn,
  canInitiateRefund,
  canCompleteRefund,
  REJECTION_REASONS,
  PICKUP_METHODS,
  PACKAGE_CONDITIONS,
  INSPECTION_CONDITIONS,
} from "../../services/orders/returnService";
import { formatINR } from "../../utils/shopping";
import { formatOrderDate } from "../../utils/orders";
import { AtelierButton, Rule } from "../../design-system";
import { cn } from "../../utils/cn";

export default function AdminReturnDetail() {
  const { returnId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const {
    allOrders = [],
    approveReturn,
    rejectReturn,
    scheduleReturnPickup,
    receiveReturn,
    inspectReturn,
    initiateReturnRefund,
    completeReturnRefund,
  } = useOrder();

  // Find the return record
  const returnRecord = useMemo(() => {
    let found = null;
    allOrders.some((order) =>
      (order.returns || []).some((record) => {
        if (record.id === returnId) {
          found = { ...record, order };
          return true;
        }
        return false;
      })
    );
    return found;
  }, [allOrders, returnId]);

  // Action states
  const [showReject, setShowReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const [showPickup, setShowPickup] = useState(false);
  const [pickupDate, setPickupDate] = useState("");
  const [pickupMethod, setPickupMethod] = useState("courier");
  const [pickupReference, setPickupReference] = useState("");
  const [pickupNote, setPickupNote] = useState("");

  const [showReceive, setShowReceive] = useState(false);
  const [packageCondition, setPackageCondition] = useState("good");
  const [receiveNote, setReceiveNote] = useState("");

  const [showInspect, setShowInspect] = useState(false);
  const [inspections, setInspections] = useState({});

  const [notice, setNotice] = useState("");
  const [processing, setProcessing] = useState(false);

  if (!returnRecord) {
    return <AdminPage title="Return not found" />;
  }

  const { order } = returnRecord;
  const timeline = getReturnTimeline(returnRecord);
  const statusDef = RETURN_STATUSES[returnRecord.status];
  const isRejected = returnRecord.status === RETURN_STATUS.REJECTED;

  const actor = admin
    ? { adminId: admin.adminId, name: admin.name || "Admin" }
    : { name: "System" };

  // Action handlers
  const handleApprove = async () => {
    setProcessing(true);
    const result = await approveReturn(returnRecord.id, { actor });
    setProcessing(false);
    if (result.ok) {
      setNotice("Return approved successfully.");
    } else {
      setNotice(result.message || "Failed to approve return.");
    }
  };

  const handleReject = async () => {
    if (!rejectReason) {
      setNotice("Please select a rejection reason.");
      return;
    }
    setProcessing(true);
    const result = await rejectReturn(returnRecord.id, {
      actor,
      reason: rejectReason,
      note: rejectNote,
    });
    setProcessing(false);
    if (result.ok) {
      setShowReject(false);
      setNotice("Return rejected.");
    } else {
      setNotice(result.message || "Failed to reject return.");
    }
  };

  const handleSchedulePickup = async () => {
    setProcessing(true);
    const result = await scheduleReturnPickup(returnRecord.id, {
      actor,
      pickupDate,
      pickupMethod,
      pickupReference,
      note: pickupNote,
    });
    setProcessing(false);
    if (result.ok) {
      setShowPickup(false);
      setNotice("Pickup scheduled successfully.");
    } else {
      setNotice(result.message || "Failed to schedule pickup.");
    }
  };

  const handleReceive = async () => {
    setProcessing(true);
    const result = await receiveReturn(returnRecord.id, {
      actor,
      packageCondition,
      note: receiveNote,
    });
    setProcessing(false);
    if (result.ok) {
      setShowReceive(false);
      setNotice("Return marked as received.");
    } else {
      setNotice(result.message || "Failed to mark return as received.");
    }
  };

  const handleInspect = async () => {
    const items = returnRecord.items || [];
    const inspectionList = items.map((item) => ({
      lineId: item.lineId,
      condition: inspections[item.lineId]?.condition || "SELLABLE",
      notes: inspections[item.lineId]?.notes || "",
    }));

    if (inspectionList.length === 0) {
      setNotice("No items to inspect.");
      return;
    }

    setProcessing(true);
    const result = await inspectReturn(returnRecord.id, {
      actor,
      inspections: inspectionList,
    });
    setProcessing(false);
    if (result.ok) {
      setShowInspect(false);
      setNotice("Inspection completed successfully.");
    } else {
      setNotice(result.message || "Failed to complete inspection.");
    }
  };

  const handleInitiateRefund = async () => {
    setProcessing(true);
    const result = await initiateReturnRefund(returnRecord.id, { actor });
    setProcessing(false);
    if (result.ok) {
      setNotice("Refund initiated successfully.");
    } else {
      setNotice(result.message || "Failed to initiate refund.");
    }
  };

  const handleCompleteRefund = async () => {
    setProcessing(true);
    const result = await completeReturnRefund(returnRecord.id, { actor });
    setProcessing(false);
    if (result.ok) {
      setNotice("Refund completed successfully.");
    } else {
      setNotice(result.message || "Failed to complete refund.");
    }
  };

  const updateInspection = (lineId, field, value) => {
    setInspections((current) => ({
      ...current,
      [lineId]: {
        ...current[lineId],
        [field]: value,
      },
    }));
  };

  return (
    <AdminPage
      title={returnRecord.id}
      eyebrow="Return Detail"
      description={`Order ${order.id} · ${returnRecord.reasonLabel || returnRecord.reason}`}
    >
      {notice ? (
        <div className="mb-6 border border-accent/40 bg-accent/5 px-5 py-4 font-ui text-xs text-accent">
          {notice}
        </div>
      ) : null}

      {/* Back button */}
      <button
        onClick={() => navigate("/admin/returns")}
        className="mb-6 flex items-center gap-2 font-ui text-xs uppercase tracking-widest text-brass hover:text-accent"
      >
        <ArrowLeft size={14} />
        Back to Returns
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Return overview */}
          <AdminPanel title="Return Overview">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Status
                  </p>
                  <p className="mt-1 font-display text-2xl font-light text-ink">
                    {statusDef?.label || returnRecord.status}
                  </p>
                </div>
                {isRejected ? (
                  <div className="border border-accent/40 bg-accent/5 px-4 py-2">
                    <p className="font-ui text-[10px] uppercase tracking-widest text-accent">
                      Rejected
                    </p>
                    <p className="mt-1 font-ui text-xs text-accent">
                      {returnRecord.rejectionReason}
                    </p>
                  </div>
                ) : null}
              </div>

              <Rule width="w-10" tone="accent" />

              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Return ID
                  </dt>
                  <dd className="mt-1 font-ui text-ink">{returnRecord.id}</dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Order ID
                  </dt>
                  <dd className="mt-1">
                    <Link
                      to={`/admin/orders/${order.id}`}
                      className="font-ui text-ink underline hover:text-accent"
                    >
                      {order.id}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Customer
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {order.customer?.fullName || "Customer"}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Requested
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {formatOrderDate(returnRecord.createdAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Reason
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.reasonLabel || returnRecord.reason}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Resolution
                  </dt>
                  <dd className="mt-1 font-ui text-ink capitalize">
                    {returnRecord.resolution || "—"}
                  </dd>
                </div>
              </dl>

              {returnRecord.note ? (
                <div className="border-t border-mist/70 pt-4">
                  <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Customer Note
                  </p>
                  <p className="mt-2 font-ui text-sm text-ink">{returnRecord.note}</p>
                </div>
              ) : null}
            </div>
          </AdminPanel>

          {/* Items */}
          <AdminPanel title="Items">
            <div className="space-y-4">
              {(returnRecord.items || []).map((item) => (
                <div
                  key={item.lineId}
                  className="flex gap-4 border-b border-mist/70 pb-4 last:border-0 last:pb-0"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    className="h-20 w-20 shrink-0 bg-surface object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-light text-ink">
                      {item.name}
                    </p>
                    <p className="mt-1 font-ui text-[10px] uppercase tracking-widest text-taupe">
                      {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"}
                    </p>
                    <p className="mt-1 font-ui text-xs text-ink">
                      Qty: {item.quantity} · {formatINR(item.price)}
                    </p>
                    {item.inspectionResult ? (
                      <p className="mt-2 inline-block border border-accent/40 bg-accent/5 px-3 py-1 font-ui text-[10px] uppercase tracking-widest text-accent">
                        {item.inspectionResult}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 font-ui text-sm font-medium text-ink">
                    {formatINR(item.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
          </AdminPanel>

          {/* Timeline */}
          <AdminPanel title="Timeline">
            <ol className="space-y-4">
              {timeline.map((entry) => {
                const isDone = entry.state === "done";
                const isCurrent = entry.state === "current";
                return (
                  <li
                    key={entry.status}
                    className={cn(
                      "border-l-2 pl-4",
                      isDone ? "border-accent" : isCurrent ? "border-accent" : "border-mist"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      {isDone ? (
                        <Check size={16} className="mt-0.5 shrink-0 text-accent" />
                      ) : isCurrent ? (
                        <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-accent" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p
                          className={cn(
                            "font-display text-base font-light",
                            isDone || isCurrent ? "text-ink" : "text-taupe"
                          )}
                        >
                          {entry.title}
                        </p>
                        <p className="mt-0.5 font-ui text-[11px] text-slate">
                          {entry.timestamp
                            ? formatOrderDate(entry.timestamp)
                            : entry.description}
                        </p>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </AdminPanel>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Actions */}
          <AdminPanel title="Actions">
            <div className="space-y-3">
              {canApproveReturn(returnRecord) && !isRejected ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={handleApprove}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  {processing ? "Processing..." : "Approve Return"}
                </AtelierButton>
              ) : null}

              {canRejectReturn(returnRecord) && !isRejected ? (
                <AtelierButton
                  variant="outline"
                  size="md"
                  onClick={() => setShowReject(true)}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Reject Return
                </AtelierButton>
              ) : null}

              {canSchedulePickup(returnRecord) ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={() => setShowPickup(true)}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Schedule Pickup
                </AtelierButton>
              ) : null}

              {canReceiveReturn(returnRecord) ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={() => setShowReceive(true)}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Mark as Received
                </AtelierButton>
              ) : null}

              {canInspectReturn(returnRecord) ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={() => setShowInspect(true)}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Inspect Return
                </AtelierButton>
              ) : null}

              {canInitiateRefund(returnRecord) ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={handleInitiateRefund}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Initiate Refund
                </AtelierButton>
              ) : null}

              {canCompleteRefund(returnRecord) ? (
                <AtelierButton
                  variant="primary"
                  size="md"
                  onClick={handleCompleteRefund}
                  disabled={processing}
                  className="w-full justify-center"
                >
                  Complete Refund
                </AtelierButton>
              ) : null}

              {!canApproveReturn(returnRecord) &&
              !canSchedulePickup(returnRecord) &&
              !canReceiveReturn(returnRecord) &&
              !canInspectReturn(returnRecord) &&
              !canInitiateRefund(returnRecord) &&
              !canCompleteRefund(returnRecord) &&
              !isRejected ? (
                <p className="font-ui text-[11px] text-taupe">
                  No actions available for this status.
                </p>
              ) : null}
            </div>
          </AdminPanel>

          {/* Refund */}
          {returnRecord.refund ? (
            <AdminPanel title="Refund">
              <div className="space-y-3">
                <p className="border border-accent/30 bg-accent/5 px-3 py-2 font-ui text-[10px] uppercase tracking-widest text-accent">
                  Demo Refund · No Real Money Movement
                </p>
                <div>
                  <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Amount
                  </p>
                  <p className="mt-1 font-display text-2xl font-light text-ink">
                    {formatINR(returnRecord.refund.amount || 0)}
                  </p>
                </div>
                <div>
                  <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Status
                  </p>
                  <p className="mt-1 font-ui text-xs text-ink">
                    {returnRecord.refund.status || "Not requested"}
                  </p>
                </div>
                <div>
                  <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Method
                  </p>
                  <p className="mt-1 font-ui text-xs text-ink">
                    {returnRecord.refund.method || "—"}
                  </p>
                </div>
              </div>
            </AdminPanel>
          ) : null}

          {/* Pickup details */}
          {returnRecord.pickupScheduledAt ? (
            <AdminPanel title="Pickup">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Date
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.pickupDate || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Method
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.pickupMethod || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Reference
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.pickupReference || "—"}
                  </dd>
                </div>
              </dl>
            </AdminPanel>
          ) : null}

          {/* Receiving details */}
          {returnRecord.receivedAt ? (
            <AdminPanel title="Receiving">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Received
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {formatOrderDate(returnRecord.receivedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Package Condition
                  </dt>
                  <dd className="mt-1 font-ui text-ink capitalize">
                    {returnRecord.packageCondition || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Received By
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.receivedBy || "—"}
                  </dd>
                </div>
              </dl>
            </AdminPanel>
          ) : null}

          {/* Inspection details */}
          {returnRecord.inspectedAt ? (
            <AdminPanel title="Inspection">
              <dl className="space-y-3 text-sm">
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Inspected
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {formatOrderDate(returnRecord.inspectedAt)}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Result
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.inspectionResult || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                    Inspected By
                  </dt>
                  <dd className="mt-1 font-ui text-ink">
                    {returnRecord.inspectedBy || "—"}
                  </dd>
                </div>
              </dl>
            </AdminPanel>
          ) : null}
        </div>
      </div>

      {/* Reject dialog */}
      {showReject ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="w-full max-w-md border border-mist bg-surface p-6">
            <h3 className="font-display text-xl font-light text-ink">Reject Return</h3>
            <Rule width="w-8" tone="accent" className="my-4" />

            <div className="space-y-4">
              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Rejection Reason *
                </label>
                <select
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                >
                  <option value="">Select a reason</option>
                  {REJECTION_REASONS.map((reason) => (
                    <option key={reason.id} value={reason.id}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Note (optional)
                </label>
                <textarea
                  value={rejectNote}
                  onChange={(e) => setRejectNote(e.target.value)}
                  rows={3}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <AtelierButton
                variant="primary"
                size="md"
                onClick={handleReject}
                disabled={processing || !rejectReason}
                className="flex-1 justify-center"
              >
                {processing ? "Processing..." : "Reject"}
              </AtelierButton>
              <AtelierButton
                variant="outline"
                size="md"
                onClick={() => {
                  setShowReject(false);
                  setRejectReason("");
                  setRejectNote("");
                }}
                className="flex-1 justify-center"
              >
                Cancel
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* Pickup dialog */}
      {showPickup ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="w-full max-w-md border border-mist bg-surface p-6">
            <h3 className="font-display text-xl font-light text-ink">Schedule Pickup</h3>
            <Rule width="w-8" tone="accent" className="my-4" />

            <div className="space-y-4">
              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Pickup Date
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Pickup Method
                </label>
                <select
                  value={pickupMethod}
                  onChange={(e) => setPickupMethod(e.target.value)}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {PICKUP_METHODS.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={pickupReference}
                  onChange={(e) => setPickupReference(e.target.value)}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Notes (optional)
                </label>
                <textarea
                  value={pickupNote}
                  onChange={(e) => setPickupNote(e.target.value)}
                  rows={3}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <AtelierButton
                variant="primary"
                size="md"
                onClick={handleSchedulePickup}
                disabled={processing}
                className="flex-1 justify-center"
              >
                {processing ? "Processing..." : "Schedule"}
              </AtelierButton>
              <AtelierButton
                variant="outline"
                size="md"
                onClick={() => setShowPickup(false)}
                className="flex-1 justify-center"
              >
                Cancel
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* Receive dialog */}
      {showReceive ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="w-full max-w-md border border-mist bg-surface p-6">
            <h3 className="font-display text-xl font-light text-ink">Mark as Received</h3>
            <Rule width="w-8" tone="accent" className="my-4" />

            <div className="space-y-4">
              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Package Condition
                </label>
                <select
                  value={packageCondition}
                  onChange={(e) => setPackageCondition(e.target.value)}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                >
                  {PACKAGE_CONDITIONS.map((condition) => (
                    <option key={condition.id} value={condition.id}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                  Notes (optional)
                </label>
                <textarea
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  rows={3}
                  className="mt-2 w-full border border-mist bg-canvas px-3 py-2 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <AtelierButton
                variant="primary"
                size="md"
                onClick={handleReceive}
                disabled={processing}
                className="flex-1 justify-center"
              >
                {processing ? "Processing..." : "Mark Received"}
              </AtelierButton>
              <AtelierButton
                variant="outline"
                size="md"
                onClick={() => setShowReceive(false)}
                className="flex-1 justify-center"
              >
                Cancel
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}

      {/* Inspect dialog */}
      {showInspect ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto border border-mist bg-surface p-6">
            <h3 className="font-display text-xl font-light text-ink">Inspect Return</h3>
            <Rule width="w-8" tone="accent" className="my-4" />

            <p className="mb-4 font-ui text-[11px] text-taupe">
              Inspect each item and assign a condition. Items marked as sellable will be
              returned to inventory; damaged items will be quarantined.
            </p>

            <div className="space-y-6">
              {(returnRecord.items || []).map((item) => (
                <div key={item.lineId} className="border border-mist/70 p-4">
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="h-16 w-16 shrink-0 bg-surface object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-sm font-light text-ink">{item.name}</p>
                      <p className="mt-0.5 font-ui text-[10px] uppercase tracking-widest text-taupe">
                        {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"} · Qty{" "}
                        {item.quantity}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                      Condition
                    </label>
                    <div className="mt-2 flex gap-2">
                      {INSPECTION_CONDITIONS.map((condition) => {
                        const selected =
                          inspections[item.lineId]?.condition === condition.id ||
                          (!inspections[item.lineId] && condition.id === "SELLABLE");
                        return (
                          <button
                            key={condition.id}
                            type="button"
                            onClick={() => updateInspection(item.lineId, "condition", condition.id)}
                            className={cn(
                              "border px-3 py-1.5 font-ui text-[10px] uppercase tracking-widest",
                              selected
                                ? "border-accent bg-accent/10 text-accent"
                                : "border-mist bg-canvas text-taupe hover:border-accent/60"
                            )}
                          >
                            {condition.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="mt-3">
                    <label className="font-ui text-[10px] uppercase tracking-widest text-taupe">
                      Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={inspections[item.lineId]?.notes || ""}
                      onChange={(e) => updateInspection(item.lineId, "notes", e.target.value)}
                      placeholder="Inspection notes"
                      className="mt-1 w-full border border-mist bg-canvas px-3 py-1.5 font-ui text-xs text-ink focus:border-accent focus:outline-none"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <AtelierButton
                variant="primary"
                size="md"
                onClick={handleInspect}
                disabled={processing}
                className="flex-1 justify-center"
              >
                {processing ? "Processing..." : "Complete Inspection"}
              </AtelierButton>
              <AtelierButton
                variant="outline"
                size="md"
                onClick={() => setShowInspect(false)}
                className="flex-1 justify-center"
              >
                Cancel
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
