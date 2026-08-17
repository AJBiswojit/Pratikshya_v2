/**
 * PRATIKSHYA FASHON — Performance service.
 *
 * Targets, live achievement, transparent scoring, manager review.
 * Employees never finalize their own review.
 */

import {
  METRIC_DEFINITIONS,
  PERFORMANCE_STATUS,
  PERFORMANCE_WEIGHTS,
  getMetric,
  targetsForRole,
} from "../../config/performanceConfig";
import { employeeFullName } from "../../utils/employee";
import { getDepartmentLabel } from "../../config/employeeDepartments";
import { getRoleLabel } from "../../config/employeeRoles";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "../employees/activityService";
import { getEmployee, loadEmployees } from "../employees/employeeService";
import {
  averageTargetPercent,
  metricPercent,
  operationalQualityFor,
  resolveAchievements,
} from "./achievementService";
import { employeeAttendanceSummary } from "./attendanceService";
import { parsePeriodKey, periodFromDate, todayKey } from "./dateUtils";
import {
  findPerformance,
  loadPerformance,
  performanceForEmployee,
  upsertPerformance,
} from "./performanceRepository";
import {
  actorCanAct,
  actorLabel,
  canManagePerformance,
  canReviewPerformance,
  canViewPerformance,
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
    /* Performance record remains the source of truth. */
  }
};

const clampDisplay = (value) => {
  if (value == null || Number.isNaN(Number(value))) return null;
  return Number(value);
};

export const scorePerformance = ({ targetAchievement, attendance, operationalQuality }) => {
  const t = Number(targetAchievement) || 0;
  const a = Number(attendance) || 0;
  const q = Number(operationalQuality) || 0;
  const score =
    t * PERFORMANCE_WEIGHTS.targetAchievement +
    a * PERFORMANCE_WEIGHTS.attendance +
    q * PERFORMANCE_WEIGHTS.operationalQuality;
  return {
    targetAchievement: Math.round(t * 10) / 10,
    attendance: Math.round(a * 10) / 10,
    operationalQuality: Math.round(q * 10) / 10,
    score: Math.round(score * 10) / 10,
    weights: PERFORMANCE_WEIGHTS,
  };
};

const decorate = (record, employee, { teamAverage = null } = {}) => {
  if (!record || !employee) return record;
  const period = parsePeriodKey(record.period, record.periodType);
  const frozen = record.status === PERFORMANCE_STATUS.FINALIZED;
  const achievements = frozen && record.achievements?.length
    ? record.achievements
    : resolveAchievements(employee, record.targets, period, teamAverage);
  const attendance = employeeAttendanceSummary(employee.employeeId, record.period);
  const targetPct = averageTargetPercent(achievements, METRIC_DEFINITIONS);
  const quality = operationalQualityFor(employee, achievements, attendance.attendancePercent);
  const breakdown = scorePerformance({
    targetAchievement: targetPct ?? 0,
    attendance: attendance.attendancePercent ?? 0,
    operationalQuality: quality ?? 0,
  });
  const override = record.review?.scoreOverride;
  const score = override == null ? breakdown.score : Number(override);

  return {
    ...record,
    employee,
    name: employeeFullName(employee),
    roleLabel: getRoleLabel(employee.role),
    departmentLabel: getDepartmentLabel(employee.department),
    periodLabel: period.label,
    periodRange: period,
    achievements,
    attendance,
    scoreBreakdown: breakdown,
    score,
    displayScore: clampDisplay(score),
    targetPercent: targetPct,
    metrics: achievements.map((item) => {
      const definition = getMetric(item.metric);
      const percent = metricPercent(item.actualValue, item.targetValue, { invert: definition.invert });
      return {
        ...item,
        label: definition.label,
        unit: item.unit || definition.unit,
        invert: Boolean(definition.invert),
        percent,
        displayPercent: percent == null ? null : Math.min(percent, 999),
      };
    }),
  };
};

const teamTargetAverage = (actor, periodKey) => {
  const employees = loadEmployees();
  const ids = teamEmployeeIds(actor || { adminId: "system" }, employees).filter((id) => id !== actor?.employeeId);
  const percents = ids
    .map((id) => {
      const person = getEmployee(employees, id);
      const raw = findPerformance(id, periodKey);
      if (!person || !raw) return null;
      const period = parsePeriodKey(periodKey, raw.periodType);
      const achievements = resolveAchievements(person, raw.targets, period, null);
      return averageTargetPercent(achievements, METRIC_DEFINITIONS);
    })
    .filter((value) => value != null);
  if (!percents.length) return 0;
  return Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 10) / 10;
};

export const ensurePeriodRecord = (employee, period = periodFromDate()) => {
  const existing = findPerformance(employee.employeeId, period.key);
  if (existing) return existing;
  const created = upsertPerformance(
    {
      employeeId: employee.employeeId,
      employeeNameSnapshot: employeeFullName(employee),
      period: period.key,
      periodType: period.type,
      department: employee.department,
      role: employee.role,
      targets: targetsForRole(employee.role).map((item) => ({
        ...item,
        employeeId: employee.employeeId,
        period: period.key,
        createdBy: "system",
        createdAt: new Date().toISOString(),
      })),
      status: PERFORMANCE_STATUS.IN_PROGRESS,
    },
    // Seeding a period row is a read-side backfill, not a user edit. Announcing
    // it would bump WorkforceContext while a dashboard is still rendering.
    { quiet: true }
  );
  return created.record;
};

export const getEmployeePerformance = (employeeId, periodKey = periodFromDate().key, actor = null) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return null;
  if (actor && !canViewPerformance(actor, employeeId, employees)) return null;
  const period = parsePeriodKey(periodKey);
  const record = ensurePeriodRecord(employee, period);
  const teamAverage = teamTargetAverage(actor, period.key);
  return decorate(record, employee, { teamAverage });
};

export const listVisiblePerformance = (actor, filters = {}) => {
  const employees = loadEmployees();
  const allowed = new Set(teamEmployeeIds(actor, employees));
  const period = parsePeriodKey(filters.period || periodFromDate().key);
  const query = String(filters.query || "").trim().toLowerCase();
  const teamAverage = teamTargetAverage(actor, period.key);

  return employees
    .filter((person) => allowed.has(person.employeeId))
    .filter((person) => !filters.role || person.role === filters.role)
    .filter((person) => !filters.department || person.department === filters.department)
    .filter((person) => !filters.location || person.store === filters.location)
    .filter((person) => {
      if (!query) return true;
      return [person.employeeId, person.firstName, person.lastName]
        .join(" ")
        .toLowerCase()
        .includes(query);
    })
    .map((person) => {
      const record = ensurePeriodRecord(person, period);
      return decorate(record, person, { teamAverage });
    })
    .filter((row) => !filters.status || row.status === filters.status);
};

export const performanceHistory = (employeeId, actor = null) => {
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return [];
  if (actor && !canViewPerformance(actor, employeeId, employees)) return [];
  return performanceForEmployee(employeeId).map((record) => decorate(record, employee));
};

export const housePerformanceSummary = (actor, periodKey = periodFromDate().key) => {
  const rows = listVisiblePerformance(actor, { period: periodKey });
  const reviewed = rows.filter((row) =>
    [PERFORMANCE_STATUS.REVIEWED, PERFORMANCE_STATUS.FINALIZED].includes(row.status)
  );
  const pending = rows.filter((row) => row.status === PERFORMANCE_STATUS.REVIEW_PENDING);
  const percents = rows.map((row) => row.targetPercent).filter((value) => value != null);
  const scores = reviewed.map((row) => row.score).filter((value) => value != null);
  const averageAchievement = percents.length
    ? Math.round((percents.reduce((sum, value) => sum + value, 0) / percents.length) * 10) / 10
    : 0;
  const ranked = [...rows].sort((a, b) => (b.targetPercent || 0) - (a.targetPercent || 0));
  return {
    total: rows.length,
    reviewed: reviewed.length,
    pending: pending.length,
    averageAchievement,
    averageScore: scores.length
      ? Math.round((scores.reduce((sum, value) => sum + value, 0) / scores.length) * 10) / 10
      : null,
    topPerformers: ranked.filter((row) => (row.targetPercent || 0) >= 85).slice(0, 3),
    needsAttention: ranked.filter((row) => (row.targetPercent || 0) > 0 && row.targetPercent < 60).slice(-3).reverse(),
    rows,
  };
};

export const submitReview = ({
  employeeId,
  periodKey = periodFromDate().key,
  strengths,
  improvements,
  managerFeedback,
  scoreOverride,
  actor,
  finalize = false,
} = {}) => {
  if (!canReviewPerformance(actor)) return fail("You are not allowed to review performance.");
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return fail("Employee not found.");
  if (actor.employeeId && actor.employeeId === employee.employeeId) {
    return fail("You cannot review your own performance.");
  }
  if (!isInScope(actor, employee.employeeId, employees)) {
    return fail("That employee is outside your review scope.");
  }
  if (isEmployeeInactiveForOps(employee) && finalize) {
    /* Historical review of a suspended account is allowed; new finalize of ops is fine. */
  }

  const current = getEmployeePerformance(employee.employeeId, periodKey, actor);
  if (!current) return fail("Performance record not found.");
  if (current.status === PERFORMANCE_STATUS.FINALIZED && !canManagePerformance(actor)) {
    return fail("A finalized review cannot be changed.");
  }

  const nextStatus = finalize
    ? PERFORMANCE_STATUS.FINALIZED
    : PERFORMANCE_STATUS.REVIEWED;

  const result = upsertPerformance({
    ...current,
    achievements: current.achievements,
    score: current.score,
    scoreBreakdown: current.scoreBreakdown,
    review: {
      ...current.review,
      strengths: String(strengths ?? current.review.strengths ?? "").trim(),
      improvements: String(improvements ?? current.review.improvements ?? "").trim(),
      managerFeedback: String(managerFeedback ?? current.review.managerFeedback ?? "").trim(),
      scoreOverride: scoreOverride === "" || scoreOverride == null ? null : Number(scoreOverride),
      reviewerId: actor.employeeId || actor.adminId || null,
      reviewerName: actorLabel(actor),
      reviewedAt: new Date().toISOString(),
      employeeComments: current.review.employeeComments || "",
    },
    status: nextStatus,
  });
  if (!result.ok) return fail(result.message);
  noteActivity(
    actor,
    ACTIVITY_ACTIONS.PERFORMANCE_REVIEWED,
    employee.employeeId,
    `${finalize ? "Finalized" : "Reviewed"} performance for ${employeeFullName(employee)} · ${current.periodLabel}`
  );
  return {
    ok: true,
    record: getEmployeePerformance(employee.employeeId, periodKey, actor),
    message: finalize ? "Review finalized." : "Review saved.",
  };
};

export const finalizeReview = (payload) => submitReview({ ...payload, finalize: true });

export const addEmployeeComments = ({ employeeId, periodKey = periodFromDate().key, comments, actor } = {}) => {
  if (!actorCanAct(actor)) return fail("You cannot comment from this account.");
  if (!actor.employeeId || actor.employeeId !== employeeId) {
    return fail("You can only comment on your own performance.");
  }
  const current = getEmployeePerformance(employeeId, periodKey, actor);
  if (!current) return fail("Performance record not found.");
  if (current.status === PERFORMANCE_STATUS.FINALIZED) {
    return fail("A finalized review can no longer be commented on.");
  }
  const result = upsertPerformance({
    ...current,
    review: {
      ...current.review,
      employeeComments: String(comments || "").trim(),
    },
  });
  if (!result.ok) return fail(result.message);
  return { ok: true, record: getEmployeePerformance(employeeId, periodKey, actor), message: "Comments saved." };
};

export const setTargets = ({ employeeId, periodKey = periodFromDate().key, targets, actor } = {}) => {
  if (!canManagePerformance(actor)) return fail("You are not allowed to edit targets.");
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return fail("Employee not found.");
  const current = ensurePeriodRecord(employee, parsePeriodKey(periodKey));
  if (current.status === PERFORMANCE_STATUS.FINALIZED && !canManagePerformance(actor)) {
    return fail("Finalized targets cannot be edited.");
  }
  const nextTargets = (Array.isArray(targets) ? targets : current.targets).map((item) => ({
    ...item,
    employeeId: employee.employeeId,
    period: periodKey,
    createdBy: actor.employeeId || actor.adminId || item.createdBy,
    createdAt: item.createdAt || new Date().toISOString(),
  }));
  const result = upsertPerformance({
    ...current,
    targets: nextTargets,
    status: current.status === PERFORMANCE_STATUS.NOT_STARTED ? PERFORMANCE_STATUS.IN_PROGRESS : current.status,
  });
  if (!result.ok) return fail(result.message);
  return { ok: true, record: getEmployeePerformance(employeeId, periodKey, actor), message: "Targets updated." };
};

export const markReviewPending = ({ employeeId, periodKey = periodFromDate().key, actor } = {}) => {
  if (!canReviewPerformance(actor) && !canManagePerformance(actor)) {
    return fail("You are not allowed to request a review.");
  }
  const employees = loadEmployees();
  const employee = getEmployee(employees, employeeId);
  if (!employee) return fail("Employee not found.");
  const current = ensurePeriodRecord(employee, parsePeriodKey(periodKey));
  if (current.status === PERFORMANCE_STATUS.FINALIZED) {
    return fail("A finalized review cannot be reopened from here.");
  }
  const result = upsertPerformance({ ...current, status: PERFORMANCE_STATUS.REVIEW_PENDING });
  if (!result.ok) return fail(result.message);
  return { ok: true, record: getEmployeePerformance(employeeId, periodKey, actor), message: "Marked for review." };
};

export { PERFORMANCE_STATUS, todayKey, loadPerformance };

export default {
  scorePerformance,
  ensurePeriodRecord,
  getEmployeePerformance,
  listVisiblePerformance,
  performanceHistory,
  housePerformanceSummary,
  submitReview,
  finalizeReview,
  addEmployeeComments,
  setTargets,
  markReviewPending,
};
