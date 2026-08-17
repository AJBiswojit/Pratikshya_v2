/**
 * PRATIKSHYA FASHON — Kids product audit (Phase 22.1 + 22.2).
 *
 * Phase 22.1 audited the RECONCILIATION (media ↔ existing owners).
 * Phase 22.2 audits the FINALIZATION of the 21 CONFIRMED Kids products:
 *
 *     kids-001.webp → KID-001   …   kids-021.webp → KID-021
 *     21 media assets = 21 SEPARATE products.
 *
 * Reports, per asset: media ID, filename, path, groupKey, view, existing
 * owner, KID product, category, subcategory, status and ownership state —
 * then the finalization summary the phase requires:
 *
 *   Total Kids products · KID-001 → KID-021 · Draft · Review · Ready ·
 *   Published · Missing information · Ownership conflicts ·
 *   Cross-product media · Duplicate ownership · Products without media ·
 *   Products with invalid media · Products with unresolved review flags
 *
 * Expected: 21 distinct Kids products · 21 distinct Product IDs ·
 *           0 cross-product media · 0 duplicate ownership ·
 *           0 invalid media references
 *
 * Usage:
 *   npm run audit:kids-products
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import mediaRepository from "../src/services/media/mediaRepository.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { buildMediaGroups } from "../src/services/media/mediaGroups.js";
import { getWorkflowMetrics } from "../src/services/productWorkflow.js";
import {
  KIDS_CHECKLIST_ITEMS,
  KIDS_STAGE_LABELS,
  getKidsFinalizationRows,
  getKidsFinalizationSummary,
} from "../src/services/kidsProductFinalization.js";
import {
  CONFIRMED_KIDS_IDENTITIES,
  KIDS_PRODUCT_IDS,
  kidsFileNameOf,
  kidsProductIdForFile,
} from "../src/services/kidsProductIdentity.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const fileName = (item) => kidsFileNameOf(item) || String(item?.id ?? "");

const kidsMedia = mediaRepository
  .getAll()
  .filter((item) => /^kids-\d{3}\.\w+$/i.test(fileName(item)))
  .sort((a, b) => fileName(a).localeCompare(fileName(b)));

const products = catalogRepository.all();
const productById = new Map(products.map((product) => [String(product.id), product]));

const metrics = getWorkflowMetrics();
const rows21 = getKidsFinalizationRows();
const summary = getKidsFinalizationSummary(rows21);

/* ------------------------------------------------------------------ */
/* Per-asset inventory                                                 */
/* ------------------------------------------------------------------ */

const ownershipState = (media, draft) => {
  const ownerId = media.productId ? String(media.productId) : null;
  const claimed = Boolean(draft?.mediaIds?.some((id) => String(id) === String(media.id)));
  if (ownerId && claimed && String(draft?.id) !== ownerId) {
    return `CONFLICT — owned by ${ownerId}, claimed by ${draft.id}`;
  }
  if (ownerId) return `OWNED by ${ownerId}`;
  if (claimed) return `CLAIMED by ${draft?.id} (no register owner)`;
  return "UNASSIGNED";
};

const rows = kidsMedia.map((media) => {
  const file = fileName(media);
  const draftId = kidsProductIdForFile(file);
  const draft = draftId ? productById.get(draftId) ?? null : null;
  const owner = media.productId ? productById.get(String(media.productId)) ?? null : null;
  return {
    media,
    draft,
    owner,
    state: ownershipState(media, draft),
    crossProduct: owner ? owner.category !== "kidswear" : false,
    invalidReference: !existsSync(join(process.cwd(), "public", "library", file)),
  };
});

/* ------------------------------------------------------------------ */
/* Cross-product / duplicate-ownership / invalid references            */
/* ------------------------------------------------------------------ */

const byFile = new Map();
rows.forEach((row) => {
  const file = fileName(row.media);
  if (!byFile.has(file)) byFile.set(file, new Set());
  byFile.get(file).add(String(row.media.productId ?? ""));
});
const duplicateOwnership = [...byFile.values()].filter((owners) => owners.size > 1);

const crossProductRows = rows.filter((row) => row.crossProduct);
const invalidRows = rows.filter((row) => row.invalidReference);

/* Phase 22.2 — cross-product media BETWEEN the confirmed Kids products
   (KID-001 must never resolve kids-002.webp) and invalid media on a
   KID record. */
const kidsCrossProduct = rows21.flatMap((row) =>
  row.ownershipIssues.map((issue) => ({ productId: row.productId, ...issue }))
);
const kidsInvalidMedia = rows21.filter((row) => {
  if (row.missing) return false;
  const set = row.mediaSet;
  if (!set?.primary) return false;
  const file = kidsFileNameOf(set.primary);
  return !existsSync(join(process.cwd(), "public", "library", file));
});
const kidsWithoutMedia = rows21.filter((row) => !row.missing && !row.mediaSet?.primary);
const kidsUnresolvedFlags = rows21.filter((row) => (row.blockingFlags ?? []).length > 0);
const kidsMissingInfo = rows21.filter(
  (row) =>
    row.missing ||
    !row.checklist.state.name ||
    !row.checklist.state.price ||
    !row.checklist.state.subcategory ||
    !row.checklist.state.category
);
const hoverSwaps = rows21.filter((row) => row.hover?.changesOnHover);

const distinctProductIds = new Set(rows21.map((row) => row.productId));
const distinctMedia = new Set(rows21.map((row) => row.mediaFile));

const kidsGroups = buildMediaGroups(
  kidsMedia.map((item) => ({ ...item, fileName: fileName(item) }))
);

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */

line("# KIDS PRODUCT AUDIT — CONFIRMED IDENTITY (PHASE 22.2)");
line();
line("Confirmed: 21 Kids media assets = 21 SEPARATE Kids products.");
line("kids-001.webp → KID-001 … kids-021.webp → KID-021 — never merged.");
line();

line(
  pad("MEDIA ID", 24) +
    pad("FILENAME", 22) +
    pad("PATH", 26) +
    pad("GROUP KEY", 12) +
    pad("VIEW", 11) +
    pad("EXISTING", 10) +
    pad("KID", 10) +
    pad("CATEGORY", 11) +
    pad("SUBCATEGORY", 26) +
    pad("STATUS", 10) +
    "OWNERSHIP"
);
rows.forEach((row) => {
  line(
    pad(row.media.id, 24) +
      pad(row.media.currentFilename || row.media.fileName || "—", 22) +
      pad(row.media.url || row.media.filePath || "—", 26) +
      pad(row.media.groupKey || "—", 12) +
      pad(row.media.view || "standalone", 11) +
      pad(row.media.productId || "—", 10) +
      pad(row.draft?.id || "—", 10) +
      pad(row.media.categoryId || row.draft?.category || "—", 11) +
      pad(row.draft?.subcategory || "—", 26) +
      pad(row.draft?.status || "—", 10) +
      row.state
  );
});

/* ------------------------------------------------------------------ */
/* The 21-product checklist                                            */
/* ------------------------------------------------------------------ */

line();
line("# 21-PRODUCT CHECKLIST");
line();
const tick = (done) => (done ? "[x]" : "[ ]");
line(
  pad("PRODUCT", 10) +
    pad("MEDIA", 18) +
    pad("STAGE", 18) +
    KIDS_CHECKLIST_ITEMS.map((item) => pad(item.label.split(" ")[0].slice(0, 8), 10)).join("")
);
rows21.forEach((row) => {
  line(
    pad(row.productId, 10) +
      pad(row.mediaFile, 18) +
      pad(KIDS_STAGE_LABELS[row.stage] ?? row.stage, 18) +
      KIDS_CHECKLIST_ITEMS.map((item) =>
        pad(tick(row.checklist.items.find((entry) => entry.id === item.id)?.done), 10)
      ).join("")
  );
});
line();
line("Legend: " + KIDS_CHECKLIST_ITEMS.map((item) => item.label).join(" · "));

const incomplete = rows21.filter((row) => !row.checklist.complete);
if (incomplete.length) {
  line();
  line("# INCOMPLETE PRODUCTS — what is still missing");
  incomplete.forEach((row) => {
    const missing = row.checklist.items.filter((item) => !item.done);
    line(`  · ${row.productId} (${row.mediaFile}) — ${missing.length} open`);
    missing.slice(0, 4).forEach((item) => line(`      ${item.label}: ${item.reason ?? "pending"}`));
  });
}

/* ------------------------------------------------------------------ */
/* Summary                                                             */
/* ------------------------------------------------------------------ */

line();
line("# SUMMARY");
line();
line(`Total Kids products:               ${summary.total}`);
line(`Product IDs:                       ${KIDS_PRODUCT_IDS[0]} → ${KIDS_PRODUCT_IDS[KIDS_PRODUCT_IDS.length - 1]}`);
line(`Distinct Product IDs:              ${distinctProductIds.size}`);
line(`Distinct media assets:             ${distinctMedia.size}`);
line(`Missing product records:           ${summary.missingRecords}`);
line(`Draft:                             ${summary.draft}`);
line(`Review:                            ${summary.review}`);
line(`Ready:                             ${summary.ready}`);
line(`Published:                         ${summary.published}`);
line(`Assigned to an employee:           ${summary.assigned}`);
line(`Identity confirmed (SEPARATE):     ${summary.identityConfirmed}`);
line(`Checklist complete:                ${summary.checklistComplete}`);
line(`Missing information:               ${kidsMissingInfo.length}`);
kidsMissingInfo.slice(0, 21).forEach((row) => {
  const missing = row.checklist.items.filter((item) => !item.done).map((item) => item.label);
  line(`  · ${row.productId}: ${missing.join(", ") || "record missing"}`);
});
line(`Ownership conflicts:               ${summary.ownershipConflicts}`);
line(`Cross-product media:               ${kidsCrossProduct.length}`);
kidsCrossProduct.forEach((issue) => line(`  · ${issue.message}`));
line(`Duplicate ownership:               ${duplicateOwnership.length}`);
duplicateOwnership.forEach((owners) => line(`  · ${[...owners].join(", ")} share one file`));
line(`Products without media:            ${kidsWithoutMedia.length}`);
kidsWithoutMedia.forEach((row) => line(`  · ${row.productId} has no primary image`));
line(`Products with invalid media:       ${kidsInvalidMedia.length + invalidRows.length}`);
invalidRows.forEach((row) => line(`  · ${fileName(row.media)} missing from public/library`));
kidsInvalidMedia.forEach((row) => line(`  · ${row.productId} references a missing file`));
line(`Unresolved review flags:           ${kidsUnresolvedFlags.length}`);
kidsUnresolvedFlags.forEach((row) =>
  line(`  · ${row.productId}: ${row.blockingFlags.join(", ")}`)
);
line(`Hover replacements (single image): ${hoverSwaps.length}`);

line();
line("# MEDIA INVENTORY (Phase 22.1 continuity)");
line(`Total Kids media:                  ${metrics.kids.totalMedia}`);
line(`Total media groups:                ${kidsGroups.length}`);
line(`Single-image products:             ${metrics.kids.singleImageProducts}`);
line(`Multi-view products:               ${metrics.kids.multiViewProducts}`);
line(`Existing-product conflicts:        ${metrics.kids.existingProductConflicts}`);
line(`Potential same-product groups:     ${metrics.kids.potentialSameProductGroups}`);
line(`Unassigned media:                  ${metrics.kids.unassignedMedia}`);
line(`Legacy cross-category media:       ${crossProductRows.length}`);
crossProductRows.forEach((row) =>
  line(`  · ${fileName(row.media)} owned by ${row.media.productId} (not kidswear)`)
);

line();
line("# SAFETY (expected 21 / 21 / 0 / 0 / 0)");
line(`Distinct Kids products:  ${distinctProductIds.size}`);
line(`Distinct Product IDs:    ${distinctProductIds.size}`);
line(`Cross-product media:     ${kidsCrossProduct.length + crossProductRows.length}`);
line(`Duplicate ownership:     ${duplicateOwnership.length}`);
line(`Invalid media reference: ${invalidRows.length + kidsInvalidMedia.length}`);

const failures = [];
if (distinctProductIds.size !== CONFIRMED_KIDS_IDENTITIES.length) {
  failures.push(`expected ${CONFIRMED_KIDS_IDENTITIES.length} distinct Product IDs`);
}
if (distinctMedia.size !== CONFIRMED_KIDS_IDENTITIES.length) {
  failures.push(`expected ${CONFIRMED_KIDS_IDENTITIES.length} distinct media assets`);
}
if (summary.missingRecords) failures.push("missing Kids product records");
if (kidsCrossProduct.length) failures.push("cross-product media between confirmed Kids products");
if (crossProductRows.length) failures.push("cross-category media");
if (invalidRows.length || kidsInvalidMedia.length) failures.push("invalid media references");
if (duplicateOwnership.length) failures.push("duplicate ownership");
if (hoverSwaps.length) failures.push("hover replacement on a single-image product");

line();
if (failures.length) {
  line(`FAIL: ${failures.join(", ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: 21 confirmed Kids products · 21 distinct Product IDs · one product owns only its own media · no cross-product media, no duplicate ownership, no invalid references, no random hover."
  );
}
