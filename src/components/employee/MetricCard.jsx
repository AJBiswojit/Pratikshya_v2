import { Rule } from "../../design-system";
import { cn } from "../../utils/cn";

export default function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  className = "",
}) {
  return (
    <article className={cn("border border-mist/80 bg-surface/40 p-5 sm:p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">{label}</p>
        {Icon ? (
          <span className="border border-mist/70 bg-canvas p-1.5 text-ink" aria-hidden="true">
            <Icon size={14} strokeWidth={1.5} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-3xl font-light tracking-tight text-ink">{value}</p>
      <Rule width="w-8" tone="accent" className="my-3" />
      {hint ? <p className="font-ui text-[11px] text-taupe">{hint}</p> : null}
    </article>
  );
}
