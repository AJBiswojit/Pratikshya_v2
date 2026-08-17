/**
 * Homepage Bride & Groom — taxonomy / product-media / routing contract.
 *
 * These tests exercise the pure selector used by the React section. They do
 * not maintain a parallel fixture or image list: expected rows are resolved
 * from the live catalogue and canonical media register exactly as the page is.
 */

import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  BRIDE_CATEGORY_IDS,
  BRIDE_GROOM_LOOK_COUNT,
  GROOM_CATEGORY_IDS,
  isBrideWeddingProduct,
  isGroomWeddingProduct,
  selectBrideGroomLooks,
} from "../src/services/media/mediaResolver.js";
import { getProductMediaSet } from "../src/services/media/productMediaSet.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import taxonomyRepository from "../src/services/taxonomyRepository.js";
import { resolveCategoryRoute } from "../src/services/taxonomyRouting.js";

const sourceOf = (source) => source?.src || source?.url || source?.thumbnail || "";

const localAssetExists = (source) => {
  const path = sourceOf(source).split("?")[0];
  if (!path.startsWith("/")) return Boolean(path);
  return existsSync(join(process.cwd(), "public", path.replace(/^\//, "")));
};

const atelierSource = () =>
  readFileSync(join(process.cwd(), "src/pages/AtelierDesign.jsx"), "utf8");

const componentSource = () =>
  readFileSync(join(process.cwd(), "src/components/storefront/BrideGroomEdit.jsx"), "utf8");

test("Bride & Groom resolves owned women's wedding media and men's ceremonial media", () => {
  const looks = selectBrideGroomLooks(getLiveStorefrontProducts());

  assert.ok(looks.bride.length > 0, "Bride side must resolve at least one look");
  assert.ok(looks.groom.length > 0, "Groom side must resolve at least one look");
  assert.ok(looks.bride.length <= BRIDE_GROOM_LOOK_COUNT);
  assert.ok(looks.groom.length <= BRIDE_GROOM_LOOK_COUNT);

  looks.bride.forEach((look) => {
    assert.equal(look.side, "bride");
    assert.ok(BRIDE_CATEGORY_IDS.includes(look.categoryId), `${look.filename} must be women's wedding taxonomy`);
    assert.ok(look.image?.src, "Bride look needs an image");
    assert.doesNotMatch(String(look.categoryId), /menswear|kidswear/);
    if (look.product) {
      assert.equal(isBrideWeddingProduct(look.product), true);
      assert.equal(String(look.image.productId), String(look.product.id));
      const canonical = getProductMediaSet(look.product);
      assert.equal(sourceOf(look.image), sourceOf(canonical.primary));
    }
    if (look.mediaId) {
      const record = mediaRepository.getById(look.mediaId);
      if (record?.categoryId) assert.ok(BRIDE_CATEGORY_IDS.includes(record.categoryId));
      if (record?.productId && look.productId) {
        assert.equal(String(record.productId), String(look.productId));
      }
    }
  });

  looks.groom.forEach((look) => {
    assert.equal(look.side, "groom");
    assert.ok(GROOM_CATEGORY_IDS.includes(look.categoryId), `${look.filename} must be menswear`);
    assert.ok(look.image?.src, "Groom look needs an image");
    assert.doesNotMatch(String(look.categoryId), /sarees|lehengas|bridal-couture|kidswear/);
    if (look.product) {
      assert.equal(isGroomWeddingProduct(look.product), true);
      assert.equal(String(look.image.productId), String(look.product.id));
      const canonical = getProductMediaSet(look.product);
      assert.equal(sourceOf(look.image), sourceOf(canonical.primary));
    }
    if (look.mediaId) {
      const record = mediaRepository.getById(look.mediaId);
      if (record?.categoryId) assert.equal(record.categoryId, "menswear");
      if (record?.productId && look.productId) {
        assert.equal(String(record.productId), String(look.productId));
      }
    }
  });
});

test("Bride & Groom order is deterministic, stable and duplicate-free", () => {
  const first = selectBrideGroomLooks();
  const second = selectBrideGroomLooks();

  assert.deepEqual(
    second.bride.map((look) => look.mediaId || look.filename),
    first.bride.map((look) => look.mediaId || look.filename)
  );
  assert.deepEqual(
    second.groom.map((look) => look.mediaId || look.filename),
    first.groom.map((look) => look.mediaId || look.filename)
  );

  const brideImages = first.bride.map((look) => sourceOf(look.image).split("?")[0]);
  const groomImages = first.groom.map((look) => sourceOf(look.image).split("?")[0]);
  assert.equal(new Set(brideImages).size, brideImages.length);
  assert.equal(new Set(groomImages).size, groomImages.length);

  const source = selectBrideGroomLooks.toString();
  assert.ok(!source.includes("Math.random"));
});

test("Bride & Groom images exist and CTAs use canonical taxonomy routing", () => {
  const looks = selectBrideGroomLooks();
  const brideRoute = resolveCategoryRoute("bridal-couture");
  const groomRoute = resolveCategoryRoute("menswear");

  assert.equal(taxonomyRepository.findCategory("bridal-couture")?.status, "ACTIVE");
  assert.equal(taxonomyRepository.findCategory("menswear")?.status, "ACTIVE");
  assert.equal(brideRoute?.href, "/category/bridal");
  assert.equal(groomRoute?.href, "/category/men");

  looks.bride.concat(looks.groom).forEach((look) => {
    assert.ok(localAssetExists(look.image), `${look.filename} must exist`);
  });
});

test("Bride & Groom component contains no hardcoded image path and uses the resolver hook", () => {
  const source = componentSource();
  const page = atelierSource();

  assert.doesNotMatch(source, /(?:src|image)\s*=\s*["'](?:https?:|\/(?:images|library)\/)/);
  assert.doesNotMatch(source, /women-(?:saree|lehenga|bridal)-[a-z0-9-]+\.(?:webp|jpe?g|png)/i);
  assert.doesNotMatch(source, /men-(?:sherwani|kurta)[a-z0-9-]*\.(?:webp|jpe?g|png)/i);
  assert.match(source, /useBrideGroomLooks\(/);
  assert.match(source, /resolveCategoryRoute\("bridal-couture"\)/);
  assert.match(source, /resolveCategoryRoute\("menswear"\)/);
  assert.match(source, /prefers-reduced-motion|useReducedMotion/);
  assert.match(source, /Explore Bride/);
  assert.match(source, /Explore Groom/);
  assert.match(source, /Bride &/);
  assert.match(source, /Wedding silhouettes crafted for the moments that become memories/);

  assert.match(page, /<BrideGroomEdit/);
  assert.doesNotMatch(page, /Saree &/);
  assert.doesNotMatch(page, /Saree Collection/);
  assert.doesNotMatch(page, /Lehenga Collection/);
});

test("Bride & Groom motion is a paired wedding reveal, not the Saree Edit crossfade", () => {
  const source = componentSource();

  assert.match(source, /from "framer-motion"/);
  assert.match(source, /<AnimatePresence/);
  assert.match(source, /BRIDE_GROOM_REVEAL_MS\s*=\s*900/);
  assert.match(source, /BRIDE_GROOM_GROOM_DELAY_MS\s*=\s*150/);
  assert.match(source, /BRIDE_GROOM_TEXT_DELAY_MS\s*=\s*300/);
  assert.match(source, /BRIDE_GROOM_CTA_DELAY_MS\s*=\s*500/);
  assert.match(source, /BRIDE_GROOM_HOVER_MS\s*=\s*(5\d\d|6\d\d|7\d\d|800)\b/);
  assert.match(source, /BRIDE_GROOM_ROTATE_MS\s*=\s*(4\d\d\d|5\d\d\d)\b/);
  assert.match(source, /scale:\s*0\.97/);
  assert.match(source, /scale-\[1\.03\]/);

  /* Must not reuse the Saree Edit lateral-drift / 2500ms product cadence. */
  assert.doesNotMatch(source, /SAREE_EDIT_/);
  assert.doesNotMatch(source, /sareeEditFrom(?:Left|Right)/);
  assert.doesNotMatch(source, /SAREE_EDIT_AUTOPLAY_MS\s*=\s*2500/);
});

test("Saree Edit homepage section remains in place beside Bride & Groom", () => {
  const page = atelierSource();
  assert.match(page, /<SareeEditCarousel/);
  assert.match(page, /<BrideGroomEdit/);
  assert.match(page, /<CelebrationEdit/);
  assert.match(page, /<ShopByCategory/);
});
