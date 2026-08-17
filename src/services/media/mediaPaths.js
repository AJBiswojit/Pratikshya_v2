/**
 * PRATIKSHYA FASHON — Canonical media paths (Phase 21.11).
 *
 * `public/library` is the single commercial media root established in
 * Phases 21.4 / 21.6. This module is the only place that knows how a
 * legacy `/images/…` address maps onto that root.
 *
 * No React. No second register. Callers still go through mediaResolver /
 * productMediaSet / imageRef — they never hard-code a commercial path.
 */

export const CANONICAL_MEDIA_ROOT = "/library";
export const HOUSE_PLATE_PREFIX = "house-";

/**
 * The ten house plates that used to live under `public/images`.
 * They are editorial / hero / category fallback artwork — never products.
 * Ownership is not inferred.
 */
export const HOUSE_PLATE_MIGRATION = [
  {
    id: "pm-ing-9843818f9b5c",
    oldPath: "images/atelier-fabric.jpg",
    newPath: "library/house-atelier-fabric.jpg",
    fileName: "house-atelier-fabric.jpg",
    usage: "hero/editorial",
    productId: null,
    taxonomyId: null,
    collectionId: null,
    status: "MIGRATED",
  },
  {
    id: "pm-ing-075f33ec47cf",
    oldPath: "images/bridal-editorial.jpg",
    newPath: "library/house-bridal-editorial.jpg",
    fileName: "house-bridal-editorial.jpg",
    usage: "editorial/hero/category",
    productId: null,
    taxonomyId: "lehengas",
    collectionId: "bridal-trousseau",
    status: "MIGRATED",
  },
  {
    id: "pm-ing-ef18ac022573",
    oldPath: "images/commerce-hero.jpg",
    newPath: "library/house-commerce-hero.jpg",
    fileName: "house-commerce-hero.jpg",
    usage: "hero/editorial",
    productId: null,
    taxonomyId: null,
    collectionId: null,
    status: "MIGRATED",
  },
  {
    id: "pm-ing-6229b9ced7d4",
    oldPath: "images/editorial-hero.jpg",
    newPath: "library/house-editorial-hero.jpg",
    fileName: "house-editorial-hero.jpg",
    usage: "hero/editorial/category",
    productId: null,
    taxonomyId: "sarees",
    collectionId: null,
    status: "MIGRATED",
  },
  {
    id: "pm-ing-7f2cd530db3d",
    oldPath: "images/future-hero.jpg",
    newPath: "library/house-future-hero.jpg",
    fileName: "house-future-hero.jpg",
    usage: "hero/editorial/category",
    productId: null,
    taxonomyId: "lehengas",
    collectionId: null,
    status: "MIGRATED",
  },
  {
    id: "pm-ing-5582d5813c12",
    oldPath: "images/heritage-textile.jpg",
    newPath: "library/house-heritage-textile.jpg",
    fileName: "house-heritage-textile.jpg",
    usage: "editorial/category/collection",
    productId: null,
    taxonomyId: "sarees",
    collectionId: "heritage-weaves",
    status: "MIGRATED",
  },
  {
    id: "pm-ing-62c7ad21a728",
    oldPath: "images/minimal-hero.jpg",
    newPath: "library/house-minimal-hero.jpg",
    fileName: "house-minimal-hero.jpg",
    usage: "hero/editorial/category",
    productId: null,
    taxonomyId: "kurtis-and-suits",
    collectionId: "everyday-atelier",
    status: "MIGRATED",
  },
  {
    id: "pm-ing-063b2212fd9a",
    oldPath: "images/pratikshya/groom/groom-sherwani.jpg",
    newPath: "library/house-groom-sherwani.jpg",
    fileName: "house-groom-sherwani.jpg",
    usage: "category/collection",
    productId: null,
    taxonomyId: "menswear",
    collectionId: "groom-atelier",
    status: "MIGRATED",
  },
  {
    id: "pm-ing-bd139c1e51cd",
    oldPath: "images/pratikshya/jewellery/bangles-gold.jpg",
    newPath: "library/house-bridal-bangles.jpg",
    fileName: "house-bridal-bangles.jpg",
    usage: "category/collection",
    productId: null,
    taxonomyId: "bangles",
    collectionId: "bridal-trousseau",
    status: "MIGRATED",
  },
  {
    id: "pm-ing-dc3acc6caf72",
    oldPath: "images/pratikshya/kids/kids-festive.jpg",
    newPath: "library/house-kids-festive.jpg",
    fileName: "house-kids-festive.jpg",
    usage: "category/collection",
    productId: null,
    taxonomyId: "kidswear",
    collectionId: "little-heirlooms",
    status: "MIGRATED",
  },
];

const stripQuery = (value) => String(value || "").split("?")[0].split("#")[0];

/** Repository-relative, lower-case, no leading slash. */
export const normalizeMediaPath = (value) =>
  stripQuery(value)
    .replace(/\\/g, "/")
    .replace(/^public\//i, "")
    .replace(/^\/+/, "")
    .toLowerCase();

const fileNameOf = (value) => {
  const clean = stripQuery(value).replace(/\\/g, "/");
  const leaf = clean.split("/").pop() || "";
  return leaf.toLowerCase();
};

const asPublicUrl = (rel) => {
  const clean = String(rel || "").replace(/^\/+/, "");
  return clean ? `/${clean}` : "";
};

const buildLegacyIndex = () => {
  const byPath = new Map();
  const byFile = new Map();
  HOUSE_PLATE_MIGRATION.forEach((entry) => {
    const oldRel = normalizeMediaPath(entry.oldPath);
    const newRel = normalizeMediaPath(entry.newPath);
    byPath.set(oldRel, entry);
    byPath.set(`/${oldRel}`, entry);
    byPath.set(newRel, entry);
    byPath.set(`/${newRel}`, entry);
    const oldFile = fileNameOf(entry.oldPath);
    const newFile = fileNameOf(entry.newPath);
    if (oldFile) byFile.set(oldFile, entry);
    if (newFile) byFile.set(newFile, entry);
  });
  return { byPath, byFile };
};

const LEGACY_INDEX = buildLegacyIndex();

export const lookupLegacyMedia = (value) => {
  if (!value) return null;
  const rel = normalizeMediaPath(value);
  if (!rel) return null;
  if (LEGACY_INDEX.byPath.has(rel)) return LEGACY_INDEX.byPath.get(rel);
  if (LEGACY_INDEX.byPath.has(`/${rel}`)) return LEGACY_INDEX.byPath.get(`/${rel}`);
  const file = fileNameOf(value);
  if (file && LEGACY_INDEX.byFile.has(file)) return LEGACY_INDEX.byFile.get(file);
  return null;
};

export const isRemoteMediaUrl = (value) => {
  const raw = String(value || "").trim();
  return (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  );
};

export const isCanonicalMediaUrl = (value) => {
  const rel = normalizeMediaPath(value);
  return rel.startsWith("library/");
};

export const isHousePlateUrl = (value) => {
  const file = fileNameOf(value);
  if (file.startsWith(HOUSE_PLATE_PREFIX)) return true;
  const mapped = lookupLegacyMedia(value);
  return Boolean(mapped);
};

/**
 * Real ingested photography (product / category / collection plates),
 * as opposed to the house fallback artwork that now also lives in /library.
 */
export const isIngestedPhotographyUrl = (value) => {
  if (!isCanonicalMediaUrl(value)) return false;
  const file = fileNameOf(value);
  return Boolean(file) && !file.startsWith(HOUSE_PLATE_PREFIX);
};

export const isLegacyImagesUrl = (value) => normalizeMediaPath(value).startsWith("images/");

/**
 * Rewrite a stored or authored address onto the canonical library path.
 * Remote / blob / data URLs are left alone. Unknown local paths pass through.
 */
export const resolveLegacyMediaUrl = (value) => {
  if (value == null) return value;
  const raw = String(value).trim();
  if (!raw) return raw;
  if (isRemoteMediaUrl(raw)) return raw;

  const mapped = lookupLegacyMedia(raw);
  if (mapped) return asPublicUrl(mapped.newPath);

  if (isCanonicalMediaUrl(raw)) {
    return raw.startsWith("/") ? stripQuery(raw) : asPublicUrl(normalizeMediaPath(raw));
  }

  return raw;
};

/**
 * House-manifest helper. Accepts either a legacy relative path
 * (`atelier-fabric.jpg`, `pratikshya/groom/groom-sherwani.jpg`) or a
 * full `/images/…` address and returns the canonical `/library/house-…` URL.
 */
export const resolveHousePlateUrl = (legacyRelativePath) => {
  const candidate = String(legacyRelativePath || "").trim();
  if (!candidate) return `${CANONICAL_MEDIA_ROOT}/house-atelier-fabric.jpg`;
  if (isRemoteMediaUrl(candidate)) return candidate;
  const prefixed = candidate.startsWith("images/") || candidate.startsWith("/images/")
    ? candidate
    : `images/${candidate.replace(/^\/+/, "")}`;
  return resolveLegacyMediaUrl(prefixed);
};

export default {
  CANONICAL_MEDIA_ROOT,
  HOUSE_PLATE_PREFIX,
  HOUSE_PLATE_MIGRATION,
  normalizeMediaPath,
  lookupLegacyMedia,
  isRemoteMediaUrl,
  isCanonicalMediaUrl,
  isHousePlateUrl,
  isIngestedPhotographyUrl,
  isLegacyImagesUrl,
  resolveLegacyMediaUrl,
  resolveHousePlateUrl,
};
