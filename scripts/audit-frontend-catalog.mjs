/**
 * PRATIKSHYA FASHON — Frontend product catalogue audit.
 *
 * Validates the contract between the organised product media
 * (`public/images/products/`) and the structured frontend catalogue
 * (`src/data/catalog/`):
 *
 *   MEDIA        every product folder ↔ exactly one product record; every
 *                referenced path exists on disk; primary + gallery complete;
 *                nothing converted or invented.
 *   CATALOG      unique ids / SKUs / names; every name is a real
 *                customer-facing name (never the id, never "Product N");
 *                department / category / subcategory match the media path.
 *   FRONTEND     the shared product register resolves every record; each
 *                storefront record resolves primary media; no product data
 *                or image paths are hardcoded inside components.
 *
 * Usage:  npm run audit:frontend-catalog
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const PRODUCTS_DIR = join(ROOT, "public", "images", "products");

const { products } = await import("../src/data/catalog/products.js");
const { departments, catalogueRoutes, catalogueNavigationScopes } = await import("../src/data/catalog/taxonomy.js");
const { heroSlides } = await import("../src/data/catalog/hero.js");
const { editorialCollections, fabricCollections } = await import("../src/data/catalog/collections.js");
const catalogRepository = (await import("../src/services/catalogRepository.js")).default;
const { getLiveStorefrontProducts, getProductById } = await import("../src/data/products/index.js");
const { getProductMediaSet } = await import("../src/services/media/productMediaSet.js");
const { getProductCardMedia } = await import("../src/services/media/productMediaSet.js");
const storefrontProducts = await import("../src/data/products/index.js");

let passed = 0;
let failed = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) passed += 1;
  else {
    failed += 1;
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
  }
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

/* ------------------------------------------------------------------ */
console.log("\n# 1. MEDIA — folders ↔ records ↔ files");
/* ------------------------------------------------------------------ */

const folders = [];
const walk = (dir, segments) => {
  for (const entry of readdirSync(dir).sort()) {
    const path = join(dir, entry);
    if (!statSync(path).isDirectory()) continue;
    if (/^PF-/.test(entry)) folders.push({ id: entry, segments, path });
    else walk(path, [...segments, entry]);
  }
};
walk(PRODUCTS_DIR, []);

const recordById = new Map(products.map((product) => [String(product.id), product]));
const numericAware = (a, b) => {
  const na = Number.parseInt(a, 10);
  const nb = Number.parseInt(b, 10);
  if (!Number.isNaN(na) && !Number.isNaN(nb) && na !== nb) return na - nb;
  return a.localeCompare(b);
};

const missingRecords = folders.filter((folder) => !recordById.has(folder.id));
const orphanRecords = products.filter((product) => !folders.some((folder) => folder.id === product.id));
check("every product folder has exactly one record", missingRecords.length === 0 && orphanRecords.length === 0,
  missingRecords.length ? `folders without records: ${missingRecords.map((f) => f.id).join(", ")}` : orphanRecords.length ? `records without folders: ${orphanRecords.map((p) => p.id).join(", ")}` : "");

const duplicateIds = products.filter((p, i, list) => list.findIndex((other) => other.id === p.id) !== i);
check("product ids are unique", duplicateIds.length === 0, duplicateIds.map((p) => p.id).join(", "));

const duplicateSkus = products.filter((p, i, list) => list.findIndex((other) => other.sku === p.sku) !== i);
check("SKUs are unique and stable (PFS- form of the id)", duplicateSkus.length === 0 && products.every((p) => p.sku === `PFS-${p.id.replace(/^PF-/, "")}`), duplicateSkus.map((p) => p.sku).join(", "));

let brokenPaths = [];
let wrongPrimary = [];
let wrongGallery = [];
let wrongTaxonomy = [];
for (const folder of folders) {
  const record = recordById.get(folder.id);
  if (!record) continue;
  const files = readdirSync(folder.path).sort(numericAware);
  const primaryFile = files.find((file) => /^primary\./i.test(file)) ?? files[0] ?? null;
  const expectedBase = `/images/products/${[...folder.segments, folder.id].join("/")}`;

  if (record.media?.primary !== (primaryFile ? `${expectedBase}/${primaryFile}` : null)) {
    wrongPrimary.push(folder.id);
  }
  const expectedGallery = files.filter((file) => file !== primaryFile).map((file) => `${expectedBase}/${file}`);
  if (JSON.stringify(record.media?.gallery ?? []) !== JSON.stringify(expectedGallery)) {
    wrongGallery.push(folder.id);
  }
  for (const src of [record.media?.primary, ...(record.media?.gallery ?? [])]) {
    if (!src) continue;
    const diskPath = join(ROOT, "public", src.replace(/^\//, ""));
    if (!existsSync(diskPath)) brokenPaths.push(src);
  }
  const [department, category, subcategory] = folder.segments;
  if (record.department !== department || record.category !== category || record.subcategory !== subcategory) {
    wrongTaxonomy.push(folder.id);
  }
}
check("every referenced media path exists on disk", brokenPaths.length === 0, brokenPaths.join(", "));
check("every primary matches the folder's primary file", wrongPrimary.length === 0, wrongPrimary.join(", "));
check("every gallery is complete — nothing omitted, nothing invented", wrongGallery.length === 0, wrongGallery.join(", "));
check("department / category / subcategory match the media path", wrongTaxonomy.length === 0, wrongTaxonomy.join(", "));

const referenced = new Set();
for (const product of products) {
  referenced.add(product.media?.primary);
  (product.media?.gallery ?? []).forEach((src) => referenced.add(src));
}
const allFiles = [];
walk(PRODUCTS_DIR, []);
for (const folder of folders) {
  for (const file of readdirSync(folder.path)) allFiles.push(`/images/products/${[...folder.segments, folder.id].join("/")}/${file}`);
}
const unreferenced = allFiles.filter((file) => !referenced.has(file));
check("no media file is orphaned by the catalogue", unreferenced.length === 0, unreferenced.join(", "));

/* ------------------------------------------------------------------ */
console.log("\n# 2. CATALOG — identity, names, status");
/* ------------------------------------------------------------------ */

const GENERIC_NAMES = /^(product|saree|lehenga|dress|kurta|bangle|earring|necklace|ring|anklet|dupatta|innerwear|set|kada|maang tikka|jewellery)\s*\d*$/i;
const badNames = products.filter((product) => {
  const name = String(product.name ?? "").trim();
  if (!name) return true;
  if (name === product.id) return true;
  if (name.includes(product.id)) return true;
  if (GENERIC_NAMES.test(name)) return true;
  if (name.length > 60) return true;
  return false;
});
check("every product carries a customer-facing name", badNames.length === 0, badNames.map((p) => `${p.id}: "${p.name}"`).join(", "));

const duplicateNames = products.filter((p, i, list) => list.findIndex((other) => other.name === p.name) !== i);
check("no two products share a name", duplicateNames.length === 0, duplicateNames.map((p) => p.name).join(", "));

const invalidStatus = products.filter((p) => !["draft", "published"].includes(p.status));
check("status is draft or published", invalidStatus.length === 0, invalidStatus.map((p) => p.id).join(", "));

const inventedCommerce = products.filter(
  (p) => p.price !== null || p.compareAtPrice !== null || (p.description ?? "") !== ""
);
check("no commercial data is invented (price / compare-at / description empty)", inventedCommerce.length === 0, inventedCommerce.map((p) => p.id).join(", "));

const validDepartments = new Set(["women", "bridal", "men", "kids"]);
const badDepartment = products.filter((p) => !validDepartments.has(p.department));
check("departments are women / bridal / men / kids", badDepartment.length === 0, badDepartment.map((p) => p.id).join(", "));

/* ------------------------------------------------------------------ */
console.log("\n# 3. FRONTEND — one source, resolved media, no hardcoding");
/* ------------------------------------------------------------------ */

const registerIds = new Set(catalogRepository.all().map((record) => String(record.id)));
const missingInRegister = products.filter((product) => !registerIds.has(product.id));
check("every catalogue record resolves through the shared product register", missingInRegister.length === 0, missingInRegister.map((p) => p.id).join(", "));

const live = getLiveStorefrontProducts();
const publishedRecords = products.filter((product) => product.status === "published");
const liveIds = new Set(live.map((product) => String(product.id)));
const wronglyHidden = publishedRecords.filter((product) => !liveIds.has(product.id));
const wronglyShown = live.filter((product) => !publishedRecords.some((published) => published.id === product.id));
check("only published products reach listings", wronglyHidden.length === 0 && wronglyShown.length === 0,
  [...wronglyHidden, ...wronglyShown].map((p) => p.id).join(", "));

/* Detail route resolution: published products resolve by id from the
   storefront lookup; drafts resolve through the staff preview seam — the
   exact two paths the reusable ProductDetail page supports. */
const detailLookupFailures = products.filter((product) => {
  const published = getProductById(product.id);
  if (published) return false;
  const record = catalogRepository.find(product.id);
  return !record || !storefrontProducts.toStorefrontProduct(record);
});
check("every product resolves on its detail route by product id", detailLookupFailures.length === 0, detailLookupFailures.map((p) => p.id).join(", "));

const mediaResolveFailures = [];
for (const product of products) {
  const record = catalogRepository.find(product.id);
  const storefront = storefrontProducts.toStorefrontProduct(record, 0);
  const card = getProductCardMedia(storefront);
  const set = getProductMediaSet(storefront);
  if (!card.image?.src || !set.primary?.src) mediaResolveFailures.push(product.id);
  if (set.gallery.length !== 1 + (product.media?.gallery?.length ?? 0)) {
    mediaResolveFailures.push(`${product.id} (gallery ${set.gallery.length})`);
  }
}
check("every product resolves primary card media and a complete gallery", mediaResolveFailures.length === 0, mediaResolveFailures.join(", "));

const walkSrc = (dir, out = []) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walkSrc(path, out);
    else if (/\.(jsx|js)$/.test(entry.name)) out.push(path);
  }
  return out;
};
const hardcodedImageComponents = [];
for (const file of walkSrc(join(ROOT, "src"))) {
  if (file.includes(`${join(ROOT, "src", "data")}${"/"}`)) continue;
  const content = readFileSync(file, "utf8");
  if (content.includes('"/images/products/')) hardcodedImageComponents.push(relative(ROOT, file));
}
check("no component hardcodes product image paths", hardcodedImageComponents.length === 0, hardcodedImageComponents.join(", "));

const hardcodedArrays = [];
for (const file of [...walkSrc(join(ROOT, "src", "components")), ...walkSrc(join(ROOT, "src", "pages"))]) {
  const content = readFileSync(file, "utf8");
  if (/const\s+products\s*=\s*\[/.test(content)) hardcodedArrays.push(relative(ROOT, file));
}
check("no component or page hardcodes a product array", hardcodedArrays.length === 0, hardcodedArrays.join(", "));

/* ------------------------------------------------------------------ */
console.log("\n# 4. TAXONOMY, HERO, COLLECTIONS");
/* ------------------------------------------------------------------ */

const routePaths = new Set(catalogueRoutes.map((route) => route.path));
const expectedPaths = new Set(folders.flatMap((folder) => {
  const [a, b, c] = folder.segments;
  return [`/${a}`, `/${a}/${b}`, `/${a}/${b}/${c}`];
}));
const missingRoutes = [...expectedPaths].filter((path) => !routePaths.has(path));
check("every department / category / subcategory has a listing route", missingRoutes.length === 0, missingRoutes.join(", "));
check("navigation scopes cover every catalogue route", catalogueRoutes.every((route) => Boolean(catalogueNavigationScopes[route.path])), "");

const heroMissing = heroSlides.filter((slide) => !existsSync(join(ROOT, "public", slide.image.replace(/^\//, ""))));
check("all hero slides exist on disk", heroMissing.length === 0, heroMissing.map((s) => s.image).join(", "));

const collectionMissing = [...editorialCollections, ...fabricCollections].flatMap((collection) =>
  [collection.media?.primary, ...(collection.media?.gallery ?? [])]
    .filter(Boolean)
    .filter((src) => !existsSync(join(ROOT, "public", src.replace(/^\//, ""))))
);
check("all collection plates exist on disk", collectionMissing.length === 0, collectionMissing.join(", "));

/* ------------------------------------------------------------------ */
console.log(`\nRESULT: ${passed} passed · ${failed} failed`);
if (failed) {
  console.log("\nFailures:");
  failures.forEach((failure) => console.log(`  · ${failure}`));
  process.exitCode = 1;
}
