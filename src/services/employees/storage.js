/**
 * PRATIKSHYA FASHON — Namespaced employee storage keys.
 *
 * Employee data is isolated from customer auth, bag and order storage.
 * Credentials never live on the employee profile record.
 */

export const EMPLOYEE_STORAGE_KEYS = {
  EMPLOYEES: "pratikshya_employees",
  CREDENTIALS: "pratikshya_employee_credentials",
  AUTH: "pratikshya_employee_auth",
  ACTIVITY: "pratikshya_employee_activity",
  ATTENDANCE: "pratikshya_employee_attendance",
  ASSISTED_ORDERS: "pratikshya_employee_assisted_orders",
};

export default EMPLOYEE_STORAGE_KEYS;
