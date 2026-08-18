/**
 * PRATIKSHYA FASHON — Demo upload validation.
 *
 * Format rules live in `config/mediaTypes` (`UPLOAD_RULES`). This module
 * applies them to a chosen File so the dropzone and the marketing panel
 * cannot drift apart.
 */

import { MEDIA_TYPES, UPLOAD_RULES, formatFileSize, isAllowedUploadFormat } from "../../config/mediaTypes";

export const extensionOf = (name = "") => {
  const dot = name.lastIndexOf(".");
  return dot < 0 ? "" : name.slice(dot).toLowerCase();
};

/** IMAGE or VIDEO from MIME type or file extension. */
export const typeOfFile = (file) => {
  if (file.type?.startsWith("video/")) return MEDIA_TYPES.VIDEO;
  if (file.type?.startsWith("image/")) return MEDIA_TYPES.IMAGE;
  return UPLOAD_RULES[MEDIA_TYPES.VIDEO].extensions.includes(extensionOf(file.name))
    ? MEDIA_TYPES.VIDEO
    : MEDIA_TYPES.IMAGE;
};

/** Validate file against house size and format rules. */
export const validateFile = (file) => {
  const type = typeOfFile(file);
  const rules = UPLOAD_RULES[type];
  const extension = extensionOf(file.name);

  if (!isAllowedUploadFormat(file, type)) {
    return {
      ok: false,
      error: `"${file.name}" has unsupported format ${extension || file.type || "unknown"}. Allowed: ${rules.extensions.join(", ")}.`,
    };
  }
  if (file.size > rules.maxBytes) {
    return {
      ok: false,
      error: `"${file.name}" is ${formatFileSize(file.size)} — maximum allowed size is ${rules.maxLabel}.`,
    };
  }
  return { ok: true, type };
};

export default { extensionOf, typeOfFile, validateFile };
