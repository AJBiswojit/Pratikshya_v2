/**
 * PRATIKSHYA FASHON — Employee session service.
 *
 * Namespaced mock session. Corrupted storage is treated as signed-out,
 * never as a crash. This is DEMO authentication — not production-secure.
 */

import { canEmployeeLogin } from "../../config/employeeStatus";
import { readStorage, writeStorage } from "../../utils/shopping";
import { EMPLOYEE_STORAGE_KEYS } from "./storage";
import {
  applyPasswordChange,
  ensureSeeded,
  getEmployee,
  loadEmployees,
  markLastLogin,
  verifyCredentials,
} from "./employeeService";

const emptySession = () => ({ employee: null, isAuthenticated: false });

export const readSessionRecord = () => {
  const stored = readStorage(EMPLOYEE_STORAGE_KEYS.AUTH, null);
  if (!stored || typeof stored !== "object" || !stored.employeeId) return null;
  return {
    employeeId: String(stored.employeeId),
    sessionAt: stored.sessionAt || Date.now(),
  };
};

export const writeSessionRecord = (employeeId) => {
  if (!employeeId) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(EMPLOYEE_STORAGE_KEYS.AUTH);
      }
    } catch {
      // Persistence is optional.
    }
    return;
  }
  writeStorage(EMPLOYEE_STORAGE_KEYS.AUTH, {
    employeeId,
    sessionAt: Date.now(),
  });
};

export const restoreEmployeeSession = () => {
  ensureSeeded();
  const record = readSessionRecord();
  if (!record) return emptySession();

  const employees = loadEmployees();
  const employee = getEmployee(employees, record.employeeId);
  if (!employee || !canEmployeeLogin(employee.status)) {
    writeSessionRecord(null);
    return emptySession();
  }

  return { employee, isAuthenticated: true };
};

export const signInEmployee = async ({ employeeId, password }) => {
  await new Promise((resolve) => setTimeout(resolve, 320));
  const result = verifyCredentials(employeeId, password);
  if (!result.ok) {
    return { ok: false, error: result.message, code: result.code, employee: null };
  }

  const stamped = markLastLogin(loadEmployees(), result.employee.employeeId);
  const employee = stamped.employee ?? result.employee;
  writeSessionRecord(employee.employeeId);
  return { ok: true, employee, error: "" };
};

export const signOutEmployee = () => {
  writeSessionRecord(null);
};

export const changeEmployeePassword = async ({
  employeeId,
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  await new Promise((resolve) => setTimeout(resolve, 280));
  if (newPassword !== confirmPassword) {
    return { ok: false, error: "New password and confirmation do not match." };
  }
  const result = applyPasswordChange(loadEmployees(), employeeId, {
    currentPassword,
    newPassword,
  });
  if (!result.ok) return { ok: false, error: result.message };
  return { ok: true, employee: result.employee, error: "" };
};

export const refreshEmployeeSession = () => restoreEmployeeSession();

export default {
  readSessionRecord,
  writeSessionRecord,
  restoreEmployeeSession,
  signInEmployee,
  signOutEmployee,
  changeEmployeePassword,
  refreshEmployeeSession,
};
