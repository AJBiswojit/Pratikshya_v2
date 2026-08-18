import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, Film, Image as ImageIcon, Layers, Plus, Search, Sparkles, Star, Tag } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import MediaThumb from "../../../components/media/MediaThumb";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import {
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_STATUS_OPTIONS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  USAGE_ROLE_OPTIONS,
  getMediaStatusLabel,
  getMediaStatusTone,
  getPlacementLabel,
  getProductRoleLabel,
} from "../../../config/mediaTypes";
import taxonomyRepository from "../../../services/taxonomyRepository";
import catalogRepository from "../../../services/catalogRepository";
import { useMediaLibrary, useMediaMetrics } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import { cn } from "../../../utils/cn";

const TABS = [
  { id: "ALL", label: "All" },
  { id: "IMAGES", label: "Images" },
  { id: "VIDEOS", label: "Videos" },
  { id: "PRODUCT", label: "Product" },
  { id: "MARKETING", label: "Marketing" },
  { id: "UNASSIGNED", label: "Unassigned" },
  { id: "PENDING_REVIEW", label: "Pending Review" },
  { id: "UNMAPPED", label: "Unmapped" },
  { id: "DUPLICATE", label: "Duplicates" },
  { id: "NEEDS_REVIEW", label: "Needs Review" },
  /* Phase 3F — ownership-state queues. Orphaned: PRODUCT scope whose owner
     no longer exists in the catalogue. Archived product: the owner exists
     but has been retired from the storefront. */
  { id: "ORPHANED", label: "Orphaned" },
  { id: "ARCHIVED_PRODUCT", label: "Archived Product" },
];

const matchesTab = (media, tab, ownerStatusOf) => {
  switch (tab) {
    case "IMAGES":
      return media.type === MEDIA_TYPES.IMAGE;
    case "VIDEOS":
      return media.type === MEDIA_TYPES.VIDEO;
    case "PRODUCT":
      return media.scope === MEDIA_SCOPES.PRODUCT;
    case "MARKETING":
      return media.scope === MEDIA_SCOPES.MARKETING;
    case "UNASSIGNED":
      return media.scope === MEDIA_SCOPES.UNASSIGNED;
    case "PENDING_REVIEW":
      return media.status === MEDIA_STATUS.PENDING_REVIEW;
    case "UNMAPPED":
      return media.mappingStatus === "UNMAPPED";
    case "DUPLICATE":
      return media.duplicateStatus === "DUPLICATE" || media.duplicateStatus === "POSSIBLE_DUPLICATE";
    case "NEEDS_REVIEW":
      return (
        media.mappingStatus === "NEEDS_REVIEW" ||
        media.mappingStatus === "UNMAPPED" ||
        media.duplicateStatus === "DUPLICATE" ||
        media.duplicateStatus === "POSSIBLE_DUPLICATE" ||
        media.broken ||
        media.lowResolution
      );
    case "ORPHANED":
      return (
        media.scope === MEDIA_SCOPES.PRODUCT &&
        Boolean(media.productId) &&
        ownerStatusOf(media.productId) === null
      );
    case "ARCHIVED_PRODUCT":
      return (
        media.scope === MEDIA_SCOPES.PRODUCT &&
        Boolean(media.productId) &&
        ownerStatusOf(media.productId) === "ARCHIVED"
      );
    default:
      return true;
  }
};

/** One line describing where a record is used. */
const assignmentLine = (media) => {
  if (media.scope === MEDIA_SCOPES.PRODUCT) {
    return `${media.productId} · ${getProductRoleLabel(media.role)}`;
  }
  if (media.scope === MEDIA_SCOPES.MARKETING) {
    return getPlacementLabel(media.placement);
  }
  return "Unassigned";
};

export default function AdminMediaLibrary() {
  const media = useMediaLibrary();
  const metrics = useMediaMetrics();
  const actions = useMediaActions();

  const [tab, setTab] = useState("ALL");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [category, setCategory] = useState("ALL");
  const [usage, setUsage] = useState("ALL");
  const [selected, setSelected] = useState([]);
  const categories = useMemo(() => taxonomyRepository.activeCategories(), []);

  /* Phase 3F — owner status lookup for the Orphaned / Archived Product
     queues. Computed once per media/list change, not per row. */
  const ownerStatusOf = useMemo(() => {
    const cache = new Map();
    return (productId) => {
      const key = String(productId);
      if (!cache.has(key)) {
        const owner = catalogRepository.find(key);
        cache.set(key, owner ? owner.status : null);
      }
      return cache.get(key);
    };
  }, [media]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return media.filter((item) => {
      if (!matchesTab(item, tab, ownerStatusOf)) return false;
      if (status !== "ALL" && item.status !== status) return false;
      if (category !== "ALL" && item.categoryId !== category) return false;
      if (usage !== "ALL" && !(item.usageRoles || []).includes(usage)) return false;
      if (!needle) return true;
      return [
        item.title,
        item.alt,
        item.caption,
        item.productId,
        item.placement,
        item.campaign,
        item.fileName,
        item.uploadedBy,
        item.uploadedByEmployeeId,
        item.originalPath,
        item.currentFilename,
        item.mappingStatus,
        ...(item.tags ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [media, tab, status, category, usage, query, ownerStatusOf]);

  const toggle = (id) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );

  const clearSelection = () => setSelected([]);

  const bulk = (run) => {
    selected.forEach(run);
    clearSelection();
  };

  const chip = "px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] transition-colors";

  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Media Management"
      description="Manage product and marketing media across PRATIKSHYA FASHON."
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          {metrics.pendingReview > 0 ? (
            <AtelierButton
              as={Link}
              to="/admin/media/review"
              size="chip"
              className="bg-amber-800 text-ivory hover:bg-amber-900 border border-amber-700"
            >
              <Clock size={12} className="mr-1 inline-block" />
              Review Queue ({metrics.pendingReview})
            </AtelierButton>
          ) : null}
          <AtelierButton as={Link} to="/admin/media/marketing" size="chip" variant="outline">
            Marketing Media
          </AtelierButton>
          {actions.access.canUpload ? (
            <AtelierButton
              as={Link}
              to="/admin/media/upload"
              size="chip"
              className="bg-ink text-ivory hover:bg-cocoa shadow-sm"
            >
              <Plus size={13} className="mr-1 inline-block" />
              + Upload Media
            </AtelierButton>
          ) : null}
        </div>
      }
    >
      {/* Metrics Row — exactly matching Section 3:
          Total Media, Images, Videos, Product Media, Marketing Media, Unassigned, Pending Review, Active */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        <AdminMetricCard label="Total Media" value={metrics.total} icon={Layers} hint="All media assets" />
        <AdminMetricCard label="Images" value={metrics.images} icon={ImageIcon} hint="Still imagery" />
        <AdminMetricCard label="Videos" value={metrics.videos} icon={Film} hint="Video content" />
        <AdminMetricCard label="Product Media" value={metrics.productMedia} icon={Sparkles} hint="Assigned to products" />
        <AdminMetricCard label="Marketing Media" value={metrics.marketingMedia} icon={Tag} hint="Placement artwork" />
        <AdminMetricCard label="Unassigned" value={metrics.unassigned} hint="In library buffer" />
        <AdminMetricCard
          label="Pending Review"
          value={metrics.pendingReview}
          icon={Clock}
          tone={metrics.pendingReview > 0 ? "alert" : "default"}
          hint="Requires approval"
        />
        <AdminMetricCard label="Active" value={metrics.active} icon={Star} hint="Visible to customers" />
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <AdminMetricCard
          label="Unmapped"
          value={metrics.unmapped ?? 0}
          tone={(metrics.unmapped ?? 0) > 0 ? "alert" : "default"}
          hint="Needs taxonomy"
        />
        <AdminMetricCard label="Duplicates" value={metrics.duplicates ?? 0} hint="Kept, not deleted" />
        <AdminMetricCard label="Needs review" value={metrics.needsReview ?? 0} hint="Unmapped or uncertain" />
        <AdminMetricCard label="Large files" value={metrics.large ?? 0} hint="Originals ≥ 1.5 MB" />
        <AdminMetricCard label="Optimized" value={metrics.optimized ?? 0} hint="Application-ready" />
      </div>

      {/* Review Queue Alert Banner */}
      {metrics.pendingReview > 0 ? (
        <div className="mb-6 flex flex-col gap-3 border border-amber-400/80 bg-amber-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Clock className="text-amber-800 shrink-0" size={20} />
            <div>
              <p className="font-ui text-xs font-semibold uppercase tracking-wider text-amber-900">
                {metrics.pendingReview} {metrics.pendingReview === 1 ? "asset requires" : "assets require"} review
              </p>
              <p className="font-ui text-xs text-amber-800/90">
                Employee submissions waiting for approval before appearing on the storefront.
              </p>
            </div>
          </div>
          <AtelierButton
            as={Link}
            to="/admin/media/review"
            size="chip"
            className="self-start sm:self-center bg-amber-900 text-ivory hover:bg-amber-950"
          >
            Open Review Queue
          </AtelierButton>
        </div>
      ) : null}

      <AdminPanel eyebrow="Register" title="All Media">
        {/* Tabs ---------------------------------------------------- */}
        <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Media type">
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`media-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls="media-register"
              onClick={() => setTab(entry.id)}
              className={cn(
                chip,
                "border",
                tab === entry.id
                  ? "border-ink bg-ink text-ivory"
                  : "border-mist bg-canvas text-cocoa hover:border-ink"
              )}
            >
              {entry.label}
              {entry.id === "PENDING_REVIEW" && metrics.pendingReview > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-600 px-1.5 py-0.2 text-[8px] text-white">
                  {metrics.pendingReview}
                </span>
              ) : null}
              {entry.id === "UNMAPPED" && (metrics.unmapped ?? 0) > 0 ? (
                <span className="ml-1.5 rounded-full bg-amber-600 px-1.5 py-0.2 text-[8px] text-white">
                  {metrics.unmapped}
                </span>
              ) : null}
              {entry.id === "DUPLICATE" && (metrics.duplicates ?? 0) > 0 ? (
                <span className="ml-1.5 rounded-full bg-ink/70 px-1.5 py-0.2 text-[8px] text-white">
                  {metrics.duplicates}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* Search and status --------------------------------------- */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative flex-1">
            <span className="sr-only">Search media</span>
            <Search size={15} className="absolute left-3 top-3 text-taupe" aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search title, product SKU, placement, author..."
              className="w-full border border-mist bg-canvas py-2.5 pl-9 pr-3 font-ui text-sm text-ink outline-none focus:border-accent"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent"
            >
              <option value="ALL">All statuses</option>
              {MEDIA_STATUS_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="h-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent"
            >
              <option value="ALL">All categories</option>
              {categories.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by usage</span>
            <select
              value={usage}
              onChange={(event) => setUsage(event.target.value)}
              className="h-full border border-mist bg-canvas px-3 py-2.5 font-ui text-sm text-ink outline-none focus:border-accent"
            >
              <option value="ALL">All usage</option>
              {USAGE_ROLE_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Bulk bar ------------------------------------------------- */}
        {selected.length ? (
          <div className="mb-5 flex flex-wrap items-center gap-2 border border-ink/20 bg-surface/50 px-4 py-3">
            <p className="font-ui text-[11px] uppercase tracking-[.16em] text-taupe">
              {selected.length} selected
            </p>
            {actions.access.canEdit ? (
              <>
                <AtelierButton size="chip" variant="outline" onClick={() => bulk(actions.approve)}>
                  Approve (Make Active)
                </AtelierButton>
                <AtelierButton size="chip" variant="outline" onClick={() => bulk(actions.activate)}>
                  Activate
                </AtelierButton>
                <AtelierButton size="chip" variant="outline" onClick={() => bulk(actions.archive)}>
                  Archive
                </AtelierButton>
              </>
            ) : null}
            {actions.access.canDelete ? (
              <AtelierButton
                size="chip"
                variant="outline"
                onClick={() => {
                  actions.removeMany(selected);
                  clearSelection();
                }}
              >
                Remove
              </AtelierButton>
            ) : null}
            <button
              type="button"
              onClick={clearSelection}
              className="font-ui text-[11px] uppercase tracking-[.14em] text-taupe underline-offset-4 hover:text-accent hover:underline"
            >
              Clear selection
            </button>
          </div>
        ) : null}

        {/* Grid ----------------------------------------------------- */}
        <div id="media-register" role="tabpanel" aria-labelledby={`media-tab-${tab}`}>
          {filtered.length ? (
            <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              {filtered.map((item) => (
                <li key={item.id} className="border border-mist/80 bg-canvas">
                  <Link to={`/admin/media/${item.id}`} className="block">
                    <MediaThumb media={item} />
                  </Link>
                  <div className="space-y-2 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to={`/admin/media/${item.id}`}
                        className="min-w-0 font-ui text-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                      >
                        <span className="line-clamp-2">{item.title}</span>
                      </Link>
                      <input
                        type="checkbox"
                        checked={selected.includes(item.id)}
                        onChange={() => toggle(item.id)}
                        aria-label={`Select ${item.title}`}
                        className="mt-1 h-4 w-4 shrink-0 accent-[#B45309]"
                      />
                    </div>
                    <p className="font-ui text-[11px] text-taupe">{assignmentLine(item)}</p>

                    {item.uploadedBy ? (
                      <p className="font-ui text-[10px] text-taupe">
                        By {item.uploadedBy}
                        {item.uploadedByEmployeeId ? ` (${item.uploadedByEmployeeId})` : ""}
                      </p>
                    ) : null}

                    <div className="flex flex-wrap items-center gap-1.5">
                      <StatusBadge
                        label={getMediaStatusLabel(item.status)}
                        tone={getMediaStatusTone(item.status)}
                      />
                      {item.role === PRODUCT_MEDIA_ROLES.COVER ? (
                        <StatusBadge label="Cover" tone="accent" />
                      ) : null}
                      {item.mappingStatus === "UNMAPPED" ? <StatusBadge label="Unmapped" tone="alert" /> : null}
                      {item.mappingStatus === "NEEDS_REVIEW" ? <StatusBadge label="Review" tone="brass" /> : null}
                      {item.duplicateStatus === "DUPLICATE" ? <StatusBadge label="Duplicate" tone="muted" /> : null}
                      {item.demoPlaceholder ? <StatusBadge label="Demo" tone="muted" /> : null}
                      {item.scope === MEDIA_SCOPES.PRODUCT && item.productId && ownerStatusOf(item.productId) === null ? (
                        <StatusBadge label="Orphaned" tone="alert" />
                      ) : null}
                      {item.scope === MEDIA_SCOPES.PRODUCT && item.productId && ownerStatusOf(item.productId) === "ARCHIVED" ? (
                        <StatusBadge label="Archived product" tone="muted" />
                      ) : null}
                    </div>

                    {/* Quick action buttons */}
                    <div className="flex flex-wrap gap-1 pt-1 border-t border-mist/50">
                      {item.status === MEDIA_STATUS.PENDING_REVIEW && actions.access.canEdit ? (
                        <>
                          <AtelierButton
                            size="chip"
                            variant="outline"
                            onClick={() => actions.approve(item.id)}
                            className="text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                          >
                            Approve
                          </AtelierButton>
                          <AtelierButton
                            as={Link}
                            to={`/admin/media/review`}
                            size="chip"
                            variant="outline"
                            className="text-accent"
                          >
                            Review
                          </AtelierButton>
                        </>
                      ) : (
                        <AtelierButton
                          as={Link}
                          to={`/admin/media/${item.id}`}
                          size="chip"
                          variant="outline"
                        >
                          Details
                        </AtelierButton>
                      )}
                      {item.scope === MEDIA_SCOPES.PRODUCT && item.productId && ownerStatusOf(item.productId) !== null ? (
                        <AtelierButton
                          as={Link}
                          to={`/admin/products/${item.productId}/media`}
                          size="chip"
                          variant="outline"
                        >
                          View product
                        </AtelierButton>
                      ) : null}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="border border-mist/80 bg-surface/30 px-5 py-14 text-center">
              <p className="font-ui text-sm text-taupe">
                {media.length
                  ? "No media matches these filters."
                  : "No product media yet. Product media will appear here once products are added."}
              </p>
            </div>
          )}
        </div>

        <p className="mt-5 font-ui text-[11px] text-taupe" aria-live="polite">
          Showing {filtered.length} of {media.length} records · {metrics.pendingReview} pending review ·{" "}
          {metrics.draft} draft · {metrics.archived} archived · only {MEDIA_STATUS.ACTIVE.toLowerCase()} media reaches customers.
        </p>
      </AdminPanel>
    </AdminPage>
  );
}
