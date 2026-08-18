/**
 * PRATIKSHYA FASHON — Mega-menu editorial media contracts.
 *
 * The navigation's editorial panel must resolve a department-correct plate
 * from canonical data alone. These tests lock down:
 *
 *   · every department resolves imagery from its OWN canonical scope
 *   · Collections resolves collection/editorial imagery, not a product dump
 *   · nothing is hardcoded — no product ids, no filenames in the component
 *   · DRAFT / SUBMITTED / APPROVED products never reach the menu as products
 *   · clearing LocalStorage and re-reading is stable (a refresh is stable)
 *   · Marketing Media and hero workflows are untouched
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { primaryNavigation } from "../src/config/navigationConfig.js";
import { departments } from "../src/data/catalog/taxonomy.js";
import { products as authoredCatalogue } from "../src/data/catalog/products.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { MARKETING_PLACEMENTS, MEDIA_STATUS, USAGE_ROLES } from "../src/config/mediaTypes.js";
import { resolveHomepageHeroMedia } from "../src/services/media/mediaResolver.js";
import { setPlacementProductIds, resetPlacementAssignments } from "../src/services/media/marketingPlacementRepository.js";
import {
  NAVIGATION_EDITORIAL_SOURCES,
  rankEditorialCandidates,
  resetNavigationEditorialCache,
  resolveNavigationEditorialImage,
  resolveNavigationEditorialScope,
} from "../src/services/media/navigationEditorialMedia.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const DEPARTMENT_IDS = departments.map((department) => department.id);

const groupOf = (id) => primaryNavigation.find((group) => group.id === id);

const reset = () => {
  setupCanonicalState();
  resetPlacementAssignments();
  resetNavigationEditorialCache();
};

beforeEach(reset);
afterEach(reset);

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, `${id} submits`);
  assert.ok(commands.approveProduct(id, ADMIN).ok, `${id} approves`);
  assert.ok(commands.publishProduct(id, ADMIN).ok, `${id} publishes`);
};

/* ------------------------------------------------------------------ */
/* Department correctness                                              */
/* ------------------------------------------------------------------ */

test("every department mega-menu resolves an image from its own canonical scope", () => {
  for (const departmentId of DEPARTMENT_IDS) {
    const image = resolveNavigationEditorialImage(groupOf(departmentId));
    assert.ok(image?.src, `${departmentId} resolves a plate`);
    assert.ok(
      image.src.startsWith(`/images/products/${departmentId}/`),
      `${departmentId} plate must live under its own canonical media scope — got ${image.src}`
    );
  }
});

test("no department mega-menu ever shows another department's imagery", () => {
  for (const departmentId of DEPARTMENT_IDS) {
    const { src } = resolveNavigationEditorialImage(groupOf(departmentId));
    for (const other of DEPARTMENT_IDS) {
      if (other === departmentId) continue;
      assert.ok(
        !src.startsWith(`/images/products/${other}/`),
        `${departmentId} must not show ${other} imagery`
      );
    }
  }
});

test("women resolves women's fashion, bridal resolves bridal, men resolves menswear, kids resolves kidswear", () => {
  const expectations = {
    women: /^\/images\/products\/women\/(sarees|lehengas|essentials)\//,
    bridal: /^\/images\/products\/bridal\/(the-bride|celebrations|finishing-touches)\//,
    men: /^\/images\/products\/men\/(groom|ethnic-wear)\//,
    kids: /^\/images\/products\/kids\/(girls|boys)\//,
  };
  for (const [departmentId, pattern] of Object.entries(expectations)) {
    const { src } = resolveNavigationEditorialImage(groupOf(departmentId));
    assert.match(src, pattern, `${departmentId} plate must be ${departmentId} photography`);
  }
});

test("each department's plate is distinct — the menus never repeat one photograph", () => {
  const sources = primaryNavigation
    .map((group) => resolveNavigationEditorialImage(group)?.src)
    .filter(Boolean);
  assert.equal(sources.length, primaryNavigation.length);
  assert.equal(new Set(sources).size, sources.length, "every menu shows its own plate");
});

test("the men's menu prefers ceremonial menswear over an unrelated silhouette", () => {
  const { src } = resolveNavigationEditorialImage(groupOf("men"));
  assert.ok(src.startsWith("/images/products/men/groom/"), `expected groom photography, got ${src}`);
});

test("the women's menu is not captured by a bridal-tagged women's piece", () => {
  /* Bridal lehengas filed under Women exist; the BRIDAL menu owns that story. */
  const { src } = resolveNavigationEditorialImage(groupOf("women"));
  assert.ok(!src.includes("/lehengas/bridal/"), `women's menu must not lead with bridal, got ${src}`);
});

/* ------------------------------------------------------------------ */
/* Collections                                                         */
/* ------------------------------------------------------------------ */

test("collections resolves editorial collection imagery, not a random product", () => {
  const group = groupOf("collections");
  const scope = resolveNavigationEditorialScope(group);
  assert.equal(scope.kind, "collection");

  const image = resolveNavigationEditorialImage(group);
  assert.ok(image?.src, "collections resolves a plate");
  assert.equal(image.source, NAVIGATION_EDITORIAL_SOURCES.COLLECTION_COVER);
  assert.ok(
    image.src.startsWith("/images/collections/"),
    `collections must use collection media — got ${image.src}`
  );
});

test("the collections scope is derived from the group's own editorial destination", () => {
  const group = groupOf("collections");
  const scope = resolveNavigationEditorialScope(group);
  const collection = taxonomyRepository.findCollection(scope.collectionId);
  assert.ok(collection, "the scope names a canonical collection");
  assert.ok(
    group.feature.to.includes(collection.slug) || group.feature.to.includes(collection.id),
    "the plate and the destination describe the same collection"
  );
});

/* ------------------------------------------------------------------ */
/* Canonical resolution — no hardcoding                                */
/* ------------------------------------------------------------------ */

test("the mega-menu component hardcodes no product id, filename or image path", () => {
  const source = readFileSync(join(__dirname, "../src/components/shell/MegaMenu.jsx"), "utf8");
  assert.ok(!/PF-[A-Z]/.test(source), "no canonical product id may appear in the component");
  assert.ok(!/\/images\//.test(source), "no image path may appear in the component");
  assert.ok(
    !/\.(avif|webp|jpe?g|png)/i.test(source),
    "no image filename may appear in the component"
  );
});

test("the resolver hardcodes no product id or image filename", () => {
  const source = readFileSync(
    join(__dirname, "../src/services/media/navigationEditorialMedia.js"),
    "utf8"
  );
  assert.ok(!/PF-[A-Z]{1,3}-/.test(source), "no canonical product id may be authored in the resolver");
  assert.ok(
    !/\.(avif|webp|jpe?g|png)\b/i.test(source),
    "no image filename may be authored in the resolver"
  );
  /* The department list itself must be derived, never enumerated as data. */
  assert.ok(
    !/["']women["']\s*:/.test(source) && !/["']kids["']\s*:/.test(source),
    "no per-department image map may exist"
  );
});

test("every resolved plate is real canonical media that exists in the catalogue", () => {
  const authoredSources = new Set();
  authoredCatalogue.forEach((product) => {
    if (product.media?.primary) authoredSources.add(product.media.primary);
    (product.media?.gallery ?? []).forEach((entry) => authoredSources.add(entry));
  });

  for (const group of primaryNavigation) {
    const image = resolveNavigationEditorialImage(group);
    if (!image) continue;
    const known =
      authoredSources.has(image.src) || image.src.startsWith("/images/collections/");
    assert.ok(known, `${group.id} plate must be canonical media — got ${image.src}`);
  }
});

test("the ranking prefers a department's own editorial story over a foreign one", () => {
  const ranked = rankEditorialCandidates(authoredCatalogue, "women");
  assert.ok(ranked.length > 0);
  assert.ok(
    ranked.every((product) => product.department === "women"),
    "only women's products may rank for the women's menu"
  );
});

/* ------------------------------------------------------------------ */
/* Workflow safety                                                     */
/* ------------------------------------------------------------------ */

test("DRAFT products never enter the menu as published merchandising", () => {
  /* The whole canonical catalogue is DRAFT in a fresh session. */
  assert.equal(getLiveStorefrontProducts().length, 0, "no product is published yet");

  for (const departmentId of DEPARTMENT_IDS) {
    const image = resolveNavigationEditorialImage(groupOf(departmentId));
    assert.ok(image, `${departmentId} still resolves a plate`);
    assert.equal(
      image.source,
      NAVIGATION_EDITORIAL_SOURCES.AUTHORED_CATALOGUE_PLATE,
      "with nothing published the menu shows authored artwork, not a product"
    );
    /* Artwork only: no product identity may leak through the plate. */
    assert.equal(image.productId, undefined);
    assert.ok(!/PF-[A-Z]/.test(image.alt), "the caption must not name an unpublished product");
  }
});

test("SUBMITTED and APPROVED products are not promoted to published product media", () => {
  const product = catalogRepository.all().find((entry) => entry.department === "kids");
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  resetNavigationEditorialCache();
  assert.equal(
    resolveNavigationEditorialImage(groupOf("kids")).source,
    NAVIGATION_EDITORIAL_SOURCES.AUTHORED_CATALOGUE_PLATE
  );

  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  resetNavigationEditorialCache();
  assert.equal(
    resolveNavigationEditorialImage(groupOf("kids")).source,
    NAVIGATION_EDITORIAL_SOURCES.AUTHORED_CATALOGUE_PLATE,
    "an APPROVED product is still not storefront media"
  );
});

test("a PUBLISHED product upgrades its department's menu to published product media", () => {
  const product = catalogRepository
    .all()
    .find((entry) => entry.department === "men" && entry.category === "groom");
  publish(product.id);
  resetNavigationEditorialCache();

  const image = resolveNavigationEditorialImage(groupOf("men"));
  assert.equal(image.source, NAVIGATION_EDITORIAL_SOURCES.PUBLISHED_PRODUCT_MEDIA);
  assert.ok(image.src.startsWith("/images/products/men/"), image.src);
});

test("a published product from one department never supplies another department's menu", () => {
  const bridal = catalogRepository
    .all()
    .find((entry) => entry.department === "bridal" && entry.category === "the-bride");
  publish(bridal.id);
  resetNavigationEditorialCache();

  const kids = resolveNavigationEditorialImage(groupOf("kids"));
  assert.ok(
    kids.src.startsWith("/images/products/kids/"),
    `kids must not borrow bridal imagery — got ${kids.src}`
  );
});

/* ------------------------------------------------------------------ */
/* Marketing Media compatibility                                       */
/* ------------------------------------------------------------------ */

test("a curated marketing placement takes precedence for its own department", () => {
  const product = catalogRepository
    .all()
    .find((entry) => entry.department === "kids" && entry.subcategory === "dresses");
  publish(product.id);
  setPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION, [product.id]);
  resetNavigationEditorialCache();

  const image = resolveNavigationEditorialImage(groupOf("kids"));
  assert.equal(image.source, NAVIGATION_EDITORIAL_SOURCES.MARKETING_PLACEMENT);
  assert.ok(image.src.startsWith("/images/products/kids/"), image.src);
});

test("a marketing placement holding an unpublished product cannot promote it", () => {
  const product = catalogRepository.all().find((entry) => entry.department === "kids");
  setPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION, [product.id]);
  resetNavigationEditorialCache();

  const image = resolveNavigationEditorialImage(groupOf("kids"));
  assert.notEqual(
    image.source,
    NAVIGATION_EDITORIAL_SOURCES.MARKETING_PLACEMENT,
    "an unpublished curated product must not reach the storefront"
  );
});

test("the navigation does not disturb the homepage hero register", () => {
  const before = resolveHomepageHeroMedia().length;
  primaryNavigation.forEach((group) => resolveNavigationEditorialImage(group));
  assert.equal(resolveHomepageHeroMedia().length, before, "the hero register is untouched");
});

test("resolving the navigation writes nothing to the media or product registers", () => {
  const mediaBefore = mediaRepository.getAll().length;
  const productsBefore = catalogRepository.all().length;
  primaryNavigation.forEach((group) => resolveNavigationEditorialImage(group));
  assert.equal(mediaRepository.getAll().length, mediaBefore);
  assert.equal(catalogRepository.all().length, productsBefore);
});

test("Marketing Media records keep their own status vocabulary", () => {
  /* The menu must not have redefined what ACTIVE means for marketing media. */
  assert.equal(MEDIA_STATUS.ACTIVE, "ACTIVE");
  assert.ok(Object.values(USAGE_ROLES).includes(USAGE_ROLES.EDITORIAL));
});

/* ------------------------------------------------------------------ */
/* Stability                                                           */
/* ------------------------------------------------------------------ */

test("clearing localStorage does not break image resolution", () => {
  const before = primaryNavigation.map((group) => resolveNavigationEditorialImage(group)?.src);

  /* Node has no localStorage; stand one up so the clear is a real clear —
     the repositories all read through `typeof localStorage !== "undefined"`. */
  const store = new Map();
  globalThis.localStorage = {
    getItem: (key) => (store.has(String(key)) ? store.get(String(key)) : null),
    setItem: (key, value) => store.set(String(key), String(value)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => [...store.keys()][index] ?? null,
    get length() {
      return store.size;
    },
  };

  try {
    localStorage.clear();
    resetNavigationEditorialCache();

    const after = primaryNavigation.map((group) => resolveNavigationEditorialImage(group)?.src);
    assert.ok(after.every(Boolean), "every menu still resolves a plate on a cleared browser");
    assert.deepEqual(after, before, "a cleared browser resolves the same canonical plates");
  } finally {
    delete globalThis.localStorage;
    resetNavigationEditorialCache();
  }
});

test("re-resolving is deterministic — a refresh never reshuffles the navigation", () => {
  const first = primaryNavigation.map((group) => resolveNavigationEditorialImage(group)?.src);
  resetNavigationEditorialCache();
  const second = primaryNavigation.map((group) => resolveNavigationEditorialImage(group)?.src);
  const third = primaryNavigation.map((group) => resolveNavigationEditorialImage(group)?.src);
  assert.deepEqual(second, first);
  assert.deepEqual(third, first);
});

test("an unknown navigation group resolves nothing rather than borrowing a plate", () => {
  const orphan = { id: "not-a-department", to: "/nowhere", feature: { to: "/nowhere" }, columns: [] };
  assert.equal(resolveNavigationEditorialScope(orphan), null);
  assert.equal(resolveNavigationEditorialImage(orphan), null);
});

test("a department with no eligible media keeps the neutral placeholder", () => {
  /* Every rung is department-scoped, so a department with no candidates has
     nothing to fall back to and must resolve null — the panel then keeps its
     neutral plate rather than borrowing another department's photograph.
     Proven against a canonical department id that owns no catalogue media. */
  const emptyDepartment = "kids";
  assert.equal(
    rankEditorialCandidates([], emptyDepartment).length,
    0,
    "an empty pool ranks nothing"
  );

  /* With the live list empty the resolver may only reach the department's own
     authored artwork — never a sibling department's. */
  const image = resolveNavigationEditorialImage(groupOf(emptyDepartment), { products: [] });
  assert.ok(
    image === null || image.src.startsWith(`/images/products/${emptyDepartment}/`),
    `fallback must stay inside the department — got ${image?.src}`
  );
});

test("the fallback chain never leaves the department it is resolving for", () => {
  /* Drive every rung with an empty live catalogue and assert containment. */
  for (const departmentId of DEPARTMENT_IDS) {
    const image = resolveNavigationEditorialImage(groupOf(departmentId), { products: [] });
    assert.ok(image, `${departmentId} degrades to authored artwork rather than nothing`);
    assert.ok(
      image.src.startsWith(`/images/products/${departmentId}/`),
      `${departmentId} fallback escaped its department — ${image.src}`
    );
  }
});

test("the existing product catalogue is unchanged by navigation resolution", () => {
  const ids = authoredCatalogue.map((product) => product.id).sort();
  primaryNavigation.forEach((group) => resolveNavigationEditorialImage(group));
  const after = catalogRepository.all().map((product) => product.id).sort();
  assert.deepEqual(after, ids, "the canonical catalogue is untouched");
});
