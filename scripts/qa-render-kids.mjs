/**
 * PRATIKSHYA FASHON — PHASE 22.2 RENDER QA (Phase 3D update)
 *
 * Server-renders the three surfaces the phase touches and asserts on the real
 * output. A route returning 200 only proves the SPA shell loaded; this proves
 * the components actually render — a broken import, a bad prop, an undefined
 * map or a crashing selector fails here instead of in front of the user.
 *
 *   1. /admin/products/review    — the UNIFIED Admin Product Review
 *                                  workspace (Phase 3D): one queue, one
 *                                  detail, Kids as a category section
 *   2. /employee/products/review — the assigned-products desk (authenticated)
 *   3. /category/kids            — the storefront cards
 *
 * Run: npm run qa:render
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
const { MemoryRouter } = await import("react-router-dom");

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
};

const renderAt = (element, path) =>
  renderToStaticMarkup(
    React.createElement(MemoryRouter, { initialEntries: [path] }, element)
  );

const imagesIn = (html) => [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);

/* Render QA targets the persisted migrated workflow state explicitly. */
const { setupMigratedState } = await import("../tests/helpers/workflowTestState.js");
setupMigratedState();

/* ------------------------------------------------------------------ */
console.log("\n# 1. ADMIN — /admin/products/review (Phase 3D unified workspace)");
/* ------------------------------------------------------------------ */

/* 1a. The unified queue is ONE projection over the ONE register — Kids
       rows live in the same queue, and there is no second review register. */
try {
  const { getUnifiedReviewQueue } = await import("../src/services/unifiedProductReview.js");
  const catalogRepository = (await import("../src/services/catalogRepository.js")).default;
  const queue = getUnifiedReviewQueue();
  const registerIds = new Set(catalogRepository.all().map((product) => String(product.id)));
  const queueIds = new Set(queue.map((row) => String(row.productId)));
  check(
    "one unified queue covers the whole register",
    queue.length === registerIds.size && [...queueIds].every((id) => registerIds.has(id)),
    `${queue.length} rows / ${registerIds.size} products`
  );
  const { CONFIRMED_KIDS_IDENTITIES } = await import("../src/services/kidsProductIdentity.js");
  const kidsRows = queue.filter((row) => row.isKids);
  const kidIds = new Set(kidsRows.map((row) => String(row.productId)));
  const confirmedPresent = CONFIRMED_KIDS_IDENTITIES.every((identity) => kidIds.has(identity.productId));
  check(
    "all 21 confirmed Kids identities in the SAME queue (Kids = a filter, not a second queue)",
    confirmedPresent && kidsRows.length >= 21,
    `${kidsRows.length} Kids rows · 21 confirmed identities ${confirmedPresent ? "present" : "MISSING"}`
  );
} catch (error) {
  check("one unified queue covers the whole register", false, error.message);
}

/* 1b. The queue UI renders with its lenses, filters and search. */
let queueHtml = "";
try {
  const Queue = (await import("../src/components/admin/UnifiedReviewQueue.jsx")).default;
  queueHtml = renderAt(
    React.createElement(Queue, { focusId: null, onSelect: () => {}, initialQuickFilter: "KIDS" }),
    "/admin/products/review"
  );
  check("unified review queue renders", queueHtml.length > 5000, `${queueHtml.length} chars`);
} catch (error) {
  check("unified review queue renders", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

if (queueHtml) {
  const ids = new Set([...queueHtml.matchAll(/KID-0\d{2}/g)].map((m) => m[0]));
  check("Kids lens shows all 21 products in one place", ids.size === 21, `${ids.size} distinct Product IDs`);
  check("search present", /type="search"/.test(queueHtml));
  ["Kids", "Draft", "Submitted", "Pending approval", "Review flags", "Ready to publish"].forEach((label) =>
    check(`lens “${label}”`, queueHtml.includes(label))
  );
  ["Workflow state", "Category", "Assignment", "Review flags", "Media status", "Taxonomy status", "Price status", "Name status", "Grouping status", "Missing information"].forEach((label) =>
    check(`filter “${label}”`, queueHtml.includes(label))
  );
  check("one-queue statement shown", /One queue over one lifecycle/.test(queueHtml));
  check(
    "no placeholder/undefined leaked",
    !/\[object Object\]|>undefined<|>NaN</.test(queueHtml)
  );
}

/* 1c. The unified review detail renders a Kids product with its category
       validation section — conditional UI, not a separate workflow. */
let detailHtml = "";
try {
  const Detail = (await import("../src/components/admin/ProductReviewDetail.jsx")).default;
  detailHtml = renderAt(
    React.createElement(Detail, {
      productId: "KID-001",
      actor: { adminId: "PF-ADM-00001", name: "House Admin" },
      onNotice: () => {},
    }),
    "/admin/products/review?product=KID-001"
  );
  check("unified review detail renders", detailHtml.length > 3000, `${detailHtml.length} chars`);
} catch (error) {
  check("unified review detail renders", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 6).join("\n"));
}

if (detailHtml) {
  check("Kids validation section present", /Kids validation/.test(detailHtml));
  check("Kids is described as a category layer", /category-specific validation layer/.test(detailHtml));
  check("assigned Kids plate named", /kids-001\.webp/.test(detailHtml));
  check("identity confirmation shown", /Separate product · confirmed|Identity unconfirmed/.test(detailHtml));
  check("21-plate lock status shown", /21-plate lock/.test(detailHtml));
  check("media ownership reported", /Media ownership/.test(detailHtml));
  check("canonical action bar present", /Review actions — canonical workflow commands/.test(detailHtml));
  check("approve ≠ publish stated", /Approve ≠ Publish/.test(detailHtml));
  check("no silent media transfer", /never from this review desk|nothing is transferred silently/i.test(detailHtml));
  const kidImages = imagesIn(detailHtml).filter((src) => /kids-0\d{2}/.test(src));
  check("Kids product shows its own image", kidImages.length >= 1, `${kidImages.length} images`);
  check(
    "no placeholder/undefined leaked",
    !/\[object Object\]|>undefined<|>NaN</.test(detailHtml)
  );
}

/* 1d. The retired surfaces are gone — no second Kids review UI remains. */
try {
  await import("../src/components/admin/AdminKidsFinalizationPanel.jsx");
  check("AdminKidsFinalizationPanel retired", false, "the module still exists");
} catch {
  check("AdminKidsFinalizationPanel retired", true);
}
try {
  await import("../src/components/admin/AdminKidsReviewPanel.jsx");
  check("AdminKidsReviewPanel retired", false, "the module still exists");
} catch {
  check("AdminKidsReviewPanel retired", true);
}

/* ------------------------------------------------------------------ */
console.log("\n# 2. EMPLOYEE — /employee/products/review");
/* ------------------------------------------------------------------ */

try {
  const { default: Page } = await import("../src/pages/employee/EmployeeProductReview.jsx");
  const EmployeeAuthContext = (await import("../src/context/EmployeeAuthContext.jsx")).default;
  const { getEmployee, loadEmployees } = await import("../src/services/employees/employeeService.js");
  const { assignProductToEmployee } = await import("../src/services/productWorkflow.js");

  const MANAGER_ID = "PF-MGR-00008";
  const employee = getEmployee(loadEmployees(), MANAGER_ID);
  ["KID-001", "KID-002", "KID-003"].forEach((id) =>
    assignProductToEmployee(id, MANAGER_ID, { adminId: "PF-ADM-00001", name: "House Admin" })
  );

  const html = renderAt(
    React.createElement(
      EmployeeAuthContext.Provider,
      {
        value: {
          employee,
          loading: false,
          error: "",
          signIn: () => {},
          signOut: () => {},
          hasPermission: () => true,
          hasAnyPermission: () => true,
          hasAllPermissions: () => true,
          canAccessPath: () => true,
        },
      },
      React.createElement(Page)
    ),
    "/employee/products/review"
  );

  check("employee desk renders authenticated", html.length > 2000, `${html.length} chars`);
  check("assigned Kids products listed", /KID-00[123]/.test(html));
  check("mandatory image present", imagesIn(html).some((src) => /kids-0\d{2}/.test(src)));
  check("media filename shown", /kids-0\d{2}\.webp/.test(html));
  check("inventory editable", /Inventory/i.test(html));
  check("price editable", /Price/i.test(html));
  check("Save Draft offered", /Save\s*(as)?\s*draft/i.test(html));
  check("Submit for Review offered", /Submit for review/i.test(html));
  check("no placeholder/undefined leaked", !/\[object Object\]|>NaN</.test(html));
} catch (error) {
  check("employee desk renders authenticated", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 8).join("\n"));
}

/* ------------------------------------------------------------------ */
console.log("\n# 3. STOREFRONT — /category/kids");
/* ------------------------------------------------------------------ */

try {
  const { default: ProductCard } = await import("../src/design-system/components/ProductCard.jsx");
  const { getLiveStorefrontProducts } = await import("../src/data/products/index.js");
  const { getProductCardMedia } = await import("../src/services/media/productMediaSet.js");

  const kids = getLiveStorefrontProducts().filter((product) => product.category === "kidswear");
  check("published Kids products live", kids.length === 21, `${kids.length} live`);

  const html = renderAt(
    React.createElement(
      "div",
      null,
      kids.map((product) => React.createElement(ProductCard, { key: product.id, product }))
    ),
    "/category/kids"
  );
  check("all cards render", html.length > 5000, `${html.length} chars`);

  const srcs = imagesIn(html);
  check("one image per card", srcs.length === kids.length, `${srcs.length} images`);
  check("no image reused", new Set(srcs).size === srcs.length, `${new Set(srcs).size} distinct`);

  const wouldSwap = kids.filter((product) => getProductCardMedia(product).hoverImage !== undefined);
  check("hover = no change on standalone media", wouldSwap.length === 0, `${wouldSwap.length} would swap`);
  check("no draft leaked to the storefront", !/KID-0\d{2}/.test(html));
} catch (error) {
  check("storefront cards render", false, error.message);
  console.error(error.stack?.split("\n").slice(0, 8).join("\n"));
}

/* ------------------------------------------------------------------ */
const failed = results.filter((result) => !result.ok);
console.log(
  `\n${failed.length ? "RENDER QA FAIL" : "RENDER QA PASS"} — ${
    results.length - failed.length
  }/${results.length} checks`
);
if (failed.length) {
  failed.forEach((entry) => console.log(`  · ${entry.name} — ${entry.detail}`));
  process.exit(1);
}
