/**
 * PRATIKSHYA FASHON — Attendance service.
 *
 * Check-in, check-out, corrections, summaries and reports. Working hours
 * and status rules live here so UI never recomputes them.
 */

import {
  ATTENDANCE_STATUS,
  attendanceCredit,
  getAttendanceStatusLabel,
  isExcludedFromAttendancePercent,
} from "../../config/attendanceConfig";
import { employeeFullName } from "../../utils/employee";
import { getDepartmentLabel, getStoreLabel } from "../../config/employeeDepartments";
import { getRoleLabel } from "../../config/employeeRoles";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";
import { getEmployee, loadEmployees } from "../employees/employeeService";
import { createBlankAttendance, findAttendance, loadAttendance, upsertAttendance } from "./attendanceRepository";
import { approvedLeaveOn, loadLeave } from "./leaveRepository";
import {
  calendarMark,
  eachDateInMonth,
  eachDateInRange,
  endOfIsoWeek,
  endOfMonth,
  formatMinutes,
  isWorkingDay,
  minutesBetween,
  monthKey,
  startOfIsoWeek,
  startOfMonth,
  timeOnDate,
  todayKey,
} from "./dateUtils";
import { resolveEmployeeLocation } from "./location";
import {
  actorCanAct,
  actorLabel,
  canCorrectAttendance,
  canManageAttendance,
  isEmployeeInactiveForOps,
  isInScope,
  teamEmployeeIds,
} from "./scope";
import { loadAttendanceSettings } from "./settings";

const fail = (message, extras = {}) => ({ ok: false, message, record: null, ...extras });

const evaluateTiming = (date, checkInIso, checkOutIso, settings) => {
  const start = timeOnDate(date, settings.workingStartTime);
  const end = timeOnDate(date, settings.workingEndTime);
  const threshold = start
    ? new Date(start.getTime() + settings.lateThresholdMinutes * 60000)
    : null;
  const checkIn = checkInIso ? new Date(checkInIso) : null;
  const checkOut = checkOutIso ? new Date(checkOutIso) : null;

  let lateMinutes = 0;
  if (checkIn && start && threshold && checkIn > threshold) {
    lateMinutes = Math.round((checkIn.getTime() - start.getTime()) / 60000);
  }

  let workMinutes = 0;
  let earlyLeaveMinutes = 0;
  if (checkIn && checkOut) {
    workMinutes = minutesBetween(checkIn.toISOString(), checkOut.toISOString());
    if (end && checkOut < end) {
      earlyLeaveMinutes = Math.round((end.getTime() - checkOut.getTime()) / 60000);
    }
  }

  return { lateMinutes, workMinutes, earlyLeaveMinutes };
};

const statusAfterPunch = ({ date, checkIn, checkOut, settings, onLeave, calendar }) => {
  if (onLeave) return ATTENDANCE_STATUS.LEAVE;
  if (calendar?.status === ATTENDANCE_STATUS.HOLIDAY || calendar?.status === ATTENDANCE_STATUS.WEEK_OFF) {
    return checkIn ? ATTENDANCE_STATUS.ON_DUTY : calendar.status;
  }
  if (!checkIn) return ATTENDANCE_STATUS.NOT_CHECKED_IN;
  const timing = evaluateTiming(date, checkIn, checkOut, settings);
  if (checkOut && timing.workMinutes > 0 && timing.workMinutes < settings.minimumHalfDayMinutes) {
    return ATTENDANCE_STATUS.HALF_DAY;
  }
  if (timing.lateMinutes > 0) return ATTENDANCE_STATUS.LATE;
  return ATTENDANCE_STATUS.PRESENT;
};

const noteActivity = (actor, action, targetId, summary) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      targetEmployeeId: targetId,
      action,
      summary,
    });
  } catch {
    /* The attendance record remains the source of truth. */
  }
};

export const getAttendanceSettings = () => loadAttendanceSettings();

export const hydrateDay = (employee, date, records = loadAttendance(), leaves = loadLeave(), settings = loadAttendanceSettings()) => {
  const stored = findAttendance(employee.employeeId, date, records);
  if (stored) return stored;

  const calendar = calendarMark(date, settings, settings.holidays);
  const leave = approvedLeaveOn(employee.employeeId, date, leaves);
  const today = todayKey();

  if (leave) {
    return createBlankAttendance(employee, date, {
      status: ATTENDANCE_STATUS.LEAVE,
      notes: leave.reason ? `Approved leave. ${leave.reason}` : "Approved leave.",
      locationId: resolveEmployeeLocation(employee).locationId,
    });
  }
  if (calendar) {
    return createBlankAttendance(employee, date, {
      status: calendar.status,
      notes: calendar.label,
      locationId: resolveEmployeeLocation(employee).locationId,
    });
  }
  if (date < today && date >= (employee.joiningDate || date) && isWorkingDay(date, settings, settings.holidays)) {
    return createBlankAttendance(employee, date, {
      status: ATTENDANCE_STATUS.ABSENT,
      locationId: resolveEmployeeLocation(employee).locationId,
    });
  }
  return createBlankAttendance(employee, date, {
    status: ATTENDANCE_STATUS.NOT_CHECKED_IN,
    locationId: resolveEmployeeLocation(employee).locationId,
  });
};

export const getTodayAttendance = (employeeId, date = todayKey()) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return null;
  return hydrateDay(employee, date);
};

export const summarizeRecords = (records = []) => {
  const counts = {
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    halfDay: 0,
    holiday: 0,
    weekOff: 0,
    onDuty: 0,
    pendingCorrection: 0,
    notCheckedIn: 0,
  };
  let credit = 0;
  let eligible = 0;
  let workMinutes = 0;
  let lateMinutes = 0;

  records.forEach((record) => {
    if (record.status === ATTENDANCE_STATUS.PRESENT) counts.present += 1;
    if (record.status === ATTENDANCE_STATUS.LATE) counts.late += 1;
    if (record.status === ATTENDANCE_STATUS.ABSENT) counts.absent += 1;
    if (record.status === ATTENDANCE_STATUS.LEAVE) counts.leave += 1;
    if (record.status === ATTENDANCE_STATUS.HALF_DAY) counts.halfDay += 1;
    if (record.status === ATTENDANCE_STATUS.HOLIDAY) counts.holiday += 1;
    if (record.status === ATTENDANCE_STATUS.WEEK_OFF) counts.weekOff += 1;
    if (record.status === ATTENDANCE_STATUS.ON_DUTY) counts.onDuty += 1;
    if (record.status === ATTENDANCE_STATUS.PENDING_CORRECTION) counts.pendingCorrection += 1;
    if (record.status === ATTENDANCE_STATUS.NOT_CHECKED_IN) counts.notCheckedIn += 1;

    workMinutes += record.workMinutes || 0;
    lateMinutes += record.lateMinutes || 0;

    if (!isExcludedFromAttendancePercent(record.status)) {
      eligible += 1;
      credit += attendanceCredit(record.status);
    }
  });

  const attendancePercent = eligible > 0 ? Math.round((credit / eligible) * 1000) / 10 : null;
  return {
    ...counts,
    workingDays: eligible,
    presentEquivalent: credit,
    attendancePercent,
    workMinutes,
    lateMinutes,
    averageMinutes: eligible > 0 ? Math.round(workMinutes / Math.max(1, counts.present + counts.late + counts.halfDay + counts.onDuty)) : 0,
    hoursLabel: formatMinutes(workMinutes),
  };
};

export const monthRecordsForEmployee = (employeeId, month = monthKey()) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return [];
  const records = loadAttendance();
  const leaves = loadLeave();
  const settings = loadAttendanceSettings();
  const today = todayKey();
  return eachDateInMonth(month)
    .filter((date) => date >= (employee.joiningDate || date) && date <= today)
    .map((date) => hydrateDay(employee, date, records, leaves, settings));
};

export const employeeAttendanceSummary = (employeeId, month = monthKey()) =>
  summarizeRecords(monthRecordsForEmployee(employeeId, month));

export const listVisibleAttendance = (actor, filters = {}) => {
  const employees = loadEmployees();
  const allowed = new Set(teamEmployeeIds(actor, employees));
  const date = filters.date || todayKey();
  const records = loadAttendance();
  const leaves = loadLeave();
  const settings = loadAttendanceSettings();
  const query = String(filters.query || "").trim().toLowerCase();

  return employees
    .filter((person) => allowed.has(person.employeeId))
    .filter((person) => !filters.role || person.role === filters.role)
    .filter((person) => !filters.department || person.department === filters.department)
    .filter((person) => !filters.location || person.store === filters.location)
    .filter((person) => {
      if (!query) return true;
      return [person.employeeId, person.firstName, person.lastName, person.email]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((person) => {
      const record = hydrateDay(person, date, records, leaves, settings);
      return {
        ...record,
        employee: person,
        name: employeeFullName(person),
        roleLabel: getRoleLabel(person.role),
        departmentLabel: getDepartmentLabel(person.department),
        locationLabel: getStoreLabel(person.store),
        hoursLabel: record.workMinutes ? formatMinutes(record.workMinutes) : "—",
      };
    })
    .filter((row) => !filters.status || row.status === filters.status);
};

export const todayHouseSummary = (actor = null) => {
  const employees = loadEmployees();
  const rows = listVisibleAttendance(actor || { adminId: "system", name: "System" }, { date: todayKey() });
  const scoped = actor ? rows : listVisibleAttendance({ adminId: "system" }, { date: todayKey() });
  const summary = summarizeRecords(scoped);
  return {
    ...summary,
    totalEmployees: scoped.length,
    presentToday: summary.present + summary.late + summary.onDuty + summary.halfDay,
    lateToday: summary.late,
    absentToday: summary.absent + summary.notCheckedIn,
    onLeave: summary.leave,
    attendancePercent: summarizeRecords(
      scoped.filter((row) => !isExcludedFromAttendancePercent(row.status) || row.status === ATTENDANCE_STATUS.NOT_CHECKED_IN)
    ).attendancePercent,
    roster: employees.length,
  };
};

export const checkIn = ({ employeeId, actor, at = new Date().toISOString() } = {}) => {
  if (!actorCanAct(actor)) return fail("You cannot check in from this account.");
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId || actor.employeeId);
  if (!employee) return fail("Employee not found.");
  if (isEmployeeInactiveForOps(employee)) {
    return fail("This account cannot check in while it is suspended or inactive.");
  }
  const self = actor.employeeId && actor.employeeId === employee.employeeId;
  if (self && !actorCanAct(actor)) return fail("You cannot check in from this account.");
  if (!self && !canManageAttendance(actor)) {
    return fail("You can only check in for your own desk.");
  }
  if (self && !canViewAttendance(actor, employee.employeeId, employees) && !actor.adminId) {
    /* view is implied by being signed in on the attendance page */
  }

  const date = todayKey(new Date(at));
  const settings = loadAttendanceSettings();
  const existing = findAttendance(employee.employeeId, date);
  if (existing?.checkIn) {
    return fail("You are already checked in for today.", { record: existing, code: "DUPLICATE" });
  }

  const leave = approvedLeaveOn(employee.employeeId, date);
  if (leave) {
    return fail("You are on approved leave today.", { record: existing, code: "ON_LEAVE" });
  }

  const location = resolveEmployeeLocation(employee);
  const calendar = calendarMark(date, settings, settings.holidays);
  const timing = evaluateTiming(date, at, null, settings);
  const status = statusAfterPunch({
    date,
    checkIn: at,
    checkOut: null,
    settings,
    onLeave: false,
    calendar,
  });

  const draft = {
    ...(existing || createBlankAttendance(employee, date)),
    employeeNameSnapshot: employeeFullName(employee),
    checkIn: at,
    checkOut: null,
    status,
    lateMinutes: timing.lateMinutes,
    earlyLeaveMinutes: 0,
    workMinutes: 0,
    locationId: location.locationId,
    notes: existing?.notes || "",
  };

  const result = upsertAttendance(draft);
  if (!result.ok) return fail(result.message);
  noteActivity(
    actor,
    ACTIVITY_ACTIONS.ATTENDANCE_CHECKED_IN,
    employee.employeeId,
    `${employeeFullName(employee)} checked in`
  );
  return {
    ok: true,
    record: result.record,
    lateMinutes: timing.lateMinutes,
    location,
    message:
      timing.lateMinutes > 0
        ? `You checked in ${timing.lateMinutes} minute${timing.lateMinutes === 1 ? "" : "s"} late.`
        : "Checked in.",
  };
};

export const checkOut = ({ employeeId, actor, at = new Date().toISOString() } = {}) => {
  if (!actorCanAct(actor)) return fail("You cannot check out from this account.");
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId || actor.employeeId);
  if (!employee) return fail("Employee not found.");
  if (isEmployeeInactiveForOps(employee)) {
    return fail("This account cannot check out while it is suspended or inactive.");
  }
  const self = actor.employeeId && actor.employeeId === employee.employeeId;
  if (!self && !canManageAttendance(actor)) {
    return fail("You can only check out for your own desk.");
  }

  const date = todayKey(new Date(at));
  const existing = findAttendance(employee.employeeId, date);
  if (!existing?.checkIn) return fail("Check in before you check out.", { code: "NO_CHECKIN" });
  if (existing.checkOut) return fail("You have already checked out today.", { record: existing, code: "DUPLICATE" });
  if (new Date(at) < new Date(existing.checkIn)) {
    return fail("Check-out cannot be earlier than check-in.");
  }

  const settings = loadAttendanceSettings();
  const timing = evaluateTiming(date, existing.checkIn, at, settings);
  const calendar = calendarMark(date, settings, settings.holidays);
  const status = statusAfterPunch({
    date,
    checkIn: existing.checkIn,
    checkOut: at,
    settings,
    onLeave: false,
    calendar,
  });

  const result = upsertAttendance({
    ...existing,
    checkOut: at,
    status,
    workMinutes: timing.workMinutes,
    lateMinutes: timing.lateMinutes,
    earlyLeaveMinutes: timing.earlyLeaveMinutes,
  });
  if (!result.ok) return fail(result.message);
  noteActivity(
    actor,
    ACTIVITY_ACTIONS.ATTENDANCE_CHECKED_OUT,
    employee.employeeId,
    `${employeeFullName(employee)} checked out · ${formatMinutes(timing.workMinutes)}`
  );
  return {
    ok: true,
    record: result.record,
    message: `Checked out · ${formatMinutes(timing.workMinutes)} on the floor.`,
  };
};

export const correctAttendance = ({
  employeeId,
  date,
  patch = {},
  reason,
  actor,
} = {}) => {
  if (!canCorrectAttendance(actor)) return fail("You are not allowed to correct attendance.");
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return fail("Employee not found.");
  if (!isInScope(actor, employee.employeeId, employees) && !canManageAttendance(actor)) {
    return fail("That employee is outside your team.");
  }
  const note = String(reason || "").trim();
  if (!note) return fail("A reason is required for every correction.");

  const settings = loadAttendanceSettings();
  const current =
    findAttendance(employee.employeeId, date) ||
    hydrateDay(employee, date);

  const checkIn = patch.checkIn === undefined ? current.checkIn : patch.checkIn || null;
  const checkOut = patch.checkOut === undefined ? current.checkOut : patch.checkOut || null;
  if (checkIn && checkOut && new Date(checkOut) < new Date(checkIn)) {
    return fail("Check-out cannot be earlier than check-in.");
  }

  const timing = evaluateTiming(date, checkIn, checkOut, settings);
  const nextStatus = patch.status || current.status;
  const next = {
    ...current,
    employeeId: employee.employeeId,
    employeeNameSnapshot: employeeFullName(employee),
    date,
    checkIn,
    checkOut,
    status: nextStatus,
    workMinutes: checkIn && checkOut ? timing.workMinutes : 0,
    lateMinutes: checkIn ? timing.lateMinutes : 0,
    earlyLeaveMinutes: checkIn && checkOut ? timing.earlyLeaveMinutes : 0,
    notes: patch.notes === undefined ? current.notes : String(patch.notes || ""),
    locationId: patch.locationId || current.locationId || resolveEmployeeLocation(employee).locationId,
    corrections: [
      ...(current.corrections || []),
      {
        at: new Date().toISOString(),
        actorId: actor.employeeId || actor.adminId || null,
        actorName: actorLabel(actor),
        reason: note,
        previous: {
          checkIn: current.checkIn,
          checkOut: current.checkOut,
          status: current.status,
          notes: current.notes,
        },
        next: {
          checkIn,
          checkOut,
          status: nextStatus,
          notes: patch.notes === undefined ? current.notes : String(patch.notes || ""),
        },
      },
    ],
  };

  const result = upsertAttendance(next);
  if (!result.ok) return fail(result.message);
  noteActivity(
    actor,
    ACTIVITY_ACTIONS.ATTENDANCE_CORRECTED,
    employee.employeeId,
    `Corrected attendance for ${employeeFullName(employee)} on ${date}`
  );
  return { ok: true, record: result.record, message: "Attendance corrected." };
};

export const applyLeaveToAttendance = (leave, { quiet = false } = {}) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, leave.employeeId);
  if (!employee) return;
  const settings = loadAttendanceSettings();
  eachDateInRange(leave.startDate, leave.endDate).forEach((date) => {
    if (!isWorkingDay(date, settings, settings.holidays)) return;
    const existing = findAttendance(employee.employeeId, date);
    if (existing?.checkIn) return;
    upsertAttendance({
      ...(existing || createBlankAttendance(employee, date)),
      status: ATTENDANCE_STATUS.LEAVE,
      notes: existing?.notes || leave.reason || "Approved leave.",
      locationId: existing?.locationId || resolveEmployeeLocation(employee).locationId,
    });
  });
  if (!quiet) {
    /* upsert already announced */
  }
};

export const clearLeaveFromAttendance = (leave) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, leave.employeeId);
  if (!employee) return;
  const today = todayKey();
  eachDateInRange(leave.startDate, leave.endDate).forEach((date) => {
    const existing = findAttendance(employee.employeeId, date);
    if (!existing || existing.status !== ATTENDANCE_STATUS.LEAVE || existing.checkIn) return;
    upsertAttendance({
      ...existing,
      status: date < today ? ATTENDANCE_STATUS.ABSENT : ATTENDANCE_STATUS.NOT_CHECKED_IN,
      notes: "",
    });
  });
};

export const attendanceReport = ({ range = "monthly", date = todayKey(), actor = null } = {}) => {
  const start =
    range === "daily" ? date : range === "weekly" ? startOfIsoWeek(date) : startOfMonth(date);
  const end = range === "daily" ? date : range === "weekly" ? endOfIsoWeek(date) : endOfMonth(date);
  const employees = loadEmployees();
  const allowed = new Set(teamEmployeeIds(actor || { adminId: "system" }, employees));
  const records = loadAttendance();
  const leaves = loadLeave();
  const settings = loadAttendanceSettings();

  const days = eachDateInRange(start, end);
  const rows = employees
    .filter((person) => allowed.has(person.employeeId))
    .map((person) => {
      const monthRows = days
        .filter((day) => day >= (person.joiningDate || day) && day <= todayKey())
        .map((day) => hydrateDay(person, day, records, leaves, settings));
      return {
        employeeId: person.employeeId,
        name: employeeFullName(person),
        department: getDepartmentLabel(person.department),
        role: getRoleLabel(person.role),
        summary: summarizeRecords(monthRows),
      };
    });

  const combined = summarizeRecords(
    rows.flatMap((row) => {
      /* Reconstruct enough for house totals from summaries is lossy; re-hydrate. */
      return days
        .map((day) => {
          const person = getEmployee(employees, row.employeeId);
          return person ? hydrateDay(person, day, records, leaves, settings) : null;
        })
        .filter(Boolean)
        .filter((record) => record.date >= (getEmployee(employees, row.employeeId)?.joiningDate || record.date) && record.date <= todayKey());
    })
  );

  return { start, end, range, rows, summary: combined };
};

export const filterEmployeeHistory = (employeeId, { month = monthKey(), status = "" } = {}) => {
  const rows = monthRecordsForEmployee(employeeId, month);
  return status ? rows.filter((row) => row.status === status) : rows;
};

export { formatMinutes, getAttendanceStatusLabel, ATTENDANCE_STATUS };

export default {
  getAttendanceSettings,
  hydrateDay,
  getTodayAttendance,
  summarizeRecords,
  monthRecordsForEmployee,
  employeeAttendanceSummary,
  listVisibleAttendance,
  todayHouseSummary,
  checkIn,
  checkOut,
  correctAttendance,
  applyLeaveToAttendance,
  clearLeaveFromAttendance,
  attendanceReport,
  filterEmployeeHistory,
};
