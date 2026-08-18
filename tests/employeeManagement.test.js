/** Super Admin employee-management responsibility regression suite. */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

import { INITIAL_ADMINS } from "../src/data/admin/adminAccounts.js";
import { INITIAL_EMPLOYEES } from "../src/data/employees/mockEmployees.js";
import { DEMO_EMPLOYEE_LOGINS } from "../src/data/employees/demoCredentials.js";
import {
  ADMIN_PERMISSIONS,
  canManageEmployeeAccounts,
  hasAdminPermission,
} from "../src/config/adminAccess.js";
import { PERMISSIONS } from "../src/config/employeePermissions.js";
import { EMPLOYEE_STATUS } from "../src/config/employeeStatus.js";
import { ROLES, ROLE_OPTIONS } from "../src/config/employeeRoles.js";
import { hasPermission } from "../src/services/employees/authorization.js";
import {
  activateEmployee,
  createEmployee,
  deactivateEmployee,
  getActiveAssignmentEmployees,
  getEmployee,
  loadEmployees,
  normaliseEmployees,
  updateEmployee,
  validateEmployeeDraft,
  verifyCredentials,
} from "../src/services/employees/employeeService.js";
import { assignProductToEmployee } from "../src/services/productWorkflow.js";
import { products as canonicalProducts } from "../src/data/catalog/products.js";

const memory = new Map();
const events = new EventTarget();
globalThis.window = {
  localStorage: {
    getItem: (key) => memory.has(key) ? memory.get(key) : null,
    setItem: (key, value) => memory.set(key, String(value)),
    removeItem: (key) => memory.delete(key),
    clear: () => memory.clear(),
  },
  addEventListener: events.addEventListener.bind(events),
  removeEventListener: events.removeEventListener.bind(events),
  dispatchEvent: events.dispatchEvent.bind(events),
};

const SUPER_ADMIN = INITIAL_ADMINS[0];
const MANAGER = INITIAL_EMPLOYEES.find((employee) => employee.employeeId === "PF-MGR-00008");
const ACTIVE_SALES = INITIAL_EMPLOYEES.find((employee) => employee.employeeId === "PF-SLS-00124");
const ACTIVE_SALES_LOGIN = DEMO_EMPLOYEE_LOGINS.find((entry) => entry.employeeId === ACTIVE_SALES.employeeId);

const employeeDraft = (overrides = {}) => ({
  firstName: "Asha",
  lastName: "Patel",
  email: "asha.patel@pratikshyafashon.in",
  phone: "+91 98765 43210",
  role: ROLES.SALES_EXECUTIVE,
  department: "WOMENS_SAREES",
  section: "SILK_BANARASI",
  store: "MAIN_FLOOR",
  joiningDate: "2026-08-14",
  status: EMPLOYEE_STATUS.PENDING,
  permissionMode: "role",
  permissions: [],
  ...overrides,
});

beforeEach(() => memory.clear());


beforeEach(() => {
  setupCanonicalState();
});

afterEach(() => {
  setupCanonicalState();
});

test("1. Super Admin can access employee management", () => {
  assert.equal(canManageEmployeeAccounts(SUPER_ADMIN), true);
  assert.equal(hasAdminPermission(SUPER_ADMIN, ADMIN_PERMISSIONS.EMPLOYEES_MANAGE), true);
});

test("2. Normal employee cannot access employee management or its service actions", () => {
  assert.equal(hasPermission(MANAGER, PERMISSIONS.EMPLOYEES_MANAGE), false);
  const result = createEmployee(loadEmployees(), employeeDraft(), MANAGER);
  assert.equal(result.ok, false);
  assert.equal(result.code, "FORBIDDEN");
});

test("3. Super Admin can create an employee", () => {
  const result = createEmployee(loadEmployees(), employeeDraft(), SUPER_ADMIN);
  assert.equal(result.ok, true);
  assert.match(result.employee.employeeId, /^PF-SLS-\d{5}$/);
  assert.ok(result.temporaryPassword);
  assert.equal(result.employee.mustChangePassword, true);
});

test("4. Employee IDs remain deterministic and unique", () => {
  const first = createEmployee(loadEmployees(), employeeDraft(), SUPER_ADMIN);
  const second = createEmployee(
    first.employees,
    employeeDraft({ email: "asha.two@pratikshyafashon.in", firstName: "Anita" }),
    SUPER_ADMIN
  );
  assert.equal(second.ok, true);
  const ids = second.employees.map((employee) => employee.employeeId);
  assert.equal(new Set(ids).size, ids.length);
  const firstSequence = Number(first.employee.employeeId.split("-").at(-1));
  const secondSequence = Number(second.employee.employeeId.split("-").at(-1));
  assert.equal(secondSequence, firstSequence + 1);
});

test("5. Admin roles and employee-management permissions cannot be created through employee form data", () => {
  assert.equal(ROLE_OPTIONS.some((role) => ["ADMIN", "SUPER_ADMIN"].includes(role.id)), false);
  for (const role of ["ADMIN", "SUPER_ADMIN"]) {
    const validation = validateEmployeeDraft(employeeDraft({ role }), loadEmployees(), { isCreate: true });
    assert.equal(validation.ok, false);
    assert.match(validation.errors.role, /Admin identities/);
  }
  const grant = validateEmployeeDraft(
    employeeDraft({ permissions: [PERMISSIONS.EMPLOYEES_MANAGE], permissionMode: "custom" }),
    loadEmployees(),
    { isCreate: true }
  );
  assert.equal(grant.ok, false);
  assert.match(grant.errors.permissions, /cannot be assigned/);
});

test("6. Super Admin can edit an employee atomically", () => {
  const employees = loadEmployees();
  const result = updateEmployee(
    employees,
    ACTIVE_SALES.employeeId,
    { firstName: "Ananya-Rose", department: "BRIDAL", section: "BRIDAL_COUTURE" },
    SUPER_ADMIN
  );
  assert.equal(result.ok, true);
  assert.equal(result.employee.firstName, "Ananya-Rose");
  assert.equal(result.employee.department, "BRIDAL");
  assert.equal(result.employee.employeeId, ACTIVE_SALES.employeeId);
});

test("7. Super Admin can deactivate an employee without deleting the record", () => {
  const employees = loadEmployees();
  const result = deactivateEmployee(employees, ACTIVE_SALES.employeeId, SUPER_ADMIN);
  assert.equal(result.ok, true);
  assert.equal(result.employee.status, EMPLOYEE_STATUS.INACTIVE);
  assert.equal(result.employees.length, employees.length);
  assert.ok(getEmployee(result.employees, ACTIVE_SALES.employeeId));
});

test("8. Deactivated employee cannot login", () => {
  deactivateEmployee(loadEmployees(), ACTIVE_SALES.employeeId, SUPER_ADMIN);
  const login = verifyCredentials(ACTIVE_SALES.employeeId, ACTIVE_SALES_LOGIN.password);
  assert.equal(login.ok, false);
  assert.equal(login.code, EMPLOYEE_STATUS.INACTIVE);
});

test("9. Deactivated employee disappears from active assignment selectors", () => {
  const result = deactivateEmployee(loadEmployees(), ACTIVE_SALES.employeeId, SUPER_ADMIN);
  assert.equal(
    getActiveAssignmentEmployees(result.employees).some((employee) => employee.employeeId === ACTIVE_SALES.employeeId),
    false
  );
});

test("10. Reactivated employee can login again", () => {
  const inactive = deactivateEmployee(loadEmployees(), ACTIVE_SALES.employeeId, SUPER_ADMIN);
  const active = activateEmployee(inactive.employees, ACTIVE_SALES.employeeId, SUPER_ADMIN);
  assert.equal(active.ok, true);
  assert.equal(active.employee.status, EMPLOYEE_STATUS.ACTIVE);
  const login = verifyCredentials(ACTIVE_SALES.employeeId, ACTIVE_SALES_LOGIN.password);
  assert.equal(login.ok, true);
});

test("11. Existing employee records and immutable IDs remain intact across status changes", () => {
  const before = loadEmployees();
  const original = getEmployee(before, MANAGER.employeeId);
  const inactive = deactivateEmployee(before, MANAGER.employeeId, SUPER_ADMIN);
  const restored = activateEmployee(inactive.employees, MANAGER.employeeId, SUPER_ADMIN);
  assert.equal(restored.employees.length, before.length);
  assert.equal(restored.employee.id, original.id);
  assert.equal(restored.employee.employeeId, original.employeeId);
  assert.equal(restored.employee.createdAt, original.createdAt);
});

test("12. Product Review assignment still accepts active legitimate employees and rejects inactive ones", () => {
  const productId = canonicalProducts[0].id;
  const assigned = assignProductToEmployee(productId, MANAGER.employeeId, SUPER_ADMIN);
  assert.equal(assigned.ok, true);
  assignProductToEmployee(productId, null, SUPER_ADMIN);

  deactivateEmployee(loadEmployees(), MANAGER.employeeId, SUPER_ADMIN);
  const rejected = assignProductToEmployee(productId, MANAGER.employeeId, SUPER_ADMIN);
  assert.equal(rejected.ok, false);
  assert.match(rejected.error, /Only active employees/);
});

test("13. Admin identity remains Admin-only", () => {
  const employees = normaliseEmployees([
    ...INITIAL_EMPLOYEES,
    {
      id: "bad-admin",
      employeeId: "PF-ADM-00001",
      firstName: "Kavya",
      lastName: "Menon",
      email: SUPER_ADMIN.email,
      role: "SUPER_ADMIN",
    },
  ]);
  assert.equal(employees.some((employee) => employee.employeeId === SUPER_ADMIN.adminId), false);
  assert.equal(verifyCredentials(SUPER_ADMIN.adminId, "PF@Admin2026").ok, false);
});

test("14. No duplicate employee or cross-domain identity is created", () => {
  const employees = normaliseEmployees(INITIAL_EMPLOYEES);
  const ids = employees.map((employee) => employee.employeeId);
  const emails = employees.map((employee) => employee.email);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(new Set(emails).size, emails.length);
  assert.equal(ids.includes(SUPER_ADMIN.adminId), false);
  assert.equal(emails.includes(SUPER_ADMIN.email), false);
});

test("15. Employee Portal authentication remains functional", () => {
  const login = verifyCredentials(ACTIVE_SALES.employeeId, ACTIVE_SALES_LOGIN.password);
  assert.equal(login.ok, true);
  assert.equal(login.employee.employeeId, ACTIVE_SALES.employeeId);
  assert.equal(login.employee.role, ROLES.SALES_EXECUTIVE);
});
