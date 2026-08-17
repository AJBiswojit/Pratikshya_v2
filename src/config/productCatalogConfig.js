/**
 * PRATIKSHYA FASHON — Product & merchandising vocabulary (Phase 13).
 *
 * The single configuration the product editor, the review queue and the
 * admin tables read their option lists from. Categories and their labels
 * come straight from the storefront taxonomy — this file never redeclares
 * them, it only extends the *choices offered to the editor* (subcategories,
 * fabrics, occasions, collections, tags…) so the customer-facing taxonomy
 * stays the single source of truth for discovery.
 *
 * Data only. No React, no presentation.
 */

import {
  colors,
  fabrics,
  materials,
  occasions,
} from "../data/products/taxonomy";
import taxonomyRepository from "../services/taxonomyRepository";

/* ------------------------------------------------------------------ */
/* Product type                                                        */
/* ------------------------------------------------------------------ */

export const PRODUCT_TYPES = [
  { id: "fashion", label: "Fashion" },
  { id: "textile", label: "Textile / Fabric" },
  { id: "jewellery", label: "Jewellery" },
  { id: "accessory", label: "Accessory" },
];

export const getProductTypeLabel = (id) =>
  PRODUCT_TYPES.find((entry) => entry.id === id)?.label ?? id ?? "Fashion";

/* ------------------------------------------------------------------ */
/* Product status & review                                             */
/* ------------------------------------------------------------------ */

export const PRODUCT_STATUSES = {
  DRAFT: "DRAFT",
  /* Phase 22 — "REVIEW" is the human-facing name of the review state.
     The canonical stored value stays PENDING_REVIEW so every existing
     consumer (review queue, metrics, status badges) keeps working. */
  REVIEW: "PENDING_REVIEW",
  PENDING_REVIEW: "PENDING_REVIEW",
  PUBLISHED: "PUBLISHED",
  ARCHIVED: "ARCHIVED",
};

export const PRODUCT_STATUS_OPTIONS = [
  { id: "DRAFT", label: "Draft", tone: "quiet" },
  { id: "PENDING_REVIEW", label: "Review", tone: "alert" },
  { id: "PUBLISHED", label: "Published", tone: "ink" },
  { id: "ARCHIVED", label: "Archived", tone: "muted" },
];

export const getProductStatusLabel = (status) =>
  PRODUCT_STATUS_OPTIONS.find((entry) => entry.id === status)?.label ?? status ?? "—";

export const REVIEW_STATES = {
  NONE: "NONE",
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
};

/* ------------------------------------------------------------------ */
/* Categories — from the storefront taxonomy, never redeclared         */
/* ------------------------------------------------------------------ */

export const CATEGORY_OPTIONS = taxonomyRepository.categoryOptions().map((category) => ({
  id: category.id,
  label: category.label,
}));

/**
 * Subcategory choices offered per category. Authored subcategories already
 * in the catalogue continue to work; these extend the editor's palette
 * across the full Phase 13 merchandising range.
 */
export const SUBCATEGORY_OPTIONS = {
  sarees: [
    "Banarasi Silk",
    "Silk",
    "Cotton",
    "Pato",
    "Designer",
    "Wedding",
    "Bridal",
    "Festive",
    "Printed",
    "Embroidered",
    "Traditional",
    "Pato Saree",
    "Cotton Saree",
    "Silk Saree",
    "Banarasi Saree",
    "Designer Saree",
    "Printed Saree",
    "Wedding Saree",
    "Bridal Saree",
    "Festive Saree",
    "Embroidered Saree",
    "Traditional Saree",
  ],
  lehengas: [
    "Bridal",
    "Wedding",
    "Designer",
    "Party",
    "Festive",
    "Kids",
    "Bridal Lehenga",
    "Wedding Lehenga",
    "Designer Lehenga",
    "Party Lehenga",
    "Festive Lehenga",
    "Kids Lehenga",
  ],
  "bridal-couture": [
    "Bridal Saree",
    "Bridal Lehenga",
    "Reception Wear",
    "Sangeet Wear",
    "Mehendi Wear",
    "Trousseau",
    "Gown",
  ],
  "kurtis-and-suits": [
    "Kurti",
    "Salwar Suit",
    "Anarkali",
    "Palazzo Set",
    "Dress",
    "Ethnic Wear",
    "Western Wear",
    "Party Wear",
  ],
  innerwear: ["Petticoat", "Blouse", "Shapewear"],
  dupattas: [
    "Dupattas",
    "Stoles",
    "Handbags",
    "Clutches",
    "Sunglasses",
    "Dupatta",
    "Stole",
    "Handbag",
    "Clutch",
  ],
  bangles: [
    "Bangles",
    "Bridal Bangles",
    "Gold-finish Bangles",
    "Kada + Cuffs",
    "Bracelets",
    "Rings",
  ],
  jewellery: [
    "Bangles",
    "Earrings",
    "Necklaces",
    "Bracelets",
    "Rings",
    "Maang Tikka",
    "Jewellery Set",
  ],
  menswear: [
    "Kurta",
    "Kurta Pajama",
    "Sherwani",
    "Nehru Jacket",
    "Indo-Western",
    "Groom Collection",
    "Groom Wear",
    "Shirt",
    "T-Shirt",
    "Trousers",
    "Jeans",
    "Blazer",
    "Formal Wear",
    "Casual Wear",
  ],
  kidswear: [
    "Girls Dress",
    "Girls Casual Set",
    "Boys Casual Set",
    "Boys T-Shirt & Shorts Set",
    "Frocks",
    "Dresses",
    "Party Wear",
    "Festive Wear",
    "Casual Wear",
    "Kurta Sets",
    "Ethnic Wear",
    "Western Wear",
    "Kids Lehenga",
    "Kurta Set",
    "Frock",
  ],
};

export const subcategoryOptionsFor = (categoryId) =>
  [...new Set([...(taxonomyRepository.subcategoryOptionsFor(categoryId) ?? []), ...(SUBCATEGORY_OPTIONS[categoryId] ?? [])])];

/* ------------------------------------------------------------------ */
/* Gender                                                              */
/* ------------------------------------------------------------------ */

export const GENDER_OPTIONS = ["Women", "Men", "Kids", "Unisex"];

/* ------------------------------------------------------------------ */
/* Stable Product IDs (Phase 22)                                       */
/* ------------------------------------------------------------------ */

/**
 * Deterministic category-based Product ID prefixes. A new draft product
 * created from media receives a permanent id like `KID-007` — never a
 * random id, never an array index. The id is persisted in the product
 * register and is never derived from the editable product name.
 *
 * The values live in the leaf module `./productIdPrefixes` so the catalogue
 * repository can share them without an import cycle.
 */
export { PRODUCT_ID_PREFIXES, DEFAULT_PRODUCT_ID_PREFIX } from "./productIdPrefixes";

/* ------------------------------------------------------------------ */
/* Fabric & material — taxonomy list extended, never contradicted      */
/* ------------------------------------------------------------------ */

const mergeUnique = (...lists) => [...new Set(lists.flat().filter(Boolean))];

export const FABRIC_OPTIONS = mergeUnique(fabrics, [
  "Cotton",
  "Silk",
  "Banarasi Silk",
  "Linen",
  "Chiffon",
  "Georgette",
  "Rayon",
  "Velvet",
  "Organza",
  "Printed Fabric",
  "Embroidered Fabric",
  "Other",
]);

export const MATERIAL_OPTIONS = mergeUnique(materials, [
  "Silk",
  "Cotton",
  "Rayon",
  "Polyester",
  "Metal",
  "Brass",
  "Alloy",
  "Mixed Fabric",
  "Handloom",
]);

/* ------------------------------------------------------------------ */
/* Colour, size, pattern, work                                         */
/* ------------------------------------------------------------------ */

export const COLOR_OPTIONS = [...colors];

export const SIZE_OPTIONS = [
  "Free Size",
  "XS",
  "S",
  "M",
  "L",
  "XL",
  "XXL",
  "XXXL",
];

export const PATTERN_OPTIONS = [
  "Plain",
  "Printed",
  "Floral",
  "Geometric",
  "Traditional",
  "Embroidered",
  "Striped",
  "Checks",
  "Designer",
];

export const WORK_OPTIONS = [
  "Embroidery",
  "Zari",
  "Zardozi",
  "Sequins",
  "Mirror Work",
  "Thread Work",
  "Bead Work",
  "Printed",
  "Hand Work",
  "Plain",
];

export const SEASON_OPTIONS = ["Summer", "Winter", "Monsoon", "All Season"];

/* ------------------------------------------------------------------ */
/* Occasion & collection                                               */
/* ------------------------------------------------------------------ */

export const OCCASION_OPTIONS = mergeUnique(occasions, [
  "Bridal",
  "Wedding",
  "Festive",
  "Party",
  "Casual",
  "Formal",
  "Engagement",
  "Reception",
  "Traditional",
  "Daily Wear",
]);

/**
 * Collection choices. The house collections come from the taxonomy; the
 * merchandising edits extend them. `collection` on the product keeps the
 * first (primary) value so the existing storefront facet keeps working.
 */
export const COLLECTION_OPTIONS = mergeUnique(
  taxonomyRepository.collectionOptions().map((collection) => collection.label),
  [
    "New Arrivals",
    "Bestsellers",
    "Featured",
    "Wedding Edit",
    "Bridal Edit",
    "Festive Edit",
    "Groom Edit",
    "Kids Festive",
    "Silk Edit",
    "Cotton Edit",
  ]
);

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

export const TAG_SUGGESTIONS = [
  "Premium",
  "Handloom",
  "Designer",
  "Trending",
  "Limited Edition",
  "Wedding",
  "Bridal",
  "Festive",
  "Bestseller",
  "New Arrival",
];

/* ------------------------------------------------------------------ */
/* Tax / GST — demo fields, structured for a future backend            */
/* ------------------------------------------------------------------ */

export const TAX_MODES = {
  INCLUSIVE: "INCLUSIVE",
  EXCLUSIVE: "EXCLUSIVE",
};

export const TAX_MODE_OPTIONS = [
  { id: TAX_MODES.INCLUSIVE, label: "Tax inclusive" },
  { id: TAX_MODES.EXCLUSIVE, label: "Tax exclusive" },
];

export const GST_RATES = [0, 5, 12, 18, 28];

/* ------------------------------------------------------------------ */
/* Merchandising flags                                                 */
/* ------------------------------------------------------------------ */

export const PRODUCT_FLAG_OPTIONS = [
  { key: "featured", label: "Featured", field: "isFeatured", hint: "House selection on the landing page" },
  { key: "bestseller", label: "Bestseller", field: "isBestseller", hint: "Proven favourites" },
  { key: "newArrival", label: "New arrival", field: "isNew", hint: "Just-in edit" },
  { key: "limitedEdition", label: "Limited edition", field: "isLimitedEdition", hint: "Considered numbers only" },
  { key: "trending", label: "Trending", field: "isTrending", hint: "Rising demand" },
];

/* ------------------------------------------------------------------ */
/* Variants                                                            */
/* ------------------------------------------------------------------ */

export const VARIANT_STATUSES = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
};

/* ------------------------------------------------------------------ */
/* Returns                                                             */
/* ------------------------------------------------------------------ */

export const RETURN_ELIGIBILITY_OPTIONS = [
  { id: "eligible", label: "Returnable" },
  { id: "exchange-only", label: "Exchange only" },
  { id: "non-returnable", label: "Non-returnable" },
];

/* ------------------------------------------------------------------ */
/* Availability — same vocabulary as the storefront taxonomy           */
/* ------------------------------------------------------------------ */

export const AVAILABILITY_OPTIONS = [
  { id: "in-stock", label: "In Stock" },
  { id: "low-stock", label: "Only a Few Left" },
  { id: "made-to-order", label: "Made to Order" },
  { id: "unavailable", label: "Currently Unavailable" },
];

export default {
  PRODUCT_TYPES,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_OPTIONS,
  REVIEW_STATES,
  CATEGORY_OPTIONS,
  SUBCATEGORY_OPTIONS,
  GENDER_OPTIONS,
  FABRIC_OPTIONS,
  MATERIAL_OPTIONS,
  COLOR_OPTIONS,
  SIZE_OPTIONS,
  PATTERN_OPTIONS,
  WORK_OPTIONS,
  SEASON_OPTIONS,
  OCCASION_OPTIONS,
  COLLECTION_OPTIONS,
  TAG_SUGGESTIONS,
  TAX_MODES,
  TAX_MODE_OPTIONS,
  GST_RATES,
  PRODUCT_FLAG_OPTIONS,
  VARIANT_STATUSES,
  RETURN_ELIGIBILITY_OPTIONS,
  AVAILABILITY_OPTIONS,
};
