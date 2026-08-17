import { Search, SlidersHorizontal } from "lucide-react";
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
import {
  EXPLORE_PAGE_SIZE,
  buildExploreStream,
  getExploreProducts,
} from "../../data/products/explore";
import useCatalogueQuery from "../../hooks/useCatalogueQuery";
import {
  resolveExploreEditorialMedia,
  resolveExplorePromoMedia,
} from "../../services/explore/explorePlacements";
import { formatOfferDiscount } from "../../services/offers/offerRepository";
import { cn } from "../../utils/cn";
import ActiveFilters from "../storefront/ActiveFilters";
import FilterDrawer from "../storefront/FilterDrawer";
import FilterPanel from "../storefront/FilterPanel";
import SortControl from "../storefront/SortControl";
import ExploreProductGrid from "./ExploreProductGrid";

/**
 * Explore discovery engine.
 *
 * Same catalogue query, filters, URL state and wishlist as the rest of the
 * storefront — only the grid density, page size and advertisement inserts
 * are Explore-specific.
 */
export default function ExploreBrowser({
  offers = [],
  loading = false,
  className = "",
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const source = useMemo(() => getExploreProducts(), []);

  const {
    filters,
    search,
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
    setSearch,
    loadMore,
  } = useCatalogueQuery({
    source,
    searchFromUrl: true,
    pageSize: EXPLORE_PAGE_SIZE,
  });

  const [draft, setDraft] = useState(search);

  const facets = useMemo(
    () => buildFacets(scoped, filters, {}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scoped, JSON.stringify(filters)]
  );

  const stream = useMemo(() => buildExploreStream(visible), [visible]);

  const placements = useMemo(() => {
    const used = new Set();
    const promoImage = resolveExplorePromoMedia(used);
    const editorialImage = resolveExploreEditorialMedia(used);
    const leadOffer = (offers || []).find((offer) => offer.type === "PERCENTAGE") || offers?.[0];
    return {
      promo: {
        image: promoImage,
        eyebrow: "House offer",
        title: leadOffer ? leadOffer.name : "The season's edit",
        description: leadOffer
          ? `${leadOffer.description} · ${formatOfferDiscount(leadOffer)} with ${leadOffer.code}`
          : "Selected pieces from the atelier, gathered in one place.",
        to: leadOffer?.includedCollections?.[0]
          ? `/explore?collection=${encodeURIComponent(
              leadOffer.includedCollections[0] === "festive-edit" ? "Festive Edit" : leadOffer.includedCollections[0]
            )}`
          : "/explore?merch=sale",
        cta: "Shop offers",
        tone: "promo",
      },
      editorial: {
        image: editorialImage,
        eyebrow: "Editorial",
        title: "Heritage weaves",
        description: "Sarees, lehengas and ceremonial pieces drawn from the house collections.",
        to: "/explore?category=sarees",
        cta: "Explore sarees",
        tone: "editorial",
      },
    };
  }, [offers]);

  const countLabel =
    total === 0
      ? "No products"
      : `Showing ${visible.length} of ${total} ${total === 1 ? "product" : "products"}`;

  return (
    <div className={cn("lg:flex lg:gap-8", className)}>
      <aside className="hidden lg:block w-48 shrink-0">
        <div className="sticky top-28">
          <div className="flex items-baseline justify-between border-b border-ink/15 pb-4">
            <h2 className={cn(eyebrow.section, "text-ink")}>Filter</h2>
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
            idPrefix="explore-sidebar"
            className="max-h-[calc(100vh-14rem)] overflow-y-auto pr-1"
          />
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink/15 pb-5">
          <p className={cn(body.caption, "text-taupe")} aria-live="polite">
            {loading ? "Opening the catalogue" : countLabel}
          </p>

          <div className="flex flex-wrap items-center gap-4">
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

        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(draft);
          }}
          className="mt-5 flex items-center gap-3 border-b border-ink/15 focus-within:border-accent transition-colors"
        >
          <Search size={15} strokeWidth={1.5} className="text-brass shrink-0" aria-hidden="true" />
          <input
            id="explore-search"
            type="search"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder="Search the catalogue"
            className="w-full bg-transparent py-2.5 font-ui text-sm text-ink placeholder:text-ash focus:outline-none"
          />
          <button
            type="submit"
            className={cn(eyebrow.label, "shrink-0 text-brass hover:text-accent", transition.colors)}
          >
            Search
          </button>
        </form>

        <ActiveFilters
          chips={activeChips}
          onRemove={removeFilter}
          onClear={clearFilters}
          className="pt-5"
        />

        <div className="pt-8">
          {loading ? (
            <ProductGridSkeleton count={8} columns="md:grid-cols-3 lg:grid-cols-4" />
          ) : total === 0 ? (
            <EmptyState
              eyebrow="Nothing Matches"
              title="No pieces match your current filters."
              description="Clear the selection to return to the full published catalogue. Explore will not invent stand-in products."
              actions={
                activeCount > 0 || search ? (
                  <AtelierButton
                    variant="primary"
                    size="md"
                    onClick={() => {
                      clearFilters();
                      setDraft("");
                      setSearch("");
                    }}
                  >
                    Clear Filters
                  </AtelierButton>
                ) : (
                  <AtelierButton as={Link} to="/shop" variant="outline" size="md">
                    Browse the shop
                  </AtelierButton>
                )
              }
            />
          ) : (
            <>
              <ExploreProductGrid
                products={visible}
                stream={stream}
                promo={placements.promo}
                editorial={placements.editorial}
              />

              {hasMore ? (
                <div className="mt-14 md:mt-16 flex flex-col items-center gap-4">
                  <AtelierButton variant="outline" size="lg" onClick={loadMore}>
                    Load More
                  </AtelierButton>
                  <p className={cn(body.micro, "text-taupe")}>
                    {`Showing ${visible.length} of ${total} · ${remaining} more`}
                  </p>
                </div>
              ) : total > EXPLORE_PAGE_SIZE ? (
                <p className={cn(body.micro, "text-taupe mt-14 text-center")}>
                  {`All ${total} published products.`}
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
