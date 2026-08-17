import { Rule } from "../../design-system";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/** One quiet line of the summary. */
function SummaryRow({ label, value, tone = "default" }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt
        className={cn(
          "font-ui text-[11px] tracking-wide",
          tone === "muted" ? "text-taupe" : "text-graphite"
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "font-ui text-xs",
          tone === "accent" ? "text-accent" : "text-ink"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/**
 * The order's own pricing, read straight from the snapshot recorded at
 * purchase. Nothing is recalculated here — the numbers a customer sees in
 * their order history are the exact numbers they paid, in the Phase 6/8
 * order: products → product discount → coupon → delivery → COD → total.
 */
export default function OrderSummaryPanel({
  pricing,
  title = "Order Summary",
  className = "",
}) {
  if (!pricing) return null;

  return (
    <section
      aria-label="Order summary"
      className={cn("border border-mist/80 bg-surface/30 p-6 md:p-7", className)}
    >
      <h3 className="font-display text-xl font-light tracking-tight text-ink">
        {title}
      </h3>
      <Rule width="w-10" tone="accent" className="mt-3 mb-5" />

      <dl className="space-y-3">
        <SummaryRow label="Subtotal" value={formatINR(pricing.subtotal)} />
        {pricing.productDiscount > 0 && (
          <SummaryRow
            label="Product discount"
            value={`− ${formatINR(pricing.productDiscount)}`}
            tone="muted"
          />
        )}
        {pricing.couponDiscount > 0 && (
          <SummaryRow
            label={`Offer · ${pricing.couponCode ?? "Applied"}`}
            value={`− ${formatINR(pricing.couponDiscount)}`}
            tone="accent"
          />
        )}
        <SummaryRow
          label="Delivery"
          value={
            pricing.shipping === 0 ? (
              <span className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">
                Complimentary
              </span>
            ) : (
              formatINR(pricing.shipping)
            )
          }
        />
        {pricing.codFee > 0 && (
          <SummaryRow
            label="Cash on delivery fee"
            value={formatINR(pricing.codFee)}
          />
        )}
      </dl>

      <div className="mt-5 flex items-baseline justify-between gap-4 border-t border-ink/20 pt-4">
        <span className="font-ui text-[10px] uppercase tracking-[.2em] text-ink">
          Total Paid
        </span>
        <span className="font-display text-2xl font-light text-ink">
          {formatINR(pricing.total)}
        </span>
      </div>

      {pricing.saved > 0 ? (
        <p className="mt-3 font-ui text-[11px] text-accent">
          You saved {formatINR(pricing.saved)} on this order.
        </p>
      ) : null}
    </section>
  );
}
