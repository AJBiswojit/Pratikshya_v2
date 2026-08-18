/**
 * PRATIKSHYA FASHON — Mega-menu editorial media resolution.
 *
 * The navigation's editorial panel is a DISTRIBUTION SURFACE, not a data
 * source. It owns no image list, no product list and no filenames: it asks
 * this module for one plate and paints it.
 *
 *   MEGA MENU
 *       ↓  navigation group (women / bridal / men / kids / collections)
 *   DEPARTMENT or COLLECTION CONTEXT      ← derived from canonical taxonomy
 *       ↓
 *   CANONICAL MEDIA RESOLUTION            ← curated placement → product media
 *       ↓                                   → authored catalogue plate
 *   BEST ELIGIBLE IMAGE
 *
 * The scope is DERIVED, never authored: a department group resolves against
 * the canonical department it already routes to, and the Collections group
 * resolves against the very collection its editorial feature already links
 * to. Adding a department to `src/data/catalog/taxonomy.js` therefore gives
 * that department a working editorial panel with no change here.
 *
 * Resolution chain (first rung that yields a plate wins):
 *
 *   1. MARKETING_PLACEMENT       a PRODUCT placement the Marketing desk has
 *                                curated for exactly this department. Only
 *                                PUBLISHED products can resolve, because the
 *                                live storefront list is what is consulted.
 *   2. PUBLISHED_PRODUCT_MEDIA   the department's best PUBLISHED product,
 *                                painted with its own canonical Product Media
 *                                set (product-owned plates only).
 *   3. AUTHORED_CATALOGUE_PLATE  the department's own authored canonical
 *                                catalogue plate — the same STATIC_CATALOG
 *                                rung `resolveCategoryCover` already uses for
 *                                the homepage category cards.
 *   4. COLLECTION_COVER          the Collections group only: the existing
 *                                `resolveCollectionCover` chain (managed
 *                                banner → collection media → member product →
 *                                authored collection plate).
 *   5. null                      nothing eligible — the panel keeps its
 *                                neutral placeholder. An unrelated
 *                                department's imagery is NEVER substituted.
 *
 * Draft safety: rungs 1–2 can only ever surface PUBLISHED products. Rung 3 is
 * artwork, not merchandising — it exposes no product name, no price and no
 * product route, and the panel always links to the department's own listing
 * route. A DRAFT / SUBMITTED / APPROVED product is therefore never presented
 * as a shoppable piece by the navigation.
 *
 * Selection is deterministic and stable: the same catalogue and register
 * always produce the same plate, so a refresh or a cleared LocalStorage never
 * reshuffles the navigation.
 *
 * No React. No storage writes. No filenames. No product ids.
 */

import {
  MARKETING_PLACEMENT_OPTIONS,
  PLACEMENT_MODES,
} from "../../config/mediaTypes";
import { products as authoredCatalogue } from "../../data/catalog/products";
import { departments as canonicalDepartments } from "../../data/catalog/taxonomy";
import { getLiveStorefrontProducts } from "../../data/products";
import { getCatalogFingerprint } from "../catalogRepository";
import taxonomyRepository from "../taxonomyRepository";
import { resolveCollectionCover } from "./mediaResolver";
import { getMediaFingerprint } from "./mediaRepository";
import { resolvePlacementEntries } from "./marketingPlacementResolver";
import { getProductMediaSet } from "./productMediaSet";

/** Why a navigation plate was chosen — mirrors the resolver's rungs. */
export const NAVIGATION_EDITORIAL_SOURCES = Object.freeze({
  MARKETING_PLACEMENT: "MARKETING_PLACEMENT",
  PUBLISHED_PRODUCT_MEDIA: "PUBLISHED_PRODUCT_MEDIA",
  AUTHORED_CATALOGUE_PLATE: "AUTHORED_CATALOGUE_PLATE",
  COLLECTION_COVER: "COLLECTION_COVER",
  NONE: "NONE",
});

/**
 * Where the subject sits in a tall editorial frame.
 *
 * House product photography is portrait and shot head-and-shoulders down, so
 * a slightly high focal point keeps the face and neckline inside the plate
 * instead of cropping through them. Collection plates are drapes, mannequins
 * and fabric studies, which read better centred.
 */
export const EDITORIAL_FOCAL_POSITION = Object.freeze({
  product: "50% 25%",
  collection: "50% 40%",
});

/* ------------------------------------------------------------------ */
/* Scope — derived from canonical taxonomy, never authored              */
/* ------------------------------------------------------------------ */

const departmentIds = () => canonicalDepartments.map((department) => department.id);

const findDepartment = (departmentId) =>
  canonicalDepartments.find((department) => department.id === departmentId) ?? null;

/** `/collections/heritage-weaves` → `heritage-weaves`. */
const collectionSlugFromRoute = (route) => {
  const segments = String(route || "")
    .split("?")[0]
    .split("/")
    .filter(Boolean);
  if (segments.length < 2 || segments[0] !== "collections") return null;
  return segments[1];
};

/**
 * The canonical context a navigation group's editorial panel speaks for.
 *
 * A group that routes to a canonical department resolves against that
 * department. Any other group resolves against the collection its own
 * editorial feature already links to — so the plate, the caption and the
 * destination can never drift apart.
 */
export const resolveNavigationEditorialScope = (group) => {
  if (!group) return null;

  const department = findDepartment(group.id);
  if (department) return { kind: "department", departmentId: department.id };

  const slug = collectionSlugFromRoute(group.feature?.to || group.to);
  if (!slug) return null;
  const collection = taxonomyRepository.findCollection(slug);
  if (!collection) return null;
  return { kind: "collection", collectionId: collection.id };
};

/* ------------------------------------------------------------------ */
/* Editorial ranking — canonical signals only                          */
/* ------------------------------------------------------------------ */

const tokenise = (values) =>
  new Set(
    values
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );

/**
 * A product's taxonomy vocabulary, used to tell whose editorial story it is.
 *
 * Subcategory, style and collection membership all carry canonical
 * department language: a women's lehenga filed under the `bridal`
 * subcategory and the `bridal-trousseau` collection is the BRIDAL menu's
 * story, not the Women menu's, and this is how that is detected — from the
 * taxonomy itself, with no per-department rule authored anywhere.
 */
const departmentSignal = (product, departmentId) => {
  const tokens = tokenise([
    product?.subcategory,
    product?.style,
    ...(Array.isArray(product?.collections) ? product.collections : []),
  ]);
  const owns = tokens.has(departmentId);
  const foreign = departmentIds().some((id) => id !== departmentId && tokens.has(id));
  return { owns, foreign };
};

/** Active collections the taxonomy desk has marked as featured editorial. */
const featuredCollectionIds = () =>
  new Set(
    taxonomyRepository
      .activeCollections()
      .filter((collection) => collection.featured)
      .map((collection) => collection.id)
  );

const galleryDepth = (product) => {
  const authored = Array.isArray(product?.media?.gallery) ? product.media.gallery.length : 0;
  const additional = Array.isArray(product?.additionalImages) ? product.additionalImages.length : 0;
  return Math.max(authored, additional);
};

const priceOf = (product) => Number(product?.price) || 0;

/**
 * Editorial weight for one candidate inside its own department.
 *
 * Every term is canonical merchandising data — no filename, no id, no
 * authored "pick this one" list:
 *
 *   · department ownership  the piece's taxonomy speaks for THIS department
 *   · featured collections  the desk already treats it as editorial
 *   · price standing        statement/couture pieces carry the department
 *   · gallery depth         a piece shot from several angles is a real shoot
 *   · merchandising flags   featured / new arrivals are current
 */
export const scoreEditorialCandidate = (product, { departmentId, topPrice = 0, featured = null } = {}) => {
  const { owns, foreign } = departmentSignal(product, departmentId);
  const featuredIds = featured ?? featuredCollectionIds();
  const memberships = (Array.isArray(product?.collections) ? product.collections : []).filter(
    (entry) => featuredIds.has(entry)
  ).length;

  const priceStanding = topPrice > 0 ? Math.min(1, priceOf(product) / topPrice) : 0;

  return (
    (owns ? 40 : 0) -
    (foreign ? 60 : 0) +
    Math.min(memberships, 2) * 20 +
    priceStanding * 40 +
    Math.min(galleryDepth(product), 2) * 3 +
    (product?.isFeatured ? 10 : 0) +
    (product?.isNew ? 4 : 0)
  );
};

/**
 * The department's candidates, most editorial first. Ties break on the
 * stable product id so a refresh never reshuffles the navigation.
 */
export const rankEditorialCandidates = (products, departmentId) => {
  const pool = (products || []).filter((product) => product?.department === departmentId);
  if (!pool.length) return [];
  const topPrice = pool.reduce((max, product) => Math.max(max, priceOf(product)), 0);
  const featured = featuredCollectionIds();

  return pool
    .map((product) => ({ product, score: scoreEditorialCandidate(product, { departmentId, topPrice, featured }) }))
    .sort(
      (a, b) => b.score - a.score || String(a.product.id).localeCompare(String(b.product.id))
    )
    .map((entry) => entry.product);
};

/* ------------------------------------------------------------------ */
/* Plate shaping                                                       */
/* ------------------------------------------------------------------ */

const srcOf = (image) => {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.src || image.url || image.thumbnail || "";
};

/**
 * The panel's alt text is EDITORIAL, describing the edit the plate stands
 * for. It deliberately never carries a product's name: an unpublished
 * record's identity must not reach a customer surface through a caption.
 */
const editorialAlt = (group) =>
  group?.feature?.title ? `${group.feature.title} — PRATIKSHYA FASHON` : "PRATIKSHYA FASHON";

const plate = (src, { group, source, scope, focal }) => {
  if (!src) return null;
  return {
    /* A stable, source-describing key — never a product id. */
    id: `nav-editorial-${group?.id ?? "group"}`,
    src,
    alt: editorialAlt(group),
    objectPosition: focal,
    source,
    departmentId: scope?.departmentId ?? null,
    collectionId: scope?.collectionId ?? null,
  };
};

/* ------------------------------------------------------------------ */
/* Rungs                                                               */
/* ------------------------------------------------------------------ */

/**
 * PRODUCT placements whose documented surface is exactly this department —
 * a placement narrowed to a category or subcategory speaks for that listing
 * page, not for the department's whole menu.
 */
const departmentPlacements = (departmentId) =>
  MARKETING_PLACEMENT_OPTIONS.filter(
    (placement) =>
      placement.live &&
      placement.mode === PLACEMENT_MODES.PRODUCT &&
      placement.recommendedDepartment === departmentId &&
      !placement.recommendedCategory &&
      !placement.recommendedSubcategory
  );

/** Rung 1 — what the Marketing desk curated for this department, if anything. */
const fromMarketingPlacement = (departmentId, liveProducts) => {
  for (const placement of departmentPlacements(departmentId)) {
    const entries = resolvePlacementEntries(placement.id, liveProducts);
    const entry = entries.find(
      (candidate) => candidate.product?.department === departmentId && srcOf(candidate.image)
    );
    if (entry) return srcOf(entry.image);
  }
  return "";
};

/** Rung 2 — the department's best PUBLISHED product, painted with its own media. */
const fromPublishedProductMedia = (departmentId, liveProducts) => {
  for (const product of rankEditorialCandidates(liveProducts, departmentId)) {
    const mediaSet = getProductMediaSet(product);
    const src = srcOf(mediaSet?.primary);
    /* Product Media must belong to the product it is painted for. */
    if (src && String(mediaSet.primary.productId ?? product.id) === String(product.id)) return src;
  }
  return "";
};

/** Rung 3 — the department's own authored canonical catalogue plate. */
const fromAuthoredCatalogue = (departmentId) => {
  for (const product of rankEditorialCandidates(authoredCatalogue, departmentId)) {
    const src = srcOf(product?.media?.primary);
    if (src) return src;
  }
  return "";
};

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

const resolveDepartmentPlate = (group, scope, liveProducts) => {
  const { departmentId } = scope;

  const curated = fromMarketingPlacement(departmentId, liveProducts);
  if (curated) {
    return plate(curated, {
      group,
      scope,
      source: NAVIGATION_EDITORIAL_SOURCES.MARKETING_PLACEMENT,
      focal: EDITORIAL_FOCAL_POSITION.product,
    });
  }

  const published = fromPublishedProductMedia(departmentId, liveProducts);
  if (published) {
    return plate(published, {
      group,
      scope,
      source: NAVIGATION_EDITORIAL_SOURCES.PUBLISHED_PRODUCT_MEDIA,
      focal: EDITORIAL_FOCAL_POSITION.product,
    });
  }

  const authored = fromAuthoredCatalogue(departmentId);
  if (authored) {
    return plate(authored, {
      group,
      scope,
      source: NAVIGATION_EDITORIAL_SOURCES.AUTHORED_CATALOGUE_PLATE,
      focal: EDITORIAL_FOCAL_POSITION.product,
    });
  }

  return null;
};

const resolveCollectionPlate = (group, scope) => {
  const collection = taxonomyRepository.findCollection(scope.collectionId);
  if (!collection) return null;
  const cover = resolveCollectionCover(collection);
  const src = srcOf(cover);
  if (!src) return null;
  return plate(src, {
    group,
    scope,
    source: NAVIGATION_EDITORIAL_SOURCES.COLLECTION_COVER,
    focal: EDITORIAL_FOCAL_POSITION.collection,
  });
};

/*
 * Memoised against the canonical registers. Both fingerprints change on any
 * catalogue or media write, so the cache can never serve a stale plate — and
 * hovering the navigation costs one map lookup rather than a catalogue pass.
 */
let cache = new Map();
let cacheKey = "";

const currentCacheKey = () => {
  try {
    return `${getCatalogFingerprint()}|${getMediaFingerprint()}`;
  } catch {
    return "uncached";
  }
};

/**
 * The editorial plate for one navigation group, or `null` when the house has
 * nothing eligible for it yet (the panel then keeps its neutral placeholder).
 */
export const resolveNavigationEditorialImage = (group, { products = null } = {}) => {
  const scope = resolveNavigationEditorialScope(group);
  if (!scope) return null;

  const useCache = !products;
  const key = currentCacheKey();
  if (useCache) {
    if (key !== cacheKey) {
      cache = new Map();
      cacheKey = key;
    }
    if (cache.has(group.id)) return cache.get(group.id);
  }

  const liveProducts = products ?? getLiveStorefrontProducts();
  const resolved =
    scope.kind === "department"
      ? resolveDepartmentPlate(group, scope, liveProducts)
      : resolveCollectionPlate(group, scope);

  if (useCache) cache.set(group.id, resolved);
  return resolved;
};

/** Drops the memoised plates — test and tooling seam only. */
export const resetNavigationEditorialCache = () => {
  cache = new Map();
  cacheKey = "";
};

export default {
  NAVIGATION_EDITORIAL_SOURCES,
  EDITORIAL_FOCAL_POSITION,
  resolveNavigationEditorialScope,
  scoreEditorialCandidate,
  rankEditorialCandidates,
  resolveNavigationEditorialImage,
  resetNavigationEditorialCache,
};
