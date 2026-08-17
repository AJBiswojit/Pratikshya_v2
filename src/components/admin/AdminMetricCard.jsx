import { Rule } from "../../design-system";
import { cn } from "../../utils/cn";

/**
 * A business metric tile.
 *
 * `tone="alert"` is reserved for figures that need an operator's attention
 * (out of stock, suspended accounts) — the terracotta accent, never a red
 * borrowed from another design system.
 */
export default function AdminMetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  className = "",
}) {
  const alert = tone === "alert";

  return (
    <article
      className={cn(
        "border bg-surface/40 p-5",
        alert ? "border-accent/40 bg-accent/[0.04]" : "border-mist/80",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">{label}</p>
        {Icon ? (
          <span
            className={cn(
              "border p-1.5",
              alert ? "border-accent/40 bg-canvas text-accent" : "border-mist/70 bg-canvas text-ink"
            )}
            aria-hidden="true"
          >
            <Icon size={14} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          "mt-3 font-display text-3xl font-light tracking-tight",
          alert ? "text-accent" : "text-ink"
        )}
      >
        {value}
      </p>
      <Rule width="w-8" tone="accent" className="my-3" />
      {hint ? <p className="font-ui text-[11px] text-taupe">{hint}</p> : null}
    </article>
  );
}
