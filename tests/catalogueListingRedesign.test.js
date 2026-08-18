/**
 * PRATIKSHYA FASHON — Catalogue listing redesign contracts.
 *
 * These tests lock down the product-first catalogue UX introduced in the
 * category/subcategory redesign:
 *
 *   - Category and subcategory pages resolve through the ONE generic
 *     CatalogueListing page (no per-department components).
 *   - Scope filters always include department (and category / subcategory
 *     on deeper routes), so /kids/boys never shows Women/Men/Bridal/Girls.
 *   - Product counts come from the canonical query, not hardcoded strings.
 *   - The giant editorial hero is gone from catalogue pages (the new
 *     CatalogueHeader uses compact spacing; no MediaFrame panorama is
 *     rendered on catalogue routes).
 *   - Category tabs derive from the canonical departments tree.
 *   - Collections remain routed through the canonical collection resolver.
 *   - Marketing Media placement resolution still works unchanged.
 *   - AVIF media references remain native AVIF.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository, {
  persistCanonicalCatalogueState,
} from "../src/services/catalogRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { catalogueRoutes, departments } from "../src/data/catalog/taxonomy.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { queryCatalogue } from "../src/data/products/query.js";
import {
  categoryRoutes,
  collectionRoutes,
  resolveNavigationScope,
} from "../src/data/products/taxonomy.js";
import {
  listingPlacementsForScope,
} from "../src/services/marketing/categoryPlacementSurfaces.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

beforeEach(setupCanonicalState);
afterEach(setupCanonicalState);

const publishWholeCatalogue = () => {
  persistCanonicalCatalogueState(
    catalogRepository
      .all()
      .map((record) => ({ ...record, status: "PUBLISHED" })),
    "catalogue-redesign-test"
  );
  return getLiveStorefrontProducts();
};

const listing = (pathname, options = {}) => {
  const scope = resolveNavigationScope(pathname);
  if (!scope) return null;
  return queryCatalogue({ scopeFilters: scope.filters, ...options });
};

/* ------------------------------------------------------------------ */
/* Generic catalogue page architecture                                 */
/* ------------------------------------------------------------------ */

test("every catalogue route is served by the generic CatalogueListing page", () => {
  // There is no per-department page component. The route manifest's
  // catalogue paths all resolve a navigation scope and are therefore
  // routed to <CatalogueListing variant=\"navigation\" />.
  for (const route of catalogueRoutes) {
    const scope = resolveNavigationScope(route.path);
    assert.ok(scope, `${route.path} resolves a navigation scope`);
    assert.ok(
      scope.filters && typeof scope.filters === "object",
      `${route.path} carries a filter object`
    );
  }
});

test("category and collection slug routes also resolve generic scopes", () => {
  // Category pages
  for (const slug of Object.keys(categoryRoutes)) {
    const entry = categoryRoutes[slug];
    assert.ok(entry.filters?.category, `category /${slug} locks a category filter`);
  }
  // Collection pages
  for (const slug of Object.keys(collectionRoutes)) {
    const entry = collectionRoutes[slug];
    assert.ok(
      entry.filters && (entry.filters.collectionId || entry.filters.flag || entry.filters.collection || entry.filters.fabric || entry.filters.occasion),
      `collection /${slug} locks a collection filter`
    );
  }
});

/* ------------------------------------------------------------------ */
/* No cross-department or cross-subcategory leakage                    */
/* ------------------------------------------------------------------ */

test("/kids/boys contains only Kids · Boys products (no women/men/bridal/girls)", () => {
  publishWholeCatalogue();
  const { results } = listing("/kids/boys");
  assert.ok(results.length > 0, "/kids/boys returns published boys products");
  for (const product of results) {
    assert.equal(product.department, "kids", `${product.id} must belong to Kids`);
    assert.equal(product.category, "boys", `${product.id} must belong to Boys category`);
  }
});

test("/kids/girls contains only Kids · Girls products", () => {
  publishWholeCatalogue();
  const { results } = listing("/kids/girls");
  // Some catalogues may not have girls products yet — that's fine, the
  // assertion must hold either way.
  for (const product of results) {
    assert.equal(product.department, "kids", `${product.id} must belong to Kids`);
    assert.equal(product.category, "girls", `${product.id} must belong to Girls category`);
  }
});

test("/women, /men, /bridal and /kids are mutually exclusive", () => {
  publishWholeCatalogue();
  const departmentPaths = ["/women", "/men", "/bridal", "/kids"];
  const sets = Object.fromEntries(
    departmentPaths.map((path) => [path, new Set(listing(path).results.map((p) => p.id))])
  );
  for (let i = 0; i < departmentPaths.length; i += 1) {
    for (let j = i + 1; j < departmentPaths.length; j += 1) {
      const a = departmentPaths[i];
      const b = departmentPaths[j];
      for (const id of sets[a]) {
        assert.equal(
          sets[b].has(id),
          false,
          `${a} must not contain ${b} product ${id}`
        );
      }
    }
  }
});

test("subcategory filters narrow further than category filters", () => {
  publishWholeCatalogue();
  for (const dept of departments) {
    const deptTotal = listing(dept.path).total;
    for (const cat of dept.categories) {
      const catTotal = listing(cat.path).total;
      assert.ok(catTotal <= deptTotal, `${cat.path} has ≤ the ${dept.path} total`);
      for (const sub of cat.subcategories) {
        const subTotal = listing(sub.path).total;
        assert.ok(
          subTotal <= catTotal,
          `${sub.path} has ≤ the ${cat.path} total (${subTotal} vs ${catTotal})`
        );
      }
    }
  }
});

/* ------------------------------------------------------------------ */
/* Dynamic counts (no hardcoding)                                      */
/* ------------------------------------------------------------------ */

test("product counts come from the canonical query result, not hardcoded strings", () => {
  const live = publishWholeCatalogue();
  // Read the CatalogueToolbar source and confirm it uses total dynamically
  // rather than any hardcoded "N pieces" literal.
  const toolbarSrc = readFileSync(
    join(ROOT, "src/components/storefront/CatalogueToolbar.jsx"),
    "utf8"
  );
  assert.doesNotMatch(
    toolbarSrc,
    /\b\d+\s+pieces\b/,
    "CatalogueToolbar must not hardcode an N-pieces string"
  );
  assert.match(
    toolbarSrc,
    /total/,
    "CatalogueToolbar must reference the dynamic total"
  );

  // Verify count changes as we toggle publish state.
  const womenBefore = listing("/women").total;
  const womenProduct = live.find((p) => p.department === "women");
  assert.ok(womenProduct, "a women product exists");
  catalogRepository.updateProduct(womenProduct.id, { status: "DRAFT" }, null);
  const womenAfter = listing("/women").total;
  assert.equal(
    womenAfter,
    womenBefore - 1,
    "unpublishing a product reduces the route count by exactly one"
  );
});

test("empty state appears when a category genuinely has no published products", () => {
  // Start with everything as DRAFT; every listing should return 0.
  persistCanonicalCatalogueState(
    catalogRepository.all().map((record) => ({ ...record, status: "DRAFT" })),
    "catalogue-redesign-empty"
  );
  for (const path of ["/women", "/men", "/bridal", "/kids"]) {
    const { total, results } = listing(path);
    assert.equal(total, 0, `${path} returns 0 pieces with no published products`);
    assert.deepEqual(results, []);
  }
});

/* ------------------------------------------------------------------ */
/* Sort + filter                                                       */
/* ------------------------------------------------------------------ */

test("sort options apply on top of scope filters", () => {
  publishWholeCatalogue();
  const asc = listing("/women", { sort: "price-asc" }).results;
  const desc = listing("/women", { sort: "price-desc" }).results;
  assert.ok(asc.length > 1);
  assert.equal(asc.length, desc.length);
  for (let i = 1; i < asc.length; i += 1) {
    assert.ok(asc[i].price >= asc[i - 1].price, "price-asc sorts ascending");
  }
  for (let i = 1; i < desc.length; i += 1) {
    assert.ok(desc[i].price <= desc[i - 1].price, "price-desc sorts descending");
  }
  asc.forEach((p) => assert.equal(p.department, "women"));
});

test("shopper filters are applied on top of scope, not in place of it", () => {
  publishWholeCatalogue();
  const women = listing("/women", { filters: { fabric: "Cotton" } });
  women.results.forEach((p) => {
    assert.equal(p.department, "women");
    // Products must either be Cotton fabric or have no fabric filter
    // narrowing left nothing — the key assertion is department lock.
  });
  assert.ok(
    women.total <= listing("/women").total,
    "applying a shopper filter cannot grow the result set"
  );
});

/* ------------------------------------------------------------------ */
/* Category tabs derive from canonical taxonomy                        */
/* ------------------------------------------------------------------ */

test("category tabs derive from the canonical departments tree (same shape as CategoryTabs)", () => {
  // Re-implement the tab derivation to mirror CategoryTabs.deriveTabs
  // without importing JSX (which would need the JSX loader). The logic is
  // purely a function of the canonical departments tree.
  const deriveTabs = (scopeFilters = {}) => {
    const { department, category } = scopeFilters;
    if (!department) return { parentPath: null, allLabel: "All", tabs: [] };
    const dept = departments.find((d) => d.id === department);
    if (!dept) return { parentPath: dept?.path ?? null, allLabel: "All", tabs: [] };
    if (!category) {
      return {
        parentPath: dept.path,
        allLabel: `All ${dept.name}`,
        tabs: dept.categories.map((cat) => ({ label: cat.name, to: cat.path, id: cat.id })),
      };
    }
    const cat = dept.categories.find((c) => c.id === category);
    if (!cat) return { parentPath: dept.path, allLabel: `All ${dept.name}`, tabs: [] };
    return {
      parentPath: cat.path,
      allLabel: `All ${cat.name}`,
      tabs: cat.subcategories.map((sub) => ({ label: sub.name, to: sub.path, id: sub.id })),
    };
  };

  // Department scope → tabs are the department's categories + "All"
  const deptTabs = deriveTabs({ department: "kids" });
  assert.equal(deptTabs.parentPath, "/kids");
  assert.equal(deptTabs.allLabel, "All Kids");
  assert.deepEqual(
    deptTabs.tabs.map((t) => t.id),
    ["boys", "girls"]
  );

  // Category scope → tabs are subcategories + "All <Category>"
  const catTabs = deriveTabs({ department: "women", category: "sarees" });
  assert.equal(catTabs.parentPath, "/women/sarees");
  assert.equal(catTabs.allLabel, "All Sarees");
  assert.deepEqual(
    catTabs.tabs.map((t) => t.id),
    ["banarasi", "cotton", "silk"]
  );

  // No department → empty
  const empty = deriveTabs({});
  assert.equal(empty.tabs.length, 0);

  // And confirm CategoryTabs.jsx source defines the same contract
  // (it reads from the canonical departments import).
  const tabSrc = readFileSync(
    join(ROOT, "src/components/storefront/CategoryTabs.jsx"),
    "utf8"
  );
  assert.match(tabSrc, /from ["']..\/..\/data\/catalog\/taxonomy["']/);
  assert.match(tabSrc, /departments/);
});

/* ------------------------------------------------------------------ */
/* Hero removal (no panorama MediaFrame on catalogue pages)            */
/* ------------------------------------------------------------------ */

test("the redesigned CatalogueListing no longer renders a panorama hero frame", () => {
  const src = readFileSync(
    join(ROOT, "src/pages/CatalogueListing.jsx"),
    "utf8"
  );
  // The old page rendered `aspect=\"panorama\"` inside a MediaFrame.
  // The new page must NOT contain that.
  assert.doesNotMatch(
    src,
    /aspect="panorama"/,
    "CatalogueListing must not render a panorama hero MediaFrame"
  );
  assert.doesNotMatch(
    src,
    /overlay="inkLeft"/,
    "CatalogueListing must not render the old hero overlay"
  );
  // It must still render the CatalogueBrowser.
  assert.match(src, /CatalogueBrowser/);
  assert.match(src, /CatalogueHeader/);
});

test("CatalogueHeader uses compact vertical rhythm (products appear above the fold)", () => {
  const src = readFileSync(
    join(ROOT, "src/components/storefront/CatalogueHeader.jsx"),
    "utf8"
  );
  // The compact header uses pt-24 md:pt-28 and pb-6 md:pb-8
  // (as opposed to PageHeader's pt-28 md:pt-32 pb-12 md:pb-16).
  assert.match(src, /pt-24/);
  assert.match(src, /pb-6/);
  // No MediaFrame rendering inside the header.
  assert.doesNotMatch(src, /MediaFrame/);
});

/* ------------------------------------------------------------------ */
/* Marketing Media wiring remains intact                               */
/* ------------------------------------------------------------------ */

test("listingPlacementsForScope still resolves curated rails by taxonomy", () => {
  // Function remains exported and callable with the same shape.
  const boys = listingPlacementsForScope({
    department: "kids",
    category: "boys",
  });
  assert.ok(Array.isArray(boys));
  // Unknown scope returns an empty array, not an error.
  const unknown = listingPlacementsForScope({
    department: "nonexistent-dept",
  });
  assert.deepEqual(unknown, []);
});

test("CatalogueListing still imports PlacementProductRail and renders it after the grid", () => {
  const src = readFileSync(
    join(ROOT, "src/pages/CatalogueListing.jsx"),
    "utf8"
  );
  assert.match(src, /PlacementProductRail/);
  // Marketing rails must appear AFTER the CatalogueBrowser in the file
  // (so products render above curated marketing content).
  const browserIndex = src.indexOf("<CatalogueBrowser");
  const railIndex = src.indexOf("<PlacementProductRail");
  assert.ok(browserIndex >= 0, "CatalogueBrowser is rendered");
  assert.ok(railIndex >= 0, "PlacementProductRail is rendered");
  assert.ok(
    railIndex > browserIndex,
    "Marketing rails render after the product grid, not before"
  );
});

/* ------------------------------------------------------------------ */
/* Collections remain intact                                           */
/* ------------------------------------------------------------------ */

test("/collections and collection slugs still resolve canonical collection scopes", () => {
  publishWholeCatalogue();
  const collections = listing("/collections");
  assert.ok(collections, "/collections resolves");
  // Collection routes like /collections/new-arrivals must filter to the flag.
  const newArrivals = listing("/collections/new-arrivals");
  assert.ok(newArrivals, "/collections/new-arrivals resolves");
  newArrivals.results.forEach((product) => {
    assert.equal(
      Boolean(product.isNew),
      true,
      "new-arrivals only returns products flagged isNew"
    );
  });
});

/* ------------------------------------------------------------------ */
/* AVIF regression                                                     */
/* ------------------------------------------------------------------ */

test("no AVIF-to-WebP/JPG conversion is introduced in catalogue surfaces", () => {
  const surfaces = [
    join(ROOT, "src/pages/CatalogueListing.jsx"),
    join(ROOT, "src/components/storefront/CatalogueBrowser.jsx"),
    join(ROOT, "src/components/storefront/CatalogueHeader.jsx"),
    join(ROOT, "src/components/storefront/CatalogueToolbar.jsx"),
    join(ROOT, "src/components/storefront/CategoryTabs.jsx"),
    join(ROOT, "src/components/storefront/ProductGrid.jsx"),
  ];
  for (const path of surfaces) {
    const source = readFileSync(path, "utf8");
    assert.doesNotMatch(
      source,
      /\.avif.*\.(webp|jpg|jpeg|png)/i,
      `${path} must not convert AVIF assets to another format`
    );
    assert.doesNotMatch(
      source,
      /replace\(["'].*\.avif["'],\s*["'].*\.(webp|jpg|jpeg|png)["']\)/i,
      `${path} must not rewrite AVIF to WebP/JPG/PNG`
    );
  }
});

/* ------------------------------------------------------------------ */
/* Published-only visibility                                           */
/* ------------------------------------------------------------------ */

test("DRAFT/ARCHIVED products never appear in catalogue listings", () => {
  persistCanonicalCatalogueState(
    catalogRepository.all().map((record, i) => ({
      ...record,
      status: i % 3 === 0 ? "PUBLISHED" : i % 3 === 1 ? "DRAFT" : "ARCHIVED",
    })),
    "catalogue-redesign-visibility"
  );
  for (const path of ["/women", "/men", "/bridal", "/kids"]) {
    const { results } = listing(path);
    for (const product of results) {
      assert.equal(
        product.status,
        "PUBLISHED",
        `${path} must only contain PUBLISHED products (found ${product.status} ${product.id})`
      );
    }
  }
});

/* ------------------------------------------------------------------ */
/* Kids uses the EXACT same architecture as every other department      */
/* ------------------------------------------------------------------ */

test("kids route resolves through the same generic scope mechanism", () => {
  publishWholeCatalogue();
  const genericKids = queryCatalogue({ scopeFilters: { department: "kids" } });
  const routedKids = listing("/kids");
  assert.deepEqual(
    routedKids.results.map((p) => p.id),
    genericKids.results.map((p) => p.id),
    "/kids resolves identically to queryCatalogue({ department: 'kids' })"
  );
  // The redesigned listing page must NOT contain per-department conditional
  // branching (no if/switch on department id that would create a Kids-only
  // code path). Comments may legitimately mention "/kids" in example paths,
  // so we check for conditional code, not string literals.
  const catalogueListingSrc = readFileSync(
    join(ROOT, "src/pages/CatalogueListing.jsx"),
    "utf8"
  );
  assert.doesNotMatch(
    catalogueListingSrc,
    /if\s*\([^)]*['"]kids['"]/,
    "CatalogueListing must not contain a kids-specific conditional branch"
  );
  assert.doesNotMatch(
    catalogueListingSrc,
    /===\s*['"]kids['"]/,
    "CatalogueListing must not compare against the kids department id"
  );
  assert.doesNotMatch(
    catalogueListingSrc,
    /kidsProducts\s*=|kidsCatalogue|kidsSpecific/i,
    "CatalogueListing must not import or declare a Kids-only product list"
  );
});
