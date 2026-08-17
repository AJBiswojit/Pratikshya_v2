/**
 * PRATIKSHYA FASHON — Seeded media register.
 *
 * The house media the register starts life with, so the Media Library, the
 * per-product manager and the marketing surfaces all have something real to
 * show on a fresh browser. Once an operator saves anything, the stored
 * register takes over and this file is only a fallback.
 *
 * Every image address is resolved from `pratikshyaImageManifest` rather than
 * hardcoded, so the existing image infrastructure stays the single source of
 * truth for artwork. Nothing here introduces a new picture.
 *
 * The two seeded videos point at public sample files. They carry posters
 * drawn from the manifest, so a blocked or slow video still presents as a
 * composed plate rather than a black rectangle.
 */

import {
  MARKETING_PLACEMENTS,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PRODUCT_MEDIA_ROLES,
} from "../../config/mediaTypes";
import { getImage } from "../pratikshyaImageManifest";

/** Manifest id → address, so seeded media never restates a URL. */
const plate = (id) => getImage(id).src;

/** Manifest id → authored alt text, for the same reason. */
const plateAlt = (id) => getImage(id).alt;

const SEEDED_AT = "2026-01-08T09:00:00.000Z";

/**
 * Public sample footage. Used only to demonstrate the video pathway — a
 * real atelier film replaces the address without any code change.
 */
const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

const productImage = ({ id, productId, imageId, role, sortOrder, title, status }) => ({
  id,
  type: MEDIA_TYPES.IMAGE,
  url: plate(imageId),
  poster: "",
  thumbnail: plate(imageId),
  title,
  alt: plateAlt(imageId),
  caption: "",
  tags: ["seed", "product"],
  scope: MEDIA_SCOPES.PRODUCT,
  status: status ?? MEDIA_STATUS.ACTIVE,
  productId,
  role,
  sortOrder,
  source: "House manifest",
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});

const productVideo = ({ id, productId, posterId, role, sortOrder, title, caption }) => ({
  id,
  type: MEDIA_TYPES.VIDEO,
  url: SAMPLE_VIDEO,
  poster: plate(posterId),
  thumbnail: plate(posterId),
  title,
  alt: title,
  caption: caption ?? "",
  tags: ["seed", "product", "video"],
  scope: MEDIA_SCOPES.PRODUCT,
  status: MEDIA_STATUS.ACTIVE,
  productId,
  role,
  sortOrder,
  source: "Sample footage",
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});

const marketingImage = ({ id, placement, imageId, campaign, section, sortOrder, status, title }) => ({
  id,
  type: MEDIA_TYPES.IMAGE,
  url: plate(imageId),
  poster: "",
  thumbnail: plate(imageId),
  title,
  alt: plateAlt(imageId),
  caption: "",
  tags: ["seed", "marketing"],
  scope: MEDIA_SCOPES.MARKETING,
  status: status ?? MEDIA_STATUS.ACTIVE,
  placement,
  campaign: campaign ?? null,
  section: section ?? null,
  sortOrder: sortOrder ?? 0,
  source: "House manifest",
  createdAt: SEEDED_AT,
  updatedAt: SEEDED_AT,
});

/* ------------------------------------------------------------------ */
/* Product media                                                       */
/* ------------------------------------------------------------------ */

/**
 * Three products are dressed in full — a saree, a bridal lehenga and a
 * bridal couture piece — so the gallery, the video pathway and the
 * completeness indicators all have a worked example. Every other product
 * continues to render from its catalogue plates until media is attached.
 */
const productMedia = [
  /* pf-001 — Sambalpuri Pato Silk Saree */
  productImage({
    id: "pm-seed-001",
    productId: "pf-001",
    imageId: "saree-silk",
    role: PRODUCT_MEDIA_ROLES.COVER,
    sortOrder: 0,
    title: "Sambalpuri Pato — cover",
  }),
  productImage({
    id: "pm-seed-002",
    productId: "pf-001",
    imageId: "fabric-silk",
    role: PRODUCT_MEDIA_ROLES.DETAIL,
    sortOrder: 1,
    title: "Sambalpuri Pato — zari detail",
  }),
  productImage({
    id: "pm-seed-003",
    productId: "pf-001",
    imageId: "saree-traditional",
    role: PRODUCT_MEDIA_ROLES.MODEL,
    sortOrder: 2,
    title: "Sambalpuri Pato — drape on model",
  }),
  productImage({
    id: "pm-seed-004",
    productId: "pf-001",
    imageId: "saree-banarasi",
    role: PRODUCT_MEDIA_ROLES.CLOSEUP,
    sortOrder: 3,
    title: "Sambalpuri Pato — weave close-up",
  }),
  productVideo({
    id: "pm-seed-005",
    productId: "pf-001",
    posterId: "saree-silk",
    role: PRODUCT_MEDIA_ROLES.PRODUCT_VIDEO,
    sortOrder: 4,
    title: "Sambalpuri Pato — atelier film",
    caption: "The drape, shot in the atelier.",
  }),

  /* pf-024 — Maroon Zardozi Bridal Lehenga */
  productImage({
    id: "pm-seed-006",
    productId: "pf-024",
    imageId: "lehenga-bridal",
    role: PRODUCT_MEDIA_ROLES.COVER,
    sortOrder: 0,
    title: "Maroon Zardozi — cover",
  }),
  productImage({
    id: "pm-seed-007",
    productId: "pf-024",
    imageId: "women-bridal-wear",
    role: PRODUCT_MEDIA_ROLES.MODEL,
    sortOrder: 1,
    title: "Maroon Zardozi — on model",
  }),
  productImage({
    id: "pm-seed-008",
    productId: "pf-024",
    imageId: "fabric-embroidered",
    role: PRODUCT_MEDIA_ROLES.DETAIL,
    sortOrder: 2,
    title: "Maroon Zardozi — zardozi detail",
  }),
  productVideo({
    id: "pm-seed-009",
    productId: "pf-024",
    posterId: "lehenga-bridal",
    role: PRODUCT_MEDIA_ROLES.SHOWCASE,
    sortOrder: 3,
    title: "Maroon Zardozi — showcase",
    caption: "A slow turn through the skirt work.",
  }),

  /* pf-036 — Bridal Kanjivaram in Temple Gold */
  productImage({
    id: "pm-seed-010",
    productId: "pf-036",
    imageId: "saree-ivory-silk",
    role: PRODUCT_MEDIA_ROLES.COVER,
    sortOrder: 0,
    title: "Temple Gold Kanjivaram — cover",
  }),
  productImage({
    id: "pm-seed-011",
    productId: "pf-036",
    imageId: "saree-banarasi",
    role: PRODUCT_MEDIA_ROLES.GALLERY,
    sortOrder: 1,
    title: "Temple Gold Kanjivaram — pallu",
  }),
  productImage({
    id: "pm-seed-012",
    productId: "pf-036",
    imageId: "bridal-jewellery",
    role: PRODUCT_MEDIA_ROLES.LIFESTYLE,
    sortOrder: 2,
    title: "Temple Gold Kanjivaram — styled with heirloom gold",
  }),

  /* pf-005 — Ivory Kanjivaram: gallery present, cover deliberately absent so
     the "Needs cover" indicator has a real subject in the admin surfaces. */
  productImage({
    id: "pm-seed-013",
    productId: "pf-005",
    imageId: "saree-ivory-silk",
    role: PRODUCT_MEDIA_ROLES.GALLERY,
    sortOrder: 0,
    title: "Ivory Kanjivaram — gallery plate",
  }),
  productImage({
    id: "pm-seed-014",
    productId: "pf-005",
    imageId: "fabric-silk",
    role: PRODUCT_MEDIA_ROLES.DETAIL,
    sortOrder: 1,
    title: "Ivory Kanjivaram — silk detail",
  }),
];

/* ------------------------------------------------------------------ */
/* Marketing media                                                     */
/* ------------------------------------------------------------------ */

/**
 * The four live placements are seeded with the artwork the landing page
 * already carries, so activating the register changes nothing visually
 * until an operator swaps a plate. That is deliberate: the approved
 * landing page is preserved, the source of its media simply moves.
 */
const marketingMedia = [
  marketingImage({
    id: "pm-seed-102",
    placement: MARKETING_PLACEMENTS.SAREE_SECTION,
    imageId: "saree-banarasi",
    campaign: "Heritage Weaves",
    section: "Collections",
    title: "Saree panel — Banarasi silk",
  }),
  marketingImage({
    id: "pm-seed-103",
    placement: MARKETING_PLACEMENTS.LEHENGA_SECTION,
    imageId: "lehenga-bridal",
    campaign: "Bridal Trousseau",
    section: "Collections",
    title: "Lehenga panel — bridal editorial",
  }),
  marketingImage({
    id: "pm-seed-104",
    placement: MARKETING_PLACEMENTS.FESTIVE_SECTION,
    imageId: "fabric-cotton",
    campaign: "Festive Edit",
    section: "Campaign",
    title: "Festive band — cotton backdrop",
  }),
  marketingImage({
    id: "pm-seed-106",
    placement: MARKETING_PLACEMENTS.BRIDAL_SECTION,
    imageId: "women-bridal-wear",
    campaign: "Bridal Trousseau",
    section: "Category",
    status: MEDIA_STATUS.DRAFT,
    title: "Bridal category — trousseau plate",
  }),
  marketingImage({
    id: "pm-seed-107",
    placement: MARKETING_PLACEMENTS.GROOM_SECTION,
    imageId: "groom-sherwani",
    campaign: "Groom Atelier",
    section: "Category",
    status: MEDIA_STATUS.ARCHIVED,
    title: "Groom category — sherwani campaign",
  }),
];

/* ------------------------------------------------------------------ */
/* Unassigned                                                          */
/* ------------------------------------------------------------------ */

/** Media may live in the library before anyone decides what it is for. */
const unassignedMedia = [
  {
    id: "pm-seed-201",
    type: MEDIA_TYPES.IMAGE,
    url: plate("fabric-linen"),
    thumbnail: plate("fabric-linen"),
    title: "Linen study — unassigned",
    alt: plateAlt("fabric-linen"),
    tags: ["seed", "texture"],
    scope: MEDIA_SCOPES.UNASSIGNED,
    status: MEDIA_STATUS.DRAFT,
    source: "House manifest",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
  {
    id: "pm-seed-202",
    type: MEDIA_TYPES.VIDEO,
    url: SAMPLE_VIDEO,
    poster: plate("fabric-chiffon"),
    thumbnail: plate("fabric-chiffon"),
    title: "Chiffon in motion — unassigned",
    alt: "Chiffon moving in studio light",
    tags: ["seed", "video", "texture"],
    scope: MEDIA_SCOPES.UNASSIGNED,
    status: MEDIA_STATUS.DRAFT,
    source: "Sample footage",
    createdAt: SEEDED_AT,
    updatedAt: SEEDED_AT,
  },
];

/* ------------------------------------------------------------------ */
/* Employee submissions                                               */
/* ------------------------------------------------------------------ */

const employeeSubmissions = [
  {
    id: "pm-seed-301",
    type: MEDIA_TYPES.IMAGE,
    url: plate("saree-traditional"),
    thumbnail: plate("saree-traditional"),
    title: "Bomkai Pato — Pallu close view",
    alt: "Bomkai Pato traditional pallu detailing",
    caption: "Captured in the styling suite during bridal draping.",
    tags: ["seed", "employee", "styling", "pallu"],
    scope: MEDIA_SCOPES.PRODUCT,
    productId: "pf-002",
    role: PRODUCT_MEDIA_ROLES.DETAIL,
    sortOrder: 0,
    status: MEDIA_STATUS.PENDING_REVIEW,
    uploadedBy: "Ishita Kapoor",
    uploadedByEmployeeId: "PF-STY-00012",
    uploadedByType: "EMPLOYEE",
    reviewStatus: "PENDING",
    source: "Employee upload",
    createdAt: "2026-08-11T11:20:00.000Z",
    updatedAt: "2026-08-11T11:20:00.000Z",
  },
  {
    id: "pm-seed-302",
    type: MEDIA_TYPES.IMAGE,
    url: plate("fabric-embroidered"),
    thumbnail: plate("fabric-embroidered"),
    title: "Bomkai Pato — Border zari texture",
    alt: "Bomkai Pato zari border craft study",
    caption: "Macro weave texture under warm studio light.",
    tags: ["seed", "employee", "styling", "texture"],
    scope: MEDIA_SCOPES.PRODUCT,
    productId: "pf-002",
    role: PRODUCT_MEDIA_ROLES.CLOSEUP,
    sortOrder: 1,
    status: MEDIA_STATUS.PENDING_REVIEW,
    uploadedBy: "Ishita Kapoor",
    uploadedByEmployeeId: "PF-STY-00012",
    uploadedByType: "EMPLOYEE",
    reviewStatus: "PENDING",
    source: "Employee upload",
    createdAt: "2026-08-11T11:25:00.000Z",
    updatedAt: "2026-08-11T11:25:00.000Z",
  },
  {
    id: "pm-seed-303",
    type: MEDIA_TYPES.IMAGE,
    url: plate("saree-printed"),
    thumbnail: plate("saree-printed"),
    title: "Khandua Pato — Floor drape view",
    alt: "Khandua Pato drape test",
    caption: "Drape test shot on mannequin.",
    tags: ["seed", "employee", "styling"],
    scope: MEDIA_SCOPES.PRODUCT,
    productId: "pf-004",
    role: PRODUCT_MEDIA_ROLES.LIFESTYLE,
    sortOrder: 0,
    status: MEDIA_STATUS.REJECTED,
    uploadedBy: "Ishita Kapoor",
    uploadedByEmployeeId: "PF-STY-00012",
    uploadedByType: "EMPLOYEE",
    reviewStatus: "REJECTED",
    reviewedBy: "Vikram Iyer",
    reviewedAt: "2026-08-11T14:30:00.000Z",
    rejectionReason: "Lighting does not meet atelier lookbook standards. Please capture in studio lighting.",
    source: "Employee upload",
    createdAt: "2026-08-10T15:10:00.000Z",
    updatedAt: "2026-08-11T14:30:00.000Z",
  },
];

export const SEED_MEDIA = [
  ...productMedia,
  ...marketingMedia,
  ...unassignedMedia,
  ...employeeSubmissions,
];

export default SEED_MEDIA;
