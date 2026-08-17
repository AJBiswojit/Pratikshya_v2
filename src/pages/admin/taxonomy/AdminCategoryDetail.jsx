import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, Pencil, RotateCcw } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import catalogRepository from "../../../services/catalogRepository";
import taxonomyRepository, { TAXONOMY_STATUS } from "../../../services/taxonomyRepository";
import { useAdminAuth } from "../../../context/AdminAuthContext";
import { formatINR } from "../../../utils/shopping";
import { slugify } from "../../../services/catalogRepository";

const inputClass = "w-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent";
const statusTone = { ACTIVE: "ink", DRAFT: "quiet", ARCHIVED: "muted" };

const Term = ({ label, value }) => (
  <div><dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt><dd className="mt-1 font-ui text-sm font-medium text-ink">{value || "—"}</dd></div>
);

export default function AdminCategoryDetail() {
  const { categoryId } = useParams();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [subDraft, setSubDraft] = useState({ name: "", slug: "", description: "", sortOrder: 100, status: TAXONOMY_STATUS.ACTIVE });

  const category = useMemo(() => taxonomyRepository.findCategory(categoryId), [categoryId, version]);
  const products = useMemo(() => catalogRepository.all().filter((product) => product.category === category?.id), [category, version]);
  const subcategories = useMemo(() => taxonomyRepository.subcategories(category?.id), [category, version]);

  if (!category) {
    return <AdminPage title="Category unavailable"><AtelierButton as={Link} to="/admin/categories" size="chip">Back to categories</AtelierButton></AdminPage>;
  }

  const archiveOrRestore = () => {
    const result = category.status === TAXONOMY_STATUS.ARCHIVED
      ? taxonomyRepository.restoreCategory(category.id, actor)
      : taxonomyRepository.archiveCategory(category.id, actor);
    if (result.ok) {
      setNotice(category.status === TAXONOMY_STATUS.ARCHIVED ? "Category restored." : products.length ? "This category contains products and cannot be permanently deleted. It has been archived instead." : "Category archived.");
      setVersion((value) => value + 1);
    } else setNotice(result.error);
  };

  const createSubcategory = (event) => {
    event.preventDefault();
    if (!subDraft.name.trim()) return setNotice("Subcategory name is required.");
    const result = taxonomyRepository.createSubcategory(category.id, { ...subDraft, slug: slugify(subDraft.slug || subDraft.name), sortOrder: Number(subDraft.sortOrder) || 0 }, actor);
    if (result.ok) {
      setSubDraft({ name: "", slug: "", description: "", sortOrder: 100, status: TAXONOMY_STATUS.ACTIVE });
      setNotice("Subcategory created.");
      setVersion((value) => value + 1);
    } else setNotice(result.error);
  };

  const toggleSubcategory = (subcategory) => {
    const result = subcategory.status === TAXONOMY_STATUS.ARCHIVED
      ? taxonomyRepository.restoreSubcategory(subcategory.id, actor)
      : taxonomyRepository.archiveSubcategory(subcategory.id, actor);
    setNotice(result.ok ? (subcategory.status === TAXONOMY_STATUS.ARCHIVED ? "Subcategory restored." : "Subcategory archived. Products remain intact.") : result.error);
    setVersion((value) => value + 1);
  };

  return (
    <AdminPage
      eyebrow="Business / Taxonomy"
      title={category.name}
      description={category.description || "Category record from the central taxonomy repository."}
      actions={
        <>
          <AtelierButton as={Link} to={`/admin/categories/${category.id}/edit`} size="chip" variant="outline"><Pencil size={12} /> Edit</AtelierButton>
          <AtelierButton onClick={archiveOrRestore} size="chip" variant="outline">{category.status === TAXONOMY_STATUS.ARCHIVED ? <RotateCcw size={12} /> : <Archive size={12} />} {category.status === TAXONOMY_STATUS.ARCHIVED ? "Restore" : "Archive"}</AtelierButton>
        </>
      }
    >
      {notice ? <p role="status" className="mb-5 border border-mist bg-canvas px-4 py-3 font-ui text-sm text-ink">{notice}</p> : null}

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <AdminPanel eyebrow="Category information" title="Overview">
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Term label="Name" value={category.name} />
              <Term label="Slug" value={`/${category.slug}`} />
              <Term label="Status" value={<StatusBadge label={category.status} tone={statusTone[category.status] || "quiet"} />} />
              <Term label="Featured" value={category.featured ? "Yes" : "No"} />
              <Term label="Sort order" value={String(category.sortOrder)} />
              <Term label="Image" value={category.image} />
              <Term label="SEO title" value={category.seoTitle} />
              <Term label="SEO description" value={category.seoDescription} />
              <Term label="Products" value={String(products.length)} />
            </dl>
          </AdminPanel>

          <AdminPanel eyebrow="Subcategory management" title={`Subcategories (${subcategories.length})`}>
            <form onSubmit={createSubcategory} className="mb-6 grid gap-3 md:grid-cols-[1fr_1fr_120px_120px]">
              <input className={inputClass} value={subDraft.name} onChange={(event) => setSubDraft((current) => ({ ...current, name: event.target.value, slug: current.slug || slugify(event.target.value) }))} placeholder="Subcategory name" aria-label="Subcategory name" />
              <input className={inputClass} value={subDraft.slug} onChange={(event) => setSubDraft((current) => ({ ...current, slug: slugify(event.target.value) }))} placeholder="banarasi-sarees" aria-label="Subcategory slug" />
              <input type="number" className={inputClass} value={subDraft.sortOrder} onChange={(event) => setSubDraft((current) => ({ ...current, sortOrder: event.target.value }))} aria-label="Sort order" />
              <AtelierButton type="submit" size="chip">Create</AtelierButton>
            </form>
            <div className="divide-y divide-mist/70 border border-mist/80 bg-canvas">
              {subcategories.map((subcategory) => {
                const count = products.filter((product) => product.subcategory === subcategory.name).length;
                return (
                  <div key={subcategory.id} className="flex flex-col gap-3 p-3 font-ui text-sm sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-ink">{subcategory.name}</p>
                      <p className="text-[11px] text-taupe">/{subcategory.slug} · {count} product{count === 1 ? "" : "s"}</p>
                    </div>
                    <StatusBadge label={subcategory.status} tone={statusTone[subcategory.status] || "quiet"} />
                    <AtelierButton size="chip" variant="outline" onClick={() => toggleSubcategory(subcategory)}>{subcategory.status === TAXONOMY_STATUS.ARCHIVED ? "Restore" : "Archive"}</AtelierButton>
                  </div>
                );
              })}
            </div>
          </AdminPanel>

          <AdminPanel eyebrow="Category → Product view" title={`Products (${products.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left">
                <thead><tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">{["Product", "SKU", "Subcategory", "Price", "Status"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
                <tbody>{products.map((product) => <tr key={product.id} className="border-b border-mist/60 font-ui text-sm"><td className="px-3 py-3"><Link to={`/admin/products/${product.id}`} className="font-medium text-ink hover:text-accent">{product.name}</Link></td><td className="px-3 py-3 text-taupe">{product.sku}</td><td className="px-3 py-3">{product.subcategory || "—"}</td><td className="px-3 py-3">{formatINR(product.price)}</td><td className="px-3 py-3"><StatusBadge label={product.status} tone={product.status === "PUBLISHED" ? "ink" : product.status === "ARCHIVED" ? "muted" : "quiet"} /></td></tr>)}</tbody>
              </table>
            </div>
          </AdminPanel>
        </div>

        <AdminPanel eyebrow="Activity" title="Taxonomy diary">
          <p className="font-ui text-sm leading-relaxed text-taupe">Creates, updates, archives and restores are recorded in the shared activity log. Product records keep their IDs and are never deleted when a category is archived.</p>
          <AtelierButton as={Link} to="/admin/activity" variant="outline" size="chip" className="mt-4">Open activity log</AtelierButton>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
