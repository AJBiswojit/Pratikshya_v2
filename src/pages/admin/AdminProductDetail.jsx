/**
 * /admin/products/:productId
 *
 * The complete product overview: identity, pricing with its history,
 * variants, attributes, media completeness, publishing controls, the
 * approval workflow and the product's own slice of the shared activity
 * diary. The customer preview opens the real storefront design.
 */

import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Copy, ExternalLink, Images, Pencil } from "lucide-react";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import StatusBadge from "../../components/employee/StatusBadge";
import { AtelierButton } from "../../design-system";
import { getPublishIssues } from "../../services/catalogRepository";
import {
  approveProduct,
  archiveProduct,
  duplicateProduct,
  publishProduct,
  restoreProduct,
  returnProduct,
  unpublishProduct,
} from "../../services/workflow/productWorkflowCommands";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../../services/workflow/productWorkflowState";
import inventoryRepository from "../../services/inventory/inventoryRepository";
import { useInventory } from "../../context/InventoryContext";
import { useProduct } from "../../hooks/useProducts";
import { useProductMedia } from "../../hooks/useMedia";
import { useActivityLog } from "../../hooks/useProducts";
import { activityForProduct, getActivityLabel } from "../../services/employees/activityService";
import { resolveProductCover } from "../../services/media/productMediaSource";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { computePricing, describeDiscount, resolveVariantPrice } from "../../utils/pricing";
import { formatINR } from "../../utils/shopping";
import {
  getProductStatusLabel,
  getProductTypeLabel,
} from "../../config/productCatalogConfig";
import { categoryLabels } from "../../data/products/taxonomy";
import taxonomyRepository from "../../services/taxonomyRepository";
import { formatEmployeeDateTime } from "../../utils/employee";

const statusTone = {
  PUBLISHED: "ink",
  PENDING_REVIEW: "alert",
  DRAFT: "quiet",
  ARCHIVED: "muted",
};

const Term = ({ label, value }) => (
  <div>
    <dt className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">{label}</dt>
    <dd className="mt-1 font-ui text-sm text-ink font-medium">{value || "—"}</dd>
  </div>
);

export default function AdminProductDetail() {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;

  const product = useProduct(productId);
  const inventory = useInventory();
  const { summary } = useProductMedia(productId);
  const activity = useActivityLog();
  const [rejection, setRejection] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [notice, setNotice] = useState(null);

  if (!product) {
    return (
      <AdminPage title="Product unavailable">
        <p className="font-ui text-sm text-taupe">That product could not be found.</p>
        <AtelierButton as={Link} to="/admin/products" size="chip" variant="outline" className="mt-4">
          Back to catalogue
        </AtelierButton>
      </AdminPage>
    );
  }

  const cover = resolveProductCover(product);
  const workflowState = getProductWorkflowState(product);
  const computed = computePricing(product.pricing);
  const issues = getPublishIssues(product);
  const productActivity = activityForProduct(activity, product.id);
  const previewHref = `/product/${product.slug}?preview=1`;
  const taxonomyCollections = taxonomyRepository.collectionsForProduct(product);
  const stockRows = inventory.records.filter((row) => row.productId === product.id);
  const inventorySummary = stockRows.reduce((summary, row) => ({
    available: summary.available + row.quantity.available,
    reserved: summary.reserved + row.quantity.reserved,
    locations: summary.locations.add(row.locationId),
    low: summary.low + (row.status === "LOW_STOCK" ? 1 : 0),
  }), { available: 0, reserved: 0, locations: new Set(), low: 0 });

  const run = (fn, successMessage) => {
    const result = fn();
    if (result.ok) {
      if (result.product?.status === "PUBLISHED") {
        inventoryRepository.ensureOpeningStock(result.product, actor);
      }
      setNotice(successMessage);
    } else {
      setNotice((result.errors ?? [result.error]).join(" "));
    }
  };

  return (
    <AdminPage
      eyebrow="Business / Products"
      title={product.name}
      description={`${product.sku} · ${categoryLabels[product.category] ?? product.category}${product.subcategory ? ` / ${product.subcategory}` : ""}`}
      actions={
        <>
          <AtelierButton
            as="a"
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            size="chip"
            variant="outline"
          >
            <ExternalLink size={12} aria-hidden="true" /> Preview as customer
          </AtelierButton>
          <AtelierButton as={Link} to={`/admin/products/${product.id}/media`} size="chip" variant="outline">
            <Images size={12} aria-hidden="true" /> Manage media
          </AtelierButton>
          <AtelierButton
            size="chip"
            variant="outline"
            onClick={() => {
              const result = duplicateProduct(product.id, actor);
              if (result.ok) navigate(`/admin/products/${result.product.id}/edit`);
              else setNotice(result.error);
            }}
          >
            <Copy size={12} aria-hidden="true" /> Duplicate
          </AtelierButton>
          <AtelierButton as={Link} to={`/admin/products/${product.id}/edit`} size="chip">
            <Pencil size={12} aria-hidden="true" /> Edit product
          </AtelierButton>
        </>
      }
    >
      {notice ? (
        <p aria-live="polite" className="mb-6 border border-mist/80 bg-canvas px-4 py-3 font-ui text-sm text-ink">
          {notice}
        </p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[300px_1fr]">
        {/* Left rail */}
        <div className="space-y-4">
          <div className="border border-mist/80 bg-surface/40 p-3">
            {cover?.src ? (
              <img src={cover.src} alt={product.name} className="h-80 w-full object-cover border border-mist/60" />
            ) : (
              <div className="flex h-80 w-full items-center justify-center bg-mist/40 font-ui text-[11px] uppercase tracking-[.16em] text-taupe">
                No cover yet
              </div>
            )}
          </div>

          <div className="border border-mist/80 bg-surface/30 p-4">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Status &amp; Merchandising</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge label={getProductStatusLabel(product.status)} tone={statusTone[product.status] ?? "quiet"} />
              {product.review.state === "PENDING" ? <StatusBadge label="Awaiting review" tone="alert" /> : null}
              {product.review.state === "REJECTED" ? <StatusBadge label="Rejected" tone="danger" /> : null}
              {product.isFeatured ? <StatusBadge label="Featured" tone="brass" /> : null}
              {product.isBestseller ? <StatusBadge label="Bestseller" tone="brass" /> : null}
              {product.isNew ? <StatusBadge label="New arrival" tone="brass" /> : null}
              {product.isLimitedEdition ? <StatusBadge label="Limited" tone="quiet" /> : null}
              {product.isTrending ? <StatusBadge label="Trending" tone="quiet" /> : null}
            </div>

            {product.review.state === "REJECTED" && product.review.rejectionReason ? (
              <p className="mt-3 border border-accent/40 bg-accent/[0.05] p-3 font-ui text-sm text-accent">
                Rejection reason: {product.review.rejectionReason}
              </p>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
              {workflowState.stage === WORKFLOW_STAGES.SUBMITTED ||
              workflowState.stage === WORKFLOW_STAGES.IN_ADMIN_REVIEW ? (
                <>
                  <AtelierButton size="chip" onClick={() => run(() => approveProduct(product.id, actor), "Approved — awaiting publication.")}>
                    Approve
                  </AtelierButton>
                  <AtelierButton size="chip" variant="outline" onClick={() => setRejecting((open) => !open)}>
                    Return
                  </AtelierButton>
                </>
              ) : workflowState.stage === WORKFLOW_STAGES.PUBLISHED ? (
                <AtelierButton variant="outline" size="chip" onClick={() => run(() => unpublishProduct(product.id, actor), "Moved back to draft.")}>
                  Unpublish
                </AtelierButton>
              ) : workflowState.stage === WORKFLOW_STAGES.APPROVED ? (
                <AtelierButton size="chip" onClick={() => run(() => publishProduct(product.id, actor), "Published to the storefront.")}>
                  Publish
                </AtelierButton>
              ) : null}

              {workflowState.stage === WORKFLOW_STAGES.ARCHIVED ? (
                <AtelierButton variant="outline" size="chip" onClick={() => run(() => restoreProduct(product.id, actor), "Restored to draft.")}>
                  Restore
                </AtelierButton>
              ) : (
                <AtelierButton variant="outline" size="chip" onClick={() => run(() => archiveProduct(product.id, actor), "Archived. Historical orders keep their reference.")}>
                  Archive
                </AtelierButton>
              )}
            </div>

            {rejecting ? (
              <form
                className="mt-4 space-y-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(
                    () => returnProduct(product.id, rejection.trim() || "Missing product details.", actor),
                    "Returned to draft for revision."
                  );
                  setRejecting(false);
                  setRejection("");
                }}
              >
                <label htmlFor="reject-reason" className="font-ui text-[10px] uppercase tracking-[.16em] text-ink">
                  Return reason
                </label>
                <textarea
                  id="reject-reason"
                  rows={3}
                  value={rejection}
                  onChange={(event) => setRejection(event.target.value)}
                  placeholder="Missing product details. Incorrect price. Poor product image…"
                  className="w-full border border-mist bg-canvas px-3 py-2 font-ui text-sm outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <AtelierButton type="submit" size="chip">Return product</AtelierButton>
                  <AtelierButton type="button" variant="outline" size="chip" onClick={() => setRejecting(false)}>
                    Cancel
                  </AtelierButton>
                </div>
              </form>
            ) : null}

            {issues.length ? (
              <div className="mt-4 border border-accent/40 bg-accent/[0.05] p-3">
                <p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent font-semibold">Publishing blockers</p>
                <ul className="mt-2 space-y-1">
                  {issues.map((issue) => (
                    <li key={issue} className="font-ui text-[12px] text-accent">— {issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="border border-mist/80 bg-surface/30 p-4">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Media</p>
            <p className="mt-2 font-ui text-sm text-ink">
              {summary.total} item{summary.total === 1 ? "" : "s"} · {summary.images} image{summary.images === 1 ? "" : "s"} ·{" "}
              {summary.videos} video{summary.videos === 1 ? "" : "s"}
            </p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {summary.needsCover && !product.image ? (
                <StatusBadge label="Needs cover" tone="danger" />
              ) : summary.hasCover || product.image ? (
                <StatusBadge label="✓ Cover" tone="ink" />
              ) : (
                <StatusBadge label="Catalogue plates" tone="quiet" />
              )}
            </div>
            <Link
              to={`/admin/products/${product.id}/media`}
              className="mt-3 inline-block font-ui text-[11px] uppercase tracking-wider text-accent underline-offset-4 hover:underline"
            >
              Open Media Manager →
            </Link>
          </div>

          <div className="border border-mist/80 bg-surface/30 p-4">
            <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Record History</p>
            <dl className="mt-3 space-y-3 font-ui text-sm">
              <Term label="Created by" value={product.createdBy} />
              <Term label="Created at" value={product.createdAt ? formatEmployeeDateTime(product.createdAt) : null} />
              <Term label="Last updated by" value={product.updatedBy} />
              <Term label="Last updated at" value={product.updatedAt ? formatEmployeeDateTime(product.updatedAt) : null} />
              <Term label="Published by" value={product.publishedBy} />
              <Term label="Published at" value={product.publishedAt ? formatEmployeeDateTime(product.publishedAt) : null} />
            </dl>
          </div>
        </div>

        {/* Main column */}
        <div className="space-y-6">
          <AdminPanel eyebrow="Product overview" title="Identity">
            <dl className="grid gap-4 font-ui text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Term label="Product Name" value={product.name} />
              <Term label="SKU" value={product.sku} />
              <Term label="Product Type" value={getProductTypeLabel(product.productType)} />
              <Term label="Brand" value={product.brand} />
              <Term label="Gender" value={product.gender} />
              <Term label="Category" value={categoryLabels[product.category] ?? product.category} />
              <Term label="Subcategory" value={product.subcategory} />
              <Term label="Collections" value={taxonomyCollections.map((collection) => collection.name).join(", ") || product.collections?.join(", ") || product.collection} />
              <Term label="Product code" value={product.productCode} />
              <Term label="Barcode" value={product.barcode} />
              <Term label="Internal reference" value={product.internalReference} />
              <Term label="URL" value={`/product/${product.slug}`} />
              <Term label="Tags" value={product.tags?.join(", ")} />
              <Term label="Occasions" value={product.occasion?.join(", ")} />
            </dl>

            {product.shortDescription || product.description ? (
              <div className="mt-6 space-y-3 border-t border-mist/60 pt-5">
                {product.shortDescription ? (
                  <div>
                    <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-1">Short Description</p>
                    <p className="font-display text-base italic text-graphite">{product.shortDescription}</p>
                  </div>
                ) : null}
                {product.description ? (
                  <div>
                    <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-1">Full Description</p>
                    <p className="max-w-2xl font-ui text-sm leading-relaxed text-taupe">{product.description}</p>
                  </div>
                ) : null}
                {product.highlights?.length ? (
                  <div className="pt-2">
                    <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-2">Highlights</p>
                    <ul className="grid gap-1.5 sm:grid-cols-2">
                      {product.highlights.map((highlight) => (
                        <li key={highlight} className="font-ui text-sm text-ink">✓ {highlight}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel eyebrow="Commerce" title="Pricing &amp; Tax">
            <dl className="grid gap-4 font-ui text-sm sm:grid-cols-2 lg:grid-cols-4">
              <Term label="MRP" value={formatINR(computed.mrp)} />
              <Term label="Selling price" value={formatINR(computed.sellingPrice)} />
              <Term label="Discount" value={describeDiscount(product.pricing)} />
              <Term label="Final price" value={formatINR(product.price)} />
              <Term label="Tax mode" value={product.pricing.taxMode === "EXCLUSIVE" ? "Tax exclusive" : "Tax inclusive"} />
              <Term label="GST rate" value={`${product.pricing.taxRate}%`} />
              <Term label="Availability" value={product.availability} />
              <Term label="Stock (placeholder)" value={String(product.stock ?? 0)} />
            </dl>

            {product.priceHistory?.length ? (
              <div className="mt-6 border-t border-mist/60 pt-5">
                <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Price history</p>
                <ul className="mt-3 divide-y divide-mist/60 border border-mist/70 bg-canvas">
                  {product.priceHistory.map((entry) => (
                    <li key={entry.at} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 font-ui text-sm">
                      <span className="text-ink">
                        {formatINR(entry.from)} → {formatINR(entry.to)}
                      </span>
                      <span className="text-[11px] text-taupe">
                        {entry.by} · {formatEmployeeDateTime(entry.at)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel eyebrow="Commerce" title={`Variants (${product.variants.length})`}>
            {product.variants.length ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-left">
                  <thead>
                    <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                      {["SKU", "Colour", "Size", "Price", "Stock", "Barcode", "Status"].map((heading) => (
                        <th key={heading} className="px-3 py-2.5" scope="col">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((variant) => (
                      <tr key={variant.id} className="border-b border-mist/60 font-ui text-sm">
                        <td className="px-3 py-3 text-taupe font-mono text-xs">{variant.sku || "—"}</td>
                        <td className="px-3 py-3">{variant.color || "—"}</td>
                        <td className="px-3 py-3">{variant.size || "—"}</td>
                        <td className="px-3 py-3 font-medium">
                          {formatINR(resolveVariantPrice(variant, product.pricing))}
                          {variant.priceOverride ? <span className="ml-1 text-[10px] uppercase text-taupe">override</span> : null}
                        </td>
                        <td className="px-3 py-3">{variant.stock}</td>
                        <td className="px-3 py-3 text-taupe">{variant.barcode || "—"}</td>
                        <td className="px-3 py-3">
                          <StatusBadge label={variant.status === "ACTIVE" ? "Active" : "Inactive"} tone={variant.status === "ACTIVE" ? "ink" : "muted"} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="font-ui text-sm text-taupe">No variants — the product sells in its base colour and size.</p>
            )}
          </AdminPanel>

          <AdminPanel
            eyebrow="Inventory"
            title="Stock summary"
            action={
              <AtelierButton as={Link} to={`/admin/inventory?search=${encodeURIComponent(product.sku)}`} variant="outline" size="chip">
                View inventory
              </AtelierButton>
            }
          >
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Term label="Inventory tracking" value={product.inventoryTracked || stockRows.length ? "Enabled" : "Not tracked"} />
              <Term label="Available" value={String(inventorySummary.available)} />
              <Term label="Reserved" value={String(inventorySummary.reserved)} />
              <Term label="Locations" value={String(inventorySummary.locations.size)} />
              <Term label="Low-stock rows" value={String(inventorySummary.low)} />
            </dl>
          </AdminPanel>

          <AdminPanel eyebrow="Product record" title="Attributes &amp; Specifications">
            <dl className="grid gap-4 font-ui text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Term label="Fabric" value={product.fabric} />
              <Term label="Material" value={product.material} />
              <Term label="Primary colour" value={product.primaryColor} />
              <Term label="Secondary colour" value={product.secondaryColor} />
              <Term label="Colours" value={product.colors?.join(", ")} />
              <Term label="Sizes" value={product.sizes?.join(", ")} />
              <Term label="Patterns" value={product.patterns?.join(", ")} />
              <Term label="Work" value={product.work?.join(", ")} />
              <Term label="Season" value={product.season} />
              <Term label="Fit" value={product.fit} />
              <Term label="Length" value={product.length} />
              <Term label="Inventory tracked" value={product.inventoryTracked ? "Yes" : "No"} />
              <Term label="Low stock threshold" value={String(product.lowStockThreshold)} />
            </dl>

            {product.specifications && Object.keys(product.specifications).length > 0 ? (
              <div className="mt-5 border-t border-mist/60 pt-4">
                <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe mb-2">Specifications</p>
                <dl className="divide-y divide-mist/60 border border-mist/70 bg-canvas">
                  {Object.entries(product.specifications).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between px-3 py-2 font-ui text-sm">
                      <dt className="text-taupe uppercase text-[10px] tracking-wider">{key}</dt>
                      <dd className="text-ink font-medium">{val}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            {product.careInstructions?.length ? (
              <div className="mt-5 border-t border-mist/60 pt-4">
                <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Care Instructions</p>
                <ul className="mt-2 space-y-1 font-ui text-sm text-ink">
                  {product.careInstructions.map((line) => <li key={line}>· {line}</li>)}
                </ul>
              </div>
            ) : null}

            {product.deliveryInfo ? (
              <div className="mt-4 border-t border-mist/60 pt-4">
                <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Delivery Information</p>
                <p className="mt-2 font-ui text-sm text-ink">{product.deliveryInfo}</p>
              </div>
            ) : null}

            {product.returnPolicy?.eligibility || product.returnPolicy?.window || product.returnPolicy?.notes || product.returnInfo ? (
              <div className="mt-4 border-t border-mist/60 pt-4">
                <p className="font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Returns Policy</p>
                {product.returnInfo ? <p className="mt-2 font-ui text-sm text-ink">{product.returnInfo}</p> : null}
                {product.returnPolicy?.eligibility || product.returnPolicy?.window || product.returnPolicy?.notes ? (
                  <div className="mt-2 space-y-1 text-xs font-ui text-taupe">
                    {product.returnPolicy.eligibility ? <p>Eligibility: <span className="text-ink">{product.returnPolicy.eligibility}</span></p> : null}
                    {product.returnPolicy.window ? <p>Return Window: <span className="text-ink">{product.returnPolicy.window}</span></p> : null}
                    {product.returnPolicy.notes ? <p>Notes: <span className="text-ink">{product.returnPolicy.notes}</span></p> : null}
                  </div>
                ) : null}
              </div>
            ) : null}
          </AdminPanel>

          <AdminPanel eyebrow="Discovery" title="SEO">
            <dl className="grid gap-4 font-ui text-sm sm:grid-cols-2">
              <Term label="SEO title" value={product.seo.title || `${product.name} (default)`} />
              <Term label="URL slug" value={product.slug} />
            </dl>
            {product.seo.description ? (
              <p className="mt-3 font-ui text-sm leading-relaxed text-taupe">{product.seo.description}</p>
            ) : null}
          </AdminPanel>

          <AdminPanel eyebrow="House diary" title={`Activity (${productActivity.length})`}>
            {productActivity.length ? (
              <ol className="divide-y divide-mist/70">
                {productActivity.slice(0, 20).map((entry) => (
                  <li key={entry.id} className="px-1 py-3">
                    <p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">{getActivityLabel(entry.action)}</p>
                    <p className="mt-1 font-ui text-sm text-ink">{entry.summary}</p>
                    <p className="mt-1 font-ui text-[11px] text-taupe">
                      {entry.actorName} · {formatEmployeeDateTime(entry.at)}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="font-ui text-sm text-taupe">No product activity recorded yet.</p>
            )}
          </AdminPanel>
        </div>
      </div>
    </AdminPage>
  );
}
