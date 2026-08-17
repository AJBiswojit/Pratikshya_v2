/**
 * PRATIKSHYA FASHON — Fallback resolution tests (Phase 21.8).
 *
 * Proves the extended central resolver prefers real, relevant library
 * photography over house artwork — and that it never borrows an unrelated
 * product's image just to eliminate a fallback.
 *
 * Run via `npm test` (the Node loader is wired into the test script).
 */

import test from "node:test";
import assert from "node:assert/strict";

import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  FALLBACK_REASONS,
  isAiMirrorSafeMedia,
  productMediaTier,
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveProductCover,
  selectNewArrivalProducts,
} from "../src/services/media/mediaResolver.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { categoryHref } from "../src/services/taxonomyRouting.js";
import { getLiveStorefrontProducts, getProductById } from "../src/data/products/index.js";
import { imageRef } from "../src/data/pratikshyaImageManifest.js";
import { isIngestedPhotographyUrl } from "../src/services/media/mediaPaths.js";
import { USAGE_ROLES } from "../src/config/mediaTypes.js";

/* ------------------------------------------------------------------ */
/* New Arrivals                                                        */
/* ------------------------------------------------------------------ */

test("new arrivals prefer products with library primary media", () => {
  const arrivals = selectNewArrivalProducts(getLiveStorefrontProducts(), 5);
  assert.equal(arrivals.length, 5);
  /* Qualification unchanged: the rail stays within the flagged-arrival pool. */
  assert.ok(arrivals.every((product) => product.isNew), "rail should stay within flagged arrivals");

  const tiers = arrivals.map((product) => productMediaTier(product));
  tiers.slice(1).forEach((tier, index) =>
    assert.ok(tiers[index] <= tier, "tiers should be non-decreasing")
  );
  assert.ok(tiers.filter((tier) => tier === 0).length >= 3, `expected library-led rail, got ${tiers}`);
});

test("new arrival covers belong to the product, never another product", () => {
  selectNewArrivalProducts(getLiveStorefrontProducts(), 5).forEach((product) => {
    const cover = resolveProductCover(product);
    assert.ok(cover, `${product.id} should resolve a cover`);
    const media = cover.id ? mediaRepository.getById(cover.id) : null;
    if (media?.productId) assert.equal(media.productId, product.id, "borrowed another product's media");
  });
});

/* ------------------------------------------------------------------ */
/* Product media priority                                              */
/* ------------------------------------------------------------------ */

test("a product with library media resolves its own PRIMARY cover", () => {
  const product = getProductById("pf-006");
  const cover = resolveProductCover(product);
  assert.ok(cover?.src?.includes("/library/"));
  assert.equal(cover.reason, FALLBACK_REASONS.DIRECT);
  assert.equal(mediaRepository.getById(cover.id).productId, "pf-006");
});

test("a product without library media keeps its own authored plate", () => {
  const product = getProductById("pf-002");
  const cover = resolveProductCover(product);
  assert.ok(cover);
  assert.equal(cover.reason, FALLBACK_REASONS.NO_SOURCE_MEDIA);
  assert.equal(cover.id, product.image.id, "must keep its own authored plate, not another image");
  assert.equal(isIngestedPhotographyUrl(cover.src), false, "must not borrow ingested product photography");
});

/* ------------------------------------------------------------------ */
/* Collection covers                                                   */
/* ------------------------------------------------------------------ */

test("a collection with a dedicated cover uses it directly", () => {
  const collection = taxonomyRepository.findCollection("bridal-trousseau");
  const cover = resolveCollectionCover(collection);
  assert.ok(cover?.src?.includes("/library/"));
  assert.equal(cover.reason, FALLBACK_REASONS.DIRECT);
});

test("a collection without a cover uses a member product's media", () => {
  const collection = taxonomyRepository.findCollection("silk");
  const cover = resolveCollectionCover(collection);
  assert.ok(cover?.src?.includes("/library/"), `silk should derive library media, got ${cover?.src}`);
  assert.equal(cover.reason, FALLBACK_REASONS.TAXONOMY_PRODUCT);
  const media = mediaRepository.getById(cover.id);
  const product = getProductById(media.productId);
  assert.ok(
    taxonomyRepository.isProductInCollection(product, "silk"),
    `silk borrowed ${media.currentFilename} from non-member ${product?.id}`
  );
});

/* ------------------------------------------------------------------ */
/* Category covers                                                     */
/* ------------------------------------------------------------------ */

test("a category uses its own CATEGORY_COVER media", () => {
  const sarees = taxonomyRepository.findCategory("sarees");
  const cover = resolveCategoryCover(sarees);
  assert.ok(cover?.src?.includes("/library/"));
  assert.equal(cover.reason, FALLBACK_REASONS.DIRECT);
  assert.equal(mediaRepository.getById(cover.id).categoryId, "sarees");
});

test("kurtis fallback stays safe — no borrowed saree/lehenga photography", () => {
  const kurtis = taxonomyRepository.findCategory("kurtis-and-suits");
  const cover = resolveCategoryCover(kurtis);
  assert.equal(cover.reason, FALLBACK_REASONS.NO_SOURCE_MEDIA);
  assert.equal(isIngestedPhotographyUrl(cover.src), false, "kurtis must not use library photography it does not own");
  assert.equal(cover.src, imageRef(kurtis.image).src, "kurtis should keep its own authored artwork");
});

test("dupatta fallback stays safe — no borrowed saree photography", () => {
  const dupattas = taxonomyRepository.findCategory("dupattas");
  const cover = resolveCategoryCover(dupattas);
  assert.equal(cover.reason, FALLBACK_REASONS.NO_SOURCE_MEDIA);
  assert.equal(isIngestedPhotographyUrl(cover.src), false, "dupattas must not use library saree photography");
  assert.equal(cover.src, imageRef(dupattas.image).src);
});

test("no category cover uses an unrelated product's image", () => {
  taxonomyRepository.activeCategories().forEach((category) => {
    const cover = resolveCategoryCover(category);
    assert.ok(cover, `${category.id} should resolve a cover`);
    if (!isIngestedPhotographyUrl(cover.src)) return;
    const media = mediaRepository.getById(cover.id);
    assert.ok(media, `cover ${cover.src} should have a media record`);
    if (media.productId) {
      const product = getProductById(media.productId);
      assert.equal(product?.category, category.id, `${category.id} borrowed ${media.currentFilename}`);
    } else {
      assert.equal(media.categoryId, category.id, `${category.id} → ${media.categoryId}`);
    }
  });
});

test("no collection cover uses an unrelated product's image", () => {
  taxonomyRepository.activeCollections().forEach((collection) => {
    const cover = resolveCollectionCover(collection);
    assert.ok(cover, `${collection.id} should resolve a cover`);
    if (!cover.src?.includes("/library/")) return;
    const media = mediaRepository.getById(cover.id);
    assert.ok(media);
    if (media.productId) {
      const product = getProductById(media.productId);
      assert.ok(
        taxonomyRepository.isProductInCollection(product, collection.id),
        `${collection.id} borrowed ${media.currentFilename} from non-member ${product?.id}`
      );
    }
  });
});

/* ------------------------------------------------------------------ */
/* Routing + AI regressions                                            */
/* ------------------------------------------------------------------ */

test("homepage routes remain unchanged", () => {
  assert.equal(categoryHref(taxonomyRepository.findCategory("kidswear")), "/category/kids");
  assert.equal(categoryHref(taxonomyRepository.findCategory("menswear")), "/category/men");
  assert.equal(categoryHref(taxonomyRepository.findCategory("sarees")), "/category/sarees");
});

test("AI Mirror remains apparel-only", () => {
  const jewelleryProduct = getLiveStorefrontProducts().find((product) => product.category === "jewellery");
  assert.equal(resolveAiMirrorImage(jewelleryProduct), null);

  const jewelleryMedia = mediaRepository
    .getAll()
    .find((media) => media.categoryId === "jewellery" && (media.usageRoles || []).includes(USAGE_ROLES.AI_MIRROR));
  if (jewelleryMedia) assert.equal(isAiMirrorSafeMedia(jewelleryMedia), false);

  const sareeProduct = getProductById("pf-006");
  const sareeCover = resolveAiMirrorImage(sareeProduct);
  assert.ok(sareeCover, "eligible apparel should still reach AI Mirror");
});

test("AI Shopping remains functional", () => {
  const product = getProductById("pf-006");
  const image = resolveAiShoppingImage(product);
  assert.ok(image, "AI Shopping should resolve a product plate");
});
