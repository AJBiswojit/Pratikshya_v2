import { motion } from "framer-motion";
import { ArrowRight, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { Accent, AtelierSection, EditorialHeading, ProductCard, gap, useReveal } from "../../design-system";
import { getLiveStorefrontProducts, productHref } from "../../data/products";
import { selectNewArrivalProducts } from "../../services/media/mediaResolver";
import { MARKETING_PLACEMENTS } from "../../config/mediaTypes";
import { usePlacementProducts } from "../../hooks/useMarketingPlacements";
import { useProductCovers } from "../../hooks/useMedia";
import { useWishlist } from "../../context/WishlistContext";
import { useInventory } from "../../context/InventoryContext";
import offerRepository from "../../services/offers/offerRepository";
import taxonomyRepository from "../../services/taxonomyRepository";
import { cn } from "../../utils/cn";

/**
 * NEW ARRIVALS — landing section.
 *
 * A premium catalogue rail of the newest pieces, drawn from the one product
 * repository. Qualification is unchanged (flagged arrivals first, then
 * recency), but within that pool products with real library primary media
 * lead, so the rail prefers actual product photography over authored plates.
 * The ranking is shared with the audit via `selectNewArrivalProducts`.
 *
 * The card is the existing `ProductCard`, with the published media cover and
 * the shared wishlist wired through the same hooks the shop grid uses. "View
 * all" resolves to the managed New Arrivals collection when it is active.
 */

const COUNT = 5;

export default function NewArrivals() {
  const reveal = useReveal();
  const wishlist = useWishlist();
  const inventory = useInventory();

  /* The Marketing Media desk can curate this rail through the NEW_ARRIVALS
     placement; a curated list leads, in placement order, and the house's
     deterministic new-arrival selection stands when nothing is curated. */
  const liveProducts = getLiveStorefrontProducts();
  const curated = usePlacementProducts(MARKETING_PLACEMENTS.NEW_ARRIVALS, liveProducts);
  const collectionArrivals = liveProducts.filter((product) =>
    taxonomyRepository.isProductInCollection(product, "new-arrivals")
  );
  const arrivals =
    curated.length > 0
      ? curated.slice(0, COUNT)
      : collectionArrivals.length > 0
        ? collectionArrivals.slice(0, COUNT)
        : selectNewArrivalProducts(liveProducts, COUNT);

  /* Rows carry the published cover when the Admin Portal has set one. */
  const rows = useProductCovers(arrivals);

  const collection = taxonomyRepository.findCollection("new-arrivals");
  const viewAllTo =
    collection?.displayStatus === "ACTIVE"
      ? `/collections/${collection.slug}`
      : "/shop";

  if (!rows.length) return null;

  return (
    <AtelierSection id="new-arrivals" tone="fade" rhythm="spacious">
      <div className="flex items-end justify-between gap-6 mb-12 md:mb-16">
        <EditorialHeading size="subsection" spacing={{ title: "mb-0" }}>
          New <Accent>Arrivals</Accent>
        </EditorialHeading>
        <Link
          to={viewAllTo}
          className="group inline-flex shrink-0 items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.2em] text-ink transition-colors hover:text-accent"
        >
          View All
          <ArrowRight
            size={12}
            className="transition-transform duration-300 group-hover:translate-x-0.5"
          />
        </Link>
      </div>

      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5", gap.tile)}>
        {rows.map((product, index) => {
          const availability = inventory.getAvailability(product);
          const offerBadge = offerRepository.getProductOfferBadge(product)?.label ?? null;
          const customerProduct = availability.tracked
            ? {
                ...product,
                inStock: availability.available > 0,
                availabilityText:
                  availability.status === "LOW_STOCK"
                    ? "Only a few left"
                    : availability.available <= 0
                      ? "Currently unavailable"
                      : "",
              }
            : product;

          return (
            <motion.div
              key={product.id}
              {...reveal}
              transition={{ ...reveal.transition, delay: Math.min(index % 5, 4) * 0.05 }}
            >
              <ProductCard
                product={customerProduct}
                as={Link}
                to={productHref(product)}
                showCategory
                showDiscount
                showAvailability
                offerBadge={offerBadge}
                onWishlist={wishlist.toggle}
                isWishlisted={wishlist.isSaved(product)}
                wishlistIcon={Heart}
              />
            </motion.div>
          );
        })}
      </div>
    </AtelierSection>
  );
}
