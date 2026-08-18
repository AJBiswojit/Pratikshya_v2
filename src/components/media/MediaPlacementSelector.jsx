import { Check } from "lucide-react";
import { MARKETING_PLACEMENT_OPTIONS, PLACEMENT_MODES } from "../../config/mediaTypes";
import { cn } from "../../utils/cn";

/**
 * Artwork uploads may only target GENERIC placements — the surfaces that
 * read house artwork from the media register. PRODUCT placements are curated
 * from the canonical catalogue on the Marketing Media desk; an artwork
 * record pointed at one would surface nowhere, so it is never offered.
 */
const ARTWORK_PLACEMENT_OPTIONS = MARKETING_PLACEMENT_OPTIONS.filter(
  (placement) => placement.mode === PLACEMENT_MODES.GENERIC
);

export default function MediaPlacementSelector({
  selectedPlacement,
  onSelectPlacement,
  disabled = false,
  error = null,
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe">
          Marketing Placement <span className="text-accent">*</span>
        </label>
        <span className="font-ui text-[10px] text-taupe">Select storefront surface</span>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ARTWORK_PLACEMENT_OPTIONS.map((placement) => {
          const isSelected = selectedPlacement === placement.id;
          return (
            <button
              key={placement.id}
              type="button"
              disabled={disabled}
              onClick={() => onSelectPlacement(placement.id)}
              className={cn(
                "flex flex-col items-start p-3 text-left border transition-all",
                isSelected
                  ? "border-ink bg-surface shadow-sm ring-1 ring-ink"
                  : "border-mist bg-canvas hover:border-ink/50 hover:bg-surface/40",
                disabled && "pointer-events-none opacity-50"
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="font-ui text-xs font-medium text-ink">
                  {placement.label}
                </span>
                <div className="flex items-center gap-1.5">
                  {placement.live ? (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-ui text-[9px] uppercase tracking-wider text-emerald-800">
                      Live
                    </span>
                  ) : (
                    <span className="rounded bg-stone-100 px-1.5 py-0.5 font-ui text-[9px] uppercase tracking-wider text-stone-600">
                      Planned
                    </span>
                  )}
                  {isSelected ? (
                    <Check size={14} className="text-accent" aria-hidden="true" />
                  ) : null}
                </div>
              </div>
              <p className="mt-1 line-clamp-1 font-ui text-[11px] text-taupe">
                {placement.surface}
              </p>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="font-ui text-[11px] text-accent" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
