/**
 * /admin/products/review
 *
 * Phase 3D — the ONE unified Admin Product Review Workspace.
 *
 * Before Phase 3D this route embedded three separate review surfaces over
 * the same lifecycle (AdminKidsFinalizationPanel, AdminKidsReviewPanel and
 * the standalone draft-review table). Phase 3D consolidates them into:
 *
 *   UNIFIED REVIEW QUEUE      every product in the canonical register,
 *                             Kids included — filters, search, pagination
 *   PRODUCT REVIEW DETAIL     one review detail per product, with the
 *                             Kids validation section shown conditionally
 *   MEDIA INBOX               media intake (a media concern — unchanged)
 *   GROUPING DECISIONS        human same-or-different decisions (unchanged)
 *
 * Every lifecycle action routes through the canonical workflow commands
 * (approve / return / publish / submit / archive / assign) via the
 * productWorkflow service boundary. APPROVE ≠ PUBLISH. Kids is a category
 * validation layer, never a separate workflow.
 *
 * Compatibility: the historical `?draft=PRODUCT_ID` deep link (media inbox,
 * bookmarks) is redirected to `?product=PRODUCT_ID` — nothing breaks.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · queue rows come from the cached unified projection
 *   · heavy derived lists memoized; paginated inbox and queue rendering
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import AdminPage from "../../components/admin/AdminPage";
import AdminPanel from "../../components/admin/AdminPanel";
import StatusBadge from "../../components/employee/StatusBadge";
import MediaInboxCard from "../../components/admin/MediaInboxCard";
import ProductGroupReviewPanel from "../../components/admin/ProductGroupReviewPanel";
import UnifiedReviewQueue from "../../components/admin/UnifiedReviewQueue";
import ProductReviewDetail from "../../components/admin/ProductReviewDetail";
import { AtelierButton } from "../../design-system";
import { getMediaInbox } from "../../services/productWorkflow";
import { useProducts } from "../../hooks/useProducts";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { formatEmployeeDateTime } from "../../utils/employee";

const INBOX_FILTERS = [
  { id: "ALL", label: "All" },
  { id: "UNASSIGNED", label: "Unassigned" },
  { id: "DRAFT", label: "Draft" },
  { id: "REVIEW", label: "Review" },
  { id: "NEEDS_REVIEW", label: "Needs review" },
  { id: "CLAIMED_BY_DRAFT", label: "Claimed by draft" },
];

const INBOX_PAGE_SIZE = 24;

export default function AdminProductReview() {
  const { admin } = useAdminAuth();
  const actor = admin ? { adminId: admin.adminId, name: admin.name || "Administrator" } : null;

  const items = useProducts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [notice, setNotice] = useState(null);
  const [inboxFilter, setInboxFilter] = useState("ALL");
  const [inboxVisible, setInboxVisible] = useState(INBOX_PAGE_SIZE);

  /* Phase 3D compatibility — the historical `?draft=` deep link becomes the
     unified `?product=` focus. Safe redirect, never a dead end. */
  const legacyDraft = searchParams.get("draft");
  const focusedProductId = searchParams.get("product") || legacyDraft;
  useEffect(() => {
    if (legacyDraft && !searchParams.get("product")) {
      setSearchParams({ product: legacyDraft }, { replace: true });
    }
  }, [legacyDraft, searchParams, setSearchParams]);

  const focusProduct = useCallback(
    (productId) => setSearchParams(productId ? { product: productId } : {}, { replace: false }),
    [setSearchParams]
  );

  const inbox = useMemo(() => getMediaInbox(), [items]);
  const filteredInbox = useMemo(
    () => (inboxFilter === "ALL" ? inbox : inbox.filter((row) => row.tags.includes(inboxFilter))),
    [inbox, inboxFilter]
  );
  const visibleInbox = useMemo(() => filteredInbox.slice(0, inboxVisible), [filteredInbox, inboxVisible]);

  const recentlyReviewed = useMemo(() => items
    .filter((product) => ["APPROVED", "REJECTED"].includes(product.review?.state))
    .sort((a, b) => ((a.review?.reviewedAt ?? "") < (b.review?.reviewedAt ?? "") ? 1 : -1))
    .slice(0, 6), [items]);

  return (
    <AdminPage
      eyebrow="Business / Products"
      title={<>Product <span className="italic text-accent">review.</span></>}
      description="One workspace over one product lifecycle: every product — Kids included — waits in the same unified queue, is reviewed in the same detail, and moves only through the canonical approve, return and publish commands. Nothing reaches the storefront until it is approved and then explicitly published."
      actions={<AtelierButton as={Link} to="/admin/products" size="chip" variant="outline">Back to catalog</AtelierButton>}
    >
      {notice ? (
        <p aria-live="polite" className={`mb-6 border px-4 py-3 font-ui text-sm ${notice.tone === "warn" ? "border-accent/60 bg-accent/5 text-accent" : "border-mist/80 bg-canvas text-ink"}`}>{notice.text}</p>
      ) : null}

      {/* UNIFIED REVIEW QUEUE ------------------------------------------ */}
      <AdminPanel eyebrow="One queue · one lifecycle" title="Unified review queue">
        <UnifiedReviewQueue focusId={focusedProductId} onSelect={focusProduct} />
      </AdminPanel>

      {/* UNIFIED PRODUCT REVIEW DETAIL --------------------------------- */}
      <div className="mt-8">
        <AdminPanel
          eyebrow={focusedProductId ? `Reviewing · ${focusedProductId}` : "Select a product from the queue"}
          title="Product review detail"
        >
          {focusedProductId ? (
            <ProductReviewDetail productId={focusedProductId} actor={actor} onNotice={setNotice} />
          ) : (
            <p className="py-10 text-center font-ui text-sm text-taupe">
              Choose a product above to review it — identity, media, information, workflow, review
              flags and (for Kids products) the Kids validation section all live in this one place.
            </p>
          )}
        </AdminPanel>
      </div>

      {/* MEDIA INBOX — media intake, a separate concern (unchanged) ----- */}
      <div className="mt-8">
        <AdminPanel eyebrow={`Media inbox · ${filteredInbox.length} of ${inbox.length}`} title="Media inbox">
          <div className="mb-4 flex flex-wrap gap-1.5 border-b border-mist pb-4">
            {INBOX_FILTERS.map((filter) => (
              <button
                key={filter.id}
                type="button"
                onClick={() => { setInboxFilter(filter.id); setInboxVisible(INBOX_PAGE_SIZE); }}
                className={`px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] transition-colors ${inboxFilter === filter.id ? "bg-ink text-ivory" : "text-taupe hover:bg-mist/60 hover:text-ink"}`}
                aria-pressed={inboxFilter === filter.id}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {!filteredInbox.length ? (
            <p className="py-10 text-center font-ui text-sm text-taupe">Nothing in this inbox view. The atelier is in order.</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {visibleInbox.map((row) => (
                  <MediaInboxCard key={row.media.id} row={row} actor={actor} onNotice={setNotice} />
                ))}
              </div>
              {visibleInbox.length < filteredInbox.length ? (
                <div className="mt-6 flex justify-center">
                  <button type="button" onClick={() => setInboxVisible(v => v + INBOX_PAGE_SIZE)} className="border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:border-ink hover:text-ink">
                    Load more · {filteredInbox.length - visibleInbox.length} remaining
                  </button>
                </div>
              ) : null}
            </>
          )}
        </AdminPanel>
      </div>

      {/* GROUPING DECISIONS --------------------------------------------- */}
      <div className="mt-8">
        <AdminPanel eyebrow="Grouping decisions" title="Same product, or different products?">
          <ProductGroupReviewPanel actor={actor} onNotice={setNotice} />
        </AdminPanel>
      </div>

      {/* RECENT DECISIONS ------------------------------------------------ */}
      {recentlyReviewed.length ? (
        <div className="mt-8">
          <AdminPanel eyebrow="Decisions" title="Recently reviewed">
            <ul className="divide-y divide-mist/70">
              {recentlyReviewed.map((product) => (
                <li key={product.id} className="flex flex-wrap items-center justify-between gap-3 px-1 py-3">
                  <div>
                    <button
                      type="button"
                      onClick={() => focusProduct(product.id)}
                      className="font-ui text-sm text-ink underline-offset-4 hover:text-accent hover:underline"
                    >
                      {product.name}
                    </button>
                    <p className="font-ui text-[11px] text-taupe">{product.review?.reviewedBy ?? "—"} · {product.review?.reviewedAt ? formatEmployeeDateTime(product.review.reviewedAt) : ""}{product.review?.state === "REJECTED" && product.review?.rejectionReason ? ` — ${product.review.rejectionReason}` : ""}</p>
                  </div>
                  <StatusBadge label={product.review?.state === "APPROVED" ? "Approved" : "Returned"} tone={product.review?.state === "APPROVED" ? "ink" : "danger"} />
                </li>
              ))}
            </ul>
          </AdminPanel>
        </div>
      ) : null}
    </AdminPage>
  );
}
