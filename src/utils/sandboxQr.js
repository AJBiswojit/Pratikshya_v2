/**
 * PRATIKSHYA FASHON — Sandbox QR payload.
 *
 * The Sandbox QR payment panel (see `components/checkout/PaymentStep.jsx`)
 * encodes a JSON payload describing the current sandbox transaction so a
 * generic QR scanner can read it back as a structured object.
 *
 * No real payment credentials are ever encoded. The fields listed below are
 * the safe, non-sensitive parts of the existing payment / order context:
 *
 *   - env         : always "sandbox"; makes it explicit a real gateway is
 *                   not involved.
 *   - merchant    : "PRATIKSHYA FASHON" (house name, not a secret).
 *   - reference   : the PRATIKSHYA order id (e.g. "OPT-20260818-0007"), or
 *                   "PREVIEW" while the order has not been placed yet.
 *   - session     : the payment-service session id, when started.
 *   - amount      : the live checkout total in paise (integer) and rupees.
 *   - currency    : "INR".
 *   - payment     : the payment method id ("qr").
 *   - issuedAt    : the ISO timestamp the QR was generated.
 *
 * Anything sensitive — card numbers, CVV, OTP, API keys, customer
 * authentication tokens — is never part of the order or payment context
 * and is therefore never present in the QR.
 */

import QRCode from "qrcode";

export const SANDBOX_QR_ENV = "sandbox";
export const SANDBOX_MERCHANT_NAME = "PRATIKSHYA FASHON";
export const SANDBOX_CURRENCY = "INR";

/**
 * Build the sandbox-safe payload from the current checkout context.
 * Pure function — easy to unit test.
 */
export function buildSandboxQrPayload({
  reference = null,
  session = null,
  amount = 0,
  payment = "qr",
  issuedAt = new Date(),
} = {}) {
  const numericAmount =
    typeof amount === "number"
      ? amount
      : Number(amount?.total ?? 0);
  const safeReference =
    typeof reference === "string" && reference.length > 0
      ? reference
      : `PREVIEW-${(session || "").slice(-6) || Math.floor(Math.random() * 1e6).toString(36)}`;

  return {
    env: SANDBOX_QR_ENV,
    merchant: SANDBOX_MERCHANT_NAME,
    reference: safeReference,
    session: session ?? null,
    amount: {
      currency: SANDBOX_CURRENCY,
      value: Math.round(numericAmount * 100) / 100,
    },
    payment,
    issuedAt: issuedAt instanceof Date ? issuedAt.toISOString() : new Date(issuedAt).toISOString(),
  };
}

/** Render the payload as a compact JSON string suitable for QR encoding. */
export function serialiseSandboxQrPayload(payload) {
  const ordered = {
    env: payload.env,
    merchant: payload.merchant,
    reference: payload.reference,
    session: payload.session,
    amount: payload.amount,
    payment: payload.payment,
    issuedAt: payload.issuedAt,
  };
  return JSON.stringify(ordered);
}

/**
 * Generate a scannable QR code as an SVG string for the supplied payload.
 * Returns the generated SVG; callers can inline it via
 * `dangerouslySetInnerHTML`. Errors resolve to `null` so the UI can render
 * a graceful fallback instead of throwing.
 */
export async function generateSandboxQrSvg(payload, options = {}) {
  const text = serialiseSandboxQrPayload(payload);
  try {
    const svg = await QRCode.toString(text, {
      type: "svg",
      margin: options.margin ?? 1,
      errorCorrectionLevel: options.errorCorrectionLevel ?? "M",
      color: {
        dark: options.darkColor ?? "#1a1a1a",
        light: options.lightColor ?? "#ffffff",
      },
      width: options.width ?? 240,
    });
    return svg;
  } catch (error) {
    if (typeof console !== "undefined") {
      console.warn("Sandbox QR generation failed:", error);
    }
    return null;
  }
}

export default {
  SANDBOX_QR_ENV,
  SANDBOX_MERCHANT_NAME,
  SANDBOX_CURRENCY,
  buildSandboxQrPayload,
  serialiseSandboxQrPayload,
  generateSandboxQrSvg,
};
