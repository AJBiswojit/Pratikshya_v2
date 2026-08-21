/**
 * PRATIKSHYA FASHON — Default commerce values.
 *
 * The single authored default for shipping and payment *business* numbers.
 * Runtime authority is Admin Settings (`pratikshya_settings`) via
 * `readShippingRules` / `readPaymentRules`. UI metadata (method labels,
 * captions, demo payment scenarios) stays in `checkoutConfig.js`.
 */

export const SETTINGS_STORAGE_KEY = "pratikshya_settings";

export const COMMERCE_DEFAULTS = {
  freeShippingThreshold: 5000,
  defaultShippingFee: 99,
  expressDeliveryFee: 199,
  codFee: 49,
};

const asNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const readSettings = () => {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** Runtime shipping rules — settings win, defaults fill gaps. */
export const readShippingRules = () => {
  const shipping = readSettings()?.shipping;
  return {
    enabled: shipping?.enabled !== false,
    freeShippingThreshold: asNumber(
      shipping?.freeShippingThreshold,
      COMMERCE_DEFAULTS.freeShippingThreshold
    ),
    defaultShippingFee: asNumber(
      shipping?.defaultShippingFee,
      COMMERCE_DEFAULTS.defaultShippingFee
    ),
    expressDeliveryFee: asNumber(
      shipping?.expressDeliveryFee,
      COMMERCE_DEFAULTS.expressDeliveryFee
    ),
  };
};

/** Runtime payment rules — settings win, defaults fill gaps. */
export const readPaymentRules = () => {
  const payments = readSettings()?.payments;
  return {
    codFee: asNumber(payments?.codFee, COMMERCE_DEFAULTS.codFee),
  };
};

export default {
  SETTINGS_STORAGE_KEY,
  COMMERCE_DEFAULTS,
  readShippingRules,
  readPaymentRules,
};
