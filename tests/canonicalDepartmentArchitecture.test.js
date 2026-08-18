/** Canonical department architecture regression tests. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

import { products as authoredProducts } from "../src/data/catalog/products.js";
import { departments } from "../src/data/catalog/taxonomy.js";
import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { WORKFLOW_STAGES, getProductWorkflowState } from "../src/services/workflow/productWorkflowState.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getProductCardMedia } from "../src/services/media/productMediaSet.js";
import { buildProductIdPrefix } from "../src/config/productIdPrefixes.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const departmentId = "kids";
const department = departments.find((entry) => entry.id === departmentId);
const departmentProducts = () => catalogRepository.all().filter((product) => product.department === departmentId);

const sourceFilesUnder = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    return /\.(?:js|jsx)$/.test(entry.name) ? [path] : [];
  });

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("the department is discovered from the one authored catalogue", () => {
  assert.ok(department);
  const expectedIds = authoredProducts
    .filter((product) => product.department === departmentId)
    .map((product) => product.id)
    .sort();
  const repositoryIds = departmentProducts().map((product) => product.id).sort();
  assert.ok(expectedIds.length > 0, "the current authored catalogue supplies records");
  assert.deepEqual(repositoryIds, expectedIds);
  assert.ok(repositoryIds.every((id) => id.startsWith("PF-K-")));
});

test("every department record follows canonical taxonomy and media ownership paths", () => {
  for (const product of departmentProducts()) {
    const category = department.categories.find((entry) => entry.id === product.category);
    assert.ok(category, `${product.id} category belongs to ${departmentId}`);
    assert.ok(
      category.subcategories.some((entry) => entry.id === product.subcategory),
      `${product.id} subcategory belongs to its category`
    );
    assert.equal(
      buildProductIdPrefix(product.department, product.category, product.subcategory),
      product.id.replace(/-\d{4}$/, "")
    );
    assert.match(product.image, new RegExp(`/images/products/${departmentId}/.+/${product.id}/primary\\.avif$`));
    assert.ok(existsSync(join(ROOT, "public", product.image.replace(/^\//, ""))), `${product.id} primary exists`);
  }
});

test("a department product uses the exact universal lifecycle before storefront exposure", () => {
  const product = departmentProducts()[0];
  assert.ok(product);
  assert.equal(getProductWorkflowState(product).stage, WORKFLOW_STAGES.DRAFT);
  assert.ok(!getLiveStorefrontProducts().some((entry) => entry.id === product.id));

  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(product.id)).stage, WORKFLOW_STAGES.SUBMITTED);
  assert.ok(!getLiveStorefrontProducts().some((entry) => entry.id === product.id));

  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(product.id)).stage, WORKFLOW_STAGES.APPROVED);
  assert.ok(!getLiveStorefrontProducts().some((entry) => entry.id === product.id));

  assert.ok(commands.publishProduct(product.id, ADMIN).ok);
  assert.equal(getProductWorkflowState(catalogRepository.find(product.id)).stage, WORKFLOW_STAGES.PUBLISHED);
  assert.ok(getLiveStorefrontProducts().some((entry) => entry.id === product.id));
});

test("the generic catalogue query discovers the published department record", () => {
  const product = departmentProducts()[0];
  commands.submitProduct(product.id, ADMIN);
  commands.approveProduct(product.id, ADMIN);
  commands.publishProduct(product.id, ADMIN);

  const queried = queryCatalogue({ scopeFilters: { department: departmentId } }).results;
  assert.deepEqual(queried.map((entry) => entry.id), [product.id]);
  const card = getProductCardMedia(queried[0]);
  assert.equal(card.image?.src ?? card.image, product.image);
});

test("retired parallel services are absent and generic UI has no department branch", () => {
  const departmentProductStem = "kids" + "Product";
  const departmentValidator = "kids" + "Validator";
  const retiredStateTransfer = "productDraft" + "Migration";
  [
    `src/services/${departmentProductStem}Identity.js`,
    `src/services/${retiredStateTransfer}.js`,
    `src/services/${departmentProductStem}Finalization.js`,
    `src/services/workflow/${departmentValidator}.js`,
  ].forEach((path) => assert.equal(existsSync(join(ROOT, path)), false, `${path} stays removed`));

  for (const path of [
    "src/components/admin/ProductCatalogSelector.jsx",
    "src/components/admin/UnifiedReviewQueue.jsx",
    "src/components/storefront/PlacementProductRail.jsx",
  ]) {
    const source = readFileSync(join(ROOT, path), "utf8");
    const retiredIdentity = "KID" + "-";
    const retiredProductName = "kids" + "Product";
    const retiredValidatorName = "kids" + "Validator";
    assert.doesNotMatch(
      source,
      new RegExp(
        `${retiredIdentity}|${retiredProductName}|${retiredValidatorName}|department\\s*===\\s*["']kids["']`,
        "i"
      )
    );
  }
});

test("UI Product edits and lifecycle actions use authorized command boundaries", () => {
  const lowLevelCatalogueMutation =
    /catalogRepository\.(?:bulkUpdate|updateProduct|updateDraft|setStatus|markSubmitted|approve|publish|archive|restore|unpublish|createDraftProduct|createProduct|changeProductId)\s*\(/;
  for (const root of [join(ROOT, "src/components"), join(ROOT, "src/pages")]) {
    for (const path of sourceFilesUnder(root)) {
      assert.doesNotMatch(
        readFileSync(path, "utf8"),
        lowLevelCatalogueMutation,
        `${path.slice(ROOT.length + 1)} must call an authorized Product command`
      );
    }
  }
});
