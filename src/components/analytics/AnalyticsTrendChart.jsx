import { useId } from "react";
import { formatCompactINR } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";
import AnalyticsEmpty from "./AnalyticsEmpty";

export default function AnalyticsTrendChart({
  series = [],
  metric = "revenue",
  emptyTitle = "No sales data for this period.",
  emptyDescription,
}) {
  const captionId = useId();
  const hasData = series.some((point) => Number(point[metric]) > 0);
  if (!series.length || !hasData) {
    return <AnalyticsEmpty title={emptyTitle} description={emptyDescription} />;
  }

  const peak = Math.max(...series.map((point) => Number(point[metric]) || 0), 0);
  const formatValue = (value) =>
    metric === "revenue" || metric === "sales" ? formatCompactINR(value) : String(value);

  return (
    <div>
      <div
        className="flex h-56 items-end gap-1.5 overflow-x-auto sm:gap-2"
        role="img"
        aria-labelledby={captionId}
      >
        {series.map((point, index) => {
          const value = Number(point[metric]) || 0;
          const height = peak > 0 ? Math.max(value > 0 ? 8 : 2, Math.round((value / peak) * 100)) : 0;
          const isPeak = value === peak && value > 0;
          return (
            <div key={point.key || point.date || index} className="flex min-w-[2.25rem] flex-1 flex-col items-center gap-2">
              <span className="font-ui text-[9px] text-taupe sm:text-[10px]">
                {value ? formatValue(value) : ""}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full min-w-[10px] transition-[height] duration-500",
                    isPeak ? "bg-accent" : index === series.length - 1 ? "bg-ink" : "bg-ink/25"
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="max-w-full truncate font-ui text-[9px] uppercase tracking-[.08em] text-ink sm:text-[10px]">
                {point.shortLabel || point.day || point.date}
              </span>
            </div>
          );
        })}
      </div>
      <p id={captionId} className="sr-only">
        {metric === "revenue" ? "Revenue" : "Orders"} over the selected period.{" "}
        {series
          .map((point) =>
            `${point.label || point.date}: ${
              metric === "revenue" ? formatINR(point.revenue || 0) : `${point.orders || 0} orders`
            }`
          )
          .join(". ")}
        .
      </p>
    </div>
  );
}
