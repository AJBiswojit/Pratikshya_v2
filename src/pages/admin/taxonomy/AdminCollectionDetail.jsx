import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, Pause, Pencil, Play, Search } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import catalogRepository from "../../../services/catalogRepository";
import taxonomyRepository from "../../../services/taxonomyRepository";
import { getById as getMediaById } from "../../../services/media/mediaRepository";
import { imageRef } from "../../../data/pratikshyaImageManifest";
import { formatINR } from "../../../utils/shopping";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const inputClass = "w-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent";
const tone = { ACTIVE: "ink", SCHEDULED: "brass", PAUSED: "alert", EXPIRED: "muted", ARCHIVED: "muted", DRAFT: "quiet" };

const Term = ({ label, value }) => <div><dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt><dd className="mt-1 font-ui text-sm font-medium text-ink">{value || "—"}</dd></div>;

export default function AdminCollectionDetail() {
  const { collectionId } = useParams();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const [version, setVersion] = useState(0);
  const [notice, setNotice] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [subcategory, setSubcategory] = useState("ALL");
  const [status, setStatus] = useState("PUBLISHED");
  const [selected, setSelected] = useState([]);

  const collection = useMemo(() => taxonomyRepository.findCollection(collectionId), [collectionId, version]);
  const products = useMemo(() => catalogRepository.all(), [version]);
  const assigned = useMemo(() => products.filter((product) => taxonomyRepository.isProductInCollection(product, collection?.id)), [products, collection]);
  const assignedIds = new Set(assigned.map((product) => product.id));
  const categories = taxonomyRepository.categoryOptions();
  const subcategories = category === "ALL" ? [] : taxonomyRepository.subcategoryOptionsFor(category);

  if (!collection) return <AdminPage title="Collection unavailable"><AtelierButton as={Link} to="/admin/collections" size="chip">Back to collections</AtelierButton></AdminPage>;

  const hero = collection.heroMediaId ? getMediaById(collection.heroMediaId) : null;
  const heroSrc = hero?.status === "ACTIVE" && hero.url ? hero.url : imageRef(collection.image || "hero-atelier")?.src;

  const filteredProducts = products.filter((product) => {
    if (status !== "ALL" && product.status !== status) return false;
    if (category !== "ALL" && product.category !== category) return false;
    if (subcategory !== "ALL" && product.subcategory !== subcategory) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [product.name, product.sku, product.category, product.subcategory, product.collection].join(" ").toLowerCase().includes(term);
  }).slice(0, 80);

  const mutateStatus = (kind) => {
    const action = kind === "activate" ? taxonomyRepository.activateCollection : kind === "pause" ? taxonomyRepository.pauseCollection : taxonomyRepository.archiveCollection;
    const result = action(collection.id, actor);
    setNotice(result.ok ? `Collection ${kind}d.` : result.error);
    setVersion((value) => value + 1);
  };

  const addSelected = () => {
    const result = taxonomyRepository.addProductsToCollection(collection.id, selected, actor);
    setNotice(result.ok ? `${selected.length} product${selected.length === 1 ? "" : "s"} assigned.` : result.error);
    setSelected([]);
    setVersion((value) => value + 1);
  };
  const removeSelected = () => {
    const result = taxonomyRepository.removeProductsFromCollection(collection.id, selected, actor);
    setNotice(result.ok ? `${selected.length} product${selected.length === 1 ? "" : "s"} removed from collection. Product records remain intact.` : result.error);
    setSelected([]);
    setVersion((value) => value + 1);
  };
  const toggle = (id) => setSelected((current) => current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]);

  return (
    <AdminPage
      eyebrow="Business / Collections"
      title={collection.name}
      description={collection.description || "Editorial collection from the central taxonomy repository."}
      actions={
        <>
          <AtelierButton as={Link} to={`/admin/collections/${collection.id}/edit`} variant="outline" size="chip"><Pencil size={12} /> Edit</AtelierButton>
          <AtelierButton onClick={() => mutateStatus("activate")} variant="outline" size="chip"><Play size={12} /> Activate</AtelierButton>
          <AtelierButton onClick={() => mutateStatus("pause")} variant="outline" size="chip"><Pause size={12} /> Pause</AtelierButton>
          <AtelierButton onClick={() => mutateStatus("archive")} variant="outline" size="chip"><Archive size={12} /> Archive</AtelierButton>
        </>
      }
    >
      {notice ? <p role="status" className="mb-5 border border-mist bg-canvas px-4 py-3 font-ui text-sm text-ink">{notice}</p> : null}
      <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
        <div className="space-y-6">
          <AdminPanel eyebrow="Hero media" title="Visual">
            {heroSrc ? <img src={heroSrc} alt={collection.name} className="h-64 w-full object-cover border border-mist" /> : <div className="flex h-64 items-center justify-center bg-mist/50 font-ui text-xs uppercase tracking-widest text-taupe">Fallback artwork</div>}
            <p className="mt-3 font-ui text-xs text-taupe">{hero ? `Media ${hero.id} · ${hero.status}` : "Using premium fallback artwork."}</p>
          </AdminPanel>
          <AdminPanel eyebrow="Collection information" title="SEO & lifecycle">
            <dl className="grid gap-4">
              <Term label="Slug" value={`/collection/${collection.slug}`} />
              <Term label="Type" value={collection.type} />
              <Term label="Status" value={<StatusBadge label={collection.displayStatus} tone={tone[collection.displayStatus] || "quiet"} />} />
              <Term label="Dates" value={`${collection.startDate || "No start"} → ${collection.endDate || "No end"}`} />
              <Term label="Featured" value={collection.featured ? "Yes" : "No"} />
              <Term label="SEO title" value={collection.seoTitle} />
              <Term label="SEO description" value={collection.seoDescription} />
            </dl>
          </AdminPanel>
        </div>

        <div className="space-y-6">
          <AdminPanel eyebrow="Collection products" title={`Assigned products (${assigned.length})`}>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">{["", "Product", "SKU", "Category", "Price", "Status"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead><tbody>{assigned.map((product) => <tr key={product.id} className="border-b border-mist/60 font-ui text-sm"><td className="px-3 py-3"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} aria-label={`Select ${product.name}`} /></td><td className="px-3 py-3"><Link to={`/admin/products/${product.id}`} className="font-medium text-ink hover:text-accent">{product.name}</Link></td><td className="px-3 py-3 text-taupe">{product.sku}</td><td className="px-3 py-3">{taxonomyRepository.getCategoryLabel(product.category)}<span className="block text-[11px] text-taupe">{product.subcategory}</span></td><td className="px-3 py-3">{formatINR(product.price)}</td><td className="px-3 py-3"><StatusBadge label={product.status} tone={product.status === "PUBLISHED" ? "ink" : product.status === "ARCHIVED" ? "muted" : "quiet"} /></td></tr>)}</tbody></table>
            </div>
            {selected.some((id) => assignedIds.has(id)) ? <AtelierButton onClick={removeSelected} variant="outline" size="chip" className="mt-4">Remove selected from collection</AtelierButton> : null}
          </AdminPanel>

          <AdminPanel eyebrow="Product assignment" title="Search and assign">
            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_160px_180px_150px]">
              <label className="relative"><Search className="absolute left-3 top-3 text-taupe" size={15} /><input className={inputClass + " pl-9"} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search products or SKU" aria-label="Search products" /></label>
              <select className={inputClass} value={category} onChange={(event) => { setCategory(event.target.value); setSubcategory("ALL"); }}><option value="ALL">All categories</option>{categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select>
              <select className={inputClass} value={subcategory} onChange={(event) => setSubcategory(event.target.value)}><option value="ALL">All subcategories</option>{subcategories.map((sub) => <option key={sub} value={sub}>{sub}</option>)}</select>
              <select className={inputClass} value={status} onChange={(event) => setStatus(event.target.value)}><option value="ALL">All status</option><option value="PUBLISHED">Published</option><option value="DRAFT">Draft</option><option value="PENDING_REVIEW">Pending review</option><option value="ARCHIVED">Archived</option></select>
            </div>
            <div className="max-h-[34rem] overflow-y-auto border border-mist/80">
              {filteredProducts.map((product) => <label key={product.id} className="flex items-center gap-3 border-b border-mist/60 p-3 font-ui text-sm"><input type="checkbox" checked={selected.includes(product.id)} onChange={() => toggle(product.id)} /><span className="min-w-0 flex-1"><span className="block truncate font-medium text-ink">{product.name}</span><span className="text-[11px] text-taupe">{product.sku} · {taxonomyRepository.getCategoryLabel(product.category)} · {formatINR(product.price)} · {product.status}</span></span>{assignedIds.has(product.id) ? <StatusBadge label="Assigned" tone="ink" /> : null}</label>)}
            </div>
            <div className="mt-4 flex flex-wrap gap-3"><AtelierButton onClick={addSelected} size="chip" disabled={!selected.length}>Add selected to collection</AtelierButton><AtelierButton onClick={() => setSelected([])} variant="outline" size="chip">Clear selection</AtelierButton></div>
            <p className="mt-3 font-ui text-xs text-taupe">Archived products can be assigned for admin planning, but customer collection pages only show customer-visible published products.</p>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
