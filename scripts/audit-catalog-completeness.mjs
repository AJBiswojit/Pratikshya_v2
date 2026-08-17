/**
 * PRATIKSHYA FASHON — Catalogue completeness audit (Phase 23).
 *
 * Reports the full media → catalogue reconciliation:
 *
 *   TOTAL MEDIA · PRODUCT MEDIA · NON-PRODUCT MEDIA · MEDIA GROUPS ·
 *   EXISTING PRODUCTS · NEW PRODUCT CANDIDATES · NEEDS REVIEW · DUPLICATES ·
 *   OWNERSHIP CONFLICTS · PRODUCTS WITHOUT MEDIA · PUBLISHED · DRAFT
 *
 * and, for every product category:
 *
 *   Category · Media Groups · Existing Products · New Product Candidates ·
 *   Needs Review · Published Products · Missing Products
 *
 * A "missing product" is a legitimate product-media group (non-house,
 * non-kids) that has NO product record — neither register ownership nor a
 * draft claim. The reconciliation migration creates one DRAFT for every such
 * group, so this must be zero. The audit fails while any group is missing.
 *
 * Usage:
 *   npm run audit:catalog-completeness
 */

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  categoryForGroup,
  getCatalogueReconciliationSummary,
  reconciliationMediaGroups,
  uncataloguedGroups,
} from "../src/services/catalogueReconciliation.js";
import { MEDIA_SCOPES, DUPLICATE_STATUS } from "../src/config/mediaTypes.js";
import { getWorkflowMetrics } from "../src/services/productWorkflow.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const media = mediaRepository.getAll();
const products = catalogRepository.all();
const metrics = getWorkflowMetrics();

const isHouse = (item) => item.source === "House artwork" || (item.tags || []).includes("house");
const isKids = (item) => /^kids-\d{3}\.\w+$/i.test(
  String(item.currentFilename || item.fileName || "")
);

const productPhotography = media.filter(
  (item) => (item.ingested || item.source === "Ingested library") && !isHouse(item) && !isKids(item)
);
const nonProductMedia = media.filter(
  (item) => isHouse(item) || item.scope === MEDIA_SCOPES.MARKETING
);

const groups = reconciliationMediaGroups();
const summary = getCatalogueReconciliationSummary(products);

const productById = new Map(products.map((product) => [String(product.id), product]));

/* Ownership conflicts: register ownership + the product's own claims. */
const conflicts = products
  .flatMap((product) => getProductMediaSet(product).ownershipConflicts ?? [])
  .map((conflict) => ({ ...conflict, productId: conflict.productId ?? null }));

const productsWithoutMedia = products.filter((product) => {
  if (product.image) return false;
  return !getProductMediaSet(product).primary;
});

const exactDuplicates = media.filter((item) => item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE);
const possibleDuplicates = media.filter(
  (item) => item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE
);

/* ------------------------------------------------------------------ */
/* Per-category missing-product detection                              */
/* ------------------------------------------------------------------ */

/* Every media id claimed by a product record (draft or published). */
const claimedMediaIds = new Set();
products.forEach((product) => {
  (product.mediaIds ?? []).forEach((id) => claimedMediaIds.add(String(id)));
  if (product.primaryMediaId) claimedMediaIds.add(String(product.primaryMediaId));
  (product.galleryMediaIds ?? []).forEach((id) => claimedMediaIds.add(String(id)));
});

/* A group is "missing" when none of its files is owned or claimed. */
const missingGroups = uncataloguedGroups().filter(
  (group) =>
    !(group.files ?? []).some(
      (file) =>
        (file.productId && productById.has(String(file.productId))) ||
        claimedMediaIds.has(String(file.id))
    )
);

/* Per-category figures come from the stable reconciliation summary, plus the
   live "missing product" detection below. */
const missingByCategory = new Map();
missingGroups.forEach((group) => {
  const { category } = categoryForGroup(group);
  missingByCategory.set(category, (missingByCategory.get(category) ?? 0) + 1);
});

const categoryRows = summary.byCategory.map((row) => ({
  ...row,
  missingGroups: missingByCategory.get(row.category) ?? 0,
}));

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

line("# CATALOGUE COMPLETENESS AUDIT");
line();
line("# MEDIA");
line();
line(`TOTAL MEDIA                ${media.length}`);
line(`PRODUCT MEDIA              ${productPhotography.length}`);
line(`NON-PRODUCT MEDIA          ${nonProductMedia.length}`);
line(`MEDIA GROUPS               ${groups.length}`);
line(`  · catalogued (manifest)  ${summary.cataloguedGroups}`);
line(`  · assigned to published  ${summary.assignedToPublished}`);
line(`  · uncatalogued           ${summary.uncataloguedGroups}`);
line();

line("# PRODUCTS");
line();
line(`EXISTING PRODUCTS          ${products.length}`);
line(`ASSIGNED TO PUBLISHED      ${summary.assignedToPublished} media groups`);
line(`NEW PRODUCT CANDIDATES     ${summary.newProductCandidates}`);
line(`NEEDS REVIEW (groups)      ${summary.needsReviewGroups}`);
line(`DUPLICATES                 ${exactDuplicates.length} exact, ${possibleDuplicates.length} possible`);
exactDuplicates.forEach((item) => line(`  · ${item.currentFilename ?? item.fileName}`));
possibleDuplicates.forEach((item) => line(`  · ${item.currentFilename ?? item.fileName}`));
line(`OWNERSHIP CONFLICTS        ${conflicts.length}`);
line(`PRODUCTS WITHOUT MEDIA     ${productsWithoutMedia.length}`);
line(`PUBLISHED PRODUCTS         ${metrics.products.published}`);
line(`DRAFT PRODUCTS             ${metrics.products.draft}`);
line();

line("# CATEGORY COVERAGE");
line();
line(
  pad("CATEGORY", 18) +
    pad("MEDIA GROUPS", 14) +
    pad("CATALOGUED", 11) +
    pad("ASSIGNED", 10) +
    pad("NEW", 9) +
    pad("NEEDS REVIEW", 14) +
    pad("PUBLISHED", 11) +
    pad("MISSING", 9)
);
categoryRows.forEach((row) => {
  const published = products.filter(
    (product) => product.status === "PUBLISHED" && product.category === row.category
  ).length;
  line(
    pad(row.category || "(unclassified)", 18) +
      pad(row.mediaGroups, 14) +
      pad(row.cataloguedGroups, 11) +
      pad(row.assignedToPublished, 10) +
      pad(row.newDrafts, 9) +
      pad(row.needsReviewGroups, 14) +
      pad(published, 11) +
      pad(row.missingGroups, 9)
  );
});

line();
line("# MISSING PRODUCTS");
line();
if (!missingGroups.length) {
  line("None — every legitimate product-media group has a product record.");
} else {
  missingGroups.forEach((group) => {
    line(`  · ${group.groupKey} (${(group.files ?? []).map((f) => f.fileName).join(", ")})`);
  });
}

line();
if (missingGroups.length) {
  line(`FAIL: ${missingGroups.length} product-media group(s) have no product record.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: every legitimate product-media group is accounted for by a product record " +
      "(published or draft)."
  );
}
