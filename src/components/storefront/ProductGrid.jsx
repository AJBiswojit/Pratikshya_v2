/**
 * PRATIKSHYA FASHON — Product grid.
 *
 * Lays out premium Atelier product cards with the catalogue-first column
 * rhythm:
 *   · 2 columns on mobile (phones + small tablets)
 *   · 3 columns on large tablet / laptop
 *   · 4 columns on xl desktop
 *
 * This is the canonical grid used by every product listing. Product cards
 * themselves are not modified here; this component only decides how many
 * sit in a row, what each one links to and which of them are saved.
 */

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

const MemoProductCard = memo(function MemoProductCard({
  product,
  to,
  offerBadge,
  isWishlisted,
  onWishlist,
  reveal,
  index,
}) {
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

/**
 * Translate a `columns` prop into Tailwind grid-cols classes.
 *
 * Supported breakpoints (mobile-first): _ (default), sm, md, lg, xl.
 * Missing keys fall back to the previous defined breakpoint so callers
 * only need to specify the breakpoints that change.
 *
 * Uses a static class map so Tailwind's JIT can detect every class at
 * build time — never dynamic `grid-cols-${n}` interpolation.
 */
const COL_CLASSES = {
  1: "grid-cols-1",
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
  5: "grid-cols-5",
  6: "grid-cols-6",
};
const RESP_COL_CLASSES = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};
const MD_COL_CLASSES = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
  4: "md:grid-cols-4",
  5: "md:grid-cols-5",
  6: "md:grid-cols-6",
};
const LG_COL_CLASSES = {
  1: "lg:grid-cols-1",
  2: "lg:grid-cols-2",
  3: "lg:grid-cols-3",
  4: "lg:grid-cols-4",
  5: "lg:grid-cols-5",
  6: "lg:grid-cols-6",
};
const XL_COL_CLASSES = {
  1: "xl:grid-cols-1",
  2: "xl:grid-cols-2",
  3: "xl:grid-cols-3",
  4: "xl:grid-cols-4",
  5: "xl:grid-cols-5",
  6: "xl:grid-cols-6",
};

const clamp = (n) => Math.max(1, Math.min(6, Number(n) || 2));

function columnsToClasses(columns) {
  if (typeof columns === "string") return columns;
  if (typeof columns === "number") return COL_CLASSES[clamp(columns)] || COL_CLASSES[2];
  const c = { _: 2, lg: 3, ...(columns || {}) };
  const parts = [COL_CLASSES[clamp(c._)]];
  let last = clamp(c._);
  const entries = [
    [RESP_COL_CLASSES, c.sm],
    [MD_COL_CLASSES, c.md],
    [LG_COL_CLASSES, c.lg],
    [XL_COL_CLASSES, c.xl],
  ];
  entries.forEach(([map, val]) => {
    if (val == null) return;
    const v = clamp(val);
    if (v === last) return;
    last = v;
    const cls = map[v];
    if (cls) parts.push(cls);
  });
  return parts.join(" ");
}

export default function ProductGrid({
  products,
  columns = { _: 2, lg: 3, xl: 4 },
  className = "",
}) {
  const wishlist = useWishlist();
  const inventory = useInventory();
  const reveal = useReveal();
  const rows = useProductCovers(products);

  const handleToggle = useCallback(
    (product) => wishlist.toggle(product),
    [wishlist]
  );

  const derived = useMemo(() => {
    return rows.map((product) => {
      const availability = inventory.getAvailability(product);
      const offerBadge =
        offerRepository.getProductOfferBadge(product)?.label ?? null;
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
    <div
      className={cn("grid", columnsToClasses(columns), gap.tile, className)}
    >
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
