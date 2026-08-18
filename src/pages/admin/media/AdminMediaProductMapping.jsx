/**
 * PRATIKSHYA FASHON — Admin media product mapping workspace (Phase 21.6).
 *
 * Atelier admin design system.
 * Displays deterministic media groups built from new filename convention,
 * matched product, and review queue.
 *
 * Manual assignment does not require editing JSON.
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Check, Eye, AlertTriangle, Package, Search, ArrowUp, ArrowDown, Star } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import MediaThumb from "../../../components/media/MediaThumb";
import MediaProductSelector from "../../../components/media/MediaProductSelector";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import { useMediaLibrary } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import catalogRepository from "../../../services/catalogRepository";
import { buildMediaGroups } from "../../../services/media/mediaGroups";
import { cn } from "../../../utils/cn";

const VIEW_LABELS = {
  front: "Front",
  side: "Side",
  back: "Back",
  left: "Left",
  right: "Right",
  "left-side": "Left Side",
  "right-side": "Right Side",
  close: "Close",
  closeup: "Close Up",
  "close-up": "Close Up",
  detail: "Detail",
  "front-close": "Front Close",
  "front-detail": "Front Detail",
  "left-side-detail": "Left Detail",
  "right-side-detail": "Right Detail",
  "multiple-front": "Multiple Front",
  multiple: "Multiple",
};

const getViewLabel = (view) => (view ? VIEW_LABELS[view.toLowerCase()] || view.replace(/-/g, " ") : "Primary");

export default function AdminMediaProductMapping() {
  const media = useMediaLibrary();
  const actions = useMediaActions();

  const [query, setQuery] = useState("");
  const [selectedGroupKey, setSelectedGroupKey] = useState(null);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [primaryImageId, setPrimaryImageId] = useState(null);
  const [orderedImageIds, setOrderedImageIds] = useState([]);
  const [filter, setFilter] = useState("ALL"); // ALL, MATCHED, NEEDS_REVIEW, STANDALONE

  const groups = useMemo(() => {
    // Build groups from media records (not just filenames)
    return buildMediaGroups(media);
  }, [media]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return groups.filter((g) => {
      if (filter === "MATCHED" && !g.files.some((f) => f.productId)) return false;
      if (filter === "NEEDS_REVIEW") {
        const needs = !g.files.some((f) => f.productId) && !g.isStandalone;
        if (!needs) return false;
      }
      if (filter === "STANDALONE" && !g.isStandalone) return false;
      if (!q) return true;
      const hay = [g.groupKey, ...(g.files.map((f) => f.originalFileName || f.fileName || "")), g.files[0]?.categoryId || ""].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [groups, query, filter]);

  const selectedGroup = useMemo(
    () => groups.find((g) => g.groupKey === selectedGroupKey) || null,
    [groups, selectedGroupKey]
  );

  useEffect(() => {
    if (selectedGroup) {
      setSelectedProductId(selectedGroup.files.find((f) => f.productId)?.productId || selectedGroup.productId || null);
      const ordered = selectedGroup.files.map((f) => f.id).filter(Boolean);
      setOrderedImageIds(ordered);
      const primary = selectedGroup.primary?.id || selectedGroup.files.find((f) => f.role === "COVER")?.id || ordered[0] || null;
      setPrimaryImageId(primary);
    }
  }, [selectedGroup]);

  const moveOrder = (id, direction) => {
    const idx = orderedImageIds.indexOf(id);
    if (idx === -1) return;
    const target = direction === "up" ? idx - 1 : idx + 1;
    if (target < 0 || target >= orderedImageIds.length) return;
    const next = [...orderedImageIds];
    [next[idx], next[target]] = [next[target], next[idx]];
    setOrderedImageIds(next);
  };

  const handleApprove = () => {
    if (!selectedGroup || !selectedProductId) return;
    // Assign each file to selected product
    orderedImageIds.forEach((mediaId) => {
      const file = selectedGroup.files.find((f) => f.id === mediaId);
      if (!file) return;
      // role: cover for primary else gallery
      const role = mediaId === primaryImageId ? "COVER" : "GALLERY";
      actions.assignToProduct(mediaId, selectedProductId, role);
    });
    // Set cover explicitly (ensures only one cover)
    if (primaryImageId) {
      actions.setCover(selectedProductId, primaryImageId);
    }
  };

  const handleMarkUnmapped = () => {
    if (!selectedGroup) return;
    selectedGroup.files.forEach((file) => {
      if (file.id) actions.assignToProduct(file.id, null);
    });
  };

  const stats = useMemo(() => {
    const total = groups.length;
    const matched = groups.filter((g) => g.files.some((f) => f.productId)).length;
    const standalone = groups.filter((g) => g.isStandalone).length;
    const multi = groups.filter((g) => g.isGrouped).length;
    const needs = groups.filter((g) => !g.files.some((f) => f.productId) && !g.isStandalone).length;
    return { total, matched, standalone, multi, needs };
  }, [groups]);

  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Media · Product Mapping"
      description="Deterministic groups from the new filename convention. Approve mappings, review uncertain groups, and manually assign products without editing JSON."
      actions={
        <div className="flex flex-wrap gap-2">
          <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
            Media Library
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/media/marketing" size="chip" variant="outline">
            Marketing Media
          </AtelierButton>
        </div>
      }
    >
      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="border border-mist bg-canvas p-3">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Total Groups</p>
          <p className="mt-1 font-display text-2xl text-ink">{stats.total}</p>
        </div>
        <div className="border border-mist bg-canvas p-3">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Matched</p>
          <p className="mt-1 font-display text-2xl text-ink">{stats.matched}</p>
        </div>
        <div className="border border-mist bg-canvas p-3">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Needs Review</p>
          <p className="mt-1 font-display text-2xl text-amber-800">{stats.needs}</p>
        </div>
        <div className="border border-mist bg-canvas p-3">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Multi-view</p>
          <p className="mt-1 font-display text-2xl text-ink">{stats.multi}</p>
        </div>
        <div className="border border-mist bg-canvas p-3">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Standalone</p>
          <p className="mt-1 font-display text-2xl text-ink">{stats.standalone}</p>
        </div>
      </div>

      {/* Filters */}
      <AdminPanel eyebrow="Workspace" title="Media Groups" className="mb-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: "ALL", label: "All" },
              { id: "MATCHED", label: "Matched" },
              { id: "NEEDS_REVIEW", label: "Needs Review" },
              { id: "STANDALONE", label: "Standalone" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                className={cn(
                  "border px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em]",
                  filter === tab.id ? "border-ink bg-ink text-ivory" : "border-mist bg-canvas text-cocoa hover:border-ink"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <label className="relative flex-1 sm:max-w-xs">
            <Search size={14} className="absolute left-3 top-3 text-taupe" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search group, filename, category…"
              className="w-full border border-mist bg-canvas py-2.5 pl-9 pr-3 font-ui text-sm outline-none focus:border-accent"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredGroups.map((group) => {
            const productId = group.files.find((f) => f.productId)?.productId || group.productId;
            const product = productId ? catalogRepository.find(productId) : null;
            const isSelected = selectedGroupKey === group.groupKey;
            return (
              <div
                key={group.groupKey}
                className={cn("border bg-canvas p-3", isSelected ? "border-ink ring-1 ring-ink" : "border-mist/80")}
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[.12em] text-cocoa">{group.groupKey}</p>
                    <p className="mt-1 font-ui text-[10px] text-taupe">
                      {group.isGrouped ? `${group.count} views · ${group.views.map(getViewLabel).join(", ")}` : group.isStandalone ? "Standalone asset" : `${group.count} file(s)`}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {group.isGrouped ? <StatusBadge label="Grouped" tone="ink" /> : null}
                    {group.isStandalone ? <StatusBadge label="Standalone" tone="quiet" /> : null}
                    {productId ? <StatusBadge label="Mapped" tone="accent" /> : <StatusBadge label="Needs Review" tone="alert" />}
                  </div>
                </div>

                <div className="mb-3 grid grid-cols-3 gap-2">
                  {group.files.slice(0, 6).map((file) => (
                    <div key={file.id || file.fileName} className="relative border border-mist/60">
                      <MediaThumb media={file} />
                      <span className="absolute bottom-0 left-0 bg-ink/80 px-1 py-0.5 font-ui text-[8px] uppercase text-ivory">
                        {getViewLabel(file.view)}
                      </span>
                      {file.role === "COVER" ? (
                        <span className="absolute right-0 top-0 bg-amber-600 px-1 py-0.5 font-ui text-[7px] text-white">Cover</span>
                      ) : null}
                    </div>
                  ))}
                </div>

                {product ? (
                  <div className="mb-3 border border-mist/60 bg-surface/50 p-2">
                    <p className="font-ui text-[11px] font-medium text-ink">{product.name}</p>
                    <p className="font-mono text-[10px] text-taupe">{product.id} · ₹{product.price?.toLocaleString("en-IN")}</p>
                  </div>
                ) : (
                  <div className="mb-3 flex items-center gap-2 border border-amber-200 bg-amber-50/60 p-2">
                    <AlertTriangle size={14} className="text-amber-700" />
                    <p className="font-ui text-[11px] text-amber-800">No product mapped — needs review</p>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  <AtelierButton size="chip" variant="outline" onClick={() => setSelectedGroupKey(group.groupKey)}>
                    <Eye size={12} className="mr-1" /> {isSelected ? "Selected" : "Review"}
                  </AtelierButton>
                  {productId ? (
                    <AtelierButton as={Link} to={`/admin/products/${productId}/media`} size="chip" variant="outline">
                      <Package size={12} className="mr-1" /> Product Media
                    </AtelierButton>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {filteredGroups.length === 0 ? (
          <div className="mt-6 border border-mist/80 bg-surface/30 p-8 text-center">
            <p className="font-ui text-sm text-taupe">No media groups match this filter.</p>
          </div>
        ) : null}
      </AdminPanel>

      {/* Manual assignment workspace */}
      {selectedGroup ? (
        <AdminPanel eyebrow="Manual Assignment" title={`Group · ${selectedGroup.groupKey}`} className="mb-8">
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-3 font-ui text-[11px] uppercase tracking-[.18em] text-taupe">Preview all images</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {orderedImageIds.map((mediaId, idx) => {
                  const file = selectedGroup.files.find((f) => f.id === mediaId) || selectedGroup.files[idx];
                  if (!file) return null;
                  const isPrimary = mediaId === primaryImageId;
                  return (
                    <div key={mediaId} className={cn("border bg-canvas p-2", isPrimary ? "border-amber-600 ring-1 ring-amber-600" : "border-mist")}>
                      <MediaThumb media={file} />
                      <div className="mt-2 flex items-center justify-between">
                        <span className="font-ui text-[10px] uppercase text-taupe">{getViewLabel(file.view)}</span>
                        {isPrimary ? <Star size={12} className="text-amber-600" /> : null}
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => setPrimaryImageId(mediaId)}
                          className={cn(
                            "flex-1 border px-2 py-1 font-ui text-[10px] uppercase",
                            isPrimary ? "border-amber-600 bg-amber-600 text-white" : "border-mist bg-canvas text-cocoa hover:border-ink"
                          )}
                        >
                          {isPrimary ? "Primary" : "Make Primary"}
                        </button>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          onClick={() => moveOrder(mediaId, "up")}
                          className="border border-mist p-1 hover:border-ink disabled:opacity-40"
                          disabled={idx === 0}
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveOrder(mediaId, "down")}
                          className="border border-mist p-1 hover:border-ink disabled:opacity-40"
                          disabled={idx === orderedImageIds.length - 1}
                        >
                          <ArrowDown size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <p className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-taupe">Select existing product</p>
                <MediaProductSelector
                  selectedProductId={selectedProductId}
                  onSelectProduct={setSelectedProductId}
                  required={false}
                />
              </div>

              {selectedProductId ? (
                <div className="border border-mist bg-surface/40 p-3">
                  <p className="font-ui text-xs text-ink">
                    Selected primary will become product cover. Gallery order will be saved as shown.
                  </p>
                  <p className="mt-2 font-ui text-[11px] text-taupe">
                    Existing valid gallery for this product will be preserved; new images will be merged without duplicate IDs.
                  </p>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <AtelierButton
                  size="md"
                  disabled={!selectedProductId}
                  onClick={handleApprove}
                  className="bg-ink text-ivory hover:bg-cocoa"
                >
                  <Check size={14} className="mr-1" /> Approve Mapping
                </AtelierButton>
                <AtelierButton size="md" variant="outline" onClick={() => setSelectedGroupKey(null)}>
                  Cancel
                </AtelierButton>
                <AtelierButton size="md" variant="outline" onClick={handleMarkUnmapped}>
                  Mark Unmapped
                </AtelierButton>
              </div>

              <div className="border-t border-mist pt-4">
                <p className="mb-2 font-ui text-[11px] uppercase tracking-[.18em] text-taupe">Group details</p>
                <div className="space-y-1 font-mono text-[11px] text-cocoa">
                  <p>GroupKey: {selectedGroup.groupKey}</p>
                  <p>Files: {selectedGroup.files.length}</p>
                  <p>Views: {selectedGroup.views.join(", ") || "standalone"}</p>
                  <p>Category: {selectedGroup.files[0]?.categoryId || "—"}</p>
                </div>
              </div>
            </div>
          </div>
        </AdminPanel>
      ) : null}

      <AdminPanel eyebrow="Future Pipeline" title="How future images work" className="mt-6">
        <div className="grid gap-4 text-sm leading-relaxed text-taupe md:grid-cols-2">
          <div className="space-y-2">
            <p className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">Image addition flow</p>
            <pre className="overflow-x-auto bg-surface p-3 font-mono text-[11px] text-cocoa">
{`SELECT FILE OR URL
↓
managed media register (mediaStore)
↓
optional view grouping (mediaGroups)
↓
select canonical Product ID
↓
media ownership service
↓
admin review if NEEDS_REVIEW
↓
canonical product gallery
↓
mediaResolver
↓
storefront`}
            </pre>
          </div>
          <div className="space-y-2">
            <p className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">Naming examples</p>
            <ul className="list-disc pl-5 font-ui text-xs">
              <li>women-saree-banarasi-001-front.webp</li>
              <li>women-saree-banarasi-001-side.webp</li>
              <li>women-saree-banarasi-001-back.webp</li>
              <li>men-sherwani-006-left-side.webp</li>
              <li>women-lehenga-002-front-close.webp</li>
              <li>jewellery-001.webp (standalone)</li>
            </ul>
            <p className="mt-3 font-ui text-[11px] uppercase tracking-[.18em] text-ink">Explicit ownership</p>
            <p className="font-ui text-xs text-taupe">
              Upload or enter the media URL, then select a canonical Product ID. Filenames may organize views,
              but they never create a product or infer product ownership.
            </p>
          </div>
        </div>
      </AdminPanel>
    </AdminPage>
  );
}
