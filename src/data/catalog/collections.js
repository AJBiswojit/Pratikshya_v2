/**
 * PRATIKSHYA FASHON — canonical catalogue data.
 *
 * Authored editorial collection metadata and optional baseline plates. These are storytelling records, never Product records.
 */

/**
 * Editorial + fabric storytelling assets. These are NOT product records —
 * they are the collection plates behind the editorial pages and fabric
 * stories, sourced from `public/images/collections/`.
 */
export const editorialCollections = [
  {
  "id": "festive-edit",
  "taxonomyId": "festive-edit",
  "name": "Festive Edit",
  "eyebrow": "Season of Light",
  "description": "The season of light, dressed.",
  "media": {
    "primary": "/images/collections/editorial/festive-edit/PF-COL-FES-0001/primary.avif",
    "gallery": [
      "/images/collections/editorial/festive-edit/PF-COL-FES-0001/01.avif",
      "/images/collections/editorial/festive-edit/PF-COL-FES-0001/02.avif",
      "/images/collections/editorial/festive-edit/PF-COL-FES-0002/01.avif",
      "/images/collections/editorial/festive-edit/PF-COL-FES-0002/02.avif",
      "/images/collections/editorial/festive-edit/PF-COL-FES-0003/01.avif",
      "/images/collections/editorial/festive-edit/PF-COL-FES-0003/02.avif"
    ]
  }
},
  {
  "id": "heritage-weaves",
  "taxonomyId": "heritage-weaves",
  "name": "Heritage Weaves",
  "eyebrow": "Looms of Odisha & Banaras",
  "description": "Looms of Odisha and Banaras, documented and preserved.",
  "media": {
    "primary": "/images/collections/editorial/heritage-weaves/PF-COL-HER-0001/primary.avif",
    "gallery": [
      "/images/collections/editorial/heritage-weaves/PF-COL-HER-0001/01.avif",
      "/images/collections/editorial/heritage-weaves/PF-COL-HER-0002/01.webp",
      "/images/collections/editorial/heritage-weaves/PF-COL-HER-0003/01.webp",
      "/images/collections/editorial/heritage-weaves/PF-COL-HER-0003/02.avif"
    ]
  }
},
  {
  "id": "new-arrival",
  "taxonomyId": "new-arrivals",
  "name": "New Arrivals",
  "eyebrow": "Just In",
  "description": "The pieces that reached the atelier floor this month.",
  "media": {
    "primary": "/images/collections/editorial/new-arrival/PF-COL-NEW-0001/primary.avif",
    "gallery": []
  }
},
];

export const fabricCollections = [
  {
  "id": "chiffon",
  "taxonomyId": "chiffon",
  "name": "Chiffon",
  "eyebrow": "Fabric Stories",
  "description": "Airy, fluid chiffon across the atelier's drapes.",
  "media": {
    "primary": "/images/collections/fabrics/chiffon/PF-COL-FAB-CHF-0001/primary.avif",
    "gallery": [
      "/images/collections/fabrics/chiffon/PF-COL-FAB-CHF-0001/01.avif",
      "/images/collections/fabrics/chiffon/PF-COL-FAB-CHF-0001/02.avif"
    ]
  }
},
  {
  "id": "cotton",
  "taxonomyId": "cotton",
  "name": "Cotton",
  "eyebrow": "Fabric Stories",
  "description": "Everyday cotton, woven and finished with care.",
  "media": {
    "primary": "/images/collections/fabrics/cotton/PF-COL-FAB-COT-0001/primary.avif",
    "gallery": [
      "/images/collections/fabrics/cotton/PF-COL-FAB-COT-0001/01.avif",
      "/images/collections/fabrics/cotton/PF-COL-FAB-COT-0001/02.avif",
      "/images/collections/fabrics/cotton/PF-COL-FAB-COT-0002/01.avif",
      "/images/collections/fabrics/cotton/PF-COL-FAB-COT-0002/02.avif"
    ]
  }
},
  {
  "id": "linen",
  "taxonomyId": "linen",
  "name": "Linen",
  "eyebrow": "Fabric Stories",
  "description": "Breathable linen for the considered wardrobe.",
  "media": {
    "primary": "/images/collections/fabrics/linen/PF-COL-FAB-LIN-0001/primary.avif",
    "gallery": [
      "/images/collections/fabrics/linen/PF-COL-FAB-LIN-0001/01.avif",
      "/images/collections/fabrics/linen/PF-COL-FAB-LIN-0002/01.avif"
    ]
  }
},
  {
  "id": "silk",
  "taxonomyId": "silk",
  "name": "Silk",
  "eyebrow": "Fabric Stories",
  "description": "Silk sarees, lehengas and heirloom weaves across the atelier.",
  "media": {
    "primary": "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0001/primary.avif",
    "gallery": [
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0001/01.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0001/02.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0002/01.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0002/02.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0003/01.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0005/01.avif",
      "/images/collections/fabrics/silk/PF-COL-FAB-SIL-0005/02.avif"
    ]
  }
},
];

/** Every collection plate, keyed by taxonomy collection id (and folder id). */
export const collectionPlates = Object.fromEntries(
  [...editorialCollections, ...fabricCollections].flatMap((collection) => [
    [collection.id, collection],
    [collection.taxonomyId, collection],
  ])
);

export default { editorialCollections, fabricCollections, collectionPlates };
