/**
 * PRATIKSHYA FASHON — Explore completeness audit (Phase 24).
 *
 * Compares getLiveStorefrontProducts() against the Explore dataset and
 * verifies identity, media ownership and source hygiene.
 *
 * Expected:
 *   Duplicate Product IDs = 0
 *   Duplicate primary media = 0
 *   Cross-product media = 0
 *   Random = 0
 *   Hardcoded product media = 0
 *   Missing published products = 0
 *
 * Usage:
 *   npm run audit:explore
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  compareExploreCoverage,
  getExploreProducts,
  inspectExploreMedia,
  queryExplore,
  unpublishedKidsIds,
} from "../src/data/products/explore.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { KIDS_PRODUCT_IDS } from "../src/services/kidsProductIdentity.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { isIngestedPhotographyUrl } from "../src/services/media/mediaPaths.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);
const cwd = process.cwd();
const failures = [];

const live = getLiveStorefrontProducts();
const explore = getExploreProducts();
const coverage = compareExploreCoverage();

line("# EXPLORE COVERAGE");
line(`  Live storefront products:   ${coverage.liveCount}`);
line(`  Explore products:           ${coverage.exploreCount}`);
line(`  Missing from Explore:       ${coverage.missing.length}`);
line(`  Extra on Explore:           ${coverage.extra.length}`);
line(`  Live duplicate IDs:         ${coverage.liveDuplicates.length}`);
line(`  Explore duplicate IDs:      ${coverage.exploreDuplicates.length}`);
coverage.missing.forEach((id) => line(`    · missing ${id}`));
coverage.extra.forEach((id) => line(`    · extra ${id}`));
coverage.exploreDuplicates.forEach((id) => line(`    · duplicate ${id}`));

if (coverage.liveCount !== coverage.exploreCount) failures.push("live/explore count mismatch");
if (coverage.missing.length) failures.push("missing published products");
if (coverage.extra.length) failures.push("unpublished products on Explore");
if (coverage.exploreDuplicates.length) failures.push("duplicate Product IDs");

/* ------------------------------------------------------------------ */
/* Unpublished / draft must stay hidden                                */
/* ------------------------------------------------------------------ */

const register = catalogRepository.all();
const hiddenOnExplore = register.filter((product) => {
  const status = product.status;
  if (status === "PUBLISHED") return false;
  return explore.some((entry) => String(entry.id) === String(product.id));
});
const kidsDraftsVisible = unpublishedKidsIds().filter((id) =>
  explore.some((product) => String(product.id) === id)
);

line();
line("# PUBLISHING GATE");
line(`  Hidden statuses on Explore: ${hiddenOnExplore.length}`);
line(`  KID drafts on Explore:      ${kidsDraftsVisible.length}`);
hiddenOnExplore.forEach((product) => line(`    · ${product.id} (${product.status})`));
if (hiddenOnExplore.length) failures.push("draft/review products on Explore");
if (kidsDraftsVisible.length) failures.push("unpublished Kids identities on Explore");

const publishedKids = explore.filter((product) => product.category === "kidswear");
line(`  Published kidswear cards:   ${publishedKids.length}`);
if (publishedKids.length !== 21) failures.push("kidswear count is not 21 published products");
if (KIDS_PRODUCT_IDS.some((id) => publishedKids.some((product) => product.id === id))) {
  /* Only a failure if those KID ids are still drafts and somehow shown —
     published KID ids would be legitimate. unpublishedKidsIds already covers that. */
}

/* ------------------------------------------------------------------ */
/* Media ownership                                                     */
/* ------------------------------------------------------------------ */

const primaryOwners = new Map();
const crossProduct = [];
const missingMedia = [];
const randomHover = [];

explore.forEach((product) => {
  const report = inspectExploreMedia(product);
  const set = getProductMediaSet(product);
  if (!set.primary) missingMedia.push(product.id);
  if (!report.primaryOwned || !report.hoverOwned || !report.galleryOwned) {
    crossProduct.push(product.id);
  }
  const primarySrc = set.primary?.src || "";
  const primaryKey = set.primary?.fileName || set.primary?.id || primarySrc;
  /* House plates and remote campaign art may decorate several authored
     rows. Only ingested library photography must be unique per Product ID. */
  if (primaryKey && isIngestedPhotographyUrl(primarySrc)) {
    if (!primaryOwners.has(primaryKey)) primaryOwners.set(primaryKey, []);
    primaryOwners.get(primaryKey).push(String(product.id));
  }
});

const duplicatePrimary = [...primaryOwners.entries()]
  .map(([key, owners]) => ({ key, owners: [...new Set(owners)] }))
  .filter((entry) => entry.owners.length > 1);

line();
line("# MEDIA");
line(`  Missing primary:            ${missingMedia.length}`);
line(`  Cross-product media:        ${crossProduct.length}`);
line(`  Duplicate primary media:    ${duplicatePrimary.length}`);
missingMedia.forEach((id) => line(`    · missing media ${id}`));
crossProduct.forEach((id) => line(`    · cross-product ${id}`));
duplicatePrimary.forEach((entry) => line(`    · ${entry.key} → ${entry.owners.join(", ")}`));

if (missingMedia.length) failures.push("missing product media");
if (crossProduct.length) failures.push("cross-product media");
if (duplicatePrimary.length) failures.push("duplicate primary media");

/* ------------------------------------------------------------------ */
/* Filter / category representation                                    */
/* ------------------------------------------------------------------ */

const categories = [...new Set(explore.map((product) => product.category))].sort();
const sarees = queryExplore({ filters: { category: "sarees" } }).results;
const kids = queryExplore({ filters: { category: "kids" } }).results;
const jewellery = queryExplore({ filters: { category: "jewellery" } }).results;

line();
line("# CATEGORIES / FILTERS");
line(`  Categories represented:     ${categories.join(", ")}`);
line(`  /explore?category=sarees    ${sarees.length}`);
line(`  /explore?category=kids      ${kids.length}`);
line(`  /explore?category=jewellery ${jewellery.length}`);

if (sarees.some((product) => product.category !== "sarees")) failures.push("wrong category: sarees");
if (kids.some((product) => product.category !== "kidswear")) failures.push("wrong category: kids");
if (jewellery.some((product) => product.category !== "jewellery")) failures.push("wrong category: jewellery");
if (kids.length !== publishedKids.length) failures.push("kids alias does not match kidswear");

/* ------------------------------------------------------------------ */
/* Source hygiene                                                      */
/* ------------------------------------------------------------------ */

const scanFiles = [
  "src/pages/Explore.jsx",
  "src/components/explore/ExploreBrowser.jsx",
  "src/components/explore/ExploreProductGrid.jsx",
  "src/components/explore/ExplorePromo.jsx",
  "src/components/explore/ExploreOfferStrip.jsx",
  "src/data/products/explore.js",
  "src/services/explore/explorePlacements.js",
];

const randomFiles = [];
const hardcodedFiles = [];
const rawImageProducts = [];

scanFiles.forEach((rel) => {
  const path = join(cwd, rel);
  if (!existsSync(path)) {
    failures.push(`missing file ${rel}`);
    return;
  }
  const source = readFileSync(path, "utf8");
  if (/Math\.random|shuffle\(|sort\(\s*\([^)]*\)\s*=>\s*[^)]*random/.test(source)) {
    randomFiles.push(rel);
  }
  if (/\/library\/[a-z0-9-]+\.(webp|jpg|jpeg|png)/i.test(source)) {
    hardcodedFiles.push(rel);
  }
  if (/const\s+(products|cards|items)\s*=\s*\[/.test(source) && rel.endsWith(".jsx")) {
    rawImageProducts.push(rel);
  }
});

line();
line("# SOURCE HYGIENE");
line(`  Random image sources:       ${randomFiles.length}`);
line(`  Hardcoded product media:    ${hardcodedFiles.length}`);
line(`  Hardcoded product arrays:   ${rawImageProducts.length}`);
randomFiles.forEach((file) => line(`    · ${file}`));
hardcodedFiles.forEach((file) => line(`    · ${file}`));
rawImageProducts.forEach((file) => line(`    · ${file}`));

if (randomFiles.length) failures.push("random image sources");
if (hardcodedFiles.length) failures.push("hardcoded product media");
if (rawImageProducts.length) failures.push("hardcoded product arrays");

/* ------------------------------------------------------------------ */
/* Navbar + route                                                      */
/* ------------------------------------------------------------------ */

const header = readFileSync(join(cwd, "src/components/shell/SiteHeader.jsx"), "utf8");
const app = readFileSync(join(cwd, "src/App.jsx"), "utf8");
if (!header.includes('to="/explore"') || !header.includes("Explore")) {
  failures.push("Explore missing from navbar");
}
if (!app.includes('path="/explore"')) {
  failures.push("Explore route missing");
}

line();
line("# SUMMARY");
line(`  Live == Explore:            ${coverage.liveCount === coverage.exploreCount ? "yes" : "no"}`);
line(`  One Product ID == one card: ${coverage.exploreDuplicates.length === 0 ? "yes" : "no"}`);
line(`  Drafts hidden:              ${hiddenOnExplore.length === 0 ? "yes" : "no"}`);
line();

if (failures.length) {
  line(`FAIL: ${[...new Set(failures)].join("; ")}.`);
  process.exitCode = 1;
} else {
  line(
    `PASS: Explore ${coverage.exploreCount} == live ${coverage.liveCount}, ` +
      "duplicates = 0, missing = 0, cross-product = 0, random = 0, hardcoded = 0."
  );
}

void randomHover;
void live;
