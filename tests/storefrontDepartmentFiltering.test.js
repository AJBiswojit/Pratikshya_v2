/**
 * PRATIKSHYA FASHON — Storefront department filtering contracts.
 *
 * The storefront resolves ONE canonical catalogue through ONE query engine.
 * A listing route only changes the storefront context handed to that engine:
 *
 *   route → resolveNavigationScope → scope filters → queryCatalogue
 *
 * These tests lock that chain down. They exist because the department routes
 * once resolved an empty scope (the navigation table returned a bare filter
 * map where the page read `scope.filters`), so `/women`, `/bridal`, `/men`
 * and `/kids` all rendered the complete catalogue.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, {
  persistCanonicalCatalogueState,
} from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { catalogueRoutes, departments } from "../src/data/catalog/taxonomy.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import { resolveNavigationScope } from "../src/data/products/taxonomy.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

/**
 * Mirrors `PAGE_SIZE` in `src/hooks/useCatalogueQuery.js`. The hook itself is
 * React-bound, so the page size is asserted against the hook's source below
 * rather than imported.
 */
const PAGE_SIZE = 12;

const DEPARTMENT_ROUTES = departments.map((department) => [department.path, department.id]);

/** The whole authored catalogue, published, so a route's total is measurable. */
const publishWholeCatalogue = () => {
  persistCanonicalCatalogueState(
    catalogRepository.all().map((record) => ({ ...record, status: "PUBLISHED" })),
    "storefront-department-filtering-test"
  );
  return getLiveStorefrontProducts();
};

/** Runs a listing route exactly the way `CatalogueListing` does. */
const listing = (pathname, options = {}) => {
  const scope = resolveNavigationScope(pathname);
  assert.ok(scope, `${pathname} resolves a storefront context`);
  return queryCatalogue({ scopeFilters: scope.filters, ...options });
};

const sourceFilesUnder = (directory) =>
  readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(path);
    return /\.(?:js|jsx)$/.test(entry.name) ? [path] : [];
  });

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

/* ------------------------------------------------------------------ */
/* Route → context resolution                                          */
/* ------------------------------------------------------------------ */

test("every catalogue listing route resolves a department-scoped context", () => {
  for (const route of catalogueRoutes) {
    const scope = resolveNavigationScope(route.path);
    assert.ok(scope, `${route.path} has a storefront context`);
    const segments = route.path.split("/").filter(Boolean);
    assert.equal(scope.filters.department, segments[0], `${route.path} locks its department`);
    if (segments[1]) assert.equal(scope.filters.category, segments[1]);
    if (segments[2]) assert.equal(scope.filters.subcategory, segments[2]);
  }
});

test("a department route never resolves an empty scope", () => {
  for (const [path] of DEPARTMENT_ROUTES) {
    const scope = resolveNavigationScope(path);
    assert.ok(Object.keys(scope.filters).length > 0, `${path} must not query the whole catalogue`);
  }
});

/* ------------------------------------------------------------------ */
/* Department listings                                                 */
/* ------------------------------------------------------------------ */

test("each department route returns only that department, with a derived count", () => {
  const live = publishWholeCatalogue();
  const expected = live.reduce((counts, product) => {
    counts[product.department] = (counts[product.department] ?? 0) + 1;
    return counts;
  }, {});

  let counted = 0;
  for (const [path, departmentId] of DEPARTMENT_ROUTES) {
    const { results, total } = listing(path);
    assert.ok(total > 0, `${path} has published pieces to show`);
    assert.equal(total, results.length, `${path} count is the filtered result count`);
    assert.equal(total, expected[departmentId], `${path} count comes from the canonical catalogue`);
    results.forEach((product) =>
      assert.equal(product.department, departmentId, `${product.id} belongs to ${departmentId}`)
    );
    counted += total;
  }

  /* Departments partition the catalogue: no route may show the full set. */
  assert.equal(counted, live.length);
  DEPARTMENT_ROUTES.forEach(([path]) =>
    assert.notEqual(listing(path).total, live.length, `${path} is not the whole catalogue`)
  );
});

test("no department listing leaks a product from another department", () => {
  publishWholeCatalogue();
  const departmentIds = DEPARTMENT_ROUTES.map(([, id]) => id);

  for (const [path, departmentId] of DEPARTMENT_ROUTES) {
    const ids = new Set(listing(path).results.map((product) => product.id));
    const foreign = departmentIds.filter((entry) => entry !== departmentId);

    for (const other of foreign) {
      const otherRoute = DEPARTMENT_ROUTES.find(([, id]) => id === other)[0];
      listing(otherRoute).results.forEach((product) =>
        assert.equal(ids.has(product.id), false, `${path} must not contain ${other} product ${product.id}`)
      );
    }
  }
});

test("kids resolves through the same generic query as every other department", () => {
  publishWholeCatalogue();
  const kids = listing("/kids");
  const generic = queryCatalogue({ scopeFilters: { department: "kids" } });

  assert.deepEqual(
    kids.results.map((product) => product.id),
    generic.results.map((product) => product.id)
  );
  kids.results.forEach((product) => assert.equal(product.department, "kids"));
});

test("direct navigation to a route is stateless — repeated resolution is identical", () => {
  publishWholeCatalogue();
  for (const [path] of DEPARTMENT_ROUTES) {
    const first = listing(path).results.map((product) => product.id);
    /* A different route in between must not colour the next resolution. */
    listing("/bridal");
    const second = listing(path).results.map((product) => product.id);
    assert.deepEqual(second, first, `${path} resolves from the URL alone`);
  }
});

/* ------------------------------------------------------------------ */
/* Taxonomy, search, sort, pagination                                  */
/* ------------------------------------------------------------------ */

test("category and subcategory routes narrow inside their department", () => {
  publishWholeCatalogue();

  for (const department of departments) {
    const departmentIds = new Set(listing(department.path).results.map((product) => product.id));

    for (const category of department.categories) {
      const categoryResults = listing(category.path).results;
      categoryResults.forEach((product) => {
        assert.equal(product.department, department.id);
        assert.equal(product.category, category.id);
        assert.ok(departmentIds.has(product.id), `${product.id} is inside ${department.path}`);
      });

      for (const subcategory of category.subcategories) {
        listing(subcategory.path).results.forEach((product) => {
          assert.equal(product.department, department.id);
          assert.equal(product.category, category.id);
          assert.equal(product.subcategory, subcategory.id);
        });
      }
    }
  }
});

test("shopper filters apply on top of the route scope, never instead of it", () => {
  publishWholeCatalogue();
  const women = listing("/women").results;
  const category = women[0].category;

  const refined = queryCatalogue({
    scopeFilters: resolveNavigationScope("/women").filters,
    filters: { category },
  });
  assert.ok(refined.total > 0);
  refined.results.forEach((product) => {
    assert.equal(product.department, "women");
    assert.equal(product.category, category);
  });
  assert.ok(refined.total <= women.length);
});

test("search runs against the route's dataset, not the whole catalogue", () => {
  publishWholeCatalogue();
  const term = "saree";

  const inWomen = listing("/women", { search: term }).results;
  const everywhere = queryCatalogue({ search: term }).results;

  assert.ok(inWomen.length > 0, "the term matches inside the department");
  inWomen.forEach((product) => assert.equal(product.department, "women"));
  assert.ok(
    everywhere.length > inWomen.length,
    "the same term matches more pieces outside the department scope"
  );
  assert.equal(
    listing("/kids", { search: term }).results.every((product) => product.department === "kids"),
    true
  );
});

test("sorting happens after department filtering", () => {
  publishWholeCatalogue();
  const ascending = listing("/men", { sort: "price-asc" }).results;
  const descending = listing("/men", { sort: "price-desc" }).results;

  assert.ok(ascending.length > 1);
  assert.equal(ascending.length, descending.length);
  ascending.forEach((product) => assert.equal(product.department, "men"));
  descending.forEach((product) => assert.equal(product.department, "men"));

  for (let index = 1; index < ascending.length; index += 1) {
    assert.ok(ascending[index].price >= ascending[index - 1].price);
    assert.ok(descending[index].price <= descending[index - 1].price);
  }
});

test("pagination reveals the scoped results, never the wider catalogue", () => {
  const live = publishWholeCatalogue();
  const { results, total } = listing("/bridal");

  assert.match(
    readFileSync(join(ROOT, "src/hooks/useCatalogueQuery.js"), "utf8"),
    new RegExp(`PAGE_SIZE\\s*=\\s*${PAGE_SIZE}\\b`),
    "the catalogue hook still reveals one page at a time"
  );

  const firstPage = results.slice(0, PAGE_SIZE);
  const secondPage = results.slice(0, PAGE_SIZE * 2);
  assert.equal(firstPage.length, Math.min(PAGE_SIZE, total));
  assert.ok(secondPage.length > firstPage.length);
  assert.ok(total < live.length);
  secondPage.forEach((product) => assert.equal(product.department, "bridal"));
});

/* ------------------------------------------------------------------ */
/* Visibility and empty results                                        */
/* ------------------------------------------------------------------ */

test("department listings obey the canonical publishing lifecycle", () => {
  const product = catalogRepository.all().find((entry) => entry.department === "men");
  const route = "/men";

  assert.equal(listing(route).total, 0, "DRAFT records stay off the storefront");
  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.equal(listing(route).total, 0, "SUBMITTED records stay off the storefront");
  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.equal(listing(route).total, 0, "APPROVED records stay off the storefront");

  assert.ok(commands.publishProduct(product.id, ADMIN).ok);
  const published = listing(route);
  assert.deepEqual(published.results.map((entry) => entry.id), [product.id]);

  /* The published men's piece appears on its own route only. */
  ["/women", "/bridal", "/kids"].forEach((other) =>
    assert.equal(
      listing(other).results.some((entry) => entry.id === product.id),
      false
    )
  );
});

test("a zero-result scope stays at zero — there is no fallback to all products", () => {
  const live = publishWholeCatalogue();
  assert.ok(live.length > 0);

  const impossible = queryCatalogue({
    scopeFilters: { ...resolveNavigationScope("/kids").filters, category: "sarees" },
  });
  assert.equal(impossible.total, 0);
  assert.deepEqual(impossible.results, []);

  const impossibleFilter = queryCatalogue({
    scopeFilters: resolveNavigationScope("/women").filters,
    filters: { department: "men" },
  });
  assert.equal(impossibleFilter.total, 0);
});

/* ------------------------------------------------------------------ */
/* Collections — merchandising context, not a department               */
/* ------------------------------------------------------------------ */

test("/collections resolves through the canonical collection curation, not the catalogue", () => {
  const live = publishWholeCatalogue();
  const scope = resolveNavigationScope("/collections");
  assert.deepEqual(scope.filters, { curated: true });

  const baseline = listing("/collections");
  assert.ok(baseline.total < live.length, "collections is never the complete catalogue");

  /* Curate a product that is NOT already in an active collection, so adding
     it to one collection observably grows the curated set. */
  const notCurated = live.filter(
    (product) => taxonomyRepository.collectionsForProduct(product).length === 0
  );
  assert.ok(notCurated.length >= 3, "some published pieces are outside every collection");
  const chosen = notCurated.slice(0, 3).map((product) => product.id);

  const collection = taxonomyRepository.activeCollections()[0];
  const original = collection.productIds;

  try {
    assert.ok(taxonomyRepository.updateCollection(collection.id, { productIds: chosen }, ADMIN).ok);
    const curated = listing("/collections");
    assert.equal(curated.total, baseline.total + chosen.length);
    chosen.forEach((id) =>
      assert.ok(curated.results.some((product) => product.id === id), `${id} is curated in`)
    );
    curated.results.forEach((product) =>
      assert.ok(
        taxonomyRepository
          .collectionsForProduct(product)
          .some((entry) => entry.displayStatus === "ACTIVE"),
        `${product.id} belongs to an active collection`
      )
    );
  } finally {
    taxonomyRepository.updateCollection(collection.id, { productIds: original }, ADMIN);
  }
});

test("membership of a paused collection does not curate a product into /collections", () => {
  const live = publishWholeCatalogue();
  /* Pick a piece that is NOT otherwise curated, so pausing the one collection
     it belongs to is the only thing keeping it off /collections. */
  const notCurated = live.find(
    (product) => taxonomyRepository.collectionsForProduct(product).length === 0
  );
  assert.ok(notCurated, "some published piece sits outside every collection");
  const collection = taxonomyRepository.activeCollections()[0];
  const original = { productIds: collection.productIds, status: collection.status };
  const chosen = [notCurated.id];

  try {
    taxonomyRepository.updateCollection(
      collection.id,
      { productIds: chosen, status: "PAUSED" },
      ADMIN
    );
    const curated = listing("/collections");
    assert.equal(
      curated.results.some((product) => product.id === chosen[0]),
      false
    );
  } finally {
    taxonomyRepository.updateCollection(collection.id, original, ADMIN);
  }
});

/* ------------------------------------------------------------------ */
/* Canonical records and source hygiene                                */
/* ------------------------------------------------------------------ */

test("listings hand the ProductGrid canonical product records and their own media", () => {
  publishWholeCatalogue();

  for (const [path, departmentId] of DEPARTMENT_ROUTES) {
    for (const product of listing(path).results) {
      const canonical = catalogRepository.find(product.id);
      assert.ok(canonical, `${product.id} exists in the canonical catalogue`);
      assert.equal(product.name, canonical.name);
      assert.equal(product.price, canonical.price);
      assert.equal(product.category, canonical.category);
      assert.equal(product.department, departmentId);

      const primary = product.images?.primary?.src ?? product.image?.src ?? product.image;
      assert.equal(primary, canonical.image, `${product.id} shows its own primary plate`);
      assert.match(primary, new RegExp(`/${product.id}/primary\\.[a-z0-9]+$`));
      if (/\.avif$/.test(canonical.image)) {
        assert.match(primary, /\.avif$/, "AVIF plates stay AVIF — no conversion");
      }
    }
  }
});

test("storefront listing surfaces hold no hardcoded products", () => {
  const canonical = catalogRepository.all();
  const productIds = canonical.map((product) => String(product.id));
  const productNames = canonical.map((product) => product.name);

  const surfaces = [
    ...sourceFilesUnder(join(ROOT, "src/pages")),
    ...sourceFilesUnder(join(ROOT, "src/components/storefront")),
    join(ROOT, "src/hooks/useCatalogueQuery.js"),
    join(ROOT, "src/data/products/query.js"),
    join(ROOT, "src/data/products/taxonomy.js"),
  ];

  for (const path of surfaces) {
    const source = readFileSync(path, "utf8");
    const label = path.slice(ROOT.length + 1);

    productIds.forEach((id) =>
      assert.equal(source.includes(id), false, `${label} must not hardcode Product ID ${id}`)
    );
    productNames.forEach((name) =>
      assert.equal(source.includes(name), false, `${label} must not hardcode "${name}"`)
    );
    assert.doesNotMatch(
      source,
      /\/images\/products\//,
      `${label} must not hardcode Product Media paths`
    );
    assert.doesNotMatch(
      source,
      /(?:women|bridal|men|kids)Products\s*=/i,
      `${label} must not author a department product array`
    );
  }
});
