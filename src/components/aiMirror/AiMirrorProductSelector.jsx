import { Check, Search, Sparkles } from "lucide-react";
import PratikshyaImage from "../PratikshyaImage";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/** Product rail sourced exclusively from the filtered live catalogue passed by the page. */
export default function AiMirrorProductSelector({
  products,
  categories,
  query,
  category,
  selectedId,
  onQueryChange,
  onCategoryChange,
  onSelect,
  canLoadMore,
  onLoadMore,
}) {
  return (
    <section aria-labelledby="ai-mirror-selector-heading" className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">The edit</p>
          <h2 id="ai-mirror-selector-heading" className="mt-1 font-display text-3xl font-light text-ink">
            Choose your <span className="italic text-accent">look</span>
          </h2>
        </div>
        <span className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">{products.length} pieces</span>
      </div>

      <div className="mt-5 border border-mist/80 bg-surface/30 p-3">
        <label htmlFor="ai-mirror-search" className="sr-only">Search eligible apparel</label>
        <div className="flex items-center gap-3 border-b border-ink/25 px-1 pb-2">
          <Search size={16} className="shrink-0 text-accent" aria-hidden="true" />
          <input
            id="ai-mirror-search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search sarees, lehengas, suits…"
            className="min-w-0 flex-1 bg-transparent font-ui text-sm text-ink outline-none placeholder:text-taupe/80"
          />
        </div>
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1 scrollbar-none" role="group" aria-label="Filter looks by category">
          <button
            type="button"
            onClick={() => onCategoryChange("all")}
            aria-pressed={category === "all"}
            className={cn(
              "shrink-0 border px-3 py-2 font-ui text-[9px] uppercase tracking-[.14em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
              category === "all" ? "border-ink bg-ink text-ivory" : "border-mist bg-canvas text-taupe hover:border-ink/50 hover:text-ink"
            )}
          >
            All looks
          </button>
          {categories.map((entry) => (
            <button
              key={entry.key}
              type="button"
              onClick={() => onCategoryChange(entry.key)}
              aria-pressed={category === entry.key}
              className={cn(
                "shrink-0 border px-3 py-2 font-ui text-[9px] uppercase tracking-[.14em] transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent",
                category === entry.key ? "border-ink bg-ink text-ivory" : "border-mist bg-canvas text-taupe hover:border-ink/50 hover:text-ink"
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {products.length ? (
        <>
          <div className="-mx-5 mt-5 flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none xl:mx-0 xl:max-h-[39rem] xl:flex-col xl:overflow-y-auto xl:px-0 xl:pr-1">
            {products.map((product) => {
              const selected = product.id === selectedId;
              const colour = product.colors?.[0];
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onSelect(product)}
                  aria-pressed={selected}
                  className={cn(
                    "group relative w-[11.75rem] shrink-0 overflow-hidden border bg-canvas text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent xl:flex xl:w-full xl:min-h-[8.5rem]",
                    selected ? "border-accent bg-blush/25" : "border-mist/80 hover:border-ink/45"
                  )}
                >
                  <div className="relative aspect-[4/5] overflow-hidden bg-surface xl:w-[6.5rem] xl:shrink-0 xl:aspect-auto">
                    <PratikshyaImage
                      image={product.image}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.035]"
                      loading="lazy"
                      sizes="(min-width: 1280px) 104px, 188px"
                    />
                    {selected ? (
                      <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center bg-ink text-ivory" aria-hidden="true">
                        <Check size={13} />
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 p-3 xl:flex xl:flex-1 xl:flex-col xl:justify-center xl:p-4">
                    <p className="truncate font-ui text-[9px] uppercase tracking-[.15em] text-accent">{product.mirrorCategoryLabel}</p>
                    <p className="mt-1 line-clamp-2 font-display text-xl leading-[.95] text-ink xl:text-[1.35rem]">{product.name}</p>
                    <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-ui text-xs text-ink">{formatINR(product.price)}</span>
                      {product.fabric ? <span className="font-ui text-[10px] text-taupe">{product.fabric}</span> : null}
                    </div>
                    {colour ? <p className="mt-1 font-ui text-[10px] text-taupe">{colour}</p> : null}
                  </div>
                  <span className="sr-only">{selected ? "Selected" : "Select"} {product.name} for the AI Mirror</span>
                </button>
              );
            })}
          </div>
          {canLoadMore ? (
            <button
              type="button"
              onClick={onLoadMore}
              className="mt-4 inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            >
              <Sparkles size={13} aria-hidden="true" />
              Show more looks
            </button>
          ) : null}
        </>
      ) : (
        <div className="mt-5 border border-mist/80 bg-surface/30 px-5 py-8 text-center">
          <p className="font-display text-2xl font-light text-ink">No matching look just now.</p>
          <p className="mt-2 font-ui text-xs leading-relaxed text-taupe">Try another fabric, silhouette or category from the current apparel edit.</p>
          <button
            type="button"
            onClick={() => {
              onQueryChange("");
              onCategoryChange("all");
            }}
            className="mt-4 font-ui text-[10px] uppercase tracking-[.16em] text-accent hover:text-ink focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
          >
            Reset filters
          </button>
        </div>
      )}
    </section>
  );
}
