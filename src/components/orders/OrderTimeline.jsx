import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { formatEventTime } from "../../utils/orders";
import { cn } from "../../utils/cn";

/**
 * The Atelier timeline.
 *
 * One vertical rail carries both the shipment journey and the return
 * journey, so tracking and returns speak the same visual language: a
 * hairline spine, a filled marker for what has happened, a ringed marker
 * for where the order stands now, and an open marker for what is still
 * ahead.
 *
 * Semantics: an ordered list, each step announcing its own state, with the
 * current step marked `aria-current="step"`. Motion is a short stagger and
 * is stilled entirely under `prefers-reduced-motion`.
 */

const markerStyles = {
  done: "border-accent bg-accent text-white",
  current: "border-accent bg-canvas text-accent",
  upcoming: "border-mist bg-canvas text-mist",
};

const titleStyles = {
  done: "text-ink",
  current: "text-accent",
  upcoming: "text-taupe",
};

const stateLabels = {
  done: "Completed",
  current: "Current step",
  upcoming: "Upcoming",
};

export default function OrderTimeline({
  events = [],
  showLocation = true,
  className = "",
  ariaLabel = "Order timeline",
}) {
  const reduceMotion = useReducedMotion();
  if (events.length === 0) return null;

  return (
    <ol aria-label={ariaLabel} className={cn("relative", className)}>
      {events.map((event, index) => {
        const isLast = index === events.length - 1;
        const state = event.state ?? "upcoming";

        return (
          <motion.li
            key={event.status}
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: reduceMotion ? 0 : 0.35,
              delay: reduceMotion ? 0 : Math.min(index * 0.05, 0.3),
              ease: "easeOut",
            }}
            aria-current={state === "current" ? "step" : undefined}
            className="relative flex gap-4 pb-8 last:pb-0 sm:gap-5"
          >
            {/* Rail */}
            {!isLast && (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-[11px] top-6 bottom-0 w-px",
                  state === "done" ? "bg-accent/40" : "bg-mist"
                )}
              />
            )}

            {/* Marker */}
            <span
              aria-hidden="true"
              className={cn(
                "relative z-[1] mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                markerStyles[state]
              )}
            >
              {state === "done" ? (
                <Check size={12} strokeWidth={2} />
              ) : (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    state === "current" ? "bg-accent" : "bg-mist"
                  )}
                />
              )}
            </span>

            {/* Copy */}
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h4
                  className={cn(
                    "font-ui text-[11px] font-medium uppercase tracking-[.18em]",
                    titleStyles[state]
                  )}
                >
                  {event.title}
                  <span className="sr-only"> — {stateLabels[state]}</span>
                </h4>
                {event.timestamp && state !== "upcoming" ? (
                  <p className="font-ui text-[10px] text-taupe">
                    {formatEventTime(event.timestamp)}
                    {event.projected ? " · Estimated" : ""}
                  </p>
                ) : null}
              </div>

              {event.description ? (
                <p
                  className={cn(
                    "mt-1.5 max-w-prose font-ui text-xs leading-relaxed",
                    state === "upcoming" ? "text-taupe/80" : "text-graphite"
                  )}
                >
                  {event.description}
                </p>
              ) : null}

              {showLocation && event.location && state !== "upcoming" ? (
                <p className="mt-1 font-ui text-[10px] uppercase tracking-[.14em] text-brass">
                  {event.location}
                </p>
              ) : null}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}
