/**
 * PRATIKSHYA FASHON — Admin session service.
 *
 *   AdminAuthContext → adminAuthService → mock admin identity   (now)
 *   AdminAuthContext → adminAuthService → admin API             (later)
 *
 * DEMO AUTHENTICATION. The credential fingerprint below is the same
 * non-cryptographic demo token the employee portal uses; it is not a hash
 * and must be replaced by a real backend before any production use.
 *
 * Credentials are stored in their own table and never written onto the
 * admin profile. Corrupted storage is treated as signed-out, never as a
 * crash.
 */

import { ADMIN_STATUS, canAdminSignIn, isAdminRole } from "../../config/adminAccess";
import { INITIAL_ADMINS } from "../../data/admin/adminAccounts";
import { DEMO_ADMIN_LOGINS } from "../../data/admin/demoAdminCredentials";
import { mockCredentialFingerprint } from "../employees/employeePassword";
import { readStorage, writeStorage } from "../../utils/shopping";
import { ADMIN_STORAGE_KEYS } from "./storage";

const emptySession = () => ({ admin: null, isAuthenticated: false });

/** Profile shape — never carries a password or fingerprint. */
export const toPublicAdmin = (raw) => {
  if (!raw || typeof raw !== "object" || !raw.adminId) return null;
  return {
    id: String(raw.id || raw.adminId),
    adminId: String(raw.adminId).toUpperCase(),
    name: String(raw.name || "Administrator"),
    email: String(raw.email || "").toLowerCase(),
    phone: raw.phone || "",
    avatar: raw.avatar ?? null,
    role: isAdminRole(raw.role) ? raw.role : null,
    status: raw.status === ADMIN_STATUS.SUSPENDED ? ADMIN_STATUS.SUSPENDED : ADMIN_STATUS.ACTIVE,
    title: raw.title || "Business Operations",
    lastLogin: raw.lastLogin ?? null,
    createdAt: raw.createdAt || new Date().toISOString(),
  };
};

export const loadAdmins = () => {
  const stored = readStorage(ADMIN_STORAGE_KEYS.ADMINS, null);
  const list = Array.isArray(stored) && stored.length > 0 ? stored : INITIAL_ADMINS;
  const admins = list.map(toPublicAdmin).filter(Boolean);
  if (!Array.isArray(stored) || stored.length === 0) {
    writeStorage(ADMIN_STORAGE_KEYS.ADMINS, admins);
  }
  return admins;
};

export const saveAdmins = (admins) => {
  writeStorage(
    ADMIN_STORAGE_KEYS.ADMINS,
    (Array.isArray(admins) ? admins : []).map(toPublicAdmin).filter(Boolean)
  );
};

/** Isolated demo credential table, seeded once per browser. */
export const loadAdminCredentials = () => {
  const stored = readStorage(ADMIN_STORAGE_KEYS.CREDENTIALS, null);
  if (stored && typeof stored === "object" && Object.keys(stored).length > 0) {
    return stored;
  }
  const seeded = {};
  DEMO_ADMIN_LOGINS.forEach((entry) => {
    seeded[entry.adminId] = {
      adminId: entry.adminId,
      fingerprint: mockCredentialFingerprint(entry.adminId, entry.password),
      updatedAt: new Date().toISOString(),
    };
  });
  writeStorage(ADMIN_STORAGE_KEYS.CREDENTIALS, seeded);
  return seeded;
};

export const ensureAdminSeeded = () => {
  const admins = loadAdmins();
  loadAdminCredentials();
  return admins;
};

/** Accepts either the admin ID or the admin email address. */
export const findAdmin = (admins, identifier) => {
  const value = String(identifier || "").trim().toLowerCase();
  if (!value) return null;
  return (
    admins.find(
      (admin) => admin.adminId.toLowerCase() === value || admin.email.toLowerCase() === value
    ) ?? null
  );
};

export const readAdminSessionRecord = () => {
  const stored = readStorage(ADMIN_STORAGE_KEYS.AUTH, null);
  if (!stored || typeof stored !== "object" || !stored.adminId) return null;
  return {
    adminId: String(stored.adminId),
    sessionAt: stored.sessionAt || Date.now(),
  };
};

export const writeAdminSessionRecord = (adminId) => {
  if (!adminId) {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(ADMIN_STORAGE_KEYS.AUTH);
      }
    } catch {
      // Persistence is an enhancement, never a dependency.
    }
    return;
  }
  writeStorage(ADMIN_STORAGE_KEYS.AUTH, { adminId, sessionAt: Date.now() });
};

export const restoreAdminSession = () => {
  ensureAdminSeeded();
  const record = readAdminSessionRecord();
  if (!record) return emptySession();

  const admin = findAdmin(loadAdmins(), record.adminId);
  if (!admin || !canAdminSignIn(admin.status)) {
    writeAdminSessionRecord(null);
    return emptySession();
  }
  return { admin, isAuthenticated: true };
};

export const markAdminLastLogin = (adminId, at = new Date().toISOString()) => {
  const admins = loadAdmins();
  const current = findAdmin(admins, adminId);
  if (!current) return null;
  const next = toPublicAdmin({ ...current, lastLogin: at });
  saveAdmins(admins.map((admin) => (admin.adminId === next.adminId ? next : admin)));
  return next;
};

export const verifyAdminCredentials = (identifier, password) => {
  ensureAdminSeeded();
  if (!String(identifier || "").trim() || !password) {
    return { ok: false, error: "Enter your admin ID and password." };
  }

  const admin = findAdmin(loadAdmins(), identifier);
  if (!admin) {
    return { ok: false, error: "Admin ID or password is not correct." };
  }
  if (!canAdminSignIn(admin.status)) {
    return {
      ok: false,
      error: "This administrator account cannot sign in. Please contact the account owner.",
    };
  }

  const credentials = loadAdminCredentials();
  const record = credentials[admin.adminId];
  if (!record) {
    return { ok: false, error: "This account has no credentials issued." };
  }
  if (record.fingerprint !== mockCredentialFingerprint(admin.adminId, password)) {
    return { ok: false, error: "Admin ID or password is not correct." };
  }
  return { ok: true, admin, error: "" };
};

export const signInAdmin = async ({ adminId, password }) => {
  await new Promise((resolve) => setTimeout(resolve, 320));
  const result = verifyAdminCredentials(adminId, password);
  if (!result.ok) return { ok: false, admin: null, error: result.error };

  const stamped = markAdminLastLogin(result.admin.adminId) ?? result.admin;
  writeAdminSessionRecord(stamped.adminId);
  return { ok: true, admin: stamped, error: "" };
};

export const signOutAdmin = () => {
  writeAdminSessionRecord(null);
};

export const refreshAdminSession = () => restoreAdminSession();

/**
 * Safe profile edits only. Admin ID, role and status are deliberately not
 * editable through the profile surface.
 */
export const updateAdminProfile = (adminId, patch = {}) => {
  const admins = loadAdmins();
  const current = findAdmin(admins, adminId);
  if (!current) return { ok: false, error: "Administrator not found.", admin: null };

  const name = String(patch.name ?? current.name).trim();
  const email = String(patch.email ?? current.email).trim().toLowerCase();
  if (!name) return { ok: false, error: "Name is required.", admin: current };
  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email address.", admin: current };
  }

  const next = toPublicAdmin({
    ...current,
    name,
    email,
    phone: patch.phone ?? current.phone,
    title: patch.title ?? current.title,
  });
  saveAdmins(admins.map((admin) => (admin.adminId === next.adminId ? next : admin)));
  return { ok: true, admin: next, error: "" };
};

export default {
  toPublicAdmin,
  loadAdmins,
  saveAdmins,
  loadAdminCredentials,
  ensureAdminSeeded,
  findAdmin,
  readAdminSessionRecord,
  writeAdminSessionRecord,
  restoreAdminSession,
  markAdminLastLogin,
  verifyAdminCredentials,
  signInAdmin,
  signOutAdmin,
  refreshAdminSession,
  updateAdminProfile,
};
