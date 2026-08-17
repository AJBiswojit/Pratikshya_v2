import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, Minus, Play, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PratikshyaImage from "../PratikshyaImage";
import MediaVideo from "../media/MediaVideo";
import { MEDIA_TYPES } from "../../config/mediaTypes";
import { useProductSlides } from "../../hooks/useMedia";
import { cn } from "../../utils/cn";

const VIEW_LABELS = {
  front: "Front",
  side: "Side",
  back: "Back",
  left: "Left",
  right: "Right",
  "left-side": "Left Side",
  "right-side": "Right Side",
  close: "Close",
  closeup: "Close Up",
  "close-up": "Close Up",
  detail: "Detail",
  "front-close": "Front Close",
  "front-detail": "Front Detail",
  "left-side-detail": "Left Detail",
  "right-side-detail": "Right Detail",
  "multiple-front": "Front",
  multiple: "View",
};

const getViewLabel = (slide) => {
  if (!slide) return "";
  const view = slide.view ? String(slide.view).toLowerCase() : "";
  if (VIEW_LABELS[view]) return VIEW_LABELS[view];
  if (view) return view.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  // fallback from role
  if (slide.role === "COVER") return "Front";
  return `View ${slide.view || ""}`.trim();
};

/**
 * A thumbnail with view label — premium Atelier style.
 * Preserves keyboard accessibility and prevents horizontal overflow.
 */
function GalleryThumbnail({ slide, index, active, productName, onSelect, className = "" }) {
  const video = slide?.type === MEDIA_TYPES.VIDEO;
  const label = getViewLabel(slide);

  return (
    <button
      type="button"
      aria-label={`${label || `View ${index + 1}`} of ${productName}`}
      aria-current={active ? "true" : undefined}
      onClick={() => onSelect(index)}
      className={cn(
        "group/thumb relative flex h-[5.5rem] w-[4.25rem] shrink-0 flex-col overflow-hidden bg-surface outline-none transition-all",
        "focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
        active ? "ring-1 ring-ink opacity-100" : "opacity-65 hover:opacity-100 hover:ring-1 hover:ring-mist",
        className
      )}
    >
      <div className="relative flex-1 overflow-hidden">
        {slide?.image ? (
          <PratikshyaImage
            image={slide.image}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover"
            sizes="68px"
          />
        ) : (
          <span className="flex h-full w-full items-center justify-center bg-ink" aria-hidden="true" />
        )}
        {video ? (
          <span className="absolute inset-0 flex items-center justify-center bg-ink/35 text-ivory" aria-hidden="true">
            <Play size={12} strokeWidth={1.5} />
          </span>
        ) : null}
        {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-accent" /> : null}
      </div>
      <span className="block truncate bg-canvas px-1 py-1 font-ui text-[8px] uppercase tracking-[.14em] text-cocoa">
        {label || `View ${index + 1}`}
      </span>
    </button>
  );
}

function ImageViewer({ product, images, slides, initialIndex, onClose, onIndexChange }) {
  const [index, setIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const closeRef = useRef(null);
  const previousFocus = useRef(document.activeElement);

  const show = useCallback(
    (nextIndex) => {
      const bounded = (nextIndex + images.length) % images.length;
      setIndex(bounded);
      setZoom(1);
      onIndexChange(bounded);
    },
    [images.length, onIndexChange]
  );

  useEffect(() => {
    closeRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [onClose]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") show(index - 1);
      if (event.key === "ArrowRight") show(index + 1);
      if (event.key === "+" || event.key === "=") setZoom(2);
      if (event.key === "-") setZoom(1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, onClose, show]);

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} image viewer`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex flex-col bg-ink text-ivory"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-white/15 px-4 sm:px-6">
        <p className="font-ui text-[10px] uppercase tracking-[.2em] text-ash">
          {getViewLabel(slides?.[index]) || `${index + 1} / ${images.length}`}
        </p>
        <p className="hidden max-w-[50vw] truncate font-display text-lg sm:block">{product.name}</p>
        <div className="flex items-center gap-1">
          <button
            data-viewer-control
            type="button"
            aria-label={zoom === 1 ? "Zoom in" : "Zoom out"}
            onClick={() => setZoom((value) => (value === 1 ? 2 : 1))}
            className="p-3 text-ivory transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          >
            {zoom === 1 ? <Plus size={18} /> : <Minus size={18} />}
          </button>
          <button
            data-viewer-control
            ref={closeRef}
            type="button"
            aria-label="Close image viewer"
            onClick={onClose}
            className="p-3 text-ivory transition-colors hover:text-gold focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-auto">
        <button
          data-viewer-control
          type="button"
          aria-label="Previous image"
          onClick={() => show(index - 1)}
          className="fixed left-3 top-1/2 z-10 flex h-11 w-11 items-center justify-center bg-ink/65 text-ivory transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold sm:left-6"
        >
          <ChevronLeft size={20} />
        </button>

        <div className={cn("flex min-h-full items-center justify-center p-5 sm:p-16", zoom > 1 && "items-start justify-start")}>
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
              "mx-auto flex items-center justify-center transition-[width] duration-500",
              zoom === 1 ? "h-full max-h-[calc(100vh-12rem)] w-full" : "w-[180vw] sm:w-[130vw]"
            )}
          >
            <PratikshyaImage
              image={images[index]}
              alt={`${product.name}, ${getViewLabel(slides?.[index]) || `view ${index + 1}`}`}
              className={cn(
                zoom === 1 ? "h-auto w-auto max-h-[calc(100vh-12rem)] max-w-full object-contain" : "h-auto w-full object-contain"
              )}
              loading="eager"
              sizes={zoom === 1 ? "100vw" : "180vw"}
            />
          </motion.div>
        </div>

        <button
          data-viewer-control
          type="button"
          aria-label="Next image"
          onClick={() => show(index + 1)}
          className="fixed right-3 top-1/2 z-10 flex h-11 w-11 items-center justify-center bg-ink/65 text-ivory transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-1 focus-visible:outline-gold sm:right-6"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex h-24 shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-white/15 px-4">
        {slides.map((slide, imageIndex) => (
          <button
            key={`${slide.id ?? imageIndex}`}
            onClick={() => show(imageIndex)}
            className={cn(
              "relative h-16 w-12 shrink-0 overflow-hidden border bg-white/10",
              imageIndex === index ? "border-gold" : "border-white/15 opacity-70 hover:opacity-100"
            )}
          >
            <PratikshyaImage image={slide.image} alt="" className="h-full w-full object-cover" sizes="48px" />
            <span className="absolute bottom-0 left-0 right-0 bg-ink/70 px-1 py-0.5 text-center font-ui text-[7px] uppercase text-ivory">
              {getViewLabel(slide)}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/**
 * Phase 21.6: Premium product gallery that understands grouped views.
 * - Front / Side / Back / Detail ordering from viewScore
 * - View labels under thumbnails
 * - Smooth switching, responsive, keyboard accessible, no horizontal overflow
 * - Preserves Atelier design, only improves gallery UX
 */
export default function ProductGallery({ product }) {
  const slides = useProductSlides(product);

  const items = useMemo(
    () =>
      slides.length
        ? slides
        : [
            {
              id: `${product.id}-empty`,
              type: MEDIA_TYPES.IMAGE,
              title: product.name,
              alt: product.name,
              image: product.image ?? null,
              src: null,
              poster: "",
              view: "front",
              groupKey: product.id,
              viewScore: 0,
            },
          ],
    [slides, product.id, product.image, product.name]
  );

  // Ensure items are sorted by viewScore for premium ordering: front, side, back, detail
  const orderedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      const scoreA = a.viewScore ?? 99;
      const scoreB = b.viewScore ?? 99;
      if (scoreA !== scoreB) return scoreA - scoreB;
      return 0;
    });
  }, [items]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => {
    setActiveIndex(0);
    setViewerOpen(false);
  }, [product.id]);

  const safeIndex = Math.min(activeIndex, orderedItems.length - 1);
  const active = orderedItems[safeIndex];
  const isVideo = active?.type === MEDIA_TYPES.VIDEO;

  const viewerData = useMemo(() => {
    const filtered = orderedItems.filter((item) => item.type !== MEDIA_TYPES.VIDEO && item.image);
    return {
      images: filtered.map((item) => item.image),
      slides: filtered,
    };
  }, [orderedItems]);

  const viewerIndex = Math.max(
    0,
    orderedItems.slice(0, safeIndex).filter((item) => item.type !== MEDIA_TYPES.VIDEO && item.image).length
  );

  const show = (index) => setActiveIndex((index + orderedItems.length) % orderedItems.length);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  const onTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 45) show(safeIndex + (distance < 0 ? 1 : -1));
    touchStart.current = null;
  };

  return (
    <div className="md:sticky md:top-24 md:self-start">
      <div className="flex flex-col-reverse gap-4 sm:flex-row md:gap-5">
        {/* Thumbnails — premium spacing, no horizontal overflow on desktop */}
        <div className="flex gap-2 overflow-x-auto pb-2 sm:w-[4.8rem] sm:flex-col sm:overflow-visible sm:pb-0">
          {orderedItems.map((item, index) => (
            <GalleryThumbnail
              key={`${item.id}-${index}`}
              slide={item}
              index={index}
              active={index === safeIndex}
              productName={product.name}
              onSelect={show}
            />
          ))}
        </div>

        {/* Main stage */}
        <div
          className="group relative min-w-0 flex-1 overflow-hidden bg-surface aspect-[4/5] max-h-[72svh] md:max-h-none"
          onTouchStart={(event) => {
            touchStart.current = event.touches[0].clientX;
          }}
          onTouchEnd={onTouchEnd}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={safeIndex}
              initial={{ opacity: 0.45, scale: 0.99 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0.2, scale: 1.01 }}
              transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
              className="absolute inset-0"
            >
              {isVideo ? (
                <MediaVideo
                  src={active.src}
                  poster={active.poster}
                  posterImage={active.image}
                  title={active.title || `${product.name} film`}
                />
              ) : (
                <PratikshyaImage
                  image={active?.image}
                  alt={active?.alt || `${product.name}, ${getViewLabel(active)}`}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
                  loading={safeIndex === 0 ? "eager" : "lazy"}
                  fetchPriority={safeIndex === 0 ? "high" : "auto"}
                  sizes="(min-width: 1024px) 48vw, (min-width: 768px) 46vw, 100vw"
                />
              )}
            </motion.div>
          </AnimatePresence>

          {/* View badge on main image — premium Atelier */}
          <div className="pointer-events-none absolute left-3 top-3 flex gap-1.5">
            <span className="bg-ivory/90 px-2.5 py-1 font-ui text-[9px] uppercase tracking-[.18em] text-ink backdrop-blur-sm">
              {getViewLabel(active) || `${safeIndex + 1} / ${orderedItems.length}`}
            </span>
            {active?.groupKey ? (
              <span className="hidden bg-ink/70 px-2 py-1 font-mono text-[8px] uppercase tracking-[.12em] text-ivory backdrop-blur-sm sm:inline">
                {active.groupKey}
              </span>
            ) : null}
          </div>

          {isVideo || !viewerData.images.length ? null : (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              aria-label={`Open full-screen image viewer for ${product.name}`}
              className="absolute inset-0 flex items-end justify-end p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-4px] focus-visible:outline-ivory"
            >
              <span className="flex items-center gap-2 bg-ivory/90 px-3 py-2 font-ui text-[9px] uppercase tracking-[.16em] text-ink backdrop-blur-sm transition-colors group-hover:bg-ink group-hover:text-ivory">
                <Maximize2 size={13} aria-hidden="true" /> View
              </span>
            </button>
          )}

          <div className="pointer-events-none absolute bottom-3 left-3 flex gap-1.5 sm:hidden" aria-hidden="true">
            {orderedItems.map((item, index) => (
              <span key={item.id ?? index} className={cn("h-1 w-1 rounded-full transition-colors", index === safeIndex ? "bg-accent" : "bg-ivory/70")} />
            ))}
          </div>

          {/* Navigation arrows — desktop */}
          <button
            type="button"
            aria-label="Previous view"
            onClick={() => show(safeIndex - 1)}
            className="absolute left-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center bg-ivory/80 text-ink backdrop-blur-sm transition-colors hover:bg-ink hover:text-ivory focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink sm:flex"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Next view"
            onClick={() => show(safeIndex + 1)}
            className="absolute right-2 top-1/2 hidden h-9 w-9 -translate-y-1/2 items-center justify-center bg-ivory/80 text-ink backdrop-blur-sm transition-colors hover:bg-ink hover:text-ivory focus-visible:outline focus-visible:outline-1 focus-visible:outline-ink sm:flex"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">
          {orderedItems.length} {orderedItems.length === 1 ? "view" : "views"} · {orderedItems.map((s) => getViewLabel(s)).join(" · ")}
        </p>
        <p className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">
          {isVideo ? "Press play to watch the film" : "Swipe or select a view"}
        </p>
      </div>

      <AnimatePresence>
        {viewerOpen && viewerData.images.length ? (
          <ImageViewer
            product={product}
            images={viewerData.images}
            slides={viewerData.slides}
            initialIndex={viewerIndex}
            onClose={closeViewer}
            onIndexChange={(nextViewerIndex) => {
              let seen = -1;
              const match = orderedItems.findIndex((item) => {
                if (item.type === MEDIA_TYPES.VIDEO || !item.image) return false;
                seen += 1;
                return seen === nextViewerIndex;
              });
              if (match >= 0) setActiveIndex(match);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
