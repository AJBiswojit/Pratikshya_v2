import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { body, duration, eyebrow, transition } from "../../design-system";
import { describeEligibility, formatOfferDiscount } from "../../services/offers/offerRepository";
import { readShippingRules } from "../../config/commerceDefaults";
import { cn } from "../../utils/cn";

/**
 * Compact offer rail for Explore.
 *
 * Copy comes from the existing offer register (seed / mock house coupons)
 * and the existing complimentary-shipping threshold. Nothing here invents
 * a campaign the desk does not already know about.
 */
export default function ExploreOfferStrip({ offers = [] }) {
  const shippingRules = readShippingRules();
  const shippingLabel = `Complimentary shipping from ₹${shippingRules.freeShippingThreshold.toLocaleString("en-IN")}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: duration.page }}
      className="border-y border-mist/70 bg-canvas-deep/40"
    >
      <div className="flex gap-3 overflow-x-auto py-3 md:grid md:grid-cols-4 md:overflow-visible md:gap-6">
        {(offers || []).slice(0, 3).map((offer) => (
          <Link
            key={offer.id}
            to={`/explore?q=${encodeURIComponent(offer.code)}`}
            className={cn(
              "min-w-[14rem] shrink-0 border border-mist/80 bg-canvas px-4 py-3 hover:border-ink",
              transition.all
            )}
          >
            <p className={cn(eyebrow.label, "text-accent mb-1")}>
              {offer.code}
              <span className="ml-2 text-brass">{formatOfferDiscount(offer)}</span>
            </p>
            <p className={cn(body.caption, "text-ink")}>{offer.name}</p>
            <p className={cn(body.micro, "text-taupe mt-1")}>
              {offer.description || describeEligibility(offer)}
            </p>
          </Link>
        ))}

        <div className="min-w-[14rem] shrink-0 border border-mist/80 bg-canvas px-4 py-3">
          <p className={cn(eyebrow.label, "text-accent mb-1")}>Delivery</p>
          <p className={cn(body.caption, "text-ink")}>{shippingLabel}</p>
          <p className={cn(body.micro, "text-taupe mt-1")}>
            Existing house shipping rule — not a new promotion.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
