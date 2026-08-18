/**
 * PRATIKSHYA FASHON — Product editor sections: Product Content, Media,
 * SEO and Publishing (Phase 13).
 *
 * The media section embeds a completeness summary only — the full media
 * manager stays the reusable Phase 12 surface, linked from here.
 */

import { Link } from "react-router-dom";
import { Check, ExternalLink, Film, Image as ImageIcon, Star } from "lucide-react";
import {
  PRODUCT_FLAG_OPTIONS,
  RETURN_ELIGIBILITY_OPTIONS,
  getProductStatusLabel,
} from "../../config/productCatalogConfig";
import { useProductMedia } from "../../hooks/useMedia";
import { imageRef } from "../../data/mediaPlaceholder";
import { resolveMediaUrl } from "../../services/media/mediaPaths";
import {
  Field,
  KeyValueEditor,
  ListEditor,
  Select,
  TextArea,
  TextInput,
  ToggleRow,
} from "./editorFields";

/* ------------------------------------------------------------------ */
/* 5 · Product content                                                 */
/* ------------------------------------------------------------------ */

export function SectionContent({ draft, patch }) {
  return (
    <div className="space-y-8">
      {/* Short & Full Description */}
      <div className="grid gap-6 lg:grid-cols-2 border-b border-mist/70 pb-8">
        <Field
          label="Short description"
          hint="One considered line for cards, headers and quick previews."
          htmlFor="pf-content-short"
          className="lg:col-span-2"
        >
          <TextArea
            id="pf-content-short"
            rows={2}
            value={draft.shortDescription}
            onChange={(event) => patch({ shortDescription: event.target.value })}
            placeholder="Describe this product"
          />
        </Field>

        <Field
          label="Full description"
          required
          hint="The story told in the product details section."
          htmlFor="pf-content-description"
          className="lg:col-span-2"
        >
          <TextArea
            id="pf-content-description"
            rows={5}
            value={draft.description}
            onChange={(event) => patch({ description: event.target.value })}
            placeholder="Woven with pure silk threads, this piece celebrates traditional craftsmanship with intricate zari motifs..."
          />
        </Field>
      </div>

      {/* Highlights */}
      <Field
        label="Highlights"
        hint="Key features and selling points, shown beside the price on the product page."
      >
        <ListEditor
          ariaLabel="Product highlights"
          value={draft.highlights}
          onChange={(highlights) => patch({ highlights })}
          placeholder="Product details"
        />
      </Field>

      {/* Specifications */}
      <Field label="Specifications" hint="Structured product attributes shown in the details accordion.">
        <KeyValueEditor
          value={draft.specifications}
          onChange={(specifications) => patch({ specifications })}
          keyPlaceholder="e.g. Saree Length, Blouse Piece, Weave"
          valuePlaceholder="e.g. 5.5 Metres, 0.8 Metre Included, Handloom"
        />
      </Field>

      {/* Care Instructions */}
      <Field
        label="Care instructions"
        hint="Fabric care guidelines for longevity. Blank falls back to house defaults."
      >
        <ListEditor
          ariaLabel="Care instructions"
          value={draft.careInstructions}
          onChange={(careInstructions) => patch({ careInstructions })}
          placeholder="Dry clean only with a specialist familiar with Indian occasion wear…"
        />
      </Field>

      {/* Delivery & Returns */}
      <div className="grid gap-6 lg:grid-cols-2 border-t border-mist/70 pt-6">
        <Field
          label="Delivery information"
          hint="Delivery timelines and dispatch details."
          htmlFor="pf-delivery"
        >
          <TextArea
            id="pf-delivery"
            rows={3}
            value={draft.deliveryInfo}
            onChange={(event) => patch({ deliveryInfo: event.target.value })}
            placeholder="Complimentary express delivery across India. Dispatched within 2–3 working days."
          />
        </Field>

        <div className="space-y-4">
          <Field label="Return eligibility" htmlFor="pf-return-eligibility">
            <Select
              id="pf-return-eligibility"
              value={draft.returnPolicy.eligibility}
              onChange={(event) =>
                patch({ returnPolicy: { ...draft.returnPolicy, eligibility: event.target.value } })
              }
              placeholder="House default (Returnable)"
              options={RETURN_ELIGIBILITY_OPTIONS.map((option) => ({
                value: option.id,
                label: option.label,
              }))}
            />
          </Field>
          <Field label="Return window" htmlFor="pf-return-window">
            <TextInput
              id="pf-return-window"
              value={draft.returnPolicy.window}
              onChange={(event) =>
                patch({ returnPolicy: { ...draft.returnPolicy, window: event.target.value } })
              }
              placeholder="7 days from delivery"
            />
          </Field>
          <Field label="Return notes" htmlFor="pf-return-notes">
            <TextArea
              id="pf-return-notes"
              rows={2}
              value={draft.returnPolicy.notes}
              onChange={(event) =>
                patch({ returnPolicy: { ...draft.returnPolicy, notes: event.target.value } })
              }
              placeholder="Unworn, with original tags intact."
            />
          </Field>
        </div>
      </div>

      <Field
        label="Customer-facing return line"
        hint="Composed summary shown to customers — edit only to override."
        htmlFor="pf-return-line"
      >
        <TextArea
          id="pf-return-line"
          rows={2}
          value={draft.returnInfo}
          onChange={(event) => patch({ returnInfo: event.target.value })}
          placeholder="Easy returns within 7 days of delivery, subject to unworn condition and original tags."
        />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 6 · Media — summary of the Phase 12 register, never a second store  */
/* ------------------------------------------------------------------ */

export function SectionMedia({ draft, patch, portal }) {
  const { items, summary } = useProductMedia(draft.id);
  const isSaved = Boolean(draft.id && draft.exists);
  const cover = items.find((item) => item.role === "COVER") ?? items[0];
  const mediaHref =
    portal === "admin"
      ? `/admin/products/${draft.id}/media`
      : `/employee/media/upload?product=${draft.id}`;

  const hasCoverImage = Boolean(summary.hasCover || draft.image || cover?.url || cover?.thumbnail);
  const imageCount = isSaved ? summary.images : (draft.image ? 1 : 0);
  const videoCount = isSaved ? summary.videos : 0;

  return (
    <div className="space-y-6">
      {/* Media Metrics Display */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-mist/80 bg-canvas p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Cover Image</p>
          <p className="mt-2 flex items-center gap-2 font-ui text-sm text-ink">
            {hasCoverImage ? (
              <>
                <Check size={14} className="text-accent" aria-hidden="true" /> Cover set
              </>
            ) : (
              <span className="text-accent font-medium">Needs cover</span>
            )}
          </p>
        </div>
        <div className="border border-mist/80 bg-canvas p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Images</p>
          <p className="mt-2 flex items-center gap-2 font-ui text-sm text-ink">
            <ImageIcon size={14} aria-hidden="true" /> {imageCount} image{imageCount === 1 ? "" : "s"}
          </p>
        </div>
        <div className="border border-mist/80 bg-canvas p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Videos</p>
          <p className="mt-2 flex items-center gap-2 font-ui text-sm text-ink">
            <Film size={14} aria-hidden="true" /> {videoCount} video{videoCount === 1 ? "" : "s"}
            <span className="text-[10px] uppercase tracking-[.14em] text-taupe">optional</span>
          </p>
        </div>
      </div>

      {/* Cover image preview or assignment */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <Field
            label="Cover image URL / plate"
            hint="Manifest key, plate id or direct image URL for the primary cover."
            htmlFor="pf-cover-input"
          >
            <TextInput
              id="pf-cover-input"
              value={draft.image || ""}
              onChange={(event) => patch({ image: event.target.value })}
              placeholder="saree-banarasi or https://images.pratikshya.com/..."
            />
          </Field>
        </div>

        <div>
          <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-ink">Cover Preview</p>
          {cover?.url || cover?.thumbnail ? (
            <img
              src={resolveMediaUrl(cover.url || cover.thumbnail)}
              alt={cover.alt || `${draft.name} cover`}
              className="h-44 w-full max-w-xs object-cover border border-mist"
            />
          ) : draft.image ? (
            <img
              src={
                draft.image.startsWith("http") || draft.image.startsWith("/") || draft.image.startsWith("data:")
                  ? resolveMediaUrl(draft.image)
                  : imageRef(draft.image)?.src
              }
              alt={`${draft.name} catalogue plate`}
              className="h-44 w-full max-w-xs object-cover border border-mist"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <div className="flex h-44 w-full max-w-xs items-center justify-center border border-dashed border-mist bg-canvas text-center p-4">
              <span className="font-ui text-xs text-taupe">No cover image specified yet.</span>
            </div>
          )}
        </div>
      </div>

      {isSaved ? (
        <div className="border border-mist/80 bg-surface/40 p-5">
          <p className="font-ui text-sm leading-relaxed text-ink">
            Manage the complete gallery, reorder images, upload lookbook photos and add videos
            via the dedicated Media Manager.
          </p>
          <Link
            to={mediaHref}
            className="mt-3 inline-flex items-center gap-2 border border-ink bg-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ivory transition-colors hover:bg-transparent hover:text-ink"
          >
            <Star size={12} aria-hidden="true" /> Manage Product Media <ExternalLink size={11} aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <div className="border border-mist/80 bg-canvas p-4 text-taupe font-ui text-xs">
          Tip: Save this product as a draft to upload multi-angle photos and videos via the Media Manager.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 7 · SEO                                                             */
/* ------------------------------------------------------------------ */

export function SectionSeo({ draft, patch, errors }) {
  return (
    <div className="grid gap-6">
      <Field
        label="URL slug"
        required
        error={errors.slug}
        hint="Existing slugs are preserved so product URLs never break. Edit only with intent."
        htmlFor="pf-slug"
      >
        <TextInput
          id="pf-slug"
          value={draft.slug}
          onChange={(event) => patch({ slug: event.target.value })}
          placeholder="auto-from-product-name"
          autoComplete="off"
        />
      </Field>

      <Field label="SEO title" hint="Defaults to the product name when blank." htmlFor="pf-seo-title">
        <TextInput
          id="pf-seo-title"
          value={draft.seo?.title || ""}
          onChange={(event) => patch({ seo: { ...(draft.seo || {}), title: event.target.value } })}
          placeholder={draft.name || "Product title for search engines"}
        />
      </Field>

      <Field
        label="SEO description"
        hint="Shown in search engine results snippets. Recommended under 160 characters."
        htmlFor="pf-seo-description"
      >
        <TextArea
          id="pf-seo-description"
          rows={3}
          value={draft.seo?.description || ""}
          onChange={(event) => patch({ seo: { ...(draft.seo || {}), description: event.target.value } })}
          placeholder="A brief search engine summary of this piece..."
        />
      </Field>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 8 · Publishing                                                      */
/* ------------------------------------------------------------------ */

export function SectionPublishing({ draft, patch, publishIssues }) {
  const flags = [
    { key: "isFeatured", ...PRODUCT_FLAG_OPTIONS[0] },
    { key: "isBestseller", ...PRODUCT_FLAG_OPTIONS[1] },
    { key: "isNew", ...PRODUCT_FLAG_OPTIONS[2] },
    { key: "isLimitedEdition", ...PRODUCT_FLAG_OPTIONS[3] },
    { key: "isTrending", ...PRODUCT_FLAG_OPTIONS[4] },
  ];

  return (
    <div className="space-y-8">
      {/* Current Publishing Status */}
      <div className="border border-mist/80 bg-canvas p-5">
        <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Current status</p>
        <div className="mt-2 flex items-center gap-3">
          <p className="font-display text-2xl font-light text-ink">
            {getProductStatusLabel(draft.status)}
          </p>
          <span
            className={
              draft.status === "PUBLISHED"
                ? "border border-ink bg-ink px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-wider text-ivory"
                : draft.status === "PENDING_REVIEW"
                  ? "border border-amber-600 bg-amber-50 px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-wider text-amber-800"
                  : "border border-mist bg-surface px-2.5 py-0.5 font-ui text-[10px] uppercase tracking-wider text-taupe"
            }
          >
            {draft.status}
          </span>
        </div>

        {draft.review?.state === "REJECTED" && draft.review.rejectionReason ? (
          <div className="mt-4 border border-accent/40 bg-accent/[0.05] p-4">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-accent font-semibold">
              Rejection Reason from Reviewer
            </p>
            <p className="mt-1 font-ui text-sm text-accent">
              {draft.review.rejectionReason}
            </p>
            <p className="mt-2 font-ui text-xs text-taupe">
              Please update the requested fields and click &quot;Submit for review&quot; below to resubmit.
            </p>
          </div>
        ) : null}

        {draft.review?.state === "PENDING" ? (
          <p className="mt-3 font-ui text-[11px] text-taupe">
            Submitted {draft.review.submittedAt ? new Date(draft.review.submittedAt).toLocaleString("en-IN") : ""}
            {draft.review.submittedBy ? ` by ${draft.review.submittedBy}` : ""} — awaiting manager or admin approval.
          </p>
        ) : null}
      </div>

      {/* Merchandising Flags */}
      <div>
        <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-ink">Merchandising flags</p>
        <div className="border border-mist/80 bg-canvas px-4 py-1">
          {flags.map((flag) => (
            <ToggleRow
              key={flag.key}
              label={flag.label}
              hint={flag.hint}
              checked={Boolean(draft[flag.key])}
              onChange={(checked) => patch({ [flag.key]: checked })}
            />
          ))}
        </div>
      </div>

      {/* Inventory preparation */}
      <div>
        <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-ink">Inventory preparation</p>
        <p className="mb-3 font-ui text-[11px] text-taupe">
          These settings feed the central inventory ledger. Opening stock is written once when the product is first published.
        </p>
        <div className="border border-mist/80 bg-canvas px-4 py-1">
          <ToggleRow
            label="Track inventory for this product"
            hint="Uses variant/location stock for availability, cart and checkout."
            checked={Boolean(draft.inventoryTracked)}
            onChange={(checked) => patch({ inventoryTracked: checked })}
          />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Low stock threshold" htmlFor="pf-low-stock">
            <TextInput
              id="pf-low-stock"
              type="number"
              min="0"
              value={draft.lowStockThreshold}
              onChange={(event) => patch({ lowStockThreshold: event.target.value })}
            />
          </Field>
          <Field
            label="Opening stock"
            htmlFor="pf-stock"
            hint={draft.variants?.length ? "Fallback when variant opening values are blank" : "Written once on first publication"}
          >
            <TextInput
              id="pf-stock"
              type="number"
              min="0"
              value={draft.stock}
              onChange={(event) => patch({ stock: event.target.value })}
            />
          </Field>
        </div>
      </div>

      {/* Publishing Readiness Checklist */}
      {publishIssues.length ? (
        <div className="border border-accent/40 bg-accent/[0.05] p-4">
          <p className="font-ui text-[10px] uppercase tracking-[.18em] text-accent font-semibold">
            Before Publishing ({publishIssues.length} issue{publishIssues.length === 1 ? "" : "s"} to resolve)
          </p>
          <ul className="mt-2 space-y-1.5">
            {publishIssues.map((issue) => (
              <li key={issue} className="font-ui text-sm text-accent">
                — {issue}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="border border-mist/80 bg-canvas p-4 font-ui text-sm text-ink">
          ✓ This product meets every publishing requirement and is ready to go live.
        </p>
      )}
    </div>
  );
}
