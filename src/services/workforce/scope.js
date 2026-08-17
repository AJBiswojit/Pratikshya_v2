/**
 * PRATIKSHYA FASHON — Workforce authorization and team scope.
 *
 * Pages hide controls they cannot use. These helpers are the real gate:
 * a typed URL or a forged call still has to pass here.
 */

import { EMPLOYEE_STATUS, canEmployeeLogin } from "../../config/employeeStatus";
import { PERMISSIONS } from "../../config/employeePermissions";
import { hasPermission } from "../employees/authorization";

export const isAdminActor = (actor) => Boolean(actor?.adminId);

export const isSuperAdminActor = (actor) => isAdminActor(actor);

export const actorCanAct = (actor) => {
  if (!actor) return false;
  if (isAdminActor(actor)) return true;
  return canEmployeeLogin(actor.status);
};

export const actorLabel = (actor) => {
  if (!actor) return "System";
  if (actor.adminId) return actor.name ? `${actor.name} · ${actor.adminId}` : actor.adminId;
  const name = [actor.firstName, actor.lastName].filter(Boolean).join(" ").trim();
  return actor.employeeId ? `${name || "Team member"} · ${actor.employeeId}` : name || "Team member";
};

export const actorEmployeeId = (actor) => actor?.employeeId || null;

export const canUsePermission = (actor, permission) => {
  if (!actor || !permission) return false;
  if (isAdminActor(actor)) return true;
  return hasPermission(actor, permission);
};

/**
 * Store managers see the operating house, not the Super Admin account.
 * Super Admin / Admin Portal see everyone. Everyone else sees only themselves.
 */
export const teamEmployeeIds = (actor, employees = []) => {
  const list = Array.isArray(employees) ? employees : [];
  if (!actor) return [];
  if (isSuperAdminActor(actor)) return list.map((person) => person.employeeId);
  if (canUsePermission(actor, PERMISSIONS.ATTENDANCE_MANAGE) || canUsePermission(actor, PERMISSIONS.PERFORMANCE_REVIEW) || canUsePermission(actor, PERMISSIONS.TEAM_VIEW)) {
    return list.map((person) => person.employeeId);
  }
  return actor.employeeId ? [actor.employeeId] : [];
};

export const isInScope = (actor, employeeId, employees = []) => {
  if (!actor || !employeeId) return false;
  if (actor.employeeId && actor.employeeId === employeeId) return true;
  return teamEmployeeIds(actor, employees).includes(employeeId);
};

export const canViewAttendance = (actor, employeeId, employees = []) => {
  if (!canUsePermission(actor, PERMISSIONS.ATTENDANCE_VIEW) && !isAdminActor(actor)) return false;
  return isInScope(actor, employeeId, employees);
};

export const canCheckOwnAttendance = (actor) =>
  actorCanAct(actor) && canUsePermission(actor, PERMISSIONS.ATTENDANCE_CHECKIN);

export const canManageAttendance = (actor) => canUsePermission(actor, PERMISSIONS.ATTENDANCE_MANAGE);

export const canCorrectAttendance = (actor) =>
  canUsePermission(actor, PERMISSIONS.ATTENDANCE_CORRECT) || canManageAttendance(actor);

export const canViewLeave = (actor, employeeId, employees = []) => {
  if (!canUsePermission(actor, PERMISSIONS.LEAVE_VIEW) && !isAdminActor(actor)) return false;
  return isInScope(actor, employeeId, employees);
};

export const canCreateLeave = (actor) =>
  actorCanAct(actor) && canUsePermission(actor, PERMISSIONS.LEAVE_CREATE);

export const canReviewLeave = (actor) =>
  canUsePermission(actor, PERMISSIONS.LEAVE_APPROVE) ||
  canUsePermission(actor, PERMISSIONS.LEAVE_REJECT) ||
  canUsePermission(actor, PERMISSIONS.LEAVE_MANAGE);

export const canViewPerformance = (actor, employeeId, employees = []) => {
  if (!canUsePermission(actor, PERMISSIONS.PERFORMANCE_VIEW) && !isAdminActor(actor)) return false;
  return isInScope(actor, employeeId, employees);
};

export const canReviewPerformance = (actor) =>
  canUsePermission(actor, PERMISSIONS.PERFORMANCE_REVIEW) ||
  canUsePermission(actor, PERMISSIONS.PERFORMANCE_MANAGE);

export const canManagePerformance = (actor) => canUsePermission(actor, PERMISSIONS.PERFORMANCE_MANAGE);

export const isEmployeeInactiveForOps = (employee) => {
  if (!employee) return true;
  return (
    employee.status === EMPLOYEE_STATUS.SUSPENDED ||
    employee.status === EMPLOYEE_STATUS.INACTIVE
  );
};

export default {
  isAdminActor,
  isSuperAdminActor,
  actorCanAct,
  actorLabel,
  actorEmployeeId,
  canUsePermission,
  teamEmployeeIds,
  isInScope,
  canViewAttendance,
  canCheckOwnAttendance,
  canManageAttendance,
  canCorrectAttendance,
  canViewLeave,
  canCreateLeave,
  canReviewLeave,
  canViewPerformance,
  canReviewPerformance,
  canManagePerformance,
  isEmployeeInactiveForOps,
};
