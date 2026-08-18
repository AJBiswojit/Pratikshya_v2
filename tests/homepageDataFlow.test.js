/** Canonical storefront taxonomy and homepage data-flow tests. */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { departments } from "../src/data/catalog/taxonomy.js";
import taxonomyRepository, { normalizeTaxonomyRecord } from "../src/services/taxonomyRepository.js";
import { categoryHref, collectionHref, resolveCategoryRoute } from "../src/services/taxonomyRouting.js";
import { resolveCategoryCover } from "../src/services/media/mediaResolver.js";

const ROOT = process.cwd();

test("managed categories normalize to one active canonical shape", () => {
  for (const category of taxonomyRepository.activeCategories()) {
    const normalized = normalizeTaxonomyRecord(category, "category");
    assert.equal(normalized.id, category.id);
    assert.equal(normalized.slug, category.slug);
    assert.equal(normalized.type, "category");
    assert.equal(normalized.status, "ACTIVE");
  }
});

test("every department category route is derived from the canonical taxonomy", () => {
  for (const department of departments) {
    for (const category of department.categories) {
      const managed = taxonomyRepository.findCategory(category.id);
      const route = resolveCategoryRoute(category.id);
      assert.ok(managed && route, `${department.id}/${category.id} is managed and routable`);
      assert.equal(categoryHref(managed), category.path);
      assert.equal(route.href, category.path);
    }
  }
});

test("inactive records are never linked", () => {
  assert.equal(categoryHref({ id: "inactive", slug: "inactive", status: "ARCHIVED" }), null);
  assert.equal(collectionHref({ id: "inactive", slug: "inactive", displayStatus: "PAUSED" }), null);
});

test("homepage category covers resolve canonical product media that exists", () => {
  for (const category of taxonomyRepository.activeCategories()) {
    const cover = resolveCategoryCover(category);
    assert.ok(cover?.src, `${category.id} resolves a cover`);
    assert.match(cover.src, /^\/images\/products\//);
    assert.ok(existsSync(join(ROOT, "public", cover.src)), `${cover.src} exists`);
  }
});

test("the Kids department is represented by its normal category records", () => {
  const department = departments.find((entry) => entry.id === "kids");
  assert.ok(department);
  assert.ok(department.categories.length > 0);
  for (const category of department.categories) {
    assert.equal(category.path, `/${department.slug}/${category.slug}`);
    assert.equal(resolveCategoryRoute(category.id)?.href, category.path);
  }
});
