/**
 * PRATIKSHYA FASHON — Leave service.
 *
 * Request, approve, reject, cancel. Approved leave writes LEAVE onto the
 * shared attendance store; it is never stored twice.
 */

import { LEAVE_STATUS, LEAVE_TYPE, getLeaveTypeLabel } from "../../config/attendanceConfig";
import { employeeFullName } from "../../utils/employee";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";
import { getEmployee, loadEmployees } from "../employees/employeeService";
import { inclusiveDayCount, todayKey } from "./dateUtils";
import {
  findLeave,
  leaveForEmployee,
  loadLeave,
  overlappingLeave,
  upsertLeave,
} from "./leaveRepository";
import { applyLeaveToAttendance, clearLeaveFromAttendance } from "./attendanceService";
import {
  actorCanAct,
  actorLabel,
  canCreateLeave,
  canReviewLeave,
  canViewLeave,
  isEmployeeInactiveForOps,
  isInScope,
  teamEmployeeIds,
} from "./scope";

const fail = (message, extras = {}) => ({ ok: false, message, record: null, ...extras });

const noteActivity = (actor, action, targetId, summary) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetEmployeeId: targetId,
      action,
      summary,
    });
  } catch {
    /* Leave record remains the source of truth. */
  }
};

export const listVisibleLeave = (actor, filters = {}) => {
  const employees = loadEmployees();
  const allowed = new Set(teamEmployeeIds(actor, employees));
  const query = String(filters.query || "").trim().toLowerCase();
  return loadLeave()
    .filter((entry) => allowed.has(entry.employeeId))
    .filter((entry) => !filters.status || entry.status === filters.status)
    .filter((entry) => !filters.leaveType || entry.leaveType === filters.leaveType)
    .filter((entry) => !filters.employeeId || entry.employeeId === filters.employeeId)
    .filter((entry) => {
      if (!query) return true;
      return [entry.employeeId, entry.employeeNameSnapshot, entry.reason]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .sort((a, b) => String(b.requestedAt).localeCompare(String(a.requestedAt)));
};

export const requestLeave = ({
  actor,
  employeeId,
  leaveType,
  startDate,
  endDate,
  reason,
} = {}) => {
  if (!canCreateLeave(actor)) return fail("You cannot request leave from this account.");
  const employees = loadEmployees();
  const targetId = employeeId || actor.employeeId;
  const employee = getEmployee(employees, targetId);
  if (!employee) return fail("Employee not found.");
  if (isEmployeeInactiveForOps(employee)) {
    return fail("Suspended or inactive accounts cannot request leave.");
  }
  if (actor.employeeId && actor.employeeId !== employee.employeeId && !canReviewLeave(actor)) {
    return fail("You can only request leave for yourself.");
  }

  const type = Object.values(LEAVE_TYPE).includes(leaveType) ? leaveType : LEAVE_TYPE.OTHER;
  const start = String(startDate || "").trim();
  const end = String(endDate || start).trim();
  const note = String(reason || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    return fail("Choose a start and end date.");
  }
  if (end < start) return fail("The end date cannot be before the start date.");
  if (!note) return fail("Please add a short reason.");

  const clash = overlappingLeave(employee.employeeId, start, end);
  if (clash) {
    return fail(
      clash.status === LEAVE_STATUS.PENDING
        ? "You already have a pending request covering those dates."
        : "Those dates already have an approved leave.",
      { code: "DUPLICATE", record: clash }
    );
  }

  const result = upsertLeave({
    employeeId: employee.employeeId,
    employeeNameSnapshot: employeeFullName(employee),
    leaveType: type,
    startDate: start,
    endDate: end,
    days: inclusiveDayCount(start, end),
    reason: note,
    status: LEAVE_STATUS.PENDING,
    requestedAt: new Date().toISOString(),
  });
  if (!result.ok) return fail(result.message);
  noteActivity(
    actor,
    ACTIVITY_ACTIONS.LEAVE_REQUESTED,
    employee.employeeId,
    `${employeeFullName(employee)} requested ${getLeaveTypeLabel(type)} · ${start} – ${end}`
  );
  return { ok: true, record: result.record, message: "Leave request submitted." };
};

export const reviewLeave = ({ leaveId, decision, reviewNote, actor } = {}) => {
  if (!canReviewLeave(actor)) return fail("You are not allowed to review leave.");
  const record = findLeave(leaveId);
  if (!record) return fail("Leave request not found.");
  const employees = loadEmployees();
  if (!isInScope(actor, record.employeeId, employees) && !canReviewLeave(actor)) {
    return fail("That request is outside your team.");
  }

  const nextStatus = decision === LEAVE_STATUS.REJECTED ? LEAVE_STATUS.REJECTED : LEAVE_STATUS.APPROVED;
  if (record.status === nextStatus) {
    return { ok: true, record, message: "This request has already been decided.", idempotent: true };
  }
  if (record.status !== LEAVE_STATUS.PENDING) {
    return fail("Only pending requests can be reviewed.");
  }
  if (nextStatus === LEAVE_STATUS.REJECTED && !String(reviewNote || "").trim()) {
    return fail("A reason is required when rejecting leave.");
  }

  const result = upsertLeave({
    ...record,
    status: nextStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy: actorLabel(actor),
    reviewNote: String(reviewNote || "").trim(),
  });
  if (!result.ok) return fail(result.message);

  if (nextStatus === LEAVE_STATUS.APPROVED) {
    applyLeaveToAttendance(result.record);
  }

  noteActivity(
    actor,
    nextStatus === LEAVE_STATUS.APPROVED ? ACTIVITY_ACTIONS.LEAVE_APPROVED : ACTIVITY_ACTIONS.LEAVE_REJECTED,
    record.employeeId,
    `${nextStatus === LEAVE_STATUS.APPROVED ? "Approved" : "Rejected"} leave for ${record.employeeNameSnapshot}`
  );
  return {
    ok: true,
    record: result.record,
    message: nextStatus === LEAVE_STATUS.APPROVED ? "Leave approved." : "Leave rejected.",
  };
};

export const cancelLeave = ({ leaveId, actor } = {}) => {
  if (!actorCanAct(actor)) return fail("You cannot cancel leave from this account.");
  const record = findLeave(leaveId);
  if (!record) return fail("Leave request not found.");
  const self = actor.employeeId && actor.employeeId === record.employeeId;
  if (!self && !canReviewLeave(actor)) return fail("You can only cancel your own request.");
  if (record.status === LEAVE_STATUS.CANCELLED) {
    return { ok: true, record, message: "This request is already cancelled.", idempotent: true };
  }
  if (self && record.status !== LEAVE_STATUS.PENDING) {
    return fail("Only a pending request can be cancelled from your desk.");
  }
  if (record.status === LEAVE_STATUS.REJECTED) return fail("A rejected request cannot be cancelled.");

  const result = upsertLeave({
    ...record,
    status: LEAVE_STATUS.CANCELLED,
    reviewedAt: new Date().toISOString(),
    reviewedBy: actorLabel(actor),
    reviewNote: record.reviewNote,
  });
  if (!result.ok) return fail(result.message);
  if (record.status === LEAVE_STATUS.APPROVED) {
    clearLeaveFromAttendance(record);
  }
  return { ok: true, record: result.record, message: "Leave request cancelled." };
};

export const myLeave = (employeeId) => leaveForEmployee(employeeId);

export const pendingLeaveCount = (actor) =>
  listVisibleLeave(actor, { status: LEAVE_STATUS.PENDING }).length;

export { canViewLeave, LEAVE_STATUS, todayKey };

export default {
  listVisibleLeave,
  requestLeave,
  reviewLeave,
  cancelLeave,
  myLeave,
  pendingLeaveCount,
};
