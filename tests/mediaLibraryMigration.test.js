/**
 * PRATIKSHYA FASHON — Unified media library migration (Phase 21.11).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import {
  HOUSE_PLATE_MIGRATION,
  isHousePlateUrl,
  isIngestedPhotographyUrl,
  isLegacyImagesUrl,
  resolveHousePlateUrl,
  resolveLegacyMediaUrl,
} from "../src/services/media/mediaPaths.js";
import { imageRef } from "../src/data/pratikshyaImageManifest.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { FALLBACK_REASONS, resolveCategoryCover } from "../src/services/media/mediaResolver.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";

test("legacy /images paths rewrite onto the canonical library", () => {
  assert.equal(resolveLegacyMediaUrl("/images/atelier-fabric.jpg"), "/library/house-atelier-fabric.jpg");
  assert.equal(
    resolveLegacyMediaUrl("/images/pratikshya/kids/kids-festive.jpg"),
    "/library/house-kids-festive.jpg"
  );
  assert.equal(resolveLegacyMediaUrl("images/heritage-textile.jpg"), "/library/house-heritage-textile.jpg");
  assert.equal(resolveHousePlateUrl("atelier-fabric.jpg"), "/library/house-atelier-fabric.jpg");
});

test("remote and already-canonical addresses are left alone", () => {
  assert.equal(resolveLegacyMediaUrl("https://images.pexels.com/photos/1/a.jpeg"), "https://images.pexels.com/photos/1/a.jpeg");
  assert.equal(resolveLegacyMediaUrl("/library/women-saree-silk-001-front.webp"), "/library/women-saree-silk-001-front.webp");
  assert.equal(isIngestedPhotographyUrl("/library/women-saree-silk-001-front.webp"), true);
  assert.equal(isIngestedPhotographyUrl("/library/house-atelier-fabric.jpg"), false);
  assert.equal(isHousePlateUrl("/library/house-atelier-fabric.jpg"), true);
  assert.equal(isLegacyImagesUrl("/images/atelier-fabric.jpg"), true);
});

test("every migrated house plate exists on disk and in the register", () => {
  HOUSE_PLATE_MIGRATION.forEach((entry) => {
    const abs = join(process.cwd(), "public", entry.newPath);
    assert.ok(existsSync(abs), `missing ${entry.newPath}`);
    const record = mediaRepository.getById(entry.id);
    assert.ok(record, `missing register record ${entry.id}`);
    assert.ok(
      (record.url || "").includes("/library/"),
      `${entry.id} should resolve from the library, got ${record.url}`
    );
    assert.equal(record.productId, null, "house plates must not invent product ownership");
  });
});

test("the house manifest no longer emits /images/ addresses", () => {
  ["hero-atelier", "saree-silk", "lehenga-bridal", "groom-sherwani", "kids-festive-wear", "bridal-bangles"].forEach(
    (id) => {
      const plate = imageRef(id);
      assert.ok(plate.src, `${id} should resolve`);
      assert.ok(!plate.src.includes("/images/"), `${id} still points at ${plate.src}`);
    }
  );
});

test("categories without photography still fall back to house artwork, never a borrowed product", () => {
  const kurtis = taxonomyRepository.findCategory("kurtis-and-suits");
  const cover = resolveCategoryCover(kurtis);
  assert.equal(cover.reason, FALLBACK_REASONS.NO_SOURCE_MEDIA);
  assert.equal(isIngestedPhotographyUrl(cover.src), false);
  assert.equal(cover.src, imageRef(kurtis.image).src);
});
