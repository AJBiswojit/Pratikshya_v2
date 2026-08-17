import { useState } from "react";
import { Link } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import MediaThumb from "../../../components/media/MediaThumb";
import StatusBadge from "../../../components/employee/StatusBadge";
import MediaUploadPanel from "../../../components/media/MediaUploadPanel";
import { AtelierButton } from "../../../design-system";
import {
  MARKETING_PLACEMENT_OPTIONS,
  MEDIA_STATUS,
  getMediaStatusLabel,
  getMediaStatusTone,
} from "../../../config/mediaTypes";
import { useMarketingMedia, useMediaMetrics } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";

/**
 * PRATIKSHYA FASHON — Marketing media.
 *
 * The storefront's editorial artwork, arranged by placement. Each placement
 * is a real seam on the site; only the ones marked live are wired to a
 * section today, and the board says so plainly rather than promising a slot
 * that does not exist.
 *
 * One active record per placement reaches customers — the first in order —
 * so activating a second is a deliberate act, not an accident.
 */

export default function AdminMarketingMedia() {
  const media = useMarketingMedia();
  const metrics = useMediaMetrics();
  const actions = useMediaActions();

  const [uploadFor, setUploadFor] = useState(null);

  const livePlacements = MARKETING_PLACEMENT_OPTIONS.filter((placement) => placement.live);
  const plannedPlacements = MARKETING_PLACEMENT_OPTIONS.filter((placement) => !placement.live);

  const forPlacement = (id) => media.filter((item) => item.placement === id);

  const renderPlacement = (placement) => {
    const items = forPlacement(placement.id);
    const active = items.find((item) => item.status === MEDIA_STATUS.ACTIVE) ?? null;

    return (
      <AdminPanel
        key={placement.id}
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
            ? active
              ? " · showing the active record below."
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
                    {active?.id === item.id && placement.live ? (
                      <StatusBadge label="On the storefront" tone="accent" />
                    ) : null}
                  </div>
                  {actions.access.canManageMarketing ? (
                    <div className="flex flex-wrap gap-1.5">
                      {item.status === MEDIA_STATUS.ACTIVE ? (
                        <AtelierButton
                          size="chip"
                          variant="outline"
                          onClick={() => actions.archive(item.id)}
                        >
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
  };

  return (
    <AdminPage
      eyebrow="Business / Media"
      title="Marketing media"
      description="Editorial and campaign artwork for the storefront, arranged by the section it appears in. Only active records are seen by customers."
      actions={
        <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
          Media library
        </AtelierButton>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard label="Marketing media" value={metrics.marketingMedia} hint="All placements" />
        <AdminMetricCard label="Active" value={metrics.activeMarketing} hint="Live on the storefront" />
        <AdminMetricCard label="Live placements" value={livePlacements.length} hint="Wired to a section" />
        <AdminMetricCard label="Planned" value={plannedPlacements.length} hint="Reserved for later phases" />
      </div>

      <div className="space-y-6">
        {livePlacements.map(renderPlacement)}

        <AdminPanel eyebrow="Reserved" title="Placements not yet wired">
          <p className="mb-4 font-ui text-[12px] text-taupe">
            These placements exist in the vocabulary so campaign work can be prepared, but the
            matching storefront section does not read from the register yet. Assign media here and
            it will be waiting when the section is wired.
          </p>
          <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
            {plannedPlacements.map((placement) => {
              const count = forPlacement(placement.id).length;
              return (
                <li key={placement.id} className="border border-mist/80 bg-surface/30 px-4 py-3">
                  <p className="font-ui text-[12px] text-ink">{placement.label}</p>
                  <p className="mt-1 font-ui text-[11px] text-taupe">
                    {count ? `${count} prepared` : "Nothing prepared"}
                  </p>
                </li>
              );
            })}
          </ul>
        </AdminPanel>
      </div>
    </AdminPage>
  );
}
