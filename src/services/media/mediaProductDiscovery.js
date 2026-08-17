/**
 * PRATIKSHYA FASHON — Media-library product discovery (Phase 24.1).
 *
 * The COVERAGE question this module answers is deliberately narrow:
 *
 *   "Has every distinct product represented by `public/library` been
 *    identified, grouped, given ONE permanent Product ID and connected to a
 *    catalogue record — published or draft?"
 *
 * It is NOT "are 99 products visible". A published count proves nothing
 * about coverage; a group that never became a product is invisible in every
 * storefront number.
 *
 *   MEDIA FILE → MEDIA GROUP → PRODUCT ID → CATALOGUE RECORD
 *        → PUBLISHED / DRAFT → CATEGORY → EXPLORE
 *
 * Design rules honoured here (and nowhere duplicated):
 *
 *   · This is a READ-ONLY, derivative module. It creates nothing, writes
 *     nothing, publishes nothing and owns no storage. Discovery reports the
 *     truth; `catalogueReconciliation` remains the ONE place that mints
 *     DRAFT records, and `productWorkflow` the ONE place that publishes.
 *     Phase 24.1 must not become a second catalogue or a second media system.
 *
 *   · GROUPING IS DETERMINISTIC AND FILENAME-DRIVEN. The existing Phase 21.6
 *     parser (`mediaNaming`) and grouper (`mediaGroups`) decide identity:
 *       women-saree-cotton-005-front / -side / -back  → ONE product
 *       women-innerwear-001 / -002 / -003             → THREE products
 *     Visual similarity is never an identity input. SIMILAR ≠ SAME.
 *
 *   · FILENAME IS A VALID DISCOVERY SIGNAL. When catalogue metadata is
 *     absent, the filename still yields category, subtype, group and
 *     sequence — enough to derive a *candidate* Product ID (EAR-009 style
 *     semantics) so an unmapped asset is reported, never silently discarded.
 *
 *   · FILENAME NEVER INVENTS BUSINESS DATA. Name, price, fabric, colour,
 *     size, stock and brand claims are not derivable from a filename and are
 *     never guessed here — they stay for the existing review workflow.
 *
 *   · ONE PHYSICAL ASSET = ONE OWNER. Ownership is resolved through the
 *     existing signals in a fixed precedence, so a group is never claimed by
 *     two products and never counted twice.
 *
 * The module is a leaf below the catalogue: it imports the media register,
 * the naming/grouping parsers and the reconciliation vocabulary, but never
 * `catalogRepository`. Callers pass the product list in, exactly like
 * `catalogueReconciliation` does, so there is no import cycle.
 */

import mediaRepository from "./mediaRepository";
import { getIngestedRecords } from "./ingestedMedia";
import { buildMediaGroups } from "./mediaGroups";
import { parseMediaFilename } from "./mediaNaming";
import { MEDIA_SCOPES } from "../../config/mediaTypes";
import {
  assignReconciliationIds,
  assignedProductMediaMap,
  categoryForGroup,
  collectionForGroup,
  groupNeedsReview,
  isHouseMedia,
  isKidsMedia,
  reconciliationFileName,
  staticUncataloguedGroups,
  subcategoryForGroup,
} from "../catalogueReconciliation";

/* ------------------------------------------------------------------ */
/* Filename semantics                                                  */
/* ------------------------------------------------------------------ */

/**
 * Filename family → { category, subtype, idPrefix }.
 *
 * These describe how the library NAMES things, which is a real, deterministic
 * signal — not a guess about the garment. `subtype` is the filename-derived
 * product family (Earrings, Bangles, Sherwani, …). It is reported for
 * discovery and audit grouping; it is NOT written into taxonomy, because
 * inventing a taxonomy record from a filename would be fabricating business
 * data (see rule 9).
 *
 * `idPrefix` is the SEMANTIC prefix the filename implies (EAR for an
 * earring, BAN for a bangle, INN for innerwear). It is what a human reading
 * `jewellery-earring-009.webp` would expect. The prefix actually MINTED by
 * the catalogue is the category prefix from `productIdPrefixes`, so both are
 * reported side by side and never confused (see `candidateProductId` vs
 * `assignedProductId`). Discovery reports identity; it does not renumber it.
 *
 * Longest / most specific patterns first — matching is first-hit.
 */
export const FILENAME_FAMILY_RULES = [
  { pattern: /^jewellery-earring-/, category: "jewellery", subtype: "Earrings", idPrefix: "EAR" },
  { pattern: /^jewellery-anklet-/, category: "jewellery", subtype: "Anklets", idPrefix: "ANK" },
  { pattern: /^jewellery-bangle-/, category: "bangles", subtype: "Bangles", idPrefix: "BAN" },
  { pattern: /^jewellery-/, category: "jewellery", subtype: "", idPrefix: "JEW" },
  { pattern: /^women-innerwear-/, category: "innerwear", subtype: "Innerwear", idPrefix: "INN" },
  { pattern: /^women-saree-banarasi-/, category: "sarees", subtype: "Banarasi Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-bandhani-/, category: "sarees", subtype: "Bandhani Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-chanderi-/, category: "sarees", subtype: "Chanderi Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-chiffon-/, category: "sarees", subtype: "Chiffon Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-cotton-/, category: "sarees", subtype: "Cotton Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-kanchipuram-/, category: "sarees", subtype: "Kanchipuram Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-silk-/, category: "sarees", subtype: "Silk Saree", idPrefix: "SAR" },
  { pattern: /^women-saree-/, category: "sarees", subtype: "Saree", idPrefix: "SAR" },
  { pattern: /^women-lehenga-/, category: "lehengas", subtype: "Lehenga", idPrefix: "LEH" },
  { pattern: /^women-bridal-/, category: "bridal-couture", subtype: "Bridal", idPrefix: "BRD" },
  { pattern: /^men-kurta-pajama-/, category: "menswear", subtype: "Kurta Pajama", idPrefix: "MEN" },
  { pattern: /^men-sherwani-/, category: "menswear", subtype: "Sherwani", idPrefix: "MEN" },
  { pattern: /^men-/, category: "menswear", subtype: "", idPrefix: "MEN" },
  { pattern: /^kids-/, category: "kidswear", subtype: "Kids", idPrefix: "KID" },
];

/** House artwork is a marketing plate, never product photography. */
export const isHouseFileName = (fileName) => /^house-/i.test(String(fileName || "").trim());

/** Canonical homepage hero files are marketing plates, never products. */
export const isHomepageHeroFileName = (fileName) =>
  /^hero00[1-5]\.avif$/i.test(String(fileName || "").trim());

/** The confirmed Kids plates (KID-001 … KID-021) — finalised in Phase 22. */
export const isKidsFileName = (fileName) => /^kids-\d{3}\./i.test(String(fileName || "").trim());

/**
 * Everything a FILENAME alone can legitimately tell us.
 *
 * This is the "filename-derived discovery" of rule 8: given
 * `jewellery-earring-009.webp` and nothing else, we can state category
 * `jewellery`, subtype `Earrings`, groupKey `jewellery-earring-009`,
 * sequence 9 and a semantic candidate id `EAR-009` — and we can state that
 * we know NOTHING about its name, price or fabric.
 */
export const deriveIdentityFromFilename = (fileName) => {
  const parsed = parseMediaFilename(fileName);
  if (!parsed) return null;

  const key = String(parsed.groupKey || "");
  const rule = FILENAME_FAMILY_RULES.find((entry) => entry.pattern.test(key)) ?? null;
  const sequenceMatch = key.match(/(\d+)$/);
  const sequence = sequenceMatch ? Number(sequenceMatch[1]) : null;
  const house = isHouseFileName(parsed.fileName);
  const homepageHero = isHomepageHeroFileName(parsed.fileName);
  const kids = isKidsFileName(parsed.fileName);

  return {
    fileName: parsed.fileName,
    extension: parsed.extension,
    baseName: parsed.baseName,
    filePath: parsed.filePath,
    groupKey: parsed.groupKey,
    view: parsed.view,
    isStandalone: parsed.isStandalone,
    department: key.split("-")[0] || null,
    /** Filename-derived category — only a candidate until metadata confirms. */
    category: rule?.category ?? "",
    /** Filename-derived product family (Earrings, Bangles, Sherwani, …). */
    subtype: rule?.subtype ?? "",
    /** The semantic prefix a human would read off the filename. */
    semanticPrefix: rule?.idPrefix ?? null,
    sequence,
    /** e.g. EAR-009 — a SEMANTIC candidate, never a renumbering instruction. */
    candidateProductId:
      rule?.idPrefix && sequence != null
        ? `${rule.idPrefix}-${String(sequence).padStart(3, "0")}`
        : null,
    isHouse: house,
    isHomepageHero: homepageHero,
    isMarketing: house || homepageHero,
    isKids: kids,
    /** House and homepage HERO plates are marketing, never product candidates. */
    isProductCandidate: !house && !homepageHero,
  };
};

/* ------------------------------------------------------------------ */
/* Library inventory                                                   */
/* ------------------------------------------------------------------ */

/** The filename a media record is known by, whatever shape it arrives in. */
const nameOf = (media) => reconciliationFileName(media);

/** Marketing placement records and canonical hero filenames are not products. */
const isMarketingMedia = (media) =>
  Boolean(
    media &&
      (media.scope === MEDIA_SCOPES.MARKETING ||
        media.placement ||
        isHomepageHeroFileName(nameOf(media)))
  );

const isProductMediaCandidate = (media) =>
  Boolean(media && !isHouseMedia(media) && !isMarketingMedia(media));

const buildMediaClaimMap = (products = []) => {
  const claims = new Map();
  products.forEach((product) => {
    const productId = String(product?.id ?? "");
    if (!productId) return;
    const claim = (mediaId) => {
      if (mediaId && !claims.has(String(mediaId))) claims.set(String(mediaId), productId);
    };
    (product.mediaIds ?? []).forEach(claim);
    (product.galleryMediaIds ?? []).forEach(claim);
    claim(product.primaryMediaId);
  });
  return claims;
};

/**
 * Complete inventory of the media library, one row per FILE.
 *
 * `diskFiles` (optional) is the real `public/library` listing. Passing it is
 * how the audit proves the register has not drifted from the filesystem: a
 * file that exists on disk but in no register is invisible to every other
 * count in the system, so discovery reports it explicitly rather than
 * inheriting the register's blind spot.
 */
export const buildLibraryInventory = ({ products = [], diskFiles = null } = {}) => {
  const register = mediaRepository.getAll();
  const manifest = getIngestedRecords();

  const byName = new Map();
  const remember = (media, source) => {
    const fileName = nameOf(media);
    if (!fileName) return;
    if (!byName.has(fileName)) byName.set(fileName, { fileName, register: null, manifest: null });
    byName.get(fileName)[source] = media;
  };
  manifest.forEach((media) => remember(media, "manifest"));
  register
    .filter((media) => media.ingested || media.source === "Ingested library")
    .forEach((media) => remember(media, "register"));

  const disk = Array.isArray(diskFiles)
    ? [...new Set(diskFiles.map((file) => String(file).split("/").pop().toLowerCase()))]
    : null;
  if (disk) {
    disk.forEach((fileName) => {
      if (!byName.has(fileName)) byName.set(fileName, { fileName, register: null, manifest: null });
    });
  }
  const diskSet = disk ? new Set(disk) : null;

  /* Product claims: a record may own media through the register OR through
     its own mediaIds / primaryMediaId / galleryMediaIds. Both are ownership
     signals and both are read here (rule 10). */
  const claimByMediaId = buildMediaClaimMap(Array.isArray(products) ? products : []);

  return [...byName.values()]
    .map(({ fileName, register: registerMedia, manifest: manifestMedia }) => {
      const media = registerMedia ?? manifestMedia ?? null;
      const identity = deriveIdentityFromFilename(fileName);
      const mediaId = media?.id ?? null;

      const ownedByRegister = media?.productId ? String(media.productId) : null;
      const claimedByProduct = mediaId ? claimByMediaId.get(String(mediaId)) ?? null : null;

      return {
        fileName,
        extension: identity?.extension ?? "",
        mediaId,
        groupKey: identity?.groupKey ?? null,
        view: identity?.view ?? null,
        isStandalone: identity?.isStandalone ?? true,
        /* Explicit metadata wins over the filename; the filename is the
           fallback discovery signal, never an override (rule 3 + rule 10). */
        category: media?.categoryId || identity?.category || "",
        categorySource: media?.categoryId ? "metadata" : identity?.category ? "filename" : "none",
        subcategory: media?.subcategoryId || "",
        subtype: identity?.subtype ?? "",
        collection: media?.collectionId || "",
        existingProductId: ownedByRegister ?? claimedByProduct ?? null,
        ownership: ownedByRegister ? "REGISTER" : claimedByProduct ? "PRODUCT_CLAIM" : "NONE",
        mappingStatus: media?.mappingStatus ?? null,
        duplicateStatus: media?.duplicateStatus ?? null,
        source: media?.source ?? (diskSet?.has(fileName) ? "Filesystem only" : "Unknown"),
        usage: media?.usageRoles?.length ? media.usageRoles.join(" · ") : "",
        isHouse: media ? isHouseMedia(media) : Boolean(identity?.isHouse),
        isMarketing: media ? isMarketingMedia(media) : Boolean(identity?.isMarketing),
        isProductCandidate: media
          ? isProductMediaCandidate(media)
          : Boolean(identity?.isProductCandidate),
        isKids: media ? isKidsMedia(media) : Boolean(identity?.isKids),
        onDisk: diskSet ? diskSet.has(fileName) : null,
        inManifest: Boolean(manifestMedia),
        inRegister: Boolean(registerMedia),
        candidateProductId: identity?.candidateProductId ?? null,
        status: media?.status ?? null,
      };
    })
    .sort((a, b) => a.fileName.localeCompare(b.fileName));
};

/* ------------------------------------------------------------------ */
/* Product-media groups                                                */
/* ------------------------------------------------------------------ */

/**
 * Every PRODUCT-photography group in the library, grouped by the existing
 * deterministic filename convention. House artwork is excluded (it is not a
 * product); the Kids plates are INCLUDED here — unlike in reconciliation,
 * which deliberately skips them because they are already finalised — because
 * a coverage audit that hides 21 confirmed products cannot prove coverage.
 */
export const discoveryMediaGroups = ({ diskFiles = null } = {}) => {
  const allRegistered = mediaRepository
    .getAll()
    .filter((media) => media.ingested || media.source === "Ingested library");
  const register = allRegistered.filter(isProductMediaCandidate);

  /* `seen` includes every known commercial file, not just products. This is
     what prevents a registered HOME_HERO plate from re-entering as a
     filesystem-only product candidate. */
  const seen = new Set(allRegistered.map((media) => nameOf(media)));
  const extras = [];

  /* A manifest asset the register somehow dropped, and a disk file neither
     knows about, still represent real product media. Marketing records remain
     in inventory but are never folded into product groups. */
  getIngestedRecords()
    .filter(isProductMediaCandidate)
    .forEach((media) => {
      const fileName = nameOf(media);
      if (fileName && !seen.has(fileName)) {
        seen.add(fileName);
        extras.push({ ...media, fileName });
      }
    });

  (Array.isArray(diskFiles) ? diskFiles : []).forEach((file) => {
    const fileName = String(file).split("/").pop().toLowerCase();
    const identity = deriveIdentityFromFilename(fileName);
    if (!fileName || seen.has(fileName) || !identity?.isProductCandidate) return;
    seen.add(fileName);
    extras.push({ id: null, fileName, productId: null, categoryId: null });
  });

  return buildMediaGroups([
    ...register.map((media) => ({ ...media, fileName: nameOf(media) })),
    ...extras,
  ]);
};

/** The category a group belongs to, metadata first, filename second. */
export const discoveryCategoryForGroup = (group) => {
  const resolved = categoryForGroup(group);
  if (resolved.category) return resolved;
  const identity = deriveIdentityFromFilename(`${group.groupKey}.webp`);
  return identity?.category
    ? { category: identity.category, inferred: true }
    : { category: "", inferred: true };
};

/** The filename-derived product family for a group (Earrings, Bangles, …). */
export const discoverySubtypeForGroup = (group) => {
  const explicit = subcategoryForGroup(group);
  if (explicit) return explicit;
  return deriveIdentityFromFilename(`${group.groupKey}.webp`)?.subtype ?? "";
};

/* ------------------------------------------------------------------ */
/* Ownership resolution                                                */
/* ------------------------------------------------------------------ */

/**
 * Which product — if any — already represents this media group.
 *
 * Rule 10 in one function. The signals are checked in a FIXED precedence so
 * the answer is deterministic and a group can never resolve to two products:
 *
 *   1. REGISTER            media.productId on any file in the group
 *   2. PRODUCT_CLAIM       a product's mediaIds / primaryMediaId / gallery
 *   3. SOURCE_GROUP        a product record's own `sourceGroupKey`
 *   4. CANONICAL_ASSIGNMENT the Phase 23.2 group → published-product map
 *
 * Anything unresolved is a genuinely uncatalogued group, and the ONLY case
 * where a new DRAFT is warranted.
 */
export const resolveGroupOwnership = (group, context) => {
  const { claimByMediaId, bySourceGroupKey, assignment } = context;

  const registerOwners = [
    ...new Set(
      (group.files || [])
        .map((file) => file.productId ?? file.original?.productId ?? null)
        .filter(Boolean)
        .map(String)
    ),
  ];
  if (registerOwners.length) {
    return { productId: registerOwners[0], match: "REGISTER", conflicts: registerOwners.slice(1) };
  }

  const claimOwners = [
    ...new Set(
      (group.files || [])
        .map((file) => (file.id ? claimByMediaId.get(String(file.id)) : null))
        .filter(Boolean)
    ),
  ];
  if (claimOwners.length) {
    return { productId: claimOwners[0], match: "PRODUCT_CLAIM", conflicts: claimOwners.slice(1) };
  }

  const bySource = bySourceGroupKey.get(group.groupKey);
  if (bySource) return { productId: String(bySource.id), match: "SOURCE_GROUP", conflicts: [] };

  if (assignment.has(group.groupKey)) {
    return {
      productId: String(assignment.get(group.groupKey)),
      match: "CANONICAL_ASSIGNMENT",
      conflicts: [],
    };
  }

  return { productId: null, match: "NONE", conflicts: [] };
};

/* ------------------------------------------------------------------ */
/* Discovery report                                                    */
/* ------------------------------------------------------------------ */

/**
 * The complete MEDIA LIBRARY → PRODUCT coverage picture.
 *
 * Returns one row per media group with its resolved product, plus category
 * and subtype rollups. Nothing is mutated; the caller decides what to do
 * with an `action` of CREATE_DRAFT (in practice the existing reconciliation
 * has already minted every such draft, so the honest answer is KEEP).
 */
export const getMediaProductDiscovery = ({ products = [], diskFiles = null } = {}) => {
  const list = Array.isArray(products) ? products : [];
  const productById = new Map(list.map((product) => [String(product.id), product]));
  const claimByMediaId = buildMediaClaimMap(list);

  const bySourceGroupKey = new Map();
  list.forEach((product) => {
    if (product?.sourceGroupKey && !bySourceGroupKey.has(product.sourceGroupKey)) {
      bySourceGroupKey.set(product.sourceGroupKey, product);
    }
  });

  const assignment = assignedProductMediaMap(list);
  const context = { productById, claimByMediaId, bySourceGroupKey, assignment };

  /* The Product IDs the catalogue actually mints, so the report can show the
     established id next to the filename-derived candidate WITHOUT ever
     suggesting a renumbering (rule 14: IDs are stable, never reassigned). */
  const reconciliationIds = assignReconciliationIds(staticUncataloguedGroups());

  const inventory = buildLibraryInventory({ products: list, diskFiles });
  const groups = discoveryMediaGroups({ diskFiles });

  const rows = groups.map((group) => {
    const { category, inferred } = discoveryCategoryForGroup(group);
    const subtype = discoverySubtypeForGroup(group);
    const identity = deriveIdentityFromFilename(`${group.groupKey}.webp`);
    const ownership = resolveGroupOwnership(group, context);
    const product = ownership.productId ? productById.get(ownership.productId) ?? null : null;

    const views = (group.files || []).map((file) => file.view).filter(Boolean);
    const isMultiView = (group.files || []).length > 1;

    return {
      groupKey: group.groupKey,
      category,
      categoryInferred: inferred,
      subtype,
      collection: collectionForGroup(group),
      files: (group.files || []).map((file) => file.fileName),
      fileCount: (group.files || []).length,
      views,
      isMultiView,
      isStandalone: !isMultiView,
      productId: ownership.productId,
      match: ownership.match,
      ownershipConflicts: ownership.conflicts,
      productStatus: product?.status ?? null,
      productName: product?.name ?? null,
      /* What the filename implies, reported for transparency only. */
      candidateProductId: identity?.candidateProductId ?? null,
      /* What the catalogue's own ID generator would mint for this group. */
      assignedProductId: reconciliationIds.get(group.groupKey) ?? null,
      needsReview: groupNeedsReview(group),
      action: ownership.productId ? "KEEP" : "CREATE_DRAFT",
    };
  });

  /* ---- rollups ------------------------------------------------------ */

  const rollup = (keyFn) => {
    const map = new Map();
    rows.forEach((row) => {
      const key = keyFn(row) || "(unclassified)";
      if (!map.has(key)) {
        map.set(key, {
          key,
          files: 0,
          groups: 0,
          withProduct: 0,
          withoutProduct: 0,
          published: 0,
          draft: 0,
          other: 0,
          multiView: 0,
          standalone: 0,
          needsReview: 0,
          productIds: [],
        });
      }
      const entry = map.get(key);
      entry.files += row.fileCount;
      entry.groups += 1;
      if (row.productId) {
        entry.withProduct += 1;
        entry.productIds.push(row.productId);
        if (row.productStatus === "PUBLISHED") entry.published += 1;
        else if (row.productStatus === "DRAFT") entry.draft += 1;
        else entry.other += 1;
      } else {
        entry.withoutProduct += 1;
      }
      if (row.isMultiView) entry.multiView += 1;
      else entry.standalone += 1;
      if (row.needsReview) entry.needsReview += 1;
    });
    return [...map.values()]
      .map((entry) => ({ ...entry, productIds: [...new Set(entry.productIds)].sort() }))
      .sort((a, b) => a.key.localeCompare(b.key));
  };

  const byCategory = rollup((row) => row.category);
  const bySubtype = rollup((row) => row.subtype || row.category);

  /* Duplicate groups: the same groupKey resolved twice is an architectural
     failure, and two products claiming one group is an ownership failure.
     Both are surfaced rather than silently de-duplicated. */
  const groupKeyCounts = new Map();
  rows.forEach((row) => groupKeyCounts.set(row.groupKey, (groupKeyCounts.get(row.groupKey) ?? 0) + 1));
  const duplicateGroups = [...groupKeyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([groupKey, count]) => ({ groupKey, count }));

  const productGroupCounts = new Map();
  rows.forEach((row) => {
    if (!row.productId) return;
    if (!productGroupCounts.has(row.productId)) productGroupCounts.set(row.productId, []);
    productGroupCounts.get(row.productId).push(row.groupKey);
  });
  const productsWithMultipleGroups = [...productGroupCounts.entries()]
    .filter(([, keys]) => keys.length > 1)
    .map(([productId, groupKeys]) => ({ productId, groupKeys }));

  /* Filesystem drift: a file on disk that no register knows about is a
     silent coverage hole — it can never become a product. */
  const orphanedDiskFiles = inventory
    .filter((row) => row.onDisk === true && !row.inManifest && !row.inRegister)
    .map((row) => row.fileName);
  const missingFromDisk = diskFiles
    ? inventory.filter((row) => row.onDisk === false).map((row) => row.fileName)
    : [];

  const productFiles = inventory.filter((row) => row.isProductCandidate);
  const houseFiles = inventory.filter((row) => row.isHouse);
  const marketingFiles = inventory.filter((row) => row.isMarketing);

  return {
    inventory,
    rows,
    byCategory,
    bySubtype,
    duplicateGroups,
    productsWithMultipleGroups,
    orphanedDiskFiles,
    missingFromDisk,
    totals: {
      libraryFiles: inventory.length,
      productMediaFiles: productFiles.length,
      houseMediaFiles: houseFiles.length,
      marketingMediaFiles: marketingFiles.length,
      groups: rows.length,
      groupsWithProducts: rows.filter((row) => row.productId).length,
      groupsWithoutProducts: rows.filter((row) => !row.productId).length,
      publishedGroups: rows.filter((row) => row.productStatus === "PUBLISHED").length,
      draftGroups: rows.filter((row) => row.productStatus === "DRAFT").length,
      multiViewGroups: rows.filter((row) => row.isMultiView).length,
      standaloneGroups: rows.filter((row) => !row.isMultiView).length,
      needsReviewGroups: rows.filter((row) => row.needsReview).length,
      distinctProductIds: new Set(rows.filter((row) => row.productId).map((row) => row.productId))
        .size,
    },
  };
};

/**
 * Groups that have NO product record of any kind — the only legitimate
 * input to draft creation. Coverage is complete when this is empty.
 */
export const uncoveredProductGroups = (discovery) =>
  (discovery?.rows ?? []).filter((row) => !row.productId);

/**
 * The FILENAME-DERIVED DISCOVERY view (rule 23): what each group's filename
 * says, what the catalogue already knows, and what should happen next.
 */
export const filenameDerivedDiscovery = (discovery) =>
  (discovery?.rows ?? []).map((row) => ({
    groupKey: row.groupKey,
    files: row.files,
    category: row.category,
    subcategory: row.subtype,
    existingProductId: row.productId,
    candidateProductId: row.candidateProductId,
    assignedProductId: row.assignedProductId,
    match: row.match,
    action: row.action,
  }));

export default {
  FILENAME_FAMILY_RULES,
  deriveIdentityFromFilename,
  isHouseFileName,
  isHomepageHeroFileName,
  isKidsFileName,
  buildLibraryInventory,
  discoveryMediaGroups,
  discoveryCategoryForGroup,
  discoverySubtypeForGroup,
  resolveGroupOwnership,
  getMediaProductDiscovery,
  uncoveredProductGroups,
  filenameDerivedDiscovery,
};
