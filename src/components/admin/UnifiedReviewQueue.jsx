/**
 * PRATIKSHYA FASHON — Unified Review Queue (Phase 3D).
 *
 * The ONE queue over the ONE product lifecycle. Every product in the
 * canonical register appears here exactly once. Every canonical department
 * is represented in the same queue.
 *
 *   catalogue → workflow projection → review query → unified review queue
 *
 * The queue is a memoized projection of `catalogRepository` — there is no
 * second register and nothing here writes. Filters cover only facts the
 * canonical data already carries: workflow stage, department, category,
 * assignment, review flags, media readiness, taxonomy / price / name /
 * grouping validity and missing information.
 *
 * Workflow-aware bulk selection:
 *   · Select All respects the complete current filtered result
 *   · Selection identity is the stable Product ID
 *   · mixed selections expose separate Submit / Approve / Publish actions
 *   · every action delegates each ID to the canonical individual command;
 *     blockers keep their exact validator messages and never change stage
 *
 * PERFORMANCE OPTIMIZATION:
 *   · rows come from the cached unified projection — rebuilt once per
 *     catalogue change, never once per render
 *   · filtering is one memoized pass; counts are one memoized pass
 *   · paginated rendering (first 25, load more)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
import { WORKFLOW_STAGE_LABELS } from "../../services/workflow/productWorkflowState";
import { validateProductForPublish } from "../../services/workflow/productPublishValidator";
import { reviewFlagLabel } from "../../services/productReviewFlags";
import {
  bulkApproveProducts,
  bulkPublishProducts,
  bulkSubmitProducts,
} from "../../services/productWorkflow";
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

export const BULK_WORKFLOW_ACTIONS = Object.freeze({
  submit: Object.freeze({
    id: "submit",
    label: "Submit",
    pastLabel: "Submitted",
    noun: "submission",
    sourceStages: Object.freeze([WORKFLOW_STAGES.DRAFT]),
  }),
  approve: Object.freeze({
    id: "approve",
    label: "Approve",
    pastLabel: "Approved",
    noun: "approval",
    sourceStages: Object.freeze([WORKFLOW_STAGES.SUBMITTED]),
  }),
  publish: Object.freeze({
    id: "publish",
    label: "Publish",
    pastLabel: "Published",
    noun: "publication",
    sourceStages: Object.freeze([WORKFLOW_STAGES.APPROVED]),
  }),
});

const ACTION_ORDER = ["submit", "approve", "publish"];
const actionFor = (actionId) => BULK_WORKFLOW_ACTIONS[actionId] ?? null;
const rowMatchesAction = (row, action) => Boolean(action?.sourceStages.includes(row?.stage));
const uniqueMessages = (messages = []) => [
  ...new Set(messages.map((message) => String(message || "").trim()).filter(Boolean)),
];

const wrongStageMessage = (row, action) => {
  if (action.id === "submit") {
    if (row.stage === WORKFLOW_STAGES.PUBLISHED) return "This product is already published.";
    if (row.stage === WORKFLOW_STAGES.ARCHIVED) return "Archived products cannot be submitted.";
    return `Products in the ${String(row.stageLabel ?? row.stage).toLowerCase()} stage cannot be submitted for review.`;
  }
  if (action.id === "approve") {
    return `Only submitted products can be approved (current stage: ${row.stageLabel ?? row.stage}).`;
  }
  return `Admin review incomplete — approve ${row.productId} before publishing (DRAFT → SUBMITTED → APPROVED → PUBLISHED).`;
};

/**
 * Action-specific preview. It invokes the canonical validator instead of
 * duplicating MRP, selling-price, description, media, taxonomy, grouping,
 * review-flag, category, or other business rules in the UI.
 */
export const previewBulkEligibility = (rows = [], actionId) => {
  const action = actionFor(actionId);
  if (!action) return { action: null, selected: [], ready: [], blocked: [] };
  const selected = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const ready = [];
  const blocked = [];

  selected.forEach((row) => {
    if (!rowMatchesAction(row, action)) {
      blocked.push({
        productId: row.productId,
        name: row.name,
        reasons: [wrongStageMessage(row, action)],
        issues: [],
      });
      return;
    }
    const validation = validateProductForPublish(row.product);
    if (validation.ok) {
      ready.push(row);
      return;
    }
    blocked.push({
      productId: row.productId,
      name: row.name,
      reasons: uniqueMessages(validation.issues.map((issue) => issue.message)),
      issues: validation.issues,
    });
  });
  return { action, selected, ready, blocked };
};

export const composeSelectedWorkflow = (rows = []) => {
  const counts = new Map();
  rows.forEach((row) => {
    const key = row.stage || "UNKNOWN";
    const current = counts.get(key) ?? {
      stage: key,
      label: row.stageLabel || WORKFLOW_STAGE_LABELS[key] || key,
      count: 0,
    };
    counts.set(key, { ...current, count: current.count + 1 });
  });
  return [...counts.values()];
};

const executeBulkAction = (actionId, ids, actor) => {
  if (actionId === "submit") return bulkSubmitProducts(ids, actor);
  if (actionId === "approve") return bulkApproveProducts(ids, actor);
  if (actionId === "publish") return bulkPublishProducts(ids, actor);
  return { ok: false, error: "Unknown bulk workflow action.", applied: 0, skipped: ids.length };
};

const resultReasons = (entry) =>
  uniqueMessages(entry?.errors?.length ? entry.errors : entry?.error ? [entry.error] : []);

function BulkWorkflowConfirmDialog({ action, preview, busy, onCancel, onConfirm }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (!action || typeof document === "undefined") return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    confirmRef.current?.focus();
    const onKeyDown = (event) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [action, busy, onCancel]);

  if (!action || typeof document === "undefined") return null;
  const readyCount = preview.ready.length;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-ink/55 px-4 py-8 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onCancel();
      }}
    >
      <section
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden border border-champagne/45 bg-canvas shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-workflow-title"
        aria-describedby="bulk-workflow-description"
      >
        <header className="border-b border-mist px-6 py-5">
          <p className="font-ui text-[9px] uppercase tracking-[.22em] text-accent">Workflow confirmation</p>
          <h3 id="bulk-workflow-title" className="mt-1 font-display text-xl text-ink">
            {action.label} selected products
          </h3>
          <p id="bulk-workflow-description" className="mt-2 font-ui text-xs leading-relaxed text-taupe">
            Every Product ID runs through the canonical individual {action.label} command. Blocked products
            remain unchanged and keep the exact validation messages shown below.
          </p>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          <dl className="grid grid-cols-3 gap-3 text-center">
            <div className="border border-mist bg-ivory/50 p-3">
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-taupe">Selected</dt>
              <dd className="mt-1 font-display text-2xl text-ink">{preview.selected.length}</dd>
            </div>
            <div className="border border-ink/20 bg-ivory/50 p-3">
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-ink">
                Ready to {action.label.toLowerCase()}
              </dt>
              <dd className="mt-1 font-display text-2xl text-ink">{readyCount}</dd>
            </div>
            <div className="border border-accent/40 bg-accent/[0.05] p-3">
              <dt className="font-ui text-[9px] uppercase tracking-[.16em] text-accent">Blocked</dt>
              <dd className="mt-1 font-display text-2xl text-accent">{preview.blocked.length}</dd>
            </div>
          </dl>

          {preview.blocked.length ? (
            <div className="mt-5 border border-accent/40 bg-accent/[0.05] px-4 py-3">
              <p className="font-ui text-[10px] uppercase tracking-[.16em] text-accent">
                Blocker details by Product ID
              </p>
              <ul className="mt-3 max-h-72 space-y-3 overflow-y-auto pr-1">
                {preview.blocked.map((entry) => (
                  <li key={entry.productId} className="border-t border-accent/20 pt-2 first:border-0 first:pt-0">
                    <span className="font-ui text-[12px] font-medium text-ink">{entry.productId}</span>
                    {entry.name ? <span className="ml-2 font-ui text-[11px] text-taupe">{entry.name}</span> : null}
                    <ul className="mt-1 list-disc space-y-1 pl-5 font-ui text-[11px] leading-relaxed text-accent">
                      {entry.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="mt-5 border border-mist bg-ivory/50 px-4 py-3 font-ui text-xs text-ink">
              Every selected product is ready for this transition.
            </p>
          )}
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-mist bg-ivory/40 px-6 py-4">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="border border-mist px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-taupe hover:border-ink hover:text-ink disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy || readyCount === 0}
            onClick={onConfirm}
            className="border border-accent bg-accent px-4 py-2 font-ui text-[10px] uppercase tracking-[.14em] text-ivory disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? `${action.label} in progress…` : readyCount ? `${action.label} ${readyCount}` : "No products ready"}
          </button>
        </footer>
      </section>
    </div>,
    document.body
  );
}

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
  const [confirmActionId, setConfirmActionId] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const filtered = useMemo(() => filterUnifiedReviewQueue(rows, filters), [rows, filters]);

  /* Filter changes clear selection so hidden products cannot remain selected
     for a bulk action — the same safety pattern as Product Management. */
  const setQuick = (quick) => {
    setFilters((current) => ({ ...current, quick }));
    setVisible(PAGE_SIZE);
    setSelected([]);
    setConfirmActionId(null);
    setBulkResult(null);
  };
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisible(PAGE_SIZE);
    setSelected([]);
    setConfirmActionId(null);
    setBulkResult(null);
  };

  /* Reconcile by stable Product ID after each transition. Under the ALL
     workflow filter a transitioned product remains selected so its next-stage
     action appears; stage/quick filters remove IDs that are no longer visible. */
  useEffect(() => {
    const present = new Set(filtered.map((row) => String(row.productId)));
    setSelected((current) => {
      const next = current.filter((id) => present.has(String(id)));
      return next.length === current.length ? current : next;
    });
  }, [filtered]);

  const shown = filtered.slice(0, visible);

  const toggleSelect = useCallback((productId) => {
    const id = String(productId);
    setSelected((current) =>
      current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id]
    );
    setConfirmActionId(null);
    setBulkResult(null);
  }, []);

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((row) => selected.includes(String(row.productId)));

  const toggleSelectAll = useCallback(() => {
    setSelected(allVisibleSelected ? [] : filtered.map((row) => String(row.productId)));
    setConfirmActionId(null);
    setBulkResult(null);
  }, [allVisibleSelected, filtered]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    setConfirmActionId(null);
    setBulkResult(null);
  }, []);

  const selectedRows = useMemo(() => {
    const ids = new Set(selected.map(String));
    return rows.filter((row) => ids.has(String(row.productId)));
  }, [rows, selected]);
  const workflowComposition = useMemo(
    () => composeSelectedWorkflow(selectedRows),
    [selectedRows]
  );
  const actionTargets = useMemo(
    () => Object.fromEntries(
      ACTION_ORDER.map((actionId) => {
        const action = actionFor(actionId);
        return [actionId, selectedRows.filter((row) => rowMatchesAction(row, action))];
      })
    ),
    [selectedRows]
  );
  const activeAction = actionFor(confirmActionId);
  const activePreview = useMemo(
    () => previewBulkEligibility(confirmActionId ? actionTargets[confirmActionId] : [], confirmActionId),
    [actionTargets, confirmActionId]
  );

  const openConfirm = useCallback((actionId) => {
    if (!actionTargets[actionId]?.length || bulkBusy) return;
    setBulkResult(null);
    setConfirmActionId(actionId);
  }, [actionTargets, bulkBusy]);

  const runBulkAction = useCallback(() => {
    if (!activeAction || !activePreview.ready.length || bulkBusy) return;
    const action = activeAction;
    /* Every action-specific target is passed to the canonical bulk adapter,
       including preview-blocked IDs. The individual command revalidates each
       one at execution time and returns the authoritative result. */
    const ids = activePreview.selected.map((row) => String(row.productId));
    setBulkBusy(true);
    setConfirmActionId(null);
    setTimeout(() => {
      try {
        const result = executeBulkAction(action.id, ids, actor);
        const entries = Array.isArray(result.results)
          ? result.results
          : ids.map((id) => ({ id, ok: false, errors: [result.error || "Workflow action failed."] }));
        const succeeded = entries.filter((entry) => entry.ok);
        const blocked = entries
          .filter((entry) => !entry.ok)
          .map((entry) => ({ productId: entry.id, reasons: resultReasons(entry) }));
        const summary = {
          action,
          ok: Boolean(result.ok),
          applied: result.applied ?? succeeded.length,
          skipped: result.skipped ?? blocked.length,
          blocked,
          error: result.ok ? null : result.error || `Bulk ${action.noun} could not run.`,
        };
        setBulkResult(summary);
        if (onNotice) {
          onNotice({
            tone: !result.ok || blocked.length ? "warn" : "ok",
            text: result.ok
              ? `${action.label} completed. ${action.pastLabel}: ${summary.applied}. Blocked: ${summary.skipped}.`
              : summary.error,
          });
        }
      } catch (error) {
        const message = error?.message || `Bulk ${action.noun} could not run.`;
        setBulkResult({
          action,
          ok: false,
          applied: 0,
          skipped: ids.length,
          blocked: ids.map((productId) => ({ productId, reasons: [message] })),
          error: message,
        });
        onNotice?.({ tone: "warn", text: message });
      } finally {
        setBulkBusy(false);
      }
    }, 0);
  }, [activeAction, activePreview, actor, bulkBusy, onNotice]);

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

      {/* Workflow-aware bulk toolbar — stable IDs, action-specific groups. */}
      {selected.length ? (
        <div className="mb-5 border border-mist/80 bg-canvas p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="mr-1 font-ui text-[11px] font-medium uppercase tracking-[.16em] text-ink">
              {selected.length} selected{bulkBusy ? " · processing…" : ""}
            </p>
            <span className="font-ui text-[9px] uppercase tracking-[.14em] text-taupe">Workflow</span>
            {workflowComposition.map((entry) => (
              <span
                key={entry.stage}
                className="border border-mist bg-ivory/70 px-2 py-1 font-ui text-[9px] uppercase tracking-[.12em] text-ink"
              >
                {entry.count} {entry.label}
              </span>
            ))}
            <button
              type="button"
              onClick={clearSelection}
              disabled={bulkBusy}
              className="ml-auto font-ui text-[10px] uppercase tracking-[.14em] text-taupe underline-offset-4 hover:text-accent hover:underline disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {ACTION_ORDER.map((actionId) => {
              const action = actionFor(actionId);
              const count = actionTargets[actionId].length;
              if (!count) return null;
              return (
                <button
                  key={actionId}
                  type="button"
                  disabled={bulkBusy}
                  onClick={() => openConfirm(actionId)}
                  aria-label={`${action.label} selected products (${count})`}
                  className="border border-ink px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.14em] text-ink transition-colors hover:bg-ink hover:text-ivory disabled:opacity-40"
                >
                  <Check size={11} className="mr-1 inline" aria-hidden="true" /> {action.label} {count}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Post-run result — exact action, success and blocker breakdown. */}
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
              : `${bulkResult.action.label} completed. ${bulkResult.action.pastLabel}: ${bulkResult.applied} product${bulkResult.applied === 1 ? "" : "s"}${
                  bulkResult.skipped
                    ? `. Blocked: ${bulkResult.skipped} product${bulkResult.skipped === 1 ? "" : "s"}.`
                    : "."
                }`}
          </p>
          {bulkResult.blocked?.length ? (
            <div className="mt-2">
              <p className="font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Blocked products</p>
              <ul className="mt-1 max-h-52 space-y-1.5 overflow-y-auto">
                {bulkResult.blocked.map((entry) => (
                  <li key={entry.productId} className="text-[12px]">
                    <span className="font-medium">{entry.productId}</span>
                    <ul className="list-disc pl-4 text-accent">
                      {(entry.reasons.length ? entry.reasons : ["Workflow action failed."]).map((reason) => (
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

      <BulkWorkflowConfirmDialog
        action={activeAction}
        preview={activePreview}
        busy={bulkBusy}
        onCancel={() => { if (!bulkBusy) setConfirmActionId(null); }}
        onConfirm={runBulkAction}
      />


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
        Bulk Submit, Approve and Publish run the same canonical commands as individual review.
      </p>
    </div>
  );
}
