/**
 * Phase 21.6 migration script
 * - Reads public/library
 * - Reads src/data/media/ingestedManifest.json (old)
 * - Generates new manifest with fixed paths
 * - Generates migration manifest
 * - Generates groups report
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

const LIB_DIR = path.join(root, "public", "library");
const MANIFEST_PATH = path.join(root, "src", "data", "media", "ingestedManifest.json");
const MIGRATION_PATH = path.join(root, "src", "data", "media", "mediaMigrationManifest.json");
const GROUPS_REPORT_PATH = path.join(root, "src", "data", "media", "mediaGroupsReport.json");

const VIEW_SUFFIXES = [
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

function parseMediaFilename(input) {
  const raw = String(input || "").trim();
  if (!raw) return null;
  const fileName = raw.split("/").pop();
  const base = fileName.replace(/\.[a-z0-9]+$/i, "").toLowerCase();
  const sorted = [...VIEW_SUFFIXES].sort((a, b) => b.length - a.length);
  for (const suffix of sorted) {
    const needle = `-${suffix.toLowerCase()}`;
    if (base.endsWith(needle)) {
      const groupKey = base.slice(0, -needle.length);
      return { fileName: fileName.toLowerCase(), baseName: base, groupKey, view: suffix.toLowerCase(), isStandalone: false };
    }
  }
  // check numeric + view
  const parts = base.split("-");
  let numIdx = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (/^\d+$/.test(parts[i])) {
      numIdx = i;
      break;
    }
  }
  if (numIdx !== -1 && numIdx < parts.length - 1) {
    const potentialView = parts.slice(numIdx + 1).join("-");
    const tokens = ["front", "back", "side", "left", "right", "close", "detail", "multiple", "closeup"];
    if (tokens.some((t) => potentialView.includes(t))) {
      const groupKey = parts.slice(0, numIdx + 1).join("-");
      return { fileName: fileName.toLowerCase(), baseName: base, groupKey, view: potentialView, isStandalone: false };
    }
  }
  return { fileName: fileName.toLowerCase(), baseName: base, groupKey: base, view: null, isStandalone: true };
}

function buildMediaId(originalPath) {
  const digest = createHash("sha1").update(String(originalPath)).digest("hex").slice(0, 12);
  return `pm-ing-${digest}`;
}

function getViewOrderScore(view) {
  const map = {
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
  if (!view) return 99;
  const lower = String(view).toLowerCase();
  if (map[lower] !== undefined) return map[lower];
  if (lower.includes("front") && !lower.includes("close") && !lower.includes("detail")) return 0;
  if (lower.includes("side") || lower.includes("left") || lower.includes("right")) return 1;
  if (lower.includes("back")) return 2;
  if (lower.includes("close") || lower.includes("detail")) return 4;
  return 50;
}

function classifyByFilename(fileName) {
  const lower = fileName.toLowerCase();
  // Simplified classification mirroring previous ingestion logic but based on filename
  if (lower.startsWith("jewellery-anklet")) return { categoryId: null, subcategoryName: null, collectionId: null, mappingStatus: "UNMAPPED", mappingNote: "Anklet unmapped", namePrefix: "jewellery-anklet", gender: null };
  if (lower.startsWith("jewellery-bangle")) return { categoryId: "bangles", subcategoryName: null, collectionId: null, mappingStatus: "MAPPED", namePrefix: "jewellery-bangle", gender: "Women" };
  if (lower.startsWith("jewellery-earring")) return { categoryId: "jewellery", subcategoryName: "Earrings", collectionId: null, mappingStatus: "MAPPED", namePrefix: "jewellery-earring", gender: "Women" };
  if (lower.startsWith("kids-")) return { categoryId: "kidswear", subcategoryName: null, collectionId: "little-heirlooms", mappingStatus: "MAPPED", namePrefix: "kids", gender: "Kids" };
  if (lower.startsWith("men-kurta-pajama")) return { categoryId: "menswear", subcategoryName: "Kurta Pajama", collectionId: "everyday-atelier", mappingStatus: "MAPPED", namePrefix: "men-kurta-pajama", gender: "Men" };
  if (lower.startsWith("men-sherwani")) return { categoryId: "menswear", subcategoryName: "Sherwani", collectionId: "groom-atelier", mappingStatus: "MAPPED", namePrefix: "men-sherwani", gender: "Men" };
  if (lower.startsWith("women-innerwear")) return { categoryId: "innerwear", subcategoryName: null, collectionId: null, mappingStatus: "MAPPED", namePrefix: "women-innerwear", gender: "Women" };
  if (lower.startsWith("women-lehenga")) return { categoryId: "lehengas", subcategoryName: null, collectionId: "bridal-trousseau", mappingStatus: "MAPPED", namePrefix: "women-lehenga", gender: "Women" };
  if (lower.startsWith("women-bridal")) return { categoryId: "bridal-couture", subcategoryName: null, collectionId: "bridal-trousseau", mappingStatus: "MAPPED", namePrefix: "women-bridal", gender: "Women" };
  if (lower.startsWith("women-saree-banarasi")) return { categoryId: "sarees", subcategoryName: "Banarasi Saree", collectionId: "heritage-weaves", mappingStatus: "MAPPED", namePrefix: "women-saree-banarasi", gender: "Women" };
  if (lower.startsWith("women-saree-bandhani")) return { categoryId: "sarees", subcategoryName: null, collectionId: null, mappingStatus: "NEEDS_REVIEW", namePrefix: "women-saree-bandhani", gender: "Women" };
  if (lower.startsWith("women-saree-chanderi")) return { categoryId: "sarees", subcategoryName: null, collectionId: null, mappingStatus: "NEEDS_REVIEW", namePrefix: "women-saree-chanderi", gender: "Women" };
  if (lower.startsWith("women-saree-chiffon")) return { categoryId: "sarees", subcategoryName: "Printed Saree", collectionId: "everyday-atelier", mappingStatus: "MAPPED", namePrefix: "women-saree-chiffon", gender: "Women" };
  if (lower.startsWith("women-saree-cotton")) return { categoryId: "sarees", subcategoryName: "Cotton Saree", collectionId: "handloom-stories", mappingStatus: "MAPPED", namePrefix: "women-saree-cotton", gender: "Women" };
  if (lower.startsWith("women-saree-kanchipuram")) return { categoryId: "sarees", subcategoryName: "Silk Saree", collectionId: "heritage-weaves", mappingStatus: "MAPPED", namePrefix: "women-saree-kanchipuram", gender: "Women" };
  if (lower.startsWith("women-saree-silk")) return { categoryId: "sarees", subcategoryName: "Silk Saree", collectionId: "heritage-weaves", mappingStatus: "MAPPED", namePrefix: "women-saree-silk", gender: "Women" };
  return { categoryId: null, subcategoryName: null, collectionId: null, mappingStatus: "UNMAPPED", namePrefix: "unmapped", gender: null };
}

function main() {
  const libFiles = fs.readdirSync(LIB_DIR).filter((f) => !f.startsWith(".") && f.toLowerCase().endsWith(".webp")).sort();
  console.log(`Found ${libFiles.length} library files`);

  const manifestRaw = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf-8"));
  const oldAssets = manifestRaw.assets || [];
  const houseAssets = oldAssets.filter((a) => (a.optimizedPath || "").startsWith("images/"));
  const libOldAssets = oldAssets.filter((a) => (a.optimizedPath || "").startsWith("library/"));

  console.log(`Old manifest total ${oldAssets.length}, house ${houseAssets.length}, library ${libOldAssets.length}`);

  // Build groups from new library files
  const newParsed = libFiles.map((f) => ({ fileName: f, parsed: parseMediaFilename(f) }));
  const groupsMap = new Map();
  newParsed.forEach(({ fileName, parsed }) => {
    if (!groupsMap.has(parsed.groupKey)) groupsMap.set(parsed.groupKey, []);
    groupsMap.get(parsed.groupKey).push({ fileName, parsed });
  });

  // For each namePrefix, determine product mapping based on old assets
  // namePrefix = groupKey without trailing -number
  const namePrefixFromGroupKey = (gk) => {
    const parts = gk.split("-");
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      return parts.slice(0, -1).join("-");
    }
    return gk;
  };

  // Build map: namePrefix -> old product groups
  const oldByPrefix = new Map();
  libOldAssets.forEach((asset) => {
    const fn = (asset.currentFilename || "").toLowerCase();
    const base = fn.replace(/\.[a-z0-9]+$/i, "");
    const parts = base.split("-");
    let prefix = base;
    const last = parts[parts.length - 1];
    if (/^\d+$/.test(last)) {
      prefix = parts.slice(0, -1).join("-");
    }
    if (!oldByPrefix.has(prefix)) oldByPrefix.set(prefix, []);
    oldByPrefix.get(prefix).push(asset);
  });

  // For each prefix, sort old assets by numeric index and group by productId
  const prefixProductOrder = new Map(); // prefix -> sorted productIds list ordered by earliest occurrence
  for (const [prefix, assets] of oldByPrefix.entries()) {
    // group assets by productId that is not null
    const byProduct = new Map();
    assets.forEach((a) => {
      const pid = a.productId || "__unmapped__";
      if (!byProduct.has(pid)) byProduct.set(pid, []);
      byProduct.get(pid).push(a);
    });
    // For each product, find min numeric index
    const productEntries = [];
    for (const [pid, list] of byProduct.entries()) {
      if (pid === "__unmapped__") continue;
      const indices = list.map((a) => {
        const fn = (a.currentFilename || "").toLowerCase();
        const m = fn.match(/-(\d+)\.webp$/);
        return m ? parseInt(m[1], 10) : 999;
      });
      const minIdx = Math.min(...indices);
      productEntries.push({ productId: pid, minIdx, assets: list });
    }
    productEntries.sort((a, b) => a.minIdx - b.minIdx);
    prefixProductOrder.set(prefix, productEntries.map((e) => e.productId));
  }

  // Now build mapping for new groups per prefix
  const newGroupsByPrefix = new Map();
  for (const groupKey of groupsMap.keys()) {
    const prefix = namePrefixFromGroupKey(groupKey);
    if (!newGroupsByPrefix.has(prefix)) newGroupsByPrefix.set(prefix, []);
    newGroupsByPrefix.get(prefix).push(groupKey);
  }
  for (const [prefix, groupKeys] of newGroupsByPrefix.entries()) {
    groupKeys.sort((a, b) => a.localeCompare(b));
    newGroupsByPrefix.set(prefix, groupKeys);
  }

  // Map productId -> new groupKey
  const productToNewGroup = new Map();
  for (const [prefix, productIds] of prefixProductOrder.entries()) {
    const newGroupKeys = newGroupsByPrefix.get(prefix) || [];
    productIds.forEach((pid, idx) => {
      if (idx < newGroupKeys.length) {
        productToNewGroup.set(`${prefix}::${pid}`, newGroupKeys[idx]);
        productToNewGroup.set(pid, newGroupKeys[idx]); // latest mapping
      }
    });
  }

  // For prefixes where old mapping had unmapped products, we still have productToNewGroup based on ordering

  // Build new library assets
  const newLibraryAssets = [];
  const migrationEntries = [];

  const oldAssetByFileName = new Map();
  libOldAssets.forEach((a) => {
    const fn = (a.currentFilename || "").toLowerCase();
    oldAssetByFileName.set(fn, a);
  });

  // Track IDs reused from existing manifest records.
  const usedIds = new Set(houseAssets.map((a) => a.id));

  // For each new file, determine productId via group mapping
  for (const [groupKey, files] of groupsMap.entries()) {
    const prefix = namePrefixFromGroupKey(groupKey);
    // sort files within group by view order
    const sortedFiles = [...files].sort((a, b) => {
      const sa = getViewOrderScore(a.parsed.view);
      const sb = getViewOrderScore(b.parsed.view);
      if (sa !== sb) return sa - sb;
      return a.fileName.localeCompare(b.fileName);
    });

    // Find which product this group maps to
    // Look up in prefixProductOrder ordering
    const productIdsOrdered = prefixProductOrder.get(prefix) || [];
    const newGroupKeysOrdered = newGroupsByPrefix.get(prefix) || [];
    const groupIndex = newGroupKeysOrdered.indexOf(groupKey);
    let productIdForGroup = null;
    if (groupIndex !== -1 && groupIndex < productIdsOrdered.length) {
      productIdForGroup = productIdsOrdered[groupIndex];
    }

    // If no product mapping found, try to inherit from old assets that share same prefix and were unmapped? Then leave null (needs review)

    sortedFiles.forEach((fileEntry, idx) => {
      const fileName = fileEntry.fileName;
      const parsed = fileEntry.parsed;
      const classification = classifyByFilename(fileName);

      // Determine if this file already existed (ALREADY_CURRENT)
      const oldExact = oldAssetByFileName.get(fileName.toLowerCase());
      let assetId;
      let role = idx === 0 && parsed.view && parsed.view.includes("front") ? "COVER" : "GALLERY";
      if (idx === 0) {
        const hasFront = sortedFiles.some((f) => f.parsed.view === "front");
        if (!hasFront) role = "COVER";
        else role = parsed.view === "front" ? "COVER" : "GALLERY";
      }
      if (productIdForGroup) {
        if (parsed.view === "front" || (idx === 0 && !sortedFiles.some((f) => f.parsed.view === "front"))) {
          role = "COVER";
        } else {
          role = "GALLERY";
        }
      }

      let status = "MAPPED";
      let productId = productIdForGroup;
      let mappingMethod = "FOLDER";
      let mappingNote = "";
      let existingAsset = oldExact;

      if (oldExact) {
        assetId = oldExact.id;
        if (oldExact.productId) productId = oldExact.productId;
        else productId = productIdForGroup || null;
        role = oldExact.role && oldExact.productId ? oldExact.role : role;
        if (!oldExact.productId) role = null;
        mappingMethod = oldExact.mappingMethod || "FOLDER";
        mappingNote = oldExact.mappingNote || "";
        status = oldExact.mappingStatus || "MAPPED";
      } else {
        // Always generate fresh ID for new views to avoid collisions — preserve old IDs only for exact matches
        // However for the first front file of a mapped product group, try to reuse the old COVER id for continuity if not already used
        const prefixOldAssets = oldByPrefix.get(prefix) || [];
        const productOldAssets = prefixOldAssets.filter((a) => a.productId === productIdForGroup).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
        if (productIdForGroup && idx === 0 && productOldAssets[0] && !usedIds.has(productOldAssets[0].id)) {
          // reuse cover id for front
          assetId = productOldAssets[0].id;
          mappingMethod = productOldAssets[0].mappingMethod || "SUBCATEGORY_SLOT";
          mappingNote = productOldAssets[0].mappingNote || "";
        } else {
          assetId = buildMediaId(`library/${fileName}-${Date.now()}-${idx}-${Math.random()}`);
          // ensure uniqueness via hash of filename + group
          assetId = buildMediaId(`library/${fileName}`);
          let counter = 0;
          while (usedIds.has(assetId)) {
            assetId = buildMediaId(`library/${fileName}-${counter}`);
            counter++;
          }
        }
      }

      usedIds.add(assetId);

      if (!existingAsset) {
        // Determine status
        if (classification.mappingStatus === "NEEDS_REVIEW") status = "NEEDS_REVIEW";
        else if (classification.mappingStatus === "UNMAPPED") status = "UNMAPPED";
        else status = productId ? "MAPPED" : classification.mappingStatus;
      }

      // For standalone categories that were previously dump, role null
      const isDumpPrefix = ["kids", "jewellery-bangle", "jewellery-earring", "women-innerwear", "jewellery-anklet"].includes(classification.namePrefix);
      if (isDumpPrefix) {
        role = null;
        productId = null;
      }

      const optimizedPath = `library/${fileName}`;
      const currentFilename = fileName;

      const record = {
        id: assetId,
        originalPath: existingAsset ? existingAsset.originalPath : `library/${fileName}`,
        optimizedPath,
        originalFilename: existingAsset ? existingAsset.originalFilename : fileName,
        currentFilename,
        extension: ".webp",
        checksum: existingAsset ? existingAsset.checksum : null,
        width: existingAsset ? existingAsset.width : 800,
        height: existingAsset ? existingAsset.height : 1000,
        aspectRatio: existingAsset ? existingAsset.aspectRatio : 0.8,
        originalSizeBytes: existingAsset ? existingAsset.originalSizeBytes : 100000,
        optimizedSizeBytes: existingAsset ? existingAsset.optimizedSizeBytes : 80000,
        categoryId: classification.categoryId,
        subcategoryName: classification.subcategoryName,
        collectionId: classification.collectionId,
        productId: productId || null,
        variantId: null,
        role: productId ? role : null,
        sortOrder: productId ? (role === "COVER" ? 0 : idx) : 0,
        usageRoles: existingAsset ? existingAsset.usageRoles : [],
        mappingStatus: status,
        mappingMethod,
        mappingNote: mappingNote || `${classification.namePrefix} file ${fileName}`,
        duplicateStatus: existingAsset ? existingAsset.duplicateStatus : "UNIQUE",
        duplicateOf: existingAsset ? existingAsset.duplicateOf : null,
        featured: existingAsset ? existingAsset.featured : idx === 0,
        house: false,
        dump: isDumpPrefix,
        large: existingAsset ? existingAsset.large : false,
        lowResolution: false,
        broken: false,
        skipOptimize: false,
        gender: classification.gender || null,
        namePrefix: classification.namePrefix,
        probableUsage: classification.categoryId ? "product/category" : "category",
        // new fields for Phase 21.6
        groupKey: parsed.groupKey,
        view: parsed.view,
        fileName: fileName,
        isStandalone: parsed.isStandalone,
      };

      // Adjust usageRoles based on product & category
      if (!record.usageRoles || record.usageRoles.length === 0) {
        // assign basic roles
        const roles = [];
        if (productId) {
          roles.push(role === "COVER" ? "PRODUCT_PRIMARY" : "PRODUCT_GALLERY", "PRODUCT_THUMBNAIL", "AI_SHOPPING");
          if (["sarees", "lehengas", "bridal-couture", "menswear", "kurtis-and-suits", "kidswear"].includes(classification.categoryId)) {
            roles.push("AI_MIRROR");
          }
          if (classification.collectionId) roles.push("COLLECTION_COVER");
        } else if (classification.categoryId) {
          roles.push("CATEGORY_COVER");
        }
        record.usageRoles = roles;
      }

      newLibraryAssets.push(record);
    });
  }

  // Build migration manifest for old library assets that are not exactly current
  const newFileSetLower = new Set(libFiles.map((f) => f.toLowerCase()));
  libOldAssets.forEach((oldAsset) => {
    const oldFn = (oldAsset.currentFilename || "").toLowerCase();
    const oldPath = `library/${oldFn}`;
    if (newFileSetLower.has(oldFn)) {
      migrationEntries.push({
        oldPath,
        newPath: oldPath,
        status: "ALREADY_CURRENT",
        assetId: oldAsset.id,
        productId: oldAsset.productId || null,
      });
    } else {
      // find if old base is prefix of any new file
      const oldBase = oldFn.replace(/\.webp$/i, "");
      const candidates = libFiles.filter((nf) => nf.toLowerCase().startsWith(`${oldBase}-`));
      if (candidates.length > 0) {
        // choose best
        const sortedCandidates = [...candidates].sort((a, b) => {
          const pa = parseMediaFilename(a);
          const pb = parseMediaFilename(b);
          return getViewOrderScore(pa.view) - getViewOrderScore(pb.view);
        });
        const chosen = sortedCandidates[0];
        migrationEntries.push({
          oldPath,
          newPath: `library/${chosen.toLowerCase()}`,
          status: "MIGRATED",
          assetId: oldAsset.id,
          productId: oldAsset.productId || null,
          candidates: candidates.map((c) => `library/${c.toLowerCase()}`),
        });
      } else {
        // Try to map via productId -> new group.
        const pid = oldAsset.productId;
        if (pid && productToNewGroup.has(pid)) {
          const newGroup = productToNewGroup.get(pid);
          const filesInGroup = groupsMap.get(newGroup) || [];
          if (filesInGroup.length > 0) {
            const sorted = [...filesInGroup].sort((a, b) => getViewOrderScore(a.parsed.view) - getViewOrderScore(b.parsed.view));
            const chosenFile = sorted[oldAsset.sortOrder] || sorted[0];
            migrationEntries.push({
              oldPath,
              newPath: `library/${chosenFile.fileName}`,
              status: "MIGRATED",
              assetId: oldAsset.id,
              productId: pid,
            });
            return;
          }
        }
        migrationEntries.push({
          oldPath,
          newPath: null,
          status: "MISSING",
          assetId: oldAsset.id,
          productId: oldAsset.productId || null,
        });
      }
    }
  });

  // Merge house + new library assets
  const allNewAssets = [...houseAssets, ...newLibraryAssets];
  // deduplicate by id
  const seenIds = new Set();
  const deduped = [];
  allNewAssets.forEach((a) => {
    if (seenIds.has(a.id)) return;
    seenIds.add(a.id);
    deduped.push(a);
  });

  // sort similar to old
  deduped.sort((a, b) => String(a.originalPath).localeCompare(String(b.originalPath)));

  const newManifest = {
    version: manifestRaw.version || 1,
    generatedAt: new Date().toISOString(),
    sourceRoots: manifestRaw.sourceRoots,
    optimizedRoot: manifestRaw.optimizedRoot,
    note: "Phase 21.6 migration — filenames are authoritative, old references migrated",
    report: {
      total: deduped.length,
      optimized: deduped.filter((a) => !a.skipOptimize).length,
      skipped: deduped.filter((a) => a.skipOptimize).length,
      duplicates: 0,
      possibleDuplicates: 0,
      mapped: deduped.filter((a) => a.mappingStatus === "MAPPED").length,
      unmapped: deduped.filter((a) => a.mappingStatus === "UNMAPPED").length,
      needsReview: deduped.filter((a) => a.mappingStatus === "NEEDS_REVIEW").length,
      broken: 0,
      large: deduped.filter((a) => a.large).length,
      lowResolution: 0,
      mappedToProducts: deduped.filter((a) => a.productId).length,
      mappedToCategories: deduped.filter((a) => a.categoryId).length,
      categoriesMapped: new Set(deduped.map((a) => a.categoryId).filter(Boolean)).size,
      subcategoriesMapped: new Set(deduped.map((a) => a.subcategoryName).filter(Boolean)).size,
      collectionsMapped: new Set(deduped.map((a) => a.collectionId).filter(Boolean)).size,
      productsWithMedia: new Set(deduped.map((a) => a.productId).filter(Boolean)).size,
      usage: {},
      storage: manifestRaw.report?.storage || {},
    },
    assets: deduped,
  };

  // calculate usage breakdown
  const usageRoles = ["HERO", "CATEGORY_COVER", "PRODUCT_PRIMARY", "PRODUCT_GALLERY", "PRODUCT_THUMBNAIL", "EDITORIAL", "BANNER", "NEW_ARRIVAL", "SALE", "LOOKBOOK", "COLLECTION_COVER", "AI_SHOPPING", "AI_MIRROR"];
  usageRoles.forEach((role) => {
    newManifest.report.usage[role.toLowerCase()] = deduped.filter((a) => (a.usageRoles || []).includes(role)).length;
  });

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(newManifest, null, 2));
  console.log(`Wrote new manifest with ${deduped.length} assets`);

  fs.writeFileSync(MIGRATION_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), totalOld: libOldAssets.length, totalMigrated: migrationEntries.filter((e) => e.status === "MIGRATED").length, alreadyCurrent: migrationEntries.filter((e) => e.status === "ALREADY_CURRENT").length, missing: migrationEntries.filter((e) => e.status === "MISSING").length, entries: migrationEntries }, null, 2));
  console.log(`Wrote migration manifest ${migrationEntries.length} entries`);

  // Groups report
  const groupsReport = [];
  for (const [groupKey, files] of groupsMap.entries()) {
    const sorted = [...files].sort((a, b) => getViewOrderScore(a.parsed.view) - getViewOrderScore(b.parsed.view));
    groupsReport.push({
      groupKey,
      prefix: namePrefixFromGroupKey(groupKey),
      count: files.length,
      views: sorted.map((f) => f.parsed.view).filter(Boolean),
      files: sorted.map((f) => f.fileName),
      productId: (() => {
        const prefix = namePrefixFromGroupKey(groupKey);
        const productIdsOrdered = prefixProductOrder.get(prefix) || [];
        const newGroupsOrdered = newGroupsByPrefix.get(prefix) || [];
        const idx = newGroupsOrdered.indexOf(groupKey);
        return idx !== -1 && idx < productIdsOrdered.length ? productIdsOrdered[idx] : null;
      })(),
    });
  }
  groupsReport.sort((a, b) => a.groupKey.localeCompare(b.groupKey));
  fs.writeFileSync(GROUPS_REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), totalGroups: groupsReport.length, groups: groupsReport }, null, 2));
  console.log(`Wrote groups report ${groupsReport.length} groups`);

  console.log("Migration stats:", {
    migrated: migrationEntries.filter((e) => e.status === "MIGRATED").length,
    already: migrationEntries.filter((e) => e.status === "ALREADY_CURRENT").length,
    missing: migrationEntries.filter((e) => e.status === "MISSING").length,
  });
}

main();
