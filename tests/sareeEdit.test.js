/** Homepage Saree Edit — canonical catalogue/product-media contract. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getLiveStorefrontProducts, productHref } from "../src/data/products/index.js";
import {
  SAREE_EDIT_PRODUCT_COUNT,
  selectSareeEditProducts,
} from "../src/services/media/mediaResolver.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { resolveCategoryRoute } from "../src/services/taxonomyRouting.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };
const sourceOf = (source) => source?.src || source?.url || source?.thumbnail || "";

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, `${id} submits`);
  assert.ok(commands.approveProduct(id, ADMIN).ok, `${id} approves`);
  assert.ok(commands.publishProduct(id, ADMIN).ok, `${id} publishes`);
};

const publishSareeEdit = () =>
  catalogRepository
    .all()
    .filter((product) => product.department === "women" && product.category === "sarees")
    .sort((a, b) => a.id.localeCompare(b.id))
    .slice(0, SAREE_EDIT_PRODUCT_COUNT)
    .forEach((product) => publish(product.id));

const localAssetExists = (source) => {
  const path = sourceOf(source).split("?")[0];
  if (!path.startsWith("/")) return Boolean(path);
  return existsSync(join(process.cwd(), "public", path.replace(/^\//, "")));
};

beforeEach(() => {
  setupCanonicalState();
  publishSareeEdit();
});
afterEach(setupCanonicalState);

test("Saree Edit resolves eight published sarees through their own canonical media sets", () => {
  const category = taxonomyRepository.findCategory("sarees");
  const rows = selectSareeEditProducts(getLiveStorefrontProducts());

  assert.equal(category.status, "ACTIVE");
  assert.equal(rows.length, SAREE_EDIT_PRODUCT_COUNT);

  rows.forEach((row) => {
    assert.equal(row.product.department, "women");
    assert.equal(row.product.category, category.id);
    assert.equal(row.product.status, "PUBLISHED");
    assert.ok(row.image?.src);
    assert.equal(String(row.image.productId), String(row.product.id));

    const canonical = getProductMediaSet(row.product);
    assert.equal(row.mediaId, canonical.primary.id);
    assert.equal(sourceOf(row.image), sourceOf(canonical.primary));
    canonical.gallery.forEach((item) =>
      assert.equal(String(item.productId), String(row.product.id))
    );
  });
});

test("Saree Edit selection is deterministic and duplicate-free", () => {
  const first = selectSareeEditProducts();
  const second = selectSareeEditProducts();
  const ids = first.map((row) => row.product.id);
  const imageSources = first.map((row) => sourceOf(row.image).split("?")[0]);

  assert.deepEqual(second.map((row) => row.product.id), ids);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(imageSources).size, imageSources.length);
  assert.ok(!selectSareeEditProducts.toString().includes("Math.random"));
});

test("Saree Edit assets exist and links use canonical routing helpers", () => {
  const rows = selectSareeEditProducts();
  assert.equal(resolveCategoryRoute("sarees")?.href, "/women/sarees");
  rows.forEach((row) => {
    assert.ok(localAssetExists(row.image), `${row.filename} must exist`);
    assert.equal(row.route, productHref(row.product));
    assert.match(row.route, /^\/product\/[A-Z0-9-]+$/);
  });
});

test("Saree Edit component contains no hardcoded product or image list", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/storefront/SareeEditCarousel.jsx"),
    "utf8"
  );
  assert.doesNotMatch(source, /(?:src|image)\s*=\s*["'](?:https?:|\/(?:images|library)\/)/);
  assert.doesNotMatch(source, /const\s+\w*[Pp]roducts\s*=\s*\[\s*\{/);
  assert.match(source, /useSareeEditProducts\(\)/);
  assert.match(source, /resolveCategoryRoute\("sarees"\)/);
  assert.match(source, /SAREE_EDIT_AUTOPLAY_MS\s*=\s*2500/);
  assert.match(source, /loading="lazy"/);
});

test("Saree Edit keeps one shared Framer Motion transition system", () => {
  const source = readFileSync(
    join(process.cwd(), "src/components/storefront/SareeEditCarousel.jsx"),
    "utf8"
  );
  assert.match(source, /from "framer-motion"/);
  assert.match(source, /<AnimatePresence/);
  assert.match(source, /useIsPresent/);
  assert.match(source, /beginTransition/);
  assert.match(source, /transitionLock/);
  assert.doesNotMatch(source, /Math\.random|shuffle\(/);
});
