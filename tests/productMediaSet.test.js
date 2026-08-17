/**
 * PRATIKSHYA FASHON — Product media set tests (Phase 21.9).
 *
 * Proves product cards and product-detail galleries resolve only
 * product-owned plates, and that hover never crosses to another product.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
import { getLiveStorefrontProducts, getProductById } from "../src/data/products/index.js";
import mediaRepository from "../src/services/media/mediaRepository.js";

const plate = (id, extras = {}) => ({
  id,
  src: `/library/${id}`,
  url: `/library/${id}`,
  fileName: id,
  currentFilename: id,
  type: "IMAGE",
  status: "ACTIVE",
  scope: "PRODUCT",
  ...extras,
});

/* ------------------------------------------------------------------ */
/* 1–5  Front / side / back grouping                                   */
/* ------------------------------------------------------------------ */

test("product with front only — hover stays on front", () => {
  const set = assembleProductMediaSet("product-001", [
    plate("product-001-front.webp", { productId: "product-001", view: "front", groupKey: "product-001", role: "COVER" }),
  ]);
  assert.equal(set.primary.fileName, "product-001-front.webp");
  assert.equal(set.hover.fileName, "product-001-front.webp");
  assert.equal(set.hasAlternate, false);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.NO_ALTERNATE);
});

test("product with front + side — hover is side", () => {
  const set = assembleProductMediaSet("product-001", [
    plate("product-001-front.webp", { productId: "product-001", view: "front", groupKey: "product-001", role: "COVER" }),
    plate("product-001-side.webp", { productId: "product-001", view: "side", groupKey: "product-001", role: "GALLERY" }),
  ]);
  assert.equal(set.primary.fileName, "product-001-front.webp");
  assert.equal(set.hover.fileName, "product-001-side.webp");
  assert.equal(set.hasAlternate, true);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.OK);
});

test("product with front + back — hover is back", () => {
  const set = assembleProductMediaSet("product-001", [
    plate("product-001-front.webp", { productId: "product-001", view: "front", groupKey: "product-001", role: "COVER" }),
    plate("product-001-back.webp", { productId: "product-001", view: "back", groupKey: "product-001", role: "GALLERY" }),
  ]);
  assert.equal(set.hover.fileName, "product-001-back.webp");
});

test("product with front + side + back — hover prefers back over side", () => {
  const set = assembleProductMediaSet("product-001", [
    plate("product-001-front.webp", { productId: "product-001", view: "front", groupKey: "product-001", role: "COVER" }),
    plate("product-001-side.webp", { productId: "product-001", view: "side", groupKey: "product-001", role: "GALLERY" }),
    plate("product-001-back.webp", { productId: "product-001", view: "back", groupKey: "product-001", role: "GALLERY" }),
  ]);
  assert.equal(set.primary.fileName, "product-001-front.webp");
  assert.equal(set.front.fileName, "product-001-front.webp");
  assert.equal(set.side.fileName, "product-001-side.webp");
  assert.equal(set.back.fileName, "product-001-back.webp");
  assert.equal(set.hover.fileName, "product-001-back.webp");
  assert.equal(set.gallery.length, 3);
});

test("product with no alternate — hover equals primary", () => {
  const set = assembleProductMediaSet("kids-solo", [
    plate("kids-001.webp", { productId: "kids-solo", view: null, groupKey: "kids-001", isStandalone: true }),
  ]);
  assert.equal(set.hasAlternate, false);
  assert.equal(set.hover.src, set.primary.src);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.NO_ALTERNATE);
});

/* ------------------------------------------------------------------ */
/* 6–7  Same-category isolation                                        */
/* ------------------------------------------------------------------ */

test("two products in the same category never cross images", () => {
  const productA = [
    plate("A-front.webp", { productId: "A", view: "front", groupKey: "A", role: "COVER" }),
    plate("A-back.webp", { productId: "A", view: "back", groupKey: "A", role: "GALLERY" }),
  ];
  const productB = [
    plate("B-front.webp", { productId: "B", view: "front", groupKey: "B", role: "COVER" }),
    plate("B-back.webp", { productId: "B", view: "back", groupKey: "B", role: "GALLERY" }),
  ];

  const setA = assembleProductMediaSet("A", [...productA, ...productB]);
  const setB = assembleProductMediaSet("B", [...productA, ...productB]);

  assert.equal(setA.primary.fileName, "A-front.webp");
  assert.equal(setA.hover.fileName, "A-back.webp");
  assert.equal(setB.primary.fileName, "B-front.webp");
  assert.equal(setB.hover.fileName, "B-back.webp");
  assert.ok(setA.gallery.every((item) => item.productId === "A"));
  assert.ok(setB.gallery.every((item) => item.productId === "B"));
  assert.notEqual(setA.hover.fileName, "B-back.webp");
});

test("same-category kids images must not cross between products", () => {
  const kids = getLiveStorefrontProducts().filter((product) => product.category === "kidswear");
  assert.ok(kids.length >= 2, "need at least two kids products");

  const sets = kids.map((product) => getProductMediaSet(product));
  kids.forEach((product, index) => {
    const set = sets[index];
    assert.ok(set.primary, `${product.id} must have a primary`);
    set.gallery.forEach((item) => {
      if (item.productId) assert.equal(String(item.productId), String(product.id));
    });
    if (set.hasAlternate) {
      assert.notEqual(set.hover?.src, undefined);
      if (set.hover.productId) assert.equal(String(set.hover.productId), String(product.id));
    }
  });

  /* No two kids cards may hover to a plate that belongs to a different kid. */
  const hoverIds = sets.map((set) => (set.hasAlternate ? set.hover?.id : null)).filter(Boolean);
  sets.forEach((set, index) => {
    if (!set.hasAlternate) return;
    kids.forEach((other, otherIndex) => {
      if (index === otherIndex) return;
      const otherOwned = new Set(sets[otherIndex].gallery.map((item) => item.id));
      if (set.hover?.fromRepository && set.hover.id) {
        assert.ok(!otherOwned.has(set.hover.id) || set.hover.productId === kids[index].id);
      }
    });
  });
  assert.ok(hoverIds);
});

/* ------------------------------------------------------------------ */
/* 8–11  Legacy, library, grouped naming, standalone                   */
/* ------------------------------------------------------------------ */

test("legacy product media — authored primary, no borrowed hover", () => {
  const product = getProductById("pf-080");
  assert.ok(product, "pf-080 should exist");
  const set = getProductMediaSet(product);
  assert.ok(set.primary);
  assert.equal(set.hasAlternate, false, "legacy kids plate has no product-owned alternate");
  assert.equal(set.hover.src, set.primary.src);
  assert.ok(!String(set.primary.src || "").includes("lehenga"), "must not hover to an adult lehenga");
  assert.ok(!String(set.hover.src || "").includes("groom"), "must not hover to a groom plate");
});

test("public/library media is used when explicitly mapped to the product", () => {
  const product = getProductById("pf-011");
  const set = getProductMediaSet(product);
  assert.ok(set.primary?.src?.includes("/library/"), `expected library cover, got ${set.primary?.src}`);
  assert.equal(set.match, "exact");
  assert.ok(["library", "mixed"].includes(set.source));
  set.gallery.forEach((item) => {
    if (item.fromRepository) assert.equal(String(item.productId), "pf-011");
  });
});

test("grouped front/side/back naming is understood", () => {
  const set = assembleProductMediaSet("women-saree-banarasi-001", [
    plate("women-saree-banarasi-001-front.webp", {
      productId: "women-saree-banarasi-001",
      view: "front",
      groupKey: "women-saree-banarasi-001",
      role: "COVER",
    }),
    plate("women-saree-banarasi-001-side.webp", {
      productId: "women-saree-banarasi-001",
      view: "side",
      groupKey: "women-saree-banarasi-001",
    }),
    plate("women-saree-banarasi-001-back.webp", {
      productId: "women-saree-banarasi-001",
      view: "back",
      groupKey: "women-saree-banarasi-001",
    }),
  ]);
  assert.equal(set.groupKey, "women-saree-banarasi-001");
  assert.equal(set.front.fileName, "women-saree-banarasi-001-front.webp");
  assert.equal(set.side.fileName, "women-saree-banarasi-001-side.webp");
  assert.equal(set.back.fileName, "women-saree-banarasi-001-back.webp");
  assert.equal(set.hover.fileName, "women-saree-banarasi-001-back.webp");
});

test("standalone image such as kids-001.webp does not pick another kids file", () => {
  const set = assembleProductMediaSet("pf-kids", [
    plate("kids-001.webp", { productId: "pf-kids", view: null, groupKey: "kids-001", isStandalone: true }),
    plate("kids-015.webp", { productId: "pf-other", view: null, groupKey: "kids-015", isStandalone: true }),
  ]);
  assert.equal(set.primary.fileName, "kids-001.webp");
  assert.equal(set.hover.fileName, "kids-001.webp");
  assert.equal(set.gallery.length, 1);
});

/* ------------------------------------------------------------------ */
/* 12–13  Missing mapping + deterministic                              */
/* ------------------------------------------------------------------ */

test("missing product mapping yields no invented hover", () => {
  const set = getProductMediaSet("does-not-exist");
  assert.equal(set.primary, null);
  assert.equal(set.hasAlternate, false);
  assert.equal(set.status, PRODUCT_MEDIA_STATUS.NEEDS_REVIEW);
});

test("resolution is deterministic across repeated calls", () => {
  const product = getProductById("pf-011");
  const first = getProductMediaSet(product);
  const second = getProductMediaSet(product);
  assert.equal(first.primary?.src, second.primary?.src);
  assert.equal(first.hover?.src, second.hover?.src);
  assert.deepEqual(
    first.gallery.map((item) => item.src),
    second.gallery.map((item) => item.src)
  );
});

/* ------------------------------------------------------------------ */
/* 14  No random selection                                             */
/* ------------------------------------------------------------------ */

test("product media resolution contains no Math.random / shuffle", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const files = [
    "../src/services/media/productMediaSet.js",
    "../src/services/media/productMediaSource.js",
    "../src/design-system/components/ProductCard.jsx",
  ];
  files.forEach((relative) => {
    const source = readFileSync(join(here, relative), "utf8");
    assert.ok(!source.includes("Math.random"), `${relative} must not call Math.random`);
    assert.ok(!source.includes("sort(() =>"), `${relative} must not shuffle`);
  });
});

/* ------------------------------------------------------------------ */
/* 15–16  ProductCard + Product Detail share the resolver              */
/* ------------------------------------------------------------------ */

test("ProductCard uses the canonical resolver", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "../src/design-system/components/ProductCard.jsx"), "utf8");
  assert.ok(source.includes("getProductCardMedia"), "ProductCard must call getProductCardMedia");

  const kids = getProductById("pf-080");
  const card = getProductCardMedia(kids);
  assert.ok(card.image);
  assert.equal(card.hoverImage, undefined, "no alternate → hover disabled");

  const mapped = getProductById("pf-011");
  const mappedCard = getProductCardMedia(mapped);
  assert.ok(mappedCard.image);
  if (mappedCard.hoverImage) {
    assert.notEqual(mappedCard.hoverImage.src, mappedCard.image.src);
    if (mappedCard.hoverImage.productId) {
      assert.equal(String(mappedCard.hoverImage.productId), "pf-011");
    }
  }
});

test("Product Detail uses the same resolver as the card", () => {
  const product = getProductById("pf-011");
  const set = getProductMediaSet(product);
  const slides = getProductSlides(product);
  const gallery = resolveProductGallery(product);
  const cover = getProductCoverImage(product);

  assert.equal(cover?.src, set.primary?.src);
  assert.ok(gallery.length >= 1);
  gallery.forEach((item) => {
    if (item.productId) assert.equal(String(item.productId), "pf-011");
  });
  slides
    .filter((slide) => slide.type === "IMAGE")
    .forEach((slide) => {
      const src = slide.image?.src;
      assert.ok(
        set.gallery.some((item) => item.src === src || item.id === slide.id),
        `slide ${slide.id} is not in the canonical set`
      );
    });
});

/* ------------------------------------------------------------------ */
/* Live catalogue — no cross-product hover anywhere                    */
/* ------------------------------------------------------------------ */

test("every live product card hover belongs to the same product", () => {
  getLiveStorefrontProducts().forEach((product) => {
    const decorated = applyProductMediaSet(product);
    const set = getProductMediaSet(product);
    assert.ok(set.primary, `${product.id} must resolve a primary`);
    if (set.hasAlternate) {
      assert.ok(decorated.hoverImage, `${product.id} should expose hover`);
      if (decorated.hoverImage.productId) {
        assert.equal(String(decorated.hoverImage.productId), String(product.id), `${product.id} hover crossed products`);
      }
    } else {
      assert.equal(decorated.hoverImage, undefined, `${product.id} must not swap without an alternate`);
    }
    set.gallery.forEach((item) => {
      if (item.productId) {
        assert.equal(String(item.productId), String(product.id), `${product.id} gallery contains ${item.productId}`);
      }
    });
  });
});

test("isProductOwnedMedia rejects category-only records", () => {
  assert.equal(isProductOwnedMedia({ productId: "pf-011" }, "pf-011"), true);
  assert.equal(isProductOwnedMedia({ productId: "pf-011" }, "pf-012"), false);
  assert.equal(isProductOwnedMedia({ productId: null, categoryId: "kidswear" }, "pf-080"), false);
  assert.equal(isProductOwnedMedia({ categoryId: "kidswear" }, "pf-080"), false);
});

test("decorateProductWithMedia and applyProductMediaSet agree", () => {
  const product = getProductById("pf-076");
  const a = decorateProductWithMedia(product);
  const b = applyProductMediaSet(product);
  assert.equal(a.image?.src, b.image?.src);
  assert.equal(a.hoverImage?.src, b.hoverImage?.src);
});

test("kids authored hoverImage is ignored — no lehenga / groom leak", () => {
  const kids = getLiveStorefrontProducts().filter((product) => product.category === "kidswear");
  kids.forEach((product) => {
    const card = getProductCardMedia(product);
    const src = String(card.hoverImage?.src || card.image?.src || "");
    assert.ok(!src.includes("lehenga-party"), `${product.id} leaked lehenga-party`);
    assert.ok(!src.includes("groom-sherwani"), `${product.id} leaked groom-sherwani`);
    assert.ok(!src.includes("men-kurta"), `${product.id} leaked men-kurta`);
    const media = card.hoverImage && mediaRepository.getById(card.hoverImage.id);
    if (media?.productId) assert.equal(String(media.productId), String(product.id));
  });
});
