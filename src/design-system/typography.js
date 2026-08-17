/**
 * PRATIKSHYA FASHON — Atelier Typography
 *
 * Two typefaces carry the whole brand:
 *   display — Cormorant Garamond, used for every headline and product name.
 *   ui      — Instrument Sans, used for eyebrows, navigation, meta and prices.
 *
 * Headline weights are always `font-light`; the italic accent word is the only
 * emphasis device. All scales below are lifted verbatim from the Phase 1
 * landing page.
 */

export const fonts = {
  display: "font-display",
  ui: "font-ui",
};

export const fontFamilies = {
  display: '"Cormorant Garamond", Georgia, serif',
  ui: '"Instrument Sans", system-ui, sans-serif',
};

/* ------------------------------------------------------------------ */
/* Display scale (serif, font-light, tracking-tight)                   */
/* ------------------------------------------------------------------ */

export const display = {
  /** Hero headline — the largest type on the site. */
  hero: "text-6xl md:text-[9rem] lg:text-[11rem] font-light leading-[0.82] tracking-tight",
  /** Full-bleed campaign band headline. */
  campaign: "text-4xl md:text-7xl lg:text-8xl font-light tracking-tight",
  /** Centred brand manifesto headline. */
  manifesto: "text-4xl md:text-6xl lg:text-8xl font-light tracking-tight",
  /** Headline of a dark editorial section. */
  editorial: "text-4xl md:text-6xl lg:text-7xl font-light tracking-tight",
  /** Headline of a feature section. */
  feature: "text-3xl md:text-6xl lg:text-7xl font-light tracking-tight",
  /** Standard section headline. */
  section: "text-4xl md:text-7xl font-light tracking-tight",
  /** Quiet section headline above a grid. */
  subsection: "text-3xl md:text-5xl font-light tracking-tight",
};

/* ------------------------------------------------------------------ */
/* Heading scale (serif, sub-display)                                  */
/* ------------------------------------------------------------------ */

export const heading = {
  /** Panel headline beside an image (fabric stories, collection tiles). */
  xl: "text-3xl md:text-5xl font-light",
  /** Editorial article title. */
  lg: "text-3xl md:text-4xl font-light",
  /** Caption headline laid over imagery. */
  md: "text-2xl md:text-4xl font-light",
  /** Campaign sub-headline. */
  sm: "text-xl md:text-3xl font-light",
  /** Product name. */
  product: "text-base md:text-lg font-light",
  /** Footer brand mark. */
  footer: "text-xl",
};

/* ------------------------------------------------------------------ */
/* Eyebrows, labels and navigation (sans, uppercase, letter-spaced)    */
/* ------------------------------------------------------------------ */

export const eyebrow = {
  /** Hero eyebrow — the widest tracking in the system. */
  hero: "font-ui text-[10px] uppercase tracking-[0.4em]",
  /** Section eyebrow. */
  section: "font-ui text-[10px] uppercase tracking-[.3em]",
  /** Editorial article eyebrow. */
  editorial: "font-ui text-[10px] uppercase tracking-[.25em]",
  /** Inline label above a group of links. */
  label: "font-ui text-[10px] uppercase tracking-[.2em]",
  /**
   * The same micro-label at display weight. The page canvas is already set in
   * Cormorant, so omitting the font utility is what makes it serif. Used for
   * in-page group labels and footer column heads.
   */
  labelDisplay: "text-[10px] uppercase tracking-[.2em]",
  /** Centred brand caption. */
  caption: "font-ui text-xs uppercase tracking-[.3em]",
};

export const nav = {
  brand: "text-xl md:text-2xl font-light tracking-tight",
  link: "font-ui text-[10px] uppercase tracking-[0.15em]",
};

/* ------------------------------------------------------------------ */
/* Body copy                                                           */
/* ------------------------------------------------------------------ */

export const body = {
  /** Hero / manifesto lead paragraph. */
  lead: "font-ui text-sm md:text-base leading-relaxed",
  /** Default sans paragraph. */
  base: "font-ui text-sm",
  /** Editorial paragraph with generous leading. */
  editorial: "font-ui text-sm leading-[1.8]",
  /** Longest-form paragraph (brand story). */
  story: "font-ui text-sm md:text-base leading-[1.9]",
  /** Serif paragraph used inside the fabric panel. */
  serif: "text-sm leading-[1.85]",
  /** Meta line under imagery. */
  caption: "font-ui text-xs",
  /** The same meta line at display weight (captions on dark collection tiles). */
  captionDisplay: "text-xs",
  /** Smallest legible line (legal, tile captions). */
  micro: "font-ui text-[10px]",
};

/* ------------------------------------------------------------------ */
/* Commerce typography                                                 */
/* ------------------------------------------------------------------ */

export const price = {
  row: "flex items-center gap-3 font-ui text-xs",
  current: "text-ink font-medium",
  original: "text-ash line-through",
  discount: "text-accent",
};

/** Uppercase micro-label used by badges. */
export const badge = "text-[9px] uppercase tracking-widest";

export const typography = {
  fonts,
  fontFamilies,
  display,
  heading,
  eyebrow,
  nav,
  body,
  price,
  badge,
};

export default typography;
