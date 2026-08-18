/**
 * /employee/products
 *
 * With `products.manage`, the portal becomes a catalogue workspace: the
 * shared register in every status, with create, edit and submit-for-review.
 * Without it, the floor keeps its familiar storefront search. Both views
 * read one repository — the same products the storefront serves.
 */

import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Eye, Pencil, Plus, Search, UploadCloud } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import DataTable from "../../components/employee/DataTable";
import StatusBadge from "../../components/employee/StatusBadge";
import { AtelierButton } from "../../design-system";
import { searchProducts } from "../../services/employees/operationsService";
import { submitProduct } from "../../services/workflow/productWorkflowCommands";
import { useProducts } from "../../hooks/useProducts";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { PERMISSIONS } from "../../config/employeePermissions";
import { formatINR } from "../../utils/shopping";
import { employeeInputClass } from "../../components/employee/EmployeeField";
import { CATEGORY_OPTIONS, getProductStatusLabel } from "../../config/productCatalogConfig";
import { categoryLabels } from "../../data/products/taxonomy";

const statusTone = {
  PUBLISHED: "ink",
  PENDING_REVIEW: "alert",
  DRAFT: "quiet",
  ARCHIVED: "muted",
};

/* ------------------------------------------------------------------ */
/* Management workspace                                                */
/* ------------------------------------------------------------------ */

function ProductWorkspace() {
  const { employee, hasPermission } = useEmployeeAuth();
  const actor = employee
    ? {
        employeeId: employee.employeeId,
        label: `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim(),
      }
    : null;

  const items = useProducts();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [notice, setNotice] = useState(null);

  const canManage = hasPermission(PERMISSIONS.PRODUCTS_MANAGE);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return items.filter((product) => {
      if (status !== "ALL" && product.status !== status) return false;
      if (category !== "ALL" && product.category !== category) return false;
      if (!term) return true;
      return [
        product.name,
        product.sku,
        product.category,
        categoryLabels[product.category] ?? "",
        product.subcategory,
        product.fabric,
        product.collection,
      ]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [items, query, status, category]);

  const counts = useMemo(
    () => ({
      total: items.length,
      published: items.filter((p) => p.status === "PUBLISHED").length,
      drafts: items.filter((p) => p.status === "DRAFT").length,
      pending: items.filter((p) => p.status === "PENDING_REVIEW").length,
    }),
    [items]
  );

  const submit = (product) => {
    const result = submitProduct(product.id, actor);
    if (result.ok) setNotice(`“${product.name}” submitted for review.`);
    else setNotice((result.errors ?? [result.error]).join(" "));
  };

  return (
    <EmployeePage
      eyebrow="Catalogue"
      title={
        <>
          The product <span className="italic text-accent">workspace.</span>
        </>
      }
      description="One shared catalogue. Draft pieces, complete their records and submit them for review — approved pieces reach the storefront."
      actions={
        canManage ? (
          <AtelierButton as={Link} to="/employee/products/new" size="chip">
            <Plus size={13} aria-hidden="true" /> New product
          </AtelierButton>
        ) : null
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Total", counts.total],
          ["Published", counts.published],
          ["Drafts", counts.drafts],
          ["Pending review", counts.pending],
        ].map(([label, value]) => (
          <div key={label} className="border border-mist bg-surface/30 p-4">
            <p className="font-ui text-[10px] uppercase tracking-widest text-taupe">{label}</p>
            <p className="mt-1 font-display text-2xl font-light">{value}</p>
          </div>
        ))}
      </div>

      {notice ? (
        <p aria-live="polite" className="mb-5 border border-mist bg-surface/30 px-4 py-3 font-ui text-sm">
          {notice}
        </p>
      ) : null}

      <div className="mb-5 flex flex-col gap-3 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Search products</span>
          <Search className="absolute left-3 top-3 text-taupe" size={15} aria-hidden="true" />
          <input
            aria-label="Search products"
            className={employeeInputClass() + " pl-9"}
            placeholder="Search name, SKU, category…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select
            aria-label="Filter by category"
            className={employeeInputClass()}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="ALL">All categories</option>
            {CATEGORY_OPTIONS.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            aria-label="Filter by status"
            className={employeeInputClass()}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="ALL">All statuses</option>
            <option value="PUBLISHED">Published</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="DRAFT">Draft</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
      </div>

      <DataTable
        rows={filtered}
        rowKey="id"
        empty={items.length === 0 ? "No products yet — start building the PRATIKSHYA FASHON catalog by adding your first product." : "No products match those filters."}
        columns={[
          {
            id: "name",
            label: "Product",
            render: (row) => (
              <div>
                <Link
                  to={`/employee/products/${row.id}/edit`}
                  className="font-ui text-sm font-medium underline-offset-4 hover:text-accent hover:underline"
                >
                  {row.name}
                </Link>
                {row.review?.state === "REJECTED" && row.review.rejectionReason ? (
                  <p className="mt-1 text-[11px] text-accent font-medium">Rejected: {row.review.rejectionReason}</p>
                ) : null}
              </div>
            ),
          },
          { id: "sku", label: "SKU", render: (row) => <span className="font-mono text-xs text-taupe">{row.sku}</span> },
          {
            id: "category",
            label: "Category",
            render: (row) => (
              <span>
                {categoryLabels[row.category] ?? row.category ?? "—"}
                {row.subcategory ? <span className="block text-[11px] text-taupe">{row.subcategory}</span> : null}
              </span>
            ),
          },
          { id: "price", label: "Price", render: (row) => formatINR(row.price) },
          {
            id: "status",
            label: "Status",
            render: (row) => (
              <StatusBadge label={getProductStatusLabel(row.status)} tone={statusTone[row.status] ?? "quiet"} />
            ),
          },
          {
            id: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={`/employee/products/${row.id}/edit`}
                  aria-label={`Edit ${row.name}`}
                  className="inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-widest text-brass-deep underline-offset-4 hover:text-accent hover:underline"
                >
                  <Pencil size={12} aria-hidden="true" /> Edit
                </Link>
                {["DRAFT"].includes(row.status) ? (
                  <button
                    type="button"
                    onClick={() => submit(row)}
                    className="inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-widest text-accent underline-offset-4 hover:text-ink hover:underline"
                  >
                    <UploadCloud size={12} aria-hidden="true" /> Submit
                  </button>
                ) : null}
                <a
                  href={`/product/${row.slug}?preview=1`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-ui text-[11px] uppercase tracking-widest text-taupe underline-offset-4 hover:text-ink hover:underline"
                >
                  <Eye size={12} aria-hidden="true" /> Preview
                </a>
              </div>
            ),
          },
        ]}
      />
    </EmployeePage>
  );
}

/* ------------------------------------------------------------------ */
/* View-only search                                                    */
/* ------------------------------------------------------------------ */

function ProductSearch() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchProducts(query), [query]);

  return (
    <EmployeePage
      eyebrow="Catalogue"
      title={
        <>
          Search the <span className="italic text-accent">house.</span>
        </>
      }
      description="The same catalogue the storefront uses. Availability here is what the floor can promise today."
    >
      <div className="mb-6 max-w-md">
        <label htmlFor="product-search" className="mb-2 block font-ui text-[11px] uppercase tracking-[.18em] text-ink">
          Product search
        </label>
        <input
          id="product-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name, SKU, or identifier…"
          className={employeeInputClass()}
        />
      </div>
      <DataTable
        rows={results}
        rowKey="id"
        columns={[
          { id: "name", label: "Piece" },
          { id: "sku", label: "SKU" },
          { id: "categoryLabel", label: "Category" },
          { id: "price", label: "Price", render: (row) => formatINR(row.price) },
          { id: "availabilityLabel", label: "Availability" },
          {
            id: "open",
            label: "Storefront",
            render: (row) => (
              <Link to={`/product/${row.slug}`} className="text-brass hover:text-accent">
                View
              </Link>
            ),
          },
        ]}
        empty="No pieces match that search."
      />
    </EmployeePage>
  );
}

export default function EmployeeProducts() {
  const { hasPermission } = useEmployeeAuth();
  return hasPermission(PERMISSIONS.PRODUCTS_MANAGE) ? <ProductWorkspace /> : <ProductSearch />;
}
