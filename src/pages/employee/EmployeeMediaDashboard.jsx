import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock, Eye, Layers, Plus, Search, XCircle } from "lucide-react";
import EmployeePage from "../../components/employee/EmployeePage";
import MetricCard from "../../components/employee/MetricCard";
import StatusBadge from "../../components/employee/StatusBadge";
import MediaThumb from "../../components/media/MediaThumb";
import { AtelierButton } from "../../design-system";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useMediaLibrary } from "../../hooks/useMedia";
import {
  MEDIA_STATUS,
  MEDIA_TYPES,
  getMediaStatusLabel,
  getMediaStatusTone,
  getProductRoleLabel,
} from "../../config/mediaTypes";
import { PERMISSIONS } from "../../config/employeePermissions";
import { formatEmployeeDateTime } from "../../utils/employee";
import catalogRepository from "../../services/catalogRepository";
import { cn } from "../../utils/cn";

export default function EmployeeMediaDashboard() {
  const { employee, hasPermission } = useEmployeeAuth();
  const allMedia = useMediaLibrary();

  const canUpload = hasPermission(PERMISSIONS.MEDIA_UPLOAD);
  const canManage = hasPermission(PERMISSIONS.MEDIA_MANAGE) || hasPermission(PERMISSIONS.MEDIA_EDIT);

  const [tab, setTab] = useState("MY_MEDIA");
  const [query, setQuery] = useState("");

  const myMedia = useMemo(
    () => allMedia.filter((item) => item.uploadedByEmployeeId === employee?.employeeId),
    [allMedia, employee?.employeeId]
  );

  // If the user has uploaded nothing yet in this session, show all submissions in the house or seeded items
  const employeeSubmissions = myMedia.length ? myMedia : allMedia.filter((item) => Boolean(item.uploadedByEmployeeId));

  const activeMediaPool = tab === "ALL_MEDIA" && canManage ? allMedia : employeeSubmissions;

  const metrics = useMemo(() => {
    return {
      uploaded: employeeSubmissions.length,
      pending: employeeSubmissions.filter((item) => item.status === MEDIA_STATUS.PENDING_REVIEW).length,
      approved: employeeSubmissions.filter((item) => item.status === MEDIA_STATUS.ACTIVE).length,
      rejected: employeeSubmissions.filter((item) => item.status === MEDIA_STATUS.REJECTED).length,
      totalHouse: allMedia.length,
      pendingHouse: allMedia.filter((item) => item.status === MEDIA_STATUS.PENDING_REVIEW).length,
    };
  }, [employeeSubmissions, allMedia]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return activeMediaPool.filter((item) => {
      if (tab === "PENDING" && item.status !== MEDIA_STATUS.PENDING_REVIEW) return false;
      if (tab === "APPROVED" && item.status !== MEDIA_STATUS.ACTIVE) return false;
      if (tab === "REJECTED" && item.status !== MEDIA_STATUS.REJECTED) return false;

      if (!needle) return true;
      return [
        item.title,
        item.alt,
        item.productId,
        item.uploadedBy,
        item.uploadedByEmployeeId,
        item.fileName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [activeMediaPool, tab, query]);

  const tabs = [
    { id: "MY_MEDIA", label: "My Media", count: employeeSubmissions.length },
    { id: "PENDING", label: "Pending Review", count: metrics.pending },
    { id: "APPROVED", label: "Approved", count: metrics.approved },
    { id: "REJECTED", label: "Rejected", count: metrics.rejected },
    ...(canManage ? [{ id: "ALL_MEDIA", label: "All House Media", count: allMedia.length }] : []),
  ];

  return (
    <EmployeePage
      eyebrow="Media Operations"
      title="Media Management"
      description="Upload, track and manage product media assets for the PRATIKSHYA FASHON catalogue and lookbooks."
      actions={
        <div className="flex flex-wrap items-center gap-2">
          {canUpload ? (
            <AtelierButton
              as={Link}
              to="/employee/media/upload"
              size="chip"
              className="bg-ink text-ivory hover:bg-cocoa shadow-sm"
            >
              <Plus size={13} className="mr-1 inline-block" />
              Upload Media
            </AtelierButton>
          ) : (
            <span className="inline-flex items-center gap-1.5 border border-mist bg-surface px-3 py-1.5 font-ui text-[10px] uppercase tracking-wider text-taupe">
              <Eye size={12} />
              View Only
            </span>
          )}
        </div>
      }
    >
      {/* Metrics Row — matching Section 17 */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Uploaded Assets"
          value={metrics.uploaded}
          hint={canManage ? "Your submissions" : "All your uploads"}
          icon={Layers}
        />
        <MetricCard
          label="Pending Review"
          value={metrics.pending}
          hint="Waiting for manager review"
          tone={metrics.pending > 0 ? "alert" : "default"}
          icon={Clock}
        />
        <MetricCard
          label="Approved (Active)"
          value={metrics.approved}
          hint="Live on storefront"
          icon={CheckCircle2}
        />
        <MetricCard
          label="Rejected"
          value={metrics.rejected}
          hint="Action required"
          tone={metrics.rejected > 0 ? "danger" : "default"}
          icon={XCircle}
        />
      </div>

      {/* Permission notice if view only */}
      {!canUpload ? (
        <div className="mb-6 flex items-center gap-3 border border-mist bg-surface/50 p-4 font-ui text-xs text-taupe">
          <Eye size={16} className="text-cocoa shrink-0" />
          <p>
            Your current role has <strong>View Only</strong> access to media assets. To submit or edit media, contact your store manager or operations administrator.
          </p>
        </div>
      ) : null}

      {/* Workflow guide note */}
      <div className="mb-6 border border-mist/80 bg-canvas p-4 font-ui text-xs text-taupe space-y-1">
        <p className="font-semibold text-ink uppercase tracking-wider text-[10px]">
          Atelier Media Approval Workflow
        </p>
        <p className="leading-relaxed">
          Uploaded media assets enter <strong>Pending Review</strong> and are audited for resolution, lighting and SKU accuracy. Once approved by management, assets automatically become <strong>Active</strong> and visible on customer product pages.
        </p>
      </div>

      {/* Main Panel */}
      <div className="border border-mist/80 bg-canvas p-4 sm:p-6 space-y-5">
        {/* Tabs & Search */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-mist/80 pb-4">
          <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Media filter tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] border transition-colors",
                  tab === t.id
                    ? "border-ink bg-ink text-ivory"
                    : "border-mist bg-canvas text-cocoa hover:border-ink"
                )}
              >
                {t.label}
                <span className="ml-1.5 opacity-70">({t.count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-2.5 text-taupe" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or SKU..."
              className="w-full border border-mist bg-canvas py-1.5 pl-8 pr-3 font-ui text-xs text-ink outline-none focus:border-accent"
            />
          </div>
        </div>

        {/* Media Grid */}
        {filtered.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((item) => {
              const product = item.productId ? catalogRepository.find(item.productId) : null;
              const isVid = item.type === MEDIA_TYPES.VIDEO;

              return (
                <li
                  key={item.id}
                  className="flex flex-col justify-between border border-mist/80 bg-surface/30 p-3 transition-colors hover:border-ink/40 hover:bg-surface/60"
                >
                  <div className="space-y-2.5">
                    {/* Thumbnail */}
                    <div className="relative">
                      <MediaThumb media={item} />
                      <span className="absolute top-2 left-2 rounded bg-ink/80 px-1.5 py-0.5 font-ui text-[8px] uppercase tracking-wider text-ivory">
                        {isVid ? "Video" : "Image"}
                      </span>
                      {item.role ? (
                        <span className="absolute bottom-2 left-2 rounded bg-ink/85 px-1.5 py-0.5 font-ui text-[8px] uppercase tracking-wider text-ivory">
                          {getProductRoleLabel(item.role)}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata */}
                    <div className="space-y-1">
                      <Link
                        to={`/employee/media/${item.id}`}
                        className="block font-display text-sm font-medium text-ink underline-offset-4 hover:text-accent hover:underline line-clamp-1"
                      >
                        {item.title}
                      </Link>

                      {product ? (
                        <p className="font-ui text-[11px] text-taupe truncate">
                          <span className="font-mono text-cocoa">{product.sku || product.id}</span> ·{" "}
                          {product.name}
                        </p>
                      ) : (
                        <p className="font-ui text-[11px] text-taupe">General media</p>
                      )}

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <StatusBadge
                          label={getMediaStatusLabel(item.status)}
                          tone={getMediaStatusTone(item.status)}
                        />
                        {item.demoPlaceholder ? (
                          <StatusBadge label="Demo" tone="muted" />
                        ) : null}
                      </div>

                      {/* Rejection Note */}
                      {item.status === MEDIA_STATUS.REJECTED && item.rejectionReason ? (
                        <div className="mt-2 border border-accent/40 bg-accent/[0.06] p-2 text-[10px] font-ui text-accent">
                          <strong>Note:</strong> {item.rejectionReason}
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div className="mt-3 flex items-center justify-between border-t border-mist/60 pt-2 font-ui text-[10px] text-taupe">
                    <span>{formatEmployeeDateTime(item.createdAt)}</span>
                    <Link
                      to={`/employee/media/${item.id}`}
                      className="text-cocoa hover:text-accent underline-offset-2 hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="border border-mist/80 bg-surface/20 p-12 text-center space-y-3">
            <Layers size={24} className="mx-auto text-taupe" />
            <p className="font-ui text-xs text-taupe">
              {query
                ? `No submissions found matching "${query}".`
                : tab === "PENDING"
                  ? "No media currently pending review."
                  : tab === "REJECTED"
                    ? "No rejected media submissions."
                    : "No media assets found in this view."}
            </p>
            {canUpload ? (
              <div className="pt-2">
                <AtelierButton as={Link} to="/employee/media/upload" size="chip">
                  <Plus size={12} className="mr-1 inline-block" />
                  Upload First Asset
                </AtelierButton>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </EmployeePage>
  );
}
