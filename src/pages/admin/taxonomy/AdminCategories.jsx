import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, Eye, Layers, Pencil, Plus, RotateCcw, Search } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import taxonomyRepository, { TAXONOMY_CHANGED_EVENT, TAXONOMY_STATUS } from "../../../services/taxonomyRepository";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const statusTone = { ACTIVE: "ink", DRAFT: "quiet", ARCHIVED: "muted" };

function useTaxonomyVersion() {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const handler = () => setVersion((current) => current + 1);
    window.addEventListener(TAXONOMY_CHANGED_EVENT, handler);
    window.addEventListener("pratikshya-products-changed", handler);
    return () => {
      window.removeEventListener(TAXONOMY_CHANGED_EVENT, handler);
      window.removeEventListener("pratikshya-products-changed", handler);
    };
  }, []);
  return version;
}

export default function AdminCategories() {
  const version = useTaxonomyVersion();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");

  const metrics = useMemo(() => taxonomyRepository.metrics(), [version]);
  const counts = useMemo(() => taxonomyRepository.productCounts(), [version]);
  const categories = useMemo(() => taxonomyRepository.categories(), [version]);
  const filtered = categories.filter((category) =>
    [category.name, category.slug, category.description].join(" ").toLowerCase().includes(query.trim().toLowerCase())
  );

  const archiveOrRestore = (category) => {
    const result = category.status === TAXONOMY_STATUS.ARCHIVED
      ? taxonomyRepository.restoreCategory(category.id, actor)
      : taxonomyRepository.archiveCategory(category.id, actor);
    setNotice(result.ok ? `${category.name} ${category.status === TAXONOMY_STATUS.ARCHIVED ? "restored" : "archived"}. Products were not changed.` : result.error);
  };

  return (
    <AdminPage
      eyebrow="Business / Taxonomy"
      title={<>Category <span className="italic text-accent">management.</span></>}
      description="One managed category hierarchy feeds product classification, shop filters, category pages, search, offers and breadcrumbs."
      actions={<AtelierButton as={Link} to="/admin/categories/new" size="chip"><Plus size={13} aria-hidden="true" /> Create category</AtelierButton>}
    >
      <div className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <AdminMetricCard label="Total Categories" value={metrics.totalCategories} hint="Managed taxonomy" />
        <AdminMetricCard label="Active Categories" value={metrics.activeCategories} hint="Customer-discoverable" />
        <AdminMetricCard label="Subcategories" value={metrics.subcategories} hint="Two-level hierarchy" />
        <AdminMetricCard label="Products Classified" value={metrics.productsClassified} hint="Have category" />
        <AdminMetricCard label="Unassigned Products" value={metrics.unassignedProducts} hint="Need category" tone={metrics.unassignedProducts ? "alert" : "default"} />
      </div>

      {notice ? <p role="status" className="mb-5 border border-mist bg-canvas px-4 py-3 font-ui text-sm text-ink">{notice}</p> : null}

      <AdminPanel eyebrow="Taxonomy" title="Categories">
        <label className="relative mb-5 block max-w-xl">
          <span className="sr-only">Search categories</span>
          <Search className="absolute left-3 top-3 text-taupe" size={15} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full border border-mist bg-canvas py-2.5 pl-9 pr-3 font-ui text-sm outline-none focus:border-accent"
            placeholder="Search category name, slug or description…"
          />
        </label>

        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                {["Category", "Subcategories", "Products", "Status", "Featured", "Sort Order", "Actions"].map((heading) => <th key={heading} className="px-3 py-3">{heading}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.map((category) => {
                const subcategories = taxonomyRepository.subcategories(category.id);
                return (
                  <tr key={category.id} className="border-b border-mist/60 font-ui text-sm">
                    <td className="px-3 py-4">
                      <Link to={`/admin/categories/${category.id}`} className="font-medium text-ink underline-offset-4 hover:text-accent hover:underline">{category.name}</Link>
                      <span className="block text-[11px] text-taupe">/{category.slug}</span>
                    </td>
                    <td className="px-3 py-4">{subcategories.length}</td>
                    <td className="px-3 py-4">{counts.byCategory[category.id] || 0}</td>
                    <td className="px-3 py-4"><StatusBadge label={category.status} tone={statusTone[category.status] || "quiet"} /></td>
                    <td className="px-3 py-4">{category.featured ? "Yes" : "No"}</td>
                    <td className="px-3 py-4">{category.sortOrder}</td>
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-2.5 text-taupe">
                        <Link to={`/admin/categories/${category.id}`} title="View"><Eye size={15} /></Link>
                        <Link to={`/admin/categories/${category.id}/edit`} title="Edit"><Pencil size={15} /></Link>
                        <Link to={`/admin/categories/${category.id}/subcategories`} title="Manage subcategories"><Layers size={15} /></Link>
                        <button type="button" onClick={() => archiveOrRestore(category)} title={category.status === TAXONOMY_STATUS.ARCHIVED ? "Restore" : "Archive"} className="hover:text-accent">
                          {category.status === TAXONOMY_STATUS.ARCHIVED ? <RotateCcw size={15} /> : <Archive size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 lg:hidden">
          {filtered.map((category) => (
            <article key={category.id} className="border border-mist/80 bg-canvas p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <Link to={`/admin/categories/${category.id}`} className="font-display text-xl text-ink">{category.name}</Link>
                  <p className="font-ui text-[11px] text-taupe">/{category.slug}</p>
                </div>
                <StatusBadge label={category.status} tone={statusTone[category.status] || "quiet"} />
              </div>
              <dl className="mt-4 grid grid-cols-3 gap-3 font-ui text-xs">
                <div><dt className="uppercase tracking-widest text-taupe">Subs</dt><dd>{taxonomyRepository.subcategories(category.id).length}</dd></div>
                <div><dt className="uppercase tracking-widest text-taupe">Products</dt><dd>{counts.byCategory[category.id] || 0}</dd></div>
                <div><dt className="uppercase tracking-widest text-taupe">Order</dt><dd>{category.sortOrder}</dd></div>
              </dl>
              <div className="mt-4 flex flex-wrap gap-2">
                <AtelierButton as={Link} to={`/admin/categories/${category.id}`} size="chip" variant="outline">View</AtelierButton>
                <AtelierButton as={Link} to={`/admin/categories/${category.id}/edit`} size="chip" variant="outline">Edit</AtelierButton>
              </div>
            </article>
          ))}
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
