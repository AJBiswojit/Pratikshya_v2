import { Heart, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import {
  AtelierBadge,
  AtelierButton,
  MediaFrame,
  discountPercent,
  formatPrice,
} from "../../design-system";
import { productHref } from "../../data/products";
import { getProductCardMedia } from "../../services/media/productMediaSet";
import { cn } from "../../utils/cn";

/**
 * The AI Shopping recommendation card.
 *
 * Built on the existing Atelier product-media architecture (MediaFrame,
 * product typography, price row, AtelierBadge) so a recommendation reads
 * exactly like the rest of the house — with three quiet actions added:
 * bag, wishlist and a full product view.
 */
export default function AiProductCard({
  product,
  reason = "",
  onAddToBag,
  onToggleWishlist,
  isWishlisted = false,
  compact = false,
}) {
  if (!product) return null;

  const discount = discountPercent(product.price, product.originalPrice);
  const purchasable = product.inStock !== false && product.availability !== "made-to-order";
  const availabilityText =
    product.availability === "made-to-order"
      ? "Made to order"
      : product.availability === "low-stock"
        ? "Only a few left"
        : product.inStock === false
          ? "Currently unavailable"
          : "In stock";

  return (
    <article className="flex h-full flex-col border border-mist/80 bg-ivory">
      <Link
        to={productHref(product)}
        className="group block"
        aria-label={`View ${product.name}`}
      >
        <MediaFrame
          image={getProductCardMedia(product).image}
          hoverImage={getProductCardMedia(product).hoverImage}
          alt={product.name}
          aspect="product"
          zoom="strong"
          className="relative"
        >
          {discount ? (
            <AtelierBadge className="absolute left-3 top-3">{discount}% off</AtelierBadge>
          ) : product.label ? (
            <AtelierBadge className="absolute left-3 top-3">{product.label}</AtelierBadge>
          ) : null}
        </MediaFrame>
      </Link>

      <div className={cn("flex flex-1 flex-col px-4 pb-4", compact ? "pt-3" : "pt-4")}>
        <p className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">
          {[product.categoryLabel, product.fabric].filter(Boolean).join(" · ")}
        </p>
        <h4 className="mt-1 font-display text-xl font-light leading-tight text-ink">
          <Link to={productHref(product)} className="transition-colors hover:text-accent">
            {product.name}
          </Link>
        </h4>

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2">
          <span className="font-ui text-sm font-medium text-ink">{formatPrice(product.price)}</span>
          {product.originalPrice ? (
            <span className="font-ui text-xs text-taupe line-through">{formatPrice(product.originalPrice)}</span>
          ) : null}
        </div>

        <ul className="mt-2 space-y-0.5 font-ui text-[11px] text-graphite" aria-label={`${product.name} details`}>
          {product.colors?.length ? (
            <li>
              <span className="text-taupe">Colour</span> · {product.colors.join(", ")}
            </li>
          ) : null}
          <li>
            <span className="text-taupe">Availability</span> · {availabilityText}
          </li>
        </ul>

        {reason ? (
          <p className="mt-3 border-l border-gold pl-3 font-display text-base italic leading-snug text-cocoa">
            {reason}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-2 pt-1">
          <AtelierButton
            size="chip"
            variant="primary"
            disabled={!purchasable}
            onClick={() => onAddToBag?.(product)}
            className="disabled:cursor-not-allowed disabled:bg-taupe/60"
          >
            <ShoppingBag size={11} aria-hidden="true" /> Add to Bag
          </AtelierButton>
          <AtelierButton
            size="chip"
            variant="outline"
            onClick={() => onToggleWishlist?.(product)}
            aria-pressed={isWishlisted}
            className={cn(isWishlisted && "border-accent text-accent")}
          >
            <Heart size={11} fill={isWishlisted ? "currentColor" : "none"} aria-hidden="true" />
            {isWishlisted ? "Saved" : "Wishlist"}
          </AtelierButton>
          <AtelierButton as={Link} to={productHref(product)} size="chip" variant="outline">
            View
          </AtelierButton>
        </div>
      </div>
    </article>
  );
}
