/**
 * PRATIKSHYA FASHON — Media exposure tests (Phase 21.5).
 *
 * These exercise the real media architecture (mediaRepository, mediaResolver,
 * taxonomyRepository, the exposure audit) end-to-end in Node. They run under
 * the registered Node loader so the `src/*` modules import exactly as the
 * Vite bundle does.
 *
 * Run via `npm test` (the loader is wired into the test script).
 */

import test from "node:test";
import assert from "node:assert/strict";

import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  isAiMirrorSafeMedia,
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveHeroSlideImage,
  resolveMedia,
  resolveProductCover,
  resolveProductGallery,
  resolveSaleBackdrop,
  selectMedia,
} from "../src/services/media/mediaResolver.js";
import { auditMediaExposure } from "../src/services/media/mediaExposure.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { getLiveStorefrontProducts, getProductById } from "../src/data/products/index.js";
import { isIngestedPhotographyUrl } from "../src/services/media/mediaPaths.js";
import { USAGE_ROLES } from "../src/config/mediaTypes.js";

/* ------------------------------------------------------------------ */
/* Register seeding                                                    */
/* ------------------------------------------------------------------ */

test("the register is seeded with seed media + the ingested library", () => {
  const all = mediaRepository.getAll();
  const ingested = all.filter((media) => media.ingested);
  assert.ok(all.length > 180, `expected a seeded register, got ${all.length}`);
  // Phase 21.6: 166 library + 10 house + 5 canonical homepage heroes = 181
  assert.equal(ingested.length, 181, "the complete ingested library must reach the register");
});

test("mapped / unmapped / needs-review counts match the ingestion report", () => {
  const all = mediaRepository.getAll();
  // Phase 21.6 counts after migration plus five mapped homepage HERO records
  assert.equal(all.filter((media) => media.mappingStatus === "MAPPED").length, 170);
  assert.equal(all.filter((media) => media.mappingStatus === "UNMAPPED").length, 5);
  assert.equal(all.filter((media) => media.mappingStatus === "NEEDS_REVIEW").length, 6);
});

/* ------------------------------------------------------------------ */
/* Category media resolution                                           */
/* ------------------------------------------------------------------ */

test("category covers resolve to the library photography, not the house fallback", () => {
  ["sarees", "lehengas", "menswear", "kidswear", "jewellery", "bangles", "innerwear", "bridal-couture"].forEach(
    (id) => {
      const category = taxonomyRepository.findCategory(id);
      assert.ok(category, `missing category ${id}`);
      const cover = resolveCategoryCover(category);
      assert.ok(cover?.src, `no cover for ${id}`);
      assert.ok(
        cover.src.includes("/library/"),
        `${id} should use the library, got ${cover.src}`
      );
    }
  );
});

test("a category with no library media falls back to authored artwork", () => {
  const dupattas = taxonomyRepository.findCategory("dupattas");
  const cover = resolveCategoryCover(dupattas);
  assert.ok(cover?.src, "dupattas should still resolve a plate");
  assert.equal(isIngestedPhotographyUrl(cover.src), false, "dupattas has no library photography");
});

/* ------------------------------------------------------------------ */
/* Product media resolution                                            */
/* ------------------------------------------------------------------ */

test("an ingested product cover resolves from the library", () => {
  const product = getProductById("pf-006");
  assert.ok(product, "pf-006 missing");
  const cover = resolveProductCover(product);
  assert.ok(cover?.src?.includes("/library/"), `pf-006 cover should be library, got ${cover?.src}`);
});

test("a product with multiple media exposes its gallery", () => {
  const product = getProductById("pf-006");
  const gallery = resolveProductGallery(product);
  assert.ok(gallery.length > 1, `pf-006 gallery should expose multiple plates, got ${gallery.length}`);
  const ids = new Set(gallery.map((source) => source.id));
  assert.equal(ids.size, gallery.length, "gallery plates should be unique");
});

/* ------------------------------------------------------------------ */
/* Collection media resolution                                         */
/* ------------------------------------------------------------------ */

test("a collection with mapped media resolves from the library", () => {
  const collection = taxonomyRepository.findCollection("bridal-trousseau");
  assert.ok(collection, "bridal-trousseau missing");
  const cover = resolveCollectionCover(collection);
  assert.ok(cover?.src?.includes("/library/"), `bridal-trousseau should use library, got ${cover?.src}`);
});

/* ------------------------------------------------------------------ */
/* Homepage hero resolution                                            */
/* ------------------------------------------------------------------ */

test("hero slides resolve to library editorial plates and stay distinct", () => {
  const usedIds = new Set();
  const slides = ["festive", "bridal", "heritage", "celebration", "arrivals"].map((theme, i) =>
    resolveHeroSlideImage(theme, { heroMedia: null, lead: i === 0, usedIds })
  );
  slides.forEach((slide) => assert.ok(slide?.src?.includes("/library/"), `hero should use library: ${slide?.src}`));
  const ids = slides.map((slide) => slide.id);
  assert.equal(new Set(ids).size, slides.length, "hero slides must not repeat an image");
});

test("sale backdrop resolves from the library", () => {
  const backdrop = resolveSaleBackdrop(null);
  assert.ok(backdrop?.src?.includes("/library/"), `sale should use library, got ${backdrop?.src}`);
});

/* ------------------------------------------------------------------ */
/* Usage filtering                                                     */
/* ------------------------------------------------------------------ */

test("resolveMedia filters by usage role", () => {
  const picks = resolveMedia({ usage: USAGE_ROLES.SALE, categoryId: "lehengas", limit: 5 });
  assert.ok(picks.length > 0);
  picks.forEach((media) => assert.ok(media.usageRoles.includes(USAGE_ROLES.SALE)));
});

/* ------------------------------------------------------------------ */
/* Determinism + exclusion                                             */
/* ------------------------------------------------------------------ */

test("selection is deterministic across calls", () => {
  const first = selectMedia({ categoryId: "sarees", roles: [USAGE_ROLES.CATEGORY_COVER, USAGE_ROLES.EDITORIAL], limit: 3 }).map((m) => m.id);
  const second = selectMedia({ categoryId: "sarees", roles: [USAGE_ROLES.CATEGORY_COVER, USAGE_ROLES.EDITORIAL], limit: 3 }).map((m) => m.id);
  assert.deepEqual(first, second);
});

test("exclusion set prevents reuse within one viewport", () => {
  const usedIds = new Set();
  const first = selectMedia({ categoryId: "lehengas", roles: [USAGE_ROLES.EDITORIAL], usedIds, limit: 1 })[0];
  usedIds.add(first.id);
  const second = selectMedia({ categoryId: "lehengas", roles: [USAGE_ROLES.EDITORIAL], usedIds, limit: 1 })[0];
  assert.ok(first && second);
  assert.notEqual(first.id, second.id);
});

/* ------------------------------------------------------------------ */
/* Unmapped handling                                                   */
/* ------------------------------------------------------------------ */

test("unmapped assets never surface through the default resolver", () => {
  const unmappedIds = new Set(
    mediaRepository.getUnmappedMedia().map((media) => media.id)
  );
  const picks = resolveMedia({ usage: USAGE_ROLES.CATEGORY_COVER, categoryId: "jewellery", limit: 50 });
  picks.forEach((media) => assert.ok(!unmappedIds.has(media.id), `${media.id} is unmapped`));
});

/* ------------------------------------------------------------------ */
/* Fallback handling                                                   */
/* ------------------------------------------------------------------ */

test("resolveMedia returns usable, active sources only", () => {
  const picks = selectMedia({ categoryId: "sarees", limit: 50 });
  picks.forEach((media) => {
    assert.equal(media.status, "ACTIVE");
    assert.ok(media.url || media.thumbnail);
    assert.ok(!media.broken);
  });
});

/* ------------------------------------------------------------------ */
/* AI Mirror eligibility                                               */
/* ------------------------------------------------------------------ */

test("AI Mirror refuses jewellery, bangles and innerwear media", () => {
  const all = mediaRepository.getAll();
  const excluded = new Set(["jewellery", "bangles", "innerwear"]);
  all
    .filter((media) => (media.usageRoles || []).includes(USAGE_ROLES.AI_MIRROR))
    .filter((media) => excluded.has(media.categoryId))
    .forEach((media) => assert.equal(isAiMirrorSafeMedia(media), false, media.categoryId));
});

test("AI Mirror accepts eligible apparel media", () => {
  const saree = mediaRepository
    .getAll()
    .find((media) => media.categoryId === "sarees" && (media.usageRoles || []).includes(USAGE_ROLES.AI_MIRROR) && media.status === "ACTIVE");
  assert.ok(saree);
  assert.equal(isAiMirrorSafeMedia(saree), true);
});

test("AI Mirror resolves a real product image for apparel and null for jewellery", () => {
  const saree = getLiveStorefrontProducts().find((product) => product.category === "sarees" && product.id === "pf-006");
  const jewellery = getLiveStorefrontProducts().find((product) => product.category === "jewellery");
  assert.ok(resolveAiMirrorImage(saree)?.src);
  assert.equal(resolveAiMirrorImage(jewellery), null);
});

/* ------------------------------------------------------------------ */
/* AI Shopping product media                                           */
/* ------------------------------------------------------------------ */

test("AI Shopping resolves the real product cover from the library", () => {
  const product = getProductById("pf-006");
  const image = resolveAiShoppingImage(product);
  assert.ok(image?.src?.includes("/library/"), `AI Shopping should use library, got ${image?.src}`);
});

/* ------------------------------------------------------------------ */
/* Media exposure audit                                                */
/* ------------------------------------------------------------------ */

test("the exposure audit reports a truthful, connected chain", () => {
  const report = auditMediaExposure();
  assert.equal(report.inventory.total, 205);
  assert.equal(report.inventory.mapped, 170);
  assert.equal(report.inventory.unmapped, 5);
  assert.ok(report.inventory.exposed > 0, "some media must be exposed");
  assert.ok(report.inventory.exposed + report.inventory.mappedButUnused === report.inventory.mapped);
  assert.ok(Array.isArray(report.unused));
  assert.ok(Array.isArray(report.unmappedAssets));
  assert.ok(report.categoryCoverage.length > 0);
});

test("unused report only lists mapped media that no surface consumes", () => {
  const report = auditMediaExposure();
  const consumed = new Set(
    Object.values(report.surfaces).flatMap((surface) => surface.assets || [])
  );
  report.unused.forEach((media) => {
    assert.ok(!consumed.has(media.mediaId), `${media.mediaId} is marked unused but is consumed`);
  });
});
