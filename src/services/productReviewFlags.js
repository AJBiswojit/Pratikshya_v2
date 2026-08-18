/**
 * PRATIKSHYA FASHON — Product review flags (Phase 22.1).
 *
 * The single vocabulary for the review flags a product draft carries on
 * its way through the MEDIA → DRAFT → REVIEW → PUBLISH pipeline. Leaf
 * module: no imports, so every layer (catalogue repository, workflow
 * service, admin/employee workspaces, migrations) can share it without
 * creating import cycles.
 *
 * Flags are REVIEW SIGNALS, never a second status system:
 *   · blocking flags stop publication until a human resolves them
 *   · informational flags explain history (media moved, deferred, …)
 *
 * Uncertainty is expressed with a flag — never with a silent guess.
 */

export const REVIEW_FLAGS = {
  NAME_REVIEW_REQUIRED: "NAME_REVIEW_REQUIRED",
  PRICE_REVIEW_REQUIRED: "PRICE_REVIEW_REQUIRED",
  TAXONOMY_REVIEW_REQUIRED: "TAXONOMY_REVIEW_REQUIRED",
  GROUP_REVIEW_REQUIRED: "GROUP_REVIEW_REQUIRED",
  VARIANT_REVIEW_REQUIRED: "VARIANT_REVIEW_REQUIRED",
  NEEDS_MEDIA: "NEEDS_MEDIA",
  MEDIA_OWNERSHIP_REVIEW: "MEDIA_OWNERSHIP_REVIEW",
  CONFLICT_UNRESOLVED: "CONFLICT_UNRESOLVED",
  CONFLICT_REVIEW_LATER: "CONFLICT_REVIEW_LATER",
  MEDIA_OWNERSHIP_MOVED: "MEDIA_OWNERSHIP_MOVED",
  MEDIA_UNASSIGNED: "MEDIA_UNASSIGNED",
};

export const REVIEW_FLAG_LABELS = {
  [REVIEW_FLAGS.NAME_REVIEW_REQUIRED]: "Name review required",
  [REVIEW_FLAGS.PRICE_REVIEW_REQUIRED]: "Price review required",
  [REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED]: "Taxonomy review required",
  [REVIEW_FLAGS.GROUP_REVIEW_REQUIRED]: "Grouping review required",
  [REVIEW_FLAGS.VARIANT_REVIEW_REQUIRED]: "Variant review required",
  [REVIEW_FLAGS.NEEDS_MEDIA]: "Needs media",
  [REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW]: "Media ownership review",
  [REVIEW_FLAGS.CONFLICT_UNRESOLVED]: "Media conflict unresolved",
  [REVIEW_FLAGS.CONFLICT_REVIEW_LATER]: "Conflict review deferred",
  [REVIEW_FLAGS.MEDIA_OWNERSHIP_MOVED]: "Media ownership moved",
  [REVIEW_FLAGS.MEDIA_UNASSIGNED]: "Media unassigned",
};

/** A product cannot publish while any of these flags stand. */
export const PUBLISH_BLOCKING_FLAGS = new Set([
  REVIEW_FLAGS.NAME_REVIEW_REQUIRED,
  REVIEW_FLAGS.PRICE_REVIEW_REQUIRED,
  REVIEW_FLAGS.TAXONOMY_REVIEW_REQUIRED,
  REVIEW_FLAGS.GROUP_REVIEW_REQUIRED,
  REVIEW_FLAGS.VARIANT_REVIEW_REQUIRED,
  REVIEW_FLAGS.NEEDS_MEDIA,
  REVIEW_FLAGS.MEDIA_OWNERSHIP_REVIEW,
  REVIEW_FLAGS.CONFLICT_UNRESOLVED,
]);

export const reviewFlagLabel = (flag) => REVIEW_FLAG_LABELS[flag] ?? flag;

/** Which of the product's flags actually stop publication. */
export const blockingReviewFlags = (flags = []) =>
  [...new Set((Array.isArray(flags) ? flags : []).filter((flag) => PUBLISH_BLOCKING_FLAGS.has(flag)))];

/** Names that do not count as real product information. */
export const isPlaceholderProductName = (name) => {
  const clean = String(name ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
  if (!clean) return true;
  if (clean.startsWith("untitled")) return true;
  if (clean === "not yet defined" || clean === "undefined") return true;
  if (clean.startsWith("uncatalogued")) return true;
  return false;
};

export default {
  REVIEW_FLAGS,
  REVIEW_FLAG_LABELS,
  PUBLISH_BLOCKING_FLAGS,
  reviewFlagLabel,
  blockingReviewFlags,
  isPlaceholderProductName,
};
