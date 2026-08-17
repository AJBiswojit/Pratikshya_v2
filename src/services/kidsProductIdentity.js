/**
 * PRATIKSHYA FASHON — Confirmed Kids product identity (Phase 22.2).
 *
 * Phase 22 and Phase 22.1 built the MEDIA → DRAFT → REVIEW → PUBLISH
 * pipeline and asked a human the identity question for the Kids library.
 * Phase 22.2 records the ANSWER:
 *
 *     kids-001.webp → KID-001
 *     kids-002.webp → KID-002
 *     …
 *     kids-021.webp → KID-021
 *
 *     21 media assets = 21 SEPARATE physical products.
 *
 * This module is the single, permanent statement of that decision. It is a
 * leaf module (no imports) so every layer — migration, workflow service,
 * grouping, admin/employee desks, audits — can share it without import
 * cycles, and so the decision can never be lost with browser storage.
 *
 * Consequences enforced elsewhere, declared here:
 *   · SIMILAR PRODUCT ≠ SAME PRODUCT — two confirmed Kids assets may never
 *     be merged into one product, whatever the similarity signal says
 *   · ONE KIDS PRODUCT owns ONLY its own plate (KID-001 → kids-001.webp)
 *   · the Product ID is permanent; the product name is editable
 */

/* ------------------------------------------------------------------ */
/* The confirmed register                                              */
/* ------------------------------------------------------------------ */

export const KIDS_CONFIRMED_COUNT = 21;

/** The permanent group decision recorded for every confirmed Kids asset. */
export const KIDS_GROUP_DECISION = "SEPARATE_PRODUCT";

export const kidsMediaFileForNumber = (number) =>
  `kids-${String(number).padStart(3, "0")}.webp`;

export const kidsProductIdForNumber = (number) =>
  `KID-${String(number).padStart(3, "0")}`;

/** kids-001.webp … kids-021.webp — the 21 plates of the Kids library. */
export const KIDS_MEDIA_FILENAMES = Array.from(
  { length: KIDS_CONFIRMED_COUNT },
  (_, index) => kidsMediaFileForNumber(index + 1)
);

/** KID-001 … KID-021 — the 21 permanent Product IDs. */
export const KIDS_PRODUCT_IDS = Array.from(
  { length: KIDS_CONFIRMED_COUNT },
  (_, index) => kidsProductIdForNumber(index + 1)
);

/**
 * The confirmed identity table. One row per physical Kids product:
 * one media asset, one permanent Product ID, decision SEPARATE_PRODUCT.
 */
export const CONFIRMED_KIDS_IDENTITIES = KIDS_MEDIA_FILENAMES.map((file, index) => ({
  number: index + 1,
  file,
  productId: KIDS_PRODUCT_IDS[index],
  decision: KIDS_GROUP_DECISION,
  groupKey: file.replace(/\.\w+$/, ""),
}));

/* ------------------------------------------------------------------ */
/* Recognition helpers                                                 */
/* ------------------------------------------------------------------ */

const cleanFileName = (value) =>
  String(value ?? "")
    .split("?")[0]
    .split("/")
    .pop()
    .trim()
    .toLowerCase();

/** The filename of a media record / image source, however it is shaped. */
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

/** True for kids-001.webp … kids-021.webp (any extension of that shape). */
export const isKidsMediaFile = (value) => /^kids-\d{3}\.\w+$/i.test(kidsFileNameOf(value));

export const isConfirmedKidsMediaFile = (value) => {
  const file = kidsFileNameOf(value);
  return CONFIRMED_KIDS_IDENTITIES.some((entry) => entry.file === file);
};

export const isKidsProductId = (value) => /^KID-\d{3}$/.test(String(value ?? "").toUpperCase());

export const isConfirmedKidsProductId = (value) =>
  KIDS_PRODUCT_IDS.includes(String(value ?? "").toUpperCase());

/** kids-004.webp → KID-004 (null when the asset is not a confirmed plate). */
export const kidsProductIdForFile = (value) => {
  const file = kidsFileNameOf(value);
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.file === file)?.productId ?? null;
};

/** KID-004 → kids-004.webp (null when the id is not a confirmed identity). */
export const kidsMediaFileForProductId = (productId) => {
  const id = String(productId ?? "").toUpperCase();
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.productId === id)?.file ?? null;
};

export const confirmedKidsIdentityFor = (productId) => {
  const id = String(productId ?? "").toUpperCase();
  return CONFIRMED_KIDS_IDENTITIES.find((entry) => entry.productId === id) ?? null;
};

/* ------------------------------------------------------------------ */
/* The no-merge rule                                                   */
/* ------------------------------------------------------------------ */

/**
 * Would grouping these media assets merge two CONFIRMED Kids products?
 *
 * Similarity — colour, pose, model, background, garment type — is never a
 * reason to merge them. Two different confirmed plates in one group means
 * two different physical products, so the group decision must be refused.
 */
export const wouldMergeConfirmedKids = (mediaLike = []) => {
  const ids = new Set(
    (Array.isArray(mediaLike) ? mediaLike : [mediaLike])
      .map((entry) => kidsProductIdForFile(entry))
      .filter(Boolean)
  );
  return ids.size > 1;
};

/** The confirmed Product IDs touched by a set of media assets. */
export const confirmedKidsProductIdsIn = (mediaLike = []) => [
  ...new Set(
    (Array.isArray(mediaLike) ? mediaLike : [mediaLike])
      .map((entry) => kidsProductIdForFile(entry))
      .filter(Boolean)
  ),
];

export const KIDS_MERGE_REFUSED_ERROR =
  "These Kids assets are CONFIRMED separate products (Phase 22.2). Similar is not the same — they cannot be grouped as one product.";

/* ------------------------------------------------------------------ */
/* Name & taxonomy sanity                                              */
/* ------------------------------------------------------------------ */

/**
 * Words that prove a name or subcategory belongs to another department.
 * A Kids product must never inherit "Women's Silk Saree" from stale
 * metadata — when one of these appears, the record is flagged for review
 * instead of being silently published.
 */
export const FOREIGN_NAME_TOKENS = [
  "saree",
  "sari",
  "lehenga",
  "choli",
  "blouse",
  "dupatta",
  "kurti",
  "salwar",
  "anarkali",
  "sherwani",
  "bridal",
  "bride",
  "groom",
  "women",
  "woman",
  "womens",
  "ladies",
  "men",
  "mens",
  "gentlemen",
  /* "kurta" alone is a legitimate Kids subcategory ("Kurta Sets"); it is
     the department words above that prove a name belongs elsewhere. */
  "jewellery",
  "jewelry",
  "bangle",
  "necklace",
  "earring",
  "maang",
  "innerwear",
  "lingerie",
];

const tokenise = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);

/**
 * The foreign words found in a Kids product name — empty when the name
 * genuinely describes a Kids product. `Boys' Casual Shirt & Shorts Set`
 * passes; `Women's Silk Saree` does not.
 */
export const foreignNameTokens = (name) => {
  const words = tokenise(name);
  return [...new Set(words.filter((word) => FOREIGN_NAME_TOKENS.includes(word)))];
};

export const kidsNameLooksForeign = (name) => foreignNameTokens(name).length > 0;

/** The same rule for a subcategory: a Kids product is never "Bridal Saree". */
export const kidsSubcategoryLooksForeign = (subcategory) =>
  foreignNameTokens(subcategory).length > 0;

export default {
  KIDS_CONFIRMED_COUNT,
  KIDS_GROUP_DECISION,
  KIDS_MEDIA_FILENAMES,
  KIDS_PRODUCT_IDS,
  CONFIRMED_KIDS_IDENTITIES,
  kidsFileNameOf,
  isKidsMediaFile,
  isConfirmedKidsMediaFile,
  isKidsProductId,
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
