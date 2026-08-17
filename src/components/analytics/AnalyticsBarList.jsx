import { formatCompactINR } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";

export default function AnalyticsBarList({
  items = [],
  valueKey = "revenue",
  currency = true,
  empty = null,
}) {
  if (!items.length) return empty;
  const peak = Math.max(...items.map((item) => Number(item[valueKey]) || 0), 0);

  return (
    <dl className="space-y-3.5">
      {items.map((item) => {
        const value = Number(item[valueKey]) || 0;
        const width = peak > 0 ? Math.max(4, Math.round((value / peak) * 100)) : 0;
        return (
          <div key={item.id || item.label}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="min-w-0 truncate font-ui text-xs text-ink">{item.label}</dt>
              <dd className="shrink-0 font-ui text-xs text-taupe">
                <span className="sr-only">{currency ? formatINR(value) : value}</span>
                <span aria-hidden="true">{currency ? formatCompactINR(value) : value}</span>
              </dd>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-mist/70" aria-hidden="true">
              <div className="h-full bg-accent/80" style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </dl>
  );
}
