import { Link } from "react-router-dom";
import { Rule, transition } from "../../design-system";
import { getReturnResolution } from "../../config/orderConfig";
import { getReturnTimeline } from "../../services/orders/returnService";
import { formatOrderDate } from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderTimeline from "./OrderTimeline";

/**
 * A return request, with its own timeline and refund state.
 *
 * Refund figures are presented as demo status throughout — no payment
 * gateway is contacted anywhere in this application and no money moves.
 */
export default function ReturnSummaryCard({
  record,
  order,
  showTimeline = true,
  className = "",
}) {
  if (!record) return null;

  const timeline = getReturnTimeline(record);
  const resolution = getReturnResolution(record.resolution);

  return (
    <section
      aria-labelledby={`return-${record.id}-heading`}
      className={cn("border border-mist/80 bg-surface/30 p-6 md:p-8", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
            Return Request
          </p>
          <h3
            id={`return-${record.id}-heading`}
            className="mt-2 font-display text-xl font-light tracking-tight text-ink"
          >
            {record.id}
          </h3>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            Requested {formatOrderDate(record.createdAt)}
          </p>
        </div>
        <OrderStatusBadge status={record.status} kind="return" />
      </div>

      <Rule width="w-10" tone="accent" className="my-6" />

      <dl className="grid gap-5 sm:grid-cols-2">
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Reason
          </dt>
          <dd className="mt-1.5 font-ui text-sm text-ink">{record.reasonLabel}</dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Preferred Resolution
          </dt>
          <dd className="mt-1.5 font-ui text-sm text-ink">
            {resolution?.label ?? "Refund"}
          </dd>
        </div>
        {record.note ? (
          <div className="sm:col-span-2">
            <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Your Note
            </dt>
            <dd className="mt-1.5 font-ui text-sm leading-relaxed text-graphite">
              {record.note}
            </dd>
          </div>
        ) : null}
      </dl>

      {/* Items */}
      <ul className="mt-6 border-t border-mist/70">
        {record.items.map((item) => (
          <li
            key={`${record.id}-${item.lineId}`}
            className="flex items-center gap-4 border-b border-mist/70 py-3.5"
          >
            <img
              src={item.image}
              alt=""
              className="h-14 w-11 shrink-0 bg-surface object-cover"
              loading="lazy"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-light text-ink">
                {item.name}
              </p>
              <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"} ·
                Qty {item.quantity}
              </p>
            </div>
            <p className="shrink-0 font-ui text-xs text-ink">
              {formatINR(item.price * item.quantity)}
            </p>
          </li>
        ))}
      </ul>

      {/* Refund */}
      {record.refund ? (
        <div className="mt-6 border border-accent/25 bg-accent/5 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
              Refund · Demo Status
            </p>
            <p className="font-display text-xl font-light text-ink">
              {formatINR(record.refund.amount)}
            </p>
          </div>
          <p className="mt-2 font-ui text-xs text-graphite">{record.refund.method}</p>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            No real payment movement takes place at this stage of the project.
          </p>
        </div>
      ) : (
        <p className="mt-6 font-ui text-xs leading-relaxed text-graphite">
          An exchange will be arranged with you once the pieces are received,
          subject to availability.
        </p>
      )}

      {/* Timeline */}
      {showTimeline ? (
        <div className="mt-8">
          <p className="mb-5 font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Return Progress
          </p>
          <OrderTimeline
            events={timeline}
            showLocation={false}
            ariaLabel={`Progress of return ${record.id}`}
          />
        </div>
      ) : (
        order && (
          <Link
            to={`/account/orders/${order.id}`}
            className={cn(
              "mt-6 inline-block font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
              transition.colors
            )}
          >
            View Order
          </Link>
        )
      )}
    </section>
  );
}
