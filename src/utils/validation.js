/**
 * PRATIKSHYA FASHON — Validation Utilities
 *
 * Centralized form validation rules and safe redirect sanitization.
 * Used across Sign In, Sign Up, Profile, and Address forms.
 */

/** Validates email format */
export const isValidEmail = (email) => {
  if (typeof email !== "string") return false;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
};

/** Validates Indian phone number (10 digits, optional +91 or 0 prefix) */
export const isValidPhone = (phone) => {
  if (typeof phone !== "string") return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  // Accepts 10 digits starting with 6-9, or prefixed with +91 or 0
  return /^(?:\+91|0)?[6-9]\d{9}$/.test(cleaned);
};

/** Standardizes phone display to +91 XXXXX XXXXX format */
export const formatPhone = (phone) => {
  if (!phone || typeof phone !== "string") return "";
  const digits = phone.replace(/\D/g, "");
  const last10 = digits.slice(-10);
  if (last10.length === 10) {
    return `+91 ${last10.slice(0, 5)} ${last10.slice(5)}`;
  }
  return phone;
};

/** Validates 6-digit Indian postal pincode */
export const isValidPincode = (pincode) => {
  if (typeof pincode !== "string") return false;
  const trimmed = pincode.trim();
  return /^[1-9][0-9]{5}$/.test(trimmed);
};

/**
 * Validates password strength for mock auth.
 * Requires at least 6 characters.
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== "string") {
    return { ok: false, message: "Password is required." };
  }
  if (password.length < 6) {
    return { ok: false, message: "Password must be at least 6 characters." };
  }
  return { ok: true, message: "" };
};

/**
 * Validates password and confirm password match.
 */
export const validatePasswordMatch = (password, confirmPassword) => {
  const pwdVal = validatePassword(password);
  if (!pwdVal.ok) return pwdVal;
  if (password !== confirmPassword) {
    return { ok: false, message: "Passwords do not match." };
  }
  return { ok: true, message: "" };
};

/**
 * Validates sign-in identifier (either email or phone).
 */
export const isValidIdentifier = (identifier) => {
  if (!identifier || typeof identifier !== "string") return false;
  const trimmed = identifier.trim();
  return isValidEmail(trimmed) || isValidPhone(trimmed);
};

/**
 * Sanitizes return URL to prevent open redirect vulnerabilities.
 * Only allows relative paths starting with a single '/' (not '//' or external URLs).
 */
export const sanitizeReturnUrl = (url, fallback = "/account") => {
  if (!url || typeof url !== "string") return fallback;
  const trimmed = url.trim();

  // Disallow external URLs, protocol-relative URLs, javascript:, etc.
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("javascript:") ||
    trimmed.startsWith("data:") ||
    !trimmed.startsWith("/")
  ) {
    return fallback;
  }

  // Avoid redirecting back to auth pages
  if (
    trimmed.startsWith("/signin") ||
    trimmed.startsWith("/signup") ||
    trimmed.startsWith("/forgot-password") ||
    trimmed.startsWith("/reset-password")
  ) {
    return fallback;
  }

  return trimmed;
};

export default {
  isValidEmail,
  isValidPhone,
  formatPhone,
  isValidPincode,
  validatePassword,
  validatePasswordMatch,
  isValidIdentifier,
  sanitizeReturnUrl,
};
