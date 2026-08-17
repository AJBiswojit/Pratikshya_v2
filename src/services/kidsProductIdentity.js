/**
 * PRATIKSHYA FASHON — Kids product identity (generic, data-driven).
 *
 * This module provides Kids product identity utilities. Kids uses the
 * EXACT SAME product-management architecture as Women, Bridal and Men.
 * There is no separate hardcoded Kids implementation.
 *
 * Identity is determined by the product record's `category` field
 * (kidswear) and the shared product ID convention (PF-K-…-NNNN).
 *
 * No hardcoded product IDs, no hardcoded media filenames, no hardcoded
 * identity tables. All identity comes from the product data source.
 */

/* ------------------------------------------------------------------ */
/* Recognition helpers                                                 */
/* ------------------------------------------------------------------ */

/** Is this product record a Kids product? */
export const isKidsProduct = (product) => {
  if (!product) return false;
  if (product.category === "kidswear") return true;
  if (product.gender === "Kids") return true;
  return /^KID-\d{3}$/i.test(String(product.id || ""));
};

/** Is this product ID a Kids product ID? */
export const isKidsProductId = (value) => {
  const str = String(value ?? "");
  /* Legacy KID-001 format or new PF-K-… format */
  return /^KID-\d{3}$/i.test(str) || /^PF-K-/i.test(str);
};

/* ------------------------------------------------------------------ */
/* Legacy compatibility — confirmed Kids identities (Phase 22.2)       */
/* These are read from the product register at runtime, not hardcoded.  */
/* ------------------------------------------------------------------ */

/**
 * The count of confirmed legacy Kids products. This is a system constant
 * from Phase 22.2 — 21 media assets were confirmed as 21 separate products.
 * New Kids products are created through the same generic product form.
 */
export const KIDS_CONFIRMED_COUNT = 21;

export const KIDS_GROUP_DECISION = "SEPARATE_PRODUCT";

export const kidsMediaFileForNumber = (number) =>
  `kids-${String(number).padStart(3, "0")}.webp`;

export const kidsProductIdForNumber = (number) =>
  `KID-${String(number).padStart(3, "0")}`;

/** Legacy kids media filenames (kids-001.webp … kids-021.webp). */
export const KIDS_MEDIA_FILENAMES = Array.from(
  { length: KIDS_CONFIRMED_COUNT },
  (_, index) => kidsMediaFileForNumber(index + 1)
);

/** Legacy Kids product IDs (KID-001 … KID-021). */
export const KIDS_PRODUCT_IDS = Array.from(
  { length: KIDS_CONFIRMED_COUNT },
  (_, index) => kidsProductIdForNumber(index + 1)
);

/** Legacy confirmed identity table. */
export const CONFIRMED_KIDS_IDENTITIES = KIDS_MEDIA_FILENAMES.map((file, index) => ({
  number: index + 1,
  file,
  productId: KIDS_PRODUCT_IDS[index],
  decision: KIDS_GROUP_DECISION,
  groupKey: file.replace(/\.\w+$/, ""),
}));

/* ------------------------------------------------------------------ */
/* Filename recognition                                                */
/* ------------------------------------------------------------------ */

const cleanFileName = (value) =>
  String(value ?? "")
    .split("?")[0]
    .split("/")
    .pop()
    .trim()
    .toLowerCase();

export const kidsFileNameOf = (media) => {
  if (!media) return "";
  if (typeof media === "string") return cleanFileName(media);
  return cleanFileName(
    media.currentFilename ||
      media.fileName ||
      media.originalFilename ||
      media.src ||
      media.url ||
      media.thumbnail ||
      media.optimizedPath ||
      ""
  );
};

/** True for kids-001.webp … kids-021.webp (any extension). */
export const isKidsMediaFile = (value) => /^kids-\d{3}\.\w+$/i.test(kidsFileNameOf(value));

export const isConfirmedKidsMediaFile = (value) => {
  const file = kidsFileNameOf(value);
  return CONFIRMED_KIDS_IDENTITIES.some((entry) => entry.file === file);
};

export const isConfirmedKidsProductId = (value) =>
  KIDS_PRODUCT_IDS.includes(String(value ?? "").toUpperCase());

export const kidsProductIdForFile = (value) => {
  const file = kidsFileNameOf(value);
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.file === file)?.productId ?? null;
};

export const kidsMediaFileForProductId = (productId) => {
  const id = String(productId ?? "").toUpperCase();
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.productId === id)?.file ?? null;
};

export const confirmedKidsIdentityFor = (productId) => {
  const id = String(productId ?? "").toUpperCase();
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.productId === id) ?? null;
};

/* ------------------------------------------------------------------ */
/* No-merge rule for confirmed legacy products                         */
/* ------------------------------------------------------------------ */

export const wouldMergeConfirmedKids = (mediaLike = []) => {
  const ids = new Set(
    (Array.isArray(mediaLike) ? mediaLike : [mediaLike])
      .map((entry) => kidsProductIdForFile(entry))
      .filter(Boolean)
  );
  return ids.size > 1;
};

export const confirmedKidsProductIdsIn = (mediaLike = []) => [
  ...new Set(
    (Array.isArray(mediaLike) ? mediaLike : [mediaLike])
      .map((entry) => kidsProductIdForFile(entry))
      .filter(Boolean)
  ),
];

export const KIDS_MERGE_REFUSED_ERROR =
  "These Kids assets are CONFIRMED separate products. Similar is not the same — they cannot be grouped as one product.";

/* ------------------------------------------------------------------ */
/* Name & taxonomy sanity                                              */
/* ------------------------------------------------------------------ */

export const FOREIGN_NAME_TOKENS = [
  "saree", "sari", "lehenga", "choli", "blouse", "dupatta", "kurti",
  "salwar", "anarkali", "sherwani", "bridal", "bride", "groom",
  "women", "woman", "womens", "ladies", "men", "mens", "gentlemen",
  "jewellery", "jewelry", "bangle", "necklace", "earring", "maang",
  "innerwear", "lingerie",
];

const tokenise = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

export const foreignNameTokens = (name) => {
  const words = tokenise(name);
  return [...new Set(words.filter((word) => FOREIGN_NAME_TOKENS.includes(word)))];
};

export const kidsNameLooksForeign = (name) => foreignNameTokens(name).length > 0;

export const kidsSubcategoryLooksForeign = (subcategory) =>
  foreignNameTokens(subcategory).length > 0;

export default {
  KIDS_CONFIRMED_COUNT,
  KIDS_GROUP_DECISION,
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  CONFIRMED_KIDS_IDENTITIES,
  isKidsProduct,
  isKidsProductId,
  kidsFileNameOf,
  isKidsMediaFile,
  isConfirmedKidsMediaFile,
  isConfirmedKidsProductId,
  kidsProductIdForFile,
  kidsMediaFileForProductId,
  confirmedKidsIdentityFor,
  wouldMergeConfirmedKids,
  confirmedKidsProductIdsIn,
  KIDS_MERGE_REFUSED_ERROR,
  foreignNameTokens,
  kidsNameLooksForeign,
  kidsSubcategoryLooksForeign,
};
