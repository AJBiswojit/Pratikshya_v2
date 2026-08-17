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
 * `src/data/pratikshyaImageManifest.js`) — never by URL.
 */

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
  {
    id: "women",
    label: "Women",
    to: "/women",
    eyebrow: "Women's Collection",
    description:
      "Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.",
    columns: [
      {
        title: "Sarees",
        links: [
          { label: "Pato Sarees", to: "/women/pato-sarees" },
          { label: "Cotton Sarees", to: "/women/cotton-sarees" },
          { label: "Silk Sarees", to: "/women/silk-sarees" },
          { label: "Banarasi Sarees", to: "/women/banarasi-sarees" },
          { label: "Printed Sarees", to: "/women/printed-sarees" },
          { label: "Designer Sarees", to: "/women/designer-sarees" },
        ],
      },
      {
        title: "Lehengas",
        links: [
          { label: "Bridal Lehengas", to: "/women/bridal-lehengas" },
          { label: "Party Lehengas", to: "/women/party-lehengas" },
          { label: "Designer Lehengas", to: "/women/designer-lehengas" },
        ],
      },
      {
        title: "Essentials",
        links: [
          { label: "Kurtis + Suits", to: "/women/kurtis-and-suits" },
          { label: "Innerwear", to: "/women/innerwear" },
          { label: "Dupattas + Stoles", to: "/women/dupattas-and-stoles" },
        ],
      },
    ],
    feature: {
      image: "saree-banarasi",
      eyebrow: "Heritage Weaves",
      title: "The Saree Edit",
      caption: "Pato · cotton · silk · Banarasi · festive.",
      to: "/women/banarasi-sarees",
    },
  },
  {
    id: "bridal",
    label: "Bridal",
    to: "/bridal",
    eyebrow: "Bridal + Wedding",
    description:
      "Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.",
    columns: [
      {
        title: "The Bride",
        links: [
          { label: "Bridal Sarees", to: "/bridal/bridal-sarees" },
          { label: "Bridal Lehengas", to: "/bridal/bridal-lehengas" },
          { label: "Reception Wear", to: "/bridal/reception-wear" },
        ],
      },
      {
        title: "Celebrations",
        links: [
          { label: "Mehendi + Haldi", to: "/bridal/mehendi-and-haldi" },
          { label: "Sangeet Edit", to: "/bridal/sangeet-edit" },
          { label: "Trousseau Edit", to: "/bridal/trousseau-edit" },
        ],
      },
      {
        title: "Finishing Touches",
        links: [
          { label: "Bridal Jewellery", to: "/jewellery/bridal-jewellery" },
          { label: "Bridal Bangles", to: "/jewellery/bridal-bangles" },
          { label: "Groom Collection", to: "/men/groom" },
        ],
      },
    ],
    feature: {
      image: "lehenga-bridal",
      eyebrow: "Wedding Atelier",
      title: "The Celebration Edit",
      caption: "For the promises that become heirlooms.",
      to: "/bridal/bridal-lehengas",
    },
  },
  {
    id: "men",
    label: "Men",
    to: "/men",
    eyebrow: "Men + Groom",
    description:
      "Kurta, kurta pajama, ethnic wear and groom edits, tailored for the celebration.",
    columns: [
      {
        title: "Ethnic Wear",
        links: [
          { label: "Kurta", to: "/men/kurta" },
          { label: "Kurta Pajama", to: "/men/kurta-pajama" },
          { label: "Nehru Jackets", to: "/men/nehru-jackets" },
        ],
      },
      {
        title: "Groom",
        links: [
          { label: "Groom Collection", to: "/men/groom" },
          { label: "Sherwani", to: "/men/sherwani" },
          { label: "Wedding Kurta", to: "/men/wedding-kurta" },
        ],
      },
    ],
    feature: {
      image: "men-kurta",
      eyebrow: "Ceremonial Wardrobe",
      title: "The Groom Edit",
      caption: "A considered ceremonial wardrobe.",
      to: "/men/groom",
    },
  },
  {
    id: "kids",
    label: "Kids",
    to: "/kids",
    eyebrow: "Little Heirlooms",
    description:
      "Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.",
    columns: [
      {
        title: "Girls",
        links: [
          { label: "Dresses", to: "/kids/girls-dresses" },
          { label: "Casual Sets", to: "/kids/girls-casual-sets" },
        ],
      },
      {
        title: "Boys",
        links: [
          { label: "T-Shirt & Shorts", to: "/kids/boys-tshirt-shorts" },
          { label: "Casual Sets", to: "/kids/boys-casual-sets" },
        ],
      },
    ],
    feature: {
      image: "kids-festive-wear",
      eyebrow: "Little Heirlooms",
      title: "The Kids Edit",
      caption: "Everyday coordinates for the youngest guests.",
      to: "/kids",
    },
  },
  {
    id: "jewellery",
    label: "Jewellery",
    to: "/jewellery",
    eyebrow: "Bangles + Jewellery",
    description:
      "Bangles, earrings, necklaces, bracelets and rings chosen to hold the light.",
    columns: [
      {
        title: "Bangles",
        links: [
          { label: "Bridal Bangles", to: "/jewellery/bridal-bangles" },
          { label: "Gold-finish Bangles", to: "/jewellery/gold-finish-bangles" },
          { label: "Kada + Cuffs", to: "/jewellery/kada-and-cuffs" },
        ],
      },
      {
        title: "Adornments",
        links: [
          { label: "Earrings", to: "/jewellery/earrings" },
          { label: "Necklaces", to: "/jewellery/necklaces" },
          { label: "Maang Tikka", to: "/jewellery/maang-tikka" },
          { label: "Rings", to: "/jewellery/rings" },
        ],
      },
      {
        title: "Bridal",
        links: [
          { label: "Bridal Jewellery", to: "/jewellery/bridal-jewellery" },
          { label: "Sets + Pairings", to: "/jewellery/sets-and-pairings" },
        ],
      },
    ],
    feature: {
      image: "bridal-bangles",
      eyebrow: "Heirloom Metalwork",
      title: "The Jewellery Edit",
      caption: "The finishing language of an occasion.",
      to: "/jewellery/bridal-bangles",
    },
  },
  {
    id: "collections",
    label: "Collections",
    to: "/collections",
    eyebrow: "Editorial Collections",
    description:
      "Seasonal edits and fabric stories drawn from the atelier's weaving and finishing traditions.",
    columns: [
      {
        title: "Editorial",
        links: [
          { label: "New Arrivals", to: "/collections/new-arrivals" },
          { label: "Festive Edit", to: "/collections/festive-edit" },
          { label: "Heritage Weaves", to: "/collections/heritage-weaves" },
          { label: "Handloom Stories", to: "/collections/handloom-stories" },
        ],
      },
      {
        title: "Fabrics",
        links: [
          { label: "Cotton", to: "/collections/cotton" },
          { label: "Silk", to: "/collections/silk" },
          { label: "Linen", to: "/collections/linen" },
          { label: "Chiffon", to: "/collections/chiffon" },
        ],
      },
    ],
    feature: {
      image: "fabric-embroidered",
      eyebrow: "Fabric Stories",
      title: "Heritage Weaves",
      caption: "Woven, finished and chosen with intention.",
      to: "/collections/heritage-weaves",
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
  "Kids Festive",
];

/* ------------------------------------------------------------------ */
/* Footer                                                              */
/* ------------------------------------------------------------------ */

/** Footer columns — the Phase 1 groups, now routed. */
export const footerNavigation = [
  {
    title: "Women",
    links: [
      { label: "Sarees", to: "/women" },
      { label: "Pato Sarees", to: "/women/pato-sarees" },
      { label: "Lehengas", to: "/women/designer-lehengas" },
      { label: "Innerwear", to: "/women/innerwear" },
    ],
  },
  {
    title: "Occasions",
    links: [
      { label: "Bridal", to: "/bridal" },
      { label: "Wedding Wear", to: "/bridal/reception-wear" },
      { label: "Men + Groom", to: "/men/groom" },
      { label: "Kids Festive", to: "/kids" },
    ],
  },
  {
    title: "Customer Care",
    links: [
      { label: "Bangles + Jewellery", to: "/jewellery" },
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
    image: "hero-atelier",
  },
  {
    to: "/search",
    label: "Search",
    eyebrow: "Find Your Piece",
    description: "Search the atelier by fabric, occasion or silhouette.",
    image: "fabric-silk",
  },
  {
    to: "/account/wishlist",
    label: "Wishlist",
    eyebrow: "Saved Pieces",
    description: "The pieces you have set aside to return to.",
    image: "saree-silk",
  },
  {
    to: "/account",
    label: "Account",
    eyebrow: "Your Atelier",
    description: "Orders, addresses and preferences, kept in one place.",
    image: "fabric-linen",
  },
  {
    to: "/cart",
    label: "Bag",
    eyebrow: "Your Selection",
    description: "The pieces you are ready to take home.",
    image: "fabric-cotton",
  },
  {
    to: "/about",
    label: "About Us",
    eyebrow: "Our Story",
    description:
      "PRATIKSHYA FASHON brings together the richness of textile craft and the joy of dressing for life's most meaningful occasions.",
    image: "fabric-embroidered",
  },
  {
    to: "/contact",
    label: "Policies + Contact",
    eyebrow: "Customer Care",
    description: "Reach the atelier, or read how we ship, exchange and care.",
    image: "accessory-dupattas",
  },
  {
    to: "/privacy",
    label: "Privacy",
    eyebrow: "Policies",
    description: "How PRATIKSHYA FASHON handles the information you share.",
    image: "fabric-chiffon",
  },
  {
    to: "/terms",
    label: "Terms",
    eyebrow: "Policies",
    description: "The terms under which the atelier serves you.",
    image: "fabric-printed",
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
