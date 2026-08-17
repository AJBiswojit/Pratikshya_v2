/** Media path boundary after the complete media reset. */
export const CANONICAL_MEDIA_ROOT = "/library";
export const HOUSE_PLATE_PREFIX = "house-";
export const HOUSE_PLATE_MIGRATION = [];

export const normalizeMediaPath = (value) => String(value || "").split("?")[0].split("#")[0].replace(/^\/+/, "").toLowerCase();
export const resolveLegacyMediaUrl = (value) => (typeof value === "string" ? value.trim() : "");
export const resolveHousePlateUrl = () => "";
export const isIngestedPhotographyUrl = () => false;
export const isLegacyMediaUrl = () => false;
