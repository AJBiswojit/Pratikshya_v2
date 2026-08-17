/**
 * PRATIKSHYA FASHON — Mock employee credential helpers.
 *
 * DEMO / FRONTEND ONLY.
 *
 * Temporary passwords look like `PF@7Kx92`. They are shown once at
 * creation or reset and are never stored on the employee profile.
 *
 * The fingerprint below is a reversible-enough demo token for matching
 * credentials in the browser. It is NOT cryptographic, NOT a hash, and
 * MUST be replaced by a real backend before any production use.
 */

const AMBIGUOUS = /[0OIl1]/g;
const POOL = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export const TEMP_PASSWORD_PATTERN = /^PF@[A-Za-z0-9]{5}$/;

const randomChar = () => POOL[Math.floor(Math.random() * POOL.length)];

/** Demo temporary password. Format: PF@ + 5 unambiguous characters. */
export const generateTemporaryPassword = () => {
  let body = "";
  for (let index = 0; index < 5; index += 1) {
    body += randomChar();
  }
  return `PF@${body.replace(AMBIGUOUS, "K")}`;
};

export const isTemporaryPasswordFormat = (value) =>
  typeof value === "string" && TEMP_PASSWORD_PATTERN.test(value);

/**
 * Demo-only credential fingerprint.
 *
 * Isolated from the employee profile. Never log the input. Never claim
 * this is production-secure.
 */
export const mockCredentialFingerprint = (employeeId, password) => {
  const raw = `pf-demo::${String(employeeId || "").trim().toUpperCase()}::${String(password || "")}`;
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `demo:${(hash >>> 0).toString(16).padStart(8, "0")}`;
};

export const validateEmployeePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { ok: false, message: "Password is required." };
  }
  if (password.length < 8) {
    return { ok: false, message: "Password must be at least 8 characters." };
  }
  return { ok: true, message: "" };
};

export const validateEmployeePasswordChange = ({
  currentPassword,
  newPassword,
  confirmPassword,
}) => {
  if (!currentPassword) {
    return { ok: false, message: "Current password is required." };
  }
  const next = validateEmployeePassword(newPassword);
  if (!next.ok) return next;
  if (newPassword !== confirmPassword) {
    return { ok: false, message: "New password and confirmation do not match." };
  }
  if (newPassword === currentPassword) {
    return { ok: false, message: "New password must be different from the current password." };
  }
  return { ok: true, message: "" };
};

export default {
  TEMP_PASSWORD_PATTERN,
  generateTemporaryPassword,
  isTemporaryPasswordFormat,
  mockCredentialFingerprint,
  validateEmployeePassword,
  validateEmployeePasswordChange,
};
