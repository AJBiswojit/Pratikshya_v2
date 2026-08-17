/**
 * PRATIKSHYA FASHON — Performance repository.
 *
 * One store: `pratikshya_performance`. Records always reference a real
 * employeeId from the house register.
 */

import {
  PERFORMANCE_PERIOD_TYPE,
  PERFORMANCE_STATUS,
  PERFORMANCE_STORAGE_KEY,
} from "../../config/performanceConfig";
import { makeId } from "./ids";
import { readList, writeList } from "./store";

const VALID_STATUS = new Set(Object.values(PERFORMANCE_STATUS));

const normaliseTarget = (raw, employeeId, period) => {
  if (!raw || !raw.metric) return null;
  return {
    targetId: String(raw.targetId || makeId("tgt")),
    employeeId: raw.employeeId || employeeId,
    period: raw.period || period,
    metric: String(raw.metric),
    targetValue: Number(raw.targetValue) || 0,
    unit: raw.unit || "COUNT",
    createdBy: raw.createdBy || null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

const normaliseAchievement = (raw) => {
  if (!raw || !raw.metric) return null;
  return {
    metric: String(raw.metric),
    actualValue: Number(raw.actualValue) || 0,
    source: String(raw.source || "operations"),
    unit: raw.unit || null,
  };
};

const emptyReview = () => ({
  strengths: "",
  improvements: "",
  managerFeedback: "",
  employeeComments: "",
  reviewerId: null,
  reviewerName: null,
  reviewedAt: null,
  scoreOverride: null,
});

export const normalisePerformance = (raw) => {
  if (!raw || typeof raw !== "object") return null;
  const employeeId = String(raw.employeeId || "").trim();
  const period = String(raw.period || "").trim();
  if (!employeeId || !period) return null;
  const review = raw.review && typeof raw.review === "object" ? { ...emptyReview(), ...raw.review } : emptyReview();
  return {
    performanceId: String(raw.performanceId || `perf-${employeeId}-${period}`),
    employeeId,
    employeeNameSnapshot: String(raw.employeeNameSnapshot || employeeId),
    period,
    periodType: raw.periodType || PERFORMANCE_PERIOD_TYPE.MONTHLY,
    department: raw.department || "",
    role: raw.role || "",
    targets: (Array.isArray(raw.targets) ? raw.targets : [])
      .map((item) => normaliseTarget(item, employeeId, period))
      .filter(Boolean),
    achievements: (Array.isArray(raw.achievements) ? raw.achievements : [])
      .map(normaliseAchievement)
      .filter(Boolean),
    review,
    score: raw.score == null ? null : Number(raw.score),
    scoreBreakdown: raw.scoreBreakdown && typeof raw.scoreBreakdown === "object" ? raw.scoreBreakdown : null,
    status: VALID_STATUS.has(raw.status) ? raw.status : PERFORMANCE_STATUS.NOT_STARTED,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString(),
    seeded: Boolean(raw.seeded),
  };
};

export const savePerformance = (records, options) => {
  const next = (Array.isArray(records) ? records : []).map(normalisePerformance).filter(Boolean);
  writeList(PERFORMANCE_STORAGE_KEY, next, options);
  return next;
};

export const ensurePerformanceSeeded = (seed = null) => {
  const stored = readList(PERFORMANCE_STORAGE_KEY);
  if (stored && stored.length) return stored.map(normalisePerformance).filter(Boolean);
  if (Array.isArray(seed) && seed.length) {
    return savePerformance(seed, { quiet: true });
  }
  return stored ? stored.map(normalisePerformance).filter(Boolean) : [];
};

export const loadPerformance = () => {
  const stored = readList(PERFORMANCE_STORAGE_KEY);
  if (stored && stored.length) return stored.map(normalisePerformance).filter(Boolean);
  return ensurePerformanceSeeded();
};

export const findPerformance = (employeeId, period, records = loadPerformance()) =>
  records.find((entry) => entry.employeeId === employeeId && entry.period === period) ?? null;

export const findPerformanceById = (performanceId, records = loadPerformance()) =>
  records.find((entry) => entry.performanceId === performanceId) ?? null;

export const performanceForEmployee = (employeeId, records = loadPerformance()) =>
  records
    .filter((entry) => entry.employeeId === employeeId)
    .sort((a, b) => String(b.period).localeCompare(String(a.period)));

export const upsertPerformance = (draft, options) => {
  const records = [...loadPerformance()];
  const next = normalisePerformance({
    performanceId: draft.performanceId || makeId("perf"),
    ...draft,
    updatedAt: new Date().toISOString(),
    createdAt: draft.createdAt || new Date().toISOString(),
  });
  if (!next) return { ok: false, record: null, records, message: "Performance record is incomplete." };
  const index = records.findIndex(
    (entry) =>
      entry.performanceId === next.performanceId ||
      (entry.employeeId === next.employeeId && entry.period === next.period)
  );
  if (index >= 0) {
    records[index] = { ...records[index], ...next, performanceId: records[index].performanceId };
    savePerformance(records, options);
    return { ok: true, record: records[index], records };
  }
  const created = [next, ...records];
  savePerformance(created, options);
  return { ok: true, record: next, records: created };
};

export default {
  normalisePerformance,
  savePerformance,
  ensurePerformanceSeeded,
  loadPerformance,
  findPerformance,
  findPerformanceById,
  performanceForEmployee,
  upsertPerformance,
};
