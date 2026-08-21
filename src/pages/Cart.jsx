import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EditorialHeading,
  EmptyState,
} from "../design-system";
import CartLineItem from "../components/cart/CartLineItem";
import OrderSummary from "../components/cart/OrderSummary";
import ProductRecommendations from "../components/product/ProductRecommendations";
import { useCart } from "../context/CartContext";
import { getCartRecommendations } from "../data/products/recommendations";
import { formatINR } from "../utils/shopping";

/**
 * The bag — /cart.
 *
 * Set as a page of the house: breadcrumb, editorial masthead, the pieces on
 * the left and the order summary on the right, closing with a quiet
 * cross-sell edit. On mobile the pieces stack above the summary and a
 * sticky checkout bar keeps the way forward in reach.
 */
export default function Cart() {
  const cart = useCart();
  const isEmpty = cart.items.length === 0;

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Your Collection — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  const recommendations = useMemo(
    () => getCartRecommendations(cart.items.map((item) => item.product)),
    [cart.items]
  );

  if (isEmpty) {
    return (
      <main>
        <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
          <Breadcrumb items={[{ label: "Shop", to: "/shop" }, { label: "Bag" }]} className="mb-4" />
          <EmptyState
            eyebrow="Your Bag"
            title="Your collection is waiting."
            description="Discover pieces curated for your next occasion — sarees, lehengas and the finishing touches beside them."
            actions={
              <>
                <AtelierButton as={Link} to="/shop" variant="primary" size="md">
                  Explore the Collection
                </AtelierButton>
                <AtelierButton as={Link} to="/collections/new-arrivals" variant="outline" size="md">
                  New Arrivals
                </AtelierButton>
              </>
            }
          />
        </AtelierSection>
      </main>
    );
  }

  return (
    <main className="pb-24 md:pb-0">
      <AtelierSection rhythm="none" width="wide" className="pb-20 pt-28 sm:pt-32 md:pb-28">
        <Breadcrumb items={[{ label: "Shop", to: "/shop" }, { label: "Bag" }]} className="mb-8 md:mb-10" />

        <EditorialHeading
          as="h1"
          size="subsection"
          eyebrow="Your Bag"
          description={`${cart.count} ${cart.count === 1 ? "piece" : "pieces"}, held for you.`}
          spacing={{ eyebrow: "mb-4", title: "mb-3", description: "mb-0" }}
        >
          Your <span className="italic text-accent">collection.</span>
        </EditorialHeading>

        <div className="mt-10 grid gap-12 md:mt-14 lg:grid-cols-12 lg:gap-14 xl:gap-16">
          {/* Pieces */}
          <div className="min-w-0 lg:col-span-7 xl:col-span-8">
            <div className="border-t border-mist/80">
              <AnimatePresence initial={false}>
                {cart.items.map((item) => (
                  <motion.div
                    key={item.id}
                    layout="position"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0, height: 0, overflow: "hidden" }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="border-b border-mist/80"
                  >
                    <CartLineItem item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <div className="mt-8">
              <AtelierButton as={Link} to="/shop" variant="outline" size="md">
                Continue Shopping
              </AtelierButton>
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-5 xl:col-span-4">
            <div className="lg:sticky lg:top-28">
              <OrderSummary />
            </div>
          </div>
        </div>
      </AtelierSection>

      <ProductRecommendations
        id="cart-recommendations"
        eyebrow="The Finishing Touches"
        title={
          <>
            Complete your <span className="italic text-accent">collection</span>
          </>
        }
        description="Pieces chosen to sit naturally beside what your bag already holds."
        products={recommendations}
        tone="fade"
      />

      {/* Mobile: the way forward stays in reach. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-4 border-t border-mist bg-canvas/95 px-5 py-3 pb-[max(.75rem,env(safe-area-inset-bottom))] backdrop-blur-md md:hidden">
        <div>
          <p className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Total</p>
          <p className="font-display text-xl leading-tight text-ink">{formatINR(cart.totals.total)}</p>
        </div>
        <AtelierButton as={Link} to="/checkout" variant="primary" size="md" className="justify-center px-6">
          Checkout <ArrowRight size={13} aria-hidden="true" />
        </AtelierButton>
      </div>
    </main>
  );
}
