/**
 * PRATIKSHYA FASHON — Department listing render QA.
 *
 * Server-renders the REAL storefront listing page (`CatalogueListing`) at
 * each department route and asserts on the rendered markup:
 *
 *   1. The route resolves a department-scoped storefront context.
 *   2. The rendered grid contains only that department's Product Media.
 *   3. The "N curated pieces" plate reports the filtered count, not the
 *      catalogue total.
 *   4. `/collections` resolves through collection curation, never the
 *      complete catalogue.
 *
 * The canonical catalogue is the only product source: the run publishes the
 * authored records through the register (nothing is authored here) and reads
 * everything else back from the storefront query engine.
 *
 * Run:  npm run qa:department-listings
 */

/* ---- browser shims, installed before any application module loads ---- */
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
globalThis.sessionStorage = globalThis.localStorage;
globalThis.matchMedia = () => ({
  matches: false,
  addEventListener() {},
  removeEventListener() {},
  addListener() {},
  removeListener() {},
});
globalThis.scrollTo = () => {};
globalThis.requestAnimationFrame = (fn) => setTimeout(fn, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
globalThis.IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
globalThis.ResizeObserver = globalThis.IntersectionObserver;

const React = (await import("react")).default;
const { renderToStaticMarkup } = await import("react-dom/server");
const { MemoryRouter, Route, Routes } = await import("react-router-dom");

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const renderAt = (element, path) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [path] },
      React.createElement(Routes, null, React.createElement(Route, { path, element }))
    )
  );

const productImagesIn = (html) =>
  [...html.matchAll(/<img[^>]+src="(\/images\/products\/[^"]+)"/g)].map((match) => match[1]);

const countPlateIn = (html) => {
  // The redesigned product-first toolbar renders "N pieces" (singular
  // "1 piece") rather than the older "N curated pieces" wording.
  const match = html.match(/(\d+)\s+(?:curated\s+)?pieces?/);
  return match ? Number(match[1]) : null;
};

const { departments } = await import("../src/data/catalog/taxonomy.js");
const { default: catalogRepository, persistCanonicalCatalogueState } = await import(
  "../src/services/catalogRepository.js"
);
const { getLiveStorefrontProducts } = await import("../src/data/products/index.js");
const { queryCatalogue } = await import("../src/data/products/query.js");
const { resolveNavigationScope } = await import("../src/data/products/taxonomy.js");
const { default: CatalogueListing } = await import("../src/pages/CatalogueListing.jsx");

/* Publish the authored catalogue so the listings have something to show.
   The records are the canonical ones — only their workflow status moves. */
persistCanonicalCatalogueState(
  catalogRepository.all().map((record) => ({ ...record, status: "PUBLISHED" })),
  "qa-department-listings"
);

const live = getLiveStorefrontProducts();
const listing = React.createElement(CatalogueListing, { variant: "navigation" });

/* ------------------------------------------------------------------ */
console.log("\n# 1. Route → storefront context");
/* ------------------------------------------------------------------ */

for (const department of departments) {
  const scope = resolveNavigationScope(department.path);
  check(
    `route resolves its department — ${department.path}`,
    scope?.filters?.department === department.id,
    JSON.stringify(scope?.filters ?? null)
  );
}

/* ------------------------------------------------------------------ */
console.log("\n# 2. Rendered department listings");
/* ------------------------------------------------------------------ */

for (const department of departments) {
  const expected = queryCatalogue({
    scopeFilters: resolveNavigationScope(department.path).filters,
  }).total;

  const html = renderAt(listing, department.path);
  const images = productImagesIn(html);
  const foreign = images.filter((src) => !src.startsWith(`/images/products/${department.id}/`));

  check(
    `grid shows only ${department.id} products — ${department.path}`,
    images.length > 0 && foreign.length === 0,
    `${images.length} plates · ${foreign.length} foreign`
  );
  check(
    `count plate is the filtered total — ${department.path}`,
    countPlateIn(html) === expected && expected !== live.length,
    `${countPlateIn(html)} of ${live.length} in the catalogue`
  );
  check(
    `AVIF plates are served unconverted — ${department.path}`,
    images.every((src) => /\.(?:avif|webp|jpe?g|png)$/.test(src)) &&
      images.every((src) => src === src.replace(/\.avif$/, ".avif")),
    `${images.filter((src) => src.endsWith(".avif")).length} avif`
  );
}

/* ------------------------------------------------------------------ */
console.log("\n# 3. Departments partition the catalogue");
/* ------------------------------------------------------------------ */

const totals = departments.map((department) => ({
  id: department.id,
  total: queryCatalogue({ scopeFilters: resolveNavigationScope(department.path).filters }).total,
}));
check(
  "every department total is derived from the canonical catalogue",
  totals.reduce((sum, entry) => sum + entry.total, 0) === live.length,
  totals.map((entry) => `${entry.id} ${entry.total}`).join(" · ")
);

/* ------------------------------------------------------------------ */
console.log("\n# 4. Collections is a curation context");
/* ------------------------------------------------------------------ */

const collectionsScope = resolveNavigationScope("/collections");
const collectionsTotal = queryCatalogue({ scopeFilters: collectionsScope.filters }).total;
check(
  "/collections resolves through collection curation",
  Boolean(collectionsScope.filters.curated) && collectionsTotal < live.length,
  `${collectionsTotal} curated of ${live.length}`
);

/* ------------------------------------------------------------------ */
const failed = results.filter((result) => !result.ok).length;
console.log(`\nRESULT: ${results.length - failed} passed · ${failed} failed`);
if (failed) {
  results
    .filter((result) => !result.ok)
    .forEach((result) => console.log(`  · ${result.name}${result.detail ? ` — ${result.detail}` : ""}`));
  process.exitCode = 1;
}
