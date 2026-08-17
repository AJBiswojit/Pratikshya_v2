import { useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { body, eyebrow, transition } from "../../design-system";
import { colorSwatches } from "../../data/products/taxonomy";
import { cn } from "../../utils/cn";

/**
 * The filter set.
 *
 * One component serves both the desktop sidebar and the mobile drawer — the
 * surrounding chrome differs, the controls do not.
 *
 * Groups are collapsible and rendered from the facet list, so the panel has
 * no knowledge of what a fabric or an occasion is. The first few groups open
 * by default; the long tail stays folded so the column reads as a quiet
 * index rather than a wall of checkboxes.
 */

const OPEN_BY_DEFAULT = 4;

/* ------------------------------------------------------------------ */
/* Controls                                                            */
/* ------------------------------------------------------------------ */

function OptionRow({ label, count, checked, onChange, id }) {
  return (
    <li>
      <label
        htmlFor={id}
        className={cn(
          "group flex cursor-pointer items-center gap-3 py-1.5",
          transition.colors
        )}
      >
        <span className="relative flex h-3.5 w-3.5 shrink-0 items-center justify-center border border-mist bg-canvas group-hover:border-accent">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          {checked ? (
            <Check size={11} strokeWidth={2.5} className="text-accent" aria-hidden="true" />
          ) : null}
        </span>

        <span
          className={cn(
            body.base,
            "flex-1",
            checked ? "text-ink" : "text-graphite group-hover:text-ink"
          )}
        >
          {label}
        </span>

        <span className={cn(body.micro, "text-ash tabular-nums")}>{count}</span>
      </label>
    </li>
  );
}

function SwatchOption({ label, count, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      title={`${label} (${count})`}
      className={cn("group flex flex-col items-center gap-1.5", transition.all)}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center border p-0.5",
          checked ? "border-accent" : "border-mist group-hover:border-brass"
        )}
      >
        <span
          className="h-full w-full"
          style={{ backgroundColor: colorSwatches[label] ?? "#d8d2c8" }}
          aria-hidden="true"
        />
      </span>
      <span
        className={cn(
          body.micro,
          "leading-none",
          checked ? "text-ink" : "text-taupe group-hover:text-ink"
        )}
      >
        {label}
      </span>
    </button>
  );
}

function ChipOption({ label, count, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={onChange}
      aria-pressed={checked}
      title={`${label} (${count})`}
      className={cn(
        "border px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.1em]",
        transition.all,
        checked
          ? "border-ink bg-ink text-ivory"
          : "border-mist text-graphite hover:border-ink hover:text-ink"
      )}
    >
      {label}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Group                                                               */
/* ------------------------------------------------------------------ */

function FacetGroup({ facet, filters, onToggle, defaultOpen, idPrefix }) {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);

  const selected = filters[facet.id];
  const isChecked = (optionId) =>
    Array.isArray(selected) ? selected.includes(optionId) : selected === optionId;

  const activeCount = Array.isArray(selected) ? selected.length : selected ? 1 : 0;

  /* Long lists are truncated until asked for, so the column stays scannable. */
  const limit = facet.kind === "swatch" || facet.kind === "chip" ? 12 : 6;
  const overflowing = facet.options.length > limit;
  const visible = expanded || !overflowing ? facet.options : facet.options.slice(0, limit);

  const panelId = `${idPrefix}-${facet.id}-panel`;

  return (
    <div className="border-b border-mist/60 py-5">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span className={cn(eyebrow.label, "text-ink")}>
            {facet.label}
            {activeCount > 0 ? (
              <span className="ml-2 text-accent">({activeCount})</span>
            ) : null}
          </span>
          {open ? (
            <Minus size={13} strokeWidth={1.5} className="text-taupe" aria-hidden="true" />
          ) : (
            <Plus size={13} strokeWidth={1.5} className="text-taupe" aria-hidden="true" />
          )}
        </button>
      </h3>

      {open ? (
        <div id={panelId} className="pt-4">
          {facet.kind === "swatch" ? (
            <div className="flex flex-wrap gap-x-4 gap-y-3">
              {visible.map((option) => (
                <SwatchOption
                  key={option.id}
                  label={option.label}
                  count={option.count}
                  checked={isChecked(option.id)}
                  onChange={() => onToggle(facet.id, option.id)}
                />
              ))}
            </div>
          ) : facet.kind === "chip" ? (
            <div className="flex flex-wrap gap-2">
              {visible.map((option) => (
                <ChipOption
                  key={option.id}
                  label={option.label}
                  count={option.count}
                  checked={isChecked(option.id)}
                  onChange={() => onToggle(facet.id, option.id)}
                />
              ))}
            </div>
          ) : (
            <ul>
              {visible.map((option) => (
                <OptionRow
                  key={option.id}
                  id={`${idPrefix}-${facet.id}-${option.id}`}
                  label={option.label}
                  count={option.count}
                  checked={isChecked(option.id)}
                  onChange={() => onToggle(facet.id, option.id)}
                />
              ))}
            </ul>
          )}

          {overflowing ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className={cn(
                eyebrow.label,
                "mt-3 text-brass hover:text-accent",
                transition.colors
              )}
            >
              {expanded ? "Show less" : `Show all ${facet.options.length}`}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Panel                                                               */
/* ------------------------------------------------------------------ */

export default function FilterPanel({
  facets,
  filters,
  onToggle,
  idPrefix = "filter",
  className = "",
}) {
  return (
    <div className={cn(className)}>
      {facets.map((facet, index) => (
        <FacetGroup
          key={facet.id}
          facet={facet}
          filters={filters}
          onToggle={onToggle}
          defaultOpen={index < OPEN_BY_DEFAULT}
          idPrefix={idPrefix}
        />
      ))}
    </div>
  );
}
