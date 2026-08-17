import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { AtelierButton, transition } from "../../design-system";
import { ORDER_STATUS } from "../../config/orderConfig";
import { canTrackOrder, formatOrderDate, orderItemCount } from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";
import OrderStatusBadge from "./OrderStatusBadge";

/**
 * An order, set as an editorial card rather than a row of a dashboard
 * table: the pieces first, the order identity beside them, the status and
 * the way onward.
 *
 * The whole card is not a link — the actions are — so the images and the
 * meta stay readable to a screen reader without a giant link label.
 */
export default function OrderCard({ order, index = 0 }) {
  const reduceMotion = useReducedMotion();
  const count = orderItemCount(order);
  const preview = order.items.slice(0, 3);
  const remaining = order.items.length - preview.length;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: reduceMotion ? 0 : 0.4,
        delay: reduceMotion ? 0 : Math.min(index * 0.06, 0.3),
        ease: "easeOut",
      }}
      aria-labelledby={`order-${order.id}-heading`}
      className="border border-mist/80 bg-surface/30 p-5 sm:p-7"
    >
      <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
        {/* ------------------------- Identity ------------------------- */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <h3
              id={`order-${order.id}-heading`}
              className="font-display text-xl font-light tracking-tight text-ink"
            >
              Order {order.id}
            </h3>
            <OrderStatusBadge status={order.status} kind="order" />
          </div>
          <p className="mt-1.5 font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            {formatOrderDate(order.createdAt)}
          </p>

          {/* Pieces */}
          <div className="mt-5 flex items-center gap-4">
            <div className="flex -space-x-3">
              {preview.map((item, imageIndex) => (
                <img
                  key={item.lineId}
                  src={item.image}
                  alt=""
                  className="h-20 w-[3.75rem] border border-canvas bg-surface object-cover"
                  style={{ zIndex: preview.length - imageIndex }}
                  loading="lazy"
                />
              ))}
              {remaining > 0 && (
                <span
                  className="flex h-20 w-[3.75rem] items-center justify-center border border-mist bg-canvas font-ui text-[10px] uppercase tracking-[.14em] text-taupe"
                >
                  +{remaining}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-base font-light text-ink">
                {order.items[0].name}
                {order.items.length > 1 ? (
                  <span className="text-taupe"> and more</span>
                ) : null}
              </p>
              <p className="mt-1 font-ui text-[11px] text-taupe">
                {count} {count === 1 ? "piece" : "pieces"} · {order.paymentMethod.label}
              </p>
              <p className="mt-2 font-display text-lg font-light text-ink">
                {formatINR(order.pricing.total)}
              </p>
            </div>
          </div>
        </div>

        {/* -------------------- Delivery + actions -------------------- */}
        <div className="shrink-0 border-t border-mist/70 pt-5 md:w-64 md:border-l md:border-t-0 md:pl-7 md:pt-0">
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">
            {order.status === ORDER_STATUS.DELIVERED
              ? "Delivered"
              : "Estimated Delivery"}
          </p>
          <p className="mt-2 font-ui text-sm text-ink">
            {order.estimatedDelivery || "To be confirmed"}
          </p>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            {order.deliveryMethod.label}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <AtelierButton
              as={Link}
              to={`/account/orders/${order.id}`}
              variant="primary"
              size="chip"
            >
              View Order
            </AtelierButton>
            {canTrackOrder(order) && (
              <Link
                to={`/account/orders/${order.id}/track`}
                className={cn(
                  "font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                  transition.colors
                )}
              >
                Track Order
              </Link>
            )}
          </div>

          <p className="mt-4 font-ui text-[10px] text-taupe">
            <span className="uppercase tracking-[.14em]">Payment</span>{" "}
            <OrderStatusBadge
              status={order.paymentStatus}
              kind="payment"
              className="ml-1 align-middle"
            />
          </p>
        </div>
      </div>
    </motion.article>
  );
}
