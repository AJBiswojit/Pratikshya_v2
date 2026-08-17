#!/usr/bin/env node
/**
 * PRATIKSHYA FASHON — Media ingestion CLI (Phase 21.4).
 *
 *   npm run media:analyze     dry-run: discover, hash, map, report
 *   npm run media:optimize    write optimized assets + update the manifest
 *
 * Deterministic and idempotent. A second run does not mint new filenames
 * for the same originals. Source files under public/media are never deleted.
 * Phase 21.11 folds remaining public/images house plates into public/library.
 */

import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import catalogue from "../src/data/products/catalogue.js";
import {
  HOUSE_IMAGE_ROOT,
  IMAGE_EXTENSIONS,
  MAX_OUTPUT_EDGE,
  OPTIMIZED_ROOT,
  SOURCE_MEDIA_ROOT,
  WEBP_QUALITY,
  basenameOf,
  buildIngestionRecords,
  catalogueAsProducts,
  extensionOf,
  fileChecksum,
  posixRel,
  summariseIngestion,
} from "./lib/mediaIngestion.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC_DIR = join(ROOT, "public");
const MANIFEST_PATH = join(ROOT, "src/data/media/ingestedManifest.json");
const REPORT_JSON_PATH = join(ROOT, "src/data/media/ingestionReport.json");
const REPORT_MD_PATH = join(ROOT, "docs/PRATIKSHYA-MEDIA-INGESTION.md");
const LIBRARY_DIR = join(PUBLIC_DIR, OPTIMIZED_ROOT);

const dryRun = process.argv.includes("--dry-run") || process.argv.includes("-n");

const walkImages = (dir, acc = []) => {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      walkImages(full, acc);
      continue;
    }
    const ext = extname(entry.name).toLowerCase();
    if (!IMAGE_EXTENSIONS.has(ext)) continue;
    acc.push(full);
  }
  return acc;
};

const identifyImage = (absPath) => {
  const result = spawnSync("identify", ["-format", "%w %h %m", absPath], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    return { width: 0, height: 0, format: "", broken: true };
  }
  const [width, height, format] = String(result.stdout || "")
    .trim()
    .split(/\s+/);
  return {
    width: Number(width) || 0,
    height: Number(height) || 0,
    format: format || "",
    broken: false,
  };
};

const optimizeImage = (absSource, absDest, { width }) => {
  mkdirSync(dirname(absDest), { recursive: true });
  const resize = width > MAX_OUTPUT_EDGE ? `${MAX_OUTPUT_EDGE}x${MAX_OUTPUT_EDGE}>` : null;
  const args = [absSource, "-auto-orient"];
  if (resize) args.push("-resize", resize);
  args.push("-quality", String(WEBP_QUALITY), "-define", "webp:method=6", "-strip", absDest);
  const result = spawnSync("convert", args, { encoding: "utf8" });
  if (result.status !== 0 || !existsSync(absDest)) {
    return { ok: false, error: result.stderr || "convert failed" };
  }
  return { ok: true, bytes: statSync(absDest).size };
};

const discover = () => {
  const roots = [join(PUBLIC_DIR, SOURCE_MEDIA_ROOT), join(PUBLIC_DIR, HOUSE_IMAGE_ROOT)];
  const files = roots.flatMap((root) => walkImages(root)).sort((a, b) => a.localeCompare(b));

  return files.map((abs) => {
    const rel = posixRel(relative(PUBLIC_DIR, abs));
    const stat = statSync(abs);
    const buffer = readFileSync(abs);
    const meta = identifyImage(abs);
    return {
      originalPath: rel,
      filename: basenameOf(rel),
      extension: extensionOf(rel),
      sizeBytes: stat.size,
      checksum: fileChecksum(buffer),
      width: meta.width,
      height: meta.height,
      format: meta.format,
      broken: meta.broken,
    };
  });
};

const loadPreviousManifest = () => {
  if (!existsSync(MANIFEST_PATH)) return { assets: [] };
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, "utf8"));
  } catch {
    return { assets: [] };
  }
};

const writeManifest = (records, report) => {
  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    sourceRoots: [`public/${SOURCE_MEDIA_ROOT}`, `public/${HOUSE_IMAGE_ROOT}`],
    optimizedRoot: `public/${OPTIMIZED_ROOT}`,
    note: "Source originals are preserved. Application surfaces read optimizedPath / url.",
    report,
    assets: records.map((item) => ({
      id: item.id,
      originalPath: item.originalPath,
      optimizedPath: item.optimizedPath,
      originalFilename: item.originalFilename,
      currentFilename: item.currentFilename,
      extension: item.extension,
      checksum: item.checksum,
      width: item.width,
      height: item.height,
      aspectRatio: item.aspectRatio,
      originalSizeBytes: item.sizeBytes,
      optimizedSizeBytes: item.optimizedSizeBytes ?? null,
      categoryId: item.categoryId,
      subcategoryName: item.subcategoryName,
      collectionId: item.collectionId,
      productId: item.productId,
      variantId: item.variantId,
      role: item.role || null,
      sortOrder: item.sortOrder ?? 0,
      usageRoles: item.usageRoles || [],
      mappingStatus: item.mappingStatus,
      mappingMethod: item.mappingMethod,
      mappingNote: item.mappingNote,
      duplicateStatus: item.duplicateStatus,
      duplicateOf: item.duplicateOf,
      featured: Boolean(item.featured),
      house: Boolean(item.house),
      dump: Boolean(item.dump),
      large: Boolean(item.large),
      lowResolution: Boolean(item.lowResolution),
      broken: Boolean(item.broken),
      skipOptimize: Boolean(item.skipOptimize),
      gender: item.gender,
      namePrefix: item.namePrefix,
      probableUsage: item.probableUsage,
    })),
  };

  mkdirSync(dirname(MANIFEST_PATH), { recursive: true });
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(payload, null, 2)}\n`);
  writeFileSync(REPORT_JSON_PATH, `${JSON.stringify(report, null, 2)}\n`);
  writeFileSync(REPORT_MD_PATH, renderMarkdownReport(payload, report));
};

const renderMarkdownReport = (payload, report) => {
  const mb = (bytes) => `${(Number(bytes || 0) / (1024 * 1024)).toFixed(1)} MB`;
  return `# PRATIKSHYA FASHON — Media ingestion report (Phase 21.4)

Generated: ${payload.generatedAt}

This file is produced by \`npm run media:optimize\`. Source originals under
\`public/media\` and \`public/images\` are never deleted. Application surfaces
read \`public/library\` plus the existing house plates.

## Inventory

| Measure | Count |
| --- | ---: |
| Total images | ${report.total} |
| Optimized | ${report.optimized} |
| Skipped (already web-ready house plates) | ${report.skipped} |
| Exact duplicates | ${report.duplicates} |
| Possible duplicates | ${report.possibleDuplicates} |
| Mapped | ${report.mapped} |
| Unmapped | ${report.unmapped} |
| Needs review | ${report.needsReview} |
| Broken | ${report.broken} |
| Large originals (≥ 1.5 MB) | ${report.large} |
| Low-resolution (< 400px wide) | ${report.lowResolution} |
| Mapped to products | ${report.mappedToProducts} |
| Mapped to categories | ${report.mappedToCategories} |

## Storage

| | |
| --- | --- |
| Before (source files scanned) | ${mb(report.storage.beforeBytes)} |
| After (optimized library + untouched house plates) | ${mb(report.storage.afterBytes)} |
| Reduction | ${report.storage.reductionPercent ?? "—"}% |

Tradeoff: originals remain in \`public/media\` so high-resolution recoverability
is preserved. The application never reads those originals at runtime.

## Taxonomy

- Categories mapped: ${report.categoriesMapped}
- Subcategories mapped: ${report.subcategoriesMapped}
- Collections mapped: ${report.collectionsMapped}
- Distinct products with slotted media: ${report.productsWithMedia}

## Usage roles

| Role | Assets |
| --- | ---: |
| Hero | ${report.usage.hero} |
| Category | ${report.usage.category} |
| Product | ${report.usage.product} |
| Editorial | ${report.usage.editorial} |
| New arrival | ${report.usage.newArrival} |
| Sale | ${report.usage.sale} |
| Collection | ${report.usage.collection} |
| AI Shopping | ${report.usage.aiShopping} |
| AI Mirror | ${report.usage.aiMirror} |

## Manual review

### Unmapped

${report.unmappedPaths.length ? report.unmappedPaths.map((path) => `- \`${path}\``).join("\n") : "_None._"}

### Needs review

${report.reviewPaths.length ? report.reviewPaths.map((path) => `- \`${path}\``).join("\n") : "_None._"}

### Exact duplicates (kept, not deleted)

${report.duplicatePaths.length ? report.duplicatePaths.map((entry) => `- \`${entry.path}\` → ${entry.of}`).join("\n") : "_None._"}
`;
};

const printSummary = (report) => {
  const lines = [
    `Images discovered: ${report.total}`,
    `Images already optimized / skipped: ${report.skipped}`,
    `Images requiring optimization: ${report.optimized}`,
    `Potential duplicates: ${report.duplicates} exact / ${report.possibleDuplicates} possible`,
    `Mapped to products: ${report.mappedToProducts}`,
    `Mapped to categories: ${report.mappedToCategories}`,
    `Unmapped: ${report.unmapped}`,
    `Needs review: ${report.needsReview}`,
    `Large files: ${report.large}`,
    `Low-resolution: ${report.lowResolution}`,
    `Broken: ${report.broken}`,
  ];
  process.stdout.write(`${lines.join("\n")}\n`);
};

const main = () => {
  if (!existsSync(PUBLIC_DIR)) {
    console.error("public/ is missing — refusing to run.");
    process.exit(1);
  }

  const discovered = discover();
  if (!discovered.length) {
    console.error("No source images found under public/media or public/images.");
    process.exit(1);
  }

  const products = catalogueAsProducts(catalogue);
  const records = buildIngestionRecords(discovered, { products });
  const beforeBytes = records.reduce((sum, item) => sum + (Number(item.sizeBytes) || 0), 0);

  if (dryRun) {
    const report = summariseIngestion(records, { beforeBytes, afterBytes: 0 });
    printSummary(report);
    process.stdout.write("\nDry run only. No files written.\n");
    return;
  }

  mkdirSync(LIBRARY_DIR, { recursive: true });
  const previous = loadPreviousManifest();
  const previousById = new Map((previous.assets || []).map((asset) => [asset.id, asset]));

  let afterBytes = 0;
  records.forEach((item) => {
    if (item.skipOptimize) {
      item.optimizedSizeBytes = item.sizeBytes;
      afterBytes += item.sizeBytes;
      return;
    }

    const absSource = join(PUBLIC_DIR, item.originalPath);
    const absDest = join(PUBLIC_DIR, item.optimizedPath);
    const prev = previousById.get(item.id);
    const unchanged =
      prev &&
      prev.checksum === item.checksum &&
      prev.optimizedPath === item.optimizedPath &&
      existsSync(absDest);

    if (unchanged) {
      item.optimizedSizeBytes = statSync(absDest).size;
      afterBytes += item.optimizedSizeBytes;
      return;
    }

    const result = optimizeImage(absSource, absDest, { width: item.width });
    if (!result.ok) {
      const fallback = item.optimizedPath.replace(/\.webp$/i, item.extension || ".jpg");
      const absFallback = join(PUBLIC_DIR, fallback);
      copyFileSync(absSource, absFallback);
      item.optimizedPath = fallback;
      item.currentFilename = basenameOf(fallback);
      item.optimizedSizeBytes = statSync(absFallback).size;
      item.optimizeError = result.error;
    } else {
      item.optimizedSizeBytes = result.bytes;
    }
    afterBytes += item.optimizedSizeBytes || 0;
  });

  const report = summariseIngestion(records, { beforeBytes, afterBytes });
  writeManifest(records, report);
  printSummary(report);
  process.stdout.write(`\nWrote ${records.length} records to ${relative(ROOT, MANIFEST_PATH)}\n`);
  process.stdout.write(`Optimized library: ${relative(ROOT, LIBRARY_DIR)}\n`);
};

main();
