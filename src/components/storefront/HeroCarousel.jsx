/**
 * PRATIKSHYA FASHON — Landing hero carousel.
 *
 * An image-first, editorial carousel for the landing page. The fashion
 * photography occupies roughly 85–95% of the frame; eyebrow, a restrained
 * display headline, a short standfirst and a single CTA sit in a
 * bottom-left overlay. Motion is a calm crossfade with a very subtle
 * scale (Ken Burns), auto-advancing on a 5.5s cadence. It pauses on hover,
 * supports keyboard, touch swipe and `prefers-reduced-motion`, and preloads
 * the next plate so a frame never goes blank.
 *
 * It draws all five plates from the existing PRATIKSHYA media architecture —
 * HOME_HERO register records through `mediaRepository` / `mediaResolver` and
 * the existing `PratikshyaImage` component. No image address is authored in
 * this component; there is no second repository and there are no external URLs.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Pause, Play } from "lucide-react";
import PratikshyaImage from "../PratikshyaImage";
import {
  resolveHeroSlideImage,
  resolveHomepageHeroMedia,
} from "../../services/media/mediaResolver";
import { resolveCategoryRoute, resolveCollectionRoute } from "../../services/taxonomyRouting";
import { AtelierButton, header as headerSpacing } from "../../design-system";
import { cn } from "../../utils/cn";

/** Calm, premium cadence — fashion sites should never feel hurried. */
const AUTOPLAY_INTERVAL_MS = 5500;
const CROSSFADE_MS = 900;

/**
 * Editorial copy and CTAs remain unchanged. Each `image` is resolved by its
 * stable slide theme from the ordered HOME_HERO register, so the carousel and
 * the media audit consume the same canonical five-record set.
 */
const buildSlides = (heroMedia) => {
  const usedIds = new Set();
  const festiveEditHref = resolveCollectionRoute("festive-edit")?.href ?? "/collections/festive-edit";
  const lehengasHref = resolveCategoryRoute("lehengas")?.href ?? "/women/bridal-lehengas";
  const sareesHref = resolveCategoryRoute("sarees")?.href ?? "/women/silk-sarees";
  const bridalHref = resolveCategoryRoute("bridal-couture")?.href ?? "/bridal";
  const newArrivalsHref = resolveCollectionRoute("new-arrivals")?.href ?? "/collections/new-arrivals";
  return [
    {
      id: "festive-edit",
      eyebrow: "New Collection",
      title: "The Festive Edit",
      body: "Timeless silhouettes crafted for the celebrations that matter most.",
      cta: { label: "Explore Edit", href: festiveEditHref },
      image: resolveHeroSlideImage("festive", { heroMedia, usedIds }),
      objectPosition: "52% center",
      tone: "light",
    },
    {
      id: "bridal",
      eyebrow: "Bridal Couture",
      title: "Made for Your Moment",
      body: "Statement craftsmanship and heirloom detail for the day you'll always remember.",
      cta: { label: "Shop Lehengas", href: lehengasHref },
      image: resolveHeroSlideImage("bridal", { heroMedia, usedIds }),
      objectPosition: "48% center",
      tone: "dark",
    },
    {
      id: "heritage-saree",
      eyebrow: "Heritage Weaves",
      title: "The Art of the Saree",
      body: "Banarasi, Pato and silk — traditional craft, reimagined for today.",
      cta: { label: "Shop Sarees", href: sareesHref },
      image: resolveHeroSlideImage("heritage", { heroMedia, usedIds }),
      objectPosition: "58% center",
      tone: "light",
    },
    {
      id: "couple",
      eyebrow: "The Celebration Edit",
      title: "Dressed, Together",
      body: "Coordinated festive wardrobes for weddings, receptions and every gathering around them.",
      cta: { label: "Shop Bridal", href: bridalHref },
      image: resolveHeroSlideImage("celebration", { heroMedia, usedIds }),
      objectPosition: "52% center",
      tone: "dark",
    },
    {
      id: "new-arrivals",
      eyebrow: "New Arrivals",
      title: "Your Next Signature Look",
      body: "The latest pieces to arrive from the PRATIKSHYA atelier.",
      cta: { label: "Discover Now", href: newArrivalsHref },
      image: resolveHeroSlideImage("arrivals", { heroMedia, usedIds }),
      objectPosition: "62% center",
      tone: "dark",
    },
  ];
};

const usePrefersReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
};

/** Resolve a registered image's URL so the next plate can be preloaded. */
const resolveImageSrc = (image) => {
  if (!image) return null;
  if (typeof image === "string") return image;
  return image.src || image.fallback || null;
};

export default function HeroCarousel({ heroMedia }) {
  const slides = useMemo(() => buildSlides(heroMedia), [heroMedia]);
  const count = slides.length;

  /* ------------------------------------------------------------------ */
  /* Development-only hero runtime diagnostic (debug phase).             */
  /*                                                                     */
  /* Reflects the ACTUAL runtime resolution chain — what the resolver    */
  /* returns through the existing media architecture, not just the       */
  /* ingested manifest. Gated to dev so it is tree-shaken from a         */
  /* production build and never reaches a customer.                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!import.meta.env?.DEV) return;
    try {
      const resolved = resolveHomepageHeroMedia(heroMedia);
      /* Per-slide detail required by the debug trace: */
      const detail = resolved.map((m) => ({
        id: m.id,
        fileName: m.fileName || m.currentFilename || null,
        filePath: m.filePath || m.url || null,
        usage: (m.usageRoles || []).join(",") || null,
        status: m.status,
        source: m.source,
        sortOrder: m.sortOrder,
      }));
      /* Assert the resolver delivers exactly five distinct plates. */
      const expected = ["hero001.avif", "hero002.avif", "hero003.avif", "hero004.avif", "hero005.avif"];
      const names = resolved.map((m) => m.fileName || m.currentFilename || null);
      const ok = resolved.length === 5 && expected.every((n, i) => names[i] === n);
      // eslint-disable-next-line no-console
      console.log(
        [
          "%cHERO RUNTIME MEDIA",
          `count: ${resolved.length}`,
          ...names.map((n, i) => `  ${i + 1}. ${n}`),
          ok ? "RESOLVED: 5/5 (OK)" : `MISMATCH — expected 5 hero001-005, got ${resolved.length}`,
        ].join("\n"),
        "color:#b08d57;font-weight:bold"
      );
      // eslint-disable-next-line no-console
      console.table(detail);
    } catch {
      /* Diagnostic only — never interfere with rendering. */
    }
  }, [heroMedia]);

  const [index, setIndex] = useState(0);
  const [pausedByUser, setPausedByUser] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef(null);

  const reducedMotion = usePrefersReducedMotion();

  const go = useCallback(
    (next) => {
      setIndex((current) => {
        const target = (next + count) % count;
        if (target === current) return current;
        setIsTransitioning(true);
        if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
        transitionTimer.current = window.setTimeout(
          () => setIsTransitioning(false),
          reducedMotion ? 0 : CROSSFADE_MS
        );
        return target;
      });
    },
    [count, reducedMotion]
  );

  const next = useCallback(() => go(index + 1), [go, index]);
  const previous = useCallback(() => go(index - 1), [go, index]);

  const paused = pausedByUser || hovering || reducedMotion;

  /* Autoplay. The interval is reset whenever the slide changes or the
     paused state flips, so hovering freezes the cadence in place. */
  useEffect(() => {
    if (paused || count <= 1) return undefined;
    const timer = window.setInterval(() => {
      setIndex((current) => {
        setIsTransitioning(true);
        if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
        transitionTimer.current = window.setTimeout(
          () => setIsTransitioning(false),
          reducedMotion ? 0 : CROSSFADE_MS
        );
        return (current + 1) % count;
      });
    }, AUTOPLAY_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [paused, count, index, reducedMotion]);

  useEffect(
    () => () => {
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current);
    },
    []
  );

  /* Keyboard: arrows navigate, Space / p toggles a user pause. */
  const onKeyDown = (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previous();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      next();
    } else if (event.key === " " || event.key === "p" || event.key === "P") {
      event.preventDefault();
      setPausedByUser((value) => !value);
    }
  };

  /* Touch swipe — horizontal, with a vertical threshold so page scroll
     is never hijacked. */
  const touchStart = useRef(null);
  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };
  const onTouchEnd = (event) => {
    if (!touchStart.current) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.current.x;
    const dy = touch.clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) next();
      else previous();
    }
  };

  /* Preload the next plate so the crossfade never crosses into a blank
     frame. We preload at most one image ahead. */
  const nextSrc = resolveImageSrc(slides[(index + 1) % count]?.image);
  useEffect(() => {
    if (!nextSrc) return undefined;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.href = nextSrc;
    document.head.appendChild(link);
    return () => {
      link.remove();
    };
  }, [nextSrc]);

  const active = slides[index];
  const toneOnDark = active.tone === "dark";

  return (
    <section
      aria-roledescription="carousel"
      aria-label="PRATIKSHYA FASHON featured collections"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className={`group relative ${headerOffsetCls} h-[70vh] min-h-[30rem] overflow-hidden bg-ink outline-none md:h-[78vh] md:min-h-[34rem] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset`}
    >
      {/* Plates ----------------------------------------------------- */}
      {slides.map((slide, i) => {
        const isActive = i === index;
        return (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0",
              reducedMotion
                ? "transition-opacity duration-0"
                : "transition-opacity duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
              isActive ? "opacity-100" : "opacity-0 pointer-events-none"
            )}
            aria-hidden={!isActive}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}: ${slide.title}`}
          >
            <PratikshyaImage
              image={slide.image}
              alt={slide.image?.alt ?? `${slide.title} — PRATIKSHYA FASHON`}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "low"}
              objectPosition={slide.objectPosition}
              sizes="100vw"
              className={cn(
                "absolute inset-0 h-full w-full object-cover will-change-transform",
                !reducedMotion && isActive && "animate-[heroKenBurns_6500ms_ease-out_forwards]",
                !reducedMotion && !isActive && "scale-105"
              )}
            />
          </div>
        );
      })}

      {/* Legibility scrim — a restrained bottom-left wash only. The
          photography stays visible across the rest of the frame. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(20,16,12,0.55)_0%,rgba(20,16,12,0.35)_28%,rgba(20,16,12,0.08)_55%,transparent_75%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[linear-gradient(to_top,rgba(20,16,12,0.65)_0%,rgba(20,16,12,0.25)_35%,transparent_60%)]"
      />

      {/* Editorial copy -------------------------------------------- */}
      <div className="pointer-events-none relative z-10 mx-auto flex h-full max-w-7xl items-end px-6 pb-14 md:items-center md:px-12 md:pb-0">
        <div
          className={cn(
            "pointer-events-auto max-w-xl transition-all duration-700",
            reducedMotion ? "" : "motion-reduce:transition-none",
            isTransitioning ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
          )}
        >
          <p
            className={cn(
              "mb-4 font-ui text-[11px] uppercase leading-none md:text-xs",
              "tracking-[0.4em]",
              toneOnDark ? "text-blush" : "text-blush"
            )}
          >
            {active.eyebrow}
          </p>
          <h1
            className={cn(
              "font-display font-light leading-[1.02] tracking-tight text-ivory",
              "text-[2rem] sm:text-5xl md:text-[3.5rem] lg:text-[4.25rem]"
            )}
          >
            {active.title}
          </h1>
          <p
            className={cn(
              "mt-4 max-w-md font-ui text-sm leading-relaxed text-ivory/85 md:text-[15px]",
              toneOnDark ? "text-pearl/90" : "text-ivory/85"
            )}
          >
            {active.body}
          </p>
          <div className="mt-8">
            <AtelierButton
              href={active.cta.href}
              variant="inverse"
              size="md"
              className="pointer-events-auto"
            >
              {active.cta.label}
            </AtelierButton>
          </div>
        </div>
      </div>

      {/* Controls + indicator -------------------------------------- */}
      <div className="absolute inset-x-0 bottom-0 z-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 pb-6 md:px-12 md:pb-8">
          {/* Prev / next */}
          <div className="flex items-center gap-2">
            <CarouselControl label="Previous slide" onClick={previous}>
              <ArrowLeft size={16} strokeWidth={1.5} />
            </CarouselControl>
            <CarouselControl
              label={pausedByUser ? "Play slideshow" : "Pause slideshow"}
              onClick={() => setPausedByUser((value) => !value)}
              aria-pressed={pausedByUser}
            >
              {pausedByUser ? (
                <Play size={15} strokeWidth={1.5} />
              ) : (
                <Pause size={15} strokeWidth={1.5} />
              )}
            </CarouselControl>
            <CarouselControl label="Next slide" onClick={next}>
              <ArrowRight size={16} strokeWidth={1.5} />
            </CarouselControl>
          </div>

          {/* Counter + progress */}
          <div className="flex items-center gap-4">
            <span
              className="font-ui text-[11px] tabular-nums tracking-[0.25em] text-ivory/80 md:text-xs"
              aria-live="polite"
              aria-atomic="true"
            >
              <span className="text-ivory">{String(index + 1).padStart(2, "0")}</span>
              <span className="mx-2 text-ivory/40">/</span>
              <span className="text-ivory/60">{String(count).padStart(2, "0")}</span>
            </span>
            <div
              className="hidden h-px w-28 overflow-hidden bg-ivory/25 sm:block md:w-40"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={count}
              aria-valuenow={index + 1}
              aria-label={`Slide ${index + 1} of ${count}`}
            >
              <div
                key={index}
                className={cn(
                  "h-full bg-gold",
                  !paused && !reducedMotion
                    ? "animate-[heroProgress_5500ms_linear_forwards]"
                    : "w-0"
                )}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Slide dots (subtle) */}
      <div className="absolute right-6 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-3 md:flex">
        {slides.map((slide, i) => (
          <button
            key={slide.id}
            type="button"
            aria-label={`Go to slide ${i + 1}: ${slide.title}`}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
            className="group/dot flex items-center justify-end py-1"
          >
            <span
              className={cn(
                "block h-px transition-all duration-500",
                i === index ? "w-8 bg-gold" : "w-4 bg-ivory/40 group-hover/dot:w-6 group-hover/dot:bg-ivory/70"
              )}
            />
          </button>
        ))}
      </div>

      {/* Keyframes for the Ken Burns and progress bar. Scoped so they
          never leak outside the hero. */}
      <style>{`
        @keyframes heroKenBurns {
          from { transform: scale(1.06); }
          to   { transform: scale(1); }
        }
        @keyframes heroProgress {
          from { transform: translateX(-100%); width: 100%; }
          to   { transform: translateX(0); width: 100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          [class*="animate-[heroKenBurns"],
          [class*="animate-[heroProgress"] { animation: none !important; }
        }
      `}</style>
    </section>
  );
}

/**
 * Margin-top that clears the fixed navigation (h-16 md:h-20). Drawn from
 * the shared `header.offset` token so it stays in sync with the header's
 * real height. It is a *margin*, not padding, because the slide plates are
 * absolutely positioned (`absolute inset-0`): padding would still let the
 * image run up behind the fixed header, margin pushes the whole hero —
 * including those plates — to start exactly at the header's bottom edge.
 */
const headerOffsetCls = headerSpacing.offset;

function CarouselControl({ label, onClick, children, ...rest }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex h-9 w-9 items-center justify-center border border-ivory/30 text-ivory/80 transition-colors hover:border-ivory hover:bg-ivory/10 hover:text-ivory focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-ink md:h-10 md:w-10"
      {...rest}
    >
      {children}
    </button>
  );
}
