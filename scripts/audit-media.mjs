/**
 * PRATIKSHYA FASHON — Unified media library audit (Phase 21.11).
 *
 *   npm run audit:media
 *
 * Reports inventory, coverage, duplicates, needs-review, broken references
 * and — most importantly — hardcoded commercial image paths in application
 * components. Resolver-generated `/library/` URLs are not flagged.
 *
 * Fails (exit 1) when:
 *   · hardcoded commercial image references in components !== 0
 *   · a register record points at a missing local file
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { auditMediaLibrary } from "../src/services/media/mediaAudit.js";
import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const ROOT = process.cwd();
const COMPONENT_ROOTS = [
  "src/components",
  "src/pages",
  "src/layouts",
  "src/hooks",
  "src/App.jsx",
  "src/index.css",
];

const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx", ".css"]);

const walk = (abs, acc = []) => {
  if (!existsSync(abs)) return acc;
  const stat = statSync(abs);
  if (stat.isFile()) {
    if (SOURCE_EXTENSIONS.has(extname(abs))) acc.push(abs);
    return acc;
  }
  if (!stat.isDirectory()) return acc;
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    walk(join(abs, entry.name), acc);
  }
  return acc;
};

/**
 * A commercial path is hardcoded when a component writes a literal
 * `/images/…`, `/library/<file>` or `/media/…` address. Mentions of the
 * folder itself (`public/library`) and generic placeholder copy are ignored.
 */
const HARDCODED_PATTERN =
  /(?:src|href|url|poster|thumbnail|image)\s*[:=]\s*[`'"](\/(?:images|library|media)\/[^`'"]+)[`'"]|`\/images\/\$\{|['"]\/images\/|url\(\s*['"]?\/(?:images|library|media)\//g;

const scanHardcodedReferences = () => {
  const files = COMPONENT_ROOTS.flatMap((rel) => walk(join(ROOT, rel)));
  const hits = [];
  files.forEach((abs) => {
    const source = readFileSync(abs, "utf8");
    const rel = relative(ROOT, abs);
    for (const match of source.matchAll(HARDCODED_PATTERN)) {
      hits.push({
        file: rel,
        snippet: (match[0] || "").slice(0, 120),
      });
    }
  });
  return hits;
};

const countPublic = (relDir) => {
  const abs = join(ROOT, relDir);
  if (!existsSync(abs)) return 0;
  let count = 0;
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) visit(full);
      else if (/\.(jpe?g|png|webp|avif|gif)$/i.test(entry.name)) count += 1;
    }
  };
  visit(abs);
  return count;
};

const report = auditMediaLibrary();
const hardcoded = scanHardcodedReferences();
const libraryFiles = countPublic("public/library");
const imagesFiles = countPublic("public/images");

const line = (text = "") => console.log(text);
const row = (label, value) => line(`${label.padEnd(36)} ${value}`);

line("# MEDIA LIBRARY AUDIT — Phase 21.11");
line();
line("## INVENTORY");
row("Total assets (register)", report.inventory.total);
row("Canonical assets (/library)", report.inventory.canonical);
row("Ingested assets", report.inventory.ingested);
row("House plates", report.inventory.house);
row("Legacy /images references", report.inventory.legacy);
row("Migrated house plates", report.inventory.migrated);
row("Unused (mapped, inactive)", report.inventory.unused);
row("Duplicate assets", report.inventory.duplicates);
row("Needs review", report.inventory.needsReview);
row("Broken / missing files", report.inventory.broken);
row("Files in public/library", libraryFiles);
row("Files remaining in public/images", imagesFiles);
line();

line("## COVERAGE");
row("Products with media", report.coverage.productsWithMedia);
row("Products without media", report.coverage.productsWithoutMedia);
row("Categories with media", `${report.coverage.categoriesWithMedia} / ${report.coverage.categoriesTotal}`);
row("Collections with media", `${report.coverage.collectionsWithMedia} / ${report.coverage.collectionsTotal}`);
line();

line("## PRODUCT MEDIA STATUS");
Object.entries(report.productStatuses).forEach(([status, count]) => row(status, count));
line();

line("## HOUSE PLATE MIGRATION");
report.housePlates.forEach((entry) => {
  line(`- ${entry.oldPath} → ${entry.newPath}  [${entry.id}]  ${entry.resolved ? "RESOLVED" : "MISSING"}`);
});
line();

line("## HARDCODED COMMERCIAL IMAGE REFERENCES");
row("Count", hardcoded.length);
if (hardcoded.length) {
  hardcoded.forEach((hit) => line(`- ${hit.file}: ${hit.snippet}`));
} else {
  line("0 — application components do not hard-code commercial image paths.");
}
line();

if (report.missingFiles.length) {
  line("## MISSING FILES");
  report.missingFiles.forEach((entry) => line(`- ${entry.id}  ${entry.url}`));
  line();
}

const failedHouse = report.housePlates.filter((entry) => !entry.resolved);
const ok =
  hardcoded.length === 0 &&
  report.missingFiles.length === 0 &&
  failedHouse.length === 0 &&
  report.inventory.broken === 0;

if (!ok) {
  line("FAIL: media library audit did not pass.");
  process.exitCode = 1;
} else {
  line("PASS: one canonical media root, zero hardcoded commercial image references.");
}
