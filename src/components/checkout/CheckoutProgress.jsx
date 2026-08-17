import { Check } from "lucide-react";
import { cn } from "../../utils/cn";
import { transition } from "../../design-system";

/**
 * The checkout journey indicator — 01 CUSTOMER → 02 DELIVERY → 03 REVIEW →
 * 04 PAYMENT in the Atelier micro-label voice. No bright progress bars:
 * completed steps become ink squares with a check, the current step is
 * marked, and completed steps remain clickable so nothing forces a
 * customer to re-walk their answers.
 */
export default function CheckoutProgress({
  steps = [],
  currentIndex = 0,
  onStepClick,
  className = "",
}) {
  return (
    <nav
      aria-label="Checkout progress"
      className={cn("-mx-6 overflow-x-auto px-6 sm:mx-0 sm:px-0", className)}
    >
      <ol className="flex items-center">
        {steps.map((label, index) => {
          const isCurrent = index === currentIndex;
          const isCompleted = index < currentIndex;
          const isReachable = index <= currentIndex;

          return (
            <li
              key={label}
              className={cn("flex items-center", index > 0 && "flex-1")}
            >
              {index > 0 && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "mx-2 h-px flex-1 sm:mx-3",
                    isCompleted ? "bg-ink" : "bg-mist"
                  )}
                />
              )}

              <button
                type="button"
                onClick={() => isReachable && onStepClick?.(index)}
                disabled={!isReachable}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "group flex shrink-0 flex-col items-center gap-1.5 focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                  !isReachable && "cursor-default",
                  isReachable && onStepClick && transition.colors
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-8 w-8 items-center justify-center border sm:h-9 sm:w-9",
                    isCompleted && "border-ink bg-ink text-ivory",
                    isCurrent && "border-ink bg-canvas text-ink",
                    !isCompleted && !isCurrent && "border-pearl bg-canvas text-taupe"
                  )}
                >
                  {isCompleted ? (
                    <Check size={13} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <span className="font-ui text-[10px] tracking-[.1em]">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  )}
                </span>
                <span
                  className={cn(
                    "whitespace-nowrap font-ui text-[8px] uppercase tracking-[.16em] sm:text-[9px]",
                    isCurrent && "text-ink",
                    isCompleted && "text-brass group-hover:text-accent",
                    !isCompleted && !isCurrent && "text-taupe"
                  )}
                >
                  {label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
