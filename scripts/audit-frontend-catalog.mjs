/** Verify the canonical Product Catalog → taxonomy → Product Media frontend chain. */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

import { products } from "../src/data/catalog/products.js";
import { catalogueNavigationScopes, catalogueRoutes, departments } from "../src/data/catalog/taxonomy.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { isCanonicalMediaUrl } from "../src/services/media/mediaPaths.js";
import { getProductCardMedia, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { validateProductForPublish } from "../src/services/workflow/productPublishValidator.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (/\.(?:js|jsx)$/.test(entry.name)) files.push(path);
  }
  return files;
};
const checkTaxonomy = (product) => {
  const department = departments.find((entry) => entry.id === product.department);
  const category = department?.categories.find((entry) => entry.id === product.category);
  return Boolean(category?.subcategories.some((entry) => entry.id === product.subcategory));
};
const localExists = (src) => {
  const path = String(src || "").split("?")[0];
  return !path.startsWith("/") || existsSync(join(process.cwd(), "public", path.slice(1)));
};

const register = catalogRepository.all();
const registerIds = new Set(register.map((product) => product.id));
const ids = new Set(products.map((product) => product.id));
const skus = new Set(products.map((product) => product.sku));
const mediaFailures = register.filter((product) => {
  const set = getProductMediaSet(product);
  const card = getProductCardMedia(product);
  const entries = [set.primary, ...(set.gallery || [])].filter(Boolean);
  return !card.image?.src || !set.primary?.src || entries.some((entry) => !isCanonicalMediaUrl(entry.src) || !localExists(entry.src));
});
const validationFailures = register.filter((product) => !validateProductForPublish(product).ok);
const parallelDepartmentCollection = "kids" + "Products";
const hardcodedCollectionPattern = new RegExp(
  `const\\s+(?:products|${parallelDepartmentCollection}|productCards)\\s*=\\s*\\[`
);
const sourceViolations = [...walk("src/components"), ...walk("src/pages")].filter((path) => {
  const source = readFileSync(path, "utf8");
  return hardcodedCollectionPattern.test(source) || /["'`]\/images\/products\/[^"'`$]+["'`]/.test(source);
});
const expectedRoutes = departments.flatMap((department) => [
  department.path,
  ...department.categories.flatMap((category) => [
    category.path,
    ...category.subcategories.map((subcategory) => subcategory.path),
  ]),
]);
const routeSet = new Set(catalogueRoutes.map((route) => route.path));

const checks = [
  ["Authored Product IDs are unique", ids.size === products.length, ids.size],
  ["Authored SKUs are unique", skus.size === products.length, skus.size],
  ["Repository resolves every authored Product ID", products.every((product) => registerIds.has(product.id)) && register.length === products.length, register.length],
  ["Every Product references canonical taxonomy", register.every(checkTaxonomy), register.filter((product) => !checkTaxonomy(product)).length],
  ["Every Product passes universal validation", validationFailures.length === 0, validationFailures.length],
  ["Product Card and gallery resolve canonical Product Media files", mediaFailures.length === 0, mediaFailures.length],
  ["Every taxonomy path has one listing route", expectedRoutes.every((path) => routeSet.has(path)), expectedRoutes.length],
  ["Every listing route has a navigation scope", catalogueRoutes.every((route) => Boolean(catalogueNavigationScopes[route.path]?.filters?.department)), catalogueRoutes.length],
  ["Components/pages contain no Product inventory or embedded Product Media", sourceViolations.length === 0, sourceViolations.map((path) => relative(process.cwd(), path)).join(", ") || "none"],
];

console.log("# FRONTEND CANONICAL CATALOG AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`));
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
