/**
 * PRATIKSHYA FASHON — canonical Product Media consistency audit.
 *
 * Reports every product (all statuses) with its resolved media set, then
 * summarises the Product Media report:
 *
 *   total products, published, draft, review, archived
 *   products without media
 *   products with duplicate media
 *   cross-product media
 *   products with alternate views / no alternate views
 *   products with invalid media
 *   products with orphan media (media whose owner no longer exists)
 *
 * Fails (exit 1) when any cross-product reference, duplicate ownership or
 * invalid media reference exists.
 *
 * Usage:
 *   npm run audit:product-media
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  getProductMediaSet,
  PRODUCT_MEDIA_STATUS,
} from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const fileOf = (source) => {
  if (!source) return "—";
  return (
    source.fileName ||
    source.currentFilename ||
    (source.src || source.url || "").split("/").pop() ||
    source.id ||
    "—"
  );
};

const localExists = (url) => {
  if (!url) return false;
  if (/^https?:/i.test(url) || url.startsWith("data:") || url.startsWith("blob:")) return true;
  const clean = String(url).split("?")[0];
  return existsSync(join(process.cwd(), "public", clean.replace(/^\//, "")));
};

const products = catalogRepository.all();

const rows = products.map((product) => {
  const set = getProductMediaSet(product);
  const primaryFile = fileOf(set.primary);
  const hoverFile = set.hasAlternate ? fileOf(set.hover) : "same";
  const uniqueFiles = new Set(set.gallery.map((item) => fileOf(item)));
  const duplicateMedia = uniqueFiles.size < set.gallery.length;
  const invalidMedia = set.gallery
    .filter((item) => item.src && !localExists(item.src))
    .map((item) => fileOf(item));
  return {
    id: product.id,
    name: product.name || "[Not yet defined]",
    status: product.status,
    primary: primaryFile,
    hover: hoverFile,
    alternates: ["front", "side", "back", "detail"]
      .filter((view) => set[view])
      .join(",") || (set.hasAlternate ? "gallery" : "—"),
    source: set.source,
    match: set.match,
    mediaStatus: set.status,
    conflicts: set.ownershipConflicts ?? [],
    duplicateMedia,
    invalidMedia,
    set,
  };
});

const metrics = {
  total: rows.length,
  published: rows.filter((row) => row.status === "PUBLISHED").length,
  draft: rows.filter((row) => row.status === "DRAFT").length,
  review: rows.filter((row) => row.status === "PENDING_REVIEW" || row.status === "REVIEW").length,
  archived: rows.filter((row) => row.status === "ARCHIVED").length,
  withoutMedia: rows.filter((row) => !row.set.primary).length,
  duplicateMedia: rows.filter((row) => row.duplicateMedia),
  crossProduct: rows.filter(
    (row) =>
      row.set.status === PRODUCT_MEDIA_STATUS.CROSS_PRODUCT_REFERENCE ||
      row.set.gallery.some(
        (item) => item.productId && String(item.productId) !== String(row.id)
      )
  ),
  alternateViews: rows.filter((row) => row.set.hasAlternate).length,
  noAlternateViews: rows.filter((row) => row.set.primary && !row.set.hasAlternate).length,
  invalidMedia: rows.filter((row) => row.invalidMedia.length),
  conflicts: rows.filter((row) => row.conflicts.length),
};

/* Orphan media — a register owner pointing at a product that no longer exists. */
const productIds = new Set(products.map((product) => String(product.id)));
const orphanMedia = mediaRepository
  .getAll()
  .filter((item) => item.productId && !productIds.has(String(item.productId)));

line("# PRODUCT MEDIA CONSISTENCY AUDIT");
line();
line(
  pad("ID", 12) +
    pad("STATUS", 12) +
    pad("NAME", 38) +
    pad("PRIMARY", 30) +
    pad("HOVER", 30) +
    pad("ALT", 18) +
    pad("SOURCE", 10) +
    pad("MATCH", 10) +
    "MEDIA STATUS"
);
rows.forEach((row) => {
  line(
    pad(row.id, 12) +
      pad(row.status, 12) +
      pad(row.name, 38) +
      pad(row.primary, 30) +
      pad(row.hover, 30) +
      pad(row.alternates, 18) +
      pad(row.source, 10) +
      pad(row.match, 10) +
      row.mediaStatus
  );
});

line();
line("# PRODUCT SYSTEM");
line();
line(`Total products:            ${metrics.total}`);
line(`Published:                 ${metrics.published}`);
line(`Draft:                     ${metrics.draft}`);
line(`Review:                    ${metrics.review}`);
line(`Archived:                  ${metrics.archived}`);
line(`Products without media:    ${metrics.withoutMedia}`);
line(`Products with duplicate:   ${metrics.duplicateMedia.length}`);
metrics.duplicateMedia.forEach((row) => {
  line(`  · ${row.id} (${row.name})`);
});
line(`Cross-product media:       ${metrics.crossProduct.length}`);
metrics.crossProduct.forEach((row) => {
  line(`  · ${row.id} (${row.name})`);
});
line(`Alternate views:           ${metrics.alternateViews}`);
line(`No alternate views:        ${metrics.noAlternateViews}`);
line(`Invalid media refs:        ${metrics.invalidMedia.length}`);
metrics.invalidMedia.forEach((row) => {
  line(`  · ${row.id} → ${row.invalidMedia.join(", ")}`);
});
line(`Ownership conflicts:       ${metrics.conflicts.length}`);
metrics.conflicts.forEach((row) => {
  row.conflicts.forEach((conflict) => {
    line(`  · ${row.id} claims ${conflict.file} — owned by ${conflict.ownerProductId}`);
  });
});
line(`Orphan media:              ${orphanMedia.length}`);
orphanMedia.forEach((item) => {
  line(`  · ${item.id} → ${item.productId}`);
});

line();
line("# STOREFRONT CHECK");
const storefront = getLiveStorefrontProducts();
line(
  `Storefront products: ${storefront.length} (published ${metrics.published}, drafts/review excluded by status)`
);

const failures = [];
if (metrics.crossProduct.length) failures.push("cross-product media");
if (metrics.invalidMedia.length) failures.push("invalid media references");
if (orphanMedia.length) failures.push("orphan media");

line();
if (failures.length) {
  line(`FAIL: ${failures.join(", ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: no cross-product media, invalid references, or orphan ownership."
  );
}
