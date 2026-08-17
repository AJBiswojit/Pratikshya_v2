import { Rule } from "../../design-system";
import ProgressBar from "./ProgressBar";
import { formatMetricValue, formatPercent } from "./format";

export default function TargetCard({ metric }) {
  if (!metric) return null;
  const percent = metric.percent;
  return (
    <article className="border border-mist/80 bg-surface/40 p-5">
      <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">{metric.label}</p>
      <p className="mt-3 font-display text-2xl font-light text-ink">
        {formatMetricValue(metric.actualValue, metric.unit)}
      </p>
      <p className="mt-1 font-ui text-xs text-taupe">
        of {formatMetricValue(metric.targetValue, metric.unit)}
        {percent != null ? ` · ${formatPercent(Math.min(percent, 999))}` : ""}
      </p>
      <Rule width="w-8" tone="accent" className="my-3" />
      <ProgressBar value={percent || 0} label={`${metric.label} ${formatPercent(percent)}`} />
      <p className="mt-3 font-ui text-[11px] text-taupe">{metric.source}</p>
    </article>
  );
}
