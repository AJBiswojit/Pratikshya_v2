/**
 * PRATIKSHYA FASHON — Media inbox card (Phase 22).
 *
 * One media asset in the admin review desk, exactly the shape the phase
 * specifies: large preview, filename, media id, detected group/view,
 * current assignment, Product ID, status, category and assigned employee —
 * with [Open Product] [Assign] [Review] actions.
 *
 * PERFORMANCE OPTIMIZATION:
 *   · Memoized component, employee list cached via useMemo
 *   · Busy states for immediate feedback on create/assign
 *   · Lazy image loading
 */

import { useMemo, useState, memo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Eye, PackagePlus, UserPlus } from "lucide-react";
import StatusBadge from "../../components/employee/StatusBadge";
import PratikshyaImage from "../../components/PratikshyaImage";
import taxonomyRepository from "../../services/taxonomyRepository";
import { assignProductToEmployee } from "../../services/productWorkflow";
import { employeeFullName } from "../../utils/employee";
import {
  EMPLOYEES_CHANGED_EVENT,
  getActiveAssignmentEmployees,
  getEmployee,
  loadEmployees,
} from "../../services/employees/employeeService";

const statusTone = (row) => {
  if (row.tags.includes("DRAFT")) return "quiet";
  if (row.tags.includes("REVIEW")) return "alert";
  if (row.tags.includes("NEEDS_REVIEW")) return "brass";
  return "ink";
};

const statusLabel = (row) => {
  if (row.tags.includes("DRAFT")) return "DRAFT";
  if (row.tags.includes("REVIEW")) return "REVIEW";
  if (row.tags.includes("NEEDS_REVIEW")) return "NEEDS_REVIEW";
  if (row.tags.includes("UNASSIGNED")) return "UNASSIGNED";
  if (row.tags.includes("CLAIMED_BY_DRAFT")) return "OPEN";
  return row.media.status;
};

// Cache employees list at module level to avoid reloading each card
let cachedEmployees = null;
let cachedEmployeesTime = 0;
if (typeof window !== "undefined") {
  window.addEventListener(EMPLOYEES_CHANGED_EVENT, () => {
    cachedEmployees = null;
    cachedEmployeesTime = 0;
  });
}
const getAssignableEmployees = () => {
  const now = Date.now();
  if (cachedEmployees && now - cachedEmployeesTime < 5000) return cachedEmployees;
  try {
    const list = getActiveAssignmentEmployees(loadEmployees());
    cachedEmployees = list;
    cachedEmployeesTime = now;
    return list;
  } catch {
    return [];
  }
};

function MediaInboxCardComponent({ row, actor, onNotice }) {
  const { media } = row;
  const [assigning, setAssigning] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [assignTarget, setAssignTarget] = useState(null);
  const [busy, setBusy] = useState(null);

  const categoryLabel = useMemo(() => row.categoryId ? taxonomyRepository.getCategoryLabel(row.categoryId) : null, [row.categoryId]);

  const draftClaim = row.claimedByDrafts[0] ?? null;
  const owner = row.ownerProduct;
  const viewLabel = useMemo(() => media.view
    ? `${media.groupKey || "media"} · ${media.view}`
    : row.isStandalone
      ? "Standalone"
      : media.groupKey || "Standalone", [media.view, media.groupKey, row.isStandalone]);

  const assignedDisplay = useMemo(() => {
    if (row.assignedEmployeeName) return row.assignedEmployeeName;
    const target = draftClaim ?? owner;
    if (!target?.assignedEmployeeId) return "—";
    try {
      const employee = getEmployee(loadEmployees(), target.assignedEmployeeId);
      return employee ? employeeFullName(employee) : target.assignedEmployeeId;
    } catch { return target.assignedEmployeeId; }
  }, [row.assignedEmployeeName, draftClaim, owner]);

  const assignTo = useCallback((target) => {
    if (!target?.assignedEmployeeId || busy) return;
    setBusy("assign");
    setTimeout(() => {
      const result = assignProductToEmployee(target.id, target.assignedEmployeeId, actor);
      if (result.ok) {
        onNotice?.({
          tone: "ok",
          text: `Assigned ${target.id} to ${getEmployee(loadEmployees(), target.assignedEmployeeId)?.firstName ?? target.assignedEmployeeId}.`,
        });
      } else {
        onNotice?.({ tone: "warn", text: result.error });
      }
      setBusy(null);
      setAssigning(false);
    }, 0);
  }, [busy, actor, onNotice]);

  const targetProduct = draftClaim ?? owner;
  const employees = useMemo(() => getAssignableEmployees(), []);

  return (
    <article className="flex flex-col border border-mist bg-canvas">
      <div className="relative aspect-[4/5] w-full overflow-hidden bg-ivory">
        <PratikshyaImage
          image={{ src: media.url || media.thumbnail || media.optimizedPath || "" }}
          category={row.categoryId ?? "default"}
          alt={media.alt || media.title || "Media preview"}
          className="h-full w-full object-cover"
          loading="lazy"
        />
        <span className="absolute left-2 top-2">
          <StatusBadge label={statusLabel(row)} tone={statusTone(row)} />
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1.5 border-t border-mist px-3 py-3 font-ui text-[11px]">
        <p className="truncate font-medium text-ink">{media.currentFilename || media.fileName || media.id}</p>
        <p className="text-taupe">Media ID: <span className="text-ink/80">{media.id}</span></p>
        <p className="text-taupe">View: <span className="text-ink/80">{viewLabel}</span></p>
        <p className="text-taupe">
          Product: {owner ? (<Link to={`/admin/products/${owner.id}`} className="text-ink/80 underline-offset-2 hover:text-accent hover:underline">{owner.id}</Link>) : (<span className="text-ink/80">None</span>)}
          {draftClaim ? (<><span> · </span><span className="text-ink/80">claimed by draft <Link to={`/admin/products/review?draft=${draftClaim.id}`} className="underline-offset-2 hover:text-accent hover:underline">{draftClaim.id}</Link></span></>) : null}
        </p>
        <p className="text-taupe">Category: <span className="text-ink/80">{categoryLabel ?? row.categoryId ?? "—"}</span></p>
        <p className="text-taupe">Assigned: <span className="text-ink/80">{assignedDisplay}</span></p>
      </div>

      <div className="flex flex-wrap gap-1.5 border-t border-mist px-3 py-2.5">
        {targetProduct ? (
          <Link to={`/admin/products/${targetProduct.id}`} className="inline-flex items-center gap-1 border border-ink px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-ink transition-colors hover:bg-ink hover:text-ivory"><Eye size={11} aria-hidden="true" /> Open Product</Link>
        ) : null}
        {!targetProduct ? (
          <Link to="/admin/products/new" className="inline-flex items-center gap-1 border border-accent px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-accent transition-colors hover:bg-accent hover:text-ivory"><PackagePlus size={11} aria-hidden="true" /> Create Product First</Link>
        ) : draftClaim ? (
          <Link to={`/admin/products/review?draft=${draftClaim.id}`} className="inline-flex items-center gap-1 border border-accent px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-accent transition-colors hover:bg-accent hover:text-ivory"><Eye size={11} aria-hidden="true" /> Review</Link>
        ) : null}
        {targetProduct ? (
          <button type="button" onClick={() => setAssigning((value) => !value)} className="inline-flex items-center gap-1 border border-mist px-2.5 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-taupe transition-colors hover:border-ink hover:text-ink"><UserPlus size={11} aria-hidden="true" /> Assign</button>
        ) : null}
      </div>

      {assigning && targetProduct ? (
        <form className="border-t border-mist bg-ivory px-3 py-3" onSubmit={(event) => { event.preventDefault(); assignTo(assignTarget); }}>
          <label htmlFor={`assign-${targetProduct.id}`} className="mb-1 block font-ui text-[10px] uppercase tracking-[.16em] text-taupe">Assign {targetProduct.id} to employee</label>
          <div className="flex gap-2">
            <select id={`assign-${targetProduct.id}`} value={employeeId} onChange={(event) => { const next = event.target.value; setEmployeeId(next); setAssignTarget({ ...targetProduct, assignedEmployeeId: next || null }); }} className="min-w-0 flex-1 border border-mist bg-canvas px-2 py-1.5 font-ui text-xs outline-none focus:border-accent">
              <option value="">— Unassigned —</option>
              {employees.map((employee) => (<option key={employee.id} value={employee.employeeId}>{employeeFullName(employee)} ({employee.employeeId})</option>))}
            </select>
            <button type="submit" disabled={!employeeId || busy === "assign"} className="border border-ink px-3 py-1.5 font-ui text-[10px] uppercase tracking-[.12em] text-ink transition-colors hover:bg-ink hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40">{busy === "assign" ? "Saving…" : "Save"}</button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

export default memo(MediaInboxCardComponent);
