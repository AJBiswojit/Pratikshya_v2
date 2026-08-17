import { Heart, X } from "lucide-react";
import { Link } from "react-router-dom";
import {
  discountPercent,
  formatPrice,
  heading,
  MediaFrame,
  transition,
} from "../../design-system";
import { productHref } from "../../data/products";
import { useShopping } from "../../context/ShoppingContext";
import { cn } from "../../utils/cn";
import QuantityStepper from "./QuantityStepper";

/**
 * One line of the bag, set like an entry in a lookbook rather than a table
 * row: plate on the left, then name, variant, quantity and price in the
 * same type the rest of the house uses.
 *
 * `compact` is the mini-cart variant — smaller plate, tighter meta, no
 * wishlist move — so the drawer never becomes a second implementation.
 */
export default function CartLineItem({ item, compact = false, onNavigate }) {
  const { cart, wishlist, moveToWishlist } = useShopping();
  const { product } = item;
  const discount = discountPercent(product.price, product.originalPrice);
  const saved = wishlist.isSaved(product);

  const variantMeta = [
    item.color ? `Colour · ${item.color}` : null,
    item.size && item.size !== "Free Size" ? `Size · ${item.size}` : null,
    item.size === "Free Size" ? "Free Size" : null,
  ].filter(Boolean);

  return (
    <div className={cn("flex gap-5", compact ? "py-5" : "gap-5 py-7 sm:gap-7 md:py-9")}>
      <Link
        to={productHref(product)}
        onClick={onNavigate}
        className={cn("group block shrink-0", compact ? "w-20" : "w-24 sm:w-32")}
        aria-label={product.name}
      >
        <MediaFrame
          image={product.image}
          alt={product.name}
          aspect="product"
          zoom="strong"
          surface
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {!compact && (
              <p className="mb-1 font-ui text-[9px] uppercase tracking-[.2em] text-taupe">
                {product.categoryLabel} · {product.subcategory}
              </p>
            )}
            <Link
              to={productHref(product)}
              onClick={onNavigate}
              className={cn("hover:text-accent", transition.colors)}
            >
              <h3 className={cn(heading.product, compact && "text-sm md:text-sm leading-snug")}>
                {product.name}
              </h3>
            </Link>
            {variantMeta.length > 0 && (
              <p className="mt-1 font-ui text-[10px] tracking-wide text-taupe">
                {variantMeta.join("  ·  ")}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => cart.removeFromCart(item.id)}
            aria-label={`Remove ${product.name} from your bag`}
            className={cn(
              "-mr-1 -mt-1 shrink-0 p-1.5 text-taupe hover:text-accent",
              transition.colors,
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            )}
          >
            <X size={14} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", compact ? "mt-2" : "mt-3")}>
          <span className={cn("font-ui text-ink", compact ? "text-xs font-medium" : "text-sm font-medium")}>
            {formatPrice(product.price)}
          </span>
          {product.originalPrice ? (
            <span className="font-ui text-[11px] text-ash line-through">
              {formatPrice(product.originalPrice)}
            </span>
          ) : null}
          {discount ? (
            <span className="font-ui text-[9px] uppercase tracking-[.14em] text-accent">
              {discount}% off
            </span>
          ) : null}
        </div>

        <div className={cn("flex flex-wrap items-center justify-between gap-x-5 gap-y-3", compact ? "mt-3" : "mt-5")}>
          <div className="flex items-center gap-3">
            <QuantityStepper
              value={item.quantity}
              max={item.maximum}
              onChange={(quantity) => cart.updateCartQuantity(item.id, quantity)}
              label={`Quantity of ${product.name}`}
              size={compact ? "sm" : "md"}
            />
            {item.quantity >= item.maximum ? (
              <span className="font-ui text-[9px] uppercase tracking-[.14em] text-accent">
                All {item.maximum} in your bag
              </span>
            ) : null}
          </div>

          {!compact && (
            <span className="font-ui text-sm text-ink">{formatPrice(item.lineTotal)}</span>
          )}
        </div>

        {!compact && (
          <div className="mt-4 flex items-center gap-6">
            <button
              type="button"
              onClick={() => moveToWishlist(item)}
              className={cn(
                "inline-flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                transition.colors,
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
              )}
            >
              <Heart size={12} fill={saved ? "currentColor" : "none"} aria-hidden="true" />
              Move to Wishlist
            </button>
            <button
              type="button"
              onClick={() => cart.removeFromCart(item.id)}
              className={cn(
                "font-ui text-[10px] uppercase tracking-[.16em] text-taupe hover:text-accent",
                transition.colors,
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
              )}
            >
              Remove
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
