import { SlidersHorizontal } from "lucide-react";
import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AtelierButton,
  EmptyState,
  ProductGridSkeleton,
  body,
  eyebrow,
  transition,
} from "../../design-system";
import { buildFacets } from "../../data/products/facets";
import useCatalogueQuery from "../../hooks/useCatalogueQuery";
import { resolveCollectionRoute } from "../../services/taxonomyRouting";
import { cn } from "../../utils/cn";
import ActiveFilters from "./ActiveFilters";
import FilterDrawer from "./FilterDrawer";
import FilterPanel from "./FilterPanel";
import ProductGrid from "./ProductGrid";
import SortControl from "./SortControl";

/**
 * The discovery engine.
 *
 * Every product-listing route on the site renders this component: the shop,
 * the eight category pages, the collections, the search results and the
 * inherited navigation paths. They differ only by the scope handed in, which
 * is why there is exactly one implementation of filtering, sorting, counting
 * and pagination to maintain.
 *
 * Layout is a two-column editorial spread — a quiet filter index on the left,
 * the grid on the right — collapsing to a single column with a drawer below
 * the laptop breakpoint.
 */
export default function CatalogueBrowser({
  scopeFilters = {},
  searchFromUrl = false,
  unit = "pieces",
  emptyAction = null,
  loading = false,
  className = "",
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const {
    filters,
    sort,
    activeChips,
    activeCount,
    visible,
    total,
    scoped,
    hasMore,
    remaining,
    toggleFilter,
    removeFilter,
    clearFilters,
    setSort,
    loadMore,
  } = useCatalogueQuery({ scopeFilters, searchFromUrl });

  /* Facets are counted against the route's scope, never the whole catalogue,
     so a category page never offers a filter that would empty it. */
  const facets = useMemo(
    () => buildFacets(scoped, filters, scopeFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, JSON.stringify(filters), JSON.stringify(scopeFilters)]
  );

  const countLabel = total === 1 ? `1 curated piece` : `${total} curated ${unit}`;

  return (
    <div className={cn("lg:flex lg:gap-10", className)}>
      {/* Desktop filter index */}
      <aside className="hidden lg:block w-52 shrink-0">
        <div className="sticky top-28">
          <div className="flex items-baseline justify-between border-b border-ink/15 pb-4">
            <h2 className={cn(eyebrow.section, "text-ink")}>Refine</h2>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className={cn(
                  eyebrow.label,
                  "text-brass underline underline-offset-4 hover:text-accent",
                  transition.colors
                )}
              >
                Clear
              </button>
            ) : null}
          </div>

          <FilterPanel
            facets={facets}
            filters={filters}
            onToggle={toggleFilter}
            idPrefix="sidebar"
            className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1"
          />
        </div>
      </aside>

      {/* Results */}
      <div className="min-w-0 flex-1">
        {/* Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-5">
          <p className={cn(body.caption, "text-taupe")} aria-live="polite">
            {loading ? "Curating the selection" : countLabel}
          </p>

          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className={cn(
                "lg:hidden inline-flex items-center gap-2 border border-mist px-4 py-2",
                eyebrow.label,
                "text-ink hover:border-ink",
                transition.all
              )}
            >
              <SlidersHorizontal size={13} strokeWidth={1.5} aria-hidden="true" />
              Filter
              {activeCount > 0 ? <span className="text-accent">({activeCount})</span> : null}
            </button>

            <SortControl value={sort} onChange={setSort} />
          </div>
        </div>

        <ActiveFilters
          chips={activeChips}
          onRemove={removeFilter}
          onClear={clearFilters}
          className="pt-5"
        />

        {/* Grid */}
        <div className="pt-10">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : total === 0 ? (
            <EmptyState
              eyebrow="Nothing Matches"
              title="Not quite the right piece"
              description="Nothing in this selection matches every filter. Loosen one, or let us show you what the atelier is wearing this season."
              actions={
                <>
                  {activeCount > 0 ? (
                    <AtelierButton variant="primary" size="md" onClick={clearFilters}>
                      Clear Filters
                    </AtelierButton>
                  ) : null}
                  {emptyAction ?? (
                    <AtelierButton
                      as={Link}
                      to={resolveCollectionRoute("featured")?.href ?? "/collection/featured"}
                      variant="outline"
                      size="md"
                    >
                      Explore the Collection
                    </AtelierButton>
                  )}
                </>
              }
            />
          ) : (
            <>
              <ProductGrid products={visible} />

              {hasMore ? (
                <div className="mt-16 md:mt-20 flex flex-col items-center gap-4">
                  <AtelierButton variant="outline" size="lg" onClick={loadMore}>
                    Load More
                  </AtelierButton>
                  <p className={cn(body.micro, "text-taupe")}>
                    {`Showing ${visible.length} of ${total} · ${remaining} more`}
                  </p>
                </div>
              ) : total > 12 ? (
                <p className={cn(body.micro, "text-taupe mt-16 text-center")}>
                  {`That is all ${total} ${unit} in this edit.`}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      <AnimatePresence>
        {drawerOpen ? (
          <FilterDrawer
            open={drawerOpen}
            onClose={() => setDrawerOpen(false)}
            facets={facets}
            filters={filters}
            onToggle={toggleFilter}
            onClear={clearFilters}
            activeCount={activeCount}
            resultCount={total}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
