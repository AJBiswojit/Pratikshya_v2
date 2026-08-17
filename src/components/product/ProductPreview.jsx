/**
 * PRATIKSHYA FASHON — ProductPreview (Phase 22).
 *
 * The one reusable preview for the media-to-product workflow. It accepts a
 * `productId` (or a product record) and resolves EVERY image through
 * `getProductMediaSet(productId)` — never from arbitrary URLs, never from
 * another product, never from a hardcoded list.
 *
 * Features: large primary image, Front / Side / Back / Detail tabs,
 * thumbnails, fullscreen preview, keyboard navigation (← → Esc), responsive
 * layout. Reused by the Admin review desk, the Employee review workspace,
 * and any future catalogue-management surface.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";
import { getProductMediaSet } from "../../services/media/productMediaSet";
import PratikshyaImage from "../PratikshyaImage";

export const VIEW_TABS = [
  { id: "front", label: "Front" },
  { id: "side", label: "Side" },
  { id: "back", label: "Back" },
  { id: "detail", label: "Detail" },
];

const viewLabelOf = (item) => {
  const view = String(item?.view ?? "").toLowerCase();
  const tab = VIEW_TABS.find((entry) => entry.id === view);
  if (tab) return tab.label;
  if (view.includes("side") || view === "left" || view === "right") return "Side";
  if (view.includes("back")) return "Back";
  if (view.includes("close") || view.includes("detail")) return "Detail";
  return view === "front" || view.includes("front") ? "Front" : "View";
};

export default function ProductPreview({
  product = null,
  productId = null,
  mediaSet = null,
  conflicts = null,
  category = null,
  className = "",
  showConflictNotice = true,
}) {
  const productIdResolved = product?.id ?? productId ?? null;
  const productClaimsKey = product ? `${(product.mediaIds||[]).join(",")}|${product.primaryMediaId||""}` : "";
  const set = useMemo(
    () => mediaSet || getProductMediaSet(product ?? productId),
    // Depend on id and claims, not whole product object which may be new reference each render
    [mediaSet, productIdResolved, productClaimsKey]
  );

  const availableTabs = useMemo(
    () => VIEW_TABS.filter((tab) => Boolean(set[tab.id])),
    [set]
  );

  const [activeTab, setActiveTab] = useState(null);
  useEffect(() => {
    setActiveTab((current) => {
      if (current && availableTabs.some((tab) => tab.id === current)) return current;
      return availableTabs.length ? availableTabs[0].id : "gallery";
    });
  }, [set, availableTabs]);

  const gallery = set?.gallery ?? [];

  const activeItem = useMemo(() => {
    if (activeTab === "gallery") return set?.primary ?? gallery[0] ?? null;
    return set?.[activeTab] ?? set?.primary ?? gallery[0] ?? null;
  }, [activeTab, set, gallery]);

  const [fullscreen, setFullscreen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);

  const openFullscreen = useCallback((index = 0) => {
    setFullscreenIndex(index);
    setFullscreen(true);
  }, []);

  const stepFullscreen = useCallback(
    (direction) => {
      setFullscreenIndex((index) => {
        if (!gallery.length) return index;
        return (index + direction + gallery.length) % gallery.length;
      });
    },
    [gallery.length]
  );

  const closeFullscreen = useCallback(() => setFullscreen(false), []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") closeFullscreen();
      if (event.key === "ArrowRight") stepFullscreen(1);
      if (event.key === "ArrowLeft") stepFullscreen(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen, closeFullscreen, stepFullscreen]);

  const conflictList = conflicts ?? set?.ownershipConflicts ?? [];
  const fallbackCategory = category ?? product?.category ?? "default";

  if (!gallery.length) {
    const contested = showConflictNotice ? conflictList.filter((conflict) => conflict.src)[0] : null;
    return (
      <div className={`border border-mist bg-canvas ${className}`}>
        {contested ? (
          /* The claimed media is visible — with its ownership dispute —
             so no one ever edits a product without seeing its imagery. */
          <div>
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory">
              <img
                src={contested.src}
                alt={contested.file}
                className="h-full w-full object-contain"
              />
              <span className="absolute left-2 top-2 border border-accent bg-ivory/95 px-2 py-1 font-ui text-[10px] uppercase tracking-[.14em] text-accent">
                MEDIA ALREADY ASSIGNED
              </span>
            </div>
            <div className="border-t border-mist px-3 py-2">
              <p className="font-ui text-[11px] text-ink/80">
                {contested.file}
              </p>
              <p className="mt-0.5 font-ui text-[11px] text-accent">
                This asset is currently owned by{" "}
                <strong>{contested.ownerProductId ?? "another product"}</strong>. Ownership must
                be resolved before publishing.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <p className="font-ui text-sm text-taupe">No product-owned media yet.</p>
            <p className="mt-1 font-ui text-[11px] text-taupe/70">
              This preview resolves media strictly through getProductMediaSet — never another
              product&apos;s plates.
            </p>
          </div>
        )}
        {showConflictNotice && conflictList.length > 1 ? (
          <ul className="space-y-2 border-t border-mist px-3 py-3">
            {conflictList.slice(1).map((conflict) => (
              <li key={conflict.mediaId} className="flex items-center gap-3">
                {conflict.src ? (
                  <img src={conflict.src} alt="" className="h-12 w-10 shrink-0 object-cover" />
                ) : null}
                <p className="min-w-0 truncate font-ui text-[11px] text-taupe">
                  {conflict.file} · owned by {conflict.ownerProductId ?? "—"}
                </p>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px] ${className}`}>
      {/* Large primary + tabs ----------------------------------------- */}
      <div className="border border-mist bg-canvas">
        <div className="relative">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory">
            {activeItem?.src ? (
              <PratikshyaImage
                image={{ src: activeItem.src, alt: product?.name || "Product" }}
                category={fallbackCategory}
                alt={product?.name || "Product preview"}
                className="h-full w-full object-contain"
                loading="eager"
              />
            ) : null}
            <button
              type="button"
              onClick={() => openFullscreen(0)}
              className="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center border border-ink/20 bg-ivory/90 text-ink transition-colors hover:bg-ink hover:text-ivory"
              aria-label="Open fullscreen preview"
              title="Fullscreen"
            >
              <Maximize2 size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1 border-t border-mist px-3 py-2">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.16em] transition-colors ${
                activeTab === tab.id
                  ? "bg-ink text-ivory"
                  : "text-taupe hover:bg-mist/60 hover:text-ink"
              }`}
              aria-pressed={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveTab("gallery")}
            className={`px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.16em] transition-colors ${
              activeTab === "gallery"
                ? "bg-ink text-ivory"
                : "text-taupe hover:bg-mist/60 hover:text-ink"
            }`}
            aria-pressed={activeTab === "gallery"}
          >
            Gallery
          </button>
          <span className="ml-auto font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
            {activeTab === "gallery" ? `Primary · ${gallery.length} image${gallery.length === 1 ? "" : "s"}` : activeTab}
          </span>
        </div>

        {showConflictNotice && conflictList.length ? (
          <div className="border-t border-accent/30 bg-accent/5 px-3 py-2">
            {conflictList.map((conflict) => (
              <p key={conflict.mediaId} className="font-ui text-[11px] text-accent">
                {conflict.file}: MEDIA ALREADY ASSIGNED
                {conflict.ownerProductId ? ` — owning Product ID ${conflict.ownerProductId}` : ""}
                . Ownership must be resolved before publishing.
              </p>
            ))}
          </div>
        ) : null}
      </div>

      {/* Thumbnails ------------------------------------------------------ */}
      <div className="border border-mist bg-canvas p-3">
        <p className="mb-2 font-ui text-[10px] uppercase tracking-[.2em] text-taupe">
          Views
        </p>
        <ul className="grid max-h-[420px] grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-1">
          {gallery.map((item, index) => (
            <li key={`${item.id ?? item.src}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  const view = String(item.view ?? "").toLowerCase();
                  const tab = VIEW_TABS.find((entry) => entry.id === view);
                  setActiveTab(tab ? tab.id : "gallery");
                }}
                onDoubleClick={() => openFullscreen(index)}
                className="group w-full text-left"
                aria-label={`Preview ${viewLabelOf(item)} view`}
              >
                <span
                  className={`block w-full overflow-hidden border transition-colors ${
                    activeItem && activeItem.src === item.src
                      ? "border-ink"
                      : "border-mist group-hover:border-ink/50"
                  }`}
                >
                  {item.src ? (
                    <img
                      src={item.src}
                      alt={viewLabelOf(item)}
                      className="aspect-[4/5] w-full object-cover"
                      loading="lazy"
                    />
                  ) : null}
                </span>
                <span className="mt-1 block font-ui text-[10px] uppercase tracking-[.14em] text-taupe">
                  {viewLabelOf(item)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <p className="mt-3 font-ui text-[10px] leading-relaxed text-taupe/70">
          Double-click a view for fullscreen. Arrow keys navigate, Esc closes.
        </p>
      </div>

      {/* Fullscreen ------------------------------------------------------ */}
      {fullscreen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Fullscreen product preview"
          className="fixed inset-0 z-[80] flex flex-col bg-ink/95"
        >
          <div className="flex items-center justify-between px-4 py-3">
            <p className="font-ui text-[10px] uppercase tracking-[.24em] text-ivory/70">
              {gallery[fullscreenIndex] ? viewLabelOf(gallery[fullscreenIndex]) : "Preview"}{" "}
              · {fullscreenIndex + 1} / {gallery.length}
            </p>
            <button
              type="button"
              onClick={closeFullscreen}
              className="inline-flex h-9 w-9 items-center justify-center border border-ivory/30 text-ivory transition-colors hover:bg-ivory hover:text-ink"
              aria-label="Close fullscreen preview"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </div>
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-12">
            {gallery[fullscreenIndex]?.src ? (
              <img
                src={gallery[fullscreenIndex].src}
                alt={product?.name || "Product preview"}
                className="max-h-full max-w-full object-contain"
              />
            ) : null}
            <button
              type="button"
              onClick={() => stepFullscreen(-1)}
              className="absolute left-3 inline-flex h-11 w-11 items-center justify-center border border-ivory/30 text-ivory transition-colors hover:bg-ivory hover:text-ink"
              aria-label="Previous view"
            >
              <ChevronLeft size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => stepFullscreen(1)}
              className="absolute right-3 inline-flex h-11 w-11 items-center justify-center border border-ivory/30 text-ivory transition-colors hover:bg-ivory hover:text-ink"
              aria-label="Next view"
            >
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="flex justify-center gap-2 overflow-x-auto px-4 py-3">
            {gallery.map((item, index) => (
              <button
                key={`${item.id ?? item.src}-${index}`}
                type="button"
                onClick={() => setFullscreenIndex(index)}
                className={`h-14 w-11 shrink-0 overflow-hidden border ${
                  index === fullscreenIndex ? "border-ivory" : "border-ivory/20"
                }`}
                aria-label={`View ${viewLabelOf(item)}`}
              >
                {item.src ? (
                  <img src={item.src} alt="" className="h-full w-full object-cover" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
