import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useState } from "react";
import CouponField from "../cart/CouponField";
import { useCart } from "../../context/CartContext";
import { useCheckout } from "../../context/CheckoutContext";
import { formatINR } from "../../utils/shopping";
import { Rule } from "../../design-system";
import { cn } from "../../utils/cn";

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

/** The mini product list inside the summary. */
function SummaryItems() {
  const cart = useCart();
  return (
    <ul className="space-y-3">
      {cart.items.map((item) => (
        <li key={item.id} className="flex items-center gap-3">
          <img
            src={item.product.image}
            alt=""
            className="h-14 w-11 shrink-0 bg-surface object-cover"
            loading="lazy"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-light text-ink">{item.product.name}</p>
            <p className="mt-0.5 font-ui text-[10px] text-taupe">
              {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"} · Qty {item.quantity}
            </p>
          </div>
          <p className="shrink-0 font-ui text-xs text-ink">{formatINR(item.lineTotal)}</p>
        </li>
      ))}
    </ul>
  );
}

/** The pricing ledger — every value comes from the centralized totals. */
function SummaryLedger() {
  const cart = useCart();
  const checkout = useCheckout();
  const { totals } = checkout;

  return (
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
        label={`Delivery · ${checkout.deliveryMethod.label}`}
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
      {totals.codFee > 0 && (
        <SummaryRow label="Cash on delivery fee" value={formatINR(totals.codFee)} />
      )}
    </dl>
  );
}

/**
 * The checkout order summary.
 *
 * Desktop: a sticky editorial panel beside the steps. Mobile: a compact
 * expandable accordion above the steps so the total is always in reach
 * without crowding the forms. Pricing is always derived from the Phase 6
 * engine through the checkout context — nothing is computed here — and the
 * Phase 6 offer field is reused as-is, so a coupon applied in the bag
 * stays applied here and can be removed from either surface.
 */
export default function CheckoutOrderSummary() {
  const cart = useCart();
  const checkout = useCheckout();
  const [open, setOpen] = useState(false);

  const { totals } = checkout;

  const body = (
    <div className="px-6 pb-6 md:px-7 md:pb-7">
      <SummaryItems />
      <Rule width="w-12" tone="accent" className="my-6" />
      <SummaryLedger />

      {totals.freeShippingRemainder > 0 && (
        <p className="mt-4 font-ui text-[10px] leading-relaxed text-taupe">
          Add {formatINR(totals.freeShippingRemainder)} more for complimentary standard delivery.
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
    </div>
  );

  return (
    <aside aria-label="Order summary" className="border border-mist/80 bg-surface/50">
      {/* Mobile accordion toggle */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="checkout-order-summary-panel"
        className={cn(
          "flex w-full items-center justify-between gap-4 px-6 py-5 text-left",
          "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent lg:hidden"
        )}
      >
        <span className="font-ui text-[10px] uppercase tracking-[.22em] text-ink">
          Order Summary
        </span>
        <span className="flex items-center gap-3">
          <span className="font-display text-xl font-light text-ink">
            {formatINR(totals.total)}
          </span>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className={cn("text-accent transition-transform duration-500", open && "rotate-180")}
          />
        </span>
      </button>

      {/* Desktop heading */}
      <div className="hidden px-6 pt-6 md:px-7 lg:block">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-display text-2xl font-light tracking-tight">Order Summary</h2>
          <span className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
            {cart.count} {cart.count === 1 ? "piece" : "pieces"}
          </span>
        </div>
        <Rule width="w-12" tone="accent" className="mt-4 mb-6" />
      </div>

      {/* Mobile panel */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id="checkout-order-summary-panel"
            key="mobile-summary"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden lg:hidden"
          >
            {body}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop panel */}
      <div className="hidden lg:block">{body}</div>
    </aside>
  );
}
