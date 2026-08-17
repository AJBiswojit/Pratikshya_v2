/**
 * PRATIKSHYA FASHON — Product Catalog Selector query.
 *
 * Pure search + filter logic shared by the Product Catalog Selector and its
 * tests. The catalogue is the canonical source (`catalogRepository`), and
 * the filter option lists derive from the taxonomy data in
 * `src/data/catalog/taxonomy.js` — nothing here hardcodes a department,
 * category or subcategory.
 *
 * No React, no storage, no writes.
 */

import { departments as taxonomyDepartments } from "../../data/catalog/taxonomy";
import { categoryLabels } from "../../data/products/taxonomy";

const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/** Every field a shopper/operator might type, lower-cased and joined. */
export const searchableText = (product) =>
  [
    product?.name,
    product?.id,
    product?.sku,
    product?.productId,
    product?.department,
    product?.category,
    categoryLabels[product?.category],
    product?.subcategory,
    product?.style,
    product?.fabric,
    product?.gender,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

/** True when every whitespace-separated term appears in the haystack. */
export const matchesQuery = (product, query) => {
  if (!query) return true;
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return true;
  const haystack = searchableText(product);
  return terms.every((term) => haystack.includes(term));
};

/**
 * Applies the selector's filters to the catalogue.
 * `ALL` (or null/undefined) means the filter is open.
 */
export const filterCatalogProducts = (
  products = [],
  { department = "ALL", category = "ALL", subcategory = "ALL", query = "" } = {}
) =>
  (products || []).filter((product) => {
    if (department !== "ALL" && product.department !== department) return false;
    if (category !== "ALL" && product.category !== category) return false;
    if (subcategory !== "ALL" && product.subcategory !== subcategory) return false;
    return matchesQuery(product, query);
  });

/* ------------------------------------------------------------------ */
/* Filter options — taxonomy is the source, the catalogue only adds     */
/* subcategory spellings the taxonomy may not list (e.g. "pato").       */
/* ------------------------------------------------------------------ */

export const departmentOptions = () =>
  taxonomyDepartments.map((department) => ({ id: department.id, label: department.name }));

export const categoryOptionsFor = (products = [], departmentId) => {
  const tax = taxonomyDepartments.find((department) => department.id === departmentId) ?? null;
  const fromTaxonomy = tax
    ? tax.categories.map((category) => ({ id: category.id, label: category.name }))
    : [];
  const fromProducts = [
    ...new Set(
      (products || [])
        .filter((product) => product.department === departmentId && product.category)
        .map((product) => product.category)
    ),
  ].map((id) => ({ id, label: categoryLabels[id] ?? titleCase(id) }));
  const seen = new Set(fromTaxonomy.map((entry) => entry.id));
  return [...fromTaxonomy, ...fromProducts.filter((entry) => !seen.has(entry.id))];
};

export const subcategoryOptionsFor = (products = [], departmentId, categoryId) => {
  const tax = taxonomyDepartments.find((department) => department.id === departmentId) ?? null;
  const category = tax?.categories.find((entry) => entry.id === categoryId) ?? null;
  const fromTaxonomy = category
    ? category.subcategories.map((subcategory) => ({
        id: subcategory.id,
        label: subcategory.name,
      }))
    : [];
  const fromProducts = [
    ...new Set(
      (products || [])
        .filter(
          (product) =>
            product.department === departmentId &&
            product.category === categoryId &&
            product.subcategory
        )
        .map((product) => product.subcategory)
    ),
  ].map((id) => ({ id, label: titleCase(id) }));
  const seen = new Set(fromTaxonomy.map((entry) => entry.id));
  return [...fromTaxonomy, ...fromProducts.filter((entry) => !seen.has(entry.id))];
};

export default {
  searchableText,
  matchesQuery,
  filterCatalogProducts,
  departmentOptions,
  categoryOptionsFor,
  subcategoryOptionsFor,
};
