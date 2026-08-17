/**
 * PRATIKSHYA FASHON — Stable Product ID prefixes (Phase 22, Phase 23).
 *
 * The permanent, category-based Product ID prefixes. A new draft product
 * created from media receives an id like `KID-007`, `SAR-001`, `MEN-001` —
 * never a random id, never an array index. The id is persisted in the
 * product register and is never derived from the editable product name.
 *
 * This is a LEAF module on purpose: the catalogue repository and the
 * catalogue reconciliation service both import it, and neither may pull in
 * the taxonomy repository transitively without creating an import cycle.
 * The richer `productCatalogConfig` re-exports these values for the editor
 * and workflow layers.
 */

export const PRODUCT_ID_PREFIXES = {
  kidswear: "KID",
  menswear: "MEN",
  sarees: "SAR",
  lehengas: "LEH",
  "bridal-couture": "BRD",
  "kurtis-and-suits": "KUR",
  innerwear: "INN",
  dupattas: "DUP",
  bangles: "BAN",
  jewellery: "JEW",
};

export const DEFAULT_PRODUCT_ID_PREFIX = "PRD";

export default { PRODUCT_ID_PREFIXES, DEFAULT_PRODUCT_ID_PREFIX };
