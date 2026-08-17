import { cn } from "../../utils/cn";
import { eyebrow } from "../typography";

/**
 * The waiting state.
 *
 * The Atelier language has no spinners. A route that is still resolving
 * says so quietly, in the same uppercase micro-label as every other
 * eyebrow, with a hairline that breathes.
 *
 * The pulse is a CSS animation, so the global `prefers-reduced-motion`
 * rule in `index.css` already stills it.
 */
export default function LoadingState({
  label = "Loading",
  tone = "canvas",
  className = "",
  ...rest
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center justify-center gap-5 py-32", className)}
      {...rest}
    >
      <span
        aria-hidden="true"
        className={cn(
          "h-px w-16 animate-pulse",
          tone === "ink" ? "bg-gold" : "bg-accent"
        )}
      />
      <span className={cn(eyebrow.label, tone === "ink" ? "text-ash" : "text-taupe")}>
        {label}
      </span>
    </div>
  );
}
