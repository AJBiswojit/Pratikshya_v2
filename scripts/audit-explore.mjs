/** Audit Explore against the generic published-product query and Product Media APIs. */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  compareExploreCoverage,
  getExploreProducts,
  inspectExploreMedia,
  queryExplore,
} from "../src/data/products/explore.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { isCanonicalMediaUrl } from "../src/services/media/mediaPaths.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
setupCanonicalState();

const catalogue = catalogRepository.all();
const selected = catalogue.find((product) => product.department === "kids");
const transitionResults = selected
  ? [
      commands.submitProduct(selected.id, ADMIN),
      commands.approveProduct(selected.id, ADMIN),
      commands.publishProduct(selected.id, ADMIN),
    ]
  : [];

const live = getLiveStorefrontProducts();
const explore = getExploreProducts();
const coverage = compareExploreCoverage();
const filtered = selected ? queryExplore({ filters: { department: selected.department } }).results : [];
const hiddenVisible = catalogue.filter(
  (product) => product.id !== selected?.id && explore.some((entry) => entry.id === product.id)
);

const mediaReports = explore.map((product) => ({
  product,
  ownership: inspectExploreMedia(product),
  set: getProductMediaSet(product),
}));
const ownershipFailures = mediaReports.filter(
  ({ ownership }) => !ownership.primaryOwned || !ownership.hoverOwned || !ownership.galleryOwned
);
const nonCanonicalPrimary = mediaReports.filter(
  ({ set }) => set.primary?.src && !isCanonicalMediaUrl(set.primary.src)
);
const primaryOwners = new Map();
for (const { product, set } of mediaReports) {
  if (!set.primary?.src) continue;
  const owners = primaryOwners.get(set.primary.src) || [];
  primaryOwners.set(set.primary.src, [...owners, product.id]);
}
const duplicatePrimary = [...primaryOwners.values()].filter((owners) => new Set(owners).size > 1);

const sourceFiles = [
  "src/pages/Explore.jsx",
  "src/components/explore/ExploreBrowser.jsx",
  "src/components/explore/ExploreProductGrid.jsx",
  "src/data/products/explore.js",
];
const sourceViolations = [];
for (const relativePath of sourceFiles) {
  const path = join(process.cwd(), relativePath);
  if (!existsSync(path)) {
    sourceViolations.push(`${relativePath}: missing`);
    continue;
  }
  const source = readFileSync(path, "utf8");
  if (/Math\.random\s*\(|\/library\/|["'`]\/images\/products\/[^"'`$]+["'`]/.test(source)) {
    sourceViolations.push(relativePath);
  }
}

const checks = [
  ["Canonical Kids product discovered dynamically", Boolean(selected), selected?.id || "none"],
  ["Lifecycle uses submit, approve, publish commands", transitionResults.length === 3 && transitionResults.every((result) => result.ok), transitionResults.map((result) => result.ok).join("/")],
  ["Explore equals live storefront", coverage.missing.length === 0 && coverage.extra.length === 0 && coverage.liveCount === coverage.exploreCount, `${coverage.exploreCount}/${coverage.liveCount}`],
  ["One Product ID produces one card", coverage.exploreDuplicates.length === 0, coverage.exploreDuplicates.length],
  ["Unpublished products remain hidden", hiddenVisible.length === 0, hiddenVisible.length],
  ["Department filtering uses the generic query", filtered.length === 1 && filtered[0]?.id === selected?.id, filtered.length],
  ["Product Media ownership is stable", ownershipFailures.length === 0, ownershipFailures.length],
  ["Resolved primaries use canonical Product Media", nonCanonicalPrimary.length === 0, nonCanonicalPrimary.length],
  ["Primary media is not shared across products", duplicatePrimary.length === 0, duplicatePrimary.length],
  ["Explore source has no embedded product inventory/media", sourceViolations.length === 0, sourceViolations.length],
];

console.log("# EXPLORE CANONICAL ARCHITECTURE AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`));
console.log(`\nPublished storefront products: ${live.length}; Explore cards: ${explore.length}.`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
