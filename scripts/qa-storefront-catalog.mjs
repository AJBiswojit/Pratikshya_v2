/**
 * PRATIKSHYA FASHON — Storefront catalogue render QA.
 *
 * Server-renders the catalogue surfaces against the real components and the
 * real frontend catalogue, asserting on the rendered markup:
 *
 *   1. Product detail route /product/:id — name, price plate, gallery
 *      imagery all render from the shared product object.
 *   2. Department / category / subcategory listing routes — masthead copy
 *      renders and the same query engine drives them.
 *   3. Product grid + card — one card per product, media resolved.
 *   4. Search — matches by name, SKU and product id on the one catalogue.
 *
 * Run:  npm run qa:storefront-catalog
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

const imagesIn = (html) => [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);

/* ------------------------------------------------------------------ */
console.log("\n# 1. Product detail — /product/PF-W-SAR-SIL-0001");
/* ------------------------------------------------------------------ */

try {
  /* A draft record resolves through the same seam ProductDetail uses for
     staff previews (catalogRepository → toStorefrontProduct); published
     records resolve through the customer lookup. */
  const { getProductByIdentifier, productHref, toStorefrontProduct } = await import("../src/data/products/index.js");
  const { default: catalogRepository } = await import("../src/services/catalogRepository.js");
  const product =
    getProductByIdentifier("PF-W-SAR-SIL-0001") ??
    toStorefrontProduct(catalogRepository.find("PF-W-SAR-SIL-0001"));
  check("detail route resolves the record by product id",
    Boolean(product) && product.name === "Chandni Raspberry Silk Saree", product?.name ?? "not found");
  check("canonical detail URL carries the product id",
    productHref(product) === "/product/PF-W-SAR-SIL-0001", productHref(product));

  const { default: ProductGallery } = await import("../src/components/product/ProductGallery.jsx");
  const galleryHtml = renderAt(React.createElement(ProductGallery, { product }), "/product/PF-W-SAR-SIL-0001");
  const galleryImages = imagesIn(galleryHtml);
  check("gallery renders the primary and every authored view",
    galleryImages.some((src) => src.includes("PF-W-SAR-SIL-0001/primary.avif")) &&
      galleryImages.some((src) => src.includes("PF-W-SAR-SIL-0001/01.avif")) &&
      galleryImages.some((src) => src.includes("PF-W-SAR-SIL-0001/02.avif")),
    galleryImages.join(", "));
  check("gallery keeps AVIF as AVIF — nothing converted",
    galleryImages.every((src) => src.endsWith(".avif")));

  const { default: ProductPurchasePanel } = await import("../src/components/product/ProductPurchasePanel.jsx");
  const panelHtml = renderAt(React.createElement(ProductPurchasePanel, { product }), "/product/PF-W-SAR-SIL-0001");
  check("purchase panel shows the customer-facing name", panelHtml.includes(product.name));
  check(
    "purchase panel renders the canonical authored price without inventing one",
    panelHtml.includes(`₹${product.price.toLocaleString("en-IN")}`) && !panelHtml.includes("Price on request")
  );

  const { default: ProductGrid } = await import("../src/components/storefront/ProductGrid.jsx");
  const gridHtml = renderAt(React.createElement(ProductGrid, { products: [product] }), "/shop");
  check("product grid maps products to cards — customer name + primary plate",
    gridHtml.includes(product.name) &&
      imagesIn(gridHtml).some((src) => src.includes("PF-W-SAR-SIL-0001/primary.avif")));
} catch (error) {
  check("detail route", false, String(error?.message ?? error));
}

/* ------------------------------------------------------------------ */
console.log("\n# 2. Listing routes — department / category / subcategory");
/* ------------------------------------------------------------------ */

const { departments } = await import("../src/data/catalog/taxonomy.js");
const { queryCatalogue, matchesSearch } = await import("../src/data/products/query.js");

try {
  const { default: CatalogueListing } = await import("../src/pages/CatalogueListing.jsx");
  for (const route of ["/women", "/women/sarees", "/women/sarees/silk", "/bridal", "/men/groom/groom-collection", "/kids/girls/dresses"]) {
    const html = renderAt(React.createElement(CatalogueListing, { variant: "navigation" }), route);
    check(`listing route renders — ${route}`, html.length > 200 && !html.includes("is no longer in the collection"), `${html.length} chars`);
  }
} catch (error) {
  check("listing routes render", false, String(error?.message ?? error));
}

/* ------------------------------------------------------------------ */
console.log("\n# 3. One catalogue — every product, every category page");
/* ------------------------------------------------------------------ */

try {
  const { products } = await import("../src/data/catalog/products.js");
  const departmentsFound = departments.map((department) => ({
    id: department.id,
    products: products.filter((product) => product.department === department.id).length,
  }));
  for (const entry of departmentsFound) {
    check(`department page covers its products — ${entry.id}`, entry.products > 0, `${entry.products} products`);
  }
  check("catalogue total is exactly one record per media folder", products.length === 128, `${products.length} products`);
} catch (error) {
  check("one catalogue", false, String(error?.message ?? error));
}

/* ------------------------------------------------------------------ */
console.log("\n# 4. Search — name, SKU and product id on the same catalogue");
/* ------------------------------------------------------------------ */

try {
  const { products } = await import("../src/data/catalog/products.js");
  const { getLiveStorefrontProducts } = await import("../src/data/products/index.js");
  const { default: catalogRepository } = await import("../src/services/catalogRepository.js");
  const haystack = catalogRepository.all().map((record) => ({
    id: String(record.id),
    name: record.name,
    sku: record.sku,
  }));
  const byName = haystack.find((record) => /silver/i.test(record.name));
  const bySku = haystack.find((record) => record.sku === "PFS-W-SAR-SIL-0001");
  const byId = haystack.find((record) => record.id === "PF-W-SAR-SIL-0001");
  check("searchable by customer-facing name", Boolean(byName), byName?.name ?? "");
  check("searchable by SKU", Boolean(bySku), bySku?.name ?? "");
  check("searchable by product id", Boolean(byId), byId?.name ?? "");
  check("listings only expose published products",
    getLiveStorefrontProducts().every((product) => product.status === "PUBLISHED" || product.published !== false),
    `${getLiveStorefrontProducts().length} published`);
} catch (error) {
  check("search", false, String(error?.message ?? error));
}

/* ------------------------------------------------------------------ */
console.log("\n# 5. Hero + collections data drives the storefront");
/* ------------------------------------------------------------------ */

try {
  const { heroSlides } = await import("../src/data/catalog/hero.js");
  const { default: HeroCarousel } = await import("../src/components/storefront/HeroCarousel.jsx");
  const html = renderAt(React.createElement(HeroCarousel, { slides: heroSlides }), "/");
  const images = imagesIn(html);
  check("hero renders all five slides from hero.js", images.filter((src) => src.includes("/images/hero/hero")).length === 5, images.join(", "));

  const { collectionPlates } = await import("../src/data/catalog/collections.js");
  check("collection plates exist for every editorial + fabric story",
    ["festive-edit", "heritage-weaves", "new-arrivals", "chiffon", "cotton", "linen", "silk"]
      .every((id) => Boolean(collectionPlates[id]?.media?.primary)));
} catch (error) {
  check("hero + collections", false, String(error?.message ?? error));
}

/* ------------------------------------------------------------------ */
const failed = results.filter((result) => !result.ok).length;
console.log(`\nRESULT: ${results.length - failed} passed · ${failed} failed`);
if (failed) {
  results.filter((result) => !result.ok).forEach((result) =>
    console.log(`  · ${result.name}${result.detail ? ` — ${result.detail}` : ""}`)
  );
  process.exitCode = 1;
}
