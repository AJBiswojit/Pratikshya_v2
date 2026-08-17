import { Suspense, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { Outlet, useLocation } from "react-router-dom";
import { LoadingState, PageTransition } from "../design-system";
import ScrollToTop from "../components/shell/ScrollToTop";
import CartDrawer from "../components/cart/CartDrawer";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import SiteFooter from "../components/shell/SiteFooter";
import SiteHeader from "../components/shell/SiteHeader";
import CheckoutHeader from "../components/checkout/CheckoutHeader";

/**
 * The customer-facing application shell.
 *
 * Header, page, footer — the frame every storefront route is rendered
 * into. The routed page is wrapped in a `PageTransition` keyed on the
 * pathname inside an `AnimatePresence`, so one page fades out before the
 * next fades in.
 *
 * Wishlist and bag counts read the centralised shopping state, and the
 * mini-cart drawer mounts here — once, above every page — so the bag is
 * reachable from anywhere in the house.
 */

/** Routes that pin a bar to the bottom of small screens. */
const hasMobileActionBar = (pathname) =>
  pathname.startsWith("/product/") ||
  pathname === "/cart" ||
  pathname.startsWith("/checkout") ||
  pathname.startsWith("/order-success");

/** The order journey trades the full shopping header for the quiet one. */
const isOrderJourney = (pathname) =>
  pathname.startsWith("/checkout") || pathname.startsWith("/order-success");

export default function CustomerLayout() {
  const { pathname } = useLocation();
  const wishlist = useWishlist();
  const cart = useCart();
  const counts = { wishlist: wishlist.count, cart: cart.count };

  /* A route change always dismisses the mini-cart. */
  const { isDrawerOpen, closeDrawer } = cart;
  useEffect(() => {
    if (isDrawerOpen) closeDrawer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-ink font-display selection:bg-accent selection:text-white">
      <ScrollToTop />
      {isOrderJourney(pathname) ? (
        <CheckoutHeader />
      ) : (
        <SiteHeader counts={counts} onOpenCart={cart.openDrawer} />
      )}

      <div className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <PageTransition key={pathname}>
            <Suspense fallback={<LoadingState label="Loading" />}>
              <Outlet />
            </Suspense>
          </PageTransition>
        </AnimatePresence>
      </div>

      <SiteFooter className={hasMobileActionBar(pathname) ? "pb-36 md:pb-16" : ""} />

      {/* Mini-cart */}
      <AnimatePresence>{isDrawerOpen && <CartDrawer />}</AnimatePresence>
    </div>
  );
}
