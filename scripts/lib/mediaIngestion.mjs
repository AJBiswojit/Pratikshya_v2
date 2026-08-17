/**
 * PRATIKSHYA FASHON — Media ingestion (Phase 21.4).
 *
 * Pure, deterministic helpers used by `scripts/optimize-media.mjs` and by
 * the Node test suite. Nothing here touches the browser, React, or the
 * live media register. Folder → taxonomy mapping is derived only from
 * path tokens and the authored catalogue — never from a visual guess.
 */

import { createHash } from "node:crypto";

export const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

/** Legacy house-artwork source root. Phase 21.11 copies these into `library/`. */
export const HOUSE_IMAGE_ROOT = "images";

/** Source fashion library that this phase ingests. */
export const SOURCE_MEDIA_ROOT = "media";

/** Application-ready output. Originals in `public/media` are left intact. */
export const OPTIMIZED_ROOT = "library";

export const LARGE_FILE_BYTES = 1.5 * 1024 * 1024;
export const LOW_RESOLUTION_WIDTH = 400;
export const MAX_OUTPUT_EDGE = 1800;
export const WEBP_QUALITY = 82;

/**
 * Products that already carry authored seed media. Ingestion never steals
 * their cover — the Phase 12 seed remains the authority for those ids.
 */
export const RESERVED_PRODUCT_IDS = new Set([
  "pf-001",
  "pf-002",
  "pf-004",
  "pf-005",
  "pf-024",
  "pf-036",
]);

/** Flat dumps: many unrelated stills in one folder. Never auto-slotted to a product. */
export const DUMP_DIRECTORIES = new Set([
  "media/kids",
  "media/accesories/earrings",
  "media/accesories/bangles",
  "media/accesories/anklet",
  "media/accessories/earrings",
  "media/accessories/bangles",
  "media/accessories/anklet",
  "media/women/innerwear",
  "images",
  "images/pratikshya/groom",
  "images/pratikshya/jewellery",
  "images/pratikshya/kids",
]);

export const USAGE_ROLES = {
  HERO: "HERO",
  CATEGORY_COVER: "CATEGORY_COVER",
  PRODUCT_PRIMARY: "PRODUCT_PRIMARY",
  PRODUCT_GALLERY: "PRODUCT_GALLERY",
  PRODUCT_THUMBNAIL: "PRODUCT_THUMBNAIL",
  EDITORIAL: "EDITORIAL",
  BANNER: "BANNER",
  NEW_ARRIVAL: "NEW_ARRIVAL",
  SALE: "SALE",
  LOOKBOOK: "LOOKBOOK",
  COLLECTION_COVER: "COLLECTION_COVER",
  AI_SHOPPING: "AI_SHOPPING",
  AI_MIRROR: "AI_MIRROR",
};

export const MAPPING_STATUS = {
  MAPPED: "MAPPED",
  UNMAPPED: "UNMAPPED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
};

export const DUPLICATE_STATUS = {
  UNIQUE: "UNIQUE",
  DUPLICATE: "DUPLICATE",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
};

export const AI_MIRROR_ELIGIBLE_CATEGORIES = new Set([
  "sarees",
  "lehengas",
  "bridal-couture",
  "kurtis-and-suits",
  "menswear",
  "kidswear",
]);

/* ------------------------------------------------------------------ */
/* Path helpers                                                        */
/* ------------------------------------------------------------------ */

export const posixRel = (value) =>
  String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/^public\//, "");

export const dirnameOf = (rel) => {
  const normalized = posixRel(rel);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
};

export const basenameOf = (rel) => {
  const normalized = posixRel(rel);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? normalized : normalized.slice(index + 1);
};

export const extensionOf = (filename) => {
  const name = String(filename || "").toLowerCase();
  const match = name.match(/(\.[a-z0-9]+)$/i);
  return match ? match[1] : "";
};

export const slugifyName = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export const publicUrl = (rel) => `/${posixRel(rel).replace(/^\/+/, "")}`;

export const buildMediaId = (originalPath) => {
  const digest = createHash("sha1").update(posixRel(originalPath)).digest("hex").slice(0, 12);
  return `pm-ing-${digest}`;
};

export const fileChecksum = (buffer) => createHash("sha256").update(buffer).digest("hex");

export const aspectRatio = (width, height) => {
  const w = Number(width) || 0;
  const h = Number(height) || 0;
  if (!w || !h) return 0;
  return Math.round((w / h) * 1000) / 1000;
};

/* ------------------------------------------------------------------ */
/* Folder → taxonomy                                                   */
/* ------------------------------------------------------------------ */

const classification = (partial) => ({
  categoryId: null,
  subcategoryName: null,
  collectionId: null,
  mappingStatus: MAPPING_STATUS.UNMAPPED,
  mappingMethod: "FOLDER",
  mappingNote: "",
  namePrefix: "media",
  probableUsage: "unmapped",
  gender: null,
  dump: false,
  house: false,
  ...partial,
});

const HOUSE_CLASSIFICATIONS = {
  "images/atelier-fabric.jpg": classification({
    categoryId: null,
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House atelier fabric plate already used as the landing hero fallback.",
    namePrefix: "house-atelier-fabric",
    probableUsage: "hero/editorial",
    house: true,
    dump: true,
  }),
  "images/bridal-editorial.jpg": classification({
    categoryId: "lehengas",
    collectionId: "bridal-trousseau",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House bridal editorial plate.",
    namePrefix: "house-bridal-editorial",
    probableUsage: "hero/editorial",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/commerce-hero.jpg": classification({
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House commerce hero plate.",
    namePrefix: "house-commerce-hero",
    probableUsage: "hero/editorial",
    house: true,
    dump: true,
  }),
  "images/editorial-hero.jpg": classification({
    categoryId: "sarees",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House editorial hero plate.",
    namePrefix: "house-editorial-hero",
    probableUsage: "hero/editorial",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/future-hero.jpg": classification({
    categoryId: "lehengas",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House future/wine lehenga hero plate.",
    namePrefix: "house-future-hero",
    probableUsage: "hero/editorial",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/heritage-textile.jpg": classification({
    categoryId: "sarees",
    collectionId: "heritage-weaves",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House heritage textile plate.",
    namePrefix: "house-heritage-textile",
    probableUsage: "editorial",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/minimal-hero.jpg": classification({
    categoryId: "kurtis-and-suits",
    collectionId: "everyday-atelier",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House contemporary/minimal plate.",
    namePrefix: "house-minimal-hero",
    probableUsage: "editorial",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/pratikshya/groom/groom-sherwani.jpg": classification({
    categoryId: "menswear",
    subcategoryName: "Sherwani",
    collectionId: "groom-atelier",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House groom sherwani campaign plate.",
    namePrefix: "house-groom-sherwani",
    probableUsage: "category/editorial",
    gender: "Men",
    house: true,
    dump: true,
  }),
  "images/pratikshya/jewellery/bangles-gold.jpg": classification({
    categoryId: "bangles",
    collectionId: "bridal-trousseau",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House bridal bangles plate.",
    namePrefix: "house-bridal-bangles",
    probableUsage: "category",
    gender: "Women",
    house: true,
    dump: true,
  }),
  "images/pratikshya/kids/kids-festive.jpg": classification({
    categoryId: "kidswear",
    collectionId: "little-heirlooms",
    mappingStatus: MAPPING_STATUS.MAPPED,
    mappingNote: "House kids festive plate.",
    namePrefix: "house-kids-festive",
    probableUsage: "category",
    gender: "Kids",
    house: true,
    dump: true,
  }),
};

/**
 * Maps a repository-relative image path onto existing taxonomy ids.
 * Unknown folders stay UNMAPPED — this function never invents a category.
 */
export const classifyPath = (originalPath) => {
  const rel = posixRel(originalPath);
  const lower = rel.toLowerCase();

  if (HOUSE_CLASSIFICATIONS[lower]) return { ...HOUSE_CLASSIFICATIONS[lower] };

  if (lower.startsWith("images/")) {
    return classification({
      mappingNote: "House image without a dedicated classification.",
      namePrefix: `house-${slugifyName(basenameOf(lower).replace(/\.[a-z0-9]+$/i, "")) || "artwork"}`,
      house: true,
      dump: true,
    });
  }

  const media = lower.replace(/^media\//, "");

  if (media.startsWith("accesories/anklet") || media.startsWith("accessories/anklet")) {
    return classification({
      mappingNote: "Folder is anklets. The taxonomy has no Anklet category or product — left unmapped.",
      namePrefix: "jewellery-anklet",
      dump: true,
    });
  }

  if (media.startsWith("accesories/bangles") || media.startsWith("accessories/bangles")) {
    return classification({
      categoryId: "bangles",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder accesories/bangles → existing Bangles category.",
      namePrefix: "jewellery-bangle",
      probableUsage: "category",
      gender: "Women",
      dump: true,
    });
  }

  if (media.startsWith("accesories/earrings") || media.startsWith("accessories/earrings")) {
    return classification({
      categoryId: "jewellery",
      subcategoryName: "Earrings",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder accesories/earrings → Jewellery / Earrings.",
      namePrefix: "jewellery-earring",
      probableUsage: "category",
      gender: "Women",
      dump: true,
    });
  }

  if (media.startsWith("kids/") || media === "kids") {
    return classification({
      categoryId: "kidswear",
      collectionId: "little-heirlooms",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder kids → existing Kids Wear category. Flat dump — not slotted to a product.",
      namePrefix: "kids",
      probableUsage: "category",
      gender: "Kids",
      dump: true,
    });
  }

  if (media.includes("kurta pajama") || media.includes("kurta_pajama")) {
    return classification({
      categoryId: "menswear",
      subcategoryName: "Kurta Pajama",
      collectionId: "everyday-atelier",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder men/Kurta pajama → Men's Wear / Kurta Pajama.",
      namePrefix: "men-kurta-pajama",
      probableUsage: "product/category",
      gender: "Men",
    });
  }

  if (media.includes("sherwani")) {
    return classification({
      categoryId: "menswear",
      subcategoryName: "Sherwani",
      collectionId: "groom-atelier",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder men/sherwani_marriage → Men's Wear / Sherwani.",
      namePrefix: "men-sherwani",
      probableUsage: "product/category",
      gender: "Men",
    });
  }

  if (media.startsWith("women/innerwear")) {
    return classification({
      categoryId: "innerwear",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/innerwear → existing Innerwear category. Flat dump — not slotted to a product.",
      namePrefix: "women-innerwear",
      probableUsage: "category",
      gender: "Women",
      dump: true,
    });
  }

  if (media.startsWith("women/lehnga") || media.startsWith("women/lehenga")) {
    return classification({
      categoryId: "lehengas",
      collectionId: "bridal-trousseau",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/lehnga → existing Lehengas category.",
      namePrefix: "women-lehenga",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.startsWith("women/marriage")) {
    return classification({
      categoryId: "bridal-couture",
      collectionId: "bridal-trousseau",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/marriage → existing Bridal Couture category.",
      namePrefix: "women-bridal",
      probableUsage: "product/editorial",
      gender: "Women",
    });
  }

  if (media.includes("bandhani")) {
    return classification({
      categoryId: "sarees",
      mappingStatus: MAPPING_STATUS.NEEDS_REVIEW,
      mappingNote: "Folder is bandhani under sarees. No Bandhani subcategory or product exists — category only.",
      namePrefix: "women-saree-bandhani",
      probableUsage: "category",
      gender: "Women",
    });
  }

  if (media.includes("baranasi") || media.includes("banarasi")) {
    return classification({
      categoryId: "sarees",
      subcategoryName: "Banarasi Saree",
      collectionId: "heritage-weaves",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree/baranasi → Sarees / Banarasi Saree.",
      namePrefix: "women-saree-banarasi",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.includes("chanderi")) {
    return classification({
      categoryId: "sarees",
      mappingStatus: MAPPING_STATUS.NEEDS_REVIEW,
      mappingNote: "Folder is chanderi under sarees. No Chanderi saree product exists (only a Chanderi kurti) — category only.",
      namePrefix: "women-saree-chanderi",
      probableUsage: "category",
      gender: "Women",
    });
  }

  if (media.includes("chiffon")) {
    return classification({
      categoryId: "sarees",
      subcategoryName: "Printed Saree",
      collectionId: "everyday-atelier",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree/chiffon → Sarees / Printed Saree (the catalogue's chiffon sarees sit in that style).",
      namePrefix: "women-saree-chiffon",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.includes("cotton")) {
    return classification({
      categoryId: "sarees",
      subcategoryName: "Cotton Saree",
      collectionId: "handloom-stories",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree/cotton sarees → Sarees / Cotton Saree.",
      namePrefix: "women-saree-cotton",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.includes("kanchipuram") || media.includes("kanjivaram") || media.includes("kanjeevaram")) {
    return classification({
      categoryId: "sarees",
      subcategoryName: "Silk Saree",
      collectionId: "heritage-weaves",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree/kanchipuram → Sarees / Silk Saree (Kanchipuram/Kanjivaram is a silk style already in the catalogue).",
      namePrefix: "women-saree-kanchipuram",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.includes("silk")) {
    return classification({
      categoryId: "sarees",
      subcategoryName: "Silk Saree",
      collectionId: "heritage-weaves",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree/silk sarees → Sarees / Silk Saree.",
      namePrefix: "women-saree-silk",
      probableUsage: "product/category",
      gender: "Women",
    });
  }

  if (media.startsWith("women/saree")) {
    return classification({
      categoryId: "sarees",
      mappingStatus: MAPPING_STATUS.MAPPED,
      mappingNote: "Folder women/saree → existing Sarees category.",
      namePrefix: "women-saree",
      probableUsage: "category",
      gender: "Women",
    });
  }

  if (media.startsWith("women/")) {
    return classification({
      mappingNote: "Folder is under women/ but does not match a known taxonomy path.",
      namePrefix: "women",
      gender: "Women",
    });
  }

  if (media.startsWith("men/")) {
    return classification({
      categoryId: "menswear",
      mappingStatus: MAPPING_STATUS.NEEDS_REVIEW,
      mappingNote: "Folder is under men/ but the style is not a known subcategory.",
      namePrefix: "men",
      gender: "Men",
    });
  }

  return classification({
    mappingNote: "Folder path does not confidently match an existing taxonomy record.",
    namePrefix: "unmapped",
  });
};

export const isDumpDirectory = (relDir) => DUMP_DIRECTORIES.has(posixRel(relDir).toLowerCase());

export const isProductSetDirectory = (relDir) => {
  const dir = posixRel(relDir).toLowerCase();
  if (!dir || isDumpDirectory(dir)) return false;
  if (dir.startsWith("images")) return false;
  return dir.startsWith("media/");
};

/* ------------------------------------------------------------------ */
/* Duplicate detection                                                 */
/* ------------------------------------------------------------------ */

/**
 * Exact checksum matches are DUPLICATE (canonical = first path in sort
 * order). Same leaf-folder + near-identical size + same dimensions is
 * POSSIBLE_DUPLICATE. Nothing is deleted.
 */
export const detectDuplicates = (items) => {
  const sorted = [...items].sort((a, b) =>
    String(a.originalPath).localeCompare(String(b.originalPath))
  );

  const byChecksum = new Map();
  sorted.forEach((item) => {
    if (!item.checksum) return;
    if (!byChecksum.has(item.checksum)) byChecksum.set(item.checksum, []);
    byChecksum.get(item.checksum).push(item.originalPath);
  });

  const exactCanonical = new Map();
  byChecksum.forEach((paths) => {
    const uniquePaths = [...new Set(paths)];
    if (uniquePaths.length < 2) return;
    const canonical = uniquePaths[0];
    uniquePaths.forEach((path) => exactCanonical.set(path, canonical));
  });

  return items.map((item) => {
    const canonical = exactCanonical.get(item.originalPath);
    if (canonical && canonical !== item.originalPath) {
      return {
        ...item,
        duplicateStatus: DUPLICATE_STATUS.DUPLICATE,
        duplicateOf: buildMediaId(canonical),
      };
    }

    const siblings = items.filter((other) => {
      if (other.originalPath === item.originalPath) return false;
      if (dirnameOf(other.originalPath) !== dirnameOf(item.originalPath)) return false;
      if (other.width !== item.width || other.height !== item.height) return false;
      const sizeA = Number(other.sizeBytes) || 0;
      const sizeB = Number(item.sizeBytes) || 0;
      if (!sizeA || !sizeB) return false;
      return Math.abs(sizeA - sizeB) / Math.max(sizeA, sizeB) <= 0.02;
    });

    if (siblings.length) {
      const canonicalSibling = [item, ...siblings].sort((a, b) =>
        a.originalPath.localeCompare(b.originalPath)
      )[0];
      if (canonicalSibling.originalPath !== item.originalPath) {
        return {
          ...item,
          duplicateStatus: DUPLICATE_STATUS.POSSIBLE_DUPLICATE,
          duplicateOf: buildMediaId(canonicalSibling.originalPath),
        };
      }
    }

    return {
      ...item,
      duplicateStatus: DUPLICATE_STATUS.UNIQUE,
      duplicateOf: null,
    };
  });
};

/* ------------------------------------------------------------------ */
/* Product slot assignment                                             */
/* ------------------------------------------------------------------ */

/**
 * Builds the authored catalogue into `{ id, category, subcategory, ... }`
 * using the same pf-NNN identity the storefront has always used.
 */
export const catalogueAsProducts = (catalogue = []) =>
  catalogue.map((product, index) => ({
    id: product.id || `pf-${String(index + 1).padStart(3, "0")}`,
    name: product.name,
    category: product.category,
    subcategory: product.subcategory,
    collection: product.collection,
    isNew: Boolean(product.isNew),
    originalPrice: product.originalPrice ?? null,
    gender: product.gender,
  }));

/** Categories that may receive a folder-slot without a named subcategory. */
const CATEGORY_WIDE_SLOT = new Set(["lehengas", "bridal-couture"]);

const productMatchesClassification = (product, item) => {
  if (!product || !item?.categoryId) return false;
  if (product.category !== item.categoryId) return false;
  if (item.subcategoryName) return product.subcategory === item.subcategoryName;
  /* No named style — only bridal/lehenga product-sets may slot by category. */
  return CATEGORY_WIDE_SLOT.has(item.categoryId);
};

/**
 * Product-set folders (several angles of one piece) are slotted onto
 * catalogue products in the same category/subcategory, in stable id order.
 *
 * This is a folder-slot, not a claim that "silk saree1" *is* a named SKU.
 * Reserved seed products are skipped. Leftover folders stay category media
 * with NEEDS_REVIEW so an operator can finish the pairing.
 */
export const assignProductSlots = (items, products, reservedIds = RESERVED_PRODUCT_IDS) => {
  const eligible = products
    .filter((product) => !reservedIds.has(product.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  const groups = new Map();
  items.forEach((item) => {
    if (item.dump || item.house) return;
    if (!isProductSetDirectory(dirnameOf(item.originalPath))) return;
    const key = dirnameOf(item.originalPath);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });

  const folderKeys = [...groups.keys()].sort((a, b) => a.localeCompare(b));
  const usedProducts = new Set();
  const assignment = new Map();

  folderKeys.forEach((folder) => {
    const members = groups.get(folder);
    const sample = members[0];
    const match = eligible.find(
      (product) => !usedProducts.has(product.id) && productMatchesClassification(product, sample)
    );
    if (!match) {
      members.forEach((item) => {
        assignment.set(item.originalPath, {
          productId: null,
          mappingStatus:
            sample.mappingStatus === MAPPING_STATUS.UNMAPPED
              ? MAPPING_STATUS.UNMAPPED
              : MAPPING_STATUS.NEEDS_REVIEW,
          mappingMethod: "FOLDER",
          mappingNote: sample.mappingNote
            ? `${sample.mappingNote} No remaining product in this style to receive the folder-slot.`
            : "Product-set folder has no remaining catalogue product in this style.",
        });
      });
      return;
    }
    usedProducts.add(match.id);
    members.forEach((item, index) => {
      assignment.set(item.originalPath, {
        productId: match.id,
        mappingStatus: MAPPING_STATUS.MAPPED,
        mappingMethod: "SUBCATEGORY_SLOT",
        mappingNote: `Folder-slot: ${folder} → ${match.id} (${match.name}). Assigned because the folder is a product set under ${sample.categoryId}${sample.subcategoryName ? ` / ${sample.subcategoryName}` : ""}. Review recommended.`,
        sortOrder: index,
        role: index === 0 ? "COVER" : "GALLERY",
      });
    });
  });

  return items.map((item) => {
    const extra = assignment.get(item.originalPath);
    if (!extra) return { ...item, productId: item.productId ?? null };
    return { ...item, ...extra };
  });
};

/* ------------------------------------------------------------------ */
/* Usage roles                                                         */
/* ------------------------------------------------------------------ */

const unique = (values) => [...new Set(values.filter(Boolean))];

export const assignUsageRoles = (item, { isFirstInSet = false, isFirstInCategory = false, product = null } = {}) => {
  const roles = [];
  const path = posixRel(item.originalPath).toLowerCase();
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const portrait = height >= width;
  const largeEnough = width >= 800;

  if (item.house) {
    if (/hero|editorial|atelier|bridal-editorial|commerce|future|heritage/.test(path)) {
      roles.push(USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK);
    }
    if (/hero|atelier|bridal-editorial|commerce|future/.test(path)) {
      roles.push(USAGE_ROLES.HERO);
    }
    if (item.categoryId) roles.push(USAGE_ROLES.CATEGORY_COVER);
    if (item.collectionId) roles.push(USAGE_ROLES.COLLECTION_COVER);
    return unique(roles);
  }

  if (item.categoryId && isFirstInCategory) roles.push(USAGE_ROLES.CATEGORY_COVER);
  if (item.collectionId && isFirstInSet) roles.push(USAGE_ROLES.COLLECTION_COVER);

  if (item.productId) {
    roles.push(isFirstInSet ? USAGE_ROLES.PRODUCT_PRIMARY : USAGE_ROLES.PRODUCT_GALLERY);
    roles.push(USAGE_ROLES.PRODUCT_THUMBNAIL);
    roles.push(USAGE_ROLES.AI_SHOPPING);
    if (AI_MIRROR_ELIGIBLE_CATEGORIES.has(item.categoryId)) {
      roles.push(USAGE_ROLES.AI_MIRROR);
    }
    if (product?.isNew) roles.push(USAGE_ROLES.NEW_ARRIVAL);
    if (product?.originalPrice) roles.push(USAGE_ROLES.SALE);
  } else if (item.categoryId && AI_MIRROR_ELIGIBLE_CATEGORIES.has(item.categoryId) && !item.dump) {
    roles.push(USAGE_ROLES.AI_SHOPPING);
  }

  const editorialPath = /marriage|lehnga|lehenga|sherwani|silk|bridal|kanchipuram|heritage|editorial/.test(path);
  if (editorialPath && portrait && largeEnough) {
    roles.push(USAGE_ROLES.EDITORIAL, USAGE_ROLES.LOOKBOOK);
    if (isFirstInSet && width >= 1000) roles.push(USAGE_ROLES.HERO);
  }

  if (item.house === false && item.dump && item.categoryId && isFirstInCategory) {
    roles.push(USAGE_ROLES.CATEGORY_COVER);
  }

  if (!roles.length && item.categoryId) {
    roles.push(USAGE_ROLES.CATEGORY_COVER);
  }

  return unique(roles);
};

/* ------------------------------------------------------------------ */
/* Naming                                                              */
/* ------------------------------------------------------------------ */

export const assignDeterministicNames = (items) => {
  const counters = new Map();
  return [...items]
    .sort((a, b) => String(a.originalPath).localeCompare(String(b.originalPath)))
    .map((item) => {
      if (item.house) {
        const ext = extensionOf(item.originalPath) || ".jpg";
        const stem =
          item.namePrefix ||
          `house-${slugifyName(basenameOf(item.originalPath).replace(/\.[a-z0-9]+$/i, "")) || "artwork"}`;
        const currentFilename = `${stem}${ext}`;
        return {
          ...item,
          currentFilename,
          optimizedPath: `${OPTIMIZED_ROOT}/${currentFilename}`,
          skipOptimize: true,
        };
      }
      const prefix = item.namePrefix || "media";
      const next = (counters.get(prefix) || 0) + 1;
      counters.set(prefix, next);
      const currentFilename = `${prefix}-${String(next).padStart(3, "0")}.webp`;
      return {
        ...item,
        currentFilename,
        optimizedPath: `${OPTIMIZED_ROOT}/${currentFilename}`,
        skipOptimize: false,
        nameIndex: next,
      };
    });
};

/* ------------------------------------------------------------------ */
/* Pipeline                                                            */
/* ------------------------------------------------------------------ */

const decorateSetFlags = (items) => {
  const firstInSet = new Set();
  const firstInCategory = new Set();
  const seenSets = new Set();
  const seenCategories = new Set();

  [...items]
    .sort((a, b) => String(a.originalPath).localeCompare(String(b.originalPath)))
    .forEach((item) => {
      const setKey = dirnameOf(item.originalPath);
      if (!seenSets.has(setKey)) {
        seenSets.add(setKey);
        firstInSet.add(item.originalPath);
      }
      const categoryKey = item.categoryId || `none:${setKey}`;
      if (!seenCategories.has(categoryKey)) {
        seenCategories.add(categoryKey);
        firstInCategory.add(item.originalPath);
      }
    });

  return { firstInSet, firstInCategory };
};

/**
 * Runs the full metadata pipeline on discovered file records.
 *
 * Each input item: `{ originalPath, filename, extension, sizeBytes, width, height, checksum }`.
 * Output items are ready to write as the ingested manifest.
 */
export const buildIngestionRecords = (files, { products = [] } = {}) => {
  const classified = files.map((file) => {
    const mapped = classifyPath(file.originalPath);
    const width = Number(file.width) || 0;
    const height = Number(file.height) || 0;
    return {
      ...file,
      ...mapped,
      id: buildMediaId(file.originalPath),
      originalFilename: file.filename || basenameOf(file.originalPath),
      originalPath: posixRel(file.originalPath),
      width,
      height,
      aspectRatio: aspectRatio(width, height),
      large: Number(file.sizeBytes) >= LARGE_FILE_BYTES,
      lowResolution: width > 0 && width < LOW_RESOLUTION_WIDTH,
    };
  });

  const withDuplicates = detectDuplicates(classified);
  const named = assignDeterministicNames(withDuplicates);
  const slotted = assignProductSlots(named, products);
  const { firstInSet, firstInCategory } = decorateSetFlags(slotted);
  const byId = new Map(products.map((product) => [product.id, product]));

  return slotted.map((item) => {
    const product = item.productId ? byId.get(item.productId) : null;
    const usageRoles = assignUsageRoles(item, {
      isFirstInSet: firstInSet.has(item.originalPath),
      isFirstInCategory: firstInCategory.has(item.originalPath),
      product,
    });
    const featured = firstInSet.has(item.originalPath) || firstInCategory.has(item.originalPath);
    return {
      ...item,
      usageRoles,
      featured,
      variantId: null,
    };
  });
};

export const summariseIngestion = (records, { beforeBytes = 0, afterBytes = 0 } = {}) => {
  const mapped = records.filter((item) => item.mappingStatus === MAPPING_STATUS.MAPPED);
  const unmapped = records.filter((item) => item.mappingStatus === MAPPING_STATUS.UNMAPPED);
  const review = records.filter((item) => item.mappingStatus === MAPPING_STATUS.NEEDS_REVIEW);
  const duplicates = records.filter((item) => item.duplicateStatus === DUPLICATE_STATUS.DUPLICATE);
  const possible = records.filter((item) => item.duplicateStatus === DUPLICATE_STATUS.POSSIBLE_DUPLICATE);
  const withProduct = records.filter((item) => item.productId);
  const categories = new Set(records.map((item) => item.categoryId).filter(Boolean));
  const subcategories = new Set(records.map((item) => item.subcategoryName).filter(Boolean));
  const collections = new Set(records.map((item) => item.collectionId).filter(Boolean));

  const roleCount = (role) => records.filter((item) => (item.usageRoles || []).includes(role)).length;

  const reduction =
    beforeBytes > 0 && afterBytes >= 0
      ? Math.round((1 - afterBytes / beforeBytes) * 1000) / 10
      : null;

  return {
    total: records.length,
    optimized: records.filter((item) => !item.skipOptimize).length,
    skipped: records.filter((item) => item.skipOptimize).length,
    duplicates: duplicates.length,
    possibleDuplicates: possible.length,
    mapped: mapped.length,
    unmapped: unmapped.length,
    needsReview: review.length,
    broken: records.filter((item) => item.broken).length,
    large: records.filter((item) => item.large).length,
    lowResolution: records.filter((item) => item.lowResolution).length,
    mappedToProducts: withProduct.length,
    mappedToCategories: records.filter((item) => item.categoryId).length,
    categoriesMapped: categories.size,
    subcategoriesMapped: subcategories.size,
    collectionsMapped: collections.size,
    productsWithMedia: new Set(withProduct.map((item) => item.productId)).size,
    usage: {
      hero: roleCount(USAGE_ROLES.HERO),
      category: roleCount(USAGE_ROLES.CATEGORY_COVER),
      product: roleCount(USAGE_ROLES.PRODUCT_PRIMARY) + roleCount(USAGE_ROLES.PRODUCT_GALLERY),
      editorial: roleCount(USAGE_ROLES.EDITORIAL),
      newArrival: roleCount(USAGE_ROLES.NEW_ARRIVAL),
      sale: roleCount(USAGE_ROLES.SALE),
      collection: roleCount(USAGE_ROLES.COLLECTION_COVER),
      aiShopping: roleCount(USAGE_ROLES.AI_SHOPPING),
      aiMirror: roleCount(USAGE_ROLES.AI_MIRROR),
    },
    storage: {
      beforeBytes,
      afterBytes,
      reductionPercent: reduction,
    },
    unmappedPaths: unmapped.map((item) => item.originalPath),
    reviewPaths: review.map((item) => item.originalPath),
    duplicatePaths: duplicates.map((item) => ({
      path: item.originalPath,
      of: item.duplicateOf,
    })),
  };
};

export default {
  classifyPath,
  detectDuplicates,
  assignProductSlots,
  assignDeterministicNames,
  assignUsageRoles,
  buildIngestionRecords,
  summariseIngestion,
  buildMediaId,
  slugifyName,
};
