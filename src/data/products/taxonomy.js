/**
 * PRATIKSHYA FASHON — Catalogue taxonomy facade (Phase 18).
 *
 * Category, subcategory and collection truth now lives in the central
 * taxonomyRepository. This module keeps the existing storefront imports
 * working while ensuring shop filters, routes, offers and product pages all
 * resolve the same managed taxonomy.
 */

import taxonomyRepository from "../../services/taxonomyRepository";

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

export const genders = ["Women", "Men", "Kids", "Unisex"];

export const fabrics = [
  "Pato Silk", "Mulberry Silk", "Tussar Silk", "Banarasi Silk", "Katan Silk",
  "Cotton", "Cotton Silk", "Linen", "Chiffon", "Georgette", "Velvet", "Organza",
  "Raw Silk", "Brocade", "Modal", "Brass Alloy", "Silver Alloy",
];

export const materials = [
  "Handloom", "Powerloom", "Zari Work", "Zardozi", "Mirror Work", "Sequin",
  "Thread Embroidery", "Block Print", "Ikat", "Kundan", "Polki", "Gold Plated",
  "Oxidised Silver", "Pearl",
];

export const occasions = [
  "Bridal", "Wedding", "Reception", "Sangeet", "Mehendi", "Haldi", "Festive",
  "Puja", "Party", "Everyday", "Play", "Office", "Gifting",
];

export const collections = activeCollections().map((collection) => ({
  ...collection,
  label: collection.name,
}));

export const collectionLabels = new Proxy({}, {
  get: (_, key) => taxonomyRepository.getCollectionLabel(key),
  ownKeys: () => taxonomyRepository.collections().map((entry) => entry.id),
  getOwnPropertyDescriptor: () => ({ enumerable: true, configurable: true }),
});

export const colorSwatches = {
  Ivory: "#f2ece2", Gold: "#c9a44c", Maroon: "#6d1f2a", Wine: "#5c1f33",
  Red: "#9b2226", Rust: "#8a3e22", Saffron: "#d98324", Mustard: "#c9992c",
  Emerald: "#1f5741", Teal: "#1f5560", Navy: "#20304d", Indigo: "#33406b",
  Blush: "#e8d5c4", Rose: "#b76e79", Black: "#1c1a18", Silver: "#b8bcc0",
  Beige: "#d8c9b4", Sage: "#8a9a80",
  /* Kidswear remap — the colours the 21 library plates actually carry. */
  Cream: "#f3ead9", Tan: "#c9a87c", Brown: "#7d5a38", Yellow: "#dfb93e",
  Blue: "#3b6ea5", White: "#f6f4ef", "Sky Blue": "#a9cce0", Olive: "#7a7c4c",
  Charcoal: "#3c4043", Grey: "#9b9ea3", Terracotta: "#c07a54", Peach: "#e8b28c",
};

export const colors = Object.keys(colorSwatches);

export const sizes = [
  "Free Size", "XS", "S", "M", "L", "XL", "XXL", "2.4", "2.6", "2.8", "2.10",
  "38", "40", "42", "44", "2-3Y", "4-5Y", "6-7Y", "8-9Y", "10-12Y",
];

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

const collectionScope = (collection) => {
  const filters = collection.rule?.flag
    ? { flag: collection.rule.flag }
    : collection.rule?.occasion
      ? { occasion: collection.rule.occasion }
      : { collectionId: collection.id };
  return scope(collection.id, {
    title: collection.name,
    eyebrow: collection.eyebrow || "Collection",
    description: collection.description,
    image: collection.image,
    heroMediaId: collection.heroMediaId,
    thumbnailMediaId: collection.thumbnailMediaId,
    filters,
  });
};

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

export const navigationScopes = {
  "/women": { filters: { gender: "Women" }, title: "Women" },
  "/women/pato-sarees": { filters: { category: "sarees", subcategory: "Pato Saree" } },
  "/women/cotton-sarees": { filters: { category: "sarees", subcategory: "Cotton Saree" } },
  "/women/silk-sarees": { filters: { category: "sarees", subcategory: "Silk Saree" } },
  "/women/banarasi-sarees": { filters: { category: "sarees", subcategory: "Banarasi Saree" } },
  "/women/printed-sarees": { filters: { category: "sarees", subcategory: "Printed Saree" } },
  "/women/designer-sarees": { filters: { category: "sarees", subcategory: "Designer Saree" } },
  "/women/bridal-lehengas": { filters: { category: "lehengas", subcategory: "Bridal Lehenga" } },
  "/women/party-lehengas": { filters: { category: "lehengas", subcategory: "Party Lehenga" } },
  "/women/designer-lehengas": { filters: { category: "lehengas", subcategory: "Designer Lehenga" } },
  "/women/kurtis-and-suits": { filters: { category: "kurtis-and-suits" } },
  "/women/innerwear": { filters: { category: "innerwear" } },
  "/women/dupattas-and-stoles": { filters: { category: "dupattas" } },
  "/bridal": { filters: { occasion: "Bridal" } },
  "/bridal/bridal-sarees": { filters: { category: "sarees", occasion: "Bridal" } },
  "/bridal/bridal-lehengas": { filters: { category: "lehengas", subcategory: "Bridal Lehenga" } },
  "/bridal/reception-wear": { filters: { occasion: "Reception" } },
  "/bridal/mehendi-and-haldi": { filters: { occasion: "Mehendi" } },
  "/bridal/sangeet-edit": { filters: { occasion: "Sangeet" } },
  "/bridal/trousseau-edit": { filters: { collection: "Bridal Trousseau" } },
  "/men": { filters: { gender: "Men" } },
  "/men/kurta": { filters: { category: "menswear", subcategory: "Kurta" } },
  "/men/kurta-pajama": { filters: { category: "menswear", subcategory: "Kurta Pajama" } },
  "/men/nehru-jackets": { filters: { category: "menswear", subcategory: "Nehru Jacket" } },
  "/men/groom": { filters: { gender: "Men", collection: "Groom Atelier" } },
  "/men/sherwani": { filters: { category: "menswear", subcategory: "Sherwani" } },
  "/men/wedding-kurta": { filters: { category: "menswear", occasion: "Wedding" } },
  "/kids": { filters: { gender: "Kids" } },
  "/kids/girls-dresses": { filters: { category: "kidswear", subcategory: "Girls Dress" } },
  "/kids/girls-casual-sets": { filters: { category: "kidswear", subcategory: "Girls Casual Set" } },
  "/kids/boys-casual-sets": { filters: { category: "kidswear", subcategory: "Boys Casual Set" } },
  "/kids/boys-tshirt-shorts": { filters: { category: "kidswear", subcategory: "Boys T-Shirt & Shorts Set" } },
  "/jewellery": { filters: { category: "jewellery" } },
  "/jewellery/bridal-bangles": { filters: { category: "bangles", subcategory: "Bridal Bangles" } },
  "/jewellery/gold-finish-bangles": { filters: { category: "bangles", subcategory: "Gold-finish Bangles" } },
  "/jewellery/kada-and-cuffs": { filters: { category: "bangles", subcategory: "Kada + Cuffs" } },
  "/jewellery/earrings": { filters: { category: "jewellery", subcategory: "Earrings" } },
  "/jewellery/necklaces": { filters: { category: "jewellery", subcategory: "Necklaces" } },
  "/jewellery/maang-tikka": { filters: { category: "jewellery", subcategory: "Maang Tikka" } },
  "/jewellery/rings": { filters: { category: "jewellery", subcategory: "Rings" } },
  "/jewellery/bridal-jewellery": { filters: { category: "jewellery", occasion: "Bridal" } },
  "/jewellery/sets-and-pairings": { filters: { category: "jewellery", subcategory: "Jewellery Set" } },
  "/collections": {},
  "/collections/new-arrivals": { filters: { flag: "isNew" } },
  "/collections/festive-edit": { filters: { collection: "Festive Edit" } },
  "/collections/heritage-weaves": { filters: { collection: "Heritage Weaves" } },
  "/collections/handloom-stories": { filters: { collection: "Handloom Stories" } },
  "/collections/cotton": { filters: { fabric: "Cotton" } },
  "/collections/silk": { filters: { fabric: "Mulberry Silk" } },
  "/collections/linen": { filters: { fabric: "Linen" } },
  "/collections/chiffon": { filters: { fabric: "Chiffon" } },
};

export const hasNavigationScope = (pathname) =>
  Object.prototype.hasOwnProperty.call(navigationScopes, pathname);

export default {
  categories, genders, fabrics, materials, occasions, collections, colors,
  colorSwatches, sizes, availabilityOptions, ratingOptions, priceBands,
  sortOptions, filterFacets, categoryRoutes, collectionRoutes, navigationScopes,
};
