import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import { AtelierButton } from "../../../design-system";
import taxonomyRepository, { COLLECTION_STATUS, COLLECTION_TYPES } from "../../../services/taxonomyRepository";
import { slugify } from "../../../services/catalogRepository";
import { useAdminAuth } from "../../../context/AdminAuthContext";

const inputClass = "w-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent";
const emptyDraft = { name: "", slug: "", description: "", shortDescription: "", image: "", heroMediaId: "", thumbnailMediaId: "", type: COLLECTION_TYPES.MANUAL, status: COLLECTION_STATUS.DRAFT, featured: false, sortOrder: 100, startDate: "", endDate: "", seoTitle: "", seoDescription: "" };

export default function AdminCollectionForm() {
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;
  const existing = useMemo(() => collectionId ? taxonomyRepository.findCollection(collectionId) : null, [collectionId]);
  const [draft, setDraft] = useState(() => existing ? { ...emptyDraft, ...existing } : emptyDraft);
  const [error, setError] = useState("");
  const setField = (field, value) => { setDraft((current) => ({ ...current, [field]: value, ...(field === "name" && !current.slug ? { slug: slugify(value) } : {}) })); setError(""); };
  const submit = (event) => {
    event.preventDefault();
    if (!draft.name.trim()) return setError("Collection name is required.");
    if (draft.startDate && draft.endDate && draft.endDate < draft.startDate) return setError("End date cannot be before start date.");
    const payload = { ...draft, slug: slugify(draft.slug || draft.name), sortOrder: Number(draft.sortOrder) || 0, heroMediaId: draft.heroMediaId || null, thumbnailMediaId: draft.thumbnailMediaId || null };
    const result = existing ? taxonomyRepository.updateCollection(existing.id, payload, actor) : taxonomyRepository.createCollection(payload, actor);
    if (!result.ok) return setError(result.error || "Collection could not be saved.");
    navigate(`/admin/collections/${result.collection.id}`);
  };

  return (
    <AdminPage eyebrow="Business / Collections" title={existing ? <>Edit <span className="italic text-accent">collection.</span></> : <>Create <span className="italic text-accent">collection.</span></>} description="Collections are editorial groupings. They are not categories, and product records are never duplicated." actions={<AtelierButton as={Link} to="/admin/collections" variant="outline" size="chip">Back to collections</AtelierButton>}>
      <AdminPanel eyebrow="Collection record" title="Details">
        {error ? <p role="alert" className="mb-5 border border-accent/40 bg-accent/[0.05] px-4 py-3 font-ui text-sm text-accent">{error}</p> : null}
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-2">
          <label className="lg:col-span-2"><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Name *</span><input className={inputClass} value={draft.name} onChange={(event) => setField("name", event.target.value)} placeholder="Wedding Edit" /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Slug</span><input className={inputClass} value={draft.slug} onChange={(event) => setField("slug", slugify(event.target.value))} /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Type</span><select className={inputClass} value={draft.type} onChange={(event) => setField("type", event.target.value)}>{Object.values(COLLECTION_TYPES).map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
          <label className="lg:col-span-2"><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Short description</span><input className={inputClass} value={draft.shortDescription || ""} onChange={(event) => setField("shortDescription", event.target.value)} /></label>
          <label className="lg:col-span-2"><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Description</span><textarea rows={4} className={inputClass} value={draft.description || ""} onChange={(event) => setField("description", event.target.value)} /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Fallback image</span><input className={inputClass} value={draft.image || ""} onChange={(event) => setField("image", event.target.value)} placeholder="lehenga-wine" /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Hero media ID</span><input className={inputClass} value={draft.heroMediaId || ""} onChange={(event) => setField("heroMediaId", event.target.value)} placeholder="med-..." /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Thumbnail media ID</span><input className={inputClass} value={draft.thumbnailMediaId || ""} onChange={(event) => setField("thumbnailMediaId", event.target.value)} placeholder="med-..." /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Status</span><select className={inputClass} value={draft.status} onChange={(event) => setField("status", event.target.value)}>{Object.values(COLLECTION_STATUS).map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Start date</span><input type="date" className={inputClass} value={draft.startDate || ""} onChange={(event) => setField("startDate", event.target.value)} /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">End date</span><input type="date" className={inputClass} value={draft.endDate || ""} onChange={(event) => setField("endDate", event.target.value)} /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">Sort order</span><input type="number" className={inputClass} value={draft.sortOrder} onChange={(event) => setField("sortOrder", event.target.value)} /></label>
          <label className="flex items-center gap-3 pt-7 font-ui text-sm text-ink"><input type="checkbox" checked={draft.featured} onChange={(event) => setField("featured", event.target.checked)} /> Featured collection</label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">SEO title</span><input className={inputClass} value={draft.seoTitle || ""} onChange={(event) => setField("seoTitle", event.target.value)} /></label>
          <label><span className="mb-2 block font-ui text-[10px] uppercase tracking-[.18em] text-ink">SEO description</span><textarea rows={3} className={inputClass} value={draft.seoDescription || ""} onChange={(event) => setField("seoDescription", event.target.value)} /></label>
          <div className="flex flex-wrap gap-3 lg:col-span-2"><AtelierButton type="submit" size="chip">{existing ? "Save collection" : "Create collection"}</AtelierButton><AtelierButton as={Link} to="/admin/collections" variant="outline" size="chip">Cancel</AtelierButton></div>
        </form>
      </AdminPanel>
    </AdminPage>
  );
}
