/**
 * PRATIKSHYA FASHON — Catalogue toolbar.
 *
 * The ecommerce control bar that sits immediately below the compact
 * category header. Layout:
 *
 *   Desktop:  FILTERS       [N PIECES]          SORT
 *   Mobile:   [FILTER] [SORT]            (count inline below or beside)
 *
 * - Filter button opens the drawer on mobile. On desktop, the desktop
 *   sidebar is always present so the label is purely decorative / reserved.
 * - Count label ("N pieces") updates dynamically from the query.
 * - Sort is the existing canonical SortControl.
 *
 * This is presentation only — filtering/sorting state lives in the
 * existing useCatalogueQuery hook, which is unchanged.
 */

import { SlidersHorizontal } from "lucide-react";
import { cn } from "../../utils/cn";
import { body, eyebrow as eyebrowType } from "../../design-system/typography";
import { transition } from "../../design-system/motion";
import SortControl from "./SortControl";

/**
 * "N pieces" label. Uses the canonical singular/plural form "1 piece" /
 * "N pieces" so zero reads naturally too.
 */
export function PiecesCount({ total, className = "" }) {
  const label = total === 1 ? "1 piece" : `${total} pieces`;
  return (
    <p
      aria-live="polite"
      className={cn(eyebrowType.label, "text-ink", className)}
    >
      {label}
    </p>
  );
}

export default function CatalogueToolbar({
  total,
  sort,
  onSortChange,
  onOpenFilters,
  activeFilterCount = 0,
  showDesktopFilterLabel = true,
  className = "",
}) {
  return (
    <div
      className={cn(
        // Top hairline separator, bottom border kept subtle.
        "border-b border-mist/80 py-3 md:py-4",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3">
        {/* Left: Filter control */}
        <div className="flex items-center gap-3">
          {/* Mobile filter button */}
          <button
            type="button"
            onClick={onOpenFilters}
            className={cn(
              "lg:hidden inline-flex items-center gap-2 border border-mist px-4 py-2",
              eyebrowType.label,
              "text-ink hover:border-ink",
              transition.all
            )}
          >
            <SlidersHorizontal size={13} strokeWidth={1.5} aria-hidden="true" />
            Filter
            {activeFilterCount > 0 ? (
              <span className="text-accent">({activeFilterCount})</span>
            ) : null}
          </button>

          {/* Desktop filter label (decorative — the sidebar is visible). */}
          {showDesktopFilterLabel ? (
            <p
              className={cn(
                "hidden lg:inline-flex items-center gap-2",
                eyebrowType.label,
                "text-taupe"
              )}
            >
              <SlidersHorizontal size={13} strokeWidth={1.5} aria-hidden="true" />
              Filters
              {activeFilterCount > 0 ? (
                <span className="text-accent">({activeFilterCount})</span>
              ) : null}
            </p>
          ) : null}
        </div>

        {/* Center: Product count (hidden on very small screens; shown on
            mobile via a secondary line below to keep controls tight). */}
        <PiecesCount total={total} className="hidden sm:block" />

        {/* Right: Sort */}
        <SortControl value={sort} onChange={onSortChange} />
      </div>

      {/* Mobile-only count line, sits under the primary controls. */}
      <div className="sm:hidden mt-2">
        <PiecesCount total={total} className={cn(body.micro, "text-taupe")} />
      </div>
    </div>
  );
}
