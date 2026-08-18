/**
 * PRATIKSHYA FASHON — Catalogue query engine.
 *
 * One pure module that turns (products, filters, search, sort) into a result
 * set. Every storefront route runs through it, which is what stops `/shop`,
 * `/category/*`, `/collection/*` and `/search` from growing three different
 * definitions of "matching".
 *
 * Nothing here touches React or the URL. `useCatalogueQuery` binds it to the
 * query string; this file stays testable and framework-free.
 */

import { getPriceBand, filterFacets, sortOptions, defaultSort } from "./taxonomy";
import { normaliseSearchText, getLiveStorefrontProducts } from "./index";
import taxonomyRepository from "../../services/taxonomyRepository";

/* ------------------------------------------------------------------ */
/* Matching                                                            */
/* ------------------------------------------------------------------ */

/**
 * Case-insensitive partial match across the pre-built search haystack.
 *
 * Every word of the term must appear somewhere in the record, so "silk
 * saree" narrows rather than widens. Punctuation is stripped from both
 * sides — "Men's Kurta" has to find "Men" and "Kurta".
 */
export const matchesSearch = (product, term) => {
  if (!term) return true;
  const words = normaliseSearchText(term).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  return words.every((word) => product.searchText.includes(word));
};

/** Friendly Explore / share URLs (`women`, `price-low`) map onto taxonomy ids. */
export const CATEGORY_FILTER_ALIASES = {
  men: "menswear",
  mens: "menswear",
  "mens-wear": "menswear",
  menswear: "menswear",
  jewellery: "jewellery",
  jewelry: "jewellery",
  bridal: "bridal-couture",
  "bridal-couture": "bridal-couture",
  saree: "sarees",
  sarees: "sarees",
  lehenga: "lehengas",
  lehengas: "lehengas",
  bangle: "bangles",
  bangles: "bangles",
  kurti: "kurtis-and-suits",
  kurtis: "kurtis-and-suits",
  "kurtis-and-suits": "kurtis-and-suits",
  innerwear: "innerwear",
  dupatta: "dupattas",
  dupattas: "dupattas",
};

export const resolveCategoryFilter = (value) => {
  if (value == null || value === "") return value;
  const key = String(value).toLowerCase();
  return CATEGORY_FILTER_ALIASES[key] || value;
};

export const isProductOnSale = (product) => {
  if (!product) return false;
  if (typeof product.discount === "number" && product.discount > 0) return true;
  return typeof product.originalPrice === "number" && product.originalPrice > Number(product.price);
};

const matchers = {
  department: (product, value) => product.department === value,
  category: (product, value) => product.category === resolveCategoryFilter(value),
  subcategory: (product, value) => product.subcategory === value,
  style: (product, value) => product.style === value,
  gender: (product, value) => product.gender === value,
  fabric: (product, value) => product.fabric === value,
  material: (product, value) => product.material === value,
  collection: (product, value) =>
    product.collection === value ||
    (product.collections ?? []).includes(value) ||
    taxonomyRepository.isProductInCollection(product, value),
  collectionId: (product, value) => taxonomyRepository.isProductInCollection(product, value),
  /**
   * Editorial curation. `curated: true` keeps the pieces that belong to at
   * least one ACTIVE collection — manual membership, an authored collection
   * field or a collection rule, all resolved by the taxonomy repository.
   * This is what makes `/collections` a merchandising context rather than a
   * second copy of the catalogue.
   */
  curated: (product, value) => {
    const inActiveCollection = taxonomyRepository
      .collectionsForProduct(product)
      .some((collection) => collection.displayStatus === "ACTIVE");
    const expected = value === false || value === "false" ? false : Boolean(value);
    return inActiveCollection === expected;
  },
  availability: (product, value) => product.availability === value,
  occasion: (product, value) => product.occasion.includes(value),
  color: (product, value) => product.colors.includes(value),
  size: (product, value) => product.sizes.includes(value),
  rating: (product, value) => product.rating >= Number(value),
  price: (product, value) => {
    const band = getPriceBand(value);
    if (!band) return true;
    return product.price >= band.min && (band.max === null || product.price < band.max);
  },
  /** Merchandising flags, used by collection scopes (`isNew`, `isFeatured`). */
  flag: (product, value) => Boolean(product[value]),
  /** New arrivals / on-sale highlights — only real catalogue signals. */
  merch: (product, value) => {
    if (value === "new") return Boolean(product.isNew);
    if (value === "sale") return isProductOnSale(product);
    return true;
  },
};

/** True when a product satisfies every active filter. */
export const matchesFilters = (product, filters = {}) =>
  Object.entries(filters).every(([key, value]) => {
    if (value === undefined || value === null || value === "") return true;
    const matcher = matchers[key];
    if (!matcher) return true;
    /* An array of values for one facet reads as OR — "Red or Gold". */
    return Array.isArray(value)
      ? value.length === 0 || value.some((entry) => matcher(product, entry))
      : matcher(product, value);
  });

/* ------------------------------------------------------------------ */
/* Sorting                                                             */
/* ------------------------------------------------------------------ */

const comparators = {
  recommended: (a, b) => b.score - a.score,
  newest: (a, b) => b.addedOrder - a.addedOrder,
  "price-asc": (a, b) => a.price - b.price,
  "price-desc": (a, b) => b.price - a.price,
  popularity: (a, b) => b.reviewCount - a.reviewCount,
  rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
  discount: (a, b) => (Number(b.discount) || 0) - (Number(a.discount) || 0),
  "name-asc": (a, b) => String(a.name || "").localeCompare(String(b.name || ""), undefined, {
    sensitivity: "base",
  }),
};

export const sortIds = sortOptions.map((option) => option.id);

/** Shareable sort aliases used by Explore (`price-low` → `price-asc`). */
export const SORT_ALIASES = {
  "price-low": "price-asc",
  "price-high": "price-desc",
  name: "name-asc",
  "name-az": "name-asc",
  az: "name-asc",
};

export const resolveSort = (value, fallback = defaultSort) => {
  const canonical = SORT_ALIASES[value] || value;
  return sortIds.includes(canonical) ? canonical : fallback;
};

/** Sorts a copy; ties break on id so the order is always deterministic. */
export const sortProducts = (list, sort = defaultSort) => {
  const resolved = resolveSort(sort, defaultSort);
  const compare = comparators[resolved] ?? comparators[defaultSort];
  return [...list].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id));
};

/* ------------------------------------------------------------------ */
/* Facet counts                                                        */
/* ------------------------------------------------------------------ */

/**
 * How many products each option would yield.
 *
 * Counted against the set filtered by *every other* facet, which is the
 * behaviour shoppers expect: refining colour must not zero out the colour
 * list itself, but it should update the fabric counts beside it.
 */
export const countFacet = (base, filters, facetId) => {
  const others = { ...filters };
  delete others[facetId];

  const pool = base.filter((product) => matchesFilters(product, others));
  const matcher = matchers[facetId];
  if (!matcher) return {};

  const counts = {};
  pool.forEach((product) => {
    const facet = filterFacets.find((entry) => entry.id === facetId);
    const raw = product[facet?.field ?? facetId];
    const values = Array.isArray(raw) ? raw : [raw];

    if (facetId === "price" || facetId === "rating") {
      /* Band facets have no value on the product to group by, so each option
         is tested directly by the caller instead. */
      return;
    }
    values.filter(Boolean).forEach((value) => {
      counts[value] = (counts[value] ?? 0) + 1;
    });
  });

  return counts;
};

/** Counts for a band facet, where options are ranges rather than values. */
export const countBand = (base, filters, facetId, optionIds) => {
  const others = { ...filters };
  delete others[facetId];
  const pool = base.filter((product) => matchesFilters(product, others));
  const matcher = matchers[facetId];

  return Object.fromEntries(
    optionIds.map((id) => [id, pool.filter((product) => matcher(product, id)).length])
  );
};

/* ------------------------------------------------------------------ */
/* The query                                                           */
/* ------------------------------------------------------------------ */

/**
 * Runs a full catalogue query.
 *
 * `scopeFilters` are the locked filters a route carries (a category page is
 * permanently a category page); `filters` are the shopper's own choices.
 * They are applied together, but only the latter can be cleared.
 */
export const queryCatalogue = ({
  source = null,
  scopeFilters = {},
  filters = {},
  search = "",
  sort = defaultSort,
} = {}) => {
  const productSource = source || getLiveStorefrontProducts();
  const scoped = productSource.filter(
    (product) =>
      product.status !== "DRAFT" &&
      product.status !== "ARCHIVED" &&
      product.published !== false &&
      taxonomyRepository.findCategory(product.category)?.status === "ACTIVE" &&
      matchesFilters(product, scopeFilters) &&
      matchesSearch(product, search)
  );
  const matched = scoped.filter((product) => matchesFilters(product, filters));

  return {
    /** Everything the route contains, before the shopper's filters. */
    scoped,
    /** The result set. */
    results: sortProducts(matched, sort),
    total: matched.length,
    scopeTotal: scoped.length,
  };
};

export default queryCatalogue;
