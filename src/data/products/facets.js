/**
 * PRATIKSHYA FASHON — Facet construction.
 *
 * Turns the declared facets in `taxonomy.js` into the option lists the filter
 * panel renders, counted against the products actually in scope.
 *
 * Two rules govern what a shopper sees:
 *   — an option that matches nothing in the current scope is not offered;
 *   — a facet that is locked by the route (a category page's category) is
 *     not offered either, because unlocking it would contradict the URL.
 */

import {
  colorSwatches,
  filterFacets,
  getCategory,
  priceBands,
  ratingOptions,
  availabilityOptions,
  categoryLabels,
} from "./taxonomy";
import taxonomyRepository from "../../services/taxonomyRepository";
import { departmentNames } from "../catalog/taxonomy";
import { countBand, countFacet } from "./query";

/** Options for the facets whose values come from the catalogue itself. */
const derivedOptions = (counts) =>
  Object.keys(counts)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((value) => ({ id: value, label: value, count: counts[value] }));

/**
 * Builds every facet for a scope.
 *
 * @param {object[]} scoped   products the route contains, before user filters
 * @param {object}   filters  the shopper's current selections
 * @param {object}   locked   filters fixed by the route
 */
export function buildFacets(scoped, filters = {}, locked = {}) {
  return filterFacets
    .filter((facet) => !(facet.id in locked))
    .map((facet) => {
      let options;

      if (facet.id === "price") {
        const counts = countBand(scoped, filters, "price", priceBands.map((band) => band.id));
        options = priceBands
          .map((band) => ({ id: band.id, label: band.label, count: counts[band.id] }))
          .filter((option) => option.count > 0);
      } else if (facet.id === "rating") {
        const counts = countBand(scoped, filters, "rating", ratingOptions.map((o) => o.id));
        options = ratingOptions
          .map((option) => ({ ...option, count: counts[option.id] }))
          .filter((option) => option.count > 0);
      } else if (facet.id === "merch") {
        const merchOptions = [
          { id: "new", label: "New Arrival" },
          { id: "sale", label: "On Sale" },
        ];
        const counts = countBand(scoped, filters, "merch", merchOptions.map((entry) => entry.id));
        options = merchOptions
          .map((option) => ({ ...option, count: counts[option.id] ?? 0 }))
          .filter((option) => option.count > 0);
      } else {
        const counts = countFacet(scoped, filters, facet.id);

        if (facet.id === "category") {
          options = Object.keys(counts)
            .filter((id) => getCategory(id)?.status === "ACTIVE")
            .map((id) => ({
              id,
              label: categoryLabels[id] ?? id,
              count: counts[id],
              order: getCategory(id) ? 0 : 1,
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
        } else if (facet.id === "department") {
          options = derivedOptions(counts).map((option) => ({
            ...option,
            label: departmentNames[option.id] ?? option.label,
          }));
        } else if (facet.id === "collection") {
          const activeNames = new Set(taxonomyRepository.activeCollections().map((collection) => collection.name));
          options = derivedOptions(counts).filter((option) => activeNames.has(option.label));
        } else if (facet.id === "availability") {
          options = availabilityOptions
            .map((option) => ({ ...option, count: counts[option.id] ?? 0 }))
            .filter((option) => option.count > 0);
        } else if (facet.id === "color") {
          options = derivedOptions(counts).map((option) => ({
            ...option,
            swatch: colorSwatches[option.id] ?? "#d8d2c8",
          }));
        } else {
          options = derivedOptions(counts);
        }
      }

      return {
        id: facet.id,
        label: facet.label,
        kind: facet.kind,
        multiple: Boolean(facet.multiple),
        options: options.filter((option) => option.count > 0),
      };
    })
    /* A facet with one option cannot narrow anything, so it is not shown. */
    .filter((facet) => facet.options.length > 1);
}

/**
 * The human label for an active selection, used by the chip row.
 *
 * Only price and rating need translating; every other facet stores the label
 * it displays.
 */
export const chipLabel = (facetId, value) => {
  if (facetId === "price") {
    return priceBands.find((band) => band.id === value)?.label ?? value;
  }
  if (facetId === "rating") {
    return ratingOptions.find((option) => option.id === value)?.label ?? value;
  }
  if (facetId === "category") return categoryLabels[value] ?? value;
  if (facetId === "department") return departmentNames[value] ?? value;
  if (facetId === "availability") {
    return availabilityOptions.find((option) => option.id === value)?.label ?? value;
  }
  if (facetId === "merch") {
    if (value === "new") return "New Arrival";
    if (value === "sale") return "On Sale";
  }
  return value;
};

export default buildFacets;
