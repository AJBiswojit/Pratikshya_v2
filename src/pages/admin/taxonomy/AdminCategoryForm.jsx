import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import { AtelierButton } from "../../../design-system";
import taxonomyRepository, { TAXONOMY_STATUS } from "../../../services/taxonomyRepository";
import { slugify } from "../../../services/catalogRepository";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const emptyDraft = {
  name: "",
  slug: "",
  description: "",
  image: "",
  bannerMediaId: "",
  status: TAXONOMY_STATUS.ACTIVE,
  featured: false,
  sortOrder: 100,
  seoTitle: "",
  seoDescription: "",
};

const inputClass = "w-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent";

export default function AdminCategoryForm() {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const existing = useMemo(() => categoryId ? taxonomyRepository.findCategory(categoryId) : null, [categoryId]);
  const [draft, setDraft] = useState(() => existing ? { ...emptyDraft, ...existing } : emptyDraft);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!categoryId || existing) return;
    setError("Category not found.");
  }, [categoryId, existing]);

  const setField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "name" && !current.slug ? { slug: slugify(value) } : {}),
    }));
    setError("");
  };

  const submit = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setError("Category name is required.");
      return;
    }
    const payload = {
      ...draft,
      slug: slugify(draft.slug || draft.name),
      sortOrder: Number(draft.sortOrder) || 0,
      bannerMediaId: draft.bannerMediaId || null,
    };
    const result = existing
      ? taxonomyRepository.updateCategory(existing.id, payload, actor)
      : taxonomyRepository.createCategory(payload, actor);
    if (!result.ok) {
      setError(result.error || "Category could not be saved.");
      return;
    }
    navigate(`/admin/categories/${result.category.id}`);
  };

  return (
    <AdminPage
      eyebrow="Business / Taxonomy"
      title={existing ? <>Edit <span className="italic text-accent">category.</span></> : <>Create <span className="italic text-accent">category.</span></>}
      description="Categories define what a product is. They power product forms, storefront filters, category pages, search, offers and breadcrumbs."
      actions={<AtelierButton as={Link} to="/admin/categories" variant="outline" size="chip">Back to categories</AtelierButton>}
    >
      <AdminPanel eyebrow="Category record" title="Details">
        {error ? <p role="alert" className="mb-5 border border-accent/40 bg-accent/[0.05] px-4 py-3 font-ui text-sm text-accent">{error}</p> : null}
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
          <label className="lg:col-span-2">
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Name *</span>
            <input className={inputClass} value={draft.name} onChange={(event) => setField("name", event.target.value)} placeholder="Sarees" />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Slug</span>
            <input className={inputClass} value={draft.slug} onChange={(event) => setField("slug", slugify(event.target.value))} placeholder="sarees" />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Status</span>
            <select className={inputClass} value={draft.status} onChange={(event) => setField("status", event.target.value)}>
              {Object.values(TAXONOMY_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Description</span>
            <textarea rows={4} className={inputClass} value={draft.description} onChange={(event) => setField("description", event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Image / fallback plate</span>
            <input className={inputClass} value={draft.image || ""} onChange={(event) => setField("image", event.target.value)} placeholder="saree-banarasi" />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Banner media ID</span>
            <input className={inputClass} value={draft.bannerMediaId || ""} onChange={(event) => setField("bannerMediaId", event.target.value)} placeholder="med-..." />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Sort order</span>
            <input type="number" className={inputClass} value={draft.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} />
          </label>
          <label className="flex items-center gap-3 pt-7 font-ui text-sm text-ink">
            <input type="checkbox" checked={draft.featured} onChange={(event) => setField("featured", event.target.checked)} /> Featured category
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">SEO title</span>
            <input className={inputClass} value={draft.seoTitle || ""} onChange={(event) => setField("seoTitle", event.target.value)} />
          </label>
          <label>
            <span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">SEO description</span>
            <textarea rows={3} className={inputClass} value={draft.seoDescription || ""} onChange={(event) => setField("seoDescription", event.target.value)} />
          </label>
          <div className="flex flex-wrap gap-3 lg:col-span-2">
            <AtelierButton type="submit" size="chip">{existing ? "Save category" : "Create category"}</AtelierButton>
            <AtelierButton as={Link} to="/admin/categories" variant="outline" size="chip">Cancel</AtelierButton>
          </div>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
