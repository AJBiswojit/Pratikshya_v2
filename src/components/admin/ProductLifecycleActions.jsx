import { useMemo, useState } from "react";
import { Archive, RotateCcw, Trash2 } from "lucide-react";
import AdminPanel from "./AdminPanel";
import StatusBadge from "../employee/StatusBadge";
import { AtelierButton } from "../../design-system";
import {
  archiveProduct,
  restoreProduct,
} from "../../services/workflow/productWorkflowCommands";
import {
  deleteProductPermanently,
  getProductLifecycleOptions,
} from "../../services/productDeletionService";
import { useAdminAuth } from "../../context/AdminAuthContext";

/**
 * PRATIKSHYA FASHON — Product lifecycle actions (Phase 3F).
 *
 * The Media Management view of "remove this product". It exposes only the
 * decisions the canonical architecture supports:
 *
 *   · ARCHIVE — the default retirement. The product leaves the storefront;
 *     orders, reviews, history and media are preserved. Runs through the
 *     canonical archiveProduct workflow command.
 *   · RESTORE — an archived product returns to DRAFT.
 *   · DELETE — permanent, and only for a dependency-free draft. Requires
 *     the admin to re-type the Product ID. Owned media is released back to
 *     the unassigned library, never physically deleted.
 *
 * Dependency blockers are listed verbatim from the deletion service so the
 * admin always sees WHY only archiving is offered.
 */
export default function ProductLifecycleActions({ product, onChanged = null, onDeleted = null }) {
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;

  const [confirming, setConfirming] = useState(false);
  const [typedId, setTypedId] = useState("");
  const [message, setMessage] = useState(null);
  const [version, setVersion] = useState(0);

  const options = useMemo(
    () => (product ? getProductLifecycleOptions(product.id) : null),
    [product, version] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (!product || !options) return null;

  const refresh = (text) => {
    setMessage(text);
    setVersion((v) => v + 1);
    onChanged?.();
  };

  const archive = () => {
    const result = archiveProduct(product.id, actor);
    refresh(
      result.ok
        ? "Archived. The product is no longer storefront-visible; orders and media are preserved."
        : result.error
    );
  };

  const restore = () => {
    const result = restoreProduct(product.id, actor);
    refresh(result.ok ? "Restored to draft." : result.error);
  };

  const destroy = () => {
    const result = deleteProductPermanently({
      productId: product.id,
      confirmProductId: typedId,
      principal: actor,
      actor,
    });
    if (result.ok) {
      setConfirming(false);
      onDeleted?.(result);
      return;
    }
    setMessage(result.error);
  };

  const mediaCount = options.dependencies.ownedMedia.length;

  return (
    <AdminPanel eyebrow="Lifecycle" title="Retire or delete this product" className="mt-6">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge label={options.status} tone={options.status === "PUBLISHED" ? "accent" : "quiet"} />
        <span className="font-ui text-[12px] text-taupe">
          {product.id} · {product.name}
          {mediaCount ? ` · owns ${mediaCount} media asset${mediaCount === 1 ? "" : "s"}` : " · owns no media"}
        </span>
      </div>

      {options.deleteBlockers.length ? (
        <div className="mb-4 border border-mist/80 bg-surface/40 px-4 py-3">
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
            Permanent deletion unavailable
          </p>
          <ul className="mt-1.5 space-y-1">
            {options.deleteBlockers.map((blocker) => (
              <li key={blocker} className="font-ui text-[12px] text-cocoa">
                — {blocker}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {options.canArchive ? (
          <AtelierButton size="chip" variant="outline" onClick={archive}>
            <Archive size={13} strokeWidth={1.5} aria-hidden="true" className="mr-1.5" />
            Archive product
          </AtelierButton>
        ) : null}
        {options.canRestore ? (
          <AtelierButton size="chip" variant="outline" onClick={restore}>
            <RotateCcw size={13} strokeWidth={1.5} aria-hidden="true" className="mr-1.5" />
            Restore to draft
          </AtelierButton>
        ) : null}
        {options.canDelete ? (
          <AtelierButton
            size="chip"
            variant="outline"
            onClick={() => {
              setTypedId("");
              setMessage(null);
              setConfirming((open) => !open);
            }}
          >
            <Trash2 size={13} strokeWidth={1.5} aria-hidden="true" className="mr-1.5" />
            {confirming ? "Cancel deletion" : "Delete product…"}
          </AtelierButton>
        ) : null}
      </div>

      {confirming && options.canDelete ? (
        <div className="mt-4 border border-accent/40 bg-accent/[0.05] px-4 py-4">
          <p className="font-ui text-sm text-ink">Delete product {product.id}?</p>
          <p className="mt-1 font-ui text-[12px] text-taupe">
            This permanently removes the draft “{product.name}”.{" "}
            {mediaCount
              ? `Its ${mediaCount} owned media asset${mediaCount === 1 ? "" : "s"} return to the unassigned library — no file is deleted.`
              : "It owns no media."}
          </p>
          <label className="mt-3 block">
            <span className="font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
              Type {product.id} to confirm
            </span>
            <input
              value={typedId}
              onChange={(event) => setTypedId(event.target.value)}
              placeholder={product.id}
              className="mt-1 w-full max-w-xs border border-mist bg-canvas px-2.5 py-1.5 font-ui text-[12px] text-ink outline-none focus:border-accent"
            />
          </label>
          <AtelierButton
            size="chip"
            className="mt-3"
            disabled={typedId.trim() !== String(product.id)}
            onClick={destroy}
          >
            Permanently delete {product.id}
          </AtelierButton>
        </div>
      ) : null}

      {message ? <p className="mt-3 font-ui text-[12px] text-cocoa">{message}</p> : null}
    </AdminPanel>
  );
}
