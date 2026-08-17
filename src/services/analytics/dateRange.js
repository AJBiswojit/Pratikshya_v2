/**
 * PRATIKSHYA FASHON — Analytics date ranges.
 *
 * One place for period presets, comparison windows and chart buckets.
 * Pages never invent their own “last 7 days” arithmetic.
 */

import {
  addDays,
  eachDateInRange,
  endOfMonth,
  formatDateShort,
  formatMonthLabel,
  formatWeekday,
  inclusiveDayCount,
  monthKey,
  parseDateKey,
  startOfIsoWeek,
  startOfMonth,
  toDateKey,
  todayKey,
} from "../workforce/dateUtils";

export const ANALYTICS_PRESETS = {
  TODAY: "TODAY",
  YESTERDAY: "YESTERDAY",
  LAST_7: "LAST_7",
  LAST_30: "LAST_30",
  THIS_MONTH: "THIS_MONTH",
  LAST_MONTH: "LAST_MONTH",
  THIS_QUARTER: "THIS_QUARTER",
  THIS_YEAR: "THIS_YEAR",
  CUSTOM: "CUSTOM",
};

export const ANALYTICS_PRESET_OPTIONS = [
  { id: ANALYTICS_PRESETS.TODAY, label: "Today" },
  { id: ANALYTICS_PRESETS.YESTERDAY, label: "Yesterday" },
  { id: ANALYTICS_PRESETS.LAST_7, label: "Last 7 Days" },
  { id: ANALYTICS_PRESETS.LAST_30, label: "Last 30 Days" },
  { id: ANALYTICS_PRESETS.THIS_MONTH, label: "This Month" },
  { id: ANALYTICS_PRESETS.LAST_MONTH, label: "Last Month" },
  { id: ANALYTICS_PRESETS.THIS_QUARTER, label: "This Quarter" },
  { id: ANALYTICS_PRESETS.THIS_YEAR, label: "This Year" },
  { id: ANALYTICS_PRESETS.CUSTOM, label: "Custom Range" },
];

export const TREND_GRANULARITY = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
  MONTHLY: "MONTHLY",
};

const pad = (value) => String(value).padStart(2, "0");

const quarterStartMonth = (date) => Math.floor(date.getMonth() / 3) * 3;

const shiftMonths = (date, delta) => {
  const next = new Date(date.getFullYear(), date.getMonth() + delta, 1, 12, 0, 0, 0);
  return next;
};

const asDate = (value) => {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? new Date() : value;
  const parsed = parseDateKey(toDateKey(value));
  return parsed || new Date();
};

export const dateKeyOf = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  return toDateKey(value);
};

export const isInRange = (value, start, end) => {
  const key = dateKeyOf(value);
  return Boolean(key && start && end && key >= start && key <= end);
};

const boundsForPreset = (preset, now = new Date(), custom = {}) => {
  const today = todayKey(now);
  const todayDate = asDate(now);

  switch (preset) {
    case ANALYTICS_PRESETS.TODAY:
      return { start: today, end: today };
    case ANALYTICS_PRESETS.YESTERDAY: {
      const yesterday = addDays(today, -1);
      return { start: yesterday, end: yesterday };
    }
    case ANALYTICS_PRESETS.LAST_7:
      return { start: addDays(today, -6), end: today };
    case ANALYTICS_PRESETS.LAST_30:
      return { start: addDays(today, -29), end: today };
    case ANALYTICS_PRESETS.THIS_MONTH:
      return { start: startOfMonth(todayDate), end: today };
    case ANALYTICS_PRESETS.LAST_MONTH: {
      const previous = shiftMonths(todayDate, -1);
      return { start: startOfMonth(previous), end: endOfMonth(previous) };
    }
    case ANALYTICS_PRESETS.THIS_QUARTER: {
      const startMonth = quarterStartMonth(todayDate);
      const start = `${todayDate.getFullYear()}-${pad(startMonth + 1)}-01`;
      return { start, end: today };
    }
    case ANALYTICS_PRESETS.THIS_YEAR:
      return { start: `${todayDate.getFullYear()}-01-01`, end: today };
    case ANALYTICS_PRESETS.CUSTOM: {
      const start = dateKeyOf(custom.start) || today;
      const end = dateKeyOf(custom.end) || today;
      return start <= end ? { start, end } : { start: end, end: start };
    }
    default:
      return { start: addDays(today, -29), end: today };
  }
};

const comparisonFor = (preset, start, end) => {
  const days = inclusiveDayCount(start, end);
  if (days <= 0) return null;

  if (preset === ANALYTICS_PRESETS.THIS_MONTH) {
    const previous = shiftMonths(parseDateKey(start), -1);
    return {
      start: startOfMonth(previous),
      end: endOfMonth(previous),
      label: "vs previous month",
    };
  }
  if (preset === ANALYTICS_PRESETS.LAST_MONTH) {
    const previous = shiftMonths(parseDateKey(start), -1);
    return {
      start: startOfMonth(previous),
      end: endOfMonth(previous),
      label: "vs previous month",
    };
  }
  if (preset === ANALYTICS_PRESETS.THIS_QUARTER) {
    const startDate = parseDateKey(start);
    const previous = shiftMonths(startDate, -3);
    const prevStart = `${previous.getFullYear()}-${pad(previous.getMonth() + 1)}-01`;
    return {
      start: prevStart,
      end: endOfMonth(shiftMonths(previous, 2)),
      label: "vs previous quarter",
    };
  }
  if (preset === ANALYTICS_PRESETS.THIS_YEAR) {
    const year = Number(start.slice(0, 4)) - 1;
    return {
      start: `${year}-01-01`,
      end: `${year}-12-31`,
      label: "vs previous year",
    };
  }
  if (preset === ANALYTICS_PRESETS.TODAY) {
    const yesterday = addDays(start, -1);
    return { start: yesterday, end: yesterday, label: "vs yesterday" };
  }
  if (preset === ANALYTICS_PRESETS.YESTERDAY) {
    const prior = addDays(start, -1);
    return { start: prior, end: prior, label: "vs previous day" };
  }
  if (preset === ANALYTICS_PRESETS.LAST_7) {
    return {
      start: addDays(start, -7),
      end: addDays(start, -1),
      label: "vs previous 7 days",
    };
  }
  if (preset === ANALYTICS_PRESETS.LAST_30) {
    return {
      start: addDays(start, -30),
      end: addDays(start, -1),
      label: "vs previous 30 days",
    };
  }

  return {
    start: addDays(start, -days),
    end: addDays(start, -1),
    label: `vs previous ${days} day${days === 1 ? "" : "s"}`,
  };
};

export const trendGranularityFor = (start, end) => {
  const days = inclusiveDayCount(start, end);
  if (days > 180) return TREND_GRANULARITY.MONTHLY;
  if (days > 45) return TREND_GRANULARITY.WEEKLY;
  return TREND_GRANULARITY.DAILY;
};

export const bucketKeyFor = (value, granularity) => {
  const key = dateKeyOf(value);
  if (!key) return "";
  if (granularity === TREND_GRANULARITY.MONTHLY) return monthKey(key);
  if (granularity === TREND_GRANULARITY.WEEKLY) return startOfIsoWeek(key);
  return key;
};

export const bucketLabel = (key, granularity) => {
  if (!key) return "";
  if (granularity === TREND_GRANULARITY.MONTHLY) return formatMonthLabel(key);
  if (granularity === TREND_GRANULARITY.WEEKLY) {
    return `Week of ${formatDateShort(key)}`;
  }
  return `${formatWeekday(key)} ${formatDateShort(key)}`;
};

export const bucketShortLabel = (key, granularity) => {
  if (!key) return "";
  if (granularity === TREND_GRANULARITY.MONTHLY) {
    const date = parseDateKey(`${monthKey(key)}-01`);
    return date
      ? date.toLocaleDateString("en-IN", { month: "short" })
      : key;
  }
  if (granularity === TREND_GRANULARITY.WEEKLY) {
    return formatDateShort(key);
  }
  const date = parseDateKey(key);
  return date ? date.toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : key;
};

export const enumerateBuckets = (start, end, granularity) => {
  if (granularity === TREND_GRANULARITY.MONTHLY) {
    const keys = [];
    let cursor = parseDateKey(`${monthKey(start)}-01`);
    const last = parseDateKey(`${monthKey(end)}-01`);
    if (!cursor || !last) return [];
    while (cursor <= last) {
      keys.push(monthKey(cursor));
      cursor = shiftMonths(cursor, 1);
    }
    return keys;
  }
  if (granularity === TREND_GRANULARITY.WEEKLY) {
    const keys = [];
    let cursor = startOfIsoWeek(start);
    const last = startOfIsoWeek(end);
    while (cursor && cursor <= last) {
      keys.push(cursor);
      cursor = addDays(cursor, 7);
    }
    return keys;
  }
  return eachDateInRange(start, end);
};

export const resolveAnalyticsPeriod = ({
  preset = ANALYTICS_PRESETS.LAST_30,
  start = "",
  end = "",
  now = new Date(),
} = {}) => {
  const safePreset = ANALYTICS_PRESET_OPTIONS.some((option) => option.id === preset)
    ? preset
    : ANALYTICS_PRESETS.LAST_30;
  const bounds = boundsForPreset(safePreset, now, { start, end });
  const comparison = comparisonFor(safePreset, bounds.start, bounds.end);
  const days = inclusiveDayCount(bounds.start, bounds.end);
  const granularity = trendGranularityFor(bounds.start, bounds.end);
  const option = ANALYTICS_PRESET_OPTIONS.find((entry) => entry.id === safePreset);

  return {
    preset: safePreset,
    presetLabel: option?.label || "Selected period",
    start: bounds.start,
    end: bounds.end,
    days,
    label:
      bounds.start === bounds.end
        ? formatDateShort(bounds.start)
        : `${formatDateShort(bounds.start)} – ${formatDateShort(bounds.end)}`,
    comparison: comparison
      ? {
          ...comparison,
          days: inclusiveDayCount(comparison.start, comparison.end),
          rangeLabel:
            comparison.start === comparison.end
              ? formatDateShort(comparison.start)
              : `${formatDateShort(comparison.start)} – ${formatDateShort(comparison.end)}`,
        }
      : null,
    granularity,
    buckets: enumerateBuckets(bounds.start, bounds.end, granularity),
  };
};

export const percentChange = (current, previous) => {
  const nowValue = Number(current);
  const thenValue = Number(previous);
  if (!Number.isFinite(nowValue) || !Number.isFinite(thenValue)) {
    return { value: null, direction: "flat", label: null };
  }
  if (thenValue === 0) {
    return { value: null, direction: "flat", label: null };
  }
  const change = ((nowValue - thenValue) / Math.abs(thenValue)) * 100;
  const rounded = Math.round(change * 10) / 10;
  return {
    value: rounded,
    direction: rounded > 0 ? "up" : rounded < 0 ? "down" : "flat",
    label: `${rounded > 0 ? "+" : ""}${rounded}%`,
  };
};

export default {
  ANALYTICS_PRESETS,
  ANALYTICS_PRESET_OPTIONS,
  TREND_GRANULARITY,
  dateKeyOf,
  isInRange,
  trendGranularityFor,
  bucketKeyFor,
  bucketLabel,
  bucketShortLabel,
  enumerateBuckets,
  resolveAnalyticsPeriod,
  percentChange,
};
