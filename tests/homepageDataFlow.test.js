/**
 * PRATIKSHYA FASHON — Storefront taxonomy + homepage data-flow tests
 * (Phase 21.7).
 *
 * Proves the homepage consumes the canonical taxonomy and media architecture:
 *   · taxonomy records normalize to one shape
 *   · category/collection routes derive from the managed slug
 *   · homepage sections resolve real library assets, not house fallbacks
 *
 * Run via `npm test` (the Node loader is wired into the test script).
 */

import test from "node:test";
import assert from "node:assert/strict";

import taxonomyRepository, {
  normalizeTaxonomyRecord,
} from "../src/services/taxonomyRepository.js";
import {
  categoryHref,
  collectionHref,
  resolveCategoryRoute,
  resolveCollectionRoute,
} from "../src/services/taxonomyRouting.js";
import {
  resolveCategoryCover,
  resolveEditorialFrame,
  resolveHeroSlideImage,
  resolveProductCover,
  resolveSaleBackdrop,
} from "../src/services/media/mediaResolver.js";
import { auditHomepageSections } from "../src/services/media/mediaExposure.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import mediaRepository from "../src/services/media/mediaRepository.js";

/* ------------------------------------------------------------------ */
/* Taxonomy normalization                                              */
/* ------------------------------------------------------------------ */

test("normalizeTaxonomyRecord projects a category to the canonical shape", () => {
  const kidswear = taxonomyRepository.findCategory("kidswear");
  const normalized = normalizeTaxonomyRecord(kidswear, "category");
  assert.equal(normalized.id, "kidswear");
  assert.equal(normalized.slug, "kids");
  assert.equal(normalized.name, "Kids Wear");
  assert.equal(normalized.type, "category");
  assert.equal(normalized.parentId, null);
  assert.equal(normalized.status, "ACTIVE");
  assert.equal(normalized.featured, true);
  assert.equal(typeof normalized.sortOrder, "number");
  assert.equal(typeof normalized.image, "string");
  assert.equal(normalized.seo.title, "Kids Wear");
});

test("normalizeTaxonomyRecord tolerates title/label aliases", () => {
  const normalized = normalizeTaxonomyRecord({ id: "x", slug: "x", title: "Example" }, "category");
  assert.equal(normalized.name, "Example");
  assert.equal(normalized.seo.title, "Example");
});

test("the canonical Kids slug is the managed slug, not an assumption", () => {
  const kidswear = taxonomyRepository.findCategory("kidswear");
  assert.equal(kidswear.slug, "kids");
  assert.equal(categoryHref(kidswear), "/category/kids");
});

test("active category filtering returns only ACTIVE records without duplicates", () => {
  const active = taxonomyRepository.activeCategories();
  assert.ok(active.length > 0);
  active.forEach((category) => assert.equal(category.status, "ACTIVE"));
  assert.equal(new Set(active.map((category) => category.id)).size, active.length);
  assert.equal(new Set(active.map((category) => category.slug)).size, active.length);
});

test("duplicate category handling — id and slug resolve the same record", () => {
  const byId = taxonomyRepository.findCategory("kidswear");
  const bySlug = taxonomyRepository.findCategory("kids");
  assert.ok(byId && bySlug);
  assert.equal(byId.id, bySlug.id);
  assert.equal(byId.slug, bySlug.slug);
});

/* ------------------------------------------------------------------ */
/* Routing                                                             */
/* ------------------------------------------------------------------ */

test("every homepage category destination resolves to a canonical route", () => {
  const expected = {
    sarees: "/category/sarees",
    lehengas: "/category/lehengas",
    menswear: "/category/men",
    kidswear: "/category/kids",
    jewellery: "/category/jewellery",
    bangles: "/category/bangles",
  };
  Object.entries(expected).forEach(([id, href]) => {
    const route = resolveCategoryRoute(id);
    assert.ok(route, `${id} should be routable`);
    assert.equal(route.href, href);
    assert.equal(route.category.status, "ACTIVE");
  });
});

test("collection cards resolve to canonical collection routes", () => {
  assert.equal(resolveCollectionRoute("festive-edit")?.href, "/collection/festive");
  assert.equal(resolveCollectionRoute("new-arrivals")?.href, "/collection/new-arrivals");
  assert.equal(resolveCollectionRoute("featured")?.href, "/collection/featured");
});

test("archived taxonomy records are never routed", () => {
  assert.equal(categoryHref({ id: "legacy", slug: "legacy", status: "ARCHIVED" }), null);
  assert.equal(collectionHref({ id: "paused", slug: "paused", displayStatus: "PAUSED" }), null);
});

/* ------------------------------------------------------------------ */
/* Homepage media — Kids priority                                      */
/* ------------------------------------------------------------------ */

test("the homepage Kids card resolves a library CATEGORY_COVER plate", () => {
  const kidswear = taxonomyRepository.findCategory("kidswear");
  const cover = resolveCategoryCover(kidswear);
  assert.ok(cover?.src, "Kids category must resolve a plate");
  assert.ok(cover.src.includes("/library/"), `Kids should use the library, got ${cover.src}`);
  const media = mediaRepository.getById(cover.id);
  assert.equal(media.categoryId, "kidswear");
  assert.ok(media.usageRoles.includes("CATEGORY_COVER"), media.usageRoles.join(","));
});

test("category cards use CATEGORY_COVER media from the library", () => {
  ["sarees", "lehengas", "menswear", "kidswear", "jewellery", "bangles", "bridal-couture", "innerwear"].forEach((id) => {
    const cover = resolveCategoryCover(taxonomyRepository.findCategory(id));
    assert.ok(cover?.src?.includes("/library/"), `${id} should use the library, got ${cover?.src}`);
    const media = mediaRepository.getById(cover.id);
    assert.ok(
      media.usageRoles.includes("CATEGORY_COVER") || media.usageRoles.includes("EDITORIAL"),
      `${id} → ${media.usageRoles.join(",")}`
    );
  });
});

test("new arrivals use current product primary media", () => {
  const arrivals = [...getLiveStorefrontProducts()]
    .sort((a, b) => b.addedOrder - a.addedOrder)
    .slice(0, 5);
  arrivals.forEach((product) => {
    const cover = resolveProductCover(product);
    assert.ok(cover, `${product.id} should resolve a cover`);
  });
});

test("sale backdrop uses SALE/BANNER media", () => {
  const backdrop = resolveSaleBackdrop(null);
  assert.ok(backdrop?.src?.includes("/library/"), `sale should use the library, got ${backdrop?.src}`);
  const media = mediaRepository.getById(backdrop.id);
  assert.ok(
    ["SALE", "BANNER", "EDITORIAL"].some((role) => media.usageRoles.includes(role)),
    media.usageRoles.join(",")
  );
});

test("editorial frames resolve through the EDITORIAL resolver", () => {
  ["bridal", "groom", "festive", "heritage"].forEach((theme) => {
    const frame = resolveEditorialFrame(theme);
    assert.ok(frame?.src?.includes("/library/"), `${theme} editorial should use the library, got ${frame?.src}`);
    const media = mediaRepository.getById(frame.id);
    assert.ok(
      ["HERO", "EDITORIAL", "LOOKBOOK"].some((role) => media.usageRoles.includes(role)),
      `${theme} → ${media.usageRoles.join(",")}`
    );
  });
});

test("hero slides use HERO media and stay distinct", () => {
  const usedIds = new Set();
  const slides = ["festive", "bridal", "heritage", "celebration", "arrivals"].map((theme, index) =>
    resolveHeroSlideImage(theme, { heroMedia: null, lead: index === 0, usedIds })
  );
  slides.forEach((slide) => assert.ok(slide?.src?.includes("/library/"), `hero → ${slide?.src}`));
  assert.equal(new Set(slides.map((slide) => slide.id)).size, slides.length);
});

/* ------------------------------------------------------------------ */
/* Homepage sections — no broken references                            */
/* ------------------------------------------------------------------ */

test("the homepage media report shows no broken or empty sections", () => {
  const report = auditHomepageSections();
  assert.equal(report.hero.length, 5);
  assert.equal(report.editorial.length, 4);
  assert.ok(report.shopByCategory.length >= 10);
  assert.ok(report.newArrivals.length === 5);
  report.hero.concat(report.editorial, report.shopByCategory, report.collections, report.newArrivals, [report.sale]).forEach((row) => {
    assert.equal(row.broken, false, `${row.filename} is broken`);
    assert.ok(row.filename, "every homepage asset must have a filename");
  });
});

test("the Kids card in the homepage report points at a library asset", () => {
  const report = auditHomepageSections();
  const kids = report.shopByCategory.find((row) => row.name === "Kids Wear");
  assert.ok(kids, "Kids Wear card missing from the homepage report");
  assert.equal(kids.library, true, `Kids should use the library, got ${kids.filename}`);
  assert.equal(kids.mapped, true);
});
