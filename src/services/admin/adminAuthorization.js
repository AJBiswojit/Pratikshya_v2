/**
 * Service-layer authorization for Super Admin employee-account actions.
 * UI visibility is never treated as authorization.
 */

import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLES,
  canManageEmployeeAccounts,
  hasAdminPermission,
} from "../../config/adminAccess";

export const ADMIN_AUTHORIZATION_ERRORS = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  FORBIDDEN: "FORBIDDEN",
};

export const authorizeEmployeeManagement = (actor) => {
  if (!actor?.adminId) {
    const employeeIdentity = Boolean(actor?.employeeId);
    return {
      ok: false,
      code: employeeIdentity
        ? ADMIN_AUTHORIZATION_ERRORS.FORBIDDEN
        : ADMIN_AUTHORIZATION_ERRORS.UNAUTHENTICATED,
      message: employeeIdentity
        ? "Employee identities cannot manage employee accounts."
        : "An authenticated Super Admin account is required.",
    };
  }
  if (!canManageEmployeeAccounts(actor)) {
    return {
      ok: false,
      code: ADMIN_AUTHORIZATION_ERRORS.FORBIDDEN,
      message: "You are not authorized to manage employee accounts.",
    };
  }
  return { ok: true, code: null, message: "" };
};

export const isSuperAdminEmployeeManager = (actor) =>
  actor?.role === ADMIN_ROLES.SUPER_ADMIN &&
  hasAdminPermission(actor, ADMIN_PERMISSIONS.EMPLOYEES_MANAGE);

export default {
  ADMIN_AUTHORIZATION_ERRORS,
  authorizeEmployeeManagement,
  isSuperAdminEmployeeManager,
};
