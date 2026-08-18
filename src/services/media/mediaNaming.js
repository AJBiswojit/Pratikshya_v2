/**
 * PRATIKSHYA FASHON — Media naming parser (Phase 21.6).
 *
 * New filename convention:
 *   [department]-[category]-[style/product-set]-[number]-[view].webp
 *
 * Examples:
 *   women-saree-banarasi-001-front.webp  -> groupKey women-saree-banarasi-001, view front
 *   women-saree-banarasi-001-right-side.webp -> groupKey women-saree-banarasi-001, view right-side
 *   women-saree-banarasi-001-front-close.webp -> groupKey women-saree-banarasi-001, view front-close
 *
 * Standalone:
 *   jewellery-001.webp -> groupKey jewellery-001, view null
 *   women-innerwear-001.webp -> groupKey women-innerwear-001, view null
 *
 * Deterministic, no visual guessing.
 */

export const VIEW_SUFFIXES = [
  // longest first for deterministic match
  "left-side-detail",
  "right-side-detail",
  "front-detail",
  "front-close",
  "multiple-front",
  "left-side",
  "right-side",
  "close-up",
  "closeup",
  "front",
  "back",
  "side",
  "left",
  "right",
  "close",
  "detail",
  "multiple",
];

// additional compound patterns allowed (future-proof): any combination containing these tokens
const VIEW_TOKEN_SET = new Set([
  "front",
  "back",
  "side",
  "left",
  "right",
  "close",
  "closeup",
  "close-up",
  "detail",
  "multiple",
]);

const VIEW_ORDER_RANK = {
  front: 0,
  side: 1,
  left: 1,
  right: 1,
  "left-side": 1,
  "right-side": 2,
  back: 3,
  close: 4,
  closeup: 4,
  "close-up": 4,
  detail: 4,
  "front-close": 5,
  "front-detail": 5,
  "left-side-detail": 6,
  "right-side-detail": 6,
  "multiple-front": 7,
  multiple: 8,
};

export const getViewOrderScore = (view) => {
  if (!view) return 99;
  const lower = String(view).toLowerCase();
  if (VIEW_ORDER_RANK[lower] !== undefined) return VIEW_ORDER_RANK[lower];
  // heuristic for unknown compounds
  if (lower.includes("front") && !lower.includes("close") && !lower.includes("detail")) return 0;
  if (lower.includes("side") || lower.includes("left") || lower.includes("right")) return 1;
  if (lower.includes("back")) return 2;
  if (lower.includes("close") || lower.includes("detail") || lower.includes("closeup")) return 4;
  return 50;
};

const stripExtension = (filename) => {
  const base = String(filename || "").split("/").pop();
  return base.replace(/\.[a-z0-9]+$/i, "");
};

const extensionOf = (filename) => {
  const match = String(filename || "").match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : "";
};

/**
 * Parse a media filename.
 *
 * Returns:
 *   {
 *     fileName: original filename with extension,
 *     baseName: filename without extension,
 *     filePath: the supplied path, or the filename when no path is supplied,
 *     groupKey: string,
 *     view: string|null,
 *     isStandalone: boolean,
 *     department, category, style, number etc (best effort)
 *   }
 */
export const parseMediaFilename = (inputPath) => {
  const raw = String(inputPath || "").trim();
  if (!raw) return null;
  const fileName = raw.split("/").pop();
  const baseName = stripExtension(fileName).toLowerCase();
  const ext = extensionOf(fileName);
  const filePath = raw.startsWith("/") ? raw : raw.includes("/") ? `/${raw}` : fileName;

  // try explicit suffix list (longest first)
  const sortedSuffixes = [...VIEW_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sortedSuffixes) {
    const needle = `-${suffix.toLowerCase()}`;
    if (baseName.endsWith(needle)) {
      const groupKey = baseName.slice(0, -needle.length);
      // groupKey must end with a number or be plausible
      if (groupKey) {
        return {
          id: null,
          fileName: fileName.toLowerCase(),
          originalFileName: fileName,
          filePath,
          baseName,
          groupKey,
          view: suffix.toLowerCase(),
          isStandalone: false,
          extension: ext,
          department: null,
        };
      }
    }
  }

  // heuristic: split by '-' and check if suffix after numeric segment looks like a view
  // pattern: <prefix>-<number>-<view...>
  // Find last numeric segment
  const parts = baseName.split("-");
  let numericIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) {
      numericIndex = i;
      break;
    }
  }

  if (numericIndex !== -1 && numericIndex < parts.length - 1) {
    const potentialView = parts.slice(numericIndex + 1).join("-");
    const tokens = potentialView.split("-");
    const hasViewToken = tokens.some((t) => VIEW_TOKEN_SET.has(t) || VIEW_TOKEN_SET.has(`${tokens[0]}-${tokens[1]}`));
    // also check if potentialView itself contains view token
    const lowerView = potentialView.toLowerCase();
    const containsToken = [...VIEW_TOKEN_SET].some((tok) => lowerView.includes(tok));
    if (hasViewToken || containsToken) {
      const groupKey = parts.slice(0, numericIndex + 1).join("-");
      return {
        id: null,
        fileName: fileName.toLowerCase(),
        originalFileName: fileName,
        filePath,
        baseName,
        groupKey,
        view: lowerView,
        isStandalone: false,
        extension: ext,
        department: null,
      };
    }
  }

  // No view detected — standalone asset
  // groupKey is the full baseName
  return {
    id: null,
    fileName: fileName.toLowerCase(),
    originalFileName: fileName,
    filePath,
    baseName,
    groupKey: baseName,
    view: null,
    isStandalone: true,
    extension: ext,
    department: null,
  };
};

export const getGroupKey = (fileName) => parseMediaFilename(fileName)?.groupKey || null;
export const getView = (fileName) => parseMediaFilename(fileName)?.view || null;

export const isGroupedFile = (fileName) => {
  const parsed = parseMediaFilename(fileName);
  return parsed ? !parsed.isStandalone : false;
};

export default {
  parseMediaFilename,
  getGroupKey,
  getView,
  isGroupedFile,
  VIEW_SUFFIXES,
  getViewOrderScore,
};
