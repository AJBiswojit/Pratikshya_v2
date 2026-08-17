import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AtelierButton, Rule, transition } from "../../design-system";
import { useCart } from "../../context/CartContext";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";
import CouponField from "./CouponField";

/** One quiet line of the summary. */
function SummaryRow({ label, value, muted = false, accent = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn("font-ui text-[11px] tracking-wide", muted ? "text-taupe" : "text-graphite")}>
        {label}
      </dt>
      <dd className={cn("font-ui text-xs", accent ? "text-accent" : "text-ink")}>{value}</dd>
    </div>
  );
}

/**
 * The order summary — subtotal, discounts, offer, shipping and total, set
 * as an editorial panel rather than an accounting table. All arithmetic
 * comes from the centralised totals; nothing is computed here.
 */
export default function OrderSummary() {
  const cart = useCart();
  const { totals } = cart;

  return (
    <aside aria-label="Order summary" className="border border-mist/80 bg-surface/50 p-7 md:p-8">
      <h2 className="font-display text-2xl font-light tracking-tight">Order Summary</h2>
      <Rule width="w-12" tone="accent" className="mt-4 mb-6" />

      <dl className="space-y-3.5">
        <SummaryRow label="Subtotal" value={formatINR(totals.subtotal)} />
        {totals.productDiscount > 0 && (
          <SummaryRow
            label="Product discount"
            value={`Included · ${formatINR(totals.productDiscount)} off`}
            muted
          />
        )}
        {totals.couponDiscount > 0 && cart.coupon && (
          <SummaryRow
            label={`Offer · ${cart.coupon.code}`}
            value={`− ${formatINR(totals.couponDiscount)}`}
            accent
          />
        )}
        <SummaryRow
          label="Shipping"
          value={
            totals.shipping === 0 ? (
              <span className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">
                Complimentary
              </span>
            ) : (
              formatINR(totals.shipping)
            )
          }
        />
      </dl>

      {totals.freeShippingRemainder > 0 && (
        <p className="mt-4 font-ui text-[10px] leading-relaxed text-taupe">
          Add {formatINR(totals.freeShippingRemainder)} more for complimentary delivery.
        </p>
      )}

      <div className="mt-6 border-t border-ink/20 pt-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="font-ui text-[10px] uppercase tracking-[.2em] text-ink">Total</span>
          <span className="font-display text-2xl text-ink">{formatINR(totals.total)}</span>
        </div>
        <p className="mt-1 text-right font-ui text-[9px] text-taupe">Inclusive of all taxes</p>
        {totals.saved > 0 && (
          <p className="mt-3 font-ui text-[10px] uppercase tracking-[.16em] text-accent">
            You saved {formatINR(totals.saved)}
          </p>
        )}
      </div>

      <div className="mt-6">
        <CouponField />
      </div>

      <AtelierButton
        as={Link}
        to="/checkout"
        variant="primary"
        size="md"
        className="mt-7 w-full justify-center"
      >
        Proceed to Checkout <ArrowRight size={14} aria-hidden="true" />
      </AtelierButton>

      <Link
        to="/shop"
        className={cn(
          "mt-5 block text-center font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
          transition.colors
        )}
      >
        Continue Shopping
      </Link>
    </aside>
  );
}
