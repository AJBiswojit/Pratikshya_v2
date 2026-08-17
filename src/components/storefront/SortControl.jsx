import { ChevronDown } from "lucide-react";
import { eyebrow, transition } from "../../design-system";
import { sortOptions } from "../../data/products/taxonomy";
import { cn } from "../../utils/cn";

/**
 * The sort control.
 *
 * A native `select` carrying the Atelier's typography: no box, no radius, a
 * hairline underneath and the chevron drawn beside the value. Native is the
 * right choice here — it is keyboard accessible, screen-reader complete and
 * renders as the platform picker on a phone, which no custom menu improves on.
 */
export default function SortControl({ value, onChange, className = "" }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <label htmlFor="catalogue-sort" className={cn(eyebrow.label, "text-taupe shrink-0")}>
        Sort
      </label>

      <div className="relative">
        <select
          id="catalogue-sort"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "cursor-pointer appearance-none border-b border-mist bg-transparent py-1.5 pr-7 pl-0",
            eyebrow.label,
            "text-ink hover:border-accent focus:border-accent focus:outline-none",
            transition.colors
          )}
        >
          {sortOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={13}
          strokeWidth={1.5}
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 text-taupe"
        />
      </div>
    </div>
  );
}
