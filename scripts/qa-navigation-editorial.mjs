/**
 * PRATIKSHYA FASHON — Mega-menu editorial panel QA.
 *
 * Server-renders the REAL `MegaMenu` for every primary navigation group and
 * asserts on the produced markup — the same thing the customer's browser
 * paints — rather than trusting the resolver in isolation:
 *
 *   1. every department menu renders a real <img>, not the empty plate
 *   2. the plate belongs to that department's own canonical media scope
 *   3. no two departments share a plate
 *   4. every submenu link still renders and still points where it did
 *   5. the feature copy and the "View the edit" action survive
 *
 * Run:  npm run qa:navigation-editorial
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

const { primaryNavigation } = await import("../src/config/navigationConfig.js");
const { default: MegaMenu } = await import("../src/components/shell/MegaMenu.jsx");
const { departments } = await import("../src/data/catalog/taxonomy.js");

const render = (group) =>
  renderToStaticMarkup(
    React.createElement(
      MemoryRouter,
      { initialEntries: [group.to] },
      React.createElement(MegaMenu, { id: "qa-mega", group })
    )
  );

const imagesIn = (html) => [...html.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]);
const hrefsIn = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);

/** The canonical media scope a department's plate is allowed to come from. */
const departmentScope = (id) => `/images/products/${id}/`;

console.log("\n# MEGA-MENU EDITORIAL PANEL\n");

const plates = new Map();

for (const group of primaryNavigation) {
  const html = render(group);
  const images = imagesIn(html);
  const links = hrefsIn(html);
  const src = images[0] ?? null;
  plates.set(group.id, src);

  const isDepartment = departments.some((department) => department.id === group.id);
  const label = group.label.toUpperCase();

  console.log(`## ${label}`);
  console.log(`   plate: ${src ?? "— none —"}`);

  check(`${label} renders a real image`, Boolean(src), src ? "" : "empty plate rendered");
  check(
    `${label} plate is not the empty-media placeholder`,
    !html.includes('role="img"'),
    html.includes('role="img"') ? "EmptyMedia rendered" : ""
  );

  if (isDepartment) {
    check(
      `${label} plate comes from its own canonical department scope`,
      Boolean(src && src.startsWith(departmentScope(group.id))),
      src ?? ""
    );
    /* No other department's folder may supply this menu's plate. */
    const foreign = departments
      .filter((department) => department.id !== group.id)
      .find((department) => src && src.startsWith(departmentScope(department.id)));
    check(`${label} shows no other department's imagery`, !foreign, foreign?.id ?? "");
  } else {
    check(
      `${label} plate comes from canonical collection or product media`,
      Boolean(src && (src.startsWith("/images/collections/") || src.startsWith("/images/products/"))),
      src ?? ""
    );
  }

  /* Every authored submenu link must still be present and unchanged. */
  const expected = group.columns.flatMap((column) => column.links.map((link) => link.to));
  const missing = expected.filter((to) => !links.includes(to));
  check(
    `${label} renders all ${expected.length} submenu links`,
    missing.length === 0,
    missing.join(", ")
  );
  check(`${label} feature links to ${group.feature.to}`, links.includes(group.feature.to));
  check(`${label} keeps the "View the edit" action`, html.includes("View the edit"));
  check(`${label} keeps its feature copy`, html.includes(group.feature.title));
  console.log("");
}

/* ------------------------------------------------------------------ */
const used = [...plates.values()].filter(Boolean);
check(
  "no two menus share the same plate",
  new Set(used).size === used.length,
  used.length ? "" : "no plates resolved"
);

const failed = results.filter((entry) => !entry.ok);
console.log(`\n# TOTALS\n\n  ${results.length - failed.length}/${results.length} checks passed\n`);
if (failed.length) {
  console.log("FAIL:");
  failed.forEach((entry) => console.log(`  · ${entry.name}${entry.detail ? ` — ${entry.detail}` : ""}`));
  process.exitCode = 1;
} else {
  console.log("PASS: every department mega-menu renders a department-correct editorial plate, and every submenu link still resolves.");
}
