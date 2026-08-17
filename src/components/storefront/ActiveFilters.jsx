import { X } from "lucide-react";
import { eyebrow, transition } from "../../design-system";
import { chipLabel } from "../../data/products/facets";
import { cn } from "../../utils/cn";

/**
 * The row of active selections.
 *
 * Each chip names the value, not the facet — "Silk", not "Fabric: Silk" —
 * because the value is what the shopper chose and the panel already labels
 * the group. The facet is carried in the accessible name instead.
 */
export default function ActiveFilters({ chips, onRemove, onClear, className = "" }) {
  if (chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {chips.map((chip) => (
        <button
          key={`${chip.facet}-${chip.value}`}
          type="button"
          onClick={() => onRemove(chip.facet, chip.value)}
          aria-label={`Remove filter ${chip.facetLabel}: ${chipLabel(chip.facet, chip.value)}`}
          className={cn(
            "group inline-flex items-center gap-2 border border-mist px-3 py-1.5",
            eyebrow.label,
            "text-graphite hover:border-ink hover:text-ink",
            transition.all
          )}
        >
          {chipLabel(chip.facet, chip.value)}
          <X
            size={11}
            strokeWidth={1.5}
            aria-hidden="true"
            className="text-taupe group-hover:text-accent"
          />
        </button>
      ))}

      <button
        type="button"
        onClick={onClear}
        className={cn(
          eyebrow.label,
          "ml-1 text-brass underline underline-offset-4 hover:text-accent",
          transition.colors
        )}
      >
        Clear all
      </button>
    </div>
  );
}
