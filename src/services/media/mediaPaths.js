/** Canonical media-path helpers. Path normalization never infers ownership. */
export const CANONICAL_MEDIA_ROOT = "/images/products";
export const CANONICAL_PRODUCT_MEDIA_ROOT = CANONICAL_MEDIA_ROOT;

export const normalizeMediaPath = (value) =>
  String(value || "")
    .trim()
    .split("?")[0]
    .split("#")[0]
    .replace(/^\/+/, "/");

/** Preserve authored, uploaded, remote, blob, and data URLs verbatim. */
export const resolveMediaUrl = (value) =>
  typeof value === "string" ? value.trim() : "";

export const isCanonicalMediaUrl = (value) => {
  const path = normalizeMediaPath(value).toLowerCase();
  return path === CANONICAL_MEDIA_ROOT || path.startsWith(`${CANONICAL_MEDIA_ROOT}/`);
};
