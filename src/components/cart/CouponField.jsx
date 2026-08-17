import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Tag, X } from "lucide-react";
import { useId, useState } from "react";
import { transition } from "../../design-system";
import { getCoupons } from "../../data/shopping/coupons";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { cn } from "../../utils/cn";

/**
 * The offer field of the order summary.
 *
 * A hairline input in the house style, a quiet disclosure of the demo
 * offers, and the applied state as a removable line — never a technical
 * validation message.
 */
export default function CouponField() {
  const cart = useCart();
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [offersOpen, setOffersOpen] = useState(false);
  const inputId = useId();
  const visibleOffers = getCoupons({ customerId: user?.id, customerEmail: user?.email });

  const apply = (value) => {
    const result = cart.applyCoupon(value);
    setFeedback(result);
    if (result.ok) {
      setCode("");
      setOffersOpen(false);
    }
  };

  const onSubmit = (event) => {
    event.preventDefault();
    if (!code.trim()) return;
    apply(code);
  };

  if (cart.coupon) {
    return (
      <div className="border-t border-mist/80 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <Check size={14} className="shrink-0 text-accent" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-ui text-[10px] uppercase tracking-[.16em] text-ink">
                {cart.coupon.code} applied
              </p>
              <p className="mt-0.5 truncate font-ui text-[10px] text-taupe">
                {cart.coupon.summary}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              cart.removeCoupon();
              setFeedback(null);
            }}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:text-accent",
              transition.colors,
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            )}
          >
            <X size={12} aria-hidden="true" /> Remove
          </button>
        </div>
        {cart.couponLapsed ? (
          <p role="status" className="mt-3 font-ui text-[11px] text-accent">
            This offer isn&rsquo;t active for your current selection.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="border-t border-mist/80 pt-5">
      <form onSubmit={onSubmit}>
        <label
          htmlFor={inputId}
          className="mb-3 flex items-center gap-2 font-ui text-[10px] uppercase tracking-[.18em] text-ink"
        >
          <Tag size={12} className="text-accent" aria-hidden="true" />
          Apply an offer
        </label>
        <div className="flex border-b border-ink">
          <input
            id={inputId}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.toUpperCase());
              setFeedback(null);
            }}
            placeholder="OFFER CODE"
            autoComplete="off"
            spellCheck="false"
            className="min-w-0 flex-1 bg-transparent py-2 font-ui text-xs uppercase tracking-[.12em] text-ink outline-none placeholder:text-taupe/60"
          />
          <button
            type="submit"
            className={cn(
              "px-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent hover:text-ink",
              transition.colors,
              "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
            )}
          >
            Apply
          </button>
        </div>
      </form>

      <AnimatePresence mode="wait">
        {feedback && !feedback.ok ? (
          <motion.p
            key={feedback.message}
            role="alert"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 font-ui text-[11px] text-accent"
          >
            {feedback.message}
          </motion.p>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setOffersOpen((open) => !open)}
        aria-expanded={offersOpen}
        className={cn(
          "mt-4 inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-brass hover:text-accent",
          transition.colors,
          "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
        )}
      >
        Current offers
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={cn("transition-transform duration-500", offersOpen && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {offersOpen && (
          <motion.ul
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="overflow-hidden"
          >
            {visibleOffers.map((offer) => (
              <li key={offer.code} className="border-b border-mist/60 py-3 last:border-b-0">
                <button
                  type="button"
                  onClick={() => apply(offer.code)}
                  className={cn(
                    "group flex w-full items-baseline justify-between gap-3 text-left",
                    "focus-visible:outline focus-visible:outline-1 focus-visible:outline-accent"
                  )}
                >
                  <span className="min-w-0">
                    <span className="block font-ui text-[10px] uppercase tracking-[.16em] text-ink">
                      {offer.code}
                    </span>
                    <span className="mt-0.5 block font-ui text-[10px] text-taupe">
                      {offer.summary}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "shrink-0 font-ui text-[9px] uppercase tracking-[.14em] text-brass group-hover:text-accent",
                      transition.colors
                    )}
                  >
                    Apply
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
