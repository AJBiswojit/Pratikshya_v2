/**
 * PRATIKSHYA FASHON — Unified Product Review detail (Phase 3D).
 *
 * ONE review detail for ONE product lifecycle. All products use this single
 * destination:
 *
 *   IDENTITY · MEDIA · PRODUCT INFORMATION · WORKFLOW · REVIEW FLAGS
 *   EDITING DESK    (conditional — the retained ProductDraftReviewPanel)
 *
 * Rules honoured here, not in the UI:
 *   · approve / return / publish / submit / archive / assign all call the
 *     CANONICAL workflow commands through the productWorkflow service
 *     boundary — never a raw status write, never a second approval system
 *   · APPROVE ≠ PUBLISH — approval never publishes; publish revalidates
 *   · return requires a reason (the canonical command refuses an empty one)
 *   · every flag/blocker shown is the canonical validator's own output —
 *     the UI duplicates no validation logic
 *   · media ownership is displayed read-only; assignment and transfer stay
 *     in Media Management through the media ownership service
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Archive, ArrowRight, Check, PackageCheck, ShieldCheck, Undo2 } from "lucide-react";
import StatusBadge from "../employee/StatusBadge";
import ProductDraftReviewPanel from "./ProductDraftReviewPanel";
import { useProduct } from "../../hooks/useProducts";
import { getProductMediaSet } from "../../services/media/productMediaSet";
import { validateProductForPublish } from "../../services/workflow/productPublishValidator";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
  isEditableStage,
  isApprovableStage,
} from "../../services/workflow/productWorkflowState";
import { getUnifiedReviewRow } from "../../services/unifiedProductReview";
import {
  approveProduct,
  archiveProduct,
  assignProductToEmployee,
  mediaFileName,
  publishProduct,
  returnProduct,
  submitProductForReview,
} from "../../services/productWorkflow";
import { reviewFlagLabel, PUBLISH_BLOCKING_FLAGS } from "../../services/productReviewFlags";
import { getActiveAssignmentEmployees, loadEmployees } from "../../services/employees/employeeService";
import { PERMISSIONS } from "../../config/employeePermissions";
import { categoryLabels } from "../../data/products/taxonomy";
import { computePricing } from "../../utils/pricing";
import { formatINR } from "../../utils/shopping";
import { employeeFullName, formatEmployeeDateTime } from "../../utils/employee";

const statusTone = { PUBLISHED: "ink", PENDING_REVIEW: "alert", DRAFT: "quiet", ARCHIVED: "muted" };

const labelClass = "mb-1 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe";
const valueClass = "font-ui text-sm text-ink";

/** WHERE a review flag gets fixed — points at the existing canonical
    surface; the rule itself stays in the validator, never here. */
const FLAG_FIX_HINTS = {
  NAME_REVIEW_REQUIRED: "Set the real product name in the editing desk below.",
  PRICE_REVIEW_REQUIRED: "Set the selling price in the editing desk below.",
  TAXONOMY_REVIEW_REQUIRED: "Choose category and subcategory in the editing desk below.",
  GROUP_REVIEW_REQUIRED: "Decide the group in the Grouping decisions panel on this page.",
  VARIANT_REVIEW_REQUIRED: "Review the variants on the full product record.",
  NEEDS_MEDIA: "Assign media in Media Management — ownership moves through the media ownership service.",
  MEDIA_OWNERSHIP_REVIEW: "Resolve ownership in Media Management — ownership moves through the media ownership service.",
  CONFLICT_UNRESOLVED: "Resolve the media conflict explicitly in the editing desk below.",
};

const DEFAULT_FLAG_WHY = "A human must resolve this flag before publishing — it blocks the canonical publish validation.";

const eligibleEmployees = () => {
  try {
    return getActiveAssignmentEmployees(loadEmployees(), {
      requiredPermission: PERMISSIONS.PRODUCTS_MANAGE,
    });
  } catch {
    return [];
  }
};

const Section = ({ title, eyebrow, children }) => (
  <section className="border border-mist bg-canvas">
    <header className="border-b border-mist px-4 py-2.5">
      {eyebrow ? <p className="font-ui text-[9px] uppercase tracking-[.2em] text-accent">{eyebrow}</p> : null}
      <h3 className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">{title}</h3>
    </header>
    <div className="px-4 py-3">{children}</div>
  </section>
);

export default function ProductReviewDetail({ productId, actor, onNotice }) {
  const product = useProduct(productId);

  const [busy, setBusy] = useState(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnArmed, setReturnArmed] = useState(false);
  /* Workflow command results render at the action bar itself — a blocked
     approve/publish must be visible exactly where the reviewer clicked. */
  const [actionNotice, setActionNotice] = useState(null);

  useEffect(() => {
    setReturnReason("");
    setReturnArmed(false);
    setBusy(null);
    setActionNotice(null);
  }, [productId]);

  const state = useMemo(() => getProductWorkflowState(product), [product]);
  const validation = useMemo(() => (product ? validateProductForPublish(product) : null), [product]);
  const mediaSet = useMemo(() => (product ? getProductMediaSet(product) : null), [product]);
  const pricing = useMemo(() => computePricing(product?.pricing), [product]);

  const blockingIssues = validation?.blocking ?? [];
  const flagIssues = useMemo(
    () => blockingIssues.filter((issue) => issue.code === "REVIEW_FLAG_BLOCKING"),
    [blockingIssues]
  );
  const reviewFlags = product?.reviewFlags ?? [];
  const conflicts = mediaSet?.ownershipConflicts ?? [];

  const run = useCallback((key, action) => {
    if (busy) return;
    setBusy(key);
    setActionNotice(null);
    setTimeout(() => {
      const result = action();
      setBusy(null);
      if (result?.ok) return;
      setActionNotice({
        tone: "warn",
        text: `${product?.id ?? "Product"}: ${(result?.errors ?? [result?.error ?? "Action failed."]).join(" ")}`,
      });
    }, 0);
  }, [busy, product]);

  const approve = useCallback(() => run("approve", () => {
    const result = approveProduct(product.id, actor);
    if (result.ok && !result.alreadyApproved && !result.alreadyPublished) {
      setActionNotice({ tone: "ok", text: `${product.id} approved — publish it when you are ready.` });
    } else if (result.ok) {
      setActionNotice({ tone: "ok", text: `${product.id} is already approved.` });
    }
    return result;
  }), [run, product, actor]);

  const doReturn = useCallback(() => {
    const reason = returnReason.trim();
    if (!reason) return;
    run("return", () => {
      const result = returnProduct(product.id, reason, actor);
      if (result.ok) {
        setReturnReason("");
        setReturnArmed(false);
        setActionNotice({ tone: "ok", text: `${product.id} returned for rework — the reason is recorded.` });
      }
      return result;
    });
  }, [run, product, actor, returnReason]);

  const publish = useCallback(() => run("publish", () => {
    const result = publishProduct(product.id, actor);
    if (result.ok && !result.alreadyPublished) {
      setActionNotice({ tone: "ok", text: `${product.id} published to the storefront.` });
    } else if (result.ok) {
      setActionNotice({ tone: "ok", text: `${product.id} is already published.` });
    }
    return result;
  }), [run, product, actor]);

  const submit = useCallback(() => run("submit", () => {
    const result = submitProductForReview(product.id, actor);
    if (result.ok) setActionNotice({ tone: "ok", text: `${product.id} submitted for review.` });
    return result;
  }), [run, product, actor]);

  const archive = useCallback(() => run("archive", () => {
    const result = archiveProduct(product.id, actor);
    if (result.ok && !result.alreadyArchived) setActionNotice({ tone: "ok", text: `${product.id} archived.` });
    return result;
  }), [run, product, actor]);

  const assign = useCallback((employeeId) => run("assign", () => {
    const result = assignProductToEmployee(product.id, employeeId || null, actor);
    if (result.ok) {
      setActionNotice({
        tone: "ok",
        text: employeeId ? `${product.id} assigned to ${employeeId}.` : `${product.id} unassigned.`,
      });
    }
    return result;
  }), [run, product, actor]);

  if (!product) {
    return <p className="py-8 text-center font-ui text-sm text-taupe">Product not found in the register.</p>;
  }

  const stage = state.stage;
  const canSubmit = isEditableStage(stage);
  const canApprove = isApprovableStage(stage);
  const canReturn = [WORKFLOW_STAGES.SUBMITTED, WORKFLOW_STAGES.IN_ADMIN_REVIEW, WORKFLOW_STAGES.APPROVED].includes(stage);
  const canPublish = stage === WORKFLOW_STAGES.APPROVED;
  const canArchive = stage !== WORKFLOW_STAGES.PUBLISHED && stage !== WORKFLOW_STAGES.ARCHIVED;
  const employees = eligibleEmployees();

  const primaryFile = mediaSet?.primary ? mediaFileName(mediaSet.primary) : null;

  return (
    <div className="space-y-4">
      {/* Header ------------------------------------------------------ */}
      <div className="flex flex-wrap items-start justify-between gap-3 border border-mist bg-canvas px-4 py-3">
        <div className="min-w-0">
          <p className="font-ui text-[10px] uppercase tracking-[.24em] text-accent">Product ID · {product.id}</p>
          <p className="truncate font-display text-2xl font-light text-ink">
            {product.name?.trim() || <span className="text-taupe">[Not yet defined]</span>}
          </p>
          <p className="mt-1 font-ui text-[11px] text-taupe">
            {categoryLabels[product.category] ?? product.category ?? "Uncategorised"}
            {product.subcategory ? ` · ${product.subcategory}` : ""} · SKU {product.sku || "—"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge label={state.label ?? state.stage ?? "Unknown"} tone={statusTone[product.status] ?? "quiet"} />
          {state.returned ? <StatusBadge label="Returned" tone="danger" /> : null}
          <Link to={`/admin/products/${product.id}`} className="font-ui text-[11px] text-accent underline-offset-2 hover:underline">
            Open full record →
          </Link>
        </div>
      </div>

      {/* ONE canonical action bar ------------------------------------ */}
      <div className="border border-mist bg-canvas px-4 py-3">
        <p className={labelClass}>Review actions — canonical workflow commands</p>
        <div className="flex flex-wrap items-center gap-2">
          {canSubmit ? (
            <button type="button" disabled={busy !== null} onClick={submit} className={`inline-flex items-center gap-1.5 border border-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-ink transition-colors hover:bg-ink hover:text-ivory ${busy ? "opacity-40" : ""}`}>
              <ArrowRight size={11} aria-hidden="true" /> {busy === "submit" ? "Submitting…" : "Submit for review"}
            </button>
          ) : null}
          {canApprove ? (
            <button type="button" disabled={busy !== null} onClick={approve} className={`inline-flex items-center gap-1.5 border border-accent px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent transition-colors hover:bg-accent hover:text-ivory ${busy ? "opacity-40" : ""}`}>
              <Check size={11} aria-hidden="true" /> {busy === "approve" ? "Approving…" : "Approve"}
            </button>
          ) : null}
          {canPublish ? (
            <button type="button" disabled={busy !== null} onClick={publish} className={`inline-flex items-center gap-1.5 border border-ink bg-ink px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-ivory transition-colors hover:bg-transparent hover:text-ink ${busy ? "opacity-40" : ""}`}>
              <PackageCheck size={11} aria-hidden="true" /> {busy === "publish" ? "Publishing…" : "Publish"}
            </button>
          ) : null}
          {canReturn ? (
            <button type="button" disabled={busy !== null} onClick={() => setReturnArmed((value) => !value)} className={`inline-flex items-center gap-1.5 border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe transition-colors hover:border-accent hover:text-accent ${busy ? "opacity-40" : ""}`}>
              <Undo2 size={11} aria-hidden="true" /> {busy === "return" ? "Returning…" : "Return to employee"}
            </button>
          ) : null}
          {canArchive ? (
            <button type="button" disabled={busy !== null} onClick={archive} className={`inline-flex items-center gap-1.5 border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-taupe transition-colors hover:border-accent hover:text-accent ${busy ? "opacity-40" : ""}`}>
              <Archive size={11} aria-hidden="true" /> {busy === "archive" ? "Archiving…" : "Archive"}
            </button>
          ) : null}
          {!canSubmit && !canApprove && !canPublish && !canReturn && !canArchive ? (
            <p className="font-ui text-[11px] text-taupe">No lifecycle action is available at the {state.label} stage.</p>
          ) : null}
        </div>
        {actionNotice ? (
          <p
            role="status"
            aria-live="polite"
            className={`mt-3 border px-3 py-2 font-ui text-[11px] leading-relaxed ${actionNotice.tone === "warn" ? "border-accent/60 bg-accent/5 text-accent" : "border-mist bg-ivory/60 text-ink"}`}
          >
            {actionNotice.text}
          </p>
        ) : null}
        <p className="mt-2 font-ui text-[10px] text-taupe">
          Approve ≠ Publish — approval records the Admin decision only; publishing is a separate
          canonical command that re-runs the full validation.
        </p>
        {returnArmed && canReturn ? (
          <form
            className="mt-3 space-y-2 border-t border-mist pt-3"
            onSubmit={(event) => { event.preventDefault(); doReturn(); }}
          >
            <label htmlFor={`return-reason-${product.id}`} className={labelClass}>Return reason — required</label>
            <textarea
              id={`return-reason-${product.id}`}
              rows={2}
              value={returnReason}
              onChange={(event) => setReturnReason(event.target.value)}
              placeholder="Missing product details. Incorrect price. Poor product image…"
              className="w-full border border-mist bg-canvas px-3 py-2 font-ui text-sm outline-none focus:border-accent"
            />
            <button
              type="submit"
              disabled={!returnReason.trim() || busy !== null}
              className={`border border-accent px-4 py-2 font-ui text-[10px] uppercase tracking-[.16em] text-accent transition-colors hover:bg-accent hover:text-ivory disabled:opacity-40`}
            >
              {busy === "return" ? "Returning…" : "Confirm return"}
            </button>
          </form>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* IDENTITY --------------------------------------------------- */}
        <Section title="Identity" eyebrow="Section 1">
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className={labelClass}>Product ID</dt><dd className={valueClass}>{product.id}</dd></div>
            <div><dt className={labelClass}>SKU</dt><dd className={valueClass}>{product.sku || "—"}</dd></div>
            <div className="col-span-2"><dt className={labelClass}>Name</dt><dd className={valueClass}>{product.name?.trim() || "—"}</dd></div>
            <div><dt className={labelClass}>Category</dt><dd className={valueClass}>{categoryLabels[product.category] ?? product.category ?? "—"}</dd></div>
            <div><dt className={labelClass}>Subcategory</dt><dd className={valueClass}>{product.subcategory || "—"}</dd></div>
          </dl>
        </Section>

        {/* MEDIA ------------------------------------------------------- */}
        <Section title="Media" eyebrow="Section 2">
          <div className="flex flex-wrap items-start gap-3">
            <div className="w-24 shrink-0">
              <p className={labelClass}>Primary</p>
              <div className="aspect-[4/5] w-full overflow-hidden border border-mist bg-ivory">
                {mediaSet?.primary?.src ? (
                  <img src={mediaSet.primary.src} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full items-center justify-center px-1 text-center font-ui text-[9px] uppercase tracking-[.1em] text-taupe">No primary</span>
                )}
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-ui text-[11px] text-taupe">
                Gallery: {mediaSet?.gallery?.length ?? 0} asset{(mediaSet?.gallery?.length ?? 0) === 1 ? "" : "s"}
                {mediaSet?.hover ? ` · hover: ${mediaFileName(mediaSet.hover) || mediaSet.hover.src}` : ""}
              </p>
              {mediaSet?.gallery?.length ? (
                <ul className="flex flex-wrap gap-1.5">
                  {mediaSet.gallery.slice(0, 6).map((item) => (
                    <li key={item.id ?? item.src} className="h-12 w-10 overflow-hidden border border-mist bg-ivory">
                      {item.src ? <img src={item.src} alt="" loading="lazy" className="h-full w-full object-cover" /> : null}
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="font-ui text-[11px] text-taupe">
                Ownership:{" "}
                {conflicts.length
                  ? `media owned elsewhere — ${[...new Set(conflicts.map((conflict) => conflict.ownerProductId))].filter(Boolean).join(", ") || "unknown"}`
                  : mediaSet?.primary
                    ? "owned by this product"
                    : "no media assigned"}
              </p>
              {blockingIssues.filter((issue) => issue.section === "media").length ? (
                <ul className="list-disc pl-4 font-ui text-[11px] text-accent">
                  {blockingIssues.filter((issue) => issue.section === "media").map((issue) => (
                    <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              ) : null}
              <p className="font-ui text-[10px] text-taupe">
                Media assignment and transfer stay in Media Management — they always move through the
                canonical media ownership service, never from this review desk.
              </p>
            </div>
          </div>
        </Section>

        {/* PRODUCT INFORMATION ------------------------------------------ */}
        <Section title="Product information" eyebrow="Section 3">
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className={labelClass}>Selling price</dt><dd className={valueClass}>{formatINR(pricing.finalPrice || product.price || 0)}</dd></div>
            <div><dt className={labelClass}>Compare-at / MRP</dt><dd className={valueClass}>{(product.compareAtPrice ?? pricing.mrp ?? 0) > 0 ? formatINR(product.compareAtPrice ?? pricing.mrp) : "—"}</dd></div>
            <div className="col-span-2"><dt className={labelClass}>Description</dt><dd className="font-ui text-[12px] leading-relaxed text-ink/80">{product.description?.trim() || product.shortDescription?.trim() || "—"}</dd></div>
            <div><dt className={labelClass}>Taxonomy</dt><dd className={valueClass}>{validation && !blockingIssues.some((issue) => issue.section === "taxonomy") ? "Valid" : "Review required"}</dd></div>
            <div><dt className={labelClass}>Grouping</dt><dd className={valueClass}>{blockingIssues.some((issue) => issue.section === "grouping") ? "Unresolved group decision" : "No unresolved groups"}</dd></div>
            <div className="col-span-2"><dt className={labelClass}>Mapping</dt><dd className="font-ui text-[12px] text-ink/80">{(product.mediaIds ?? []).length} claimed media id{(product.mediaIds ?? []).length === 1 ? "" : "s"} · primary {product.primaryMediaId || "—"}</dd></div>
          </dl>
        </Section>

        {/* WORKFLOW ------------------------------------------------------ */}
        <Section title="Workflow" eyebrow="Section 4">
          <dl className="grid grid-cols-2 gap-3">
            <div><dt className={labelClass}>Canonical stage</dt><dd className={valueClass}>{state.label ?? "—"}</dd></div>
            <div><dt className={labelClass}>Persisted status</dt><dd className={valueClass}>{product.status ?? "—"}</dd></div>
            <div><dt className={labelClass}>Submitted</dt><dd className="font-ui text-[12px] text-ink/80">{product.review?.submittedAt ? `${product.review?.submittedBy ?? "—"} · ${formatEmployeeDateTime(product.review.submittedAt)}` : "Not submitted"}</dd></div>
            <div><dt className={labelClass}>Approval</dt><dd className="font-ui text-[12px] text-ink/80">{product.review?.state === "APPROVED" ? `Approved by ${product.review?.reviewedBy ?? "—"}${product.review?.reviewedAt ? ` · ${formatEmployeeDateTime(product.review.reviewedAt)}` : ""}` : product.review?.state === "REJECTED" ? `Returned by ${product.review?.reviewedBy ?? "—"}` : "Pending"}</dd></div>
            <div><dt className={labelClass}>Publication</dt><dd className={valueClass}>{product.status === "PUBLISHED" ? "Live on the storefront" : "Not published"}</dd></div>
            <div><dt className={labelClass}>Assigned employee</dt>
              <dd>
                <select
                  aria-label={`Assigned employee for ${product.id}`}
                  value={product.assignedEmployeeId ?? ""}
                  onChange={(event) => assign(event.target.value)}
                  disabled={busy !== null}
                  className="border border-mist bg-canvas px-2 py-1 font-ui text-[11px] outline-none focus:border-accent disabled:opacity-40"
                >
                  <option value="">— Unassigned —</option>
                  {employees.map((employee) => (
                    <option key={employee.employeeId} value={employee.employeeId}>
                      {employeeFullName(employee)} · {employee.employeeId}
                    </option>
                  ))}
                </select>
              </dd>
            </div>
            {state.returned && state.rejectionReason ? (
              <div className="col-span-2"><dt className={labelClass}>Return reason</dt><dd className="font-ui text-[12px] text-accent">{state.rejectionReason}</dd></div>
            ) : null}
          </dl>
        </Section>
      </div>

      {/* REVIEW FLAGS -------------------------------------------------- */}
      <Section title="Review flags & publish blockers" eyebrow="Section 5">
        {reviewFlags.length === 0 && blockingIssues.length === 0 ? (
          <p className="font-ui text-sm text-taupe">No open review flags and no blocking validation issues.</p>
        ) : (
          <div className="space-y-3">
            {reviewFlags.length ? (
              <ul className="space-y-2">
                {reviewFlags.map((flag) => {
                  const blocking = PUBLISH_BLOCKING_FLAGS.has(flag);
                  const matched = flagIssues.find((issue) => issue.message.includes(reviewFlagLabel(flag)) || issue.message.includes(flag));
                  return (
                    <li key={flag} className="border border-mist bg-ivory/60 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <StatusBadge label={reviewFlagLabel(flag)} tone={blocking ? "danger" : "quiet"} />
                        {!blocking ? <span className="font-ui text-[10px] text-taupe">informational — does not block publishing</span> : null}
                      </div>
                      <dl className="mt-1.5 grid gap-1 font-ui text-[11px] text-ink/80">
                        <div><dt className="inline font-medium">What: </dt><dd className="inline">{reviewFlagLabel(flag)}.</dd></div>
                        <div><dt className="inline font-medium">Why: </dt><dd className="inline">{matched?.message ?? DEFAULT_FLAG_WHY}</dd></div>
                        <div><dt className="inline font-medium">Where: </dt><dd className="inline">{FLAG_FIX_HINTS[flag] ?? "Resolve it on the product record through the canonical surfaces."}</dd></div>
                      </dl>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {blockingIssues.length ? (
              <div>
                <p className={labelClass}>Publish blockers — canonical validation output</p>
                <ul className="list-disc pl-4 font-ui text-[11px] text-accent">
                  {blockingIssues.map((issue) => (
                    <li key={`${issue.code}-${issue.message}`}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        )}
      </Section>

      {/* EDITING DESK — conditional, canonical edit surface ------------- */}
      {isEditableStage(stage) ? (
        <div>
          <p className="mb-2 font-ui text-[10px] uppercase tracking-[.18em] text-taupe">Editing desk — admin edits route through the canonical draft writer</p>
          <ProductDraftReviewPanel product={product} actor={actor} onNotice={onNotice} hideLifecycleActions />
        </div>
      ) : (
        <p className="font-ui text-[11px] text-taupe">
          Editing is available at the draft stages (Draft / Assigned / Employee review). At the
          {` ${state.label} `}stage the record is read-only here — return it to an editable stage to edit.
        </p>
      )}
    </div>
  );
}
