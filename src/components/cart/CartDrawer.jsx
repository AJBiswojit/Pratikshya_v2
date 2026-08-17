import { motion } from "framer-motion";
import { ArrowRight, ShoppingBag, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AtelierButton, duration, formatPrice, transition } from "../../design-system";
import { useCart } from "../../context/CartContext";
import { cn } from "../../utils/cn";
import CartLineItem from "./CartLineItem";

/**
 * The mini-cart.
 *
 * A right-side drawer on desktop, near full-width sheet on mobile —
 * the same surface language as the shell's mobile navigation. It shows the
 * bag at a glance and offers the two ways forward; everything heavier
 * (offers, summary breakdown, recommendations) belongs to the cart page.
 *
 * Focus is moved into the panel on open, trapped while it is open and
 * returned to the trigger on close. Escape dismisses, the page behind
 * cannot scroll or be reached.
 */
export default function CartDrawer() {
  const cart = useCart();
  const panelRef = useRef(null);
  const closeRef = useRef(null);
  const restoreRef = useRef(null);
  const onClose = cart.closeDrawer;

  useEffect(() => {
    restoreRef.current = document.activeElement;

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;

      const focusable = panelRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    closeRef.current?.focus();

    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", onKeyDown);
      if (restoreRef.current instanceof HTMLElement) restoreRef.current.focus();
    };
  }, [onClose]);

  const isEmpty = cart.items.length === 0;

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Scrim */}
      <motion.div
        aria-hidden="true"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: duration.page }}
        onClick={onClose}
        className="absolute inset-0 bg-ink/40"
      />

      {/* Panel */}
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Your bag"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ duration: duration.page, ease: "easeOut" }}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-canvas"
      >
        {/* Head */}
        <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-mist/50 px-6">
          <div>
            <p className="font-ui text-[10px] uppercase tracking-[.22em] text-accent">
              Your Bag
            </p>
            <p className="mt-0.5 font-ui text-[10px] text-taupe" aria-live="polite">
              {cart.count} {cart.count === 1 ? "piece" : "pieces"}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close bag"
            className={cn("-mr-2 p-2 text-brass hover:text-accent", transition.colors)}
          >
            <X size={18} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>

        {/* Lines */}
        {isEmpty ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <ShoppingBag size={22} strokeWidth={1.2} className="text-taupe" aria-hidden="true" />
            <p className="mt-6 font-display text-2xl font-light tracking-tight">
              Your collection is waiting.
            </p>
            <p className="mt-3 max-w-xs font-ui text-xs leading-relaxed text-taupe">
              Discover pieces curated for your next occasion.
            </p>
            <AtelierButton
              as={Link}
              to="/shop"
              onClick={onClose}
              variant="primary"
              size="md"
              className="mt-8"
            >
              Explore the Collection
            </AtelierButton>
          </div>
        ) : (
          <>
            <div className="flex-1 divide-y divide-mist/60 overflow-y-auto px-6">
              {cart.items.map((item) => (
                <CartLineItem key={item.id} item={item} compact onNavigate={onClose} />
              ))}
            </div>

            {/* Foot */}
            <div className="shrink-0 border-t border-mist/50 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5">
              <div className="flex items-baseline justify-between gap-4">
                <span className="font-ui text-[10px] uppercase tracking-[.2em] text-ink">
                  Subtotal
                </span>
                <span className="font-display text-xl text-ink">
                  {formatPrice(cart.totals.subtotal)}
                </span>
              </div>
              <p className="mt-1 font-ui text-[9px] text-taupe">
                Shipping and offers are settled in your bag.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <AtelierButton
                  as={Link}
                  to="/cart"
                  onClick={onClose}
                  variant="outline"
                  size="md"
                  className="justify-center px-3"
                >
                  View Bag
                </AtelierButton>
                <AtelierButton
                  as={Link}
                  to="/checkout"
                  onClick={onClose}
                  variant="primary"
                  size="md"
                  className="justify-center px-3"
                >
                  Checkout <ArrowRight size={13} aria-hidden="true" />
                </AtelierButton>
              </div>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
