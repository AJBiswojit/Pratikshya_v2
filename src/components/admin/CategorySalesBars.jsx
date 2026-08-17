import { formatCompactINR } from "../../utils/admin";
import { formatINR } from "../../utils/shopping";

/**
 * Revenue split by fashion category for the same seven days as the sales
 * overview. A definition list rather than a chart widget: the label, the
 * amount and a proportional hairline bar.
 */
export default function CategorySalesBars({ categories = [] }) {
  if (!categories.length) return null;
  const peak = Math.max(...categories.map((category) => category.sales));

  return (
    <dl className="space-y-3.5">
      {categories.map((category) => {
        const width = peak > 0 ? Math.max(4, Math.round((category.sales / peak) * 100)) : 0;
        return (
          <div key={category.id}>
            <div className="flex items-baseline justify-between gap-3">
              <dt className="font-ui text-xs text-ink">{category.label}</dt>
              <dd className="font-ui text-xs text-taupe">
                <span className="sr-only">{formatINR(category.sales)}</span>
                <span aria-hidden="true">{formatCompactINR(category.sales)}</span>
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
