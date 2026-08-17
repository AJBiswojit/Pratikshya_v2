/**
 * PRATIKSHYA FASHON — Attendance settings (demo working hours + calendar).
 *
 * Stored separately so Phase 20 Settings can own this namespace later.
 */

import { ATTENDANCE_DEFAULTS, HOUSE_HOLIDAYS } from "../../config/attendanceConfig";
import { getSection, updateSection } from "../settingsRepository";

const normaliseSettings = (raw) => {
  const source = raw && typeof raw === "object" ? raw : {};
  const weekOff = Array.isArray(source.weekOffWeekdays)
    ? source.weekOffWeekdays.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6)
    : ATTENDANCE_DEFAULTS.weekOffWeekdays;
  const holidays = Array.isArray(source.holidays) && source.holidays.length
    ? source.holidays
        .filter((item) => item && /^\d{4}-\d{2}-\d{2}$/.test(item.date))
        .map((item) => ({ date: item.date, name: String(item.name || "Holiday") }))
    : HOUSE_HOLIDAYS;

  return {
    workingStartTime: source.workingStartTime || ATTENDANCE_DEFAULTS.workingStartTime,
    workingEndTime: source.workingEndTime || ATTENDANCE_DEFAULTS.workingEndTime,
    lateThresholdMinutes: Math.max(0, Number(source.lateThresholdMinutes) || ATTENDANCE_DEFAULTS.lateThresholdMinutes),
    minimumHalfDayMinutes: Math.max(0, Number(source.minimumHalfDayMinutes) || ATTENDANCE_DEFAULTS.minimumHalfDayMinutes),
    fullDayMinutes: Math.max(1, Number(source.fullDayMinutes) || ATTENDANCE_DEFAULTS.fullDayMinutes),
    weekOffWeekdays: weekOff.length ? weekOff : ATTENDANCE_DEFAULTS.weekOffWeekdays,
    holidays,
  };
};

export const loadAttendanceSettings = () => {
  const central = getSection("attendance");
  const settings = normaliseSettings(central);
  return { ...settings, holidays: getSection("holidays")?.items?.filter((item) => item.active !== false).map((item) => ({ date: item.date, name: item.name })) || settings.holidays };
};

export const saveAttendanceSettings = (patch = {}) => {
  return normaliseSettings(updateSection("attendance", { ...loadAttendanceSettings(), ...patch }));
};

export default {
  loadAttendanceSettings,
  saveAttendanceSettings,
};
