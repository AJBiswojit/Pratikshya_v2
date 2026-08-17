/**
 * PRATIKSHYA AI MIRROR — curated demo preview mapping.
 *
 * These are existing PRATIKSHYA image-manifest plates, not generated assets
 * and not product-record media. Keeping the mapping here means a future
 * provider can replace it without mutating catalogue records or media.
 */

import { imageRef } from "../../data/pratikshyaImageManifest";
import { getVirtualTryOnCategoryKey } from "./aiMirrorEligibility";

const image = (id) => imageRef(id);

/**
 * A small set of deliberately chosen catalogue anchors for the presentation.
 * Every other eligible catalogue product falls back to a matching apparel
 * family below, so operator-added apparel remains usable in the mock demo.
 */
const PRODUCT_PREVIEW_OVERRIDES = {
  "pf-001": { original: "saree-cotton", preview: "saree-traditional", mood: "Heritage drape" },
  "pf-005": { original: "saree-cotton", preview: "saree-ivory-silk", mood: "Ivory silk ceremony" },
  "pf-010": { original: "saree-cotton", preview: "saree-ivory-silk", mood: "Banarasi evening" },
  "pf-023": { original: "women-contemporary", preview: "lehenga-wine", mood: "Velvet bridal moment" },
  "pf-024": { original: "women-contemporary", preview: "lehenga-bridal", mood: "Zardozi bridal moment" },
  "pf-029": { original: "women-contemporary", preview: "lehenga-party", mood: "Sangeet colour" },
  "pf-061": { original: "saree-cotton", preview: "women-contemporary", mood: "Linen daytime edit" },
  "pf-064": { original: "women-contemporary", preview: "lehenga-party", mood: "Festive anarkali edit" },
  "pf-071": { original: "men-kurta", preview: "groom-sherwani", mood: "Groom atelier" },
  "pf-074": { original: "men-kurta", preview: "men-sherwani", mood: "Quiet kurta tailoring" },
  "pf-079": { original: "kids-festive-wear", preview: "kids-festive-wear", mood: "Little heirloom" },
};

/** Curated fallback pairs for all eligible apparel taxonomy. */
const CATEGORY_PREVIEW_SETS = {
  sarees: { original: "saree-cotton", preview: "saree-ivory-silk", mood: "Six yards, considered" },
  lehengas: { original: "women-contemporary", preview: "lehenga-bridal", mood: "Celebration silhouette" },
  "bridal-couture": { original: "women-contemporary", preview: "women-bridal-wear", mood: "Trousseau preview" },
  "kurtis-and-suits": { original: "saree-cotton", preview: "women-contemporary", mood: "Everyday atelier" },
  menswear: { original: "men-kurta", preview: "groom-sherwani", mood: "Tailored ceremony" },
  kidswear: { original: "kids-festive-wear", preview: "kids-festive-wear", mood: "Little heirloom" },
};

/**
 * Returns a fresh, presentation-ready mock result. `generatedAt` describes
 * only when this demo record was assembled in the UI; it never indicates an
 * AI request and no image is written back to the catalogue.
 */
export const getMockTryOnResult = (product) => {
  if (!product?.id) return null;

  const categoryKey = getVirtualTryOnCategoryKey(product);
  const preset = PRODUCT_PREVIEW_OVERRIDES[product.id] ?? CATEGORY_PREVIEW_SETS[categoryKey];
  if (!preset) return null;

  return {
    id: `ai-mirror-demo-${product.id}`,
    productId: product.id,
    originalImage: image(preset.original),
    previewImage: image(preset.preview),
    /** The real, currently resolved product plate is supplied by the catalogue. */
    garmentImage: product.image ?? null,
    mood: preset.mood,
    generatedAt: new Date().toISOString(),
    demo: true,
    label: "AI Mirror Preview",
    sourceLabel: "Curated demo preview",
  };
};

/** Useful for the stage before a customer begins the demo processing flow. */
export const getMockPreviewTemplate = (product) => getMockTryOnResult(product);

export { PRODUCT_PREVIEW_OVERRIDES, CATEGORY_PREVIEW_SETS };
