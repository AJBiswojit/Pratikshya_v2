/**
 * PRATIKSHYA FASHON — Atelier Spacing & Layout
 *
 * The page breathes on a small number of repeated rhythms. These are the
 * exact values used by the Phase 1 landing page.
 */

/** Horizontal page gutter. Applied by `AtelierSection`. */
export const pagePadding = "px-6 md:px-12";

/** Vertical rhythm of a section. */
export const rhythm = {
  /** Editorial breathing room — hero-adjacent and manifesto sections. */
  spacious: "py-32 md:py-48",
  /** The default section rhythm. */
  default: "py-24 md:py-36",
  /** Tighter rhythm for paired content blocks. */
  compact: "py-24 md:py-32",
  /** No vertical rhythm (full-bleed hero). */
  none: "",
};

/** Centred container widths. */
export const container = {
  prose: "max-w-3xl mx-auto",
  narrow: "max-w-5xl mx-auto",
  content: "max-w-6xl mx-auto",
  wide: "max-w-7xl mx-auto",
  full: "",
};

/** Grid gaps. */
export const gap = {
  /** Image / product tile grids. */
  tile: "gap-6 md:gap-8",
  /** Two-column editorial grids. */
  editorial: "gap-12 md:gap-20",
  /** Footer and link columns. */
  column: "gap-10",
  /** Chip rows. */
  chip: "gap-2",
};

/** Repeated grid definitions. */
export const grid = {
  tiles: "grid md:grid-cols-3",
  pair: "grid md:grid-cols-2",
  products: "grid grid-cols-2 md:grid-cols-4",
  footer: "grid md:grid-cols-4",
};

/**
 * Header height, used by anything that must clear the fixed navigation.
 *
 * `height` is the physical height of the fixed header (`h-16 md:h-20`).
 * `offset` clears that fixed header by pushing the first in-flow section
 * down by the same amount. It is expressed as a *margin-top* rather than
 * padding: the hero carousel's plates are absolutely positioned
 * (`inset-0`) against the section's padding box, so padding would leave
 * the image running up behind the header. A margin moves the whole section
 * (and its absolutely-positioned children) below the header cleanly.
 */
export const header = {
  height: "h-16 md:h-20",
  offset: "mt-16 md:mt-20",
};

export const spacing = {
  pagePadding,
  rhythm,
  container,
  gap,
  grid,
  header,
};

export default spacing;
