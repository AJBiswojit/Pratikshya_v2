import { motion } from "framer-motion";
import { Heart } from "lucide-react";
import { Link } from "react-router-dom";
import { AtelierSection, EditorialHeading, ProductCard, useReveal } from "../../design-system";
import { productHref } from "../../data/products";
import { useProductCovers } from "../../hooks/useMedia";
import { useWishlist } from "../../context/WishlistContext";

export default function ProductRecommendations({
  eyebrow,
  title,
  description,
  products,
  tone = "canvas",
  id,
}) {
  const wishlist = useWishlist();
  const reveal = useReveal(16, 0.5);
  /* Published covers, resolved before the early return so the hook order
     never changes between renders. */
  const rows = useProductCovers(products);
  if (!rows.length) return null;

  return (
    <AtelierSection id={id} tone={tone} rhythm="compact" width="wide">
      <EditorialHeading
        as="h2"
        size="subsection"
        eyebrow={eyebrow}
        description={description}
        descriptionClassName="max-w-xl font-ui text-sm leading-6 text-taupe"
        spacing={{ eyebrow: "mb-4", title: "mb-4", description: "mb-10 md:mb-14" }}
      >
        {title}
      </EditorialHeading>

      <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:gap-x-6 lg:grid-cols-4 lg:gap-x-7">
        {rows.map((product, index) => (
          <motion.div
            key={product.id}
            {...reveal}
            transition={{ ...reveal.transition, delay: Math.min(index, 3) * 0.05 }}
          >
            <ProductCard
              product={product}
              as={Link}
              to={productHref(product)}
              showCategory
              showBadge
              showDiscount
              showAvailability
              onWishlist={wishlist.toggle}
              isWishlisted={wishlist.isSaved(product)}
              wishlistIcon={Heart}
            />
          </motion.div>
        ))}
      </div>
    </AtelierSection>
  );
}
