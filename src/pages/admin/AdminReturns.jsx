/**
 * PRATIKSHYA FASHON — Admin Returns (Phase 16.1)
 *
 * Premium return operations dashboard with live metrics, search, and
 * context-sensitive action links. Reads the single order repository —
 * no second return data source.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  Package,
  Search as SearchIcon,
  Truck,
  CreditCard,
  XCircle,
} from "lucide-react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import { useOrder } from "../../context/OrderContext";
import {
  RETURN_STATUS,
  RETURN_STATUSES,
} from "../../config/orderConfig";
import { getReturnMetrics } from "../../services/orders/returnService";
import { formatOrderDate } from "../../utils/orders";
import { cn } from "../../utils/cn";
import { transition } from "../../design-system";

/** Map a status to its next operational action. */
const statusAction = (status) => {
  switch (status) {
    case RETURN_STATUS.RETURN_REQUESTED:
    case RETURN_STATUS.UNDER_REVIEW:
      return { label: "Review", icon: ClipboardCheck };
    case RETURN_STATUS.APPROVED:
      return { label: "Schedule Pickup", icon: Truck };
    case RETURN_STATUS.PICKUP_SCHEDULED:
      return { label: "Mark Received", icon: Package };
    case RETURN_STATUS.RECEIVED:
    case RETURN_STATUS.ITEM_RECEIVED:
      return { label: "Inspect", icon: SearchIcon };
    case RETURN_STATUS.INSPECTED:
      return { label: "Process Refund", icon: CreditCard };
    default:
      return null;
  }
};

const statusToneClass = (status) => {
  switch (status) {
    case RETURN_STATUS.RETURN_REQUESTED:
    case RETURN_STATUS.UNDER_REVIEW:
      return "border-accent/40 bg-accent/5 text-accent";
    case RETURN_STATUS.APPROVED:
    case RETURN_STATUS.PICKUP_SCHEDULED:
      return "border-ink/30 bg-ink/5 text-ink";
    case RETURN_STATUS.RECEIVED:
    case RETURN_STATUS.ITEM_RECEIVED:
    case RETURN_STATUS.INSPECTED:
      return "border-brass/40 bg-brass/5 text-brass";
    case RETURN_STATUS.REFUND_INITIATED:
      return "border-accent/40 bg-accent/5 text-accent";
    case RETURN_STATUS.REFUNDED:
      return "border-emerald-600/40 bg-emerald-50 text-emerald-700";
    case RETURN_STATUS.REJECTED:
      return "border-red-400/40 bg-red-50 text-red-700";
    default:
      return "border-mist bg-surface text-taupe";
  }
};

export default function AdminReturns() {
  const { allOrders = [] } = useOrder();
  const [query, setQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const allReturns = useMemo(
    () =>
      allOrders.flatMap((order) =>
        (order.returns || []).map((record) => ({ ...record, order }))
      ),
    [allOrders]
  );

  const metrics = useMemo(() => getReturnMetrics(allReturns), [allReturns]);

  const filtered = useMemo(() => {
    const term = query.toLowerCase().trim();
    return allReturns
      .filter((record) => {
        if (filterStatus !== "all" && record.status !== filterStatus) return false;
        if (!term) return true;
        const haystack = [
          record.id,
          record.order.id,
          record.order.customer?.fullName || "",
          (record.items || []).map((item) => item.name).join(" "),
          record.reasonLabel || record.reason || "",
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(term);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [allReturns, query, filterStatus]);

  const metricCards = [
    { key: "pendingReview", label: "Pending Review", value: metrics.pendingReview, filter: RETURN_STATUS.RETURN_REQUESTED, icon: ClipboardCheck },
    { key: "approved", label: "Approved", value: metrics.approved, filter: RETURN_STATUS.APPROVED, icon: Package },
    { key: "pickupScheduled", label: "Pickup Scheduled", value: metrics.pickupScheduled, filter: RETURN_STATUS.PICKUP_SCHEDULED, icon: Truck },
    { key: "received", label: "Received", value: metrics.received, filter: RETURN_STATUS.RECEIVED, icon: Package },
    { key: "inspected", label: "Inspected", value: metrics.inspected, filter: RETURN_STATUS.INSPECTED, icon: SearchIcon },
    { key: "refundPending", label: "Refund Pending", value: metrics.refundPending, filter: RETURN_STATUS.REFUND_INITIATED, icon: CreditCard },
    { key: "refunded", label: "Refunded", value: metrics.refunded, filter: RETURN_STATUS.REFUNDED, icon: CreditCard },
    { key: "rejected", label: "Rejected", value: metrics.rejected, filter: RETURN_STATUS.REJECTED, icon: XCircle },
  ];

  return (
    <AdminPage
      title="Returns"
      eyebrow="Post-purchase operations"
      description="From request to inspection and demo refund, with one connected order record."
    >
      {/* Metrics */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-4">
        {metricCards.map((card) => {
          const active = filterStatus === card.filter;
          const Icon = card.icon;
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFilterStatus(active ? "all" : card.filter)}
              className={cn(
                "border p-4 text-left",
                transition.all,
                active
                  ? "border-accent bg-accent/5"
                  : "border-mist/80 bg-surface/40 hover:border-accent/60"
              )}
            >
              <div className="flex items-center justify-between">
                <Icon size={16} className="text-accent" aria-hidden="true" />
                <span className="font-display text-2xl font-light text-ink">{card.value}</span>
              </div>
              <p className="mt-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
                {card.label}
              </p>
            </button>
          );
        })}
      </div>

      <AdminPanel
        title="Return Register"
        action={
          <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
            {filtered.length} return{filtered.length === 1 ? "" : "s"}
          </span>
        }
      >
        {/* Search */}
        <div className="relative mb-5">
          <SearchIcon
            size={14}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-taupe"
            aria-hidden="true"
          />
          <input
            type="search"
            placeholder="Search return, order, customer or product"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-mist bg-canvas py-3 pl-10 pr-4 font-ui text-xs text-ink placeholder:text-taupe focus:border-accent focus:outline-none"
            aria-label="Search returns"
          />
        </div>

        {/* Active filter indicator */}
        {filterStatus !== "all" ? (
          <div className="mb-5 flex items-center gap-2">
            <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
              Filtered:
            </span>
            <button
              type="button"
              onClick={() => setFilterStatus("all")}
              className="inline-flex items-center gap-1.5 border border-accent/40 bg-accent/5 px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-accent"
            >
              {RETURN_STATUSES[filterStatus]?.label || filterStatus}
              <XCircle size={12} aria-hidden="true" />
              <span className="sr-only">Clear filter</span>
            </button>
          </div>
        ) : null}

        {/* Table — desktop */}
        <div className="hidden md:block">
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] gap-3 border-b border-mist/70 pb-3 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
            <span>Return</span>
            <span>Order</span>
            <span>Customer</span>
            <span>Reason</span>
            <span>Status</span>
            <span className="text-right">Action</span>
          </div>
          <div className="divide-y divide-mist/60">
            {filtered.length ? (
              filtered.map((record) => {
                const action = statusAction(record.status);
                return (
                  <div
                    key={record.id}
                    className="grid grid-cols-[1fr_1fr_1fr_1fr_1fr_auto] items-center gap-3 py-4"
                  >
                    <Link
                      to={`/admin/returns/${record.id}`}
                      className="truncate font-ui text-xs font-medium text-ink underline hover:text-accent"
                    >
                      {record.id}
                    </Link>
                    <Link
                      to={`/admin/orders/${record.order.id}`}
                      className="truncate font-ui text-xs text-ink hover:text-accent"
                    >
                      {record.order.id}
                    </Link>
                    <span className="truncate font-ui text-xs text-ink">
                      {record.order.customer?.fullName || "Customer"}
                    </span>
                    <span className="truncate font-ui text-xs text-taupe">
                      {record.reasonLabel || record.reason}
                    </span>
                    <span
                      className={cn(
                        "inline-flex w-fit border px-2.5 py-1 font-ui text-[10px] uppercase tracking-[.14em]",
                        statusToneClass(record.status)
                      )}
                    >
                      {RETURN_STATUSES[record.status]?.label || record.status}
                    </span>
                    <span className="text-right">
                      {action ? (
                        <Link
                          to={`/admin/returns/${record.id}`}
                          className="inline-flex items-center gap-1 font-ui text-[10px] uppercase tracking-[.14em] text-accent hover:underline"
                        >
                          {action.label}
                          <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                      ) : (
                        <Link
                          to={`/admin/returns/${record.id}`}
                          className="inline-flex items-center gap-1 font-ui text-[10px] uppercase tracking-[.14em] text-brass hover:underline"
                        >
                          View
                          <ArrowRight size={12} aria-hidden="true" />
                        </Link>
                      )}
                    </span>
                  </div>
                );
              })
            ) : (
              <p className="py-8 text-center font-ui text-xs text-slate">
                No return requests match your search.
              </p>
            )}
          </div>
        </div>

        {/* Cards — mobile */}
        <div className="space-y-3 md:hidden">
          {filtered.length ? (
            filtered.map((record) => {
              const action = statusAction(record.status);
              return (
                <Link
                  key={record.id}
                  to={`/admin/returns/${record.id}`}
                  className="block border border-mist/80 bg-surface/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-ui text-xs font-medium text-ink">{record.id}</p>
                      <p className="mt-0.5 truncate font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                        {record.order.id} · {record.order.customer?.fullName || "Customer"}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 border px-2 py-1 font-ui text-[10px] uppercase tracking-[.14em]",
                        statusToneClass(record.status)
                      )}
                    >
                      {RETURN_STATUSES[record.status]?.label || record.status}
                    </span>
                  </div>
                  <p className="mt-3 font-ui text-xs text-taupe">
                    {record.reasonLabel || record.reason}
                  </p>
                  <p className="mt-2 font-ui text-[10px] uppercase tracking-[.14em] text-slate">
                    {formatOrderDate(record.createdAt)}
                  </p>
                  {action ? (
                    <p className="mt-3 inline-flex items-center gap-1 font-ui text-[10px] uppercase tracking-[.14em] text-accent">
                      {action.label}
                      <ArrowRight size={12} aria-hidden="true" />
                    </p>
                  ) : null}
                </Link>
              );
            })
          ) : (
            <p className="py-8 text-center font-ui text-xs text-slate">
              No return requests match your search.
            </p>
          )}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
