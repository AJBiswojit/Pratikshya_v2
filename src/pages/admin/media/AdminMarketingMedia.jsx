import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowUp, Eye, Trash2 } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import StatusBadge from "../../../components/employee/StatusBadge";
import MediaThumb from "../../../components/media/MediaThumb";
import MediaUploadPanel from "../../../components/media/MediaUploadPanel";
import ProductCatalogSelector from "../../../components/admin/ProductCatalogSelector";
import { AtelierButton } from "../../../design-system";
import {
  MARKETING_PLACEMENT_OPTIONS,
  MEDIA_STATUS,
  PLACEMENT_MODES,
  getMediaStatusLabel,
  getMediaStatusTone,
  getPlacementLabel,
} from "../../../config/mediaTypes";
import { useMarketingMedia, useMediaMetrics } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import {
  usePlacementProductIds,
  marketingPlacementActions,
} from "../../../hooks/useMarketingPlacements";
import { useProducts } from "../../../hooks/useProducts";
import { resolveProductCover } from "../../../services/media/productMediaSource";
import { isPlacementRecordLive } from "../../../services/media/mediaResolver";
import { getProductStatusLabel } from "../../../config/productCatalogConfig";
import { categoryLabels } from "../../../data/products/taxonomy";

/**
 * PRATIKSHYA FASHON — Marketing media.
 *
 * The storefront's editorial artwork and product edits, arranged by
 * placement. Each placement is a real seam on the site.
 *
 * Two kinds of placement live on this board:
 *
 *   · PRODUCT placements for catalogue-backed sections
 *     are curated from the canonical product catalogue. "Add media" opens
 *     the Product Catalog Selector — no file browsing, no re-upload of a
 *     product image. The placement stores product IDs only, in display
 *     order; the catalogue stays the single source of truth for the
 *     product's name, taxonomy and media.
 *
 *   · GENERIC placements (Home hero, Editorial, Promotion) keep the
 *     existing house-artwork upload workflow. Hero and editorial media
 *     systems are untouched. The Festive section is a PRODUCT placement,
 *     curated from the catalogue like the Saree and Groom edits.
 *
 * The storefront reads the same register, so an assignment made here
 * appears on the matching section immediately, and survives refresh.
 */

const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const productStatusTone = (status) =>
  status === "PUBLISHED"
    ? "ink"
    : status === "PENDING_REVIEW"
      ? "alert"
      : status === "ARCHIVED"
        ? "muted"
        : "quiet";

/** A product-based placement panel: catalogue curation + assigned grid. */
function ProductPlacementPanel({ placement, canCurate }) {
  const products = useProducts();
  const productIds = usePlacementProductIds(placement.id);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const assigned = productIds
    .map((id) => products.find((product) => String(product.id) === String(id)))
    .filter(Boolean);

  const count = assigned.length;
  const toggleSelector = () => setSelectorOpen((open) => !open);

  return (
    <AdminPanel
      eyebrow={placement.live ? "Live seam" : "Not yet wired"}
      title={placement.label}
      action={
        canCurate ? (
          <AtelierButton size="chip" variant="outline" onClick={toggleSelector}>
            {selectorOpen ? "Close" : "Add media"}
          </AtelierButton>
        ) : null
      }
    >
      <p className="mb-4 font-ui text-[11px] text-taupe">
        {placement.surface}
        {placement.live
          ? count
            ? " · showing the assigned products below in display order."
            : placement.houseSelectionFallback
              ? " · no products assigned, so the section's house selection stands."
              : " · no products assigned — the section stays hidden until products are curated."
          : " · products can be curated here; the section is not wired to the register yet."}
      </p>

      {selectorOpen && canCurate ? (
        <div className="mb-6">
          <ProductCatalogSelector
            placementId={placement.id}
            initialSelectedIds={productIds}
            onCancel={toggleSelector}
            onConfirm={(ids) => {
              marketingPlacementActions.set(placement.id, ids);
              setSelectorOpen(false);
            }}
          />
        </div>
      ) : null}

      {count ? (
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <p className="font-ui text-[11px] uppercase tracking-[.18em] text-taupe">
            {count} {count === 1 ? "product assigned" : "products assigned"}
          </p>
          {canCurate && !selectorOpen ? (
            <AtelierButton size="chip" variant="outline" onClick={() => setSelectorOpen(true)}>
              + Add products
            </AtelierButton>
          ) : null}
        </div>
      ) : null}

      {count ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {assigned.map((product, index) => {
            /* The authored catalogue primary is the marketing preview; the
               canonical cover resolver is the fallback. */
            const cover = product.media?.primary
              ? { src: product.media.primary, alt: product.name }
              : resolveProductCover(product);
            const first = index === 0;
            const last = index === count - 1;
            return (
              <li key={product.id} className="border border-mist/80 bg-canvas">
                <div className="relative aspect-[3/2] overflow-hidden bg-surface">
                  {cover?.src ? (
                    <img
                      src={cover.src}
                      alt={product.name}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-canvas-deep font-ui text-[9px] uppercase tracking-[.2em] text-taupe">
                      No cover yet
                    </div>
                  )}
                  <span className="absolute left-2 top-2 bg-ink/80 px-2 py-1 font-ui text-[9px] tabular-nums tracking-[.14em] text-ivory">
                    {index + 1}
                  </span>
                </div>
                <div className="space-y-2 p-3">
                  <p className="font-display text-sm font-medium leading-snug text-ink">{product.name}</p>
                  <p className="font-mono text-[10px] uppercase text-cocoa">{product.id}</p>
                  <p className="font-ui text-[11px] text-taupe">
                    {product.department
                      ? `${titleCase(product.department)} / ${categoryLabels[product.category] ?? titleCase(product.category)}`
                      : categoryLabels[product.category] ?? titleCase(product.category)}
                    {product.subcategory ? ` / ${titleCase(product.subcategory)}` : ""}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge
                      label={getProductStatusLabel(product.status)}
                      tone={productStatusTone(product.status)}
                    />
                    {product.status !== "PUBLISHED" ? (
                      <StatusBadge label="Not on storefront" tone="alert" />
                    ) : null}
                  </div>
                  {canCurate ? (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <AtelierButton as={Link} to={`/admin/products/${product.id}`} size="chip" variant="outline">
                        <Eye size={11} aria-hidden="true" /> Preview
                      </AtelierButton>
                      <AtelierButton
                        size="chip"
                        variant="outline"
                        disabled={first}
                        aria-label={`Move ${product.name} up`}
                        onClick={() => marketingPlacementActions.move(placement.id, product.id, "up")}
                      >
                        <ArrowUp size={11} aria-hidden="true" />
                      </AtelierButton>
                      <AtelierButton
                        size="chip"
                        variant="outline"
                        disabled={last}
                        aria-label={`Move ${product.name} down`}
                        onClick={() => marketingPlacementActions.move(placement.id, product.id, "down")}
                      >
                        <ArrowDown size={11} aria-hidden="true" />
                      </AtelierButton>
                      <AtelierButton
                        size="chip"
                        variant="outline"
                        aria-label={`Remove ${product.name} from ${placement.label}`}
                        onClick={() => marketingPlacementActions.remove(placement.id, product.id)}
                      >
                        <Trash2 size={11} aria-hidden="true" /> Remove
                      </AtelierButton>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="border border-mist/80 bg-surface/30 px-5 py-10 text-center">
          <p className="font-ui text-sm text-taupe">No products assigned to this placement yet.</p>
          {canCurate ? (
            <AtelierButton
              size="chip"
              variant="outline"
              className="mt-4"
              onClick={() => setSelectorOpen(true)}
            >
              Add from product catalog
            </AtelierButton>
          ) : null}
        </div>
      )}
    </AdminPanel>
  );
}

/** A generic (house-artwork) placement panel — the existing media workflow. */
function GenericPlacementPanel({ placement, media, actions, uploadFor, setUploadFor }) {
  const items = media.filter((item) => item.placement === placement.id);
  const active = items.find((item) => item.status === MEDIA_STATUS.ACTIVE) ?? null;
  /* The badge and the copy answer the canonical consumption rule, not the
     local assignment: an ACTIVE record is only "on the storefront" when its
     placement's seam actually admits it (the hero register, for one, asks
     for the dedicated HERO role and mapping). */
  const liveRecord = active && isPlacementRecordLive(placement.id, active) ? active : null;

  return (
    <AdminPanel
      eyebrow={placement.live ? "Live seam" : "Not yet wired"}
      title={placement.label}
      action={
        actions.access.canUpload ? (
          <AtelierButton
            size="chip"
            variant="outline"
            onClick={() => setUploadFor(uploadFor === placement.id ? null : placement.id)}
          >
            {uploadFor === placement.id ? "Close" : "Add media"}
          </AtelierButton>
        ) : null
      }
    >
      <p className="mb-4 font-ui text-[11px] text-taupe">
        {placement.surface}
        {placement.live
          ? liveRecord
            ? " · showing the active record below."
            : active
              ? " · the active record below is not admitted by the seam yet, so the house artwork stands."
              : " · no active record, so the house artwork stands."
          : " · records can be prepared here; the section is not wired to the register yet."}
      </p>

      {uploadFor === placement.id && actions.access.canUpload ? (
        <div className="mb-5 border border-mist/80 bg-surface/20 p-4">
          <MediaUploadPanel
            onSubmit={(drafts) => {
              actions.upload(drafts, { placement: placement.id, scope: "MARKETING" });
              setUploadFor(null);
            }}
            busyLabel="Add to placement"
          />
        </div>
      ) : null}

      {items.length ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <li key={item.id} className="border border-mist/80 bg-canvas">
              <MediaThumb media={item} ratio="aspect-[3/2]" />
              <div className="space-y-2 p-3">
                <Link
                  to={`/admin/media/${item.id}`}
                  className="block min-w-0 font-ui text-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                >
                  <span className="line-clamp-2">{item.title}</span>
                </Link>
                {item.campaign ? (
                  <p className="font-ui text-[11px] text-taupe">
                    {item.campaign}
                    {item.campaignStart ? ` · from ${item.campaignStart}` : ""}
                    {item.campaignEnd ? ` to ${item.campaignEnd}` : ""}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  <StatusBadge
                    label={getMediaStatusLabel(item.status)}
                    tone={getMediaStatusTone(item.status)}
                  />
                  {liveRecord?.id === item.id ? (
                    <StatusBadge label="On the storefront" tone="accent" />
                  ) : null}
                </div>
                {actions.access.canManageMarketing ? (
                  <div className="flex flex-wrap gap-1.5">
                    {item.status === MEDIA_STATUS.ACTIVE ? (
                      <AtelierButton size="chip" variant="outline" onClick={() => actions.archive(item.id)}>
                        Archive
                      </AtelierButton>
                    ) : (
                      <AtelierButton size="chip" variant="outline" onClick={() => actions.activate(item.id)}>
                        Activate
                      </AtelierButton>
                    )}
                    <AtelierButton as={Link} to={`/admin/media/${item.id}`} size="chip" variant="outline">
                      Edit
                    </AtelierButton>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="border border-mist/80 bg-surface/30 px-5 py-10 text-center">
          <p className="font-ui text-sm text-taupe">Nothing assigned to this placement yet.</p>
        </div>
      )}
    </AdminPanel>
  );
}

export default function AdminMarketingMedia() {
  const media = useMarketingMedia();
  const metrics = useMediaMetrics();
  const actions = useMediaActions();

  const [uploadFor, setUploadFor] = useState(null);

  const livePlacements = MARKETING_PLACEMENT_OPTIONS.filter((placement) => placement.live);
  const plannedPlacements = MARKETING_PLACEMENT_OPTIONS.filter((placement) => !placement.live);

  const canCurate = actions.access.canUpload || actions.access.canManageMarketing;

  const renderPlacement = (placement) =>
    placement.mode === PLACEMENT_MODES.PRODUCT ? (
      <ProductPlacementPanel key={placement.id} placement={placement} canCurate={canCurate} />
    ) : (
      <GenericPlacementPanel
        key={placement.id}
        placement={placement}
        media={media}
        actions={actions}
        uploadFor={uploadFor}
        setUploadFor={setUploadFor}
      />
    );

  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Marketing media"
      description="Editorial artwork and product edits for the storefront, arranged by the section they appear in. Product sections are curated from the catalogue — generic placements keep the artwork upload."
      actions={
        <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
          Media library
        </AtelierButton>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard label="Marketing media" value={metrics.marketingMedia} hint="All placements" />
        <AdminMetricCard label="Active" value={metrics.activeMarketing} hint="Active marketing records" />
        <AdminMetricCard label="Live placements" value={livePlacements.length} hint="Wired to a section" />
        <AdminMetricCard label="Planned" value={plannedPlacements.length} hint="Reserved for later phases" />
      </div>

      <div className="space-y-6">
        {livePlacements.map(renderPlacement)}

        {plannedPlacements.length ? (
          <AdminPanel eyebrow="Reserved" title="Placements not yet wired">
            <p className="mb-4 font-ui text-[12px] text-taupe">
              These placements exist in the vocabulary so campaign work can be prepared, but the
              matching storefront section does not read from the register yet. Assign media here and
              it will be waiting when the section is wired.
            </p>
            <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              {plannedPlacements.map((placement) => {
                const label = getPlacementLabel(placement.id);
                return (
                  <li key={placement.id} className="border border-mist/80 bg-surface/30 px-4 py-3">
                    <p className="font-ui text-[12px] text-ink">{label}</p>
                    <p className="mt-1 font-ui text-[11px] text-taupe">Reserved</p>
                  </li>
                );
              })}
            </ul>
          </AdminPanel>
        ) : null}
      </div>
    </AdminPage>
  );
}
