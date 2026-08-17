/**
 * PRATIKSHYA FASHON — Rendered image integrity audit (Phase 3F).
 *
 * For every published product, resolves the EXACT image the customer-facing
 * ProductCard renders (through the same canonical getProductCardMedia the
 * card uses) and verifies:
 *
 *   source productId === rendered productId
 *
 * unless the source is explicitly classified as:
 *
 *   MARKETING        house/hero artwork or an external demo plate used as
 *                    the documented authored fallback tier
 *   SAFE_PLACEHOLDER a manifest plate with no product-photography identity
 *
 * Also verifies category consistency: a rendered canonical photograph must
 * belong to the media family of the product's category (men's wear never
 * renders bangles, innerwear never renders sarees, …).
 *
 * Expected: 0 cross-product renders, 0 category mismatches.
 *
 * Usage:
 *   npm run audit:rendered-image-integrity
 */

import { setupMigratedState } from "../tests/helpers/workflowTestState.js";

setupMigratedState();

const { default: mediaRepository } = await import("../src/services/media/mediaRepository.js");
const { getLiveStorefrontProducts } = await import("../src/data/products/index.js");
const { getProductCardMedia } = await import("../src/services/media/productMediaSet.js");
const { checkCategoryMediaSafety, mediaFamilyOf, isMarketingFileName } = await import(
  "../src/services/media/mediaCategorySafety.js"
);

const line = (text = "") => console.log(text);
const pad = (value, width) => String(value ?? "—").padEnd(width);

const failures = [];
const fail = (message) => failures.push(message);

const fileOf = (source) =>
  String(
    source?.fileName ||
      source?.currentFilename ||
      (source?.src || source?.url || "").split("?")[0].split("/").pop() ||
      source?.id ||
      ""
  );

/* Register media indexed by file name — the ownership source of truth. */
const mediaByFile = new Map();
mediaRepository.getAll().forEach((media) => {
  const file = fileOf(media).toLowerCase();
  if (!file) return;
  if (!mediaByFile.has(file)) mediaByFile.set(file, []);
  mediaByFile.get(file).push(media);
});

/**
 * Classify one rendered source.
 *   CANONICAL        register-owned product photography
 *   MARKETING        house/hero plate or an external demo/campaign image
 *   SAFE_PLACEHOLDER authored manifest plate without product identity
 */
const classify = (source, product) => {
  const file = fileOf(source).toLowerCase();
  const src = String(source?.src || source?.url || "");

  if (isMarketingFileName(file) || /pexels|unsplash/i.test(src)) {
    return { kind: "MARKETING", ownerProductId: null, mediaId: null };
  }

  const records = mediaByFile.get(file) ?? [];
  const owned = records.find((media) => media.productId);
  if (owned) {
    return { kind: "CANONICAL", ownerProductId: String(owned.productId), mediaId: owned.id };
  }
  if (src.includes("/library/") && mediaFamilyOf(file)) {
    /* A family-named library photograph without an owner — canonical
       photography that must still not leak across products. */
    return { kind: "CANONICAL", ownerProductId: null, mediaId: records[0]?.id ?? null };
  }
  return { kind: "SAFE_PLACEHOLDER", ownerProductId: null, mediaId: null };
};

line("# RENDERED IMAGE INTEGRITY AUDIT — Phase 3F");
line();
line(
  `${pad("ID", 10)}${pad("CATEGORY", 17)}${pad("PRIMARY", 42)}${pad("SOURCE", 18)}${pad("MEDIA ID", 22)}OWNER`
);

const products = getLiveStorefrontProducts();
let crossProduct = 0;
let categoryMismatch = 0;
const counts = { CANONICAL: 0, MARKETING: 0, SAFE_PLACEHOLDER: 0 };

products.forEach((product) => {
  const card = getProductCardMedia(product);
  const surfaces = [
    { label: "primary", source: card.image },
    ...(card.hoverImage ? [{ label: "hover", source: card.hoverImage }] : []),
    ...(card.mediaSet?.gallery ?? []).map((item, index) => ({
      label: `gallery[${index}]`,
      source: item,
    })),
  ];

  surfaces.forEach(({ label, source }) => {
    if (!source) return;
    const verdict = classify(source, product);
    if (label === "primary") counts[verdict.kind] += 1;

    if (verdict.kind === "CANONICAL") {
      /* Ownership: the rendered canonical photograph must belong to THIS product. */
      if (verdict.ownerProductId && verdict.ownerProductId !== String(product.id)) {
        crossProduct += 1;
        fail(
          `${product.id} renders ${fileOf(source)} on ${label} — owned by ${verdict.ownerProductId}`
        );
      }
      /* Category: the photograph's family must allow this category. */
      const safety = checkCategoryMediaSafety(fileOf(source), product.category);
      if (!safety.ok) {
        categoryMismatch += 1;
        fail(`${product.id} (${product.category}) ${label}: ${safety.reason}`);
      }
    }
  });

  const primaryVerdict = classify(card.image, product);
  line(
    `${pad(product.id, 10)}${pad(product.category, 17)}${pad(fileOf(card.image).slice(0, 40), 42)}${pad(
      primaryVerdict.kind,
      18
    )}${pad(primaryVerdict.mediaId ?? "—", 22)}${primaryVerdict.ownerProductId ?? "—"}`
  );
});

line();
line("# SOURCE DISTRIBUTION (primary)");
line(`  CANONICAL         ${counts.CANONICAL}`);
line(`  MARKETING         ${counts.MARKETING}  (authored fallback tier — explicit, shared by design)`);
line(`  SAFE_PLACEHOLDER  ${counts.SAFE_PLACEHOLDER}`);
line();
line("# VIOLATIONS");
line(`  Cross-product renders:  ${crossProduct}`);
line(`  Category mismatches:    ${categoryMismatch}`);
line();
failures.forEach((message) => line(`  FAIL  ${message}`));

if (failures.length) {
  line();
  line("RESULT: FAIL — a product renders imagery it does not own.");
  process.exit(1);
}
line(
  `PASS: ${products.length} published products render only their own canonical media, explicit marketing fallback or a safe placeholder — 0 cross-product renders, 0 category mismatches.`
);
