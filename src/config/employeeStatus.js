/**
 * PRATIKSHYA FASHON — Employee account status.
 *
 * Login is allowed only for statuses marked `canLogin`. Suspended and
 * inactive accounts never enter the portal.
 */

export const EMPLOYEE_STATUS = {
  ACTIVE: "ACTIVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  ON_LEAVE: "ON_LEAVE",
  PENDING: "PENDING",
};

export const EMPLOYEE_STATUSES = {
  [EMPLOYEE_STATUS.ACTIVE]: {
    id: EMPLOYEE_STATUS.ACTIVE,
    label: "Active",
    tone: "ink",
    canLogin: true,
    loginBlockedMessage: "",
  },
  [EMPLOYEE_STATUS.PENDING]: {
    id: EMPLOYEE_STATUS.PENDING,
    label: "Pending",
    tone: "accent",
    canLogin: true,
    loginBlockedMessage: "",
  },
  [EMPLOYEE_STATUS.ON_LEAVE]: {
    id: EMPLOYEE_STATUS.ON_LEAVE,
    label: "On leave",
    tone: "quiet",
    canLogin: true,
    loginBlockedMessage: "",
  },
  [EMPLOYEE_STATUS.SUSPENDED]: {
    id: EMPLOYEE_STATUS.SUSPENDED,
    label: "Suspended",
    tone: "danger",
    canLogin: false,
    loginBlockedMessage:
      "This employee account has been suspended. Please contact your administrator.",
  },
  [EMPLOYEE_STATUS.INACTIVE]: {
    id: EMPLOYEE_STATUS.INACTIVE,
    label: "Inactive",
    tone: "muted",
    canLogin: false,
    loginBlockedMessage:
      "This employee account is inactive. Please contact your administrator.",
  },
};

export const STATUS_OPTIONS = Object.values(EMPLOYEE_STATUSES);

export const getEmployeeStatus = (status) =>
  EMPLOYEE_STATUSES[status] ?? EMPLOYEE_STATUSES[EMPLOYEE_STATUS.INACTIVE];

export const canEmployeeLogin = (status) => getEmployeeStatus(status).canLogin;

export const getStatusLabel = (status) => getEmployeeStatus(status).label;

export default {
  EMPLOYEE_STATUS,
  EMPLOYEE_STATUSES,
  STATUS_OPTIONS,
  getEmployeeStatus,
  canEmployeeLogin,
  getStatusLabel,
};
