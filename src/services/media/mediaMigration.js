/**
 * PRATIKSHYA FASHON — Media migration & validation (Phase 21.6).
 *
 * Handles:
 * - Migration manifest old→new
 * - Physical file verification
 * - Group detection reporting
 * - Product mapping confidence
 *
 * Idempotent — repeated runs must not duplicate.
 */

import { parseMediaFilename, getViewOrderScore } from "./mediaNaming.js";
import { buildMediaGroups } from "./mediaGroups.js";
import {
  HOUSE_PLATE_MIGRATION,
  lookupLegacyMedia,
  resolveLegacyMediaUrl,
} from "./mediaPaths.js";

export const MIGRATION_STATUS = {
  MIGRATED: "MIGRATED",
  ALREADY_CURRENT: "ALREADY_CURRENT",
  MISSING: "MISSING",
  AMBIGUOUS: "AMBIGUOUS",
  UNMAPPED: "UNMAPPED",
};

/**
 * Build migration mapping from old manifest assets to new library files.
 * oldAssets: array from ingestedManifest.json (optimizedPath library/...)
 * newFileNames: array of filenames present in public/library (e.g., women-saree-...)
 */
export const buildMigrationManifest = ({ oldAssets = [], newFileNames = [] }) => {
  const newSet = new Set((newFileNames || []).map((n) => String(n).toLowerCase()));
  const newParsed = (newFileNames || []).map((n) => parseMediaFilename(n)).filter(Boolean);

  // map old base -> candidates
  const entries = [];

  // Group new files by base prefix for quick lookup
  const newByBase = new Map();
  newParsed.forEach((parsed) => {
    const baseWithoutView = parsed.groupKey; // e.g., women-saree-banarasi-001
    if (!newByBase.has(baseWithoutView)) newByBase.set(baseWithoutView, []);
    newByBase.get(baseWithoutView).push(parsed);
    // also map exact filename
    if (!newByBase.has(parsed.fileName)) newByBase.set(parsed.fileName.replace(/\.[a-z0-9]+$/i, ""), []);
  });

  // For each old asset, attempt mapping
  oldAssets.forEach((asset) => {
    const oldPath = asset.optimizedPath || asset.currentFilename || "";
    const oldFileName = (asset.currentFilename || oldPath.split("/").pop() || "").toLowerCase();
    const oldBase = oldFileName.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
    const oldRole = asset.role || null;
    const oldSort = Number(asset.sortOrder) || 0;

    // exact match
    if (newSet.has(oldFileName)) {
      entries.push({
        oldPath: `library/${oldFileName}`,
        newPath: `library/${oldFileName}`,
        status: MIGRATION_STATUS.ALREADY_CURRENT,
        assetId: asset.id,
        productId: asset.productId || null,
        note: "Already points to current file",
      });
      return;
    }

    // find candidates that start with oldBase + '-'
    const candidates = (newFileNames || []).filter((nf) => {
      const lower = nf.toLowerCase();
      return lower.startsWith(`${oldBase}-`);
    });

    if (candidates.length === 0) {
      // maybe old 001 maps to new 001-front but oldBase is 001, new groupKey is 001? Actually candidates includes those.
      // try grouping via productId mapping if available — we will handle outside
      entries.push({
        oldPath: `library/${oldFileName}`,
        newPath: null,
        status: MIGRATION_STATUS.MISSING,
        assetId: asset.id,
        productId: asset.productId || null,
        note: "No matching renamed file found",
      });
      return;
    }

    if (candidates.length === 1) {
      entries.push({
        oldPath: `library/${oldFileName}`,
        newPath: `library/${candidates[0].toLowerCase()}`,
        status: MIGRATION_STATUS.MIGRATED,
        assetId: asset.id,
        productId: asset.productId || null,
        note: `Renamed to ${candidates[0]}`,
      });
      return;
    }

    // multiple candidates — ambiguous but choose best by role
    const sortedCandidates = [...candidates].sort((a, b) => {
      const pa = parseMediaFilename(a);
      const pb = parseMediaFilename(b);
      const sa = getViewOrderScore(pa?.view);
      const sb = getViewOrderScore(pb?.view);
      if (sa !== sb) return sa - sb;
      return a.localeCompare(b);
    });

    let chosen = null;
    if (oldRole === "COVER") {
      chosen = sortedCandidates.find((c) => c.toLowerCase().includes("front")) || sortedCandidates[0];
    } else {
      // for gallery, pick by sort order modulo candidates length
      const index = Math.min(oldSort, sortedCandidates.length - 1);
      chosen = sortedCandidates[index] || sortedCandidates[0];
    }

    entries.push({
      oldPath: `library/${oldFileName}`,
      newPath: `library/${chosen.toLowerCase()}`,
      status: candidates.length > 1 ? MIGRATION_STATUS.MIGRATED : MIGRATION_STATUS.MIGRATED,
      assetId: asset.id,
      productId: asset.productId || null,
      note: candidates.length > 1 ? `Multiple candidates, chose ${chosen} by role ${oldRole}` : `Renamed`,
      candidates: candidates.map((c) => `library/${c}`),
    });
  });

  return entries;
};

/**
 * Verify physical files for a list of media records.
 * records expected to have url / optimizedPath / currentFilename
 * existingFileSet: set of filenames present in public/library (lowercase)
 */
export const verifyPhysicalFiles = ({ records = [], existingFileSet = null }) => {
  const fileSet = existingFileSet
    ? new Set([...existingFileSet].map((f) => String(f).toLowerCase()))
    : null;

  let total = records.length;
  let valid = 0;
  let missing = 0;
  let broken = 0;
  const missingFiles = [];
  const validFiles = [];
  const brokenRefs = [];

  records.forEach((rec) => {
    const url = rec.url || rec.optimizedPath || rec.currentFilename || "";
    const fileName = url.split("/").pop().toLowerCase();
    if (!fileName) {
      missing++;
      missingFiles.push({ record: rec, fileName: "(empty)" });
      return;
    }
    if (rec.broken) {
      broken++;
      brokenRefs.push(rec);
      return;
    }
    if (fileSet) {
      if (fileSet.has(fileName) || fileSet.has(url.toLowerCase().replace(/^\//, "")) || fileSet.has(`library/${fileName}`)) {
        valid++;
        validFiles.push(rec);
      } else {
        missing++;
        missingFiles.push({ record: rec, fileName });
      }
    } else {
      // without fileSet, assume url present = valid
      if (url) {
        valid++;
        validFiles.push(rec);
      } else {
        missing++;
        missingFiles.push({ record: rec, fileName });
      }
    }
  });

  return {
    total,
    valid,
    missing,
    broken,
    missingFiles,
    validFiles,
    brokenRefs,
  };
};

/**
 * Build deterministic media groups from file names (for admin & report).
 */
export const detectMediaGroups = (fileNames = []) => {
  const groups = buildMediaGroups(fileNames);
  return {
    total: groups.length,
    groups,
    standalone: groups.filter((g) => g.isStandalone).length,
    grouped: groups.filter((g) => g.isGrouped).length,
  };
};

/**
 * Legacy `/images/…` (and leftover house filenames) → canonical library URL.
 * Historical product / order / taxonomy ids are never rewritten.
 */
export const resolveLegacyPath = (value) => resolveLegacyMediaUrl(value);

export const getHousePlateMigration = () => HOUSE_PLATE_MIGRATION;

export default {
  buildMigrationManifest,
  verifyPhysicalFiles,
  detectMediaGroups,
  resolveLegacyPath,
  lookupLegacyMedia,
  getHousePlateMigration,
  MIGRATION_STATUS,
};
