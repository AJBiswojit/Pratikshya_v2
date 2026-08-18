import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Accent,
  AtelierSection,
  EditorialHeading,
  ProductCard,
  gap,
  useReveal,
} from "../../design-system";
import { getPlacement } from "../../config/mediaTypes";
import { getLiveStorefrontProducts, productHref } from "../../data/products";
import { usePlacementProducts } from "../../hooks/useMarketingPlacements";
import { useProductCovers } from "../../hooks/useMedia";
import { useWishlist } from "../../context/WishlistContext";
import { useInventory } from "../../context/InventoryContext";
import offerRepository from "../../services/offers/offerRepository";
import { cn } from "../../utils/cn";

/**
 * A curated marketing section on the storefront.
 *
 * Reads ONE placement from the marketing register and renders its assigned
 * products — resolved through the canonical live catalogue, in the
 * placement's display order — as a ProductCard rail. The catalogue remains
 * the single source of truth: this component never owns a product array.
 *
 * The section appears only when the placement holds at least one product
 * that is published and on active taxonomy (the Admin Portal's product
 * approval workflow is never bypassed). With nothing curated, the section
 * stays absent and the homepage is exactly what it was.
 *
 * Used by product placements without a bespoke seam;
 * bespoke seams (Saree Edit, Bride & Groom, New Arrivals) read the same
 * register through the same hooks.
 */
export default function PlacementProductRail({ placementId, count = 8 }) {
  const placement = getPlacement(placementId);
  const reveal = useReveal();
  const wishlist = useWishlist();
  const inventory = useInventory();

  const liveProducts = getLiveStorefrontProducts();
  const assigned = usePlacementProducts(placementId, liveProducts);
  /* A marketing seam never renders an empty frame: rows without a resolved
     canonical primary plate are dropped rather than shown media-less. */
  const rows = useProductCovers(assigned.slice(0, count)).filter(
    (product) => Boolean(product?.image?.src)
  );

  if (!placement || rows.length === 0) return null;

  return (
    <AtelierSection id={`placement-${String(placementId).toLowerCase()}`} tone="fade" rhythm="spacious">
      <div className="mb-12 flex items-end justify-between gap-6 md:mb-16">
        <EditorialHeading size="subsection" spacing={{ title: "mb-0" }}>
          The <Accent>{placement.label.replace(/ section$/i, "")}</Accent> Edit
        </EditorialHeading>
      </div>

      <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4", gap.tile)}>
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
              transition={{ ...reveal.transition, delay: Math.min(index % 4, 3) * 0.05 }}
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
