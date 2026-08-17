/**
 * PRATIKSHYA FASHON — Employee authorization.
 *
 * role → permissions → authorization
 *
 * Pages ask `hasPermission("inventory.view")`. They never test
 * `role === "sales"`. A missing role or empty permission list is a
 * deny, not an allow.
 */

import { canEmployeeLogin } from "../../config/employeeStatus";
import { isKnownRole } from "../../config/employeeRoles";
import {
  PERMISSIONS,
  isEmployeeAccountPermission,
} from "../../config/employeePermissions";
import { requiredPermissionForPath } from "../../config/employeeNavigation";

export const hasPermission = (employee, permission) => {
  if (!employee || !permission) return false;
  if (!canEmployeeLogin(employee.status)) return false;
  /* Employee-account administration is Admin-domain authority. No employee
     role or custom operational grant may ever imply it. */
  if (isEmployeeAccountPermission(permission)) return false;
  if (!Array.isArray(employee.permissions)) return false;
  if (employee.permissions.includes(permission)) return true;
  /* offers.manage is the house-wide offer desk and implies every offer key. */
  if (
    String(permission).startsWith("offers.") &&
    permission !== PERMISSIONS.OFFERS_MANAGE &&
    employee.permissions.includes(PERMISSIONS.OFFERS_MANAGE)
  ) {
    return true;
  }
  if (
    String(permission).startsWith("attendance.") &&
    permission !== PERMISSIONS.ATTENDANCE_MANAGE &&
    employee.permissions.includes(PERMISSIONS.ATTENDANCE_MANAGE)
  ) {
    return true;
  }
  if (
    String(permission).startsWith("leave.") &&
    permission !== PERMISSIONS.LEAVE_MANAGE &&
    employee.permissions.includes(PERMISSIONS.LEAVE_MANAGE)
  ) {
    return true;
  }
  if (
    String(permission).startsWith("performance.") &&
    permission !== PERMISSIONS.PERFORMANCE_MANAGE &&
    employee.permissions.includes(PERMISSIONS.PERFORMANCE_MANAGE)
  ) {
    return true;
  }
  return false;
};

export const hasAnyPermission = (employee, permissions = []) =>
  permissions.some((permission) => hasPermission(employee, permission));

export const hasAllPermissions = (employee, permissions = []) =>
  permissions.every((permission) => hasPermission(employee, permission));

export const canAccessPath = (employee, pathname) => {
  if (!employee) return false;
  if (!canEmployeeLogin(employee.status)) return false;
  const required = requiredPermissionForPath(pathname);
  if (!required) return true;
  return hasPermission(employee, required);
};

export const hasRecognizedRole = (employee) => Boolean(employee && isKnownRole(employee.role));

export default {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  canAccessPath,
  hasRecognizedRole,
};
