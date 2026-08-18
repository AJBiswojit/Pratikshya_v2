import { useId } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import PratikshyaImage from "../PratikshyaImage";
import { AtelierButton, Container, body } from "../../design-system";
import { useActivePlacementMedia } from "../../hooks/useMedia";
import { usePlacementEntries } from "../../hooks/useMarketingPlacements";
import { resolvePlacementImage } from "../../services/media/marketingMediaSource";
import { getLiveStorefrontProducts } from "../../data/products";
import { MARKETING_PLACEMENTS } from "../../config/mediaTypes";
import { resolveCollectionRoute } from "../../services/taxonomyRouting";
import offerRepository from "../../services/offers/offerRepository";
import taxonomyRepository from "../../services/taxonomyRepository";
import { cn } from "../../utils/cn";

/**
 * FESTIVE EDIT — premium editorial campaign band.
 *
 * The offer is derived, never hardcoded: the headline, discount figure and
 * description read from the one offer repository (the highest-priority live
 * percentage offer on a collection — the festive edit while it is live), and
 * the destination is that collection's canonical route. The editorial plate
 * resolves through the canonical Marketing Media product workflow: the
 * FESTIVE_SECTION placement holds a canonical Product ID, the live catalogue
 * resolves it (PUBLISHED only), and that product's primary media stands. A
 * seasonal PROMOTION artwork record stands in only when no festive product is
 * curated — this component never authors an image address or invents a
 * discount, and never falls back to a static catalogue plate.
 *
 * Motion is a single, staggered scroll reveal (image → eyebrow → headline →
 * offer → description → CTA) with a barely-perceptible cinematic settle on
 * the photograph, and it is disabled under `prefers-reduced-motion`.
 */

/** A calm, eased editorial easing curve shared by every reveal. */
const EASE = [0.22, 1, 0.36, 1];

const splitHeading = (heading) => {
  const words = String(heading || "Festive Edit").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return ["Festive", "Edit"];
  return [words[0], words.slice(1).join(" ")];
};

/**
 * The supporting line under the offer. The full meaning — "15% off eligible
 * festive pieces" — is preserved: the number and "OFF" sit in the lockup above,
 * so the leading "15% off" is trimmed from the description only when it exactly
 * matches the discount figure. Any other description is shown verbatim.
 */
const trimOfferPrefix = (description, discountValue) => {
  if (discountValue == null) return description;
  const prefix = new RegExp(`^${String(discountValue)}\\s*%\\s*off\\s*`, "i");
  const trimmed = String(description || "").replace(prefix, "");
  return trimmed ? trimmed.charAt(0).toUpperCase() + trimmed.slice(1) : description;
};

export default function SaleBanner({ excludeIds = null }) {
  const headingId = useId();
  const reducedMotion = useReducedMotion();

  /* The editorial plate — resolved through the canonical Marketing Media
     product workflow. The FESTIVE_SECTION placement holds a canonical Product
     ID; the live catalogue resolves it (PUBLISHED + active taxonomy only) and
     its primary product media stands. A seasonal PROMOTION artwork record
     stands in only when no festive product is curated, and with neither the
     seam shows its legitimate empty state — never a static catalogue plate. */
  const festiveEntries = usePlacementEntries(
    MARKETING_PLACEMENTS.FESTIVE_SECTION,
    getLiveStorefrontProducts()
  );
  const promotionMedia = useActivePlacementMedia(MARKETING_PLACEMENTS.PROMOTION);
  const image = festiveEntries[0]?.image ?? resolvePlacementImage(promotionMedia, null);

  /* Offer truth — unchanged from the original band. */
  const activeOffers = offerRepository.list({ status: "ACTIVE" });
  const collectionOffers = activeOffers.filter(
    (offer) =>
      offer.type === "PERCENTAGE" &&
      (offer.includedCollections || []).length > 0
  );
  const festive = collectionOffers.find((offer) =>
    (offer.includedCollections || []).includes("festive-edit")
  );
  const campaign =
    festive ||
    [...collectionOffers].sort((a, b) => b.priority - a.priority)[0] ||
    null;

  const collection =
    taxonomyRepository.findCollection(campaign?.includedCollections?.[0] || "festive-edit") ||
    taxonomyRepository.findCollection("festive-edit");

  const heading =
    (campaign && taxonomyRepository.getCollectionLabel(campaign.includedCollections?.[0])) ||
    collection?.name ||
    "Festive Edit";

  const discountValue = campaign ? campaign.discountValue : null;
  const hasOffer = discountValue != null;

  const line =
    campaign?.description ||
    "Enjoy selected pieces from the season's edit at PRATIKSHYA FASHON.";
  const description = trimOfferPrefix(line, hasOffer ? discountValue : null);

  /* Canonical destination — never an invented URL. */
  const ctaTo =
    resolveCollectionRoute(collection?.id || "festive-edit")?.href ?? "/shop";

  const [headlineFirst, headlineRest] = splitHeading(heading);

  /* Small editorial metadata — the collection's own eyebrow when present. */
  const metaLabel = collection?.eyebrow || "The Festive Edit";

  const reveal = (delay = 0, travel = 22) =>
    reducedMotion
      ? {
          initial: { opacity: 0 },
          whileInView: { opacity: 1 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.35, delay: 0 },
        }
      : {
          initial: { opacity: 0, y: travel },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.3 },
          transition: { duration: 0.65, delay, ease: EASE },
        };

  const imageReveal = reducedMotion
    ? {
        initial: { opacity: 0 },
        whileInView: { opacity: 1 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 0.5 },
      }
    : {
        initial: { opacity: 0, scale: 1.05, y: 10 },
        whileInView: { opacity: 1, scale: 1, y: 0 },
        viewport: { once: true, amount: 0.2 },
        transition: { duration: 1.15, ease: EASE },
      };

  return (
    <section
      aria-labelledby={headingId}
      className="relative overflow-hidden border-t border-mist bg-canvas"
    >
      {/* A faint warm wash so the band reads as one composed campaign plate. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-canvas via-canvas to-canvas-deep"
      />

      <Container width="wide" className="relative">
        <div className="grid gap-10 py-16 md:py-24 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:items-stretch lg:gap-16 lg:py-0">
          {/* Editorial image — first in the DOM so mobile leads with it. */}
          <div className="relative lg:col-start-2 lg:row-start-1 lg:min-h-[34rem]">
            <motion.div
              {...imageReveal}
              className="relative aspect-[4/5] overflow-hidden bg-surface lg:absolute lg:inset-y-0 lg:right-0 lg:left-8 lg:aspect-auto"
            >
              <PratikshyaImage
                image={image}
                category={image?.category}
                alt={image?.alt || "Festive Edit — festive lehenga editorial at PRATIKSHYA FASHON"}
                loading="lazy"
                fetchPriority="auto"
                sizes="(min-width: 1024px) 46vw, 100vw"
                className={cn(
                  "h-full w-full object-cover",
                  !reducedMotion &&
                    "transition-transform duration-[1200ms] ease-out will-change-transform"
                )}
              />
              {/* A soft warm scrim only at the inner edge where the copy sits, never a dark wash over the photograph. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-canvas/60 via-canvas/10 to-transparent lg:block"
              />
              {/* Refined inset frame — a fine hairline, not a heavy border. */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-3 border border-ivory/60 lg:inset-4"
              />
            </motion.div>
          </div>

          {/* Content — desktop left, mobile below the image. */}
          <div className="relative z-10 flex flex-col justify-center lg:col-start-1 lg:row-start-1 lg:py-24 lg:pr-10">
            {/* Eyebrow */}
            <motion.div {...reveal(0.1, 14)}>
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="h-px w-10 bg-gold" />
                <p className="font-ui text-[10px] uppercase tracking-[0.3em] text-brass">
                  Limited Time
                </p>
              </div>
            </motion.div>

            {/* Headline */}
            <motion.h2
              id={headingId}
              {...reveal(0.18, 18)}
              className="mt-6 font-display font-light leading-[0.88] tracking-tight text-ink"
            >
              <span className="block text-5xl md:text-7xl">{headlineFirst}</span>
              {headlineRest ? (
                <span className="block text-5xl italic text-accent md:text-7xl">
                  {headlineRest}
                </span>
              ) : null}
            </motion.h2>

            {/* Offer lockup */}
            {hasOffer ? (
              <motion.div {...reveal(0.3, 18)} className="mt-9 md:mt-11">
                <div className="flex items-center gap-5 md:gap-8">
                  <div className="flex items-baseline leading-none">
                    <span className="font-display text-7xl font-light leading-none text-ink md:text-8xl lg:text-9xl">
                      {discountValue}
                    </span>
                    <span className="font-display text-4xl font-light text-accent md:text-5xl">
                      %
                    </span>
                  </div>
                  <div
                    aria-hidden="true"
                    className="h-16 w-px bg-mist md:h-20"
                  />
                  <div className="flex flex-col items-start gap-2">
                    <span className="font-ui text-xs uppercase tracking-[0.35em] text-gold">
                      Off
                    </span>
                    <span aria-hidden="true" className="h-px w-10 bg-gold" />
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Supporting copy */}
            <motion.p
              {...reveal(0.4, 16)}
              className={cn(body.base, "mt-7 max-w-sm text-graphite md:mt-8")}
            >
              {description}
            </motion.p>

            {/* CTA */}
            <motion.div {...reveal(0.5, 16)} className="mt-9 md:mt-10">
              <AtelierButton
                as={Link}
                to={ctaTo}
                variant="primary"
                size="lg"
                className="group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Shop the Edit
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className="transition-transform duration-300 ease-out group-hover:translate-x-1 motion-reduce:transition-none"
                />
              </AtelierButton>
            </motion.div>

            {/* Editorial footnote — monogram + metadata, luxury through restraint. */}
            <motion.div
              {...reveal(0.6, 12)}
              className="mt-12 flex items-center gap-4 md:mt-14"
            >
              <span
                aria-hidden="true"
                className="font-display text-lg font-light tracking-[0.2em] text-brass/70"
              >
                PF
              </span>
              <span aria-hidden="true" className="h-px w-8 bg-mist" />
              <span className="font-ui text-[10px] uppercase tracking-[0.25em] text-taupe">
                {metaLabel}
              </span>
            </motion.div>
          </div>
        </div>
      </Container>
    </section>
  );
}
