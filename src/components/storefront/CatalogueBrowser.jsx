/**
 * PRATIKSHYA FASHON — Catalogue browser (redesigned).
 *
 * The discovery engine that every product listing renders.
 *
 * Layout (product-first):
 *   Desktop (lg+):  [sticky filter sidebar]  [toolbar → active filters → product grid]
 *   Mobile (<lg):   [sticky toolbar (Filter / Sort)]  [active filters]  [product grid]
 *
 * Product grid columns:
 *   - 2 columns on mobile
 *   - 2 columns on small tablet
 *   - 3 columns on laptop
 *   - 4 columns on xl desktop
 *
 * This component owns no catalogue data and no filtering logic itself —
 * it delegates to the canonical `useCatalogueQuery` hook and the shared
 * FilterPanel / FilterDrawer / ProductGrid components. It is strictly a
 * layout surface that brings them together in a shopping-first form.
 */

import { AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AtelierButton, EmptyState, ProductGridSkeleton } from "../../design-system";
import { buildFacets } from "../../data/products/facets";
import useCatalogueQuery from "../../hooks/useCatalogueQuery";
import { resolveCollectionRoute } from "../../services/taxonomyRouting";
import { cn } from "../../utils/cn";
import ActiveFilters from "./ActiveFilters";
import CatalogueToolbar from "./CatalogueToolbar";
import FilterDrawer from "./FilterDrawer";
import FilterPanel from "./FilterPanel";
import ProductGrid from "./ProductGrid";

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

  // Facets are counted against the route's scope, never the whole
  // catalogue, so a category page never offers a filter that would empty it.
  const facets = useMemo(
    () => buildFacets(scoped, filters, scopeFilters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, JSON.stringify(filters), JSON.stringify(scopeFilters)]
  );

  return (
    <div className={cn("lg:flex lg:gap-8 xl:gap-10", className)}>
      {/* Desktop filter sidebar */}
      <aside className="hidden lg:block w-56 xl:w-60 shrink-0">
        <div className="sticky top-28">
          <div className="flex items-baseline justify-between border-b border-ink/15 pb-4">
            <h2 className="font-ui text-[10px] uppercase tracking-[.25em] text-ink">
              Refine
            </h2>
            {activeCount > 0 ? (
              <button
                type="button"
                onClick={clearFilters}
                className="font-ui text-[10px] uppercase tracking-[.2em] text-brass underline underline-offset-4 hover:text-accent transition-colors"
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
            className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1 pt-4"
          />
        </div>
      </aside>

      {/* Results column */}
      <div className="min-w-0 flex-1">
        {/* Toolbar */}
        <CatalogueToolbar
          total={total}
          sort={sort}
          onSortChange={setSort}
          onOpenFilters={() => setDrawerOpen(true)}
          activeFilterCount={activeCount}
        />

        <ActiveFilters
          chips={activeChips}
          onRemove={removeFilter}
          onClear={clearFilters}
          className="pt-4 pb-2"
        />

        {/* Grid */}
        <div className="pt-6 md:pt-8">
          {loading ? (
            <ProductGridSkeleton count={8} />
          ) : total === 0 ? (
            <EmptyState
              eyebrow="Nothing Matches"
              title={
                activeCount > 0
                  ? "Not quite the right piece"
                  : "No pieces available yet"
              }
              description={
                activeCount > 0
                  ? "Nothing in this selection matches every filter. Loosen one, or browse the full edit."
                  : "This edit is being composed. New pieces arrive as they are catalogued."
              }
              actions={
                <>
                  {activeCount > 0 ? (
                    <AtelierButton
                      variant="primary"
                      size="md"
                      onClick={clearFilters}
                    >
                      Clear filters
                    </AtelierButton>
                  ) : null}
                  {emptyAction ?? (
                    <AtelierButton
                      as={Link}
                      to={
                        resolveCollectionRoute("featured")?.href ??
                        "/collections/featured"
                      }
                      variant="outline"
                      size="md"
                    >
                      Explore the collection
                    </AtelierButton>
                  )}
                </>
              }
            />
          ) : (
            <>
              <ProductGrid products={visible} columns={{ _: 2, md: 2, lg: 3, xl: 4 }} />

              {hasMore ? (
                <div className="mt-12 md:mt-16 flex flex-col items-center gap-4">
                  <AtelierButton variant="outline" size="lg" onClick={loadMore}>
                    Load more
                  </AtelierButton>
                  <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
                    {`Showing ${visible.length} of ${total} · ${remaining} more`}
                  </p>
                </div>
              ) : total > 12 ? (
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe mt-12 text-center">
                  {`That is all ${total} ${unit} in this edit.`}
                </p>
              ) : null}
            </>
          )}
        </div>
      </div>

      {/* Mobile filter drawer */}
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
