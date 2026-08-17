/**
 * PRATIKSHYA FASHON — Product image integrity audit (Phase 3F).
 *
 * ONE image ↔ ONE product for canonical product photography, and no
 * hardcoded / random / cross-family product imagery anywhere in the
 * customer-facing codebase.
 *
 * Static checks (source scan):
 *   · hardcoded product image paths in product components
 *   · direct product.image / product.images reads bypassing the canonical
 *     product media set
 *   · Math.random / shuffled image selection
 *
 * Register checks (canonical data):
 *   · duplicate canonical primary media (two products, one photograph)
 *   · cross-product media ownership in rendered media sets
 *   · category ↔ media-family mismatches (men's wear owning bangles, …)
 *   · marketing media carrying PRODUCT scope
 *   · product-scoped media on marketing placements
 *   · one physical file owned by two Product IDs
 *   · view files (front/back/side) of a group split across products
 *
 * Marketing usage is legitimate only in the explicit MARKETING scope /
 * house-plate fallback tier — it is reported, never silently accepted as
 * canonical product photography.
 *
 * Usage:
 *   npm run audit:product-image-integrity
 */

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const { default: mediaRepository } = await import("../src/services/media/mediaRepository.js");
const { catalogRepository } = await import("../src/services/catalogRepository.js");
const { getLiveStorefrontProducts } = await import("../src/data/products/index.js");
const { getProductCardMedia } = await import("../src/services/media/productMediaSet.js");
const { checkCategoryMediaSafety, mediaFamilyOf, isMarketingFileName } = await import(
  "../src/services/media/mediaCategorySafety.js"
);
const { parseMediaFilename } = await import("../src/services/media/mediaNaming.js");
const { MEDIA_SCOPES } = await import("../src/config/mediaTypes.js");

const ROOT = process.cwd();
const line = (text = "") => console.log(text);

const failures = [];
const warnings = [];
const fail = (message) => failures.push(message);
const warn = (message) => warnings.push(message);

const fileNameOf = (media) =>
  String(
    media?.currentFilename ||
      media?.fileName ||
      (media?.src || media?.url || "").split("?")[0].split("/").pop() ||
      media?.id ||
      ""
  );

/* ------------------------------------------------------------------ */
/* 1. STATIC SOURCE SCAN — customer-facing product surfaces            */
/* ------------------------------------------------------------------ */

line("# PRODUCT IMAGE INTEGRITY AUDIT — Phase 3F");
line();
line("## 1. Static scan — hardcoded / random / bypassing product imagery");

/** Customer-facing product surfaces. The admin/employee portals are
 *  operational tooling, not the storefront, and are audited elsewhere. */
const PRODUCT_SURFACES = [
  "src/design-system/components/ProductCard.jsx",
  "src/components/product/ProductPreview.jsx",
  "src/components/product/ProductGallery.jsx",
  "src/components/product/ProductPurchasePanel.jsx",
  "src/components/product/ProductRecommendations.jsx",
  "src/components/storefront/ProductGrid.jsx",
  "src/components/storefront/NewArrivals.jsx",
  "src/components/storefront/SareeEditCarousel.jsx",
  "src/components/storefront/CatalogueBrowser.jsx",
  "src/components/explore/ExploreProductGrid.jsx",
  "src/components/aiAssistants/AiProductCard.jsx",
  "src/pages/CatalogueListing.jsx",
  "src/pages/CategoryPage.jsx",
  "src/pages/Explore.jsx",
  "src/pages/SearchResults.jsx",
  "src/pages/Shop.jsx",
  "src/pages/Wishlist.jsx",
  "src/pages/ProductDetail.jsx",
];

/** Marketing / editorial placements — allowed to use authored artwork
 *  through the manifest + mediaResolver, never raw file paths. */
const MARKETING_SURFACES = [
  "src/components/storefront/HeroCarousel.jsx",
  "src/components/storefront/SaleBanner.jsx",
  "src/components/storefront/CelebrationEdit.jsx",
  "src/components/storefront/BrideGroomEdit.jsx",
  "src/components/storefront/ShopByCategory.jsx",
  "src/components/storefront/CategoryShortcuts.jsx",
  "src/pages/AtelierDesign.jsx",
];

/** The one legitimate hero-file allowlist: the hero carousel names its own
 *  managed hero plates for its runtime integrity check. */
const MARKETING_FILE_ALLOWLIST = new Map([
  ["src/components/storefront/HeroCarousel.jsx", [/hero00[0-9]\.avif/]],
]);

const HARDCODED_PRODUCT_PATH =
  /["'`](\/(library|images|media)\/[a-z0-9/_-]+\.(webp|jpg|jpeg|png|avif)|https?:[^"'`]*(pexels|unsplash)[^"'`]*)["'`]/i;
const RANDOM_IMAGE =
  /Math\.random|shuffle\s*\(|sort\(\s*\(\s*\)\s*=>\s*(0\.5\s*-\s*Math\.random|Math\.random\s*-\s*0\.5)/;
const DIRECT_IMAGE_READ = /(product|item)\s*\.\s*(image|images|hoverImage)\b/;
const CANONICAL_RESOLVERS =
  /getProductCardMedia|getProductMediaSet|applyProductMediaSet|useProductCovers|useProductSlides|getProductSlides|getProductCoverImage|resolveProductCover|toStorefrontProduct|decorateProductWithMedia|useSareeEditProducts|selectNewArrivalProducts/;

const scanSurface = (relative, kind) => {
  const abs = join(ROOT, relative);
  if (!existsSync(abs)) {
    warn(`${relative} not found — surface list needs updating`);
    return;
  }
  const source = readFileSync(abs, "utf8");

  if (RANDOM_IMAGE.test(source)) {
    fail(`${relative}: random/shuffled image selection`);
  }

  const hard = source.match(HARDCODED_PRODUCT_PATH);
  if (hard) {
    const allowed = (MARKETING_FILE_ALLOWLIST.get(relative) ?? []).some((pattern) =>
      pattern.test(hard[0])
    );
    if (!allowed) fail(`${relative}: hardcoded image path ${hard[0].slice(0, 70)}`);
    else line(`   allowlisted marketing reference in ${relative}: ${hard[0].slice(0, 50)}`);
  }

  if (kind === "product" && DIRECT_IMAGE_READ.test(source) && !CANONICAL_RESOLVERS.test(source)) {
    fail(`${relative}: reads product.image/product.images without the canonical media set`);
  }
};

PRODUCT_SURFACES.forEach((surface) => scanSurface(surface, "product"));
MARKETING_SURFACES.forEach((surface) => scanSurface(surface, "marketing"));

/* Repository-wide: no customer-facing component may hardcode a /library/
   product photograph. */
const walk = (dir, out = []) => {
  readdirSync(dir).forEach((entry) => {
    const abs = join(dir, entry);
    if (statSync(abs).isDirectory()) walk(abs, out);
    else if ([".js", ".jsx"].includes(extname(abs))) out.push(abs);
  });
  return out;
};

const CUSTOMER_DIRS = [
  join(ROOT, "src", "pages"),
  join(ROOT, "src", "components"),
  join(ROOT, "src", "design-system"),
];
const OPERATIONAL_PATTERN = /\/(admin|employee|workforce|analytics|inventory|orders)\//;
const LIBRARY_PRODUCT_FILE = /["'`]\/library\/(women|men|kids|jewellery)-[a-z0-9-]+\.(webp|jpg|jpeg|png)["'`]/i;

CUSTOMER_DIRS.forEach((dir) => {
  walk(dir).forEach((abs) => {
    const relative = abs.replace(`${ROOT}/`, "");
    if (OPERATIONAL_PATTERN.test(`/${relative}`)) return;
    const source = readFileSync(abs, "utf8");
    const match = source.match(LIBRARY_PRODUCT_FILE);
    if (match) fail(`${relative}: hardcoded canonical product file ${match[0]}`);
  });
});

line(`   scanned ${PRODUCT_SURFACES.length} product + ${MARKETING_SURFACES.length} marketing surfaces`);
line();

/* ------------------------------------------------------------------ */
/* 2. REGISTER — one canonical primary per product                     */
/* ------------------------------------------------------------------ */

line("## 2. Register — ONE canonical primary ↔ ONE product");

const allMedia = mediaRepository.getAll();
const productMedia = allMedia.filter(
  (media) => media.scope === MEDIA_SCOPES.PRODUCT && media.productId
);

/* One physical file must never be owned by two different Product IDs.
 *
 * Enforcement is strict for CANONICAL product photography (the ingested
 * family-named library plates). The pre-existing house-seed demo plates
 * (source "House manifest" / seeded employee uploads pointing at shared
 * house artwork or external pexels demos) are the documented legacy
 * fallback tier — they are explicitly classified shared non-product
 * artwork and are reported for review, exactly like audit:product-media
 * reports them, rather than silently accepted OR falsely called canonical
 * duplicates. */
const isLegacySeedPlate = (media) => {
  const file = fileNameOf(media);
  if (isMarketingFileName(file)) return true; // house-* / hero* artwork
  const url = String(media.url || "");
  if (/pexels|unsplash/i.test(url)) return true; // external demo plate
  if ((media.tags || []).includes("house")) return true;
  return !mediaFamilyOf(file) && !media.ingested && /seed/i.test((media.tags || []).join(","));
};

const ownersByFile = new Map();
productMedia.forEach((media) => {
  const file = fileNameOf(media).toLowerCase();
  if (!file) return;
  if (!ownersByFile.has(file)) ownersByFile.set(file, { owners: new Set(), records: [] });
  ownersByFile.get(file).owners.add(String(media.productId));
  ownersByFile.get(file).records.push(media);
});
const multiOwned = [...ownersByFile.entries()].filter(([, entry]) => entry.owners.size > 1);
let canonicalMultiOwned = 0;
multiOwned.forEach(([file, entry]) => {
  const allLegacy = entry.records.every((media) => isLegacySeedPlate(media));
  if (allLegacy) {
    warn(
      `legacy house/demo plate ${file} is registered on multiple products (${[...entry.owners].join(", ")}) — shared authored fallback, review`
    );
  } else {
    canonicalMultiOwned += 1;
    fail(`canonical file ${file} is owned by multiple products: ${[...entry.owners].join(", ")}`);
  }
});
line(
  `   product-scoped media files: ${ownersByFile.size} · multi-owned: ${multiOwned.length} (canonical: ${canonicalMultiOwned})`
);

/* Views of one media group (front/back/side) must stay on one product. */
const ownersByGroup = new Map();
productMedia.forEach((media) => {
  const parsed = parseMediaFilename(fileNameOf(media));
  if (!parsed?.groupKey || parsed.isStandalone) return;
  if (!ownersByGroup.has(parsed.groupKey)) ownersByGroup.set(parsed.groupKey, new Set());
  ownersByGroup.get(parsed.groupKey).add(String(media.productId));
});
const splitGroups = [...ownersByGroup.entries()].filter(([, owners]) => owners.size > 1);
splitGroups.forEach(([groupKey, owners]) =>
  fail(`media group ${groupKey} is split across products: ${[...owners].join(", ")}`)
);
line(`   grouped view families: ${ownersByGroup.size} · split across products: ${splitGroups.length}`);
line();

/* ------------------------------------------------------------------ */
/* 3. REGISTER — category ↔ media-family safety                        */
/* ------------------------------------------------------------------ */

line("## 3. Category safety — no cross-family product ownership");

let familyChecked = 0;
productMedia.forEach((media) => {
  const owner = catalogRepository.find(media.productId);
  if (!owner) {
    fail(`media ${media.id} (${fileNameOf(media)}) is owned by missing product ${media.productId}`);
    return;
  }
  const safety = checkCategoryMediaSafety(fileNameOf(media), owner.category);
  if (mediaFamilyOf(fileNameOf(media))) familyChecked += 1;
  if (!safety.ok) {
    fail(`${owner.id} (${owner.category}) owns ${fileNameOf(media)} — ${safety.reason}`);
  }
});
line(`   family-named product media checked: ${familyChecked} / ${productMedia.length}`);
line();

/* ------------------------------------------------------------------ */
/* 4. MARKETING ↔ PRODUCT scope isolation                              */
/* ------------------------------------------------------------------ */

line("## 4. Marketing ↔ product isolation");

const marketingMedia = allMedia.filter((media) => media.scope === MEDIA_SCOPES.MARKETING);
marketingMedia.forEach((media) => {
  if (media.productId) {
    fail(`marketing media ${media.id} (${fileNameOf(media)}) also carries productId ${media.productId}`);
  }
});
productMedia.forEach((media) => {
  if (media.placement) {
    fail(`product media ${media.id} (${fileNameOf(media)}) also carries marketing placement ${media.placement}`);
  }
});

/* Canonical product families may not sit in the marketing scope with a
   placement — a bangle photograph is product photography. */
marketingMedia.forEach((media) => {
  const family = mediaFamilyOf(fileNameOf(media));
  if (family && !isMarketingFileName(fileNameOf(media))) {
    warn(
      `marketing media ${media.id} (${fileNameOf(media)}) is family ${family.family} product photography — review the placement`
    );
  }
});
line(`   marketing records: ${marketingMedia.length} · product records: ${productMedia.length}`);
line();

/* ------------------------------------------------------------------ */
/* 5. RENDERED PRIMARY — no duplicate canonical primaries              */
/* ------------------------------------------------------------------ */

line("## 5. Rendered primaries — published storefront");

const isCanonicalLibrary = (src) =>
  typeof src === "string" && src.includes("/library/") && !/\/library\/(house-|hero\d)/i.test(src);

const products = getLiveStorefrontProducts();
const canonicalPrimaryOwners = new Map();
products.forEach((product) => {
  const card = getProductCardMedia(product);
  const src = card.image?.src || card.image?.url || "";
  if (!isCanonicalLibrary(src)) return;
  const file = src.split("/").pop().toLowerCase();
  if (!canonicalPrimaryOwners.has(file)) canonicalPrimaryOwners.set(file, []);
  canonicalPrimaryOwners.get(file).push(String(product.id));
});
const duplicatePrimaries = [...canonicalPrimaryOwners.entries()].filter(
  ([, owners]) => new Set(owners).size > 1
);
duplicatePrimaries.forEach(([file, owners]) =>
  fail(`canonical primary ${file} renders for multiple products: ${[...new Set(owners)].join(", ")}`)
);
line(
  `   published products: ${products.length} · canonical primaries: ${canonicalPrimaryOwners.size} · duplicates: ${duplicatePrimaries.length}`
);
line();

/* ------------------------------------------------------------------ */
/* SUMMARY                                                             */
/* ------------------------------------------------------------------ */

line("# SUMMARY");
line();
warnings.forEach((message) => line(`  WARN  ${message}`));
failures.forEach((message) => line(`  FAIL  ${message}`));
line();
line(`Dangerous violations: ${failures.length}`);
line(`Warnings (review, non-blocking): ${warnings.length}`);
line();

if (failures.length) {
  line("RESULT: FAIL — product image integrity is violated.");
  process.exit(1);
}
line(
  "PASS: no hardcoded product imagery, no random selection, one canonical primary per product, category families intact, marketing and product media isolated."
);
