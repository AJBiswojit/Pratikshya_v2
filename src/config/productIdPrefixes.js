/**
 * PRATIKSHYA FASHON — Stable Product ID convention.
 *
 * The permanent, department-aware Product ID convention:
 *
 *     PF-{DEPT}-{CAT}-{SUB}-{NNNN}
 *
 * Examples:
 *     PF-W-SAR-PATO-0001    Women → Sarees → Pato Sarees
 *     PF-W-LEH-BRI-0001     Women → Lehengas → Bridal Lehengas
 *     PF-BR-COUT-BSR-0001   Bridal → Bridal Couture → Bridal Sarees
 *     PF-M-ETH-KUR-0001     Men → Ethnic Wear → Kurta
 *     PF-M-GRM-SHW-0001     Men → Groom → Sherwani
 *     PF-K-GRL-GDR-0001     Kids → Girls → Dresses
 *     PF-K-BYS-BTS-0001     Kids → Boys → T-Shirt & Shorts
 *
 * Legacy prefixes (KID, MEN, SAR, etc.) are still recognised on read for
 * backward compatibility but are no longer generated for new records.
 *
 * This is a LEAF module: no imports from the taxonomy repository or the
 * catalogue repository.
 */

/**
 * Department codes used in the product ID.
 */
export const PRODUCT_ID_DEPT_CODES = {
  women: "W",
  bridal: "BR",
  men: "M",
  kids: "K",
};

/**
 * Category codes used in the product ID.
 */
export const PRODUCT_ID_CATEGORY_CODES = {
  sarees: "SAR",
  lehengas: "LEH",
  "bridal-couture": "COUT",
  "kurtis-and-suits": "KUR",
  innerwear: "INN",
  dupattas: "DUP",
  bangles: "BAN",
  jewellery: "JEW",
  menswear: "ETH",
  kidswear: "KID",
};

/**
 * Legacy prefixes — still recognised on read, never generated for new products.
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

/**
 * Build a product ID prefix from department, category and subcategory.
 * Returns the string portion before the serial number.
 *
 * e.g. buildProductIdPrefix("women", "sarees", "Pato Saree")
 *   → "PF-W-SAR-PATO"
 */
export const buildProductIdPrefix = (department, category, subcategory) => {
  const deptCode = PRODUCT_ID_DEPT_CODES[department] || "X";
  const catCode = PRODUCT_ID_CATEGORY_CODES[category] || "GEN";
  if (subcategory) {
    /* Use first 3-4 chars of subcategory, uppercased, no spaces/specials */
    const subCode = String(subcategory)
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase())
      .join("")
      .slice(0, 4);
    return `PF-${deptCode}-${catCode}-${subCode || "GEN"}`;
  }
  return `PF-${deptCode}-${catCode}`;
};

export default { PRODUCT_ID_PREFIXES, DEFAULT_PRODUCT_ID_PREFIX };
