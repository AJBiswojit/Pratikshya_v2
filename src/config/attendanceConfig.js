/**
 * PRATIKSHYA FASHON — Attendance, leave and house calendar.
 *
 * Constants and demo working-hours only. No storage, no React.
 * Phase 20 Settings can replace ATTENDANCE_DEFAULTS / HOUSE_CALENDAR
 * without touching check-in or reporting code.
 */

export const ATTENDANCE_STORAGE_KEY = "pratikshya_attendance";
export const LEAVE_STORAGE_KEY = "pratikshya_leave";
export const ATTENDANCE_SETTINGS_KEY = "pratikshya_attendance_settings";
export const WORKFORCE_CHANGED_EVENT = "pratikshya-workforce-changed";

export const ATTENDANCE_STATUS = {
  PRESENT: "PRESENT",
  LATE: "LATE",
  ABSENT: "ABSENT",
  HALF_DAY: "HALF_DAY",
  LEAVE: "LEAVE",
  HOLIDAY: "HOLIDAY",
  WEEK_OFF: "WEEK_OFF",
  ON_DUTY: "ON_DUTY",
  PENDING_CORRECTION: "PENDING_CORRECTION",
  NOT_CHECKED_IN: "NOT_CHECKED_IN",
};

export const ATTENDANCE_STATUS_DEFINITIONS = {
  [ATTENDANCE_STATUS.PRESENT]: { id: ATTENDANCE_STATUS.PRESENT, label: "Present", tone: "ink" },
  [ATTENDANCE_STATUS.LATE]: { id: ATTENDANCE_STATUS.LATE, label: "Late", tone: "brass" },
  [ATTENDANCE_STATUS.ABSENT]: { id: ATTENDANCE_STATUS.ABSENT, label: "Absent", tone: "danger" },
  [ATTENDANCE_STATUS.HALF_DAY]: { id: ATTENDANCE_STATUS.HALF_DAY, label: "Half day", tone: "quiet" },
  [ATTENDANCE_STATUS.LEAVE]: { id: ATTENDANCE_STATUS.LEAVE, label: "Leave", tone: "accent" },
  [ATTENDANCE_STATUS.HOLIDAY]: { id: ATTENDANCE_STATUS.HOLIDAY, label: "Holiday", tone: "muted" },
  [ATTENDANCE_STATUS.WEEK_OFF]: { id: ATTENDANCE_STATUS.WEEK_OFF, label: "Week off", tone: "muted" },
  [ATTENDANCE_STATUS.ON_DUTY]: { id: ATTENDANCE_STATUS.ON_DUTY, label: "On duty", tone: "ink" },
  [ATTENDANCE_STATUS.PENDING_CORRECTION]: {
    id: ATTENDANCE_STATUS.PENDING_CORRECTION,
    label: "Pending correction",
    tone: "alert",
  },
  [ATTENDANCE_STATUS.NOT_CHECKED_IN]: {
    id: ATTENDANCE_STATUS.NOT_CHECKED_IN,
    label: "Not checked in",
    tone: "quiet",
  },
};

export const ATTENDANCE_STATUS_OPTIONS = Object.values(ATTENDANCE_STATUS_DEFINITIONS).filter(
  (item) => item.id !== ATTENDANCE_STATUS.NOT_CHECKED_IN
);

/**
 * Present-equivalent weights used for attendance %.
 * `null` means the day is excluded from the eligible working-day count.
 */
export const ATTENDANCE_CREDIT = {
  [ATTENDANCE_STATUS.PRESENT]: 1,
  [ATTENDANCE_STATUS.LATE]: 1,
  [ATTENDANCE_STATUS.ON_DUTY]: 1,
  [ATTENDANCE_STATUS.PENDING_CORRECTION]: 1,
  [ATTENDANCE_STATUS.HALF_DAY]: 0.5,
  [ATTENDANCE_STATUS.ABSENT]: 0,
  [ATTENDANCE_STATUS.LEAVE]: null,
  [ATTENDANCE_STATUS.HOLIDAY]: null,
  [ATTENDANCE_STATUS.WEEK_OFF]: null,
  [ATTENDANCE_STATUS.NOT_CHECKED_IN]: 0,
};

export const LEAVE_TYPE = {
  CASUAL: "CASUAL",
  SICK: "SICK",
  EARNED: "EARNED",
  EMERGENCY: "EMERGENCY",
  OTHER: "OTHER",
};

export const LEAVE_TYPE_DEFINITIONS = {
  [LEAVE_TYPE.CASUAL]: { id: LEAVE_TYPE.CASUAL, label: "Casual leave" },
  [LEAVE_TYPE.SICK]: { id: LEAVE_TYPE.SICK, label: "Sick leave" },
  [LEAVE_TYPE.EARNED]: { id: LEAVE_TYPE.EARNED, label: "Earned leave" },
  [LEAVE_TYPE.EMERGENCY]: { id: LEAVE_TYPE.EMERGENCY, label: "Emergency leave" },
  [LEAVE_TYPE.OTHER]: { id: LEAVE_TYPE.OTHER, label: "Other" },
};

export const LEAVE_TYPE_OPTIONS = Object.values(LEAVE_TYPE_DEFINITIONS);

export const LEAVE_STATUS = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
};

export const LEAVE_STATUS_DEFINITIONS = {
  [LEAVE_STATUS.PENDING]: { id: LEAVE_STATUS.PENDING, label: "Pending", tone: "brass" },
  [LEAVE_STATUS.APPROVED]: { id: LEAVE_STATUS.APPROVED, label: "Approved", tone: "ink" },
  [LEAVE_STATUS.REJECTED]: { id: LEAVE_STATUS.REJECTED, label: "Rejected", tone: "danger" },
  [LEAVE_STATUS.CANCELLED]: { id: LEAVE_STATUS.CANCELLED, label: "Cancelled", tone: "muted" },
};

export const LEAVE_STATUS_OPTIONS = Object.values(LEAVE_STATUS_DEFINITIONS);

/**
 * House working hours for the current demo. Not per-employee shift times.
 * Easy to lift into Phase 20 Settings.
 */
export const ATTENDANCE_DEFAULTS = {
  workingStartTime: "09:30",
  workingEndTime: "18:30",
  lateThresholdMinutes: 10,
  minimumHalfDayMinutes: 240,
  fullDayMinutes: 540,
  weekOffWeekdays: [0],
};

export const HOUSE_HOLIDAYS = [
  { date: "2026-01-26", name: "Republic Day" },
  { date: "2026-03-14", name: "Holi" },
  { date: "2026-08-15", name: "Independence Day" },
  { date: "2026-10-02", name: "Gandhi Jayanti" },
  { date: "2026-11-08", name: "Diwali" },
];

export const FALLBACK_LOCATION = {
  id: "loc-demo-unassigned",
  name: "Assigned floor (demo)",
  type: "STORE",
  demo: true,
};

export const getAttendanceStatus = (status) =>
  ATTENDANCE_STATUS_DEFINITIONS[status] ?? ATTENDANCE_STATUS_DEFINITIONS[ATTENDANCE_STATUS.NOT_CHECKED_IN];

export const getAttendanceStatusLabel = (status) => getAttendanceStatus(status).label;

export const getLeaveType = (type) =>
  LEAVE_TYPE_DEFINITIONS[type] ?? { id: type || "OTHER", label: "Leave" };

export const getLeaveTypeLabel = (type) => getLeaveType(type).label;

export const getLeaveStatus = (status) =>
  LEAVE_STATUS_DEFINITIONS[status] ?? LEAVE_STATUS_DEFINITIONS[LEAVE_STATUS.PENDING];

export const getLeaveStatusLabel = (status) => getLeaveStatus(status).label;

export const isExcludedFromAttendancePercent = (status) => ATTENDANCE_CREDIT[status] == null;

export const attendanceCredit = (status) => {
  const credit = ATTENDANCE_CREDIT[status];
  return credit == null ? 0 : credit;
};

export default {
  ATTENDANCE_STORAGE_KEY,
  LEAVE_STORAGE_KEY,
  ATTENDANCE_SETTINGS_KEY,
  WORKFORCE_CHANGED_EVENT,
  ATTENDANCE_STATUS,
  ATTENDANCE_STATUS_DEFINITIONS,
  ATTENDANCE_STATUS_OPTIONS,
  ATTENDANCE_CREDIT,
  LEAVE_TYPE,
  LEAVE_TYPE_DEFINITIONS,
  LEAVE_TYPE_OPTIONS,
  LEAVE_STATUS,
  LEAVE_STATUS_DEFINITIONS,
  LEAVE_STATUS_OPTIONS,
  ATTENDANCE_DEFAULTS,
  HOUSE_HOLIDAYS,
  FALLBACK_LOCATION,
  getAttendanceStatus,
  getAttendanceStatusLabel,
  getLeaveType,
  getLeaveTypeLabel,
  getLeaveStatus,
  getLeaveStatusLabel,
  isExcludedFromAttendancePercent,
  attendanceCredit,
};
