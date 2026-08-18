/** Canonical media exposure tests with an intentionally empty managed-media register. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository from "../src/services/catalogRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveHeroSlideImage,
  resolveProductCover,
  resolveProductGallery,
  resolveSaleBackdrop,
  selectMedia,
} from "../src/services/media/mediaResolver.js";
import { auditMediaExposure } from "../src/services/media/mediaExposure.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const publish = (product) => {
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.ok(commands.publishProduct(product.id, ADMIN).ok);
};

beforeEach(() => {
  setupCanonicalState();
  const representatives = new Map();
  catalogRepository.all().forEach((product) => {
    if (!representatives.has(product.department)) representatives.set(product.department, product);
  });
  representatives.forEach(publish);
});
afterEach(setupCanonicalState);

test("fresh storage has no synthetic or filesystem-seeded media records", () => {
  assert.deepEqual(mediaRepository.getAll(), []);
  assert.deepEqual(mediaRepository.getUnmappedMedia(), []);
});

test("active categories resolve deterministic canonical imagery", () => {
  const categories = taxonomyRepository.activeCategories();
  assert.ok(categories.length > 0);
  categories.forEach((category) => {
    const first = resolveCategoryCover(category);
    const second = resolveCategoryCover(category);
    assert.ok(first?.src, `${category.id} needs a cover`);
    assert.equal(second.src, first.src);
    assert.ok(
      first.src.startsWith("/images/products/") || first.src.startsWith("/images/"),
      `${category.id} resolved outside canonical public images: ${first.src}`
    );
  });
});

test("collection cover lookup is deterministic and never invents managed media", () => {
  taxonomyRepository.activeCollections().forEach((collection) => {
    const first = resolveCollectionCover(collection);
    const second = resolveCollectionCover(collection);
    assert.equal(second?.src ?? null, first?.src ?? null);
    if (first?.src) {
      assert.ok(
        first.src.startsWith("/images/products/") || first.src.startsWith("/images/collections/"),
        `${collection.id} resolved outside canonical Product or editorial collection media`
      );
    }
  });
});

test("published product covers and galleries stay owned by one Product ID", () => {
  getLiveStorefrontProducts().forEach((product) => {
    const cover = resolveProductCover(product);
    const gallery = resolveProductGallery(product);
    assert.ok(cover?.src, `${product.id} needs a cover`);
    assert.ok(gallery.length > 0, `${product.id} needs a media set`);
    [cover, ...gallery].forEach((source) => {
      if (source.productId) assert.equal(String(source.productId), String(product.id));
    });
  });
});

test("hero and sale resolver reads do not seed or invent managed media", () => {
  const before = mediaRepository.getAll();
  const themes = ["festive", "bridal", "heritage", "celebration", "arrivals"];
  const resolve = () => {
    const usedIds = new Set();
    return themes.map((theme, index) =>
      resolveHeroSlideImage(theme, { lead: index === 0, usedIds })?.src ?? null
    );
  };
  assert.deepEqual(resolve(), resolve());
  const sale = resolveSaleBackdrop(null);
  if (sale?.src) assert.ok(sale.src.startsWith("/images/products/"));
  assert.deepEqual(mediaRepository.getAll(), before);
});

test("managed-media selection returns no invented records from an empty register", () => {
  assert.deepEqual(selectMedia({ categoryId: "sarees", limit: 20 }), []);
  assert.deepEqual(selectMedia({ categoryId: "boys", limit: 20 }), []);
});

test("AI Shopping and eligible AI Mirror images use the selected canonical product", () => {
  getLiveStorefrontProducts().forEach((product) => {
    const shopping = resolveAiShoppingImage(product);
    assert.ok(shopping?.src);
    if (shopping.productId) assert.equal(String(shopping.productId), String(product.id));

    const mirror = resolveAiMirrorImage(product);
    if (mirror?.productId) assert.equal(String(mirror.productId), String(product.id));
  });
});

test("the exposure audit reports current repository state without golden counts", () => {
  const report = auditMediaExposure();
  assert.deepEqual(report.inventory, {
    total: 0,
    mapped: 0,
    unmapped: 0,
    needsReview: 0,
    broken: 0,
    active: 0,
    productScoped: 0,
    marketingScoped: 0,
    unassigned: 0,
    exposed: 0,
    mappedButUnused: 0,
  });
  assert.deepEqual(report.unused, []);
  assert.deepEqual(report.unmappedAssets, []);
  assert.ok(report.categoryCoverage.length > 0);
  assert.equal(
    report.productCoverage.withDedicatedMedia.length,
    0,
    "authored canonical media is not misreported as managed repository media"
  );
});
