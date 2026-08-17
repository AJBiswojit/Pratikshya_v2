/**
 * PRATIKSHYA FASHON — Unified Review Queue (Phase 3D).
 *
 * The ONE queue over the ONE product lifecycle. Every product in the
 * canonical register appears here exactly once — Kids products are rows in
 * the same queue (Kids is a category filter, never a separate workflow).
 *
 *   catalogue → workflow projection → review query → unified review queue
 *
 * The queue is a memoized projection of `catalogRepository` — there is no
 * second register and nothing here writes. Filters cover only facts the
 * canonical data already carries: workflow stage, category, assignment,
 * review flags, Kids / non-Kids, media readiness, taxonomy / price / name /
 * grouping validity and missing information.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · rows come from the cached unified projection — rebuilt once per
 *     catalogue change, never once per render
 *   · filtering is one memoized pass; counts are one memoized pass
 *   · paginated rendering (first 25, load more)
 */

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import StatusBadge from "../employee/StatusBadge";
import { useProducts } from "../../hooks/useProducts";
import {
  UNIFIED_QUICK_FILTERS,
  UNIFIED_FILTER_DEFAULTS,
  WORKFLOW_STAGES,
  categoriesInUnifiedQueue,
  countUnifiedQuickFilters,
  filterUnifiedReviewQueue,
  flagsInUnifiedQueue,
  getUnifiedReviewQueue,
} from "../../services/unifiedProductReview";
import { WORKFLOW_STAGE_LABELS } from "../../services/workflow/productWorkflowState";
import { reviewFlagLabel } from "../../services/productReviewFlags";
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

export default function UnifiedReviewQueue({ focusId = null, onSelect, initialQuickFilter = "ALL" }) {
  const items = useProducts(); /* reactivity only — the queue reads the register */

  const rows = useMemo(() => getUnifiedReviewQueue(), [items]);
  const counts = useMemo(() => countUnifiedQuickFilters(rows), [rows]);
  const categories = useMemo(() => categoriesInUnifiedQueue(rows), [rows]);
  const flagsPresent = useMemo(() => flagsInUnifiedQueue(rows), [rows]);

  const [filters, setFilters] = useState({ ...UNIFIED_FILTER_DEFAULTS, quick: initialQuickFilter });
  const [visible, setVisible] = useState(PAGE_SIZE);

  const filtered = useMemo(() => filterUnifiedReviewQueue(rows, filters), [rows, filters]);

  const setQuick = (quick) => {
    setFilters((current) => ({ ...current, quick }));
    setVisible(PAGE_SIZE);
  };
  const setFilter = (key, value) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setVisible(PAGE_SIZE);
  };

  const shown = filtered.slice(0, visible);

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
          <span className="font-ui text-[9px] uppercase tracking-[.18em] text-taupe">Kids / non-Kids</span>
          <select value={filters.kids} onChange={(event) => setFilter("kids", event.target.value)} className={selectClass}>
            <option value="ALL">Everything</option>
            <option value="KIDS">Kids only</option>
            <option value="NON_KIDS">Non-Kids only</option>
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

      {/* The queue ------------------------------------------------------ */}
      {!filtered.length ? (
        <p className="py-10 text-center font-ui text-sm text-taupe">No products match this view. The atelier is in order.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left">
            <thead>
              <tr className="border-b border-mist font-ui text-[10px] uppercase tracking-widest text-taupe">
                {["Product", "Category", "Workflow state", "Assigned", "Review flags", "Media", "Readiness", ""].map((heading, index) => (
                  <th key={heading || `column-${index}`} className="px-3 py-3" scope="col">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.map((row) => (
                <tr
                  key={row.productId}
                  className={`border-b border-mist/60 align-top font-ui text-sm ${focusId === row.productId ? "bg-ivory/70" : ""}`}
                >
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
                    {row.isKids ? <StatusBadge label="Kids" tone="ink" className="mt-1" /> : null}
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
              ))}
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
        One queue over one lifecycle — {rows.length} products, including every Kids product. Kids is
        a category filter here, never a separate review system.
      </p>
    </div>
  );
}
