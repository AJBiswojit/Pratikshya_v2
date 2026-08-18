/**
 * PRATIKSHYA FASHON — Product draft review panel (Phase 22 + 22.1).
 *
 * The admin side of one DRAFT: the complete group preview (ProductPreview),
 * the canonical read-only Product ID, commercial fields (name, category,
 * subcategory, price, compare-at, discount, description), view labels & primary image,
 * ownership-conflict reconciliation, review-flag resolution and the
 * workflow actions — Save / Submit / Approve / Publish / Archive.
 * Every action routes through the workflow service and the shared diary.
 *
 * Phase 3D: this panel is the EDITING desk inside the unified Admin Product
 * Review workspace (`ProductReviewDetail`). With `hideLifecycleActions` the
 * duplicated transition buttons are hidden — approve / return / publish live
 * on the workspace's one canonical action bar. The panel itself is unchanged
 * otherwise.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · View and issues memoized
 *   · Busy states for immediate button feedback
 *   · useCallback for handlers to avoid unstable references
 */

import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowRight, Check, Save, Star } from "lucide-react";
import ProductPreview from "../product/ProductPreview";
import StatusBadge from "../employee/StatusBadge";
import catalogRepository, { getPublishIssues } from "../../services/catalogRepository";
import { saveProductDraft } from "../../services/workflow/productWorkflowCommands";
import {
  approveProduct,
  archiveProduct,
  clearReviewFlags,
  flagsSatisfiedByProduct,
  getProductWorkflowView,
  publishProduct,
  setPrimaryMedia,
  submitProductForReview,
  updateMediaViewLabel,
} from "../../services/productWorkflow";
import { CATEGORY_OPTIONS, getProductStatusLabel } from "../../config/productCatalogConfig";
import taxonomyRepository from "../../services/taxonomyRepository";
import { employeeFullName } from "../../utils/employee";
import { getEmployee, loadEmployees } from "../../services/employees/employeeService";
import { reviewFlagLabel } from "../../services/productReviewFlags";
import mediaOwnershipService from "../../services/media/mediaOwnershipService";
import { formatINR } from "../../utils/shopping";

const fieldClass = "w-full border border-mist bg-canvas px-3 py-2 font-ui text-sm outline-none focus:border-accent";
const labelClass = "mb-1 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe";
const statusTone = { PUBLISHED: "ink", PENDING_REVIEW: "alert", DRAFT: "quiet", ARCHIVED: "muted" };
const VIEW_LABEL_OPTIONS = ["", "front", "side", "left-side", "right-side", "back", "detail", "close", "front-close", "multiple"];
const discountPercent = (price, compareAt) => {
  const selling = Number(price) || 0;
  const compare = Number(compareAt) || 0;
  if (selling <= 0 || compare <= selling) return null;
  return Math.round(((compare - selling) / compare) * 100);
};

export default function ProductDraftReviewPanel({ product, actor, onNotice, hideLifecycleActions = false }) {
  const [name, setName] = useState(product.name ?? "");
  const [category, setCategory] = useState(product.category ?? "");
  const [subcategory, setSubcategory] = useState(product.subcategory ?? "");
  const [price, setPrice] = useState(product.price > 0 ? String(product.price) : "");
  const [compareAt, setCompareAt] = useState((product.compareAtPrice ?? product.originalPrice) > 0 ? String(product.compareAtPrice ?? product.originalPrice) : "");
  const [description, setDescription] = useState(product.description ?? "");
  const [confirmTransfer, setConfirmTransfer] = useState(null);
  const [busy, setBusy] = useState(null);

  useEffect(() => {
    setName(product.name ?? "");
    setCategory(product.category ?? "");
    setSubcategory(product.subcategory ?? "");
    setPrice(product.price > 0 ? String(product.price) : "");
    setCompareAt((product.compareAtPrice ?? product.originalPrice) > 0 ? String(product.compareAtPrice ?? product.originalPrice) : "");
    setDescription(product.description ?? "");
  }, [product]);

  const view = useMemo(() => getProductWorkflowView(product), [product]);
  const conflicts = useMemo(() => view?.conflicts ?? [], [view]);
  const issues = useMemo(() => getPublishIssues(product), [product]);
  const subcategoryOptions = useMemo(() => taxonomyRepository.subcategoryOptionsFor(category) ?? [], [category]);

  const save = useCallback(() => {
    if (busy) return;
    setBusy("save");
    setTimeout(() => {
      const patch = { name: name.trim(), category, subcategory, price: price === "" ? 0 : Number(price) || 0, compareAtPrice: compareAt === "" ? null : Number(compareAt) || null, description };
      const pricingPatch = { pricing: { ...(product.pricing ?? {}), sellingPrice: patch.price, mrp: Math.max(patch.price, patch.compareAtPrice ?? 0) } };
      const result = saveProductDraft(product.id, { ...patch, ...pricingPatch }, actor);
      if (result.ok) {
        const satisfied = flagsSatisfiedByProduct(result.product);
        const cleared = satisfied.filter((flag) => (result.product.reviewFlags ?? []).includes(flag));
        if (cleared.length) clearReviewFlags(product.id, cleared, actor);
        onNotice?.({ tone: "ok", text: `Saved ${product.id}.${cleared.length ? ` ${cleared.length} review flag${cleared.length === 1 ? "" : "s"} resolved.` : ""}` });
      } else onNotice?.({ tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [busy, name, category, subcategory, price, compareAt, description, product, actor, onNotice]);

  const submit = useCallback(() => {
    if (busy) return;
    setBusy("submit");
    setTimeout(() => {
      const result = submitProductForReview(product.id, actor);
      onNotice?.(result.ok ? { tone: "ok", text: `${product.id} submitted for review.` } : { tone: "warn", text: result.error ?? "Could not submit." });
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const approve = useCallback(() => {
    if (busy) return;
    setBusy("approve");
    setTimeout(() => {
      const result = approveProduct(product.id, actor);
      onNotice?.(
        result.ok
          ? { tone: "ok", text: `${product.id} approved. Publish it with the separate Publish action.` }
          : { tone: "warn", text: (result.errors ?? [result.error]).join(" ") }
      );
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const publish = useCallback(() => {
    if (busy) return;
    setBusy("publish");
    setTimeout(() => {
      const result = publishProduct(product.id, actor);
      onNotice?.(result.ok ? { tone: "ok", text: `${product.id} published.` } : { tone: "warn", text: (result.errors ?? [result.error]).join(" ") });
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const archive = useCallback(() => {
    if (busy) return;
    setBusy("archive");
    setTimeout(() => {
      const result = archiveProduct(product.id, actor);
      onNotice?.(result.ok ? { tone: "ok", text: `${product.id} archived.` } : { tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const resolveConflict = useCallback((conflict) => {
    if (confirmTransfer !== conflict.mediaId) { setConfirmTransfer(conflict.mediaId); return; }
    if (busy) return;
    setBusy("transfer");
    setTimeout(() => {
      const result = mediaOwnershipService.transferMediaOwnership({
        mediaId: conflict.mediaId,
        targetProductId: product.id,
        principal: actor,
        actor,
        confirm: true,
      });
      if (result.ok) {
        const updated = catalogRepository.find(product.id);
        const satisfied = flagsSatisfiedByProduct(updated);
        const cleared = satisfied.filter((flag) => (updated?.reviewFlags ?? []).includes(flag));
        if (cleared.length) clearReviewFlags(product.id, cleared, actor);
        setConfirmTransfer(null);
        onNotice?.({ tone: "ok", text: `Ownership of ${conflict.file} moved to ${product.id}.` });
      } else onNotice?.({ tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [confirmTransfer, busy, product.id, actor, onNotice]);

  const clearFlag = useCallback((flag) => {
    if (busy) return;
    setBusy(`flag-${flag}`);
    setTimeout(() => {
      const result = clearReviewFlags(product.id, [flag], actor);
      onNotice?.(result.ok ? { tone: "ok", text: `Resolved review flag: ${reviewFlagLabel(flag)}.` } : { tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const setPrimary = useCallback((mediaId) => {
    if (busy) return;
    setBusy(`primary-${mediaId}`);
    setTimeout(() => {
      const result = setPrimaryMedia(product.id, mediaId, actor);
      onNotice?.(result.ok ? { tone: "ok", text: `Primary image for ${product.id} updated.` } : { tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [busy, product.id, actor, onNotice]);

  const setViewLabel = useCallback((mediaId, value) => {
    if (busy) return;
    setBusy(`view-${mediaId}`);
    setTimeout(() => {
      const result = updateMediaViewLabel(mediaId, value || null, actor);
      onNotice?.(result.ok ? { tone: "ok", text: `View label updated.` } : { tone: "warn", text: result.error });
      setBusy(null);
    }, 0);
  }, [busy, actor, onNotice]);

  const assignedEmployee = useMemo(() => product.assignedEmployeeId ? getEmployee(loadEmployees(), product.assignedEmployeeId) : null, [product.assignedEmployeeId]);

  return (
    <div className="border border-mist bg-canvas">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mist px-4 py-3">
        <div>
          <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">Product ID · {product.id}</p>
          <p className="font-display text-xl font-light text-ink">{product.name?.trim() || <span className="text-taupe">[Not yet defined]</span>}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={getProductStatusLabel(product.status)} tone={statusTone[product.status] ?? "quiet"} />
          {assignedEmployee ? (<StatusBadge label={`Assigned · ${employeeFullName(assignedEmployee)}`} tone="ink" />) : (<StatusBadge label="Unassigned" tone="quiet" />)}
          <Link to={`/admin/products/${product.id}`} className="font-ui text-[11px] text-accent underline-offset-2 hover:underline">Open full record →</Link>
        </div>
      </div>

      <div className="grid gap-6 p-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <ProductPreview product={product} category={product.category} />
        <div className="space-y-4">
          {product.reviewFlags?.length ? (
            <div className="border border-mist bg-ivory/60 px-3 py-2">
              <p className="mb-1.5 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Review flags</p>
              <ul className="flex flex-wrap gap-1.5">
                {product.reviewFlags.map((flag) => (
                  <li key={flag} className="inline-flex items-center gap-1.5 border border-mist bg-canvas px-2 py-1 font-ui text-[10px] uppercase tracking-[.1em] text-ink/80">
                    {reviewFlagLabel(flag)}
                    <button type="button" disabled={busy === `flag-${flag}`} onClick={() => clearFlag(flag)} title={`Resolve: ${reviewFlagLabel(flag)}`} aria-label={`Resolve: ${reviewFlagLabel(flag)}`} className={`text-taupe transition-colors hover:text-accent ${busy ? "opacity-40" : ""}`}>✕</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {conflicts.length ? (
            <div className="border border-accent/40 bg-accent/5 px-3 py-2">
              <p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">Media ownership</p>
              {conflicts.map((conflict) => (
                <div key={conflict.mediaId} className="mt-1 flex flex-wrap items-center justify-between gap-2">
                  <p className="font-ui text-[11px] text-ink/80">{conflict.file} — MEDIA ALREADY ASSIGNED{conflict.ownerProductId ? ` to ${conflict.ownerProductId}` : ""}</p>
                  <button type="button" disabled={busy === "transfer"} onClick={() => resolveConflict(conflict)} className={`border border-accent px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-accent transition-colors hover:bg-accent hover:text-ivory ${busy ? "opacity-40" : ""}`}>{confirmTransfer === conflict.mediaId ? "Confirm transfer of ownership" : "Transfer ownership to this draft"}</button>
                </div>
              ))}
            </div>
          ) : null}

          {view?.mediaSet?.gallery?.length ? (
            <div className="border border-mist bg-ivory/60 px-3 py-2">
              <p className="mb-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe">View labels &amp; primary image</p>
              <ul className="space-y-1.5">
                {view.mediaSet.gallery.map((item) => (
                  <li key={item.id ?? item.src} className="flex flex-wrap items-center gap-2">
                    {item.src ? (<img src={item.src} alt="" loading="lazy" className="h-12 w-10 shrink-0 border border-mist object-cover" />) : null}
                    <span className="min-w-0 flex-1 truncate font-ui text-[11px] text-taupe">{item.fileName ?? item.src?.split("/").pop() ?? item.id}</span>
                    <select value={item.view ?? ""} onChange={(event) => setViewLabel(item.id, event.target.value)} disabled={!item.id || busy} className="border border-mist bg-canvas px-2 py-1 font-ui text-[11px] outline-none focus:border-accent disabled:opacity-40" aria-label={`View label for ${item.fileName ?? item.id}`}>
                      {VIEW_LABEL_OPTIONS.map((option) => (<option key={option || "unlabelled"} value={option}>{option ? option.replace(/-/g, " ") : "Unlabelled"}</option>))}
                    </select>
                    <button type="button" onClick={() => setPrimary(item.id)} disabled={!item.id || busy} className={`border border-mist px-2 py-1 font-ui text-[10px] uppercase tracking-[.1em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40 ${busy ? "opacity-40" : ""}`}><Star size={10} className="mr-1 inline" aria-hidden="true" />{product.primaryMediaId === item.id || item.role === "COVER" ? "Primary" : "Set primary"}</button>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div><label htmlFor={`name-${product.id}`} className={labelClass}>Product name</label><input id={`name-${product.id}`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Product name" className={fieldClass} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`cat-${product.id}`} className={labelClass}>Category</label><select id={`cat-${product.id}`} value={category} onChange={(event) => { setCategory(event.target.value); setSubcategory(""); }} className={fieldClass}><option value="">— Select category —</option>{CATEGORY_OPTIONS.map((option) => (<option key={option.id} value={option.id}>{option.label}</option>))}</select></div>
            <div><label htmlFor={`sub-${product.id}`} className={labelClass}>Subcategory</label><select id={`sub-${product.id}`} value={subcategory} onChange={(event) => setSubcategory(event.target.value)} className={fieldClass}><option value="">— Select subcategory —</option>{subcategoryOptions.map((option) => (<option key={option} value={option}>{option}</option>))}</select></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label htmlFor={`price-${product.id}`} className={labelClass}>Price (₹)</label><input id={`price-${product.id}`} type="number" min="0" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="1290" className={fieldClass} /></div>
            <div><label htmlFor={`compare-${product.id}`} className={labelClass}>Compare-at price (₹)</label><input id={`compare-${product.id}`} type="number" min="0" value={compareAt} onChange={(event) => setCompareAt(event.target.value)} placeholder="1690" className={fieldClass} /></div>
          </div>
          {discountPercent(price, compareAt) != null ? (<p className="font-ui text-[11px] text-taupe">Discount: <span className="text-accent">{discountPercent(price, compareAt)}% off</span> ({formatINR(Number(price) || 0)} vs {formatINR(Number(compareAt) || 0)}) — derived from price &amp; compare-at, never stored separately.</p>) : null}
          <div><label htmlFor={`desc-${product.id}`} className={labelClass}>Description</label><textarea id={`desc-${product.id}`} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Fabric, fit, occasion — the commercial information a customer needs." className={fieldClass} /></div>
          {issues.length ? (<div className="border border-accent/40 bg-accent/5 px-3 py-2"><p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">Before publishing</p><ul className="mt-1 list-disc pl-4 font-ui text-[11px] text-ink/80">{issues.map((issue) => (<li key={issue}>{issue}</li>))}</ul></div>) : null}
          <div className="flex flex-wrap items-center gap-2 border-t border-mist pt-4">
            <button type="button" disabled={!!busy} onClick={save} className={`inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-ivory transition-colors hover:bg-transparent hover:text-ink ${busy ? "opacity-40" : ""}`}><Save size={11} aria-hidden="true" /> {busy === "save" ? "Saving…" : "Save Draft"}</button>
            {/* Phase 3D — inside the unified Product Review workspace the
                lifecycle actions live on the workspace's ONE canonical action
                bar (ProductReviewDetail). `hideLifecycleActions` hides the
                duplicated transition buttons here; the default keeps the
                historical behaviour for any standalone embedding. */}
            {!hideLifecycleActions ? (
              <>
                <button type="button" disabled={!!busy} onClick={submit} className={`inline-flex items-center gap-1.5 border border-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:bg-ink hover:text-ivory ${busy ? "opacity-40" : ""}`}><ArrowRight size={11} aria-hidden="true" /> {busy === "submit" ? "Submitting…" : "Submit for Review"}</button>
                <button type="button" disabled={!!busy} onClick={approve} className={`inline-flex items-center gap-1.5 border border-accent px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent transition-colors hover:bg-accent hover:text-ivory ${busy ? "opacity-40" : ""}`}><Check size={11} aria-hidden="true" /> {busy === "approve" ? "Approving…" : "Approve"}</button>
                <button type="button" disabled={!!busy} onClick={publish} className={`border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe transition-colors hover:border-ink hover:text-ink ${busy ? "opacity-40" : ""}`}>{busy === "publish" ? "Publishing…" : "Publish"}</button>
                <button type="button" disabled={!!busy} onClick={archive} className={`inline-flex items-center gap-1.5 border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe transition-colors hover:border-accent hover:text-accent ${busy ? "opacity-40" : ""}`}><Archive size={11} aria-hidden="true" /> {busy === "archive" ? "Archiving…" : "Archive"}</button>
              </>
            ) : null}
          </div>
          <p className="border-t border-mist pt-3 font-ui text-[11px] text-taupe">
            Product ID <span className="font-medium text-ink">{product.id}</span> is allocated from the
            canonical taxonomy and remains read-only.
          </p>
        </div>
      </div>
    </div>
  );
}
