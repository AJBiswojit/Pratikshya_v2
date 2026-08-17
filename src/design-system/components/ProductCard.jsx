import { memo, useMemo } from "react";
import { getProductCardMedia } from "../../services/media/productMediaSet";
import { cn } from "../../utils/cn";
import { heading, price as priceType } from "../typography";
import AtelierBadge from "./AtelierBadge";
import MediaFrame from "./MediaFrame";

/**
 * The Atelier product card.
 *
 * Image plate, then a quiet two-line caption: name, then price. Everything
 * beyond that — category, original price, discount, badge, availability,
 * wishlist — is optional and off by default, so the card stays editorial
 * rather than turning into a marketplace tile.
 *
 * The whole card is one link; the wishlist control, when present, sits above
 * it and stops the click from propagating.
 *
 * `as` swaps the link element — pass the router's `Link` (with `to`) inside
 * the application, leave it alone for a plain anchor.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · React.memo with custom comparator to avoid re-rendering unchanged cards
 *   · Media lookup memoized per product id
 */

export const formatPrice = (value) =>
  typeof value === "number" ? `₹${value.toLocaleString("en-IN")}` : value;

export const discountPercent = (current, original) =>
  typeof current === "number" && typeof original === "number" && original > current
    ? Math.round(((original - current) / original) * 100)
    : null;

function ProductCardComponent({
  product,
  as: Tag = "a",
  href = "#",
  showCategory = false,
  showOriginalPrice = true,
  showDiscount = false,
  showBadge = true,
  showAvailability = false,
  offerBadge = null,
  onWishlist,
  isWishlisted = false,
  wishlistIcon: WishlistIcon,
  className = "",
  ...rest
}) {
  const {
    name,
    category,
    categoryLabel,
    price,
    originalPrice,
    label,
    inStock = true,
    availabilityText = "",
  } = product;

  /* Canonical product-owned plates only. Hover is omitted when the product
     has no alternate of its own — the frame then stays on the primary.
     Memoized per product id to avoid repeated mediaSet assembly. */
  const { image, hoverImage } = useMemo(
    () => getProductCardMedia(product),
    [product.id, product.mediaIds, product.primaryMediaId, product.galleryMediaIds, product.image]
  );

  const discount = showDiscount ? discountPercent(price, originalPrice) : null;

  return (
    <Tag href={Tag === "a" ? href : undefined} className={cn("group", className)} {...rest}>
      <MediaFrame
        image={image}
        hoverImage={hoverImage}
        alt={name}
        aspect="product"
        zoom="strong"
        surface
        className="mb-5"
      >
        {showBadge && label ? (
          <AtelierBadge className="absolute top-3 left-3">{label}</AtelierBadge>
        ) : null}

        {offerBadge ? (
          <AtelierBadge className="absolute bottom-3 left-3">{offerBadge}</AtelierBadge>
        ) : null}

        {showAvailability && !inStock ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/50 font-ui text-[10px] uppercase tracking-[.2em] text-ivory">
            {availabilityText || "Currently unavailable"}
          </span>
        ) : null}

        {onWishlist ? (
          <button
            type="button"
            aria-label={isWishlisted ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
            aria-pressed={isWishlisted}
            onClick={(event) => {
              event.preventDefault();
              onWishlist(product);
            }}
            className="absolute top-3 right-3 flex h-8 w-8 items-center justify-center bg-white/80 text-ink transition-all hover:bg-ink hover:text-white"
          >
            {WishlistIcon ? (
              <WishlistIcon size={14} fill={isWishlisted ? "currentColor" : "none"} />
            ) : null}
          </button>
        ) : null}
      </MediaFrame>

      {showCategory && category ? (
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe mb-1">
          {categoryLabel ?? category}
        </p>
      ) : null}

      <h4 className={cn(heading.product, "mb-1")}>{name}</h4>

      <div className={priceType.row}>
        <span className={priceType.current}>{formatPrice(price)}</span>
        {showOriginalPrice && originalPrice ? (
          <span className={cn("hidden sm:inline", priceType.original)}>
            {formatPrice(originalPrice)}
          </span>
        ) : null}
        {discount ? <span className={priceType.discount}>{discount}% off</span> : null}
      </div>
      {showAvailability && inStock && availabilityText ? (
        <p className="mt-1.5 font-ui text-[9px] uppercase tracking-[.15em] text-accent">
          {availabilityText}
        </p>
      ) : null}
    </Tag>
  );
}

function areEqual(prev, next) {
  // Fast path: if product id same and relevant fields same, avoid re-render
  if (prev.product.id !== next.product.id) return false;
  if (prev.product.name !== next.product.name) return false;
  if (prev.product.price !== next.product.price) return false;
  if (prev.product.originalPrice !== next.product.originalPrice) return false;
  if (prev.product.image !== next.product.image) return false;
  if (prev.product.hoverImage !== next.product.hoverImage) return false;
  if (prev.isWishlisted !== next.isWishlisted) return false;
  if (prev.offerBadge !== next.offerBadge) return false;
  if (prev.className !== next.className) return false;
  if (prev.showCategory !== next.showCategory) return false;
  if (prev.showDiscount !== next.showDiscount) return false;
  if (prev.showAvailability !== next.showAvailability) return false;
  // media claims may change
  const prevClaims = (prev.product.mediaIds || []).join(",");
  const nextClaims = (next.product.mediaIds || []).join(",");
  if (prevClaims !== nextClaims) return false;
  if (prev.product.primaryMediaId !== next.product.primaryMediaId) return false;
  return true;
}

const ProductCard = memo(ProductCardComponent, areEqual);
export default ProductCard;
