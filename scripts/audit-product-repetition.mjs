/**
 * PRATIKSHYA FASHON — Product repetition audit (Phase 23).
 *
 * Detects the repetition and cross-ownership failures a reconciled catalogue
 * must never have:
 *
 *   · duplicate Product IDs
 *   · duplicate primary media (one primary image on two products)
 *   · duplicate media ownership (one ingested file owned by two products)
 *   · the same media group represented by multiple products
 *   · cross-product gallery references
 *   · cross-category images (a product's image tagged to another category)
 *   · random hover sources (Math.random / shuffle in image selection)
 *   · hardcoded product image paths in storefront components
 *
 * Measured over the INGESTED product photography register, exactly like the
 * existing Phase 22 audits — the legacy house-seed plates intentionally
 * decorate many products and are reported, never failed.
 *
 * Usage:
 *   npm run audit:product-repetition
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { reconciliationMediaGroups } from "../src/services/catalogueReconciliation.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);

const media = mediaRepository.getAll();
const products = catalogRepository.all();

const fileNameOf = (item) =>
  String(
    item?.currentFilename ||
      item?.fileName ||
      (item?.url || item?.thumbnail || "").split("/").pop() ||
      item?.id ||
      ""
  ).toLowerCase();

const isHouse = (item) => item.source === "House artwork" || (item.tags || []).includes("house");
const isIngested = (item) => item.ingested || item.source === "Ingested library";

const failures = [];

/* ------------------------------------------------------------------ */
/* Duplicate Product IDs                                               */
/* ------------------------------------------------------------------ */

const ids = new Map();
products.forEach((product) => {
  const id = String(product.id);
  ids.set(id, (ids.get(id) ?? 0) + 1);
});
const duplicateIds = [...ids.entries()].filter(([, count]) => count > 1);
if (duplicateIds.length) failures.push("duplicate Product IDs");
line("# DUPLICATE PRODUCT IDS");
line(`  ${duplicateIds.length}`);
duplicateIds.forEach(([id, count]) => line(`  · ${id} (×${count})`));

/* ------------------------------------------------------------------ */
/* Duplicate primary media / duplicate media ownership                 */
/* ------------------------------------------------------------------ */

/* Index the ingested product photography by filename so the repetition
   checks below only ever consider real library photography — never the
   legacy house/manifest plates that intentionally decorate many products. */
const ingestedByFile = new Map();
media
  .filter(isIngested)
  .filter((item) => !isHouse(item))
  .forEach((item) => {
    const file = fileNameOf(item);
    if (file && !ingestedByFile.has(file)) ingestedByFile.set(file, item);
  });

const primaryOwners = new Map(); // ingested file identity → [product ids]
const crossProductGallery = [];
const crossCategoryMedia = [];

products.forEach((product) => {
  const set = getProductMediaSet(product);
  const primary = set.primary;
  if (primary) {
    const file = fileNameOf(primary);
    if (file && ingestedByFile.has(file)) {
      if (!primaryOwners.has(file)) primaryOwners.set(file, []);
      primaryOwners.get(file).push(String(product.id));
    }
  }
  (set.gallery ?? []).forEach((item) => {
    const file = fileNameOf(item);
    const record = ingestedByFile.get(file);
    if (item.productId && String(item.productId) !== String(product.id)) {
      crossProductGallery.push({
        productId: product.id,
        file,
        ownerProductId: item.productId,
      });
    }
    /* Cross-category: an ingested photograph whose categoryId differs from
       the category of the product that owns it. Unmapped media (no
       categoryId) is a taxonomy-review signal, not a cross-category match. */
    if (record && record.categoryId && product.category && record.categoryId !== product.category) {
      crossCategoryMedia.push({
        productId: product.id,
        file,
        mediaCategory: record.categoryId,
        productCategory: product.category,
      });
    }
  });
});

/* Ingested primary media shared by more than one product. */
const duplicatePrimary = [...primaryOwners.entries()]
  .map(([file, owners]) => ({ file, owners: [...new Set(owners)] }))
  .filter((entry) => entry.owners.length > 1);

/* Ingested file owned by more than one product (register level). */
const byFile = new Map();
media
  .filter(isIngested)
  .filter((item) => !isHouse(item))
  .forEach((item) => {
    const file = fileNameOf(item);
    if (!file) return;
    if (!byFile.has(file)) byFile.set(file, new Set());
    byFile.get(file).add(String(item.productId ?? ""));
  });
const duplicateOwnership = [...byFile.entries()]
  .map(([file, owners]) => ({ file, owners: [...owners] }))
  .filter((entry) => new Set(entry.owners.filter(Boolean)).size > 1);

if (duplicateOwnership.length) failures.push("duplicate media ownership");
if (crossProductGallery.length) failures.push("cross-product gallery references");
if (crossCategoryMedia.length) failures.push("cross-category images");

line();
line("# DUPLICATE PRIMARY MEDIA (ingested photography)");
line(`  ${duplicatePrimary.length}`);
duplicatePrimary.forEach((entry) => line(`  · ${entry.file} → ${entry.owners.join(", ")}`));

line();
line("# DUPLICATE MEDIA OWNERSHIP (ingested photography)");
line(`  ${duplicateOwnership.length}`);
duplicateOwnership.forEach((entry) => line(`  · ${entry.file} → ${entry.owners.join(", ")}`));

line();
line("# CROSS-PRODUCT GALLERY REFERENCES");
line(`  ${crossProductGallery.length}`);
crossProductGallery.forEach((entry) =>
  line(`  · ${entry.productId} → ${entry.file} (owned by ${entry.ownerProductId})`)
);

line();
line("# CROSS-CATEGORY IMAGES");
line(`  ${crossCategoryMedia.length}`);
crossCategoryMedia.forEach((entry) =>
  line(`  · ${entry.productId} (${entry.productCategory}) → ${entry.file} (${entry.mediaCategory})`)
);

/* ------------------------------------------------------------------ */
/* Same media group → multiple products                                */
/* ------------------------------------------------------------------ */

const groupProductOwners = new Map();
reconciliationMediaGroups().forEach((group) => {
  const owners = new Set(
    (group.files ?? []).map((file) => file.productId).filter(Boolean)
  );
  groupProductOwners.set(group.groupKey, [...owners]);
});
const multiProductGroups = [...groupProductOwners.entries()]
  .filter(([, owners]) => owners.length > 1)
  .map(([groupKey, owners]) => ({ groupKey, owners }));

if (multiProductGroups.length) failures.push("media group split across multiple products");
line();
line("# MEDIA GROUP → MULTIPLE PRODUCTS");
line(`  ${multiProductGroups.length}`);
multiProductGroups.forEach((entry) =>
  line(`  · ${entry.groupKey} → ${entry.owners.join(", ")}`)
);

/* ------------------------------------------------------------------ */
/* Random hover sources / hardcoded product images                     */
/* ------------------------------------------------------------------ */

const cwd = process.cwd();
const scanFiles = [
  "src/design-system/components/ProductCard.jsx",
  "src/components/product/ProductPreview.jsx",
  "src/components/product/ProductGallery.jsx",
  "src/components/storefront/ProductGrid.jsx",
  "src/components/storefront/SareeEditCarousel.jsx",
  "src/components/storefront/NewArrivals.jsx",
  "src/components/storefront/HeroCarousel.jsx",
  "src/pages/CatalogueListing.jsx",
  "src/pages/Shop.jsx",
  "src/pages/SearchResults.jsx",
  "src/pages/Wishlist.jsx",
  "src/pages/Explore.jsx",
  "src/components/explore/ExploreProductGrid.jsx",
  "src/components/explore/ExploreBrowser.jsx",
];

const randomHoverFiles = [];
const hardcodedFiles = [];
scanFiles.forEach((rel) => {
  const path = join(cwd, rel);
  if (!existsSync(path)) return;
  const source = readFileSync(path, "utf8");
  if (/Math\.random|shuffle\(|\bsort\(\s*\([^)]*\)\s*=>\s*[^)]*random/.test(source)) {
    randomHoverFiles.push(rel);
  }
  /* A hardcoded /library/<file> path in a component (not authored data). */
  if (/\/library\/[a-z0-9-]+\.(webp|jpg|jpeg|png)/i.test(source)) {
    hardcodedFiles.push(rel);
  }
});

if (randomHoverFiles.length) failures.push("random hover sources");
if (hardcodedFiles.length) failures.push("hardcoded product images");

line();
line("# RANDOM HOVER SOURCES");
line(`  ${randomHoverFiles.length}`);
randomHoverFiles.forEach((file) => line(`  · ${file}`));
line();
line("# HARDCODED PRODUCT IMAGE PATHS (storefront components)");
line(`  ${hardcodedFiles.length}`);
hardcodedFiles.forEach((file) => line(`  · ${file}`));

/* ------------------------------------------------------------------ */
/* Verdict                                                             */
/* ------------------------------------------------------------------ */

line();
line("# SUMMARY");
line();
line(`Duplicate Product IDs:            ${duplicateIds.length}`);
line(`Duplicate ownership:              ${duplicateOwnership.length}`);
line(`Cross-product media:              ${crossProductGallery.length}`);
line(`Cross-category media:             ${crossCategoryMedia.length}`);
line(`Random hover:                     ${randomHoverFiles.length}`);
line(`Hardcoded product media:          ${hardcodedFiles.length}`);
line();

if (failures.length) {
  line(`FAIL: ${[...new Set(failures)].join(", ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: Duplicate IDs = 0, duplicate ownership = 0, cross-product media = 0, " +
      "cross-category media = 0, random hover = 0, hardcoded product media = 0."
  );
}
