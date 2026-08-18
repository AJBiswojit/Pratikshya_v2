/**
 * Read-only media exposure measurement over the canonical storefront
 * resolvers. Authored Product Media stays on canonical products; managed
 * Admin uploads remain in the generic media repository. This module measures
 * both paths without copying product records or inventing media ownership.
 */

import { MEDIA_SCOPES, MEDIA_STATUS, PRODUCT_MEDIA_ROLES } from "../../config/mediaTypes";
import { getLiveStorefrontProducts } from "../../data/products";
import { departments as canonicalDepartments } from "../../data/catalog/taxonomy";
import taxonomyRepository from "../taxonomyRepository";
import { isCanonicalMediaUrl } from "./mediaPaths";
import mediaRepository from "./mediaRepository";
import {
  resolveAiMirrorImage,
  resolveAiShoppingImage,
  resolveCategoryCover,
  resolveCollectionCover,
  resolveEditorialFrame,
  resolveHeroImageIds,
  resolveHeroSlideImage,
  resolveProductCover,
  resolveProductGallery,
  resolveSaleBackdrop,
  selectBrideGroomLooks,
  selectNewArrivalProducts,
} from "./mediaResolver";

const HERO_THEMES = ["festive", "bridal", "heritage", "celebration", "arrivals"];
const EDITORIAL_THEMES = ["bridal", "groom", "festive", "heritage"];

/* The homepage reserves the hero plates first, then the editorial, category
   and sale seams exclude them — mirrors `AtelierDesign`. */
const heroReservedIds = () => new Set(resolveHeroImageIds(null));

const isMapped = (media) => media.mappingStatus === "MAPPED";

const describeRecord = (media) => ({
  mediaId: media.id,
  filename: media.currentFilename || media.fileName || media.originalFilename || "(unnamed)",
  category: media.categoryId || null,
  subcategory: media.subcategoryId || null,
  product: media.productId || null,
  collection: media.collectionId || null,
  usageRoles: [...(media.usageRoles || [])],
  status: media.status,
  source: media.source || null,
  featured: Boolean(media.featured),
});

/** Every real customer surface, keyed for the per-surface report. */
const collectSurfaces = () => {
  const surfaces = {
    hero: { usedIds: new Set(), shown: [], available: 0, fallback: false },
    shopByCategory: { shown: [], available: 0, fallback: false },
    collections: { shown: [], available: 0, fallback: false },
    productCards: { shown: [], available: 0, fallback: false },
    productDetail: { shown: [], available: 0, fallback: false },
    sale: { shown: [], available: 0, fallback: false },
    editorial: { usedIds: new Set(), shown: [], available: 0, fallback: false },
    aiShopping: { shown: [], available: 0, fallback: false },
    aiMirror: { shown: [], available: 0, fallback: false },
  };

  const record = (surface, source, fallback) => {
    if (!source) return;
    const id = source.id;
    if (id && !surfaces[surface].shown.some((entry) => entry.id === id)) {
      surfaces[surface].shown.push({ id, src: source.src, fallback: Boolean(fallback) });
    }
    if (fallback) surfaces[surface].fallback = true;
  };

  /* Hero — five slides with shared exclusion for deterministic diversity. */
  HERO_THEMES.forEach((theme, index) => {
    const source = resolveHeroSlideImage(theme, {
      heroMedia: null,
      lead: index === 0,
      usedIds: surfaces.hero.usedIds,
    });
    record("hero", source, !source?.id);
  });

  /* Editorial / PRATIKSHYA Edit — four frames, hero plates excluded. */
  surfaces.editorial.usedIds = heroReservedIds();
  EDITORIAL_THEMES.forEach((theme) => {
    const source = resolveEditorialFrame(theme, surfaces.editorial.usedIds);
    record("editorial", source, !source?.id);
  });

  /* Shop by Category — every active category card, hero plates excluded. */
  const categoryUsed = heroReservedIds();
  taxonomyRepository.activeCategories().forEach((category) => {
    const source = resolveCategoryCover(category, categoryUsed);
    record("shopByCategory", source, !source?.id);
  });

  /* Collections — every active customer-visible collection. */
  taxonomyRepository.activeCollections().forEach((collection) => {
    const source = resolveCollectionCover(collection);
    record("collections", source, !source?.id);
  });

  /* Sale backdrop — hero plates excluded. */
  record("sale", resolveSaleBackdrop(null, heroReservedIds()), false);

  /* Products — cards + detail gallery for every live product. */
  getLiveStorefrontProducts().forEach((product) => {
    const cover = resolveProductCover(product);
    record("productCards", cover, !cover?.id);

    const gallery = resolveProductGallery(product);
    gallery.forEach((source) => record("productDetail", source, !source?.id));
    if (!gallery.length && product.image) record("productDetail", product.image, true);
  });

  /* AI Shopping / AI Mirror resolve through their own doors. */
  getLiveStorefrontProducts().forEach((product) => {
    const source = resolveAiShoppingImage(product);
    record("aiShopping", source, !source?.id);
  });
  getLiveStorefrontProducts().forEach((product) => {
    const source = resolveAiMirrorImage(product);
    if (source) record("aiMirror", source, false);
  });

  return surfaces;
};

const uniqueShown = (surfaces) => {
  const ids = new Set();
  Object.values(surfaces).forEach((surface) =>
    (surface.shown || []).forEach((entry) => entry.id && ids.add(entry.id))
  );
  return ids;
};

/**
 * The full exposure measurement.
 *
 * `unused` lists every mapped record that no customer surface resolves.
 * `categoryCoverage` and `productCoverage` show whether each customer-facing
 * category / product actually received centralized media or fell back.
 */
export const auditMediaExposure = () => {
  const all = mediaRepository.getAll();
  const mapped = all.filter(isMapped);
  const unmapped = all.filter((media) => media.mappingStatus === "UNMAPPED");
  const needsReview = all.filter((media) => media.mappingStatus === "NEEDS_REVIEW");
  const broken = all.filter((media) => media.broken);

  const surfaces = collectSurfaces();
  const consumedIds = uniqueShown(surfaces);
  const exposed = mapped.filter((media) => consumedIds.has(media.id));
  const unused = mapped.filter((media) => !consumedIds.has(media.id));

  /* Category coverage — for every active customer-facing category. */
  const categoryCoverage = taxonomyRepository.activeCategories().map((category) => {
    const cover = resolveCategoryCover(category);
    const hasCanonicalMedia = isCanonicalMediaUrl(cover?.src);
    const media = mediaRepository.getMediaByCategory(category.id, { publicOnly: true });
    return {
      id: category.id,
      name: category.name,
      mediaAvailable: media.length,
      mediaDisplayed: cover?.id || null,
      src: cover?.src || null,
      fallbackUsed: !hasCanonicalMedia,
    };
  });

  /* Product coverage — managed repository media, authored canonical media, or none. */
  const liveProducts = getLiveStorefrontProducts();
  const productCoverage = {
    withDedicatedMedia: [],
    usingCanonicalMedia: [],
    withoutMedia: [],
  };
  liveProducts.forEach((product) => {
    const dedicated = mediaRepository.getProductMedia(product.id, {
      publicOnly: true,
      type: "IMAGE",
    });
    const cover = resolveProductCover(product);
    if (dedicated.length) {
      productCoverage.withDedicatedMedia.push({ id: product.id, name: product.name, count: dedicated.length });
    } else if (isCanonicalMediaUrl(cover?.src)) {
      productCoverage.usingCanonicalMedia.push({ id: product.id, name: product.name });
    } else {
      productCoverage.withoutMedia.push({ id: product.id, name: product.name });
    }
  });

  /* Duplication — media returned by more than one surface group. */
  const surfaceOwners = new Map();
  Object.entries(surfaces).forEach(([name, surface]) => {
    (surface.shown || []).forEach((entry) => {
      if (!entry.id) return;
      if (!surfaceOwners.has(entry.id)) surfaceOwners.set(entry.id, []);
      surfaceOwners.get(entry.id).push(name);
    });
  });
  const reuse = [...surfaceOwners.entries()]
    .map(([id, owners]) => ({ id, surfaces: [...new Set(owners)], count: new Set(owners).size }))
    .filter((entry) => entry.count > 1)
    .sort((a, b) => b.count - a.count);

  return {
    inventory: {
      total: all.length,
      mapped: mapped.length,
      unmapped: unmapped.length,
      needsReview: needsReview.length,
      broken: broken.length,
      active: all.filter((media) => media.status === MEDIA_STATUS.ACTIVE).length,
      productScoped: all.filter((media) => media.scope === MEDIA_SCOPES.PRODUCT).length,
      marketingScoped: all.filter((media) => media.scope === MEDIA_SCOPES.MARKETING).length,
      unassigned: all.filter((media) => media.scope === MEDIA_SCOPES.UNASSIGNED).length,
      exposed: exposed.length,
      mappedButUnused: unused.length,
    },
    surfaces: Object.fromEntries(
      Object.entries(surfaces).map(([name, surface]) => [
        name,
        {
          shown: surface.shown.length,
          fallback: surface.fallback,
          assets: surface.shown.map((entry) => entry.id),
        },
      ])
    ),
    unused: unused.map(describeRecord),
    unmappedAssets: unmapped.map(describeRecord),
    needsReviewAssets: needsReview.map(describeRecord),
    categoryCoverage,
    productCoverage,
    reuse,
  };
};

/* ------------------------------------------------------------------ */
/* Homepage media distribution report (Phase 21.7)                     */
/* ------------------------------------------------------------------ */

/* Mirrors `ShopByCategory`'s presentation grouping so the per-section report
   reports the cards in the same order the customer sees them. */
const HOMEPAGE_GROUPS = canonicalDepartments.map((department) => ({
  id: department.id,
  label: department.name,
  categories: department.categories.map((category) => category.id),
}));

/** Resolver fallback reason → customer-facing source classification. */
const SOURCE_CLASSIFICATION = {
  DIRECT: "CANONICAL_MEDIA",
  PRODUCT_GALLERY: "PRODUCT_GALLERY",
  TAXONOMY_PRODUCT: "TAXONOMY_DERIVED",
  RELATED_TAXONOMY: "TAXONOMY_DERIVED",
  EDITORIAL_FALLBACK: "EDITORIAL_FALLBACK",
  NO_SOURCE_MEDIA: "NO_SOURCE_MEDIA",
};

/** One resolved source → a report row proving the concrete canonical address. */
const describeResolved = (source) => {
  const canonical = isCanonicalMediaUrl(source?.src);
  if (!source?.src && !source?.id) {
    return {
      mediaId: null,
      filename: null,
      usage: null,
      reason: source?.reason ?? null,
      source: source?.reason ? SOURCE_CLASSIFICATION[source.reason] ?? null : null,
      mapped: false,
      canonical: false,
      fallback: true,
      scope: null,
      status: null,
      broken: false,
    };
  }
  const media = source.id ? mediaRepository.getById(source.id) ?? null : null;
  const filename =
    media?.currentFilename ||
    media?.fileName ||
    media?.originalFilename ||
    (source.src ? source.src.split("/").pop() : null) ||
    source.id;
  const usage = media
    ? media.scope === MEDIA_SCOPES.PRODUCT
      ? media.role === PRODUCT_MEDIA_ROLES.COVER
        ? "PRODUCT_PRIMARY"
        : media.role === PRODUCT_MEDIA_ROLES.GALLERY
          ? "PRODUCT_GALLERY"
          : media.role
      : (media.usageRoles || []).join(",") || null
    : canonical
      ? "AUTHORED_PRODUCT_MEDIA"
      : null;
  const reason = source.reason ?? (canonical ? "DIRECT" : null);
  return {
    mediaId: source.id ?? null,
    filename,
    usage,
    reason,
    source: SOURCE_CLASSIFICATION[reason] ?? (canonical ? "CANONICAL_MEDIA" : "NO_SOURCE_MEDIA"),
    mapped: media ? media.mappingStatus === "MAPPED" : false,
    canonical,
    fallback: !canonical,
    scope: media
      ? media.productId
        ? "PRODUCT"
        : media.collectionId
          ? "COLLECTION"
          : media.categoryId
            ? "CATEGORY"
            : "—"
      : canonical
        ? "PRODUCT"
        : "FALLBACK",
    status: media?.status ?? null,
    broken: Boolean(media?.broken),
  };
};

/**
 * The exact resolutions the homepage components perform, reported per
 * section. Mirrors HeroCarousel, CelebrationEdit, ShopByCategory,
 * NewArrivals and SaleBanner (including their hero-exclusion sets) so the
 * report proves which *files* a customer actually sees — not merely that a
 * resolver function was called.
 */
export const auditHomepageSections = () => {
  const heroUsed = new Set();
  const hero = HERO_THEMES.map((theme, index) =>
    describeResolved(
      resolveHeroSlideImage(theme, { heroMedia: null, lead: index === 0, usedIds: heroUsed })
    )
  );

  const editorialUsed = new Set(heroUsed);
  const editorial = EDITORIAL_THEMES.map((theme) =>
    describeResolved(resolveEditorialFrame(theme, editorialUsed))
  );

  const categoryUsed = new Set(heroUsed);
  const activeById = new Map(taxonomyRepository.activeCategories().map((category) => [category.id, category]));
  const shopByCategory = [];
  HOMEPAGE_GROUPS.forEach((group) => {
    (group.categories || []).forEach((id) => {
      const category = activeById.get(id);
      if (!category) return;
      shopByCategory.push({
        group: group.label,
        name: category.name,
        slug: category.slug,
        ...describeResolved(resolveCategoryCover(category, categoryUsed)),
      });
    });
  });

  const collections = taxonomyRepository.activeCollections().map((collection) => ({
    name: collection.name,
    slug: collection.slug,
    productCount: getLiveStorefrontProducts().filter((product) =>
      taxonomyRepository.isProductInCollection(product, collection.id)
    ).length,
    ...describeResolved(resolveCollectionCover(collection)),
  }));

  const newArrivals = selectNewArrivalProducts(getLiveStorefrontProducts(), 5).map((product) => ({
    id: product.id,
    name: product.name,
    ...describeResolved(resolveProductCover(product)),
  }));

  const sale = describeResolved(resolveSaleBackdrop(null, new Set(heroUsed)));

  const brideGroomLooks = selectBrideGroomLooks(undefined, { excludeIds: new Set(heroUsed) });
  const brideGroom = {
    bride: (brideGroomLooks.bride || []).map((look) => ({
      side: "bride",
      name: look.product?.name || "Bride",
      categoryId: look.categoryId,
      productId: look.productId,
      ...describeResolved(look.image),
    })),
    groom: (brideGroomLooks.groom || []).map((look) => ({
      side: "groom",
      name: look.product?.name || "Groom",
      categoryId: look.categoryId,
      productId: look.productId,
      ...describeResolved(look.image),
    })),
  };

  return { hero, editorial, shopByCategory, collections, newArrivals, sale, brideGroom };
};

export default auditMediaExposure;
