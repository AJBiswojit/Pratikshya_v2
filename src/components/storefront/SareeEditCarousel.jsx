import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useIsPresent } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import PratikshyaImage from "../PratikshyaImage";
import { Accent, AtelierSection, EditorialHeading, eyebrow } from "../../design-system";
import { MARKETING_PLACEMENTS } from "../../config/mediaTypes";
import { useSareeEditProducts } from "../../hooks/useMedia";
import { usePlacementEntries } from "../../hooks/useMarketingPlacements";
import { getLiveStorefrontProducts } from "../../data/products";
import { resolveCategoryRoute } from "../../services/taxonomyRouting";
import { formatINR } from "../../utils/shopping";
import { cn } from "../../utils/cn";

/** Product cadence requested for the homepage edit. */
export const SAREE_EDIT_AUTOPLAY_MS = 2500;

/**
 * Editorial crossfade — one saree story dissolves into the next.
 *
 * The outgoing and incoming slides stay mounted together (AnimatePresence
 * sync layering) so there is never an empty frame, a white flash or a layout
 * jump. The image crossfades over 800ms with a very subtle lateral drift
 * (≤ 14px), and the product text lands a beat after the image starts moving.
 */
export const SAREE_EDIT_TRANSITION_MS = 800; // image crossfade (700–900ms window)
const SAREE_EDIT_TRAVEL_PX = 14; // subtle horizontal drift — never more than ~12–20px
const SAREE_EDIT_EXIT_TRAVEL_PX = 10; // outgoing drift, even quieter than the arrival
const SAREE_EDIT_TEXT_MS = 420; // product text transition (350–500ms window)
const SAREE_EDIT_TEXT_DELAY_MS = 140; // text follows slightly after the image
const SAREE_EDIT_TEXT_EXIT_MS = 240; // outgoing text clears before the new text lands
const SAREE_EDIT_TEXT_TRAVEL_PX = 6; // translateY(6px → 0)
const SAREE_EDIT_REDUCED_MS = 160; // reduced-motion: simple opacity transition
const SAREE_EDIT_RESUME_MS = 6000; // autoplay resumes gently after interaction

/** Smooth ease-in-out: slow, soft, cinematic at both ends of the dissolve. */
const SAREE_EDIT_EASE = [0.42, 0, 0.2, 1];

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reduced;
};

const wrap = (value, count) => ((value % count) + count) % count;
const twoDigits = (value) => String(value).padStart(2, "0");

const productAlt = (product) => {
  const details = [product.colors?.[0], product.subcategory].filter(Boolean).join(", ");
  return details ? `${product.name} — ${details}` : product.name;
};

const productMeta = (product) =>
  [product.fabric, product.colors?.[0], product.collection]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index)
    .slice(0, 3);

/* ---------------------------------------------------------------------- */
/* Motion — layered crossfade                                              */
/*                                                                        */
/* dir:  1 = next (story arrives from the right, outgoing drifts left)     */
/* dir: -1 = previous (mirror image)                                       */
/* rm:   prefers-reduced-motion — opacity only, no movement                */
/* ---------------------------------------------------------------------- */

const imageLayerVariants = {
  enter: ({ dir = 1, rm = false } = {}) => ({
    opacity: 0,
    x: rm ? 0 : dir * SAREE_EDIT_TRAVEL_PX,
  }),
  center: ({ rm = false } = {}) => ({
    opacity: 1,
    x: 0,
    transition: rm
      ? { duration: SAREE_EDIT_REDUCED_MS / 1000, ease: "linear" }
      : { duration: SAREE_EDIT_TRANSITION_MS / 1000, ease: SAREE_EDIT_EASE },
  }),
  exit: ({ dir = 1, rm = false } = {}) => ({
    opacity: 0,
    x: rm ? 0 : -dir * SAREE_EDIT_EXIT_TRAVEL_PX,
    transition: rm
      ? { duration: SAREE_EDIT_REDUCED_MS / 1000, ease: "linear" }
      : { duration: SAREE_EDIT_TRANSITION_MS / 1000, ease: SAREE_EDIT_EASE },
  }),
};

const productTextVariants = {
  enter: ({ rm = false } = {}) => ({
    opacity: 0,
    y: rm ? 0 : SAREE_EDIT_TEXT_TRAVEL_PX,
  }),
  center: ({ rm = false } = {}) => ({
    opacity: 1,
    y: 0,
    transition: rm
      ? { duration: SAREE_EDIT_REDUCED_MS / 1000, ease: "linear" }
      : {
          duration: SAREE_EDIT_TEXT_MS / 1000,
          delay: SAREE_EDIT_TEXT_DELAY_MS / 1000,
          ease: SAREE_EDIT_EASE,
        },
  }),
  exit: ({ rm = false } = {}) => ({
    opacity: 0,
    y: 0,
    transition: {
      duration: (rm ? SAREE_EDIT_REDUCED_MS : SAREE_EDIT_TEXT_EXIT_MS) / 1000,
      ease: "easeIn",
    },
  }),
};

/** Side previews dissolve quietly — pure opacity, same cadence as the main card. */
const previewLayerVariants = {
  enter: () => ({ opacity: 0 }),
  center: ({ rm = false } = {}) => ({
    opacity: 1,
    transition: {
      duration: (rm ? SAREE_EDIT_REDUCED_MS : SAREE_EDIT_TRANSITION_MS) / 1000,
      ease: rm ? "linear" : SAREE_EDIT_EASE,
    },
  }),
  exit: ({ rm = false } = {}) => ({
    opacity: 0,
    transition: {
      duration: (rm ? SAREE_EDIT_REDUCED_MS : SAREE_EDIT_TRANSITION_MS) / 1000,
      ease: rm ? "linear" : SAREE_EDIT_EASE,
    },
  }),
};

function PriceLine({ product, inverse = false }) {
  if (product.price == null || product.price === "" || !Number.isFinite(Number(product.price))) return null;
  const hasReduction =
    product.originalPrice != null &&
    product.originalPrice !== "" &&
    Number.isFinite(Number(product.originalPrice)) &&
    Number(product.originalPrice) > Number(product.price);

  return (
    <p className={cn("flex flex-wrap items-center gap-2 font-ui text-xs", inverse ? "text-white" : "text-ink")}>
      <span className="font-medium">{formatINR(product.price)}</span>
      {hasReduction ? (
        <span className={cn("line-through", inverse ? "text-pearl" : "text-taupe")}>
          {formatINR(product.originalPrice)}
        </span>
      ) : null}
    </p>
  );
}

/**
 * One layered slide of the active saree. Absolutely stacked inside the fixed
 * aspect-ratio stage so the outgoing slide fades beneath the incoming one.
 * While exiting, the layer stays mounted but becomes inert (no pointer or
 * keyboard targets), which keeps the crossfade free of double interactions.
 */
function ActiveSareeCard({ entry, slideNumber, slideCount, priority, custom, onSwipeClick }) {
  const { product, image, route } = entry;
  const meta = productMeta(product);
  const isPresent = useIsPresent();

  return (
    <motion.article
      aria-roledescription="slide"
      aria-label={`${slideNumber} of ${slideCount}: ${product.name}`}
      className={cn("absolute inset-0 min-w-0", !isPresent && "pointer-events-none")}
      custom={custom}
      variants={imageLayerVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <Link
        to={route}
        onClick={onSwipeClick}
        aria-label={`View ${product.name}`}
        tabIndex={isPresent ? undefined : -1}
        className="group block h-full focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
      >
        <div className="relative h-full w-full overflow-hidden bg-surface">
          <PratikshyaImage
            image={image}
            category={product.category}
            alt={productAlt(product)}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "auto"}
            sizes="(min-width: 1024px) 42vw, (min-width: 768px) 58vw, 100vw"
            className="h-full w-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.015]"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/10 to-transparent"
          />
          <motion.div custom={custom} variants={productTextVariants} className="absolute inset-x-0 bottom-0 p-5 text-white sm:p-7 md:p-8">
            <p className={cn(eyebrow.editorial, "mb-2 text-blush")}>
              {product.subcategory || product.categoryLabel}
            </p>
            <h3 className="max-w-xl font-display text-2xl font-light leading-[1.05] sm:text-3xl md:text-4xl">
              {product.name}
            </h3>
            <div className="mt-3">
              <PriceLine product={product} inverse />
            </div>
            {meta.length ? (
              <p className="mt-3 font-ui text-[10px] leading-relaxed tracking-[.08em] text-pearl">
                {meta.join(" · ")}
              </p>
            ) : null}
          </motion.div>
        </div>
      </Link>
    </motion.article>
  );
}

function SareePreview({ entry, relation, custom, onSelect }) {
  const { product, image } = entry;
  const isPresent = useIsPresent();

  return (
    <motion.button
      type="button"
      onClick={onSelect}
      aria-label={`Show ${product.name} as the active saree`}
      tabIndex={isPresent ? undefined : -1}
      className={cn(
        "group col-start-1 row-start-1 block min-w-0 self-end text-left opacity-70 transition-opacity duration-500 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent",
        !isPresent && "pointer-events-none"
      )}
      style={{ gridArea: "1 / 1" }}
      custom={custom}
      variants={previewLayerVariants}
      initial="enter"
      animate="center"
      exit="exit"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-surface">
        <PratikshyaImage
          image={image}
          category={product.category}
          alt={productAlt(product)}
          loading="lazy"
          fetchPriority="low"
          sizes="(min-width: 1024px) 24vw, 36vw"
          className="h-full w-full object-cover transition-transform duration-700 ease-out motion-reduce:transition-none group-hover:scale-[1.02]"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-ink/30 to-transparent" />
        <span className="absolute left-4 top-4 font-ui text-[9px] uppercase tracking-[.2em] text-white drop-shadow-sm">
          {relation}
        </span>
      </div>
      <div className="border-b border-mist py-4">
        <p className={cn(eyebrow.editorial, "mb-1.5 text-accent")}>
          {product.subcategory || product.categoryLabel}
        </p>
        <h3 className="font-display text-xl font-light leading-tight text-ink">{product.name}</h3>
        <div className="mt-2">
          <PriceLine product={product} />
        </div>
      </div>
    </motion.button>
  );
}

/**
 * THE SAREE EDIT — a product carousel, not an image carousel.
 *
 * Each entry has already travelled through taxonomy, the live catalogue and
 * getProductMediaSet. This component only presents those verified rows. It
 * never selects an image, reads a filename or creates a product/category URL.
 *
 * Motion: slides are layered through AnimatePresence so the previous saree
 * remains mounted while the next one emerges — a continuous crossfade with a
 * 14px lateral breath, followed a beat later by the product text. Autoplay
 * advances every 2500ms, never interrupts a running transition, and pauses
 * for hover, focus, touch and manual navigation before resuming gently.
 */
export default function SareeEditCarousel() {
  /* The Marketing Media desk curates this section through the SAREE_SECTION
     placement. When products are assigned there, they lead — resolved from
     the canonical catalogue in placement order; otherwise the house's
     deterministic Saree Edit stands. */
  const curated = usePlacementEntries(MARKETING_PLACEMENTS.SAREE_SECTION, getLiveStorefrontProducts());
  const deterministic = useSareeEditProducts();
  const entries = curated.length ? curated : deterministic;
  const sareeRoute = resolveCategoryRoute("sarees");
  const count = entries.length;

  const [index, setIndex] = useState(0);
  /** +1 = travelling forward (next), -1 = travelling back (previous). */
  const [direction, setDirection] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const [touching, setTouching] = useState(false);
  const [interactionPaused, setInteractionPaused] = useState(false);
  const [pageHidden, setPageHidden] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const touchStart = useRef(null);
  const didSwipe = useRef(false);
  /** Guards the crossfade: a new transition never starts mid-dissolve. */
  const transitionLock = useRef(false);
  const lockTimer = useRef(null);
  const resumeTimer = useRef(null);

  useEffect(() => {
    if (count > 0 && index >= count) setIndex(0);
  }, [count, index]);

  useEffect(() => {
    const update = () => setPageHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(
    () => () => {
      window.clearTimeout(lockTimer.current);
      window.clearTimeout(resumeTimer.current);
    },
    []
  );

  /**
   * Shared gate for every index change: refuses to begin while the current
   * crossfade is still resolving, then holds the lock until the new slide is
   * fully visible. Reduced motion shortens the guard to the opacity-only
   * transition so navigation stays responsive.
   */
  const beginTransition = useCallback(
    (applyIndex) => {
      if (count <= 1 || transitionLock.current) return false;
      transitionLock.current = true;
      window.clearTimeout(lockTimer.current);
      lockTimer.current = window.setTimeout(
        () => {
          transitionLock.current = false;
          lockTimer.current = null;
        },
        reducedMotion ? SAREE_EDIT_REDUCED_MS + 80 : SAREE_EDIT_TRANSITION_MS
      );
      applyIndex();
      return true;
    },
    [count, reducedMotion]
  );

  const move = useCallback(
    (step) => {
      beginTransition(() => {
        setDirection(step < 0 ? -1 : 1);
        setIndex((current) => wrap(current + step, count));
      });
    },
    [beginTransition, count]
  );

  const goTo = useCallback(
    (target) => {
      if (count <= 1) return;
      const wrapped = wrap(target, count);
      if (wrapped === index) return;
      const forwardDistance = wrap(wrapped - index, count);
      const backwardDistance = wrap(index - wrapped, count);
      beginTransition(() => {
        setDirection(forwardDistance <= backwardDistance ? 1 : -1);
        setIndex(wrapped);
      });
    },
    [beginTransition, count, index]
  );

  /**
   * Manual navigation pauses autoplay, then resumes smoothly after a few
   * calm seconds. Autoplay calls move() directly and never touches this.
   */
  const pauseForInteraction = useCallback(() => {
    window.clearTimeout(resumeTimer.current);
    setInteractionPaused(true);
    resumeTimer.current = window.setTimeout(() => {
      setInteractionPaused(false);
      resumeTimer.current = null;
    }, SAREE_EDIT_RESUME_MS);
  }, []);

  const navigate = useCallback(
    (step) => {
      pauseForInteraction();
      move(step);
    },
    [pauseForInteraction, move]
  );

  const selectIndex = useCallback(
    (target) => {
      pauseForInteraction();
      goTo(target);
    },
    [pauseForInteraction, goTo]
  );

  const paused = reducedMotion || hovered || focusWithin || touching || interactionPaused || pageHidden;

  /* Stable single timer: one full interval between transitions, cleaned up
   * whenever the slide, pause state or component lifecycle changes. */
  useEffect(() => {
    if (paused || count <= 1) return undefined;
    const timer = window.setTimeout(() => move(1), SAREE_EDIT_AUTOPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [count, index, move, paused]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      navigate(1);
    }
  };

  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
    setTouching(true);
  };

  const onTouchEnd = (event) => {
    const start = touchStart.current;
    touchStart.current = null;
    setTouching(false);
    if (!start) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      didSwipe.current = true;
      navigate(dx < 0 ? 1 : -1);
      window.setTimeout(() => {
        didSwipe.current = false;
      }, 0);
    }
  };

  const onActiveClick = (event) => {
    if (didSwipe.current) event.preventDefault();
  };

  if (!sareeRoute || count === 0) return null;

  const previousIndex = wrap(index - 1, count);
  const nextIndex = wrap(index + 1, count);
  const active = entries[index];
  /** Shared variant custom payload: direction + reduced-motion for every layer. */
  const layerCustom = { dir: direction, rm: reducedMotion };

  return (
    <AtelierSection
      id="women"
      rhythm="spacious"
      aria-roledescription="carousel"
      aria-label="The Saree Edit"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocusWithin(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocusWithin(false);
      }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        touchStart.current = null;
        setTouching(false);
      }}
      className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
    >
      <header className="mb-10 md:mb-14">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <EditorialHeading
            eyebrow="Women's Collection"
            description="Discover the drapes, textures and colours that define the Pratikshya collection."
            descriptionClassName="max-w-xl font-ui text-sm leading-relaxed text-taupe"
            spacing={{ eyebrow: "mb-4", title: "mb-4", description: "" }}
          >
            The <Accent>Saree</Accent> Edit
          </EditorialHeading>

          {count > 1 ? (
            <div className="flex shrink-0 items-center gap-6 border-b border-mist pb-2 font-ui text-[10px] uppercase tracking-[.18em] text-ink">
              <button
                type="button"
                onClick={() => navigate(-1)}
                aria-label="Show previous saree"
                className="group inline-flex items-center gap-2 py-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                <ArrowLeft size={13} aria-hidden="true" className="transition-transform group-hover:-translate-x-0.5" />
                Previous
              </button>
              <span className="h-3 w-px bg-mist" aria-hidden="true" />
              <button
                type="button"
                onClick={() => navigate(1)}
                aria-label="Show next saree"
                className="group inline-flex items-center gap-2 py-2 transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
              >
                Next
                <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="overflow-hidden">
        <div className="grid min-w-0 items-end gap-5 md:grid-cols-[minmax(0,1.2fr)_minmax(0,.8fr)] md:gap-6 lg:grid-cols-[minmax(0,.72fr)_minmax(0,1.18fr)_minmax(0,.72fr)] lg:gap-8">
          {count > 1 ? (
            <div className="hidden min-w-0 self-end lg:grid lg:grid-cols-1">
              <AnimatePresence initial={false} custom={layerCustom} mode="sync">
                <SareePreview
                  key={entries[previousIndex].product.id}
                  entry={entries[previousIndex]}
                  relation="previous"
                  custom={layerCustom}
                  onSelect={() => selectIndex(previousIndex)}
                />
              </AnimatePresence>
            </div>
          ) : null}

          {/* Fixed aspect-ratio stage: both layers stack absolutely inside it,
              so the carousel never reflows while slides dissolve. */}
          <div className="relative min-w-0">
            <div className="relative aspect-[4/5]">
              <AnimatePresence initial={false} custom={layerCustom} mode="sync">
                <ActiveSareeCard
                  key={active.product.id}
                  entry={active}
                  slideNumber={index + 1}
                  slideCount={count}
                  priority={index === 0}
                  custom={layerCustom}
                  onSwipeClick={onActiveClick}
                />
              </AnimatePresence>
            </div>
          </div>

          {count > 1 ? (
            <div className="hidden min-w-0 self-end md:grid md:grid-cols-1">
              <AnimatePresence initial={false} custom={layerCustom} mode="sync">
                <SareePreview
                  key={entries[nextIndex].product.id}
                  entry={entries[nextIndex]}
                  relation="next"
                  custom={layerCustom}
                  onSelect={() => selectIndex(nextIndex)}
                />
              </AnimatePresence>
            </div>
          ) : null}
        </div>
      </div>

      <p
        className="sr-only"
        aria-live={paused ? "polite" : "off"}
        aria-atomic="true"
      >
        Showing {active.product.name}, slide {index + 1} of {count}.
      </p>

      <footer className="mt-8 flex flex-col gap-6 border-t border-mist pt-5 sm:flex-row sm:items-center sm:justify-between md:mt-10">
        <div className="flex items-center gap-4" aria-label={`Slide ${index + 1} of ${count}`}>
          <span className="font-display text-xl font-light tabular-nums text-ink">
            {twoDigits(index + 1)}
          </span>
          <span className="font-ui text-[10px] tracking-[.2em] text-taupe">/ {twoDigits(count)}</span>
          <div className="h-px w-20 overflow-hidden bg-mist sm:w-28" aria-hidden="true">
            <div
              className="h-full bg-accent transition-[width] duration-500 motion-reduce:transition-none"
              style={{ width: `${((index + 1) / count) * 100}%` }}
            />
          </div>
        </div>

        <Link
          to={sareeRoute.href}
          className="group inline-flex w-fit items-center gap-2 font-ui text-[10px] uppercase tracking-[.2em] text-ink transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
        >
          Explore Sarees
          <ArrowRight size={13} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </footer>
    </AtelierSection>
  );
}
