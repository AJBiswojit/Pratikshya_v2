import { Rule } from "../../design-system";
import { cn } from "../../utils/cn";

export default function AnalyticsMetric({
  label,
  value,
  hint,
  change,
  direction = "flat",
  comparable = false,
  tone = "default",
}) {
  const alert = tone === "alert";
  return (
    <article
      className={cn(
        "border bg-surface/40 p-5",
        alert ? "border-accent/40 bg-accent/[0.04]" : "border-mist/80"
      )}
    >
      <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">{label}</p>
      <p
        className={cn(
          "mt-3 font-display text-3xl font-light tracking-tight",
          alert ? "text-accent" : "text-ink"
        )}
      >
        {value}
      </p>
      <Rule width="w-8" tone="accent" className="my-3" />
      {comparable && change ? (
        <p
          className={cn(
            "font-ui text-[11px]",
            direction === "up" ? "text-cocoa" : direction === "down" ? "text-accent" : "text-taupe"
          )}
        >
          <span aria-hidden="true">{direction === "up" ? "↑ " : direction === "down" ? "↓ " : ""}</span>
          <span>{change}</span>
        </p>
      ) : hint ? (
        <p className="font-ui text-[11px] text-taupe">{hint}</p>
      ) : (
        <p className="font-ui text-[11px] text-taupe">No previous period to compare</p>
      )}
    </article>
  );
}
