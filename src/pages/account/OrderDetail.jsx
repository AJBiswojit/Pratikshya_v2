import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ChevronRight, PackageCheck } from "lucide-react";
import OrderPageShell from "../../components/orders/OrderPageShell";
import ConfirmDialog from "../../components/orders/ConfirmDialog";
import InvoicePreview from "../../components/orders/InvoicePreview";
import OrderItemList from "../../components/orders/OrderItemList";
import OrderNotFound from "../../components/orders/OrderNotFound";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import OrderSummaryPanel from "../../components/orders/OrderSummaryPanel";
import OrderTimeline from "../../components/orders/OrderTimeline";
import ReturnSummaryCard from "../../components/orders/ReturnSummaryCard";
import { useCart } from "../../context/CartContext";
import { useOrder } from "../../context/OrderContext";
import {
  AtelierButton,
  EditorialHeading,
  Rule,
  transition,
} from "../../design-system";
import {
  ORDER_PAYMENT_STATUS,
  ORDER_STATUS,
  getOrderStatus,
  nextJourneyStatus,
} from "../../config/orderConfig";
import {
  buyAgainAvailability,
  canCancelOrder,
  canReturnOrder,
  canTrackOrder,
  formatOrderDate,
  latestReturn,
  orderItemCount,
  refundMethodLabel,
} from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { formatPhone } from "../../utils/validation";
import { cn } from "../../utils/cn";

/** A labelled value in the order meta band. */
function Meta({ label, children }) {
  return (
    <div>
      <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
        {label}
      </dt>
      <dd className="mt-1.5 font-ui text-sm text-ink">{children}</dd>
    </div>
  );
}

/**
 * Order detail — /account/orders/:orderId.
 *
 * Everything the customer needs about a single order: what they bought,
 * what they paid, where it is going, how it was paid for and the actions
 * that are actually valid for its current status.
 *
 * The order is read through the ownership-checked context accessor, so an
 * order belonging to another customer resolves to the same safe not-found
 * state as an invalid id.
 */
export default function OrderDetail() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const cart = useCart();
  const { orders, getOrderById, getTracking, cancelOrder, updateMockOrderStatus } = useOrder();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [notice, setNotice] = useState("");

  /* `orders` in the dependency list keeps this fresh after every mutation. */
  const order = useMemo(
    () => getOrderById(orderId),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderId, getOrderById, orders]
  );

  const tracking = useMemo(
    () => (order ? getTracking(order.id) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [order, getTracking, orders]
  );

  useEffect(() => {
    const previousTitle = document.title;
    document.title = order
      ? `Order ${order.id} — PRATIKSHYA FASHON`
      : "Order — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, [order]);

  if (!order) return <OrderNotFound />;

  const status = getOrderStatus(order.status);
  const count = orderItemCount(order);
  const activeReturn = latestReturn(order);
  const nextStatus = nextJourneyStatus(order.status);

  /* ----------------------------- Actions ----------------------------- */

  const handleCancel = () => {
    const result = cancelOrder(order.id);
    setConfirmOpen(false);
    setNotice(
      result.ok
        ? result.message
        : "This order can no longer be cancelled. Please contact the atelier."
    );
  };

  /**
   * Buy Again — reuses the one cart implementation. Pieces whose variant
   * has retired are sent to their product page rather than blindly added,
   * and pieces that have left the catalogue are reported gracefully.
   */
  const handleBuyAgain = () => {
    let added = 0;
    let needsChoice = null;
    let unavailable = 0;

    order.items.forEach((item) => {
      const availability = buyAgainAvailability(item);
      if (availability.state === "unavailable") {
        unavailable += 1;
        return;
      }
      if (availability.state === "variant") {
        needsChoice = needsChoice ?? availability.href;
        return;
      }
      const result = cart.addToCart(availability.product, {
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      });
      if (result.ok) added += 1;
    });

    if (added > 0) {
      cart.openDrawer();
      setNotice(
        unavailable > 0 || needsChoice
          ? `${added} ${added === 1 ? "piece" : "pieces"} added to your bag. Some pieces need a fresh selection.`
          : "Your pieces are back in your bag."
      );
      return;
    }

    if (needsChoice) {
      navigate(needsChoice);
      return;
    }

    setNotice(
      "These pieces are no longer available. Our new arrivals may hold something you love."
    );
  };

  const handleAdvance = () => {
    const result = updateMockOrderStatus(order.id);
    setNotice(
      result.ok
        ? `Demo progression: this order is now ${getOrderStatus(result.order.status).label.toLowerCase()}.`
        : result.message
    );
  };

  /* ------------------------------ Page ------------------------------ */

  return (
    <OrderPageShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Orders", to: "/account/orders" },
        { label: order.id },
      ]}
    >
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow={`Order ${order.id}`}
        spacing={{ eyebrow: "mb-3", title: "mb-0" }}
      >
        {status.summary.replace(/\.$/, "")}
        <span className="text-accent">.</span>
      </EditorialHeading>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} kind="order" />
        <OrderStatusBadge status={order.paymentStatus} kind="payment" />
        <span className="font-ui text-[11px] text-taupe">
          Placed {formatOrderDate(order.createdAt)}
        </span>
      </div>

      <Rule width="w-14" tone="accent" className="my-7" />

      {notice ? (
        <p
          role="status"
          aria-live="polite"
          className="mb-7 border border-accent/30 bg-accent/5 px-5 py-4 font-ui text-[11px] leading-relaxed text-accent"
        >
          {notice}
        </p>
      ) : null}

      {/* ---------------------------- Meta band ---------------------------- */}
      <dl className="grid gap-6 border border-mist/80 bg-surface/40 p-6 sm:grid-cols-2 md:grid-cols-4 md:p-7">
        <Meta label="Order Date">{formatOrderDate(order.createdAt)}</Meta>
        <Meta label="Pieces">
          {count} {count === 1 ? "piece" : "pieces"}
        </Meta>
        <Meta label="Order Total">{formatINR(order.pricing.total)}</Meta>
        <Meta
          label={
            order.status === ORDER_STATUS.DELIVERED
              ? "Delivered"
              : "Estimated Delivery"
          }
        >
          {order.estimatedDelivery || "To be confirmed"}
          <span className="mt-0.5 block font-ui text-[10px] text-taupe">
            {order.deliveryMethod.label}
          </span>
        </Meta>
      </dl>

      {/* ----------------------------- Actions ----------------------------- */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        {canTrackOrder(order) && (
          <AtelierButton
            as={Link}
            to={`/account/orders/${order.id}/track`}
            variant="primary"
            size="chip"
          >
            Track Order
          </AtelierButton>
        )}
        <AtelierButton
          type="button"
          variant="outline"
          size="chip"
          onClick={() => setInvoiceOpen(true)}
        >
          View Invoice
        </AtelierButton>
        {canReturnOrder(order) && (
          <AtelierButton
            as={Link}
            to={`/account/orders/${order.id}/return`}
            variant="outline"
            size="chip"
          >
            Return Items
          </AtelierButton>
        )}
        {canCancelOrder(order) && (
          <AtelierButton
            type="button"
            variant="outline"
            size="chip"
            onClick={() => setConfirmOpen(true)}
          >
            Cancel Order
          </AtelierButton>
        )}
        <AtelierButton
          type="button"
          variant="outline"
          size="chip"
          onClick={handleBuyAgain}
        >
          Buy Again
        </AtelierButton>
        <Link
          to="/shop"
          className={cn(
            "font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
            transition.colors
          )}
        >
          Continue Shopping
        </Link>
      </div>

      {/* --------------------------- Timeline --------------------------- */}
      {tracking?.events?.length ? (
        <section aria-label="Order journey" className="mt-10 border border-mist/80 bg-surface/30 p-6 md:p-7">
          <h3 className="font-ui text-[10px] uppercase tracking-[.2em] text-accent mb-6">
            Journey — Confirmed to Delivered
          </h3>
          <OrderTimeline events={tracking.events} showLocation={false} ariaLabel={`Journey for order ${order.id}`} />
          <p className="mt-6 font-ui text-[10px] text-taupe">
            Customer-safe view only — internal warehouse racks, employee names and stock counts are never shown here.
          </p>
        </section>
      ) : null}

      {/* ------------------------------ Body ------------------------------ */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
        {/* Left column */}
        <div>
          <h3 className="font-display text-xl font-light tracking-tight text-ink">
            Your pieces
          </h3>
          <OrderItemList items={order.items} className="mt-5" />

          {activeReturn ? (
            <ReturnSummaryCard
              record={activeReturn}
              order={order}
              className="mt-10"
            />
          ) : null}
        </div>

        {/* Right column */}
        <div className="space-y-7">
          <OrderSummaryPanel pricing={order.pricing} />

          {/* Payment */}
          <section
            aria-label="Payment information"
            className="border border-mist/80 bg-surface/30 p-6 md:p-7"
          >
            <h3 className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
              Payment
            </h3>
            <p className="mt-3 font-display text-lg font-light text-ink">
              {order.paymentMethod.label}
            </p>
            <div className="mt-2.5">
              <OrderStatusBadge status={order.paymentStatus} kind="payment" />
            </div>
            {order.refund ? (
              <div className="mt-5 border-t border-mist/70 pt-4">
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                  Refund · Demo Status
                </p>
                <p className="mt-1.5 font-display text-lg font-light text-ink">
                  {formatINR(order.refund.amount)}
                </p>
                <p className="mt-1 font-ui text-[11px] text-graphite">
                  {refundMethodLabel(order)}
                </p>
                <p className="mt-1 font-ui text-[10px] text-taupe">
                  {order.refund.note}
                </p>
              </div>
            ) : null}
            <p className="mt-5 font-ui text-[10px] leading-relaxed text-taupe">
              No card details or payment credentials are ever stored with an
              order.
            </p>
          </section>

          {/* Delivery address snapshot */}
          {order.address ? (
            <section
              aria-label="Delivery address"
              className="border border-mist/80 bg-surface/30 p-6 md:p-7"
            >
              <h3 className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                Delivering To
              </h3>
              <p className="mt-3 font-display text-base font-light text-ink">
                {order.address.fullName}
              </p>
              <p className="mt-1 font-ui text-xs leading-relaxed text-graphite">
                {order.address.addressLine}
                {order.address.landmark ? `, ${order.address.landmark}` : ""}
              </p>
              <p className="font-ui text-xs text-graphite">
                {order.address.city}, {order.address.state} —{" "}
                {order.address.pincode}
              </p>
              {order.address.phone ? (
                <p className="mt-2 font-ui text-[11px] text-taupe">
                  {formatPhone(order.address.phone)}
                </p>
              ) : null}
              <p className="mt-4 font-ui text-[10px] leading-relaxed text-taupe">
                This is the address recorded when the order was placed. Editing
                your address book never changes a past order.
              </p>
            </section>
          ) : null}

          {/* Clearly-labelled demo progression */}
          {nextStatus ? (
            <section
              aria-label="Demo order progression"
              className="border border-dashed border-mist bg-canvas p-6"
            >
              <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                Client Demo Control
              </p>
              <p className="mt-2 font-ui text-xs leading-relaxed text-graphite">
                Advance this demonstration order to its next stage. Frontend mock
                progression only — no real fulfilment takes place.
              </p>
              <button
                type="button"
                onClick={handleAdvance}
                className={cn(
                  "mt-4 inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                  transition.colors
                )}
              >
                Advance to {getOrderStatus(nextStatus).label}
                <ChevronRight size={12} aria-hidden="true" />
              </button>
            </section>
          ) : null}
        </div>
      </div>

      <p className="mt-12 flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.18em] text-taupe">
        <PackageCheck size={13} className="text-accent" aria-hidden="true" />
        This is a demonstration order — no real transaction has taken place.
      </p>

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Cancel this order?"
        description={
          order.paymentStatus === ORDER_PAYMENT_STATUS.PAID
            ? "Are you sure you want to cancel this order? A demo refund status will be shown against it — no real payment movement takes place."
            : "Are you sure you want to cancel this order? Nothing has been captured for it."
        }
        confirmLabel="Cancel Order"
        cancelLabel="Keep Order"
        onConfirm={handleCancel}
        onCancel={() => setConfirmOpen(false)}
      />

      <InvoicePreview
        order={order}
        isOpen={invoiceOpen}
        onClose={() => setInvoiceOpen(false)}
      />
    </OrderPageShell>
  );
}
