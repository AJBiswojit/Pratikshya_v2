/**
 * PRATIKSHYA FASHON — Category ↔ media-family safety (Phase 3F).
 *
 * A deterministic validation layer between product categories and optional
 * imported-media filename families. Filenames are used ONLY to recognize an
 * explicit studio naming convention — never to
 * fabricate names, prices or taxonomy.
 *
 *   women-innerwear-007.webp  → family "women-innerwear" → innerwear only
 *   jewellery-bangle-002.webp → family "jewellery-bangle" → bangles/jewellery
 *   men-sherwani-001-front.webp → family "men" → menswear only
 *
 * The map answers one question: MAY this photograph ever become product
 * media of a product in that category? It is enforced at the ONE media
 * ownership door (mediaOwnershipService) and read by the Phase 3F audits.
 * It never runs during storefront rendering — assignment-time only.
 *
 * Rules honoured here:
 *   · Men's wear never receives bangles / earrings / sarees / innerwear.
 *   · Innerwear never receives bangles / sarees / menswear / jewellery.
 *   · Bangles never receive sarees / earrings / innerwear / menswear.
 *   · Sarees never receive jewellery / innerwear / menswear.
 *   · Files without a recognised family (scratch/test/marketing uploads)
 *     are NOT judged here — filename semantics only apply where the
 *     recognized studio naming convention applies.
 *
 * Marketing artwork is a separate scope: it is never a canonical
 * product family, and marketing-scope isolation is enforced upstream in
 * the ownership service.
 */

/** Ordered: longest prefix first so "women-innerwear" wins over "women". */
export const MEDIA_FAMILIES = [
  {
    family: "women-innerwear",
    pattern: /^women-innerwear-\d+/i,
    categories: ["innerwear"],
  },
  {
    family: "women-saree",
    pattern: /^women-saree-[a-z]+-\d+/i,
    categories: ["sarees", "bridal-couture"],
  },
  {
    family: "women-lehenga",
    pattern: /^women-lehenga-\d+/i,
    categories: ["lehengas", "bridal-couture"],
  },
  {
    family: "women-bridal",
    pattern: /^women-bridal-\d+/i,
    categories: ["bridal-couture"],
  },
  {
    family: "jewellery-bangle",
    pattern: /^jewellery-bangle-\d+/i,
    categories: ["bangles", "jewellery"],
  },
  {
    family: "jewellery-earring",
    pattern: /^jewellery-earring-\d+/i,
    categories: ["jewellery"],
  },
  {
    family: "jewellery-anklet",
    pattern: /^jewellery-anklet-\d+/i,
    categories: ["jewellery"],
  },
  {
    family: "men",
    pattern: /^men-[a-z]/i,
    categories: ["menswear"],
  },
];

/** House/marketing artwork — never a canonical product family. */
export const MARKETING_FILE_PATTERN = /^(house-|hero\d+\.)/i;

const baseNameOf = (value) => {
  if (!value) return "";
  const raw =
    typeof value === "string"
      ? value
      : value.currentFilename ||
        value.fileName ||
        value.originalFilename ||
        value.url ||
        value.src ||
        "";
  return String(raw).split("?")[0].split("/").pop() || "";
};

/** The recognised family of a file/media record, or null when unnamed. */
export const mediaFamilyOf = (fileOrMedia) => {
  const name = baseNameOf(fileOrMedia);
  if (!name) return null;
  for (const entry of MEDIA_FAMILIES) {
    if (entry.pattern.test(name)) return entry;
  }
  return null;
};

/** True when the file is house/hero marketing artwork by name. */
export const isMarketingFileName = (fileOrMedia) =>
  MARKETING_FILE_PATTERN.test(baseNameOf(fileOrMedia));

/**
 * MAY this photograph become product media of `category`?
 *
 * Returns { ok, family, categories, reason }:
 *   · ok: true  — no recognised family (not judged) or family allows it
 *   · ok: false — the family exists and the category is outside it
 *
 * Deliberately does not judge files outside the recognized studio naming
 * convention: a scratch upload or a renamed studio file carries no
 * deterministic semantics, and guessing is forbidden.
 */
export const checkCategoryMediaSafety = (fileOrMedia, category) => {
  const name = baseNameOf(fileOrMedia);
  const entry = mediaFamilyOf(name);
  if (!entry) {
    return { ok: true, family: null, categories: null, reason: null };
  }
  const target = String(category ?? "").toLowerCase();
  if (!target) {
    return { ok: true, family: entry.family, categories: entry.categories, reason: null };
  }
  if (entry.categories.includes(target)) {
    return { ok: true, family: entry.family, categories: entry.categories, reason: null };
  }
  return {
    ok: false,
    family: entry.family,
    categories: entry.categories,
    reason: `${name} is ${entry.family} photography — it cannot become product media of a ${category} product (allowed: ${entry.categories.join(", ")}).`,
  };
};

export default {
  MEDIA_FAMILIES,
  MARKETING_FILE_PATTERN,
  mediaFamilyOf,
  isMarketingFileName,
  checkCategoryMediaSafety,
};
