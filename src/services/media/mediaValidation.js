/**
 * PRATIKSHYA FASHON — Managed media validation.
 *
 * Read-only checks over the live register. Nothing here writes, and
 * nothing is deleted. The admin library and the test suite both read
 * `validateMedia()`.
 */

import {
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
  USAGE_ROLES,
  isValidUsageRole,
} from "../../config/mediaTypes";
import { getAll } from "./mediaRepository";

const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".avif", ".gif"];

const extensionOf = (url) => {
  const clean = String(url || "").split("?")[0].toLowerCase();
  const match = clean.match(/(\.[a-z0-9]+)$/);
  return match ? match[1] : "";
};

const issue = (code, media, message) => ({
  code,
  mediaId: media?.id || null,
  path: media?.optimizedPath || media?.originalPath || media?.url || null,
  message,
});

export const validateMediaRecord = (media) => {
  const issues = [];
  if (!media?.id) {
    issues.push(issue("ORPHAN", media, "Record is missing an id."));
    return issues;
  }
  if (!media.url && !media.demoPlaceholder) {
    issues.push(issue("MISSING_FILE", media, "Record has no url."));
  }
  if (media.broken) {
    issues.push(issue("BROKEN_PATH", media, "This media record is marked as unreadable."));
  }
  if (media.duplicateStatus === "DUPLICATE") {
    issues.push(issue("DUPLICATE", media, `Exact duplicate of ${media.duplicateOf || "another asset"}.`));
  }
  if (media.duplicateStatus === "POSSIBLE_DUPLICATE") {
    issues.push(issue("POSSIBLE_DUPLICATE", media, `Possible duplicate of ${media.duplicateOf || "another asset"}.`));
  }
  if (media.scope === "PRODUCT" && !media.productId) {
    issues.push(issue("MISSING_PRODUCT", media, "Product scope without a productId."));
  }
  if (media.mappingStatus === "UNMAPPED") {
    issues.push(issue("MISSING_TAXONOMY", media, "Asset could not be mapped to taxonomy."));
  }
  (media.usageRoles || []).forEach((role) => {
    if (!isValidUsageRole(role)) {
      issues.push(issue("INVALID_USAGE_ROLE", media, `Unknown usage role ${role}.`));
    }
  });
  if (media.type === MEDIA_TYPES.IMAGE && media.url && !media.url.startsWith("http")) {
    const ext = extensionOf(media.url);
    if (ext && !IMAGE_EXTENSIONS.includes(ext)) {
      issues.push(issue("UNSUPPORTED_EXTENSION", media, `Unsupported extension ${ext}.`));
    }
  }
  if (media.large) {
    issues.push(issue("LARGE_FILE", media, "Original file exceeds the large-file threshold."));
  }
  if (media.lowResolution) {
    issues.push(issue("LOW_RESOLUTION", media, "Asset is below 400px wide."));
  }
  if (media.role && !Object.values(PRODUCT_MEDIA_ROLES).includes(media.role)) {
    issues.push(issue("INVALID_MEDIA_REFERENCE", media, `Unknown product role ${media.role}.`));
  }
  if (media.status && !Object.values(MEDIA_STATUS).includes(media.status)) {
    issues.push(issue("INVALID_MEDIA_REFERENCE", media, `Unknown status ${media.status}.`));
  }
  if ((media.usageRoles || []).includes(USAGE_ROLES.AI_MIRROR)) {
    const excluded = ["jewellery", "bangles", "dupattas", "innerwear"];
    if (excluded.includes(media.categoryId)) {
      issues.push(issue("INVALID_USAGE_ROLE", media, "AI Mirror role on an ineligible category."));
    }
  }
  return issues;
};

export const validateMedia = (items = getAll()) => {
  const list = Array.isArray(items) ? items : [];
  const issues = list.flatMap(validateMediaRecord);
  const ids = new Set();
  list.forEach((item) => {
    if (!item?.id) return;
    if (ids.has(item.id)) {
      issues.push(issue("ORPHAN", item, "Duplicate media id in the register."));
    }
    ids.add(item.id);
  });

  const byCode = issues.reduce((acc, entry) => {
    acc[entry.code] = (acc[entry.code] || 0) + 1;
    return acc;
  }, {});

  return {
    total: list.length,
    issueCount: issues.length,
    byCode,
    issues,
    ok: issues.filter((entry) =>
      ["MISSING_FILE", "BROKEN_PATH", "ORPHAN", "INVALID_USAGE_ROLE", "UNSUPPORTED_EXTENSION"].includes(
        entry.code
      )
    ).length === 0,
  };
};

export default { validateMedia, validateMediaRecord };
