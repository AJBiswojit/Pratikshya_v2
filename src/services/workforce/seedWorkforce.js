/**
 * PRATIKSHYA FASHON — Deterministic workforce demo seed.
 *
 * Runs only when the relevant storage is empty. Uses the existing employee
 * register — it never invents people. Marked `seeded: true` so the UI can
 * say so without pretending the records came from a payroll clock.
 */

import {
  ATTENDANCE_STATUS,
  LEAVE_STATUS,
  LEAVE_TYPE,
} from "../../config/attendanceConfig";
import {
  METRIC,
  PERFORMANCE_STATUS,
  targetsForRole,
} from "../../config/performanceConfig";
import { EMPLOYEE_STATUS } from "../../config/employeeStatus";
import { employeeFullName } from "../../utils/employee";
import { loadEmployees } from "../employees/employeeService";
import {
  addDays,
  calendarMark,
  eachDateInRange,
  endOfMonth,
  isoOnDate,
  monthKey,
  periodFromDate,
  shiftMonth,
  startOfMonth,
  todayKey,
} from "./dateUtils";
import { hashString } from "./ids";
import { loadAttendanceSettings } from "./settings";

const PERSONA = {
  "PF-SLS-00124": { lateEvery: 11, absentEvery: 0, halfEvery: 19, band: "strong" },
  "PF-SLS-00131": { lateEvery: 14, absentEvery: 0, halfEvery: 0, band: "strong" },
  "PF-SLS-00155": { lateEvery: 4, absentEvery: 7, halfEvery: 9, band: "improve" },
  "PF-SLS-00122": { lateEvery: 9, absentEvery: 0, halfEvery: 0, band: "average" },
  "PF-INV-00031": { lateEvery: 16, absentEvery: 0, halfEvery: 0, band: "strong" },
  "PF-INV-00044": { lateEvery: 10, absentEvery: 20, halfEvery: 0, band: "average" },
  "PF-INV-00052": { lateEvery: 5, absentEvery: 12, halfEvery: 8, band: "improve" },
  "PF-WHS-00018": { lateEvery: 13, absentEvery: 0, halfEvery: 0, band: "average" },
  "PF-CS-00044": { lateEvery: 12, absentEvery: 18, halfEvery: 0, band: "average" },
  "PF-STY-00012": { lateEvery: 15, absentEvery: 0, halfEvery: 21, band: "strong" },
  "PF-MGR-00008": { lateEvery: 18, absentEvery: 0, halfEvery: 0, band: "strong" },
  "PF-SLS-00140": { lateEvery: 4, absentEvery: 6, halfEvery: 0, band: "improve" },
};

const TODAY_PRESET = {
  "PF-MGR-00008": ATTENDANCE_STATUS.PRESENT,
  "PF-SLS-00131": ATTENDANCE_STATUS.LATE,
  "PF-INV-00031": ATTENDANCE_STATUS.PRESENT,
  "PF-WHS-00018": ATTENDANCE_STATUS.PRESENT,
  "PF-CS-00044": ATTENDANCE_STATUS.PRESENT,
};

const clock = (dateKey, hours, minutes) => isoOnDate(dateKey, `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`);

const jittered = (dateKey, employeeId, hour, minute, spread) => {
  const hash = hashString(`${employeeId}:${dateKey}:${hour}`);
  const delta = (hash % (spread * 2 + 1)) - spread;
  const total = hour * 60 + minute + delta;
  const nextHour = Math.max(0, Math.floor(total / 60));
  const nextMinute = ((total % 60) + 60) % 60;
  return clock(dateKey, nextHour, nextMinute);
};

const locationFor = (employee) =>
  employee?.store === "WAREHOUSE" ? "loc-main-warehouse" : "loc-main-store";

const buildLeave = (employees, today) => {
  const byId = new Map(employees.map((person) => [person.employeeId, person]));
  const stamp = (id, employeeId, type, start, end, status, reason, requestedAt, review = {}) => {
    const employee = byId.get(employeeId);
    if (!employee) return null;
    const days = eachDateInRange(start, end).length;
    return {
      leaveId: id,
      employeeId,
      employeeNameSnapshot: employeeFullName(employee),
      leaveType: type,
      startDate: start,
      endDate: end,
      days,
      reason,
      status,
      requestedAt,
      reviewedAt: review.reviewedAt || null,
      reviewedBy: review.reviewedBy || null,
      reviewNote: review.reviewNote || "",
      seeded: true,
    };
  };

  return [
    stamp(
      "lv-seed-leela-01",
      "PF-SLS-00122",
      LEAVE_TYPE.EARNED,
      "2026-07-28",
      "2026-08-20",
      LEAVE_STATUS.APPROVED,
      "Family wedding travel — already agreed with the floor lead.",
      "2026-07-20T09:10:00.000Z",
      {
        reviewedAt: "2026-07-21T11:00:00.000Z",
        reviewedBy: "Vikram Iyer · PF-MGR-00008",
        reviewNote: "Cover arranged on the jewellery salon.",
      }
    ),
    stamp(
      "lv-seed-imran-01",
      "PF-WHS-00018",
      LEAVE_TYPE.CASUAL,
      "2026-07-17",
      "2026-07-18",
      LEAVE_STATUS.APPROVED,
      "Personal work in town.",
      "2026-07-12T08:40:00.000Z",
      {
        reviewedAt: "2026-07-13T10:15:00.000Z",
        reviewedBy: "Kavya Menon · PF-ADM-00001",
        reviewNote: "Approved. Receiving desk covered.",
      }
    ),
    stamp(
      "lv-seed-suresh-01",
      "PF-INV-00052",
      LEAVE_TYPE.SICK,
      "2026-08-03",
      "2026-08-03",
      LEAVE_STATUS.REJECTED,
      "Fever — requesting the day.",
      "2026-08-03T07:50:00.000Z",
      {
        reviewedAt: "2026-08-03T08:20:00.000Z",
        reviewedBy: "Arjun Desai · PF-INV-00031",
        reviewNote: "A half-day was already taken that week. Please use casual leave if needed.",
      }
    ),
    stamp(
      "lv-seed-ananya-01",
      "PF-SLS-00124",
      LEAVE_TYPE.CASUAL,
      addDays(today, 8),
      addDays(today, 9),
      LEAVE_STATUS.PENDING,
      "Sibling's reception — two days off the floor.",
      `${today}T08:15:00.000Z`
    ),
    stamp(
      "lv-seed-meera-01",
      "PF-SLS-00131",
      LEAVE_TYPE.EMERGENCY,
      addDays(today, 3),
      addDays(today, 3),
      LEAVE_STATUS.PENDING,
      "Family medical appointment in the afternoon.",
      `${today}T07:40:00.000Z`
    ),
    stamp(
      "lv-seed-divya-01",
      "PF-CS-00044",
      LEAVE_TYPE.SICK,
      addDays(today, 1),
      addDays(today, 1),
      LEAVE_STATUS.PENDING,
      "Migraine — requesting tomorrow if the queue allows.",
      `${today}T09:05:00.000Z`
    ),
  ].filter(Boolean);
};

const approvedLeaveOn = (leaves, employeeId, dateKey) =>
  leaves.find(
    (entry) =>
      entry.employeeId === employeeId &&
      entry.status === LEAVE_STATUS.APPROVED &&
      dateKey >= entry.startDate &&
      dateKey <= entry.endDate
  );

const statusForDay = (employee, dateKey, index, leaves, settings) => {
  const mark = calendarMark(dateKey, settings, settings.holidays);
  if (mark) return mark.status;
  if (approvedLeaveOn(leaves, employee.employeeId, dateKey)) return ATTENDANCE_STATUS.LEAVE;

  if (employee.employeeId === "PF-SLS-00140" && dateKey > "2026-07-02") {
    return null;
  }
  if (employee.status === EMPLOYEE_STATUS.INACTIVE) return null;

  const persona = PERSONA[employee.employeeId] || { lateEvery: 9, absentEvery: 16, halfEvery: 20 };
  if (persona.absentEvery && index % persona.absentEvery === 0) return ATTENDANCE_STATUS.ABSENT;
  if (persona.halfEvery && index % persona.halfEvery === 0) return ATTENDANCE_STATUS.HALF_DAY;
  if (persona.lateEvery && index % persona.lateEvery === 0) return ATTENDANCE_STATUS.LATE;
  return ATTENDANCE_STATUS.PRESENT;
};

const buildRecord = ({ employee, dateKey, status, settings, open = false }) => {
  if (!status) return null;
  const locationId = locationFor(employee);
  const base = {
    attendanceId: `att-seed-${employee.employeeId}-${dateKey}`,
    employeeId: employee.employeeId,
    employeeNameSnapshot: employeeFullName(employee),
    date: dateKey,
    checkIn: null,
    checkOut: null,
    status,
    workMinutes: 0,
    lateMinutes: 0,
    earlyLeaveMinutes: 0,
    locationId,
    notes: "",
    corrections: [],
    createdAt: `${dateKey}T08:00:00.000Z`,
    updatedAt: `${dateKey}T08:00:00.000Z`,
    seeded: true,
  };

  if (
    status === ATTENDANCE_STATUS.WEEK_OFF ||
    status === ATTENDANCE_STATUS.HOLIDAY ||
    status === ATTENDANCE_STATUS.LEAVE ||
    status === ATTENDANCE_STATUS.ABSENT
  ) {
    if (status === ATTENDANCE_STATUS.LEAVE) {
      base.notes = "Approved leave.";
    }
    return base;
  }

  const late = status === ATTENDANCE_STATUS.LATE;
  const half = status === ATTENDANCE_STATUS.HALF_DAY;
  const checkIn = late
    ? jittered(dateKey, employee.employeeId, 9, 52, 12)
    : jittered(dateKey, employee.employeeId, 9, 22, 8);
  const checkOut = open
    ? null
    : half
      ? jittered(dateKey, employee.employeeId, 13, 40, 15)
      : jittered(dateKey, employee.employeeId, 18, 28, 18);

  const start = new Date(isoOnDate(dateKey, settings.workingStartTime));
  const threshold = new Date(start.getTime() + settings.lateThresholdMinutes * 60000);
  const inAt = new Date(checkIn);
  const lateMinutes = inAt > threshold ? Math.round((inAt.getTime() - start.getTime()) / 60000) : 0;

  let workMinutes = 0;
  let earlyLeaveMinutes = 0;
  if (checkOut) {
    workMinutes = Math.max(0, Math.round((new Date(checkOut).getTime() - inAt.getTime()) / 60000));
    const end = new Date(isoOnDate(dateKey, settings.workingEndTime));
    if (new Date(checkOut) < end) {
      earlyLeaveMinutes = Math.round((end.getTime() - new Date(checkOut).getTime()) / 60000);
    }
  }

  return {
    ...base,
    checkIn,
    checkOut,
    workMinutes,
    lateMinutes,
    earlyLeaveMinutes,
    updatedAt: checkOut || checkIn,
  };
};

const buildAttendance = (employees, leaves, settings, today) => {
  const start = startOfMonth(shiftMonth(today, -1));
  const records = [];

  employees.forEach((employee) => {
    if (employee.status === EMPLOYEE_STATUS.INACTIVE) return;
    const join = employee.joiningDate || start;
    const lastHistorical =
      employee.employeeId === "PF-SLS-00140" ? "2026-07-02" : addDays(today, -1);

    eachDateInRange(start, lastHistorical).forEach((dateKey, index) => {
      if (dateKey < join) return;
      const status = statusForDay(employee, dateKey, index + 1, leaves, settings);
      const record = buildRecord({ employee, dateKey, status, settings });
      if (record) records.push(record);
    });

    const todayMark = calendarMark(today, settings, settings.holidays);
    if (todayMark) {
      records.push(buildRecord({ employee, dateKey: today, status: todayMark.status, settings }));
      return;
    }
    if (approvedLeaveOn(leaves, employee.employeeId, today)) {
      records.push(buildRecord({ employee, dateKey: today, status: ATTENDANCE_STATUS.LEAVE, settings }));
      return;
    }
    const preset = TODAY_PRESET[employee.employeeId];
    if (preset && today >= join) {
      records.push(buildRecord({ employee, dateKey: today, status: preset, settings, open: true }));
    }
  });

  return records;
};

const targetOverrides = {
  "PF-SLS-00131": [
    { metric: METRIC.SALES, targetValue: 200000, unit: "INR" },
    { metric: METRIC.ORDERS_ASSISTED, targetValue: 6, unit: "COUNT" },
    { metric: METRIC.CUSTOMERS_SERVED, targetValue: 8, unit: "COUNT" },
  ],
  "PF-SLS-00155": [
    { metric: METRIC.SALES, targetValue: 50000, unit: "INR" },
    { metric: METRIC.ORDERS_ASSISTED, targetValue: 6, unit: "COUNT" },
    { metric: METRIC.CUSTOMERS_SERVED, targetValue: 8, unit: "COUNT" },
  ],
};

const reviewCopy = {
  strong: {
    strengths: "Holds the floor with calm authority. Customers leave with a considered edit, not a rushed sale.",
    improvements: "Share shortlists earlier in the week so the atelier can prepare pairings.",
    managerFeedback: "A reliable presence. Keep the same standard through the festive rush.",
  },
  average: {
    strengths: "Consistent on process and present for the team when the floor is busy.",
    improvements: "Tighten follow-ups within 24 hours so warm customers are not left waiting.",
    managerFeedback: "Solid month. A little more urgency on open tickets will lift the score.",
  },
  improve: {
    strengths: "Willing, and learning the house language.",
    improvements: "Attendance and first-hour readiness need to settle before targets can move.",
    managerFeedback: "We will review again next month with a shorter target set.",
  },
};

const buildPerformance = (employees, today) => {
  const current = periodFromDate(today);
  const previous = periodFromDate(`${shiftMonth(today, -1)}-01`);
  const records = [];

  employees.forEach((employee) => {
    if (employee.status === EMPLOYEE_STATUS.INACTIVE) return;
    const persona = PERSONA[employee.employeeId] || { band: "average" };
    const template = targetOverrides[employee.employeeId] || targetsForRole(employee.role);
    const makeTargets = (periodKey, createdAt) =>
      template.map((item) => ({
        targetId: `tgt-${employee.employeeId}-${periodKey}-${item.metric}`,
        employeeId: employee.employeeId,
        period: periodKey,
        metric: item.metric,
        targetValue: item.targetValue,
        unit: item.unit,
        createdBy: "PF-ADM-00001",
        createdAt,
      }));

    const joinedCurrent = employee.joiningDate && employee.joiningDate > previous.endDate;

    if (!joinedCurrent && employee.employeeId !== "PF-SLS-00155") {
      const copy = reviewCopy[persona.band] || reviewCopy.average;
      records.push({
        performanceId: `perf-seed-${employee.employeeId}-${previous.key}`,
        employeeId: employee.employeeId,
        employeeNameSnapshot: employeeFullName(employee),
        period: previous.key,
        periodType: previous.type,
        department: employee.department,
        role: employee.role,
        targets: makeTargets(previous.key, `${previous.startDate}T09:00:00.000Z`),
        achievements: [],
        review: {
          strengths: copy.strengths,
          improvements: copy.improvements,
          managerFeedback: copy.managerFeedback,
          employeeComments: "",
          reviewerId: "PF-MGR-00008",
          reviewerName: "Vikram Iyer · PF-MGR-00008",
          reviewedAt: `${previous.endDate}T17:30:00.000Z`,
          scoreOverride: null,
        },
        score: null,
        scoreBreakdown: null,
        status: PERFORMANCE_STATUS.FINALIZED,
        createdAt: `${previous.startDate}T09:00:00.000Z`,
        updatedAt: `${previous.endDate}T17:30:00.000Z`,
        seeded: true,
      });
    }

    const currentStatus =
      employee.employeeId === "PF-SLS-00131"
        ? PERFORMANCE_STATUS.REVIEW_PENDING
        : employee.employeeId === "PF-STY-00012"
          ? PERFORMANCE_STATUS.REVIEWED
          : employee.employeeId === "PF-SLS-00155"
            ? PERFORMANCE_STATUS.IN_PROGRESS
            : employee.employeeId === "PF-INV-00052"
              ? PERFORMANCE_STATUS.REVIEW_PENDING
              : PERFORMANCE_STATUS.IN_PROGRESS;

    const reviewed = currentStatus === PERFORMANCE_STATUS.REVIEWED;
    const copy = reviewCopy[persona.band] || reviewCopy.average;

    records.push({
      performanceId: `perf-seed-${employee.employeeId}-${current.key}`,
      employeeId: employee.employeeId,
      employeeNameSnapshot: employeeFullName(employee),
      period: current.key,
      periodType: current.type,
      department: employee.department,
      role: employee.role,
      targets: makeTargets(current.key, `${current.startDate}T09:00:00.000Z`),
      achievements: [],
      review: reviewed
        ? {
            strengths: copy.strengths,
            improvements: copy.improvements,
            managerFeedback: copy.managerFeedback,
            employeeComments: "Grateful for the sitting notes — I will keep the conversion log tighter.",
            reviewerId: "PF-MGR-00008",
            reviewerName: "Vikram Iyer · PF-MGR-00008",
            reviewedAt: `${today}T11:10:00.000Z`,
            scoreOverride: null,
          }
        : {
            strengths: "",
            improvements: "",
            managerFeedback: "",
            employeeComments: "",
            reviewerId: null,
            reviewerName: null,
            reviewedAt: null,
            scoreOverride: null,
          },
      score: null,
      scoreBreakdown: null,
      status: currentStatus,
      createdAt: `${Math.max(current.startDate, employee.joiningDate || current.startDate)}T09:00:00.000Z`,
      updatedAt: `${today}T09:00:00.000Z`,
      seeded: true,
    });
  });

  return records;
};

export const buildWorkforceSeed = () => {
  const today = todayKey();
  const employees = loadEmployees();
  const settings = loadAttendanceSettings();
  const leave = buildLeave(employees, today);
  const attendance = buildAttendance(employees, leave, settings, today);
  const performance = buildPerformance(employees, today);
  return {
    attendance,
    leave,
    performance,
    generatedFor: today,
    month: monthKey(today),
    previousMonth: shiftMonth(today, -1),
    range: { start: startOfMonth(shiftMonth(today, -1)), end: endOfMonth(today) },
  };
};

export default { buildWorkforceSeed };
