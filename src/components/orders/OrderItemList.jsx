import { Link } from "react-router-dom";
import { transition } from "../../design-system";
import { orderItemHref } from "../../utils/orders";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/**
 * The pieces of an order.
 *
 * Each line shows only what the order recorded — image, name, variant,
 * quantity and price — and links to the live product page when the piece
 * is still in the catalogue. A retired product says so quietly instead of
 * offering a broken link.
 */
export default function OrderItemList({ items = [], className = "" }) {
  if (items.length === 0) return null;

  return (
    <ul className={cn("border-t border-mist/70", className)}>
      {items.map((item) => {
        const href = orderItemHref(item);
        const variant =
          [item.color, item.size].filter(Boolean).join(" · ") || "Free Size";
        const saved =
          item.originalPrice && item.originalPrice > item.price
            ? (item.originalPrice - item.price) * item.quantity
            : 0;

        return (
          <li
            key={item.lineId}
            className="flex gap-4 border-b border-mist/70 py-5 sm:gap-6"
          >
            <img
              src={item.image}
              alt=""
              className="h-24 w-[4.5rem] shrink-0 bg-surface object-cover sm:h-28 sm:w-20"
              loading="lazy"
            />

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div className="min-w-0">
                <p className="font-display text-base font-light leading-snug text-ink">
                  {item.name}
                </p>
                <p className="mt-1 font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                  {variant} · Qty {item.quantity}
                </p>
                {saved > 0 ? (
                  <p className="mt-1 font-ui text-[11px] text-accent">
                    {formatINR(saved)} saved on this piece
                  </p>
                ) : null}

                <div className="mt-2.5">
                  {href ? (
                    <Link
                      to={href}
                      className={cn(
                        "font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                        transition.colors
                      )}
                    >
                      View Product
                      <span className="sr-only"> — {item.name}</span>
                    </Link>
                  ) : (
                    <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
                      No longer in the collection
                    </p>
                  )}
                </div>
              </div>

              <div className="shrink-0 text-left sm:text-right">
                <p className="font-ui text-sm text-ink">{formatINR(item.lineTotal)}</p>
                {item.originalPrice && item.originalPrice > item.price ? (
                  <p className="mt-0.5 font-ui text-[11px] text-ash line-through">
                    {formatINR(item.originalPrice * item.quantity)}
                  </p>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
