/** Generated homepage hero-media contract tests. */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { heroSlides } from "../src/data/catalog/hero.js";
import { resolveHomepageHeroMedia } from "../src/services/media/mediaResolver.js";

const ROOT = process.cwd();

test("the generated homepage has five deterministic authored slides", () => {
  assert.equal(heroSlides.length, 5);
  assert.equal(new Set(heroSlides.map((slide) => slide.id)).size, heroSlides.length);
  assert.deepEqual(heroSlides.map((slide) => slide.id), ["hero-001", "hero-002", "hero-003", "hero-004", "hero-005"]);
});

test("every authored hero uses an existing canonical AVIF asset and a route", () => {
  for (const slide of heroSlides) {
    assert.match(slide.image, /^\/images\/hero\/hero\d{3}\.avif$/);
    assert.ok(existsSync(join(ROOT, "public", slide.image)), `${slide.image} exists`);
    assert.match(slide.cta.href, /^\//);
    assert.ok(slide.title && slide.body && slide.cta.label);
  }
});

test("an empty marketing register does not invent homepage assignments", () => {
  assert.deepEqual(resolveHomepageHeroMedia([]), []);
});
