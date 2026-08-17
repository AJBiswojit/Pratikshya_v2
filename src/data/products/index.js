/**
 * PRATIKSHYA FASHON — Product access layer.
 *
 * Normalises the authored catalogue into the single record shape the whole
 * storefront reads, and exposes the lookups pages need. Everything derived
 * is computed once, at module load, so no component ever transforms product
 * data while rendering.
 *
 * Phase 13: the same layer hydrates records written by the Admin/Employee
 * product workspace (the shared `pratikshya_products` register) so the
 * storefront keeps reading ONE product repository. Rules honoured:
 *   · only PUBLISHED products reach customers
 *   · existing ids and slugs are preserved, never regenerated
 *   · variants authored in the workspace supply colours and sizes
 *   · search consumes SKU, tags, collections and product type as well
 *
 * The normalised record is a superset of what the Phase 2 `ProductCard`
 * expects (`name`, `category`, `price`, `originalPrice`, `label`, `image`,
 * `hoverImage`, `inStock`), which is why the card needs no changes to
 * display a catalogue product.
 */

import { imageRef } from "../pratikshyaImageManifest";
import { resolveLegacyMediaUrl } from "../../services/media/mediaPaths";
import catalogue from "./catalogue";
import catalogRepository, { productsRegisterRaw, slugify } from "../../services/catalogRepository";
import {
  getCareInstructions,
  getDeliveryInfo,
  getProductDescription,
  getProductDetails,
  getProductSpecifications,
  getReturnInfo,
} from "./details";
import { categoryLabels, getCategory } from "./taxonomy";
import taxonomyRepository from "../../services/taxonomyRepository";

export { slugify };

/**
 * Reduces a string to lower-case words separated by single spaces.
 *
 * Both the searchable haystack and the shopper's term go through this, so
 * apostrophes, ampersands and punctuation can never cause a miss.
 */
export const normaliseSearchText = (value) =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Percentage saved, rounded, or null when the piece is not discounted. */
const percentOff = (price, originalPrice) =>
  typeof originalPrice === "number" && originalPrice > price
    ? Math.round(((originalPrice - price) / originalPrice) * 100)
    : null;

/** True for addresses rather than manifest ids. */
const isUrl = (value) =>
  typeof value === "string" &&
  (value.startsWith("http") || value.startsWith("/") || value.startsWith("data:"));

/**
 * Imagery authored as a manifest id resolves through the manifest; a stored
 * address (an uploaded plate) is shaped into the same object so the gallery
 * and cards render either without caring which. Early rows that persisted a
 * whole plate object heal here too.
 */
const resolveImage = (value, name) => {
  if (!value) return imageRef("hero-atelier");
  if (typeof value === "object") {
    return value.src ? value : imageRef(value.id ?? "hero-atelier");
  }
  if (isUrl(value)) {
    const src = resolveLegacyMediaUrl(value) || value;
    return { id: value, src, alt: name, category: "default" };
  }
  return imageRef(value);
};

/**
 * The free-text haystack search matches against.
 *
 * Built once per product and lower-cased, so a keystroke costs one
 * `includes` per record rather than a fresh join.
 */
const buildTags = (product) =>
  [
    product.name,
    product.sku,
    product.subcategory,
    taxonomyRepository.getCategoryLabel(product.category),
    product.gender,
    taxonomyRepository.getCollectionLabel(product.collection),
    ...(product.collections ?? []).map((entry) => taxonomyRepository.getCollectionLabel(entry)),
    product.fabric,
    product.material,
    ...(product.occasion ?? []),
    ...(product.colors ?? []),
    ...(product.badges ?? []),
    ...(product.tags ?? []),
    ...(product.work ?? []),
    ...(product.patterns ?? []),
    product.productType,
  ].filter(Boolean);

/**
 * Availability drives two things the card already understands — whether the
 * piece can be bought now, and what the plate says when it cannot.
 */
const availabilityLabels = {
  "in-stock": "In Stock",
  "low-stock": "Only a Few Left",
  "made-to-order": "Available for Order",
  unavailable: "Currently Unavailable",
};

/**
 * Normalises one record into the storefront shape.
 *
 * Authored catalogue records and workspace records both pass through here.
 * Anything already present wins — ids, slugs and authored fields are never
 * regenerated — so Phase 13 edits keep every existing reference intact.
 */
export const toStorefrontProduct = (product, index = 0) => {
  const id = product.id ?? `pf-${String(index + 1).padStart(3, "0")}`;
  const slug = product.slug || slugify(product.name ?? id);
  const sku = product.sku ?? `PF-${String(product.category || "item").slice(0, 4).toUpperCase()}-${String(index + 1).padStart(3, "0")}`;

  /* Variants authored in the workspace supply colours and sizes. Active
     variants are selectable; inactive ones are excluded, never deleted. */
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const activeVariants = variants.filter((variant) => variant?.status !== "INACTIVE");
  const variantColors = [...new Set(activeVariants.map((variant) => variant.color).filter(Boolean))];
  const variantSizes = [...new Set(activeVariants.map((variant) => variant.size).filter(Boolean))];

  const colors = product.colors?.length ? product.colors : variantColors;
  const sizes = product.sizes?.length ? product.sizes : variantSizes;

  const discount = percentOff(product.price, product.originalPrice);
  const badges = product.badges ?? [];
  /* Product-owned plates only. Authored hoverImage and category-wide
     gallery pads are not owned by this product and must not appear here —
     the canonical media set decides hover and gallery later. */
  const galleryIds = [product.image, ...(product.additionalImages ?? [])].filter(Boolean);
  const images = [...new Set(galleryIds)].map((entry) => resolveImage(entry, product.name));

  const collection = product.collection ?? product.collections?.[0] ?? "";
  const productCollections = taxonomyRepository.collectionsForProduct(product);
  const collectionLabelsForProduct = productCollections.map((entry) => entry.name);

  return {
    ...product,

    /* Identity */
    id,
    slug,
    sku,
    name: product.name,

    /* Placement */
    category: product.category,
    categoryLabel: taxonomyRepository.getCategoryLabel(product.category),
    subcategory: product.subcategory,
    gender: product.gender,
    collection: taxonomyRepository.getCollectionLabel(collection) || collection,
    collectionIds: productCollections.map((entry) => entry.id),
    collections: collectionLabelsForProduct.length ? collectionLabelsForProduct : (product.collections ?? []),

    /* Price */
    price: product.price,
    originalPrice: product.originalPrice ?? null,
    discount,
    currency: "INR",

    /* Imagery — manifest refs or stored addresses, never raw strings. */
    image: resolveImage(product.image, product.name),
    hoverImage: product.hoverImage ? resolveImage(product.hoverImage, product.name) : undefined,
    images,

    /* Attributes and variants */
    colors,
    unavailableColors: product.unavailableColors ?? [],
    sizes,
    unavailableSizes: product.unavailableSizes ?? [],
    variants,
    fabric: product.fabric,
    material: product.material,
    occasion: product.occasion ?? [],

    /* Reception */
    rating: product.rating ?? 0,
    reviewCount: product.reviewCount ?? 0,

    /* Inventory */
    availability: product.availability ?? "in-stock",
    availabilityLabel: availabilityLabels[product.availability ?? "in-stock"],
    stock: product.stock ?? 0,
    inStock: product.availability !== "unavailable",

    /* Product story — authored values win over category-aware defaults. */
    description: getProductDescription(product),
    shortDescription: product.shortDescription || "",
    highlights: Array.isArray(product.highlights) ? product.highlights : [],
    details: getProductDetails(product),
    careInstructions: getCareInstructions(product),
    specifications: getProductSpecifications(product, sku),
    deliveryInfo: getDeliveryInfo(product),
    returnInfo: getReturnInfo(product),

    /* Merchandising */
    badges,
    /** `ProductCard` reads a single `label`; the first badge is the one shown. */
    label: badges[0] ?? null,
    isFeatured: Boolean(product.isFeatured),
    isNew: Boolean(product.isNew),
    isBestseller: Boolean(product.isBestseller),

    /**
     * Recommendation weight. A deterministic blend of rating, review volume
     * and merchandising flags — this is the "Recommended" sort order, and the
     * hook a future recommendation service would replace.
     */
    score:
      (product.rating ?? 0) * 20 +
      Math.min(product.reviewCount ?? 0, 300) / 10 +
      (product.isFeatured ? 25 : 0) +
      (product.isBestseller ? 15 : 0) +
      (product.isNew ? 8 : 0),

    /**
     * Recency proxy. The catalogue is authored oldest-first, so a later index
     * is a newer piece; flagged arrivals are pushed to the front of `newest`.
     */
    addedOrder: index + (product.isNew ? 1000 : 0),

    /* Search */
    tags: buildTags(product),
  };
};

const withSearchText = (product) => ({
  ...product,
  searchText: normaliseSearchText((product.tags ?? []).join(" ")),
});

/** Every product in the authored catalogue, normalised. */
const seededProducts = catalogue.map((product, index) =>
  withSearchText(toStorefrontProduct(product, index))
);

/**
 * The shared admin register, when a browser session has saved one. Records
 * may be authored catalogue rows, Phase 11 minimal rows or Phase 13 complete
 * rows — hydration fills whatever is missing. Only PUBLISHED records reach
 * the customer.
 */
const isCustomerVisible = (record) => {
  if (!record) return false;
  if (taxonomyRepository.findCategory(record.category)?.status !== "ACTIVE") return false;
  if (record.status) return record.status === "PUBLISHED";
  return record.published !== false;
};

/**
 * Memoised against the raw register string (Phase 21.1). Lookups such as
 * `getProductById` run from very hot paths — order hydration, analytics,
 * the AI assistants — and the derived list is a deterministic function of
 * the register: any save() writes a new string and invalidates the cache.
 */
let liveCache = null;

export const getLiveStorefrontProducts = () => {
  const fingerprint = productsRegisterRaw() ?? "seed";
  if (liveCache && liveCache.fingerprint === fingerprint) return liveCache.list;

  let list = null;
  try {
    const records = catalogRepository.all();
    if (Array.isArray(records) && records.length > 0) {
      const seenSlugs = new Set();
      list = records
        .filter(isCustomerVisible)
        .map((record, index) => withSearchText(toStorefrontProduct(record, index)))
        .map((product) => {
          let slug = product.slug;
          if (seenSlugs.has(slug)) slug = `${slug}-${String(product.id).slice(-4)}`;
          seenSlugs.add(slug);
          return slug === product.slug ? product : { ...product, slug };
        });
    }
  } catch {
    /* fallback to seeded */
  }
  if (!list) list = seededProducts;
  liveCache = { fingerprint, list };
  return list;
};

export const products = getLiveStorefrontProducts();

/* ------------------------------------------------------------------ */
/* Lookups                                                             */
/* ------------------------------------------------------------------ */

export const getProductBySlug = (slug) => {
  const current = getLiveStorefrontProducts();
  return current.find((p) => p.slug === slug) ?? null;
};

export const getProductById = (id) => {
  const current = getLiveStorefrontProducts();
  return current.find((p) => String(p.id) === String(id)) ?? null;
};

export const getProductByIdentifier = (value) => {
  const current = getLiveStorefrontProducts();
  return current.find((p) => p.slug === value || String(p.id) === String(value)) ?? null;
};

/** Canonical URL for the reusable product-detail route. */
export const productHref = (product) => `/product/${product.slug}`;

/* ------------------------------------------------------------------ */
/* Derived vocabularies                                                */
/* ------------------------------------------------------------------ */

/**
 * The distinct values actually present in the catalogue, for the facets whose
 * options are inventory-driven rather than declared. Reading these from the
 * data means the filter panel can never offer a value that matches nothing.
 */
const distinct = (field, { multiple = false } = {}) => {
  const current = getLiveStorefrontProducts();
  const seen = new Set();
  current.forEach((product) => {
    const value = product[field];
    if (multiple) (value ?? []).forEach((entry) => seen.add(entry));
    else if (value) seen.add(value);
  });
  return [...seen];
};

export const catalogueValues = {
  subcategory: distinct("subcategory").sort((a, b) => a.localeCompare(b)),
  fabric: distinct("fabric").sort((a, b) => a.localeCompare(b)),
  material: distinct("material").sort((a, b) => a.localeCompare(b)),
  occasion: distinct("occasion", { multiple: true }),
  color: distinct("colors", { multiple: true }),
  size: distinct("sizes", { multiple: true }),
  collection: distinct("collection").sort((a, b) => a.localeCompare(b)),
};

/** Subcategories grouped by the category they belong to. */
export const subcategoriesByCategory = products.reduce((map, product) => {
  const list = map[product.category] ?? (map[product.category] = []);
  if (!list.includes(product.subcategory)) list.push(product.subcategory);
  return map;
}, {});

/** How many products sit in each category — used by the shop shortcuts. */
export const categoryCounts = products.reduce((counts, product) => {
  counts[product.category] = (counts[product.category] ?? 0) + 1;
  return counts;
}, {});

export { categoryLabels, getCategory };

export default products;
