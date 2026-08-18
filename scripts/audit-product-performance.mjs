/** Static and runtime smoke audit for generic Product and Product Media paths. */

import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { performance } from "node:perf_hooks";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaIndex, getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { getMediaInbox, getPotentialProductGroups, getWorkflowMetrics } from "../src/services/productWorkflow.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const walk = (directory, files = []) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) walk(path, files);
    else if (/\.(?:js|jsx)$/.test(entry.name)) files.push(path);
  }
  return files;
};

const srcRoot = join(process.cwd(), "src");
const randomSelection = [];
const embeddedProductPaths = [];
for (const path of walk(srcRoot)) {
  if (!/(?:media|ProductCard|ProductGrid|ProductPreview)/i.test(path)) continue;
  const source = readFileSync(path, "utf8");
  const randomlyOrdersMedia = /\.sort\s*\(\s*\(\s*\)\s*=>\s*Math\.random|\bshuffle\s*\(/.test(source);
  const randomlyIndexesMedia = /(?:media|image|gallery)\w*\s*\[\s*Math\.floor\s*\(\s*Math\.random\s*\(/i.test(source);
  if (randomlyOrdersMedia || randomlyIndexesMedia) {
    randomSelection.push(relative(process.cwd(), path));
  }
  if (/components|pages/.test(path) && /["'`]\/images\/products\/[^"'`$]+["'`]/.test(source)) {
    embeddedProductPaths.push(relative(process.cwd(), path));
  }
}

const timed = (fn, runs) => {
  const start = performance.now();
  let value;
  for (let index = 0; index < runs; index += 1) value = fn();
  return { averageMs: (performance.now() - start) / runs, value };
};

const products = catalogRepository.all();
const canonicalId = products[0]?.id;
const runtimeChecks = [
  ["catalogRepository.all", () => catalogRepository.all(), 50],
  ["catalogRepository.find", () => catalogRepository.find(canonicalId), 100],
  ["mediaRepository.getAll", () => mediaRepository.getAll(), 100],
  ["getProductMediaIndex", () => getProductMediaIndex(), 50],
  ["all Product Media sets", () => products.forEach((product) => getProductMediaSet(product)), 10],
  ["generic media inbox", () => getMediaInbox(), 10],
  ["generic potential Product groups", () => getPotentialProductGroups(), 10],
  ["generic workflow metrics", () => getWorkflowMetrics(), 10],
];

console.log("# PRODUCT PERFORMANCE / ARCHITECTURE AUDIT\n");
console.log(`${randomSelection.length ? "FAIL" : "PASS"}  No random Product Media selection (${randomSelection.length})`);
console.log(`${embeddedProductPaths.length ? "FAIL" : "PASS"}  Components contain no embedded Product Media inventory (${embeddedProductPaths.length})`);
console.log(`${canonicalId ? "PASS" : "FAIL"}  Runtime record selected from canonical catalogue (${canonicalId || "none"})`);

let runtimeFailed = !canonicalId;
for (const [label, fn, runs] of runtimeChecks) {
  try {
    const { averageMs, value } = timed(fn, runs);
    const size = Array.isArray(value) ? value.length : value && typeof value === "object" ? Object.keys(value).length : "—";
    console.log(`PASS  ${label}: ${averageMs.toFixed(2)} ms average, result ${size}`);
  } catch (error) {
    runtimeFailed = true;
    console.log(`FAIL  ${label}: ${error.message}`);
  }
}

const first = timed(() => products.forEach((product) => getProductMediaSet(product)), 1).averageMs;
const second = timed(() => products.forEach((product) => getProductMediaSet(product)), 1).averageMs;
console.log(`\nProduct Media cache smoke check: ${first.toFixed(2)} ms then ${second.toFixed(2)} ms.`);
console.log(`Catalogue fingerprint: ${catalogRepository.getFingerprint()}; media version: ${mediaRepository.getVersion()}.`);

if (randomSelection.length || embeddedProductPaths.length || runtimeFailed) process.exitCode = 1;
