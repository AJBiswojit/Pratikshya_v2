/**
 * Canonical homepage hero media replacement.
 *
 * These assertions exercise the real manifest → mediaStore → repository →
 * resolver path. The carousel itself remains layout-only and never owns a
 * commercial image address.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { MARKETING_PLACEMENTS, USAGE_ROLES } from "../src/config/mediaTypes.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import {
  HOMEPAGE_HERO_THEMES,
  resolveHeroImageIds,
  resolveHeroSlideImage,
  resolveHeroSlideImages,
  resolveHomepageHeroMedia,
} from "../src/services/media/mediaResolver.js";

const EXPECTED = [
  "hero001.avif",
  "hero002.avif",
  "hero003.avif",
  "hero004.avif",
  "hero005.avif",
];

const filenameOf = (source) =>
  source?.currentFilename ||
  source?.fileName ||
  source?.src?.split("?")[0].split("/").pop() ||
  null;

test("HOME_HERO register contains exactly the five canonical AVIF assets", () => {
  const registered = resolveHomepageHeroMedia();
  assert.equal(registered.length, 5);
  assert.deepEqual(registered.map(filenameOf), EXPECTED);

  registered.forEach((media, index) => {
    assert.equal(media.placement, MARKETING_PLACEMENTS.HOME_HERO);
    assert.equal(media.sortOrder, index);
    assert.equal(media.status, "ACTIVE");
    assert.equal(media.mappingStatus, "MAPPED");
    assert.equal(media.mappingMethod, "HOMEPAGE_HERO_REGISTER");
    assert.equal(media.productId, null, `${filenameOf(media)} must not own a product`);
    assert.deepEqual(media.usageRoles, [USAGE_ROLES.HERO]);
    assert.equal(media.width, 1672);
    assert.equal(media.height, 941);
    assert.equal(media.broken, false);
  });
});

test("hero resolver returns hero001 through hero005 in deterministic order", () => {
  const slides = resolveHeroSlideImages();
  assert.deepEqual(slides.map(filenameOf), EXPECTED);

  const individuallyResolved = HOMEPAGE_HERO_THEMES.map((theme) =>
    resolveHeroSlideImage(theme)
  );
  assert.deepEqual(individuallyResolved.map(filenameOf), EXPECTED);
  assert.deepEqual(
    resolveHeroImageIds(),
    resolveHomepageHeroMedia().map((media) => media.id)
  );
});

test("no legacy homepage hero assignment remains active", () => {
  const active = mediaRepository.getMarketingMedia(MARKETING_PLACEMENTS.HOME_HERO, {
    publicOnly: true,
  });
  assert.deepEqual(active.map(filenameOf), EXPECTED);
  assert.equal(new Set(active.map((media) => media.id)).size, EXPECTED.length);
});

test("all five registered files exist and carry an AVIF file-type brand", () => {
  EXPECTED.forEach((fileName) => {
    const absolute = join(process.cwd(), "public", "library", fileName);
    assert.equal(existsSync(absolute), true, `${fileName} is missing`);
    const bytes = readFileSync(absolute);
    assert.ok(bytes.length > 32, `${fileName} is empty`);
    assert.equal(bytes.subarray(4, 8).toString("ascii"), "ftyp", `${fileName} has no ISO BMFF header`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "avif", `${fileName} is not AVIF`);
  });
});

test("HeroCarousel has no hardcoded hero path or randomized selection", () => {
  const component = readFileSync(
    join(process.cwd(), "src/components/storefront/HeroCarousel.jsx"),
    "utf8"
  );
  assert.doesNotMatch(component, /["'`]\/library\/hero\d{3}\.avif["'`]/);
  assert.doesNotMatch(component, /Math\.random\s*\(|\.shuffle\s*\(/);
  assert.match(component, /resolveHeroSlideImage/);
});
