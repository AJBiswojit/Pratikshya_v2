/**
 * PRATIKSHYA FASHON — Homepage editorial media regression coverage.
 *
 * The three homepage editorial seams — Groom, Saree and Festive — must all
 * resolve real canonical media through the SAME Marketing Media product
 * workflow: an admin assigns a canonical Product ID to a PRODUCT placement,
 * the live catalogue resolves it (PUBLISHED + active taxonomy only), and the
 * product's primary media stands. These tests lock down:
 *
 *   · GROOM_SECTION / SAREE_SECTION / FESTIVE_SECTION placements reach the
 *     homepage through the canonical resolver
 *   · only PUBLISHED products resolve — draft / submitted / approved /
 *     archived rows never reach a seam
 *   · unassignment clears the seam; reassignment changes the product;
 *     unpublish removes it (and republish restores it)
 *   · assignments persist across a re-read (refresh equivalent)
 *   · no STATIC_CATALOG fallback remains in the three merchandising paths
 *   · no product id, filename or image path is hard-coded in the components
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository from "../src/services/catalogRepository.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import { selectBrideGroomLooks, selectSareeEditProducts } from "../src/services/media/mediaResolver.js";
import { resolvePlacementEntries } from "../src/services/media/marketingPlacementResolver.js";
import marketingPlacementRepository, {
  resetPlacementAssignments,
} from "../src/services/media/marketingPlacementRepository.js";
import {
  MARKETING_PLACEMENTS,
  PLACEMENT_MODES,
  getPlacement,
} from "../src/config/mediaTypes.js";
import { resolveCategoryRoute } from "../src/services/taxonomyRouting.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const publish = (id) => {
  assert.ok(commands.submitProduct(id, ADMIN).ok, `${id} submits`);
  assert.ok(commands.approveProduct(id, ADMIN).ok, `${id} approves`);
  assert.ok(commands.publishProduct(id, ADMIN).ok, `${id} publishes`);
};

const sourceOf = (source) => source?.src || source?.url || source?.thumbnail || "";

const src = (...parts) => readFileSync(join(ROOT, ...parts), "utf8");

const findGroomProduct = () =>
  catalogRepository
    .all()
    .find((product) => product.department === "men" && product.category === "groom");

const findSareeProduct = () =>
  catalogRepository
    .all()
    .find((product) => product.department === "women" && product.category === "sarees");

const findFestiveProduct = () =>
  catalogRepository
    .all()
    .find((product) => product.department === "women" && product.category === "lehengas");

test.beforeEach(() => {
  setupCanonicalState();
  resetPlacementAssignments();
});
test.afterEach(() => {
  setupCanonicalState();
  resetPlacementAssignments();
});

/* ------------------------------------------------------------------ */
/* Placement vocabulary                                                */
/* ------------------------------------------------------------------ */

test("Groom, Saree and Festive are all PRODUCT placements, admin-curated", () => {
  for (const id of [
    MARKETING_PLACEMENTS.GROOM_SECTION,
    MARKETING_PLACEMENTS.SAREE_SECTION,
    MARKETING_PLACEMENTS.FESTIVE_SECTION,
  ]) {
    const placement = getPlacement(id);
    assert.ok(placement, `${id} is a configured placement`);
    assert.equal(placement.live, true, `${id} is live`);
    assert.equal(placement.mode, PLACEMENT_MODES.PRODUCT, `${id} is a PRODUCT placement`);
  }
  /* The festive placement points at the canonical festive taxonomy. */
  assert.equal(
    getPlacement(MARKETING_PLACEMENTS.FESTIVE_SECTION).recommendedCategory,
    "lehengas"
  );
});

/* ------------------------------------------------------------------ */
/* Marketing placement → homepage media                                */
/* ------------------------------------------------------------------ */

test("GROOM_SECTION placement assignment reaches the homepage as canonical product media", () => {
  const groomProduct = findGroomProduct();
  assert.ok(groomProduct, "a canonical groom product exists");

  publish(groomProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.GROOM_SECTION, [
    groomProduct.id,
  ]);

  const entries = resolvePlacementEntries(
    MARKETING_PLACEMENTS.GROOM_SECTION,
    getLiveStorefrontProducts()
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].productId, groomProduct.id);
  assert.equal(entries[0].product.status, "PUBLISHED");
  assert.ok(sourceOf(entries[0].image), "assigned groom entry carries an image");
  assert.match(sourceOf(entries[0].image), /^\/images\/products\/men\//);
});

test("SAREE_SECTION placement assignment reaches the homepage as canonical product media", () => {
  const sareeProduct = findSareeProduct();
  assert.ok(sareeProduct, "a canonical saree product exists");

  publish(sareeProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.SAREE_SECTION, [
    sareeProduct.id,
  ]);

  const entries = resolvePlacementEntries(
    MARKETING_PLACEMENTS.SAREE_SECTION,
    getLiveStorefrontProducts()
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].productId, sareeProduct.id);
  assert.ok(sourceOf(entries[0].image), "assigned saree entry carries an image");
  assert.match(sourceOf(entries[0].image), /^\/images\/products\/women\//);
});

test("FESTIVE_SECTION placement assignment reaches the homepage as canonical product media", () => {
  const festiveProduct = findFestiveProduct();
  assert.ok(festiveProduct, "a canonical festive product exists");

  publish(festiveProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    festiveProduct.id,
  ]);

  const entries = resolvePlacementEntries(
    MARKETING_PLACEMENTS.FESTIVE_SECTION,
    getLiveStorefrontProducts()
  );
  assert.equal(entries.length, 1);
  assert.equal(entries[0].productId, festiveProduct.id);
  assert.equal(entries[0].product.status, "PUBLISHED");
  assert.ok(sourceOf(entries[0].image), "assigned festive entry carries an image");
  assert.match(sourceOf(entries[0].image), /^\/images\/products\/women\//);
});

test("the Festive Edit banner consumes the FESTIVE_SECTION placement via the shared hook", () => {
  const saleBanner = src("src", "components", "storefront", "SaleBanner.jsx");
  assert.match(
    saleBanner,
    /usePlacementEntries\(\s*MARKETING_PLACEMENTS\.FESTIVE_SECTION/,
    "SaleBanner resolves the festive image through the product placement"
  );
  /* No STATIC_CATALOG / house-artwork fallback remains in the festive seam. */
  assert.doesNotMatch(saleBanner, /resolveFestiveCampaignImage|resolveSaleBackdrop|STATIC_CATALOG/);
  assert.doesNotMatch(saleBanner, /imageRef\(/);
});

test("the CelebrationEdit festive plate consumes the FESTIVE_SECTION placement", () => {
  const celebrationEdit = src("src", "components", "storefront", "CelebrationEdit.jsx");
  assert.match(
    celebrationEdit,
    /usePlacementEntries\(\s*MARKETING_PLACEMENTS\.FESTIVE_SECTION/,
    "the festive PRATIKSHYA Edit plate reads the product placement"
  );
  /* The festive plate no longer resolves through the legacy editorial frame. */
  assert.doesNotMatch(celebrationEdit, /resolveEditorialFrame\(\s*"festive"\s*\)/);
});

/* ------------------------------------------------------------------ */
/* Assignment lifecycle                                                */
/* ------------------------------------------------------------------ */

test("unassigning a placement clears the homepage seam without touching the catalogue", () => {
  const festiveProduct = findFestiveProduct();
  publish(festiveProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    festiveProduct.id,
  ]);

  marketingPlacementRepository.clearPlacement(MARKETING_PLACEMENTS.FESTIVE_SECTION);
  const entries = resolvePlacementEntries(
    MARKETING_PLACEMENTS.FESTIVE_SECTION,
    getLiveStorefrontProducts()
  );
  assert.equal(entries.length, 0, "an empty placement resolves to nothing");
  assert.ok(
    catalogRepository.all().some((product) => product.id === festiveProduct.id),
    "the product record is untouched by unassignment"
  );
});

test("reassigning a placement changes the displayed product", () => {
  const first = findFestiveProduct();
  const second = catalogRepository
    .all()
    .find(
      (product) =>
        product.department === "women" &&
        product.category === "lehengas" &&
        product.id !== first.id
    );
  assert.ok(first && second, "two distinct festive products exist");
  publish(first.id);
  publish(second.id);

  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    first.id,
  ]);
  assert.equal(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    )[0].productId,
    first.id
  );

  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    second.id,
  ]);
  assert.equal(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    )[0].productId,
    second.id,
    "reassignment must change the showcased product"
  );
});

test("unpublishing removes the product from the seam; republishing restores it", () => {
  const festiveProduct = findFestiveProduct();
  publish(festiveProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    festiveProduct.id,
  ]);
  assert.equal(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    ).length,
    1
  );

  assert.ok(commands.unpublishProduct(festiveProduct.id, ADMIN).ok);
  assert.equal(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    ).length,
    0,
    "unpublishing removes the product from the storefront seam"
  );
  /* The assignment itself survives — no re-curation needed on republish. */
  assert.deepEqual(
    marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION),
    [festiveProduct.id]
  );

  publish(festiveProduct.id);
  assert.equal(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    ).length,
    1,
    "republishing restores the product automatically"
  );
});

test("assignments persist across a re-read (refresh equivalent)", () => {
  const festiveProduct = findFestiveProduct();
  publish(festiveProduct.id);
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION, [
    festiveProduct.id,
  ]);

  /* A fresh read of the register (as a page refresh would do) returns the
     same assignment in the same order. */
  assert.deepEqual(
    marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.FESTIVE_SECTION),
    [festiveProduct.id]
  );
  assert.deepEqual(
    resolvePlacementEntries(
      MARKETING_PLACEMENTS.FESTIVE_SECTION,
      getLiveStorefrontProducts()
    ).map((entry) => entry.productId),
    [festiveProduct.id]
  );
});

/* ------------------------------------------------------------------ */
/* Published-only visibility                                           */
/* ------------------------------------------------------------------ */

test("a placement holding an unpublished product cannot promote it to the homepage", () => {
  const groomProduct = findGroomProduct();
  marketingPlacementRepository.setPlacementProductIds(MARKETING_PLACEMENTS.GROOM_SECTION, [
    groomProduct.id,
  ]);

  const entries = () =>
    resolvePlacementEntries(MARKETING_PLACEMENTS.GROOM_SECTION, getLiveStorefrontProducts());

  /* DRAFT — the default authored state. */
  assert.equal(entries().length, 0, "a DRAFT product must not reach the homepage");

  /* SUBMITTED / APPROVED are still not storefront-visible. */
  assert.ok(commands.submitProduct(groomProduct.id, ADMIN).ok);
  assert.ok(commands.approveProduct(groomProduct.id, ADMIN).ok);
  assert.equal(entries().length, 0, "an APPROVED product must not reach the homepage");

  /* PUBLISHED — now eligible. */
  assert.ok(commands.publishProduct(groomProduct.id, ADMIN).ok);
  assert.equal(entries().length, 1, "a PUBLISHED product reaches the homepage");

  /* ARCHIVED — gone again. */
  assert.ok(commands.archiveProduct(groomProduct.id, ADMIN).ok);
  assert.equal(entries().length, 0, "an ARCHIVED product must not reach the homepage");
});

test("deterministic Groom and Saree selectors require PUBLISHED products", () => {
  /* Fresh canonical state: nothing is published yet. */
  assert.equal(getLiveStorefrontProducts().length, 0);
  assert.deepEqual(selectBrideGroomLooks().groom, []);
  assert.deepEqual(selectSareeEditProducts(), []);
});

/* ------------------------------------------------------------------ */
/* Routes                                                              */
/* ------------------------------------------------------------------ */

test("the Groom destination resolves to the canonical groom category route", () => {
  const groomRoute = resolveCategoryRoute("groom") || resolveCategoryRoute("ethnic-wear");
  assert.ok(groomRoute, "the groom destination must resolve");
  assert.equal(groomRoute.href, "/men/groom");

  /* The legacy id must no longer be relied upon as a destination. */
  assert.equal(resolveCategoryRoute("menswear"), null);
});

test("the Bride destination resolves to a canonical bridal category route", () => {
  const brideRoute =
    resolveCategoryRoute("the-bride") ||
    resolveCategoryRoute("lehengas") ||
    resolveCategoryRoute("sarees");
  assert.ok(brideRoute, "the bride destination must resolve");
  assert.equal(brideRoute.href, "/bridal/the-bride");
});

/* ------------------------------------------------------------------ */
/* No hardcoding                                                       */
/* ------------------------------------------------------------------ */

test("the homepage editorial components hardcode no product id, filename or image path", () => {
  const files = [
    "src/components/storefront/BrideGroomEdit.jsx",
    "src/components/storefront/CelebrationEdit.jsx",
    "src/components/storefront/SareeEditCarousel.jsx",
    "src/components/storefront/SaleBanner.jsx",
  ];
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert.ok(!/PF-[A-Z]{1,3}-/.test(source), `${file} must not hard-code a product id`);
    assert.ok(!/["'`]\/images\//.test(source), `${file} must not hard-code an image path`);
    assert.ok(
      !/\.(avif|webp|jpe?g|png)\b/i.test(source),
      `${file} must not hard-code an image filename`
    );
  }
});

test("no merchandising seam resolves through STATIC_CATALOG", () => {
  /* The three named merchandising paths (Groom = Bride & Groom, Saree =
     Saree Edit, Festive = Festive Edit banner) must not use the static
     catalogue fallback; each reads its placement through the shared hook. */
  const files = [
    "src/components/storefront/BrideGroomEdit.jsx",
    "src/components/storefront/SareeEditCarousel.jsx",
    "src/components/storefront/SaleBanner.jsx",
  ];
  for (const file of files) {
    const source = readFileSync(join(ROOT, file), "utf8");
    assert.doesNotMatch(source, /STATIC_CATALOG/, `${file} must not use STATIC_CATALOG`);
    assert.doesNotMatch(source, /resolveEditorialFrame/, `${file} must not use the editorial frame fallback`);
  }
});

test("the three seams read the shared placement hook, not local image arrays", () => {
  const groomSource = src("src", "components", "storefront", "BrideGroomEdit.jsx");
  const sareeSource = src("src", "components", "storefront", "SareeEditCarousel.jsx");
  const festiveSource = src("src", "components", "storefront", "SaleBanner.jsx");

  assert.match(groomSource, /usePlacementEntries\(/);
  assert.match(groomSource, /resolveCategoryRoute\(/);
  assert.match(sareeSource, /usePlacementEntries\(/);
  assert.match(sareeSource, /useSareeEditProducts\(/);
  assert.match(festiveSource, /usePlacementEntries\(/);
});
