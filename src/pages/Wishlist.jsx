import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AtelierButton,
  AtelierSection,
  Breadcrumb,
  EditorialHeading,
  EmptyState,
  gap,
  ProductCard,
  transition,
  useReveal,
} from "../design-system";
import { useProductCovers } from "../hooks/useMedia";
import { productHref } from "../data/products";
import { useShopping } from "../context/ShoppingContext";
import { requiresVariantChoice } from "../utils/shopping";
import { cn } from "../utils/cn";

/**
 * The wishlist — /account/wishlist.
 *
 * The saved edit, laid out on the same product grid the storefront uses.
 * Each piece keeps the Phase 2 card untouched; the actions live in a quiet
 * row beneath it. Pieces that need a size choice are taken to their detail
 * page rather than forcing the choice into a card, and adding a piece to
 * the bag leaves it in the wishlist until the customer removes it.
 */
export default function Wishlist() {
  const { cart, wishlist, moveToCart } = useShopping();
  const navigate = useNavigate();
  const reveal = useReveal(16, 0.5);
  const [feedback, setFeedback] = useState(null);
  /* Saved pieces show the published cover plate when one exists. */
  const savedProducts = useProductCovers(wishlist.products);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Wishlist — PRATIKSHYA FASHON";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  useEffect(() => {
    if (!feedback) return undefined;
    const timer = window.setTimeout(() => setFeedback(null), 4200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const addToBag = (product) => {
    const result = moveToCart(product);
    if (result.needsVariant) {
      navigate(productHref(product));
      return;
    }
    setFeedback({ id: product.id, message: result.message, ok: result.ok });
    if (result.ok) cart.openDrawer();
  };

  const breadcrumb = [{ label: "Account", to: "/account" }, { label: "Wishlist" }];

  if (wishlist.count === 0) {
    return (
      <main>
        <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
          <Breadcrumb items={breadcrumb} className="mb-4" />
          <EmptyState
            eyebrow="Saved Pieces"
            title="Your edit is still open."
            description="Save the pieces you love and return to them whenever you're ready — they will be waiting here."
            actions={
              <>
                <AtelierButton as={Link} to="/category/sarees" variant="primary" size="md">
                  Explore Sarees
                </AtelierButton>
                <AtelierButton as={Link} to="/category/lehengas" variant="outline" size="md">
                  Explore Lehengas
                </AtelierButton>
                <AtelierButton as={Link} to="/category/bridal-couture" variant="outline" size="md">
                  Explore Bridal
                </AtelierButton>
              </>
            }
          />
        </AtelierSection>
      </main>
    );
  }

  return (
    <main>
      <AtelierSection rhythm="none" width="wide" className="pb-24 pt-28 sm:pt-32 md:pb-32">
        <Breadcrumb items={breadcrumb} className="mb-8 md:mb-10" />

        <EditorialHeading
          as="h1"
          size="subsection"
          eyebrow="Saved Pieces"
          description={`Pieces you've saved for later — ${wishlist.count} ${
            wishlist.count === 1 ? "piece" : "pieces"
          } in your edit.`}
          spacing={{ eyebrow: "mb-4", title: "mb-3", description: "mb-0" }}
        >
          Your <span className="italic text-accent">wishlist.</span>
        </EditorialHeading>

        <div className={cn("mt-12 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:mt-16", gap.tile)}>
          <AnimatePresence initial={false}>
            {savedProducts.map((product) => (
              <motion.div
                key={product.id}
                layout="position"
                {...reveal}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35 }}
              >
                <ProductCard
                  product={product}
                  as={Link}
                  to={productHref(product)}
                  showCategory
                  showDiscount
                  showAvailability
                  onWishlist={wishlist.remove}
                  isWishlisted
                  wishlistIcon={Heart}
                />

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                  <AtelierButton
                    variant="outline"
                    size="chip"
                    disabled={!product.inStock}
                    onClick={() => addToBag(product)}
                    className={cn(!product.inStock && "cursor-not-allowed opacity-40")}
                  >
                    {!product.inStock
                      ? "Unavailable"
                      : requiresVariantChoice(product)
                        ? "Choose Options"
                        : "Add to Bag"}
                  </AtelierButton>
                  <button
                    type="button"
                    onClick={() => wishlist.remove(product)}
                    className={cn(
                      "font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:text-accent",
                      transition.colors,
                      "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                    )}
                  >
                    Remove
                  </button>
                </div>

                <AnimatePresence>
                  {feedback?.id === product.id && feedback.message ? (
                    <motion.p
                      role="status"
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "mt-2 font-ui text-[10px] tracking-wide",
                        feedback.ok ? "text-cocoa" : "text-accent"
                      )}
                    >
                      {feedback.message}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </AtelierSection>
    </main>
  );
}
