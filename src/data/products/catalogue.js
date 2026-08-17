/**
 * The authored product catalogue is `src/data/catalog/products.js` — the
 * single source of truth seeded from the organised product media. This
 * module keeps the legacy import path working for the taxonomy repository,
 * which derives its category / subcategory vocabulary from these records.
 */
export { products as default } from "../catalog/products";
