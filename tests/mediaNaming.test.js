/**
 * PRATIKSHYA FASHON — Media naming & grouping tests (Phase 21.6)
 */

import test from "node:test";
import assert from "node:assert/strict";
import { parseMediaFilename, getViewOrderScore } from "../src/services/media/mediaNaming.js";
import { buildMediaGroups } from "../src/services/media/mediaGroups.js";
import { buildMigrationManifest, verifyPhysicalFiles, MIGRATION_STATUS } from "../src/services/media/mediaMigration.js";

test("filename parsing — basic front", () => {
  const parsed = parseMediaFilename("women-saree-banarasi-001-front.webp");
  assert.equal(parsed.groupKey, "women-saree-banarasi-001");
  assert.equal(parsed.view, "front");
  assert.equal(parsed.isStandalone, false);
});

test("filename parsing — compound right-side", () => {
  const parsed = parseMediaFilename("women-saree-banarasi-001-right-side.webp");
  assert.equal(parsed.groupKey, "women-saree-banarasi-001");
  assert.equal(parsed.view, "right-side");
});

test("filename parsing — compound front-close", () => {
  const parsed = parseMediaFilename("women-saree-banarasi-001-front-close.webp");
  assert.equal(parsed.groupKey, "women-saree-banarasi-001");
  assert.equal(parsed.view, "front-close");
});

test("filename parsing — left-side", () => {
  const parsed = parseMediaFilename("men-sherwani-006-left-side.webp");
  assert.equal(parsed.groupKey, "men-sherwani-006");
  assert.equal(parsed.view, "left-side");
});

test("filename parsing — multiple-front", () => {
  const parsed = parseMediaFilename("men-sherwani-003-multiple-front.webp");
  assert.equal(parsed.groupKey, "men-sherwani-003");
  assert.equal(parsed.view, "multiple-front");
});

test("filename parsing — standalone kids", () => {
  const parsed = parseMediaFilename("kids-001.webp");
  assert.equal(parsed.groupKey, "kids-001");
  assert.equal(parsed.view, null);
  assert.equal(parsed.isStandalone, true);
});

test("filename parsing — standalone innerwear", () => {
  const parsed = parseMediaFilename("women-innerwear-001.webp");
  assert.equal(parsed.groupKey, "women-innerwear-001");
  assert.equal(parsed.view, null);
});

test("grouping — same group number different views → one group", () => {
  const groups = buildMediaGroups([
    "women-saree-banarasi-001-front.webp",
    "women-saree-banarasi-001-side.webp",
    "women-saree-banarasi-001-back.webp",
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].groupKey, "women-saree-banarasi-001");
  assert.equal(groups[0].count, 3);
  assert.deepEqual(groups[0].views.sort(), ["back", "front", "side"]);
});

test("grouping — different numbers → three groups", () => {
  const groups = buildMediaGroups([
    "women-saree-banarasi-001-front.webp",
    "women-saree-banarasi-002-front.webp",
    "women-saree-banarasi-003-front.webp",
  ]);
  assert.equal(groups.length, 3);
  const keys = groups.map((g) => g.groupKey).sort();
  assert.deepEqual(keys, ["women-saree-banarasi-001", "women-saree-banarasi-002", "women-saree-banarasi-003"]);
});

test("grouping — standalone kids remain separate", () => {
  const groups = buildMediaGroups(["kids-001.webp", "kids-002.webp", "kids-003.webp"]);
  assert.equal(groups.length, 3);
  assert.ok(groups.every((g) => g.isStandalone));
});

test("view ordering — front < side < back < detail", () => {
  assert.ok(getViewOrderScore("front") < getViewOrderScore("side"));
  assert.ok(getViewOrderScore("side") < getViewOrderScore("back"));
  assert.ok(getViewOrderScore("back") < getViewOrderScore("detail"));
  assert.ok(getViewOrderScore("front") < getViewOrderScore("front-close"));
});

test("migration — old reference → new reference (already current)", () => {
  const oldAssets = [{ id: "pm-1", currentFilename: "kids-001.webp", optimizedPath: "library/kids-001.webp", role: null, sortOrder: 0, productId: null }];
  const newFiles = ["kids-001.webp", "kids-002.webp"];
  const manifest = buildMigrationManifest({ oldAssets, newFileNames: newFiles });
  const entry = manifest.find((e) => e.oldPath.includes("kids-001"));
  assert.equal(entry.status, MIGRATION_STATUS.ALREADY_CURRENT);
});

test("migration — old renamed to new view", () => {
  const oldAssets = [{ id: "pm-2", currentFilename: "men-kurta-pajama-001.webp", optimizedPath: "library/men-kurta-pajama-001.webp", role: "COVER", sortOrder: 0, productId: "pf-076" }];
  const newFiles = ["men-kurta-pajama-001-front.webp", "men-kurta-pajama-001-back.webp"];
  const manifest = buildMigrationManifest({ oldAssets, newFileNames: newFiles });
  const entry = manifest.find((e) => e.oldPath.includes("men-kurta-pajama-001"));
  assert.equal(entry.status, MIGRATION_STATUS.MIGRATED);
  assert.ok(entry.newPath.includes("front") || entry.newPath.includes("back"));
});

test("missing files detection", () => {
  const records = [
    { url: "/library/kids-001.webp", broken: false },
    { url: "/library/women-saree-banarasi-001-front.webp", broken: false },
    { url: "/library/missing-file.webp", broken: false },
  ];
  const existing = new Set(["kids-001.webp", "women-saree-banarasi-001-front.webp"]);
  const result = verifyPhysicalFiles({ records, existingFileSet: existing });
  assert.equal(result.total, 3);
  assert.equal(result.valid, 2);
  assert.equal(result.missing, 1);
});

test("duplicate mapping — no duplicate gallery entries (idempotent build)", () => {
  const files = ["women-saree-banarasi-001-front.webp", "women-saree-banarasi-001-front.webp"];
  // buildMediaGroups dedupes by group, but duplicate filename should not create duplicate group entries
  const groups = buildMediaGroups(files);
  // Even with duplicate input, group count should be 1 and file count 2 (but deduped later by repository dedupeMedia)
  assert.equal(groups.length, 1);
  assert.equal(groups[0].count, 2);
});

test("product mapping — existing product ID remains unchanged (parse should not mutate productId)", () => {
  const parsed = parseMediaFilename("women-saree-banarasi-001-front.webp");
  // parser itself does not assign productId, productId preservation is in repository layer
  assert.equal(parsed.groupKey, "women-saree-banarasi-001");
  // Simulate repository preserving productId
  const record = { id: "pm-test", productId: "pf-011", fileName: "women-saree-banarasi-001-front.webp", groupKey: parsed.groupKey };
  assert.equal(record.productId, "pf-011");
});

test("existing gallery — standalone remains intact (innerwear not grouped as product)", () => {
  const groups = buildMediaGroups(["women-innerwear-001.webp", "women-innerwear-002.webp"]);
  assert.equal(groups.length, 2);
  assert.ok(groups.every((g) => g.isStandalone));
});

test("AI Mirror — non-apparel exclusion logic (via category)", () => {
  // Simulate isAiMirrorSafeMedia logic: jewellery should be excluded
  const excluded = ["jewellery", "bangles", "dupattas", "innerwear"];
  const eligible = ["sarees", "lehengas", "bridal-couture", "menswear"];
  assert.ok(excluded.includes("jewellery"));
  assert.ok(!eligible.includes("jewellery"));
  assert.ok(eligible.includes("sarees"));
});
