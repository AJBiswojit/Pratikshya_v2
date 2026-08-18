/** Generic Product-ID-owned media-set contracts. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository from "../src/services/catalogRepository.js";
import {
  assembleProductMediaSet,
  getProductCardMedia,
  getProductMediaSet,
  isProductOwnedMedia,
  applyProductMediaSet,
  PRODUCT_MEDIA_STATUS,
} from "../src/services/media/productMediaSet.js";
import { getProductSlides, getProductCoverImage } from "../src/services/media/productMediaSource.js";
import { decorateProductWithMedia, resolveProductGallery } from "../src/services/media/mediaResolver.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const plate = (id, extras = {}) => ({
  id,
  src: `/images/products/.test/${id}`,
  url: `/images/products/.test/${id}`,
  fileName: id,
  currentFilename: id,
  type: "IMAGE",
  status: "ACTIVE",
  scope: "PRODUCT",
  ...extras,
});

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

test("front-only media never invents a hover image", () => {
  const set = assembleProductMediaSet("TEST-A", [
    plate("front.avif", { productId: "TEST-A", view: "front", groupKey: "test-a", role: "COVER" }),
  ]);
  assert.equal(set.primary.fileName, "front.avif");
  assert.equal(set.hover.fileName, "front.avif");
  assert.equal(set.hasAlternate, false);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.NO_ALTERNATE);
});

test("back is the deterministic hover preference for a multi-view product", () => {
  const set = assembleProductMediaSet("TEST-A", [
    plate("front.avif", { productId: "TEST-A", view: "front", groupKey: "test-a", role: "COVER" }),
    plate("side.avif", { productId: "TEST-A", view: "side", groupKey: "test-a", role: "GALLERY" }),
    plate("back.avif", { productId: "TEST-A", view: "back", groupKey: "test-a", role: "GALLERY" }),
  ]);
  assert.equal(set.primary.fileName, "front.avif");
  assert.equal(set.hover.fileName, "back.avif");
  assert.equal(set.gallery.length, 3);
  assert.equal(set.hasAlternate, true);
});

test("two products in one category never cross Product-ID ownership", () => {
  const media = [
    plate("a-front.avif", { productId: "A", view: "front", groupKey: "a", role: "COVER" }),
    plate("a-back.avif", { productId: "A", view: "back", groupKey: "a" }),
    plate("b-front.avif", { productId: "B", view: "front", groupKey: "b", role: "COVER" }),
  ];
  const a = assembleProductMediaSet("A", media);
  const b = assembleProductMediaSet("B", media);
  assert.ok(a.gallery.every((item) => item.productId === "A"));
  assert.ok(b.gallery.every((item) => item.productId === "B"));
  assert.equal(a.hover.fileName, "a-back.avif");
  assert.equal(b.hover.fileName, "b-front.avif");
});

test("canonical Kids products use the same generic owned-media resolver", () => {
  const kids = catalogRepository.all().filter((product) => product.department === "kids");
  assert.ok(kids.length > 1);
  assert.ok(kids.every((product) => product.id.startsWith("PF-K-")));

  kids.forEach((product) => {
    const set = getProductMediaSet(product);
    assert.ok(set.primary, `${product.id} needs a primary`);
    assert.ok(set.primary.src.startsWith("/images/products/kids/"));
    set.gallery.forEach((item) =>
      assert.equal(String(item.productId), String(product.id), `${product.id} borrowed media`)
    );
  });
});

test("authored canonical media works with an empty managed-media repository", () => {
  assert.deepEqual(mediaRepository.getAll(), []);
  const product = catalogRepository.all().find((entry) => entry.media?.primary);
  const set = getProductMediaSet(product);
  assert.equal(set.primary.src, product.media.primary);
  assert.equal(String(set.primary.productId), String(product.id));
  assert.ok(set.primary.src.startsWith("/images/products/"));
});

test("missing Product ID yields no invented media", () => {
  const set = getProductMediaSet("does-not-exist");
  assert.equal(set.primary, null);
  assert.equal(set.hasAlternate, false);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.NEEDS_REVIEW);
});

test("canonical media resolution is deterministic", () => {
  const product = catalogRepository.all().find((entry) => (entry.media?.gallery || []).length > 0);
  const first = getProductMediaSet(product);
  const second = getProductMediaSet(product);
  assert.equal(first.primary?.src, second.primary?.src);
  assert.deepEqual(first.gallery.map((item) => item.src), second.gallery.map((item) => item.src));
});

test("Product Card and Product Detail share one canonical media set", () => {
  const product = catalogRepository.all().find((entry) => (entry.media?.gallery || []).length > 0);
  const set = getProductMediaSet(product);
  const card = getProductCardMedia(product);
  const slides = getProductSlides(product).filter((slide) => slide.type === "IMAGE");
  const gallery = resolveProductGallery(product);
  const cover = getProductCoverImage(product);

  assert.equal(card.image?.src, set.primary?.src);
  assert.equal(cover?.src, set.primary?.src);
  assert.deepEqual(gallery.map((item) => item.src), set.gallery.map((item) => item.src));
  slides.forEach((slide) =>
    assert.ok(set.gallery.some((item) => item.src === slide.image?.src || item.id === slide.id))
  );
});

test("decorateProductWithMedia and applyProductMediaSet agree for every department", () => {
  const byDepartment = new Map();
  catalogRepository.all().forEach((product) => {
    if (!byDepartment.has(product.department)) byDepartment.set(product.department, product);
  });
  byDepartment.forEach((product) => {
    const a = decorateProductWithMedia(product);
    const b = applyProductMediaSet(product);
    assert.equal(a.image?.src, b.image?.src);
    assert.equal(a.hoverImage?.src, b.hoverImage?.src);
  });
});

test("ownership checks require the same stable Product ID", () => {
  const [first, second] = catalogRepository.all();
  assert.equal(isProductOwnedMedia({ productId: first.id }, first.id), true);
  assert.equal(isProductOwnedMedia({ productId: first.id }, second.id), false);
  assert.equal(isProductOwnedMedia({ productId: null, categoryId: first.category }, first.id), false);
});

test("resolver and ProductCard sources contain no random media selection", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  [
    "../src/services/media/productMediaSet.js",
    "../src/services/media/productMediaSource.js",
    "../src/design-system/components/ProductCard.jsx",
  ].forEach((relative) => {
    const source = readFileSync(join(here, relative), "utf8");
    assert.doesNotMatch(source, /Math\.random|sort\(\(\)\s*=>/);
  });
});

test("ProductCard calls the generic canonical resolver", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "../src/design-system/components/ProductCard.jsx"), "utf8");
  assert.match(source, /getProductCardMedia/);
  assert.doesNotMatch(source, /department\s*===\s*["']kids["']/i);
  assert.doesNotMatch(source, new RegExp("KID" + "-"));
});
