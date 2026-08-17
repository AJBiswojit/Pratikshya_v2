/**
 * PRATIKSHYA FASHON — Namespaced admin storage keys.
 *
 * Kept deliberately apart from `pratikshya_employee_*` and the customer
 * keys so no portal can ever read another portal's session.
 */

export const ADMIN_STORAGE_KEYS = {
  ADMINS: "pratikshya_admins",
  CREDENTIALS: "pratikshya_admin_credentials",
  AUTH: "pratikshya_admin_auth",
};

export default ADMIN_STORAGE_KEYS;
