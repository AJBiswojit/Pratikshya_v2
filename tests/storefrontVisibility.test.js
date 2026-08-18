/** Canonical workflow-to-storefront visibility contracts. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  getLiveStorefrontProducts,
  getProductBySlug,
  productHref,
} from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { getProductCardMedia } from "../src/services/media/productMediaSet.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, `${id} submits`);
  assert.ok(commands.approveProduct(id, ADMIN).ok, `${id} approves`);
  assert.ok(commands.publishProduct(id, ADMIN).ok, `${id} publishes`);
};

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("DRAFT, SUBMITTED and APPROVED records remain invisible", () => {
  const [draft, submitted, approved] = catalogRepository.all().slice(0, 3);
  assert.ok(commands.submitProduct(submitted.id, ADMIN).ok);
  assert.ok(commands.submitProduct(approved.id, ADMIN).ok);
  assert.ok(commands.approveProduct(approved.id, ADMIN).ok);

  const liveIds = new Set(getLiveStorefrontProducts().map((product) => product.id));
  assert.equal(liveIds.has(draft.id), false);
  assert.equal(liveIds.has(submitted.id), false);
  assert.equal(liveIds.has(approved.id), false);
});

test("one canonical product flows through the exact lifecycle into generic storefront queries", () => {
  const product = catalogRepository.all().find((entry) => entry.department === "women");
  const baseline = getLiveStorefrontProducts().length;

  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.equal(getLiveStorefrontProducts().length, baseline);
  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.equal(getLiveStorefrontProducts().length, baseline);
  assert.ok(commands.publishProduct(product.id, ADMIN).ok);

  const published = catalogRepository.find(product.id);
  assert.equal(published.status, "PUBLISHED");
  assert.equal(getLiveStorefrontProducts().length, baseline + 1);

  const byDepartment = queryCatalogue({
    scopeFilters: { department: published.department },
  }).results;
  const byCategory = queryCatalogue({
    scopeFilters: { category: published.category },
  }).results;
  assert.ok(byDepartment.some((entry) => entry.id === product.id));
  assert.ok(byCategory.some((entry) => entry.id === product.id));

  const card = getProductCardMedia(published);
  assert.ok(card.image?.src);
  assert.equal(String(card.image.productId), String(product.id));
  card.mediaSet.gallery.forEach((item) =>
    assert.equal(String(item.productId), String(product.id))
  );

  assert.equal(getProductBySlug(published.slug)?.id, product.id);
  assert.equal(productHref(published), `/product/${product.id}`);
});

test("every published representative resolves owned media and a PDP route", () => {
  const representatives = new Map();
  catalogRepository.all().forEach((product) => {
    if (!representatives.has(product.department)) representatives.set(product.department, product);
  });
  representatives.forEach((product) => publish(product.id));

  const storefront = getLiveStorefrontProducts();
  assert.equal(storefront.length, representatives.size);
  storefront.forEach((product) => {
    const card = getProductCardMedia(product);
    assert.ok(card.image, `${product.id} needs a primary`);
    assert.equal(String(card.image.productId), String(product.id));
    if (card.hoverImage) assert.equal(String(card.hoverImage.productId), String(product.id));
    assert.equal(getProductBySlug(product.slug)?.id, product.id);
  });
});

test("Kids is a normal department query over dynamically published canonical records", () => {
  const canonicalKids = catalogRepository
    .all()
    .filter((product) => product.department === "kids")
    .sort((a, b) => a.id.localeCompare(b.id));
  assert.ok(canonicalKids.length > 0);
  assert.ok(canonicalKids.every((product) => product.id.startsWith("PF-K-")));
  canonicalKids.forEach((product) => publish(product.id));

  const kids = queryCatalogue({ scopeFilters: { department: "kids" } }).results;
  assert.equal(kids.length, canonicalKids.length);
  assert.deepEqual(
    new Set(kids.map((product) => product.id)),
    new Set(canonicalKids.map((product) => product.id))
  );

  kids.forEach((product) => {
    assert.ok(["boys", "girls"].includes(product.category));
    const card = getProductCardMedia(product);
    assert.ok(card.image?.src.startsWith("/images/products/kids/"));
    assert.equal(String(card.image.productId), String(product.id));
    if (card.hoverImage) assert.equal(String(card.hoverImage.productId), String(product.id));
  });
});

test("category pages derive from the canonical catalogue without hardcoded product arrays", () => {
  [
    "src/pages/CatalogueListing.jsx",
    "src/components/storefront/CatalogueBrowser.jsx",
    "src/components/storefront/ProductGrid.jsx",
    "src/components/storefront/NewArrivals.jsx",
    "src/components/storefront/SareeEditCarousel.jsx",
    "src/pages/Explore.jsx",
    "src/components/explore/ExploreProductGrid.jsx",
  ].forEach((relative) => {
    const path = join(__dirname, "..", relative);
    if (!existsSync(path)) return;
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /const\s+(?:products|sarees|lehengas|kids|menProducts|bridalProducts)\s*=\s*\[/i,
      `${relative} hardcodes a product list`
    );
    assert.doesNotMatch(source, /Math\.random|shuffle\(/i);
    assert.doesNotMatch(source, new RegExp("KID" + "-"));
  });
});
