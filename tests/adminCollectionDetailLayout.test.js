/**
 * PRATIKSHYA FASHON — Admin Collection Detail layout contracts.
 *
 * The Collection Detail desk must stay inside the Admin shell at common
 * desktop widths. Page-level horizontal overflow (or clipping the product
 * assignment controls) is a regression. Assignment behaviour is unchanged.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (relative) => readFileSync(join(ROOT, relative), "utf8");

const detail = src("src/pages/admin/taxonomy/AdminCollectionDetail.jsx");
const layout = src("src/layouts/AdminLayout.jsx");
const shell = src("src/components/navigation/PortalShell.jsx");
const page = src("src/components/admin/AdminPage.jsx");
const panel = src("src/components/admin/AdminPanel.jsx");

test("Admin shell main content can shrink to the remaining viewport beside the sidebar", () => {
  assert.match(layout, /expandedWidthClass="lg:w-\[248px\]"/);
  assert.match(shell, /min-w-0 w-full max-w-full flex-1/);
  assert.doesNotMatch(layout, /min-w-\[1\d{3}px\]/);
  assert.doesNotMatch(layout, /w-\[12\d{2}px\]/);
  assert.doesNotMatch(layout, /100vw/);
  assert.doesNotMatch(shell, /100vw/);
});

test("Admin page and panel frames allow nested grids to shrink instead of forcing overflow", () => {
  assert.match(page, /min-w-0/);
  assert.match(panel, /min-w-0/);
});

test("Collection Detail two-column layout uses shrinkable tracks, not a rigid 1fr auto-minimum", () => {
  assert.match(
    detail,
    /xl:grid-cols-\[minmax\(0,340px\)_minmax\(0,1fr\)\]/,
    "right column must be minmax(0,1fr) so assigned products cannot expand the page"
  );
  assert.doesNotMatch(
    detail,
    /xl:grid-cols-\[340px_1fr\]/,
    "bare 1fr is minmax(auto,1fr) and overflows when the table or filters are wide"
  );
});

test("Product assignment filter row is a wrapping fluid grid, not one rigid line of fixed columns", () => {
  assert.doesNotMatch(
    detail,
    /lg:grid-cols-\[1fr_160px_180px_150px\]/,
    "the previous fixed four-column filter row is the overflow source"
  );
  assert.match(
    detail,
    /2xl:grid-cols-\[minmax\(0,2fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)_minmax\(0,1fr\)\]/,
    "wide desktops keep Search | Category | Subcategory | Status on one fluid row"
  );
  assert.match(detail, /sm:grid-cols-3/, "narrower widths wrap Category / Subcategory / Status");
  assert.match(detail, /sm:col-span-3 2xl:col-span-1/, "search occupies its own row until the four-column breakpoint");
  assert.match(detail, /placeholder="Search products or SKU"/);
  assert.match(detail, /aria-label="Filter by category"/);
  assert.match(detail, /aria-label="Filter by subcategory"/);
  assert.match(detail, /aria-label="Filter by status"/);
});

test("Assigned products table may scroll internally but must not impose a page-level min-width", () => {
  assert.match(detail, /min-w-0 max-w-full overflow-x-auto/);
  assert.match(detail, /table-fixed/);
  assert.doesNotMatch(detail, /min-w-\[720px\]/);
  assert.match(detail, /block truncate font-medium text-ink hover:text-accent/);
});

test("Collection Detail does not hide overflow to fake a fit, and keeps assignment behaviour", () => {
  assert.doesNotMatch(detail, /overflow-x-hidden/);
  assert.doesNotMatch(detail, /scale-\[/);
  assert.match(detail, /taxonomyRepository\.addProductsToCollection/);
  assert.match(detail, /taxonomyRepository\.removeProductsFromCollection/);
  assert.match(detail, /taxonomyRepository\.isProductInCollection/);
  assert.match(detail, />Add selected to collection</);
  assert.match(detail, />Clear selection</);
  assert.match(detail, /disabled=\{!selected\.length\}/);
});
