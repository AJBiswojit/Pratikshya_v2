/**
 * PRATIKSHYA FASHON — Admin presentation helpers.
 *
 * Pure formatting for the Admin Portal. No storage, no authorization.
 * Currency goes through `formatINR` so the whole product prints rupees the
 * same way; the compact form below is only for dense operational tiles.
 */

import { formatINR } from "./shopping";

export const adminInitials = (admin) => {
  const parts = String(admin?.name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "PF";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return `${first}${last}`.toUpperCase() || "PF";
};

/**
 * Indian short-scale currency for dense tiles: ₹1.24 L, ₹18.4 L, ₹1.2 Cr.
 * Anything under a lakh prints in full.
 */
export const formatCompactINR = (value) => {
  const amount = Math.round(Number(value) || 0);
  if (Math.abs(amount) >= 10000000) {
    return `₹${(amount / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
  }
  if (Math.abs(amount) >= 100000) {
    return `₹${(amount / 100000).toFixed(2).replace(/\.00$/, "")} L`;
  }
  return formatINR(amount);
};

export const formatAdminNumber = (value) => Number(value || 0).toLocaleString("en-IN");

export const formatAdminDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

export const formatAdminDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  const day = date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${day} · ${time}`;
};

export const greetingForAdmin = (date = new Date()) => {
  const hours = date.getHours();
  if (hours < 12) return "Good morning";
  if (hours < 17) return "Good afternoon";
  return "Good evening";
};

/** First name only — used in the dashboard greeting. */
export const adminFirstName = (admin) =>
  String(admin?.name || "").trim().split(/\s+/)[0] || "Administrator";

export default {
  adminInitials,
  formatCompactINR,
  formatAdminNumber,
  formatAdminDate,
  formatAdminDateTime,
  greetingForAdmin,
  adminFirstName,
};
