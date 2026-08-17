import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ProductCard, gap, useReveal } from "../../design-system";
import { productHref } from "../../data/products";
import { useProductCovers } from "../../hooks/useMedia";
import { useWishlist } from "../../context/WishlistContext";
import { useInventory } from "../../context/InventoryContext";
import offerRepository from "../../services/offers/offerRepository";
import { cn } from "../../utils/cn";
import ExplorePromo from "./ExplorePromo";

/**
 * Explore marketplace grid — 2 / 3 / 4 columns.
 *
 * Cards are the existing ProductCard (canonical media + wishlist). Inserts
 * span the full row and never count as products.
 */
export default function ExploreProductGrid({
  products,
  stream = null,
  promo = null,
  editorial = null,
  className = "",
}) {
  const wishlist = useWishlist();
  const inventory = useInventory();
  const reveal = useReveal();
  const rows = useProductCovers(products);
  const byId = new Map(rows.map((product) => [String(product.id), product]));

  const renderCard = (product, index) => {
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
        transition={{ ...reveal.transition, delay: Math.min(index % 8, 4) * 0.04 }}
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
  };

  const items = Array.isArray(stream) && stream.length
    ? stream
    : (products || []).map((product) => ({
        type: "product",
        product,
        key: `product-${product.id}`,
      }));

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4", gap.tile, className)}>
      {items.map((item, index) => {
        if (item.type === "promo") {
          return promo ? <ExplorePromo key={item.key} {...promo} /> : null;
        }
        if (item.type === "editorial") {
          return editorial ? <ExplorePromo key={item.key} {...editorial} /> : null;
        }
        const product = byId.get(String(item.product?.id)) || item.product;
        if (!product) return null;
        return renderCard(product, index);
      })}
    </div>
  );
}
