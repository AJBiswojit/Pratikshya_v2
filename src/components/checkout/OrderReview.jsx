import { forwardRef, useImperativeHandle } from "react";
import { Link } from "react-router-dom";
import { PencilLine } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useCheckout } from "../../context/CheckoutContext";
import { formatINR } from "../../utils/shopping";
import { formatPhone } from "../../utils/validation";
import { AtelierButton } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * Step 3 — Review.
 *
 * The pieces, the destination and the delivery lane, laid out quietly
 * before payment. No product modifications happen here — the way to
 * change the bag is the Edit Bag link back to /cart. Pricing lines live
 * in the order summary beside the review.
 */
const OrderReview = forwardRef(function OrderReview(_props, ref) {
  const cart = useCart();
  const checkout = useCheckout();

  useImperativeHandle(ref, () => ({
    validate() {
      return cart.items.length > 0;
    },
  }));

  return (
    <section aria-labelledby="checkout-step-heading">
      <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">Step 03</p>
      <h2
        id="checkout-step-heading"
        tabIndex={-1}
        className="mt-2 font-display text-3xl font-light tracking-tight outline-none"
      >
        Review your <span className="italic text-accent">order.</span>
      </h2>

      {/* ----------------------------- Pieces ----------------------------- */}
      <div className="mt-9 border-t border-mist/70">
        {cart.items.map((item) => (
          <div
            key={item.id}
            className="flex gap-4 border-b border-mist/70 py-5 sm:gap-6"
          >
            <div className="w-16 shrink-0 sm:w-20">
              <img
                src={item.product.image}
                alt={item.product.name}
                className="aspect-[3/4] w-full bg-surface object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-light leading-snug text-ink">
                {item.product.name}
              </p>
              <p className="mt-1 font-ui text-[11px] uppercase tracking-[.14em] text-taupe">
                {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"}
              </p>
              <p className="mt-1 font-ui text-[11px] text-taupe">Quantity {item.quantity}</p>
              {item.product.originalPrice > item.product.price && (
                <p className="mt-1 font-ui text-[10px] text-accent">
                  {formatINR(item.product.originalPrice - item.product.price)} off per piece
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <p className="font-ui text-sm text-ink">{formatINR(item.lineTotal)}</p>
              {item.product.originalPrice > item.product.price && (
                <p className="mt-1 font-ui text-[10px] text-ash line-through">
                  {formatINR(item.product.originalPrice * item.quantity)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <AtelierButton as={Link} to="/cart" variant="outline" size="md">
          <PencilLine size={14} aria-hidden="true" /> Edit Bag
        </AtelierButton>
      </div>

      {/* ------------------------ Destination lane ------------------------ */}
      <div className="mt-10 grid gap-4 sm:grid-cols-2">
        <div className="border border-mist/80 bg-surface/30 p-5">
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
            Delivering to
          </p>
          <p className="mt-3 font-display text-base font-light text-ink">
            {checkout.address?.fullName}
          </p>
          <p className="mt-1 font-ui text-xs leading-relaxed text-graphite">
            {checkout.address?.addressLine}
            {checkout.address?.landmark ? `, ${checkout.address.landmark}` : ""}
          </p>
          <p className="font-ui text-xs text-graphite">
            {checkout.address?.city}, {checkout.address?.state} — {checkout.address?.pincode}
          </p>
          <p className="mt-2 font-ui text-[11px] text-taupe">
            {formatPhone(checkout.address?.phone)}
          </p>
        </div>

        <div className="border border-mist/80 bg-surface/30 p-5">
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
            Delivery lane
          </p>
          <p className="mt-3 font-ui text-sm text-ink">{checkout.deliveryMethod.label}</p>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            {checkout.deliveryMethod.caption} · estimated {checkout.deliveryEstimate}
          </p>
          <p className={cn("mt-3 font-ui text-xs", checkout.totals.shipping === 0 ? "text-accent" : "text-ink")}>
            {checkout.totals.shipping === 0
              ? "Complimentary delivery"
              : `${checkout.deliveryMethod.label}: ${formatINR(checkout.totals.shipping)}`}
          </p>
        </div>
      </div>

      <p className="mt-8 border-t border-mist/60 pt-5 font-ui text-[11px] leading-relaxed text-taupe">
        Once you continue, you will be asked to complete payment. Your collection
        stays in your bag until the payment is confirmed.
      </p>
    </section>
  );
});

export default OrderReview;
