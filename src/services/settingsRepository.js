import { COMMERCE_DEFAULTS } from "../config/commerceDefaults";
import { readStorage, writeStorage } from "../utils/shopping";

export const SETTINGS_KEY = "pratikshya_settings";
const clone = (value) => JSON.parse(JSON.stringify(value));
export const SETTINGS_DEFAULTS = {
  business: { name: "PRATIKSHYA FASHON", legalName: "", tagline: "", description: "", email: "", phone: "", website: "", address: "", city: "", state: "", country: "India", postalCode: "", logoMediaId: "", faviconMediaId: "" },
  store: { name: "PRATIKSHYA FASHON", code: "PF-01", address: "", phone: "", email: "", status: "ACTIVE", openingTime: "09:30", closingTime: "18:30" },
  locations: { warehouseName: "", warehouseCode: "", warehouseAddress: "", warehouseStatus: "ACTIVE", warehouseOpeningTime: "09:30", warehouseClosingTime: "18:30", contactPerson: "", contactPhone: "" },
  hours: { days: [{ day: "Monday", open: "09:30", close: "18:30", active: true }, { day: "Tuesday", open: "09:30", close: "18:30", active: true }, { day: "Wednesday", open: "09:30", close: "18:30", active: true }, { day: "Thursday", open: "09:30", close: "18:30", active: true }, { day: "Friday", open: "09:30", close: "18:30", active: true }, { day: "Saturday", open: "09:30", close: "18:30", active: true }, { day: "Sunday", open: "09:30", close: "18:30", active: false }] },
  attendance: { workingStartTime: "09:30", workingEndTime: "18:30", lateThresholdMinutes: 10, minimumHalfDayMinutes: 240, fullDayMinutes: 540 },
  holidays: { items: [] },
  tax: { enabled: false, gstin: "", defaultRate: 0, cgst: 0, sgst: 0, igst: 0, mode: "EXCLUSIVE" },
  shipping: { enabled: true, defaultShippingFee: COMMERCE_DEFAULTS.defaultShippingFee, freeShippingThreshold: COMMERCE_DEFAULTS.freeShippingThreshold, expressDeliveryFee: COMMERCE_DEFAULTS.expressDeliveryFee, carriers: ["Delhivery", "Blue Dart", "DTDC", "India Post", "Store Delivery"], defaultCarrier: "Delhivery", estimatedDeliveryDays: 5 },
  payments: { refundMethod: "Original payment method", refundNote: "Demo configuration only; no payment is processed.", refundSla: "5–7 business days", partialRefundEnabled: true, codFee: COMMERCE_DEFAULTS.codFee },
  orders: { allowCancellation: true, cancellationWindowHours: 24, allowOrderEditing: false, autoExpiryHours: 24, paymentTimeoutMinutes: 15 },
  returns: { enabled: true, returnWindowDays: 7, exchangeEnabled: true, refundEnabled: true, pickupEnabled: true, inspectionRequired: true, restockingRule: "Inspect before restocking" },
  inventory: { defaultLowStockThreshold: 5, defaultReorderThreshold: 10, negativeStockAllowed: false, lowStockAlerts: true, outOfStockAlerts: true, overstockAlerts: false },
  employees: { idPrefix: "PF", defaultLocation: "", defaultDepartment: "", defaultRole: "", minimumPasswordLength: 8, requireUppercase: true, requireLowercase: true, requireNumber: true, requireSpecialCharacter: false, passwordExpiryDays: 30, inactiveBehavior: "Block sign in" },
  notifications: { order: ["IN_APP"], returns: ["IN_APP"], employee: ["IN_APP"], lowStock: ["IN_APP"], offers: ["IN_APP"], marketing: [] },
  customer: { supportPhone: "", supportEmail: "", returnPolicyReference: "", shippingInformation: "", businessHoursReference: "" },
  offers: { defaultDurationDays: 7, maximumCouponDiscount: 10000, defaultCustomerUsageLimit: 1, allowStacking: false },
  media: { maximumImageSizeMb: 10, maximumVideoSizeMb: 100, allowedImageFormats: "jpg,jpeg,png,webp,avif", allowedVideoFormats: "mp4,webm" },
};
const merge = (base, incoming) => Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value && typeof value === "object" && !Array.isArray(value) ? merge(value, incoming?.[key]) : incoming?.[key] ?? value]));
const migrated = () => { const legacy = readStorage("pratikshya_attendance_settings", null); const base = clone(SETTINGS_DEFAULTS); if (legacy && typeof legacy === "object") base.attendance = { ...base.attendance, ...legacy }; return base; };
export const getSettings = () => { try { const raw = localStorage.getItem(SETTINGS_KEY); if (!raw) { const value = migrated(); writeStorage(SETTINGS_KEY, value); return value; } const value = JSON.parse(raw); if (!value || typeof value !== "object") throw new Error("invalid"); return merge(SETTINGS_DEFAULTS, value); } catch { const value = migrated(); writeStorage(SETTINGS_KEY, value); return value; } };
export const getSection = (section) => getSettings()[section] ? clone(getSettings()[section]) : null;
export const updateSection = (section, values) => { if (!SETTINGS_DEFAULTS[section]) throw new Error("Unknown settings section"); const all = getSettings(); all[section] = merge(SETTINGS_DEFAULTS[section], values); writeStorage(SETTINGS_KEY, all); return clone(all[section]); };
export const updateSetting = (section, key, value) => updateSection(section, { [key]: value });
export const resetSection = (section) => updateSection(section, clone(SETTINGS_DEFAULTS[section]));
export const resetToDefaults = () => { const value = clone(SETTINGS_DEFAULTS); writeStorage(SETTINGS_KEY, value); return value; };
export default { getSettings, getSection, updateSection, updateSetting, resetSection, resetToDefaults };
