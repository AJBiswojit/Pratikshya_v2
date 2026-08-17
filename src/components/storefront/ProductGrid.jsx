import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { memo, useCallback, useMemo } from "react";
import { ProductCard, gap, useReveal } from "../../design-system";
import { productHref } from "../../data/products";
import { useProductCovers } from "../../hooks/useMedia";
import { useWishlist } from "../../context/WishlistContext";
import { useInventory } from "../../context/InventoryContext";
import offerRepository from "../../services/offers/offerRepository";
import { cn } from "../../utils/cn";

/**
 * The catalogue grid.
 *
 * Lays out Phase 2 product cards on the Atelier column rhythm: two up on
 * every phone and tablet, three from the laptop breakpoint upward.
 *
 * Three rather than four is deliberate. With the filter index occupying the
 * left column, four would render a card narrower than the landing page's
 * product tile; three keeps the plate at the scale the brand already uses.
 *
 * The card itself is untouched — this component only decides how many sit in
 * a row, what each one links to and which of them are saved. The first row is
 * eager-loaded; everything below the fold inherits the manifest's lazy
 * loading.
 *
 * PERFORMANCE:
 *   · Memoized per-product rendering
 *   · Inventory and wishlist lookups cached via useMemo
 *   · Avoid recalculating offer badge on every render
 */

const MemoProductCard = memo(function MemoProductCard({ product, to, offerBadge, isWishlisted, onWishlist, reveal, index }) {
  return (
    <motion.div
      {...reveal}
      transition={{ ...reveal.transition, delay: Math.min(index % 8, 4) * 0.04 }}
    >
      <ProductCard
        product={product}
        as={Link}
        to={to}
        showCategory
        showDiscount
        showAvailability
        offerBadge={offerBadge}
        onWishlist={onWishlist}
        isWishlisted={isWishlisted}
        wishlistIcon={Heart}
      />
    </motion.div>
  );
});

export default function ProductGrid({ products, className = "" }) {
  const wishlist = useWishlist();
  const inventory = useInventory();
  const reveal = useReveal();
  /* Cards show one plate: the published cover when the Admin Portal has set
     one, the authored catalogue image otherwise. Never video. */
  const rows = useProductCovers(products);

  // Memoize toggle to keep stable reference
  const handleToggle = useCallback((product) => wishlist.toggle(product), [wishlist]);

  // Build derived data with memoization
  const derived = useMemo(() => {
    return rows.map((product) => {
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
      return {
        id: product.id,
        product: customerProduct,
        to: productHref(product),
        offerBadge,
        isWishlisted: wishlist.isSaved(product),
      };
    });
  }, [rows, inventory, wishlist]);

  return (
    <div className={cn("grid grid-cols-2 lg:grid-cols-3", gap.tile, className)}>
      {derived.map((entry, index) => (
        <MemoProductCard
          key={entry.id}
          product={entry.product}
          to={entry.to}
          offerBadge={entry.offerBadge}
          isWishlisted={entry.isWishlisted}
          onWishlist={handleToggle}
          reveal={reveal}
          index={index}
        />
      ))}
    </div>
  );
}
