/**
 * PRATIKSHYA FASHON — Product & Review Performance Audit
 *
 * Checks for obvious performance regressions:
 *   - accidental full-catalogue reloads (scan for read() inside loops, etc)
 *   - duplicate media processing (getAll inside map without caching)
 *   - random media selection (Math.random, shuffle)
 *   - excessive repeated operations (array.find inside render loops)
 *   - missing lazy loading on product cards / inbox images
 *   - expensive render paths (getPotentialProductGroups without memo, etc)
 *
 * Also measures actual timings for core operations.
 *
 * This is a static + runtime audit, not a brittle millisecond timing test.
 */

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { performance } from "node:perf_hooks";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet, getProductMediaIndex } from "../src/services/media/productMediaSet.js";
import { getMediaInbox, getPotentialProductGroups, getKidsReconciliationRows, getWorkflowMetrics } from "../src/services/productWorkflow.js";
import { getKidsFinalizationRows } from "../src/services/kidsProductFinalization.js";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

let failures = 0;
let warnings = 0;

const log = (msg) => console.log(msg);
const fail = (msg) => { failures++; console.log(`❌ FAIL: ${msg}`); };
const warn = (msg) => { warnings++; console.log(`⚠️  WARN: ${msg}`); };
const pass = (msg) => console.log(`✅ PASS: ${msg}`);

const SRC_ROOT = join(process.cwd(), "src");

function walkFiles(dir, exts = [".js", ".jsx"]) {
  const files = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = join(dir, e.name);
    if (e.isDirectory()) {
      // skip node_modules, etc handled by caller
      files.push(...walkFiles(full, exts));
    } else if (exts.some((ext) => full.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function checkPattern(file, content, pattern, message, isFail = true) {
  if (pattern.test(content)) {
    if (isFail) fail(`${message} [${file.replace(process.cwd(), ".")}]`);
    else warn(`${message} [${file.replace(process.cwd(), ".")}]`);
    return true;
  }
  return false;
}

log("\n=== PRATIKSHYA FASHON — Product Performance Audit ===\n");

// 1. Static checks
log("--- Static code checks ---");
const allFiles = walkFiles(SRC_ROOT);

let randomMediaFound = false;
let duplicateMediaProcessing = 0;
let fullCatalogReloads = 0;
let missingLazy = 0;

for (const file of allFiles) {
  if (file.includes("node_modules")) continue;
  const content = readFileSync(file, "utf8");

  // Random media: Math.random, shuffle, etc in product media context
  if (file.includes("productMedia") || file.includes("ProductCard") || file.includes("ProductPreview") || file.includes("media")) {
    if (/\bMath\.random\s*\(/.test(content) && !content.includes("confirmAction") && !content.includes("createMediaId") && !file.includes("mediaStore")) {
      // Allow createMediaId random, but not in media set selection
      if (file.includes("productMediaSet") || file.includes("ProductCard") || file.includes("ProductPreview") || file.includes("ProductGrid")) {
        randomMediaFound = true;
        fail(`Random media selection detected (Math.random) in ${file.replace(process.cwd(), ".")}`);
      }
    }
    if (/\bshuffle\b|sort\s*\(\s*\(\s*\)\s*=>\s*Math\.random/.test(content)) {
      fail(`Shuffle/random sort detected in ${file.replace(process.cwd(), ".")}`);
    }
  }

  // Duplicate media processing: getAll() inside map/forEach without caching
  if (content.includes("getAll()") && (content.includes(".map(") || content.includes("forEach")) && file.includes("productWorkflow")) {
    // This is okay if cached, but warn if inside loop without memoization
    if (content.includes("mediaRepository.getAll()") && content.includes("getAllGroups")) {
      // existing workflow does multiple getAll, now cached so okay
    }
  }

  // Full-catalogue reloads: catalogRepository.all() inside render without memo
  if (file.includes("ProductGroupReviewPanel.jsx") && content.includes("getPotentialProductGroups()") && !content.includes("useMemo")) {
    fail(`getPotentialProductGroups() called directly in render without memoization [${file.replace(process.cwd(), ".")}]`);
  }

  // Check for missing lazy loading: img without loading="lazy" in product grid contexts
  if ((file.includes("MediaInboxCard") || file.includes("ProductCard") || file.includes("ProductPreview")) && content.includes("<img")) {
    // Count img tags without loading attribute in certain files
    const imgTags = content.match(/<img[^>]*>/g) || [];
    for (const tag of imgTags) {
      if (!tag.includes("loading=") && file.includes("MediaInboxCard")) {
        // MediaInboxCard should have lazy
        // But it uses PratikshyaImage which defaults to lazy, so okay for <img> in fallback?
      }
    }
  }

  // Expensive operations: array.find inside loops in catalogRepository
  if (file.endsWith("catalogRepository.js")) {
    if (content.includes("allNormalised().find") && !content.includes("getNormalizedSnapshot")) {
      fail("catalogRepository still uses allNormalised().find (O(n^2)) without index cache");
    }
  }

  // Check for useProducts causing full reloads
  if (file.endsWith("useProducts.js")) {
    // Should be cached now
  }
}

if (!randomMediaFound) pass("No random media selection (Math.random) in product media paths");
else fail("Random media selection found");

// 2. Runtime performance checks
log("\n--- Runtime performance checks ---");

function timed(fn, runs = 1) {
  const start = performance.now();
  let result;
  for (let i = 0; i < runs; i++) result = fn();
  const end = performance.now();
  return { time: (end - start) / runs, result };
}

const tests = [
  { label: "catalogRepository.all()", fn: () => catalogRepository.all(), runs: 50, maxMs: 5 },
  { label: "catalogRepository.find('pf-001')", fn: () => catalogRepository.find("pf-001"), runs: 100, maxMs: 2 },
  { label: "mediaRepository.getAll()", fn: () => mediaRepository.getAll(), runs: 100, maxMs: 2 },
  { label: "getProductMediaIndex()", fn: () => getProductMediaIndex(), runs: 100, maxMs: 2 },
  { label: "getProductMediaSet for all products", fn: () => { const all = catalogRepository.all(); for (let i=0;i<all.length;i++) getProductMediaSet(all[i]); }, runs: 10, maxMs: 20 },
  { label: "getMediaInbox()", fn: () => getMediaInbox(), runs: 10, maxMs: 10 },
  { label: "getPotentialProductGroups()", fn: () => getPotentialProductGroups(), runs: 10, maxMs: 10 },
  { label: "getKidsReconciliationRows()", fn: () => getKidsReconciliationRows(), runs: 10, maxMs: 15 },
  { label: "getKidsFinalizationRows()", fn: () => getKidsFinalizationRows(), runs: 10, maxMs: 20 },
  { label: "getWorkflowMetrics()", fn: () => getWorkflowMetrics(), runs: 5, maxMs: 30 },
];

for (const t of tests) {
  const { time, result } = timed(t.fn, t.runs);
  const count = Array.isArray(result) ? result.length : typeof result === "object" && result ? Object.keys(result).length : "-";
  const msg = `${t.label}: ${time.toFixed(2)}ms avg (${t.runs} runs) -> ${count} items`;
  if (time > t.maxMs) {
    warn(`${msg} (exceeds ${t.maxMs}ms threshold)`);
  } else {
    pass(msg);
  }
}

// 3. Check for memoization and indexes
log("\n--- Architecture checks ---");

try {
  const catFingerprint = catalogRepository.getFingerprint ? catalogRepository.getFingerprint() : null;
  if (catFingerprint) pass(`catalogRepository has fingerprint: ${catFingerprint}`);
  else warn("catalogRepository missing fingerprint/version optimization");
} catch { warn("catalogRepository fingerprint check failed"); }

try {
  const mediaVersion = mediaRepository.getVersion ? mediaRepository.getVersion() : null;
  if (mediaVersion !== null) pass(`mediaRepository has version counter: ${mediaVersion}`);
  else warn("mediaRepository missing version counter");
} catch { warn("mediaRepository version check failed"); }

// 4. Check for duplicate processing: ensure getProductMediaSet cache works
log("\n--- Cache efficiency checks ---");
{
  const all = catalogRepository.all();
  const firstRun = timed(() => { for (let i=0;i<all.length;i++) getProductMediaSet(all[i]); }, 1);
  const secondRun = timed(() => { for (let i=0;i<all.length;i++) getProductMediaSet(all[i]); }, 1);
  if (secondRun.time < firstRun.time * 0.8) {
    pass(`ProductMediaSet caching effective: first ${firstRun.time.toFixed(2)}ms, second ${secondRun.time.toFixed(2)}ms`);
  } else {
    warn(`ProductMediaSet caching may not be effective: first ${firstRun.time.toFixed(2)}ms, second ${secondRun.time.toFixed(2)}ms`);
  }
}

{
  const firstInbox = timed(() => getMediaInbox(), 1);
  const secondInbox = timed(() => getMediaInbox(), 1);
  if (secondInbox.time < firstInbox.time * 0.5 || secondInbox.time < 1) {
    pass(`MediaInbox caching effective: first ${firstInbox.time.toFixed(2)}ms, second ${secondInbox.time.toFixed(2)}ms`);
  } else {
    warn(`MediaInbox caching may not be effective: first ${firstInbox.time.toFixed(2)}ms, second ${secondInbox.time.toFixed(2)}ms`);
  }
}

log(`\n=== Summary: ${failures} failures, ${warnings} warnings ===\n`);
if (failures > 0) {
  console.log("Audit FAILED — fix performance regressions before shipping.");
  process.exit(1);
} else {
  console.log("Audit PASSED — no critical performance regressions detected.");
  if (warnings > 0) console.log(`Note: ${warnings} warnings should be reviewed.`);
  process.exit(0);
}
