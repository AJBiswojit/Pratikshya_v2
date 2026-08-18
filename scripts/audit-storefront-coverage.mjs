/**
 * PRATIKSHYA FASHON — Storefront coverage audit (Phase 23).
 *
 * For every ACTIVE category, compares the EXPECTED PUBLISHED PRODUCT IDS
 * (the canonical catalogue filtered by status = PUBLISHED and canonical
 * taxonomy) against the ACTUAL category-page PRODUCT IDS (what the listing
 * derives through the shared catalogue query).
 *
 * The audit fails when any of these is detected:
 *   · a published product missing from its category page
 *   · a duplicate Product ID on a category page
 *   · a product shown under the wrong category
 *   · a cross-category product (a product whose own category differs from
 *     the page it appears on)
 *
 * Expected: Missing = 0, Duplicates = 0, Wrong category = 0.
 *
 * Usage:
 *   npm run audit:storefront-coverage
 */

import catalogRepository from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";

import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const fileOf = (source) =>
  source?.fileName ||
  source?.currentFilename ||
  (source?.src || source?.url || "").split("/").pop() ||
  source?.id ||
  null;

const products = catalogRepository.all();
const published = products.filter((product) => product.status === "PUBLISHED");
const categories = taxonomyRepository.activeCategories();

const failures = [];
const rows = [];

categories.forEach((category) => {
  const expected = published
    .filter((product) => product.category === category.id)
    .map((product) => String(product.id))
    .sort();

  const actual = queryCatalogue({ scopeFilters: { category: category.id } }).results
    .map((product) => String(product.id))
    .sort();

  const actualSet = new Set(actual);

  const missing = expected.filter((id) => !actualSet.has(id));
  const wrongCategory = actual.filter((id) => {
    const product = products.find((entry) => String(entry.id) === id);
    return !product || product.category !== category.id;
  });
  const duplicates = actual.filter((id, index) => actual.indexOf(id) !== index);

  /* A published product whose canonical media set has no primary is not
     renderable on the category page — reported as missing media. */
  const missingMedia = expected.filter((id) => {
    const product = products.find((entry) => String(entry.id) === id);
    return !product || !getProductMediaSet(product).primary;
  });

  rows.push({
    category: category.id,
    expectedCount: expected.length,
    actualCount: actual.length,
    missing,
    wrongCategory,
    duplicates,
    missingMedia,
  });

  if (missing.length) failures.push(`${category.id}: ${missing.length} missing`);
  if (wrongCategory.length) failures.push(`${category.id}: ${wrongCategory.length} wrong category`);
  if (duplicates.length) failures.push(`${category.id}: ${duplicates.length} duplicate IDs`);
  if (missingMedia.length) failures.push(`${category.id}: ${missingMedia.length} missing media`);
});

line("# STOREFRONT COVERAGE AUDIT");
line();
line(
  pad("CATEGORY", 18) +
    pad("PUBLISHED", 10) +
    pad("RENDERED", 10) +
    pad("MISSING", 9) +
    pad("WRONG", 8) +
    pad("DUPES", 7) +
    pad("NO MEDIA", 9)
);
rows.forEach((row) => {
  line(
    pad(row.category, 18) +
      pad(row.expectedCount, 10) +
      pad(row.actualCount, 10) +
      pad(row.missing.length, 9) +
      pad(row.wrongCategory.length, 8) +
      pad(row.duplicates.length, 7) +
      pad(row.missingMedia.length, 9)
  );
  row.missing.forEach((id) => line(`    · missing ${id}`));
  row.wrongCategory.forEach((id) => line(`    · wrong category ${id}`));
  row.duplicates.forEach((id) => line(`    · duplicate ${id}`));
  row.missingMedia.forEach((id) => line(`    · no media ${id}`));
});

line();
line("# PRODUCT MEDIA (every rendered product)");
line();
line(
  pad("ID", 12) +
    pad("PRIMARY", 34) +
    pad("HOVER", 34) +
    pad("GALLERY", 9) +
    "OWNERSHIP"
);
const mediaFailures = [];
categories.forEach((category) => {
  const rendered = queryCatalogue({ scopeFilters: { category: category.id } }).results;
  rendered.forEach((product) => {
    const set = getProductMediaSet(product);
    const primary = set.primary;
    const galleryOwned = (set.gallery ?? []).every(
      (item) => !item.productId || String(item.productId) === String(product.id)
    );
    const crossProduct = (set.gallery ?? []).filter(
      (item) => item.productId && String(item.productId) !== String(product.id)
    );
    if (crossProduct.length) {
      mediaFailures.push(`${product.id}: ${crossProduct.length} cross-product image(s)`);
    }
    line(
      pad(product.id, 12) +
        pad(fileOf(primary), 34) +
        pad(set.hasAlternate ? fileOf(set.hover) : "no change (single)", 34) +
        pad((set.gallery ?? []).length, 9) +
        (galleryOwned ? "VALID" : "CROSS-PRODUCT")
    );
  });
});

line();
line("# TOTALS");
line();
const totalMissing = rows.reduce((sum, row) => sum + row.missing.length, 0);
const totalWrong = rows.reduce((sum, row) => sum + row.wrongCategory.length, 0);
const totalDuplicates = rows.reduce((sum, row) => sum + row.duplicates.length, 0);
const totalMissingMedia = rows.reduce((sum, row) => sum + row.missingMedia.length, 0);
line(`Missing published products:  ${totalMissing}`);
line(`Wrong-category products:     ${totalWrong}`);
line(`Duplicate Product IDs:       ${totalDuplicates}`);
line(`Published without media:     ${totalMissingMedia}`);
line(`Cross-product media:         ${mediaFailures.length}`);

line();
if (failures.length || mediaFailures.length) {
  line(`FAIL: ${[...failures, ...mediaFailures].join("; ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: Missing = 0, Wrong category = 0, Duplicates = 0, Missing media = 0, " +
      "Cross-product media = 0. Every published product is reachable and rendered " +
      "on its correct category page with its own media."
  );
}
