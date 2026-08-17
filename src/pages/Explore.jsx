import { AtelierSection, body, display, eyebrow } from "../design-system";
import ExploreBrowser from "../components/explore/ExploreBrowser";
import ExploreOfferStrip from "../components/explore/ExploreOfferStrip";
import { getExploreOffers } from "../data/products/explore";
import { cn } from "../utils/cn";

/**
 * Explore — the unified product discovery page.
 *
 * Compact introduction, existing house offers, then the full published
 * catalogue with filters, sort, search and load-more. One Product ID is
 * one card; gallery views never become products.
 */
export default function Explore() {
  const offers = getExploreOffers();

  return (
    <>
      <header className="pt-24 md:pt-28 pb-6 md:pb-8 px-6 md:px-12">
        <div className="max-w-7xl mx-auto">
          <p className={cn(eyebrow.section, "text-accent mb-3")}>Explore PRATIKSHYA</p>
          <h1 className={cn(display.subsection, "max-w-3xl mb-3")}>
            Discover pieces across every <span className="italic text-accent">collection</span>
          </h1>
          <p className={cn(body.base, "text-taupe max-w-xl")}>
            The complete published catalogue — filtered, sorted and searchable, without leaving the atelier.
          </p>
        </div>
      </header>

      <AtelierSection rhythm="none" width="wide" className="pb-6">
        <ExploreOfferStrip offers={offers} />
      </AtelierSection>

      <AtelierSection rhythm="none" width="wide" className="pb-24 md:pb-32 pt-8 md:pt-10">
        <ExploreBrowser offers={offers} />
      </AtelierSection>
    </>
  );
}
