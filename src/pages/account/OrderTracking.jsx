import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { MapPin, Truck } from "lucide-react";
import OrderPageShell from "../../components/orders/OrderPageShell";
import OrderNotFound from "../../components/orders/OrderNotFound";
import OrderStatusBadge from "../../components/orders/OrderStatusBadge";
import OrderTimeline from "../../components/orders/OrderTimeline";
import ReturnSummaryCard from "../../components/orders/ReturnSummaryCard";
import { useOrder } from "../../context/OrderContext";
import {
  AtelierButton,
  EditorialHeading,
  Rule,
  transition,
} from "../../design-system";
import { ORDER_STATUS, TRACKING_ID_LABEL } from "../../config/orderConfig";
import { latestReturn, orderItemCount } from "../../utils/orders";
import { cn } from "../../utils/cn";

/**
 * Order tracking — /account/orders/:orderId/track.
 *
 * The shipment journey of one order, generated centrally by the tracking
 * service from the order's own status and history. The carrier name and
 * the tracking id are clearly-labelled demonstration data: no courier API
 * is connected anywhere in this application.
 */
export default function OrderTracking() {
  const { orderId } = useParams();
  const { orders, getOrderById, getTracking } = useOrder();

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
      ? `Tracking ${order.id} — PRATIKSHYA FASHON`
      : "Order Tracking — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, [order]);

  if (!order || !tracking) {
    return (
      <OrderNotFound
        eyebrow="Tracking Unavailable"
        title="Tracking not found"
        description="That order could not be found in your account, so there is nothing to track."
      />
    );
  }

  const count = orderItemCount(order);
  const cancelled = order.status === ORDER_STATUS.CANCELLED;
  const activeReturn = latestReturn(order);

  return (
    <OrderPageShell
      breadcrumbItems={[
        { label: "Account", to: "/account" },
        { label: "Orders", to: "/account/orders" },
        { label: order.id, to: `/account/orders/${order.id}` },
        { label: "Tracking" },
      ]}
    >
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow={`Order ${order.id}`}
        spacing={{ eyebrow: "mb-3", title: "mb-0" }}
      >
        {cancelled ? (
          <>
            This journey was <span className="italic text-accent">stopped.</span>
          </>
        ) : (
          <>
            Follow your <span className="italic text-accent">order.</span>
          </>
        )}
      </EditorialHeading>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <OrderStatusBadge status={order.status} kind="order" />
        <span className="font-ui text-[11px] text-taupe">
          {count} {count === 1 ? "piece" : "pieces"} · {order.deliveryMethod.label}
        </span>
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        Current order status: {tracking.status.label}. {tracking.status.summary}
      </p>

      <Rule width="w-14" tone="accent" className="my-7" />

      {/* --------------------------- Consignment --------------------------- */}
      <dl className="grid gap-6 border border-mist/80 bg-surface/40 p-6 sm:grid-cols-2 md:grid-cols-4 md:p-7">
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Current Status
          </dt>
          <dd className="mt-1.5 font-ui text-sm text-ink">
            {tracking.status.label}
          </dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            {cancelled ? "Delivery" : "Estimated Delivery"}
          </dt>
          <dd className="mt-1.5 font-ui text-sm text-ink">
            {cancelled ? "Not applicable" : tracking.estimatedDelivery || "To be confirmed"}
          </dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            {TRACKING_ID_LABEL}
          </dt>
          <dd className="mt-1.5 font-ui text-sm tracking-wide text-ink">
            {tracking.trackingId}
          </dd>
        </div>
        <div>
          <dt className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Carrier
          </dt>
          <dd className="mt-1.5 flex items-center gap-2 font-ui text-sm text-ink">
            <Truck size={14} className="text-brass" aria-hidden="true" />
            {tracking.carrier}
          </dd>
        </div>
      </dl>

      {cancelled ? (
        <p className="mt-7 border border-mist/80 bg-canvas p-6 font-ui text-xs leading-relaxed text-graphite">
          This order was cancelled, so it never entered the delivery journey. The
          steps below remain for reference only.
        </p>
      ) : null}

      {/* ----------------------------- Timeline ----------------------------- */}
      <div className="mt-10 grid gap-10 lg:grid-cols-[1.5fr_1fr] lg:gap-14">
        <section aria-label="Shipment progress">
          <h3 className="mb-7 font-display text-xl font-light tracking-tight text-ink">
            Journey
          </h3>
          <OrderTimeline
            events={tracking.events}
            ariaLabel={`Shipment progress for order ${order.id}`}
          />
        </section>

        <div className="space-y-7">
          {/* Destination */}
          {order.address ? (
            <section
              aria-label="Delivery destination"
              className="border border-mist/80 bg-surface/30 p-6 md:p-7"
            >
              <h3 className="flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.2em] text-accent">
                <MapPin size={12} aria-hidden="true" />
                Destination
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
              <p className="mt-4 font-ui text-[10px] uppercase tracking-[.14em] text-brass">
                Dispatched from {tracking.origin}
              </p>
            </section>
          ) : null}

          {/* Pieces in transit */}
          <section
            aria-label="Pieces in this shipment"
            className="border border-mist/80 bg-surface/30 p-6 md:p-7"
          >
            <h3 className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
              In This Shipment
            </h3>
            <ul className="mt-4 space-y-3.5">
              {order.items.map((item) => (
                <li key={item.lineId} className="flex items-center gap-3.5">
                  <img
                    src={item.image}
                    alt=""
                    className="h-14 w-11 shrink-0 bg-surface object-cover"
                    loading="lazy"
                  />
                  <div className="min-w-0">
                    <p className="truncate font-display text-sm font-light text-ink">
                      {item.name}
                    </p>
                    <p className="mt-0.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                      Qty {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <AtelierButton
              as={Link}
              to={`/account/orders/${order.id}`}
              variant="primary"
              size="chip"
            >
              View Order
            </AtelierButton>
            <Link
              to="/account/orders"
              className={cn(
                "font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                transition.colors
              )}
            >
              All Orders
            </Link>
          </div>
        </div>
      </div>

      {activeReturn ? (
        <ReturnSummaryCard record={activeReturn} order={order} className="mt-12" />
      ) : null}

      <p className="mt-12 font-ui text-[10px] uppercase leading-relaxed tracking-[.18em] text-taupe">
        Demonstration tracking — carrier names, tracking identifiers and events
        are mock data. No courier service is connected.
      </p>
    </OrderPageShell>
  );
}
