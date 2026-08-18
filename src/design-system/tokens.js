/**
 * PRATIKSHYA FASHON — Atelier Design Tokens
 *
 * Every value in this file was extracted from the approved Phase 1 landing
 * page. Nothing here is invented. The Tailwind theme in `src/index.css`
 * mirrors these values as CSS variables so the same palette is available as
 * utility classes (`bg-canvas`, `text-ink`, `border-mist`, ...).
 */

/* ------------------------------------------------------------------ */
/* Colour                                                              */
/* ------------------------------------------------------------------ */

export const colors = {
  /* Surfaces — the universal base page background is white (#FFFFFF) per the
     Atelier visual language. `canvas` carries the page canvas, `surface`
     remains a barely-warm off-white for image plates / inserts so they
     stay visually differentiated from the pure-white canvas without
     introducing a beige tone. */
  canvas: "#ffffff", // page background
  canvasDeep: "#f7f7f7", // end of the soft canvas gradient
  surface: "#fafaf8", // product image plate / insert (subtly off-white)
  ivory: "#fdf8f3", // foreground on dark / inverse surfaces

  /* Ink */
  ink: "#2a2015", // headings, dark sections, primary button
  graphite: "#555555", // long-form body copy on light
  taupe: "#777777", // secondary / meta copy on light
  cocoa: "#6a4e38", // hero body copy
  brass: "#8a6e4a", // navigation links

  /* Accents */
  accent: "#8a3e22", // terracotta — the brand accent
  accentDeep: "#5a2a18", // terracotta gradient end
  gold: "#c9a44c", // accent on dark surfaces
  blush: "#e8d5c4", // campaign subtitle on terracotta
  blushDeep: "#e8c8b8", // campaign body on terracotta

  /* Lines */
  pearl: "#dddddd", // light borders, captions over imagery
  mist: "#dddddd", // navigation hairline — same neutral as `pearl` so it
                     // reads correctly on the new white canvas
  inkLine: "#3a2a1e", // hairline inside dark sections

  /* Neutrals used on dark surfaces */
  ash: "#aaaaaa", // secondary copy on dark, struck-through price
  ashDeep: "#666666", // legal copy in the footer

  /* Absolutes */
  white: "#ffffff",
  black: "#000000",
};

/**
 * Semantic colour class names. Prefer these over raw hex values in JSX.
 */
export const colorClasses = {
  pageBackground: "bg-canvas",
  pageForeground: "text-ink",
  darkSurface: "bg-ink text-ivory",
  accentSurface: "bg-accent text-white",
  bodyCopy: "text-graphite",
  mutedCopy: "text-taupe",
  mutedCopyOnDark: "text-ash",
  hairline: "border-pearl",
  hairlineSoft: "border-mist",
  hairlineOnDark: "border-ink-line",
};

/* ------------------------------------------------------------------ */
/* Surface tones                                                       */
/* ------------------------------------------------------------------ */

/**
 * The four surface treatments used across the landing page.
 */
export const tones = {
  canvas: "", // inherits the page canvas
  fade: "bg-gradient-to-b from-canvas to-canvas-deep",
  ink: "bg-ink text-ivory",
  accent: "bg-gradient-to-r from-accent to-accent-deep text-ivory",
};

/* ------------------------------------------------------------------ */
/* Radius / elevation                                                  */
/* ------------------------------------------------------------------ */

/**
 * The Atelier language is strictly square. Rounded corners are a design
 * restriction, not an option — this token exists so the rule is explicit.
 */
export const radius = {
  none: "rounded-none",
};

export const shadows = {
  none: "",
  /** The single elevation used on the page — the fabric detail plate. */
  editorial: "shadow-2xl shadow-ink/10",
};

/* ------------------------------------------------------------------ */
/* Image system                                                        */
/* ------------------------------------------------------------------ */

export const aspects = {
  portrait: "aspect-[4/5]", // fabric / category tiles
  product: "aspect-[3/4]", // product cards
  landscape: "aspect-[4/3]", // editorial articles
  panorama: "aspect-[4/3] md:aspect-[16/10]", // wide collection tiles
};

export const overlays = {
  /** Legibility scrim under captions placed on imagery. */
  imageBottom: "bg-gradient-to-t from-black/50 to-transparent",
  /** Ink wash from the left of a wide collection tile. */
  inkLeft: "bg-gradient-to-r from-ink/60 to-transparent",
  /** Ink wash from the right of a wide collection tile. */
  inkRight: "bg-gradient-to-l from-ink/60 to-transparent",
  /** Canvas scrim that lets the hero headline sit over the campaign image. */
  heroScrim: "bg-gradient-to-r from-canvas/90 via-canvas/40 to-transparent",
};

/** Fine ivory dot grid used on the campaign band. */
export const dotGrid = {
  backgroundImage: `radial-gradient(circle, ${colors.ivory} 1px, transparent 1px)`,
  backgroundSize: "24px 24px",
};

export const imageTreatment = {
  cover: "w-full h-full object-cover",
  fill: "absolute inset-0 w-full h-full object-cover",
  /** Hero campaign image sits slightly over-scaled behind the scrim. */
  heroScale: "scale-105",
  /** Muted campaign backdrop on the terracotta band. */
  campaignBackdrop:
    "absolute inset-0 h-full w-full object-cover opacity-20 mix-blend-luminosity",
};

export const tokens = {
  colors,
  colorClasses,
  tones,
  radius,
  shadows,
  aspects,
  overlays,
  dotGrid,
  imageTreatment,
};

export default tokens;
