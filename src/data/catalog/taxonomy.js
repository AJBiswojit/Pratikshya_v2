/**
 * PRATIKSHYA FASHON — canonical catalogue data.
 *
 * The authored canonical Department → Category → Subcategory hierarchy and storefront routes shared by every Product department.
 */

/**
 * Every department shares this same hierarchy and route vocabulary. Product
 * records reference these stable ids; Product Media follows the Product's
 * canonical taxonomy rather than defining product identity.
 */

export const departments = [
  {
    id: "women",
    name: "Women",
    slug: "women",
    path: "/women",
    eyebrow: "Women's Collection",
    description: "Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.",
    categories: [
    {
      id: "essentials",
      name: "Essentials",
      slug: "essentials",
      path: "/women/essentials",
      eyebrow: "Everyday",
      description: "Kurtis, innerwear and dupattas for the daily wardrobe.",
      subcategories: [
      { id: "dupattas-stoles", name: "Dupattas + Stoles", slug: "dupattas-stoles", path: "/women/essentials/dupattas-stoles" },
      { id: "innerwear", name: "Innerwear", slug: "innerwear", path: "/women/essentials/innerwear" },
      { id: "kurtis-suits", name: "Kurtis + Suits", slug: "kurtis-suits", path: "/women/essentials/kurtis-suits" },
      ],
    },
    {
      id: "lehengas",
      name: "Lehengas",
      slug: "lehengas",
      path: "/women/lehengas",
      eyebrow: "The Ceremony",
      description: "Bridal, party and designer lehengas cut for the long celebration.",
      subcategories: [
      { id: "bridal", name: "Bridal Lehengas", slug: "bridal", path: "/women/lehengas/bridal" },
      { id: "designer", name: "Designer Lehengas", slug: "designer", path: "/women/lehengas/designer" },
      { id: "party", name: "Party Lehengas", slug: "party", path: "/women/lehengas/party" },
      ],
    },
    {
      id: "sarees",
      name: "Sarees",
      slug: "sarees",
      path: "/women/sarees",
      eyebrow: "Six Yards",
      description: "Banarasi, cotton and silk sarees from the house looms.",
      subcategories: [
      { id: "banarasi", name: "Banarasi Sarees", slug: "banarasi", path: "/women/sarees/banarasi" },
      { id: "cotton", name: "Cotton Sarees", slug: "cotton", path: "/women/sarees/cotton" },
      { id: "silk", name: "Silk Sarees", slug: "silk", path: "/women/sarees/silk" },
      ],
    },
    ],
  },
  {
    id: "bridal",
    name: "Bridal",
    slug: "bridal",
    path: "/bridal",
    eyebrow: "Bridal + Wedding",
    description: "Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.",
    categories: [
    {
      id: "celebrations",
      name: "Celebrations",
      slug: "celebrations",
      path: "/bridal/celebrations",
      eyebrow: "The Ceremonies",
      description: "Mehendi, sangeet and trousseau edits for every function.",
      subcategories: [
      { id: "mehendi-haldi", name: "Mehendi + Haldi", slug: "mehendi-haldi", path: "/bridal/celebrations/mehendi-haldi" },
      { id: "sangeet", name: "Sangeet Edit", slug: "sangeet", path: "/bridal/celebrations/sangeet" },
      { id: "trousseau", name: "Trousseau Edit", slug: "trousseau", path: "/bridal/celebrations/trousseau" },
      ],
    },
    {
      id: "finishing-touches",
      name: "Finishing Touches",
      slug: "finishing-touches",
      path: "/bridal/finishing-touches",
      eyebrow: "Adornment",
      description: "Bridal jewellery and bangles that finish the look.",
      subcategories: [
      { id: "bangles", name: "Bridal Bangles", slug: "bangles", path: "/bridal/finishing-touches/bangles" },
      { id: "jewellery", name: "Bridal Jewellery", slug: "jewellery", path: "/bridal/finishing-touches/jewellery" },
      ],
    },
    {
      id: "the-bride",
      name: "The Bride",
      slug: "the-bride",
      path: "/bridal/the-bride",
      eyebrow: "The Trousseau",
      description: "Sarees, lehengas and reception ensembles made for the bride.",
      subcategories: [
      { id: "lehengas", name: "Lehengas", slug: "lehengas", path: "/bridal/the-bride/lehengas" },
      { id: "reception-wear", name: "Reception Wear", slug: "reception-wear", path: "/bridal/the-bride/reception-wear" },
      { id: "sarees", name: "Sarees", slug: "sarees", path: "/bridal/the-bride/sarees" },
      ],
    },
    ],
  },
  {
    id: "men",
    name: "Men",
    slug: "men",
    path: "/men",
    eyebrow: "Men + Groom",
    description: "Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.",
    categories: [
    {
      id: "ethnic-wear",
      name: "Ethnic Wear",
      slug: "ethnic-wear",
      path: "/men/ethnic-wear",
      eyebrow: "Everyday + Festive",
      description: "Kurta pajama and Nehru jackets tailored in-house.",
      subcategories: [
      { id: "kurta-pajama", name: "Kurta Pajama", slug: "kurta-pajama", path: "/men/ethnic-wear/kurta-pajama" },
      { id: "nehru-jackets", name: "Nehru Jackets", slug: "nehru-jackets", path: "/men/ethnic-wear/nehru-jackets" },
      ],
    },
    {
      id: "groom",
      name: "Groom",
      slug: "groom",
      path: "/men/groom",
      eyebrow: "The Groom",
      description: "The groom's ceremonial wardrobe, considered as one edit.",
      subcategories: [
      { id: "groom-collection", name: "Groom Collection", slug: "groom-collection", path: "/men/groom/groom-collection" },
      ],
    },
    ],
  },
  {
    id: "kids",
    name: "Kids",
    slug: "kids",
    path: "/kids",
    eyebrow: "Little Heirlooms",
    description: "Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.",
    categories: [
    {
      id: "boys",
      name: "Boys",
      slug: "boys",
      path: "/kids/boys",
      eyebrow: "Little Heirlooms",
      description: "T-shirt and shorts sets and everyday coordinates for boys.",
      subcategories: [
      { id: "casual-sets", name: "Casual Sets", slug: "casual-sets", path: "/kids/boys/casual-sets" },
      { id: "t-shirt-shorts", name: "T-Shirt & Shorts", slug: "t-shirt-shorts", path: "/kids/boys/t-shirt-shorts" },
      ],
    },
    {
      id: "girls",
      name: "Girls",
      slug: "girls",
      path: "/kids/girls",
      eyebrow: "Little Heirlooms",
      description: "Dresses and casual sets for the youngest guests.",
      subcategories: [
      { id: "casual-sets", name: "Casual Sets", slug: "casual-sets", path: "/kids/girls/casual-sets" },
      { id: "dresses", name: "Dresses", slug: "dresses", path: "/kids/girls/dresses" },
      ],
    },
    ],
  },
];

export const departmentNames = Object.fromEntries(
  departments.map((department) => [department.id, department.name])
);

export const categoryNames = Object.fromEntries(
  departments.flatMap((department) =>
    department.categories.map((category) => [category.id, category.name])
  )
);

/** Every routable listing path (department / category / subcategory). */
export const catalogueRoutes = [
  {"path":"/women","label":"Women","eyebrow":"Women's Collection","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women"}]},
  {"path":"/women/essentials","label":"Essentials","eyebrow":"Women · Essentials","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Essentials"}]},
  {"path":"/women/essentials/dupattas-stoles","label":"Dupattas + Stoles","eyebrow":"Women · Essentials","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Essentials","to":"/women/essentials"},{"label":"Dupattas + Stoles"}]},
  {"path":"/women/essentials/innerwear","label":"Innerwear","eyebrow":"Women · Essentials","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Essentials","to":"/women/essentials"},{"label":"Innerwear"}]},
  {"path":"/women/essentials/kurtis-suits","label":"Kurtis + Suits","eyebrow":"Women · Essentials","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Essentials","to":"/women/essentials"},{"label":"Kurtis + Suits"}]},
  {"path":"/women/lehengas","label":"Lehengas","eyebrow":"Women · Lehengas","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Lehengas"}]},
  {"path":"/women/lehengas/bridal","label":"Bridal Lehengas","eyebrow":"Women · Lehengas","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Lehengas","to":"/women/lehengas"},{"label":"Bridal Lehengas"}]},
  {"path":"/women/lehengas/designer","label":"Designer Lehengas","eyebrow":"Women · Lehengas","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Lehengas","to":"/women/lehengas"},{"label":"Designer Lehengas"}]},
  {"path":"/women/lehengas/party","label":"Party Lehengas","eyebrow":"Women · Lehengas","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Lehengas","to":"/women/lehengas"},{"label":"Party Lehengas"}]},
  {"path":"/women/sarees","label":"Sarees","eyebrow":"Women · Sarees","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Sarees"}]},
  {"path":"/women/sarees/banarasi","label":"Banarasi Sarees","eyebrow":"Women · Sarees","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Sarees","to":"/women/sarees"},{"label":"Banarasi Sarees"}]},
  {"path":"/women/sarees/cotton","label":"Cotton Sarees","eyebrow":"Women · Sarees","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Sarees","to":"/women/sarees"},{"label":"Cotton Sarees"}]},
  {"path":"/women/sarees/silk","label":"Silk Sarees","eyebrow":"Women · Sarees","description":"Sarees, lehengas and everyday essentials selected for drape, detail and the occasion they will become part of.","group":"women","breadcrumb":[{"label":"Women","to":"/women"},{"label":"Sarees","to":"/women/sarees"},{"label":"Silk Sarees"}]},
  {"path":"/bridal","label":"Bridal","eyebrow":"Bridal + Wedding","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal"}]},
  {"path":"/bridal/celebrations","label":"Celebrations","eyebrow":"Bridal · Celebrations","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Celebrations"}]},
  {"path":"/bridal/celebrations/mehendi-haldi","label":"Mehendi + Haldi","eyebrow":"Bridal · Celebrations","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Celebrations","to":"/bridal/celebrations"},{"label":"Mehendi + Haldi"}]},
  {"path":"/bridal/celebrations/sangeet","label":"Sangeet Edit","eyebrow":"Bridal · Celebrations","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Celebrations","to":"/bridal/celebrations"},{"label":"Sangeet Edit"}]},
  {"path":"/bridal/celebrations/trousseau","label":"Trousseau Edit","eyebrow":"Bridal · Celebrations","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Celebrations","to":"/bridal/celebrations"},{"label":"Trousseau Edit"}]},
  {"path":"/bridal/finishing-touches","label":"Finishing Touches","eyebrow":"Bridal · Finishing Touches","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Finishing Touches"}]},
  {"path":"/bridal/finishing-touches/bangles","label":"Bridal Bangles","eyebrow":"Bridal · Finishing Touches","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Finishing Touches","to":"/bridal/finishing-touches"},{"label":"Bridal Bangles"}]},
  {"path":"/bridal/finishing-touches/jewellery","label":"Bridal Jewellery","eyebrow":"Bridal · Finishing Touches","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"Finishing Touches","to":"/bridal/finishing-touches"},{"label":"Bridal Jewellery"}]},
  {"path":"/bridal/the-bride","label":"The Bride","eyebrow":"Bridal · The Bride","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"The Bride"}]},
  {"path":"/bridal/the-bride/lehengas","label":"Lehengas","eyebrow":"Bridal · The Bride","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"The Bride","to":"/bridal/the-bride"},{"label":"Lehengas"}]},
  {"path":"/bridal/the-bride/reception-wear","label":"Reception Wear","eyebrow":"Bridal · The Bride","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"The Bride","to":"/bridal/the-bride"},{"label":"Reception Wear"}]},
  {"path":"/bridal/the-bride/sarees","label":"Sarees","eyebrow":"Bridal · The Bride","description":"Bridal sarees, wedding lehengas and ceremonial pieces composed for every part of the celebration.","group":"bridal","breadcrumb":[{"label":"Bridal","to":"/bridal"},{"label":"The Bride","to":"/bridal/the-bride"},{"label":"Sarees"}]},
  {"path":"/men","label":"Men","eyebrow":"Men + Groom","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men"}]},
  {"path":"/men/ethnic-wear","label":"Ethnic Wear","eyebrow":"Men · Ethnic Wear","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men","to":"/men"},{"label":"Ethnic Wear"}]},
  {"path":"/men/ethnic-wear/kurta-pajama","label":"Kurta Pajama","eyebrow":"Men · Ethnic Wear","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men","to":"/men"},{"label":"Ethnic Wear","to":"/men/ethnic-wear"},{"label":"Kurta Pajama"}]},
  {"path":"/men/ethnic-wear/nehru-jackets","label":"Nehru Jackets","eyebrow":"Men · Ethnic Wear","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men","to":"/men"},{"label":"Ethnic Wear","to":"/men/ethnic-wear"},{"label":"Nehru Jackets"}]},
  {"path":"/men/groom","label":"Groom","eyebrow":"Men · Groom","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men","to":"/men"},{"label":"Groom"}]},
  {"path":"/men/groom/groom-collection","label":"Groom Collection","eyebrow":"Men · Groom","description":"Kurta, kurta pajama, Nehru jackets and groom edits, tailored for the celebration.","group":"men","breadcrumb":[{"label":"Men","to":"/men"},{"label":"Groom","to":"/men/groom"},{"label":"Groom Collection"}]},
  {"path":"/kids","label":"Kids","eyebrow":"Little Heirlooms","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids"}]},
  {"path":"/kids/boys","label":"Boys","eyebrow":"Kids · Boys","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Boys"}]},
  {"path":"/kids/boys/casual-sets","label":"Casual Sets","eyebrow":"Kids · Boys","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Boys","to":"/kids/boys"},{"label":"Casual Sets"}]},
  {"path":"/kids/boys/t-shirt-shorts","label":"T-Shirt & Shorts","eyebrow":"Kids · Boys","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Boys","to":"/kids/boys"},{"label":"T-Shirt & Shorts"}]},
  {"path":"/kids/girls","label":"Girls","eyebrow":"Kids · Girls","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Girls"}]},
  {"path":"/kids/girls/casual-sets","label":"Casual Sets","eyebrow":"Kids · Girls","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Girls","to":"/kids/girls"},{"label":"Casual Sets"}]},
  {"path":"/kids/girls/dresses","label":"Dresses","eyebrow":"Kids · Girls","description":"Girls' dresses, boys' tee-and-shorts sets and everyday coordinates for the youngest guests.","group":"kids","breadcrumb":[{"label":"Kids","to":"/kids"},{"label":"Girls","to":"/kids/girls"},{"label":"Dresses"}]},
];

/**
 * Resolves a pathname to the listing scope it represents: the locked
 * filters, masthead copy and breadcrumb trail. Unknown paths return null.
 */
export const resolveCatalogueScope = (pathname) => {
  const route = catalogueRoutes.find((entry) => entry.path === pathname);
  if (!route) return null;
  const segments = pathname.split("/").filter(Boolean);
  const filters = { department: segments[0] };
  if (segments[1]) filters.category = segments[1];
  if (segments[2]) filters.subcategory = segments[2];
  return { ...route, filters };
};

/**
 * navigationScopes entries for every catalogue listing path.
 *
 * A navigation scope is always a `{ filters }` record — the same shape the
 * collection and legacy entries in `src/data/products/taxonomy.js` use — so
 * `CatalogueListing` can read `scope.filters` for every listing route
 * without knowing which table the route came from. Emitting the bare filter
 * object here is what silently unscoped the department routes: the page
 * read `nav.filters`, found nothing, and queried the whole catalogue.
 */
export const catalogueNavigationScopes = Object.fromEntries(
  catalogueRoutes.map((route) => [route.path, { filters: resolveCatalogueScope(route.path).filters }])
);

export default { departments, departmentNames, categoryNames, catalogueRoutes, resolveCatalogueScope, catalogueNavigationScopes };
