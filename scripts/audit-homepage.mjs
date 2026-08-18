/**
 * Verify that homepage sections consume canonical taxonomy, Product records,
 * Product Media resolvers, and canonical routes. No inventory size or filename
 * is treated as architecture.
 */

import catalogRepository from "../src/services/catalogRepository.js";
import { productHref } from "../src/data/products/index.js";
import { auditHomepageSections } from "../src/services/media/mediaExposure.js";
import { isCanonicalMediaUrl } from "../src/services/media/mediaPaths.js";
import { resolveProductCover } from "../src/services/media/mediaResolver.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { resolveCategoryRoute, resolveCollectionRoute } from "../src/services/taxonomyRouting.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const products = catalogRepository.all();
const kids = products.filter((product) => product.department === "kids");
const categories = taxonomyRepository.activeCategories();
const collections = taxonomyRepository.activeCollections();
const report = auditHomepageSections();

const rows = [
  ...report.hero,
  ...report.editorial,
  ...report.shopByCategory,
  ...report.collections,
  ...report.newArrivals,
  ...(report.sale ? [report.sale] : []),
  ...(report.brideGroom?.bride || []),
  ...(report.brideGroom?.groom || []),
];
const resolvedRows = rows.filter((row) => row?.mediaId || row?.filename);
const brokenRows = rows.filter((row) => row?.broken);
const nonCanonicalAuthoredRows = resolvedRows.filter(
  (row) => row.scope === "PRODUCT" && row.source !== "CANONICAL_MEDIA" && row.source !== "PRODUCT_GALLERY"
);
const categoryRouteFailures = categories.filter((category) => !resolveCategoryRoute(category.id));
const collectionRouteFailures = collections.filter((collection) => !resolveCollectionRoute(collection.id));
const productRouteFailures = products.filter((product) => productHref(product) !== `/product/${product.id}`);
const kidsOwnershipFailures = kids.filter((product) => {
  const cover = resolveProductCover(product);
  return cover?.src && !isCanonicalMediaUrl(cover.src);
});

const checks = [
  ["Canonical catalogue is available", products.length > 0, products.length],
  ["Kids discovered by department filter", kids.length > 0, kids.length],
  ["Homepage report has taxonomy cards", report.shopByCategory.length > 0, report.shopByCategory.length],
  ["Resolved homepage media is not broken", brokenRows.length === 0, brokenRows.length],
  ["Product-scoped homepage media is canonical", nonCanonicalAuthoredRows.length === 0, nonCanonicalAuthoredRows.length],
  ["Category routes resolve from taxonomy", categoryRouteFailures.length === 0, categoryRouteFailures.length],
  ["Collection routes resolve from taxonomy", collectionRouteFailures.length === 0, collectionRouteFailures.length],
  ["Product links preserve canonical Product IDs", productRouteFailures.length === 0, productRouteFailures.length],
  ["Kids covers use canonical Product Media", kidsOwnershipFailures.length === 0, kidsOwnershipFailures.length],
];

console.log("# HOMEPAGE CANONICAL DATA-FLOW AUDIT\n");
for (const [label, pass, detail] of checks) {
  console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`);
}
console.log(`\nHomepage rows: ${rows.length}; currently resolved: ${resolvedRows.length}.`);
console.log("Unresolved optional marketing/editorial rows are valid when fresh managed-media storage is empty.");

if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
