/**
 * PRATIKSHYA FASHON — Employee ID generation.
 *
 * IDs are department/role-aware and unique within the mock dataset.
 * Never generate IDs inside UI components.
 *
 * Format: PF-{PREFIX}-{#####}
 * Examples: PF-SLS-00124, PF-INV-00031, PF-WHS-00018
 */

import { getRole } from "../../config/employeeRoles";
import { getDepartment } from "../../config/employeeDepartments";

export const EMPLOYEE_ID_PATTERN = /^PF-[A-Z]{2,4}-[0-9]{5}$/;

export const prefixForAssignment = (roleId, departmentId) => {
  const role = getRole(roleId);
  if (role.id === "STORE_MANAGER") return "MGR";
  if (role.id === "WAREHOUSE_STAFF") return "WHS";
  if (role.id === "CUSTOMER_SUPPORT") return "CS";
  if (role.id === "FASHION_STYLIST") return "STY";
  if (role.id === "INVENTORY_MANAGER" || role.id === "INVENTORY_STAFF") return "INV";

  if (departmentId) {
    const department = getDepartment(departmentId);
    if (department.id !== "UNKNOWN" && department.idPrefix && department.idPrefix !== "SLS") {
      return department.idPrefix;
    }
  }
  return role.idPrefix || "EMP";
};

const sequenceFromId = (employeeId, prefix) => {
  if (typeof employeeId !== "string") return null;
  const match = employeeId.match(new RegExp("^PF-" + prefix + "-([0-9]{5})$"));
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

export const isValidEmployeeId = (value) =>
  typeof value === "string" && EMPLOYEE_ID_PATTERN.test(value.trim().toUpperCase());

export const normaliseEmployeeId = (value) =>
  typeof value === "string" ? value.trim().toUpperCase() : "";

/**
 * Next unique ID for a role/department, scanning existing IDs that share
 * the same prefix so newly created staff never collide with seeded ones.
 */
export const generateEmployeeId = ({
  role,
  department,
  existingIds = [],
} = {}) => {
  const prefix = prefixForAssignment(role, department);
  const used = existingIds
    .map((id) => sequenceFromId(normaliseEmployeeId(id), prefix))
    .filter((value) => value !== null);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `PF-${prefix}-${String(next).padStart(5, "0")}`;
};

export default {
  EMPLOYEE_ID_PATTERN,
  prefixForAssignment,
  isValidEmployeeId,
  normaliseEmployeeId,
  generateEmployeeId,
};
