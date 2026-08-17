import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import MediaVideo from "../../../components/media/MediaVideo";
import MediaThumb, { mediaImageSource } from "../../../components/media/MediaThumb";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import {
  MEDIA_SCOPES,
  MEDIA_SCOPE_LABELS,
  MEDIA_TYPES,
  MARKETING_PLACEMENT_OPTIONS,
  formatFileSize,
  getMediaStatusLabel,
  getMediaStatusTone,
  rolesForType,
} from "../../../config/mediaTypes";
import { useMediaRecord } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import catalogRepository from "../../../services/catalogRepository";
import { transferMediaOwnership } from "../../../services/productWorkflow";
import { formatEmployeeDateTime } from "../../../utils/employee";

/**
 * PRATIKSHYA FASHON — Media record.
 *
 * One piece of media, in full: preview, editable metadata, assignment,
 * status and removal. Everything on this page goes through the media
 * actions hook, so each change is written once and logged once.
 */

const field =
  "w-full border border-mist bg-canvas px-3 py-2 font-ui text-sm text-ink outline-none focus:border-accent";
const label = "font-ui text-[10px] uppercase tracking-[.16em] text-taupe";

export default function AdminMediaDetail() {
  const { mediaId } = useParams();
  const navigate = useNavigate();
  const media = useMediaRecord(mediaId);
  const actions = useMediaActions();

  const products = useMemo(() => catalogRepository.all(), []);

  /* The form is seeded from the record on the first render — never blank on
     arrival — and follows it afterwards, including changes made elsewhere. */
  const draftOf = (record) => ({
    title: record?.title ?? "",
    alt: record?.alt ?? "",
    caption: record?.caption ?? "",
    url: record?.url ?? "",
    poster: record?.poster ?? "",
    tags: (record?.tags ?? []).join(", "),
    campaign: record?.campaign ?? "",
    campaignStart: record?.campaignStart ?? "",
    campaignEnd: record?.campaignEnd ?? "",
  });

  const [draft, setDraft] = useState(() => draftOf(media));
  const [saved, setSaved] = useState(false);
  const [assignmentConflict, setAssignmentConflict] = useState(null);

  useEffect(() => {
    if (media) setDraft(draftOf(media));
  }, [media]);

  if (!media) {
    return (
      <AdminPage eyebrow="Business / Media" title="Media unavailable">
        <p className="font-ui text-sm text-taupe">
          That media record could not be found. It may have been removed.
        </p>
        <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline" className="mt-5">
          Back to the library
        </AtelierButton>
      </AdminPage>
    );
  }

  const isVideo = media.type === MEDIA_TYPES.VIDEO;

  const save = (event) => {
    event.preventDefault();
    actions.edit(media.id, {
      title: draft.title,
      alt: draft.alt,
      caption: draft.caption,
      url: draft.url,
      poster: draft.poster,
      tags: draft.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      campaign: draft.campaign,
      campaignStart: draft.campaignStart,
      campaignEnd: draft.campaignEnd,
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2400);
  };

  return (
    <AdminPage
      eyebrow="Business / Media"
      title={media.title}
      description={`${isVideo ? "Video" : "Image"} · ${MEDIA_SCOPE_LABELS[media.scope]} · added ${formatEmployeeDateTime(media.createdAt)}`}
      actions={
        <>
          <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
            Library
          </AtelierButton>
          {media.productId ? (
            <AtelierButton
              as={Link}
              to={`/admin/products/${media.productId}/media`}
              size="chip"
              variant="outline"
            >
              Product media
            </AtelierButton>
          ) : null}
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        {/* Preview ------------------------------------------------- */}
        <div className="space-y-4">
          <div className="border border-mist/80 bg-canvas p-3">
            {isVideo ? (
              <div className="aspect-[4/5]">
                <MediaVideo
                  src={media.url}
                  poster={media.poster}
                  posterImage={mediaImageSource(media)}
                  title={media.title}
                  objectFit="contain"
                />
              </div>
            ) : (
              <MediaThumb media={media} />
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <StatusBadge
                label={getMediaStatusLabel(media.status)}
                tone={getMediaStatusTone(media.status)}
              />
              {media.demoPlaceholder ? <StatusBadge label="Demo placeholder" tone="muted" /> : null}
            </div>
          </div>

          <AdminPanel eyebrow="Record" title="Details" bodyClassName="space-y-2">
            <dl className="space-y-2 font-ui text-[12px]">
              {[
                ["Identifier", media.id],
                ["Type", isVideo ? "Video" : "Image"],
                ["Scope", MEDIA_SCOPE_LABELS[media.scope]],
                ["Source", media.source || "—"],
                ["File", media.fileName || "—"],
                ["Size", media.fileSize ? formatFileSize(media.fileSize) : "—"],
                ["Uploaded By", media.uploadedBy ? `${media.uploadedBy}${media.uploadedByEmployeeId ? ` (${media.uploadedByEmployeeId})` : ""}` : "System Admin"],
                ["Uploaded Type", media.uploadedByType || "ADMIN"],
                ["Review Status", media.reviewStatus || (media.status === "ACTIVE" ? "APPROVED" : media.status)],
                ...(media.reviewedBy ? [["Reviewed By", media.reviewedBy]] : []),
                ...(media.reviewedAt ? [["Reviewed At", formatEmployeeDateTime(media.reviewedAt)]] : []),
                ["Sort order", media.sortOrder],
                ["Created", formatEmployeeDateTime(media.createdAt)],
                ["Updated", formatEmployeeDateTime(media.updatedAt)],
                ...(media.originalPath ? [["Original path", media.originalPath]] : []),
                ...(media.optimizedPath ? [["Optimized path", media.optimizedPath]] : []),
                ...(media.checksum ? [["Checksum", `${String(media.checksum).slice(0, 16)}…`]] : []),
                ...(media.width && media.height ? [["Dimensions", `${media.width} × ${media.height}`]] : []),
                ...(media.mappingStatus ? [["Mapping", media.mappingStatus]] : []),
                ...(media.categoryId ? [["Category", media.categoryId]] : []),
                ...(media.subcategoryId ? [["Subcategory", media.subcategoryId]] : []),
                ...(media.collectionId ? [["Collection", media.collectionId]] : []),
                ...(media.duplicateStatus ? [["Duplicate", media.duplicateStatus]] : []),
                ...((media.usageRoles || []).length ? [["Usage roles", media.usageRoles.join(", ")]] : []),
              ].map(([term, value]) => (
                <div key={term} className="flex items-start justify-between gap-3">
                  <dt className="text-taupe">{term}</dt>
                  <dd className="min-w-0 break-words text-right text-ink">{String(value)}</dd>
                </div>
              ))}
            </dl>

            {media.status === "REJECTED" && media.rejectionReason ? (
              <div className="mt-3 border border-accent/40 bg-accent/[0.06] p-3">
                <p className="font-ui text-[10px] uppercase tracking-wider font-semibold text-accent">
                  Rejection Reason
                </p>
                <p className="mt-1 font-ui text-xs text-accent">
                  {media.rejectionReason}
                </p>
              </div>
            ) : null}

            {media.demoPlaceholder ? (
              <p className="mt-3 border border-accent/30 bg-accent/[0.04] px-3 py-2 font-ui text-[11px] text-taupe">
                This record was added through demo upload. Its preview lived in the browser
                session only — add a media URL below to give it a real address.
              </p>
            ) : null}
          </AdminPanel>
        </div>

        {/* Editing -------------------------------------------------- */}
        <div className="space-y-6">
          <AdminPanel eyebrow="Metadata" title="Edit media">
            <form onSubmit={save} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-1">
                  <span className={label}>Title</span>
                  <input
                    value={draft.title}
                    onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                    className={field}
                  />
                </label>
                <label className="space-y-1">
                  <span className={label}>Alt text</span>
                  <input
                    value={draft.alt}
                    onChange={(event) => setDraft({ ...draft, alt: event.target.value })}
                    className={field}
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className={label}>Caption</span>
                  <input
                    value={draft.caption}
                    onChange={(event) => setDraft({ ...draft, caption: event.target.value })}
                    className={field}
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className={label}>{isVideo ? "Video URL" : "Image URL"}</span>
                  <input
                    value={draft.url}
                    onChange={(event) => setDraft({ ...draft, url: event.target.value })}
                    className={field}
                  />
                </label>
                {isVideo ? (
                  <label className="space-y-1 sm:col-span-2">
                    <span className={label}>Poster URL</span>
                    <input
                      value={draft.poster}
                      onChange={(event) => setDraft({ ...draft, poster: event.target.value })}
                      className={field}
                    />
                  </label>
                ) : null}
                <label className="space-y-1 sm:col-span-2">
                  <span className={label}>Tags — comma separated, also used for future AI</span>
                  <input
                    value={draft.tags}
                    onChange={(event) => setDraft({ ...draft, tags: event.target.value })}
                    className={field}
                  />
                </label>
                {media.scope === MEDIA_SCOPES.MARKETING ? (
                  <>
                    <label className="space-y-1">
                      <span className={label}>Campaign</span>
                      <input
                        value={draft.campaign}
                        onChange={(event) => setDraft({ ...draft, campaign: event.target.value })}
                        className={field}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={label}>Starts</span>
                      <input
                        type="date"
                        value={draft.campaignStart}
                        onChange={(event) =>
                          setDraft({ ...draft, campaignStart: event.target.value })
                        }
                        className={field}
                      />
                    </label>
                    <label className="space-y-1">
                      <span className={label}>Ends</span>
                      <input
                        type="date"
                        value={draft.campaignEnd}
                        onChange={(event) => setDraft({ ...draft, campaignEnd: event.target.value })}
                        className={field}
                      />
                    </label>
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <AtelierButton size="chip" type="submit" disabled={!actions.access.canEdit}>
                  Save changes
                </AtelierButton>
                <span
                  aria-live="polite"
                  className="font-ui text-[11px] uppercase tracking-[.14em] text-accent"
                >
                  {saved ? "Saved" : ""}
                </span>
              </div>
            </form>
          </AdminPanel>

          {/* Assignment ------------------------------------------- */}
          <AdminPanel eyebrow="Placement" title="Assignment">
            {assignmentConflict ? (
              <div className="mb-4 border border-accent/50 bg-accent/5 px-4 py-3">
                <p className="font-ui text-sm text-accent">
                  MEDIA ALREADY ASSIGNED — this asset belongs to{" "}
                  <strong>{assignmentConflict.productName ?? assignmentConflict.productId}</strong>{" "}
                  ({assignmentConflict.productId}). Media is never silently reassigned.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <AtelierButton
                    type="button"
                    size="chip"
                    onClick={() => {
                      const result = transferMediaOwnership(
                        media.id,
                        assignmentConflict.targetProductId,
                        null,
                        { confirm: true }
                      );
                      setAssignmentConflict(null);
                      setSaved(result.ok);
                    }}
                  >
                    Reassign anyway (removes the plate from the previous product)
                  </AtelierButton>
                  <AtelierButton
                    type="button"
                    size="chip"
                    variant="outline"
                    onClick={() => setAssignmentConflict(null)}
                  >
                    Cancel
                  </AtelierButton>
                </div>
              </div>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1">
                <span className={label}>Product</span>
                <select
                  value={media.productId ?? ""}
                  disabled={!actions.access.canAssign}
                  onChange={(event) => {
                    const target = event.target.value || null;
                    const moved = actions.assignToProduct(media.id, target, null);
                    if (!moved && target) {
                      const owner = catalogRepository.find(media.productId);
                      setAssignmentConflict({
                        targetProductId: target,
                        productId: media.productId,
                        productName: owner?.name ?? null,
                      });
                    } else {
                      setAssignmentConflict(null);
                      setSaved(Boolean(moved));
                    }
                  }}
                  className={field}
                >
                  <option value="">Not assigned to a product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              {media.scope === MEDIA_SCOPES.PRODUCT ? (
                <label className="space-y-1">
                  <span className={label}>Role</span>
                  <select
                    value={media.role ?? ""}
                    disabled={!actions.access.canAssign}
                    onChange={(event) =>
                      event.target.value === "COVER"
                        ? actions.setCover(media.productId, media.id)
                        : actions.edit(media.id, { role: event.target.value })
                    }
                    className={field}
                  >
                    {rolesForType(media.type).map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="space-y-1 sm:col-span-2">
                <span className={label}>Marketing placement</span>
                <select
                  value={media.placement ?? ""}
                  disabled={!actions.access.canAssign}
                  onChange={(event) =>
                    actions.assignToPlacement(media.id, event.target.value || null)
                  }
                  className={field}
                >
                  <option value="">No marketing placement</option>
                  {MARKETING_PLACEMENT_OPTIONS.map((placement) => (
                    <option key={placement.id} value={placement.id}>
                      {placement.label}
                      {placement.live ? "" : " — not yet live"}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 font-ui text-[11px] text-taupe">
              A record has one job at a time: assigning it to a product clears its marketing
              placement, and vice versa.
            </p>
          </AdminPanel>

          {/* Status ------------------------------------------------ */}
          <AdminPanel eyebrow="Lifecycle" title="Status and removal">
            <div className="flex flex-wrap gap-2">
              {media.status === "PENDING_REVIEW" ? (
                <>
                  <AtelierButton
                    size="chip"
                    disabled={!actions.access.canEdit}
                    onClick={() => actions.approve(media.id)}
                    className="bg-emerald-800 text-ivory hover:bg-emerald-900 border border-emerald-700"
                  >
                    Approve (Publish)
                  </AtelierButton>
                  <AtelierButton
                    size="chip"
                    variant="outline"
                    disabled={!actions.access.canEdit}
                    onClick={() => actions.reject(media.id, "Rejected by administrator.")}
                    className="text-accent border-accent/40 hover:bg-accent/[0.06]"
                  >
                    Reject
                  </AtelierButton>
                </>
              ) : null}
              <AtelierButton
                size="chip"
                variant="outline"
                disabled={!actions.access.canEdit}
                onClick={() => actions.activate(media.id)}
              >
                Activate
              </AtelierButton>
              <AtelierButton
                size="chip"
                variant="outline"
                disabled={!actions.access.canEdit}
                onClick={() => actions.setStatus(media.id, "DRAFT")}
              >
                Move to draft
              </AtelierButton>
              <AtelierButton
                size="chip"
                variant="outline"
                disabled={!actions.access.canEdit}
                onClick={() => actions.archive(media.id)}
              >
                Archive
              </AtelierButton>
              <AtelierButton
                size="chip"
                disabled={!actions.access.canDelete}
                onClick={() => {
                  const target = media.productId;
                  actions.remove(media.id);
                  navigate(target ? `/admin/products/${target}/media` : "/admin/media");
                }}
              >
                Remove media
              </AtelierButton>
            </div>
            <p className="mt-3 font-ui text-[11px] text-taupe">
              Only active media is shown to customers. Removing a product cover promotes the next
              image in order, so a product never loses its card plate by accident.
            </p>
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
