import { AtelierBadge } from "../../design-system";
import {
  getOrderStatus,
  getPaymentStatus,
  getReturnStatus,
} from "../../config/orderConfig";
import { cn } from "../../utils/cn";

/**
 * The status marker used everywhere an order, payment or return states
 * where it stands.
 *
 * Tone comes from the centralised status definitions, never from the
 * calling component, so the same status always reads the same way. The
 * label is spoken to assistive technology with its kind ("Order status:
 * Shipped") rather than left as a bare word.
 */

/** Atelier tones for the quiet statuses the badge palette does not cover. */
const quietTones = {
  quiet: "border border-mist bg-canvas text-taupe",
  muted: "border border-mist bg-surface/60 text-taupe",
};

const kindLabels = {
  order: "Order status",
  payment: "Payment status",
  return: "Return status",
};

const resolvers = {
  order: getOrderStatus,
  payment: getPaymentStatus,
  return: getReturnStatus,
};

export default function OrderStatusBadge({
  status,
  kind = "order",
  className = "",
}) {
  const definition = (resolvers[kind] ?? getOrderStatus)(status);
  const quiet = quietTones[definition.tone];

  const content = (
    <>
      <span className="sr-only">{kindLabels[kind] ?? kindLabels.order}: </span>
      {definition.label}
    </>
  );

  if (quiet) {
    return (
      <span
        className={cn(
          "inline-block px-2 py-1 font-ui text-[9px] uppercase tracking-widest",
          quiet,
          className
        )}
      >
        {content}
      </span>
    );
  }

  return (
    <AtelierBadge variant={definition.tone} className={cn("inline-block", className)}>
      {content}
    </AtelierBadge>
  );
}
