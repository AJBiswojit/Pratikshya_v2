import { Lock, ShoppingBag } from "lucide-react";
import { Link } from "react-router-dom";
import {
  Brand,
  Container,
  header as headerSpacing,
  nav as navType,
  transition,
} from "../../design-system";
import { brand } from "../../config/navigationConfig";
import { useCart } from "../../context/CartContext";
import { cn } from "../../utils/cn";

/**
 * The checkout header.
 *
 * The full shopping navigation is deliberately quieted during the order
 * journey: the same fixed translucent bar, the same brand mark, but no
 * mega menu, search or account surfaces — only the way back to the bag
 * and a quiet confirmation that the transaction is secure-by-design.
 */
export default function CheckoutHeader() {
  const cart = useCart();

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="border-b border-mist/50 bg-canvas/80 backdrop-blur-md">
        <Container
          width="content"
          padded
          className={cn(headerSpacing.height, "flex items-center justify-between gap-4")}
        >
          <Brand
            to={brand.home}
            size="default"
            variant="lockup"
            theme="light"
            wordmark={brand.name}
            className="shrink-0 hover:text-accent transition-colors"
          />

          <div className="flex items-center gap-5">
            <p className="hidden items-center gap-2 font-ui text-[10px] uppercase tracking-[.22em] text-taupe sm:inline-flex">
              <Lock size={12} strokeWidth={1.5} className="text-accent" aria-hidden="true" />
              Secure Checkout
            </p>

            <Link
              to="/cart"
              className={cn(
                "relative inline-flex items-center gap-2 p-1 font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
                transition.colors,
                "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
              )}
            >
              <ShoppingBag size={16} strokeWidth={1.5} aria-hidden="true" />
              Bag
              {cart.count > 0 && (
                <span className="bg-accent px-1.5 py-px font-ui text-[9px] leading-none tracking-normal text-white">
                  {cart.count}
                </span>
              )}
            </Link>
          </div>
        </Container>
      </div>
    </header>
  );
}
