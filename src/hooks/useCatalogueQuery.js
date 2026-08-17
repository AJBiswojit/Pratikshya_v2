/**
 * PRATIKSHYA FASHON — Catalogue query state.
 *
 * Binds the pure query engine to the URL. The query string is the single
 * source of truth for what is on screen: filters, search term, sort order
 * and how many pages have been revealed all live there, so every view is
 * shareable, bookmarkable and survives the back button.
 *
 * Multi-value facets are comma-joined (`?color=Red,Gold`). Empty values are
 * dropped rather than written as blanks, which keeps clean URLs clean.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { filterFacets, defaultSort } from "../data/products/taxonomy";
import { queryCatalogue, resolveCategoryFilter, resolveSort, SORT_ALIASES } from "../data/products/query";

const multiFacets = new Set(
  filterFacets.filter((facet) => facet.multiple).map((facet) => facet.id)
);

const facetIds = filterFacets.map((facet) => facet.id);

export { SORT_ALIASES };

/** The number of products revealed by one press of "Load More". */
export const PAGE_SIZE = 12;

/** Reads the filter object out of the query string. */
const readFilters = (params) => {
  const filters = {};
  facetIds.forEach((id) => {
    const raw = params.get(id);
    if (!raw) return;
    filters[id] = multiFacets.has(id) ? raw.split(",").filter(Boolean) : raw;
  });
  if (filters.category) filters.category = resolveCategoryFilter(filters.category);
  return filters;
};

/** Writes a filter object back into a `URLSearchParams`, dropping empties. */
const writeFilters = (params, filters) => {
  facetIds.forEach((id) => {
    const value = filters[id];
    const serialised = Array.isArray(value) ? value.join(",") : value;
    if (serialised) params.set(id, serialised);
    else params.delete(id);
  });
  return params;
};

/**
 * @param {object} options
 * @param {object} options.scopeFilters filters locked by the route
 * @param {boolean} options.searchFromUrl read the search term from `?q=`
 */
export default function useCatalogueQuery({
  scopeFilters = {},
  searchFromUrl = false,
  source = null,
  pageSize = PAGE_SIZE,
} = {}) {
  const [params, setParams] = useSearchParams();

  const filters = useMemo(() => readFilters(params), [params]);
  const search = searchFromUrl ? params.get("q") ?? "" : "";
  const sort = resolveSort(params.get("sort"), defaultSort);
  const pages = Math.max(1, Number(params.get("page")) || 1);
  const size = Math.max(1, Number(pageSize) || PAGE_SIZE);

  /**
   * Query results. Memoised on the URL, so typing in an unrelated field or
   * re-rendering the shell never re-filters the catalogue.
   */
  const query = useMemo(
    () => queryCatalogue({ source, scopeFilters, filters, search, sort }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [source, JSON.stringify(scopeFilters), JSON.stringify(filters), search, sort]
  );

  const visible = useMemo(
    () => query.results.slice(0, pages * size),
    [query.results, pages, size]
  );

  /* --- mutations ------------------------------------------------- */

  /** Replaces the whole filter set, resetting pagination. */
  const applyFilters = useCallback(
    (next) => {
      setParams(
        (current) => {
          const updated = writeFilters(new URLSearchParams(current), next);
          updated.delete("page");
          return updated;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  /**
   * Sets one facet. Passing `null` clears it; for multi-value facets an array
   * replaces the selection outright.
   */
  const setFilter = useCallback(
    (facetId, value) => applyFilters({ ...filters, [facetId]: value ?? "" }),
    [applyFilters, filters]
  );

  /** Adds or removes one value of a multi-value facet. */
  const toggleFilter = useCallback(
    (facetId, value) => {
      if (!multiFacets.has(facetId)) {
        return setFilter(facetId, filters[facetId] === value ? "" : value);
      }
      const current = filters[facetId] ?? [];
      const next = current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value];
      return setFilter(facetId, next);
    },
    [filters, setFilter]
  );

  /** Removes a single active selection — the chip's "×". */
  const removeFilter = useCallback(
    (facetId, value) => {
      if (multiFacets.has(facetId) && value !== undefined) {
        return setFilter(facetId, (filters[facetId] ?? []).filter((entry) => entry !== value));
      }
      return setFilter(facetId, "");
    },
    [filters, setFilter]
  );

  const clearFilters = useCallback(() => applyFilters({}), [applyFilters]);

  const setSort = useCallback(
    (value) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          const canonical = SORT_ALIASES[value] || value;
          if (canonical && canonical !== defaultSort) updated.set("sort", canonical);
          else updated.delete("sort");
          updated.delete("page");
          return updated;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  const setSearch = useCallback(
    (value) => {
      setParams(
        (current) => {
          const updated = new URLSearchParams(current);
          const term = String(value || "").trim();
          if (term) updated.set("q", term);
          else updated.delete("q");
          updated.delete("page");
          return updated;
        },
        { replace: true }
      );
    },
    [setParams]
  );

  /** Reveals the next page of results. */
  const loadMore = useCallback(() => {
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("page", String(pages + 1));
        return updated;
      },
      { replace: true }
    );
  }, [pages, setParams]);

  /* --- derived --------------------------------------------------- */

  /**
   * The shopper's active selections, flattened into one chip list. Scope
   * filters are deliberately absent: they define the page, so they are not
   * removable.
   */
  const activeChips = useMemo(() => {
    const chips = [];
    filterFacets.forEach((facet) => {
      const value = filters[facet.id];
      if (!value) return;
      const values = Array.isArray(value) ? value : [value];
      values.forEach((entry) => chips.push({ facet: facet.id, facetLabel: facet.label, value: entry }));
    });
    return chips;
  }, [filters]);

  return {
    /* state */
    filters,
    search,
    sort,
    activeChips,
    activeCount: activeChips.length,

    /* results */
    results: query.results,
    visible,
    total: query.total,
    scoped: query.scoped,
    scopeTotal: query.scopeTotal,
    hasMore: visible.length < query.total,
    remaining: query.total - visible.length,

    /* actions */
    setFilter,
    toggleFilter,
    removeFilter,
    clearFilters,
    setSort,
    setSearch,
    loadMore,
  };
}
