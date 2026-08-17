/**
 * PRATIKSHYA FASHON — Atelier Motion
 *
 * The motion language is deliberately quiet: content fades up once as it
 * enters the viewport, imagery breathes on hover, colour changes are instant
 * but eased. Nothing loops, nothing bounces.
 *
 * Every helper here respects `prefers-reduced-motion`.
 */

import { useReducedMotion } from "framer-motion";

/** Durations, in seconds, used by Framer Motion. */
export const duration = {
  reveal: 0.6,
  hero: 1.2,
  /** Route change — shorter than a reveal so navigation never feels held up. */
  page: 0.35,
};

/** Durations, as Tailwind classes, used by CSS transitions. */
export const durationClass = {
  crossfade: "duration-500",
  image: "duration-700",
};

/** Distance (px) an element travels while fading up. */
export const distance = {
  short: 20,
  medium: 25,
  long: 30,
  /** Route change — a hint of travel, not a slide. */
  page: 12,
};

/* ------------------------------------------------------------------ */
/* Framer Motion presets                                               */
/* ------------------------------------------------------------------ */

/** Scroll reveal — fade up once, on enter. */
export const fadeUp = (travel = distance.short, seconds = duration.reveal) => ({
  initial: { opacity: 0, y: travel },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: seconds },
});

/** Entrance reveal — plays immediately on mount (hero). */
export const enter = (travel = distance.long, seconds = duration.hero) => ({
  initial: { opacity: 0, y: travel },
  animate: { opacity: 1, y: 0 },
  transition: { duration: seconds },
});

/**
 * Route transition — the fade a page plays as it is swapped in and out.
 *
 * Shaped for an `AnimatePresence` with `mode="wait"`, which is why `exit`
 * is deliberately faster than `animate`: the outgoing page must clear
 * before the incoming one starts.
 */
export const pageTransition = (travel = distance.page, seconds = duration.page) => ({
  initial: { opacity: 0, y: travel },
  animate: { opacity: 1, y: 0, transition: { duration: seconds, ease: "easeOut" } },
  exit: { opacity: 0, y: 0, transition: { duration: seconds * 0.6, ease: "easeIn" } },
});

const staticPage = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0, transition: { duration: 0 } },
  exit: { opacity: 1, y: 0, transition: { duration: 0 } },
};

const staticReveal = {
  initial: { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0 },
};

const staticEnter = {
  initial: { opacity: 1, y: 0 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0 },
};

/**
 * Scroll-reveal props for a `motion` element, disabled when the visitor has
 * asked for reduced motion.
 */
export function useReveal(travel = distance.short, seconds = duration.reveal) {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ? staticReveal : fadeUp(travel, seconds);
}

/**
 * Mount-entrance props for a `motion` element, disabled when the visitor has
 * asked for reduced motion.
 */
export function useEnter(travel = distance.long, seconds = duration.hero) {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ? staticEnter : enter(travel, seconds);
}

/**
 * Route-transition props, disabled when the visitor has asked for reduced
 * motion. Used by `PageTransition`.
 */
export function usePageTransition(travel = distance.page, seconds = duration.page) {
  const shouldReduceMotion = useReducedMotion();
  return shouldReduceMotion ? staticPage : pageTransition(travel, seconds);
}

/* ------------------------------------------------------------------ */
/* CSS transition presets                                              */
/* ------------------------------------------------------------------ */

export const transition = {
  /** Links and text colour changes. */
  colors: "transition-colors",
  /** Buttons and chips (background, colour and border together). */
  all: "transition-all",
  /** Hover image crossfade. */
  crossfade: "transition-opacity duration-500",
  /** Image scale. */
  image: "transition-transform duration-700",
};

/** Hover zoom applied to imagery inside a `group`. */
export const zoom = {
  /** Wide and editorial imagery. */
  soft: "transition-transform duration-700 group-hover:scale-[1.04]",
  /** Portrait tiles and product imagery. */
  strong: "transition-transform duration-700 group-hover:scale-[1.05]",
};

export const motionTokens = {
  duration,
  durationClass,
  distance,
  fadeUp,
  enter,
  pageTransition,
  transition,
  zoom,
};

export default motionTokens;
