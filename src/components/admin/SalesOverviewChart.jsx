import { useId } from "react";
import { formatCompactINR } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/**
 * The seven-day sales overview.
 *
 * Drawn with layout and hairlines rather than a charting dependency — the
 * project has none installed, and a bar column in the Atelier language is
 * a square ink block, not a rounded gradient. The same figures are printed
 * in a visually-hidden table so the chart is readable by assistive
 * technology instead of being an unlabelled decoration.
 */
export default function SalesOverviewChart({ series = [], className = "" }) {
  const captionId = useId();
  if (!series.length) return null;

  const peak = Math.max(...series.map((point) => point.sales));

  return (
    <div className={cn("", className)}>
      <div
        className="flex h-56 items-end gap-2 sm:gap-3"
        role="img"
        aria-labelledby={captionId}
      >
        {series.map((point, index) => {
          const height = peak > 0 ? Math.max(6, Math.round((point.sales / peak) * 100)) : 0;
          const isPeak = point.sales === peak;
          return (
            <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <span className="font-ui text-[9px] text-taupe sm:text-[10px]">
                {formatCompactINR(point.sales)}
              </span>
              <div className="flex w-full flex-1 items-end">
                <div
                  className={cn(
                    "w-full transition-[height] duration-500",
                    isPeak ? "bg-accent" : index === series.length - 1 ? "bg-ink" : "bg-ink/25"
                  )}
                  style={{ height: `${height}%` }}
                />
              </div>
              <span className="font-ui text-[10px] uppercase tracking-[.1em] text-ink">
                {point.day}
              </span>
              <span className="hidden font-ui text-[9px] text-taupe sm:block">{point.date}</span>
            </div>
          );
        })}
      </div>

      <p id={captionId} className="sr-only">
        Sales for the last seven days.{" "}
        {series.map((point) => `${point.date}: ${formatINR(point.sales)}`).join(". ")}.
      </p>
    </div>
  );
}
