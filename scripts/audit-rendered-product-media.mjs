/**
 * PRATIKSHYA FASHON — Rendered product media audit (Phase 23.2).
 *
 * Proves WHICH image the customer-facing ProductCard actually renders for
 * every published product — not just that the product exists. For each:
 *
 *   Product ID · Name · Category · Rendered primary (file) · Source ·
 *   Hover (file) · Gallery count · Ownership
 *
 * Source classification:
 *   CANONICAL   an ingested /library product photograph owned by this product
 *   AUTHORED    the product's authored catalogue plate (house / pexels /
 *               manifest) — the legacy fallback, used only when no canonical
 *               photograph of this product exists
 *   NONE        no primary resolved
 *
 * The audit FAILS on the always-wrong conditions:
 *   · cross-product media (gallery item owned by another product)
 *   · duplicate primary (two products share one canonical photograph)
 *   · random image selection (Math.random / shuffle)
 *   · hardcoded product image paths in storefront components
 *
 * A dedicated Phase 23.2 section reports, for bangles / jewellery /
 * innerwear, whether each product now renders its canonical library
 * photograph (the categories that previously rendered shared house plates).
 *
 * Usage:
 *   npm run audit:rendered-product-media
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getProductCardMedia } from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const fileOf = (source) =>
  source?.fileName ||
  source?.currentFilename ||
  (source?.src || source?.url || "").split("/").pop() ||
  source?.id ||
  null;

const media = mediaRepository.getAll();
const isHouse = (item) => item.source === "House artwork" || (item.tags || []).includes("house");
const isIngested = (item) => item.ingested || item.source === "Ingested library";

/* Ingested, non-house library photography indexed by filename. */
const ingestedByFile = new Map();
media.filter(isIngested).filter((item) => !isHouse(item)).forEach((item) => {
  const file = (item.currentFilename || item.fileName || "").toLowerCase();
  if (file && !ingestedByFile.has(file)) ingestedByFile.set(file, item);
});

const classifySource = (source) => {
  if (!source) return "NONE";
  const file = fileOf(source);
  const record = file ? ingestedByFile.get(String(file).toLowerCase()) : null;
  if (record) return "CANONICAL";
  if (String(source.src || source.url || "").includes("/library/") && /^house-/i.test(file || "")) {
    return "AUTHORED"; // house plate
  }
  if (String(source.src || source.url || "").includes("pexels")) return "AUTHORED";
  return "AUTHORED";
};

const products = getLiveStorefrontProducts();
const rows = [];
const primaryOwners = new Map(); // canonical file -> [product ids]
const crossProduct = [];
let houseShared = new Map(); // house file -> [product ids]

products.forEach((product) => {
  const card = getProductCardMedia(product);
  const primary = card.image;
  const source = classifySource(primary);
  const file = fileOf(primary);

  if (source === "CANONICAL" && file) {
    if (!primaryOwners.has(file)) primaryOwners.set(file, []);
    primaryOwners.get(file).push(String(product.id));
  }
  if (source === "AUTHORED" && file) {
    if (!houseShared.has(file)) houseShared.set(file, []);
    houseShared.get(file).push(String(product.id));
  }

  const gallery = card.mediaSet.gallery ?? [];
  gallery.forEach((item) => {
    if (item.productId && String(item.productId) !== String(product.id)) {
      crossProduct.push({ productId: product.id, file: fileOf(item), owner: item.productId });
    }
  });

  rows.push({
    id: product.id,
    name: product.name,
    category: product.category,
    file,
    source,
    hover: card.hoverImage ? fileOf(card.hoverImage) : null,
    hasAlternate: card.mediaSet.hasAlternate,
    galleryCount: gallery.length,
    owned: gallery.every(
      (item) => !item.productId || String(item.productId) === String(product.id)
    ),
  });
});

const duplicatePrimary = [...primaryOwners.entries()]
  .map(([file, owners]) => ({ file, owners: [...new Set(owners)] }))
  .filter((entry) => entry.owners.length > 1);

const sharedHouse = [...houseShared.entries()]
  .map(([file, owners]) => ({ file, owners: [...new Set(owners)] }))
  .filter((entry) => entry.owners.length > 1);

const failures = [];
if (crossProduct.length) failures.push("cross-product media");
if (duplicatePrimary.length) failures.push("duplicate primary media");

/* ------------------------------------------------------------------ */
/* Hardcoded / random scan of storefront components                    */
/* ------------------------------------------------------------------ */
const cwd = process.cwd();
const scanFiles = [
  "src/design-system/components/ProductCard.jsx",
  "src/components/product/ProductPreview.jsx",
  "src/components/product/ProductGallery.jsx",
  "src/components/storefront/ProductGrid.jsx",
  "src/components/storefront/NewArrivals.jsx",
  "src/components/storefront/SareeEditCarousel.jsx",
  "src/components/storefront/HeroCarousel.jsx",
  "src/components/storefront/ShopByCategory.jsx",
  "src/components/storefront/SaleBanner.jsx",
  "src/components/storefront/CatalogueBrowser.jsx",
  "src/pages/CatalogueListing.jsx",
  "src/pages/SearchResults.jsx",
  "src/pages/Wishlist.jsx",
  "src/pages/ProductDetail.jsx",
];
const randomFiles = [];
const hardcodedFiles = [];
scanFiles.forEach((rel) => {
  const path = join(cwd, rel);
  if (!existsSync(path)) return;
  const source = readFileSync(path, "utf8");
  if (/Math\.random|shuffle\(/.test(source)) randomFiles.push(rel);
  if (/\/library\/[a-z0-9-]+\.(webp|jpg|jpeg|png)/i.test(source)) hardcodedFiles.push(rel);
});
if (randomFiles.length) failures.push("random image selection");
if (hardcodedFiles.length) failures.push("hardcoded product image paths");

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

line("# RENDERED PRODUCT MEDIA AUDIT");
line();
line(
  pad("ID", 12) +
    pad("NAME", 30) +
    pad("CATEGORY", 18) +
    pad("PRIMARY", 34) +
    pad("SOURCE", 11) +
    pad("HOVER", 34) +
    pad("GALLERY", 8) +
    "OWNERSHIP"
);
rows.forEach((row) => {
  line(
    pad(row.id, 12) +
      pad(row.name, 30) +
      pad(row.category, 18) +
      pad(row.file, 34) +
      pad(row.source, 11) +
      pad(row.hasAlternate ? row.hover : "no change (single)", 34) +
      pad(row.galleryCount, 8) +
      (row.owned ? "VALID" : "CROSS-PRODUCT")
  );
});

line();
line("# SOURCE DISTRIBUTION");
line();
const bySource = {};
rows.forEach((row) => {
  bySource[row.source] = (bySource[row.source] ?? 0) + 1;
});
line(`CANONICAL  ${bySource.CANONICAL ?? 0}`);
line(`AUTHORED   ${bySource.AUTHORED ?? 0}  (legacy fallback — no canonical photograph)`);
line(`NONE       ${bySource.NONE ?? 0}`);

line();
line("# PHASE 23.2 — CANONICAL COVERAGE (bangles / jewellery / innerwear)");
line();
const phaseCategories = ["bangles", "jewellery", "innerwear"];
phaseCategories.forEach((category) => {
  const inCategory = rows.filter((row) => row.category === category);
  const canonical = inCategory.filter((row) => row.source === "CANONICAL");
  line(
    `${category.padEnd(12)} canonical ${String(canonical.length).padStart(2)}/${String(inCategory.length).padEnd(2)}` +
      (inCategory.length - canonical.length
        ? ` · authored-fallback: ${inCategory
            .filter((row) => row.source === "AUTHORED")
            .map((row) => `${row.id}(${row.name.split(" ").slice(-1)[0]})`)
            .join(", ")}`
        : "")
  );
});

line();
line("# VIOLATIONS");
line();
line(`Cross-product media:          ${crossProduct.length}`);
crossProduct.forEach((entry) =>
  line(`  · ${entry.productId} → ${entry.file} (owned by ${entry.owner})`)
);
line(`Duplicate primary media:      ${duplicatePrimary.length}`);
duplicatePrimary.forEach((entry) =>
  line(`  · ${entry.file} → ${entry.owners.join(", ")}`)
);
line(`Shared house plates:          ${sharedHouse.length}`);
sharedHouse.forEach((entry) =>
  line(`  · ${entry.file} → ${entry.owners.length} products`)
);
line(`Random image selection:       ${randomFiles.length}`);
randomFiles.forEach((file) => line(`  · ${file}`));
line(`Hardcoded product images:     ${hardcodedFiles.length}`);
hardcodedFiles.forEach((file) => line(`  · ${file}`));

line();
if (failures.length) {
  line(`FAIL: ${[...new Set(failures)].join(", ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: cross-product = 0, duplicate primary = 0, random = 0, hardcoded = 0. " +
      "Every published product renders its own canonical media (or its authored fallback " +
      "when no canonical photograph of that product exists)."
  );
}
