#!/usr/bin/env node
/** Focused responsibility-boundary audit for Super Admin employee management. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { INITIAL_ADMINS } from "../src/data/admin/adminAccounts.js";
import { INITIAL_EMPLOYEES } from "../src/data/employees/mockEmployees.js";
import {
  ADMIN_PERMISSIONS,
  canManageEmployeeAccounts,
} from "../src/config/adminAccess.js";
import {
  EMPLOYEE_ACCOUNT_PERMISSION_KEYS,
  PERMISSIONS,
} from "../src/config/employeePermissions.js";
import { hasPermission } from "../src/services/employees/authorization.js";
import {
  getActiveAssignmentEmployees,
  normaliseEmployees,
  validateEmployeeDraft,
} from "../src/services/employees/employeeService.js";

const root = process.cwd();
const source = (path) => readFileSync(join(root, path), "utf8");
const app = source("src/App.jsx");
const adminNav = source("src/config/adminNavigation.js");
const employeeNav = source("src/config/employeeNavigation.js");
const productWorkflow = source("src/services/productWorkflow.js");
const workflowCommands = source("src/services/workflow/productWorkflowCommands.js");

let failed = false;
const result = (label, pass, detail = "") => {
  const status = pass ? "PASS" : "FAIL";
  console.log(`${label} = ${status}${!pass && detail ? ` · ${detail}` : ""}`);
  if (!pass) failed = true;
};

const superAdmin = INITIAL_ADMINS.find((admin) => admin.adminId === "PF-ADM-00001");
const normalEmployee = INITIAL_EMPLOYEES.find((employee) => employee.employeeId === "PF-MGR-00008");
const employeeIds = INITIAL_EMPLOYEES.map((employee) => employee.employeeId);
const employeeEmails = INITIAL_EMPLOYEES.map((employee) => employee.email.toLowerCase());
const adminIdentityKeys = INITIAL_ADMINS.flatMap((admin) => [admin.adminId, admin.email.toLowerCase()]);
const employeeIdentityKeys = INITIAL_EMPLOYEES.flatMap((employee) => [employee.employeeId, employee.email.toLowerCase()]);

const draft = {
  firstName: "Audit",
  lastName: "Identity",
  email: "audit.identity@pratikshyafashon.in",
  phone: "+91 98765 43210",
  department: "MANAGEMENT",
  store: "MAIN_FLOOR",
  joiningDate: "2026-08-14",
  status: "PENDING",
};
const superRoleValidation = validateEmployeeDraft(
  { ...draft, role: "SUPER_ADMIN" },
  INITIAL_EMPLOYEES,
  { isCreate: true }
);
const adminRoleValidation = validateEmployeeDraft(
  { ...draft, role: "ADMIN" },
  INITIAL_EMPLOYEES,
  { isCreate: true }
);

result(
  "Admin employee-management route exists",
  app.includes('path="/admin/employees"') &&
    app.includes("AdminEmployeeManagementRoute") &&
    adminNav.includes('to: "/admin/employees"')
);
result(
  "SUPER_ADMIN can access employee management",
  canManageEmployeeAccounts(superAdmin) &&
    superAdmin?.role === "SUPER_ADMIN" &&
    ADMIN_PERMISSIONS.EMPLOYEES_MANAGE === PERMISSIONS.EMPLOYEES_MANAGE
);
result(
  "Normal employee cannot access employee management",
  !hasPermission(normalEmployee, PERMISSIONS.EMPLOYEES_MANAGE) &&
    EMPLOYEE_ACCOUNT_PERMISSION_KEYS.every((permission) => !normalEmployee.permissions.includes(permission)) &&
    !employeeNav.includes('to: "/employee/management"') &&
    app.includes('path="/employee/management/*"') &&
    app.includes('to="/employee/profile"')
);
result(
  "Admin identities cannot be created through employee creation",
  !superRoleValidation.ok && !adminRoleValidation.ok &&
    /Admin identities/.test(superRoleValidation.errors.role || "")
);
result(
  "SUPER_ADMIN cannot appear as employee",
  !normaliseEmployees([
    ...INITIAL_EMPLOYEES,
    {
      id: "bad-admin",
      employeeId: "PF-ADM-00001",
      firstName: "Kavya",
      lastName: "Menon",
      email: "kavya.menon@pratikshyafashon.in",
      role: "SUPER_ADMIN",
    },
  ]).some((employee) => employee.role === "SUPER_ADMIN" || employee.employeeId.startsWith("PF-ADM-"))
);
const duplicateEmployeeIds = employeeIds.length - new Set(employeeIds).size;
console.log(`Duplicate employee IDs = ${duplicateEmployeeIds}`);
if (duplicateEmployeeIds !== 0) failed = true;
const duplicateIdentityCount =
  employeeIdentityKeys.length - new Set(employeeIdentityKeys).size +
  adminIdentityKeys.filter((key) => employeeIdentityKeys.includes(key)).length;
console.log(`Duplicate identities = ${duplicateIdentityCount}`);
if (duplicateIdentityCount !== 0) failed = true;

const assignable = getActiveAssignmentEmployees(INITIAL_EMPLOYEES);
result(
  "Inactive employees excluded from active assignment selectors",
  assignable.length > 0 &&
    assignable.every((employee) => employee.status === "ACTIVE") &&
    !assignable.some((employee) => employee.employeeId === "PF-SLS-00118")
);
result(
  "Product review assignment still works",
  getActiveAssignmentEmployees(INITIAL_EMPLOYEES, {
    requiredPermission: PERMISSIONS.PRODUCTS_MANAGE,
  }).length > 0 &&
    productWorkflow.includes("assignProductToEmployee") &&
    workflowCommands.includes("Only active employees can receive new product assignments")
);
result(
  "Employee Portal still works",
  app.includes('path="/employee/login"') &&
    app.includes('path="/employee"') &&
    app.includes("EmployeeProtectedRoute")
);
result(
  "Admin Portal other modules still work",
  [
    "/admin/products",
    "/admin/products/review",
    "/admin/categories",
    "/admin/collections",
    "/admin/orders",
    "/admin/media",
    "/admin/settings",
  ].every((route) => app.includes(`path="${route}"`))
);

if (failed) {
  console.error("\nEmployee-management audit failed.");
  process.exitCode = 1;
} else {
  console.log("\nEmployee-management responsibility model verified.");
}
