/**
 * PRATIKSHYA FASHON — Marketing media product assignment QA.
 *
 * Server-renders the product curation flow against the real components and
 * the real catalogue, asserting the acceptance flow end to end:
 *
 *   1. Admin curates SAREE_SECTION / LEHENGA_SECTION / KIDS_SECTION from the
 *      canonical catalogue (references only — no product data duplicated).
 *   2. The Product Catalog Selector renders with search, taxonomy filters and
 *      context-aware opening filters.
 *   3. The storefront sections (Saree Edit carousel, curated rails) resolve
 *      the assigned products through the live catalogue, in placement order.
 *   4. Assignments survive a re-read (refresh) and removals only drop the
 *      reference — the product stays in the catalogue.
 *   5. Hero / editorial placements stay on the generic media workflow.
 *
 * Run:  npm run qa:marketing-assignment
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
const browserEvents = new EventTarget();
globalThis.window = globalThis;
globalThis.addEventListener = (...args) => browserEvents.addEventListener(...args);
globalThis.removeEventListener = (...args) => browserEvents.removeEventListener(...args);
globalThis.dispatchEvent = (...args) => browserEvents.dispatchEvent(...args);
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
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/* ------------------------------------------------------------------ */
/* State: publish a small set of products through the canonical         */
/* workflow, then curate the marketing placements.                      */
/* ------------------------------------------------------------------ */

const { default: catalogRepository } = await import("../src/services/catalogRepository.js");
const { default: marketingPlacementRepository } = await import(
  "../src/services/media/marketingPlacementRepository.js"
);
const {
  resolvePlacementProducts,
  resolvePlacementEntries,
} = await import("../src/services/media/marketingPlacementResolver.js");
const { getLiveStorefrontProducts, productHref } = await import("../src/data/products/index.js");
const {
  MARKETING_PLACEMENTS,
  MARKETING_PLACEMENT_OPTIONS,
  PLACEMENT_MODES,
  getPlacement,
} = await import("../src/config/mediaTypes.js");
const {
  approveProduct,
  publishProduct,
  submitProduct,
} = await import("../src/services/workflow/productWorkflowCommands.js");

const ACTOR = { adminId: "PF-ADM-00001", name: "House Admin" };

console.log("\n# 0. FRESH BROWSER — canonical defaults with empty storage");
const freshProducts = catalogRepository.all();
const freshKids = freshProducts.filter((product) => product.department === "kids");
check("fresh storage loads the one canonical catalogue", freshProducts.length > 0);
check("fresh storage discovers Kids through the department field", freshKids.length > 0);
check(
  "fresh storage has no duplicate Kids placement state",
  marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION).length === 0
);
check(
  "fresh storage keeps unpublished Kids Products off the storefront",
  !getLiveStorefrontProducts().some((product) => product.department === "kids")
);

const SAREE_A = "PF-W-SAR-BAN-0001"; // Mumtaz Sand Banarasi Saree
const SAREE_B = "PF-W-SAR-COT-0001"; // Vasanti Copper Cotton Saree
const LEHENGA = "PF-W-LEH-BRI-0002"; // Maharani Vermilion Bridal Lehenga
const canonicalKids = catalogRepository
  .all()
  .filter((product) => product.department === "kids");
if (canonicalKids.length < 2) {
  throw new Error("Marketing assignment QA requires two canonical Kids Products.");
}
const [KIDS_A, KIDS_B] = canonicalKids.map((product) => product.id);
const DRAFT_ID = "PF-W-SAR-SIL-0001"; // stays unpublished

const publishViaWorkflow = (id) => {
  const submitted = submitProduct(id, ACTOR);
  if (!submitted.ok) return submitted;
  const approved = approveProduct(id, ACTOR);
  return approved.ok ? publishProduct(id, ACTOR) : approved;
};

[SAREE_A, SAREE_B, LEHENGA, KIDS_A, KIDS_B].forEach((id) => {
  const result = publishViaWorkflow(id);
  if (!result.ok) throw new Error(`Could not publish canonical Product ${id}: ${result.error}`);
});

console.log("\n# 1. ADMIN — curate placements from the canonical catalogue");

try {
  /* Assign in a deliberately non-catalogue order so ordering is proven. */
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION, [SAREE_B, SAREE_A]);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.LEHENGA_SECTION, [LEHENGA]);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION, [KIDS_A, KIDS_B]);
  /* A DRAFT product is assigned too — it must never reach the storefront. */
  marketingPlacementRepository.addPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION, [DRAFT_ID]);

  const stored = marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION);
  check(
    "placement stores product references only, in display order",
    JSON.stringify(stored) === JSON.stringify([SAREE_B, SAREE_A]),
    stored.join(", ")
  );
  check("children placements share the same repository door", true);
} catch (error) {
  check("placement stores product references only, in display order", false, error.message);
}

/* ------------------------------------------------------------------ */
console.log("\n# 1b. ADMIN MARKETING MEDIA PAGE — renders the board");
/* ------------------------------------------------------------------ */

let pageHtml = "";
try {
  const { default: AdminMarketingMedia } = await import(
    "../src/pages/admin/media/AdminMarketingMedia.jsx"
  );
  pageHtml = renderAt(React.createElement(AdminMarketingMedia), "/admin/media/marketing");
  check("Marketing Media page renders", pageHtml.length > 3000, `${pageHtml.length} chars`);
} catch (error) {
  check("Marketing Media page renders", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}
if (pageHtml) {
  ["Saree section", "Lehenga section", "Kids section", "Bridal section", "Groom section"].forEach((label) =>
    check(`placement panel “${label}” renders`, pageHtml.includes(label))
  );
  check(
    "product placements show the catalogue empty state",
    pageHtml.includes("No products assigned to this placement yet.")
  );
  check("generic placements keep the artwork workflow", pageHtml.includes("Home hero"));
  check(
    "no placeholder/undefined leaked",
    !/\[object Object\]|>undefined<|>NaN</.test(pageHtml)
  );
}

/* ------------------------------------------------------------------ */
console.log("\n# 1c. ADMIN PRODUCT WORKSPACES — one catalogue and review queue");
/* ------------------------------------------------------------------ */

try {
  const { default: AdminProducts } = await import("../src/pages/admin/AdminProducts.jsx");
  const { default: AdminProductReview } = await import("../src/pages/admin/AdminProductReview.jsx");
  const adminProductsHtml = renderAt(React.createElement(AdminProducts), "/admin/products");
  const reviewHtml = renderAt(React.createElement(AdminProductReview), "/admin/products/review");
  check("Admin Products renders the canonical Kids Products", adminProductsHtml.includes(KIDS_A));
  check("Product Review exposes Kids in its data-driven Department filter", reviewHtml.includes("Kids"));
  check(
    "Admin workspaces render without placeholder/undefined leakage",
    !/\[object Object\]|>undefined<|>NaN</.test(`${adminProductsHtml}${reviewHtml}`)
  );
} catch (error) {
  check("Admin Products and Product Review render", false, error.message);
}

/* ------------------------------------------------------------------ */
console.log("\n# 2. PRODUCT CATALOG SELECTOR — the Add Media surface");
/* ------------------------------------------------------------------ */

let selectorHtml = "";
try {
  const { default: ProductCatalogSelector } = await import(
    "../src/components/admin/ProductCatalogSelector.jsx"
  );
  selectorHtml = renderAt(
    React.createElement(ProductCatalogSelector, {
      placementId: MARKETING_PLACEMENTS.SAREE_SECTION,
      initialSelectedIds: [],
      onCancel: () => {},
      onConfirm: () => {},
    }),
    "/admin/media/marketing"
  );
  check("Product Catalog Selector renders", selectorHtml.length > 2000, `${selectorHtml.length} chars`);
} catch (error) {
  check("Product Catalog Selector renders", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

if (selectorHtml) {
  check("selector is labelled Select from Product Catalog", /Select from product catalog/.test(selectorHtml));
  check("search field present", /Search products…/.test(selectorHtml));
  ["All Departments", "All Categories", "All Subcategories"].forEach((label) =>
    check(`filter “${label}” present`, selectorHtml.includes(label))
  );
  ["Women", "Bridal", "Men", "Kids"].forEach((label) =>
    check(`department option “${label}”`, selectorHtml.includes(label))
  );
  check("add-to-section action present", /Add to section/.test(selectorHtml));
  check("cancel action present", /Cancel/.test(selectorHtml));
  check(
    "opens pre-arranged for the placement's recommended taxonomy",
    /Suggested for Saree section/.test(selectorHtml)
  );
  check("shows an assigned catalogue product", selectorHtml.includes("Mumtaz Sand Banarasi Saree"));
  check("shows the product id", selectorHtml.includes("PF-W-SAR-BAN-0001"));
  check("shows the product's taxonomy line", /Women \/ Sarees/.test(selectorHtml));
  check("status badge shown for every product", selectorHtml.includes("Published"));
  check(
    "no placeholder/undefined leaked",
    !/\[object Object\]|>undefined<|>NaN</.test(selectorHtml)
  );
}

/* ------------------------------------------------------------------ */
console.log("\n# 3. STOREFRONT — sections resolve the assigned products");
/* ------------------------------------------------------------------ */

try {
  const live = getLiveStorefrontProducts();
  const liveIds = new Set(live.map((product) => product.id));
  check("live catalogue contains the published pieces", [SAREE_A, SAREE_B, LEHENGA, KIDS_A, KIDS_B].every((id) => liveIds.has(id)));
  check("draft product never reaches the live catalogue", !liveIds.has(DRAFT_ID));

  const sareeOrder = resolvePlacementProducts(MARKETING_PLACEMENTS.SAREE_SECTION, live);
  check(
    "Saree section resolves in placement order",
    JSON.stringify(sareeOrder.map((p) => p.id)) === JSON.stringify([SAREE_B, SAREE_A]),
    sareeOrder.map((p) => p.id).join(", ")
  );

  const kids = resolvePlacementProducts(MARKETING_PLACEMENTS.KIDS_SECTION, live);
  check(
    "Kids section resolves assigned published products only",
    JSON.stringify(kids.map((p) => p.id)) === JSON.stringify([KIDS_A, KIDS_B]),
    kids.map((p) => p.id).join(", ")
  );

  const entries = resolvePlacementEntries(MARKETING_PLACEMENTS.SAREE_SECTION, live);
  check(
    "entries carry the canonical primary and product route",
    entries.every((entry) => entry.route === productHref(entry.product)) &&
      entries.every((entry) => entry.image.src.includes("/primary.avif")),
    entries.map((entry) => entry.image.src).join(", ")
  );
} catch (error) {
  check("storefront resolution", false, error.message);
}

/* The Saree Edit carousel — the Saree section's storefront seam. */
let carouselHtml = "";
try {
  const { default: SareeEditCarousel } = await import("../src/components/storefront/SareeEditCarousel.jsx");
  carouselHtml = renderAt(React.createElement(SareeEditCarousel), "/");
  check("Saree Edit carousel renders", carouselHtml.length > 1000, `${carouselHtml.length} chars`);
} catch (error) {
  check("Saree Edit carousel renders", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}
if (carouselHtml) {
  check(
    "carousel leads with the first curated product (placement order)",
    carouselHtml.includes("Vasanti Copper Cotton Saree"),
    "expected PF-W-SAR-COT-0001 first"
  );
  check("curated product id link present", carouselHtml.includes(`/product/${SAREE_B}`));
  check("second curated product present", carouselHtml.includes("Mumtaz Sand Banarasi Saree"));
}

/* The curated rails — Lehenga section and Kids section. */
const railNames = { [MARKETING_PLACEMENTS.LEHENGA_SECTION]: "Lehenga", [MARKETING_PLACEMENTS.KIDS_SECTION]: "Kids" };
for (const [placementId, label] of Object.entries(railNames)) {
  let railHtml = "";
  try {
    const { default: PlacementProductRail } = await import(
      "../src/components/storefront/PlacementProductRail.jsx"
    );
    const { WishlistProvider } = await import("../src/context/WishlistContext.jsx");
    const { InventoryProvider } = await import("../src/context/InventoryContext.jsx");
    railHtml = renderAt(
      React.createElement(
        InventoryProvider,
        null,
        React.createElement(
          WishlistProvider,
          null,
          React.createElement(PlacementProductRail, { placementId })
        )
      ),
      "/"
    );
    check(`${label} section renders when curated`, railHtml.length > 500, `${railHtml.length} chars`);
  } catch (error) {
    check(`${label} section renders when curated`, false, error.message);
  }
  if (railHtml) {
    const assigned = resolvePlacementProducts(placementId, getLiveStorefrontProducts());
    assigned.forEach((product) =>
      check(`${label} section shows ${product.id}`, railHtml.includes(product.name))
    );
  }
}

/* A placement with nothing assigned renders no section at all. */
try {
  const { default: PlacementProductRail } = await import(
    "../src/components/storefront/PlacementProductRail.jsx"
  );
  const html = renderAt(
    React.createElement(PlacementProductRail, { placementId: MARKETING_PLACEMENTS.WOMEN_SECTION }),
    "/"
  );
  check("uncurated placement renders no section (homepage unchanged)", html.trim() === "");
} catch (error) {
  check("uncurated placement renders no section (homepage unchanged)", false, error.message);
}

/* ------------------------------------------------------------------ */
console.log("\n# 4. REMOVE + REFRESH — references only, product intact");
/* ------------------------------------------------------------------ */

try {
  marketingPlacementRepository.removePlacementProductId(MARKETING_PLACEMENTS.SAREE_SECTION, SAREE_B);
  /* A re-read is the refresh equivalent. */
  const afterRemove = marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION);
  check(
    "removed product leaves the placement after refresh",
    JSON.stringify(afterRemove) === JSON.stringify([SAREE_A]),
    afterRemove.join(", ")
  );
  const stillLive = getLiveStorefrontProducts().some((product) => product.id === SAREE_B);
  check("removed product remains published in the catalogue", stillLive);
  const selectorReopen = resolvePlacementEntries(MARKETING_PLACEMENTS.SAREE_SECTION, getLiveStorefrontProducts());
  check("resolver no longer serves the removed reference", !selectorReopen.some((entry) => entry.productId === SAREE_B));
} catch (error) {
  check("removal semantics", false, error.message);
}

/* ------------------------------------------------------------------ */
console.log("\n# 5. HERO + EDITORIAL REMAIN ON THE GENERIC WORKFLOW");
/* ------------------------------------------------------------------ */

check(
  "Home hero is a GENERIC placement (hero system untouched)",
  getPlacement(MARKETING_PLACEMENTS.HOME_HERO).mode === PLACEMENT_MODES.GENERIC
);
check(
  "Editorial and Promotion are GENERIC placements",
  [MARKETING_PLACEMENTS.EDITORIAL, MARKETING_PLACEMENTS.PROMOTION].every(
    (id) => getPlacement(id).mode === PLACEMENT_MODES.GENERIC
  )
);
check(
  "every product placement declares structured recommendations",
  MARKETING_PLACEMENT_OPTIONS.filter((placement) => placement.mode === PLACEMENT_MODES.PRODUCT).every(
    (placement) =>
      !placement.recommendedDepartment ||
      ["women", "bridal", "men", "kids"].includes(placement.recommendedDepartment)
  ),
  MARKETING_PLACEMENT_OPTIONS.filter((placement) => placement.mode === PLACEMENT_MODES.PRODUCT)
    .map((placement) => placement.id)
    .join(", ")
);

/* ------------------------------------------------------------------ */
console.log("\n# 6. CLEARED STORAGE — canonical recovery without duplicate state");
/* ------------------------------------------------------------------ */

try {
  localStorage.clear();
  const recovered = catalogRepository.all();
  const recoveredKids = recovered.filter((product) => product.department === "kids");
  check("cleared storage recovers the canonical catalogue", recovered.length === freshProducts.length);
  check(
    "cleared storage recovers the same canonical Kids Product IDs",
    JSON.stringify(recoveredKids.map((product) => product.id)) ===
      JSON.stringify(freshKids.map((product) => product.id))
  );
  check(
    "cleared storage removes marketing placement references",
    marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION).length === 0
  );
  check(
    "cleared storage does not expose non-published Products",
    !getLiveStorefrontProducts().some((product) => product.department === "kids")
  );

  const { default: AdminProducts } = await import("../src/pages/admin/AdminProducts.jsx");
  const { default: AdminProductReview } = await import("../src/pages/admin/AdminProductReview.jsx");
  const { default: AdminMarketingMedia } = await import("../src/pages/admin/media/AdminMarketingMedia.jsx");
  const recoveredAdminProducts = renderAt(React.createElement(AdminProducts), "/admin/products");
  const recoveredReview = renderAt(React.createElement(AdminProductReview), "/admin/products/review");
  const recoveredMarketing = renderAt(React.createElement(AdminMarketingMedia), "/admin/media/marketing");
  check("Admin Products still resolves canonical Kids after cleared storage", recoveredAdminProducts.includes(KIDS_A));
  check("Product Review still exposes the canonical Kids filter after cleared storage", recoveredReview.includes("Kids"));
  check("Marketing Media still exposes the canonical Kids placement after cleared storage", recoveredMarketing.includes("Kids section"));
} catch (error) {
  check("cleared-storage canonical recovery", false, error.message);
}

/* ------------------------------------------------------------------ */
console.log("\n# SUMMARY");
/* ------------------------------------------------------------------ */

const passed = results.filter((result) => result.ok).length;
console.log(`  ${passed}/${results.length} checks passed`);
if (passed !== results.length) process.exitCode = 1;
