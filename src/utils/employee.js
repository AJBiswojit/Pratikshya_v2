/**
 * PRATIKSHYA FASHON — Employee presentation helpers.
 *
 * Pure formatting used by the portal. No storage, no authorization.
 */

import { getDepartmentLabel, getSectionLabel, getStoreLabel } from "../config/employeeDepartments";
import { getRoleLabel } from "../config/employeeRoles";
import { getStatusLabel } from "../config/employeeStatus";

export const employeeFullName = (employee) => {
  if (!employee) return "Team member";
  const name = [employee.firstName, employee.lastName].filter(Boolean).join(" ").trim();
  return name || "Team member";
};

export const employeeInitials = (employee) => {
  const first = employee?.firstName?.[0] ?? "";
  const last = employee?.lastName?.[0] ?? "";
  const initials = `${first}${last}`.toUpperCase();
  return initials || "PF";
};

export const greetingForNow = (date = new Date()) => {
  const hours = date.getHours();
  if (hours < 12) return "Good morning";
  if (hours < 17) return "Good afternoon";
  return "Good evening";
};

export const formatEmployeeDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

export const formatEmployeeDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${day} · ${time}`;
};

export const formatTodayLong = (date = new Date()) =>
  date.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export const formatCount = (value) =>
  Number(value || 0).toLocaleString("en-IN");

export const employeeAssignment = (employee) => ({
  role: getRoleLabel(employee?.role),
  department: getDepartmentLabel(employee?.department),
  section: getSectionLabel(employee?.department, employee?.section),
  store: getStoreLabel(employee?.store),
  status: getStatusLabel(employee?.status),
});

export const todayKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default {
  employeeFullName,
  employeeInitials,
  greetingForNow,
  formatEmployeeDate,
  formatEmployeeDateTime,
  formatTodayLong,
  formatCount,
  employeeAssignment,
  todayKey,
};
