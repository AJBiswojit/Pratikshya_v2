import { useState } from "react";
import { AtelierButton } from "../../design-system";
import EmployeeField, { employeeInputClass } from "../employee/EmployeeField";
import DataTable from "../employee/DataTable";
import ConfirmDialog from "../orders/ConfirmDialog";
import {
  LEAVE_STATUS,
  LEAVE_TYPE_OPTIONS,
} from "../../config/attendanceConfig";
import { PERMISSIONS } from "../../config/employeePermissions";
import { useEmployeeAuth } from "../../context/EmployeeAuthContext";
import { useWorkforce } from "../../context/WorkforceContext";
import {
  cancelLeave,
  listVisibleLeave,
  myLeave,
  requestLeave,
  reviewLeave,
} from "../../services/workforce/leaveService";
import { formatDateShort, inclusiveDayCount } from "../../services/workforce/dateUtils";
import { getLeaveTypeLabel } from "../../config/attendanceConfig";
import { LeaveStatusBadge } from "./WorkforceBadges";

export function LeaveRequestForm({ actor, onCreated }) {
  const [leaveType, setLeaveType] = useState("CASUAL");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const days = startDate && endDate && endDate >= startDate ? inclusiveDayCount(startDate, endDate) : 0;

  const submit = (event) => {
    event.preventDefault();
    const result = requestLeave({ actor, leaveType, startDate, endDate, reason });
    if (!result.ok) {
      setError(result.message);
      setMessage("");
      return;
    }
    setError("");
    setMessage(result.message);
    setReason("");
    onCreated?.(result.record);
  };

  return (
    <form onSubmit={submit} className="border border-mist/80 bg-surface/40 p-6">
      <h2 className="font-display text-2xl font-light text-ink">Request leave</h2>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <EmployeeField label="Leave type" id="leave-type">
          <select id="leave-type" value={leaveType} onChange={(event) => setLeaveType(event.target.value)} className={employeeInputClass()}>
            {LEAVE_TYPE_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </EmployeeField>
        <EmployeeField label="Days" id="leave-days">
          <input id="leave-days" value={days || "—"} readOnly className={employeeInputClass()} />
        </EmployeeField>
        <EmployeeField label="Start date" id="leave-start" required>
          <input id="leave-start" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className={employeeInputClass()} required />
        </EmployeeField>
        <EmployeeField label="End date" id="leave-end" required>
          <input id="leave-end" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className={employeeInputClass()} required />
        </EmployeeField>
      </div>
      <EmployeeField label="Reason" id="leave-reason" required error={error} className="mt-4">
        <textarea id="leave-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className={employeeInputClass(Boolean(error))} required />
      </EmployeeField>
      {message ? (
        <p className="mt-3 font-ui text-xs text-cocoa" role="status" aria-live="polite">
          {message}
        </p>
      ) : null}
      <div className="mt-5">
        <AtelierButton type="submit" size="chip">
          Submit request
        </AtelierButton>
      </div>
    </form>
  );
}

export function LeaveTable({ rows, actor, showEmployee = false, onChanged }) {
  const { hasPermission } = useEmployeeAuth();
  const [pending, setPending] = useState(null);
  const [rejectNote, setRejectNote] = useState("");
  const [reviewError, setReviewError] = useState("");
  const canReview = hasPermission(PERMISSIONS.LEAVE_APPROVE) || hasPermission(PERMISSIONS.LEAVE_REJECT) || hasPermission(PERMISSIONS.LEAVE_MANAGE);

  const confirm = () => {
    if (!pending) return;
    const result =
      pending.action === "cancel"
        ? cancelLeave({ leaveId: pending.leaveId, actor })
        : reviewLeave({
            leaveId: pending.leaveId,
            actor,
            decision: pending.action === "approve" ? LEAVE_STATUS.APPROVED : LEAVE_STATUS.REJECTED,
            reviewNote: rejectNote,
          });
    if (result && result.ok === false) {
      /* The desk keeps the request open so the reason can be supplied. */
      setReviewError(result.message || "That decision could not be recorded.");
      return;
    }
    setReviewError("");
    setPending(null);
    setRejectNote("");
    onChanged?.();
  };

  return (
    <>
      <DataTable
        rows={rows}
        rowKey="leaveId"
        empty="No leave requests."
        columns={[
          ...(showEmployee ? [{ id: "employeeNameSnapshot", label: "Employee" }] : []),
          { id: "leaveType", label: "Type", render: (row) => getLeaveTypeLabel(row.leaveType) },
          {
            id: "dates",
            label: "Dates",
            render: (row) => `${formatDateShort(row.startDate)} – ${formatDateShort(row.endDate)}`,
          },
          { id: "days", label: "Days" },
          { id: "reason", label: "Reason" },
          { id: "status", label: "Status", render: (row) => <LeaveStatusBadge status={row.status} /> },
          {
            id: "review",
            label: "Review",
            render: (row) =>
              row.reviewNote ? (
                <span className="font-ui text-xs text-taupe">{row.reviewNote}</span>
              ) : (
                "—"
              ),
          },
          {
            id: "actions",
            label: "Actions",
            render: (row) => (
              <div className="flex flex-wrap justify-end gap-x-3 gap-y-1 md:justify-start">
                {row.status === LEAVE_STATUS.PENDING && canReview ? (
                  <>
                    <button type="button" className="font-ui text-[12px] text-brass hover:text-accent" onClick={() => setPending({ action: "approve", leaveId: row.leaveId })}>
                      Approve
                    </button>
                    <button type="button" className="font-ui text-[12px] text-brass hover:text-accent" onClick={() => setPending({ action: "reject", leaveId: row.leaveId })}>
                      Reject
                    </button>
                  </>
                ) : null}
                {row.status === LEAVE_STATUS.PENDING && actor?.employeeId === row.employeeId ? (
                  <button type="button" className="font-ui text-[12px] text-brass hover:text-accent" onClick={() => setPending({ action: "cancel", leaveId: row.leaveId })}>
                    Cancel
                  </button>
                ) : null}
              </div>
            ),
          },
        ]}
      />

      <ConfirmDialog
        isOpen={Boolean(pending)}
        title={
          pending?.action === "approve"
            ? "Approve this leave?"
            : pending?.action === "reject"
              ? "Reject this leave?"
              : "Cancel this request?"
        }
        description={
          pending?.action === "reject"
            ? "A reason is required. The employee will see it on their leave desk."
            : pending?.action === "approve"
              ? "Approved days will read as leave on the attendance register."
              : "The pending request will be withdrawn."
        }
        confirmLabel="Confirm"
        cancelLabel="Keep"
        onConfirm={confirm}
        onCancel={() => {
          setPending(null);
          setReviewError("");
        }}
      />
      {pending?.action === "reject" ? (
        <div className="mt-4">
          <EmployeeField label="Rejection reason" id="leave-reject-note" required error={reviewError}>
            <textarea
              id="leave-reject-note"
              value={rejectNote}
              onChange={(event) => setRejectNote(event.target.value)}
              rows={2}
              className={employeeInputClass(Boolean(reviewError))}
            />
          </EmployeeField>
        </div>
      ) : reviewError ? (
        <p className="mt-3 font-ui text-xs text-accent" role="alert">{reviewError}</p>
      ) : null}
    </>
  );
}

export default function LeavePanel({ employeeId, actor, team = false }) {
  const { revision } = useWorkforce();
  void revision;
  const own = myLeave(employeeId);
  const queue = team ? listVisibleLeave(actor, { status: LEAVE_STATUS.PENDING }) : [];

  return (
    <div className="space-y-8">
      {team && queue.length ? (
        <section>
          <h2 className="mb-3 font-display text-2xl font-light text-ink">Pending approvals</h2>
          <LeaveTable rows={queue} actor={actor} showEmployee onChanged={() => {}} />
        </section>
      ) : null}
      <section>
        <h2 className="mb-3 font-display text-2xl font-light text-ink">Your requests</h2>
        <LeaveTable rows={own} actor={actor} />
      </section>
    </div>
  );
}
