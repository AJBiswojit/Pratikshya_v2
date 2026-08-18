/**
 * Audit: canonical catalogue reads are side-effect free.
 *
 * Uses persisted-state snapshots around the public read API and a focused
 * static check of catalogRepository.read(). Definitions of write commands
 * elsewhere in the same modules are intentionally not treated as read calls.
 */

import { readFileSync } from "node:fs";

import catalogRepository, { productsRegisterRaw } from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { loadActivity } from "../src/services/employees/activityService.js";
import { getAllGroups } from "../src/services/media/productMediaGroups.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const failures = [];
const pass = (label) => console.log(`PASS: ${label}`);
const fail = (label) => {
  failures.push(label);
  console.log(`FAIL: ${label}`);
};

const extractArrowBody = (source, declaration) => {
  const start = source.indexOf(declaration);
  if (start < 0) return null;
  const brace = source.indexOf("{", start + declaration.length);
  if (brace < 0) return null;
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let index = brace; index < source.length; index += 1) {
    const char = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(brace + 1, index);
    }
  }
  return null;
};

const stateSnapshot = () =>
  JSON.stringify({
    products: productsRegisterRaw(),
    media: mediaRepository
      .getAll()
      .map((media) => [media.id, media.productId, media.scope, media.role, media.status])
      .sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    activity: loadActivity(),
    groups: getAllGroups(),
  });

console.log("# READ-ONLY WORKFLOW AUDIT\n");
setupCanonicalState();
const canonicalId = catalogRepository.all()[0]?.id;

const readChecks = [
  ["catalogRepository.all()", () => catalogRepository.all()],
  ["catalogRepository.find()", () => catalogRepository.find(canonicalId)],
  ["queryCatalogue()", () => queryCatalogue({ search: "silk" })],
  ["getLiveStorefrontProducts()", () => getLiveStorefrontProducts()],
  ["getProductMediaSet()", () => getProductMediaSet(catalogRepository.find(canonicalId))],
];

readChecks.forEach(([label, read]) => {
  const before = stateSnapshot();
  read();
  const after = stateSnapshot();
  if (after === before) pass(`${label} leaves persisted workflow state unchanged`);
  else fail(`${label} mutated persisted workflow state`);
});

const catalogueSource = readFileSync("src/services/catalogRepository.js", "utf8");
const readBody = extractArrowBody(catalogueSource, "const read = () =>");
if (!readBody) {
  fail("catalogRepository.read() body could not be inspected");
} else {
  const executableReadBody = readBody
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
  const forbidden = [
    "writeProduct(",
    "persistCanonicalCatalogueState(",
    "assignToProduct(",
    "recordActivity(",
  ];
  const hits = forbidden.filter((signature) => executableReadBody.includes(signature));
  if (hits.length) fail(`catalogRepository.read() calls mutation paths: ${hits.join(", ")}`);
  else pass("catalogRepository.read() contains no catalogue, ownership, persistence, or activity writes");
}

setupCanonicalState();
console.log("\n# SUMMARY");
console.log(`Checks: ${readChecks.length + 1} | Failures: ${failures.length}`);
if (failures.length) {
  console.log("RESULT: FAIL — read-side mutation detected.");
  process.exitCode = 1;
} else {
  console.log("RESULT: PASS — READ = READ ONLY (no automatic mutation paths found).");
}
