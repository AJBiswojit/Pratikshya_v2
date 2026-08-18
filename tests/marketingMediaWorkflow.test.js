/**
 * PRATIKSHYA FASHON — Marketing Media workflow regression tests.
 *
 * End-to-end coverage of the complete marketing placement pipeline against
 * the REAL modules — no parallel product list, no mocks of the catalogue:
 *
 *   ADMIN ASSIGN → REPOSITORY (product ids only) → CANONICAL CATALOGUE →
 *   WORKFLOW VISIBILITY (PUBLISHED only) → PRODUCT MEDIA → STOREFRONT
 *
 * Plus the generic-artwork pipeline (upload record → ACTIVE/published →
 * storefront seam) and source-level tripwires that keep every configured
 * placement wired to a real storefront consumer.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import catalogRepository from "../src/services/catalogRepository.js";
import marketingPlacementRepository, {
  MARKETING_PLACEMENTS_STORAGE_KEY,
  readPlacementState,
  resetPlacementAssignments,
} from "../src/services/media/marketingPlacementRepository.js";
import {
  resolvePlacementProducts,
  resolvePlacementEntries,
} from "../src/services/media/marketingPlacementResolver.js";
import mediaRepository from "../src/services/media/mediaRepository.js";
import { isPlacementRecordLive } from "../src/services/media/mediaResolver.js";
import { placementImageSource } from "../src/services/media/marketingMediaSource.js";
import {
  listingPlacementsForScope,
  listingProductPlacements,
} from "../src/services/marketing/categoryPlacementSurfaces.js";
import { commands } from "../src/services/workflow/productWorkflowCommands.js";
import {
  WORKFLOW_STAGES,
  getProductWorkflowState,
} from "../src/services/workflow/productWorkflowState.js";
import { getLiveStorefrontProducts } from "../src/data/products/index.js";
import {
  MARKETING_PLACEMENTS,
  MARKETING_PLACEMENT_OPTIONS,
  MEDIA_STATUS,
  MEDIA_TYPES,
  PLACEMENT_MODES,
  getPlacement,
} from "../src/config/mediaTypes.js";
import { setupCanonicalState } from "./helpers/workflowTestState.js";

const ADMIN = { adminId: "PF-ADM-00001", name: "House Admin" };

const storageBackends = () => {
  const stores = [];
  try {
    if (typeof globalThis.localStorage !== "undefined" && globalThis.localStorage) {
      stores.push(globalThis.localStorage);
    }
  } catch {
    /* optional */
  }
  try {
    if (typeof window !== "undefined" && window.localStorage) stores.push(window.localStorage);
  } catch {
    /* optional */
  }
  return stores;
};

const clearPlacementStorage = () => {
  storageBackends().forEach((storage) => storage.removeItem(MARKETING_PLACEMENTS_STORAGE_KEY));
  resetPlacementAssignments();
};

beforeEach(() => {
  setupCanonicalState();
  clearPlacementStorage();
});
afterEach(() => {
  setupCanonicalState();
  clearPlacementStorage();
});

const publishViaWorkflow = (id) => {
  const steps = [commands.submitProduct, commands.approveProduct, commands.publishProduct];
  for (const step of steps) {
    const result = step(id, ADMIN);
    if (!result.ok) throw new Error(`workflow step failed for ${id}: ${result.error}`);
  }
};

/** Drives a product to PUBLISHED from wherever the canonical workflow left it. */
const ensurePublished = (id) => {
  let guard = 0;
  while (guard < 8) {
    const product = catalogRepository.find(id);
    const stage = getProductWorkflowState(product).stage;
    if (stage === WORKFLOW_STAGES.PUBLISHED) return;
    if (stage === WORKFLOW_STAGES.ARCHIVED) assert.ok(commands.restoreProduct(id, ADMIN).ok);
    else if ([WORKFLOW_STAGES.DRAFT, WORKFLOW_STAGES.ASSIGNED, WORKFLOW_STAGES.IN_EMPLOYEE_REVIEW].includes(stage))
      assert.ok(commands.submitProduct(id, ADMIN).ok, `submit ${id} from ${stage}`);
    else if ([WORKFLOW_STAGES.SUBMITTED, WORKFLOW_STAGES.IN_ADMIN_REVIEW].includes(stage))
      assert.ok(commands.approveProduct(id, ADMIN).ok, `approve ${id} from ${stage}`);
    else if (stage === WORKFLOW_STAGES.APPROVED)
      assert.ok(commands.publishProduct(id, ADMIN).ok, `publish ${id} from ${stage}`);
    else throw new Error(`unexpected workflow stage ${stage} for ${id}`);
    guard += 1;
  }
  throw new Error(`could not publish ${id}`);
};

/** A catalogue product inside a placement's recommended taxonomy — exactly what the selector offers. */
const productForPlacement = (placement, offset = 0) => {
  const all = catalogRepository.all();
  const matches = all.filter(
    (product) =>
      (!placement.recommendedDepartment || product.department === placement.recommendedDepartment) &&
      (!placement.recommendedCategory || product.category === placement.recommendedCategory) &&
      (!placement.recommendedSubcategory ||
        product.subcategory === placement.recommendedSubcategory)
  );
  const pool = matches.length ? matches : all;
  const product = pool[offset % pool.length];
  assert.ok(product, `catalogue must supply a product for ${placement.id}`);
  return product;
};

const PRODUCT_PLACEMENTS = MARKETING_PLACEMENT_OPTIONS.filter(
  (placement) => placement.mode === PLACEMENT_MODES.PRODUCT
);

/* ------------------------------------------------------------------ */
/* Placement vocabulary — the authoritative audit list                 */
/* ------------------------------------------------------------------ */

test("every configured placement declares a mode and a live storefront consumer expectation", () => {
  assert.ok(MARKETING_PLACEMENT_OPTIONS.length >= 13);
  MARKETING_PLACEMENT_OPTIONS.forEach((placement) => {
    assert.ok(
      placement.mode === PLACEMENT_MODES.PRODUCT || placement.mode === PLACEMENT_MODES.GENERIC,
      `${placement.id} must declare PRODUCT or GENERIC`
    );
    assert.equal(typeof placement.live, "boolean");
    /* A placement advertised as live must have a documented surface. */
    if (placement.live) assert.ok(placement.surface);
  });
});

test("listing-surface placements declare a complete recommended taxonomy that exists in the catalogue", () => {
  const listings = listingProductPlacements();
  assert.ok(listings.length >= 2, "bangles and jewellery listing surfaces must be configured");
  listings.forEach((placement) => {
    assert.ok(placement.recommendedDepartment, `${placement.id} needs a department`);
    assert.ok(placement.recommendedCategory, `${placement.id} needs a category`);
    assert.ok(placement.recommendedSubcategory, `${placement.id} needs a subcategory`);
    const matches = catalogRepository.all().filter(
      (product) =>
        product.department === placement.recommendedDepartment &&
        product.category === placement.recommendedCategory &&
        product.subcategory === placement.recommendedSubcategory
    );
    assert.ok(
      matches.length > 0,
      `${placement.id} recommended taxonomy must exist in the canonical catalogue`
    );
  });
});

test("listing scope matching is exact — only the placement's own page renders its rail", () => {
  assert.deepEqual(
    listingPlacementsForScope({
      department: "bridal",
      category: "finishing-touches",
      subcategory: "bangles",
    }).map((placement) => placement.id),
    [MARKETING_PLACEMENTS.BANGLES_SECTION]
  );
  assert.deepEqual(
    listingPlacementsForScope({
      department: "bridal",
      category: "finishing-touches",
      subcategory: "jewellery",
    }).map((placement) => placement.id),
    [MARKETING_PLACEMENTS.JEWELLERY_SECTION]
  );
  /* Sarees, kids and department landings are nobody's listing surface. */
  assert.deepEqual(
    listingPlacementsForScope({ department: "women", category: "sarees", subcategory: "cotton" }),
    []
  );
  assert.deepEqual(listingPlacementsForScope({ department: "kids" }), []);
  assert.deepEqual(listingPlacementsForScope({}), []);
  assert.deepEqual(listingPlacementsForScope(null), []);
});

/* ------------------------------------------------------------------ */
/* Product placements — assign / persist / resolve for EVERY placement */
/* ------------------------------------------------------------------ */

test("every product placement stores canonical product ids that persist across a re-read", () => {
  PRODUCT_PLACEMENTS.forEach((placement) => {
    const product = productForPlacement(placement);
    marketingPlacementRepository.setPlacementProductIds(placement.id, [product.id]);
    /* A re-read is the refresh equivalent; the register is the only door. */
    assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement.id), [
      product.id,
    ]);
  });
  /* Kids uses exactly the same repository as every other placement — no special door. */
  assert.deepEqual(
    marketingPlacementRepository.getPlacementProductIds(MARKETING_PLACEMENTS.KIDS_SECTION).length,
    1
  );
});

test("every product placement resolves its published products through the live catalogue", () => {
  PRODUCT_PLACEMENTS.forEach((placement) => {
    const first = productForPlacement(placement, 0);
    const second = productForPlacement(placement, 1);
    ensurePublished(first.id);
    ensurePublished(second.id);
    /* Deliberate non-catalogue order proves the placement order is preserved. */
    marketingPlacementRepository.setPlacementProductIds(placement.id, [second.id, first.id]);

    const resolved = resolvePlacementProducts(placement.id, getLiveStorefrontProducts());
    assert.deepEqual(
      resolved.map((product) => product.id),
      [second.id, first.id],
      `${placement.id} must resolve in placement order`
    );

    const entries = resolvePlacementEntries(placement.id, getLiveStorefrontProducts());
    assert.equal(entries.length, 2);
    entries.forEach((entry) => {
      assert.ok(entry.image.src, `${placement.id} entry must carry the canonical primary`);
      assert.equal(entry.route, `/product/${entry.product.id}`);
    });
  });
});

test("assignments survive a placement-register re-read without copying product objects", () => {
  const placement = getPlacement(MARKETING_PLACEMENTS.SAREE_SECTION);
  const product = productForPlacement(placement);
  marketingPlacementRepository.setPlacementProductIds(placement.id, [product.id]);
  const record = readPlacementState()[MARKETING_PLACEMENTS.SAREE_SECTION];
  assert.ok(record, "the register persists the placement record");
  assert.deepEqual(record.productIds, [product.id]);
  /* Product snapshots must never be stored inside a placement. */
  assert.deepEqual(Object.keys(record).sort(), ["createdAt", "placementId", "productIds", "updatedAt"]);
});

/* ------------------------------------------------------------------ */
/* Canonical lifecycle — the storefront filter                         */
/* ------------------------------------------------------------------ */

test("a DRAFT assignment never reaches the storefront, and submission/approval change nothing", () => {
  const placement = getPlacement(MARKETING_PLACEMENTS.SAREE_SECTION);
  const product = productForPlacement(placement);
  marketingPlacementRepository.setPlacementProductIds(placement.id, [product.id]);

  const resolved = () =>
    resolvePlacementProducts(placement.id, getLiveStorefrontProducts()).map((p) => p.id);

  assert.ok(catalogRepository.find(product.id).status !== "PUBLISHED");
  assert.deepEqual(resolved(), [], "a draft product must not resolve");

  assert.ok(commands.submitProduct(product.id, ADMIN).ok);
  assert.deepEqual(resolved(), [], "a submitted product must not resolve");

  assert.ok(commands.approveProduct(product.id, ADMIN).ok);
  assert.deepEqual(resolved(), [], "an approved-but-unpublished product must not resolve");

  /* The assignment itself survived the whole time. */
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement.id), [product.id]);
});

test("PUBLISHED admits the assigned product; unpublish removes it without destroying the assignment", () => {
  const placement = getPlacement(MARKETING_PLACEMENTS.KIDS_SECTION);
  const product = productForPlacement(placement);
  marketingPlacementRepository.setPlacementProductIds(placement.id, [product.id]);

  publishViaWorkflow(product.id);
  assert.deepEqual(
    resolvePlacementProducts(placement.id, getLiveStorefrontProducts()).map((p) => p.id),
    [product.id],
    "publishing admits the assigned product automatically"
  );

  assert.ok(commands.unpublishProduct(product.id, ADMIN).ok);
  assert.deepEqual(
    resolvePlacementProducts(placement.id, getLiveStorefrontProducts()),
    [],
    "unpublishing must remove the product from the storefront seam"
  );
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement.id), [product.id]);
  assert.ok(catalogRepository.find(product.id), "the product itself is untouched");

  /* Re-publishing resolves it again — no re-curation needed. */
  publishViaWorkflow(product.id);
  assert.deepEqual(
    resolvePlacementProducts(placement.id, getLiveStorefrontProducts()).map((p) => p.id),
    [product.id]
  );
});

test("ARCHIVED disappears from the storefront seam while the placement relationship stands", () => {
  const placement = getPlacement(MARKETING_PLACEMENTS.BANGLES_SECTION);
  const product = productForPlacement(placement);
  publishViaWorkflow(product.id);
  marketingPlacementRepository.setPlacementProductIds(placement.id, [product.id]);
  assert.equal(
    resolvePlacementProducts(placement.id, getLiveStorefrontProducts()).length,
    1
  );

  assert.ok(commands.archiveProduct(product.id, ADMIN).ok);
  assert.deepEqual(resolvePlacementProducts(placement.id, getLiveStorefrontProducts()), []);
  assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placement.id), [product.id]);
  assert.equal(catalogRepository.find(product.id).status, "ARCHIVED");
});

test("removal and reorder only touch the placement register, never the product", () => {
  const placement = getPlacement(MARKETING_PLACEMENTS.NEW_ARRIVALS);
  const first = productForPlacement(placement, 0);
  const second = productForPlacement(placement, 1);
  publishViaWorkflow(first.id);
  publishViaWorkflow(second.id);
  marketingPlacementRepository.setPlacementProductIds(placement.id, [first.id, second.id]);

  const before = catalogRepository.find(first.id);

  assert.deepEqual(
    marketingPlacementRepository.movePlacementProductId(placement.id, first.id, "down"),
    [second.id, first.id]
  );

  assert.deepEqual(
    marketingPlacementRepository.removePlacementProductId(placement.id, second.id),
    [first.id]
  );
  assert.ok(catalogRepository.find(second.id), "the removed product stays in the catalogue");

  const after = catalogRepository.find(first.id);
  assert.equal(after.department, before.department);
  assert.equal(after.category, before.category);
  assert.equal(after.subcategory, before.subcategory);
  assert.deepEqual(after.media, before.media);
  assert.equal(after.collection ?? after.collections, before.collection ?? before.collections);
  assert.equal(after.status, "PUBLISHED");
});

test("one product serves multiple placements without being mutated", () => {
  const product = productForPlacement(getPlacement(MARKETING_PLACEMENTS.SAREE_SECTION));
  publishViaWorkflow(product.id);
  const before = catalogRepository.find(product.id);

  [MARKETING_PLACEMENTS.SAREE_SECTION, MARKETING_PLACEMENTS.NEW_ARRIVALS, MARKETING_PLACEMENTS.WOMEN_SECTION]
    .forEach((placementId) =>
      marketingPlacementRepository.addPlacementProductIds(placementId, [product.id])
    );

  [MARKETING_PLACEMENTS.SAREE_SECTION, MARKETING_PLACEMENTS.NEW_ARRIVALS, MARKETING_PLACEMENTS.WOMEN_SECTION]
    .forEach((placementId) => {
      assert.deepEqual(marketingPlacementRepository.getPlacementProductIds(placementId), [
        product.id,
      ]);
      assert.deepEqual(
        resolvePlacementProducts(placementId, getLiveStorefrontProducts()).map((p) => p.id),
        [product.id]
      );
    });

  assert.deepEqual(catalogRepository.find(product.id), before);
});

test("a storefront row without primary media is never served to an editorial seam", () => {
  const placementId = MARKETING_PLACEMENTS.LEHENGA_SECTION;
  const medialess = {
    id: "PF-W-SYNTH-0001",
    name: "Synthetic media-less row",
    category: "lehengas",
    price: 100,
  };
  const withMedia = productForPlacement(getPlacement(placementId));
  marketingPlacementRepository.setPlacementProductIds(placementId, [
    medialess.id,
    withMedia.id,
  ]);
  const entries = resolvePlacementEntries(placementId, [medialess, withMedia]);
  assert.deepEqual(
    entries.map((entry) => entry.productId),
    [withMedia.id],
    "the media-less row is dropped; the curated one with canonical media stands"
  );
});

/* ------------------------------------------------------------------ */
/* Generic artwork placements — record → ACTIVE → storefront seam      */
/* ------------------------------------------------------------------ */

test("only ACTIVE artwork records with a usable file resolve publicly for their placement", () => {
  const placementId = MARKETING_PLACEMENTS.PROMOTION;
  const statuses = [
    MEDIA_STATUS.DRAFT,
    MEDIA_STATUS.PENDING_REVIEW,
    MEDIA_STATUS.REJECTED,
    MEDIA_STATUS.ARCHIVED,
  ];

  const active = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Season promotion plate",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0001/primary.avif",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: placementId,
  });
  statuses.forEach((status) => {
    mediaRepository.create({
      type: MEDIA_TYPES.IMAGE,
      title: `Promotion ${status}`,
      url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/primary.avif",
      status,
      scope: "MARKETING",
      placement: placementId,
    });
  });

  const publicRecords = mediaRepository.getMarketingMedia(placementId, { publicOnly: true });
  assert.equal(publicRecords.length, 1);
  assert.equal(publicRecords[0].id, active.id);

  /* The seam shape: the record stands in for artwork; anything else falls back. */
  assert.equal(placementImageSource(publicRecords[0])?.src, active.url);
  assert.equal(placementImageSource(null), null);
});

test("ephemeral preview URLs never survive as production media", () => {
  const record = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Browser preview upload",
    url: "blob:http://localhost/preview-123",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.EDITORIAL,
  });
  assert.ok(record);
  assert.equal(record.url, "", "the store strips the ephemeral url");
  assert.deepEqual(
    mediaRepository.getMarketingMedia(MARKETING_PLACEMENTS.EDITORIAL, { publicOnly: true }),
    []
  );
  assert.equal(placementImageSource(record), null);
});

test("isPlacementRecordLive reports the canonical truth behind admin labels", () => {
  const promo = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Live promotion",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0001/primary.avif",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.PROMOTION,
  });
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.PROMOTION, promo), true);
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.EDITORIAL, promo), false);

  const draft = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Draft promotion",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0002/primary.avif",
    status: MEDIA_STATUS.DRAFT,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.PROMOTION,
  });
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.PROMOTION, draft), false);

  /* Product placements never admit artwork records. */
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.SAREE_SECTION, promo), false);

  /* The hero register admits only HERO-role, hero-mapped records — a plain
     ACTIVE upload is honestly reported as not live on the hero. */
  const plainHero = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Plain hero upload",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0003/primary.avif",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.HOME_HERO,
  });
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.HOME_HERO, plainHero), false);

  const registeredHero = mediaRepository.create({
    type: MEDIA_TYPES.IMAGE,
    title: "Registered hero plate",
    url: "/images/products/women/sarees/silk/PF-W-SAR-SIL-0004/primary.avif",
    status: MEDIA_STATUS.ACTIVE,
    scope: "MARKETING",
    placement: MARKETING_PLACEMENTS.HOME_HERO,
    usageRoles: ["HERO"],
    mappingMethod: "HOMEPAGE_HERO_REGISTER",
  });
  assert.equal(isPlacementRecordLive(MARKETING_PLACEMENTS.HOME_HERO, registeredHero), true);
});

/* ------------------------------------------------------------------ */
/* Storefront consumer tripwires — every placement stays wired         */
/* ------------------------------------------------------------------ */

const src = (...parts) =>
  readFileSync(join(process.cwd(), "src", ...parts), "utf8");

test("every placement has a real storefront consumer seam", () => {
  const consumers = [
    src("pages", "AtelierDesign.jsx"),
    src("components", "storefront", "HeroCarousel.jsx"),
    src("components", "storefront", "SareeEditCarousel.jsx"),
    src("components", "storefront", "BrideGroomEdit.jsx"),
    src("components", "storefront", "NewArrivals.jsx"),
    src("components", "storefront", "CelebrationEdit.jsx"),
    src("components", "storefront", "SaleBanner.jsx"),
    src("components", "storefront", "PlacementProductRail.jsx"),
    src("pages", "CatalogueListing.jsx"),
  ].join("\n");

  const expectedSeams = {
    [MARKETING_PLACEMENTS.HOME_HERO]: "AtelierDesign",
    [MARKETING_PLACEMENTS.SAREE_SECTION]: "SareeEditCarousel",
    [MARKETING_PLACEMENTS.LEHENGA_SECTION]: "PlacementProductRail",
    [MARKETING_PLACEMENTS.FESTIVE_SECTION]: "CelebrationEdit + SaleBanner",
    [MARKETING_PLACEMENTS.WOMEN_SECTION]: "PlacementProductRail",
    [MARKETING_PLACEMENTS.BRIDAL_SECTION]: "BrideGroomEdit",
    [MARKETING_PLACEMENTS.GROOM_SECTION]: "BrideGroomEdit",
    [MARKETING_PLACEMENTS.KIDS_SECTION]: "PlacementProductRail",
    [MARKETING_PLACEMENTS.NEW_ARRIVALS]: "NewArrivals",
    [MARKETING_PLACEMENTS.EDITORIAL]: "CelebrationEdit",
    [MARKETING_PLACEMENTS.PROMOTION]: "SaleBanner",
  };

  Object.entries(expectedSeams).forEach(([placementId, seam]) => {
    assert.ok(
      consumers.includes(`MARKETING_PLACEMENTS.${placementId}`),
      `${placementId} must be consumed by its storefront seam (${seam})`
    );
  });

  /* Listing-surface placements are consumed generically through the
     vocabulary-driven matcher — never by a literal id in the page. */
  const listing = src("pages", "CatalogueListing.jsx");
  assert.ok(listing.includes("listingPlacementsForScope"));
  assert.ok(!listing.includes("BANGLES_SECTION"), "no hardcoded placement ids in the listing page");
  assert.ok(!listing.includes("JEWELLERY_SECTION"), "no hardcoded placement ids in the listing page");
  listingProductPlacements()
    .map((placement) => placement.id)
    .forEach((placementId) => {
      assert.ok(
        Object.values(MARKETING_PLACEMENTS).includes(placementId),
        `${placementId} must come from the placement vocabulary`
      );
    });
  /* Every placement in the vocabulary is accounted for by a seam above or
     by the listing matcher — none is advertised live without a consumer. */
  assert.deepEqual(
    new Set([
      ...Object.keys(expectedSeams),
      ...listingProductPlacements().map((placement) => placement.id),
    ]),
    new Set(MARKETING_PLACEMENT_OPTIONS.map((placement) => placement.id))
  );
});

test("the hero keeps its dedicated workflow — no product-catalogue curation leaks into it", () => {
  const hero = src("components", "storefront", "HeroCarousel.jsx");
  const homepage = src("pages", "AtelierDesign.jsx");
  assert.ok(!hero.includes("marketingPlacementRepository"));
  assert.ok(!hero.includes("usePlacementProducts"));
  assert.ok(!hero.includes("ProductCatalog"));
  assert.ok(hero.includes("resolveHeroSlideImage"));
  assert.ok(homepage.includes("useMarketingMedia(MARKETING_PLACEMENTS.HOME_HERO)"));

  /* The authored AVIF slideshow remains the hero's backbone. */
  const heroData = src("data", "catalog", "hero.js");
  assert.ok((heroData.match(/\/images\/hero\/hero00\d\.avif/g) ?? []).length === 5);
});

test("no storefront or marketing-admin source hardcodes catalogue products", () => {
  const sources = [
    src("components", "storefront", "PlacementProductRail.jsx"),
    src("components", "storefront", "NewArrivals.jsx"),
    src("components", "storefront", "SareeEditCarousel.jsx"),
    src("components", "storefront", "BrideGroomEdit.jsx"),
    src("components", "storefront", "CelebrationEdit.jsx"),
    src("components", "storefront", "SaleBanner.jsx"),
    src("pages", "AtelierDesign.jsx"),
    src("pages", "CatalogueListing.jsx"),
    src("pages", "admin", "media", "AdminMarketingMedia.jsx"),
    src("components", "admin", "ProductCatalogSelector.jsx"),
    src("services", "marketing", "categoryPlacementSurfaces.js"),
  ];
  sources.forEach((source) => {
    assert.equal(/PF-[A-Z]-[A-Z]{3}/.test(source), false, "no hardcoded product ids");
  });
});
