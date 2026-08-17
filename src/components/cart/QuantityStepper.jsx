import { Minus, Plus } from "lucide-react";
import { cn } from "../../utils/cn";

/**
 * The Atelier quantity control.
 *
 * A hairline − / value / + strip, shared by the product detail panel, the
 * cart page and the mini-cart so the quantity rule is enforced by one
 * component: never below the minimum, never above the mock stock.
 */
export default function QuantityStepper({
  value,
  min = 1,
  max = Infinity,
  onChange,
  label = "Quantity",
  size = "md",
  className = "",
}) {
  const compact = size === "sm";

  const buttonClass = cn(
    "flex h-full items-center justify-center text-ink hover:bg-surface",
    "disabled:cursor-not-allowed disabled:opacity-25",
    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
    compact ? "w-8" : "w-10"
  );

  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        "flex items-center border border-mist",
        compact ? "h-8" : "h-10",
        className
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={buttonClass}
      >
        <Minus size={compact ? 12 : 13} aria-hidden="true" />
      </button>
      <output
        aria-live="polite"
        aria-label={`${label}: ${value}`}
        className={cn("text-center font-ui", compact ? "min-w-7 text-[11px]" : "min-w-9 text-xs")}
      >
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={buttonClass}
      >
        <Plus size={compact ? 12 : 13} aria-hidden="true" />
      </button>
    </div>
  );
}
