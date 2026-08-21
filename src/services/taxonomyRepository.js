/**
 * PRATIKSHYA FASHON — Central taxonomy repository (Phase 18).
 *
 * One authoritative source for categories, subcategories and editorial
 * collections. Product records keep their ids and legacy string fields, while
 * this repository resolves labels/slugs/status everywhere the storefront,
 * product workspace, offers and filters need taxonomy truth.
 */

import { products as catalogue } from "../data/catalog/products";
import { departments as catalogueDepartments } from "../data/catalog/taxonomy";
import catalogRepository, { slugify } from "./catalogRepository";
import {
  ACTIVITY_ACTIONS,
  describeActor,
  loadActivity,
  recordActivity,
} from "./employees/activityService";

export const TAXONOMY_STORAGE_KEY = "pratikshya_taxonomy_v2";
export const TAXONOMY_CHANGED_EVENT = "pratikshya-taxonomy-changed";

export const TAXONOMY_STATUS = {
  DRAFT: "DRAFT",
  ACTIVE: "ACTIVE",
  ARCHIVED: "ARCHIVED",
};

export const COLLECTION_STATUS = {
  DRAFT: "DRAFT",
  SCHEDULED: "SCHEDULED",
  ACTIVE: "ACTIVE",
  PAUSED: "PAUSED",
  EXPIRED: "EXPIRED",
  ARCHIVED: "ARCHIVED",
};

export const COLLECTION_TYPES = {
  MANUAL: "MANUAL",
  RULE_BASED: "RULE_BASED",
};

const nowIso = () => new Date().toISOString();
const titleCase = (value) =>
  String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
const cleanName = (value) => String(value || "").replace(/\s+/g, " ").trim();
const normaliseSlug = (value, fallback = "") => slugify(cleanName(value) || fallback);
const asArray = (value) => (Array.isArray(value) ? value.filter(Boolean).map(String) : []);

const CATEGORY_SEEDS = catalogueDepartments.flatMap((department) =>
  department.categories.map((category, index) => ({
    ...category,
    departmentId: department.id,
    featured: true,
    sortOrder: index * 10,
  }))
);

const COLLECTION_SEEDS = [
  { id: "new-arrivals", name: "New Arrivals", slug: "new-arrivals", eyebrow: "Just In", description: "The pieces that reached the atelier floor this month.", image: null, type: COLLECTION_TYPES.RULE_BASED, status: COLLECTION_STATUS.ACTIVE, featured: true, sortOrder: 5, rule: { flag: "isNew" } },
  { id: "featured", name: "Featured", slug: "featured", eyebrow: "House Selection", description: "Chosen by the atelier — the pieces we would put on you ourselves.", image: null, type: COLLECTION_TYPES.RULE_BASED, status: COLLECTION_STATUS.ACTIVE, featured: true, sortOrder: 8, rule: { flag: "isFeatured" } },
  { id: "heritage-weaves", name: "Heritage Weaves", slug: "heritage-weaves", description: "Looms of Odisha and Banaras, documented and preserved.", image: null, featured: true, sortOrder: 10 },
  { id: "festive-edit", name: "Festive Edit", slug: "festive", eyebrow: "Season of Light", description: "The season of light, dressed.", image: null, featured: true, sortOrder: 20 },
  { id: "handloom-stories", name: "Handloom Stories", slug: "handloom-stories", description: "Cloth traced back to the weaver who made it.", image: null, sortOrder: 30 },
  { id: "bridal-trousseau", name: "Bridal Trousseau", slug: "bridal", eyebrow: "The Trousseau", description: "Every ceremony, considered as one wardrobe.", image: null, featured: true, sortOrder: 40 },
  { id: "everyday-atelier", name: "Everyday Atelier", slug: "everyday-atelier", description: "Ethnic wear light enough for a Tuesday.", image: null, sortOrder: 50 },
  { id: "groom-atelier", name: "Groom Atelier", slug: "groom-atelier", description: "Tailoring for the other half of the mandap.", image: null, sortOrder: 60 },
  { id: "silk", name: "Silk", slug: "silk", description: "Silk sarees, lehengas and heirloom weaves across the atelier.", image: null, type: COLLECTION_TYPES.RULE_BASED, status: COLLECTION_STATUS.ACTIVE, sortOrder: 80, rule: { fabricIncludes: "silk" } },
  { id: "wedding", name: "Wedding", slug: "wedding", eyebrow: "The Long Celebration", description: "One wardrobe for every ceremony in the calendar.", image: null, type: COLLECTION_TYPES.RULE_BASED, status: COLLECTION_STATUS.ACTIVE, featured: true, sortOrder: 90, rule: { occasion: "Wedding" } },
];

let memoryStorage = null;

const makeCategory = (draft, index = 0) => {
  const name = cleanName(draft.name || draft.label || draft.id);
  const slug = normaliseSlug(draft.slug || draft.id || name, name);
  return {
    id: String(draft.id || slug || `cat-${index + 1}`),
    name,
    label: name,
    slug,
    departmentId: draft.departmentId || null,
    eyebrow: draft.eyebrow || "",
    description: cleanName(draft.description),
    image: draft.image || "hero-atelier",
    bannerMediaId: draft.bannerMediaId || null,
    status: Object.values(TAXONOMY_STATUS).includes(draft.status) ? draft.status : TAXONOMY_STATUS.ACTIVE,
    sortOrder: Number(draft.sortOrder ?? index * 10) || 0,
    featured: Boolean(draft.featured),
    seoTitle: draft.seoTitle || name,
    seoDescription: draft.seoDescription || draft.description || "",
    createdAt: draft.createdAt || nowIso(),
    updatedAt: draft.updatedAt || nowIso(),
  };
};

const makeSubcategory = (draft, index = 0) => {
  const name = cleanName(draft.name || draft.label || draft.value);
  const slug = normaliseSlug(draft.slug || name, name);
  return {
    id: String(draft.id || `${draft.categoryId}-${slug}`),
    categoryId: String(draft.categoryId || ""),
    name,
    label: name,
    slug,
    description: cleanName(draft.description),
    image: draft.image || "",
    status: Object.values(TAXONOMY_STATUS).includes(draft.status) ? draft.status : TAXONOMY_STATUS.ACTIVE,
    sortOrder: Number(draft.sortOrder ?? index * 10) || 0,
    seoTitle: draft.seoTitle || name,
    seoDescription: draft.seoDescription || draft.description || "",
    createdAt: draft.createdAt || nowIso(),
    updatedAt: draft.updatedAt || nowIso(),
  };
};

const makeCollection = (draft, index = 0) => {
  const name = cleanName(draft.name || draft.label || draft.id);
  const slug = normaliseSlug(draft.slug || draft.id || name, name);
  return {
    id: String(draft.id || slug || `col-${index + 1}`),
    name,
    label: name,
    slug,
    eyebrow: draft.eyebrow || "",
    description: cleanName(draft.description),
    shortDescription: cleanName(draft.shortDescription || draft.description || ""),
    image: draft.image || draft.thumbnailMediaId || "hero-atelier",
    heroMediaId: draft.heroMediaId || null,
    thumbnailMediaId: draft.thumbnailMediaId || null,
    type: Object.values(COLLECTION_TYPES).includes(draft.type) ? draft.type : COLLECTION_TYPES.MANUAL,
    status: Object.values(COLLECTION_STATUS).includes(draft.status) ? draft.status : COLLECTION_STATUS.ACTIVE,
    featured: Boolean(draft.featured),
    sortOrder: Number(draft.sortOrder ?? index * 10) || 0,
    startDate: draft.startDate || "",
    endDate: draft.endDate || "",
    productIds: asArray(draft.productIds),
    rule: draft.rule && typeof draft.rule === "object" ? draft.rule : null,
    seoTitle: draft.seoTitle || name,
    seoDescription: draft.seoDescription || draft.description || "",
    createdAt: draft.createdAt || nowIso(),
    updatedAt: draft.updatedAt || nowIso(),
  };
};

/**
 * Phase 21.7 — canonical taxonomy projection.
 *
 * One shape for every taxonomy record, whatever surface reads it. A category,
 * subcategory or collection all project to the same keys, so a homepage card,
 * a breadcrumb and a filter share one vocabulary instead of each inventing its
 * own `{ title | label | name }` object. It is a pure projection of the
 * records `makeCategory` / `makeSubcategory` / `makeCollection` already store
 * — nothing is re-keyed or duplicated.
 */
export const normalizeTaxonomyRecord = (record, type = null) => {
  if (!record || typeof record !== "object") return null;
  const resolvedType =
    type ||
    (record.categoryId
      ? "subcategory"
      : Array.isArray(record.productIds) || record.rule || record.displayStatus
        ? "collection"
        : "category");
  const name = cleanName(record.name || record.label || record.title || "");
  return {
    id: String(record.id ?? ""),
    slug: String(record.slug ?? ""),
    name,
    type: resolvedType,
    parentId: record.categoryId ?? record.parentId ?? null,
    status: record.status ?? record.displayStatus ?? null,
    featured: Boolean(record.featured),
    sortOrder: Number(record.sortOrder ?? 0) || 0,
    image: record.image ?? null,
    bannerMediaId: record.bannerMediaId ?? null,
    seo: {
      title: record.seoTitle ?? name,
      description: record.seoDescription ?? record.description ?? "",
    },
  };
};

const buildSeed = () => {
  const categories = CATEGORY_SEEDS.map(makeCategory);
  const categoryIds = new Set(categories.map((category) => category.id));
  const subcategoryMap = new Map();
  catalogue.forEach((product) => {
    if (!product.category || categoryIds.has(product.category)) return;
    categories.push(makeCategory({ id: product.category, name: titleCase(product.category), sortOrder: categories.length * 10 }));
    categoryIds.add(product.category);
  });

  /* The department-based catalogue taxonomy is the labelled source of
     truth for its own categories and subcategories — merged here so the
     workspace and the storefront share one vocabulary. */
  catalogueDepartments.forEach((department) => {
    department.categories.forEach((category) => {
      if (!categoryIds.has(category.id)) {
        categories.push(makeCategory({
          id: category.id,
          departmentId: department.id,
          name: category.name,
          slug: category.slug,
          eyebrow: category.eyebrow,
          description: category.description,
          sortOrder: categories.length * 10,
        }));
        categoryIds.add(category.id);
      }
      category.subcategories.forEach((subcategory) => {
        const key = `${category.id}::${subcategory.slug}`;
        if (subcategoryMap.has(key)) return;
        subcategoryMap.set(key, makeSubcategory({
          categoryId: category.id,
          name: subcategory.name,
          slug: subcategory.slug,
          sortOrder: subcategoryMap.size * 10,
        }));
      });
    });
  });

  catalogue.forEach((product) => {
    if (!product.category || !product.subcategory) return;
    const key = `${product.category}::${String(product.subcategory).toLowerCase()}`;
    if (subcategoryMap.has(key)) return;
    subcategoryMap.set(key, makeSubcategory({ categoryId: product.category, name: product.subcategory, sortOrder: subcategoryMap.size * 10 }));
  });

  const collections = COLLECTION_SEEDS.map(makeCollection);
  const collectionIds = new Set(collections.map((collection) => collection.id));
  catalogue.forEach((product) => {
    if (!product.collection) return;
    const id = normaliseSlug(product.collection);
    if (collectionIds.has(id)) return;
    collections.push(makeCollection({ id, name: product.collection, sortOrder: collections.length * 10 }));
    collectionIds.add(id);
  });

  return {
    version: 1,
    categories,
    subcategories: [...subcategoryMap.values()],
    collections,
    migratedAt: nowIso(),
  };
};

const readRaw = () => {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(TAXONOMY_STORAGE_KEY) : memoryStorage;
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.categories) || !Array.isArray(parsed.subcategories) || !Array.isArray(parsed.collections)) return null;
    return parsed;
  } catch {
    return null;
  }
};

const persist = (state) => {
  const payload = {
    version: 1,
    categories: (state.categories || []).map(makeCategory),
    subcategories: (state.subcategories || []).map(makeSubcategory),
    collections: (state.collections || []).map(makeCollection),
    migratedAt: state.migratedAt || nowIso(),
    updatedAt: nowIso(),
  };
  try {
    const json = JSON.stringify(payload);
    if (typeof localStorage !== "undefined") localStorage.setItem(TAXONOMY_STORAGE_KEY, json);
    else memoryStorage = json;
  } catch {
    /* Taxonomy storage failure must never reset products/orders/offers. */
  }
  if (typeof window !== "undefined") window.dispatchEvent(new Event(TAXONOMY_CHANGED_EVENT));
  return payload;
};

/*
 * Parse cache — Phase 21.1 performance guard.
 *
 * Category labels are resolved through `read()` from every hot path
 * (analytics, inventory, AI assistants). The merged state is a
 * deterministic function of the stored string, so it is cached against
 * that exact string; any persist() writes a new string and invalidates the
 * cache automatically.
 */
let readCache = null;
let readCacheRaw = Symbol("empty");

const read = () => {
  const storedRaw = typeof localStorage !== "undefined"
    ? localStorage.getItem(TAXONOMY_STORAGE_KEY)
    : memoryStorage;
  if (readCache && readCacheRaw === storedRaw) return readCache;

  const raw = readRaw();
  let state;
  if (raw) {
    const seed = buildSeed();
    const categories = raw.categories.map(makeCategory);
    const subcategories = raw.subcategories.map(makeSubcategory);
    const collections = raw.collections.map(makeCollection);
    const catIds = new Set(categories.map((entry) => entry.id));
    seed.categories.forEach((entry) => { if (!catIds.has(entry.id)) categories.push(entry); });
    const subKeys = new Set(subcategories.map((entry) => `${entry.categoryId}::${entry.slug}`));
    seed.subcategories.forEach((entry) => { if (!subKeys.has(`${entry.categoryId}::${entry.slug}`)) subcategories.push(entry); });
    const colIds = new Set(collections.map((entry) => entry.id));
    seed.collections.forEach((entry) => { if (!colIds.has(entry.id)) collections.push(entry); });
    state = { ...raw, categories, subcategories, collections };
  } else {
    state = persist(buildSeed());
  }
  readCache = state;
  readCacheRaw = typeof localStorage !== "undefined"
    ? localStorage.getItem(TAXONOMY_STORAGE_KEY)
    : memoryStorage;
  return state;
};

const products = () => catalogRepository.all();
const active = (entry) => entry.status === TAXONOMY_STATUS.ACTIVE;
const byOrder = (a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name);

export const deriveCollectionStatus = (collection, now = new Date()) => {
  const stored = collection?.status || COLLECTION_STATUS.DRAFT;
  if ([COLLECTION_STATUS.DRAFT, COLLECTION_STATUS.PAUSED, COLLECTION_STATUS.ARCHIVED].includes(stored)) return stored;
  const start = collection.startDate ? new Date(`${collection.startDate}T00:00:00`) : null;
  const end = collection.endDate ? new Date(`${collection.endDate}T23:59:59`) : null;
  if (start && now < start) return COLLECTION_STATUS.SCHEDULED;
  if (end && now > end) return COLLECTION_STATUS.EXPIRED;
  return COLLECTION_STATUS.ACTIVE;
};

const noteTaxonomy = (action, summary, actor, extra = {}) => {
  try {
    recordActivity(loadActivity(), {
      ...describeActor(actor),
      action,
      summary,
      ...extra,
    });
  } catch {
    /* shared diary failures do not block taxonomy writes */
  }
};

const uniqueCategory = (state, draft, ignoreId = null) => {
  const name = cleanName(draft.name).toLowerCase();
  const slug = normaliseSlug(draft.slug || draft.name);
  if (state.categories.some((item) => item.name.toLowerCase() === name && item.id !== ignoreId)) return "A category with this name already exists.";
  if (state.categories.some((item) => item.slug === slug && item.id !== ignoreId)) return "A category with this slug already exists.";
  return "";
};

const uniqueSubcategory = (state, draft, ignoreId = null) => {
  const name = cleanName(draft.name).toLowerCase();
  const slug = normaliseSlug(draft.slug || draft.name);
  if (state.subcategories.some((item) => item.categoryId === draft.categoryId && item.name.toLowerCase() === name && item.id !== ignoreId)) return "A subcategory with this name already exists under this category.";
  if (state.subcategories.some((item) => item.slug === slug && item.id !== ignoreId)) return "A subcategory with this slug already exists.";
  return "";
};

const uniqueCollection = (state, draft, ignoreId = null) => {
  const name = cleanName(draft.name).toLowerCase();
  const slug = normaliseSlug(draft.slug || draft.name);
  if (state.collections.some((item) => item.name.toLowerCase() === name && item.id !== ignoreId)) return "A collection with this name already exists.";
  if (state.collections.some((item) => item.slug === slug && item.id !== ignoreId)) return "A collection with this slug already exists.";
  return "";
};

const productCollectionValues = (product) => [product?.collection, ...(Array.isArray(product?.collections) ? product.collections : [])].filter(Boolean).map(String);

export const taxonomyRepository = {
  all: () => read(),

  normalizeTaxonomyRecord,

  categories: () => read().categories.slice().sort(byOrder),
  activeCategories: () => taxonomyRepository.categories().filter(active),
  categoryOptions: () => taxonomyRepository.activeCategories().map((category) => ({ id: category.id, label: category.name, value: category.id })),
  findCategory: (idOrSlug) => taxonomyRepository.categories().find((entry) => entry.id === idOrSlug || entry.slug === idOrSlug) ?? null,
  getCategoryLabel: (idOrSlug) => taxonomyRepository.findCategory(idOrSlug)?.name || titleCase(idOrSlug),

  subcategories: (categoryId = null, { includeArchived = true } = {}) => read().subcategories
    .filter((entry) => (categoryId ? entry.categoryId === categoryId : true))
    .filter((entry) => includeArchived || active(entry))
    .sort(byOrder),
  activeSubcategories: (categoryId = null) => taxonomyRepository.subcategories(categoryId, { includeArchived: false }),
  subcategoryOptionsFor: (categoryId) => taxonomyRepository.activeSubcategories(categoryId).map((entry) => entry.name),
  findSubcategory: (idOrSlugOrName, categoryId = null) => taxonomyRepository.subcategories(categoryId).find((entry) => entry.id === idOrSlugOrName || entry.slug === idOrSlugOrName || entry.name === idOrSlugOrName) ?? null,

  collections: () => read().collections.map((collection) => ({ ...collection, displayStatus: deriveCollectionStatus(collection) })).sort(byOrder),
  activeCollections: () => taxonomyRepository.collections().filter((entry) => entry.displayStatus === COLLECTION_STATUS.ACTIVE),
  collectionOptions: () => taxonomyRepository.activeCollections().map((collection) => ({ id: collection.id, label: collection.name, value: collection.name })),
  findCollection: (idOrSlugOrName) => taxonomyRepository.collections().find((entry) => entry.id === idOrSlugOrName || entry.slug === idOrSlugOrName || entry.name === idOrSlugOrName) ?? null,
  getCollectionLabel: (idOrSlugOrName) => taxonomyRepository.findCollection(idOrSlugOrName)?.name || String(idOrSlugOrName || ""),

  createCategory: (draft, actor = null) => {
    const state = read();
    const error = uniqueCategory(state, draft);
    if (error) return { ok: false, error };
    const category = makeCategory({ ...draft, id: normaliseSlug(draft.slug || draft.name), createdAt: nowIso(), updatedAt: nowIso(), status: draft.status || TAXONOMY_STATUS.ACTIVE }, state.categories.length);
    persist({ ...state, categories: [...state.categories, category] });
    noteTaxonomy(ACTIVITY_ACTIONS.CATEGORY_CREATED, `Created category ${category.name}`, actor, { targetCategoryId: category.id });
    return { ok: true, category };
  },

  updateCategory: (id, patch, actor = null) => {
    const state = read();
    const existing = state.categories.find((entry) => entry.id === id);
    if (!existing) return { ok: false, error: "Category not found." };
    const candidate = { ...existing, ...patch };
    const error = uniqueCategory(state, candidate, existing.id);
    if (error) return { ok: false, error };
    const category = makeCategory({ ...candidate, id: existing.id, updatedAt: nowIso() });
    persist({ ...state, categories: state.categories.map((entry) => entry.id === id ? category : entry) });
    noteTaxonomy(ACTIVITY_ACTIONS.CATEGORY_UPDATED, `Updated category ${category.name}`, actor, { targetCategoryId: category.id });
    return { ok: true, category };
  },

  archiveCategory: (id, actor = null) => {
    const result = taxonomyRepository.updateCategory(id, { status: TAXONOMY_STATUS.ARCHIVED }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.CATEGORY_ARCHIVED, `Archived category ${result.category.name}`, actor, { targetCategoryId: result.category.id });
    return result;
  },
  restoreCategory: (id, actor = null) => {
    const result = taxonomyRepository.updateCategory(id, { status: TAXONOMY_STATUS.ACTIVE }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.CATEGORY_RESTORED, `Restored category ${result.category.name}`, actor, { targetCategoryId: result.category.id });
    return result;
  },

  createSubcategory: (categoryId, draft, actor = null) => {
    const state = read();
    if (!state.categories.some((entry) => entry.id === categoryId)) return { ok: false, error: "Parent category not found." };
    const candidate = { ...draft, categoryId };
    const error = uniqueSubcategory(state, candidate);
    if (error) return { ok: false, error };
    const subcategory = makeSubcategory({ ...candidate, id: `${categoryId}-${normaliseSlug(draft.slug || draft.name)}`, createdAt: nowIso(), updatedAt: nowIso(), status: draft.status || TAXONOMY_STATUS.ACTIVE }, state.subcategories.length);
    persist({ ...state, subcategories: [...state.subcategories, subcategory] });
    noteTaxonomy(ACTIVITY_ACTIONS.SUBCATEGORY_CREATED, `Created subcategory ${subcategory.name}`, actor, { targetCategoryId: categoryId });
    return { ok: true, subcategory };
  },

  updateSubcategory: (id, patch, actor = null) => {
    const state = read();
    const existing = state.subcategories.find((entry) => entry.id === id);
    if (!existing) return { ok: false, error: "Subcategory not found." };
    const candidate = { ...existing, ...patch, categoryId: existing.categoryId };
    const error = uniqueSubcategory(state, candidate, existing.id);
    if (error) return { ok: false, error };
    const subcategory = makeSubcategory({ ...candidate, id: existing.id, updatedAt: nowIso() });
    persist({ ...state, subcategories: state.subcategories.map((entry) => entry.id === id ? subcategory : entry) });
    noteTaxonomy(ACTIVITY_ACTIONS.SUBCATEGORY_UPDATED, `Updated subcategory ${subcategory.name}`, actor, { targetCategoryId: subcategory.categoryId });
    return { ok: true, subcategory };
  },

  archiveSubcategory: (id, actor = null) => {
    const result = taxonomyRepository.updateSubcategory(id, { status: TAXONOMY_STATUS.ARCHIVED }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.SUBCATEGORY_ARCHIVED, `Archived subcategory ${result.subcategory.name}`, actor, { targetCategoryId: result.subcategory.categoryId });
    return result;
  },
  restoreSubcategory: (id, actor = null) => taxonomyRepository.updateSubcategory(id, { status: TAXONOMY_STATUS.ACTIVE }, actor),

  createCollection: (draft, actor = null) => {
    const state = read();
    const error = uniqueCollection(state, draft);
    if (error) return { ok: false, error };
    const collection = makeCollection({ ...draft, id: normaliseSlug(draft.slug || draft.name), createdAt: nowIso(), updatedAt: nowIso(), status: draft.status || COLLECTION_STATUS.DRAFT }, state.collections.length);
    persist({ ...state, collections: [...state.collections, collection] });
    noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_CREATED, `Created collection ${collection.name}`, actor, { targetCollectionId: collection.id });
    return { ok: true, collection };
  },

  updateCollection: (id, patch, actor = null) => {
    const state = read();
    const existing = state.collections.find((entry) => entry.id === id);
    if (!existing) return { ok: false, error: "Collection not found." };
    const candidate = { ...existing, ...patch };
    const error = uniqueCollection(state, candidate, existing.id);
    if (error) return { ok: false, error };
    const collection = makeCollection({ ...candidate, id: existing.id, updatedAt: nowIso() });
    persist({ ...state, collections: state.collections.map((entry) => entry.id === id ? collection : entry) });
    noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_UPDATED, `Updated collection ${collection.name}`, actor, { targetCollectionId: collection.id });
    return { ok: true, collection };
  },

  activateCollection: (id, actor = null) => {
    const result = taxonomyRepository.updateCollection(id, { status: COLLECTION_STATUS.ACTIVE }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_ACTIVATED, `Activated collection ${result.collection.name}`, actor, { targetCollectionId: result.collection.id });
    return result;
  },
  pauseCollection: (id, actor = null) => {
    const result = taxonomyRepository.updateCollection(id, { status: COLLECTION_STATUS.PAUSED }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_PAUSED, `Paused collection ${result.collection.name}`, actor, { targetCollectionId: result.collection.id });
    return result;
  },
  archiveCollection: (id, actor = null) => {
    const result = taxonomyRepository.updateCollection(id, { status: COLLECTION_STATUS.ARCHIVED }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_ARCHIVED, `Archived collection ${result.collection.name}`, actor, { targetCollectionId: result.collection.id });
    return result;
  },
  restoreCollection: (id, actor = null) => taxonomyRepository.updateCollection(id, { status: COLLECTION_STATUS.DRAFT }, actor),

  assignProductsToCollection: (collectionId, productIds, actor = null) => {
    const collection = taxonomyRepository.findCollection(collectionId);
    if (!collection) return { ok: false, error: "Collection not found." };
    const ids = [...new Set(asArray(productIds))];
    const result = taxonomyRepository.updateCollection(collection.id, { productIds: ids }, actor);
    if (result.ok) noteTaxonomy(ACTIVITY_ACTIONS.COLLECTION_PRODUCTS_UPDATED, `Updated ${result.collection.name} products · ${ids.length} assigned`, actor, { targetCollectionId: collection.id });
    return result.ok ? { ok: true, collection: result.collection } : result;
  },

  addProductsToCollection: (collectionId, productIds, actor = null) => {
    const collection = taxonomyRepository.findCollection(collectionId);
    if (!collection) return { ok: false, error: "Collection not found." };
    return taxonomyRepository.assignProductsToCollection(collection.id, [...new Set([...(collection.productIds || []), ...asArray(productIds)])], actor);
  },

  removeProductsFromCollection: (collectionId, productIds, actor = null) => {
    const collection = taxonomyRepository.findCollection(collectionId);
    if (!collection) return { ok: false, error: "Collection not found." };
    const remove = new Set(asArray(productIds));
    return taxonomyRepository.assignProductsToCollection(collection.id, (collection.productIds || []).filter((id) => !remove.has(id)), actor);
  },

  productCounts: () => {
    const counts = { byCategory: {}, bySubcategory: {}, byCollection: {}, classified: 0, unassigned: 0 };
    products().forEach((product) => {
      if (product.category) {
        counts.classified += 1;
        counts.byCategory[product.category] = (counts.byCategory[product.category] || 0) + 1;
      } else counts.unassigned += 1;
      if (product.subcategory) counts.bySubcategory[product.subcategory] = (counts.bySubcategory[product.subcategory] || 0) + 1;
      taxonomyRepository.collectionsForProduct(product).forEach((collection) => {
        counts.byCollection[collection.id] = (counts.byCollection[collection.id] || 0) + 1;
      });
    });
    return counts;
  },

  collectionsForProduct: (product) => taxonomyRepository.collections().filter((collection) => taxonomyRepository.isProductInCollection(product, collection.id)),

  isProductInCollection: (product, collectionIdOrSlugOrName) => {
    const collection = taxonomyRepository.findCollection(collectionIdOrSlugOrName);
    if (!product || !collection) return false;
    if ((collection.productIds || []).includes(String(product.id))) return true;
    const values = productCollectionValues(product).map((value) => value.toLowerCase());
    const labels = [collection.id, collection.slug, collection.name].map((value) => String(value).toLowerCase());
    if (values.some((value) => labels.includes(value))) return true;
    const rule = collection.rule || {};
    if (rule.flag && Boolean(product[rule.flag] || product.flags?.[rule.flag])) return true;
    if (rule.occasion && (product.occasion || []).includes(rule.occasion)) return true;
    if (rule.fabricIncludes && String(product.fabric || "").toLowerCase().includes(String(rule.fabricIncludes).toLowerCase())) return true;
    return false;
  },

  metrics: () => {
    const state = read();
    const counts = taxonomyRepository.productCounts();
    const collections = taxonomyRepository.collections();
    return {
      totalCategories: state.categories.length,
      activeCategories: state.categories.filter(active).length,
      subcategories: state.subcategories.length,
      productsClassified: counts.classified,
      unassignedProducts: counts.unassigned,
      totalCollections: state.collections.length,
      activeCollections: collections.filter((entry) => entry.displayStatus === COLLECTION_STATUS.ACTIVE).length,
      scheduledCollections: collections.filter((entry) => entry.displayStatus === COLLECTION_STATUS.SCHEDULED).length,
      featuredCollections: collections.filter((entry) => entry.featured).length,
      productsAssigned: Object.values(counts.byCollection).reduce((sum, count) => sum + count, 0),
    };
  },
};

export default taxonomyRepository;
