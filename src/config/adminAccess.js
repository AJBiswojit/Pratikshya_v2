/**
 * PRATIKSHYA FASHON — Admin access model.
 *
 * The Admin Portal is a separate authentication boundary from both the
 * customer storefront and the Employee Operations Portal. Admin permissions
 * are role-owned here; they are never copied onto employee accounts.
 */

export const ADMIN_ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
};

/** Existing permission model, scoped to the Admin identity domain. */
export const ADMIN_PERMISSIONS = {
  EMPLOYEES_MANAGE: "employees.manage",
};

export const ADMIN_ROLE_DEFINITIONS = {
  [ADMIN_ROLES.SUPER_ADMIN]: {
    id: ADMIN_ROLES.SUPER_ADMIN,
    label: "Super Admin",
    description:
      "Highest-level business administrator with authority over employee accounts and Admin Portal operations.",
    permissions: [ADMIN_PERMISSIONS.EMPLOYEES_MANAGE],
  },
};

export const ADMIN_STATUS = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
};

export const ADMIN_STATUSES = {
  [ADMIN_STATUS.ACTIVE]: {
    id: ADMIN_STATUS.ACTIVE,
    label: "Active",
    tone: "ink",
    canSignIn: true,
    blockedMessage: "",
  },
  [ADMIN_STATUS.SUSPENDED]: {
    id: ADMIN_STATUS.SUSPENDED,
    label: "Suspended",
    tone: "danger",
    canSignIn: false,
    blockedMessage: "This administrator account is suspended.",
  },
};

export const getAdminRole = (roleId) =>
  ADMIN_ROLE_DEFINITIONS[roleId] ?? {
    id: roleId || "UNKNOWN",
    label: "Unassigned",
    description: "This administration role is not recognised.",
    permissions: [],
  };

export const getAdminRoleLabel = (roleId) => getAdminRole(roleId).label;

export const getAdminStatus = (statusId) =>
  ADMIN_STATUSES[statusId] ?? ADMIN_STATUSES[ADMIN_STATUS.SUSPENDED];

export const getAdminStatusLabel = (statusId) => getAdminStatus(statusId).label;

export const canAdminSignIn = (statusId) => getAdminStatus(statusId).canSignIn;

export const isAdminRole = (roleId) => Boolean(ADMIN_ROLE_DEFINITIONS[roleId]);

/**
 * Pure authorization check shared by route guards and service actions.
 * An `adminId` alone is not authority: the account must be active, carry a
 * recognised Admin role, and receive the permission through that role.
 */
export const hasAdminPermission = (admin, permission) => {
  if (!admin?.adminId || !permission) return false;
  if (!canAdminSignIn(admin.status)) return false;
  const role = ADMIN_ROLE_DEFINITIONS[admin.role];
  return Boolean(role?.permissions?.includes(permission));
};

export const canManageEmployeeAccounts = (admin) =>
  hasAdminPermission(admin, ADMIN_PERMISSIONS.EMPLOYEES_MANAGE);

export default {
  ADMIN_ROLES,
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_DEFINITIONS,
  ADMIN_STATUS,
  ADMIN_STATUSES,
  getAdminRole,
  getAdminRoleLabel,
  getAdminStatus,
  getAdminStatusLabel,
  canAdminSignIn,
  isAdminRole,
  hasAdminPermission,
  canManageEmployeeAccounts,
};
