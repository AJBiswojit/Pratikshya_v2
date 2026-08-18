/**
 * PRATIKSHYA FASHON — Product group review panel (Phase 22, section 35/41).
 *
 * POTENTIAL SAME PRODUCT queue: images side by side, the deterministic
 * group reason, the existing product (if any), and the three human
 * decisions — GROUP AS ONE PRODUCT / KEEP AS SEPARATE PRODUCTS / REVIEW
 * LATER. Grouping is editable (merge, split, move) and every destructive
 * operation asks for confirmation.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · Candidates memoized via workflow cache
 *   · Handlers useCallback with busy states for immediate feedback
 *   · Saved groups memoized
 */

import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Merge, Scissors } from "lucide-react";
import { AtelierButton } from "../../design-system";
import StatusBadge from "../employee/StatusBadge";
import {
  decideProductGroup,
  getPotentialProductGroups,
} from "../../services/productWorkflow";
import {
  addMediaToGroup,
  getAllGroups,
  mergeGroups,
  removeMediaFromGroup,
  splitGroup,
} from "../../services/media/productMediaGroups";
import mediaRepository from "../../services/media/mediaRepository";
import { useProducts } from "../../hooks/useProducts";

const actorLabel = (actor) =>
  typeof actor === "string" ? actor : actor?.label ?? actor?.name ?? null;

export default function ProductGroupReviewPanel({ actor, onNotice }) {
  const [busy, setBusy] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [mergeTarget, setMergeTarget] = useState(null);
  const [productTargets, setProductTargets] = useState({});
  const products = useProducts();

  // Cached via workflow service
  const allCandidates = useMemo(() => getPotentialProductGroups(), []);
  // Filter is cheap, but memoize based on candidates
  const candidates = useMemo(() => allCandidates.filter((group) => group.media.length > 1 || group.confirmed === false), [allCandidates]);

  const savedGroups = useMemo(() => getAllGroups(), [candidates]);

  const hasPending = useMemo(() => candidates.some((group) => !group.confirmed), [candidates]);

  const decide = useCallback((group, decision, existingProductId = null) => {
    if (busy) return;
    setBusy(group.id);
    setTimeout(() => {
      const result = decideProductGroup({
        groupId: group.id,
        mediaIds: group.media.map((row) => row.mediaId),
        decision,
        existingProductId,
        actor,
      });
      setBusy(null);
      if (result.ok) {
        onNotice?.({
          tone: "ok",
          text:
            decision === "SAME_PRODUCT"
              ? `Grouped as one product${result.product ? ` · ${result.product.id}` : ""}.`
              : decision === "SEPARATE_PRODUCTS"
                ? "Kept as separate products."
                : "Marked for later review.",
        });
      } else {
        onNotice?.({ tone: "warn", text: result.error });
      }
    }, 0);
  }, [busy, actor, onNotice]);

  const doMerge = useCallback(() => {
    if (!mergeTarget || busy) return;
    if (confirmAction !== `merge-${mergeTarget}`) {
      setConfirmAction(`merge-${mergeTarget}`);
      return;
    }
    const groups = getAllGroups();
    if (groups.length < 2) {
      onNotice?.({ tone: "warn", text: "At least two saved groups are needed to merge." });
      return;
    }
    setBusy(`merge-${mergeTarget}`);
    setTimeout(() => {
      const merged = mergeGroups([groups[0].id, mergeTarget], actorLabel(actor));
      setConfirmAction(null);
      setMergeTarget(null);
      setBusy(null);
      onNotice?.({ tone: "ok", text: merged ? `Merged groups into ${merged.id}.` : "Nothing merged." });
    }, 0);
  }, [mergeTarget, confirmAction, busy, actor, onNotice]);

  const doSplit = useCallback((groupId) => {
    if (busy) return;
    const group = getAllGroups().find((entry) => entry.id === groupId);
    if (!group || group.mediaIds.length < 2) {
      onNotice?.({ tone: "warn", text: "A group needs at least two media assets to split." });
      return;
    }
    const [keep] = group.mediaIds;
    if (confirmAction !== `split-${groupId}`) {
      setConfirmAction(`split-${groupId}`);
      return;
    }
    setBusy(`split-${groupId}`);
    setTimeout(() => {
      const created = splitGroup(groupId, [keep], actorLabel(actor));
      setConfirmAction(null);
      setBusy(null);
      onNotice?.({ tone: "ok", text: created ? `Split into ${groupId} and ${created.id}.` : "Nothing split." });
    }, 0);
  }, [confirmAction, busy, actor, onNotice]);

  return (
    <div className="space-y-6">
      {!candidates.length ? (
        <p className="py-10 text-center font-ui text-sm text-taupe">
          No group candidates. Every multi-view set in the library already follows the filename convention.
        </p>
      ) : null}

      {hasPending ? (
        <p className="border border-accent/40 bg-accent/5 px-4 py-3 font-ui text-sm text-ink">
          Similarity is a review signal only. The system never merges products on looks alone — a human decides whether these are photographs of ONE product or of different products.
        </p>
      ) : null}

      <ul className="grid gap-4 md:grid-cols-2">
        {candidates.map((group) => (
          <li key={group.id} className="border border-mist bg-canvas">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-mist px-3 py-2">
              <div>
                <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">{group.confirmed ? "Multi-view group" : "Potential same product"}</p>
                <p className="font-ui text-[11px] text-taupe">{group.id}</p>
              </div>
              {group.existingProductId ? (<StatusBadge label={`Existing · ${group.existingProductId}`} tone="ink" />) : group.confirmed ? (<StatusBadge label="Filename group" tone="quiet" />) : (<StatusBadge label="Needs decision" tone="alert" />)}
            </div>

            <div className="grid grid-cols-3 gap-2 px-3 py-3">
              {group.media.slice(0, 3).map((row) => (
                <figure key={row.mediaId} className="min-w-0">
                  <div className="aspect-[4/5] w-full overflow-hidden border border-mist bg-ivory">
                    {row.src ? (<img src={row.src} alt="" className="h-full w-full object-cover" loading="lazy" />) : null}
                  </div>
                  <figcaption className="mt-1 truncate text-center font-ui text-[10px] text-taupe">{row.file}</figcaption>
                </figure>
              ))}
            </div>

            <div className="border-t border-mist px-3 py-2">
              <p className="font-ui text-[11px] text-ink/80">{group.reason}</p>
              {!group.confirmed ? (
                <label className="mt-2 block font-ui text-[10px] uppercase tracking-[.12em] text-taupe">
                  Assign views to canonical Product
                  <select
                    value={group.existingProductId || productTargets[group.id] || ""}
                    disabled={Boolean(group.existingProductId)}
                    onChange={(event) => setProductTargets((current) => ({
                      ...current,
                      [group.id]: event.target.value,
                    }))}
                    className="mt-1 block w-full border border-mist bg-canvas px-2 py-1.5 font-ui text-[11px] normal-case tracking-normal text-ink outline-none focus:border-accent disabled:opacity-60"
                  >
                    <option value="">Select an existing Product…</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>{product.id} · {product.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <p className="mt-1 font-ui text-[10px] text-taupe">Existing Product: {group.existingProductId ?? "None"}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-mist px-3 py-2.5">
              {!group.confirmed ? (
                <>
                  <button type="button" disabled={busy === group.id || !(group.existingProductId || productTargets[group.id])} onClick={() => decide(group, "SAME_PRODUCT", group.existingProductId || productTargets[group.id])} className={`border border-ink bg-ink px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-ivory transition-colors hover:bg-transparent hover:text-ink disabled:cursor-not-allowed disabled:opacity-40`}>{busy === group.id ? "Assigning…" : "Assign views to Product"}</button>
                  {!(group.existingProductId || productTargets[group.id]) ? (<Link to="/admin/products/new" className="border border-accent px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-accent transition-colors hover:bg-accent hover:text-ivory">Create Product First</Link>) : null}
                  <button type="button" disabled={busy === group.id} onClick={() => decide(group, "SEPARATE_PRODUCTS")} className={`border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink ${busy ? "opacity-40" : ""}`}>Keep as separate products</button>
                  <button type="button" disabled={busy === group.id} onClick={() => decide(group, "REVIEW_LATER")} className={`border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-taupe transition-colors hover:border-ink hover:text-ink ${busy ? "opacity-40" : ""}`}>Review later</button>
                </>
              ) : group.existingProductId ? (
                <Link to={`/admin/products/${group.existingProductId}`} className="font-ui text-[11px] text-accent underline-offset-2 hover:underline">Open {group.existingProductId} →</Link>
              ) : (
                <span className="font-ui text-[11px] text-taupe">One product, {group.media.length} views — the naming convention groups these automatically.</span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {savedGroups.length ? (
        <div className="border border-mist bg-canvas">
          <div className="border-b border-mist px-4 py-3">
            <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Saved groups · {savedGroups.length}</p>
            <p className="mt-1 font-ui text-[11px] text-taupe">Groups created or decided by hand. Move media between groups, split a group or merge two groups.</p>
          </div>
          <ul className="divide-y divide-mist/70">
            {savedGroups.map((group) => (
              <li key={group.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-ui text-sm text-ink">{group.id}</p>
                    <p className="font-ui text-[10px] text-taupe">{group.mediaIds.length} media asset{group.mediaIds.length === 1 ? "" : "s"} · {group.decision ?? "no decision"} · {group.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <AtelierButton type="button" size="chip" variant="outline" onClick={() => doSplit(group.id)} disabled={!!busy}><Scissors size={11} aria-hidden="true" className="mr-1" />{confirmAction === `split-${group.id}` ? "Confirm split" : "Split"}</AtelierButton>
                    <select value={mergeTarget === group.id ? group.id : ""} onChange={(event) => setMergeTarget(event.target.value || null)} className="border border-mist bg-canvas px-2 py-1.5 font-ui text-[11px] outline-none focus:border-accent" aria-label={`Merge ${group.id} with…`}><option value="">Merge with…</option>{getAllGroups().filter((entry) => entry.id !== group.id).map((entry) => (<option key={entry.id} value={entry.id}>{entry.id}</option>))}</select>
                    {mergeTarget === group.id ? (<AtelierButton type="button" size="chip" variant="outline" onClick={doMerge} disabled={!!busy}><Merge size={11} aria-hidden="true" className="mr-1" />{confirmAction === `merge-${group.id}` ? "Confirm merge" : "Merge"}</AtelierButton>) : null}
                  </div>
                </div>
                {group.mediaIds.length ? (
                  <ul className="mt-3 space-y-1.5 border-t border-mist/60 pt-3">
                    {group.mediaIds.map((mediaId) => {
                      const media = mediaRepository.getById(mediaId);
                      const targets = getAllGroups().filter((entry) => entry.id !== group.id);
                      return (
                        <li key={mediaId} className="flex flex-wrap items-center gap-2">
                          <span className="min-w-0 flex-1 truncate font-ui text-[11px] text-taupe">{media?.currentFilename || media?.fileName || mediaId}</span>
                          <select value="" disabled={!targets.length || !!busy} onChange={(event) => { const targetId = event.target.value; if (!targetId) return; removeMediaFromGroup(group.id, [mediaId], actorLabel(actor)); addMediaToGroup(targetId, [mediaId], actorLabel(actor)); setConfirmAction(null); onNotice?.({ tone: "ok", text: `Moved ${mediaId} to ${targetId}.` }); }} className="border border-mist bg-canvas px-2 py-1 font-ui text-[11px] outline-none focus:border-accent disabled:opacity-40" aria-label={`Move ${mediaId} to another group`}><option value="">Move to…</option>{targets.map((entry) => (<option key={entry.id} value={entry.id}>{entry.id}</option>))}</select>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
