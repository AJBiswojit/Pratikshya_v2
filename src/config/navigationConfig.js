/**
 * PRATIKSHYA FASHON — Navigation & Information Architecture
 *
 * The single source of truth for every navigational surface in the app:
 * the desktop navigation, the mega menu, the mobile drawer, the utility
 * actions, the footer and the route manifest.
 *
 * Nothing in the shell hard-codes a link. Add a destination here and it
 * appears in the navigation, the drawer, the breadcrumb trail and the
 * router at the same time.
 *
 * Imagery is referenced by manifest id only (see
 * `src/data/mediaPlaceholder.js`) — never by URL.
 */

import { catalogueRoutes, departments } from "../data/catalog/taxonomy";
import taxonomyRepository from "../services/taxonomyRepository";

const collectionPath = (collection) => `/collections/${collection.id}`;

const collectionNavigationColumns = () => {
  const collections = taxonomyRepository.activeCollections();
  const fabric = collections.filter((collection) => collection.rule?.fabricIncludes);
  const editorial = collections.filter((collection) => !collection.rule?.fabricIncludes);
  const columns = [];
  if (editorial.length) {
    columns.push({
      title: "Editorial",
      links: editorial.map((collection) => ({
        label: collection.name,
        to: collectionPath(collection),
      })),
    });
  }
  if (fabric.length) {
    columns.push({
      title: "Fabrics",
      links: fabric.map((collection) => ({
        label: collection.name,
        to: collectionPath(collection),
      })),
    });
  }
  return columns;
};

const heritageWeaves = () =>
  taxonomyRepository.findCollection("heritage-weaves") ||
  taxonomyRepository.activeCollections()[0] ||
  null;

export const brand = {
  name: "PRATIKSHYA FASHON",
  home: "/",
  tagline: "Fashion, textile and celebration—considered with care.",
  copyright: "© 2026 PRATIKSHYA FASHON",
};

/* ------------------------------------------------------------------ */
/* Primary navigation + mega menu                                      */
/* ------------------------------------------------------------------ */

/**
 * The six top-level groups. Each one owns a landing route, the columns of
 * its mega menu and a single editorial feature panel.
 */
export const primaryNavigation = [
  ...departments.map((department) => ({
    id: department.id,
    label: department.name,
    to: department.path,
    eyebrow: department.eyebrow,
    description: department.description,
    columns: department.categories.map((category) => ({
      title: category.name,
      links: [
        ...category.subcategories.map((subcategory) => ({
          label: subcategory.name,
          to: subcategory.path,
        })),
        { label: `All ${category.name}`, to: category.path },
      ],
    })),
    feature: {
      image: null,
      eyebrow: department.eyebrow,
      title: `The ${department.name} Edit`,
      caption: department.description,
      to: department.path,
    },
  })),
  {
    id: "collections",
    label: "Collections",
    to: "/collections",
    eyebrow: "Editorial Collections",
    description:
      "Seasonal edits and fabric stories drawn from the atelier's weaving and finishing traditions.",
    columns: collectionNavigationColumns(),
    feature: {
      image: null,
      eyebrow: "Fabric Stories",
      title: heritageWeaves()?.name || "Heritage Weaves",
      caption: heritageWeaves()?.description || "Woven, finished and chosen with intention.",
      to: heritageWeaves() ? collectionPath(heritageWeaves()) : "/collections",
    },
  },
];

/* ------------------------------------------------------------------ */
/* Utility navigation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Header actions. `icon` names map to the Lucide icons resolved in
 * `SiteHeader`; `action` marks entries the header handles itself rather
 * than navigating to.
 */
export const utilityNavigation = [
  { id: "search", label: "Search", icon: "search", action: "search", to: "/search" },
  { id: "wishlist", label: "Wishlist", icon: "wishlist", to: "/account/wishlist" },
  { id: "account", label: "Account", icon: "account", to: "/account" },
  { id: "cart", label: "Bag", icon: "cart", to: "/cart" },
];

/** Offered beneath the search field as a starting point. */
export const searchSuggestions = [
  "Banarasi Saree",
  "Bridal Lehenga",
  "Pato Saree",
  "Bridal Bangles",
  "Men's Kurta",
];

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

/** Footer columns — the Phase 1 groups, now routed. */
export const footerNavigation = [
  {
    title: "Women",
    links: [
      { label: "Sarees", to: "/women/sarees" },
      { label: "Silk Sarees", to: "/women/sarees/silk" },
      { label: "Lehengas", to: "/women/lehengas" },
      { label: "Innerwear", to: "/women/essentials/innerwear" },
    ],
  },
  {
    title: "Occasions",
    links: [
      { label: "Bridal", to: "/bridal" },
      { label: "Wedding Wear", to: "/bridal/the-bride/lehengas" },
      { label: "Men + Groom", to: "/men/groom" },
      { label: "New Arrivals", to: "/collections/new-arrivals" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Bangles + Jewellery", to: "/bridal/finishing-touches/jewellery" },
      { label: "New Arrivals", to: "/collections/new-arrivals" },
      { label: "About Us", to: "/about" },
      { label: "Policies + Contact", to: "/contact" },
    ],
  },
];

/** The bottom bar of the footer. */
export const legalNavigation = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
  { label: "Contact", to: "/contact" },
];

/* ------------------------------------------------------------------ */
/* Standalone pages                                                    */
/* ------------------------------------------------------------------ */

/**
 * Pages that exist outside the category tree. They are routed and
 * breadcrumbed exactly like category pages.
 */
export const standalonePages = [
  {
    to: "/explore",
    label: "Explore",
    eyebrow: "Explore PRATIKSHYA",
    description: "Discover pieces across every collection.",
    image: null,
  },
  {
    to: "/search",
    label: "Search",
    eyebrow: "Find Your Piece",
    description: "Search the atelier by fabric, occasion or silhouette.",
    image: null,
  },
  {
    to: "/account/wishlist",
    label: "Wishlist",
    eyebrow: "Saved Pieces",
    description: "The pieces you have set aside to return to.",
    image: null,
  },
  {
    to: "/account",
    label: "Account",
    eyebrow: "Your Atelier",
    description: "Orders, addresses and preferences, kept in one place.",
    image: null,
  },
  {
    to: "/cart",
    label: "Bag",
    eyebrow: "Your Selection",
    description: "The pieces you are ready to take home.",
    image: null,
  },
  {
    to: "/about",
    label: "About Us",
    eyebrow: "Our Story",
    description:
      "PRATIKSHYA FASHON brings together the richness of textile craft and the joy of dressing for life's most meaningful occasions.",
    image: null,
  },
  {
    to: "/contact",
    label: "Policies + Contact",
    eyebrow: "Customer Care",
    description: "Reach the atelier, or read how we ship, exchange and care.",
    image: null,
  },
  {
    to: "/privacy",
    label: "Privacy",
    eyebrow: "Policies",
    description: "How PRATIKSHYA FASHON handles the information you share.",
    image: null,
  },
  {
    to: "/terms",
    label: "Terms",
    eyebrow: "Policies",
    description: "The terms under which the atelier serves you.",
    image: null,
  },
];

/* ------------------------------------------------------------------ */
/* Route manifest                                                      */
/* ------------------------------------------------------------------ */

/**
 * Flattens the information architecture into one routable list.
 *
 * Every entry carries everything a page shell needs: its path, its title,
 * the eyebrow above it, an image id and the breadcrumb trail leading to it.
 */
function buildRouteManifest() {
  const routes = [];
  const seen = new Set();

  const push = (route) => {
    if (seen.has(route.path)) return;
    seen.add(route.path);
    routes.push(route);
  };

  primaryNavigation.forEach((group) => {
    push({
      path: group.to,
      label: group.label,
      eyebrow: group.eyebrow,
      description: group.description,
      image: group.feature.image,
      group: group.id,
      breadcrumb: [{ label: group.label }],
    });

    group.columns.forEach((column) => {
      column.links.forEach((link) => {
        // A column may point into another group (bridal → jewellery); the
        // owning group is whichever group's path the link sits under.
        const owner =
          primaryNavigation.find((candidate) => link.to.startsWith(`${candidate.to}/`)) ?? group;

        push({
          path: link.to,
          label: link.label,
          eyebrow: `${owner.label} · ${column.title}`,
          description: owner.description,
          image: owner.feature.image,
          group: owner.id,
          breadcrumb: [{ label: owner.label, to: owner.to }, { label: link.label }],
        });
      });
    });
  });

  standalonePages.forEach((page) => {
    push({
      path: page.to,
      label: page.label,
      eyebrow: page.eyebrow,
      description: page.description,
      image: page.image,
      group: null,
      breadcrumb: [{ label: page.label }],
    });
  });

  /* Department / category / subcategory listing paths, generated from the
     department-based catalogue taxonomy (src/data/catalog/taxonomy.js). */
  catalogueRoutes.forEach((route) => push(route));

  return routes;
}

export const routeManifest = buildRouteManifest();

/** Look up a route's metadata by pathname. */
export const getRouteMeta = (pathname) =>
  routeManifest.find((route) => route.path === pathname) ?? null;

export default {
  brand,
  primaryNavigation,
  utilityNavigation,
  searchSuggestions,
  footerNavigation,
  legalNavigation,
  standalonePages,
  routeManifest,
  getRouteMeta,
};
