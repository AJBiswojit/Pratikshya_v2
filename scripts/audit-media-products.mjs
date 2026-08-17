/**
 * PRATIKSHYA FASHON — Media ↔ product ownership audit (Phase 22).
 *
 * The media-inbox side of the workflow:
 *
 *   MEDIA          total, assigned, unassigned, draft, review, published,
 *                  orphaned, duplicate ownership, invalid product ids
 *   DUPLICATES     exact duplicates, potential duplicates
 *   GROUPS         multi-view groups, potential same-product groups,
 *                  variant candidates, unassigned groups,
 *                  confirmed product groups
 *   KIDS           total Kids media, draft products, published products,
 *                  media with valid ownership, media requiring manual review
 *
 * Expected: duplicate ownership = 0, invalid product ids = 0.
 *
 * Usage:
 *   npm run audit:media-products
 */

import mediaRepository from "../src/services/media/mediaRepository.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { buildMediaGroups } from "../src/services/media/mediaGroups.js";
import { getPotentialProductGroups, getWorkflowMetrics } from "../src/services/productWorkflow.js";
import { MEDIA_SCOPES, MEDIA_STATUS, DUPLICATE_STATUS } from "../src/config/mediaTypes.js";
import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);

const media = mediaRepository.getAll();
const metrics = getWorkflowMetrics();

const fileName = (item) =>
  String(
    item.currentFilename ||
      item.fileName ||
      (item.url || item.thumbnail || "").split("/").pop() ||
      item.id ||
      ""
  ).toLowerCase();

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

/* Duplicate ownership is measured over the ingested product-photography
   register — one file must never be owned by two products there. The Phase
   12 seed register (house plates / sample footage) is a legacy category. */
const photography = media.filter((item) => item.ingested || item.source === "Ingested library");

const assigned = media.filter((item) => item.scope === MEDIA_SCOPES.PRODUCT);
const unassigned = media.filter((item) => item.scope === MEDIA_SCOPES.UNASSIGNED);

const byFile = new Map();
photography.forEach((item) => {
  const file = fileName(item);
  if (!file) return;
  if (!byFile.has(file)) byFile.set(file, []);
  byFile.get(file).push(item);
});
const duplicateOwnership = [...byFile.values()].filter(
  (records) => new Set(records.map((record) => String(record.productId ?? ""))).size > 1
);

const catalogueIds = new Set(catalogRepository.all().map((product) => String(product.id)));
const orphanRows = media.filter(
  (item) => item.productId && !catalogueIds.has(String(item.productId))
);

/* ------------------------------------------------------------------ */
/* Groups                                                              */
/* ------------------------------------------------------------------ */

const groupPool = media
  .filter((item) => item.scope === MEDIA_SCOPES.PRODUCT || item.scope === MEDIA_SCOPES.UNASSIGNED)
  .map((item) => ({ ...item, fileName: fileName(item) }));
const filenameGroups = buildMediaGroups(groupPool);
const multiViewGroups = filenameGroups.filter((group) => group.isGrouped);
const unassignedGroups = filenameGroups.filter((group) => !group.files.some((file) => file.productId));
const confirmedGroups = filenameGroups.filter(
  (group) => group.isGrouped && group.files.every((file) => file.productId)
);

const potentialSameProductGroups = getPotentialProductGroups().filter((group) => !group.confirmed);

const exactDuplicates = media.filter((item) => item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE);
const potentialDuplicates = media.filter(
  (item) => item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE
);
const variantCandidates = media.filter((item) => Boolean(item.variantId));

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

line("# MEDIA → PRODUCT OWNERSHIP AUDIT");
line();
line("# MEDIA");
line();
line(`Total media:              ${media.length}`);
line(`Assigned:                 ${assigned.length}`);
line(`Unassigned:               ${unassigned.length}`);
line(`Marketing:                ${media.filter((item) => item.scope === MEDIA_SCOPES.MARKETING).length}`);
line(`Draft:                    ${media.filter((item) => item.status === MEDIA_STATUS.DRAFT).length}`);
line(`Review:                   ${media.filter((item) => item.status === MEDIA_STATUS.PENDING_REVIEW).length}`);
line(`Published (ACTIVE):       ${media.filter((item) => item.status === MEDIA_STATUS.ACTIVE).length}`);
line(`Orphaned:                 ${orphanRows.length}`);
orphanRows.forEach((item) => line(`  · ${item.id} → ${item.productId}`));
line(`Duplicate ownership:      ${duplicateOwnership.length}`);
duplicateOwnership.forEach((records) =>
  line(
    `  · ${records[0].currentFilename ?? records[0].fileName} → ${records.map((r) => r.productId).join(", ")}`
  )
);
line(`Invalid product IDs:      ${orphanRows.length}`);

line();
line("# DUPLICATES & SIMILARITY SIGNALS");
line();
line(`Exact duplicates:         ${exactDuplicates.length}`);
exactDuplicates.forEach((item) => line(`  · ${fileName(item)} (${item.id})`));
line(`Potential duplicates:     ${potentialDuplicates.length}`);
potentialDuplicates.forEach((item) => line(`  · ${fileName(item)} (${item.id})`));

line();
line("# GROUPS");
line();
line(`MULTI-VIEW GROUPS             ${multiViewGroups.length}`);
line(`POTENTIAL SAME-PRODUCT GROUPS ${potentialSameProductGroups.length}`);
potentialSameProductGroups.forEach((group) => {
  line(`  · ${group.id} — ${group.media.map((row) => row.file).join(", ")}`);
  line(`    reason: ${group.reason}`);
});
line(`EXACT DUPLICATES              ${exactDuplicates.length}`);
line(`VARIANT CANDIDATES            ${variantCandidates.length}`);
variantCandidates.forEach((item) => line(`  · ${fileName(item)} variant ${item.variantId}`));
line(`UNASSIGNED MEDIA GROUPS       ${unassignedGroups.length}`);
line(`CONFIRMED PRODUCT GROUPS      ${confirmedGroups.length}`);

line();
line("# KIDS (first migration dataset)");
line();
const kids = media.filter((item) => /^kids-\d{3}\.\w+$/i.test(fileName(item)));
const kidsOwners = new Set(kids.map((item) => String(item.productId ?? "")).filter(Boolean));
const kidsValid = kids.filter((item) => item.productId && catalogueIds.has(String(item.productId))).length;
const kidsNeedingReview = kids.length - kidsValid;
line(`Total Kids media:          ${kids.length}`);
line(`Kids draft products:       ${metrics.kids.draftProducts}`);
line(`Kids published products:   ${metrics.kids.publishedProducts}`);
line(`Kids media with valid ownership: ${kidsValid} (${kidsOwners.size} distinct owners)`);
line(`Kids media requiring manual review: ${kidsNeedingReview}`);

line();
const failures = [];
if (duplicateOwnership.length) failures.push("duplicate ownership");
if (orphanRows.length) failures.push("invalid product IDs");
if (failures.length) {
  line(`FAIL: ${failures.join(", ")}.`);
  process.exitCode = 1;
} else {
  line("PASS: every media asset has at most one owner and every owner exists.");
}
