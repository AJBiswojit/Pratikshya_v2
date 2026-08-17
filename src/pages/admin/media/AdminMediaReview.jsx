import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, CheckCircle2, Clock, Film, Image as ImageIcon, Package, X } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import MediaThumb from "../../../components/media/MediaThumb";
import { AtelierButton } from "../../../design-system";
import { MEDIA_TYPES, REJECTION_REASONS, getPlacementLabel, getProductRoleLabel } from "../../../config/mediaTypes";
import { usePendingReviewMedia } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import catalogRepository from "../../../services/catalogRepository";
import { formatEmployeeDateTime } from "../../../utils/employee";
import { cn } from "../../../utils/cn";

export default function AdminMediaReview() {
  const pendingItems = usePendingReviewMedia();
  const actions = useMediaActions();

  const [selectedIds, setSelectedIds] = useState([]);
  const [rejectingItem, setRejectingItem] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  // Group pending items by (productId || placement || "unassigned") + uploadedByEmployeeId
  const groups = useMemo(() => {
    const map = new Map();

    pendingItems.forEach((item) => {
      const key = `${item.productId || item.placement || "unassigned"}_${item.uploadedByEmployeeId || "anon"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          productId: item.productId,
          placement: item.placement,
          uploadedBy: item.uploadedBy,
          uploadedByEmployeeId: item.uploadedByEmployeeId,
          createdAt: item.createdAt,
          items: [],
        });
      }
      map.get(key).items.push(item);
    });

    return Array.from(map.values()).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [pendingItems]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectGroup = (groupItems) => {
    const ids = groupItems.map((i) => i.id);
    const allSelected = ids.every((id) => selectedIds.includes(id));
    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
    } else {
      setSelectedIds((prev) => [...new Set([...prev, ...ids])]);
    }
  };

  const handleApproveItem = (mediaId) => {
    actions.approve(mediaId);
    setSelectedIds((prev) => prev.filter((id) => id !== mediaId));
  };

  const handleApproveGroup = (groupItems) => {
    const ids = groupItems.map((i) => i.id);
    actions.approveMany(ids);
    setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
  };

  const handleApproveSelected = () => {
    if (!selectedIds.length) return;
    actions.approveMany(selectedIds);
    setSelectedIds([]);
  };

  const openRejectModal = (item) => {
    setRejectingItem(item);
    setRejectionReason(REJECTION_REASONS[0]);
    setCustomReason("");
  };

  const closeRejectModal = () => {
    setRejectingItem(null);
    setRejectionReason("");
    setCustomReason("");
  };

  const submitRejection = () => {
    if (!rejectingItem) return;
    const finalReason = customReason.trim() || rejectionReason;
    actions.reject(rejectingItem.id, finalReason);
    setSelectedIds((prev) => prev.filter((id) => id !== rejectingItem.id));
    closeRejectModal();
  };

  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Media Review Queue"
      description="Review and approve employee media submissions. Approved assets immediately become active and visible on customer-facing product pages."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
            <ArrowLeft size={13} className="mr-1 inline-block" />
            Media Management
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/media/upload" size="chip" className="bg-ink text-ivory">
            Upload Media
          </AtelierButton>
        </div>
      }
    >
      {/* Batch Header Bar */}
      {pendingItems.length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-amber-300 bg-amber-50/70 p-4">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-800" size={20} />
            <div>
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-amber-900">
                {pendingItems.length} {pendingItems.length === 1 ? "asset waiting" : "assets waiting"} for review
              </p>
              <p className="font-ui text-[11px] text-amber-800/80">
                Across {groups.length} {groups.length === 1 ? "submission group" : "submission groups"}.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectedIds.length > 0 ? (
              <>
                <span className="font-ui text-[11px] text-amber-900 font-medium mr-2">
                  {selectedIds.length} selected
                </span>
                <AtelierButton
                  size="chip"
                  onClick={handleApproveSelected}
                  className="bg-emerald-800 text-ivory hover:bg-emerald-900 border border-emerald-700"
                >
                  <Check size={12} className="mr-1" />
                  Approve Selected ({selectedIds.length})
                </AtelierButton>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="font-ui text-[11px] text-amber-900 uppercase tracking-wider underline-offset-4 hover:underline"
                >
                  Clear
                </button>
              </>
            ) : (
              <AtelierButton
                size="chip"
                variant="outline"
                onClick={() => setSelectedIds(pendingItems.map((i) => i.id))}
                className="border-amber-700/60 text-amber-900 hover:bg-amber-100/50"
              >
                Select All ({pendingItems.length})
              </AtelierButton>
            )}
          </div>
        </div>
      ) : null}

      {/* Submissions Groups */}
      {groups.length ? (
        <div className="space-y-6">
          {groups.map((group) => {
            const product = group.productId ? catalogRepository.find(group.productId) : null;
            const images = group.items.filter((i) => i.type === MEDIA_TYPES.IMAGE);
            const videos = group.items.filter((i) => i.type === MEDIA_TYPES.VIDEO);
            const allGroupSelected = group.items.every((i) => selectedIds.includes(i.id));

            return (
              <AdminPanel
                key={group.key}
                eyebrow={
                  group.productId
                    ? "Product Submission"
                    : group.placement
                      ? "Marketing Submission"
                      : "Library Submission"
                }
                title={
                  product
                    ? product.name
                    : group.placement
                      ? getPlacementLabel(group.placement)
                      : "General Media"
                }
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => selectGroup(group.items)}
                      className="font-ui text-[10px] uppercase tracking-wider text-taupe hover:text-ink px-2 py-1 border border-mist"
                    >
                      {allGroupSelected ? "Deselect Group" : "Select Group"}
                    </button>
                    <AtelierButton
                      size="chip"
                      onClick={() => handleApproveGroup(group.items)}
                      className="bg-emerald-800 text-ivory hover:bg-emerald-900 border border-emerald-700"
                    >
                      <Check size={12} className="mr-1" />
                      Approve All ({group.items.length})
                    </AtelierButton>
                  </div>
                }
              >
                {/* Meta details bar */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-mist/70 pb-3 font-ui text-xs text-taupe">
                  <div className="flex flex-wrap items-center gap-3">
                    {product ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-cocoa bg-canvas px-2 py-0.5 border border-mist">
                        <Package size={12} />
                        {product.sku || product.id}
                      </span>
                    ) : null}
                    <span>
                      Uploaded by: <strong className="text-ink">{group.uploadedBy || "Employee"}</strong>
                      {group.uploadedByEmployeeId ? ` (${group.uploadedByEmployeeId})` : ""}
                    </span>
                    <span>•</span>
                    <span>{formatEmployeeDateTime(group.createdAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 text-cocoa">
                      <ImageIcon size={12} /> {images.length} {images.length === 1 ? "image" : "images"}
                    </span>
                    {videos.length > 0 ? (
                      <>
                        <span>•</span>
                        <span className="inline-flex items-center gap-1 text-cocoa">
                          <Film size={12} /> {videos.length} {videos.length === 1 ? "video" : "videos"}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>

                {/* Items grid */}
                <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item) => {
                    const isSelected = selectedIds.includes(item.id);

                    return (
                      <li
                        key={item.id}
                        className={cn(
                          "flex flex-col justify-between border bg-canvas p-2.5 transition-all",
                          isSelected ? "border-ink ring-1 ring-ink" : "border-mist/80 hover:border-ink/40"
                        )}
                      >
                        <div className="space-y-2">
                          <div className="relative">
                            <MediaThumb media={item} />
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(item.id)}
                              aria-label={`Select ${item.title}`}
                              className="absolute top-2 right-2 h-4 w-4 accent-[#B45309] shadow"
                            />
                            {item.role ? (
                              <span className="absolute bottom-2 left-2 rounded bg-ink/85 px-1.5 py-0.5 font-ui text-[8px] uppercase tracking-wider text-ivory">
                                {getProductRoleLabel(item.role)}
                              </span>
                            ) : null}
                          </div>

                          <div className="space-y-1 px-1">
                            <p className="font-ui text-xs font-medium text-ink line-clamp-1">
                              {item.title}
                            </p>
                            {item.alt ? (
                              <p className="font-ui text-[10px] text-taupe line-clamp-1 italic">
                                &ldquo;{item.alt}&rdquo;
                              </p>
                            ) : null}
                            {item.caption ? (
                              <p className="font-ui text-[10px] text-cocoa line-clamp-2">
                                {item.caption}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        {/* Item Actions */}
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-mist/60 pt-2">
                          <AtelierButton
                            size="chip"
                            variant="outline"
                            onClick={() => handleApproveItem(item.id)}
                            className="flex-1 text-emerald-800 border-emerald-400 hover:bg-emerald-50"
                          >
                            <Check size={11} className="mr-1 inline" />
                            Approve
                          </AtelierButton>

                          <AtelierButton
                            size="chip"
                            variant="outline"
                            onClick={() => openRejectModal(item)}
                            className="flex-1 text-accent border-accent/40 hover:bg-accent/[0.06]"
                          >
                            <X size={11} className="mr-1 inline" />
                            Reject
                          </AtelierButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </AdminPanel>
            );
          })}
        </div>
      ) : (
        <div className="border border-mist/80 bg-surface/30 p-12 text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 border border-emerald-200">
            <CheckCircle2 size={28} className="text-emerald-700" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-base font-medium text-ink">
              Review Queue is Clear
            </h3>
            <p className="font-ui text-xs text-taupe max-w-sm mx-auto">
              There are no pending media assets awaiting approval. New employee submissions will appear here.
            </p>
          </div>
          <div className="pt-2">
            <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
              Return to Media Management
            </AtelierButton>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingItem ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reject-dialog-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4"
        >
          <div className="w-full max-w-lg border border-mist bg-canvas p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="font-ui text-[10px] uppercase tracking-widest text-accent font-semibold">
                  Review Action
                </span>
                <h3 id="reject-dialog-title" className="font-display text-lg font-normal text-ink">
                  Reject Media Asset
                </h3>
              </div>
              <button
                type="button"
                onClick={closeRejectModal}
                className="text-taupe hover:text-ink"
                aria-label="Close rejection dialog"
              >
                <X size={18} />
              </button>
            </div>

            <p className="font-ui text-xs text-taupe">
              Rejecting &ldquo;<strong>{rejectingItem.title}</strong>&rdquo; will notify the employee ({rejectingItem.uploadedBy || "Employee"}) and mark the asset as rejected.
            </p>

            <div className="space-y-3">
              <label className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe block">
                Select Rejection Reason
              </label>
              <div className="space-y-1.5">
                {REJECTION_REASONS.map((reason) => (
                  <label
                    key={reason}
                    className={cn(
                      "flex items-center gap-2 p-2 border text-xs font-ui cursor-pointer transition-colors",
                      rejectionReason === reason && !customReason
                        ? "border-accent bg-accent/[0.04] text-ink"
                        : "border-mist bg-surface/30 text-cocoa hover:bg-surface/70"
                    )}
                  >
                    <input
                      type="radio"
                      name="rejection-reason"
                      checked={rejectionReason === reason && !customReason}
                      onChange={() => {
                        setRejectionReason(reason);
                        setCustomReason("");
                      }}
                      className="accent-[#B45309]"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              <div className="space-y-1 pt-2">
                <label className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe block" htmlFor="custom-reason">
                  Or provide a custom note
                </label>
                <textarea
                  id="custom-reason"
                  rows={2}
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="e.g. Please capture from the left pallu angle under warm atelier lights."
                  className="w-full border border-mist bg-canvas p-2.5 font-ui text-xs text-ink outline-none focus:border-accent"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-mist/80 pt-4">
              <AtelierButton type="button" size="sm" variant="outline" onClick={closeRejectModal}>
                Cancel
              </AtelierButton>
              <AtelierButton
                type="button"
                size="sm"
                onClick={submitRejection}
                className="bg-accent text-white hover:bg-accent/90"
              >
                Confirm Rejection
              </AtelierButton>
            </div>
          </div>
        </div>
      ) : null}
    </AdminPage>
  );
}
