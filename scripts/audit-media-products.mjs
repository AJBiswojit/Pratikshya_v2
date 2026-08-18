/** Audit managed-media ownership against the one canonical Product register. */

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import { getWorkflowMetrics } from "../src/services/productWorkflow.js";
import { setupCanonicalState } from "../tests/helpers/workflowTestState.js";

setupCanonicalState();

const products = catalogRepository.all();
const productIds = new Set(products.map((product) => String(product.id)));
const media = mediaRepository.getAll();
const owned = media.filter((record) => record.productId);
const invalidOwners = owned.filter((record) => !productIds.has(String(record.productId)));
const productScopedWithoutOwner = media.filter(
  (record) => String(record.scope || "").toUpperCase() === "PRODUCT" && !record.productId
);
const marketingWithDirectOwnership = media.filter(
  (record) => record.placement && record.productId
);
const badResolvedOwnership = products.filter((product) => {
  const set = getProductMediaSet(product);
  return [set.primary, set.hover, ...(set.gallery || [])]
    .filter(Boolean)
    .some((record) => record.productId && String(record.productId) !== String(product.id));
});

let metricsError = null;
let metrics = null;
try {
  metrics = getWorkflowMetrics();
} catch (error) {
  metricsError = error;
}

const checks = [
  ["Canonical Product IDs are unique", productIds.size === products.length, products.length],
  ["Managed ownership references canonical Product IDs", invalidOwners.length === 0, invalidOwners.length],
  ["Product-scoped managed media has an owner", productScopedWithoutOwner.length === 0, productScopedWithoutOwner.length],
  ["Marketing media does not duplicate Product ownership", marketingWithDirectOwnership.length === 0, marketingWithDirectOwnership.length],
  ["Resolved Product Media never crosses Product IDs", badResolvedOwnership.length === 0, badResolvedOwnership.length],
  ["Generic workflow metrics execute", !metricsError && Boolean(metrics), metricsError?.message || Object.keys(metrics || {}).length],
];

console.log("# MANAGED MEDIA / CANONICAL PRODUCT AUDIT\n");
checks.forEach(([label, pass, detail]) => console.log(`${pass ? "PASS" : "FAIL"}  ${label} (${detail})`));
console.log(`\nProducts: ${products.length}; managed media: ${media.length}; owned records: ${owned.length}.`);
if (checks.some(([, pass]) => !pass)) process.exitCode = 1;
