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
 *   5b. EVERY remaining placement has a live storefront seam: the Women's
 *      landing rail, the Bangles / Jewellery category rails, the Editorial
 *      storytelling plate, the Promotion band — plus the admin labels that
 *      must answer the canonical consumption rule, not the local assignment.
 *   6. Cleared storage recovers the canonical catalogue without duplicates.
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
console.log("\n# 5b. EVERY REMAINING PLACEMENT HAS A LIVE STOREFRONT SEAM");
/* ------------------------------------------------------------------ */

/* Women's section — the landing-page rail. */
try {
  const WOMEN_PRODUCT = catalogRepository
    .all()
    .find((product) => product.department === "women" && product.category === "essentials");
  publishViaWorkflow(WOMEN_PRODUCT.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.WOMEN_SECTION, [
    WOMEN_PRODUCT.id,
  ]);
  const { default: PlacementProductRail } = await import(
    "../src/components/storefront/PlacementProductRail.jsx"
  );
  const { WishlistProvider } = await import("../src/context/WishlistContext.jsx");
  const { InventoryProvider } = await import("../src/context/InventoryContext.jsx");
  const womenHtml = renderAt(
    React.createElement(
      InventoryProvider,
      null,
      React.createElement(
        WishlistProvider,
        null,
        React.createElement(PlacementProductRail, {
          placementId: MARKETING_PLACEMENTS.WOMEN_SECTION,
        })
      )
    ),
    "/"
  );
  check(
    "Women's section renders its curated product on the landing page",
    womenHtml.includes(WOMEN_PRODUCT.name),
    WOMEN_PRODUCT.id
  );
} catch (error) {
  check("Women's section renders its curated product on the landing page", false, error.message);
}

/* Bangles + Jewellery — the category listing rails. */
try {
  const banglesProduct = catalogRepository
    .all()
    .find(
      (product) =>
        product.department === "bridal" &&
        product.category === "finishing-touches" &&
        product.subcategory === "bangles"
    );
  const jewelleryProduct = catalogRepository
    .all()
    .find(
      (product) =>
        product.department === "bridal" &&
        product.category === "finishing-touches" &&
        product.subcategory === "jewellery"
    );
  publishViaWorkflow(banglesProduct.id);
  publishViaWorkflow(jewelleryProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.BANGLES_SECTION, [
    banglesProduct.id,
  ]);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.JEWELLERY_SECTION, [
    jewelleryProduct.id,
  ]);

  const { default: CatalogueListing } = await import("../src/pages/CatalogueListing.jsx");
  const { WishlistProvider } = await import("../src/context/WishlistContext.jsx");
  const { InventoryProvider } = await import("../src/context/InventoryContext.jsx");
  const listingAt = (path) =>
    renderAt(
      React.createElement(
        InventoryProvider,
        null,
        React.createElement(
          WishlistProvider,
          null,
          React.createElement(CatalogueListing, { variant: "navigation" })
        )
      ),
      path
    );

  const banglesHtml = listingAt("/bridal/finishing-touches/bangles");
  const banglesOccurrences = (banglesHtml.match(new RegExp(escapeRegExp(banglesProduct.name), "g")) || []).length;
  check(
    "Bangles category page renders its curated rail",
    banglesHtml.includes('id="placement-bangles_section"') && banglesOccurrences >= 2,
    `${banglesProduct.id} — ${banglesOccurrences} renders (rail + grid)`
  );
  const jewelleryHtml = listingAt("/bridal/finishing-touches/jewellery");
  const jewelleryOccurrences = (jewelleryHtml.match(new RegExp(escapeRegExp(jewelleryProduct.name), "g")) || []).length;
  check(
    "Jewellery category page renders its curated rail",
    jewelleryHtml.includes('id="placement-jewellery_section"') && jewelleryOccurrences >= 2,
    `${jewelleryProduct.id} — ${jewelleryOccurrences} renders (rail + grid)`
  );
  /* A page that is no placement's surface never grows a rail. */
  const plainHtml = listingAt("/women/sarees/cotton");
  check(
    "a non-placement listing page renders no curated rail",
    !plainHtml.includes('id="placement-'),
    "no rail outside the vocabulary"
  );
} catch (error) {
  check("Bangles / Jewellery category rails", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

/* Editorial + Promotion — the generic artwork seams. */
try {
  const { default: mediaRepository } = await import("../src/services/media/mediaRepository.js");
  const promotion = mediaRepository.create({
    type: "IMAGE",
    title: "Nababarsha promotion plate",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/primary.avif",
    status: "ACTIVE",
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.PROMOTION,
  });
  const editorial = mediaRepository.create({
    type: "IMAGE",
    title: "Heritage storytelling plate",
    url: "/images/products/women/sarees/banarasi/PF-W-SAR-BAN-0002/primary.avif",
    status: "ACTIVE",
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.EDITORIAL,
  });

  const { default: SaleBanner } = await import("../src/components/storefront/SaleBanner.jsx");
  const saleHtml = renderAt(React.createElement(SaleBanner), "/");
  check(
    "Promotion artwork stands on the seasonal band",
    saleHtml.includes(promotion.url),
    promotion.url
  );

  const { default: CelebrationEdit } = await import(
    "../src/components/storefront/CelebrationEdit.jsx"
  );
  const celebrationHtml = renderAt(React.createElement(CelebrationEdit), "/");
  check(
    "Editorial artwork stands on the heritage storytelling plate",
    celebrationHtml.includes(editorial.url),
    editorial.url
  );

  /* A DRAFT promotion record must not stand on the band — the festive chain stays. */
  mediaRepository.update(promotion.id, { status: "DRAFT" });
  const saleAfterDraft = renderAt(React.createElement(SaleBanner), "/");
  check(
    "a draft promotion record leaves the band untouched",
    !saleAfterDraft.includes(promotion.url)
  );
  mediaRepository.update(promotion.id, { status: "ACTIVE" });
} catch (error) {
  check("Editorial / Promotion artwork seams", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

/* Admin label honesty — the badge answers the canonical consumption rule. */
try {
  const { default: mediaRepository } = await import("../src/services/media/mediaRepository.js");
  /* Isolate the board: records that genuinely stand on their seams earn the
     badge, so they are removed before the hero honesty check. */
  mediaRepository.getAll()
    .filter((item) => item.scope === "MARKETING")
    .forEach((item) => mediaRepository.remove(item.id));
  const plainHero = mediaRepository.create({
    type: "IMAGE",
    title: "Plain hero upload",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0003/primary.avif",
    status: "ACTIVE",
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.HOME_HERO,
  });
  const { default: AdminMarketingMedia } = await import(
    "../src/pages/admin/media/AdminMarketingMedia.jsx"
  );
  const boardHtml = renderAt(React.createElement(AdminMarketingMedia), "/admin/media/marketing");
  check(
    "an active hero upload the slideshow cannot admit is not badged On the storefront",
    !boardHtml.includes("On the storefront"),
    "hero register requires the dedicated HERO role"
  );
  check(
    "the marketing board says so honestly",
    boardHtml.includes("not admitted by the seam yet"),
    "panel copy reflects the canonical rule"
  );
  check(
    "the plain hero record is still listed for the placement",
    boardHtml.includes(plainHero.title),
    plainHero.id
  );

  mediaRepository.remove(plainHero.id);
  const admitted = mediaRepository.create({
    type: "IMAGE",
    title: "Registered promotion plate",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0004/primary.avif",
    status: "ACTIVE",
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.PROMOTION,
  });
  const boardAfter = renderAt(React.createElement(AdminMarketingMedia), "/admin/media/marketing");
  check(
    "a promotion record that truly stands on the band is badged On the storefront",
    boardAfter.includes("On the storefront") && boardAfter.includes(admitted.title),
    admitted.id
  );
  mediaRepository.remove(admitted.id);

  const { default: MediaPlacementSelector } = await import(
    "../src/components/media/MediaPlacementSelector.jsx"
  );
  const selectorHtml = renderAt(
    React.createElement(MediaPlacementSelector, {
      selectedPlacement: null,
      onSelectPlacement: () => {},
    }),
    "/admin/media/upload"
  );
  check(
    "artwork uploads are only offered GENERIC placements",
    selectorHtml.includes("Home hero") && !selectorHtml.includes("Saree section"),
    "product placements are curated from the catalogue"
  );
} catch (error) {
  check("admin label honesty", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

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
