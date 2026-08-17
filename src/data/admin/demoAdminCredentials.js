/**
 * PRATIKSHYA FASHON — Isolated DEMO admin credentials.
 *
 * FRONTEND DEMO ONLY. These are not production secrets and must never be
 * treated as such. They exist so the client preview can open the Admin
 * Portal without a backend.
 *
 * Never copy this table onto an admin profile record. Never log a password.
 */

export const DEMO_ADMIN_LOGINS = [
  {
    adminId: "PF-ADM-00001",
    email: "kavya.menon@pratikshyafashon.in",
    password: "PF@Admin2026",
    label: "Kavya Menon · Super Admin",
  },
];

export const findDemoAdminLogin = (identifier) => {
  const value = String(identifier || "").trim().toLowerCase();
  if (!value) return null;
  return (
    DEMO_ADMIN_LOGINS.find(
      (entry) =>
        entry.adminId.toLowerCase() === value || entry.email.toLowerCase() === value
    ) ?? null
  );
};

export default {
  DEMO_ADMIN_LOGINS,
  findDemoAdminLogin,
};
