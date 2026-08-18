/**
 * Audit the canonical Product Media architecture.
 *
 * Product photography is authored under /images/products or explicitly
 * registered in the managed-media repository. UI components must resolve it
 * from canonical Product records instead of embedding commercial file paths.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

import { auditMediaLibrary } from "../src/services/media/mediaAudit.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const ROOT = process.cwd();
const SOURCE_ROOTS = ["src/components", "src/pages", "src/layouts", "src/hooks", "src/App.jsx"];
const SOURCE_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);

const walk = (path, files = []) => {
  if (!existsSync(path)) return files;
  const stat = statSync(path);
  if (stat.isFile()) {
    if (SOURCE_EXTENSIONS.has(extname(path))) files.push(path);
    return files;
  }
  if (stat.isDirectory()) {
    readdirSync(path, { withFileTypes: true }).forEach((entry) => walk(join(path, entry.name), files));
  }
  return files;
};

const componentViolations = SOURCE_ROOTS.flatMap((path) => walk(join(ROOT, path))).flatMap((path) => {
  const source = readFileSync(path, "utf8");
  const hits = [...source.matchAll(/["'`]\/images\/products\/[^"'`$]+["'`]/g)];
  return hits.map((hit) => ({ file: relative(ROOT, path), snippet: hit[0] }));
});

const countImages = (directory) => {
  if (!existsSync(directory)) return 0;
  let count = 0;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) count += countImages(path);
    else if (/\.(?:avif|gif|jpe?g|png|webp)$/i.test(entry.name)) count += 1;
  }
  return count;
};

const report = auditMediaLibrary();
const canonicalFileCount = countImages(join(ROOT, "public/images/products"));
const retiredRoots = ["public/library", "public/media"].filter((path) => existsSync(join(ROOT, path)));
const row = (label, value) => console.log(`${label.padEnd(40)} ${value}`);

console.log("# CANONICAL PRODUCT MEDIA AUDIT\n");
row("Managed media records", report.inventory.total);
row("Managed canonical-path records", report.inventory.canonical);
row("Imported managed records", report.inventory.imported);
row("Canonical product image files", canonicalFileCount);
row("Products with resolved media", report.coverage.productsWithMedia);
row("Products without resolved media", report.coverage.productsWithoutMedia);
row("Categories with canonical cover", `${report.coverage.categoriesWithMedia} / ${report.coverage.categoriesTotal}`);
row("Managed/authored missing files", report.missingFiles.length);
row("Component path violations", componentViolations.length);
row("Retired media roots", retiredRoots.length);

if (report.missingFiles.length) {
  console.log("\n## Missing files");
  report.missingFiles.forEach(({ id, url }) => console.log(`- ${id}: ${url}`));
}
if (componentViolations.length) {
  console.log("\n## Hardcoded component Product Media paths");
  componentViolations.forEach(({ file, snippet }) => console.log(`- ${file}: ${snippet}`));
}
if (retiredRoots.length) console.log(`\nRetired roots still exist: ${retiredRoots.join(", ")}`);

const ok = report.missingFiles.length === 0 && componentViolations.length === 0 && retiredRoots.length === 0;
if (!ok) {
  console.log("\nFAIL: canonical Product Media audit did not pass.");
  process.exitCode = 1;
} else {
  console.log("\nPASS: Product Media resolves through canonical records with no retired media root.");
}
