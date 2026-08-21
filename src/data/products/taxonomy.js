/**
 * PRATIKSHYA FASHON — Catalogue taxonomy facade (Phase 18).
 *
 * Category, subcategory and collection truth now lives in the central
 * taxonomyRepository. This module keeps the existing storefront imports
 * working while ensuring shop filters, routes, offers and product pages all
 * resolve the same managed taxonomy.
 */

import taxonomyRepository from "../../services/taxonomyRepository";
import { catalogueNavigationScopes, departmentNames } from "../catalog/taxonomy";

const option = (id, label) => ({ id, label });
const activeCategories = () => taxonomyRepository.activeCategories();
const activeCollections = () => taxonomyRepository.activeCollections();

export const categories = activeCategories().map((category) => ({
  ...category,
  label: category.name,
}));

export const categoryLabels = new Proxy({}, {
  get: (_, key) => taxonomyRepository.getCategoryLabel(key),
  ownKeys: () => taxonomyRepository.categories().map((entry) => entry.id),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const getCategory = (id) => taxonomyRepository.findCategory(id);

/* ------------------------------------------------------------------ */
/* Facet vocabularies                                                  */
/* ------------------------------------------------------------------ */

export const genders = [];
export const fabrics = [];
export const materials = [];

export const occasions = [];

export const collections = activeCollections().map((collection) => ({
  ...collection,
  label: collection.name,
}));

export const collectionLabels = new Proxy({}, {
  get: (_, key) => taxonomyRepository.getCollectionLabel(key),
  ownKeys: () => taxonomyRepository.collections().map((entry) => entry.id),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const colorSwatches = {};
export const colors = [];
export const sizes = [];

export const availabilityOptions = [
  { id: "in-stock", label: "In Stock" },
  { id: "low-stock", label: "Only a Few Left" },
  { id: "made-to-order", label: "Made to Order" },
];

export const ratingOptions = [
  { id: "4.5", label: "4.5 & above" },
  { id: "4", label: "4.0 & above" },
  { id: "3.5", label: "3.5 & above" },
];

export const priceBands = [
  { id: "under-2000", label: "Under ₹2,000", min: 0, max: 2000 },
  { id: "2000-5000", label: "₹2,000 – ₹5,000", min: 2000, max: 5000 },
  { id: "5000-10000", label: "₹5,000 – ₹10,000", min: 5000, max: 10000 },
  { id: "10000-25000", label: "₹10,000 – ₹25,000", min: 10000, max: 25000 },
  { id: "25000-plus", label: "₹25,000 & above", min: 25000, max: null },
];

export const getPriceBand = (id) => priceBands.find((band) => band.id === id) ?? null;

export const sortOptions = [
  { id: "recommended", label: "Recommended" },
  { id: "newest", label: "Newest" },
  { id: "price-asc", label: "Price: Low to High" },
  { id: "price-desc", label: "Price: High to Low" },
  { id: "discount", label: "Discount" },
  { id: "name-asc", label: "Name: A–Z" },
  { id: "popularity", label: "Popularity" },
  { id: "rating", label: "Rating" },
];

export const defaultSort = "recommended";

export const filterFacets = [
  { id: "department", label: "Department", field: "department", kind: "list", options: () => Object.entries(departmentNames).map(([id, label]) => option(id, label)) },
  { id: "category", label: "Category", field: "category", kind: "list", options: () => activeCategories().map((c) => option(c.id, c.name)) },
  { id: "subcategory", label: "Style", field: "subcategory", kind: "list", options: null },
  { id: "gender", label: "Worn By", field: "gender", kind: "list", options: () => genders.map((g) => option(g, g)) },
  { id: "price", label: "Price", field: "price", kind: "band", options: () => priceBands.map((b) => option(b.id, b.label)) },
  { id: "size", label: "Size", field: "sizes", multiple: true, kind: "chip", options: null },
  { id: "color", label: "Colour", field: "colors", multiple: true, kind: "swatch", options: null },
  { id: "fabric", label: "Fabric", field: "fabric", kind: "list", options: null },
  { id: "material", label: "Craft", field: "material", kind: "list", options: null },
  { id: "occasion", label: "Occasion", field: "occasion", multiple: true, kind: "list", options: null },
  { id: "collection", label: "Collection", field: "collection", kind: "list", options: () => activeCollections().map((c) => option(c.name, c.name)) },
  { id: "rating", label: "Rating", field: "rating", kind: "band", options: () => ratingOptions },
  { id: "availability", label: "Availability", field: "availability", kind: "list", options: () => availabilityOptions },
];

export const filterKeys = filterFacets.map((facet) => facet.id);
export const getFacet = (id) => filterFacets.find((facet) => facet.id === id) ?? null;

const scope = (id, { title, eyebrow, description, image, filters = {}, breadcrumb = [] }) => ({
  id, title, eyebrow, description, image, filters, breadcrumb,
});

const categoryScope = (category) => scope(category.id, {
  title: category.name,
  eyebrow: category.eyebrow || "Category",
    description: category.description,
    image: category.image,
    heroMediaId: category.bannerMediaId,
    filters: { category: category.id },
});

const collectionScope = (collection) =>
  scope(collection.id, {
    title: collection.name,
    eyebrow: collection.eyebrow || "Collection",
    description: collection.description,
    image: collection.image,
    heroMediaId: collection.heroMediaId,
    thumbnailMediaId: collection.thumbnailMediaId,
    filters: { collectionId: collection.id },
  });

export const categoryRoutes = Object.fromEntries(
  activeCategories().flatMap((category) => {
    const entries = [[category.slug, categoryScope(category)]];
    if (category.id !== category.slug) entries.push([category.id, categoryScope(category)]);
    return entries;
  })
);

export const collectionRoutes = Object.fromEntries(
  activeCollections().flatMap((collection) => {
    const entries = [[collection.slug, collectionScope(collection)]];
    if (collection.id !== collection.slug) entries.push([collection.id, collectionScope(collection)]);
    return entries;
  })
);

/**
 * Every listing path the navigation knows. Department / category /
 * subcategory paths come from the department-based catalogue taxonomy
 * (`src/data/catalog/taxonomy.js`); collection paths and the legacy
 * jewellery aliases are kept so existing deep links still resolve.
 */
const collectionFilter = (collection) => ({ collectionId: collection.id });

const managedCollectionScopes = Object.fromEntries(
  taxonomyRepository.activeCollections().flatMap((collection) => {
    const scope = { filters: collectionFilter(collection) };
    const paths = new Set([`/collections/${collection.id}`]);
    if (collection.slug) paths.add(`/collections/${collection.slug}`);
    return [...paths].map((path) => [path, scope]);
  })
);

export const navigationScopes = {
  ...catalogueNavigationScopes,

  /**
   * Collections is a merchandising context, not a department: the landing
   * page shows the pieces the house has actually curated into an active
   * collection (manual membership or a collection rule, both resolved by
   * `taxonomyRepository`), never the whole catalogue.
   */
  "/collections": { filters: { curated: true } },
  "/collections/cotton": { filters: { fabric: "Cotton" } },
  "/collections/linen": { filters: { fabric: "Linen" } },
  "/collections/chiffon": { filters: { fabric: "Chiffon" } },
  ...managedCollectionScopes,

  /* Legacy jewellery paths — bridal finishing touches today. */
  "/jewellery": { filters: { department: "bridal", category: "finishing-touches" } },
  "/jewellery/bridal-bangles": { filters: { department: "bridal", category: "finishing-touches", subcategory: "bangles" } },
  "/jewellery/gold-finish-bangles": { filters: { department: "bridal", category: "finishing-touches", subcategory: "bangles", style: "gold-finish-bangles" } },
  "/jewellery/kada-and-cuffs": { filters: { department: "bridal", category: "finishing-touches", subcategory: "bangles", style: "kada-bangles" } },
  "/jewellery/earrings": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "earrings" } },
  "/jewellery/necklaces": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "necklace" } },
  "/jewellery/maang-tikka": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "maang-tikka" } },
  "/jewellery/rings": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "ring" } },
  "/jewellery/bridal-jewellery": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "bridal-jewellery" } },
  "/jewellery/sets-and-pairings": { filters: { department: "bridal", category: "finishing-touches", subcategory: "jewellery", style: "jewellery-set" } },

  /* Legacy flat paths — mapped onto their catalogue equivalents. */
  "/women/cotton-sarees": { filters: { department: "women", category: "sarees", subcategory: "cotton" } },
  "/women/silk-sarees": { filters: { department: "women", category: "sarees", subcategory: "silk" } },
  "/women/banarasi-sarees": { filters: { department: "women", category: "sarees", subcategory: "banarasi" } },
  "/women/bridal-lehengas": { filters: { department: "women", category: "lehengas", subcategory: "bridal" } },
  "/women/party-lehengas": { filters: { department: "women", category: "lehengas", subcategory: "party" } },
  "/women/designer-lehengas": { filters: { department: "women", category: "lehengas", subcategory: "designer" } },
  "/women/kurtis-and-suits": { filters: { department: "women", category: "essentials", subcategory: "kurtis-suits" } },
  "/women/innerwear": { filters: { department: "women", category: "essentials", subcategory: "innerwear" } },
  "/women/dupattas-and-stoles": { filters: { department: "women", category: "essentials", subcategory: "dupattas-stoles" } },
  "/bridal/bridal-sarees": { filters: { department: "bridal", category: "the-bride", subcategory: "sarees" } },
  "/bridal/bridal-lehengas": { filters: { department: "bridal", category: "the-bride", subcategory: "lehengas" } },
  "/bridal/reception-wear": { filters: { department: "bridal", category: "the-bride", subcategory: "reception-wear" } },
  "/bridal/mehendi-and-haldi": { filters: { department: "bridal", category: "celebrations", subcategory: "mehendi-haldi" } },
  "/bridal/sangeet-edit": { filters: { department: "bridal", category: "celebrations", subcategory: "sangeet" } },
  "/bridal/trousseau-edit": { filters: { department: "bridal", category: "celebrations", subcategory: "trousseau" } },
  "/men/kurta-pajama": { filters: { department: "men", category: "ethnic-wear", subcategory: "kurta-pajama" } },
  "/men/nehru-jackets": { filters: { department: "men", category: "ethnic-wear", subcategory: "nehru-jackets" } },
  "/men/groom": { filters: { department: "men", category: "groom" } },
};

export const hasNavigationScope = (pathname) =>
  Object.prototype.hasOwnProperty.call(navigationScopes, pathname);

/**
 * Route → storefront context.
 *
 * The single place a listing pathname becomes the locked filters the generic
 * catalogue query runs with. Every entry above is a `{ filters }` record; a
 * bare filter map is still accepted so a hand-authored scope can never fall
 * back to "no filters at all" — an unscoped listing is the one failure mode
 * that silently shows the whole catalogue on a department page.
 *
 * @param {string} pathname
 * @returns {{ filters: object } | null}
 */
export const resolveNavigationScope = (pathname) => {
  if (!hasNavigationScope(pathname)) return null;
  const entry = navigationScopes[pathname] ?? {};
  const filters =
    entry.filters && typeof entry.filters === "object" ? entry.filters : entry;
  return { ...entry, filters: filters ?? {} };
};

export default {
  categories, genders, fabrics, materials, occasions, collections, colors,
  colorSwatches, sizes, availabilityOptions, ratingOptions, priceBands,
  sortOptions, filterFacets, categoryRoutes, collectionRoutes, navigationScopes,
};
