/**
 * PRATIKSHYA FASHON — Department taxonomy (structured data).
 *
 * The four departments — Women, Bridal, Men, Kids — are the top-level
 * organisational unit. Each department maps to one or more product
 * categories in the taxonomy repository, and each category maps to its
 * subcategories.
 *
 * This is pure DATA. The product-management UI reads it dynamically.
 * No department has a separate implementation — Women, Bridal, Men and
 * Kids all use the same ProductTable, ProductForm, ProductEditor,
 * MediaManager, CategorySelector, SubcategorySelector, VariantManager,
 * InventoryManager and ProductValidation.
 *
 * Taxonomy source of truth:
 *   - Categories and subcategories live in `taxonomyRepository`.
 *   - This module adds the department → category grouping layer.
 */

/* ------------------------------------------------------------------ */
/* Department definitions                                              */
/* ------------------------------------------------------------------ */

export const DEPARTMENTS = [
  {
    id: "women",
    label: "Women",
    categories: [
      {
        id: "sarees",
        label: "Sarees",
        group: "Sarees",
        subcategories: [
          { id: "Pato Saree", label: "Pato Sarees" },
          { id: "Cotton Saree", label: "Cotton Sarees" },
          { id: "Silk Saree", label: "Silk Sarees" },
          { id: "Banarasi Saree", label: "Banarasi Sarees" },
          { id: "Printed Saree", label: "Printed Sarees" },
          { id: "Designer Saree", label: "Designer Sarees" },
        ],
      },
      {
        id: "lehengas",
        label: "Lehengas",
        group: "Lehengas",
        subcategories: [
          { id: "Bridal Lehenga", label: "Bridal Lehengas" },
          { id: "Party Lehenga", label: "Party Lehengas" },
          { id: "Designer Lehenga", label: "Designer Lehengas" },
        ],
      },
      {
        id: "kurtis-and-suits",
        label: "Kurtis + Suits",
        group: "Essentials",
        subcategories: [
          { id: "Kurti", label: "Kurti" },
          { id: "Suit Set", label: "Suit Set" },
        ],
      },
      {
        id: "innerwear",
        label: "Innerwear",
        group: "Essentials",
        subcategories: [
          { id: "Petticoat", label: "Petticoat" },
          { id: "Blouse", label: "Blouse" },
          { id: "Shapewear", label: "Shapewear" },
        ],
      },
      {
        id: "dupattas",
        label: "Dupattas + Stoles",
        group: "Essentials",
        subcategories: [
          { id: "Dupatta", label: "Dupatta" },
          { id: "Stole", label: "Stole" },
        ],
      },
    ],
  },
  {
    id: "bridal",
    label: "Bridal",
    categories: [
      {
        id: "bridal-couture",
        label: "Bridal Couture",
        group: "The Bride",
        subcategories: [
          { id: "Bridal Saree", label: "Bridal Sarees" },
          { id: "Bridal Lehenga", label: "Bridal Lehengas" },
          { id: "Reception Wear", label: "Reception Wear" },
        ],
      },
      {
        id: "bridal-couture",
        label: "Celebrations",
        group: "Celebrations",
        subcategories: [
          { id: "Mehendi Wear", label: "Mehendi + Haldi" },
          { id: "Sangeet Wear", label: "Sangeet Edit" },
          { id: "Trousseau", label: "Trousseau Edit" },
        ],
      },
      {
        id: "jewellery",
        label: "Bridal Jewellery",
        group: "Finishing Touches",
        subcategories: [
          { id: "Jewellery Set", label: "Jewellery Set" },
          { id: "Necklaces", label: "Necklaces" },
          { id: "Earrings", label: "Earrings" },
          { id: "Maang Tikka", label: "Maang Tikka" },
          { id: "Rings", label: "Rings" },
        ],
      },
      {
        id: "bangles",
        label: "Bridal Bangles",
        group: "Finishing Touches",
        subcategories: [
          { id: "Bridal Bangles", label: "Bridal Bangles" },
          { id: "Gold-finish Bangles", label: "Gold-finish Bangles" },
          { id: "Kada + Cuffs", label: "Kada + Cuffs" },
        ],
      },
      {
        id: "menswear",
        label: "Groom Collection",
        group: "Finishing Touches",
        subcategories: [
          { id: "Sherwani", label: "Sherwani" },
          { id: "Kurta", label: "Wedding Kurta" },
        ],
      },
    ],
  },
  {
    id: "men",
    label: "Men",
    categories: [
      {
        id: "menswear",
        label: "Ethnic Wear",
        group: "Ethnic Wear",
        subcategories: [
          { id: "Kurta", label: "Kurta" },
          { id: "Kurta Pajama", label: "Kurta Pajama" },
          { id: "Nehru Jacket", label: "Nehru Jackets" },
        ],
      },
      {
        id: "menswear",
        label: "Groom",
        group: "Groom",
        subcategories: [
          { id: "Sherwani", label: "Sherwani" },
          { id: "Kurta", label: "Wedding Kurta" },
        ],
      },
    ],
  },
  {
    id: "kids",
    label: "Kids",
    categories: [
      {
        id: "kidswear",
        label: "Girls",
        group: "Girls",
        subcategories: [
          { id: "Girls Dress", label: "Dresses" },
          { id: "Girls Casual Set", label: "Casual Sets" },
        ],
      },
      {
        id: "kidswear",
        label: "Boys",
        group: "Boys",
        subcategories: [
          { id: "Boys T-Shirt & Shorts Set", label: "T-Shirt & Shorts" },
          { id: "Boys Casual Set", label: "Casual Sets" },
        ],
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Lookup helpers                                                      */
/* ------------------------------------------------------------------ */

/** All department ids. */
export const DEPARTMENT_IDS = DEPARTMENTS.map((d) => d.id);

/** Department options for form selectors. */
export const DEPARTMENT_OPTIONS = DEPARTMENTS.map((d) => ({
  id: d.id,
  label: d.label,
}));

/** Find a department by id. */
export const getDepartment = (id) =>
  DEPARTMENTS.find((d) => d.id === id) ?? null;

/** All unique category ids belonging to a department. */
export const categoriesForDepartment = (departmentId) => {
  const dept = getDepartment(departmentId);
  if (!dept) return [];
  const seen = new Set();
  return dept.categories
    .filter((cat) => {
      if (seen.has(cat.id)) return false;
      seen.add(cat.id);
      return true;
    })
    .map((cat) => ({ id: cat.id, label: cat.label }));
};

/** All subcategory values for a given category within a department. */
export const subcategoriesForDepartmentCategory = (departmentId, categoryId) => {
  const dept = getDepartment(departmentId);
  if (!dept) return [];
  const seen = new Set();
  const result = [];
  dept.categories
    .filter((cat) => cat.id === categoryId)
    .forEach((cat) => {
      (cat.subcategories || []).forEach((sub) => {
        if (!seen.has(sub.id)) {
          seen.add(sub.id);
          result.push(sub);
        }
      });
    });
  return result;
};

/**
 * Determine which department a product belongs to, based on its category
 * and gender. Returns the department id or null.
 */
export const departmentForProduct = (product) => {
  if (!product) return null;
  const category = product.category;
  const gender = product.gender;

  if (category === "kidswear" || gender === "Kids") return "kids";
  if (category === "menswear" || gender === "Men") return "men";
  if (category === "bridal-couture") return "bridal";
  if (
    ["sarees", "lehengas", "kurtis-and-suits", "innerwear", "dupattas"].includes(category)
  ) {
    /* A lehenga with occasion=Bridal is bridal department; otherwise women. */
    if (
      category === "lehengas" &&
      (product.occasion || []).includes("Wedding")
    ) {
      return "bridal";
    }
    return "women";
  }
  if (["bangles", "jewellery"].includes(category)) return "women";
  return null;
};

/**
 * Product ID convention:
 *   PF-{DEPT}-{CAT}-{SUB}-{NNNN}
 *
 * Examples:
 *   PF-W-SAR-PATO-0001
 *   PF-W-LEH-BRI-0001
 *   PF-BR-SAR-0001
 *   PF-M-ETH-KUR-0001
 *   PF-M-GRM-SHW-0001
 *   PF-K-GRL-DRS-0001
 *   PF-K-BYS-TSH-0001
 */
export const DEPARTMENT_ID_CODES = {
  women: "W",
  bridal: "BR",
  men: "M",
  kids: "K",
};

export const CATEGORY_ID_CODES = {
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

export const SUBCATEGORY_ID_CODES = {
  "Pato Saree": "PATO",
  "Cotton Saree": "COT",
  "Silk Saree": "SLK",
  "Banarasi Saree": "BAN",
  "Printed Saree": "PRT",
  "Designer Saree": "DSN",
  "Bridal Lehenga": "BRI",
  "Party Lehenga": "PTY",
  "Designer Lehenga": "DSN",
  "Kurti": "KRT",
  "Suit Set": "SUT",
  "Petticoat": "PET",
  "Blouse": "BLS",
  "Shapewear": "SHP",
  "Dupatta": "DUP",
  "Stole": "STL",
  "Bridal Saree": "BSR",
  "Reception Wear": "RCP",
  "Mehendi Wear": "MHN",
  "Sangeet Wear": "SNG",
  "Trousseau": "TRS",
  "Sherwani": "SHW",
  "Kurta": "KUR",
  "Kurta Pajama": "KPJ",
  "Nehru Jacket": "NRJ",
  "Girls Dress": "GDR",
  "Girls Casual Set": "GCS",
  "Boys Casual Set": "BCS",
  "Boys T-Shirt & Shorts Set": "BTS",
  "Bridal Bangles": "BBG",
  "Gold-finish Bangles": "GBG",
  "Kada + Cuffs": "KDC",
  "Jewellery Set": "JST",
  "Necklaces": "NCK",
  "Earrings": "EAR",
  "Maang Tikka": "MTK",
  "Rings": "RNG",
  "Wedding Lehenga": "WLE",
};

export default {
  DEPARTMENTS,
  DEPARTMENT_IDS,
  DEPARTMENT_OPTIONS,
  getDepartment,
  categoriesForDepartment,
  subcategoriesForDepartmentCategory,
  departmentForProduct,
};
