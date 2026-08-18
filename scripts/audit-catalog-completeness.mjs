/** Audit completeness of the one canonical Product Catalog. */

import { existsSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { departments } from "../src/data/catalog/taxonomy.js";
import { isCanonicalMediaUrl } from "../src/services/media/mediaPaths.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const products = catalogRepository.all();
const uniqueIds = new Set(products.map((product) => product.id));
const missingTaxonomy = products.filter((product) => {
  const department = departments.find((entry) => entry.id === product.department);
  const category = department?.categories.find((entry) => entry.id === product.category);
  return !category?.subcategories.some((entry) => entry.id === product.subcategory);
});
const invalidProducts = products
  .map((product) => ({ product, validation: validateProductForPublish(product) }))
  .filter(({ validation }) => !validation.ok);
const mediaSets = products.map((product) => ({ product, set: getProductMediaSet(product) }));
const withoutMedia = mediaSets.filter(({ set }) => !set.primary?.src);
const nonCanonicalMedia = mediaSets.filter(
  ({ set }) => set.primary?.src && !isCanonicalMediaUrl(set.primary.src)
);
const missingFiles = mediaSets.filter(({ set }) => {
  const src = String(set.primary?.src || "").split("?")[0];
  return src.startsWith("/") && !existsSync(join(process.cwd(), "public", src.slice(1)));
});
const byDepartment = products.reduce((counts, product) => {
  counts[product.department] = (counts[product.department] || 0) + 1;
  return counts;
}, {});

const checks = [
  ["Product Catalog is non-empty", products.length > 0, products.length],
  ["Canonical Product IDs are unique", uniqueIds.size === products.length, uniqueIds.size],
  ["Every Product belongs to canonical taxonomy", missingTaxonomy.length === 0, missingTaxonomy.length],
  ["Every Product passes universal validation", invalidProducts.length === 0, invalidProducts.length],
  ["Every Product resolves primary media", withoutMedia.length === 0, withoutMedia.length],
  ["Resolved primary media uses /images/products", nonCanonicalMedia.length === 0, nonCanonicalMedia.length],
  ["Resolved local primary files exist", missingFiles.length === 0, missingFiles.length],
];

console.log("# CANONICAL CATALOG COMPLETENESS AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`));
console.log("\nDepartment discovery:");
Object.entries(byDepartment).sort().forEach(([department, count]) => console.log(`- ${department}: ${count}`));
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
