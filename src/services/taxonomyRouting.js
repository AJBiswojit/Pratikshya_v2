/**
 * PRATIKSHYA FASHON — Canonical storefront routing (Phase 21.7).
 *
 * Category and collection routes are derived from the managed taxonomy
 * records — never invented in a component. Every homepage, shop and
 * collection card asks here for its destination, so the URL a card points at
 * is always the same slug the taxonomy repository owns.
 *
 * A route is only offered for an ACTIVE record; anything archived, drafted or
 * hidden resolves to `null` and the caller drops the card rather than
 * pointing a customer at a dead or generic destination.
 */

import taxonomyRepository, { normalizeTaxonomyRecord } from "./taxonomyRepository";

/** The route prefix owned by the storefront's category listing. */
export const categoryPath = (slug) => `/category/${slug}`;

/** The route prefix owned by the storefront's collection listing. */
export const collectionPath = (slug) => `/collection/${slug}`;

/**
 * The canonical destination for a category record, or null when it must not
 * be linked. Reads the managed slug so `/category/kids` is whatever the
 * repository says, never an assumed string.
 */
export const categoryHref = (category) => {
  const record = normalizeTaxonomyRecord(category, "category");
  if (!record || !record.slug || record.status !== "ACTIVE") return null;
  return categoryPath(record.slug);
};

/**
 * The canonical destination for a collection record, or null when it must
 * not be linked. A scheduled/expired/archived collection never gets a link.
 */
export const collectionHref = (collection) => {
  if (!collection || !collection.slug) return null;
  const status = collection.displayStatus ?? collection.status;
  if (status !== "ACTIVE") return null;
  return collectionPath(collection.slug);
};

/**
 * Resolves an ACTIVE category by id or slug and returns its route plus the
 * record itself, or null when there is nothing routable to point at.
 */
export const resolveCategoryRoute = (idOrSlug) => {
  const category = taxonomyRepository.findCategory(idOrSlug);
  const href = categoryHref(category);
  return href ? { category, href } : null;
};

/**
 * Resolves an ACTIVE collection by id, slug or name and returns its route
 * plus the record itself, or null when there is nothing routable to point at.
 */
export const resolveCollectionRoute = (idOrSlug) => {
  const collection = taxonomyRepository.findCollection(idOrSlug);
  const href = collectionHref(collection);
  return href ? { collection, href } : null;
};

export default {
  categoryPath,
  collectionPath,
  categoryHref,
  collectionHref,
  resolveCategoryRoute,
  resolveCollectionRoute,
};
