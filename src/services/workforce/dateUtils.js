/**
 * PRATIKSHYA FASHON — Workforce date helpers.
 *
 * One locale, one month-boundary model, one working-day calculator.
 * Components never invent their own date arithmetic.
 */

import {
  ATTENDANCE_DEFAULTS,
  HOUSE_HOLIDAYS,
} from "../../config/attendanceConfig";
import {
  PERFORMANCE_PERIOD_TYPE,
} from "../../config/performanceConfig";

export const DATE_LOCALE = "en-IN";

const pad = (value) => String(value).padStart(2, "0");

export const toDateKey = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export const parseDateKey = (key) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ""));
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const todayKey = (date = new Date()) => toDateKey(date);

export const monthKey = (value = new Date()) => {
  if (typeof value === "string" && /^\d{4}-\d{2}$/.test(value)) return value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value.slice(0, 7);
  const date = value instanceof Date ? value : parseDateKey(value) || new Date(value);
  if (Number.isNaN(date.getTime())) return todayKey().slice(0, 7);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
};

export const formatDateLong = (value) => {
  const date = typeof value === "string" && value.length === 10 ? parseDateKey(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(DATE_LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatDateShort = (value) => {
  const date = typeof value === "string" && value.length === 10 ? parseDateKey(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(DATE_LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const formatWeekday = (value) => {
  const date = typeof value === "string" && value.length === 10 ? parseDateKey(value) : new Date(value);
  if (!date || Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(DATE_LOCALE, { weekday: "short" });
};

export const formatTime = (value) => {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString(DATE_LOCALE, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export const formatMonthLabel = (value) => {
  const key = monthKey(value);
  const date = parseDateKey(`${key}-01`);
  if (!date) return key;
  return date.toLocaleDateString(DATE_LOCALE, { month: "long", year: "numeric" });
};

export const formatMinutes = (minutes) => {
  const total = Math.max(0, Math.round(Number(minutes) || 0));
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

export const weekdayIndex = (key) => {
  const date = parseDateKey(key);
  return date ? date.getDay() : -1;
};

export const addDays = (key, amount) => {
  const date = parseDateKey(key);
  if (!date) return "";
  date.setDate(date.getDate() + Number(amount || 0));
  return toDateKey(date);
};

export const compareDateKeys = (a, b) => String(a || "").localeCompare(String(b || ""));

export const isDateInRange = (key, start, end) =>
  Boolean(key && start && end && key >= start && key <= end);

export const inclusiveDayCount = (start, end) => {
  const from = parseDateKey(start);
  const to = parseDateKey(end);
  if (!from || !to || to < from) return 0;
  return Math.round((to.getTime() - from.getTime()) / 86400000) + 1;
};

export const eachDateInRange = (start, end) => {
  const from = parseDateKey(start);
  const to = parseDateKey(end);
  if (!from || !to || to < from) return [];
  const days = [];
  const cursor = new Date(from);
  while (cursor <= to) {
    days.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
};

export const startOfMonth = (value = new Date()) => `${monthKey(value)}-01`;

export const endOfMonth = (value = new Date()) => {
  const key = monthKey(value);
  const date = parseDateKey(`${key}-01`);
  if (!date) return startOfMonth(value);
  date.setMonth(date.getMonth() + 1);
  date.setDate(0);
  return toDateKey(date);
};

export const eachDateInMonth = (value = new Date()) =>
  eachDateInRange(startOfMonth(value), endOfMonth(value));

export const startOfIsoWeek = (value = new Date()) => {
  const key = toDateKey(value);
  const date = parseDateKey(key);
  if (!date) return key;
  const day = date.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + offset);
  return toDateKey(date);
};

export const endOfIsoWeek = (value = new Date()) => addDays(startOfIsoWeek(value), 6);

export const shiftMonth = (value, delta) => {
  const date = parseDateKey(`${monthKey(value)}-01`);
  if (!date) return monthKey();
  date.setMonth(date.getMonth() + Number(delta || 0));
  return monthKey(date);
};

export const holidayOn = (dateKey, holidays = HOUSE_HOLIDAYS) =>
  holidays.find((item) => item.date === dateKey) ?? null;

export const isWeekOff = (dateKey, weekOffWeekdays = ATTENDANCE_DEFAULTS.weekOffWeekdays) =>
  weekOffWeekdays.includes(weekdayIndex(dateKey));

export const calendarMark = (dateKey, settings = ATTENDANCE_DEFAULTS, holidays = HOUSE_HOLIDAYS) => {
  const holiday = holidayOn(dateKey, holidays);
  if (holiday) return { status: "HOLIDAY", label: holiday.name };
  if (isWeekOff(dateKey, settings.weekOffWeekdays)) {
    return { status: "WEEK_OFF", label: "Week off" };
  }
  return null;
};

export const isWorkingDay = (dateKey, settings = ATTENDANCE_DEFAULTS, holidays = HOUSE_HOLIDAYS) =>
  !calendarMark(dateKey, settings, holidays);

export const minutesBetween = (startIso, endIso) => {
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
  return Math.round((end.getTime() - start.getTime()) / 60000);
};

export const timeOnDate = (dateKey, hhmm) => {
  const date = parseDateKey(dateKey);
  if (!date) return null;
  const [hours, minutes] = String(hhmm || "00:00").split(":").map((part) => Number(part) || 0);
  date.setHours(hours, minutes, 0, 0);
  return date;
};

export const isoOnDate = (dateKey, hhmm) => {
  const date = timeOnDate(dateKey, hhmm);
  return date ? date.toISOString() : null;
};

export const periodFromDate = (value = new Date(), type = PERFORMANCE_PERIOD_TYPE.MONTHLY) => {
  const date = value instanceof Date ? value : parseDateKey(value) || new Date(value);
  const year = date.getFullYear();
  if (type === PERFORMANCE_PERIOD_TYPE.YEARLY) {
    return {
      type,
      key: String(year),
      label: String(year),
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }
  if (type === PERFORMANCE_PERIOD_TYPE.QUARTERLY) {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const startMonth = (quarter - 1) * 3 + 1;
    const endMonth = startMonth + 2;
    const start = `${year}-${pad(startMonth)}-01`;
    return {
      type,
      key: `${year}-Q${quarter}`,
      label: `Q${quarter} ${year}`,
      startDate: start,
      endDate: endOfMonth(`${year}-${pad(endMonth)}`),
    };
  }
  const key = monthKey(date);
  return {
    type: PERFORMANCE_PERIOD_TYPE.MONTHLY,
    key,
    label: formatMonthLabel(key),
    startDate: startOfMonth(key),
    endDate: endOfMonth(key),
  };
};

export const parsePeriodKey = (periodKey, type = PERFORMANCE_PERIOD_TYPE.MONTHLY) => {
  if (type === PERFORMANCE_PERIOD_TYPE.YEARLY) {
    const year = Number(String(periodKey).slice(0, 4)) || new Date().getFullYear();
    return periodFromDate(new Date(year, 0, 1), type);
  }
  if (type === PERFORMANCE_PERIOD_TYPE.QUARTERLY) {
    const match = /^(\d{4})-Q([1-4])$/.exec(String(periodKey));
    if (match) {
      const month = (Number(match[2]) - 1) * 3;
      return periodFromDate(new Date(Number(match[1]), month, 1), type);
    }
  }
  return periodFromDate(`${monthKey(periodKey)}-01`, PERFORMANCE_PERIOD_TYPE.MONTHLY);
};

export const shiftPeriod = (period, delta = -1) => {
  const current = typeof period === "string" ? parsePeriodKey(period) : period;
  if (current.type === PERFORMANCE_PERIOD_TYPE.YEARLY) {
    return periodFromDate(new Date(Number(current.key) + delta, 0, 1), current.type);
  }
  if (current.type === PERFORMANCE_PERIOD_TYPE.QUARTERLY) {
    const match = /^(\d{4})-Q([1-4])$/.exec(current.key);
    if (!match) return current;
    const absolute = Number(match[1]) * 4 + (Number(match[2]) - 1) + delta;
    const year = Math.floor(absolute / 4);
    const quarter = (absolute % 4 + 4) % 4;
    return periodFromDate(new Date(year, quarter * 3, 1), current.type);
  }
  return periodFromDate(`${shiftMonth(current.key, delta)}-01`, PERFORMANCE_PERIOD_TYPE.MONTHLY);
};

export const monthOptions = (count = 6, from = new Date()) => {
  const options = [];
  for (let index = 0; index < count; index += 1) {
    const key = shiftMonth(from, -index);
    options.push({ id: key, label: formatMonthLabel(key) });
  }
  return options;
};

export const csvEscape = (value) => {
  const text = value == null ? "" : String(value);
  if (/[",\n]/.test(text)) return `"${text.replaceAll("\"", "\"\"")}"`;
  return text;
};

export const toCsv = (headers, rows) => {
  const lines = [headers.map(csvEscape).join(",")];
  rows.forEach((row) => {
    lines.push(row.map(csvEscape).join(","));
  });
  return `${lines.join("\n")}\n`;
};

export const downloadCsv = (filename, headers, rows) => {
  if (typeof window === "undefined") return;
  const blob = new Blob([toCsv(headers, rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export default {
  DATE_LOCALE,
  toDateKey,
  parseDateKey,
  todayKey,
  monthKey,
  formatDateLong,
  formatDateShort,
  formatWeekday,
  formatTime,
  formatMonthLabel,
  formatMinutes,
  weekdayIndex,
  addDays,
  compareDateKeys,
  isDateInRange,
  inclusiveDayCount,
  eachDateInRange,
  startOfMonth,
  endOfMonth,
  eachDateInMonth,
  startOfIsoWeek,
  endOfIsoWeek,
  shiftMonth,
  holidayOn,
  isWeekOff,
  calendarMark,
  isWorkingDay,
  minutesBetween,
  timeOnDate,
  isoOnDate,
  periodFromDate,
  parsePeriodKey,
  shiftPeriod,
  monthOptions,
  toCsv,
  downloadCsv,
};
