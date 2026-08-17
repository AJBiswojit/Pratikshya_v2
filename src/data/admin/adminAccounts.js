/**
 * PRATIKSHYA FASHON — Admin identity (DEMO).
 *
 * Profile data only. Passwords are never stored on this record — the
 * isolated demo credential table lives beside it in `demoAdminCredentials`
 * and is fingerprinted at seed time, exactly as the employee system does.
 */

import { ADMIN_ROLES, ADMIN_STATUS } from "../../config/adminAccess";

export const INITIAL_ADMINS = [
  {
    id: "adm-01",
    adminId: "PF-ADM-00001",
    name: "Kavya Menon",
    email: "kavya.menon@pratikshyafashon.in",
    phone: "+91 98100 11001",
    avatar: null,
    role: ADMIN_ROLES.SUPER_ADMIN,
    status: ADMIN_STATUS.ACTIVE,
    title: "Head of Business Operations",
    lastLogin: "2026-08-11T08:10:00.000Z",
    createdAt: "2022-04-04T09:00:00.000Z",
  },
];

export default INITIAL_ADMINS;
