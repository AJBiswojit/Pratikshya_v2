/**
 * PRATIKSHYA FASHON — Collections storefront resolution contracts.
 *
 * The Collections routes must resolve products from the SAME canonical
 * catalogue the department pages use — through the same generic query engine
 * — never from a hardcoded list. Collection membership lives in the canonical
 * Product record (fabric / collections / isNew), so it survives a LocalStorage
 * clear and is independent of any page-level array.
 *
 *   route → resolveNavigationScope → scope filters → queryCatalogue
 *
 * This file locks that down for every collection (4 editorial + 4 fabric) and
 * guards against cross-collection leakage and "show everything" fallbacks.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";

import catalogRepository, {
  persistCanonicalCatalogueState,
} from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { products as authoredProducts } from "../src/data/catalog/products.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { resolveNavigationScope } from "../src/data/products/taxonomy.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

/** Publishes the whole canonical catalogue so every collection is measurable. */
const publishWholeCatalogue = () => {
  persistCanonicalCatalogueState(
    catalogRepository.all().map((record) => ({ ...record, status: "PUBLISHED" })),
    "collection-resolution-test"
  );
  return getLiveStorefrontProducts();
};

/** Runs a collection route exactly the way `CatalogueListing` does. */
const listing = (path, options = {}) => {
  const scope = resolveNavigationScope(path);
  assert.ok(scope, `${path} resolves a storefront context`);
  return queryCatalogue({ scopeFilters: scope.filters, ...options });
};

/** The canonical media plate every ProductCard must show. */
const primaryOf = (product) =>
  product.images?.primary?.src ?? product.image?.src ?? product.image;

/**
 * The eight storefront collections and, for each, the data-driven membership
 * predicate that defines "belongs to this collection" in canonical terms.
 */
const COLLECTIONS = [
  { path: "/collections/new-arrivals", label: "New Arrivals", check: (p) => p.isNew === true },
  { path: "/collections/festive-edit", label: "Festive Edit", check: (p) => p.collectionIds?.includes("festive-edit") },
  { path: "/collections/heritage-weaves", label: "Heritage Weaves", check: (p) => p.collectionIds?.includes("heritage-weaves") },
  { path: "/collections/handloom-stories", label: "Handloom Stories", check: (p) => p.collectionIds?.includes("handloom-stories") },
  { path: "/collections/cotton", label: "Cotton", check: (p) => p.fabric === "Cotton" },
  { path: "/collections/silk", label: "Silk", check: (p) => p.fabric === "Silk" },
  { path: "/collections/linen", label: "Linen", check: (p) => p.fabric === "Linen" },
  { path: "/collections/chiffon", label: "Chiffon", check: (p) => p.fabric === "Chiffon" },
];

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

/* ------------------------------------------------------------------ */
/* Canonical membership lives in the product record                    */
/* ------------------------------------------------------------------ */

test("collection membership is data-driven metadata on the canonical record", () => {
  /* With no admin writes the register is the authored seed; membership must
     come from these records, not from any page or LocalStorage. */
  const records = catalogRepository.all();
  assert.equal(records.length, authoredProducts.length);

  const withFabric = records.filter((record) => record.fabric);
  const withCollections = records.filter((record) => Array.isArray(record.collections));
  const withArrival = records.filter((record) => record.isNew);

  assert.ok(withFabric.length > 0, "some records carry fabric metadata");
  assert.ok(withCollections.length > 0, "some records carry collection membership");
  assert.ok(withArrival.length > 0, "some records carry the new-arrival flag");

  const fabricValues = new Set(withFabric.map((record) => record.fabric));
  for (const required of ["Cotton", "Silk", "Linen", "Chiffon"]) {
    assert.ok(fabricValues.has(required), `fabric collection ${required} is represented`);
  }

  /* Every collection id referenced on a product resolves to an ACTIVE record,
     so membership is meaningful rather than a dangling string. */
  const collectionIds = new Set(
    records.flatMap((record) => record.collections ?? [])
  );
  for (const id of collectionIds) {
    const collection = taxonomyRepository.findCollection(id);
    assert.ok(collection, `collection ${id} exists`);
    assert.equal(collection.displayStatus, "ACTIVE", `collection ${id} is active`);
  }
});

/* ------------------------------------------------------------------ */
/* Per-collection resolution                                            */
/* ------------------------------------------------------------------ */

for (const collection of COLLECTIONS) {
  test(`${collection.label} resolves canonical products that belong to it`, () => {
    publishWholeCatalogue();
    const { results, total } = listing(collection.path);

    assert.ok(total > 0, `${collection.label} returns products`);
    assert.equal(results.length, total, "count is the full result-set length");

    /* Products actually belong to the requested collection. */
    results.forEach((product) =>
      assert.ok(
        collection.check(product),
        `${product.id} belongs to ${collection.label}`
      )
    );

    /* No unrelated products leak in. */
    const unrelated = getLiveStorefrontProducts().filter(
      (product) => !collection.check(product)
    );
    unrelated.forEach((product) =>
      assert.equal(
        results.some((entry) => entry.id === product.id),
        false,
        `${collection.label} must not contain unrelated ${product.id}`
      )
    );
  });
}

for (const collection of COLLECTIONS) {
  test(`${collection.label} count is dynamic and its cards use canonical media`, () => {
    const published = publishWholeCatalogue();

    /* Dynamic count: equals the number of published products that genuinely
       match the collection's data-driven membership predicate. */
    const expected = published.filter(collection.check).length;
    const { results, total } = listing(collection.path);
    assert.equal(total, expected, `${collection.label} count is derived, not hardcoded`);

    /* Cards resolve the canonical Product Media of each member. */
    results.forEach((product) => {
      const canonical = catalogRepository.find(product.id);
      assert.ok(canonical, `${product.id} is a canonical product`);
      assert.equal(primaryOf(product), canonical.image, `${product.id} shows its own media`);
      if (/\.avif$/.test(canonical.image)) {
        assert.match(primaryOf(product), /\.avif$/, `${product.id} AVIF plate stays AVIF`);
      }
    });
  });
}

/* ------------------------------------------------------------------ */
/* Visibility and empty-state integrity                                */
/* ------------------------------------------------------------------ */

test("collections obey the publishing lifecycle — DRAFT stays hidden, PUBLISHED appears", () => {
  const route = COLLECTIONS[0].path;
  assert.equal(listing(route).total, 0, "DRAFT catalogue is not on the storefront");

  const target = catalogRepository
    .all()
    .find((record) => (route === "/collections/new-arrivals" ? record.isNew : record.fabric));
  assert.ok(target, "a candidate canonical record exists");
  assert.equal(
    getLiveStorefrontProducts().some((entry) => entry.id === target.id),
    false,
    "the piece is hidden before publication"
  );

  persistCanonicalCatalogueState(
    catalogRepository.all().map((record) => ({
      ...record,
      status: record.id === target.id ? "PUBLISHED" : "DRAFT",
    })),
    "collection-publish-test"
  );

  const after = listing(route);
  assert.ok(
    after.results.some((entry) => entry.id === target.id),
    "the published member appears"
  );
  after.results.forEach((entry) =>
    assert.equal(catalogRepository.find(entry.id).status, "PUBLISHED")
  );
});

test("an empty collection scope stays empty — no fallback to the whole catalogue", () => {
  publishWholeCatalogue();
  const live = getLiveStorefrontProducts();

  /* A fabric that no canonical product carries resolves to zero, and zero must
     be honoured rather than replaced with unrelated products. */
  const impossible = queryCatalogue({
    scopeFilters: { fabric: "Velvet" },
  });
  assert.equal(impossible.total, 0);
  assert.deepEqual(impossible.results, []);

  /* A real fabric scope is never the complete catalogue. */
  for (const collection of COLLECTIONS) {
    const { total } = listing(collection.path);
    assert.ok(total < live.length, `${collection.label} is not the whole catalogue`);
  }
});

/* ------------------------------------------------------------------ */
/* Direct navigation, refresh and LocalStorage independence            */
/* ------------------------------------------------------------------ */

test("direct collection URLs resolve statelessly — repeat resolution is identical", () => {
  publishWholeCatalogue();
  for (const collection of COLLECTIONS) {
    const first = listing(collection.path).results.map((entry) => entry.id);
    /* An intervening route must not colour the next resolution. */
    listing("/women");
    const second = listing(collection.path).results.map((entry) => entry.id);
    assert.ok(first.length > 0, `${collection.path} resolves on direct navigation`);
    assert.deepEqual(second, first, `${collection.path} is resolved from the URL alone`);
  }
});

test("clearing persisted product state does not destroy canonical collection membership", () => {
  /* Simulate an empty register (fresh LocalStorage): the repository derives
     the canonical catalogue from the authored seed, which carries the
     fabric / collections / isNew membership. */
  persistCanonicalCatalogueState(null, "storage-cleared");
  const rebuilt = catalogRepository.all();
  assert.equal(rebuilt.length, authoredProducts.length, "the seed rebuilds the catalogue");

  const withFabric = rebuilt.filter((record) => record.fabric).length;
  const withCollections = rebuilt.filter((record) => Array.isArray(record.collections)).length;
  assert.ok(withFabric > 0, "fabric membership survives a storage clear");
  assert.ok(withCollections > 0, "collection membership survives a storage clear");

  /* Publishing the rebuilt records resolves the same collections. */
  publishWholeCatalogue();
  for (const collection of COLLECTIONS) {
    const { total } = listing(collection.path);
    assert.ok(total > 0, `${collection.label} resolves after a storage clear`);
  }
});

/* ------------------------------------------------------------------ */
/* Cross-collection leak regression                                    */
/* ------------------------------------------------------------------ */

test("Cotton never returns Silk-only products (and vice versa)", () => {
  publishWholeCatalogue();
  const cotton = listing("/collections/cotton").results;
  const silk = listing("/collections/silk").results;

  cotton.forEach((product) => assert.equal(product.fabric, "Cotton"));
  silk.forEach((product) => assert.equal(product.fabric, "Silk"));

  const cottonIds = new Set(cotton.map((product) => product.id));
  silk.forEach((product) =>
    assert.equal(cottonIds.has(product.id), false, "Silk product must not leak into Cotton")
  );
});

test("editorial collections never degrade into the whole catalogue", () => {
  publishWholeCatalogue();
  const live = getLiveStorefrontProducts().length;

  for (const collection of COLLECTIONS.filter((entry) =>
    ["new-arrivals", "festive-edit", "heritage-weaves", "handloom-stories"].some(
      (slug) => entry.path.endsWith(`/${slug}`)
    )
  )) {
    const { results, total } = listing(collection.path);
    assert.ok(total > 0, `${collection.label} resolves products`);
    assert.ok(total < live, `${collection.label} does not return every product`);
    assert.equal(results.length, total);
    results.forEach((product) =>
      assert.ok(collection.check(product), `${product.id} genuinely belongs to ${collection.label}`)
    );
  }
});
