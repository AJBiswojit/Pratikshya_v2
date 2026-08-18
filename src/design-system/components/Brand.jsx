/**
 * PRATIKSHYA FASHON — Reusable Brand component.
 *
 * The single rendering seam for the atelier's brand mark across every
 * surface (storefront header, mobile drawer, footer, checkout, admin portal,
 * employee portal, login pages, order confirmation, etc.).
 *
 * It auto-uses the supplied logo asset when present at the canonical path
 * `src/assets/pratikshya_logo.webp` and gracefully falls back to the
 * typographic wordmark when the asset has not yet been materialised on
 * disk. No surface hard-codes its own logo or wordmark: every place reads
 * from this component, so a single drop-in of
 * `src/assets/pratikshya_logo.webp` updates the whole application at
 * once.
 *
 * Visual rules — kept intentionally restrained per the Atelier language:
 *   - The logo is rendered at its native aspect ratio (no stretch, no crop).
 *   - No extra shadows, gradients, glow or background plates are added on
 *     top of the supplied asset; whatever the file contains stands on its
 *     own. Transparency in the source is preserved.
 *   - The component never invents a new mark and never recreates one with
 *     text. The wordmark is a runtime fallback used purely to keep the
 *     brand legible while the supplied asset is not yet on disk — it is
 *     not a substitute for the supplied logo.
 *
 * Variants:
 *   - `mark`      — the supplied logo on its own
 *   - `wordmark`  — the typographic wordmark only (`PRATIKSHYA FASHON`)
 *   - `lockup`    — logo + wordmark together (default)
 *
 * Theme:
 *   - `auto`  — inherit foreground colour from context
 *   - `light` — dark ink on a light/canvas surface (default)
 *   - `dark`  — ivory/gold on the dark ink surface (admin/employee headers)
 *
 * Size:
 *   - `compact` — small inline contexts, social pills, micro surfaces
 *   - `default` — site header wordmark / login card title (the common case)
 *   - `legend`  — possibly larger touchpoints (kept symmetric with default)
 */

import { useRef } from "react";
import { Link } from "react-router-dom";
import { cn } from "../../utils/cn";

/**
 * Vite `import.meta.glob` is the canonical way to reference the optional
 * logo without breaking the build when the asset file is not yet on disk.
 * The build emits an empty map if no file matches the pattern, and the
 * component falls back to the typographic wordmark.
 */
const LOGO_GLOB = import.meta.glob("../../assets/pratikshya_logo.*", {
  eager: true,
  import: "default",
});

const SUPPORTED_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "svg"];

function resolveLogoUrl() {
  for (const key of Object.keys(LOGO_GLOB)) {
    for (const ext of SUPPORTED_EXTENSIONS) {
      if (key.endsWith(`.${ext}`)) return LOGO_GLOB[key];
    }
  }
  return null;
}

const LOGO_URL = resolveLogoUrl();
/** Public constant so other surfaces can point to the canonical place. */
export const BRAND_ASSET_URL = LOGO_URL || "";

const SIZE_SCALE = {
  compact: {
    container: "gap-2",
    markBox: "h-6 w-6 md:h-7 md:w-7",
    markImg: "h-6 md:h-7",
    word: "font-display text-base md:text-lg font-light tracking-tight",
    eyebrow: "font-ui text-[10px] uppercase tracking-[.18em] mt-0.5",
  },
  default: {
    container: "gap-2.5",
    markBox: "h-8 w-8 md:h-9 md:w-9",
    markImg: "h-8 md:h-9",
    word: "font-display text-xl md:text-2xl font-light tracking-tight",
    eyebrow: "font-ui text-[10px] uppercase tracking-[.22em] mt-0.5",
  },
  legend: {
    container: "gap-3",
    markBox: "h-9 w-9 md:h-10 md:w-10",
    markImg: "h-9 md:h-10",
    word: "font-display text-2xl md:text-3xl font-light tracking-tight",
    eyebrow: "font-ui text-[10px] uppercase tracking-[.28em] mt-1",
  },
};

const THEME_TEXT = {
  auto: "",
  light: "text-ink",
  dark: "text-ivory",
};

const THEME_EYEBROW = {
  auto: "text-brass",
  light: "text-brass",
  dark: "text-gold",
};

/**
 * The single image renderer — only mounted when the canonical logo asset
 * is present in `import.meta.glob` (i.e. when the supplied
 * `src/assets/pratikshya_logo.webp` is on disk). Uses object-contain so
 * the supplied mark keeps its native aspect ratio, never distorts or crops.
 */
function BrandMarkImage({ className, alt }) {
  if (!LOGO_URL) return null;
  return (
    <img
      src={LOGO_URL}
      alt={alt}
      className={cn("object-contain", className)}
      draggable={false}
      decoding="async"
    />
  );
}

function BrandWordmark({ className, children }) {
  return (
    <span className={cn("select-none leading-none", className)} aria-hidden={false}>
      {children}
    </span>
  );
}

/**
 * The reusable PRATIKSHYA FASHON brand component.
 *
 * Render modes are:
 *   - `mark`     — only the supplied logo image
 *   - `wordmark` — only the typographic brand text
 *   - `lockup`   — image + wordmark together (default; falls back to the
 *                  wordmark when the supplied asset is not on disk)
 *
 * Render anchors:
 *   - When `to` is provided, the entire root becomes a `<Link>` so the
 *     brand mark consistently returns the customer to `/`.
 *   - Otherwise the root renders as the element passed via `as` (default
 *     `span`) — handy for the footer `<h4>`, login headers etc.
 */
export default function Brand({
  to,
  as: As = "span",
  variant = "lockup",
  size = "default",
  theme = "light",
  wordmark = "PRATIKSHYA FASHON",
  subtitle,
  eyebrow,
  subtitleClassName = "",
  className = "",
  alt = "PRATIKSHYA FASHON",
  ...rest
}) {
  const rootRef = useRef(null);

  const sizeScale = SIZE_SCALE[size] ?? SIZE_SCALE.default;
  const themeText = THEME_TEXT[theme] ?? THEME_TEXT.light;
  const themeEyebrow = THEME_EYEBROW[theme] ?? THEME_EYEBROW.light;

  const assetAvailable = Boolean(LOGO_URL);
  // The supplied logo is the canonical brand mark; the typographic wordmark
  // sits beside it as part of the same lockup. The `mark` variant shows the
  // mark alone, `wordmark` shows the typographic text alone, and `lockup`
  // (the default, used by the storefront header/footer and every portal)
  // shows both together. A missing asset simply means the mark slot is
  // empty — the wordmark never pretends to *be* the logo, it accompanies it.
  const showMark = variant !== "wordmark" && assetAvailable;
  const showWord = variant === "wordmark" || variant === "lockup";
  const showCaption = (subtitle || eyebrow) && (variant === "lockup" || variant === "wordmark");

  const content = (
    <span
      ref={rootRef}
      className={cn(
        "inline-flex items-center",
        sizeScale.container,
        themeText
      )}
      {...rest}
    >
      {showMark ? (
        <BrandMarkImage
          className={cn("shrink-0", sizeScale.markImg)}
          alt={alt}
        />
      ) : null}
      {showWord ? (
        <span className="flex flex-col leading-none">
          <BrandWordmark className={sizeScale.word}>{wordmark}</BrandWordmark>
        </span>
      ) : null}
      {showCaption ? (
        <span className="flex flex-col leading-none">
          {subtitle ? (
            <span className={cn(sizeScale.eyebrow, themeEyebrow, subtitleClassName)}>
              {subtitle}
            </span>
          ) : null}
          {eyebrow ? (
            <span className={cn(sizeScale.eyebrow, themeEyebrow)}>{eyebrow}</span>
          ) : null}
        </span>
      ) : null}
      {showMark ? <span className="sr-only">{wordmark}</span> : null}
    </span>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label={wordmark}
        className={cn(
          "inline-flex shrink-0 items-center focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-accent",
          className // hover colours etc. apply to the outermost link surface
        )}
      >
        {content}
      </Link>
    );
  }

  return (
    <As className={cn("inline-flex items-center", className)} aria-label={wordmark}>
      {content}
    </As>
  );
}

Brand.displayName = "Brand";

/** Convenience wrapper for the storefront mark + wordmark link. */
export function BrandLink(props) {
  return <Brand {...props} />;
}

/** Convenience wrapper for the dark-surface contexts (admin/employee
 *  portals and the footer), which automatically drift typography into
 *  ivory + gold. */
export function DarkBrand(props) {
  return <Brand {...props} theme="dark" />;
}

Brand.SIZE_SCALE = SIZE_SCALE;
Brand.SIZE_VALUES = Object.keys(SIZE_SCALE);
Brand.THEME_VALUES = Object.keys(THEME_TEXT);
Brand.VARIANT_VALUES = ["mark", "wordmark", "lockup"];
Brand.ASSET_URL = BRAND_ASSET_URL;

export { BRAND_ASSET_URL as DEFAULT_BRAND_ASSET_URL };
