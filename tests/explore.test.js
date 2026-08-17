/**
 * PRATIKSHYA FASHON — Explore page tests (Phase 24).
 *
 * Proves the discovery page is the published catalogue — not a gallery of
 * media files — and that filters, sort, search, hover and Kids identity
 * stay on the existing architecture.
 */

import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { setupBaseState, setupMigratedState } from "./helpers/workflowTestState.js";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import catalogRepository from "../src/services/catalogRepository.js";
import { getLiveStorefrontProducts, productHref } from "../src/data/products/index.js";
import { queryCatalogue, resolveCategoryFilter, sortProducts, SORT_ALIASES } from "../src/data/products/query.js";
import {
  EXPLORE_PAGE_SIZE,
  buildExploreStream,
  compareExploreCoverage,
  getExploreProductIds,
  getExploreProducts,
  inspectExploreMedia,
  paginateExplore,
  queryExplore,
  unpublishedKidsIds,
} from "../src/data/products/explore.js";
import {
  assembleProductMediaSet,
  getProductCardMedia,
  getProductMediaSet,
} from "../src/services/media/productMediaSet.js";
import { KIDS_PRODUCT_IDS } from "../src/services/kidsProductIdentity.js";
import { sortOptions } from "../src/data/products/taxonomy.js";

import {
  resolveExploreEditorialMedia,
  resolveExplorePromoMedia,
} from "../src/services/explore/explorePlacements.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const read = (rel) => readFileSync(join(root, rel), "utf8");


beforeEach(() => {
  setupMigratedState();
});

afterEach(() => {
  setupBaseState();
});

test("Explore route is registered and customer-accessible", () => {
  const app = read("src/App.jsx");
  assert.match(app, /path=["']\/explore["']/);
  assert.match(app, /<Explore/);
  assert.match(app, /["']\/explore["']/);
  assert.ok(app.includes('"/explore"'), "dedicatedPaths must include /explore");
});

test("Explore appears in the customer navbar, top right", () => {
  const header = read("src/components/shell/SiteHeader.jsx");
  assert.match(header, /to=["']\/explore["']/);
  assert.match(header, />\s*Explore\s*</);
  const mobile = read("src/components/shell/MobileNav.jsx");
  assert.match(mobile, /to=["']\/explore["']/);
});

test("getLiveStorefrontProducts equals the complete Explore Product ID set", () => {
  const coverage = compareExploreCoverage();
  assert.equal(coverage.exploreCount, coverage.liveCount);
  assert.deepEqual(coverage.missing, []);
  assert.deepEqual(coverage.extra, []);
  assert.deepEqual(coverage.exploreDuplicates, []);
  assert.equal(getExploreProducts().length, getLiveStorefrontProducts().length);
  assert.equal(new Set(getExploreProductIds()).size, getExploreProductIds().length);
});

test("Explore is published-only — drafts and review records stay hidden", () => {
  const exploreIds = new Set(getExploreProductIds());
  catalogRepository.all().forEach((product) => {
    if (product.status === "PUBLISHED") return;
    assert.equal(
      exploreIds.has(String(product.id)),
      false,
      `${product.id} (${product.status}) must not appear on Explore`
    );
  });
  unpublishedKidsIds().forEach((id) => {
    assert.equal(exploreIds.has(id), false, `${id} is a Kids draft and must stay off Explore`);
  });
});

test("one physical product is one Explore card — multi-view media does not split", () => {
  const products = getExploreProducts();
  const ids = products.map((product) => String(product.id));
  assert.equal(new Set(ids).size, ids.length, "duplicate Product IDs");

  const grouped = assembleProductMediaSet("SAR-DEMO", [
    {
      id: "sar-front",
      src: "/library/sar-001-front.webp",
      fileName: "sar-001-front.webp",
      productId: "SAR-DEMO",
      view: "front",
      type: "IMAGE",
      status: "ACTIVE",
      scope: "PRODUCT",
      role: "COVER",
    },
    {
      id: "sar-side",
      src: "/library/sar-001-side.webp",
      fileName: "sar-001-side.webp",
      productId: "SAR-DEMO",
      view: "side",
      type: "IMAGE",
      status: "ACTIVE",
      scope: "PRODUCT",
    },
    {
      id: "sar-back",
      src: "/library/sar-001-back.webp",
      fileName: "sar-001-back.webp",
      productId: "SAR-DEMO",
      view: "back",
      type: "IMAGE",
      status: "ACTIVE",
      scope: "PRODUCT",
    },
  ]);
  assert.equal(grouped.gallery.length, 3);
  assert.equal(grouped.productId, "SAR-DEMO");
  assert.equal(grouped.hover.fileName, "sar-001-back.webp");
});

test("every Explore product media belongs to the same Product ID", () => {
  getExploreProducts().forEach((product) => {
    const report = inspectExploreMedia(product);
    assert.equal(report.primaryOwned, true, `${product.id} primary crossed products`);
    assert.equal(report.hoverOwned, true, `${product.id} hover crossed products`);
    assert.equal(report.galleryOwned, true, `${product.id} gallery crossed products`);
    const set = getProductMediaSet(product);
    assert.ok(set.primary, `${product.id} must have primary media`);
  });
});

test("hover is deterministic and single-view products do not swap", () => {
  const first = getExploreProducts().map((product) => getProductCardMedia(product));
  const second = getExploreProducts().map((product) => getProductCardMedia(product));
  first.forEach((card, index) => {
    assert.equal(card.image?.src, second[index].image?.src);
    assert.equal(card.hoverImage?.src, second[index].hoverImage?.src);
  });

  getExploreProducts().forEach((product) => {
    const set = getProductMediaSet(product);
    const card = getProductCardMedia(product);
    if (!set.hasAlternate) {
      assert.equal(card.hoverImage, undefined, `${product.id} must not replace a single view`);
    } else {
      assert.ok(card.hoverImage, `${product.id} should expose owned hover`);
      assert.notEqual(card.hoverImage.src, card.image.src);
      if (card.hoverImage.productId) {
        assert.equal(String(card.hoverImage.productId), String(product.id));
      }
    }
  });
});

test("category filters resolve from taxonomy, including kids / jewellery aliases", () => {
  assert.equal(resolveCategoryFilter("kids"), "kidswear");
  assert.equal(resolveCategoryFilter("sarees"), "sarees");
  assert.equal(resolveCategoryFilter("jewellery"), "jewellery");

  const sarees = queryExplore({ filters: { category: "sarees" } }).results;
  assert.ok(sarees.length > 0);
  assert.ok(sarees.every((product) => product.category === "sarees"));

  const kids = queryExplore({ filters: { category: "kids" } }).results;
  const kidswear = queryExplore({ filters: { category: "kidswear" } }).results;
  assert.equal(kids.length, kidswear.length);
  assert.ok(kids.every((product) => product.category === "kidswear"));

  const jewellery = queryExplore({ filters: { category: "jewellery" } }).results;
  assert.ok(jewellery.every((product) => product.category === "jewellery"));
});

test("price, search, merch and combined filters AND together", () => {
  const search = queryExplore({ search: "Saree" }).results;
  assert.ok(search.length > 0);
  assert.ok(search.every((product) => product.searchText.includes("saree")));

  const priced = queryExplore({
    search: "Saree",
    filters: { category: "sarees", price: "2000-5000" },
  }).results;
  priced.forEach((product) => {
    assert.equal(product.category, "sarees");
    assert.ok(product.price >= 2000 && product.price < 5000);
    assert.ok(product.searchText.includes("saree"));
  });

  const arrivals = queryExplore({ filters: { merch: "new" } }).results;
  assert.ok(arrivals.every((product) => product.isNew));

  const sale = queryExplore({ filters: { merch: "sale" } }).results;
  assert.ok(sale.length > 0);
  sale.forEach((product) => {
    assert.ok(
      (product.discount && product.discount > 0) ||
        (product.originalPrice && product.originalPrice > product.price)
    );
  });
});

test("sorting is deterministic and includes price, discount and name", () => {
  const ids = new Set(sortOptions.map((option) => option.id));
  assert.ok(ids.has("recommended"));
  assert.ok(ids.has("newest"));
  assert.ok(ids.has("price-asc"));
  assert.ok(ids.has("price-desc"));
  assert.ok(ids.has("discount"));
  assert.ok(ids.has("name-asc"));
  assert.equal(SORT_ALIASES["price-low"], "price-asc");

  const lowAlias = queryExplore({ sort: "price-low" }).results;
  const low = queryExplore({ sort: "price-asc" }).results;
  assert.deepEqual(
    lowAlias.map((product) => product.id),
    low.map((product) => product.id)
  );
  for (let i = 1; i < low.length; i += 1) {
    assert.ok(low[i].price >= low[i - 1].price);
  }
  const high = queryExplore({ sort: "price-desc" }).results;
  for (let i = 1; i < high.length; i += 1) {
    assert.ok(high[i].price <= high[i - 1].price);
  }
  const named = queryExplore({ sort: "name-asc" }).results;
  const names = named.map((product) => product.name);
  assert.deepEqual(
    names,
    [...names].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
  );
  assert.deepEqual(
    sortProducts(getExploreProducts(), "recommended").map((product) => product.id),
    sortProducts(getExploreProducts(), "recommended").map((product) => product.id)
  );
});

test("load more / pagination eventually exposes the entire catalogue", () => {
  const all = queryExplore({}).results;
  assert.equal(all.length, getExploreProducts().length);
  assert.ok(all.length > EXPLORE_PAGE_SIZE);

  const page1 = paginateExplore(all, 1, EXPLORE_PAGE_SIZE);
  assert.equal(page1.visible.length, EXPLORE_PAGE_SIZE);
  assert.equal(page1.hasMore, true);

  let page = 1;
  let visible = [];
  while (visible.length < all.length && page < 20) {
    visible = paginateExplore(all, page, EXPLORE_PAGE_SIZE).visible;
    page += 1;
  }
  assert.equal(visible.length, all.length);
  assert.deepEqual(
    visible.map((product) => product.id).sort(),
    all.map((product) => product.id).sort()
  );
});

test("empty combined filters return no stand-in products", () => {
  const empty = queryExplore({
    search: "zzzx-no-such-piece",
    filters: { category: "sarees", price: "under-2000" },
  });
  assert.equal(empty.total, 0);
  assert.deepEqual(empty.results, []);
});

test("Kids published products remain intact and KID drafts stay separate", () => {
  const kids = queryExplore({ filters: { category: "kidswear" } }).results;
  assert.equal(kids.length, 21);
  assert.equal(new Set(kids.map((product) => product.id)).size, 21);
  KIDS_PRODUCT_IDS.forEach((id) => {
    const record = catalogRepository.find(id);
    assert.ok(record, `${id} identity must still exist`);
    if (record.status !== "PUBLISHED") {
      assert.equal(
        kids.some((product) => product.id === id),
        false,
        `${id} is not published and must not be an Explore card`
      );
    }
  });
});

test("product cards navigate to the canonical PDP", () => {
  const product = getExploreProducts()[0];
  assert.equal(productHref(product), `/product/${product.slug}`);
  const grid = read("src/components/explore/ExploreProductGrid.jsx");
  assert.match(grid, /productHref/);
  assert.match(grid, /getProductCardMedia|ProductCard/);
});

test("advertisement placements use resolver roles, never product plates", () => {
  const promo = resolveExplorePromoMedia();
  const editorial = resolveExploreEditorialMedia();
  assert.ok(promo?.src, "promo placement must resolve an image");
  assert.ok(editorial?.src, "editorial placement must resolve an image");
  const source = read("src/services/explore/explorePlacements.js");
  assert.match(source, /USAGE_ROLES\.SALE|USAGE_ROLES\.HERO|USAGE_ROLES\.EDITORIAL/);
  assert.match(source, /selectMedia|resolveSaleBackdrop|resolveEditorialFrame/);
});

test("Explore does not invent products from raw images or randomise media", () => {
  const files = [
    "src/pages/Explore.jsx",
    "src/components/explore/ExploreBrowser.jsx",
    "src/components/explore/ExploreProductGrid.jsx",
    "src/components/explore/ExplorePromo.jsx",
    "src/data/products/explore.js",
  ];
  files.forEach((rel) => {
    assert.ok(existsSync(join(root, rel)), rel);
    const source = read(rel);
    assert.ok(!/Math\.random/.test(source), `${rel} must not call Math.random`);
    assert.ok(!/shuffle\(/.test(source), `${rel} must not shuffle`);
    assert.ok(
      !/const\s+(products|sarees|lehengas|kids)\s*=\s*\[/.test(source),
      `${rel} must not hardcode a product array`
    );
  });
});

test("Explore stream inserts ads without duplicating product cards", () => {
  const products = getExploreProducts().slice(0, 20);
  const stream = buildExploreStream(products);
  const cards = stream.filter((item) => item.type === "product");
  assert.equal(cards.length, products.length);
  assert.ok(stream.some((item) => item.type === "promo"));
  assert.ok(stream.some((item) => item.type === "editorial"));
});

test("Explore query is the same engine as the rest of the storefront", () => {
  const viaExplore = queryExplore({ filters: { category: "sarees" } }).results.map((p) => p.id);
  const viaCatalogue = queryCatalogue({
    source: getExploreProducts(),
    filters: { category: "sarees" },
  }).results.map((p) => p.id);
  assert.deepEqual(viaExplore, viaCatalogue);
});
