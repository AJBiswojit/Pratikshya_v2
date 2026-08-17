/**
 * PRATIKSHYA FASHON — Media groups (Phase 21.6).
 *
 * Deterministic grouping based ONLY on filename parsing.
 * Groups images when their base is identical after removing view suffix.
 *
 * Example:
 *   women-saree-banarasi-001-front.webp
 *   women-saree-banarasi-001-side.webp
 *   women-saree-banarasi-001-back.webp
 *   → one group women-saree-banarasi-001
 *
 *   women-saree-banarasi-001-front.webp
 *   women-saree-banarasi-002-front.webp
 *   → two groups (different numbers)
 *
 * No visual similarity, no colour, no model, no approximate matching.
 */

import { parseMediaFilename, getViewOrderScore } from "./mediaNaming.js";

export const buildMediaGroups = (fileList = []) => {
  const groupsMap = new Map();

  const normalizedList = (Array.isArray(fileList) ? fileList : [])
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === "string") {
        const parsed = parseMediaFilename(entry);
        if (!parsed) return null;
        return {
          fileName: parsed.fileName,
          originalFileName: parsed.originalFileName || entry,
          filePath: parsed.filePath,
          groupKey: parsed.groupKey,
          view: parsed.view,
          isStandalone: parsed.isStandalone,
          source: entry,
        };
      }
      // object: expect fileName, currentFilename, url, etc.
      const rawName = entry.fileName || entry.currentFilename || entry.originalFilename || entry.url || "";
      const parsed = parseMediaFilename(rawName);
      if (!parsed) return null;
      return {
        id: entry.id || null,
        fileName: parsed.fileName,
        originalFileName: entry.currentFilename || entry.fileName || rawName,
        filePath: entry.optimizedPath ? `/${entry.optimizedPath}` : parsed.filePath,
        url: entry.url || entry.optimizedPath ? `/${entry.optimizedPath || ""}`.replace(/\/\//g, "/") : parsed.filePath,
        groupKey: parsed.groupKey,
        view: parsed.view,
        isStandalone: parsed.isStandalone,
        productId: entry.productId || null,
        categoryId: entry.categoryId || null,
        original: entry,
      };
    })
    .filter(Boolean);

  normalizedList.forEach((item) => {
    const key = item.groupKey;
    if (!groupsMap.has(key)) groupsMap.set(key, []);
    groupsMap.get(key).push(item);
  });

  const groups = [];
  for (const [groupKey, files] of groupsMap.entries()) {
    // sort files by view order
    const sorted = [...files].sort((a, b) => {
      const aScore = getViewOrderScore(a.view);
      const bScore = getViewOrderScore(b.view);
      if (aScore !== bScore) return aScore - bScore;
      // secondary alphabetical
      return (a.fileName || "").localeCompare(b.fileName || "");
    });

    const views = sorted.map((f) => f.view).filter(Boolean);
    const hasViews = views.length > 0;
    const isSingleStandalone = sorted.length === 1 && sorted[0].isStandalone;

    // Determine primary view: front > first
    let primary = sorted.find((f) => f.view === "front") || sorted[0] || null;

    groups.push({
      groupKey,
      files: sorted,
      count: sorted.length,
      views,
      primary,
      isStandalone: isSingleStandalone || !hasViews,
      isGrouped: sorted.length > 1 && hasViews,
      productId: sorted[0]?.productId || null,
      categoryId: sorted[0]?.categoryId || null,
    });
  }

  // deterministic sort by groupKey
  groups.sort((a, b) => a.groupKey.localeCompare(b.groupKey));

  return groups;
};

export const getStandaloneGroups = (groups = []) => groups.filter((g) => g.isStandalone);
export const getMultiViewGroups = (groups = []) => groups.filter((g) => g.isGrouped);

export default {
  buildMediaGroups,
  getStandaloneGroups,
  getMultiViewGroups,
};
