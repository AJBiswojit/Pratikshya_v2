import { cn } from "../../utils/cn";
import { aspects } from "../tokens";
import { gap } from "../spacing";

/**
 * The shape of a product grid, before the products arrive.
 *
 * Mirrors the card exactly — a 3:4 plate, a name line, a price line — so the
 * layout does not shift when real content replaces it. Surfaces pulse rather
 * than spin; the global `prefers-reduced-motion` rule stills them.
 */
export default function ProductGridSkeleton({ count = 8, columns, className = "" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "grid grid-cols-2",
        columns ?? "lg:grid-cols-3",
        gap.tile,
        className
      )}
    >
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="animate-pulse">
          <div className={cn(aspects.product, "bg-surface mb-5")} />
          <div className="h-3 w-3/4 bg-surface mb-3" />
          <div className="h-3 w-1/3 bg-surface" />
        </div>
      ))}
    </div>
  );
}
