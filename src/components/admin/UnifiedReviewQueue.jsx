/**
 * PRATIKSHYA FASHON — Unified Review Queue (Phase 3D).
 *
 * The ONE queue over the ONE product lifecycle. Every product in the
 * canonical register appears here exactly once. All departments (Women,
 * Bridal, Men, Kids) are rows in the same queue with the same treatment.
 *
 *   catalogue → workflow projection → review query → unified review queue
 *
 * The queue is a memoized projection of `catalogRepository` — there is no
 * second register and nothing here writes. Filters cover only facts the
 * canonical data already carries: workflow stage, department, category,
 * assignment, review flags, media readiness, taxonomy / price / name /
 * grouping validity and missing information.
 *
 * Bulk selection + bulk approve:
 *   · Select All respects the current filtered result (never hidden rows)
 *   · Selection identity is the stable Product ID
 *   · Filter changes clear selection (matches Product Management safety)
 *   · APPROVE SELECTED runs the canonical bulkApprove command, which calls
 *     approveProduct per id — the exact same validation / workflow rules as
 *     individual REVIEW → APPROVE. Blocked products keep their real reasons.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · rows come from the cached unified projection — rebuilt once per
 *     catalogue change, never once per render
 *   · filtering is one memoized pass; counts are one memoized pass
 *   · paginated rendering (first 25, load more)
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, Search } from "lucide-react";
import StatusBadge from "../employee/StatusBadge";
import { useProducts } from "../../hooks/useProducts";
import {
  UNIFIED_QUICK_FILTERS,
  UNIFIED_FILTER_DEFAULTS,
  WORKFLOW_STAGES,
  categoriesInUnifiedQueue,
  countUnifiedQuickFilters,
  departmentsInUnifiedQueue,
  filterUnifiedReviewQueue,
  flagsInUnifiedQueue,
  getUnifiedReviewQueue,
} from "../../services/unifiedProductReview";
import {
  WORKFLOW_STAGE_LABELS,
  isApprovableStage,
} from "../../services/workflow/productWorkflowState";
import { reviewFlagLabel } from "../../services/productReviewFlags";
import { bulkApproveProducts } from "../../services/productWorkflow";
import { categoryLabels } from "../../data/products/taxonomy";

const PAGE_SIZE = 25;

const chipClass = (active) =>
  `px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] transition-colors ${
    active ? "bg-ink text-ivory" : "text-taupe hover:bg-mist/60 hover:text-ink"
  }`;

const selectClass =
  "border border-mist bg-canvas px-2 py-1.5 font-ui text-[11px] outline-none focus:border-accent";

const stageTone = {
  PUBLISHED: "ink",
  APPROVED: "ink",
  SUBMITTED: "alert",
  IN_ADMIN_REVIEW: "alert",
  ARCHIVED: "muted",
};

/**
 * Preview eligibility using the same facts the queue already carries.
 * The bulk command still re-runs approveProduct (full validation) per id —
 * this preview only powers the confirmation dialog so the admin sees
 * ready vs blocked before confirming.
 */
const previewBulkEligibility = (rows, selectedIds) => {
  const selected = selectedIds
    .map((id) => rows.find((row) => String(row.productId) === String(id)))
    .filter(Boolean);
  const ready = [];
  const blocked = [];
  selected.forEach((row) => {
    /* Matches approveProduct: already APPROVED / PUBLISHED succeed as no-ops. */
    if (
      row.canApprove ||
      row.stage === WORKFLOW_STAGES.APPROVED ||
      row.stage === WORKFLOW_STAGES.PUBLISHED
    ) {
      ready.push(row);
      return;
    }
    const reasons = [];
    /* Stage blocks only when the product is not in an approvable stage —
       same wording as approveProduct. Validation blockers keep their own
       canonical messages (MRP, description, media, …). */
    if (!isApprovableStage(row.stage)) {
      reasons.push(`Only submitted products can be approved (current stage: ${row.stageLabel ?? row.stage}).`);
    }
    (row.blockingIssues ?? []).forEach((issue) => {
      if (issue?.message) reasons.push(issue.message);
    });
    if (!reasons.length) {
      reasons.push(`Only submitted products can be approved (current stage: ${row.stageLabel ?? row.stage}).`);
    }
    blocked.push({ productId: row.productId, name: row.name, reasons: [...new Set(reasons)] });
  });
  return { selected, ready, blocked };
};

export default function UnifiedReviewQueue({
  focusId = null,
  onSelect,
  initialQuickFilter = "ALL",
  actor = null,
  onNotice = null,
}) {
  const items = useProducts(); /* reactivity only — the queue reads the register */

  const rows = useMemo(() => getUnifiedReviewQueue(), [items]);
  const counts = useMemo(() => countUnifiedQuickFilters(rows), [rows]);
  const categories = useMemo(() => categoriesInUnifiedQueue(rows), [rows]);
  const departments = useMemo(() => departmentsInUnifiedQueue(rows), [rows]);
  const flagsPresent = useMemo(() => flagsInUnifiedQueue(rows), [rows]);

  const [filters, setFilters] = useState({ ...UNIFIED_FILTER_DEFAULTS, quick: initialQuickFilter });
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [selected, setSelected] = useState([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  const filtered = useMemo(() => filterUnifiedReviewQueue(rows, filters), [rows, filters]);

  /* Filter changes clear selection so hidden products cannot remain selected
     for a bulk action — the same safety pattern as Product Management. */
  const setQuick = (quick) => {
    setFilters((current) => ({ ...current, quick }));
    setVisible(PAGE_SIZE);
    setSelected([]);
    setConfirmOpen(false);
    setBulkResult(null);
  };
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisible(PAGE_SIZE);
    setSelected([]);
    setConfirmOpen(false);
    setBulkResult(null);
  };

  /* Drop selections that no longer exist in the register (after archive/delete). */
  useEffect(() => {
    const present = new Set(rows.map((row) => String(row.productId)));
    setSelected((current) => {
      const next = current.filter((id) => present.has(String(id)));
      return next.length === current.length ? current : next;
    });
  }, [rows]);

  const shown = filtered.slice(0, visible);

  const toggleSelect = useCallback((productId) => {
    const id = String(productId);
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
    setConfirmOpen(false);
    setBulkResult(null);
  }, []);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((row) => selected.includes(String(row.productId)));

  const toggleSelectAll = useCallback(() => {
    setSelected(allVisibleSelected ? [] : filtered.map((row) => String(row.productId)));
    setConfirmOpen(false);
    setBulkResult(null);
  }, [allVisibleSelected, filtered]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    setConfirmOpen(false);
    setBulkResult(null);
  }, []);

  const eligibility = useMemo(
    () => previewBulkEligibility(filtered, selected),
    [filtered, selected]
  );

  const openConfirm = useCallback(() => {
    if (!selected.length || bulkBusy) return;
    setBulkResult(null);
    setConfirmOpen(true);
  }, [selected, bulkBusy]);

  const runBulkApprove = useCallback(() => {
    if (!selected.length || bulkBusy) return;
    setBulkBusy(true);
    setConfirmOpen(false);
    /* Snapshot the ids now — clear selection after the command finishes so
       the result summary can still reference them. */
    const ids = [...selected];
    setTimeout(() => {
      const result = bulkApproveProducts(ids, actor);
      const approved = (result.results ?? []).filter((entry) => entry.ok);
      const blocked = (result.results ?? []).filter((entry) => !entry.ok);
      const summary = {
        ok: Boolean(result.ok),
        applied: result.applied ?? approved.length,
        skipped: result.skipped ?? blocked.length,
        approved: approved.map((entry) => entry.id),
        blocked: blocked.map((entry) => ({
          productId: entry.id,
          reasons: entry.errors?.length
            ? entry.errors
            : ["This product could not be approved."],
        })),
        error: result.error ?? null,
      };
      setBulkResult(summary);
      setSelected([]);
      setBulkBusy(false);

      if (onNotice) {
        if (!result.ok) {
          onNotice({ tone: "warn", text: result.error || "Bulk approval could not run." });
        } else if (summary.skipped === 0) {
          onNotice({
            tone: "ok",
            text: `Approval completed. Approved: ${summary.applied} product${summary.applied === 1 ? "" : "s"}.`,
          });
        } else if (summary.applied === 0) {
          onNotice({
            tone: "warn",
            text: `Approval completed. Approved: 0 products. Blocked: ${summary.skipped} product${summary.skipped === 1 ? "" : "s"}. Review the blockers below.`,
          });
        } else {
          onNotice({
            tone: "ok",
            text: `Approval completed. Approved: ${summary.applied} product${summary.applied === 1 ? "" : "s"}. Blocked: ${summary.skipped} product${summary.skipped === 1 ? "" : "s"}.`,
          });
        }
      }
    }, 0);
  }, [selected, bulkBusy, actor, onNotice]);

  return (
    <div>
      {/* Quick lenses -------------------------------------------------- */}
      <div className="mb-4 flex flex-wrap gap-1.5 border-b border-mist pb-4" role="tablist" aria-label="Review queue lenses">
        {UNIFIED_QUICK_FILTERS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            role="tab"
            aria-selected={filters.quick === entry.id}
            onClick={() => setQuick(entry.id)}
            className={chipClass(filters.quick === entry.id)}
          >
            {entry.label} · {counts[entry.id] ?? 0}
          </button>
        ))}
      </div>

      {/* Canonical-data filters ---------------------------------------- */}
      <div className="mb-4 grid gap-2 border-b border-mist pb-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex items-center gap-2 border border-mist bg-canvas px-3 py-2 sm:col-span-2 lg:col-span-4">
          <Search size={13} className="text-taupe" aria-hidden="true" />
          <span className="sr-only">Search the review queue</span>
          <input
            type="search"
            value={filters.query}
            onChange={(event) => setFilter("query", event.target.value)}
            placeholder="Search by Product ID, name, SKU, subcategory or assigned employee…"
            className="w-full bg-transparent font-ui text-sm outline-none"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Workflow state</span>
          <select value={filters.stage} onChange={(event) => setFilter("stage", event.target.value)} className={selectClass}>
            <option value="ALL">All states</option>
            {Object.values(WORKFLOW_STAGES).map((stage) => (
              <option key={stage} value={stage}>{WORKFLOW_STAGE_LABELS[stage]}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Category</span>
          <select value={filters.category} onChange={(event) => setFilter("category", event.target.value)} className={selectClass}>
            <option value="ALL">All categories</option>
            {categories.map((entry) => (
              <option key={entry.id} value={entry.id}>{entry.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Department</span>
          <select value={filters.department} onChange={(event) => setFilter("department", event.target.value)} className={selectClass}>
            <option value="ALL">All departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.label}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Assignment</span>
          <select value={filters.assignment} onChange={(event) => setFilter("assignment", event.target.value)} className={selectClass}>
            <option value="ALL">Any assignment</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNASSIGNED">Unassigned</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Review flags</span>
          <select value={filters.flag} onChange={(event) => setFilter("flag", event.target.value)} className={selectClass}>
            <option value="ALL">Any flag state</option>
            <option value="ANY">Any blocking flag</option>
            {flagsPresent.map((flag) => (
              <option key={flag} value={flag}>{reviewFlagLabel(flag)}</option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Media status</span>
          <select value={filters.media} onChange={(event) => setFilter("media", event.target.value)} className={selectClass}>
            <option value="ALL">Any media state</option>
            <option value="READY">Media valid</option>
            <option value="BLOCKED">Media blocked</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Taxonomy status</span>
          <select value={filters.taxonomy} onChange={(event) => setFilter("taxonomy", event.target.value)} className={selectClass}>
            <option value="ALL">Any taxonomy state</option>
            <option value="VALID">Taxonomy valid</option>
            <option value="INVALID">Taxonomy review required</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Price status</span>
          <select value={filters.price} onChange={(event) => setFilter("price", event.target.value)} className={selectClass}>
            <option value="ALL">Any price state</option>
            <option value="VALID">Price valid</option>
            <option value="INVALID">Price review required</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Name status</span>
          <select value={filters.name} onChange={(event) => setFilter("name", event.target.value)} className={selectClass}>
            <option value="ALL">Any name state</option>
            <option value="VALID">Name valid</option>
            <option value="INVALID">Name review required</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Grouping status</span>
          <select value={filters.grouping} onChange={(event) => setFilter("grouping", event.target.value)} className={selectClass}>
            <option value="ALL">Any grouping state</option>
            <option value="VALID">Grouping resolved</option>
            <option value="INVALID">Grouping unresolved</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Missing information</span>
          <select value={filters.missing} onChange={(event) => setFilter("missing", event.target.value)} className={selectClass}>
            <option value="ALL">Any completeness</option>
            <option value="MISSING">Has blockers</option>
            <option value="COMPLETE">Complete</option>
          </select>
        </label>
      </div>

      {/* Bulk selection toolbar — mirrors Product Management visual language */}
      {selected.length ? (
        <div className="mb-5 flex flex-wrap items-center gap-2 border border-mist/80 bg-canvas p-3">
          <p className="mr-2 font-ui text-[11px] uppercase tracking-[.16em] text-ink font-medium">
            {selected.length} selected{bulkBusy ? " · processing…" : ""}
          </p>
          <button
            type="button"
            disabled={bulkBusy}
            onClick={openConfirm}
            className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink disabled:opacity-40"
          >
            <Check size={11} className="mr-1 inline" aria-hidden="true" /> Approve selected
          </button>
          <button
            type="button"
            onClick={clearSelection}
            disabled={bulkBusy}
            className="ml-auto font-ui text-[10px] uppercase tracking-[.14em] text-taupe underline-offset-4 hover:text-accent hover:underline disabled:opacity-40"
          >
            Clear
          </button>
        </div>
      ) : null}

      {/* Confirmation dialog — ready vs blocked, never force-approve */}
      {confirmOpen && selected.length ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="bulk-approve-title"
          className="mb-5 border border-mist/80 bg-canvas p-4"
        >
          <h3 id="bulk-approve-title" className="font-ui text-[11px] uppercase tracking-[.18em] text-ink">
            Approve selected products
          </h3>
          <dl className="mt-3 grid gap-1 font-ui text-sm text-ink sm:grid-cols-3">
            <div>
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Selected</dt>
              <dd className="font-medium">{eligibility.selected.length}</dd>
            </div>
            <div>
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Ready for approval</dt>
              <dd className="font-medium">{eligibility.ready.length}</dd>
            </div>
            <div>
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Blocked</dt>
              <dd className="font-medium">{eligibility.blocked.length}</dd>
            </div>
          </dl>

          {eligibility.blocked.length ? (
            <div className="mt-3 border border-accent/40 bg-accent/[0.05] px-3 py-3">
              <p className="font-ui text-[11px] text-ink">
                The {eligibility.blocked.length} blocked product{eligibility.blocked.length === 1 ? "" : "s"} will not be approved.
                Review the validation warnings before continuing.
              </p>
              <ul className="mt-2 space-y-2">
                {eligibility.blocked.map((entry) => (
                  <li key={entry.productId} className="font-ui text-[12px] text-cocoa">
                    <span className="font-medium text-ink">{entry.productId}</span>
                    <ul className="mt-0.5 list-disc pl-4 text-accent">
                      {entry.reasons.map((reason) => (
                        <li key={`${entry.productId}-${reason}`}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="mt-3 font-ui text-[10px] text-taupe">
            Each product runs through the same Approve command used by individual review —
            including validation, workflow stage and authorization. Approval never publishes.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe transition-colors hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
            {eligibility.ready.length ? (
              <button
                type="button"
                disabled={bulkBusy}
                onClick={runBulkApprove}
                className="border border-accent px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-accent transition-colors hover:bg-accent hover:text-ivory disabled:opacity-40"
              >
                Approve {eligibility.ready.length} eligible product{eligibility.ready.length === 1 ? "" : "s"}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="border border-mist px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-taupe opacity-40"
              >
                No eligible products
              </button>
            )}
          </div>
        </div>
      ) : null}

      {/* Post-run result — accurate approved / blocked breakdown */}
      {bulkResult ? (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 border px-4 py-3 font-ui text-sm ${
            bulkResult.skipped
              ? "border-accent/60 bg-accent/5 text-ink"
              : "border-mist/80 bg-canvas text-ink"
          }`}
        >
          <p className="font-medium">
            {bulkResult.error
              ? bulkResult.error
              : `Approval completed. Approved: ${bulkResult.applied} product${bulkResult.applied === 1 ? "" : "s"}${
                  bulkResult.skipped
                    ? `. Blocked: ${bulkResult.skipped} product${bulkResult.skipped === 1 ? "" : "s"}.`
                    : "."
                }`}
          </p>
          {bulkResult.blocked?.length ? (
            <div className="mt-2">
              <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Blocked products</p>
              <ul className="mt-1 space-y-1.5">
                {bulkResult.blocked.map((entry) => (
                  <li key={entry.productId} className="text-[12px]">
                    <span className="font-medium">{entry.productId}</span>
                    <ul className="list-disc pl-4 text-accent">
                      {entry.reasons.map((reason) => (
                        <li key={`${entry.productId}-${reason}`}>{reason}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setBulkResult(null)}
            className="mt-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe underline-offset-4 hover:text-accent hover:underline"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      {/* The queue ------------------------------------------------------ */}
      {!filtered.length ? (
        <p className="py-10 text-center font-ui text-sm text-taupe">No products match this view. The atelier is in order.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                <th className="px-3 py-3" scope="col">
                  <input
                    type="checkbox"
                    aria-label="Select all visible products in the review queue"
                    checked={allVisibleSelected}
                    onChange={toggleSelectAll}
                  />
                </th>
                {["Product", "Category", "Workflow state", "Assigned", "Review flags", "Media", "Readiness", ""].map((heading, index) => (
                  <th key={heading || `column-${index}`} className="px-3 py-3" scope="col">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => {
                const productId = String(row.productId);
                const isSelected = selected.includes(productId);
                return (
                  <tr
                    key={row.productId}
                    className={`border-b border-mist/60 align-top font-ui text-sm ${focusId === row.productId ? "bg-ivory/70" : ""}`}
                  >
                    <td className="px-3 py-3 align-top">
                      <input
                        type="checkbox"
                        aria-label={`Select ${row.name?.trim() || row.productId}`}
                        checked={isSelected}
                        onChange={() => toggleSelect(productId)}
                      />
                    </td>
                    <td className="px-3 py-3">
                      <button
                        type="button"
                        onClick={() => onSelect?.(row.productId)}
                        className="text-left underline-offset-4 hover:text-accent hover:underline"
                      >
                        <span className="block font-ui text-[10px] uppercase tracking-[.18em] text-accent">{row.productId}</span>
                        {row.name?.trim() || <span className="text-taupe">[Not yet defined]</span>}
                      </button>
                      {row.returned && row.rejectionReason ? (
                        <p className="mt-0.5 text-[11px] text-accent">Returned: {row.rejectionReason}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3">
                      {categoryLabels[row.category] ?? row.category ?? "—"}
                      {row.subcategory ? <span className="block text-[11px] text-taupe">{row.subcategory}</span> : null}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge label={row.stageLabel ?? row.stage} tone={stageTone[row.stage] ?? "quiet"} />
                    </td>
                    <td className="px-3 py-3 text-[11px] text-taupe">{row.assignedEmployeeName ?? "—"}</td>
                    <td className="px-3 py-3">
                      {row.blockingFlags.length ? (
                        <span className="inline-flex flex-wrap gap-1">
                          {row.blockingFlags.slice(0, 2).map((flag) => (
                            <StatusBadge key={flag} label={reviewFlagLabel(flag)} tone="danger" />
                          ))}
                          {row.blockingFlags.length > 2 ? <StatusBadge label={`+${row.blockingFlags.length - 2}`} tone="danger" /> : null}
                        </span>
                      ) : (
                        <span className="text-[11px] text-taupe">None</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {row.sections.media ? (
                        <StatusBadge label="Media valid" tone="ink" />
                      ) : (
                        <StatusBadge label="Media blocked" tone="danger" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex flex-col gap-1">
                        {row.readyToPublish ? <StatusBadge label="Ready to publish" tone="ink" /> : null}
                        {row.canApprove ? <StatusBadge label="Ready to approve" tone="alert" /> : null}
                        {row.missingInformation && !row.readyToPublish && !row.canApprove ? (
                          <StatusBadge label={`${row.blockingIssues.length} blocker${row.blockingIssues.length === 1 ? "" : "s"}`} tone="quiet" />
                        ) : null}
                        {row.published ? <StatusBadge label="Live" tone="ink" /> : null}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onSelect?.(row.productId)}
                        className="border border-ink px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-ink transition-colors hover:bg-ink hover:text-ivory"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {visible < filtered.length ? (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setVisible((value) => value + PAGE_SIZE)}
            className="border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:border-ink hover:text-ink"
          >
            Load more · {filtered.length - visible} remaining
          </button>
        </div>
      ) : null}

      <p className="mt-4 font-ui text-[10px] leading-relaxed text-taupe">
        One queue over one lifecycle — {rows.length} products. All departments use the same review system.
        Bulk approve runs the same canonical Approve command as individual review.
      </p>
    </div>
  );
}
