import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowDown, ArrowUp, Film, Image as ImageIcon, Star } from "lucide-react";
import AdminPage from "../../../components/admin/AdminPage";
import AdminPanel from "../../../components/admin/AdminPanel";
import AdminMetricCard from "../../../components/admin/AdminMetricCard";
import MediaThumb from "../../../components/media/MediaThumb";
import MediaVideo from "../../../components/media/MediaVideo";
import MediaUploadPanel from "../../../components/media/MediaUploadPanel";
import StatusBadge from "../../../components/employee/StatusBadge";
import { AtelierButton } from "../../../design-system";
import {
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  getMediaStatusLabel,
  getMediaStatusTone,
  getProductRoleLabel,
  rolesForType,
} from "../../../config/mediaTypes";
import { useMediaLibrary, useProductMedia } from "../../../hooks/useMedia";
import useMediaActions from "../../../hooks/useMediaActions";
import catalogRepository from "../../../services/catalogRepository";
import ProductLifecycleActions from "../../../components/admin/ProductLifecycleActions";

/**
 * PRATIKSHYA FASHON — Product media manager.
 *
 * One product's plates and film, in the order a customer will meet them.
 * The cover is named, the sequence can be moved a step at a time, roles are
 * editable inline, and unassigned library media can be pulled in without
 * leaving the page.
 */

const field =
  "w-full border border-mist bg-canvas px-2.5 py-1.5 font-ui text-[12px] text-ink outline-none focus:border-accent";

export default function AdminProductMedia() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [productVersion, setProductVersion] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const _refreshKey = productVersion; /* re-find the record after lifecycle actions */
  const product = catalogRepository.find(productId);
  const { items, summary } = useProductMedia(productId);
  const library = useMediaLibrary();
  const actions = useMediaActions();

  const [uploading, setUploading] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [pull, setPull] = useState("");

  const unassigned = library.filter((item) => item.scope === "UNASSIGNED");
  const preview = items.find((item) => item.id === previewId) ?? null;

  if (!product) {
    return (
      <AdminPage eyebrow="Business / Media" title="Product unavailable">
        <p className="font-ui text-sm text-taupe">That product could not be found.</p>
        <AtelierButton as={Link} to="/admin/products" size="chip" variant="outline" className="mt-5">
          Back to the catalog
        </AtelierButton>
      </AdminPage>
    );
  }

  return (
    <AdminPage
      eyebrow="Business / Media"
      title={`${product.name} — media`}
      description={`${product.sku ?? product.id} · arrange the plates and film shown on the product page. The cover is the single image every card, listing and search result uses.`}
      actions={
        <>
          <AtelierButton as={Link} to={`/admin/products/${productId}`} size="chip" variant="outline">
            Product record
          </AtelierButton>
          <AtelierButton as={Link} to="/admin/media" size="chip" variant="outline">
            Library
          </AtelierButton>
          {actions.access.canUpload ? (
            <AtelierButton size="chip" onClick={() => setUploading((open) => !open)}>
              {uploading ? "Close upload" : "Add media"}
            </AtelierButton>
          ) : null}
        </>
      }
    >
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard label="Total media" value={summary.total} hint="Images and film" />
        <AdminMetricCard label="Images" value={summary.images} icon={ImageIcon} hint="Still plates" />
        <AdminMetricCard label="Videos" value={summary.videos} icon={Film} hint="Optional" />
        <AdminMetricCard
          label="Cover"
          value={summary.hasCover ? "Set" : "Missing"}
          icon={Star}
          tone={summary.needsCover ? "alert" : "default"}
          hint={summary.needsCover ? "Needs cover" : "Used on every card"}
        />
      </div>

      {summary.needsCover ? (
        <div className="mb-6 border border-accent/40 bg-accent/[0.05] px-4 py-3">
          <p className="font-ui text-[10px] uppercase tracking-[.2em] text-accent">Needs cover</p>
          <p className="mt-1 font-ui text-[12px] text-taupe">
            This product has media but no cover image. Until one is chosen, its cards fall back to
            the catalogue plate.
          </p>
        </div>
      ) : null}

      {uploading && actions.access.canUpload ? (
        <AdminPanel eyebrow="Demo upload" title="Add media to this product" className="mb-6">
          <MediaUploadPanel
            showRole
            onSubmit={(drafts) => {
              actions.upload(drafts, { productId, scope: "PRODUCT" });
              setUploading(false);
            }}
          />
        </AdminPanel>
      ) : null}

      <AdminPanel
        eyebrow="Arrangement"
        title="Media on this product"
        action={
          unassigned.length && actions.access.canAssign ? (
            <div className="flex items-center gap-2">
              <label className="sr-only" htmlFor="pull-media">
                Attach media from the library
              </label>
              <select
                id="pull-media"
                value={pull}
                onChange={(event) => setPull(event.target.value)}
                className={field}
              >
                <option value="">Attach from library…</option>
                {unassigned.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <AtelierButton
                size="chip"
                variant="outline"
                disabled={!pull}
                onClick={() => {
                  actions.assignToProduct(pull, productId);
                  setPull("");
                }}
              >
                Attach
              </AtelierButton>
            </div>
          ) : null
        }
      >
        {items.length ? (
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map((item, index) => (
              <li key={item.id} className="border border-mist/80 bg-canvas">
                <div className="relative">
                  <MediaThumb media={item} />
                  <span className="absolute right-2 top-2 bg-ink/80 px-2 py-1 font-ui text-[9px] uppercase tracking-[.14em] text-ivory">
                    {index + 1}
                  </span>
                </div>

                <div className="space-y-3 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      to={`/admin/media/${item.id}`}
                      className="min-w-0 font-ui text-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      <span className="line-clamp-2">{item.title}</span>
                    </Link>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        aria-label={`Move ${item.title} earlier`}
                        disabled={
                          index === 0 ||
                          !actions.access.canEdit ||
                          item.role === PRODUCT_MEDIA_ROLES.COVER ||
                          items[index - 1]?.role === PRODUCT_MEDIA_ROLES.COVER
                        }
                        onClick={() => actions.move(productId, item.id, "up")}
                        className="border border-mist p-1.5 text-cocoa transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                      >
                        <ArrowUp size={13} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        aria-label={`Move ${item.title} later`}
                        disabled={
                          index === items.length - 1 ||
                          !actions.access.canEdit ||
                          item.role === PRODUCT_MEDIA_ROLES.COVER
                        }
                        onClick={() => actions.move(productId, item.id, "down")}
                        className="border border-mist p-1.5 text-cocoa transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
                      >
                        <ArrowDown size={13} strokeWidth={1.5} aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    <StatusBadge
                      label={getMediaStatusLabel(item.status)}
                      tone={getMediaStatusTone(item.status)}
                    />
                    <StatusBadge
                      label={getProductRoleLabel(item.role)}
                      tone={item.role === PRODUCT_MEDIA_ROLES.COVER ? "accent" : "quiet"}
                    />
                  </div>

                  <label className="block">
                    <span className="sr-only">Role for {item.title}</span>
                    <select
                      value={item.role ?? ""}
                      disabled={!actions.access.canEdit}
                      onChange={(event) =>
                        event.target.value === PRODUCT_MEDIA_ROLES.COVER
                          ? actions.setCover(productId, item.id)
                          : actions.edit(item.id, { role: event.target.value })
                      }
                      className={field}
                    >
                      {rolesForType(item.type).map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex flex-wrap gap-1.5">
                    {item.type === MEDIA_TYPES.IMAGE &&
                    item.role !== PRODUCT_MEDIA_ROLES.COVER &&
                    actions.access.canEdit ? (
                      <AtelierButton
                        size="chip"
                        variant="outline"
                        onClick={() => actions.setCover(productId, item.id)}
                      >
                        Set cover
                      </AtelierButton>
                    ) : null}
                    <AtelierButton
                      size="chip"
                      variant="outline"
                      onClick={() => setPreviewId(previewId === item.id ? null : item.id)}
                    >
                      {previewId === item.id ? "Close" : "Preview"}
                    </AtelierButton>
                    <AtelierButton as={Link} to={`/admin/media/${item.id}`} size="chip" variant="outline">
                      Edit
                    </AtelierButton>
                    {actions.access.canDelete ? (
                      <AtelierButton size="chip" variant="outline" onClick={() => actions.remove(item.id)}>
                        Remove
                      </AtelierButton>
                    ) : null}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="border border-mist/80 bg-surface/30 px-5 py-14 text-center">
            <p className="font-display text-lg font-light text-ink">No product media yet</p>
            <p className="mt-2 font-ui text-sm text-taupe">
              Product media will appear here once media is uploaded and assigned to this product.
            </p>
          </div>
        )}
      </AdminPanel>

      {/* Preview ------------------------------------------------- */}
      {preview ? (
        <AdminPanel eyebrow="Preview" title={preview.title} className="mt-6">
          <div className="mx-auto max-w-md">
            {preview.type === MEDIA_TYPES.VIDEO ? (
              <div className="aspect-[4/5]">
                <MediaVideo
                  src={preview.url}
                  poster={preview.poster}
                  title={preview.title}
                  objectFit="contain"
                />
              </div>
            ) : (
              <MediaThumb media={preview} />
            )}
            <p className="mt-3 font-ui text-[12px] text-taupe">{preview.alt}</p>
          </div>
        </AdminPanel>
      ) : null}

      {/* Lifecycle — archive / restore / safe permanent delete ---- */}
      <ProductLifecycleActions
        product={product}
        onChanged={() => setProductVersion((v) => v + 1)}
        onDeleted={() => navigate("/admin/media")}
      />
    </AdminPage>
  );
}
