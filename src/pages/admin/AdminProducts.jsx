/**
 * /admin/products
 *
 * The merchandising desk: repository-derived metrics, search, status
 * filtering, category filtering, bulk merchandising and the full product table.
 * Every row reads the shared catalogue repository; media summaries come from
 * the Phase 12 register. Covers only — the table never loads video.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · Search debounced, filtering uses precomputed searchable text
 *   · Cover resolution only for filtered rows (not all 168)
 *   · Row component memoized
 *   · Bulk actions with loading state and immediate feedback
 *   · Metrics memoized, derived data cached
 */

import { useCallback, useEffect, useMemo, useState, memo } from "react";
import { Link } from "react-router-dom";
import {
  Archive,
  Check,
  ClipboardCheck,
  Copy,
  Eye,
  Images,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  UploadCloud,
} from "lucide-react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import AdminMetricCard from "../../components/admin/AdminMetricCard";
import StatusBadge from "../../components/employee/StatusBadge";
import ConfirmDialog from "../../components/orders/ConfirmDialog";
import { AtelierButton } from "../../design-system";
import catalogRepository, { catalogMetrics } from "../../services/catalogRepository";
import {
  archiveProduct,
  duplicateProduct,
  publishProduct,
  restoreProduct,
  saveProductDraft,
} from "../../services/workflow/productWorkflowCommands";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../../services/workflow/productWorkflowState";
import inventoryRepository from "../../services/inventory/inventoryRepository";
import { useProducts } from "../../hooks/useProducts";
import { useProductMediaSummaries } from "../../hooks/useMedia";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { resolveProductCover } from "../../services/media/productMediaSource";
import { describeDiscount } from "../../utils/pricing";
import { formatINR } from "../../utils/shopping";
import { CATEGORY_OPTIONS, getProductStatusLabel } from "../../config/productCatalogConfig";
import { categoryLabels } from "../../data/products/taxonomy";

const discountLabel = (product) => {
  const fromPricing = describeDiscount(product.pricing);
  if (fromPricing !== "—") return fromPricing;
  if (product.originalPrice > product.price) {
    return `${Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)}% off`;
  }
  return "—";
};

const STATUS_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "PUBLISHED", label: "Published" },
  { id: "PENDING_REVIEW", label: "Pending review" },
  { id: "DRAFT", label: "Draft" },
  { id: "ARCHIVED", label: "Archived" },
];

const statusTone = {
  PUBLISHED: "ink",
  PENDING_REVIEW: "alert",
  DRAFT: "quiet",
  ARCHIVED: "muted",
};

const ProductRow = memo(function ProductRow({
  product,
  summary,
  cover,
  selected,
  onToggleSelect,
  onPublishQuick,
  onDuplicate,
  onArchive,
  onRestore,
  busyId,
}) {
  const canQuickPublish = getProductWorkflowState(product).stage === WORKFLOW_STAGES.APPROVED;
  const isBusy = busyId === product.id;
  return (
    <tr className="border-b border-mist/60 font-ui text-sm">
      <td className="px-3 py-4 align-top">
        <input
          type="checkbox"
          aria-label={`Select ${product.name}`}
          checked={selected.includes(product.id)}
          onChange={() => onToggleSelect(product.id)}
        />
      </td>
      <td className="px-3 py-4">
        <div className="flex items-center gap-3">
          {cover?.src ? (
            <img src={cover.src} alt="" loading="lazy" className="h-12 w-10 shrink-0 object-cover border border-mist/60" />
          ) : (
            <span className="h-12 w-10 shrink-0 bg-mist/60 flex items-center justify-center font-ui text-[9px] text-taupe">No img</span>
          )}
          <div className="min-w-0">
            <Link
              to={`/admin/products/${product.id}`}
              className="block max-w-56 truncate font-medium text-ink underline-offset-4 hover:text-accent hover:underline"
            >
              {product.name}
            </Link>
            <p className="text-[11px] text-taupe">{product.brand}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-4 align-top text-taupe font-mono text-xs">{product.sku}</td>
      <td className="px-3 py-4 align-top">
        <span className="font-medium text-ink">{categoryLabels[product.category] ?? product.category}</span>
        {product.subcategory ? <span className="block text-[11px] text-taupe">{product.subcategory}</span> : null}
      </td>
      <td className="px-3 py-4 align-top">
        <span className="font-medium text-ink">{formatINR(product.price)}</span>
        {product.originalPrice > product.price ? (
          <span className="block text-[11px] text-taupe line-through">{formatINR(product.originalPrice)}</span>
        ) : null}
      </td>
      <td className="px-3 py-4 align-top text-taupe">{discountLabel(product)}</td>
      <td className="px-3 py-4 align-top">{product.variants?.length || "—"}</td>
      <td className="px-3 py-4 align-top">
        {!summary || summary.isEmpty ? (
          <Link
            to={`/admin/products/${product.id}/media`}
            className="font-ui text-[11px] uppercase tracking-widest text-taupe underline-offset-4 hover:text-accent hover:underline"
          >
            Add media
          </Link>
        ) : (
          <Link
            to={`/admin/products/${product.id}/media`}
            className="flex flex-col gap-0.5 underline-offset-4 hover:text-accent hover:underline"
          >
            <span className="font-ui text-[11px] text-ink">{summary.images} img · {summary.videos} vid</span>
            {summary.needsCover && !product.image ? (
              <span className="font-ui text-[10px] uppercase tracking-widest text-accent font-semibold">Needs cover</span>
            ) : null}
          </Link>
        )}
      </td>
      <td className="px-3 py-4 align-top">
        <StatusBadge label={getProductStatusLabel(product.status)} tone={statusTone[product.status] ?? "quiet"} />
      </td>
      <td className="px-3 py-4 align-top text-[11px] text-taupe">
        {product.updatedAt ? new Date(product.updatedAt).toLocaleDateString("en-IN") : "—"}
        {product.updatedBy ? <span className="block text-[10px]">{product.updatedBy}</span> : null}
      </td>
      <td className="px-3 py-4 align-top">
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to={`/admin/products/${product.id}`} aria-label={`View ${product.name}`} title="View record" className="text-taupe hover:text-ink"><Eye size={15} aria-hidden="true" /></Link>
          <Link to={`/admin/products/${product.id}/edit`} aria-label={`Edit ${product.name}`} title="Edit product" className="text-taupe hover:text-ink"><Pencil size={15} aria-hidden="true" /></Link>
          <Link to={`/admin/products/${product.id}/media`} aria-label={`Manage media for ${product.name}`} title="Manage Media" className="text-taupe hover:text-ink"><Images size={15} aria-hidden="true" /></Link>
          {canQuickPublish ? (
            <button
              type="button"
              aria-label={`Publish approved product ${product.name}`}
              title="Publish approved product"
              disabled={isBusy}
              onClick={() => onPublishQuick(product)}
              className={`text-taupe hover:text-accent ${isBusy ? "opacity-40" : ""}`}
            >
              <Check size={15} aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={`Duplicate ${product.name}`}
            title="Duplicate"
            disabled={isBusy}
            onClick={() => onDuplicate(product)}
            className={`text-taupe hover:text-ink ${isBusy ? "opacity-40" : ""}`}
          >
            <Copy size={15} aria-hidden="true" />
          </button>
          {product.status === "ARCHIVED" ? (
            <button type="button" aria-label={`Restore ${product.name}`} title="Restore" disabled={isBusy} onClick={() => onRestore(product)} className={`text-taupe hover:text-ink ${isBusy ? "opacity-40" : ""}`}><RotateCcw size={15} aria-hidden="true" /></button>
          ) : (
            <button type="button" aria-label={`Archive ${product.name}`} title="Archive" disabled={isBusy} onClick={() => onArchive(product)} className={`text-taupe hover:text-accent ${isBusy ? "opacity-40" : ""}`}><Archive size={15} aria-hidden="true" /></button>
          )}
        </div>
      </td>
    </tr>
  );
});

export default function AdminProducts() {
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;

  const items = useProducts();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [selected, setSelected] = useState([]);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [pendingBulkAction, setPendingBulkAction] = useState(null);

  const mediaSummaries = useProductMediaSummaries(items);

  // Debounce search input for responsive typing
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);

  // Precompute searchable text per product to avoid rebuilding string on every filter
  const searchIndex = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < items.length; i += 1) {
      const p = items[i];
      const text = [
        p.name,
        p.sku,
        p.category,
        categoryLabels[p.category] ?? "",
        p.subcategory,
        p.brand,
        p.fabric,
        p.collection,
        ...(p.tags ?? []),
      ].join(" ").toLowerCase();
      map.set(p.id, text);
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const term = debouncedQuery.trim().toLowerCase();
    return items.filter((product) => {
      if (status !== "ALL" && product.status !== status) return false;
      if (category !== "ALL" && product.category !== category) return false;
      if (!term) return true;
      const hay = searchIndex.get(product.id) || "";
      return hay.includes(term);
    });
  }, [items, debouncedQuery, status, category, searchIndex]);

  // Only resolve covers for filtered rows (not all 168)
  const covers = useMemo(
    () => Object.fromEntries(filtered.map((product) => [product.id, resolveProductCover(product)])),
    [filtered]
  );

  const metrics = useMemo(() => catalogMetrics(items), [items]);

  const toggleSelect = useCallback((id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    ), []);

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.includes(p.id));

  const toggleSelectAll = useCallback(() => {
    const visibleIds = new Set(filtered.map((product) => product.id));
    setSelected((current) =>
      allVisibleSelected
        ? current.filter((id) => !visibleIds.has(id))
        : [...new Set([...current, ...visibleIds])]
    );
  }, [allVisibleSelected, filtered]);

  /** Merchandising bulk actions are ordinary Product edits, so every selected
   * ID must pass through the same authorization and editable-stage command as
   * an individual Admin Products save. Protected Products remain unchanged and
   * retain the command's exact blocker in the partial-success report. */
  const runMerchandisingBulk = useCallback((patch, label) => {
    if (!selected.length || bulkBusy) return;
    const ids = [...selected];
    setBulkBusy(true);
    setNotice(`${label}: processing ${ids.length} products…`);
    setTimeout(() => {
      const results = ids.map((id) => {
        const product = catalogRepository.find(id);
        const result = saveProductDraft(id, patch, actor);
        return {
          id,
          name: product?.name ?? id,
          ok: Boolean(result.ok),
          reasons: result.errors?.length
            ? result.errors
            : [result.error || "Product edit failed."],
        };
      });
      const applied = results.filter((result) => result.ok).length;
      const blocked = results.filter((result) => !result.ok);
      setNotice(
        <>
          <p>
            {label}: applied to {applied} product{applied === 1 ? "" : "s"}
            {blocked.length ? `, ${blocked.length} blocked.` : "."}
          </p>
          {blocked.length ? (
            <ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-accent">
              {blocked.map((result) => (
                <li key={result.id}>
                  <span className="font-medium">{result.id}</span>{" — "}
                  {result.reasons.join(" ")}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      );
      setSelected([]);
      setBulkBusy(false);
    }, 0);
  }, [selected, bulkBusy, actor]);

  /** Lifecycle bulk actions deliberately invoke the authoritative individual
   * command for every selected Product ID. A failed Product stays unchanged,
   * while its canonical validator/authorization message is surfaced intact. */
  const runWorkflowBulk = useCallback(() => {
    if (!pendingBulkAction || !selected.length || bulkBusy) return;
    const action = pendingBulkAction;
    const ids = [...selected];
    setPendingBulkAction(null);
    setBulkBusy(true);
    setNotice(`${action.label}: processing ${ids.length} products…`);
    setTimeout(() => {
      const results = ids.map((id) => {
        const product = catalogRepository.find(id);
        const result = action.id === "publish"
          ? publishProduct(id, actor)
          : archiveProduct(id, actor);
        if (action.id === "publish" && result.ok) {
          inventoryRepository.ensureOpeningStock(result.product, actor);
        }
        return {
          id,
          name: product?.name ?? id,
          ok: Boolean(result.ok),
          reasons: result.errors?.length
            ? result.errors
            : [result.error || "Workflow action failed."],
        };
      });
      const applied = results.filter((result) => result.ok).length;
      const blocked = results.filter((result) => !result.ok);
      setNotice(
        <>
          <p>
            {action.label}: applied to {applied} product{applied === 1 ? "" : "s"}
            {blocked.length ? `, ${blocked.length} blocked.` : "."}
          </p>
          {blocked.length ? (
            <ul className="mt-2 max-h-56 list-disc space-y-1 overflow-y-auto pl-5 text-accent">
              {blocked.map((result) => (
                <li key={result.id}>
                  <span className="font-medium">{result.id}</span>{" — "}
                  {result.reasons.join(" ")}
                </li>
              ))}
            </ul>
          ) : null}
        </>
      );
      setSelected([]);
      setBulkBusy(false);
    }, 0);
  }, [pendingBulkAction, selected, bulkBusy, actor]);

  const publishQuick = useCallback((product) => {
    if (busyId) return;
    setBusyId(product.id);
    setNotice(`Publishing “${product.name}”…`);
    setTimeout(() => {
      const result = publishProduct(product.id, actor);
      if (result.ok) {
        inventoryRepository.ensureOpeningStock(result.product, actor);
        setNotice(`Published “${product.name}” — now visible to customers.`);
      } else {
        setNotice(`Could not publish “${product.name}”: ${(result.errors ?? [result.error]).join(" ")}`);
      }
      setBusyId(null);
    }, 0);
  }, [busyId, actor]);

  const handleDuplicate = useCallback((product) => {
    if (busyId) return;
    setBusyId(product.id);
    setTimeout(() => {
      const result = duplicateProduct(product.id, actor);
      setNotice(
        result.ok
          ? `Duplicated as “${result.product.name}” — review its SKU and slug.`
          : `Could not duplicate “${product.name}”: ${result.error}`
      );
      setBusyId(null);
    }, 0);
  }, [busyId, actor]);

  const handleArchive = useCallback((product) => {
    if (busyId) return;
    setBusyId(product.id);
    setTimeout(() => {
      const result = archiveProduct(product.id, actor);
      setNotice(
        result.ok
          ? `Archived “${product.name}”.`
          : `Could not archive “${product.name}”: ${result.error}`
      );
      setBusyId(null);
    }, 0);
  }, [busyId, actor]);

  const handleRestore = useCallback((product) => {
    if (busyId) return;
    setBusyId(product.id);
    setTimeout(() => {
      const result = restoreProduct(product.id, actor);
      setNotice(
        result.ok
          ? `Restored “${product.name}” to draft.`
          : `Could not restore “${product.name}”: ${result.error}`
      );
      setBusyId(null);
    }, 0);
  }, [busyId, actor]);

  const clearNotice = () => setNotice(null);
  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(clearNotice, 6000);
    return () => clearTimeout(timer);
  }, [notice]);

  return (
    <AdminPage
      eyebrow="Business / Products"
      title={<>Product <span className="italic text-accent">catalog.</span></>}
      description="One catalogue serves the storefront, the portals and every future surface. Manage identity, pricing, variants, media and publishing from this desk."
      actions={
        <>
          <AtelierButton as={Link} to="/admin/products/review" size="chip" variant="outline">
            <ClipboardCheck size={13} aria-hidden="true" /> Review queue{metrics.pendingReview ? ` (${metrics.pendingReview})` : ""}
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/products/new" size="chip">
            <Plus size={13} aria-hidden="true" /> Create product
          </AtelierButton>
        </>
      }
    >
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <AdminMetricCard label="Total" value={metrics.total} hint="Every product record" />
        <AdminMetricCard label="Published" value={metrics.published} hint="Visible to customers" />
        <AdminMetricCard label="Draft" value={metrics.drafts} hint="In progress" />
        <AdminMetricCard label="Pending Review" value={metrics.pendingReview} hint="Awaiting approval" tone={metrics.pendingReview ? "alert" : "default"} />
        <AdminMetricCard label="Archived" value={metrics.archived} hint="Retired, order-safe" />
        <AdminMetricCard label="Featured" value={metrics.featured} hint="House selection" />
        <AdminMetricCard label="Bestseller" value={metrics.bestsellers} hint="Proven favourites" />
        <AdminMetricCard label="New Arrivals" value={metrics.newArrivals} hint="Just-in edit" />
        <AdminMetricCard label="Needs Media" value={metrics.needsMedia} hint="Missing a cover" tone={metrics.needsMedia ? "alert" : "default"} />
        <AdminMetricCard label="Needs Pricing Review" value={metrics.needsPricingReview} hint="Incomplete or invalid" tone={metrics.needsPricingReview ? "alert" : "default"} />
      </div>

      {notice ? (
        <div aria-live="polite" className="mb-5 border border-mist/80 bg-canvas px-4 py-3 font-ui text-sm text-ink">
          {notice}
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={Boolean(pendingBulkAction)}
        title={`${pendingBulkAction?.label ?? "Update"} selected products?`}
        description={
          pendingBulkAction?.id === "publish"
            ? `Each of the ${selected.length} selected Product IDs will run through the canonical Publish command. Only approved Products that pass full validation will publish; blocked Products stay unchanged and their exact warnings will be shown.`
            : `Each of the ${selected.length} selected Product IDs will run through the canonical Archive command. Blocked Products stay unchanged and their exact warnings will be shown.`
        }
        confirmLabel={pendingBulkAction?.label ?? "Confirm"}
        cancelLabel="Cancel"
        onConfirm={runWorkflowBulk}
        onCancel={() => setPendingBulkAction(null)}
        tone={pendingBulkAction?.id === "archive" ? "danger" : "primary"}
      />

      <AdminPanel eyebrow="Catalog" title="Products">
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <span className="sr-only">Search products</span>
            <Search className="absolute left-3 top-3 text-taupe" size={15} aria-hidden="true" />
            <input
              aria-label="Search products"
              className="w-full border border-mist py-2.5 pl-9 pr-3 font-ui text-sm outline-none focus:border-accent"
              placeholder="Search name, SKU, category, fabric, tags…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="flex items-center gap-2">
            <label htmlFor="admin-category-filter" className="sr-only">Filter by category</label>
            <select
              id="admin-category-filter"
              aria-label="Filter by category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="border border-mist bg-canvas px-3 py-2.5 font-ui text-xs text-ink outline-none focus:border-accent"
            >
              <option value="ALL">All categories</option>
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Status filter">
            {STATUS_FILTERS.map((option) => (
              <button
                key={option.id}
                type="button"
                role="radio"
                aria-checked={status === option.id}
                onClick={() => setStatus(option.id)}
                className={
                  status === option.id
                    ? "border border-ink bg-ink px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ivory"
                    : "border border-mist px-3 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink"
                }
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {selected.length ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 border border-mist/80 bg-canvas p-3">
            <p className="mr-2 font-ui text-[11px] uppercase tracking-[.16em] text-ink font-medium">{selected.length} selected{bulkBusy ? " · processing…" : ""}</p>
            <button type="button" disabled={bulkBusy} onClick={() => setPendingBulkAction({ id: "publish", label: "Publish" })} className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40"><UploadCloud size={11} className="mr-1 inline" aria-hidden="true" /> Publish</button>
            <button type="button" disabled={bulkBusy} onClick={() => setPendingBulkAction({ id: "archive", label: "Archive" })} className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40"><Archive size={11} className="mr-1 inline" aria-hidden="true" /> Archive</button>
            <button type="button" disabled={bulkBusy} onClick={() => runMerchandisingBulk({ isFeatured: true }, "Mark featured")} className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40">Mark featured</button>
            <button type="button" disabled={bulkBusy} onClick={() => runMerchandisingBulk({ isBestseller: true }, "Mark bestseller")} className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40">Mark bestseller</button>
            <button type="button" disabled={bulkBusy} onClick={() => runMerchandisingBulk({ isNew: true }, "Mark new arrival")} className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40">Mark new arrival</button>
            <button type="button" onClick={() => setSelected([])} className="ml-auto font-ui text-[10px] uppercase tracking-[.14em] text-taupe underline-offset-4 hover:text-accent hover:underline">Clear</button>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                <th className="px-3 py-3"><input type="checkbox" aria-label="Select all visible products" checked={allVisibleSelected} onChange={toggleSelectAll} /></th>
                {["Product", "SKU", "Category", "Price", "Discount", "Variants", "Media", "Status", "Updated", "Actions"].map((heading) => (
                  <th className="px-3 py-3" key={heading} scope="col">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((product) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  summary={mediaSummaries[product.id]}
                  cover={covers[product.id]}
                  selected={selected}
                  onToggleSelect={toggleSelect}
                  onPublishQuick={publishQuick}
                  onDuplicate={handleDuplicate}
                  onArchive={handleArchive}
                  onRestore={handleRestore}
                  busyId={busyId}
                />
              ))}
            </tbody>
          </table>
        </div>

        {!filtered.length ? (
          items.length === 0 ? (
            <div className="py-16 text-center">
              <p className="font-display text-2xl font-light text-ink">No products yet</p>
              <p className="mt-2 font-ui text-sm text-taupe">
                Start building the PRATIKSHYA FASHON catalog by adding your first product.
              </p>
              <Link
                to="/admin/products/new"
                className="mt-5 inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2.5 font-ui text-[10px] uppercase tracking-[.14em] text-ivory transition-colors hover:bg-ink/90"
              >
                <Plus size={13} aria-hidden="true" /> Create product
              </Link>
            </div>
          ) : (
            <p className="py-12 text-center font-ui text-sm text-taupe">No products match your current filters.</p>
          )
        ) : null}
      </AdminPanel>
    </AdminPage>
  );
}
