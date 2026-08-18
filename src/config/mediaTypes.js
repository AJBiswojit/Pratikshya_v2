/**
 * PRATIKSHYA FASHON — Media vocabulary.
 *
 * The single source of truth for every media constant the house uses:
 * what a piece of media *is* (image or video), what it is *for* (a product
 * role or a marketing placement), whether it is *published*, and what a
 * demo upload is allowed to be.
 *
 * Pages, services and forms import from here. No component invents a media
 * type, role, placement or status string of its own.
 *
 * Media itself is stored through `services/media/mediaRepository`. This file
 * carries vocabulary only — no state, no storage, no React.
 */

/* ------------------------------------------------------------------ */
/* Type                                                                */
/* ------------------------------------------------------------------ */

/** A video is never treated as an image. Both are first-class media. */
export const MEDIA_TYPES = {
  IMAGE: "IMAGE",
  VIDEO: "VIDEO",
};

export const isVideo = (media) => media?.type === MEDIA_TYPES.VIDEO;

/* ------------------------------------------------------------------ */
/* Ownership                                                           */
/* ------------------------------------------------------------------ */

/**
 * Where a record belongs. Media may sit unassigned in the library until an
 * operator decides what it is for — that is a supported state, not an error.
 */
export const MEDIA_SCOPES = {
  PRODUCT: "PRODUCT",
  MARKETING: "MARKETING",
  UNASSIGNED: "UNASSIGNED",
};

export const MEDIA_SCOPE_LABELS = {
  [MEDIA_SCOPES.PRODUCT]: "Product",
  [MEDIA_SCOPES.MARKETING]: "Marketing",
  [MEDIA_SCOPES.UNASSIGNED]: "Unassigned",
};

/* ------------------------------------------------------------------ */
/* Status                                                              */
/* ------------------------------------------------------------------ */

/** Only ACTIVE media is ever shown to a customer. */
export const MEDIA_STATUS = {
  DRAFT: "DRAFT",
  PENDING_REVIEW: "PENDING_REVIEW",
  ACTIVE: "ACTIVE",
  REJECTED: "REJECTED",
  ARCHIVED: "ARCHIVED",
};

export const MEDIA_STATUS_OPTIONS = [
  { id: MEDIA_STATUS.DRAFT, label: "Draft", tone: "quiet" },
  { id: MEDIA_STATUS.PENDING_REVIEW, label: "Pending Review", tone: "brass" },
  { id: MEDIA_STATUS.ACTIVE, label: "Active", tone: "ink" },
  { id: MEDIA_STATUS.REJECTED, label: "Rejected", tone: "alert" },
  { id: MEDIA_STATUS.ARCHIVED, label: "Archived", tone: "muted" },
];

export const REJECTION_REASONS = [
  "Image quality or lighting is not suitable.",
  "Wrong product or colorway selected.",
  "File format or aspect ratio does not meet house standards.",
  "Please upload higher resolution or clearer angle.",
  "Duplicate media asset.",
];

export const getMediaStatusLabel = (status) =>
  MEDIA_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? "Draft";

export const getMediaStatusTone = (status) =>
  MEDIA_STATUS_OPTIONS.find((option) => option.id === status)?.tone ?? "quiet";

/* ------------------------------------------------------------------ */
/* Product media roles                                                 */
/* ------------------------------------------------------------------ */

/**
 * A role says what a piece of product media does on the product page.
 * Image roles and video roles live in one vocabulary so a single `role`
 * field describes both, but each role declares the media type it accepts.
 */
export const PRODUCT_MEDIA_ROLES = {
  COVER: "COVER",
  GALLERY: "GALLERY",
  DETAIL: "DETAIL",
  LIFESTYLE: "LIFESTYLE",
  MODEL: "MODEL",
  CLOSEUP: "CLOSEUP",
  PRODUCT_VIDEO: "PRODUCT_VIDEO",
  SHOWCASE: "SHOWCASE",
  DETAIL_VIDEO: "DETAIL_VIDEO",
  LIFESTYLE_VIDEO: "LIFESTYLE_VIDEO",
};

export const PRODUCT_ROLE_OPTIONS = [
  {
    id: PRODUCT_MEDIA_ROLES.COVER,
    label: "Cover",
    type: MEDIA_TYPES.IMAGE,
    description: "The single image every listing, card and search result uses.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.GALLERY,
    label: "Gallery",
    type: MEDIA_TYPES.IMAGE,
    description: "Additional views shown in the product gallery.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.DETAIL,
    label: "Detail",
    type: MEDIA_TYPES.IMAGE,
    description: "Weave, border, embroidery and finishing detail.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.LIFESTYLE,
    label: "Lifestyle",
    type: MEDIA_TYPES.IMAGE,
    description: "The piece in context — styled, worn, photographed on location.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.MODEL,
    label: "On model",
    type: MEDIA_TYPES.IMAGE,
    description: "Full-length drape and fit reference.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.CLOSEUP,
    label: "Close-up",
    type: MEDIA_TYPES.IMAGE,
    description: "Macro texture, thread and material study.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.PRODUCT_VIDEO,
    label: "Product video",
    type: MEDIA_TYPES.VIDEO,
    description: "The main moving view of the piece.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.SHOWCASE,
    label: "Showcase video",
    type: MEDIA_TYPES.VIDEO,
    description: "A turn-around or drape showcase.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.DETAIL_VIDEO,
    label: "Detail video",
    type: MEDIA_TYPES.VIDEO,
    description: "Close moving study of the craft.",
  },
  {
    id: PRODUCT_MEDIA_ROLES.LIFESTYLE_VIDEO,
    label: "Lifestyle video",
    type: MEDIA_TYPES.VIDEO,
    description: "The piece in motion, in context.",
  },
];

export const PRODUCT_IMAGE_ROLES = PRODUCT_ROLE_OPTIONS.filter(
  (role) => role.type === MEDIA_TYPES.IMAGE
);

export const PRODUCT_VIDEO_ROLES = PRODUCT_ROLE_OPTIONS.filter(
  (role) => role.type === MEDIA_TYPES.VIDEO
);

export const rolesForType = (type) =>
  type === MEDIA_TYPES.VIDEO ? PRODUCT_VIDEO_ROLES : PRODUCT_IMAGE_ROLES;

export const getProductRole = (roleId) =>
  PRODUCT_ROLE_OPTIONS.find((role) => role.id === roleId) ?? null;

export const getProductRoleLabel = (roleId) =>
  getProductRole(roleId)?.label ?? "Unassigned role";

/** The role a newly attached piece of media takes when none is chosen. */
export const defaultRoleForType = (type) =>
  type === MEDIA_TYPES.VIDEO
    ? PRODUCT_MEDIA_ROLES.PRODUCT_VIDEO
    : PRODUCT_MEDIA_ROLES.GALLERY;

/* ------------------------------------------------------------------ */
/* Usage roles (Phase 21.4 — distribution, not product-page order)     */
/* ------------------------------------------------------------------ */

/**
 * Where an asset may appear across the house. Orthogonal to
 * `PRODUCT_MEDIA_ROLES`: a plate can be a product COVER and also a
 * CATEGORY_COVER / AI_SHOPPING image. The resolver reads these; the
 * product gallery still reads `role`.
 */
export const USAGE_ROLES = {
  HERO: "HERO",
  CATEGORY_COVER: "CATEGORY_COVER",
  PRODUCT_PRIMARY: "PRODUCT_PRIMARY",
  PRODUCT_GALLERY: "PRODUCT_GALLERY",
  PRODUCT_THUMBNAIL: "PRODUCT_THUMBNAIL",
  EDITORIAL: "EDITORIAL",
  BANNER: "BANNER",
  NEW_ARRIVAL: "NEW_ARRIVAL",
  SALE: "SALE",
  LOOKBOOK: "LOOKBOOK",
  COLLECTION_COVER: "COLLECTION_COVER",
  AI_SHOPPING: "AI_SHOPPING",
  AI_MIRROR: "AI_MIRROR",
};

export const USAGE_ROLE_OPTIONS = [
  { id: USAGE_ROLES.HERO, label: "Hero" },
  { id: USAGE_ROLES.CATEGORY_COVER, label: "Category cover" },
  { id: USAGE_ROLES.PRODUCT_PRIMARY, label: "Product primary" },
  { id: USAGE_ROLES.PRODUCT_GALLERY, label: "Product gallery" },
  { id: USAGE_ROLES.PRODUCT_THUMBNAIL, label: "Product thumbnail" },
  { id: USAGE_ROLES.EDITORIAL, label: "Editorial" },
  { id: USAGE_ROLES.BANNER, label: "Banner" },
  { id: USAGE_ROLES.NEW_ARRIVAL, label: "New arrival" },
  { id: USAGE_ROLES.SALE, label: "Sale" },
  { id: USAGE_ROLES.LOOKBOOK, label: "Lookbook" },
  { id: USAGE_ROLES.COLLECTION_COVER, label: "Collection cover" },
  { id: USAGE_ROLES.AI_SHOPPING, label: "AI Shopping" },
  { id: USAGE_ROLES.AI_MIRROR, label: "AI Mirror" },
];

/* ------------------------------------------------------------------ */
/* Managed-media mapping and duplicate vocabulary                       */
/* ------------------------------------------------------------------ */

export const MAPPING_STATUS = {
  MAPPED: "MAPPED",
  UNMAPPED: "UNMAPPED",
  NEEDS_REVIEW: "NEEDS_REVIEW",
};

export const DUPLICATE_STATUS = {
  UNIQUE: "UNIQUE",
  DUPLICATE: "DUPLICATE",
  POSSIBLE_DUPLICATE: "POSSIBLE_DUPLICATE",
};

export const isValidUsageRole = (role) => Object.values(USAGE_ROLES).includes(role);

/* ------------------------------------------------------------------ */
/* Marketing placements                                                */
/* ------------------------------------------------------------------ */

/**
 * A placement is a real surface of the storefront.
 *
 * `live: true` means the storefront reads this placement today — an ACTIVE
 * record assigned to it replaces the seeded artwork on that surface.
 * `live: false` placements are catalogued sections of the house that do not
 * yet read from the media repository; the Marketing page says so plainly
 * rather than implying an effect that does not exist.
 *
 * Every placement also declares what kind of content it holds:
 *
 *   · PRODUCT placements display pieces from the canonical product catalogue.
 *     They are curated through the Product Catalog Selector, which stores
 *     product IDs only — the catalogue remains the single source of truth for
 *     the product's name, taxonomy and media. `recommendedDepartment` /
 *     `recommendedCategory` / `recommendedSubcategory` describe the taxonomy
 *     the section is built around so the selector can open pre-arranged, but
 *     they never lock the catalogue down. A PRODUCT placement whose documented
 *     surface is a category listing page (`listingSurface: true`) renders its
 *     curated rail on that taxonomy's listing route; the rail matcher reads
 *     exactly these recommended taxonomy fields, never a hardcoded route.
 *     `houseSelectionFallback: true` marks the seams that keep a curated,
 *     data-driven house edit when nothing is assigned — every other product
 *     seam simply stays hidden until the desk curates it (no catalogue
 *     fallback, no random products).
 *
 *   · GENERIC placements display house artwork (hero plates, editorial
 *     storytelling, promotion artwork). They keep the existing media-upload
 *     workflow. The Festive campaign band is a PRODUCT placement: its image
 *     is the published product an admin assigns, exactly like the Saree and
 *     Groom edits.
 *
 * Every placement marked `live: true` is read by a real storefront seam —
 * product placements through the marketing placement register, generic
 * placements through the marketing media register. Nothing is advertised as
 * live that the storefront does not actually consume.
 */
export const PLACEMENT_MODES = {
  PRODUCT: "PRODUCT",
  GENERIC: "GENERIC",
};

export const isProductPlacement = (id) =>
  getPlacement(id)?.mode === PLACEMENT_MODES.PRODUCT;
export const MARKETING_PLACEMENTS = {
  HOME_HERO: "HOME_HERO",
  WOMEN_SECTION: "WOMEN_SECTION",
  SAREE_SECTION: "SAREE_SECTION",
  LEHENGA_SECTION: "LEHENGA_SECTION",
  BRIDAL_SECTION: "BRIDAL_SECTION",
  GROOM_SECTION: "GROOM_SECTION",
  KIDS_SECTION: "KIDS_SECTION",
  BANGLES_SECTION: "BANGLES_SECTION",
  JEWELLERY_SECTION: "JEWELLERY_SECTION",
  FESTIVE_SECTION: "FESTIVE_SECTION",
  NEW_ARRIVALS: "NEW_ARRIVALS",
  EDITORIAL: "EDITORIAL",
  PROMOTION: "PROMOTION",
};

export const MARKETING_PLACEMENT_OPTIONS = [
  {
    id: MARKETING_PLACEMENTS.HOME_HERO,
    label: "Home hero",
    surface: "Landing page — opening hero plate",
    live: true,
    mode: PLACEMENT_MODES.GENERIC,
  },
  {
    id: MARKETING_PLACEMENTS.SAREE_SECTION,
    label: "Saree section",
    surface: "Landing page — Saree collection panel",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "women",
    recommendedCategory: "sarees",
    houseSelectionFallback: true,
  },
  {
    id: MARKETING_PLACEMENTS.LEHENGA_SECTION,
    label: "Lehenga section",
    surface: "Landing page — Lehenga collection panel",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "women",
    recommendedCategory: "lehengas",
  },
  {
    id: MARKETING_PLACEMENTS.FESTIVE_SECTION,
    label: "Festive section",
    surface: "Landing page — festive campaign band",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "women",
    recommendedCategory: "lehengas",
  },
  {
    id: MARKETING_PLACEMENTS.WOMEN_SECTION,
    label: "Women's section",
    surface: "Landing page — women's edit tiles",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "women",
  },
  {
    id: MARKETING_PLACEMENTS.BRIDAL_SECTION,
    label: "Bridal section",
    surface: "Bridal couture category",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "bridal",
    houseSelectionFallback: true,
  },
  {
    id: MARKETING_PLACEMENTS.GROOM_SECTION,
    label: "Groom section",
    surface: "Menswear & groom category",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "men",
    houseSelectionFallback: true,
  },
  {
    id: MARKETING_PLACEMENTS.KIDS_SECTION,
    label: "Kids section",
    surface: "Kids department",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "kids",
  },
  {
    id: MARKETING_PLACEMENTS.BANGLES_SECTION,
    label: "Bangles section",
    surface: "Bangles category",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "bridal",
    recommendedCategory: "finishing-touches",
    recommendedSubcategory: "bangles",
    listingSurface: true,
  },
  {
    id: MARKETING_PLACEMENTS.JEWELLERY_SECTION,
    label: "Jewellery section",
    surface: "Jewellery category",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    recommendedDepartment: "bridal",
    recommendedCategory: "finishing-touches",
    recommendedSubcategory: "jewellery",
    listingSurface: true,
  },
  {
    id: MARKETING_PLACEMENTS.NEW_ARRIVALS,
    label: "New arrivals",
    surface: "New arrivals edit",
    live: true,
    mode: PLACEMENT_MODES.PRODUCT,
    houseSelectionFallback: true,
  },
  {
    id: MARKETING_PLACEMENTS.EDITORIAL,
    label: "Editorial",
    surface: "Editorial storytelling plates",
    live: true,
    mode: PLACEMENT_MODES.GENERIC,
  },
  {
    id: MARKETING_PLACEMENTS.PROMOTION,
    label: "Promotion",
    surface: "Seasonal promotion artwork",
    live: true,
    mode: PLACEMENT_MODES.GENERIC,
  },
];

export const getPlacement = (id) =>
  MARKETING_PLACEMENT_OPTIONS.find((item) => item.id === id) ?? null;

export const getPlacementLabel = (id) => getPlacement(id)?.label ?? "Unassigned placement";

export const isLivePlacement = (id) => Boolean(getPlacement(id)?.live);

/* ------------------------------------------------------------------ */
/* Demo upload rules                                                   */
/* ------------------------------------------------------------------ */

/**
 * DEMO MEDIA UPLOAD.
 *
 * Files chosen in the Admin Portal are previewed in the browser only. There
 * is no cloud storage, no CDN and no server in this phase. The limits below
 * are the ones a real upload service would enforce, applied here so the
 * queue behaves honestly.
 */
export const UPLOAD_RULES = {
  [MEDIA_TYPES.IMAGE]: {
    extensions: [".jpg", ".jpeg", ".png", ".webp", ".avif"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    maxBytes: 10 * 1024 * 1024,
    maxLabel: "10 MB",
  },
  [MEDIA_TYPES.VIDEO]: {
    extensions: [".mp4", ".webm"],
    mimeTypes: ["video/mp4", "video/webm"],
    maxBytes: 100 * 1024 * 1024,
    maxLabel: "100 MB",
  },
};

/** The `accept` attribute for the demo file input. */
export const UPLOAD_ACCEPT = [
  ...UPLOAD_RULES[MEDIA_TYPES.IMAGE].extensions,
  ...UPLOAD_RULES[MEDIA_TYPES.IMAGE].mimeTypes,
  ...UPLOAD_RULES[MEDIA_TYPES.VIDEO].extensions,
  ...UPLOAD_RULES[MEDIA_TYPES.VIDEO].mimeTypes,
].join(",");

/** True when the file's extension or MIME type is a house-supported image/video. */
export const isAllowedUploadFormat = (file, type) => {
  const rules = UPLOAD_RULES[type] ?? UPLOAD_RULES[MEDIA_TYPES.IMAGE];
  const name = String(file?.name ?? "");
  const dot = name.lastIndexOf(".");
  const extension = dot < 0 ? "" : name.slice(dot).toLowerCase();
  const mime = String(file?.type ?? "").toLowerCase();
  const extensionOk = Boolean(extension) && rules.extensions.includes(extension);
  const mimeOk = Boolean(mime) && rules.mimeTypes.includes(mime);
  return extensionOk || mimeOk;
};

export const UPLOAD_NOTICE = "DEMO MEDIA UPLOAD";

export const UPLOAD_NOTICE_COPY =
  "Files are previewed in this browser session only. Nothing is uploaded to a server or cloud storage, and preview URLs are never saved as production media.";

/** Bytes → a short human figure for the upload queue. */
export const formatFileSize = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value <= 0) return "—";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default {
  MEDIA_TYPES,
  MEDIA_SCOPES,
  MEDIA_STATUS,
  PRODUCT_MEDIA_ROLES,
  PRODUCT_ROLE_OPTIONS,
  MARKETING_PLACEMENTS,
  MARKETING_PLACEMENT_OPTIONS,
  UPLOAD_RULES,
  UPLOAD_ACCEPT,
  isAllowedUploadFormat,
};
