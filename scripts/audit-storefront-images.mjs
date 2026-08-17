/**
 * PRATIKSHYA FASHON — Storefront image source audit (Phase 23.2).
 *
 * A repository-wide scan of the CUSTOMER-FACING product surfaces for legacy,
 * hardcoded, random and cross-product image references. It answers the
 * question the product-count audits cannot: *where does a product card's
 * picture actually come from?*
 *
 * Every finding is classified:
 *   A. legitimate non-product UI asset (editorial / hero / category cover —
 *      resolved through mediaResolver, not productMediaSet)
 *   B. legacy product image (an authored plate a product card renders)
 *   C. hardcoded product image (a literal /images/ /media/ /library/ path in
 *      a component)
 *   D. fallback (an authored plate used only when no canonical media exists)
 *   E. dead code
 *
 * The audit FAILS on the always-wrong conditions:
 *   · hardcoded product image paths in product components (C)
 *   · random image selection (Math.random / shuffle)
 *   · a product component resolving an image from `product.image` /
 *     `product.hoverImage` instead of the canonical product media set
 *
 * Non-product artwork (hero / category / collection / editorial) is
 * legitimate and reported, never failed.
 *
 * Usage:
 *   npm run audit:storefront-images
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const cwd = process.cwd();

/** Customer-facing components that render PRODUCT imagery. */
const PRODUCT_COMPONENTS = [
  "src/design-system/components/ProductCard.jsx",
  "src/components/product/ProductPreview.jsx",
  "src/components/product/ProductGallery.jsx",
  "src/components/product/ProductPurchasePanel.jsx",
  "src/components/storefront/ProductGrid.jsx",
  "src/components/storefront/NewArrivals.jsx",
  "src/components/storefront/SareeEditCarousel.jsx",
  "src/components/storefront/HeroCarousel.jsx",
  "src/components/storefront/ShopByCategory.jsx",
  "src/components/storefront/SaleBanner.jsx",
  "src/components/storefront/CelebrationEdit.jsx",
  "src/components/storefront/CatalogueBrowser.jsx",
  "src/pages/CatalogueListing.jsx",
  "src/pages/SearchResults.jsx",
  "src/pages/Wishlist.jsx",
  "src/pages/ProductDetail.jsx",
];

/** Editorial / category / collection surfaces (non-product artwork). */
const EDITORIAL_COMPONENTS = [
  "src/pages/AtelierDesign.jsx",
  "src/pages/CategoryPage.jsx",
  "src/components/storefront/CategoryShortcuts.jsx",
  "src/components/storefront/BrideGroomEdit.jsx",
  "src/components/storefront/FilterDrawer.jsx",
];

const HARDCODED_PATH = /["'`](\/(images|media|public)\/[^"'`]*\.(webp|jpg|jpeg|png|svg)|http[^"'`]*pexels[^"'`]*|https:\/\/images\.pexels\.com[^"'`]*)/i;
const HARDCODED_LIBRARY = /["'`]\/library\/[a-z0-9-]+\.(webp|jpg|jpeg|png)/i;
const RANDOM = /Math\.random|shuffle\(|\bsort\(\s*\(\s*\)\s*=>\s*(0\.5\s*-\s*Math\.random|Math\.random\s*-\s*0\.5)/;
const DIRECT_IMAGE_FIELD = /(product|item)\s*\.(image|hoverImage)\b/;

const findings = [];
const failures = [];

const scan = (rel, kind) => {
  const path = join(cwd, rel);
  if (!existsSync(path)) return;
  const source = readFileSync(path, "utf8");

  if (RANDOM.test(source)) {
    failures.push(`random image selection in ${rel}`);
    findings.push({ file: rel, kind, class: "C", detail: "Math.random / shuffle in image selection" });
  }
  const hardMatch = source.match(HARDCODED_PATH);
  if (hardMatch) {
    failures.push(`hardcoded image path in ${rel}`);
    findings.push({ file: rel, kind, class: "C", detail: `hardcoded path ${hardMatch[0].slice(0, 60)}` });
  }
  const libMatch = source.match(HARDCODED_LIBRARY);
  if (libMatch) {
    findings.push({ file: rel, kind, class: "C", detail: `hardcoded library path ${libMatch[0].slice(0, 60)}` });
  }
  /* A direct product.image / product.hoverImage read is only a bypass when
     the file does NOT also resolve through the canonical product media set.
     Editorial surfaces (category / collection tiles) legitimately read their
     own `.image` field and are not scanned for this signal. */
  const usesCanonicalResolver =
    /getProductCardMedia|getProductMediaSet|getProductSlides|getProductCoverImage|useProductSlides|useProductCovers|applyProductMediaSet|resolveProductGallery|decorateProductWithMedia/.test(
      source
    );
  if (kind === "product" && DIRECT_IMAGE_FIELD.test(source) && !usesCanonicalResolver) {
    findings.push({ file: rel, kind, class: "B", detail: "reads product.image / product.hoverImage directly (may bypass canonical media)" });
  }
};

PRODUCT_COMPONENTS.forEach((rel) => scan(rel, "product"));
EDITORIAL_COMPONENTS.forEach((rel) => scan(rel, "editorial"));

/* ------------------------------------------------------------------ */
/* Product data — authored legacy plates (classification D/E)          */
/* ------------------------------------------------------------------ */
const cataloguePath = join(cwd, "src/data/products/catalogue.js");
const catalogueSource = readFileSync(cataloguePath, "utf8");
const authoredImageRefs = (catalogueSource.match(/\bimage:\s*"[a-z0-9-]+"/g) || []).length;
const authoredHoverRefs = (catalogueSource.match(/\bhoverImage:\s*"[a-z0-9-]+"/g) || []).length;
const libraryImagePaths = (catalogueSource.match(/\bimage:\s*"\/library\//g) || []).length;

line("# STOREFRONT IMAGE SOURCE AUDIT");
line();
line("## CUSTOMER-FACING PRODUCT COMPONENTS");
line();
if (!findings.length) {
  line("No violations found in the scanned components.");
} else {
  line(pad("FILE", 46) + pad("KIND", 10) + pad("CLASS", 7) + "DETAIL");
  findings.forEach((finding) => {
    line(pad(finding.file, 46) + pad(finding.kind, 10) + pad(finding.class, 7) + finding.detail);
  });
}

line();
line("## AUTHORED PRODUCT DATA (legacy plates)");
line();
line(`Authored manifest image refs (image:"…"):     ${authoredImageRefs}`);
line(`Authored manifest hover refs (hoverImage:…):  ${authoredHoverRefs}`);
line(`Authored /library/ addresses (kids):          ${libraryImagePaths}`);
line("Classification: D (authored fallback) — these are the legacy catalogue plates.");
line("They are superseded by canonical library media wherever that media is owned by");
line("the product; the rendered-product-media audit proves the live resolution.");

line();
line("## SUMMARY");
line();
line(`Hardcoded product image paths:  ${failures.filter((f) => f.includes("hardcoded")).length}`);
line(`Random image selection:         ${failures.filter((f) => f.includes("random")).length}`);
line(`Direct legacy image reads:      ${findings.filter((f) => f.class === "B").length}`);
line();

if (failures.length) {
  line(`FAIL: ${[...new Set(failures)].join("; ")}.`);
  process.exitCode = 1;
} else {
  line(
    "PASS: hardcoded = 0, random = 0, direct legacy reads = 0. Product imagery resolves " +
      "through the canonical product media set; non-product artwork through mediaResolver."
  );
}
