import { useMemo, useState } from "react";
import { Check, ChevronLeft, ChevronRight, Package, Search, X } from "lucide-react";
import { AtelierButton } from "../../design-system";
import StatusBadge from "../employee/StatusBadge";
import PratikshyaImage from "../PratikshyaImage";
import { useProducts } from "../../hooks/useProducts";
import { getPlacement } from "../../config/mediaTypes";
import { getProductStatusLabel } from "../../config/productCatalogConfig";
import { categoryLabels } from "../../data/products/taxonomy";
import { resolveProductCover } from "../../services/media/productMediaSource";
import {
  departmentOptions,
  categoryOptionsFor,
  subcategoryOptionsFor,
  filterCatalogProducts,
} from "../../services/marketing/productCatalogQuery";
import { cn } from "../../utils/cn";

/**
 * PRATIKSHYA FASHON — Product Catalog Selector.
 *
 * The primary way a product-based marketing placement is curated. Instead of
 * uploading a product image again, the administrator browses the CANONICAL
 * product catalogue and points the section at products that already exist.
 * Only product IDs are returned — the catalogue remains the single source of
 * truth for the product's name, taxonomy and media.
 *
 *   · Source of truth: `catalogRepository` (through `useProducts`), seeded by
 *     `src/data/catalog/products.js`. No separate marketing product list is
 *     ever created — every department comes from this one door.
 *   · Search covers name, id, SKU, department, category and subcategory.
 *   · Department / category / subcategory filters derive from
 *     `src/data/catalog/taxonomy.js` (never hardcoded here).
 *   · When a placement recommends a taxonomy (`recommendedDepartment` etc.)
 *     the filters open pre-arranged, but the full catalogue stays reachable.
 *   · Product workflow is respected: every row shows the product's status, so
 *     an unapproved piece is visible and honest rather than hidden.
 */

const PAGE_SIZE = 24;

const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

/* ------------------------------------------------------------------ */
/* Row                                                                  */
/* ------------------------------------------------------------------ */

function CatalogRow({ product, selected, onToggle }) {
  /* The authored catalogue primary is the marketing preview (spec: use
     product.media.primary); the canonical cover resolver is the fallback. */
  const cover = product.media?.primary ? { src: product.media.primary, alt: product.name } : resolveProductCover(product);
  const statusLabel = getProductStatusLabel(product.status);
  const statusTone =
    product.status === "PUBLISHED"
      ? "ink"
      : product.status === "PENDING_REVIEW"
        ? "alert"
        : product.status === "ARCHIVED"
          ? "muted"
          : "quiet";

  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={selected}
        className={cn(
          "group flex w-full items-center gap-4 border px-3 py-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          selected
            ? "border-ink/60 bg-surface"
            : "border-mist/80 bg-canvas hover:border-ink/40"
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "flex h-5 w-5 shrink-0 items-center justify-center border transition-colors",
            selected ? "border-ink bg-ink text-ivory" : "border-pearl bg-surface text-transparent"
          )}
        >
          <Check size={12} strokeWidth={2.5} />
        </span>

        <span className="relative h-16 w-12 shrink-0 overflow-hidden border border-mist/80 bg-surface">
          {cover?.src ? (
            <PratikshyaImage image={cover} alt={product.name} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-canvas-deep">
              <Package size={14} strokeWidth={1.3} className="text-taupe" aria-hidden="true" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-sm font-medium text-ink">{product.name}</span>
          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-ui text-[11px] text-taupe">
            <span className="font-mono text-[10px] uppercase text-cocoa">{product.id}</span>
            {product.sku && product.sku !== product.id ? (
              <span className="font-mono text-[10px] text-taupe/80">{product.sku}</span>
            ) : null}
          </span>
          <span className="mt-1 block font-ui text-[11px] text-taupe">
            {product.department
              ? `${titleCase(product.department)} / ${categoryLabels[product.category] ?? titleCase(product.category)}`
              : categoryLabels[product.category] ?? titleCase(product.category)}
            {product.subcategory ? ` / ${titleCase(product.subcategory)}` : ""}
          </span>
        </span>

        <span className="hidden shrink-0 sm:block">
          <StatusBadge label={statusLabel} tone={statusTone} />
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Selector                                                             */
/* ------------------------------------------------------------------ */

export default function ProductCatalogSelector({
  placementId = null,
  initialSelectedIds = [],
  onCancel,
  onConfirm,
}) {
  const products = useProducts();

  const placement = placementId ? getPlacement(placementId) : null;

  /* Context-aware opening state: when the placement recommends a taxonomy,
     the filters start there — never locked, always clearable. */
  const [department, setDepartment] = useState(() => placement?.recommendedDepartment ?? "ALL");
  const [category, setCategory] = useState(() => placement?.recommendedCategory ?? "ALL");
  const [subcategory, setSubcategory] = useState(() => placement?.recommendedSubcategory ?? "ALL");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState(() => new Set(initialSelectedIds.map(String)));

  const departmentFilterOptions = useMemo(() => departmentOptions(), []);

  const categoryFilterOptions = useMemo(
    () => categoryOptionsFor(products, department),
    [products, department]
  );

  const subcategoryFilterOptions = useMemo(
    () => subcategoryOptionsFor(products, department, category),
    [products, department, category]
  );

  const isSuggested = Boolean(
    placement?.recommendedDepartment &&
      department === placement.recommendedDepartment &&
      (!placement.recommendedCategory || category === placement.recommendedCategory) &&
      (!placement.recommendedSubcategory || subcategory === placement.recommendedSubcategory)
  );

  const filtered = useMemo(
    () => filterCatalogProducts(products, { department, category, subcategory, query }),
    [products, department, category, subcategory, query]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selectedCount = selected.size;

  const resetToPageZero = (apply) => {
    apply();
    setPage(0);
  };

  const toggleProduct = (productId) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(String(productId))) next.delete(String(productId));
      else next.add(String(productId));
      return next;
    });
  };

  const togglePage = () => {
    const pageSelected = pageRows.every((product) => selected.has(String(product.id)));
    setSelected((current) => {
      const next = new Set(current);
      if (pageSelected) pageRows.forEach((product) => next.delete(String(product.id)));
      else pageRows.forEach((product) => next.add(String(product.id)));
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const resetSuggestions = () => {
    setDepartment("ALL");
    setCategory("ALL");
    setSubcategory("ALL");
    setPage(0);
  };

  const hasActiveFilter =
    department !== "ALL" || category !== "ALL" || subcategory !== "ALL" || Boolean(query.trim());

  return (
    <div className="border border-mist/80 bg-surface/40">
      <header className="border-b border-mist/70 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">Select from product catalog</p>
            <h3 className="mt-1 font-display text-xl font-light tracking-tight text-ink">
              Product Catalog Selector
            </h3>
            <p className="mt-1 font-ui text-[11px] text-taupe">
              Choose existing catalogue products — the section stores product IDs only, and the
              catalogue keeps supplying the name, taxonomy and imagery.
            </p>
          </div>
          <span className="font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            {filtered.length} {filtered.length === 1 ? "product" : "products"}
          </span>
        </div>
      </header>

      {/* Search */}
      <div className="border-b border-mist/70 px-5 py-4 sm:px-6">
        <label htmlFor="catalog-selector-search" className="sr-only">
          Search products
        </label>
        <div className="flex items-center gap-3 border border-mist/80 bg-canvas px-3 py-2.5 focus-within:border-ink/50">
          <Search size={15} className="shrink-0 text-taupe" aria-hidden="true" />
          <input
            id="catalog-selector-search"
            value={query}
            onChange={(event) => resetToPageZero(() => setQuery(event.target.value))}
            placeholder="Search products…"
            className="min-w-0 flex-1 bg-transparent font-ui text-sm text-ink outline-none placeholder:text-taupe/80"
          />
          {query ? (
            <button
              type="button"
              onClick={() => resetToPageZero(() => setQuery(""))}
              aria-label="Clear search"
              className="text-taupe transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
            >
              <X size={14} aria-hidden="true" />
            </button>
          ) : null}
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Department</span>
            <select
              value={department}
              onChange={(event) =>
                resetToPageZero(() => {
                  setDepartment(event.target.value);
                  setCategory("ALL");
                  setSubcategory("ALL");
                })
              }
              className="w-full border border-mist/80 bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-ink/50"
            >
              <option value="ALL">All Departments</option>
              {departmentFilterOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Category</span>
            <select
              value={category}
              onChange={(event) =>
                resetToPageZero(() => {
                  setCategory(event.target.value);
                  setSubcategory("ALL");
                })
              }
              className="w-full border border-mist/80 bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-ink/50"
            >
              <option value="ALL">All Categories</option>
              {categoryFilterOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Subcategory</span>
            <select
              value={subcategory}
              onChange={(event) => resetToPageZero(() => setSubcategory(event.target.value))}
              className="w-full border border-mist/80 bg-canvas px-3 py-2 font-ui text-xs text-ink outline-none focus:border-ink/50"
            >
              <option value="ALL">All Subcategories</option>
              {subcategoryFilterOptions.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {placement?.recommendedDepartment && hasActiveFilter ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 border border-brass/25 bg-brass/10 px-3 py-2">
            <p className="font-ui text-[10px] uppercase tracking-[.14em] text-brass-deep">
              {isSuggested
                ? `Suggested for ${placement.label} — you can still browse the full catalogue.`
                : `Filtered — ${placement.label} recommends ${departmentFilterOptions.find((entry) => entry.id === placement.recommendedDepartment)?.label ?? ""}${placement.recommendedCategory ? ` / ${categoryLabels[placement.recommendedCategory] ?? placement.recommendedCategory}` : ""}.`}
            </p>
            <button
              type="button"
              onClick={resetSuggestions}
              className="ml-auto font-ui text-[9px] uppercase tracking-[.16em] text-ink underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Show all products
            </button>
          </div>
        ) : null}
      </div>

      {/* List */}
      <div className="px-5 py-4 sm:px-6">
        {pageRows.length ? (
          <>
            <div className="mb-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={togglePage}
                className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {pageRows.every((product) => selected.has(String(product.id)))
                  ? "Clear page selection"
                  : "Select this page"}
              </button>
              <span className="font-ui text-[10px] text-taupe">
                Showing {safePage * PAGE_SIZE + 1}–{Math.min((safePage + 1) * PAGE_SIZE, filtered.length)} of{" "}
                {filtered.length}
              </span>
            </div>

            <ul className="space-y-2">
              {pageRows.map((product) => (
                <CatalogRow
                  key={product.id}
                  product={product}
                  selected={selected.has(String(product.id))}
                  onToggle={() => toggleProduct(product.id)}
                />
              ))}
            </ul>

            {pageCount > 1 ? (
              <div className="mt-4 flex items-center justify-between gap-3 border-t border-mist/70 pt-4">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={safePage === 0}
                  className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:text-accent disabled:cursor-not-allowed disabled:text-taupe/50 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  <ChevronLeft size={13} aria-hidden="true" /> Previous
                </button>
                <span className="font-ui text-[10px] tabular-nums text-taupe">
                  Page {safePage + 1} of {pageCount}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(pageCount - 1, current + 1))}
                  disabled={safePage >= pageCount - 1}
                  className="inline-flex items-center gap-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:text-accent disabled:cursor-not-allowed disabled:text-taupe/50 focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Next <ChevronRight size={13} aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </>
        ) : (
          <div className="border border-mist/80 bg-surface/30 px-5 py-10 text-center">
            <p className="font-ui text-sm text-taupe">
              No products match {hasActiveFilter ? "these filters." : "the catalogue yet."}
            </p>
            {hasActiveFilter ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setDepartment("ALL");
                  setCategory("ALL");
                  setSubcategory("ALL");
                  setPage(0);
                }}
                className="mt-2 font-ui text-[10px] uppercase tracking-[.16em] text-ink underline-offset-4 hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                Clear filters
              </button>
            ) : null}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-mist/70 bg-surface/50 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <p className="font-ui text-[11px] text-ink">
            <span className="font-medium">{selectedCount}</span>{" "}
            {selectedCount === 1 ? "product selected" : "products selected"}
          </p>
          {selectedCount ? (
            <button
              type="button"
              onClick={clearSelection}
              className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe underline-offset-4 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Clear
            </button>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <AtelierButton size="chip" variant="outline" onClick={onCancel}>
            Cancel
          </AtelierButton>
          <AtelierButton
            size="chip"
            variant="primary"
            disabled={selectedCount === 0}
            onClick={() => onConfirm([...selected])}
          >
            Add to section
          </AtelierButton>
        </div>
      </footer>
    </div>
  );
}
