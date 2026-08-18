import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import PratikshyaImage from "../PratikshyaImage";
import { Accent, AtelierSection, EditorialHeading, body } from "../../design-system";
import { MARKETING_PLACEMENTS } from "../../config/mediaTypes";
import { useBrideGroomLooks } from "../../hooks/useMedia";
import { usePlacementEntries } from "../../hooks/useMarketingPlacements";
import { getLiveStorefrontProducts } from "../../data/products";
import { resolveCategoryRoute } from "../../services/taxonomyRouting";
import { cn } from "../../utils/cn";

/**
 * Wedding composition motion — a paired reveal, not the Saree Edit dissolve.
 *
 * Bride arrives from below; Groom arrives from the side. They land as one
 * editorial plate. Rotation (when more than one owned look exists) is a
 * slow opacity/scale dissolve, never a lateral crossfade.
 */
export const BRIDE_GROOM_ROTATE_MS = 4500;
export const BRIDE_GROOM_REVEAL_MS = 900;
export const BRIDE_GROOM_GROOM_DELAY_MS = 150;
export const BRIDE_GROOM_TEXT_DELAY_MS = 300;
export const BRIDE_GROOM_TEXT_MS = 600;
export const BRIDE_GROOM_CTA_DELAY_MS = 500;
export const BRIDE_GROOM_CTA_MS = 500;
export const BRIDE_GROOM_HOVER_MS = 700;
export const BRIDE_GROOM_CROSSFADE_MS = 1000;
export const BRIDE_GROOM_REDUCED_MS = 280;

const BRIDE_GROOM_EASE = [0.22, 1, 0.36, 1];

const resolveBrideHref = () =>
  resolveCategoryRoute("the-bride") ||
  resolveCategoryRoute("lehengas") ||
  resolveCategoryRoute("sarees");

const resolveGroomHref = () =>
  resolveCategoryRoute("groom") ||
  resolveCategoryRoute("ethnic-wear");

const lookKey = (look, fallback) =>
  look?.mediaId || look?.productId || look?.filename || fallback;

const lookAlt = (look, label) => look?.image?.alt || `${label} wedding wear at PRATIKSHYA FASHON`;

const wrap = (value, count) => ((value % count) + count) % count;

function WeddingPlate({
  look,
  label,
  line,
  href,
  cta,
  align = "left",
  reveal,
  hovered,
  dimmed,
  reducedMotion,
  priority = false,
}) {
  const image = look?.image;
  if (!image || !href) return null;

  const hoverMs = (reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_HOVER_MS) / 1000;
  const crossfadeMs = (reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_CROSSFADE_MS) / 1000;

  return (
    <motion.div
      className="min-w-0"
      initial={reveal.initial}
      whileInView={reveal.animate}
      viewport={{ once: true, amount: 0.35 }}
    >
      <motion.article
        className="min-w-0"
        animate={{
          scale: reducedMotion ? 1 : dimmed ? 0.99 : hovered ? 1.02 : 1,
          opacity: dimmed ? 0.84 : 1,
        }}
        transition={{ duration: hoverMs, ease: BRIDE_GROOM_EASE }}
      >
      <Link
        to={href}
        aria-label={`${cta}: ${line}`}
        className="group relative block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
      >
        <div className="relative h-[22rem] w-full overflow-hidden bg-ink-line sm:h-[26rem] md:h-[28rem] lg:h-[32rem]">
          <AnimatePresence initial={false} mode="sync">
            <motion.div
              key={lookKey(look, label)}
              className="absolute inset-0"
              initial={
                reducedMotion
                  ? { opacity: 0 }
                  : {
                      opacity: 0,
                      scale: 0.985,
                      y: align === "left" ? 14 : 0,
                      x: align === "right" ? 16 : 0,
                    }
              }
              animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
              exit={reducedMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
              transition={{ duration: crossfadeMs, ease: BRIDE_GROOM_EASE }}
            >
              <PratikshyaImage
                image={image}
                category={look.categoryId}
                alt={lookAlt(look, label)}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : "auto"}
                sizes="(min-width: 1024px) 46vw, (min-width: 768px) 46vw, 100vw"
                className={cn(
                  "h-full w-full object-cover",
                  "transition-transform duration-700 ease-out motion-reduce:transition-none",
                  hovered && !reducedMotion ? "scale-[1.03]" : "scale-100"
                )}
              />
            </motion.div>
          </AnimatePresence>

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/15 to-transparent transition-opacity motion-reduce:transition-none",
              hovered ? "opacity-100" : "opacity-80"
            )}
            style={{
              transitionDuration: `${reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_HOVER_MS}ms`,
            }}
          />

          <div
            className={cn(
              "absolute inset-x-0 bottom-0 p-6 md:p-8",
              align === "right" && "md:text-right"
            )}
          >
            <motion.div
              initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: (reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_TEXT_MS) / 1000,
                delay: reducedMotion ? 0 : BRIDE_GROOM_TEXT_DELAY_MS / 1000,
                ease: BRIDE_GROOM_EASE,
              }}
              className={cn(
                "transition-transform motion-reduce:transition-none",
                hovered && !reducedMotion ? "-translate-y-1" : "translate-y-0"
              )}
              style={{
                transitionDuration: `${reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_HOVER_MS}ms`,
              }}
            >
              <p className="font-ui text-[10px] uppercase tracking-[0.28em] text-gold">{label}</p>
              <h3 className="mt-2 font-display text-3xl font-light leading-tight text-ivory md:text-4xl">
                {label === "Bride" ? "Bride" : "Groom"}
              </h3>
              <p className="mt-2 font-ui text-[11px] tracking-[0.08em] text-ivory/75">{line}</p>
            </motion.div>

            <motion.span
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{
                duration: (reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_CTA_MS) / 1000,
                delay: reducedMotion ? 0 : BRIDE_GROOM_CTA_DELAY_MS / 1000,
                ease: BRIDE_GROOM_EASE,
              }}
              className={cn(
                "mt-5 inline-flex items-center border border-ivory/35 px-5 py-2.5 font-ui text-[10px] uppercase tracking-[0.2em] text-ivory transition-all motion-reduce:transition-none",
                "group-hover:border-ivory group-hover:bg-ivory/10",
                "group-focus-visible:border-ivory",
                hovered ? "opacity-100" : "opacity-80"
              )}
              style={{
                transitionDuration: `${reducedMotion ? BRIDE_GROOM_REDUCED_MS : BRIDE_GROOM_HOVER_MS}ms`,
              }}
            >
              {cta}
            </motion.span>
          </div>
        </div>
      </Link>
      </motion.article>
    </motion.div>
  );
}

/**
 * BRIDE & GROOM — a paired wedding composition, not two category cards.
 *
 * Looks arrive already resolved: taxonomy → catalogue → product media set
 * (or taxonomy-owned editorial media). This component never selects a file,
 * invents a URL or hard-codes a destination.
 */
export default function BrideGroomEdit({ excludeIds = null }) {
  /* The Marketing Media desk curates the Bride and Groom plates through the
     BRIDAL_SECTION / GROOM_SECTION placements. A curated side leads — its
     products resolved from the canonical catalogue in placement order — and
     a side without curation keeps the house's deterministic wedding edit. */
  const liveProducts = getLiveStorefrontProducts();
  const curatedBride = usePlacementEntries(MARKETING_PLACEMENTS.BRIDAL_SECTION, liveProducts);
  const curatedGroom = usePlacementEntries(MARKETING_PLACEMENTS.GROOM_SECTION, liveProducts);
  const looks = useBrideGroomLooks({ excludeIds }) || { bride: [], groom: [] };
  const curatedToLooks = (entries, side) =>
    entries.map((entry) => ({
      ...entry,
      side,
      categoryId: entry.product.category,
      ownership: "curated",
    }));
  const brideLooks = curatedBride.length
    ? curatedToLooks(curatedBride, "bride")
    : looks.bride || [];
  const groomLooks = curatedGroom.length
    ? curatedToLooks(curatedGroom, "groom")
    : looks.groom || [];
  const brideRoute = resolveBrideHref();
  const groomRoute = resolveGroomHref();
  const reducedMotion = useReducedMotion();

  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(null);
  const [focusWithin, setFocusWithin] = useState(false);
  const transitionLock = useRef(false);
  const lockTimer = useRef(null);

  const brideCount = brideLooks.length;
  const groomCount = groomLooks.length;
  const canRotate = !reducedMotion && (brideCount > 1 || groomCount > 1);

  useEffect(() => {
    if (brideCount > 0 && index >= Math.max(brideCount, groomCount, 1)) setIndex(0);
  }, [brideCount, groomCount, index]);

  useEffect(
    () => () => {
      window.clearTimeout(lockTimer.current);
    },
    []
  );

  const advance = useCallback(() => {
    if (!canRotate || transitionLock.current) return;
    transitionLock.current = true;
    window.clearTimeout(lockTimer.current);
    lockTimer.current = window.setTimeout(() => {
      transitionLock.current = false;
      lockTimer.current = null;
    }, BRIDE_GROOM_CROSSFADE_MS);
    setIndex((current) => current + 1);
  }, [canRotate]);

  const paused = Boolean(hovered) || focusWithin || !canRotate;

  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setTimeout(advance, BRIDE_GROOM_ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [advance, index, paused]);

  if (!brideRoute || !groomRoute || brideCount === 0 || groomCount === 0) return null;

  const brideLook = brideLooks[wrap(index, brideCount)];
  const groomLook = groomLooks[wrap(index, groomCount)];

  const seconds = (ms) => (reducedMotion ? BRIDE_GROOM_REDUCED_MS : ms) / 1000;
  const brideReveal = reducedMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1, transition: { duration: seconds(BRIDE_GROOM_REVEAL_MS) } } }
    : {
        initial: { opacity: 0, y: 28, scale: 0.97 },
        animate: {
          opacity: 1,
          y: 0,
          scale: 1,
          transition: { duration: seconds(BRIDE_GROOM_REVEAL_MS), ease: BRIDE_GROOM_EASE },
        },
      };
  const groomReveal = reducedMotion
    ? {
        initial: { opacity: 0 },
        animate: {
          opacity: 1,
          transition: { duration: seconds(BRIDE_GROOM_REVEAL_MS), delay: BRIDE_GROOM_GROOM_DELAY_MS / 1000 },
        },
      }
    : {
        initial: { opacity: 0, x: 28, scale: 0.97 },
        animate: {
          opacity: 1,
          x: 0,
          scale: 1,
          transition: {
            duration: seconds(BRIDE_GROOM_REVEAL_MS),
            delay: BRIDE_GROOM_GROOM_DELAY_MS / 1000,
            ease: BRIDE_GROOM_EASE,
          },
        },
      };

  return (
    <AtelierSection
      id="collections"
      tone="ink"
      aria-labelledby="bride-groom-heading"
      onMouseLeave={() => setHovered(null)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      onFocusCapture={() => setFocusWithin(true)}
    >
      <EditorialHeading
        size="editorial"
        description="Wedding silhouettes crafted for the moments that become memories."
        descriptionClassName={`${body.base} text-ash`}
        spacing={{ title: "mb-4", description: "mb-14" }}
      >
        Bride & <Accent tone="gold">Groom</Accent>
      </EditorialHeading>

      <div className="grid items-stretch gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6 lg:gap-8">
        <div
          className="min-w-0"
          onMouseEnter={() => setHovered("bride")}
          onFocus={() => setHovered("bride")}
        >
          <WeddingPlate
            look={brideLook}
            label="Bride"
            line="Bridal Sarees · Lehengas · Couture"
            href={brideRoute.href}
            cta="Explore Bride"
            align="left"
            reveal={brideReveal}
            hovered={hovered === "bride"}
            dimmed={hovered === "groom"}
            reducedMotion={reducedMotion}
            priority
          />
        </div>

        <div
          className="hidden flex-col items-center justify-center px-1 md:flex lg:px-2"
          aria-hidden="true"
        >
          <span className="h-16 w-px bg-ivory/20" />
          <span className="my-4 font-display text-2xl font-light italic text-gold/80">&</span>
          <span className="h-16 w-px bg-ivory/20" />
        </div>

        <div
          className="min-w-0"
          onMouseEnter={() => setHovered("groom")}
          onFocus={() => setHovered("groom")}
        >
          <WeddingPlate
            look={groomLook}
            label="Groom"
            line="Sherwanis · Kurta Sets · Ceremonial Wear"
            href={groomRoute.href}
            cta="Explore Groom"
            align="right"
            reveal={groomReveal}
            hovered={hovered === "groom"}
            dimmed={hovered === "bride"}
            reducedMotion={reducedMotion}
            priority
          />
        </div>
      </div>
    </AtelierSection>
  );
}
