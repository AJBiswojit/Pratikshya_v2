import { motion } from "framer-motion";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, PackageCheck } from "lucide-react";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EditorialHeading,
  EmptyState,
  Rule,
} from "../design-system";
import { useAuth } from "../context/AuthContext";
import { useOrder } from "../context/OrderContext";
import OrderStatusBadge from "../components/orders/OrderStatusBadge";
import { formatINR } from "../utils/shopping";
import { formatPhone } from "../utils/validation";

/** A labelled value in the order meta band. */
function Meta({ label, children }) {
  return (
    <div>
      <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">{label}</p>
      <div className="mt-1.5 font-ui text-sm text-ink">{children}</div>
    </div>
  );
}

/**
 * Order confirmation — /order-success.
 *
 * Shown only after a real (mock) order exists in the order state — the
 * route can never be fabricated by a direct visit. Guests see the same
 * confirmation with an invitation to create an account; signed-in
 * customers can continue to their order history.
 */
export default function OrderSuccess() {
  const { user, isAuthenticated } = useAuth();
  const { currentOrder } = useOrder();

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Order Confirmed — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  /* ------------------- Protected: no order in state ------------------- */

  if (!currentOrder) {
    return (
      <main>
        <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
          <Breadcrumb
            items={[{ label: "Bag", to: "/cart" }, { label: "Order Confirmation" }]}
            className="mb-4"
          />
          <EmptyState
            eyebrow="Order Confirmation"
            title="We couldn't find that order."
            description="A confirmation is only available right after a completed checkout. Your collection remains safe in your bag."
            actions={
              <AtelierButton as={Link} to="/shop" variant="primary" size="md">
                Continue Shopping
              </AtelierButton>
            }
          />
        </AtelierSection>
      </main>
    );
  }

  /* ---------------------------- Confirmation ---------------------------- */

  const order = currentOrder;
  const orderDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const firstName = order.customer.fullName.split(" ")[0] || "friend";

  return (
    <main>
      <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        {/* Screen-reader announcement */}
        <p role="status" aria-live="polite" className="sr-only">
          Order confirmed. Order {order.id} has been placed successfully.
        </p>

        <Breadcrumb
          items={[
            { label: "Bag", to: "/cart" },
            { label: "Checkout", to: "/checkout" },
            { label: "Order Confirmed" },
          ]}
          className="mb-8 md:mb-10"
        />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-accent" aria-hidden="true" />
            <p className="font-ui text-[10px] uppercase tracking-[.3em] text-accent">
              Order Confirmed
            </p>
          </div>

          <EditorialHeading
            as="h1"
            size="subsection"
            spacing={{ title: "mb-4", description: "mb-0" }}
            className="mt-4"
          >
            Thank you, <span className="italic text-accent">{firstName}.</span>
          </EditorialHeading>
          <p className="mt-4 max-w-xl font-ui text-sm leading-relaxed text-taupe">
            Your order is confirmed and will be prepared with care at the
            atelier. A confirmation has been sent to {order.customer.email}.
          </p>

          <Rule width="w-16" tone="accent" className="my-8" />

          {/* -------------------------- Meta band -------------------------- */}
          <div className="grid gap-6 border border-mist/80 bg-surface/40 p-6 sm:grid-cols-2 md:grid-cols-4 md:p-8">
            <Meta label="Order ID">
              <span className="font-display text-lg font-light tracking-tight">{order.id}</span>
            </Meta>
            <Meta label="Order Date">{orderDate}</Meta>
            <Meta label="Payment">
              <span className="flex flex-wrap items-center gap-2">
                {order.paymentMethod.label}
                <OrderStatusBadge status={order.paymentStatus} kind="payment" />
              </span>
            </Meta>
            <Meta label="Estimated Delivery">
              {order.deliveryMethod.estimate}
              <span className="mt-0.5 block font-ui text-[10px] text-taupe">
                {order.deliveryMethod.label}
              </span>
            </Meta>
          </div>

          {/* --------------------------- Pieces --------------------------- */}
          <div className="mt-10 border-t border-mist/70">
            {order.items.map((item) => (
              <div
                key={item.lineId}
                className="flex items-center gap-4 border-b border-mist/70 py-4 sm:gap-5"
              >
                <img
                  src={item.image}
                  alt=""
                  className="h-16 w-12 shrink-0 bg-surface object-cover"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-base font-light text-ink">
                    {item.name}
                  </p>
                  <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.12em] text-taupe">
                    {[item.color, item.size].filter(Boolean).join(" · ") || "Free Size"} · Qty{" "}
                    {item.quantity}
                  </p>
                </div>
                <p className="shrink-0 font-ui text-sm text-ink">{formatINR(item.lineTotal)}</p>
              </div>
            ))}
          </div>

          {/* ---------------------- Address + pricing ---------------------- */}
          <div className="mt-10 grid gap-8 md:grid-cols-2">
            <div className="border border-mist/80 bg-surface/30 p-6">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                Delivering to
              </p>
              <p className="mt-3 font-display text-base font-light text-ink">
                {order.address.fullName}
              </p>
              <p className="mt-1 font-ui text-xs leading-relaxed text-graphite">
                {order.address.addressLine}
                {order.address.landmark ? `, ${order.address.landmark}` : ""}
              </p>
              <p className="font-ui text-xs text-graphite">
                {order.address.city}, {order.address.state} — {order.address.pincode}
              </p>
              <p className="mt-2 font-ui text-[11px] text-taupe">{formatPhone(order.address.phone)}</p>
            </div>

            <div className="border border-mist/80 bg-surface/30 p-6">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                Order Total
              </p>
              <dl className="mt-4 space-y-2.5">
                <div className="flex justify-between gap-4 font-ui text-xs text-graphite">
                  <dt>Subtotal</dt>
                  <dd>{formatINR(order.pricing.subtotal)}</dd>
                </div>
                {order.pricing.productDiscount > 0 && (
                  <div className="flex justify-between gap-4 font-ui text-xs text-taupe">
                    <dt>Product discount</dt>
                    <dd>− {formatINR(order.pricing.productDiscount)}</dd>
                  </div>
                )}
                {order.pricing.couponDiscount > 0 && (
                  <div className="flex justify-between gap-4 font-ui text-xs text-accent">
                    <dt>Offer · {order.pricing.couponCode}</dt>
                    <dd>− {formatINR(order.pricing.couponDiscount)}</dd>
                  </div>
                )}
                <div className="flex justify-between gap-4 font-ui text-xs text-graphite">
                  <dt>Delivery</dt>
                  <dd>
                    {order.pricing.shipping === 0
                      ? "Complimentary"
                      : formatINR(order.pricing.shipping)}
                  </dd>
                </div>
                {order.pricing.codFee > 0 && (
                  <div className="flex justify-between gap-4 font-ui text-xs text-graphite">
                    <dt>Cash on delivery fee</dt>
                    <dd>{formatINR(order.pricing.codFee)}</dd>
                  </div>
                )}
              </dl>
              <div className="mt-4 flex items-baseline justify-between gap-4 border-t border-ink/20 pt-4">
                <span className="font-ui text-[10px] uppercase tracking-[.2em] text-ink">Total</span>
                <span className="font-display text-2xl font-light text-ink">
                  {formatINR(order.pricing.total)}
                </span>
              </div>
            </div>
          </div>

          {/* ---------------------------- Actions ---------------------------- */}
          <div className="mt-12 flex flex-wrap items-center gap-4">
            <AtelierButton
              as={Link}
              to={`/account/orders/${order.id}`}
              variant="primary"
              size="md"
            >
              View Order
            </AtelierButton>
            <AtelierButton
              as={Link}
              to={`/account/orders/${order.id}/track`}
              variant="outline"
              size="md"
            >
              Track Order
            </AtelierButton>
            <AtelierButton as={Link} to="/shop" variant="outline" size="md">
              Continue Shopping
            </AtelierButton>
          </div>

          {/*
            Guests keep this order in the current browser demo session. Creating
            an account offers to bring it along — the account order history
            picks it up from there.
          */}
          {!isAuthenticated || !user ? (
            <div className="mt-8 border border-accent/25 bg-accent/5 p-6">
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                Keep This Order
              </p>
              <p className="mt-2 max-w-xl font-ui text-xs leading-relaxed text-graphite">
                Create an account to keep your orders organized. This order stays
                available in this browser, and can be added to your account once
                you have one.
              </p>
              <AtelierButton
                as={Link}
                to={`/signup?returnTo=${encodeURIComponent("/account/orders")}`}
                variant="primary"
                size="chip"
                className="mt-5"
              >
                Create an Account
              </AtelierButton>
            </div>
          ) : null}

          <p className="mt-10 flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.18em] text-taupe">
            <PackageCheck size={13} className="text-accent" aria-hidden="true" />
            This is a demonstration order — no real transaction has taken place.
          </p>
        </motion.div>
      </AtelierSection>
    </main>
  );
}
