/**
 * PRATIKSHYA FASHON — Media-library product discovery audit (Phase 24.1).
 *
 *   npm run audit:media-product-discovery
 *
 * Answers ONE question, and refuses to answer any easier one:
 *
 *   "Has every distinct product represented by public/library been
 *    identified, grouped, given ONE permanent Product ID and connected to a
 *    catalogue record?"
 *
 * A published-product count is NOT an answer. A group that never became a
 * product is absent from every storefront number, so this audit starts at
 * the filesystem — `public/library` itself — and walks forward:
 *
 *   FILE → GROUP → PRODUCT ID → CATALOGUE RECORD → PUBLISHED/DRAFT
 *
 * Reports, per category and per filename family:
 *   TOTAL MEDIA FILES · TOTAL MEDIA GROUPS · GROUPS WITH PRODUCTS ·
 *   GROUPS WITHOUT PRODUCTS · PRODUCT IDS · DUPLICATE GROUPS ·
 *   MULTI-VIEW GROUPS · STANDALONE GROUPS · REVIEW REQUIRED
 *
 * Fails (exit 1) when:
 *   · any product-media group has no product record
 *   · a file on disk is unknown to every register (invisible coverage hole)
 *   · a register file is missing from disk (broken reference)
 *   · one media group resolves to more than one product
 */

import { readdirSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import {
  filenameDerivedDiscovery,
  getMediaProductDiscovery,
  uncoveredProductGroups,
} from "../src/services/media/mediaProductDiscovery.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);
const num = (value, width) => String(value ?? 0).padStart(width);

const LIBRARY_DIR = join(process.cwd(), "public", "library");
const MEDIA_EXTENSIONS = /\.(webp|jpe?g|png|avif|gif|mp4|webm)$/i;

const diskFiles = readdirSync(LIBRARY_DIR).filter((file) => MEDIA_EXTENSIONS.test(file));

const products = catalogRepository.all();
const discovery = getMediaProductDiscovery({ products, diskFiles });
const { totals, byCategory, bySubtype, rows } = discovery;

/* ------------------------------------------------------------------ */
/* Library inventory                                                   */
/* ------------------------------------------------------------------ */

line("# MEDIA-LIBRARY PRODUCT DISCOVERY AUDIT");
line();
line("Scope: public/library → media groups → Product IDs → catalogue records.");
line("A group is COVERED only when a product record represents it — published or draft.");
line();

line("# LIBRARY INVENTORY");
line();
line(`FILES ON DISK              ${diskFiles.length}`);
line(`FILES KNOWN TO REGISTERS   ${totals.libraryFiles}`);
line(`  · product photography    ${totals.productMediaFiles}`);
line(`  · house artwork          ${totals.houseMediaFiles}`);
line(`  · marketing hero media   ${totals.marketingMediaFiles}`);
line(`TOTAL MEDIA GROUPS         ${totals.groups}`);
line(`  · multi-view groups      ${totals.multiViewGroups}`);
line(`  · standalone groups      ${totals.standaloneGroups}`);
line();
line(`GROUPS WITH PRODUCTS       ${totals.groupsWithProducts}`);
line(`GROUPS WITHOUT PRODUCTS    ${totals.groupsWithoutProducts}`);
line(`DISTINCT PRODUCT IDS       ${totals.distinctProductIds}`);
line(`  · published              ${totals.publishedGroups}`);
line(`  · draft                  ${totals.draftGroups}`);
line(`REVIEW REQUIRED (groups)   ${totals.needsReviewGroups}`);
line(`DUPLICATE GROUPS           ${discovery.duplicateGroups.length}`);
line();

/* ------------------------------------------------------------------ */
/* Category coverage                                                   */
/* ------------------------------------------------------------------ */

line("# CATEGORY COVERAGE");
line();
line(
  pad("CATEGORY", 18) +
    pad("FILES", 7) +
    pad("GROUPS", 8) +
    pad("W/PRODUCT", 11) +
    pad("MISSING", 9) +
    pad("PUBLISHED", 11) +
    pad("DRAFT", 7) +
    pad("MULTI", 7) +
    pad("SINGLE", 8) +
    pad("REVIEW", 7)
);
byCategory.forEach((entry) => {
  line(
    pad(entry.key, 18) +
      num(entry.files, 5) +
      "  " +
      num(entry.groups, 6) +
      "  " +
      num(entry.withProduct, 9) +
      "  " +
      num(entry.withoutProduct, 7) +
      "  " +
      num(entry.published, 9) +
      "  " +
      num(entry.draft, 5) +
      "  " +
      num(entry.multiView, 5) +
      "  " +
      num(entry.standalone, 6) +
      "  " +
      num(entry.needsReview, 5)
  );
});
line();

/* ------------------------------------------------------------------ */
/* Filename-family coverage — the counts the phase brief asks about    */
/* ------------------------------------------------------------------ */

line("# PRODUCT-FAMILY COVERAGE (filename-derived)");
line();
line("Families are derived from the filename convention, not from taxonomy, so a");
line("family with no taxonomy record of its own is still counted.");
line();
line(
  pad("FAMILY", 22) +
    pad("FILES", 7) +
    pad("GROUPS", 8) +
    pad("W/PRODUCT", 11) +
    pad("MISSING", 9) +
    pad("PUBLISHED", 11) +
    pad("DRAFT", 7)
);
bySubtype.forEach((entry) => {
  line(
    pad(entry.key, 22) +
      num(entry.files, 5) +
      "  " +
      num(entry.groups, 6) +
      "  " +
      num(entry.withProduct, 9) +
      "  " +
      num(entry.withoutProduct, 7) +
      "  " +
      num(entry.published, 9) +
      "  " +
      num(entry.draft, 5)
  );
});
line();

/* ------------------------------------------------------------------ */
/* Expected coverage — verified, never forced                          */
/* ------------------------------------------------------------------ */

/**
 * The counts stated in the Phase 24.1 brief. These are VERIFIED against the
 * real filesystem scan; when the actual number differs the ACTUAL number is
 * reported and the discrepancy explained. The expectation never overrides
 * the scan.
 */
const EXPECTATIONS = [
  { label: "Bangles", family: "Bangles", expected: 9 },
  { label: "Earrings", family: "Earrings", expected: 14 },
  { label: "Women's Innerwear", family: "Innerwear", expected: 19 },
];

line("# EXPECTED COVERAGE CHECK");
line();
line(pad("FAMILY", 22) + pad("EXPECTED", 10) + pad("ACTUAL", 8) + pad("PRODUCTS", 10) + "VERDICT");
const expectationNotes = [];
EXPECTATIONS.forEach(({ label, family, expected }) => {
  const entry = bySubtype.find((row) => row.key === family);
  const actual = entry?.groups ?? 0;
  const withProduct = entry?.withProduct ?? 0;
  const match = actual === expected;
  const covered = withProduct === actual;
  line(
    pad(label, 22) +
      num(expected, 8) +
      "  " +
      num(actual, 6) +
      "  " +
      num(withProduct, 8) +
      "  " +
      (match && covered ? "OK" : match ? "COVERAGE GAP" : "COUNT DIFFERS")
  );
  if (!match) {
    expectationNotes.push(
      `${label}: expected ${expected} groups, scanned ${actual}. The scan is authoritative.`
    );
  }
  if (!covered) {
    expectationNotes.push(`${label}: ${actual - withProduct} group(s) have no product record.`);
  }
});
if (expectationNotes.length) {
  line();
  expectationNotes.forEach((note) => line(`  · ${note}`));
}
line();

/* ------------------------------------------------------------------ */
/* Filename-derived discovery                                          */
/* ------------------------------------------------------------------ */

line("# FILENAME-DERIVED DISCOVERY");
line();
line("What each group's FILENAME says, and what the catalogue already knows.");
line("`candidate` is the semantic id the filename implies; `product` is the");
line("permanent id the catalogue minted. Existing ids are never renumbered.");
line();
line(
  pad("GROUP KEY", 28) +
    pad("CATEGORY", 16) +
    pad("FAMILY", 18) +
    pad("CANDIDATE", 11) +
    pad("PRODUCT", 11) +
    pad("MATCH", 22) +
    "ACTION"
);
filenameDerivedDiscovery(discovery).forEach((row) => {
  line(
    pad(row.groupKey, 28) +
      pad(row.category || "—", 16) +
      pad(row.subcategory || "—", 18) +
      pad(row.candidateProductId || "—", 11) +
      pad(row.existingProductId || "—", 11) +
      pad(row.match, 22) +
      row.action
  );
});
line();

/* ------------------------------------------------------------------ */
/* Integrity                                                           */
/* ------------------------------------------------------------------ */

const uncovered = uncoveredProductGroups(discovery);
const multiGroupProducts = discovery.productsWithMultipleGroups;
const conflicted = rows.filter((row) => row.ownershipConflicts.length);

line("# INTEGRITY");
line();

line(`GROUPS WITHOUT A PRODUCT   ${uncovered.length}`);
uncovered.forEach((row) => line(`  · ${row.groupKey} (${row.files.join(", ")})`));

line(`DUPLICATE GROUP KEYS       ${discovery.duplicateGroups.length}`);
discovery.duplicateGroups.forEach((entry) =>
  line(`  · ${entry.groupKey} appears ${entry.count}×`)
);

line(`GROUPS WITH >1 OWNER       ${conflicted.length}`);
conflicted.forEach((row) =>
  line(`  · ${row.groupKey} → ${row.productId} + ${row.ownershipConflicts.join(", ")}`)
);

/* A product legitimately owning several groups is reported, not failed: a
   single garment photographed under two filename families is a human
   decision, and merging it automatically would violate SIMILAR ≠ SAME. */
line(`PRODUCTS OWNING >1 GROUP   ${multiGroupProducts.length}`);
multiGroupProducts.forEach((entry) =>
  line(`  · ${entry.productId} ← ${entry.groupKeys.join(", ")} (review, not merged)`)
);

line(`DISK FILES NOT REGISTERED  ${discovery.orphanedDiskFiles.length}`);
discovery.orphanedDiskFiles.forEach((file) => line(`  · ${file}`));

line(`REGISTERED FILES NOT ON DISK ${discovery.missingFromDisk.length}`);
discovery.missingFromDisk.forEach((file) => line(`  · ${file}`));
line();

/* ------------------------------------------------------------------ */
/* Verdict                                                             */
/* ------------------------------------------------------------------ */

const failures = [];
if (uncovered.length) failures.push(`${uncovered.length} media group(s) have no product record`);
if (discovery.duplicateGroups.length)
  failures.push(`${discovery.duplicateGroups.length} duplicate group key(s)`);
if (conflicted.length) failures.push(`${conflicted.length} group(s) resolve to multiple products`);
if (discovery.orphanedDiskFiles.length)
  failures.push(`${discovery.orphanedDiskFiles.length} disk file(s) unknown to every register`);
if (discovery.missingFromDisk.length)
  failures.push(`${discovery.missingFromDisk.length} registered file(s) missing from disk`);

line("# SUMMARY");
line();
if (failures.length) {
  failures.forEach((failure) => line(`  · ${failure}`));
  line();
  line(`FAIL: ${failures.length} coverage problem(s).`);
  process.exitCode = 1;
} else {
  line(
    `PASS: ${totals.groups} media groups → ${totals.distinctProductIds} distinct Product IDs. ` +
      "Every product group in the library is connected to a catalogue record; " +
      "no duplicates, no orphans, no group owned twice."
  );
}
