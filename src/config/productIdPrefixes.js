import { departments as canonicalDepartments } from "../data/catalog/taxonomy";

/**
 * Stable canonical Product ID convention.
 *
 *     PF-{DEPARTMENT}-{FAMILY}-{NNNN}
 *
 * Existing product families are kept explicit so a new record continues the
 * same sequence as the generated canonical catalogue. The map covers the
 * complete taxonomy; no department owns a parallel identity scheme.
 */

export const PRODUCT_ID_DEPT_CODES = {
  women: "W",
  bridal: "BR",
  men: "M",
  kids: "K",
};

export const PRODUCT_ID_CATEGORY_CODES = {
  celebrations: "CEL",
  "finishing-touches": "FIN",
  "the-bride": "BRD",
  boys: "BYS",
  girls: "GRL",
  "ethnic-wear": "ETH",
  groom: "GRM",
  essentials: "ESS",
  lehengas: "LEH",
  sarees: "SAR",
};

/**
 * Authoritative prefixes already used by canonical records, keyed by the
 * complete taxonomy path.
 */
export const PRODUCT_ID_FAMILY_PREFIXES = {
  "bridal/celebrations/mehendi-haldi": "PF-BR-MEH",
  "bridal/celebrations/sangeet": "PF-BR-SNG",
  "bridal/celebrations/trousseau": "PF-BR-TRS",
  "bridal/finishing-touches/bangles": "PF-BR-BNG",
  "bridal/finishing-touches/jewellery": "PF-BR-JWL",
  "bridal/the-bride/lehengas": "PF-BR-LEH",
  "bridal/the-bride/reception-wear": "PF-BR-REC",
  "bridal/the-bride/sarees": "PF-BR-SAR",
  "kids/boys/casual-sets": "PF-K-BYS-CS",
  "kids/boys/t-shirt-shorts": "PF-K-BYS-TSH",
  "kids/girls/casual-sets": "PF-K-GRL-CS",
  "kids/girls/dresses": "PF-K-GRL-DRS",
  "men/ethnic-wear/kurta-pajama": "PF-M-ETH-KPJ",
  "men/ethnic-wear/nehru-jackets": "PF-M-ETH-NJ",
  "men/groom/groom-collection": "PF-M-GRM-GEN",
  "women/essentials/dupattas-stoles": "PF-W-ESS-DUP",
  "women/essentials/innerwear": "PF-W-ESS-INW",
  "women/essentials/kurtis-suits": "PF-W-ESS-KS",
  "women/lehengas/bridal": "PF-W-LEH-BRI",
  "women/lehengas/designer": "PF-W-LEH-DES",
  "women/lehengas/party": "PF-W-LEH-PTY",
  "women/sarees/banarasi": "PF-W-SAR-BAN",
  "women/sarees/cotton": "PF-W-SAR-COT",
  "women/sarees/silk": "PF-W-SAR-SIL",
};

const segmentCode = (value, fallback) => {
  const words = String(value || "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return fallback;
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((word) => word[0]).join("").slice(0, 4).toUpperCase();
};

export const buildProductIdPrefix = (department, category, subcategory) => {
  const path = [department, category, subcategory].map((value) => String(value || "").toLowerCase()).join("/");
  const established = PRODUCT_ID_FAMILY_PREFIXES[path];
  if (established) return established;

  const deptCode = PRODUCT_ID_DEPT_CODES[department] || segmentCode(department, "X");
  const categoryCode = PRODUCT_ID_CATEGORY_CODES[category] || segmentCode(category, "GEN");
  const subcategoryCode = segmentCode(subcategory, "GEN");
  return `PF-${deptCode}-${categoryCode}-${subcategoryCode}`;
};

export const isCanonicalTaxonomyPath = (department, category, subcategory) => {
  const departmentRecord = canonicalDepartments.find((entry) => entry.id === department);
  const categoryRecord = departmentRecord?.categories?.find((entry) => entry.id === category);
  return Boolean(categoryRecord?.subcategories?.some((entry) => entry.id === subcategory));
};

/**
 * Allocates the next collision-safe ID in a canonical taxonomy family.
 * Product identity comes from the selected taxonomy and catalogue register,
 * never from a filename, media folder, product name, array index, or clock.
 */
export const nextCanonicalProductId = (products, department, category, subcategory) => {
  if (!isCanonicalTaxonomyPath(department, category, subcategory)) return null;
  const prefix = buildProductIdPrefix(department, category, subcategory);
  const taken = new Set(
    (Array.isArray(products) ? products : [])
      .map((product) => String(product?.id || ""))
      .filter(Boolean)
  );
  let serial = 1;
  let candidate = `${prefix}-${String(serial).padStart(4, "0")}`;
  while (taken.has(candidate)) {
    serial += 1;
    candidate = `${prefix}-${String(serial).padStart(4, "0")}`;
  }
  return candidate;
};

export default {
  PRODUCT_ID_DEPT_CODES,
  PRODUCT_ID_CATEGORY_CODES,
  PRODUCT_ID_FAMILY_PREFIXES,
  buildProductIdPrefix,
  isCanonicalTaxonomyPath,
  nextCanonicalProductId,
};
